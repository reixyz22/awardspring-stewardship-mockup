# 0007. What counts as "gave during the current award cycle"

**Date:** 2026-09-03
**Status:** Accepted

## Context

The Queue's whole definition, per `SPEC.md`, is "donors who gave in the
current award cycle with no logged acknowledgement yet." `AwardCycleV1`
(`docs/openapi.json`) has exactly four date fields: `application_start_date`,
`application_end_date`, `review_start_date`, `review_end_date`. All four are
about students applying for and being reviewed for scholarships. None of
them describe a giving window - the API has no field for "when does this
cycle start counting donor gifts."

## Decision

Use `application_start_date` as the cutoff, through now. Reasoning: a cycle's
application period is the closest thing their schema has to "this cycle
began," and stewardship activity (thanking donors) reasonably starts once
the cycle it's funding has opened - not once applications finish being
reviewed, which would arbitrarily exclude gifts made during the review
period itself.

This is a guess at intent, same as ADR-0004 - their schema simply doesn't
carry the field this feature actually needs.

## Consequences

`src/app/queue/Queue.tsx` cites this ADR at the point the cutoff is computed.
If AwardSpring's real API turns out to define this differently (a dedicated
giving-period field, or a convention documented elsewhere), this ADR gets
superseded, not edited.
