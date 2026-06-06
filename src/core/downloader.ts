/**
 * Orchestrator (FR-3, FR-4, FR-6): the single entry point that drives the staged download
 * pipeline and emits a {@link ProgressEvent} per stage. Owns the browser lifecycle and always
 * closes it in `finally`.
 */

import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { config } from '../config.js';
import { buildEmbedUrl } from './url.js';
import { BrowserError, EmptyContentError, NetworkError, NotFoundError } from './errors.js';
import { generatePdf, isolateContainer } from './pdf.js';

export type Stage =
  | 'PARSING'
  | 'LAUNCHING'
  | 'NAVIGATING'
  | 'LOADING_PAGES'
  | 'RENDERING'
  | 'SAVING'
  | 'DONE';

export interface ProgressEvent {
  stage: Stage;
  message: string;
  current?: number;
  total?: number;
}

export interface DownloadOptions {
  id: string;
  outputDir: string;
  /** Output file name (without extension); defaults to the document ID. */
  fileName?: string;
  debug?: boolean;
}

export interface DownloadResult {
  outputPath: string;
  pageCount: number;
  bytes: number;
}

type Emit = (stage: Stage, message: string, current?: number, total?: number) => void;

/**
 * Run the full download pipeline for a document ID and return the saved PDF result.
 *
 * Stages, in order: PARSING → LAUNCHING → NAVIGATING → LOADING_PAGES → RENDERING → SAVING → DONE.
 * Throws a typed {@link import('./errors.js').ScribdCliError} on each failure mode.
 */
export async function runDownload(
  opts: DownloadOptions,
  onProgress: (e: ProgressEvent) => void,
): Promise<DownloadResult> {
  const emit: Emit = (stage, message, current, total) =>
    onProgress({ stage, message, current, total });
  const debug = (...args: unknown[]) => {
    if (opts.debug) console.error('[scribd-cli]', ...args);
  };

  emit('PARSING', 'Preparing download…');
  const embedUrl = buildEmbedUrl(opts.id);
  debug('embed URL:', embedUrl);

  let browser: Browser | undefined;
  try {
    // --- LAUNCHING -------------------------------------------------------------------------
    emit('LAUNCHING', 'Launching headless browser…');
    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    } catch (err) {
      throw new BrowserError(err instanceof Error ? err.message : String(err));
    }

    const context = await browser.newContext({
      userAgent: config.browser.userAgent,
      viewport: config.browser.viewport,
      deviceScaleFactor: config.browser.deviceScaleFactor,
    });

    // In dev mode (tsx/esbuild), `page.evaluate` payloads can reference an injected `__name`
    // name-keeping helper that isn't defined in the page context. Define a no-op so serialized
    // functions don't ReferenceError. Harmless in the compiled build (where it's never used).
    await context.addInitScript({
      content: 'globalThis.__name = globalThis.__name || function (f) { return f; };',
    });

    const page = await context.newPage();

    // --- NAVIGATING ------------------------------------------------------------------------
    emit('NAVIGATING', 'Loading document page…');
    await navigateWithRetry(page, embedUrl, debug);

    try {
      await page.waitForSelector(config.selector, {
        state: 'attached',
        timeout: config.timeouts.containerWaitMs,
      });
    } catch {
      throw new NotFoundError(`Container "${config.selector}" never attached`);
    }

    // --- LOADING_PAGES (scroll-stabilization, FR-4) ----------------------------------------
    emit('LOADING_PAGES', 'Loading all pages…', 0, 0);
    const { loaded, total } = await scrollLoad(page, emit, debug);
    debug('pages loaded/total:', `${loaded}/${total}`);

    // Empty-content is decided on READABLE pages (Task 2.6), not the always-present shells —
    // a blocked/paywalled doc renders empty `.outer_page` shells but loads no content.
    if (loaded <= 0) {
      throw new EmptyContentError();
    }
    const pageCount = total; // pages actually written to the PDF

    // --- RENDERING -------------------------------------------------------------------------
    emit('RENDERING', 'Rendering PDF…', pageCount, pageCount);
    await isolateContainer(page, config.selector);

    // --- SAVING ----------------------------------------------------------------------------
    emit('SAVING', 'Saving file…');
    await mkdir(opts.outputDir, { recursive: true });
    const outputPath = resolveOutputPath(opts.outputDir, opts.fileName, opts.id);
    const { bytes } = await generatePdf(page, outputPath);
    debug('wrote', bytes, 'bytes to', outputPath);

    emit('DONE', 'Done');
    return { outputPath, pageCount, bytes };
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        /* best-effort cleanup */
      });
    }
  }
}

/**
 * Resolve the output PDF path from the chosen directory + file name. Falls back to the document
 * ID when no name is given, strips a trailing `.pdf`, and keeps only a safe whitelist of file-name
 * characters (letters, digits, space, dot, underscore, parentheses, hyphen) — everything else
 * (including path separators and the other Windows-invalid characters) becomes `_`. The directory
 * is used as-is so the user can target any folder.
 */
function resolveOutputPath(outputDir: string, fileName: string | undefined, id: string): string {
  let base = (fileName ?? '').trim();
  if (!base) base = id;
  base = base.replace(/\.pdf$/i, '');
  base = base.replace(/[^A-Za-z0-9 ._()-]+/g, '_').trim();
  if (!base) base = id;
  return path.join(outputDir, `${base}.pdf`);
}

/**
 * Navigate to `url`, retrying once on failure (NFR-5). A persistent failure (timeout, DNS,
 * connection reset) is mapped to {@link NetworkError}.
 */
async function navigateWithRetry(
  page: Page,
  url: string,
  debug: (...args: unknown[]) => void,
): Promise<void> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.timeouts.navigationMs,
      });
      return;
    } catch (err) {
      lastErr = err;
      debug(`navigation attempt ${attempt} failed:`, err instanceof Error ? err.message : err);
    }
  }
  throw new NetworkError(lastErr instanceof Error ? lastErr.message : String(lastErr));
}

/**
 * Scroll the document's *real* scroll container (the nearest `overflow:auto/scroll` ancestor of
 * the page container — Scribd's `div.document_scroller`) all the way down so every lazily-loaded
 * page renders its content. Stabilization is keyed on the count of *content-loaded* pages (the
 * `.outer_page` element count is fixed from the start and would falsely stabilize instantly).
 *
 * Stops once at the bottom AND either all pages are loaded or `noGrowthThreshold` consecutive
 * iterations add nothing new, bounded by `maxIterations` / `maxTimeMs` (R-6). Resets the scroller
 * to the top before returning the total page count.
 */
async function scrollLoad(
  page: Page,
  emit: Emit,
  debug: (...args: unknown[]) => void,
): Promise<{ loaded: number; total: number }> {
  const { selector } = config;
  const { noGrowthThreshold, maxIterations, maxTimeMs } = config.scroll;
  // Keep the scroll phase within the overall per-document budget (R-6).
  const maxTime = Math.min(maxTimeMs, config.timeouts.totalMs);

  let bestLoaded = 0;
  let totalPages = 0;
  let noGrowth = 0;
  let iter = 0;
  const start = Date.now();

  while (iter < maxIterations && Date.now() - start < maxTime) {
    const step = await page.evaluate((sel) => {
      const findScroller = (from: Element | null): HTMLElement => {
        let n: HTMLElement | null = from as HTMLElement | null;
        while (n) {
          const cs = getComputedStyle(n);
          if (
            n.scrollHeight > n.clientHeight + 4 &&
            (cs.overflowY === 'auto' || cs.overflowY === 'scroll')
          ) {
            return n;
          }
          n = n.parentElement;
        }
        return (document.scrollingElement as HTMLElement | null) ?? document.body;
      };
      const container = document.querySelector(sel);
      const scroller = findScroller(container);
      scroller.scrollTop = scroller.scrollTop + Math.max(1, scroller.clientHeight * 0.9);
      const atBottom = scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 4;
      return { atBottom };
    }, selector);

    await page.waitForTimeout(config.timeouts.scrollSettleMs);

    const measure = await page.evaluate((sel) => {
      const container = document.querySelector(sel);
      if (!container) return { loaded: 0, total: 0 };
      const pages = Array.from(container.querySelectorAll('.outer_page'));
      const isLoaded = (p: Element): boolean =>
        p.querySelectorAll('img,canvas,svg').length > 0 || (p.textContent ?? '').trim().length > 50;
      return { loaded: pages.filter(isLoaded).length, total: pages.length };
    }, selector);

    totalPages = Math.max(totalPages, measure.total);
    if (measure.loaded > bestLoaded) {
      bestLoaded = measure.loaded;
      noGrowth = 0;
    } else {
      noGrowth++;
    }
    iter++;

    debug(
      `scroll iter ${iter}: loaded=${measure.loaded}/${measure.total} atBottom=${step.atBottom} noGrowth=${noGrowth}`,
    );
    emit('LOADING_PAGES', 'Loading all pages…', measure.loaded, measure.total || totalPages);

    if (step.atBottom && (measure.loaded >= measure.total || noGrowth >= noGrowthThreshold)) {
      break;
    }
  }

  // Reset the real scroller (and window) to the top so the print starts at page 1.
  await page.evaluate((sel) => {
    const container = document.querySelector(sel);
    let n: HTMLElement | null = container as HTMLElement | null;
    while (n) {
      const cs = getComputedStyle(n);
      if (
        n.scrollHeight > n.clientHeight + 4 &&
        (cs.overflowY === 'auto' || cs.overflowY === 'scroll')
      ) {
        n.scrollTop = 0;
        break;
      }
      n = n.parentElement;
    }
    window.scrollTo(0, 0);
  }, selector);
  await page.waitForTimeout(300);

  return { loaded: bestLoaded, total: totalPages };
}
