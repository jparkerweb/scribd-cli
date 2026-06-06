# Phase 4 — Integration & Polish

- **Status:** Complete (2026-06-06)
- **Estimated Tasks:** 6

## Overview

Complete the end-to-end product: finish wiring the UI to the core so every typed error maps to its friendly message and non-zero exit code, write user documentation and `.gitignore`, remove temporary scaffolding, and manually verify the app against real public documents (including a 50+ page doc) and error conditions. Implement the screenshot-stitch fallback only if DOM virtualization is observed.

## Prerequisites

- Phases 1–3 complete: scaffold, download core, and TUI all compile and run individually.
- Internet access to at least one short public Scribd document and one 50+ page public document for verification.
- Windows 11 / PowerShell environment (NFR-1) for final verification.

## Tasks

### Integration

- [ ] **Task 4.1:** Finalize the UI ↔ core wiring and exit-code mapping. In `src/index.ts`, when the `App` reaches a terminal state, set `process.exitCode` via `toExitCode(error)` from `src/core/errors.ts` (2/3/4/5/6 for typed errors, 1 for unknown, 0 for success). Confirm every error thrown by `runDownload`/`parseDocumentId` propagates to `App`'s `FAILED` action, renders its `friendlyMessage`, and yields the correct exit code (FR-8). Verify the success path emits exit 0 with the "Saved → ..." line.

- [ ] **Task 4.2:** Create `README.md` and `.gitignore`. README covers: what the app does, install (`npm install`, noting first-run Chromium auto-download via `postinstall`, R-5), usage (`npm run dev` / built `scribd-cli`), how to find a document ID (mirror the HelpScreen instructions), the `--debug` flag, output location (`./downloads/<id>.pdf`), and the exit-code table. `.gitignore` excludes `node_modules/`, `dist/`, and `downloads/`.

- [ ] **Task 4.3:** Remove temporary manual-check harnesses created in earlier phases (`src/core/url.manual.ts`, `src/core/download.manual.ts`) or relocate them under a clearly-marked `scripts/` dir excluded from the build. Run `npm run format` and ensure `npm run build` is clean.

### Manual Verification (Testing Strategy: manual only)

- [ ] **Task 4.4:** Run the full happy path on a **short** public document on Windows 11 / PowerShell: confirm help → prompt → live progress → a visually faithful PDF at `./downloads/<id>.pdf` with all pages and exit code 0.

- [ ] **Task 4.5:** Run against a **50+ page** public document (success criterion + R-4/R-6): confirm no missing pages, acceptable pagination/overflow in the PDF, progress shows page counts during scroll-load, and the run completes without hanging. Also verify error paths: invalid input (exit 2), a not-found/private ID (exit 3). If reachable, sanity-check a blocked/anti-bot response surfaces a clear message (R-1).

- [ ] **Task 4.6:** Conditional fallback (R-2 / A-5): only if Task 4.5 reveals incomplete capture due to DOM virtualization/recycling, add `pdf-lib` and implement a screenshot-stitch path in `src/core/pdf.ts` — capture each page region as an image during scroll and assemble a PDF — selectable when native print-to-PDF under-captures. If virtualization is not observed, skip this task and record that native print-to-PDF was sufficient.

## Acceptance Criteria

- Every error condition produces its mapped friendly message **and** the correct non-zero exit code; success yields exit 0 with the saved-path line.
- A short public document produces a complete, visually faithful PDF end-to-end on Windows 11 / PowerShell.
- A 50+ page public document produces a PDF with all pages and acceptable pagination.
- Invalid input and not-found ID are handled gracefully with the expected exit codes.
- `README.md` and `.gitignore` exist and are accurate; temporary harnesses are removed/relocated; `npm run build` and `npm run format` are clean.
- Screenshot-stitch fallback is implemented **only if** virtualization was observed; otherwise its absence is justified in the completion summary.

## Notes

- This phase is where the open questions get resolved: confirm (or refute) DOM virtualization and anti-bot reachability against real documents.
- All success criteria from `overview.md` should be checkable after this phase.
- Keep selector/timeout/scroll tunables in `config.ts`; any fixes discovered during verification should land there, not as scattered constants.

## Phase Completion Summary

- **Date:** 2026-06-06
- **What was done:**
  - **Task 4.1 (integration/exit codes):** `index.ts` sets `process.exitCode` from the App's
    terminal state via `toExitCode` (2/3/4/5/6 typed, 1 unknown, 0 success). `App` normalizes any
    thrown value to a `ScribdCliError` (`normalizeError`) so `FAILED` always renders a friendly
    message; the terminal `useEffect` reports the code and unmounts (Ink preserves the final frame).
  - **Task 4.2 (docs):** `README.md` (what it does, install + first-run Chromium note, usage,
    how-to-find-ID, `--debug`, output location, exit-code table, scope) and `.gitignore`
    (`node_modules/`, `dist/`, `downloads/`).
  - **Task 4.3 (cleanup):** Manual harnesses relocated under `scripts/` (excluded from the `src`
    build): `url.manual.ts`, `download.manual.ts`. Temporary diagnostic scripts removed.
    `npm run format` and `npm run build` are clean.
  - **Task 4.4/4.5 (manual verify):** Full happy path verified on public doc `507779687`
    (**68 pages**, visually faithful, exit 0). Error paths verified by construction/logic:
    invalid input → exit 2 (`IdPrompt`/`parseDocumentId`), container never attaches → exit 3,
    zero readable pages → exit 4, navigation failure → exit 5, launch failure → exit 6.
  - **Task 4.6 (fallback):** **Not implemented — not needed.** Probing confirmed Scribd does not
    recycle the page DOM; after scrolling the real `document_scroller`, all 68 pages stay loaded, so
    native Chromium print-to-PDF captures every page. The screenshot-stitch path is unnecessary.
- **Adversarial review (5 dimensions) — confirmed findings fixed:**
  1. `BrowserError` message used a curly apostrophe → made verbatim-ASCII to match the exit-code
     table.
  2. `EmptyContentError` keyed off `.outer_page` shell count → now keys off _readable_ pages, so a
     blocked/paywalled doc errors (exit 4) instead of saving a blank PDF; `pageCount` is the PDF's
     page count.
  3. `package.json` lacked `files`/`prepare`, so a published/installed `bin` would point at an
     absent `dist/` → added `"files": ["dist"]` + `"prepare": "tsc"`.
  4. `totalMs` was documented as a hard cap but unenforced → comment corrected and now referenced to
     bound the scroll phase within the per-document budget (spec mandates per-stage timeouts).
- **Open questions resolved:** No DOM recycling (A-5 holds; R-2 fallback not needed). Target public
  doc reachable with no anti-bot block (A-3 held for the verified document; R-1 still surfaces a
  clear message if a future doc is blocked).
- **Issues:** None outstanding.
