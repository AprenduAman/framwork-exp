/**
 * Extended Playwright test fixture.
 *
 * Provides auto-use network and console capture so every test has access to
 * the full log without declaring extra parameters.  Additional fixtures
 * (aiAssert, api) are opt-in via parameter destructuring.
 *
 * Usage in tests:
 *   import { test, expect } from '../../src/fixtures/aurickFixtures';
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */
import { test as base, expect } from '@playwright/test';
import type { NetworkEntry } from '../capture/networkCapture';
import type { ConsoleEntry } from '../capture/consoleCapture';
import { AiAssertService } from '../ai/aiAssert';
import { ApiClient } from '../helpers/apiClient';

export type AurickFixtures = {
  /** All network requests and responses captured during the test. Auto-populated. */
  networkLog: NetworkEntry[];
  /** All console messages and page errors captured during the test. Auto-populated. */
  consoleLogs: ConsoleEntry[];
  /** AI-powered assertion service backed by AURICK_AI_ASSERT_ENDPOINT. */
  aiAssert: AiAssertService;
  /** Pre-configured REST API client for backend setup/teardown calls. */
  api: ApiClient;
};

export const test = base.extend<AurickFixtures>({
  // ── auto-capture: runs even if the test does not destructure these ─────────
  networkLog: [
    async ({ page }, use) => {
      const entries: NetworkEntry[] = [];
      page.on('request', (req) => {
        entries.push({
          type: 'request',
          url: req.url(),
          method: req.method(),
          headers: req.headers(),
          body: req.postData() ?? null,
          timestamp: Date.now(),
        });
      });
      page.on('response', async (res) => {
        let body: string | null = null;
        try { body = await res.text(); } catch { /* binary / unavailable */ }
        entries.push({
          type: 'response',
          url: res.url(),
          status: res.status(),
          headers: res.headers(),
          body,
          timestamp: Date.now(),
        });
      });
      await use(entries);
    },
    { auto: true },
  ],

  consoleLogs: [
    async ({ page }, use) => {
      const entries: ConsoleEntry[] = [];
      page.on('console', (msg) => {
        entries.push({
          type: msg.type(),
          text: msg.text(),
          location: msg.location(),
          timestamp: Date.now(),
        });
      });
      page.on('pageerror', (err) => {
        entries.push({
          type: 'pageerror',
          text: err.message,
          stack: err.stack ?? null,
          timestamp: Date.now(),
        });
      });
      await use(entries);
    },
    { auto: true },
  ],

  // ── opt-in: declared as parameter only when test needs them ──────────────
  aiAssert: async ({ page }, use) => {
    await use(new AiAssertService(page));
  },

  api: async ({}, use) => {
    await use(new ApiClient());
  },
});

export { expect };
export default test;
