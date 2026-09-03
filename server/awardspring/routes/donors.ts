/**
 * Donors and the merged activity timeline.
 * @doc  https://docs.awardspring.com/api-reference/donors/list
 * @doc  https://docs.awardspring.com/api-reference/donors/get
 * @doc  https://docs.awardspring.com/api-reference/donor-activities/list
 * @spec openapi.json #/paths/~1api~1v1~1donors
 *
 * @quote "q splits on spaces and matches each term against first name, last name,
 *         email, or organization, so `jane smith` finds donors matching both terms."
 */
import { Router } from 'express';
import { db, toDonorListItem, toDonorDetail } from '../store.ts';
import { paginate } from '../conventions/pagination.ts';
import { notFound } from '../conventions/errors.ts';

export const donorsRouter = Router();

donorsRouter.get('/donors', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
  let rows = [...db.donors].sort((a, b) => a.id - b.id);

  if (q) {
    // Every term must match at least one field. AND across terms, OR across fields.
    const terms = q.split(/\s+/);
    rows = rows.filter((d) => {
      const hay = [d.first_name, d.last_name, d.email, d.organization]
        .filter(Boolean).join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }

  const page = paginate(res, rows, {
    url: '/api/v1/donors',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
    ending_before: req.query.ending_before as string | undefined,
    filters: q ? { q } : {},
  });
  if (!page) return;
  res.json({ ...page, data: page.data.map(toDonorListItem) });
});

donorsRouter.get('/donors/:id', (req, res) => {
  const d = db.donors.find((x) => x.id === Number(req.params.id));
  if (!d) return notFound(res, 'donor_not_found', 'No donor with that id.');
  res.json(toDonorDetail(d));
});

donorsRouter.get('/donors/:donorId/activities', (req, res) => {
  const donorId = Number(req.params.donorId);
  if (!db.donors.some((d) => d.id === donorId)) {
    return notFound(res, 'donor_not_found', 'No donor with that id.');
  }
  const type = typeof req.query.activity_type === 'string' ? req.query.activity_type : '';
  let rows = db.activities.filter((a) => a.donor_id === donorId);
  if (type) rows = rows.filter((a) => a.activity_type === type);
  rows = rows.sort((a, b) => (b.date as number) - (a.date as number));

  const page = paginate(res, rows, {
    url: `/api/v1/donors/${donorId}/activities`,
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
    filters: type ? { activity_type: type } : {},
  });
  if (!page) return;
  res.json(page);
});
