import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ID / URL prompt (FR-1): validates input through `parseDocumentId`. On success it reports the
 * extracted id; on invalid input it shows an inline error and keeps focus (does not advance).
 */
import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { parseDocumentId } from '../core/url.js';
import { InvalidInputError } from '../core/errors.js';
export default function IdPrompt({ onSubmit }) {
    const [value, setValue] = useState('');
    const [error, setError] = useState(null);
    const handleSubmit = (raw) => {
        const trimmed = raw.trim();
        if (!trimmed) {
            setError('Please enter a document ID or URL.');
            return;
        }
        try {
            const { id } = parseDocumentId(trimmed);
            onSubmit(id);
        }
        catch (err) {
            setError(err instanceof InvalidInputError
                ? err.friendlyMessage
                : 'That doesn’t look like a valid Scribd ID or document URL.');
        }
    };
    const handleChange = (next) => {
        setValue(next);
        if (error)
            setError(null);
    };
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsx(Text, { children: "Enter a Scribd document ID or paste a document URL:" }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyan", children: '> ' }), _jsx(TextInput, { value: value, onChange: handleChange, onSubmit: handleSubmit, placeholder: "e.g. 507779687 or https://www.scribd.com/document/507779687/\u2026" })] }), error && (_jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "red", children: ["\u2717 ", error] }) }))] }));
}
