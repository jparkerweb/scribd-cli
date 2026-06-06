/**
 * `install-global` subcommand: install this package globally from its own location.
 *
 * When run via `npx github:jparkerweb/scribd-cli install-global`, npx has already fetched the
 * repo into its cache; this installs a global copy from that directory with
 * `npm install --global <packageRoot>`. That local-folder install path is reliable (unlike
 * `npm install -g github:…`, which can drop files during extraction on Windows) and needs no
 * compiler because `dist/` ships prebuilt.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export function installGlobally() {
    // dist/install.js → dist → package root
    const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
    console.log(`Installing scribd-cli globally from:\n  ${packageRoot}\n`);
    execSync(`npm install --global "${packageRoot}"`, { stdio: 'inherit' });
    console.log('\n✓ Installed. Run it anywhere with:  scribd-cli');
}
