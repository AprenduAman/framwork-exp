/**
 * Lightweight REST API client for test setup and teardown.
 *
 * Configure via:
 *   TEST_API_BASE_URL – base URL for the application under test API
 *   TEST_API_TOKEN    – bearer token for authenticated setup calls
 *
 * DO NOT EDIT — part of the aurick automation workspace
 */

export type ApiOptions = {
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
};

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string, defaultHeaders?: Record<string, string>) {
    const token = process.env['TEST_API_TOKEN'];
    this.baseUrl = (baseUrl ?? process.env['TEST_API_BASE_URL'] ?? '').replace(/\/$/, '');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...defaultHeaders,
    };
  }

  async get<T = unknown>(path: string, opts?: ApiOptions): Promise<{ status: number; body: T }> {
    return this._request<T>('GET', path, opts);
  }

  async post<T = unknown>(path: string, opts?: ApiOptions): Promise<{ status: number; body: T }> {
    return this._request<T>('POST', path, opts);
  }

  async put<T = unknown>(path: string, opts?: ApiOptions): Promise<{ status: number; body: T }> {
    return this._request<T>('PUT', path, opts);
  }

  async patch<T = unknown>(path: string, opts?: ApiOptions): Promise<{ status: number; body: T }> {
    return this._request<T>('PATCH', path, opts);
  }

  async del<T = unknown>(path: string, opts?: ApiOptions): Promise<{ status: number; body: T }> {
    return this._request<T>('DELETE', path, opts);
  }

  private async _request<T>(
    method: string,
    path: string,
    opts?: ApiOptions,
  ): Promise<{ status: number; body: T }> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts?.timeout ?? 30_000);
    try {
      const res = await fetch(url, {
        method,
        headers: { ...this.defaultHeaders, ...opts?.headers },
        body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: ctrl.signal,
      });
      let body: T;
      const text = await res.text();
      try {
        body = JSON.parse(text) as T;
      } catch {
        body = text as unknown as T;
      }
      return { status: res.status, body };
    } finally {
      clearTimeout(timer);
    }
  }
}

export const api = new ApiClient();
