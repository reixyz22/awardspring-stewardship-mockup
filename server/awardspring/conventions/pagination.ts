/**
 * Cursor pagination, the list envelope, and the limit clamp.
 * @doc   https://docs.awardspring.com/conventions/pagination
 * @spec  openapi.json #/components/schemas/GiftV1ListResponse
 * @quote "limit defaults to 25, clamped not rejected into 1-100. limit=5000
 *         silently returns 100."
 * @quote "Cursors are signed, opaque, institution-bound. Never build, edit,
 *         truncate, or persist one."
 *
 * AMBIGUITY IN THEIR DOCS - deliberately left visible, not papered over.
 * The pagination page says filters are pinned into the cursor and that resending
 * award_cycle_id on a later page "can conflict with what the cursor already
 * asserts". The scholarships/awarded-students and scholarships/available-dollars
 * endpoint descriptions say the opposite: "Send award_cycle_id on every request,
 * including when paging: it is recorded in the cursor and a request whose
 * award_cycle_id does not match the cursor's is rejected."
 *
 * The mock implements the ENDPOINT-LEVEL rule: filters may be resent, and are
 * rejected only when they DISAGREE with the cursor. That reading satisfies both
 * pages. It is a guess at intent, not a resolution - see docs/DECISIONS.md.
 */
import crypto from 'node:crypto';
import type { Response } from 'express';
import { sendError } from './errors.ts';

const SECRET = 'mock-cursor-secret';
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export interface CursorPayload { after: number; filters: Record<string, string> }

export function encodeCursor(p: CursorPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 16);
  return `${body}.${sig}`;
}

export function decodeCursor(raw: string): CursorPayload | null {
  const [body, sig] = raw.split('.');
  if (!body || !sig) return null;
  const expect = crypto.createHmac('sha256', SECRET).update(body).digest('base64url').slice(0, 16);
  if (sig !== expect) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}

/** Clamped into 1-100 rather than rejected. A caller that trusts its own number is wrong. */
export function clampLimit(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)));
}

export interface PageOpts {
  url: string;
  limit: unknown;
  starting_after?: string;
  ending_before?: string;
  /** Filters pinned into the cursor. Resending is fine; disagreeing is a 400. */
  filters?: Record<string, string>;
}

/**
 * Returns the list envelope, or sends a 400 invalid_cursor and returns null.
 * Items must be sorted by the caller; `id` is the cursor anchor.
 */
export function paginate<T extends { id: number }>(
  res: Response, items: T[], opts: PageOpts,
): { object: 'list'; url: string; has_more: boolean; next_cursor: string | null; previous_cursor: string | null; data: T[] } | null {
  const limit = clampLimit(opts.limit);
  const filters = opts.filters ?? {};

  // starting_after and ending_before are mutually exclusive; starting_after wins.
  const raw = opts.starting_after ?? opts.ending_before;
  let start = 0;

  if (raw) {
    const cur = decodeCursor(raw);
    if (!cur) {
      sendError(res, 400, 'invalid_request_error', 'invalid_cursor',
        'The cursor is not valid.', {
          param: opts.starting_after ? 'starting_after' : 'ending_before',
          recovery: 'Cursors are opaque and expire. Re-run the first request to resume.',
        });
      return null;
    }
    // Filters pinned into the cursor. Resent values must match exactly.
    for (const [k, v] of Object.entries(filters)) {
      if (cur.filters[k] !== undefined && cur.filters[k] !== v) {
        sendError(res, 400, 'invalid_request_error', 'invalid_cursor',
          `Filter ${k} does not match the value recorded in the cursor.`, {
            param: k,
            recovery: 'Send the same filter values while paging, or restart from the first page.',
          });
        return null;
      }
    }
    const idx = items.findIndex((i) => i.id === cur.after);
    start = idx >= 0 ? idx + 1 : 0;
  }

  const data = items.slice(start, start + limit);
  const has_more = start + limit < items.length;
  const last = data[data.length - 1];
  const first = data[0];

  return {
    object: 'list',
    url: opts.url,
    has_more,
    next_cursor: has_more && last ? encodeCursor({ after: last.id, filters }) : null,
    previous_cursor: start > 0 && first ? encodeCursor({ after: first.id, filters }) : null,
    data,
  };
}
