# Architecture Decision Records

One file per real decision, numbered, never edited after acceptance. If a
decision is later reversed, a new ADR is written that supersedes the old one
— the old one stays exactly as it is, so the reasoning that led to a rejected
approach is never lost to a code change or a rewritten doc.

Format (Nygard, 2011 — the standard lightweight ADR template): Context,
Decision, Consequences, each dated, each with a Status.

**Status** describes the record's own lifecycle (`Accepted` / `Superseded by
ADR-000X`) — it is not a verdict on whether the decision was to do something
or not to do something. ADR-0005 records a decision to *reject* an idea, and
its Status is still `Accepted`, because the record itself was accepted as
final.

## Index

| ADR | Title |
|---|---|
| [0001](0001-mock-the-api-instead-of-skipping-it.md) | Mock the AwardSpring API instead of skipping it |
| [0002](0002-approval-gate-is-the-product.md) | The approval gate is the product, not a feature |
| [0003](0003-typescript-end-to-end.md) | TypeScript end to end, not their stack |
| [0004](0004-pagination-filter-resend.md) | Resolving their pagination/endpoint contradiction |
| [0005](0005-reject-resume-screener-instructions.md) | Rejected: instructing automated resume screeners |
| [0006](0006-reports-screen-independent-fetch.md) | Reports screen fetches its own data, for now |
| [0007](0007-queue-cycle-window.md) | What counts as "gave during the current award cycle" |
