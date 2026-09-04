import { describe, it, expect } from 'vitest';
import { friendlyGeminiError } from './gemini-error.ts';

describe('friendlyGeminiError', () => {
  it('turns a real RESOURCE_EXHAUSTED payload into a clean sentence with the actual retry delay', () => {
    // The exact payload hit live during the build: free tier's 20/day cap
    // on gemini-2.5-flash. Raw, this is a wall of JSON no user should see.
    const raw = JSON.stringify({
      error: {
        code: 429,
        message: 'You exceeded your current quota...',
        status: 'RESOURCE_EXHAUSTED',
        details: [
          { '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '28s' },
        ],
      },
    });
    const message = friendlyGeminiError(new Error(raw));
    expect(message).toMatch(/free tier/i);
    expect(message).toMatch(/28s/);
  });

  it('leaves a non-JSON message (like our own GEMINI_API_KEY error) unchanged', () => {
    const message = friendlyGeminiError(new Error('GEMINI_API_KEY is not set.'));
    expect(message).toBe('GEMINI_API_KEY is not set.');
  });

  it('falls back to the API-provided message for a JSON error that is not a quota issue', () => {
    const raw = JSON.stringify({ error: { status: 'PERMISSION_DENIED', message: 'API key not valid.' } });
    expect(friendlyGeminiError(new Error(raw))).toBe('API key not valid.');
  });
});
