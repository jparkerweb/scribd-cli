# Phase 3 — TUI

- **Status:** Complete (2026-06-06)
- **Estimated Tasks:** 8

## Overview

Build the Ink terminal UI: a CLI entry that bootstraps the app and parses `--debug`, a top-level `App` component implementing a reducer state machine (HELP → INPUT → WORKING → DONE/ERROR), and the four subviews — an onboarding HelpScreen, a validating ID/URL prompt, a live progress view, and a result/error view. The UI consumes the `runDownload`/`ProgressEvent` contract from Phase 2. Full wiring of typed errors to exit codes is completed in Phase 4.

## Prerequisites

- Phase 1 complete: `src/config.ts`, `src/core/errors.ts`, `src/core/url.ts`.
- Phase 2 complete: `src/core/downloader.ts` exporting `runDownload`, `ProgressEvent`, `DownloadOptions`, `DownloadResult`, `Stage`.
- `tsconfig.json` already has `"jsx": "react-jsx"` (set in Phase 1).

## Tasks

### Setup & Entry

- [ ] **Task 3.1:** Add `ink@^5`, `ink-text-input@^6`, and `react` (with `@types/react`) as dependencies. Confirm `tsx src/index.ts` can render a trivial Ink component.

- [ ] **Task 3.2:** Create `src/index.ts` (CLI entry): parse `process.argv` for a `--debug` flag, call Ink's `render(<App debug={debug} />)`, and obtain the app's final exit intent (via a callback/promise the `App` resolves) to set `process.exitCode`. Defer the full error→exit-code mapping to Phase 4 Task 4.1; for now wire success → exit 0 and surface a placeholder non-zero on error.

### State Machine

- [ ] **Task 3.3:** Create `src/ui/App.tsx` defining the UI state type as a discriminated union — `{ phase: 'HELP' } | { phase: 'INPUT' } | { phase: 'WORKING'; stage: Stage; message: string; current?: number; total?: number } | { phase: 'DONE'; result: DownloadResult } | { phase: 'ERROR'; error: ScribdCliError }` — and a `useReducer` with actions for `SUBMIT_HELP`, `SUBMIT_ID`, `PROGRESS`, `SUCCEEDED`, `FAILED`. Render the correct subview per `phase`. Accept a `debug` prop.

- [ ] **Task 3.4:** In `src/ui/App.tsx`, implement the side-effecting transition from INPUT → WORKING: on ID submit, call `parseDocumentId` (catching `InvalidInputError` → ERROR), then invoke `runDownload({ id, outputDir: config.outputDir, debug }, onProgress)` where `onProgress` dispatches `PROGRESS` actions. On resolve dispatch `SUCCEEDED`; on reject dispatch `FAILED` (normalizing non-`ScribdCliError` to a generic error). Use `useEffect` so the async work runs once on entering WORKING.

### Subviews

- [ ] **Task 3.5:** Create `src/ui/HelpScreen.tsx` (FR-9): display the Scribd homepage URL (`https://www.scribd.com/home`) and step-by-step instructions for finding a document ID from a document URL, using the worked example `https://www.scribd.com/document/507779687/...` → `507779687`. Show a "Press Enter to continue" affordance that dispatches `SUBMIT_HELP` to advance to INPUT. Use `useInput` for the Enter key.

- [ ] **Task 3.6:** Create `src/ui/IdPrompt.tsx` (FR-1) using `ink-text-input`: prompt "Enter a Scribd document ID or paste a document URL". Validate on submit by running the input through `parseDocumentId` — on success dispatch `SUBMIT_ID` with the extracted id; on `InvalidInputError` show an inline red validation message and keep the prompt focused (do not advance). Reject empty input.

- [ ] **Task 3.7:** Create `src/ui/ProgressView.tsx` (FR-7) rendering the current `Stage` as a friendly label (launching → loading page → loading pages → rendering → saving → done) with an Ink spinner, and when `current`/`total` are present during `LOADING_PAGES`, show a "pages loaded: current/total" indicator.

- [ ] **Task 3.8:** Create `src/ui/ResultView.tsx` handling both terminal phases: on DONE, render a success line "Saved → <outputPath> (<pageCount> pages)" (matching the exit-0 message form); on ERROR, render the error's `friendlyMessage` in red. (Exit-code emission is handled by `index.ts` in Phase 4.)

## Acceptance Criteria

- `tsx src/index.ts` launches into the HelpScreen showing the homepage link and ID-finding instructions; pressing Enter advances to the prompt.
- The prompt accepts a raw ID and a pasted document URL, and shows an inline validation error (without advancing) for empty/malformed input.
- Submitting a valid ID transitions to a live ProgressView that reflects each stage emitted by `runDownload`, including page count during scroll-load.
- On success, ResultView shows the saved path and page count; on failure, it shows the typed error's friendly message.
- The app compiles under `npm run build` with JSX and no type errors.

## Notes

- This phase consumes Phase 2's exported contract directly — do not re-declare `Stage`/`ProgressEvent`; import them from `src/core/downloader.ts`.
- Keep all rendering pure/declarative; the only side effect (calling `runDownload`) lives in a single `useEffect` in `App.tsx`.
- The final exit-code wiring and end-to-end error mapping are intentionally deferred to Phase 4.

## Phase Completion Summary

- **Date:** 2026-06-06
- **What was done:** Added `ink@^5`, `ink-text-input@^6`, `ink-spinner@^5`, `react@^18` +
  `@types/react`. `src/index.ts` parses `--debug`, renders `<App>` via `createElement` (keeps the
  file `.ts`), and resolves the exit code into `process.exitCode`. `src/ui/App.tsx` is a `useReducer`
  state machine (HELP→INPUT→WORKING→DONE/ERROR) whose single side effect runs `runDownload` once per
  id (guarded by a ref) and dispatches `PROGRESS`/`SUCCEEDED`/`FAILED`. Subviews: `HelpScreen`
  (homepage + ID example `507779687`, Enter to continue), `IdPrompt` (validates via
  `parseDocumentId`, inline error without advancing, rejects empty), `ProgressView` (stage labels +
  `ink-spinner` + `pages loaded: current/total`), `ResultView` (success line / red friendly error).
- **Files:** `src/index.ts`, `src/ui/App.tsx`, `src/ui/HelpScreen.tsx`, `src/ui/IdPrompt.tsx`,
  `src/ui/ProgressView.tsx`, `src/ui/ResultView.tsx`, `package.json` (UI deps).
- **Verification:** `npm run build` compiles the JSX cleanly; an Ink/React/tsx render smoke test
  confirmed the runtime renders and unmounts. (The interactive HelpScreen needs a real TTY's raw
  mode, so live keypress flow is verified in-terminal per Phase 4.)
- **Decision:** Input validation lives in `IdPrompt` (better UX) which dispatches `SUBMIT_ID` with
  the already-extracted id; `App`'s WORKING effect then runs `runDownload` with it — reconciling
  Task 3.4/3.6 without double-parsing.
- **Issues:** None.
