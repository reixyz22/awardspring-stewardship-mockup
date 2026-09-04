/**
 * One process, two route trees, kept strictly apart.
 *
 *   /api/v1/*   the AwardSpring mock. Contains nothing that knows this app exists.
 *   /_local/*   this app's own backend - the Gemini-backed assistant.
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
import { askAssistant } from './local/assistant.ts';

// Vite loads .env automatically for the browser; this plain Node process
// does not, so it's loaded explicitly. Node's own loader (20.6+), not the
// dotenv package - one less dependency for something this small.
try { process.loadEnvFile(); } catch { /* no .env yet - /_local routes will say so */ }

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

/**
 * Artificial network delay, off by default (0ms).
 *
 * This is NOT a documented AwardSpring behaviour - nothing in their docs says
 * their API is slow - so it does not belong next to the real conventions above.
 * It exists only to answer one question honestly: on localhost, round-trip time
 * is near zero, so "does sharing one fetch save time?" can't be tested here as-is.
 * Setting EXPERIMENT_LATENCY_MS simulates a real API's round-trip time so that
 * question becomes answerable. See experiments/README.md.
 */
const EXPERIMENT_LATENCY_MS = Number(process.env.EXPERIMENT_LATENCY_MS ?? 0);
if (EXPERIMENT_LATENCY_MS > 0) {
  mock.use((_req, _res, next) => setTimeout(next, EXPERIMENT_LATENCY_MS));
}

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

app.post('/_local/assistant', async (req, res) => {
  const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
  if (!message) return res.status(400).json({ error: 'message is required' });
  try {
    res.json(await askAssistant(message));
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`AwardSpring mock listening on http://localhost:${PORT}/api/v1`);
});
