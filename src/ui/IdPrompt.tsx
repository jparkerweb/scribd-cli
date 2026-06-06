/**
 * ID / URL prompt (FR-1): validates input through `parseDocumentId`. On success it reports the
 * extracted id; on invalid input it shows an inline error and keeps focus (does not advance).
 */

import { useState } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { parseDocumentId } from '../core/url.js';
import { InvalidInputError } from '../core/errors.js';

interface IdPromptProps {
  onSubmit: (id: string) => void;
}

export default function IdPrompt({ onSubmit }: IdPromptProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setError('Please enter a document ID or URL.');
      return;
    }
    try {
      const { id } = parseDocumentId(trimmed);
      onSubmit(id);
    } catch (err) {
      setError(
        err instanceof InvalidInputError
          ? err.friendlyMessage
          : 'That doesn’t look like a valid Scribd ID or document URL.',
      );
    }
  };

  const handleChange = (next: string) => {
    setValue(next);
    if (error) setError(null);
  };

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text>Enter a Scribd document ID or paste a document URL:</Text>
      <Box marginTop={1}>
        <Text color="cyan">{'> '}</Text>
        <TextInput
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="e.g. 507779687 or https://www.scribd.com/document/507779687/…"
        />
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">✗ {error}</Text>
        </Box>
      )}
    </Box>
  );
}
