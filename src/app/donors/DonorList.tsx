/**
 * The donor list.
 *
 * This screen is where the N+1 shows up and it is not hidden. quick_stats
 * (lifetime_total, year_total, last_gift_date) lives on DonorDetailV1 only -
 * DonorListItemV1 does not carry it - so any column derived from giving costs one
 * extra request per donor. The footer prints the real number the page just spent.
 *
 * @spec openapi.json #/components/schemas/DonorListItemV1 vs DonorDetailV1
 */
import { useEffect, useState } from 'react';
import { apiGet, apiList } from '../../api/client.ts';
import type { DonorDetail, DonorListItem } from '../../api/types.ts';
import { displayName, longDate, moneyShort } from '../../lib/format.ts';

type Row = DonorListItem & { detail?: DonorDetail };

export function DonorList({ onOpen }: { onOpen: (id: number) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [requests, setRequests] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = await apiList<DonorListItem>('/api/v1/donors');
        if (!live) return;
        setRows(list.data);

        // One detail call per donor, purely to reach quick_stats.
        const details = await Promise.all(list.data.map((d) => apiGet<DonorDetail>(`/api/v1/donors/${d.id}`)));
        if (!live) return;
        setRows(list.data.map((d, i) => ({ ...d, detail: details[i] })));
        setRequests(list.requests + details.length);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => { live = false; };
  }, []);

  if (error) return <p style={{ color: '#b4232a' }}>{error}</p>;

  const sorted = [...rows].sort(
    (a, b) => (b.detail?.quick_stats.lifetime_total ?? 0) - (a.detail?.quick_stats.lifetime_total ?? 0),
  );

  return (
    <>
      <h1 className="h1">Donors</h1>
      <p className="sub">{rows.length} donor records in the current institution.</p>

      <table className="donors">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Type</th>
            <th className="num">Lifetime</th>
            <th className="num">This year</th>
            <th>Last gift</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => (
            <tr key={d.id} onClick={() => onOpen(d.id)}>
              <td className="name">{displayName(d)}</td>
              <td style={{ color: '#7c8a9d' }}>{d.email ?? '--'}</td>
              <td><span className="chip">{d.role}</span></td>
              <td className="num">{moneyShort(d.detail?.quick_stats.lifetime_total)}</td>
              <td className="num">{moneyShort(d.detail?.quick_stats.year_total)}</td>
              <td style={{ color: '#7c8a9d' }}>
                {d.detail ? longDate(d.detail.quick_stats.last_gift_date) : '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {requests > 0 && (
        <p className="sub" style={{ marginTop: 16 }}>
          Rendered from <b>{requests} API requests</b>: 1 to list donors, {requests - 1} to read{' '}
          <code>quick_stats</code> off each detail record. Their list endpoint does not carry giving
          totals, so the three right-hand columns cost one request per row.
        </p>
      )}
    </>
  );
}
