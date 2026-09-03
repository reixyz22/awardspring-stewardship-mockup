# 0004. Resolving their pagination/endpoint contradiction

**Date:** 2026-09-02
**Status:** Accepted

## Context

Their pagination page says filters are pinned into the cursor, and that on
scholarship reporting endpoints resending `award_cycle_id` on a later page
"can conflict with what the cursor already asserts."

Their `scholarships/awarded-students` and `scholarships/available-dollars`
endpoint descriptions say the opposite: *"Send award_cycle_id on every
request, including when paging: it is recorded in the cursor and a request
whose award_cycle_id does not match the cursor's is rejected."*

Read charitably these reconcile as "send it, but send it unchanged." As
written they are opposite instructions, and a first-time integrator would
reasonably guess wrong either way.

## Decision

The mock implements the endpoint-level rule: filters **may be resent**, and
are rejected with `400 invalid_cursor` only when a resent value **disagrees**
with what the cursor already recorded. That reading satisfies both pages.

Implemented in `server/awardspring/conventions/pagination.ts` — the file
carries this same explanation in a comment at the point where the check
happens, so the ambiguity is visible at the code, not just in this record.

## Consequences

This is a guess at their intent, not a resolution of the actual
contradiction — that's worth raising with them directly as a real,
specific doc-bug report, not something this project can fix on their behalf.
