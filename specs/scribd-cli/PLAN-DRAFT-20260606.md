# PLAN-DRAFT — scribd-cli

- **Created:** 2026-06-06
- **Status:** Complete
- **Confidence:** 90% — Requirements 24/25 · Feasibility 23/25 · Integration 22/25 · Risk 21/25
- **Conversation log:** [PLAN-CONVERSATION-20260606.md](./PLAN-CONVERSATION-20260606.md)

---

## 1. Executive Summary

`scribd-cli` is a Windows terminal app with an interactive TUI that takes a Scribd document ID (or a pasted document URL), headless-renders the embed page, fully loads its lazy-loaded pages, and produces a visually faithful PDF of `div.outer_page_container` on disk. It uses Node.js + TypeScript with Playwright (Chromium native print-to-PDF) and an Ink-based TUI, structured as a layered, event-driven pipeline.

## 2. Requirements

### 2.1 Functional

- [ ] **FR-1:** Prompt accepts a raw document ID **or** a pasted full Scribd document URL, auto-extracts the ID, and validates input (reject empty/malformed).
- [ ] **FR-2:** Build the embed URL from the ID: `https://www.scribd.com/embeds/<id>/content?start_page=1&view_mode=scroll&show_recommendations=false`.
- [ ] **FR-3:** Launch headless Chromium, navigate to the URL, and wait for `div.outer_page_container` to attach.
- [ ] **FR-4:** Auto-scroll the full document until lazy-loaded pages stop growing (stabilization), so all pages render.
- [ ] **FR-5:** Isolate `div.outer_page_container` and generate a **visually exact** PDF via Chromium print-to-PDF.
- [ ] **FR-6:** Save the PDF to `./downloads/<id>.pdf` (create dir if missing) and report the final path.
- [ ] **FR-7:** Show live TUI progress across pipeline stages: launching → loading page → loading pages (scroll) → rendering → saving → done.
- [ ] **FR-8:** Handle errors gracefully with clear messages + non-zero exit codes (invalid ID, not found/private, empty content, network, browser launch).
- [ ] **FR-9:** Before prompting, display an onboarding/help screen with the Scribd homepage (`https://www.scribd.com/home`) and instructions for finding a document ID from a document URL (e.g. `.../document/507779687/...` → `507779687`).

### 2.2 Non-Functional

- [ ] **NFR-1 (Platform):** Runs on Windows 11 / PowerShell.
- [ ] **NFR-2 (Performance):** Handles long docs (dozens–hundreds of pages) with no missing pages; scroll-load completes before capture.
- [ ] **NFR-3 (UX):** Clean, friendly TUI with readable progress and clear success/error output.
- [ ] **NFR-4 (Setup):** Manages the Chromium dependency (auto-install) so the user need not install it manually.
- [ ] **NFR-5 (Resilience):** Per-stage timeouts; scroll-stabilization detection; one automatic navigation retry.

### 2.3 Out of Scope

- Authenticated/private documents, Scribd login, account management.
- Batch/multi-document downloads, download history, settings screens.
- Non-Windows targeting (may work but untargeted/unverified).
- Anti-bot evasion beyond realistic browser behavior.
- OCR / text reconstruction beyond what Chromium emits; PDF post-editing.

### 2.4 Testing Strategy

| Aspect        | Decision                                                                   |
| ------------- | -------------------------------------------------------------------------- |
| Types         | None                                                                       |
| Phase testing | None                                                                       |
| Coverage      | Manual verification against real public documents (incl. one 50+ page doc) |

## 3. Tech Stack

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

## 4. Architecture

### 4.1 Pattern

**Layered + event-driven pipeline.** A thin Ink **UI layer** drives a **core orchestrator** that runs the download as an ordered sequence of stages, each emitting a `ProgressEvent` the UI renders. Rationale: cleanly serves live progress (FR-7), isolates Playwright logic, and keeps the core testable/replaceable. (Alternatives — monolithic script, plugin/strategy — rejected as under- or over-engineered for this scope.)

### 4.2 System Context Diagram

```
        ┌──────────────────────────────┐
        │   User — PowerShell (Win11)  │
        └───────────────┬──────────────┘
                        │ enters ID / pastes URL
                        ▼
        ┌──────────────────────────────┐
        │          scribd-cli          │
        │  TUI (Ink): Help→Prompt→     │  FR-9, FR-1, FR-7
        │             Progress→Result  │
        │  Core: URL parser (FR-2)     │
        │        Orchestrator(FR-3/4)  │──► Scribd embed page (INT-1)
        │        PdfGenerator (FR-5)   │──► Chromium / CDP print-to-PDF (INT-2)
        └───────────────┬──────────────┘
                        │ writes PDF (FR-6)
                        ▼
              ./downloads/<id>.pdf  (INT-3 filesystem)
```

### 4.3 Components

| Component                           | Responsibility                                            | Inputs                   | Outputs          | Depends on                       |
| ----------------------------------- | --------------------------------------------------------- | ------------------------ | ---------------- | -------------------------------- |
| CLI Entry (`index.ts`)              | Bootstrap Ink app; set process exit code                  | argv (`--debug`)         | exit code        | UI                               |
| UI / App (`ui/App.tsx`)             | State machine HELP→INPUT→WORKING→DONE/ERROR               | input, ProgressEvents    | renders          | Ink, orchestrator                |
| UI subviews                         | HelpScreen, IdPrompt, ProgressView, ResultView            | props/state              | renders          | Ink, ink-text-input              |
| URL Service (`core/url.ts`)         | Parse ID from input/URL; build embed URL                  | raw string               | `{id}`, URL      | —                                |
| Orchestrator (`core/downloader.ts`) | Run staged pipeline; emit progress; own browser lifecycle | URL, options, onProgress | `DownloadResult` | Playwright, PdfGenerator, Config |
| PdfGenerator (`core/pdf.ts`)        | Container-isolation CSS + `page.pdf()`                    | Playwright `page`        | PDF file         | Playwright                       |
| Config (`config.ts`)                | Defaults: output dir, timeouts, scroll params, selector   | —                        | typed config     | —                                |
| Errors (`core/errors.ts`)           | Typed error classes → friendly messages                   | —                        | error types      | —                                |

### 4.4 Data Model

**N/A — no database / no persistent state.** Transient in-memory config only; sole durable artifact is the output PDF on disk.

### 4.5 API / Interface Contracts

```ts
// core/url.ts
function parseDocumentId(input: string): { id: string }; // throws InvalidInputError
function buildEmbedUrl(id: string): string; // FR-2 fixed template

// core/downloader.ts
type Stage =
  | 'PARSING'
  | 'LAUNCHING'
  | 'NAVIGATING'
  | 'LOADING_PAGES'
  | 'RENDERING'
  | 'SAVING'
  | 'DONE';
interface ProgressEvent {
  stage: Stage;
  message: string;
  current?: number;
  total?: number;
}
interface DownloadOptions {
  id: string;
  outputDir: string;
  debug?: boolean;
}
interface DownloadResult {
  outputPath: string;
  pageCount: number;
  bytes: number;
}
function runDownload(
  opts: DownloadOptions,
  onProgress: (e: ProgressEvent) => void,
): Promise<DownloadResult>;

// core/pdf.ts
function isolateContainer(page: Page, selector: string): Promise<void>;
function generatePdf(page: Page, outputPath: string): Promise<{ bytes: number }>;
```

**Validation / formats**

- ID regex (post-extraction): `^\d{6,}$`.
- URL extraction: `scribd\.com/document(?:s)?/(\d+)` (also `/embeds/(\d+)`).
- Output path: `${outputDir}/${id}.pdf`, default `outputDir = ./downloads`.
- Selector (config, overridable): `div.outer_page_container`.

**State machine (Ink `useReducer`):** `HELP → INPUT → WORKING(stage,current,total) → DONE(result) | ERROR(type,message)`.

**Error / exit codes**
| Error | Exit | Message |
|---|---|---|
| InvalidInputError | 2 | "That doesn't look like a valid Scribd ID or document URL." |
| NotFoundError | 3 | "Document not found or is private/unavailable." |
| EmptyContentError | 4 | "No readable content found in the document container." |
| NetworkError | 5 | "Network problem reaching Scribd — check your connection." |
| BrowserError | 6 | "Couldn't start the headless browser. Try `npx playwright install chromium`." |
| success | 0 | "Saved → ./downloads/<id>.pdf (<n> pages)" |

**Scroll-load algorithm (FR-4):** repeatedly scroll to bottom → wait (network-idle/short delay) → measure `scrollHeight` + page-element count; stop after **3 consecutive iterations with no growth** or a max-time/iteration cap; scroll back to top before render.

## 5. Implementation Phases

### Phase P1 — Scaffold + URL Service

- **Goal:** Buildable project; ID/URL parsing proven.
- **Dependencies:** none.
- [ ] Task 1.1: Init `package.json`, `tsconfig.json`, Prettier, scripts (`dev` via tsx, `build` via tsc).
- [ ] Task 1.2: `config.ts` — output dir, timeouts, scroll params, selector.
- [ ] Task 1.3: `core/errors.ts` — typed error classes + exit-code mapping.
- [ ] Task 1.4: `core/url.ts` — `parseDocumentId` (raw ID + URL extraction) and `buildEmbedUrl`.

### Phase P2 — Download Core

- **Goal:** Headless render → full scroll-load → isolate → PDF on disk.
- **Dependencies:** P1.
- [ ] Task 2.1: Add Playwright; wire `postinstall` to `playwright install chromium`.
- [ ] Task 2.2: `core/downloader.ts` — launch, navigate (+retry), wait for container.
- [ ] Task 2.3: Scroll-stabilization loop (FR-4) emitting `LOADING_PAGES` progress.
- [ ] Task 2.4: `core/pdf.ts` — `isolateContainer` CSS + `generatePdf` (`printBackground`, page size/margins, `preferCSSPageSize`).
- [ ] Task 2.5: Save to `./downloads/<id>.pdf`; emit progress; close browser in `finally`.

### Phase P3 — TUI

- **Goal:** Ink app: help → prompt → live progress → result.
- **Dependencies:** P1, P2 (consumes `runDownload`/`ProgressEvent`).
- [ ] Task 3.1: `index.ts` bootstrap; `--debug` flag.
- [ ] Task 3.2: `ui/App.tsx` reducer state machine.
- [ ] Task 3.3: `HelpScreen` (FR-9) + `IdPrompt` (FR-1 validation).
- [ ] Task 3.4: `ProgressView` (FR-7) + `ResultView` (success + error mapping).

### Phase P4 — Integration & Polish

- **Goal:** End-to-end run, error UX, exit codes, manual verification.
- **Dependencies:** P1–P3.
- [ ] Task 4.1: Wire UI ↔ core; map typed errors → friendly messages + exit codes.
- [ ] Task 4.2: `README.md` (usage, first-run Chromium note) + `.gitignore` (`downloads/`, `node_modules/`).
- [ ] Task 4.3: Manual verify: short doc, a 50+ page doc, invalid input, not-found ID.
- [ ] Task 4.4: If virtualization observed (R-2), implement screenshot-stitch fallback.

## 6. Risks and Mitigations

| Risk                                          | Likelihood | Impact | Mitigation                                                                                                |
| --------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------- |
| R-1 Anti-bot / throttling / CAPTCHA           | Medium     | High   | Realistic UA/viewport, human-like scroll pacing, timeouts; clear "blocked" message; `--debug` diagnostics |
| R-2 Lazy-load incomplete / DOM virtualization | Medium     | High   | Scroll-stabilization detection; screenshot-stitch (`pdf-lib`) fallback                                    |
| R-3 `outer_page_container` selector changes   | Low–Med    | Med    | Selector in `config.ts`; single-point fix; `EmptyContentError` surfaces clearly                           |
| R-4 print-to-PDF pagination/overflow          | Medium     | Med    | Tune `page.pdf()` options; verify on long doc in P4                                                       |
| R-5 Chromium not installed on first run       | Med        | Low    | `postinstall` auto-install; `BrowserError` gives exact fix command                                        |
| R-6 Very long docs slow / memory              | Low        | Med    | Per-stage timeouts; progress feedback; friendly timeout message                                           |

## 7. Success Criteria

- [ ] Launch shows help (homepage link + ID instructions) then prompt (FR-9, FR-1).
- [ ] Accepts raw ID and pasted URL; rejects invalid input clearly.
- [ ] Produces a visually faithful PDF at `./downloads/<id>.pdf` with all pages, for a public doc.
- [ ] TUI shows live stage progress + final success line (path + page count).
- [ ] Each error condition → mapped message + non-zero exit code.
- [ ] Works on Windows 11 / PowerShell; first-run Chromium handled or clearly explained.
- [ ] Verified against a 50+ page public document.

## 8. Open Questions

- Does Scribd virtualize/recycle page DOM in scroll mode? (Mitigated by R-2 fallback; confirm in P2/P4.)
- Will target documents be reachable without login / no anti-bot block? (Assumption A-3; R-1 surfaces a clear message if not.)

## 9. Assumptions

- **A-1:** Selector is `div.outer_page_container` — wrong → config one-liner change.
- **A-2:** Output path `./downloads/<id>.pdf` — wrong → save location only.
- **A-3:** Target documents are public (no auth) — wrong → scope expands (out of boundary).
- **A-4:** Document IDs are numeric (≥6 digits) — wrong → widen validation/extraction regex.
- **A-5:** Lazy-load completes on scroll stabilization (no DOM recycling) — wrong → screenshot-stitch fallback (R-2).

## Planning Metrics

<!-- METRICS_JSON {"confidence": 90, "clarification_rounds": 1, "functional_requirements_count": 9, "non_functional_requirements_count": 5, "risk_count": 6, "phase_count": 4, "verification_gaps_found": 0, "confidence_breakdown": {"requirements": 24, "feasibility": 23, "integration": 22, "risk": 21}} -->

confidence: 90
clarification_rounds: 1
functional_requirements_count: 9
non_functional_requirements_count: 5
risk_count: 6
phase_count: 4
verification_gaps_found: 0
