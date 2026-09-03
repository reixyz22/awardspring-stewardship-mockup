/**
 * Gifts and pledges.
 * @doc   https://docs.awardspring.com/api-reference/gifts/list
 * @spec  openapi.json #/paths/~1api~1v1~1gifts/get
 * @quote "newest first. Filters: donor_id, type, q. Without filters, covers the
 *         whole institution."
 *
 * NOTE, and it shapes the whole reporting story: there is NO date filter here.
 * The documented query params are donor_id, type, q and the pagination cursors.
 * Anything time-sliced - retention, year-over-year trend - therefore costs a walk
 * of the entire gift table at limit<=100. See src/reports/cost.ts.
 */
import { Router } from 'express';
import { db, toGift } from '../store.ts';
import { paginate } from '../conventions/pagination.ts';

export const giftsRouter = Router();

giftsRouter.get('/gifts', (req, res) => {
  const donorId = req.query.donor_id ? Number(req.query.donor_id) : null;
  const type = typeof req.query.type === 'string' ? req.query.type : '';
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

  let rows = [...db.gifts];
  if (donorId !== null) rows = rows.filter((g) => g.donor_id === donorId);
  if (type) rows = rows.filter((g) => g.type === type);
  if (q) rows = rows.filter((g) => (g.subject ?? '').toLowerCase().includes(q));
  rows = rows.sort((a, b) => b.date - a.date || b.id - a.id);

  const filters: Record<string, string> = {};
  if (donorId !== null) filters.donor_id = String(donorId);
  if (type) filters.type = type;
  if (q) filters.q = q;

  const page = paginate(res, rows, {
    url: '/api/v1/gifts',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
    ending_before: req.query.ending_before as string | undefined,
    filters,
  });
  if (!page) return;
  res.json({ ...page, data: page.data.map(toGift) });
});
