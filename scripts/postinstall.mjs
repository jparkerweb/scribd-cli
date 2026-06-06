/**
 * Post-install: download the Chromium build Playwright needs (NFR-4 / R-5).
 *
 * Resolves Playwright's CLI via Node module resolution rather than the `playwright` PATH bin, so it
 * works regardless of how npm installs the package (local, `npm install -g`, or straight from a
 * GitHub source where the bin may not be on PATH). Never hard-fails the install — if the browser
 * download can't run, it prints the one manual command to fix it and exits 0.
 */

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const FIX_HINT = 'Run this once manually:  npx playwright install chromium';

let cliPath;
try {
  // require.resolve on package.json is allowed even with strict "exports" maps.
  cliPath = path.join(path.dirname(require.resolve('playwright/package.json')), 'cli.js');
} catch {
  console.warn(`\n[scribd-cli] Playwright not found; skipping Chromium download.\n  ${FIX_HINT}\n`);
  process.exit(0);
}

try {
  execFileSync(process.execPath, [cliPath, 'install', 'chromium'], { stdio: 'inherit' });
} catch {
  console.warn(`\n[scribd-cli] Could not auto-install Chromium.\n  ${FIX_HINT}\n`);
  process.exit(0); // don't fail the whole install over the browser download
}
