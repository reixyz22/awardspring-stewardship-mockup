/**
 * One consistent, visible failure state for every screen's fetch effect -
 * so "the mock server isn't running" reads as a plain sentence with a fix,
 * not a frozen "Loading..." and a stack trace someone has to open devtools
 * to find.
 */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="error-banner">
      <b>Something broke.</b>
      <p style={{ margin: '4px 0 0' }}>{message}</p>
      <p className="sub" style={{ marginTop: 8, marginBottom: 0 }}>
        Common cause: the mock server isn't running - try <code>npm run dev:mock</code>.
      </p>
    </div>
  );
}
