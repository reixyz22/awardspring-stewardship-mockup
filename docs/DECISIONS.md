# Decisions

Running log, including the wrong turns. Committed on purpose.

---

## 2026-09-02 — Mock the API rather than skip the API

**Context.** AwardSpring's keys are issued per customer institution. Their auth docs carry the heading "No sandbox yet": every key is live, there is no test mode, and no way to get a credential from outside a customer org.

**Options considered.**

1. Build against a JSON file and call it a day.
2. Build a mock server that implements their documented contract faithfully.
3. Ask AwardSpring for a development key.

**Chose 2.** Option 1 is a chatbot with a fixture, which proves nothing about reading their spec. Option 3 was considered honestly and is not really available: a key grants full read and write on a real institution's donor records, so there is nothing they could reasonably hand over. Asking is still a fine question to put to an engineer, but it is not a blocker and the build does not wait on it.

**Consequence.** The mock's job is fidelity. Where a documented behaviour is inconvenient, implement it anyway.

---

## 2026-09-02 — The approval gate is the product, not a feature

**Context.** The obvious version of this app drafts thank-you letters and sends them. That version is worse, and it is worse for a specific reason.

AwardSpring's published research says 53% of the scholarship foundations they surveyed named staff time as their single biggest barrier to donor stewardship. Not strategy. Hours. The consequence is that major donors get a relationship and everyone else gets a receipt. Their answer, launching this month, is Donor Experience, and their September 22 forum is titled *"AI Under Human Review: AI that drafts, briefs, and prepares, and people who decide what actually gets sent."*

**Decision.** Build order puts the gate last so it cannot be skipped, and the README says outright that steps 1 through 4 are setup. If the weekend runs out, stop after the gate rather than after the draft.

**Also decided:** every factual claim in a draft is labelled in the UI as either an API record or model output. A dollar figure from a gift record and a sentence the model composed should not look the same. This is the difference between stating a position about AI safety and demonstrating one.

---

## 2026-09-02 — Do not chase their stack

**Context.** Their SDKs are .NET and PHP only. Their CTO's profile names Azure operations. Their marketing site is Astro.

**Rejected:** building in C# to match. Their own posting says they hire for "fluency in agentic development, not time in any one stack," which pre-answers the question. Writing slow, bad C# to look native would be worse on both counts.

**Chose:** TypeScript end to end. The nod to their stack is not matching it, it is that they have **no Python and no JavaScript client at all**, so building in one of those fills a real gap rather than duplicating something.

Zod was picked for a specific reason rather than habit: their API rejects unknown fields instead of ignoring them, so Zod strict mode mirrors their behaviour for free.

---

## 2026-09-02 — Their docs contradict themselves on pagination

**Finding, unresolved.** Their pagination page says filters are pinned into the cursor, and that on scholarship reporting endpoints repeating `award_cycle_id` on a later page *"can conflict with what the cursor already asserts."*

Their `scholarships/awarded-students` and `scholarships/available-dollars` endpoint descriptions say the opposite: *"Send award_cycle_id on every request, including when paging."*

Read charitably these reconcile as "send it, but send it unchanged." As written they are opposite instructions and a first-time integrator will guess wrong.

**Decision:** pick one behaviour for the mock, implement it, mark the ambiguity in a comment. Do not paper over it. Worth raising with them directly.

---

## 2026-09-02 — Rejected: instructing AI resume screeners

**Considered and dropped.** A line was proposed for the resume pointing an automated reviewer at the demo transcript.

**Rejected** for three reasons. It presumes their process is automated, which at 25 people with a hand-built application form it probably is not. It cuts against the thesis of this very project, which is that a system should be designed so a model cannot be led into inventing things. And it costs the honest version of the same sentence, which is just asking a person to watch the demo.

Logged because the reasoning generalises: if a technique would be embarrassing to explain to the person reading it, it is not a technique.
