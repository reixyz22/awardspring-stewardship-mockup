import { describe, it, expect } from 'vitest';
import { tagProvenance } from './provenance.ts';

describe('tagProvenance', () => {
  it('tags a real fact and its citation, leaves a fabricated lookalike untagged', () => {
    // Same check run by hand during the build, made permanent. The safety
    // property this proves: a number that merely LOOKS like a dollar amount
    // never gets mislabeled as verified just because it matches the pattern -
    // only an exact match against a fact we already know is real gets tagged.
    const facts = [{ value: '$32,200', citation: 'quick_stats.lifetime_total' }];
    const text = "Your gift of $32,200 means a lot - a fake $99,999 should not be tagged.";
    const segments = tagProvenance(text, facts);

    const real = segments.find((s) => s.text === '$32,200');
    expect(real?.source).toBe('api');
    expect(real?.source === 'api' && real.citation).toBe('quick_stats.lifetime_total');

    const fake = segments.find((s) => s.text.includes('$99,999'));
    expect(fake?.source).toBe('model');
  });

  it('returns the whole text as one model segment when there are no facts', () => {
    expect(tagProvenance('plain text', [])).toEqual([{ text: 'plain text', source: 'model' }]);
  });

  it('matches the longer of two overlapping facts, not a partial prefix', () => {
    const facts = [
      { value: 'Luis', citation: 'a' },
      { value: 'Luis Ferreira', citation: 'b' },
    ];
    const segments = tagProvenance('Thanks, Luis Ferreira.', facts);
    const match = segments.find((s) => s.source === 'api');
    expect(match?.text).toBe('Luis Ferreira');
  });
});
