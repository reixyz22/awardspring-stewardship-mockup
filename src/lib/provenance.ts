/**
 * Splits generated text into segments, tagging any exact match of a known
 * fact as `source: 'api'` (with a citation saying exactly where it came
 * from) and everything else as `source: 'model'`.
 *
 * This is what makes the labeling trustworthy rather than self-reported:
 * the model is never asked which parts it made up. We already know,
 * independently, which strings are real - they came from an API call
 * before the model ever ran - so this just checks whether they show up.
 * A real fact the model paraphrases instead of copying verbatim won't get
 * tagged; that's the safe failure direction. Nothing false can ever get
 * mislabeled as verified.
 */
export interface Fact { value: string; citation: string }
export type Segment =
  | { text: string; source: 'model' }
  | { text: string; source: 'api'; citation: string };

export function tagProvenance(text: string, facts: Fact[]): Segment[] {
  const known = new Map<string, string>();
  for (const f of facts) {
    if (f.value && !known.has(f.value)) known.set(f.value, f.citation);
  }
  const values = [...known.keys()].sort((a, b) => b.length - a.length);
  if (values.length === 0) return [{ text, source: 'model' }];

  const pattern = new RegExp(`(${values.map(escapeRegExp).join('|')})`, 'g');
  return text.split(pattern).filter((chunk) => chunk.length > 0).map((chunk): Segment => {
    const citation = known.get(chunk);
    return citation !== undefined ? { text: chunk, source: 'api', citation } : { text: chunk, source: 'model' };
  });
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
