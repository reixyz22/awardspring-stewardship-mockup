/**
 * Auth, including the two quirks their docs call out by name.
 * @doc   https://docs.awardspring.com/conventions/authentication
 * @quote "A 401 returns a plain-text reason, not the JSON error object documented
 *         under Errors. Parse defensively - a client that assumes JSON on every
 *         non-2xx will throw on its own error path."
 * @quote "An unrecognised key returns 400, not 401."
 *
 * Both are deliberately inconvenient and both are implemented as documented.
 * The client is written to survive them; see src/api/errors.ts.
 */
import type { Request, Response, NextFunction } from 'express';
import { sendError } from './errors.ts';

/** The mock accepts exactly this key. No real credential exists - see README. */
export const ACCEPTED_KEY = 'mock_key_not_a_real_credential';

export function requireApiKey(req: Request, res: Response, next: NextFunction) {
  const key = req.header('X-Spring-API-Key');

  // Missing key -> 401 as PLAIN TEXT, not the JSON envelope. Documented quirk.
  if (!key) {
    return res.status(401).type('text/plain').send('Missing API key.');
  }

  // Unrecognised key -> 400, not 401. Documented quirk.
  if (key !== ACCEPTED_KEY) {
    return sendError(res, 400, 'invalid_request_error', 'invalid_credentials',
      'The API key was not recognised.', {
        recovery: 'Check X-Spring-API-Key. Treat 400 and 401 together as "the credential is wrong".',
      });
  }
  return next();
}
