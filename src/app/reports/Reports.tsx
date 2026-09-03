/**
 * Giving Pyramid + LYBUNT/SYBUNT.
 *
 * Fetches independently of the Donors screen - see ADR-0006 for why, and
 * experiments/README.md for the measured cost of that choice.
 *
 * Retention rate and giving trends are NOT here on purpose: both need a
 * date-sliced view of every gift in the institution, and /api/v1/gifts has
 * no date filter (donor_id, type, q, and pagination only - see
 * server/awardspring/routes/gifts.ts). Building them would mean walking the
 * entire gift table at limit=100. Pyramid and LYBUNT/SYBUNT don't have that
 * cost - both run entirely off quick_stats, already on the donor detail call.
 */
import { useEffect, useState } from 'react';
import { apiGet, apiList } from '../../api/client.ts';
import type { DonorDetail, DonorListItem } from '../../api/types.ts';
import { givingPyramid } from '../../reports/pyramid.ts';
import { givingStatus, type GivingStatus } from '../../reports/lybunt.ts';
import { displayName, longDate, moneyShort } from '../../lib/format.ts';

const STATUS_LABEL: Record<GivingStatus, string> = {
  active: 'Active', lybunt: 'LYBUNT', sybunt: 'SYBUNT', never: 'Never given',
};

export function Reports() {
  const [donors, setDonors] = useState<DonorDetail[]>([]);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    let live = true;
    (async () => {
      const list = await apiList<DonorListItem>('/api/v1/donors');
      const details = await Promise.all(list.data.map((d) => apiGet<DonorDetail>(`/api/v1/donors/${d.id}`)));
      if (!live) return;
      setDonors(details);
      setRequests(list.requests + details.length);
    })();
    return () => { live = false; };
  }, []);

  if (donors.length === 0) return <p className="sub">Loading…</p>;

  const pyramid = givingPyramid(donors.map((d) => d.quick_stats.lifetime_total ?? 0));
  const atRisk = donors
    .map((d) => ({ donor: d, status: givingStatus(d.quick_stats) }))
    .filter((r) => r.status !== 'active')
    .sort((a, b) => (a.status === 'lybunt' ? 0 : 1) - (b.status === 'lybunt' ? 0 : 1));

  return (
    <>
      <h1 className="h1">Reports</h1>
      <p className="sub">Giving Pyramid and LYBUNT/SYBUNT — both computed from quick_stats, no extra requests beyond one detail call per donor.</p>

      <h2 style={{ fontSize: 15, marginTop: 28 }}>Giving Pyramid</h2>
      <table className="donors">
        <thead><tr><th>Tier</th><th className="num">Donors</th><th className="num">Total</th></tr></thead>
        <tbody>
          {pyramid.map((t) => (
            <tr key={t.label}>
              <td className="name">{t.label}</td>
              <td className="num">{t.count}</td>
              <td className="num">{moneyShort(t.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, marginTop: 28 }}>LYBUNT / SYBUNT</h2>
      <p className="sub">Donors with no gift this year, ordered by how recently they lapsed.</p>
      <table className="donors">
        <thead><tr><th>Name</th><th>Status</th><th>Last gift</th><th className="num">Lifetime</th></tr></thead>
        <tbody>
          {atRisk.map(({ donor, status }) => (
            <tr key={donor.id}>
              <td className="name">{displayName(donor)}</td>
              <td><span className="chip">{STATUS_LABEL[status]}</span></td>
              <td style={{ color: '#7c8a9d' }}>{longDate(donor.quick_stats.last_gift_date)}</td>
              <td className="num">{moneyShort(donor.quick_stats.lifetime_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="sub" style={{ marginTop: 16 }}>
        Rendered from <b>{requests} API requests</b> — same shape as the Donors screen,
        fetched independently (see ADR-0006). Retention rate and giving trends aren't built:
        their gifts endpoint has no date filter, so either would cost walking every gift in
        the institution rather than reading quick_stats once per donor.
      </p>
    </>
  );
}
