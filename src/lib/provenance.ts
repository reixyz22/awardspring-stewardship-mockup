/**
 * Splits generated text into segments, tagging any exact match of a known
 * fact as `source: 'api'` and everything else as `source: 'model'`.
 *
 * This is what makes the labeling trustworthy rather than self-reported:
 * the model is never asked which parts it made up. We already know,
 * independently, which strings are real - they came from an API call
 * before the model ever ran - so this just checks whether they show up.
 * A real fact the model paraphrases instead of copying verbatim won't get
 * tagged; that's the safe failure direction. Nothing false can ever get
 * mislabeled as verified.
 */
export interface Segment { text: string; source: 'api' | 'model' }

export function tagProvenance(text: string, facts: string[]): Segment[] {
  const known = [...new Set(facts.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (known.length === 0) return [{ text, source: 'model' }];

  const pattern = new RegExp(`(${known.map(escapeRegExp).join('|')})`, 'g');
  return text.split(pattern).filter((chunk) => chunk.length > 0).map((chunk) => ({
    text: chunk,
    source: known.includes(chunk) ? 'api' : 'model',
  }));
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
