/**
 * Console capture types and utilities.
 * Used by aurickFixtures.ts — auto-populated during every test.
 * DO NOT EDIT — part of the aurick automation workspace
 */

export type ConsoleEntry = {
  type: string; // 'log' | 'warn' | 'error' | 'info' | 'debug' | 'pageerror'
  text: string;
  location?: { url?: string; lineNumber?: number; columnNumber?: number };
  stack?: string | null;
  timestamp: number;
};

/** Returns all console error and pageerror entries. */
export function findErrors(logs: ConsoleEntry[]): ConsoleEntry[] {
  return logs.filter((e) => e.type === 'error' || e.type === 'pageerror');
}

/** Returns all console warning entries. */
export function findWarnings(logs: ConsoleEntry[]): ConsoleEntry[] {
  return logs.filter((e) => e.type === 'warning' || e.type === 'warn');
}

/** Returns true when no console errors or page errors were logged. */
export function hasNoErrors(logs: ConsoleEntry[]): boolean {
  return findErrors(logs).length === 0;
}

/** Returns entries whose text matches the given pattern. */
export function findByText(logs: ConsoleEntry[], pattern: string | RegExp): ConsoleEntry[] {
  return logs.filter((e) =>
    typeof pattern === 'string' ? e.text.includes(pattern) : pattern.test(e.text),
  );
}
