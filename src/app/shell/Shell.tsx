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
import { askAssistant, type AssistantToolCall } from '../../api/assistant.ts';

export const NAV = ['Dashboard', 'Donors', 'Reports'] as const;
export type NavItem = (typeof NAV)[number];

type Exchange =
  | { status: 'loading'; question: string }
  | { status: 'done'; question: string; text: string; toolCalls: AssistantToolCall[] }
  | { status: 'error'; question: string; message: string };

export function Shell({
  active, onNavigate, children,
}: {
  active: NavItem;
  onNavigate: (n: NavItem) => void;
  children: ReactNode;
}) {
  const [question, setQuestion] = useState('');
  const [exchange, setExchange] = useState<Exchange | null>(null);

  const submit = async () => {
    const q = question.trim();
    if (!q) return;
    setQuestion('');
    setExchange({ status: 'loading', question: q });
    try {
      const { text, toolCalls } = await askAssistant(q);
      setExchange({ status: 'done', question: q, text, toolCalls });
    } catch (err) {
      setExchange({ status: 'error', question: q, message: err instanceof Error ? err.message : String(err) });
    }
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
          {exchange && (
            <div className="assistant-panel">
              <div className="assistant-q">You asked: <b>{exchange.question}</b></div>

              {exchange.status === 'loading' && <p className="sub" style={{ margin: 0 }}>Thinking…</p>}

              {exchange.status === 'error' && (
                <div className="gap"><p style={{ margin: 0 }}>{exchange.message}</p></div>
              )}

              {exchange.status === 'done' && (
                <>
                  <p style={{ margin: 0 }}>{exchange.text}</p>
                  {exchange.toolCalls.length > 0 && (
                    <p className="sub" style={{ marginTop: 10, marginBottom: 0 }}>
                      Answered by calling: {exchange.toolCalls.map((t) => t.name).join(', ')} -
                      the same API the rest of this app uses, nothing invented.
                    </p>
                  )}
                </>
              )}

              <button className="ghost-btn" style={{ marginTop: 12 }} onClick={() => setExchange(null)}>
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
        <div className="sidebar-credit">Built by William Pitts <span>✦</span> Claude</div>
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
