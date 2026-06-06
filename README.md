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

## Quick start (no clone)

Run it straight from GitHub with `npx` — no manual clone, no global install:

```powershell
npx github:jparkerweb/scribd-cli
```

That fetches the repo, builds it, downloads a managed Chromium, and launches the app. _(Once the
package is published to npm, this shortens to `npx scribd-cli`.)_

To install it as a persistent `scribd-cli` command on your `PATH`:

```powershell
npm install -g github:jparkerweb/scribd-cli
scribd-cli
```

See [Install globally](#install-globally-run-scribd-cli-from-anywhere) for all options and how to
uninstall.

## Install (from a clone)

For development, or to run from source:

```powershell
git clone git@github.com:jparkerweb/scribd-cli.git
cd scribd-cli
npm install
```

> Prefer HTTPS? Use `git clone https://github.com/jparkerweb/scribd-cli.git` instead.

On first install, a `postinstall` script runs `playwright install chromium`, which downloads a
managed Chromium build (~150 MB). You do **not** need to install a browser yourself. If that step
is ever skipped or fails, run it manually:

```powershell
npx playwright install chromium
```

## Usage

Run in dev mode (TypeScript directly via `tsx`):

```powershell
npm run dev
```

Or build once and run the compiled CLI:

```powershell
npm run build
npm start          # = node dist/index.js
# or, if linked globally: scribd-cli
```

Enable verbose diagnostics (printed to stderr) with `--debug`:

```powershell
npm run dev -- --debug
```

### Install globally (run `scribd-cli` from anywhere)

The package declares a `bin`, so it can be put on your `PATH` as a real command. Pick one:

**A. Install straight from GitHub** (no manual clone — npm builds and fetches Chromium for you):

```powershell
npm install -g github:jparkerweb/scribd-cli
scribd-cli
```

**B. From a local clone** — link it (a symlink that tracks your working copy; great while developing):

```powershell
cd scribd-cli
npm install
npm link
scribd-cli
```

**C. From a local clone** — install a global copy:

```powershell
cd scribd-cli
npm install -g .
scribd-cli
```

In every case npm creates a `scribd-cli` launcher in its global bin directory (run
`npm config get prefix` to see it — on Windows it's `…\AppData\Roaming\npm`, which the Node
installer adds to `PATH`). If the command isn't found afterward, make sure that directory is on
your `PATH` and open a new terminal.

To remove the global command later:

```powershell
npm rm -g scribd-cli      # or: npm unlink -g scribd-cli  (for option B)
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
