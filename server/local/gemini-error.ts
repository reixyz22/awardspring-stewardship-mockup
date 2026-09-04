/**
 * The @google/genai SDK throws with the raw API error body as the Error's
 * message - often a large JSON blob (status, quota metric names, a
 * retry-after in seconds). Found live: a 429 RESOURCE_EXHAUSTED from
 * hitting the free tier's daily cap surfaced as that entire blob in the
 * UI, which is exactly the "read the stack trace yourself" failure mode
 * this app promises not to have anywhere else.
 */
export function friendlyGeminiError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  let parsed: { error?: { status?: string; message?: string; details?: unknown[] } };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw; // Not JSON - e.g. our own "GEMINI_API_KEY is not set" message. Leave it as-is.
  }

  if (parsed.error?.status === 'RESOURCE_EXHAUSTED') {
    const retryInfo = parsed.error.details?.find(
      (d): d is { retryDelay?: string } => typeof d === 'object' && d !== null && '@type' in d
        && String((d as { '@type': string })['@type']).includes('RetryInfo'),
    );
    const wait = retryInfo?.retryDelay ? ` Try again in about ${retryInfo.retryDelay}.` : ' Try again in a minute.';
    return `Gemini's free tier only allows a limited number of requests per day, and it's used up for now.${wait}`;
  }

  return parsed.error?.message ?? raw;
}
