/**
 * Central, side-effect-free configuration for scribd-cli.
 *
 * All tunables (selector, timeouts, scroll parameters, browser identity) live here so that
 * risk mitigations R-3 (selector change), R-4 (PDF pagination), and R-6 (long-doc timeouts)
 * are single-point fixes. Keep this module pure data + types — both the core and the UI import it.
 */

export interface EmbedParams {
  /** Page to start the embed on (FR-2). */
  startPage: number;
  /** Embed view mode; `scroll` lazy-loads pages as the user scrolls (FR-2). */
  viewMode: 'scroll' | 'slideshow' | 'book';
  /** Whether Scribd's recommendation chrome is shown (FR-2 keeps this off). */
  showRecommendations: boolean;
}

export interface Timeouts {
  /** Max time for a single `page.goto` navigation attempt. */
  navigationMs: number;
  /** Max time to wait for `selector` to attach after navigation. */
  containerWaitMs: number;
  /** Settle delay after each scroll step, letting lazy pages render. */
  scrollSettleMs: number;
  /** Overall time budget for one document; the per-stage timeouts above keep the run within it (R-6). */
  totalMs: number;
}

export interface ScrollParams {
  /** Hard cap on scroll iterations (R-6). */
  maxIterations: number;
  /** Stop after this many consecutive no-growth iterations (FR-4). */
  noGrowthThreshold: number;
  /** Delay between incremental scroll steps within one iteration. */
  stepDelayMs: number;
  /** Wall-clock cap on the whole scroll-load phase (R-6). */
  maxTimeMs: number;
}

export interface BrowserIdentity {
  /** Realistic desktop user-agent to reduce anti-bot friction (R-1). */
  userAgent: string;
  /** Viewport used while loading/scrolling the embed. */
  viewport: { width: number; height: number };
  /** Device scale factor — higher renders crisper page bitmaps. */
  deviceScaleFactor: number;
}

export interface ScribdConfig {
  /** Directory the PDF is written to (FR-6 / A-2). Default `./downloads`. */
  outputDir: string;
  /** Container that holds the rendered document pages (A-1). */
  selector: string;
  /** Selector (relative to `selector`) matching one element per document page. */
  pageSelector: string;
  /** Parameters baked into the FR-2 embed URL template. */
  embed: EmbedParams;
  timeouts: Timeouts;
  scroll: ScrollParams;
  browser: BrowserIdentity;
}

export const config: Readonly<ScribdConfig> = Object.freeze({
  outputDir: './downloads',
  selector: 'div.outer_page_container',
  pageSelector: '.outer_page',
  embed: {
    startPage: 1,
    viewMode: 'scroll' as const,
    showRecommendations: false,
  },
  timeouts: {
    navigationMs: 45_000,
    containerWaitMs: 30_000,
    scrollSettleMs: 1_500,
    totalMs: 300_000,
  },
  scroll: {
    maxIterations: 60,
    noGrowthThreshold: 3,
    stepDelayMs: 250,
    maxTimeMs: 240_000,
  },
  browser: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 1696 },
    deviceScaleFactor: 2,
  },
});
