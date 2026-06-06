import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Onboarding / help screen (FR-9): shows the Scribd homepage and how to find a document ID,
 * then advances to the prompt on Enter.
 */
import { Box, Text, useInput } from 'ink';
export default function HelpScreen({ onContinue }) {
    useInput((_input, key) => {
        if (key.return)
            onContinue();
    });
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "scribd-cli \u2014 save a Scribd document as a PDF" }), _jsx(Box, { marginTop: 1, flexDirection: "column", children: _jsxs(Text, { children: ["Browse documents at ", _jsx(Text, { color: "green", children: "https://www.scribd.com/home" })] }) }), _jsxs(Box, { marginTop: 1, flexDirection: "column", children: [_jsx(Text, { bold: true, children: "How to find a document ID:" }), _jsxs(Text, { children: ['  ', "1. Open any document on Scribd."] }), _jsxs(Text, { children: ['  ', "2. Look at the URL, e.g.", ' ', _jsx(Text, { color: "yellow", children: "https://www.scribd.com/document/507779687/rulebook" })] }), _jsxs(Text, { children: ['  ', "3. The number after ", _jsx(Text, { color: "yellow", children: "/document/" }), " is the ID \u2014", ' ', _jsx(Text, { bold: true, color: "green", children: "507779687" }), "."] }), _jsxs(Text, { children: ['  ', "You can paste the whole URL or just the ID at the next prompt."] })] }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "gray", children: "Press " }), _jsx(Text, { bold: true, color: "cyan", children: "Enter" }), _jsx(Text, { color: "gray", children: " to continue\u2026" })] })] }));
}
