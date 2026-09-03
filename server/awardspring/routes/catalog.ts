/**
 * Funds, award cycles, scholarships, awarded students.
 * @doc  https://docs.awardspring.com/api-reference/award-cycles/get-current
 * @doc  https://docs.awardspring.com/api-reference/scholarships/list-awarded-students
 * @spec openapi.json #/paths/~1api~1v1~1scholarships~1awarded-students/get
 *
 * @quote "current prefers the cycle marked current, falls back to the one marked
 *         next, else 404 award_cycle_not_found."
 * @quote "Send award_cycle_id on every request, including when paging: it is
 *         recorded in the cursor and a request whose award_cycle_id does not
 *         match the cursor value is rejected."
 */
import { Router } from 'express';
import { db } from '../store.ts';
import { paginate } from '../conventions/pagination.ts';
import { notFound, sendError } from '../conventions/errors.ts';

export const catalogRouter = Router();

catalogRouter.get('/award-cycles/current', (_req, res) => {
  const cur = db.awardCycles.find((c) => c.is_current) ?? db.awardCycles.find((c) => c.is_next);
  if (!cur) return notFound(res, 'award_cycle_not_found', 'No current or next award cycle.');
  res.json(cur);
});

catalogRouter.get('/award-cycles', (req, res) => {
  const page = paginate(res, [...db.awardCycles].sort((a, b) => a.id - b.id), {
    url: '/api/v1/award-cycles',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
  });
  if (page) res.json(page);
});

catalogRouter.get('/funds', (req, res) => {
  const page = paginate(res, [...db.funds].sort((a, b) => a.id - b.id), {
    url: '/api/v1/funds',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
  });
  if (page) res.json(page);
});

catalogRouter.get('/scholarships', (req, res) => {
  const page = paginate(res, [...db.scholarships].sort((a, b) => a.id - b.id), {
    url: '/api/v1/scholarships',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
  });
  if (page) res.json(page);
});

/** award_cycle_id is REQUIRED here and pinned into the cursor. */
catalogRouter.get('/scholarships/awarded-students', (req, res) => {
  const cycleId = req.query.award_cycle_id;
  if (!cycleId) {
    return sendError(res, 400, 'invalid_request_error', 'validation_failed',
      'award_cycle_id is required.', {
        param: 'award_cycle_id',
        recovery: 'Send award_cycle_id on every request, including when paging.',
        details: [{ field: 'award_cycle_id', message: 'Required.' }],
      });
  }
  const scholarshipId = req.query.scholarship_id ? Number(req.query.scholarship_id) : null;
  let rows = [...db.awardedStudents];
  if (scholarshipId !== null) rows = rows.filter((r) => r.scholarship_id === scholarshipId);
  rows = rows.sort((a, b) => a.id - b.id);

  const filters: Record<string, string> = { award_cycle_id: String(cycleId) };
  if (scholarshipId !== null) filters.scholarship_id = String(scholarshipId);

  const page = paginate(res, rows, {
    url: '/api/v1/scholarships/awarded-students',
    limit: req.query.limit,
    starting_after: req.query.starting_after as string | undefined,
    filters,
  });
  if (page) res.json(page);
});
