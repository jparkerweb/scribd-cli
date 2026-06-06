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

interface SaveOptionsProps {
  id: string;
  onSubmit: (opts: { fileName: string; outputDir: string }) => void;
}

export default function SaveOptions({ id, onSubmit }: SaveOptionsProps) {
  const defaultName = id;
  const defaultDir = config.outputDir;

  const [step, setStep] = useState<'name' | 'dir'>('name');
  const [nameInput, setNameInput] = useState('');
  const [fileName, setFileName] = useState(defaultName);
  const [dirInput, setDirInput] = useState('');

  const handleNameSubmit = (raw: string) => {
    setFileName(raw.trim() || defaultName);
    setStep('dir');
  };

  const handleDirSubmit = (raw: string) => {
    onSubmit({ fileName, outputDir: raw.trim() || defaultDir });
  };

  const previewDir = (dirInput.trim() || defaultDir).replace(/[\\/]+$/, '');
  const previewName = step === 'name' ? defaultName : fileName;

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text>Where should I save the PDF? Press Enter to accept the default.</Text>

      <Box marginTop={1}>
        <Text color="cyan">File name </Text>
        <Text color="gray">[{defaultName}]: </Text>
        {step === 'name' ? (
          <TextInput
            value={nameInput}
            onChange={setNameInput}
            onSubmit={handleNameSubmit}
            placeholder={defaultName}
          />
        ) : (
          <Text color="green">{fileName}</Text>
        )}
      </Box>

      {step === 'dir' && (
        <Box marginTop={1}>
          <Text color="cyan">Directory </Text>
          <Text color="gray">[{defaultDir}]: </Text>
          <TextInput
            value={dirInput}
            onChange={setDirInput}
            onSubmit={handleDirSubmit}
            placeholder={defaultDir}
          />
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">
          → will save to {previewDir}/{previewName}.pdf
        </Text>
      </Box>
    </Box>
  );
}
