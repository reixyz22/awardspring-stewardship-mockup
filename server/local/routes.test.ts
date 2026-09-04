/**
 * Deliberately does NOT call the real Gemini API - that's variable by
 * nature (see the conversation this test file came out of: an open-ended
 * assistant will always be steerable into weird questions, and the
 * acceptance criterion is "it refuses sensibly," which was verified by
 * hand, not something to lock into a brittle content-matching test).
 *
 * What IS tested: the parts a refactor could actually break silently -
 * input validation, and the error path when GEMINI_API_KEY is missing,
 * which is exactly the kind of failure this app promises a user-visible
 * message for instead of a console-only stack trace.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.ts';

const app = createApp();

function withoutGeminiKey<T>(run: () => Promise<T>): Promise<T> {
  const original = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  return run().finally(() => {
    if (original !== undefined) process.env.GEMINI_API_KEY = original;
  });
}

describe('POST /_local/draft', () => {
  it('400s when facts is missing', async () => {
    const res = await request(app).post('/_local/draft').send({ donorName: 'Test Donor' });
    expect(res.status).toBe(400);
  });

  it('400s when donorName is missing', async () => {
    const res = await request(app).post('/_local/draft').send({ facts: ['$1'] });
    expect(res.status).toBe(400);
  });

  it('gives a user-facing message naming the fix when GEMINI_API_KEY is unset, not a raw crash', () =>
    withoutGeminiKey(async () => {
      const res = await request(app).post('/_local/draft').send({ donorName: 'Test Donor', facts: ['$1'] });
      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/GEMINI_API_KEY/);
    }));
});

describe('POST /_local/assistant', () => {
  it('400s on an empty message', async () => {
    const res = await request(app).post('/_local/assistant').send({ message: '   ' });
    expect(res.status).toBe(400);
  });

  it('gives a user-facing message naming the fix when GEMINI_API_KEY is unset, not a raw crash', () =>
    withoutGeminiKey(async () => {
      const res = await request(app).post('/_local/assistant').send({ message: 'hello' });
      expect(res.status).toBe(502);
      expect(res.body.error).toMatch(/GEMINI_API_KEY/);
    }));
});
