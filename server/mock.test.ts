/**
 * Regression tests for the documented quirks in server/awardspring/conventions/
 * and for the shape/size of what the mock returns. These formalize things
 * that were hand-verified with curl throughout the build - the point is
 * that a future refactor can't silently break them without a test failing.
 *
 * Deliberately not here: anything involving Gemini. See server/local/draft.test.ts
 * for why that's tested differently.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app.ts';
import { ACCEPTED_KEY } from './awardspring/conventions/auth.ts';

const app = createApp();
const auth = { 'X-Spring-API-Key': ACCEPTED_KEY };

describe('auth quirks', () => {
  it('401 on a missing key is plain text, not the JSON envelope', async () => {
    const res = await request(app).get('/api/v1/donors');
    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/text\/plain/);
  });

  it('400 (not 401) on an unrecognised key', async () => {
    const res = await request(app).get('/api/v1/donors').set('X-Spring-API-Key', 'wrong');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_credentials');
  });
});

describe('pagination', () => {
  it('clamps limit=5000 down to 100 silently, not rejected', async () => {
    const res = await request(app).get('/api/v1/donors?limit=5000').set(auth);
    expect(res.status).toBe(200);
    // Fixture set is smaller than 100, so this also implicitly proves no
    // page-size error occurred - a rejection would show up as a 400, not 200.
    expect(res.body.has_more).toBe(false);
  });

  it('round-trips a cursor to page 2 correctly', async () => {
    const page1 = await request(app).get('/api/v1/donors?limit=3').set(auth);
    expect(page1.body.next_cursor).toBeTruthy();

    const page2 = await request(app)
      .get(`/api/v1/donors?limit=3&starting_after=${page1.body.next_cursor}`)
      .set(auth);
    expect(page2.status).toBe(200);
    const page1Ids = page1.body.data.map((d: { id: number }) => d.id);
    const page2Ids = page2.body.data.map((d: { id: number }) => d.id);
    expect(page2Ids.some((id: number) => page1Ids.includes(id))).toBe(false);
  });

  it('a tampered cursor is rejected with invalid_cursor, not silently accepted', async () => {
    const res = await request(app).get('/api/v1/donors?starting_after=not-a-real-cursor').set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_cursor');
  });

  it('award_cycle_id is required on awarded-students, with a details[] entry naming the field', async () => {
    const res = await request(app).get('/api/v1/scholarships/awarded-students').set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation_failed');
    expect(res.body.error.details[0].field).toBe('award_cycle_id');
  });
});

describe('rate-limit headers', () => {
  it('are present on a successful response, not just on errors', async () => {
    const res = await request(app).get('/api/v1/donors').set(auth);
    expect(res.headers['x-ratelimit-limit']).toBeTruthy();
    expect(res.headers['x-ratelimit-remaining']).toBeTruthy();
  });
});

describe('data shape and size', () => {
  it('returns exactly the 16 fixture donors', async () => {
    const res = await request(app).get('/api/v1/donors?limit=100').set(auth);
    expect(res.body.data).toHaveLength(16);
  });

  it("Nancy Carter's lifetime_total is the known real value, not drifted by a refactor", async () => {
    const res = await request(app).get('/api/v1/donors/1').set(auth);
    expect(res.body.first_name).toBe('Nancy');
    expect(res.body.quick_stats.lifetime_total).toBe(32200);
  });

  it('never leaks the major field on awarded-students - AwardedStudentV1 has no such field', async () => {
    const res = await request(app).get('/api/v1/scholarships/awarded-students?award_cycle_id=2').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const row of res.body.data) {
      expect(row).not.toHaveProperty('major');
    }
  });
});
