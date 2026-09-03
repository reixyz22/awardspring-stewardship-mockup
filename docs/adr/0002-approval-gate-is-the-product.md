# 0002. The approval gate is the product, not a feature

**Date:** 2026-09-02
**Status:** Accepted

## Context

The obvious version of this app drafts thank-you letters and sends them.
That version is worse, for a specific reason: AwardSpring's own published
Stewardship Benchmark found 46% of surveyed institutions run donor
stewardship on one FTE or less, and self-rate their own stewardship quality
at 2.7 out of 5. The gap isn't strategy, it's capacity — and the consequence
of low capacity is that major donors get a real relationship while everyone
else gets a form letter.

## Decision

Build order puts the approval gate last, so it cannot be skipped, and the
README says outright that everything before it is setup. If the weekend runs
out, stop after the gate rather than after the draft.

Also decided: every factual claim in a draft is labelled in the UI as either
an API record or model output. A dollar figure pulled from a gift record and
a sentence the model composed should not look the same on screen.

## Consequences

A demo that drafts letters is a chatbot. A demo that drafts letters and
refuses to send them without a human approving is the actual thesis of the
project — this is the difference between stating a position on AI oversight
and demonstrating one.
