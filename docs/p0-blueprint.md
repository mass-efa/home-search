# P0 Alpha Blueprint

Status: Integration draft
Updated: 2026-07-29

## Implementation Status

| Workstream | Status | Current outcome |
| --- | --- | --- |
| Product | Complete for first slice | Buyer-visible approval, exception, withdrawal, and intake contract is frozen |
| Approval policy | Complete and tested | Immutable four-outcome policy engine; no human or model override |
| Deterministic validation | Complete for core candidate | Twelve default critical gates implemented and covered by unit tests |
| Golden evaluation | Complete for P0 | One releasable and 16 adversarial cases pass their expected outcomes |
| Buyer UI | Integrated locally | Investigation question, decision stage, depth, and fail-closed result states are wired |
| Supabase persistence | Implemented, not migrated | Candidate, validators, evaluator result, and approval manifest schema is ready |
| Independent evaluator | Implemented, not deployed | Separate structured evaluator is bound to the candidate hash |
| Live source adapters | First adapter complete | Authoritative King County address-to-parcel identity is connected and tested; broader property, permit, document, and comp coverage remains |
| Automatic live delivery | Intentionally disabled | Kill switch remains off and property identity fails closed until source adapters pass |

The next release-critical work is deploying the property-identity/evidence
slice, then expanding permitted property, permit, document, and comparable-sale
coverage before a Deep Decision Pack can be automatically released.

## Alpha Goal

Within ten working days, enable five invited Seattle/King County buyers to:

1. Sign in privately.
2. Submit one live listing, buyer questions, and optional property documents.
3. Receive a source-aware Decision Pack generated from a canonical analysis
   record.
4. Receive it automatically only when every critical evidence, calculation,
   consistency, privacy, and scope gate passes.
5. View it privately and optionally share an intentionally limited, revocable
   result.

The alpha validates decision utility, trust, and a bounded automated-delivery
system. It does not validate a broad property search engine, unrestricted
automated research, or the complete Buyer Workspace.

## Canonical Contracts

| Contract | Authority |
| --- | --- |
| [Alpha product contract](product/alpha-product-contract.md) | Customer, journey, scope, metrics, pricing hypotheses |
| [Decision Pack contract](product/decision-pack-contract.md) | Evidence, claims, comps, calculations, layers, review gates |
| [Alpha architecture](architecture/alpha-architecture.md) | System boundaries, data, security, state, delivery |
| [Repository inventory](operations/repository-inventory.md) | Existing-file classification and safe migration |
| [P0 decision register](decisions/p0-decision-register.md) | Accepted, proposed, pending, and deferred choices |
| [Product reset plan](product-reset-plan.md) | Program direction and later roadmap |

If the older MVP, service, workflow, or backend docs conflict with these P0
contracts, the P0 contracts control the alpha after approval.

## Integrated Product Contract

### Customer

A serious, self-directed buyer with a live Seattle/King County property decision
within hours or days who wants deeper, more independent diligence than a listing
portal or informal agent conversation provides.

### Job

Turn a listing, buyer questions, property documents, and current evidence into a
defensible next decision, so the buyer can use attention wisely, reduce
preventable surprises, and discuss the property productively with a partner and
professional advisors.

### Promise

> Paste a listing and tell us what matters. Receive a private, source-backed
> Decision Pack explaining what fits, what could hurt, what remains unknown, and
> what to verify next.

### Alpha Product

P0 recommends one Decision Pack rather than separate Quick Scan and Deep products
during the first five users. Every pack has the same evidence and privacy
standard. Its depth adapts to decision stage, available evidence, buyer inputs,
and evidence-qualified conditional modules.

Required core:

- Decision read, confidence, reasons, risks, change conditions, and actions.
- Direct status for every buyer question.
- Buyer-specific fit and likely disappointment.
- Property, listing-history, value, location, condition, and records coverage.
- Subject and eligible comps with visible price per finished square foot.
- Facts, inferences, judgments, assumptions, conflicts, and unknowns.
- Claim-linked sources, checked dates, and evidence limits.
- Diligence and professional-verification actions.
- Automated, fail-closed delivery approval with an auditable gate result.

Conditional:

- Adjusted comp model and numeric valuation range.
- Offer ladder, target, compromise, stretch, or stopping rule.
- Ownership economics and affordability.
- Renovation and capital plan.
- Cost of waiting.
- Scarcity and replacement analysis.
- Page-level document maps.
- Spreadsheet export.

## Canonical Analysis Rule

One versioned approved analysis record generates:

1. The one-page decision view.
2. The detailed interactive brief.
3. Calculation and audit views.
4. Any PDF or spreadsheet export.

No rendered layer may introduce a separately copied fact, calculation, or
recommendation. Delivery is blocked when same-named values differ, claims lack
the required evidence, calculations fail, buyer questions are omitted, or
private fields leak into a share view.

The architecture's canonical outcomes are `auto_approved`, `needs_review`,
`insufficient_evidence`, and `failed`. Product UI may display these as `ready`,
`quality exception`, `insufficient evidence`, and `failed`; the Decision Pack
pipeline's internal `released` state is permitted only for `auto_approved`
versions. These are presentation and pipeline mappings, not additional approval
paths.

## Barrett Fixture Rule

The private Barrett artifacts remain unchanged. A new synthetic derivative will
exercise the same analytical tensions while replacing property identifiers,
buyer finances, negotiation limits, personal preferences, source documents, and
URLs.

The fixture must explicitly resolve:

- Six-comp memo versus eight-comp workbook populations.
- Approximately $2.216M memo indication versus $2.21085M workbook indication.
- Approximately $95–$111/month ownership differences at several price points.
- Fixed aggregate low/base/high offsets versus actual scenario recalculation.
- Judgment-based scarcity counts.
- Appendix-level sources versus claim-level evidence.

Selection must follow source quality and declared inclusion rules, not whichever
population produces the preferred price.

## Technical Contract

- Next.js App Router and TypeScript.
- Supabase Auth, Postgres, and private Storage.
- Vercel preview and production hosting.
- Server-side OpenAI structured drafting.
- Deterministic application code for quantitative outputs.
- Separate request, analysis-run, validation, exception, and approved-result
  records.
- Row-level security and cross-user isolation tests.
- Immutable drafts, validation results, approvals, and delivery versions.
- Private-by-default, expiring/revocable share tokens.
- An `AnalysisRunner` boundary so the first job runtime can change without
  changing domain logic.
- No guaranteed Redfin scraping dependency.

## Ten-Day Execution Map

### Day 1: Freeze Interfaces

- Resolve P0 decision register items required for implementation.
- Freeze intake, Decision Pack, evidence, state, and role schemas.
- Identify the golden request/result fixture boundary.
- Scaffold branch and integration ownership.

### Days 2–3: Foundation In Parallel

- Web: Next.js routes and fixture-driven buyer experience.
- Data: normalized migrations, RLS, roles, storage, share model.
- Evaluation: sanitized fixture and validators.
- Platform: CI, isolated preview, feature flags, observability baseline.

### Days 4–6: Working Vertical Slice

- Private listing-and-question intake.
- Model-stub draft pipeline.
- Source and upload fixtures.
- Automated validation pipeline and exception queue.
- One-page and detailed Decision Pack rendering from one record.

### Days 7–8: Real Integration

- Server-side model behind a kill switch.
- Safe uploads and page-addressable extraction.
- Claim/source linkage and deterministic calculations.
- Private sharing and audit events.
- Failure, revision, and retry paths.

### Day 9: Quality Gate

- Cross-user RLS and storage tests.
- Prompt-injection and malformed-output tests.
- Reconciliation and calculation suite.
- Desktop, mobile, and accessibility tests.
- Privacy and share-view inspection.

### Day 10: Alpha Rehearsal

- Run real internal listings through auto-approved, insufficient-evidence, and
  held-for-review paths.
- Record research time, automated gate outcomes, exception causes, and
  post-delivery audit time by module.
- Exercise kill switch, failure recovery, share revocation, and rollback.
- Make go/no-go decision for the first invited buyer.

## Agent Ownership

| Agent | Owns | Does not decide alone |
| --- | --- | --- |
| Buyer Decision PM | Customer, scope, journey, metrics, user testing | Trust standard or public/private posture |
| Staff Product Engineer | Architecture, interfaces, integration, release | Customer promise or destructive migration |
| Evaluation & Evidence Lead | Rubric, fixture, claims, comps, calculations, approval policy | Unsupported source access or unilateral weakening of critical gates |
| Product Designer / Frontend | Intake, status, Decision Pack comprehension | Evidence meaning or hidden calculations |
| Platform & Data Engineer | Data, RLS, jobs, uploads, audit, observability | Retention policy or production migration |
| Trust & Exceptions | Held cases, incident response, post-delivery sampling | Routine auto-approved delivery or product scope |
| Michael | Product alignment, approval-policy changes, irreversible actions | Routine reversible implementation or per-pack approval |

Agents work in parallel against frozen interfaces, own separate files, and
integrate through the Staff Product Engineer. A downstream agent uses fixtures
rather than waiting for the complete upstream system.

## Alpha Success Gate

Trust:

- Five of five results remain private except for explicit shares.
- Five of five have immutable automated gate and delivery audit records.
- Every critical-gate failure is held; no failed result is delivered as
  complete.
- Initial deliveries receive post-delivery quality sampling without blocking
  delivery.
- Zero unsupported high-stakes certainty.
- Zero cross-user exposure.
- Zero unexplained cross-layer drift.

Utility:

- At least three of five buyers say the pack changed or materially clarified
  their decision.
- At least four of five can explain the recommendation, top risk, biggest
  unknown, and next action.
- At least three of five identify a material issue or tradeoff they had not
  considered.
- At least three of five take or commit to a tracked action.

Learning:

- Measure intake time, delivery time, auto-approval rate, holds by gate,
  post-delivery audit minutes, missing-input causes, cost, correction rate,
  modules used, sections shared, and reuse intent.
- Pause expansion after any material privacy incident or repeated inability to
  meet the evidence and automated-approval standard.

## P0 Exit Gate

P0 is complete when:

- Michael resolves the implementation-blocking decisions in the register.
- Product, Decision Pack, architecture, and repository contracts agree.
- The alpha uses one Decision Pack with explicitly gated conditional modules.
- The sanitized fixture plan and reconciliation rules are approved.
- Automated approval authority, critical gates, exception ownership, and
  external-source posture are assigned.
- The target repository and deployment boundaries exclude private work.
- Ten-day work packages have owners, dependencies, acceptance tests, and stop
  conditions.
- No unresolved decision blocks Day 1 implementation.
