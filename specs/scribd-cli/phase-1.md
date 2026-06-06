# Phase 1 — Scaffold + URL Service

- **Status:** Complete (2026-06-06)
- **Estimated Tasks:** 8

## Overview

Stand up a buildable TypeScript project with the agreed tooling (tsx for dev, tsc for build, Prettier), then implement the foundational, browser-free modules: typed config, typed error classes with exit-code mapping, and the URL service that extracts a document ID from a raw ID or a pasted Scribd URL and builds the embed URL. At the end of this phase the project compiles and ID/URL parsing is provably correct.

## Prerequisites

- Node.js ≥ 20 LTS installed and on PATH.
- Empty/greenfield project directory at the repo root (no `AGENTS.md`).
- npm available for package management.

## Tasks

### Project Setup

- [ ] **Task 1.1:** Initialize `package.json` at the repo root. Set `"type": "module"`, `"engines": { "node": ">=20" }`, `"bin": { "scribd-cli": "dist/index.js" }`, and scripts: `"dev": "tsx src/index.ts"`, `"build": "tsc"`, `"start": "node dist/index.js"`, `"format": "prettier --write ."`. Add dev dependencies `typescript@^5`, `tsx`, `prettier`, and `@types/node`. Do NOT add Playwright/Ink yet (added in later phases).

- [ ] **Task 1.2:** Create `tsconfig.json` configured for Node ESM + React/Ink JSX. Set `"target": "ES2022"`, `"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"jsx": "react-jsx"`, `"strict": true`, `"esModuleInterop": true`, `"skipLibCheck": true`, `"outDir": "dist"`, `"rootDir": "src"`, and `"include": ["src"]`. (JSX is configured now so Phase 3 `.tsx` files compile without changes.)

- [ ] **Task 1.3:** Create `.prettierrc` with conventional defaults (e.g. `{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`) and a `.prettierignore` excluding `dist/`, `node_modules/`, and `downloads/`.

### Core Foundations

- [ ] **Task 1.4:** Create `src/config.ts` exporting a typed, frozen `config` object with: `outputDir: string` (default `'./downloads'`), `selector: string` (default `'div.outer_page_container'`), `embedUrlTemplate` parameters, and a `timeouts` group (`navigationMs`, `containerWaitMs`, `scrollSettleMs`, `totalMs`) plus a `scroll` group (`maxIterations`, `noGrowthThreshold: 3`, `stepDelayMs`). Export a TypeScript type for the config shape. Pick sensible defaults (e.g. `navigationMs: 45000`, `containerWaitMs: 30000`, `scrollSettleMs: 1500`, `noGrowthThreshold: 3`).

- [ ] **Task 1.5:** Create `src/core/errors.ts` defining a base `ScribdCliError extends Error` carrying an `exitCode: number` and a user-facing `friendlyMessage: string`, plus subclasses `InvalidInputError` (exit 2), `NotFoundError` (exit 3), `EmptyContentError` (exit 4), `NetworkError` (exit 5), and `BrowserError` (exit 6). Use the exact messages from the overview's Exit Codes table. Export a helper `toExitCode(err: unknown): number` that returns the error's `exitCode` for `ScribdCliError` instances and `1` for any other error.

### URL Service

- [ ] **Task 1.6:** In `src/core/url.ts`, implement `parseDocumentId(input: string): { id: string }`. Trim input; if it matches the raw-ID regex `^\d{6,}$`, return it directly. Otherwise attempt URL extraction via `scribd\.com/document(?:s)?/(\d+)` and, failing that, `scribd\.com/embeds/(\d+)`. If no numeric ID can be extracted, throw `InvalidInputError`. Handle leading/trailing whitespace and surrounding query strings/fragments in pasted URLs.

- [ ] **Task 1.7:** In `src/core/url.ts`, implement `buildEmbedUrl(id: string): string` returning the fixed template `https://www.scribd.com/embeds/${id}/content?start_page=1&view_mode=scroll&show_recommendations=false` (FR-2). Keep the query parameters in this exact order and form.

- [ ] **Task 1.8:** Add a temporary manual-check harness `src/core/url.manual.ts` (runnable via `tsx`) that calls `parseDocumentId` + `buildEmbedUrl` against representative inputs — a raw ID (`507779687`), a full document URL (`https://www.scribd.com/document/507779687/rulebook-zombicide-2nd-edition`), a `documents/` variant, an embed URL, and an invalid string — printing results/errors to stdout. This verifies parsing without a formal test framework (Testing Strategy: None). Mark it for removal or relocation in Phase 4 cleanup.

## Acceptance Criteria

- `npm run build` compiles with no TypeScript errors and emits to `dist/`.
- `npm run dev` and `tsx` execute without module-resolution errors.
- `parseDocumentId` returns `507779687` for both a raw ID and a pasted document URL, and throws `InvalidInputError` for empty/malformed input.
- `buildEmbedUrl('507779687')` returns the exact FR-2 embed URL.
- `src/config.ts` exposes typed defaults for output dir, selector, timeouts, and scroll params.
- `src/core/errors.ts` exposes all five typed error classes with the correct exit codes and friendly messages, plus `toExitCode`.

## Notes

- This phase intentionally has **no Playwright or Ink dependency** so it compiles and runs instantly; those arrive in P2 and P3.
- Keep `config.ts` free of side effects — pure data + types — so both core and UI can import it safely.
- Error friendly messages must match the overview Exit Codes table verbatim; they are surfaced directly in the TUI (Phase 4).

## Phase Completion Summary

- **Date:** 2026-06-06
- **What was done:** Initialized an ESM TypeScript project (`package.json` with `type: module`,
  `bin`, scripts; `tsconfig.json` with `ES2022`/`ESNext`/`Bundler`/`react-jsx`/`strict`;
  `.prettierrc` + `.prettierignore`). Implemented `src/config.ts` (frozen, typed defaults: output
  dir, selector, `pageSelector`, embed params, timeouts, scroll params, browser identity),
  `src/core/errors.ts` (base `ScribdCliError` + `InvalidInput/NotFound/EmptyContent/Network/Browser`
  - `UnknownError`, `toExitCode`, `normalizeError`), and `src/core/url.ts` (`parseDocumentId`,
    `buildEmbedUrl`).
- **Files:** `package.json`, `tsconfig.json`, `.prettierrc`, `.prettierignore`, `src/config.ts`,
  `src/core/errors.ts`, `src/core/url.ts`, `scripts/url.manual.ts`.
- **Verification:** `npm run build` clean; `url.manual.ts` confirmed raw ID, `/document/`,
  `/documents/`, `/embeds/`, and whitespace-wrapped URLs all extract `507779687`, junk + empty
  throw `InvalidInputError`; `buildEmbedUrl` matches the exact FR-2 template.
- **Issues:** None.
