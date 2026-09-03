# Donor Stewardship Mock-up

A small web app for one job: a scholarship foundation staffer thanking donors at the end of an award cycle. An AI drafts each letter from that donor's giving history and the students their fund actually awarded. **Nothing sends until a person approves it.**

Built against [AwardSpring's public v1 API spec](https://docs.awardspring.com). Not affiliated with or endorsed by AwardSpring.

> **Status: in progress.** Nothing below is claimed as finished unless it is checked off in [Build status](#build-status). This section will not be edited to look better than the code.

---

## The API is mocked, and here is exactly why

AwardSpring issues API keys per customer institution. Their authentication docs carry a heading that reads, verbatim, **"No sandbox yet"**, followed by: *"Every key is a live key. There is no test mode and no sandbox host."*

There is no developer tier, no signup, and no way for anyone outside a customer organization to obtain a credential. Even if there were, a key grants full read and write access to a real college's donor records, which is not something anyone should hand to a stranger.

So this app talks to a **local mock server** that implements their documented contract.

**The mock is not a stub.** It reproduces documented behaviour rather than approximating it:

| Documented behaviour | Why it is here |
|---|---|
| `limit` **clamped** into 1–100 rather than rejected | `limit=5000` returns 100 silently. A client that trusts the number it sent is wrong. |
| Unrecognised request fields **rejected**, not ignored | Their choice, and a good one. A typo in a field name is a loud error instead of silently dropped data. |
| `401` returns **plain text**, not the JSON error envelope | Their docs warn about this directly. A client assuming JSON on every error path throws inside its own error handler. |
| Unrecognised key returns **`400`**, not `401` | Same reason. Branching on status alone gets this wrong. |
| `dry_run=true` validates fully, persists nothing, returns **`id: 0`** on creates | Their only safe way to exercise a write path when no sandbox exists. |
| `Idempotency-Key` replay, `422` on body mismatch, `409` while in flight | Their docs single out email-less donor creates as the case with no natural duplicate protection. |
| Rate-limit headers on **every** response, `Retry-After` only on `429` | Lets the client slow down before being refused rather than after. |
| Opaque signed cursors with filters pinned into them | `400 invalid_cursor` when a cursor disagrees with the request. |

Anyone can wire a chatbot to a JSON file. The point of the fidelity is that swapping `AWARDSPRING_BASE_URL` should be the only difference between this and production.

## Fixture data is synthetic

Every donor, gift, fund, scholarship and student in `fixtures/` is invented. No real donor information, scraped data, or customer records of any kind. Names and institutions are made up on purpose and are meant to look it.

---

## What it does

1. **Queue.** Donors who gave in the current award cycle with no logged acknowledgement. The count is the problem statement: forty unthanked donors is why form letters exist.
2. **Donor brief.** Giving history, and the students that donor's fund awarded this cycle, assembled from the API rather than typed by anyone. This is the part a template cannot do.
3. **Intake.** Three questions, not an interview, collecting only what the API cannot supply and a model should not guess: how well the staffer knows this donor, anything worth mentioning, tone.
4. **Draft.** The model writes the letter. **Every factual claim is labelled in the UI as either an API record or model output**, so a dollar figure pulled from a gift record and a sentence the model composed are visually distinct.
5. **The gate.** Edit, approve, or reject. Nothing leaves without an explicit approve. Rejecting asks why in one line and keeps the reason.
6. **Write-back.** On approve, log a `LoggedEmail` activity against the donor. Dry-run first, then commit with an idempotency key, which is the pattern their own docs recommend.

Steps 1 through 4 are setup. **Step 5 is the product.**

## Build status

- [ ] Mock server
- [ ] Typed client
- [ ] Queue
- [ ] Donor brief
- [ ] Intake
- [ ] Draft with source labelling
- [ ] Approval gate
- [ ] Write-back

## Not built, on purpose

Authentication, user accounts, roles, a database, real email sending, webhook receiving, and every scholarship or donor management feature that is not this one workflow.

---

## What is in this repo and why

Most of what is usually kept private is committed here on purpose.

- **[`SPEC.md`](SPEC.md)** — what to build and why, written before any code. Including the parts that were cut.
- **[`CLAUDE.md`](CLAUDE.md)** — the actual instructions given to Claude Code, unedited. Nearly all of this repo is AI-generated, and the interesting artifact is the constraints, not the output.
- **[`docs/awardspring-api-notes.md`](docs/awardspring-api-notes.md)** — working notes compiled from all 30 pages of their public documentation, including two places where their own docs contradict each other.
- **[`docs/openapi.json`](docs/openapi.json)** — their published OpenAPI 3.1 spec, vendored unmodified so the types and the mock have a single source of truth. Fetched 2026-09-02.
- **[`docs/DECISIONS.md`](docs/DECISIONS.md)** — running log of decisions and the reasoning, including the wrong turns.

Only secrets and build output are ignored. See [`.gitignore`](.gitignore).

## Running it

```
cp .env.example .env     # add a Gemini key (free tier is enough)
npm install
npm run dev              # mock server on :8787, app on :5173
```

The drafting and assistant calls run server-side so the key never reaches the browser.

## Stack

TypeScript end to end. Vite and React on the front, a small mock server behind it, Zod for schemas. Zod's strict parsing is deliberate: their API rejects unknown fields, so strict mode mirrors their behaviour instead of fighting it.

## A note on their docs

Worth saying plainly: AwardSpring's API documentation is unusually good. Roughly a third of the prose is *"here is where this will bite you"* rather than marketing, and most of the mock's behaviour table above comes from warnings they wrote themselves. They also ship an MCP server at `docs.awardspring.com/_mcp/server` for AI clients, and `llms.txt`, which is how this was built as fast as it was.

## License

MIT, covering the code in this repository. See [`LICENSE`](LICENSE).

One exception worth stating plainly: [`docs/openapi.json`](docs/openapi.json) is AwardSpring's
own published API specification, redistributed here unmodified for reference. It is theirs, not
mine, and the MIT grant above does not extend to it.
