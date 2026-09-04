/**
 * A Node-side caller for our own mock, used by the assistant's tools.
 *
 * src/api/client.ts can't be reused here: it reads import.meta.env, which
 * only exists inside Vite. This is the same small pattern already used in
 * experiments/fetch-strategy.ts, for the same reason - not a new idea, just
 * applied where it's needed again.
 *
 * This calls the mock over real HTTP, exactly like the browser does. That
 * keeps the assistant a genuine third consumer of /api/v1 - same auth,
 * pagination, and error handling as everything else - rather than a
 * shortcut that reads the mock's internals directly.
 */
// Same var names .env.example already defines for the browser (VITE_ prefix
// is a Vite requirement for exposing a var to browser code) - this server
// process reads the identical .env file, so there's no reason for a second,
// unprefixed copy of the same two values.
const BASE = process.env.VITE_AWARDSPRING_BASE_URL ?? 'http://localhost:8787';
const KEY = process.env.VITE_AWARDSPRING_API_KEY ?? 'mock_key_not_a_real_credential';

async function get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { 'X-Spring-API-Key': KEY } });
  if (!res.ok) {
    const raw = await res.text();
    throw new Error(`${path} -> ${res.status}: ${raw.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Walks every page at limit=100, same as apiList in the browser client. */
export async function mockList<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await get<{ data: T[]; has_more: boolean; next_cursor: string | null }>(path, {
      ...params, limit: 100, starting_after: cursor,
    });
    out.push(...page.data);
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return out;
}

export const mockGet = get;
