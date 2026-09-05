// Empty string = same-origin - see the comment in src/api/client.ts.
const BASE = import.meta.env.VITE_AWARDSPRING_BASE_URL ?? '';

export interface DraftRequest {
  donorName: string;
  facts: string[];
  context: string;
  familiarity: string;
  tone: string;
  note: string;
}

export async function generateDraft(req: DraftRequest): Promise<string> {
  const res = await fetch(`${BASE}/_local/draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body.text as string;
}
