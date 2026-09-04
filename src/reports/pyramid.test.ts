import { describe, it, expect } from 'vitest';
import { givingPyramid } from './pyramid.ts';

describe('givingPyramid', () => {
  it('buckets every donor exactly once and totals sum to the real total', () => {
    const totals = [32200, 60000, 50000, 2700, 3600, 2700, 3000, 350, 750, 350, 500, 500, 450, 250, 30000, 30000];
    const tiers = givingPyramid(totals);

    expect(tiers.reduce((s, t) => s + t.count, 0)).toBe(totals.length);
    expect(tiers.reduce((s, t) => s + t.total, 0)).toBe(totals.reduce((a, b) => a + b, 0));
  });

  it('puts a donor at a tier boundary in the higher tier, not the lower one', () => {
    const tiers = givingPyramid([25000, 10000, 1000]);
    const byLabel = Object.fromEntries(tiers.map((t) => [t.label, t]));
    expect(byLabel['$25,000+'].count).toBe(1);
    expect(byLabel['$10,000 - $24,999'].count).toBe(1);
    expect(byLabel['$1,000 - $9,999'].count).toBe(1);
    expect(byLabel['Under $1,000'].count).toBe(0);
  });
});
