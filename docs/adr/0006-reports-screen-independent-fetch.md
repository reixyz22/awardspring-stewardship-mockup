# 0006. Reports screen fetches its own data, for now

**Date:** 2026-09-03
**Status:** Accepted — see `experiments/` for the open question that could supersede this

## Context

The Donors screen already fetches every donor and every donor's
`quick_stats` (17 requests for 16 donors — `quick_stats` only exists on the
donor detail endpoint, not the list endpoint, so this is unavoidable; see
`src/app/donors/DonorList.tsx`). The Reports screen needs the same data to
compute LYBUNT/SYBUNT. Two ways to get it there:

**Option A — lift the fetch up, share it.** A parent component fetches once;
both screens read from it.
- Pro: zero duplicate requests once Donors has already been opened.
- Pro: one source of truth for both screens.
- Con: couples two otherwise-independent screens.
- Con: needs a place for shared state to live — more structure for a
  two-screen app.
- Con: if Reports is opened first, there's nothing to reuse yet anyway.

**Option B — each screen fetches independently.**
- Pro: simplest to read — open the file, see everything it needs.
- Pro: correct regardless of navigation order.
- Con: duplicates the full 17-request fetch every time Reports opens.
- Con: two independent computations of the same numbers from the same
  source.

## Decision

Chose Option B. On `localhost`, round-trip time is near zero, so the mock
has no real cost to actually save today — building shared state to solve a
request-count problem the mock doesn't have would be a premature
abstraction for a two-screen app.

That claim — "no real cost today" — is a claim about latency, not a fact
that should just be asserted. It's being checked, not assumed: see
`experiments/README.md`, an A/B spike (informally called that; precisely
it's a spike/benchmark, not a true product A/B test — no live traffic, no
users, see the note there) that adds an opt-in artificial delay to the mock
to simulate a real API's round-trip time, then measures both strategies
under it.

## Consequences

The spike ran (see `experiments/README.md` for the full result and two
measurement artifacts found along the way). At 0ms latency — today's actual
mock — the doubled requests cost 10-25ms, confirming this decision is fine
as-is. At a simulated 150ms, typical of a real hosted API, the same doubling
costs ~315ms, a gap a person would actually notice.

**This decision stands, but conditionally, not in general.** It's correct
for a mock with no real latency to save. If this app were ever pointed at
AwardSpring's real API, that condition stops holding, and this ADR should be
superseded by one describing Option A actually built — not edited into
this file.
