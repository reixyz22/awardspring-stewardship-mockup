import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Shell, type NavItem } from './app/shell/Shell.tsx';
import { DonorList } from './app/donors/DonorList.tsx';
import { DonorDetail } from './app/donors/DonorDetail.tsx';
import { Reports } from './app/reports/Reports.tsx';
import './styles.css';

/** No router yet. Three screens do not need one. */
function App() {
  const [nav, setNav] = useState<NavItem>('Donors');
  const [donorId, setDonorId] = useState<number | null>(null);

  return (
    <Shell active={nav} onNavigate={(n) => { setNav(n); setDonorId(null); }}>
      {nav === 'Donors' && donorId === null && <DonorList onOpen={setDonorId} />}
      {nav === 'Donors' && donorId !== null && <DonorDetail donorId={donorId} onBack={() => setDonorId(null)} />}
      {nav === 'Reports' && <Reports />}
      {nav !== 'Donors' && nav !== 'Reports' && <p className="sub">Not built yet.</p>}
    </Shell>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
