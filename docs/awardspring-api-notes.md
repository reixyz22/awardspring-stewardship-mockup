# AwardSpring API notes

Working notes compiled from AwardSpring's public documentation at <https://docs.awardspring.com>, read in full on 2026-09-02. These are my notes and commentary, not their documentation. Where their exact wording matters it is quoted and marked. For anything authoritative, read their docs.

Not affiliated with or endorsed by AwardSpring.

---

**Coverage: all 30 documentation pages.** Every page read directly except `api-reference/donors/get`, whose 200 response is byte-identical to the `donors/update` 200 response captured in full below. Nothing here is inferred from a summary.

---

## 0. Three things that matter before anything else

**They ship an MCP server.** Every doc page footer: *"For AI client integration (Claude Code, Cursor, etc.), connect to the MCP server at `https://docs.awardspring.com/_mcp/server`."* Add it to Claude Code as an HTTP MCP server and the entire spec is queryable while building. Also `/llms.txt` for an index and `.md` on any page URL for clean markdown.

**No key is obtainable.** Auth page heading, verbatim: **"No sandbox yet."** *"Every key is a live key. There is no test mode and no sandbox host."* Keys are issued per customer institution. Fixtures are the only option from outside one. State this in the README as a fact about their API, not an apology.

**Their docs are unusually candid about their own sharp edges.** Roughly a third of the prose is "here is where this will bite you." That is a tell about the engineering culture, and matching that register in a README will read as native rather than as marketing.

---

## 1. Transport and auth

- Base URLs: `https://api.awardspring.com` (US, default), `https://api.awardspring.ca` (Canada). Separate deployments, separate data. A key for one region fails against the other.
- Auth header: `X-Spring-API-Key`, on every request.
- **No tenant/institution parameter exists on any endpoint.** The key determines the institution. Their words: *"if you find yourself wanting one, you have the wrong key."*
- Fields are `snake_case`. Every resource body leads with an `object` discriminator, Stripe-style.
- Keys carry read or write permission. A read-only key hitting a create returns **403**, not 401.
- Never ship a key client-side. There is no scoping mechanism that makes a browser-side key safe.

### Two auth quirks to code around, both flagged by them

1. **A `401` returns plain text, not the JSON error envelope.** A client assuming JSON on every non-2xx throws inside its own error path.
2. **An unrecognised key returns `400`, not `401`.** If branching on status alone, treat 400 and 401 together as "credential is wrong."

| Status | Meaning |
|---|---|
| 400 | Malformed, failed validation, **or unrecognised key** |
| 401 | Key missing/expired, or API access not enabled for the institution |
| 403 | Key valid, lacks permission for this endpoint |
| 404 | No such record *belonging to this institution* |
| 409 | Conflict, or an idempotent retry still in flight |
| 422 | Well-formed but unprocessable, including unrecognised fields |
| 429 | Rate limited |

## 2. Errors

JSON under an `error` key: `type`, `code`, `message`, `param`, `doc_url`, `recovery`, `details`.

- **Branch on `code`.** Stable, machine-readable. Never parse `message` — wording may change.
- `recovery` is plain-language guidance intended to be surfaced to a person. Worth using in UI rather than writing your own copy.
- `validation_failed` carries `details[]`, one entry per offending field (`field`, `message`). Show them against the fields they name rather than concatenating.
- **Unrecognised fields are rejected, not ignored.** A typo in a field name is a loud error instead of silently dropped data.

**Types:** `invalid_request_error`, `authentication_error`, `rate_limit_error`, `api_error`.

**Stable codes:** `validation_failed` (400), `invalid_cursor` (400), `unsupported_activity_type` (400), `unauthorized` (401), `invalid_credentials` (401), `invalid_refresh_token` (401), `donor_not_found` (404), `scholarship_not_found` (404), `award_cycle_not_found` (404), `fund_not_found` (404), `gift_not_found` (404), `activity_not_found` (404), `notification_not_found` (404), `institution_not_found` (404), `awarded_students_not_found` (404), `email_already_exists` (409), `idempotency_key_in_flight` (409), `idempotency_key_request_mismatch` (422), `rate_limit_exceeded` (429), `internal_error` (500).

## 3. Pagination

Envelope on every list: `object: "list"`, `url`, `has_more`, `next_cursor`, `previous_cursor`, `data[]`.

- `limit` defaults to 25, **clamped not rejected** into 1–100. `limit=5000` silently returns 100.
- `starting_after` / `ending_before` are mutually exclusive. If both are sent, `starting_after` wins.
- **Filters are pinned into the cursor.** Send `q`, `donor_id`, `type` and similar on the *first* request only; later pages carry them automatically.
- Cursors are signed, opaque, institution-bound. Never build, edit, truncate, or persist one. Tampered, expired, or mismatched → `400 invalid_cursor`. To resume later, re-run the first request.
- Results are ordered by id ascending on scholarships and award cycles; gifts are newest first.

### Documented contradiction — worth raising with them

The pagination page says filters are pinned into the cursor and that on scholarship reporting endpoints repeating `award_cycle_id` on a later page *"can conflict with what the cursor already asserts."*

The `scholarships/awarded-students` and `scholarships/available-dollars` endpoint descriptions say the opposite: *"Send award_cycle_id on every request, including when paging: it is recorded in the cursor and a request whose award_cycle_id does not match the cursor's is rejected."*

Read charitably these reconcile — send it, but send it *unchanged* — but as written they read as opposite instructions and a first-time integrator will guess wrong. This is a legitimate, specific doc-bug report.

## 4. Idempotency

`Idempotency-Key` header on any write. Printable ASCII, 1–255 chars, UUID ideal, fresh per logical operation.

| Situation | Result |
|---|---|
| Same key + same body, within 24h | Original response replayed, nothing created |
| Same key + different body | `422 idempotency_key_request_mismatch` |
| Same key while the first call is still running | `409 idempotency_key_in_flight` |
| Same key after 24h | Treated as a new request |

Only 2xx responses are cached. A 4xx/5xx leaves the key free to retry with a corrected payload.

**Their sharpest specific warning:** creating a donor *without an email* has no natural duplicate protection, because email uniqueness is what would otherwise catch it. A network timeout plus a naive retry produces two donor records that are hard to tell apart later. Treat the key as mandatory when `email` is omitted.

## 5. Dry runs

`dry_run=true` query param **or** `Dry-Run: true` header. Fully validates, persists nothing, fires no side effects.

- Not a schema check. Runs the same rules the real call runs, including data-dependent ones: referenced records exist and belong to your institution, uniqueness, allowed values, unrecognised field names.
- **On a create, the returned `id` is `0`.** Never store it, never treat it as a real record.
- A dry run does **not** consume an idempotency key. Safe pattern: dry-run → send for real with a key → retry on failure with the same key.
- Their framing: with no sandbox, this is the only way to exercise a real write path without changing anything.

**This is the design idea worth building toward without a key.** A client that dry-runs before it writes is validate-before-commit, which is structurally the same shape as a human approval gate.

## 6. Rate limits

Fixed window. `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on **every** response including successes. `Retry-After` **only** on a 429.

- Budget is scoped per credential, not per institution. Two keys for one institution have independent budgets. A bearer session is scoped per institution+user.
- Back off with exponential backoff **and jitter**, seeded from `Retry-After` rather than a constant.
- 429 is safe to retry — the request was never processed, so no partial write occurred. Combined with an idempotency key, a 429 that was actually delivered still cannot duplicate.
- Cheapest way to read a lot: bigger pages, not more requests. 1,000 records costs 10 requests at `limit=100`, 40 at the default 25.

## 7. Webhooks

Configured in the AwardSpring admin UI (**Settings → API → Webhooks**), **not** via the API. There is no `/webhooks` endpoint. Max 10 endpoints per institution. HTTPS only, plain HTTP rejected. Signing secret shown once on creation, prefixed `whsec_`.

**Envelope:** `id` (`evt_` prefixed — deduplicate on this), `type`, `occurred_at`, `tenant_id`, `api_version` (currently `v1` for every event), `data`. Test sends add `"is_test": true` and use an `evt_test_` id prefix. `data` is `snake_case` with raw integer ids, matching REST.

**Headers:** `X-AwardSpring-Signature`, `X-AwardSpring-Event`, `X-AwardSpring-Event-Id`, `X-AwardSpring-Delivery-Attempt`.

### Signature verification

Format: `t=<unix seconds>,v1=<lowercase hex HMAC-SHA256>`.

1. Take `t` from the header.
2. Build signed payload: `timestamp + "." + raw request body`.
3. HMAC-SHA256 with the `whsec_` secret.
4. Lowercase hex, compare constant-time against **any** `v1` value.

- **Sign the raw bytes received.** Parsing JSON and re-serializing changes whitespace and key order and will never match. Capture the body as a string before any framework deserializes it.
- **There can be multiple `v1` values** during a 24-hour rotation grace window. Their warning: a naive `dict()` of header parts keeps only the *last* `v1` and silently drops the other valid signature. Parse `v1` as a list.
- Check `t` against your clock (~5 min tolerance) to close the replay window. Retries are signed fresh with a current `t`, so tolerance need not cover the retry schedule.
- Rotation modes: **immediate** (old secret stops at once) or **24-hour grace** (both secrets sign every delivery).

### Delivery and retries

- **10-second budget including TLS handshake.** Respond 2xx fast, queue the work. Redirects are not followed. Response body is not interpreted, but the first 500 chars are kept in the delivery log — so your own error messages are the fastest diagnostic.
- 6 attempts at 1m / 5m / 30m / 2h / 6h. Roughly **8h36m** first attempt to last. An outage shorter than that self-heals with no data lost.
- After the sixth failure the event is **dead-lettered**, the endpoint's consecutive-failure count increases, and a notification email fires if configured. That email deliberately carries **no payload**, so it is safe to route to a shared inbox.
- **Replays keep the original `id` and `occurred_at` but rebuild `data` from current records.** A replay is "current truth about this event," not an archive. Limited to 20 replays/hour/institution.
- **At-least-once, never exactly-once. Ordering is not guaranteed.** Deduplicate on `id`, sort on `occurred_at`.
- **Bulk imports may emit no events at all** — high-volume paths that write directly to the database bypass event emission. Reconcile via REST after a large import.

### Six event types

| Event | Fires when |
|---|---|
| `application.submitted` | Student submits, or auto-submitted at deadline |
| `application.status_changed` | An application's **review** status changes |
| `award.created` | An application is awarded |
| `award.disbursed` | A disbursement is marked disbursed |
| `scholarship.created` | A scholarship is created |
| `scholarship.deadline_changed` | A scholarship's deadline moves |

- `application.submitted` is the **only** event carrying applicant contact details inline (`applicant.user_id`, `first_name`, `last_name`, `email`, `student_id`, `external_id`), plus `is_auto_submit`.
- `application.status_changed` is the **review workflow** status, *not* the award decision. Their explicit warning: subscribing to this expecting award outcomes will miss them. Fields: `old_status`, `new_status`, both nullable, values are institution-configured labels — match defensively.
- `award.created`: `award_id` (string, nullable), `amount` nullable when not yet set.
- `award.disbursed`: fires **per disbursement**. `amount` is that disbursement's, not the award total. Carries `disbursement_id` and `disbursement_order` (1-based).
- `scholarship.created`: expect nulls — scholarships are often created before amounts and dates are filled in. Read current state from REST when you need it complete.
- **Naming inconsistency they keep deliberately:** scholarships are `scholarship_id` on scholarship events and `opportunity_id` on application/award events. Same identifier; both names retained because renaming either would break existing integrations.
- New fields can be added to any `data` object without an `api_version` bump. Parse permissively. Removing a field or changing its meaning would come with a new `api_version`.

## 8. Domain model — full verified field lists

### Award cycle
`GET /api/v1/award-cycles` (list, `q` filter) and `GET /api/v1/award-cycles/current`.

`id`, `name`, `is_current`, `is_next`, `application_start_date`, `application_end_date`, `review_start_date`, `review_end_date`. All dates UTC epoch seconds, nullable.

`current` prefers the cycle marked current, falls back to the one marked next, else `404 award_cycle_not_found` — in which case list all cycles and ask the user which to use.

### Donor
- `GET /api/v1/donors` — `q` splits on spaces and matches each term against first name, last name, email, or organization, so `jane smith` finds donors matching both terms. List item fields: `id`, `first_name`, `last_name`, `email`, `organization`, `phone`, `role` (`Individual` | `Organization`).
- `GET /api/v1/donors/{id}` — returns the full donor object (same shape as the update response below).
- `POST /api/v1/donors` — creates individual or organization depending on `role` (defaults `Individual`; determines which name fields are required). Optional email, max 250 chars, must be unique within the institution. Accepts a large optional profile: `address1/2`, `city`, `state`, `county`, `zip_code`, `country` (integer), `job_title`, `work_email`, `work_phone`, `company_name`, `public_first_name`, `public_last_name`, `public_organization_name`, `website`, `facebook_url`, `twitter_url`, `linked_in_url`, `description`, `notes`, `make_profile_private`, `include_soft_credits`. Supports dry runs and idempotency.
- `PUT /api/v1/donors/{id}` — **partial update. Only fields present in the body change; anything omitted is left alone.** Supports dry runs.
- `PUT /api/v1/donors/{id}/notes` — **replaces** the free-text notes wholesale. Returns just `{object, id, notes}`.

Full donor response adds, beyond the list fields: `date_of_birth`, `birth_month`, `birth_day`, `birth_year`, the address block, work block, `organization_name`, `photo_url`, `description`, `notes`, `make_profile_private`, `include_soft_credits`.

### Donor activity
- `GET /api/v1/donors/{donorId}/activities` — a **merged timeline**, not just logged entries. `source` ∈ `Logged`, `Email`, `Sms`, `Award`, `GeneralApplication`. **`id` is source-local — unique only within a source, not across the timeline.** Filters: `q` (substring on subject/description), `activity_type`.
- `GET /api/v1/donors/{donorId}/activities/{activityId}` — **only `Logged` activities are individually addressable.** The other four sources are read-only derived views. Optional `source` query param.
- `POST /api/v1/donors/{donorId}/activities` — types: `LoggedEmail`, `LoggedPhone`, `LoggedMeeting`, `LoggedNote`, `LoggedPledge`. **Gifts are not creatable here** — they go through the Gifts endpoints. Required: `activity_type`, `activity_date` (ISO 8601, full date required, time optional, interpreted in the tenant's timezone and persisted UTC), `subject` (non-whitespace). Optional: `description`, `amount` (required and >0 for `LoggedPledge`, ignored otherwise), `fund_id` (validated against real funds when Funds Management is on, free-form label when off), `campaign_id`, `assigned_to_user_id`, `is_completed` (meaningful only for pledges). Supports dry runs and idempotency.

Timeline item fields: `id`, `source`, `activity_type`, `subject`, `description` (populated only for logged activities and SMS), `date` (UTC epoch seconds), `amount`, `fund_id`, `is_completed`, `gift_acknowledgement_sent`, `gift_type`, `campaign_id`, `assigned_to_user_id`, `sender_name` (system emails only).

### Gift
- `GET /api/v1/gifts` — newest first. Filters: `donor_id`, `type` (`gift` | `pledge`), `q`. Without filters, covers the whole institution.
- `POST /api/v1/gifts` — required: `donor_id`, `amount` (>0, except zero is allowed when `gift_type` is `InKind`), `subject`, `gift_date`. Optional: `type` (defaults `gift`), `gift_type` ∈ `Cash`, `Check`, `CreditOrDebit`, `BankTransfer`, `StockOrProperty`, `InKind`, `PayrollDeduction`, `Online`, `Other` (ignored for pledges), `description`, `fund_id`, `campaign_id`, `is_completed` (pledges only), `assigned_to_user_id`, `soft_credits` (**up to three**, honoured on gifts only, ignored for pledges).

Fields: `id`, `donor_id`, `type`, `gift_type`, `amount`, `subject`, `description`, `fund_id`, `campaign_id`, `is_completed`, `gift_acknowledgement_sent`, `date`, `soft_credits[]` (`name`, `user_id`).

### Fund
`GET /api/v1/funds` — `q` on fund name. Fields: `id`, `fund_id` (string identifier/name), `remaining_balance`, `fund_type`, `is_endowed`.

### Scholarship
- `GET /api/v1/scholarships` — `q` on name, ordered by id ascending. Fields: `id`, `name`, `total_amount`, `is_active`, `award_cycle_id`, `application_start_date`, `application_end_date` (epoch seconds).
- `POST /api/v1/scholarships` — required: `scholarship_name`, `scholarship_description`, `award_cycle_id`, `application_start_date`, `application_end_date` (must be after start and **within the parent award cycle's range**; normalised to end of day), `disbursement_date`. Optional: `fund_id` (**creates a new fund row automatically if it doesn't match an existing one** when Funds Management is on), `is_special_funds`, `first_disbursement_term_name` (max 50), `total_awards_number` (1–999,999), `total_scholarship_value`, `payments_per_award`, `department_id`, `donor_ids[]`, `is_deactivate_scholarship`, `is_institutional_award_scholarship`, `internal_notes`. **`is_special_funds` and `is_institutional_award_scholarship` cannot both be true** — rejected with `validation_failed`. Returns only `{scholarship_id}`. Their note: this endpoint enforces exactly the same rules as the admin UI, so anything rejected here would also be rejected there.
- `GET /api/v1/scholarships/available-dollars?award_cycle_id=` — every active scholarship in a cycle: `id`, `name`, `total_funds`, `total_awarded_amount`, `total_amount_remaining`.
- `GET /api/v1/scholarships/{scholarshipId}/available-dollars?award_cycle_id=` — same shape, single scholarship.
- `GET /api/v1/scholarships/awarded-students?award_cycle_id=` (required; optional `scholarship_id`) — one row per applicant-award: `id` (the underlying OpportunityApplication id), `scholarship_id`, `scholarship_name`, `fund_id`, `student_id`, `first_name`, `last_name`, `email`, `awarded_date`, `awarded_amount`. **This is the endpoint that answers "which students did this fund reach."**

### Date format inconsistency worth normalising at the client boundary
REST returns **epoch seconds**. Webhooks return **ISO-8601 strings**. Request bodies accept ISO-8601. Three formats in one product.

## 9. SDK gap

Official clients: **.NET** (`AwardSpring.Net`, client class `AwardspringApiClient`) and **PHP** (`awardspring/awardspring-php`, client class `AwardspringClient`). Both MIT, both generated from the same description as the docs, both **pre-1.0** with an explicit "pin a version" warning.

**No Python client. No JavaScript/TypeScript client.** Per-endpoint examples show raw `requests` / `fetch` for those languages.

They also ask that SDK bugs go through support rather than pull requests, because a fix applied directly to a generated repo is overwritten on the next regeneration. An independent Python or TS client therefore isn't stepping on their toes — it's the thing their own process structurally cannot accept as a contribution.
