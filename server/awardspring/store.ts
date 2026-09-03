/**
 * In-memory store seeded from fixtures/, plus serializers.
 *
 * The serializers exist for one reason: the mock must return the fields their
 * OpenAPI spec documents and NOTHING ELSE. The fixtures carry a few extra
 * columns that AwardSpring's admin UI shows but their v1 API does not expose
 * (salutation, capacity_rating, cultivation_stage, assigned_officer, major).
 * Those are dropped here on purpose. If the app wants them it has to notice
 * they are missing - which is the honest outcome, and the UI says so.
 *
 * @spec openapi.json #/components/schemas/DonorListItemV1, DonorDetailV1, GiftV1
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (n: string) => JSON.parse(readFileSync(join(here, '../../fixtures', `${n}.json`), 'utf8'));

export interface RawDonor {
  id: number; first_name: string | null; last_name: string | null; email: string | null;
  organization: string | null; organization_name: string | null; phone: string | null;
  role: 'Individual' | 'Organization'; city: string | null; state: string | null;
  zip_code: string | null; notes: string | null; include_soft_credits: boolean;
}
export interface RawGift {
  id: number; donor_id: number; type: string; gift_type: string | null; amount: number;
  subject: string | null; description: string | null; fund_id: string | null;
  campaign_id: number | null; is_completed: boolean; gift_acknowledgement_sent: boolean;
  date: number; soft_credits: unknown[];
}

export const db = {
  donors: fx('donors') as RawDonor[],
  gifts: fx('gifts') as RawGift[],
  funds: fx('funds') as Array<Record<string, unknown> & { id: number }>,
  awardCycles: fx('award-cycles') as Array<Record<string, unknown> & { id: number }>,
  scholarships: fx('scholarships') as Array<Record<string, unknown> & { id: number }>,
  awardedStudents: fx('awarded-students') as Array<Record<string, unknown> & { id: number }>,
  activities: fx('activities') as Array<Record<string, unknown> & { id: number; donor_id: number }>,
};

/**
 * quick_stats is computed from gifts rather than stored, so it can never drift
 * from the gift list the same API serves.
 *
 * "year" is read as the current calendar year. Their spec names the field
 * year_total but does not say whether the year is calendar or fiscal, and a
 * foundation's fiscal year usually is not January. Flagged, not resolved.
 */
export function quickStats(donorId: number) {
  const mine = db.gifts.filter((g) => g.donor_id === donorId).sort((a, b) => b.date - a.date);
  const yearStart = Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000;
  const thisYear = mine.filter((g) => g.date >= yearStart);
  const last = mine[0];
  return {
    object: 'donor_quick_stats',
    lifetime_total: mine.reduce((s, g) => s + g.amount, 0),
    lifetime_gift_count: mine.length,
    year_total: thisYear.reduce((s, g) => s + g.amount, 0),
    year_gift_count: thisYear.length,
    last_gift: last ? last.amount : null,
    last_gift_date: last ? last.date : null,
    include_soft_credits: true,
  };
}

export const toDonorListItem = (d: RawDonor) => ({
  object: 'donor', id: d.id, first_name: d.first_name, last_name: d.last_name,
  email: d.email, organization: d.organization, phone: d.phone, role: d.role,
});

export const toDonorDetail = (d: RawDonor) => ({
  object: 'donor', quick_stats: quickStats(d.id), id: d.id,
  first_name: d.first_name, last_name: d.last_name, email: d.email, phone: d.phone,
  role: d.role, city: d.city, state: d.state, zip_code: d.zip_code,
  organization_name: d.organization_name, notes: d.notes,
  include_soft_credits: d.include_soft_credits,
});

export const toGift = (g: RawGift) => ({
  object: 'gift', id: g.id, donor_id: g.donor_id, type: g.type, gift_type: g.gift_type,
  amount: g.amount, subject: g.subject, description: g.description, fund_id: g.fund_id,
  campaign_id: g.campaign_id, is_completed: g.is_completed,
  gift_acknowledgement_sent: g.gift_acknowledgement_sent, date: g.date,
  soft_credits: g.soft_credits,
});

export const donorName = (d: RawDonor) =>
  d.role === 'Organization' ? (d.organization_name ?? 'Unnamed organization')
    : [d.first_name, d.last_name].filter(Boolean).join(' ');
