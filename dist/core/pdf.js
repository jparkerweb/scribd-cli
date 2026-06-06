/**
 * PDF generation (FR-5, FR-6): isolate the page container so the print captures only the
 * document pages, then render a visually exact PDF via Chromium's native print-to-PDF.
 */
import { stat } from 'node:fs/promises';
/**
 * Strip away all surrounding Scribd chrome and *un-clip the inner scroll container* so the full
 * stacked list of pages lays out in normal flow and print can paginate across every page.
 *
 * The embed renders pages inside an `overflow:auto`, fixed-height, absolutely-positioned
 * `div.document_scroller`; left alone, print clips to a single viewport (one PDF page). So we:
 *  1. Walk from the container up to `<body>`, hiding every sibling and resetting each ancestor's
 *     overflow/height/position so nothing clips the content.
 *  2. Measure a representative page (post-layout) to derive an exact `@page` size — making each
 *     PDF page match a document page (R-4: avoids splitting / blank pages).
 *  3. Inject print CSS: the exact `@page` size, white background, color-adjust:exact (so page
 *     backgrounds/images print), and a hard page break after every page element.
 */
export async function isolateContainer(page, selector) {
    await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (!container)
            return;
        // Hide siblings and un-clip every ancestor from the container up to <body>.
        let node = container;
        while (node && node.parentElement && node !== document.body) {
            const parent = node.parentElement;
            for (const child of Array.from(parent.children)) {
                if (child !== node)
                    child.style.display = 'none';
            }
            parent.style.margin = '0';
            parent.style.padding = '0';
            parent.style.width = 'auto';
            parent.style.maxWidth = 'none';
            parent.style.height = 'auto';
            parent.style.maxHeight = 'none';
            parent.style.minHeight = '0';
            parent.style.overflow = 'visible';
            parent.style.background = '#ffffff';
            parent.style.boxShadow = 'none';
            const pos = getComputedStyle(parent).position;
            if (pos === 'absolute' || pos === 'fixed') {
                parent.style.position = 'static';
                parent.style.top = 'auto';
                parent.style.left = 'auto';
            }
            node = parent;
        }
        for (const el of [document.documentElement, document.body]) {
            el.style.margin = '0';
            el.style.padding = '0';
            el.style.height = 'auto';
            el.style.overflow = 'visible';
            el.style.background = '#ffffff';
        }
        container.style.margin = '0 auto';
        container.style.padding = '0';
        container.style.height = 'auto';
        container.style.maxHeight = 'none';
        container.style.overflow = 'visible';
        container.style.background = '#ffffff';
        container.style.boxShadow = 'none';
        // Remove inter-page gaps/shadows so each page aligns to a print page boundary.
        container.querySelectorAll('.outer_page').forEach((p) => {
            const el = p;
            el.style.margin = '0 auto';
            el.style.boxShadow = 'none';
        });
    }, selector);
    // Measure a representative page AFTER neutralizing layout for an exact @page size.
    const dims = await page.evaluate((sel) => {
        const container = document.querySelector(sel);
        if (!container)
            return null;
        const first = container.querySelector('.outer_page') ??
            container.firstElementChild ??
            container;
        const rect = first.getBoundingClientRect();
        const width = Math.round(rect.width || first.offsetWidth);
        const height = Math.round(rect.height || first.offsetHeight);
        return { width, height };
    }, selector);
    const sizeRule = dims && dims.width > 0 && dims.height > 0
        ? `@page { size: ${dims.width}px ${dims.height}px; margin: 0; }`
        : `@page { margin: 0; }`;
    await page.addStyleTag({
        content: `
      ${sizeRule}
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .outer_page {
        box-shadow: none !important;
        margin: 0 auto !important;
        break-after: page;
        page-break-after: always;
        break-inside: avoid;
      }
      .outer_page:last-child { break-after: auto; page-break-after: auto; }
    `,
    });
}
/**
 * Render the (already-isolated) page to a PDF on disk and return its byte size.
 *
 * Uses `screen` media emulation so the document renders exactly as displayed (Scribd's screen
 * styles paint the pages); `preferCSSPageSize` then honors the `@page` size injected by
 * {@link isolateContainer}.
 */
export async function generatePdf(page, outputPath) {
    await page.emulateMedia({ media: 'screen' });
    await page.pdf({
        path: outputPath,
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    const { size } = await stat(outputPath);
    return { bytes: size };
}
