/**
 * Talks to /_local/assistant - our own backend, not AwardSpring's mock.
 * Same origin as the mock (VITE_AWARDSPRING_BASE_URL), different prefix.
 */
const BASE = import.meta.env.VITE_AWARDSPRING_BASE_URL ?? 'http://localhost:8787';

export interface AssistantToolCall { name: string; args: Record<string, unknown> }
export interface AssistantAnswer { text: string; toolCalls: AssistantToolCall[] }

export async function askAssistant(message: string): Promise<AssistantAnswer> {
  const res = await fetch(`${BASE}/_local/assistant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as AssistantAnswer;
}
