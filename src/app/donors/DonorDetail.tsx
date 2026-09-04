/**
 * The donor record, reconstructed from AwardSpring's own donor view.
 *
 * Where their UI shows a field their v1 API does not expose, this renders a
 * labelled gap instead of inventing one. Prospect attributes (capacity rating,
 * dollar rating, cultivation stage, assigned officer) and the receipt template
 * are all visible in their product and absent from DonorDetailV1. Filling those
 * boxes with plausible values would be the exact failure this project is about.
 *
 * @spec openapi.json #/components/schemas/DonorDetailV1
 */
import { useEffect, useState } from 'react';
import { apiGet, apiList } from '../../api/client.ts';
import type { AwardCycle, AwardedStudent, DonorActivity, DonorDetail as Donor, Gift } from '../../api/types.ts';
import { displayName, initials, longDate, money, moneyShort, monthLabel } from '../../lib/format.ts';
import { DraftPanel } from './DraftPanel.tsx';

const humanise = (s: string | null) =>
  !s ? '--' : s.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

type Entry =
  | { kind: 'gift'; id: number; date: number; gift: Gift }
  | { kind: 'activity'; id: number; date: number; activity: DonorActivity };

export function DonorDetail({ donorId, onBack }: { donorId: number; onBack: () => void }) {
  const [donor, setDonor] = useState<Donor | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fundedStudents, setFundedStudents] = useState<AwardedStudent[]>([]);
  const [drafting, setDrafting] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [tab, setTab] = useState<'Profile' | 'Activity'>('Activity');

  useEffect(() => {
    let live = true;
    (async () => {
      const [d, gifts, acts, cycle] = await Promise.all([
        apiGet<Donor>(`/api/v1/donors/${donorId}`),
        apiList<Gift>('/api/v1/gifts', { donor_id: donorId }),
        apiList<DonorActivity>(`/api/v1/donors/${donorId}/activities`),
        apiGet<AwardCycle>('/api/v1/award-cycles/current'),
      ]);
      if (!live) return;
      setDonor(d);
      const merged: Entry[] = [
        ...gifts.data.map((g) => ({ kind: 'gift' as const, id: g.id, date: g.date, gift: g })),
        ...acts.data.map((a) => ({ kind: 'activity' as const, id: a.id, date: a.date, activity: a })),
      ].sort((a, b) => b.date - a.date);
      setEntries(merged);
      setOpen(merged[0]?.kind === 'gift' ? merged[0].id : null);

      // Which students this donor's money actually reached, this cycle - the
      // one thing a form letter can't say. Join is on fund_id: both Gift and
      // AwardedStudentV1 carry it as the same string identifier.
      const awarded = await apiList<AwardedStudent>('/api/v1/scholarships/awarded-students', {
        award_cycle_id: cycle.id,
      });
      if (!live) return;
      const donorFundIds = new Set(gifts.data.map((g) => g.fund_id).filter((f): f is string => f !== null));
      setFundedStudents(awarded.data.filter((a) => a.fund_id !== null && donorFundIds.has(a.fund_id)));
    })();
    return () => { live = false; };
  }, [donorId]);

  if (!donor) return <p className="sub">Loading…</p>;

  let lastMonth = '';

  return (
    <>
      <button className="back" onClick={onBack}>‹ Back to Donors</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
        <div className="avatar">{initials(donor.first_name, donor.last_name, donor.organization_name)}</div>
        <h1 className="h1">{displayName(donor)}</h1>
        <button className="ghost-btn" style={{ marginLeft: 'auto' }} onClick={() => setDrafting(true)}>
          ✉ Draft thank-you
        </button>
      </div>

      {drafting && (
        <DraftPanel donor={donor} fundedStudents={fundedStudents} onClose={() => setDrafting(false)} />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr', gap: 26, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 14 }}>
          <section className="card pad">
            <div className="lbl" style={{ marginBottom: 14 }}>About</div>
            <div className="lbl">Email</div>
            <div className="val">{donor.email ?? '--'}</div>
            <div className="lbl" style={{ marginTop: 13 }}>Preferred phone</div>
            <div className="val">{donor.phone ?? '--'}</div>
            <div className="lbl" style={{ marginTop: 13 }}>Location</div>
            <div className="val">{[donor.city, donor.state].filter(Boolean).join(', ') || '--'}</div>
          </section>

          <section className="card pad">
            <div className="lbl" style={{ marginBottom: 12 }}>Giving summary</div>
            <div className="lbl">Lifetime</div>
            <div className="val" style={{ fontWeight: 700 }}>{money(donor.quick_stats.lifetime_total)}</div>
            <div className="lbl" style={{ marginTop: 13 }}>This year</div>
            <div className="val">{money(donor.quick_stats.year_total)}</div>
            <div className="lbl" style={{ marginTop: 13 }}>Gifts recorded</div>
            <div className="val">{donor.quick_stats.lifetime_gift_count ?? '--'}</div>
          </section>

          <section className="card pad">
            <div className="lbl" style={{ marginBottom: 12 }}>Funded this cycle</div>
            {fundedStudents.length === 0 ? (
              <p className="sub" style={{ margin: 0 }}>
                No students awarded this cycle from this donor's funds.
              </p>
            ) : (
              fundedStudents.map((s) => (
                <div key={s.id} style={{ marginBottom: 10 }}>
                  <div className="val" style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</div>
                  <div className="sub" style={{ margin: 0 }}>{s.scholarship_name} — {moneyShort(s.awarded_amount)}</div>
                </div>
              ))
            )}
          </section>

          <section className="gap">
            <div className="lbl">Prospect attributes</div>
            <p>
              Capacity rating, dollar rating, cultivation stage and assigned officer appear in
              AwardSpring&apos;s own donor view. They are <b>not fields on</b> <code>DonorDetailV1</code>,
              so this build cannot show them. Left empty on purpose.
            </p>
          </section>
        </div>

        <div>
          <div className="tabs">
            {(['Profile', 'Activity'] as const).map((t) => (
              <button key={t} className={t === tab ? 'on' : undefined} onClick={() => setTab(t)}>{t}</button>
            ))}
            <button disabled style={{ cursor: 'default' }}>Proposals <span className="soon">soon</span></button>
          </div>

          {tab === 'Profile' ? (
            <p className="sub" style={{ marginTop: 18 }}>
              Not built. The activity timeline is where this demo lives.
            </p>
          ) : (
            <>
              <div className="subtabs">
                <button className="on">All</button>
                <button>Gifts</button>
                <button>Communications</button>
                <button>Events</button>
              </div>

              <h2 style={{ fontSize: 15, margin: '0 0 4px', fontWeight: 600 }}>Activity Records</h2>

              {entries.map((e) => {
                const m = monthLabel(e.date);
                const header = m !== lastMonth ? ((lastMonth = m), m) : null;
                const isOpen = e.kind === 'gift' && open === e.id;

                return (
                  <div key={`${e.kind}-${e.id}`}>
                    {header && <div className="month">{header}</div>}

                    {e.kind === 'gift' ? (
                      <div
                        className="gift-row"
                        style={isOpen ? { display: 'block' } : undefined}
                        onClick={() => setOpen(isOpen ? null : e.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="badge">$ GIFT</span>
                          <span className="gift-amt">{money(e.gift.amount)}</span>
                          {!isOpen && <span className="gift-fund">{e.gift.fund_id}</span>}
                          <span className="gift-date">{longDate(e.date)}</span>
                        </div>

                        {isOpen && (
                          <div className="grid2">
                            <div><div className="lbl">Activity</div><div className="val">Gift</div></div>
                            <div><div className="lbl">Type</div><div className="val">{humanise(e.gift.gift_type)}</div></div>
                            <div><div className="lbl">Fund</div><div className="val">{e.gift.fund_id ?? '--'}</div></div>
                            <div><div className="lbl">Campaign</div><div className="val">{e.gift.campaign_id ?? '--'}</div></div>
                            <div>
                              <div className="lbl">Acknowledged</div>
                              <div className="val">{e.gift.gift_acknowledgement_sent ? 'Yes' : 'No'}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="gift-row">
                        <span className="chip">{humanise(e.activity.activity_type)}</span>
                        <span style={{ fontWeight: 600 }}>{e.activity.subject}</span>
                        <span className="gift-date">{longDate(e.date)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
