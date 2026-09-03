/**
 * Thin typed client. Written so it would work unchanged against production.
 *
 * Two things here are not defensive padding, they are their documented behaviour:
 *
 *  1. A 401 returns PLAIN TEXT, not the JSON error envelope. Calling res.json()
 *     on every non-2xx throws inside the error handler itself.
 *     @doc https://docs.awardspring.com/conventions/authentication
 *
 *  2. An unrecognised key returns 400, not 401, so status alone cannot tell you
 *     "the credential is wrong". isCredentialError() treats them together.
 *
 * Errors are surfaced by their stable `code`. Never by parsing `message`.
 * @doc https://docs.awardspring.com/conventions/errors
 */
import type { ListResponse } from './types.ts';

const BASE = import.meta.env.VITE_AWARDSPRING_BASE_URL ?? 'http://localhost:8787';
const KEY = import.meta.env.VITE_AWARDSPRING_API_KEY ?? 'mock_key_not_a_real_credential';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly recovery: string | null = null,
    readonly param: string | null = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
  /** 400-unrecognised-key and 401 both mean the credential is wrong. */
  get isCredentialError() {
    return this.status === 401 || this.code === 'invalid_credentials';
  }
}

/** Rate-limit budget, present on every response including successes. */
export interface RateBudget { limit: number | null; remaining: number | null; reset: number | null }
let lastBudget: RateBudget = { limit: null, remaining: null, reset: null };
export const rateBudget = () => lastBudget;

const num = (v: string | null) => (v === null ? null : Number(v));

export async function apiGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { headers: { 'X-Spring-API-Key': KEY } });

  lastBudget = {
    limit: num(res.headers.get('X-RateLimit-Limit')),
    remaining: num(res.headers.get('X-RateLimit-Remaining')),
    reset: num(res.headers.get('X-RateLimit-Reset')),
  };

  if (res.ok) return (await res.json()) as T;

  // The documented plain-text 401. Read as text FIRST, then decide.
  const raw = await res.text();
  let code = 'unknown_error';
  let message = raw || res.statusText;
  let recovery: string | null = null;
  let param: string | null = null;
  try {
    const body = JSON.parse(raw);
    if (body?.error) {
      code = body.error.code ?? code;
      message = body.error.message ?? message;
      recovery = body.error.recovery ?? null;
      param = body.error.param ?? null;
    }
  } catch {
    // Not JSON. Expected on 401 - this is the case their docs warn about.
    code = res.status === 401 ? 'unauthorized' : 'non_json_error';
  }
  throw new ApiError(res.status, code, message, recovery, param);
}

/**
 * Walks every page. Callers ask for a donor's gifts, not for page two.
 * Filters are pinned into the cursor, so they are sent on the first request and
 * then resent unchanged - which is what the endpoint docs ask for.
 */
export async function apiList<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  opts: { max?: number } = {},
): Promise<{ data: T[]; requests: number }> {
  const out: T[] = [];
  let cursor: string | undefined;
  let requests = 0;
  const max = opts.max ?? Infinity;

  for (;;) {
    const page = await apiGet<ListResponse<T>>(path, {
      ...params,
      limit: 100, // Cheapest way to read a lot: bigger pages, not more requests.
      starting_after: cursor,
    });
    requests += 1;
    out.push(...page.data);
    if (!page.has_more || !page.next_cursor || out.length >= max) break;
    cursor = page.next_cursor;
  }
  return { data: out, requests };
}
