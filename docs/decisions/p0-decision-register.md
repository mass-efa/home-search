# P0 Decision Register

Status values: `accepted`, `proposed`, `pending`, `deferred`, `superseded`.

| ID | Decision | Recommendation | Status | Needed by |
| --- | --- | --- | --- | --- |
| P0-01 | Alpha product shape | One private, source-backed Decision Pack for one live listing; depth adapts through conditional modules | Accepted | P0 exit |
| P0-02 | Separate Quick Scan product | Do not create a separate alpha product; learn whether a fast preview is valuable from usage | Proposed | P0 exit |
| P0-03 | Buyer memory | Defer persistent Buyer Search Brief and tour learning until the one-listing loop is working | Proposed | Day 10 |
| P0-04 | Delivery approval | Deliver automatically only when every critical deterministic and evidence gate passes; otherwise hold as `needs_review`, `insufficient_evidence`, or `failed` | Accepted | Before approval-engine implementation |
| P0-05 | Turnaround promise | Publish no fixed SLA until two complete internal runs establish reviewer and research time | Proposed | Before invitations |
| P0-06 | Redfin access | Accept Redfin URLs but do not promise automated scraping; use concierge collection and permitted sources initially | Proposed | Before live source work |
| P0-07 | Upload types | Accept PDFs and common images for inspection, disclosure, title, permit, HOA, environmental, and relevant tour materials | Proposed | Before upload implementation |
| P0-08 | Upload limits and retention | Start with 10 files/request, 25 MB/file; delete on user request and define a short alpha retention window before invitations | Pending | Before user uploads |
| P0-09 | Financial and offer modules | Conditional on adequate buyer inputs, current evidence, deterministic reconciliation, and all applicable automated gates passing | Accepted | P0 exit |
| P0-10 | Sensitive sharing | Exclude financing, affordability, target, ceiling, identity, uploads, and private notes unless separately selected | Proposed | Before sharing implementation |
| P0-11 | Share expiry | Seven days by default, extendable and immediately revocable | Proposed | Before sharing implementation |
| P0-12 | Geography | Promise alpha quality only for Seattle/King County; other locations are experimental | Proposed | Before invitations |
| P0-13 | Barrett source of truth | Neither memo nor workbook is canonical; reconcile into one versioned synthetic fixture | Proposed | Fixture creation |
| P0-14 | Barrett comp population | Select the fixture population based on source quality and declared inclusion rules, not the preferred valuation result | Pending | Fixture creation |
| P0-15 | Public example | Sanitized derivative only, following separate privacy and rights review | Proposed | Before public landing page |
| P0-16 | Hosting | Next.js on Vercel with Supabase Auth/Postgres/Storage | Proposed | Day 1 implementation |
| P0-17 | Background execution | Hide runtime behind `AnalysisRunner`; select simplest reliable runtime during scaffold | Proposed | Day 3 |
| P0-18 | Existing Supabase project | Inspect deployed state before migrating or replacing; do not infer from checked-in schema | Pending | Before environment setup |
| P0-19 | Payment test | Users 1–2 free; test a paid offer with users 3–5 only after quality is stable | Proposed | Before users 3–5 |
| P0-20 | Product naming | Treat current names as working language and test comprehension | Deferred | After first user feedback |
| P0-21 | Approval mechanism | Code-owned policy and validators decide eligibility; an independent model evaluator may add evidence but may not approve a pack by itself | Accepted | Day 1 |
| P0-22 | Failure posture | Critical gates are all-or-nothing and fail closed; confidence scores cannot override a failed gate | Accepted | Day 1 |
| P0-23 | Human role | Human work is limited to exceptions, incident response, policy changes, and post-delivery quality sampling rather than routine approval | Accepted | Before invitations |
| P0-24 | Initial coverage | Automated approval is supported only for the bounded Seattle/King County source and property coverage declared by the alpha | Accepted | Before invitations |
| P0-25 | Quality monitoring | Audit an initial sample after delivery, track corrections and gate escapes, and retain a global automatic-delivery kill switch | Accepted | Before invitations |

## Accepted Direction From Prior Alignment

- The front door is a live listing and buyer questions.
- The core product is a private, source-backed Decision Pack.
- Uploaded property documents and independent research belong in the analysis.
- The Barrett package is the initial depth benchmark.
- The alpha should ship quickly through parallel AI-agent work.
- GitHub is an engineering system, not customer intake.
- Private-by-default and evidence limits are non-negotiable.
- Automated approval is the default from launch, with fail-closed critical gates
  and an exception queue.

## Change Rule

Changes to the customer promise, one-listing wedge, automated-approval policy,
privacy posture, source standard, or ten-day alpha exit criteria require
Michael's explicit alignment. Mechanical implementation decisions remain
delegated when they preserve those boundaries and have a clear rollback.
