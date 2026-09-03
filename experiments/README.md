# Experiment: does sharing one fetch actually save time?

Standalone, not part of the shipped app. Nothing here is imported by `src/` or
`server/` outside the one small opt-in delay switch in `server/index.ts`.

## The question

`SPEC.md` has a design decision: the Reports screen re-fetches all donor data
independently rather than reusing what the Donors screen already loaded
(Option B, see SPEC.md). The reasoning there was "the mock has no real latency
or rate limit to actually cost us." This experiment checks whether that's true,
instead of just asserting it.

## Hypothesis

1. **Request count:** visiting Donors then Reports fires about twice as many
   requests under "independent fetch" (Option B) as under "shared fetch"
   (Option A) — 34 vs. 17, for 16 donors.
2. **Time:** on `localhost`, that doubled request count costs almost nothing,
   because round-trip time is near zero. Against a real hosted API it would
   cost something real, because each of those extra 17 requests pays a real
   network round trip.

Part 2 can't be tested honestly on our own local mock as-is — there's no
latency to save. So the mock has an opt-in artificial delay
(`EXPERIMENT_LATENCY_MS`, see `server/index.ts`) that simulates a real API's
round-trip time, off by default.

## Method

- Run the mock twice: once with `EXPERIMENT_LATENCY_MS=0` (today's reality),
  once with `EXPERIMENT_LATENCY_MS=150` (typical real-API round trip).
- `fetch-strategy.ts` simulates both fetch strategies against whichever mock
  is running, and prints request count + wall-clock time for each.
- Numbers get pasted into the **Result** section below once we've run it.

## Result

Both strategies fetch a fixed shape: `independent` = Donors screen + Reports
screen, each independently listing 16 donors and fetching each one's detail
(34 requests total). `shared` = Donors screen only; Reports reuses that data
(17 requests). Three runs each, after fixing two measurement artifacts
described below.

| Mock latency | `independent` (34 req) | `shared` (17 req) | Gap |
|---|---|---|---|
| 0ms (today) | ~20-37ms | ~8-12ms | ~10-25ms |
| 150ms (simulated real API) | ~623ms | ~308ms | **~315ms** |

**Hypothesis 1 confirmed exactly:** request count doubles (34 vs 17), same
ratio both times.

**Hypothesis 2 confirmed, and now with a real number instead of "probably
fine":** on `localhost`, the doubled requests cost 10-25ms — genuinely not
worth building shared state to save. Against something latency-shaped like a
real hosted API, the same doubling costs **~315ms**, which a person would
actually notice. ADR-0006's decision (fetch independently) is correct *for a
mock with no latency* — and it says so, rather than claiming to be correct in
general.

### Two false starts worth keeping

The first run measured `independent=105ms` vs `shared=11.6ms` - a 9x gap, not
the expected 2x. Two real measurement artifacts, found and fixed in order:

1. **No warm-up.** `independentStrategy` ran first in every execution, so it
   always paid a one-time cold-start cost (first socket, Node/V8 warming up)
   that had nothing to do with the strategy. Fixed by adding a throwaway
   warm-up call before either strategy is timed.
2. **Concurrency warm-up, not just connection warm-up.** The gap shrank but
   didn't close - `Promise.all` fires 16 requests at once, and the first time
   that happens it opens up to 16 fresh sockets. `independentStrategy` did
   that burst twice before `sharedStrategy` did it once, so `shared` was
   still getting a free, fully-warmed pool. Fixed by making the warm-up call
   itself a full 16-concurrent burst, not a single request.

After both fixes, three consecutive runs landed within a couple of
milliseconds of each other at each latency setting - stable enough to trust.

### A gap between this script and a real browser, worth stating honestly

This script fires all 16 detail requests at once with no ceiling. A real
browser typically caps concurrent connections to one host at around 6, so a
real page load would batch those 16 into ~3 waves rather than one - meaning
the true browser-measured numbers above would run somewhat *slower* than
what's reported here, not faster. Not fixed, because it doesn't change which
option wins - just flagged so this table isn't read as more precise than it
is.

### The bigger question this experiment didn't test

16 donors is the fixture size, not a real foundation's donor count. The
sharing-vs-not-sharing question this experiment answers costs the same
regardless of donor count. **Donor count itself is the real scaling risk**,
independent of that question: it drives the number of concurrent detail
requests directly, and at real-world scale (thousands of donors) that hits
the browser's ~6-connection ceiling hard - see the request-count note on the
Donors screen (`src/app/donors/DonorList.tsx`). That's the N+1 problem
itself, already flagged there, and it's a separate, larger question from the
one this experiment was built to answer.
