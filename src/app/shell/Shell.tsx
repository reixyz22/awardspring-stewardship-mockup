/**
 * The application shell: top bar, sidebar, wordmark.
 *
 * The layout is modelled on AwardSpring's own donor record view. The wordmark is
 * deliberately NOT theirs - it reads "AwardSpring MOCKED", set in our own type,
 * because a demo that borrows a real company's logo is a different kind of
 * project. The banner under it says the same thing in words.
 *
 * The signed-in user is fictional and the session is fake. There is no auth here
 * and the UI does not pretend otherwise.
 */
import type { ReactNode } from 'react';

export const NAV = ['Dashboard', 'Scholarships', 'Funds', 'Applicants', 'Donors', 'Reports'] as const;
export type NavItem = (typeof NAV)[number];

export function Shell({
  active, onNavigate, children,
}: {
  active: NavItem;
  onNavigate: (n: NavItem) => void;
  children: ReactNode;
}) {
  return (
    <>
      <header className="topbar">
        <div className="search">
          <span>⌕</span>
          <span>Search scholarships, applicants, donors...</span>
        </div>
        <div className="topbar-right">
          <span>🔔</span>
          <span>jane.doe@university.edu</span>
        </div>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <b>AWARD</b><span>SPRING</span>
          <em>mocked</em>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n}
              className={n === active ? 'on' : undefined}
              onClick={() => onNavigate(n)}
            >
              <span className="dot" />
              {n}
            </button>
          ))}
        </nav>
      </aside>

      <main className="main">
        <div className="mockbar">
          <b>Demo.</b> Every record below is invented. This app talks to a local mock of
          AwardSpring&apos;s public API, not to AwardSpring. The signed-in user is fictional
          and there is no authentication. Not affiliated with or endorsed by AwardSpring.
        </div>
        {children}
      </main>
    </>
  );
}
