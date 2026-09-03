/**
 * LYBUNT / SYBUNT classification.
 *
 *   LYBUNT - Last Year But Unfortunately Not This. Gave last year, not this year.
 *   SYBUNT - Some Year But Unfortunately Not This. Gave at some point, not this year.
 *
 * Built entirely from quick_stats, so it costs no extra requests beyond the donor
 * detail call the page already makes.
 * @spec openapi.json #/components/schemas/DonorQuickStatsV1
 */
import type { DonorQuickStats } from '../api/types.ts';

export type GivingStatus = 'active' | 'lybunt' | 'sybunt' | 'never';

export function givingStatus(qs: DonorQuickStats, now = new Date()): GivingStatus {
  const thisYear = now.getUTCFullYear();

  if ((qs.year_total ?? 0) > 0) return 'active';
  if (!qs.last_gift_date) return 'never';

  const lastYear = new Date(qs.last_gift_date * 1000).getUTCFullYear();

  // A zero-dollar gift still counts as a gift. Their gifts endpoint allows
  // amount = 0 when gift_type is InKind, so year_total can be 0 for a donor who
  // gave something this year. Judge on the date, not the money.
  // @doc https://docs.awardspring.com/api-reference/gifts/create
  if (lastYear === thisYear) return 'active';

  if (lastYear === thisYear - 1) return 'lybunt';
  return 'sybunt';
}
