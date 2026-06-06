# PLAN-CONVERSATION — scribd-cli

- **Created:** 2026-06-06
- **Feature:** scribd-cli (terminal app with TUI that downloads a Scribd embed document as a visually faithful PDF)
- **Companion:** [PLAN-DRAFT-20260606.md](./PLAN-DRAFT-20260606.md)

This log is the **source of truth** for the PLAN-DRAFT. It captures the planning transcript and the decisions reached per phase.

---

## Transcript Summary

### Pre-flight

- No `AGENTS.md` present. User elected to **continue without it** — treated as a **greenfield** project.

### User's original request

> Create a CLI app with a TUI (assistant to pick the best stack). Named `scribd-cli`. It asks the user for a Scribd document ID, then creates a downloadable PDF of the inner contents of `div.outer_page_container` from:
> `https://www.scribd.com/embeds/<scribd-document-id>/content?start_page=1&view_mode=scroll&show_recommendations=false`

### Phase 1 — Requirements Analysis

- Assistant flagged the **core technical reality**: Scribd embeds are JS-rendered and lazy-load pages in `view_mode=scroll`; a plain HTTP fetch returns an empty shell → a **headless browser** is required.
- Assistant flagged a likely typo: `outer_page_contaier` → `div.outer_page_container`.
- Decisions captured via Q&A:
  - **PDF fidelity:** Visual exact (Chromium print-to-PDF).
  - **TUI scope:** Minimal single-doc (prompt → progress → save → exit).
  - **Platform:** Windows only.
  - **Testing:** None.
- **User addition:** Before the prompt, display an onboarding/help screen with the Scribd homepage (`https://www.scribd.com/home`) and instructions on finding a document ID from a document URL (e.g. `https://www.scribd.com/document/507779687/rulebook-zombicide-2nd-edition` → ID `507779687`). → **FR-9**.
- **Enhancement accepted:** Prompt accepts **either a raw ID or a pasted full document URL**, extracting the ID automatically. → revised **FR-1**.
- Requirements approved.

### Tech-stack preview (asked early by user)

- Assistant recommended **Node.js + Playwright + Ink (+ TypeScript)**; explained Playwright's `page.pdf()` as the linchpin for visual-exact output and its auto-managed Chromium. Alternatives (Python+Textual, Go+chromedp, no-browser scraping) considered and set aside. User **approved** the direction.

### Phase 2 — System Context

- Greenfield. Integration points: Scribd embed page (no API, DOM scrape), Chromium via Playwright, local filesystem, PowerShell terminal.
- Boundaries set (auth/private docs, batch, non-Windows, anti-bot evasion = out of scope).
- Proposed project structure (src/ui, src/core, config). Approved.

### Phase 3 — Scope Assessment

- 14 requirements, 5 components, 1 meaningful integration, ~4 phases → **MEDIUM** scope, standard single-conversation workflow. Approved.

### Phase 4 — Tech Stack (formal lock)

- Locked: **Node.js ≥20 LTS, TypeScript 5, Playwright, Ink 5 + ink-text-input, tsx/tsc, Prettier**. Devil's-advocate on JS-vs-TS and Ink-vs-clack presented; user **approved** the TypeScript + Ink defaults.

### Phase 5 — Architecture

- Devil's advocate: rejected screenshot-stitch as primary (kept as fallback) in favor of native `page.pdf()`.
- Pattern chosen: **Layered + event-driven pipeline** (Ink UI ← ProgressEvents ← staged core orchestrator).
- Components, interface contracts, download pipeline, and cross-cutting concerns (auth/none, typed errors, stderr `--debug` logging, input/path security, resilience) defined. No database (N/A). Approved.

### Phase 6 — Technical Specification

- Implementation phases P1–P4 with dependencies; validation regexes; state machine; error codes + exit codes; scroll-stabilization algorithm; risk table (R-1…R-6) with mitigations + screenshot-stitch fallback; success criteria. Confidence reached **90%**. User said **proceed**.

---

## Decision Summary Tables

### Confirmed Decisions

| Topic           | Decision                                                             |
| --------------- | -------------------------------------------------------------------- |
| Project context | Greenfield, no AGENTS.md                                             |
| PDF fidelity    | Visual exact via Chromium `page.pdf()`                               |
| TUI scope       | Minimal single-doc; help → prompt → progress → result → exit         |
| Input           | Accept raw numeric ID **or** pasted full document URL (auto-extract) |
| Onboarding      | Help screen shows homepage URL + how to find a document ID           |
| Platform        | Windows 11 / PowerShell                                              |
| Testing         | None (manual verification)                                           |
| Runtime/Lang    | Node.js ≥20 LTS, TypeScript 5                                        |
| Browser/PDF     | Playwright (`page.pdf()`), auto-managed Chromium                     |
| TUI             | Ink 5 + ink-text-input                                               |
| Build/run       | tsx (dev), tsc (build), Prettier                                     |
| Architecture    | Layered + event-driven staged pipeline                               |
| Capture method  | Native print-to-PDF; screenshot-stitch (`pdf-lib`) as fallback       |
| Output          | `./downloads/<id>.pdf`                                               |
| Selector        | `div.outer_page_container` (configurable)                            |
| Data store      | None (no DB)                                                         |

### Open Questions

| Question                                                            | Status                                                                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Does Scribd virtualize/recycle page DOM (would defeat scroll-load)? | Open — mitigated by screenshot-stitch fallback (R-2); confirm in P2/P4 |
| Will target docs be reachable without login / no anti-bot block?    | Open — assumption; R-1 surfaces a clear message if blocked             |

### Assumptions

| #   | Assumption                                                                      | Impact if wrong                                          |
| --- | ------------------------------------------------------------------------------- | -------------------------------------------------------- |
| A-1 | Selector is `div.outer_page_container`                                          | Capture target changes (config one-liner)                |
| A-2 | Output path `./downloads/<id>.pdf`                                              | Only save location/filename changes                      |
| A-3 | Target docs are public (no auth)                                                | Scope expands to auth/anti-bot (out of current boundary) |
| A-4 | Document IDs are numeric (≥6 digits)                                            | Validation/extraction regex widens                       |
| A-5 | Lazy-load completes once scroll height/page count stabilizes (no DOM recycling) | Triggers screenshot-stitch fallback (R-2)                |
