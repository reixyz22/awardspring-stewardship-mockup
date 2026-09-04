/**
 * Draft -> gate, in one component: generate a letter, then edit / approve /
 * reject it. The facts it can state are assembled here from data the Donor
 * Brief already fetched - nothing new is looked up, which is what lets
 * tagProvenance prove the labeling instead of trusting the model's word.
 *
 * Approve is a UI-only confirmation, not a write. Write-back was cut
 * (ADR-0008), so there is genuinely no API call to make here - the "Sent!"
 * message says exactly that rather than implying one happened.
 */
import { useState } from 'react';
import { generateDraft } from '../../api/draft.ts';
import type { AwardedStudent, DonorDetail as Donor } from '../../api/types.ts';
import { displayName, moneyShort } from '../../lib/format.ts';
import { tagProvenance, type Fact } from '../../lib/provenance.ts';

type Flow =
  | { phase: 'form' }
  | { phase: 'loading' }
  | { phase: 'error'; message: string }
  | { phase: 'review'; text: string; facts: Fact[]; editing: boolean }
  | { phase: 'confirmSend'; text: string }
  | { phase: 'sent' }
  | { phase: 'confirmReject'; text: string }
  | { phase: 'rejected'; reason: string };

/** Every fact carries exactly where it came from, for the hover citation. */
function buildFacts(donor: Donor, fundedStudents: AwardedStudent[]): Fact[] {
  const qs = donor.quick_stats;
  const fromDonor = "This donor's own record (GET /donors/{id} → quick_stats)";
  const fromAwards = 'This cycle\'s awarded students (GET /scholarships/awarded-students)';
  return [
    { value: moneyShort(qs.lifetime_total), citation: `${fromDonor}.lifetime_total` },
    { value: moneyShort(qs.year_total), citation: `${fromDonor}.year_total` },
    { value: qs.lifetime_gift_count != null ? String(qs.lifetime_gift_count) : '', citation: `${fromDonor}.lifetime_gift_count` },
    ...fundedStudents.flatMap((s) => [
      { value: [s.first_name, s.last_name].filter(Boolean).join(' '), citation: fromAwards },
      { value: moneyShort(s.awarded_amount), citation: `${fromAwards}: ${s.first_name}'s awarded_amount` },
      { value: s.scholarship_name ?? '', citation: fromAwards },
    ]),
  ].filter((f) => f.value);
}

/**
 * What each fact IS, not just that it exists - see the comment in
 * server/local/draft.ts on why this matters (a verbatim-copied number can
 * still be attributed to the wrong thing).
 */
function buildContext(donor: Donor, fundedStudents: AwardedStudent[]): string {
  const qs = donor.quick_stats;
  const lines = [
    `This donor's own lifetime giving to the institution: ${moneyShort(qs.lifetime_total)}`,
    `This donor's own giving this year: ${moneyShort(qs.year_total)}`,
    `Number of gifts this donor has made: ${qs.lifetime_gift_count ?? 'unknown'}`,
  ];
  if (fundedStudents.length > 0) {
    lines.push(
      "Students this donor's fund helped award this year (this is what the STUDENT received, not the donor's own gift amount):",
    );
    for (const s of fundedStudents) {
      lines.push(`- ${[s.first_name, s.last_name].filter(Boolean).join(' ')}, awarded ${moneyShort(s.awarded_amount)} via the ${s.scholarship_name}`);
    }
  }
  return lines.join('\n');
}

export function DraftPanel({
  donor, fundedStudents, onClose, onSent,
}: {
  donor: Donor;
  fundedStudents: AwardedStudent[];
  onClose: () => void;
  /** Fires on confirmed send - session-only "mark as thanked" memory, not
   * a write. See the comment on sentDonorIds in main.tsx. */
  onSent: () => void;
}) {
  const [familiarity, setFamiliarity] = useState('somewhat');
  const [tone, setTone] = useState('warm');
  const [note, setNote] = useState('');
  const [flow, setFlow] = useState<Flow>({ phase: 'form' });
  const [rejectReason, setRejectReason] = useState('');

  const facts = buildFacts(donor, fundedStudents);
  const context = buildContext(donor, fundedStudents);
  const name = displayName(donor);

  const submit = async () => {
    setFlow({ phase: 'loading' });
    try {
      const text = await generateDraft({
        donorName: name, facts: facts.map((f) => f.value), context, familiarity, tone, note,
      });
      setFlow({ phase: 'review', text, facts, editing: false });
    } catch (err) {
      setFlow({ phase: 'error', message: err instanceof Error ? err.message : String(err) });
    }
  };

  return (
    <div className="card pad" style={{ marginTop: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <div className="lbl">Draft a thank-you - {name}</div>
        <button className="ghost-btn" style={{ marginLeft: 'auto' }} onClick={onClose}>Close</button>
      </div>

      {flow.phase === 'form' && (
        <>
          <label className="field">
            How well do you know this donor?
            <select value={familiarity} onChange={(e) => setFamiliarity(e.target.value)}>
              <option value="not well">Not well</option>
              <option value="somewhat">Somewhat</option>
              <option value="well">Well</option>
            </select>
          </label>
          <label className="field">
            Tone
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="warm">Warm</option>
              <option value="formal">Formal</option>
              <option value="enthusiastic">Enthusiastic</option>
            </select>
          </label>
          <label className="field">
            Anything specific worth mentioning? (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. she visited campus last spring" />
          </label>
          <button className="ghost-btn" onClick={submit}>Generate draft</button>
        </>
      )}

      {flow.phase === 'loading' && <p className="sub">Writing…</p>}

      {flow.phase === 'error' && (
        <>
          <div className="gap"><p style={{ margin: 0 }}>{flow.message}</p></div>
          <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setFlow({ phase: 'form' })}>Back</button>
        </>
      )}

      {flow.phase === 'review' && (
        <>
          {flow.editing ? (
            <textarea
              className="letter"
              style={{ width: '100%', minHeight: 220 }}
              value={flow.text}
              onChange={(e) => setFlow({ ...flow, text: e.target.value })}
            />
          ) : (
            <div className="letter">
              {tagProvenance(flow.text, flow.facts).map((seg, i) => (
                seg.source === 'api'
                  ? <span key={i} className="fact" data-citation={seg.citation}>{seg.text}</span>
                  : <span key={i}>{seg.text}</span>
              ))}
            </div>
          )}
          <p className="sub" style={{ marginTop: 10 }}>
            <span className="fact" style={{ marginRight: 6 }}>highlighted</span>
            text is a real API fact, copied verbatim - hover one to see exactly where it came from.
            Everything else is the model's own writing.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn-approve" onClick={() => setFlow({ phase: 'confirmSend', text: flow.text })}>Approve</button>
            <button className="btn-reject" onClick={() => setFlow({ phase: 'confirmReject', text: flow.text })}>Reject</button>
            <button className="ghost-btn" onClick={() => setFlow({ ...flow, editing: !flow.editing })}>
              {flow.editing ? 'Done editing' : 'Edit'}
            </button>
          </div>
        </>
      )}

      {flow.phase === 'confirmSend' && (
        <>
          <p>Send this thank-you to <b>{name}</b>? This can't be undone.</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-approve" onClick={() => { onSent(); setFlow({ phase: 'sent' }); }}>Confirm send</button>
            <button className="ghost-btn" onClick={() => setFlow({ phase: 'review', text: flow.text, facts, editing: false })}>Cancel</button>
          </div>
        </>
      )}

      {flow.phase === 'sent' && (
        <div className="sent-banner">
          <b>Sent!</b>
          <p style={{ margin: '6px 0 0' }}>
            (Nothing was actually sent - this is a mock. Write-back is cut from scope, see
            docs/adr/0008-cut-write-back.md - there is no real send path for this to trigger.)
          </p>
        </div>
      )}

      {flow.phase === 'confirmReject' && (
        <>
          <label className="field">
            Why? (one line)
            <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-reject" onClick={() => setFlow({ phase: 'rejected', reason: rejectReason || '(no reason given)' })}>
              Confirm reject
            </button>
            <button className="ghost-btn" onClick={() => setFlow({ phase: 'review', text: flow.text, facts, editing: false })}>Cancel</button>
          </div>
        </>
      )}

      {flow.phase === 'rejected' && (
        <>
          <div className="gap"><p style={{ margin: 0 }}>Rejected. Reason kept: "{flow.reason}"</p></div>
          <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => { setRejectReason(''); setFlow({ phase: 'form' }); }}>
            Try again
          </button>
        </>
      )}
    </div>
  );
}
