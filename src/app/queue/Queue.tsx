/**
 * The queue: donors who gave since the current cycle began but have no
 * acknowledged gift yet. The landing view - this is the count that's the
 * whole reason a form letter exists.
 *
 * "Since the current cycle began" is a judgment call, not a documented rule -
 * their award cycle schema has no giving-window field. See ADR-0007.
 *
 * Cheaper than Donors or Reports: this screen needs raw gift records
 * (gift_acknowledgement_sent lives on the gift itself, not on quick_stats),
 * and /gifts with no donor_id filter returns the whole institution in one
 * call - no per-donor detail fetch needed at all.
 */
import { useEffect, useState } from 'react';
import { apiGet, apiList } from '../../api/client.ts';
import type { AwardCycle, DonorListItem, Gift } from '../../api/types.ts';
import { displayName, longDate, money } from '../../lib/format.ts';
import { ErrorBanner } from '../shared/ErrorBanner.tsx';

/**
 * One row per DONOR, not per gift - a donor with two unacknowledged gifts
 * gets one thank-you, not two. gifts[0] is the most recent, after sorting.
 */
interface QueueRow { donor: DonorListItem; gifts: Gift[] }

export function Queue({
  onOpen, sentDonorIds,
}: {
  onOpen: (donorId: number) => void;
  /** Session-only "approved this browser session" memory - see main.tsx.
   * Filtered at render, not at fetch, so approving one and coming straight
   * back updates the count without a re-fetch. */
  sentDonorIds: Set<number>;
}) {
  const [rows, setRows] = useState<QueueRow[] | null>(null);
  const [requests, setRequests] = useState(0);
  const [cutoffLabel, setCutoffLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const cycle = await apiGet<AwardCycle>('/api/v1/award-cycles/current');
        const cutoff = cycle.application_start_date ?? 0;

        const [gifts, donors] = await Promise.all([
          apiList<Gift>('/api/v1/gifts'),
          apiList<DonorListItem>('/api/v1/donors'),
        ]);
        if (!live) return;

        const donorById = new Map(donors.data.map((d) => [d.id, d]));
        const byDonor = new Map<number, Gift[]>();
        for (const g of gifts.data) {
          if (g.date < cutoff || g.gift_acknowledgement_sent || !donorById.has(g.donor_id)) continue;
          byDonor.set(g.donor_id, [...(byDonor.get(g.donor_id) ?? []), g]);
        }
        const unacknowledged: QueueRow[] = [...byDonor.entries()]
          .map(([donorId, gs]) => ({ donor: donorById.get(donorId)!, gifts: gs.sort((a, b) => b.date - a.date) }))
          .sort((a, b) => b.gifts[0].date - a.gifts[0].date);

        setRows(unacknowledged);
        setRequests(1 + gifts.requests + donors.requests); // +1 for award-cycles/current
        setCutoffLabel(longDate(cutoff));
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { live = false; };
  }, []);

  if (error) return <ErrorBanner message={error} />;
  if (rows === null) return <p className="sub">Loading…</p>;

  const visibleRows = rows.filter((r) => !sentDonorIds.has(r.donor.id));

  return (
    <>
      <h1 className="h1">Queue</h1>
      <p className="sub">
        {visibleRows.length} donor{visibleRows.length === 1 ? '' : 's'} gave since {cutoffLabel} with no logged acknowledgement yet.
      </p>

      <table className="donors">
        <thead><tr><th>Donor</th><th>Gift</th><th className="num">Total</th><th>Most recent</th></tr></thead>
        <tbody>
          {visibleRows.map(({ donor, gifts }) => (
            <tr key={donor.id} onClick={() => onOpen(donor.id)}>
              <td className="name">{displayName(donor)}</td>
              <td style={{ color: '#7c8a9d' }}>{gifts.length === 1 ? gifts[0].subject ?? '--' : `${gifts.length} gifts`}</td>
              <td className="num">{money(gifts.reduce((s, g) => s + (g.amount ?? 0), 0))}</td>
              <td style={{ color: '#7c8a9d' }}>{longDate(gifts[0].date)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="sub" style={{ marginTop: 16 }}>
        Rendered from <b>{requests} API requests</b> - fewer than Donors or Reports
        because this screen never needs quick_stats. Click a row to open that donor's
        record.
      </p>
    </>
  );
}
