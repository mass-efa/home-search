# Home Search Product Reset Plan

## Decision

Build the product around a private, source-backed **Decision Brief for one listing**.
The ongoing **Buyer Workspace** is the retention loop: it remembers priorities,
custom questions, evaluated homes, tour reactions, and buyer-approved preference
changes so each later analysis becomes more useful.

The initial promise is:

> Paste a Redfin or other listing link and tell us what worries you. Get a
> decision-quality brief that explains what fits, what could hurt, what remains
> unknown, and what to verify next.

The recent 3920 W Barrett analysis is the closest current example of the intended
depth. It must be sanitized before it is used as a public product example.

## Why This Reset Is Needed

The repository currently contains three overlapping product models:

1. A public static site and public GitHub Issue intake flow.
2. A local-first Buyer Search Brief and tour-debrief workspace.
3. A private AI-assisted home-evaluation service backed by Supabase.

It also mixes deployable product code, reusable evaluation instructions, personal
finance materials, generated reports, temporary rendering artifacts, and
property-specific research. This makes the product story, privacy boundary, and
engineering path harder to understand.

The reset will preserve useful work while giving every artifact one clear home.
No meaningful file should be deleted, publicly exposed, or broadly reorganized
without an approved inventory and disposition.

## Barrett Reference Package Assessment

The `outputs/3920_barrett/` package establishes a stronger and more specific
product benchmark than the prior generic rubric alone. Its core value is the
combination of three coordinated artifacts:

1. A one-page buyer decision sheet for the immediate decision.
2. A detailed acquisition memo that explains the analysis and evidence.
3. A companion acquisition model that exposes assumptions, calculations,
   comparable sales, adjustments, scenarios, and sources.

The package is especially strong in the following ways:

- It begins with a specific recommendation, target, compromise zone, and stopping
  rule rather than a generic property description.
- It explains both why the property is worth stretching for and why the premium
  is capped.
- It connects unchangeable property fundamentals to scarcity and long-term
  lifestyle utility.
- It makes comparable-sale adjustments explicit and shows price per finished
  square foot for the subject and each comp.
- It translates price into monthly ownership economics and future capital needs.
- It turns inspection findings into prioritized diligence and a ready-to-send
  seller-agent question set.
- It distinguishes evidence, inspection-derived observations, analyst judgments,
  assumptions, conflicts, and limitations.
- It maintains a source-and-audit view rather than presenting conclusions without
  provenance.

This package should become the **gold-standard Decision Pack fixture** for Phase
0, after sanitization. The goal is not to reproduce twenty fixed pages for every
property. The goal is to preserve its reasoning depth and allow the interface to
show the appropriate layers based on the buyer's decision and questions.

The productized version should improve several aspects of the reference:

- Generate the one-page view, detailed web brief, PDF, and calculation views from
  one approved canonical dataset so figures cannot drift across artifacts.
- Attach sources to individual factual claims and comparable records, not only to
  a general source appendix.
- Version every buyer assumption, analyst adjustment, calculation method, and
  reviewer decision.
- Recalculate low/base/high cases from scenario-specific assumptions instead of
  applying unexplained aggregate offsets.
- Surface unsupported or buyer-supplied values as editable assumptions.
- Treat exact offer targets, ceilings, affordability, and financing outputs as
  personalized modules that require explicit buyer inputs and reviewer approval.
- Make the buyer's submitted questions a visible section with answered,
  partially answered, and still-open states.
- Preserve inspection-document page references and create similar document maps
  for disclosures, title, permits, and other uploaded materials.

## Target User And Product Wedge

The first user is a serious, self-directed home buyer with a live property
decision, usually within days. They already use Redfin, Zillow, or an agent but
want a more integrated diligence view than listing facts or informal agent advice.

The first transaction is intentionally simple:

1. Submit a listing URL.
2. Explain specific concerns or questions.
3. Optionally add buyer priorities and upload disclosures, inspection reports, or
   title documents.
4. Receive a private, reviewed Decision Brief.
5. Ask a follow-up, share a revocable link, or record a tour reaction.
6. Allow only explicitly approved learnings to update the Buyer Search Brief.

A detailed Buyer Search Brief should not be required before the first useful
result. The product earns the right to ask for more context after delivering value.

## MVP Scope

### Required

- Private account, request, and status experience.
- Listing URL plus free-text investigation priorities.
- Optional supporting documents.
- One versioned, structured Decision Brief contract based on the home-evaluation
  rubric.
- A layered Decision Pack generated from one approved dataset: decision sheet,
  detailed interactive brief, and optional PDF/calculation exports.
- Facts, inferences, buyer-fit judgments, risks, unknowns, and actions clearly
  distinguished.
- Source URLs, source type, and checked dates for factual claims.
- Subject and every comparable sale showing calculated price per finished square
  foot, used as a cross-check rather than the sole valuation method.
- Explicit missing-data and professional-verification flags.
- Internal reviewer queue and approval gate.
- Private result delivery and revocable sharing.
- Follow-up questions and a minimal, progressively built Buyer Search Brief.
- Editable buyer assumptions for financing, ownership costs, renovation appetite,
  time horizon, and walk-away constraints when those modules are requested.
- Funnel, quality, turnaround, reviewer-effort, and cost telemetry without raw
  private buyer data in analytics.

### Not Required For The First Beta

- MLS integration or a general property search engine.
- Fully automatic Redfin extraction as a launch dependency.
- Autonomous offer, inspection, legal, financing, appraisal, or title advice.
- Automatic public publishing.
- Agent CRM, marketplace, native mobile app, or complex billing.
- Fully automated evidence gathering across every geography.

Seattle and King County are the preferred first geography because existing
research, sources, and examples make quality control more achievable.

## Decision Pack Contract

The product should store one canonical approved analysis and render it at three
depths.

### Layer 1: One-Page Decision

Optimized for a buyer, partner, or advisor who needs the decision in minutes:

- Recommendation and confidence.
- Current ask, target or decision range, stretch/stop rule when supported.
- Monthly ownership and five-year capital views when buyer inputs are available.
- Why the property may justify pursuit.
- Why the premium or enthusiasm should be capped.
- Negotiation ladder or next-decision ladder.
- Must-resolve items.
- A plain-language decision rule.

### Layer 2: Interactive Detailed Brief

Every detailed brief should include:

1. Decision read: tour, skip, watch, investigate, pursue, or offer-prep.
2. Main reasons to like the property.
3. Main risks and unknowns.
4. What would change the recommendation.
5. The next three concrete actions.
6. Buyer-specific fit and likely disappointment points.
7. Direct answers to the buyer's submitted questions.
8. Property snapshot and listing history.
9. Schools, safety, neighborhood, and lifestyle fit.
10. Area value, comparable sales, and negotiation posture.
11. Condition, inspection, title, permit, HOA, legal, climate, and site risks.
12. Financial fit when the buyer has provided enough context.
13. Tour and diligence checklist.
14. Sources, checked dates, methodology, and evidence limits.
15. Scarcity and replacement-opportunity analysis when the evidence supports it.
16. Renovation and capital-risk plan with low/base/high allowances when requested.
17. Cost-of-waiting analysis when the buyer provides time horizon and alternative
    housing assumptions.
18. A consolidated, ready-to-send agent or seller diligence question set.
19. Page-level maps for inspection, disclosure, title, permit, or environmental
    documents used in the analysis.

The structured data model must attach factual claims to source records. If a
claim cannot be supported, it must be presented as an inference, judgment, or
unknown rather than filled in.

### Layer 3: Calculation And Audit Views

The analytical layer should support:

- Subject property fact register with verification status.
- Comparable-sale database with source, quality, conflicts, and buyer-relevant
  attributes.
- Explicit adjustment model with category-level reasoning and weights.
- Sensitivity and scenario views.
- Scarcity/replacement inputs.
- Renovation and capital reserve plan.
- Ownership economics and cost of waiting.
- Negotiation ladder.
- Sources, claim links, conflicts, and reviewer audit trail.

For the MVP, these views can live inside the private web application. Downloadable
PDF and spreadsheet exports should be derived outputs, not separate sources of
truth. A spreadsheet export is useful for sophisticated buyers but is not a
prerequisite for the first private beta.

## Target Experience

### Public

- Landing page with a concrete sanitized example.
- How it works, privacy, evidence, and review explanation.
- Sign-in and `Analyze a home` call to action.

GitHub terminology and public issue queues should not appear in the customer
experience.

### Private Buyer App

- Dashboard: requests, saved homes, status, and next action.
- New analysis intake.
- Request status, missing inputs, and document uploads.
- Decision Brief.
- One-page decision mode and deeper analysis modules.
- Follow-up questions.
- Buyer Search Brief and version history.
- Tour debrief and proposed preference changes.
- Account, privacy, deletion/export, and sharing controls.

### Internal

- Review queue.
- Request and evidence workspace.
- Structured draft editor, calculation assumptions, and review checklist.
- Source, calculation, version, and audit history.
- Delivery and operational status.

## Technical Direction

Incrementally migrate to a small full-stack TypeScript application:

- Web application: Next.js App Router.
- Hosting: Vercel for the first beta.
- Database, authentication, and file storage: Supabase.
- AI generation: OpenAI Responses API called only from a server-controlled
  environment.
- Jobs: start with the simplest reliable server-side job pattern; add a dedicated
  queue only when duration or retry needs require it.

The current static app remains a reference and fallback demo during migration. It
should be frozen except for urgent fixes, covered with basic smoke screenshots,
and archived only after the replacement passes the end-to-end beta flow.

The browser must never receive the OpenAI API key or Supabase service-role key.
All server requests must validate authentication, ownership, input shape, rate
limits, quotas, and idempotency.

## Proposed Repository Structure

```text
apps/
  web/                       Next.js buyer, marketing, share, and admin UI
packages/
  domain/                    Schemas, types, permissions, state machines
  evaluation/                Canonical rubric, prompts, calculations, validators
  source-adapters/           Permitted source-specific gathering modules
  ui/                        Shared components and design tokens
supabase/
  migrations/                Numbered schema migrations
  functions/                 Only retained server jobs, if needed
tests/
  unit/
  integration/
  e2e/
  fixtures/                  Sanitized gold-standard evaluation fixtures
docs/
  product/
  architecture/
  operations/
  decisions/
examples/
  public-briefs/             Intentionally sanitized examples only
scripts/                     Durable import, validation, and generation tools
archive/
  prototype-static/          Legacy static product after cutover
```

The Codex `home-evaluation` skill should remain as a thin workflow entry point
that references the same canonical rubric and schemas used by the product. The
rubric, server prompt, and UI must not maintain competing lists of required
sections.

The one-page decision view, detailed brief, PDF, and any spreadsheet export must
all read from the same versioned approved analysis record. Derived output values
must include their formulas or calculation method, inputs, units, and rounding
rules.

## Cleanup And Migration Map

| Current area | Proposed disposition | Gate |
| --- | --- | --- |
| `index.html`, `submit.html`, `requests.html` | Replace with product routes; preserve until cutover | New flow passes end-to-end tests |
| `app.html`, `assets/buddy-app.js` | Use as behavior/UX reference; later archive | Replacement covers core loop |
| `assets/site.css`, `assets/site.js` | Mine useful design patterns; do not extend as production foundation | Design system established |
| `homes/`, `data/homes.json` | Keep only sanitized examples or migrate approved private results to database | Privacy review |
| `skills/home-evaluation/` | Keep thin skill; move canonical contract/rubric into shared evaluation package | Contract approved |
| `supabase/schema.sql` | Replace with numbered migrations | Migration and rollback tested |
| `supabase/functions/evaluate-home` | Refactor into versioned analysis service/job | Draft pipeline ready |
| Public GitHub Issue worker/workflows | Retire from customer intake; GitHub remains engineering system | Private intake live |
| `outputs/`, `tmp/`, `work/`, `home-buying/` | Classify as private source, durable tool, generated output, fixture, or disposable artifact | Michael approves move/delete map |
| `.DS_Store`, lock/temp files, render iterations | Add ignore rules; remove only after review | Cleanup approval |

## Data And Workflow Model

Core records:

- Users, workspaces, and workspace members.
- Versioned Buyer Search Briefs.
- Listings and user-supplied listing inputs.
- Uploads with consent and retention metadata.
- Evaluation requests.
- Analysis runs.
- Source records and evidence snapshots.
- Claims linked to source records and document page references.
- Evaluation drafts and approved brief versions.
- Versioned buyer assumptions, analyst adjustments, calculation runs, scenarios,
  and quality checks.
- Review and audit events.
- Tour debriefs and buyer-approved profile suggestions.
- Expiring and revocable share links.

Request states:

```text
submitted -> needs_input -> researching -> drafting -> review -> ready
                                                \-> failed
submitted/researching/review -> cancelled
```

Only an authorized reviewer can move a draft from `review` to `ready`.

Every analysis run should retain schema, rubric, prompt, and model versions; input
hash; timestamps; source coverage; and token/cost metadata. Raw model responses
should have restricted access and a defined retention policy.

Every calculated output should retain its calculation version, inputs, units,
formula or method, and reviewer status. Buyer-supplied financing and walk-away
information must remain private and excluded from shared views unless the buyer
explicitly includes it.

## GitHub Operating Model

GitHub becomes the engineering delivery system, not a customer database:

- Protect `main`.
- Use short-lived `codex/<feature>` branches.
- Require pull requests and passing checks.
- Use milestones for Product Reset, Private Intake, Analysis Pipeline, Review
  Gate, and Private Beta.
- Each issue states user outcome, data classification, acceptance criteria,
  dependencies, rollout, and rollback.
- Use preview, staging, and production environments with separate data and
  secrets.
- Keep API keys and service credentials only in protected hosting or GitHub
  environment secrets.

Required pull-request checks:

- Formatting, lint, TypeScript, unit tests, and production build.
- Migration validation and cross-user row-level-security tests.
- Structured-output and source-linkage contract tests.
- Desktop and mobile end-to-end smoke tests.
- Accessibility smoke checks.
- Secret scanning and dependency audit.

Production deployment, schema migrations, secrets changes, public publication,
and deletion/reorganization of meaningful files require Michael's explicit
approval.

## Phased Execution Plan

### Phase 0: Alignment, Inventory, And Contracts

Outcome: one product story, one output contract, and one safe migration map.

Work:

- Approve the one-listing Decision Brief wedge and Buyer Workspace retention loop.
- Inventory every repository artifact and classify its privacy and disposition.
- Convert a sanitized Barrett-quality result into a gold-standard fixture.
- Define the structured brief, evidence, source, review, and request-state schemas.
- Define the layered Decision Pack contract and prove that one canonical analysis
  can generate a one-page view, detailed brief, and calculation/audit views.
- Create reusable schemas for property facts, comparable records, adjustment
  categories, scenarios, renovation allowances, ownership assumptions, document
  page maps, and agent questions.
- Reconcile the Barrett memo and workbook figures and document every rounding,
  assumption, and scenario rule before using them as the fixture.
- Create architecture decisions for framework, hosting, data ownership, and job
  execution.
- Reconcile README, MVP spec, roadmap, and workflow documentation.

Acceptance:

- Every current file has a keep, migrate, archive, private, or delete-candidate
  classification.
- No private artifact is in the planned deployment surface.
- One sanitized Decision Pack fixture passes rubric, claim-source,
  evidence-limit, document-map, scenario, calculation, and comparable $/sf
  checks.
- The one-page, detailed, and analytical views reconcile to the same canonical
  figures.
- Product and engineering describe the same end-to-end flow.

### Phase 1: Concierge Vertical Slice

Outcome: a non-GitHub user can privately submit a real listing and receive a
human-reviewed brief.

Parallel work lanes after Phase 0 contract approval:

- Product/UX: landing, intake, status, and result prototypes.
- Platform: Next.js foundation, environments, CI, and previews.
- Data/security: authentication, normalized request tables, RLS, uploads, and
  audit model.
- Evaluation operations: reviewer checklist, gold fixtures, manual evidence
  packet, calculation review, and quality scoring.

Acceptance:

- Signed-in user submits URL and questions and sees only their own request.
- Reviewer can move the request through the lifecycle and deliver a private brief.
- No server secret appears in a browser bundle.
- Cross-user isolation tests pass.
- A mobile and desktop user can complete the flow.

### Phase 2: Structured AI Drafting

Outcome: the server produces a reviewable, evidence-aware draft without making
it user-visible as final.

Work:

- Versioned OpenAI structured output.
- Source-record linkage and explicit unknowns.
- Deterministic calculations for comps, adjustment aggregation, ownership
  economics, renovation scenarios, and other quantitative modules; the model may
  propose inputs or explanations but should not be the calculation engine.
- Validation, arithmetic checks, idempotency, retries, timeouts, quotas, and cost
  tracking.
- Prompt-injection defenses for untrusted listing and document content.
- Safe generic user errors with restricted diagnostics.

Acceptance:

- A fixture request reliably produces a schema-valid stored draft.
- Missing sources fail into explicit unknowns.
- One-page, detailed, and calculation views reconcile automatically.
- Quantitative outputs identify their input sources and pass deterministic checks.
- Repeated requests do not create duplicate runs.
- Unapproved drafts cannot be delivered or shared.

### Phase 3: Reviewer Gate And Buyer Result

Outcome: an authorized reviewer can validate, edit, approve, and deliver a
decision-first brief.

Work:

- Admin authorization and queue.
- Draft/source inspection, editing, regeneration, approval, and audit history.
- Decision Brief UI, buyer-question answers, sources, checked dates, and next
  actions.
- Progressive disclosure from one-page decision mode into the memo-style evidence
  modules and calculation/audit views.
- Downloadable PDF generated from the approved analysis; spreadsheet export can
  follow during beta if user research confirms demand.
- Private expiring/revocable sharing.

Acceptance:

- Only an authorized reviewer can approve a brief.
- Every transition and substantive edit is auditable.
- Share revocation works.
- Required sections, source coverage, evidence limits, and comparable arithmetic
  pass automated and reviewer checks.
- Offer targets, ceilings, affordability, and cost-of-waiting results appear only
  when the required buyer inputs and reviewer gates are satisfied.

### Phase 4: Private Beta Hardening

Outcome: 10–20 invited design partners can use the product safely.

Work:

- Email notifications.
- Rate limits, budgets, kill switch, monitoring, and alerts.
- Deletion/export, retention, privacy terms, consent, and disclaimers.
- Backup/restore and rollback rehearsal.
- Accessibility, mobile, and failure-state QA.

Acceptance:

- Five internal/invited users complete intake through delivery before expansion.
- Deletion and share revocation are verified.
- Cost ceiling, alerting, and rollback are tested.
- Zero unintended public exposure.

### Phase 5: Buyer Memory Loop

Outcome: later analyses become more tailored without silently changing buyer
preferences.

Work:

- Versioned Buyer Search Brief.
- Saved homes and follow-up questions.
- Tour debrief.
- Explicit accept/reject preference suggestions.
- Side-by-side comparison only if user research supports it.

Acceptance:

- A second listing uses the approved buyer context and records which version it
  used.
- Tour notes never silently change the profile.
- Accepted changes are visible, reversible, and versioned.

### Phase 6: Selective Automation And Monetization Tests

Outcome: reduce reviewer time only where the beta evidence shows repeatable work.

Work:

- Permitted official-source adapters.
- Source failure monitoring and geographic coverage rules.
- Tiered brief or pricing tests.
- Operational capacity and unit-economics review.

Acceptance:

- Source failures create unknowns rather than invented content.
- Automation measurably reduces time without increasing material corrections.
- Pricing is tested only after decision utility is established.

## Metrics

Primary beta measure:

- At least 60% of delivered briefs are rated as having changed or clarified the
  buyer's next decision.

Supporting measures:

- Intake completion.
- Time to reviewed brief and reviewer minutes per module.
- Percentage of users who open the ready brief.
- Percentage taking a tracked next action within seven days.
- Percentage reporting a material issue or question they had not considered.
- Second listing or tour debrief within 30 days.
- Source/checked-date coverage.
- Comparable-table compliance.
- Cross-artifact reconciliation rate.
- Calculation and scenario check pass rate.
- Percentage of users who use decision mode versus deeper modules or exports.
- Material factual or arithmetic correction rate.
- AI cost per delivered brief.
- Unintended-public-exposure incidents.

## Agent Team And Operating Charters

### Buyer Decision Product Manager

Mission: maximize decision clarity and learning speed for an active buyer.

Responsibilities:

- Own product scope, user journey, metrics, acceptance criteria, and research.
- Protect the one-listing wedge; approve workspace features only when they improve
  later decisions.
- Treat privacy, provenance, unknowns, and review gates as product requirements.
- Prefer concierge steps until recurring demand justifies automation.
- Record user-test findings in the product docs before changing the backlog.

### Staff Product Engineer — Trustworthy Buyer Intelligence

Mission: ship the smallest private, evidence-aware, reviewable product loop.

Responsibilities:

- Own architecture, integration, security boundaries, CI, and release quality.
- Version schemas, rubrics, prompts, and migrations.
- Keep secrets and server authority out of the client.
- Treat listing text and uploaded documents as untrusted.
- Require tests for cross-user isolation, structured output, and critical states.
- Maintain a known rollback for migrations and releases.

### Evaluation And Evidence Lead

Mission: turn the home-evaluation rubric into consistent, auditable decision
packs.

Responsibilities:

- Own the canonical rubric, evidence taxonomy, source standards, gold fixtures,
  deterministic calculation specifications, document maps, and reviewer
  checklist.
- Ensure every factual claim is supported or labeled unknown.
- Preserve professional-verification boundaries.
- Measure correction rate and reviewer effort by module.

### Product Designer / Frontend Engineer

Mission: make a complex brief understandable during a time-sensitive home
decision.

Responsibilities:

- Own intake, status, Decision Brief, sharing, and responsive interaction design.
- Lead with decision, risks, unknowns, and actions before deeper research.
- Verify desktop, mobile, accessibility, and sensitive-data presentation.
- Build from fixtures before the live pipeline is available.

### Platform And Data Engineer

Mission: create a private, observable, recoverable foundation.

Responsibilities:

- Own data model, RLS, uploads, jobs, audit history, observability, retention, and
  deletion/export.
- Prevent raw private data from entering logs or analytics.
- Add idempotency, budgets, rate limits, retries, and failure recovery.

### Trust Reviewer

Mission: prevent unsupported, misleading, or unintentionally public output.

Responsibilities:

- Verify identity/address, source freshness, arithmetic, missing-data flags,
- Reconcile the one-page, detailed, and analytical views before delivery.
- Be the required approval gate until measured quality justifies narrower
  automation.

## Agent Execution Rules

- The product manager owns scope and acceptance; the engineering lead owns
  integration and release readiness; the evaluation lead owns rubric fidelity;
  the trust reviewer owns delivery approval.
- Give each agent a bounded outcome, owned files, dependencies, tests, and a stop
  condition.
- Run independent work in parallel only after shared contracts are approved.
- Avoid multiple agents editing the same canonical files at once.
- Use small branches and pull requests; integrate through the engineering lead.
- Do not deploy, publish, migrate production data, change secrets, or delete/move
  meaningful artifacts without explicit approval.
- Each handoff states what changed, what was verified, what remains uncertain, and
  the next dependency.

## Immediate Decisions And Next Actions

The recommended next action is to approve Phase 0 only. It is deliberately
non-destructive and should produce the artifacts needed for faster parallel work.

Phase 0 can then be divided as follows:

1. Product manager: canonical product narrative, journey, metrics, and test plan.
2. Engineering lead: architecture decisions and target repository map.
3. Evaluation lead: structured report contract, evidence taxonomy, reviewer
   checklist, calculation specifications, and sanitized Barrett Decision Pack
   fixture.
4. Repository steward: file inventory, privacy classification, and proposed
   move/archive/delete map.
5. Design/frontend: fixture-driven landing, intake, status, and Decision Brief
   concepts after the report contract stabilizes.

Approval of this plan does not approve cleanup moves, deletion, deployment,
secrets changes, database migrations, or public publication. Those should be
reviewed at the end of Phase 0 with the inventory and migration plan in hand.
