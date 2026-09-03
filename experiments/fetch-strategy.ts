/**
 * Run with: npx tsx experiments/fetch-strategy.ts
 * The mock server must already be running (npm run dev:mock).
 *
 * Deliberately independent of src/api/client.ts - that file reads
 * import.meta.env, which only exists inside Vite. This is a plain Node
 * script, so it talks to the mock directly with the same header the real
 * client uses. See server/awardspring/conventions/auth.ts for that key.
 */
const BASE = 'http://localhost:8787';
const KEY = 'mock_key_not_a_real_credential';

let requestCount = 0;

async function get<T>(path: string): Promise<T> {
  requestCount += 1;
  const res = await fetch(BASE + path, { headers: { 'X-Spring-API-Key': KEY } });
  return res.json() as Promise<T>;
}

/**
 * Mirrors what src/app/donors/DonorList.tsx actually does: list donors, then
 * fetch every donor's detail record to reach quick_stats. This is the real
 * shape of "one screen's worth of work," not a made-up stand-in for it.
 */
async function fetchDonorsWithStats() {
  const list = await get<{ data: { id: number }[] }>('/api/v1/donors?limit=100');
  await Promise.all(list.data.map((d) => get(`/api/v1/donors/${d.id}`)));
}

/** Option B (ADR-0006, what's actually built): Reports re-fetches everything. */
async function independentStrategy() {
  await fetchDonorsWithStats(); // Donors screen opens
  await fetchDonorsWithStats(); // Reports screen opens - fetches again
}

/** Option A (not built - the thing this experiment is checking): Reports reuses it. */
async function sharedStrategy() {
  await fetchDonorsWithStats(); // Donors screen opens
  // Reports screen opens - reads already-loaded data, no fetch.
}

async function timeIt(name: string, strategy: () => Promise<void>) {
  requestCount = 0;
  const start = performance.now();
  await strategy();
  const ms = performance.now() - start;
  console.log(`${name.padEnd(12)} requests=${requestCount}  time=${ms.toFixed(1)}ms`);
}

async function main() {
  // Warm-up, deliberately not counted or timed - and deliberately a FULL
  // fetchDonorsWithStats() call, not just one request. Promise.all fires 16
  // concurrent detail requests, which the first time round has to open up to
  // 16 fresh sockets. A single warm-up request only warms one of those
  // sockets, so independentStrategy (which bursts 16-at-once twice) was still
  // handing sharedStrategy (which only ever bursts once) an unfairly warm
  // pool. Warming the full 16-concurrent shape first puts both strategies on
  // equal footing.
  await fetchDonorsWithStats();

  await timeIt('independent', independentStrategy);
  await timeIt('shared', sharedStrategy);
}

main();
