/**
 * Onboarding / help screen (FR-9): shows the Scribd homepage and how to find a document ID,
 * then advances to the prompt on Enter.
 */

import { Box, Text, useInput } from 'ink';

interface HelpScreenProps {
  onContinue: () => void;
}

export default function HelpScreen({ onContinue }: HelpScreenProps) {
  useInput((_input, key) => {
    if (key.return) onContinue();
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Text bold color="cyan">
        scribd-cli — save a Scribd document as a PDF
      </Text>

      <Box marginTop={1} flexDirection="column">
        <Text>
          Browse documents at <Text color="green">https://www.scribd.com/home</Text>
        </Text>
      </Box>

      <Box marginTop={1} flexDirection="column">
        <Text bold>How to find a document ID:</Text>
        <Text>{'  '}1. Open any document on Scribd.</Text>
        <Text>
          {'  '}2. Look at the URL, e.g.{' '}
          <Text color="yellow">https://www.scribd.com/document/507779687/rulebook</Text>
        </Text>
        <Text>
          {'  '}3. The number after <Text color="yellow">/document/</Text> is the ID —{' '}
          <Text bold color="green">
            507779687
          </Text>
          .
        </Text>
        <Text>{'  '}You can paste the whole URL or just the ID at the next prompt.</Text>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Press </Text>
        <Text bold color="cyan">
          Enter
        </Text>
        <Text color="gray"> to continue…</Text>
      </Box>
    </Box>
  );
}
