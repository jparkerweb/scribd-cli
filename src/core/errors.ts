/**
 * Typed error hierarchy with exit-code + friendly-message mapping.
 *
 * `friendlyMessage` strings are surfaced verbatim in the TUI (ResultView) and match the
 * overview's Exit Codes table exactly. `exitCode` is what `index.ts` sets as the process
 * exit code via {@link toExitCode}.
 */

export class ScribdCliError extends Error {
  /** Process exit code to surface for this error. */
  readonly exitCode: number;
  /** Human-friendly, non-technical message shown to the user. */
  readonly friendlyMessage: string;

  constructor(message: string, exitCode: number, friendlyMessage: string) {
    super(message);
    // Preserve correct subclass name and prototype chain across transpilation.
    this.name = new.target.name;
    this.exitCode = exitCode;
    this.friendlyMessage = friendlyMessage;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Input is neither a valid raw ID nor a recognizable Scribd document URL. */
export class InvalidInputError extends ScribdCliError {
  constructor(message = 'Invalid Scribd ID or URL') {
    super(message, 2, "That doesn't look like a valid Scribd ID or document URL.");
  }
}

/** Document is missing, private, or its page container never appeared. */
export class NotFoundError extends ScribdCliError {
  constructor(message = 'Document not found or unavailable') {
    super(message, 3, 'Document not found or is private/unavailable.');
  }
}

/** The container attached but holds no readable page elements. */
export class EmptyContentError extends ScribdCliError {
  constructor(message = 'No readable content in container') {
    super(message, 4, 'No readable content found in the document container.');
  }
}

/** Navigation/connection failure reaching Scribd. */
export class NetworkError extends ScribdCliError {
  constructor(message = 'Network failure reaching Scribd') {
    super(message, 5, 'Network problem reaching Scribd — check your connection.');
  }
}

/** Headless Chromium failed to launch (often: not installed). */
export class BrowserError extends ScribdCliError {
  constructor(message = 'Failed to launch headless browser') {
    super(
      message,
      6,
      "Couldn't start the headless browser. Try `npx playwright install chromium`.",
    );
  }
}

/** Catch-all for anything not modeled above (exit 1). */
export class UnknownError extends ScribdCliError {
  constructor(cause: unknown) {
    super(
      cause instanceof Error ? cause.message : String(cause),
      1,
      'An unexpected error occurred.',
    );
  }
}

/** Returns the mapped exit code for a `ScribdCliError`, or `1` for any other value. */
export function toExitCode(err: unknown): number {
  return err instanceof ScribdCliError ? err.exitCode : 1;
}

/** Coerces any thrown value into a `ScribdCliError` so the UI always has a friendly message. */
export function normalizeError(err: unknown): ScribdCliError {
  return err instanceof ScribdCliError ? err : new UnknownError(err);
}
