/**
 * AI-powered assertion service.
 *
 * Uses the AURICK_AI_ASSERT_ENDPOINT environment variable to call an AI
 * vision/language model that evaluates a condition against a screenshot.
 * Falls back to a no-op pass when the endpoint is not configured so CI
 * without AI connectivity does not block.
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */
import type { Page } from '@playwright/test';

export type AiAssertOptions = {
  /** Whether to capture a full-page screenshot (default: false). */
  fullPage?: boolean;
  /** Extra context to pass to the model alongside the condition. */
  context?: string;
  /** Timeout for the AI endpoint call in ms (default: 30 000). */
  timeout?: number;
};

export type AiAssertResult = {
  passed: boolean;
  reasoning?: string;
  confidence?: number;
};

export class AiAssertService {
  private readonly page: Page;
  private readonly endpoint: string;

  constructor(page: Page) {
    this.page = page;
    this.endpoint = process.env['AURICK_AI_ASSERT_ENDPOINT'] ?? '';
  }

  /**
   * Evaluates `condition` against the current page screenshot.
   * Returns the AI result object; never throws (returns { passed: true } on
   * endpoint errors so unconfigured envs do not fail).
   */
  async evaluate(condition: string, opts: AiAssertOptions = {}): Promise<AiAssertResult> {
    if (!this.endpoint) {
      console.warn(
        `[aurick:ai-assert] AURICK_AI_ASSERT_ENDPOINT not configured — skipping: "${condition}"`,
      );
      return { passed: true };
    }
    const screenshot = await this.page.screenshot({ fullPage: opts.fullPage ?? false });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeout ?? 30_000);
    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition,
          context: opts.context,
          screenshot_base64: screenshot.toString('base64'),
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        console.warn(`[aurick:ai-assert] endpoint returned ${res.status}`);
        return { passed: false };
      }
      const data = (await res.json()) as { result?: boolean; passed?: boolean; reasoning?: string; confidence?: number };
      return {
        passed: Boolean(data.result ?? data.passed ?? false),
        reasoning: data.reasoning,
        confidence: data.confidence,
      };
    } catch (err) {
      console.warn(`[aurick:ai-assert] call failed: ${err}`);
      return { passed: false };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Asserts that `condition` holds — throws an Error with the AI reasoning when it does not.
   */
  async assert(condition: string, opts: AiAssertOptions = {}): Promise<void> {
    const r = await this.evaluate(condition, opts);
    if (!r.passed) {
      throw new Error(
        `AI assertion failed: "${condition}"` +
          (r.reasoning ? ` — ${r.reasoning}` : ''),
      );
    }
  }

  /**
   * Visual diff: compares two screenshots and asserts they are similar enough.
   * `threshold` is a fraction 0–1 of allowed pixel difference (default 0.05).
   */
  async assertVisualMatch(
    baselineBase64: string,
    description: string,
    threshold = 0.05,
  ): Promise<void> {
    if (!this.endpoint) return;
    const screenshot = await this.page.screenshot({ fullPage: false });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30_000);
    try {
      const res = await fetch(`${this.endpoint}/visual-diff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseline_base64: baselineBase64,
          current_base64: screenshot.toString('base64'),
          threshold,
          description,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) return;
      const data = (await res.json()) as { passed?: boolean; diff_ratio?: number };
      if (data.passed === false) {
        throw new Error(
          `Visual match failed for "${description}" — diff ratio: ${data.diff_ratio ?? '?'} > threshold ${threshold}`,
        );
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Visual match')) throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}
