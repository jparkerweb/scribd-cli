/**
 * Manual check (no test framework). Run with:
 *   npx tsx scripts/download.manual.ts [documentId] [fileName] [outputDir]
 * Drives runDownload for a public document and logs progress events + the result.
 */

import { config } from '../src/config.js';
import { runDownload } from '../src/core/downloader.js';

const id = process.argv[2] ?? '507779687';
const fileName = process.argv[3];
const outputDir = process.argv[4] ?? config.outputDir;

runDownload({ id, outputDir, fileName, debug: true }, (e) => {
  const counts =
    e.current !== undefined ? ` (${e.current}${e.total !== undefined ? '/' + e.total : ''})` : '';
  console.error(`[${e.stage}] ${e.message}${counts}`);
})
  .then((result) => {
    console.log('RESULT', result);
  })
  .catch((err) => {
    console.error('ERROR', err);
    process.exitCode = 1;
  });
