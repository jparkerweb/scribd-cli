# scribd-cli — Implementation Overview

- **Created:** 2026-06-06
- **Source:** [PLAN-DRAFT-20260606.md](./PLAN-DRAFT-20260606.md)
- **Status:** Complete (2026-06-06)

---

## Summary

`scribd-cli` is a Windows terminal app with an interactive TUI that takes a Scribd document ID (or a pasted document URL), headless-renders the embed page, fully loads its lazy-loaded pages, and produces a visually faithful PDF of `div.outer_page_container` on disk. It uses Node.js + TypeScript with Playwright (Chromium native print-to-PDF) and an Ink-based TUI, structured as a layered, event-driven pipeline.

The app guides the user from an onboarding/help screen (Scribd homepage link + how to find a document ID) to an input prompt, then runs a staged download pipeline — launching → loading page → scroll-loading all pages → rendering → saving — with live progress, and reports the final PDF path or a clear, exit-coded error.

## Tech Stack

| Category              | Technology     | Version       | Justification                                                                                          |
| --------------------- | -------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| Runtime               | Node.js        | ≥ 20 LTS      | Best headless-browser ecosystem; easy Windows install / `npx` distribution                             |
| Language              | TypeScript     | 5.x           | Type safety on Playwright APIs and `page.evaluate` DOM/selector code                                   |
| Browser + PDF         | Playwright     | 1.4x (latest) | `page.pdf()` = native Chromium print-to-PDF (visual exact); auto-manages Chromium; strong auto-waiting |
| TUI                   | Ink            | 5.x           | Component-based live-progress terminal UI                                                              |
| Prompt input          | ink-text-input | 6.x           | Native Ink input + inline validation                                                                   |
| Dev runner            | tsx            | latest        | Run TS directly, zero config                                                                           |
| Build                 | tsc            | 5.x           | Distributable JS build                                                                                 |
| Format                | Prettier       | latest        | Conventional formatting                                                                                |
| Fallback PDF assembly | pdf-lib        | latest        | Only if screenshot-stitch fallback (R-2) is needed                                                     |

## Architecture

### Pattern

**Layered + event-driven pipeline.** A thin Ink **UI layer** drives a **core orchestrator** that runs the download as an ordered sequence of stages, each emitting a `ProgressEvent` the UI renders. Rationale: cleanly serves live progress (FR-7), isolates Playwright logic, and keeps the core testable/replaceable. (Alternatives — monolithic script, plugin/strategy — rejected as under- or over-engineered for this scope.)

### Component Overview

| Component                               | Responsibility                                            | Inputs                   | Outputs          | Depends on                       |
| --------------------------------------- | --------------------------------------------------------- | ------------------------ | ---------------- | -------------------------------- |
| CLI Entry (`src/index.ts`)              | Bootstrap Ink app; set process exit code                  | argv (`--debug`)         | exit code        | UI                               |
| UI / App (`src/ui/App.tsx`)             | State machine HELP→INPUT→WORKING→DONE/ERROR               | input, ProgressEvents    | renders          | Ink, orchestrator                |
| UI subviews                             | HelpScreen, IdPrompt, ProgressView, ResultView            | props/state              | renders          | Ink, ink-text-input              |
| URL Service (`src/core/url.ts`)         | Parse ID from input/URL; build embed URL                  | raw string               | `{id}`, URL      | —                                |
| Orchestrator (`src/core/downloader.ts`) | Run staged pipeline; emit progress; own browser lifecycle | URL, options, onProgress | `DownloadResult` | Playwright, PdfGenerator, Config |
| PdfGenerator (`src/core/pdf.ts`)        | Container-isolation CSS + `page.pdf()`                    | Playwright `page`        | PDF file         | Playwright                       |
| Config (`src/config.ts`)                | Defaults: output dir, timeouts, scroll params, selector   | —                        | typed config     | —                                |
| Errors (`src/core/errors.ts`)           | Typed error classes → friendly messages                   | —                        | error types      | —                                |

### Data Model

**N/A — no database / no persistent state.** Transient in-memory config only; the sole durable artifact is the output PDF on disk at `./downloads/<id>.pdf`.

## Risks and Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                                                                                |
| --------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| R-1 Anti-bot / throttling / CAPTCHA           | Medium     | High   | Realistic UA/viewport, human-like scroll pacing, timeouts; clear "blocked" message; `--debug` diagnostics |
| R-2 Lazy-load incomplete / DOM virtualization | Medium     | High   | Scroll-stabilization detection; screenshot-stitch (`pdf-lib`) fallback                                    |
| R-3 `outer_page_container` selector changes   | Low–Med    | Med    | Selector in `config.ts`; single-point fix; `EmptyContentError` surfaces clearly                           |
| R-4 print-to-PDF pagination/overflow          | Medium     | Med    | Tune `page.pdf()` options; verify on long doc in P4                                                       |
| R-5 Chromium not installed on first run       | Med        | Low    | `postinstall` auto-install; `BrowserError` gives exact fix command                                        |
| R-6 Very long docs slow / memory              | Low        | Med    | Per-stage timeouts; progress feedback; friendly timeout message                                           |

## Success Criteria

- Launch shows help (homepage link + ID instructions) then prompt (FR-9, FR-1).
- Accepts raw ID and pasted URL; rejects invalid input clearly.
- Produces a visually faithful PDF at `./downloads/<id>.pdf` with all pages, for a public doc.
- TUI shows live stage progress + final success line (path + page count).
- Each error condition → mapped message + non-zero exit code.
- Works on Windows 11 / PowerShell; first-run Chromium handled or clearly explained.
- Verified against a 50+ page public document.

## Phase Checklist

- [x] **Phase 1 — Scaffold + URL Service:** Buildable project; ID/URL parsing proven. _(no dependencies)_
- [x] **Phase 2 — Download Core:** Headless render → full scroll-load → isolate → PDF on disk. _(depends on P1)_
- [x] **Phase 3 — TUI:** Ink app: help → prompt → live progress → result. _(depends on P1, P2)_
- [x] **Phase 4 — Integration & Polish:** End-to-end run, error UX, exit codes, manual verification. _(depends on P1–P3)_

## Parallel Execution Groups

| Group | Phases | Reason                                                                                                                                                                                                            |
| ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| None  | -      | All phases must run sequentially: P2 depends on P1's URL service and config; P3 consumes P2's `runDownload`/`ProgressEvent` contract; P4 integrates and verifies P1–P3. No two adjacent phases are conflict-free. |

## Quick Reference

### Key Files

- `src/index.ts` — CLI entry / Ink bootstrap / exit code
- `src/ui/App.tsx` — top-level state machine
- `src/ui/HelpScreen.tsx`, `src/ui/IdPrompt.tsx`, `src/ui/ProgressView.tsx`, `src/ui/ResultView.tsx` — subviews
- `src/core/url.ts` — `parseDocumentId`, `buildEmbedUrl`
- `src/core/downloader.ts` — `runDownload` orchestrator + scroll-load
- `src/core/pdf.ts` — `isolateContainer`, `generatePdf`
- `src/core/errors.ts` — typed errors + exit-code mapping
- `src/config.ts` — defaults (output dir, timeouts, scroll params, selector)
- `package.json`, `tsconfig.json`, `.prettierrc`, `.gitignore`, `README.md`

### Environment Variables

None required. Runtime behavior is controlled by `src/config.ts` defaults and the `--debug` CLI flag.

### External Dependencies

- **Scribd embed page** (INT-1): `https://www.scribd.com/embeds/<id>/content?start_page=1&view_mode=scroll&show_recommendations=false` — DOM scrape, no API.
- **Chromium via Playwright** (INT-2): native print-to-PDF; auto-installed via `postinstall` (`playwright install chromium`).
- **Local filesystem** (INT-3): output written to `./downloads/<id>.pdf`.

### Key Constants / Contracts

- ID regex (post-extraction): `^\d{6,}$`
- URL extraction: `scribd\.com/document(?:s)?/(\d+)` (also `/embeds/(\d+)`)
- Default selector: `div.outer_page_container`
- Default output dir: `./downloads`
- Stages: `PARSING | LAUNCHING | NAVIGATING | LOADING_PAGES | RENDERING | SAVING | DONE`
- Scroll-stabilization: stop after **3 consecutive no-growth iterations** or a max-time/iteration cap; scroll to top before render.

### Exit Codes

| Error             | Exit | Message                                                                       |
| ----------------- | ---- | ----------------------------------------------------------------------------- |
| InvalidInputError | 2    | "That doesn't look like a valid Scribd ID or document URL."                   |
| NotFoundError     | 3    | "Document not found or is private/unavailable."                               |
| EmptyContentError | 4    | "No readable content found in the document container."                        |
| NetworkError      | 5    | "Network problem reaching Scribd — check your connection."                    |
| BrowserError      | 6    | "Couldn't start the headless browser. Try `npx playwright install chromium`." |
| success           | 0    | "Saved → ./downloads/<id>.pdf (<n> pages)"                                    |

## Completion Summary

Implemented end-to-end and verified against a real 50+ page public document (Scribd ID
`507779687`, 68 pages). `npm run build` is clean; the full pipeline produces a visually faithful
68-page PDF at `./downloads/507779687.pdf` and exits 0. Page 1 (cover), a mid page, and the last
page were visually confirmed as real, complete content. A 5-dimension adversarial review was run
and its confirmed findings fixed (see notes).

**Key resolutions during implementation:**

- **R-2 / A-5 settled:** Scribd renders pages inside an inner `div.document_scroller`
  (`overflow:auto`, one-viewport height) that print-clips to a single page. The scroll-load now
  drives that real scroller and keys stabilization on _content-loaded_ page count (the
  `.outer_page` shell count is fixed from the start); isolation un-clips the scroller chain so all
  pages paginate. Scribd does **not** recycle the DOM, so native print-to-PDF is sufficient and the
  screenshot-stitch fallback (Task 4.6) was **not** needed.
- **tsx/esbuild `__name`:** dev-mode `page.evaluate` payloads referenced an injected `__name`
  helper undefined in-page; a no-op `__name` init script fixes dev mode (harmless in the build).
- **Review fixes:** BrowserError message apostrophe made verbatim-ASCII; `EmptyContentError` now
  keys off readable pages (blocked/paywalled docs correctly error instead of saving a blank PDF);
  `package.json` `files`/`prepare` added for a working `bin`; `totalMs` doc/usage reconciled.
- **Post-spec enhancement:** added a **Save options** step (new `SaveOptions` view + `OPTIONS`
  phase) so the user can choose the output file name and directory before downloading — pressing
  Enter accepts the defaults (file name = document ID, directory = `./downloads`). `runDownload`
  gained an optional `fileName`; the name is sanitized (spaces/hyphens preserved). Verified
  end-to-end with a custom name + directory.

| Phase   | Status   | Completed  | Notes                                                                                       |
| ------- | -------- | ---------- | ------------------------------------------------------------------------------------------- |
| Phase 1 | Complete | 2026-06-06 | Scaffold, config, typed errors + exit codes, URL service. Build clean; parsing verified.    |
| Phase 2 | Complete | 2026-06-06 | Playwright pipeline, scroll-load, container isolation, native print-to-PDF. 68-page verify. |
| Phase 3 | Complete | 2026-06-06 | Ink entry + reducer state machine + Help/Prompt/Progress/Result subviews. Runtime verified. |
| Phase 4 | Complete | 2026-06-06 | UI↔core exit-code wiring, README, .gitignore, harness cleanup, manual verify, review fixes. |

<!-- METRICS_JSON {"step": "document", "total_tasks": 30, "tasks_per_phase": [8, 8, 8, 6], "phase_count": 4, "parallel_groups_identified": 0, "verification_items_added": 0} -->
