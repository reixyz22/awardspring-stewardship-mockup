/**
 * Rate-limit headers on EVERY response, not just 429s.
 * @doc   https://docs.awardspring.com/conventions/rate-limits
 * @quote "X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset on every
 *         response including successes. Retry-After only on a 429."
 *
 * The mock never actually refuses a request - there is no reason to rate-limit a
 * local fixture - but it reports a live budget so the client's header-reading
 * path is exercised rather than dead code.
 */
import type { Request, Response, NextFunction } from 'express';

const LIMIT = 1000;
const WINDOW_MS = 60_000;
let windowStart = Date.now();
let used = 0;

export function rateLimitHeaders(_req: Request, res: Response, next: NextFunction) {
  const now = Date.now();
  if (now - windowStart >= WINDOW_MS) { windowStart = now; used = 0; }
  used += 1;
  res.setHeader('X-RateLimit-Limit', String(LIMIT));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, LIMIT - used)));
  res.setHeader('X-RateLimit-Reset', String(Math.floor((windowStart + WINDOW_MS) / 1000)));
  return next();
}
