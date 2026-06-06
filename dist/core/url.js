/**
 * URL service (FR-1, FR-2): extract a document ID from a raw ID or a pasted Scribd URL,
 * and build the fixed embed URL.
 */
import { InvalidInputError } from './errors.js';
/** A post-extraction document ID: 6+ digits (A-4). */
const RAW_ID = /^\d{6,}$/;
/** `scribd.com/document/<id>` and `scribd.com/documents/<id>`. */
const DOCUMENT_URL = /scribd\.com\/document(?:s)?\/(\d+)/i;
/** `scribd.com/embeds/<id>`. */
const EMBED_URL = /scribd\.com\/embeds\/(\d+)/i;
/**
 * Parse a document ID from arbitrary input.
 *
 * Accepts a bare numeric ID (`507779687`) or a pasted document/embed URL, tolerating
 * surrounding whitespace, query strings, and fragments. Throws {@link InvalidInputError}
 * when no valid numeric ID can be recovered.
 */
export function parseDocumentId(input) {
    const trimmed = (input ?? '').trim();
    if (!trimmed) {
        throw new InvalidInputError('Empty input');
    }
    // Fast path: the input is already a bare ID.
    if (RAW_ID.test(trimmed)) {
        return { id: trimmed };
    }
    // Otherwise try to pull the ID out of a pasted URL.
    const match = trimmed.match(DOCUMENT_URL) ?? trimmed.match(EMBED_URL);
    if (match && RAW_ID.test(match[1])) {
        return { id: match[1] };
    }
    throw new InvalidInputError(`Unrecognized Scribd ID or URL: ${trimmed}`);
}
/**
 * Build the fixed FR-2 embed URL for a document ID. Query parameters are kept in this exact
 * order and form — Scribd's scroll view-mode is what lazily renders every page.
 */
export function buildEmbedUrl(id) {
    return `https://www.scribd.com/embeds/${id}/content?start_page=1&view_mode=scroll&show_recommendations=false`;
}
