import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Save-options prompt: choose the output file name and directory before downloading.
 *
 * Two sequential fields (file name, then directory). Pressing Enter on an empty field accepts the
 * default — file name = the document ID, directory = `config.outputDir` (./downloads). The final,
 * sanitized path is computed by the downloader; this view shows an approximate preview.
 */
import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { config } from '../config.js';
export default function SaveOptions({ id, onSubmit }) {
    const defaultName = id;
    const defaultDir = config.outputDir;
    const [step, setStep] = useState('name');
    const [nameInput, setNameInput] = useState('');
    const [fileName, setFileName] = useState(defaultName);
    const [dirInput, setDirInput] = useState('');
    const handleNameSubmit = (raw) => {
        setFileName(raw.trim() || defaultName);
        setStep('dir');
    };
    const handleDirSubmit = (raw) => {
        onSubmit({ fileName, outputDir: raw.trim() || defaultDir });
    };
    const previewDir = (dirInput.trim() || defaultDir).replace(/[\\/]+$/, '');
    const previewName = step === 'name' ? defaultName : fileName;
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, paddingY: 1, children: [_jsx(Text, { children: "Where should I save the PDF? Press Enter to accept the default." }), _jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyan", children: "File name " }), _jsxs(Text, { color: "gray", children: ["[", defaultName, "]: "] }), step === 'name' ? (_jsx(TextInput, { value: nameInput, onChange: setNameInput, onSubmit: handleNameSubmit, placeholder: defaultName })) : (_jsx(Text, { color: "green", children: fileName }))] }), step === 'dir' && (_jsxs(Box, { marginTop: 1, children: [_jsx(Text, { color: "cyan", children: "Directory " }), _jsxs(Text, { color: "gray", children: ["[", defaultDir, "]: "] }), _jsx(TextInput, { value: dirInput, onChange: setDirInput, onSubmit: handleDirSubmit, placeholder: defaultDir })] })), _jsx(Box, { marginTop: 1, children: _jsxs(Text, { color: "gray", children: ["\u2192 will save to ", previewDir, "/", previewName, ".pdf"] }) })] }));
}
