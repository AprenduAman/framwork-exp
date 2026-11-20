/**
 * Network capture types and utilities.
 * Used by aurickFixtures.ts — auto-populated during every test.
 * DO NOT EDIT — part of the aurick automation workspace
 */

export type NetworkRequestEntry = {
  type: 'request';
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
};

export type NetworkResponseEntry = {
  type: 'response';
  url: string;
  status: number;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
};

export type NetworkEntry = NetworkRequestEntry | NetworkResponseEntry;

/** Find the first request matching a URL pattern. */
export function findRequest(
  log: NetworkEntry[],
  urlPattern: string | RegExp,
): NetworkRequestEntry | undefined {
  return log.find(
    (e): e is NetworkRequestEntry =>
      e.type === 'request' &&
      (typeof urlPattern === 'string'
        ? e.url.includes(urlPattern)
        : urlPattern.test(e.url)),
  );
}

/** Find the first response matching a URL pattern. */
export function findResponse(
  log: NetworkEntry[],
  urlPattern: string | RegExp,
): NetworkResponseEntry | undefined {
  return log.find(
    (e): e is NetworkResponseEntry =>
      e.type === 'response' &&
      (typeof urlPattern === 'string'
        ? e.url.includes(urlPattern)
        : urlPattern.test(e.url)),
  );
}

/** Filter responses by HTTP status range, e.g. filterByStatus(log, 400, 599). */
export function filterByStatus(
  log: NetworkEntry[],
  minStatus: number,
  maxStatus: number,
): NetworkResponseEntry[] {
  return log.filter(
    (e): e is NetworkResponseEntry =>
      e.type === 'response' && e.status >= minStatus && e.status <= maxStatus,
  );
}

/** All API calls to a given hostname/path prefix. */
export function filterApiCalls(log: NetworkEntry[], pathPrefix: string): NetworkEntry[] {
  return log.filter((e) => e.url.includes(pathPrefix));
}
