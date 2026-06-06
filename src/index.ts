#!/usr/bin/env node
/**
 * CLI entry: bootstrap the Ink app, parse `--debug`, and translate the app's terminal state
 * into a process exit code (FR-8). Exit-code values come from `toExitCode` (errors.ts).
 *
 * Subcommand: `install-global` installs this package globally from its own location (see
 * install.ts) — useful via `npx github:jparkerweb/scribd-cli install-global`.
 */

import { render } from 'ink';
import { createElement } from 'react';
import App from './ui/App.js';
import { installGlobally } from './install.js';

const args = process.argv.slice(2);

if (args[0] === 'install-global') {
  installGlobally();
} else {
  const debug = args.includes('--debug');
  const { waitUntilExit } = render(
    createElement(App, {
      debug,
      onResult: (code: number) => {
        process.exitCode = code;
      },
    }),
  );
  await waitUntilExit();
}
