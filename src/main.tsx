import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell, type NavItem } from './app/shell/Shell.tsx';
import { DonorList } from './app/donors/DonorList.tsx';
import { DonorDetail } from './app/donors/DonorDetail.tsx';
import { Reports } from './app/reports/Reports.tsx';
import { Queue } from './app/queue/Queue.tsx';
import './styles.css';

/** No router yet. Four screens do not need one. */
function App() {
  const [nav, setNav] = useState<NavItem>('Dashboard');
  const [donorId, setDonorId] = useState<number | null>(null);

  // Session-only memory that a thank-you was approved for a donor this
  // browser session - NOT a write. Write-back is cut (ADR-0008): there is
  // no API call that would make the Queue reflect this on its own, and
  // without something filling that gap, approving a letter then going back
  // to the Queue shows the same donor still needing one - looks broken in
  // a demo even though it's honestly consistent with what wasn't built.
  // This resets on reload; it never claims to be more durable than that.
  const [sentDonorIds, setSentDonorIds] = useState<Set<number>>(new Set());
  const markSent = (id: number) => setSentDonorIds((prev) => new Set(prev).add(id));

  // Opening a donor from the Queue reuses the Donors screen's detail view
  // rather than a second copy of it - same component, different entry point.
  const openDonor = (id: number) => { setDonorId(id); setNav('Donors'); };

  return (
    <Shell active={nav} onNavigate={(n) => { setNav(n); setDonorId(null); }}>
      {nav === 'Dashboard' && <Queue onOpen={openDonor} sentDonorIds={sentDonorIds} />}
      {nav === 'Donors' && donorId === null && <DonorList onOpen={setDonorId} />}
      {nav === 'Donors' && donorId !== null && (
        <DonorDetail donorId={donorId} onBack={() => setDonorId(null)} sentDonorIds={sentDonorIds} onMarkSent={markSent} />
      )}
      {nav === 'Reports' && <Reports />}
    </Shell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
