# Instructions for Claude Code

This file is committed on purpose. Nearly all the code in this repo is AI-generated, so the constraints are more interesting than the output.

## Read first

1. `SPEC.md` — architecture and features. What to build and why.
2. `docs/awardspring-api-notes.md` — the API contract, compiled from all 30 pages of AwardSpring's public docs.

Then connect to their documentation MCP server before writing anything:

```
https://docs.awardspring.com/_mcp/server
```

It is advertised on every page of their docs for Claude Code and Cursor. With it connected the spec is queryable during the build rather than pasted in. Any doc page also serves clean markdown by appending `.md`, and `/llms.txt` is the index.

## Who you are working with

William Pitts, 2025 CS grad in Chicago. Python-first, comfortable in React/Vite/Node, newer to TypeScript. This project exists because he applied to AwardSpring for their Product Builder Intern role and their posting says what matters is having shipped something real with AI tools.

## Hard rules

**No API key exists or can be obtained.** Their docs say "No sandbox yet" and keys are issued per customer institution. The app talks to a local mock. Changing `AWARDSPRING_BASE_URL` should be the only difference between mock and production. Nothing in the client may assume it is talking to a fake.

**The mock reproduces documented quirks, not approximations.** `limit` clamped to 100, unrecognised fields rejected, `401` as plain text, unrecognised key as `400`, `dry_run` returning `id: 0`, idempotency replay semantics, rate-limit headers on every response. This fidelity is the point of the project and it is visible to anyone reading the repo. If a documented behaviour is inconvenient to implement, implement it anyway and say so in a comment.

**Clean room.** Nothing from any prior project. Everything derives from AwardSpring's public documentation.

**Honesty is the product.** This app is about a model not overstating what it knows, so the repo must not overstate what it knows either. Mocked calls say they are mocked. Fixture data is obviously synthetic. No metrics that were not measured, no claimed users, no implied relationship with AwardSpring. **Do not edit the README build-status checkboxes to look better than the code.** If something is half-built, it is unchecked.

**No fabricated capability anywhere.** If a feature is stubbed, the UI says stubbed. This is the same rule the app itself enforces on the model, and breaking it here would be funny in the wrong way.

**One weekend.** Push back when scope grows. The stretch list at the bottom of `SPEC.md` is the stretch list.

## Stack

TypeScript end to end. Vite + React front end, small mock server behind it, Zod for schemas, local fixtures. No auth, no database, no real email.

Zod strict mode is deliberate, not a default: their API rejects unknown fields, so strict parsing mirrors their behaviour rather than fighting it.

## Build order

Queue, donor brief, intake, draft, gate, write-back. Each works before the next begins.

**If time runs out, stop after the gate.** A demo that drafts letters is a chatbot. A demo that drafts letters and refuses to send them without approval is the thing this project is about.

## Working style

Hints and options over finished answers when William is learning something. No marketing copy. Tell him when a decision is bad. Keep responses short: answer the question asked, do not restate it three ways.

**Pace: roughly ten lines of code at a time, explained before it is written.**

This is deliberate and it is not about capability. William has to sit in an interview and
explain every decision in this repo as his own. Code he did not follow going in is code he
cannot defend, and a large silent diff is worse than no diff. So:

- Say what the thing is and why it is needed, in plain language, BEFORE writing it.
- Write a small piece. Stop. Let him ask.
- Cite the doc page or the schema field any behaviour comes from. Every time.
- Prefer the boring version he can read over the clever version he cannot.
- Bloat is the enemy twice over: it costs tokens and it costs his mental model.

If a step needs more than about ten lines, split it and say why it did not fit.

Ask what is unclear in the spec before proposing a file layout. Do not write code until the layout is agreed.

## Open question, do not silently resolve

Their pagination page says filters are pinned into the cursor and that resending `award_cycle_id` on a later page "can conflict with what the cursor already asserts." Their `scholarships/awarded-students` and `scholarships/available-dollars` endpoints say to send it on every request including when paging.

These read as opposite instructions. Pick one behaviour for the mock, implement it, and leave a comment marking the ambiguity. Do not pretend it is resolved.

## Log decisions

Real decisions go in `docs/adr/` as a new numbered file (Nygard ADR format —
see `docs/adr/README.md` for the convention). Never edit a past ADR's
reasoning after it's accepted; if a decision is reversed, write a new ADR
that supersedes it. This is committed on purpose and is part of what makes
this repo worth reading.
