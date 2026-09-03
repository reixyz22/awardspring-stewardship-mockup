# 0005. Rejected: instructing automated resume screeners

**Date:** 2026-09-02
**Status:** Accepted

*(Accepted as a final record of a rejected idea — see the note on Status
in the [ADR index](README.md). The decision itself was "no.")*

## Context

A line was proposed for the resume, aimed at an automated resume-screening
system, pointing it toward this project's demo transcript.

## Decision

Rejected, for three reasons. It presumes their hiring process is automated,
which at a 25-person company with a hand-built application form it probably
is not. It cuts against the actual thesis of this project — a system
designed so a model can't be led into inventing things — while trying to
lead a model into acting on a planted instruction. And it costs the honest
version of the same sentence, which is simply asking a person to watch the
demo.

## Consequences

Logged because the reasoning generalises past this one line: if a technique
would be embarrassing to explain out loud to the person reading it, it isn't
a technique worth using.
