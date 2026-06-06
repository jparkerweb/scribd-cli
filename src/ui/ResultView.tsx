/**
 * Terminal view: success (DONE) or failure (ERROR).
 *
 * On success it prints the exit-0 message form — "Saved → <path> (<n> pages)".
 * On failure it prints the typed error's `friendlyMessage` in red. The exit code itself is set
 * by `index.ts` via `toExitCode`.
 */

import { Box, Text } from 'ink';
import type { DownloadResult } from '../core/downloader.js';
import type { ScribdCliError } from '../core/errors.js';

interface ResultViewProps {
  result?: DownloadResult;
  error?: ScribdCliError;
}

export default function ResultView({ result, error }: ResultViewProps) {
  if (result) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="green">
          ✓ Saved → {result.outputPath} ({result.pageCount} pages)
        </Text>
        <Text color="gray">{formatBytes(result.bytes)} written.</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" paddingX={1} paddingY={1}>
        <Text color="red">✗ {error.friendlyMessage}</Text>
      </Box>
    );
  }

  return null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
