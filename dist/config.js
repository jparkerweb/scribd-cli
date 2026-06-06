/**
 * Central, side-effect-free configuration for scribd-cli.
 *
 * All tunables (selector, timeouts, scroll parameters, browser identity) live here so that
 * risk mitigations R-3 (selector change), R-4 (PDF pagination), and R-6 (long-doc timeouts)
 * are single-point fixes. Keep this module pure data + types — both the core and the UI import it.
 */
export const config = Object.freeze({
    outputDir: './downloads',
    selector: 'div.outer_page_container',
    pageSelector: '.outer_page',
    embed: {
        startPage: 1,
        viewMode: 'scroll',
        showRecommendations: false,
    },
    timeouts: {
        navigationMs: 45_000,
        containerWaitMs: 30_000,
        scrollSettleMs: 1_500,
        totalMs: 300_000,
    },
    scroll: {
        maxIterations: 60,
        noGrowthThreshold: 3,
        stepDelayMs: 250,
        maxTimeMs: 240_000,
    },
    browser: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 1696 },
        deviceScaleFactor: 2,
    },
});
