/**
 * The actual run entry point - env loading + .listen(). See server/app.ts
 * for what's actually being served; this file is deliberately thin.
 */
import { createApp } from './app.ts';

// Vite loads .env automatically for the browser; this plain Node process
// does not, so it's loaded explicitly. Node's own loader (20.6+), not the
// dotenv package - one less dependency for something this small.
try { process.loadEnvFile(); } catch { /* no .env yet - /_local routes will say so */ }

const PORT = Number(process.env.MOCK_PORT ?? 8787);

createApp().listen(PORT, () => {
  console.log(`AwardSpring mock listening on http://localhost:${PORT}/api/v1`);
});
