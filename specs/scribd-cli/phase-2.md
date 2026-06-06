# Phase 2 — Download Core

- **Status:** Complete (2026-06-06)
- **Estimated Tasks:** 8

## Overview

Implement the headless download pipeline: add Playwright (with auto-managed Chromium), launch a browser with realistic settings, navigate to the embed URL with one retry, wait for the page container, scroll-load all lazy pages until stabilization, isolate `div.outer_page_container`, and render it to a visually exact PDF saved at `./downloads/<id>.pdf`. The orchestrator emits a `ProgressEvent` at each stage and always closes the browser. At the end of this phase, `runDownload` produces a complete PDF from a public document via a script call (TUI comes in Phase 3).

## Prerequisites

- Phase 1 complete: `src/config.ts`, `src/core/errors.ts`, and `src/core/url.ts` exist and compile.
- Node.js ≥ 20 LTS; internet access to a public Scribd document for manual verification.

## Tasks

### Playwright Integration

- [ ] **Task 2.1:** Add `playwright` as a dependency and wire a `postinstall` script in `package.json` that runs `playwright install chromium` (NFR-4, R-5), so Chromium is fetched automatically after `npm install`. Confirm a fresh `npm install` downloads Chromium.

### Pipeline Types & Orchestration

- [ ] **Task 2.2:** In `src/core/downloader.ts`, declare the shared pipeline contract: `type Stage = 'PARSING'|'LAUNCHING'|'NAVIGATING'|'LOADING_PAGES'|'RENDERING'|'SAVING'|'DONE'`; `interface ProgressEvent { stage: Stage; message: string; current?: number; total?: number }`; `interface DownloadOptions { id: string; outputDir: string; debug?: boolean }`; `interface DownloadResult { outputPath: string; pageCount: number; bytes: number }`. Export all four. Define the `runDownload(opts: DownloadOptions, onProgress: (e: ProgressEvent) => void): Promise<DownloadResult>` signature as the single entry point.

- [ ] **Task 2.3:** In `runDownload`, implement browser launch (stage `LAUNCHING`): launch headless Chromium with a realistic user-agent and viewport (R-1) and a `BrowserError` wrapper around launch failures. Build the embed URL via `buildEmbedUrl(opts.id)`. Wrap the entire body in `try/finally`, closing the browser/context in `finally` (Task 2.5 completes the close logic). Emit a `PARSING`→`LAUNCHING` progress sequence.

- [ ] **Task 2.4:** Implement navigation + container wait (stages `NAVIGATING` then start of `LOADING_PAGES`): `page.goto(embedUrl, { waitUntil: 'domcontentloaded', timeout: config.timeouts.navigationMs })` with **one automatic retry** on failure (NFR-5), then `page.waitForSelector(config.selector, { timeout: config.timeouts.containerWaitMs })`. Map a navigation timeout/connection failure to `NetworkError`, and a missing/never-attaching container after retry to `NotFoundError`.

### Scroll-Load (FR-4)

- [ ] **Task 2.5:** Implement the scroll-stabilization loop in `runDownload` (stage `LOADING_PAGES`). Repeatedly: scroll the scroll container to the bottom via `page.evaluate`, wait `config.timeouts.scrollSettleMs` (or network-idle), then measure `scrollHeight` and the count of page elements under `config.selector`. Stop after `config.scroll.noGrowthThreshold` (3) consecutive iterations with no growth, OR when `config.scroll.maxIterations` / a max-time cap is hit (R-6). Emit `LOADING_PAGES` progress with `current` = pages loaded so far and `total` = best-known page count. After stabilization, scroll back to the top before rendering. Ensure the browser is closed in the `finally` block opened in Task 2.3.

- [ ] **Task 2.6:** After scroll-load, count rendered page elements. If the container has zero readable page elements, throw `EmptyContentError` (FR-8). Capture the final page count to populate `DownloadResult.pageCount`.

### PDF Generation (FR-5, FR-6)

- [ ] **Task 2.7:** In `src/core/pdf.ts`, implement `isolateContainer(page: Page, selector: string): Promise<void>` that injects CSS via `page.addStyleTag`/`page.evaluate` to hide everything except `div.outer_page_container` (e.g. set ancestors to display the container only, remove surrounding chrome/margins, reset body background) so the print captures only the document pages. Then implement `generatePdf(page: Page, outputPath: string): Promise<{ bytes: number }>` calling `page.pdf({ path: outputPath, printBackground: true, preferCSSPageSize: true, margin: 0 })` (R-4) and returning the written byte size.

- [ ] **Task 2.8:** In `runDownload`, wire `RENDERING` and `SAVING` stages: ensure `outputDir` exists (`fs.mkdir(outputDir, { recursive: true })`, FR-6), compute `outputPath = ${outputDir}/${id}.pdf`, call `isolateContainer` then `generatePdf`, emit `SAVING` then `DONE`, and return `{ outputPath, pageCount, bytes }`. Add a temporary manual-check harness `src/core/download.manual.ts` (run via `tsx`) that calls `runDownload` for a known public document ID and logs progress events + result; mark it for cleanup in Phase 4.

## Acceptance Criteria

- A fresh `npm install` auto-installs Chromium via `postinstall`.
- `runDownload` for a public document produces `./downloads/<id>.pdf` containing **all** pages of the document.
- The PDF is visually faithful (Chromium print-to-PDF), containing only the `outer_page_container` content with no surrounding Scribd chrome.
- Progress events fire in order: `PARSING → LAUNCHING → NAVIGATING → LOADING_PAGES → RENDERING → SAVING → DONE`, with `current`/`total` populated during scroll-load.
- The scroll loop terminates on 3 consecutive no-growth iterations and does not hang on long docs (max-iteration/time cap).
- The browser is always closed (success or failure) via the `finally` block.
- Failure paths throw the correct typed errors: navigation/connection → `NetworkError`, missing container → `NotFoundError`, empty container → `EmptyContentError`, launch failure → `BrowserError`.

## Notes

- Keep all tunables (timeouts, scroll params, selector) read from `src/config.ts` so R-3/R-4/R-6 are single-point fixes.
- If DOM virtualization/recycling is observed (open question / A-5), do not solve it here — note it for the Phase 4 screenshot-stitch fallback (Task 4.4).
- Use `--debug` (passed via `DownloadOptions.debug`) to gate verbose stderr diagnostics for R-1 troubleshooting.

## Phase Completion Summary

- **Date:** 2026-06-06
- **What was done:** Added `playwright` + `postinstall` (`playwright install chromium`).
  Implemented `src/core/downloader.ts` (`Stage`/`ProgressEvent`/`DownloadOptions`/`DownloadResult`
  contract + `runDownload`): launch → `navigateWithRetry` (1 retry → `NetworkError`) → wait for
  container (timeout → `NotFoundError`) → `scrollLoad` → empty guard (`EmptyContentError`) → isolate
  → save → `DONE`, browser closed in `finally`. Implemented `src/core/pdf.ts` (`isolateContainer`
  un-clips the scroll chain + injects `@page`/break CSS; `generatePdf` uses screen-media emulation +
  `printBackground`/`preferCSSPageSize`/`margin:0`).
- **Files:** `package.json` (deps + postinstall), `src/core/downloader.ts`, `src/core/pdf.ts`,
  `scripts/download.manual.ts`.
- **Verification:** Fresh `npm install` auto-installed Chromium (Chrome for Testing 148). A full
  `runDownload` on public doc `507779687` emitted stages in order and produced a **68-page** PDF;
  `pdf-lib` inspection confirmed 68 uniform `752×910pt` pages; element screenshots of pages 1, 34,
  and 68 confirmed real, complete content.
- **Issues found & fixed during this phase's verification:**
  - **R-2 (critical):** pages live inside an inner `div.document_scroller` that print-clips to one
    page, and content is lazy-loaded only when that scroller scrolls. Initial naive window-scroll
    captured 1 page. Fixed: scroll the real scroller; stabilize on _content-loaded_ page count;
    un-clip the scroller chain for print. Confirmed Scribd does **not** recycle the DOM, so native
    print-to-PDF suffices (screenshot-stitch fallback deferred to P4 and ultimately not needed).
  - **tsx/esbuild `__name`:** dev-mode `page.evaluate` payloads referenced an undefined `__name`
    helper; added a no-op `__name` `addInitScript` (harmless in the compiled build).
- **Note:** `EmptyContentError` decision later (P4 review) corrected to key off readable pages, not
  the always-present `.outer_page` shells.
