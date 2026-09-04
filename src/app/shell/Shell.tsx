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
import { useState, type ReactNode } from 'react';

export const NAV = ['Dashboard', 'Donors', 'Reports'] as const;
export type NavItem = (typeof NAV)[number];

export function Shell({
  active, onNavigate, children,
}: {
  active: NavItem;
  onNavigate: (n: NavItem) => void;
  children: ReactNode;
}) {
  // Typeable today. Submitting to the model is the next piece to build - the
  // panel below is honest about that rather than faking a reply, same rule
  // as everywhere else in this app: a stubbed feature says it's stubbed.
  const [question, setQuestion] = useState('');
  const [asked, setAsked] = useState<string | null>(null);

  const submit = () => {
    const q = question.trim();
    if (!q) return;
    setAsked(q);
    setQuestion('');
  };

  return (
    <>
      <header className="topbar">
        <div className="assistant-wrap">
          <div className="assistant-bar">
            <span className="spark">✦</span>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ask about a donor, a fund, or start a draft…"
            />
          </div>
          {asked && (
            <div className="assistant-panel">
              <div className="assistant-q">You asked: <b>{asked}</b></div>
              <div className="gap">
                <p style={{ margin: 0 }}>
                  Not wired up yet. This is where the assistant's answer will appear,
                  built the same way as every other screen: by calling the typed API
                  client, never by inventing a fact.
                </p>
              </div>
              <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setAsked(null)}>
                Close
              </button>
            </div>
          )}
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
