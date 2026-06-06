/**
 * Manual check (no test framework — Testing Strategy: None). Run with:
 *   npx tsx scripts/url.manual.ts
 * Verifies parseDocumentId + buildEmbedUrl against representative inputs.
 */

import { buildEmbedUrl, parseDocumentId } from '../src/core/url.js';

const inputs = [
  '507779687',
  '  507779687  ',
  'https://www.scribd.com/document/507779687/rulebook-zombicide-2nd-edition',
  'https://www.scribd.com/documents/507779687/foo?bar=1#frag',
  'https://www.scribd.com/embeds/507779687/content?start_page=1&view_mode=scroll',
  'not-a-document',
  '',
];

for (const input of inputs) {
  try {
    const { id } = parseDocumentId(input);
    console.log('OK   ', JSON.stringify(input), '→', id);
    console.log('       embed:', buildEmbedUrl(id));
  } catch (err) {
    console.log('FAIL ', JSON.stringify(input), '→', err instanceof Error ? err.message : err);
  }
}
