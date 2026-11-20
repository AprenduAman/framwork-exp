/**
 * Aurick NDJSON reporter.
 *
 * Emits one JSON object per line to AURICK_REPORTER_FILE (default:
 * /tmp/aurick-results.ndjson) so the main server can parse step timing,
 * errors, and pass/fail counts without parsing the full Playwright JSON.
 *
 * Event types:
 *   run_start  – emitted at the beginning of the run
 *   test_start – emitted when a test begins
 *   test_end   – emitted when a test finishes (includes duration, errors)
 *   run_end    – emitted after all tests complete
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */
import type {
  Reporter,
  Suite,
  TestCase,
  TestResult,
  FullConfig,
  FullResult,
} from '@playwright/test/reporter';
import { createWriteStream, type WriteStream } from 'fs';

type AurickEvent =
  | { event: 'run_start';  ts: number; workers: number; shard?: string }
  | { event: 'test_start'; ts: number; id: string; title: string; file: string }
  | { event: 'test_end';   ts: number; id: string; title: string; status: string; durationMs: number; retries: number; error?: string; stdout?: string }
  | { event: 'run_end';    ts: number; status: string; durationMs: number; passed: number; failed: number; skipped: number; flaky: number };

export default class AurickReporter implements Reporter {
  private readonly outputFile: string;
  private stream: WriteStream | null = null;
  private readonly startTimes = new Map<string, number>();
  private runStart = 0;
  private passed = 0;
  private failed = 0;
  private skipped = 0;
  private flaky = 0;

  constructor(opts?: { outputFile?: string }) {
    this.outputFile = opts?.outputFile ?? process.env['AURICK_REPORTER_FILE'] ?? '/tmp/aurick-results.ndjson';
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.runStart = Date.now();
    this.stream = createWriteStream(this.outputFile, { flags: 'w' });
    this._emit({
      event: 'run_start',
      ts: this.runStart,
      workers: config.workers,
      shard: config.shard ? `${config.shard.current}/${config.shard.total}` : undefined,
    });
  }

  onTestBegin(test: TestCase): void {
    this.startTimes.set(test.id, Date.now());
    this._emit({
      event: 'test_start',
      ts: Date.now(),
      id: test.id,
      title: test.title,
      file: test.location?.file ?? '',
    });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const startTs = this.startTimes.get(test.id) ?? Date.now();
    const durationMs = Date.now() - startTs;

    switch (result.status) {
      case 'passed':  this.passed++;  break;
      case 'failed':  this.failed++;  break;
      case 'skipped': this.skipped++; break;
      case 'flaky':   this.flaky++;   break;
    }

    this._emit({
      event: 'test_end',
      ts: Date.now(),
      id: test.id,
      title: test.title,
      status: result.status,
      durationMs,
      retries: result.retry,
      error: result.errors?.[0]?.message ?? undefined,
      stdout: result.stdout?.map((s) => (typeof s === 'string' ? s : s.toString())).join('') || undefined,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    this._emit({
      event: 'run_end',
      ts: Date.now(),
      status: result.status,
      durationMs: Date.now() - this.runStart,
      passed:  this.passed,
      failed:  this.failed,
      skipped: this.skipped,
      flaky:   this.flaky,
    });
    await new Promise<void>((resolve) => {
      if (this.stream) {
        this.stream.end(resolve);
      } else {
        resolve();
      }
    });
  }

  private _emit(event: AurickEvent): void {
    if (this.stream?.writable) {
      this.stream.write(JSON.stringify(event) + '\n');
    }
  }
}
