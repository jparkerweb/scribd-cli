/**
 * Live progress view (FR-7): renders the current pipeline stage as a friendly label with a
 * spinner, and shows "pages loaded: current/total" during scroll-load.
 */

import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Stage } from '../core/downloader.js';

const STAGE_LABELS: Record<Stage, string> = {
  PARSING: 'Preparing',
  LAUNCHING: 'Launching headless browser',
  NAVIGATING: 'Loading document page',
  LOADING_PAGES: 'Loading all pages',
  RENDERING: 'Rendering PDF',
  SAVING: 'Saving file',
  DONE: 'Done',
};

interface ProgressViewProps {
  stage: Stage;
  message: string;
  current?: number;
  total?: number;
}

export default function ProgressView({ stage, current, total }: ProgressViewProps) {
  const label = STAGE_LABELS[stage] ?? stage;
  const showPages = stage === 'LOADING_PAGES' && typeof current === 'number';

  return (
    <Box flexDirection="column" paddingX={1} paddingY={1}>
      <Box>
        <Text color="cyan">
          <Spinner type="dots" />
        </Text>
        <Text> {label}…</Text>
      </Box>
      {showPages && (
        <Box marginTop={1}>
          <Text color="gray">
            pages loaded: {current}
            {typeof total === 'number' && total > 0 ? `/${total}` : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}
