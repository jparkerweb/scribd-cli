#!/usr/bin/env node
/**
 * CLI entry: bootstrap the Ink app, parse `--debug`, and translate the app's terminal state
 * into a process exit code (FR-8). Exit-code values come from `toExitCode` (errors.ts).
 */
import { render } from 'ink';
import { createElement } from 'react';
import App from './ui/App.js';
const debug = process.argv.includes('--debug');
const { waitUntilExit } = render(createElement(App, {
    debug,
    onResult: (code) => {
        process.exitCode = code;
    },
}));
await waitUntilExit();
