# 0003. TypeScript end to end, not their stack

**Date:** 2026-09-02
**Status:** Accepted

## Context

AwardSpring's own SDKs are .NET and PHP only. Their marketing site runs on
Astro. It would be possible to "match their stack" by building in C# instead.

## Decision

Rejected matching their stack. Their own posting says they hire for
"fluency in agentic development, not time in any one stack" — writing slow,
unfamiliar C# to look native would be worse on both the fluency claim and the
actual output.

Chose TypeScript end to end instead. The real nod to their stack isn't
matching it — it's that they have **no Python and no JavaScript/TypeScript
client at all** (see `docs/awardspring-api-notes.md`, section 9), so a
TypeScript client fills an actual gap rather than duplicating one of their
own.

Zod was picked for a specific reason, not habit: their API rejects unknown
request fields rather than ignoring them, so Zod's strict mode mirrors that
behaviour directly instead of needing custom validation code to fight it.

## Consequences

None of the code in this repo needs to defend "why not C#" as a stack
mismatch — it's an intentional choice tied to a specific gap in what
AwardSpring publishes, not an accident of what was comfortable to write.
