/**
 * The JSON error envelope.
 * @doc   https://docs.awardspring.com/conventions/errors
 * @spec  openapi.json #/components/schemas/V1ErrorEnvelope
 * @quote "Branch on code. Stable, machine-readable. Never parse message."
 *
 * `recovery` is documented as plain-language guidance intended to be shown to a
 * person, so the mock always populates it rather than leaving it null.
 */
import type { Response } from 'express';

export type ErrorType =
  | 'invalid_request_error'
  | 'authentication_error'
  | 'rate_limit_error'
  | 'api_error';

export interface ValidationDetail { field: string; message: string }

export function sendError(
  res: Response,
  status: number,
  type: ErrorType,
  code: string,
  message: string,
  opts: { param?: string; recovery?: string; details?: ValidationDetail[] } = {},
) {
  return res.status(status).json({
    error: {
      type,
      code,
      message,
      param: opts.param ?? null,
      doc_url: `https://docs.awardspring.com/errors#${code}`,
      recovery: opts.recovery ?? null,
      ...(opts.details ? { details: opts.details } : {}),
    },
  });
}

export const notFound = (res: Response, code: string, message: string) =>
  sendError(res, 404, 'invalid_request_error', code, message, {
    recovery: 'Check the id and confirm the record belongs to this institution.',
  });
