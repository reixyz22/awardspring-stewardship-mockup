/**
 * Giving Pyramid: bucket donors by lifetime giving into fixed dollar tiers.
 * Built entirely from lifetime_total, so it rides the same fetch LYBUNT/SYBUNT
 * already needs - no extra requests.
 * @spec openapi.json #/components/schemas/DonorQuickStatsV1
 */
const TIERS = [
  { label: '$25,000+', min: 25_000 },
  { label: '$10,000 - $24,999', min: 10_000 },
  { label: '$1,000 - $9,999', min: 1_000 },
  { label: 'Under $1,000', min: 0 },
];

export interface PyramidTier { label: string; count: number; total: number }

export function givingPyramid(lifetimeTotals: number[]): PyramidTier[] {
  return TIERS.map(({ label, min }) => {
    const inTier = lifetimeTotals.filter((n) => n >= min);
    // Each donor belongs to exactly one tier: >= this tier's floor, but
    // excluded once a higher tier already claimed them.
    const exclusive = inTier.filter((n) => !TIERS.some((t) => t.min > min && n >= t.min));
    return { label, count: exclusive.length, total: exclusive.reduce((s, n) => s + n, 0) };
  });
}
