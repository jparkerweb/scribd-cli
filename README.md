# scribd-cli

<img src="https://github.com/jparkerweb/scribd-cli/blob/main/scribd-cli.jpg?raw=true" alt="banner" style="max-height:300px;">

An interactive Windows terminal app (TUI) that takes a Scribd **document ID** — or a pasted
document URL — headless-renders the embed page, fully loads every lazy-loaded page, and saves a
**visually faithful PDF** of the document to `./downloads/<id>.pdf`.

It uses Node.js + TypeScript with [Playwright](https://playwright.dev) (Chromium's native
print-to-PDF) and an [Ink](https://github.com/vadimdemedes/ink) terminal UI.

> Only **public** documents are supported. There is no login, batch download, or anti-bot
> evasion — see [Scope](#scope).

---

## Install

Requires **Node.js ≥ 20**. Every option below auto-downloads a managed Chromium (~150 MB) on first
run via Playwright's `postinstall` — you never install a browser yourself. If that step is ever
skipped, run `npx playwright install chromium` once.

### Run it once — no install, no clone

```powershell
npx github:jparkerweb/scribd-cli
```

Fetches the repo and launches the app; nothing is added to your `PATH`.

### Install a global `scribd-cli` command — no clone (recommended)

```powershell
npx github:jparkerweb/scribd-cli install-global
scribd-cli
```

The `install-global` subcommand installs a global copy from the package npx just fetched
(`npm install -g <dir>` under the hood) — reliable, with no compiler needed since `dist/` ships
prebuilt. npm puts the launcher in its global bin dir (`npm config get prefix`; on Windows that's
`…\AppData\Roaming\npm`, already on `PATH`). Remove it later with `npm rm -g scribd-cli`.

> **Avoid** `npm install -g github:jparkerweb/scribd-cli` — on some Windows/npm setups it reports
> success but silently drops files during extraction (an npm tar bug), leaving a broken command.
> Use the `install-global` form above. _(Once published to npm, all of this shortens to
> `npx scribd-cli` / `npm install -g scribd-cli`.)_

### From a clone — development / from source

```powershell
git clone git@github.com:jparkerweb/scribd-cli.git   # or https://github.com/jparkerweb/scribd-cli.git
cd scribd-cli
npm install
```

From a clone you can run it with `npm run dev`, install a global copy with `npm install -g .`, or
create a live-updating global command with `npm link` (rebuild via `npm run build` to refresh it).

## Usage

Dev mode (runs the TypeScript directly via `tsx`):

```powershell
npm run dev
```

Built CLI:

```powershell
npm run build
npm start          # = node dist/index.js
# or, if installed/linked globally: scribd-cli
```

Verbose diagnostics (printed to stderr) with `--debug`:

```powershell
npm run dev -- --debug
# or, when installed globally: scribd-cli --debug
```

### What you'll see

1. **Help screen** — the Scribd homepage link and how to find a document ID.
2. **Prompt** — enter a raw ID _or_ paste a full document URL. Invalid input is rejected inline.
3. **Save options** — choose a file name (default: the document ID) and a directory (default:
   `./downloads`). Press Enter on either field to accept its default.
4. **Live progress** — launching → loading page → loading pages (scroll) → rendering → saving.
5. **Result** — `Saved → <dir>/<name>.pdf (<n> pages)`.

## How to find a document ID

Open any document on Scribd and look at the URL:

```
https://www.scribd.com/document/507779687/rulebook-zombicide-2nd-edition
                                ^^^^^^^^^
                                this is the ID
```

The number after `/document/` (here `507779687`) is the ID. You can paste the whole URL or just
the number.

## Output

By default the PDF is written to:

```
./downloads/<id>.pdf
```

At the **Save options** step you can override the file name and directory; pressing Enter on an
empty field keeps the default (file name = the document ID, directory = `./downloads`). The target
directory is created automatically if it doesn't exist, and the file name is sanitized to a safe
set of characters (spaces and hyphens are preserved).

## Exit codes

| Code | Meaning             | Message                                                                     |
| ---- | ------------------- | --------------------------------------------------------------------------- |
| 0    | Success             | `Saved → ./downloads/<id>.pdf (<n> pages)`                                  |
| 1    | Unknown error       | An unexpected error occurred.                                               |
| 2    | Invalid input       | That doesn't look like a valid Scribd ID or document URL.                   |
| 3    | Not found / private | Document not found or is private/unavailable.                               |
| 4    | Empty content       | No readable content found in the document container.                        |
| 5    | Network             | Network problem reaching Scribd — check your connection.                    |
| 6    | Browser launch      | Couldn't start the headless browser. Try `npx playwright install chromium`. |

## Configuration

All tunables — output directory, container selector, timeouts, scroll parameters, and the
browser identity — live in [`src/config.ts`](src/config.ts). If Scribd changes the page
container class, update `selector` there (single-point fix).

## Manual checks

No automated test framework is used (manual verification only). Two ad-hoc harnesses live under
`scripts/` (excluded from the build):

```powershell
npx tsx scripts/url.manual.ts                 # exercise ID/URL parsing
npx tsx scripts/download.manual.ts 507779687  # run a full download for one ID
```

## Scope

**Out of scope:** authenticated/private documents, Scribd login, batch downloads, non-Windows
targeting (may work but unverified), anti-bot evasion beyond realistic browser behavior, and OCR
/ PDF post-editing.

## Requirements

- Node.js ≥ 20 LTS
- Windows 11 / PowerShell (primary target)
