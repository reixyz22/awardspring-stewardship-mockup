import { describe, it, expect } from 'vitest';
import { givingStatus } from './lybunt.ts';
import type { DonorQuickStats } from '../api/types.ts';

const NOW = new Date('2026-09-03T00:00:00Z');
const epoch = (y: number, m: number, d: number) => Math.floor(new Date(Date.UTC(y, m - 1, d)).getTime() / 1000);

function qs(overrides: Partial<DonorQuickStats>): DonorQuickStats {
  return {
    object: 'donor_quick_stats', lifetime_total: 0, lifetime_gift_count: 0,
    year_total: 0, year_gift_count: 0, last_gift: null, last_gift_date: null,
    include_soft_credits: true, ...overrides,
  };
}

describe('givingStatus', () => {
  it('is active when year_total is positive', () => {
    expect(givingStatus(qs({ year_total: 100, last_gift_date: epoch(2026, 5, 1) }), NOW)).toBe('active');
  });

  it('is active on a $0 gift dated this year - the in-kind edge case', () => {
    // Real bug this guards: their gifts/create docs allow amount=0 when
    // gift_type is InKind, so year_total=0 does not mean "gave nothing."
    expect(givingStatus(qs({ year_total: 0, last_gift_date: epoch(2026, 3, 10) }), NOW)).toBe('active');
  });

  it('is lybunt when the last gift was exactly last year', () => {
    expect(givingStatus(qs({ year_total: 0, last_gift_date: epoch(2025, 6, 1) }), NOW)).toBe('lybunt');
  });

  it('is sybunt when the last gift was two or more years ago', () => {
    expect(givingStatus(qs({ year_total: 0, last_gift_date: epoch(2023, 6, 1) }), NOW)).toBe('sybunt');
  });

  it('is never when there is no last_gift_date at all', () => {
    expect(givingStatus(qs({ year_total: 0, last_gift_date: null }), NOW)).toBe('never');
  });
});
