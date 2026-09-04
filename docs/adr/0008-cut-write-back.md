# 0008. Write-back cut from scope

**Date:** 2026-09-03
**Status:** Accepted

## Context

`SPEC.md`'s feature 6, "write-back," meant: after a letter is approved, log a
`LoggedEmail` activity against the donor, so the next person opening their
record sees they were thanked, and the donor drops out of the Queue.

Two things argue against building it:

1. `CLAUDE.md`'s own build order already names the fallback: *"if time runs
   out, stop after the gate. A demo that drafts letters and refuses to send
   them without approval is the thing this project is about."* Write-back
   was never the point - the gate is.
2. It doesn't actually deliver what it promises, as documented. Their API
   lets us create a `LoggedEmail` activity, but nothing says doing so flips
   a **gift's own** `gift_acknowledgement_sent` field - which is exactly the
   field the Queue checks. So "write-back closes the Queue loop" would
   require the mock to invent a side effect their real API doesn't specify,
   not just implement a documented one.

## Decision

Cut. The approval gate is the last screen this build needs. Everything up
to and including it demonstrates the actual thesis; write-back would have
been a nice-to-have bolted onto an already-ambiguous piece of their schema.

## Consequences

README and SPEC mark this cut, not merely unbuilt - a reviewer shouldn't
read an unchecked box and wonder if it ran out of weekend. If this
project continues past the interview, this is the first ADR that would get
superseded, once "does creating an activity acknowledge a gift" has an
actual answer worth implementing.
