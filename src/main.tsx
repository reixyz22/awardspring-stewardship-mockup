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

  // Opening a donor from the Queue reuses the Donors screen's detail view
  // rather than a second copy of it - same component, different entry point.
  const openDonor = (id: number) => { setDonorId(id); setNav('Donors'); };

  return (
    <Shell active={nav} onNavigate={(n) => { setNav(n); setDonorId(null); }}>
      {nav === 'Dashboard' && <Queue onOpen={openDonor} />}
      {nav === 'Donors' && donorId === null && <DonorList onOpen={setDonorId} />}
      {nav === 'Donors' && donorId !== null && <DonorDetail donorId={donorId} onBack={() => setDonorId(null)} />}
      {nav === 'Reports' && <Reports />}
    </Shell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
