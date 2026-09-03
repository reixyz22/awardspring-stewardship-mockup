/**
 * One process, two route trees, kept strictly apart.
 *
 *   /api/v1/*   the AwardSpring mock. Contains nothing that knows this app exists.
 *   /_local/*   this app's own backend (model proxy, mocked email). Not built yet -
 *               it arrives with the assistant.
 *
 * The split is what makes the README's claim literally true rather than a boast:
 * point AWARDSPRING_BASE_URL at https://api.awardspring.com and /api/v1 goes away
 * while /_local keeps working, because nothing under /api/v1 is ours.
 */
import express from 'express';
import { requireApiKey } from './awardspring/conventions/auth.ts';
import { rateLimitHeaders } from './awardspring/conventions/rate-limit.ts';
import { sendError } from './awardspring/conventions/errors.ts';
import { donorsRouter } from './awardspring/routes/donors.ts';
import { giftsRouter } from './awardspring/routes/gifts.ts';
import { catalogRouter } from './awardspring/routes/catalog.ts';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
const app = express();

app.use(express.json());

// The app runs on :5173 in dev and the mock on :8787, so the browser needs CORS.
// Production AwardSpring would be called server-side with a real key; this exists
// only because the mock is deliberately a separate origin.
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'X-Spring-API-Key, Content-Type, Idempotency-Key, Dry-Run');
  res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});

const mock = express.Router();
mock.use(rateLimitHeaders);
mock.use(requireApiKey);
mock.use(donorsRouter);
mock.use(giftsRouter);
mock.use(catalogRouter);

app.use('/api/v1', mock);

// Anything else under the mock prefix is a 404 in their envelope, not Express HTML.
app.use('/api', (_req, res) =>
  sendError(res, 404, 'invalid_request_error', 'not_found', 'No such endpoint.', {
    recovery: 'Check the path against https://docs.awardspring.com/llms.txt',
  }));

app.listen(PORT, () => {
  console.log(`AwardSpring mock listening on http://localhost:${PORT}/api/v1`);
});
