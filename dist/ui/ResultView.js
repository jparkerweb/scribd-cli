import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Terminal view: success (DONE) or failure (ERROR).
 *
 * On success it prints the exit-0 message form — "Saved → <path> (<n> pages)".
 * On failure it prints the typed error's `friendlyMessage` in red. The exit code itself is set
 * by `index.ts` via `toExitCode`.
 */
import { Box, Text } from 'ink';
export default function ResultView({ result, error }) {
    if (result) {
        return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsxs(Text, { color: "green", children: ["\u2713 Saved \u2192 ", result.outputPath, " (", result.pageCount, " pages)"] }), _jsxs(Text, { color: "gray", children: [formatBytes(result.bytes), " written."] })] }));
    }
    if (error) {
        return (_jsx(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error.friendlyMessage] }) }));
    }
    return null;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
