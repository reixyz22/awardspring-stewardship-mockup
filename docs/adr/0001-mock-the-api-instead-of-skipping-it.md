# 0001. Mock the AwardSpring API instead of skipping it

**Date:** 2026-09-02
**Status:** Accepted

## Context

AwardSpring's keys are issued per customer institution. Their auth docs carry
the heading "No sandbox yet": every key is live, there is no test mode, and
there is no way to get a credential from outside a customer org.

Three options were considered:

1. Build against a JSON file and call it a day.
2. Build a mock server that implements their documented contract faithfully.
3. Ask AwardSpring for a development key.

## Decision

Chose option 2. Option 1 is a chatbot with a fixture — it proves nothing
about having actually read their spec. Option 3 was considered honestly and
isn't really available: a key grants full read/write on a real institution's
donor records, so there's nothing they could reasonably hand over. Asking is
still a fine question for an interview, but it isn't a blocker and the build
doesn't wait on it.

## Consequences

The mock's job is fidelity, not convenience. Where a documented behaviour is
inconvenient to implement, it gets implemented anyway — see
`server/awardspring/conventions/`, where each file cites the doc page and the
quoted rule it implements.
