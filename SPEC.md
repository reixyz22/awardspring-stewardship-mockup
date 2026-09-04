# Donor Stewardship Mock-up — build spec

*This is the deep-dive design doc, written before any code. Most readers
should start at [`README.md`](README.md) instead — this file is here for
anyone who wants the full "what and why," not as the first thing to read.
For the reasoning behind specific decisions, see [`docs/adr/`](docs/adr/README.md).*

For a Claude Code session. **Architecture and behaviour only. No implementation, no code, no file contents.** The build session decides how; this decides what and why.

Companion file: `awardspring-api-notes.md` — all 30 pages of their API docs, compiled. Read it first.

---

## What this is

A single-purpose web app for one job: a scholarship foundation staffer thanking donors at the end of an award cycle, with an AI drafting the letters and a human approving every one before it leaves.

It is built against AwardSpring's published v1 API spec. It is not connected to their production system and cannot be — see Constraint 1.

**One sentence for the README:** it turns a form letter into a specific one, and nothing reaches a donor that a person didn't read.

## Why it exists (context for design decisions, not marketing)

AwardSpring's own published research: 53% of the scholarship foundations they surveyed named staff time as the single biggest barrier to donor stewardship. Not strategy. Hours. The consequence is that major donors get a real relationship and everyone else gets a receipt.

The product they are launching this month, Donor Experience, is aimed at that gap. Their September 22 executive forum is titled "AI Under Human Review — AI that drafts, briefs, and prepares, and people who decide what actually gets sent."

This app is that thesis at small scale. Design decisions below should be read against it: **the drafting is the easy part and the approval gate is the product.**

---

## Hard constraints

**1. No API key exists or can be obtained.** Their auth docs, verbatim heading: "No sandbox yet." Every key is live and issued per customer institution. There is no test mode, no dev tier, no signup.

Therefore the app talks to a **local mock server** that implements their documented contract. The mock is a first-class part of the project, not a stub. The README states this plainly as a fact about their API, without apology and without implying live access.

**2. Swapability is a design requirement.** Changing one base URL should be the only difference between talking to the mock and talking to production. Nothing about the client may assume it is talking to a fake.

**3. Honesty is the product.** This app is about a model not overstating what it knows. The README and the UI must not overstate what the app knows either. If a fact is invented for a fixture, it is labelled as a fixture. If a call is mocked, it says so.

**4. One weekend.** Push back on scope. The stretch list at the bottom is the stretch list.

**5. Clean room.** No code, structure, or naming from any prior project. Everything derives from AwardSpring's public docs.

---

## Architecture — three parts

### A. Mock API server

Implements AwardSpring's documented contract for the endpoints the app uses. **Its job is fidelity, not convenience.**

It must reproduce their documented behaviour rather than approximating it. Specifically, all of these are documented and all are load-bearing:

- The list envelope: `object: "list"`, `has_more`, `next_cursor`, `previous_cursor`, `data`
- `limit` **clamped** into 1–100 rather than rejected — `limit=5000` returns 100 silently
- Opaque signed cursors with filters pinned into them; a cursor that disagrees with the request returns `400 invalid_cursor`
- Unrecognised request fields **rejected**, not ignored
- The JSON error envelope with a stable `code`, plus `details[]` on `validation_failed`
- **The two auth quirks:** `401` returns *plain text* rather than the envelope, and an unrecognised key returns `400` rather than `401`
- `dry_run=true` (query param or `Dry-Run: true` header) validating fully and persisting nothing, returning `id: 0` on creates
- `Idempotency-Key` semantics: replay on same key + same body within 24h, `422` on same key + different body, `409` while in flight
- Rate-limit headers on **every** response, `Retry-After` only on 429
- Dates as **epoch seconds** in responses

Reproducing the quirks is the point. It is the difference between having read the docs and having skimmed the endpoint list, and it is visible to anyone at AwardSpring reading the repo.

**Endpoints needed:** award cycles (list, current), donors (list, get), donor activities (list, create), gifts (list), funds (list), scholarships (awarded-students, available-dollars). Creates are needed only for donor activities.

### B. Typed API client

A thin client over the mock, written so it would work unchanged against production.

Design requirements:
- Schemas defined once and used for both runtime validation and static types. Their API rejects unknown fields, so strict-mode parsing mirrors their behaviour rather than fighting it.
- Cursor pagination handled internally — callers ask for a donor's gifts, not for page two.
- Errors surfaced by their stable `code`, never by parsing `message`.
- The `401`-is-plain-text case handled explicitly. A client that assumes JSON on every error path throws inside its own error handler, which their docs warn about directly.
- Every write goes through **dry-run first, then commit**. This is not defensive padding; their docs describe it as the only safe way to exercise a write path when no sandbox exists. It is also the same shape as the approval gate, which is the point of the whole app.

### C. Web app

Front end only, no auth, no database. State lives in memory and in the mock.

---

## Features

Listed in build order. Each one should work before the next begins.

### 1. The queue

Landing view. Donors who gave in the current award cycle and have no logged acknowledgement yet, as a worklist with a count.

The count matters — it is the problem statement rendered as a number. Forty unthanked donors is why a template exists.

### 2. The donor brief

Selecting a donor shows what the system already knows, assembled from the API rather than typed by anyone:

- Giving history — total, span of years, the fund or funds
- **The students that fund awarded this cycle**: names, amounts, which scholarship
- Any prior contact from the activity timeline

The second item is the whole reason this beats a form letter, and it is the reason `scholarships/awarded-students` is in scope. A template cannot say which four students this donor's money reached. This can.

*(Corrected 2026-09-03: this originally said "what they study" -
`AwardedStudentV1` has no major/course-of-study field. Caught while building
the donor brief - see `server/awardspring/store.ts`'s `toAwardedStudent`.)*

### 3. Conversational intake

A short exchange — three questions, not an interview — collecting only what the API cannot supply and a model should not guess:

- How well does the staffer know this donor
- Anything specific worth mentioning
- Tone

Conversation history is kept for the session. The constraint that makes this good rather than annoying: **if the API already knows something, the app does not ask.**

### 4. The draft

The model writes the thank-you from the brief plus the intake answers.

**Every factual claim is attributed in the UI as either an API record or model output.** A dollar amount pulled from a gift record and a sentence the model composed are visually distinct.

This is the feature that makes the philosophy legible instead of stated. It is also directly answerable to their own "human checkpoints, guardrails, and audit trails" language.

### 5. The gate

The draft does not send. It sits in an editor with three actions: **edit, approve, reject.**

- Nothing leaves without an explicit approve
- Rejecting asks why, in one line, and that reason is retained
- The approve action is the only path to a write

This is the product. Everything above it is setup.

### 6. Write-back

On approve, log a `LoggedEmail` activity against the donor via the API — dry-run first, then commit with an idempotency key.

Two reasons this closes the loop properly. It means the next person to open that donor's record sees they were thanked and when. And it demonstrates the write path with the two safety mechanisms their docs actually recommend, rather than firing a naive POST.

Then return to the queue, count decremented.

---

## Fixtures

Enough donors to make the queue feel real. Realistic distribution: a few large multi-year donors, a long tail of small ones — the shape their research describes.

Fixture data must be obviously synthetic. Invented names, invented institutions, no scraped or real donor information of any kind. The README says so.

---

## What is explicitly out of scope

- Authentication, user accounts, roles
- A database
- Actually sending email
- Webhook receiving (documented in the notes, not needed here)
- Any endpoint not listed under A
- Every scholarship or donor management feature that is not this one workflow

## Design question — should the Reports screen reuse the Donors screen's data?

Decided in [ADR-0006](docs/adr/0006-reports-screen-independent-fetch.md): each
screen fetches independently, for now. That record also links the open
question about whether this holds once realistic network latency is
simulated — see `experiments/`.

## Stretch, only if the gate lands early

- Generate the impact report as a PDF attachment
- Batch mode: draft for the whole queue, approve one at a time
- A settings toggle for what may be auto-approved and what always waits, since that is the actual policy question underneath the whole app

---

## README requirements

The README is part of the deliverable, not an afterthought. It must state:

1. What the app does, in two sentences.
2. That the API is mocked, why (no sandbox, keys are per-institution), and that the client is written to work unchanged against production.
3. Which documented behaviours the mock reproduces, listed.
4. That fixture data is synthetic.
5. What is not built.

No metrics that were not measured. No claimed users. No implication of a relationship with AwardSpring that does not exist.

---

## Note for the build session

Their documentation ships an MCP server at `https://docs.awardspring.com/_mcp/server`, advertised on every page for Claude Code and Cursor. Connect to it before starting — the spec becomes queryable during the build rather than something to paste in. `.md` on any doc URL returns clean markdown, and `/llms.txt` is the index.

Their pagination page and their scholarship reporting endpoints give apparently
opposite instructions about resending `award_cycle_id` while paging. Resolved
in [ADR-0004](docs/adr/0004-pagination-filter-resend.md).
