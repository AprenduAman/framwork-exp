/**
 * Session-aware auth fixture.
 *
 * Stores authenticated browser storage state to a JSON file so subsequent
 * tests in the same worker reuse the session without re-logging in.
 *
 * Usage:
 *   import { test } from '../../src/fixtures/authFixture';
 *   test('my test', async ({ authedPage }) => { ... });
 *
 * Configure via environment variables:
 *   AUTH_USERNAME   – login username / email
 *   AUTH_PASSWORD   – login password
 *   AUTH_LOGIN_URL  – full login page URL
 *   AUTH_STATE_FILE – path to store session JSON (default: /tmp/aurick-auth-state.json)
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */
import path from 'path';
import fs from 'fs';
import { test as base, expect, type Page } from '@playwright/test';

const AUTH_STATE_FILE = process.env['AUTH_STATE_FILE'] ?? '/tmp/aurick-auth-state.json';
const AUTH_USERNAME   = process.env['AUTH_USERNAME']   ?? '';
const AUTH_PASSWORD   = process.env['AUTH_PASSWORD']   ?? '';
const AUTH_LOGIN_URL  = process.env['AUTH_LOGIN_URL']  ?? '';

type AuthFixtures = {
  /** A Page that is already authenticated (session reused or freshly acquired). */
  authedPage: Page;
};

async function performLogin(page: Page): Promise<void> {
  if (!AUTH_LOGIN_URL || !AUTH_USERNAME || !AUTH_PASSWORD) {
    console.warn('[aurick:auth] AUTH_LOGIN_URL / AUTH_USERNAME / AUTH_PASSWORD not set — skipping login');
    return;
  }
  await page.goto(AUTH_LOGIN_URL);
  // Generic login: fill the first visible email/username field, then password, then submit.
  // Override this function if the login flow differs.
  const emailField =
    page.getByRole('textbox', { name: /email|username|user/i }).first();
  const passwordField = page.getByLabel(/password/i).first();
  await emailField.fill(AUTH_USERNAME);
  await passwordField.fill(AUTH_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in|login|submit/i }).first().click();
  // Wait for navigation after login
  await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 15_000 });
}

export const test = base.extend<AuthFixtures>({
  authedPage: async ({ browser }, use) => {
    let storageState: string | undefined;
    if (fs.existsSync(AUTH_STATE_FILE)) {
      storageState = AUTH_STATE_FILE;
    }
    const context = await browser.newContext(storageState ? { storageState } : {});
    const page = await context.newPage();

    if (!storageState) {
      await performLogin(page);
      // Persist session for subsequent tests in this worker
      await context.storageState({ path: AUTH_STATE_FILE });
    }

    await use(page);
    await context.close();
  },
});

export { expect };
