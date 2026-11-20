/**
 * Test data factory helpers.
 *
 * Provides deterministic unique values and random data generators for use in
 * test specs — avoids hard-coded values that break on re-run.
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */

let _counter = 0;

/** Returns a monotonically increasing integer — unique within one test run. */
export function uniqueId(): number {
  return ++_counter;
}

/**
 * Returns a unique string with an optional prefix.
 * Example: uniqueStr('order') → 'order-1732006800000-1'
 */
export function uniqueStr(prefix = 'aurick'): string {
  return `${prefix}-${Date.now()}-${uniqueId()}`;
}

/** Returns a unique email address suitable for test registration. */
export function uniqueEmail(domain = 'test.aurick.internal'): string {
  return `${uniqueStr('user')}@${domain}`;
}

/** Returns a unique phone number string (E.164-like). */
export function uniquePhone(): string {
  return `+1555${String(Math.floor(Math.random() * 9_000_000) + 1_000_000)`;
}

/**
 * Picks a random element from an array.
 * Throws when the array is empty.
 */
export function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new RangeError('pick: empty array');
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Returns a random integer in [min, max] inclusive. */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clamps `n` to [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/**
 * Future ISO date string offset by `days` from today.
 * Useful for calendar/booking tests: futureDate(1) = tomorrow.
 */
export function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Pads a number to a given width with leading zeros. */
export function zeroPad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}
