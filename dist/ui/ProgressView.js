import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Live progress view (FR-7): renders the current pipeline stage as a friendly label with a
 * spinner, and shows "pages loaded: current/total" during scroll-load.
 */
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
const STAGE_LABELS = {
    PARSING: 'Preparing',
    LAUNCHING: 'Launching headless browser',
    NAVIGATING: 'Loading document page',
    LOADING_PAGES: 'Loading all pages',
    RENDERING: 'Rendering PDF',
    SAVING: 'Saving file',
    DONE: 'Done',
};
export default function ProgressView({ stage, current, total }) {
    const label = STAGE_LABELS[stage] ?? stage;
    const showPages = stage === 'LOADING_PAGES' && typeof current === 'number';
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsxs(Box, { children: [_jsx(Text, { color: "cyan", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { children: [" ", label, "\u2026"] })] }), showPages && (_jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "gray", children: ["pages loaded: ", current, typeof total === 'number' && total > 0 ? `/${total}` : ''] }) }))] }));
}
