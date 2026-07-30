# Home-Finding Buddy Alpha Architecture Contract

Status: Proposed for alpha implementation
Audience: Product, engineering, evaluation/research, and exception-review agents
Last updated: 2026-07-29

## 1. Alpha Outcome And Constraints

The alpha must let an invited home buyer:

1. Sign in to a private workspace.
2. Submit a Redfin listing URL, optional known listing facts, documents, and specific questions.
3. Receive a buyer-specific, source-aware analysis.
4. Receive the analysis only when a fail-closed approval policy marks it `auto_approved`; ambiguous or deficient results are withheld for exception handling.
5. View it privately and optionally create a revocable private share link.

The output is a research and decision-support brief, not an appraisal, inspection, title opinion, financing recommendation, tax opinion, or legal opinion.

The alpha optimizes for learning whether a small group of serious buyers values deeper, tailored analysis. It does not require MLS integration, automated offer writing, autonomous publication, a marketplace, or full listing-history ingestion.

## 2. Architecture Decision

### Decision

Build a small full-stack TypeScript application using:

- Next.js App Router for the web UI, authenticated server routes, and exception console.
- Supabase Postgres for normalized product data.
- Supabase Auth for email-based authentication.
- Supabase Storage for private user uploads.
- A server-side OpenAI Responses API integration that returns a versioned, validated structured output.
- A database-backed analysis state machine with automated, fail-closed approval from launch.
- Deterministic validators plus an independent evaluation pass that is separate from generation and cannot be replaced by a model self-score.
- Vercel for web application previews and production hosting.
- A background execution mechanism behind a narrow `AnalysisRunner` interface. The initial implementation may use a protected server job or Supabase Edge Function; the domain contract must not depend on either runtime.

### Rationale

The static application proved the buyer loop but now mixes UI, local persistence, heuristic analysis, cloud sync, and rendering in one large browser script. The next capabilities—ownership, jobs, source records, output versions, review transitions, private sharing, audit history, and tests—are relational and server-authoritative.

Next.js and Supabase preserve the fastest parts of the current direction while adding explicit client/server boundaries. The existing static UI remains a reference and fallback during migration; it is not extended into the production alpha.

### Consequences

- Customer intake moves out of public GitHub Issues.
- The OpenAI key and Supabase service role remain server-only.
- A generated model response is always a candidate, never a user-ready result until the approval policy records `auto_approved`.
- Failure, ambiguity, missing required evidence, validator disagreement, or evaluator uncertainty defaults to `needs_review`, `insufficient_evidence`, or `failed`, never approval.
- Database migrations replace the current single mutable schema file.
- The evaluation schema and rubric become versioned application contracts.
- The initial Redfin experience accepts a URL but does not promise unrestricted Redfin scraping.

## 3. System Boundaries

### Browser

Responsibilities:

- Render marketing, sign-in, workspace, intake, status, result, share, and exception-console experiences.
- Collect listing URL, buyer questions, known facts, and uploads.
- Call authenticated same-origin application endpoints.
- Display only records authorized for the current user or share token.

The browser must not:

- Hold the OpenAI key, Supabase service role, exception-handler authority, approval policy, or document-processing credentials.
- Decide analysis or review state transitions.
- Treat listing page content, uploaded documents, or model output as trusted HTML.
- Generate a final decision-support result using client-only heuristics.

### Web Application Server

Responsibilities:

- Validate sessions, input schemas, ownership, exception-handler role, quotas, and idempotency.
- Create and read product records through user-scoped or narrowly privileged data access.
- Issue signed upload paths and revocable share tokens.
- Enqueue or invoke analysis through `AnalysisRunner`.
- Run the server-owned approval policy, apply legal state transitions, and write audit events.
- Return generic user errors with a correlation ID.

### Analysis Runner

Responsibilities:

- Load a frozen request snapshot and permitted buyer context.
- Process accepted documents and source records.
- Run deterministic calculations.
- Call the OpenAI Responses API with versioned instructions and JSON schema.
- Validate the response and persist an immutable analysis candidate.
- Invoke the independent evaluator with a separately versioned contract after deterministic validation succeeds.
- Submit generator output, validator results, evaluator results, and source coverage to the approval policy.
- Record model, schema, prompt, rubric, source, latency, token, and cost provenance.

The generator and independent evaluator cannot directly approve, mark an analysis ready, or publish/share it. Only the deterministic approval policy can record `auto_approved`.

### Source Adapters

Each adapter converts one permitted source into normalized `source_records`. Adapters must record URL or document identity, publisher/type, retrieval time, effective date when known, extraction method, and evidence limitations.

Redfin content is untrusted external input. Alpha ingestion begins with the submitted URL, buyer-entered facts, optional buyer-provided documents, and sources whose access and use are permitted. Any automated listing-page retrieval is a separately approved adapter, not a hidden dependency of intake.

### Automated Approval Policy And Exception Handling

The approval policy is application code, not a prompt and not a model self-score. It evaluates versioned deterministic validator results and the output of an independent evaluator. The evaluator must use a distinct call and evaluation contract; it may identify unsupported claims, contradictions, unsafe certainty, missed buyer questions, and policy violations, but it cannot override a failed deterministic check.

Approval is fail-closed:

- Every required deterministic validator passes.
- Required source coverage and freshness thresholds pass.
- Every factual claim is linked to permitted evidence or explicitly labeled unverified.
- Deterministic calculations reconcile.
- The independent evaluator returns no blocking finding and its output validates.
- Generator/evaluator infrastructure, policy version, and audit writes all complete successfully.

Any missing result, timeout, parse failure, disagreement, unsupported claim, policy exception, or audit failure prevents approval. A candidate is routed to `needs_review`, `insufficient_evidence`, or `failed` according to the deterministic failure taxonomy.

An authorized human exception handler can inspect:

- The submitted questions and buyer context relevant to the request.
- The structured candidate and approval decision.
- Source coverage and checked dates.
- Missing-data and confidence flags.
- Deterministic calculation inputs.
- Generator, evaluator, validator, policy, and run provenance with safe diagnostic summaries.

Exception handlers can add evidence, correct inputs, request a new run, or reject
a request. They cannot silently edit an immutable candidate, rewrite the
automated decision, waive a critical gate, or approve delivery. A corrected
version must pass the complete automated policy before delivery.

Post-delivery audits sample auto-approved results using a configurable risk-based and random sampling policy. Audit findings can revoke a result, disable sharing, create a policy incident, and activate the approval kill switch.

## 4. Core Normalized Data Model

All primary keys are UUIDs. All mutable tables include `created_at` and `updated_at`. User-owned rows include `owner_id`. Foreign keys use explicit deletion behavior. JSONB is allowed for versioned structured payloads and source-specific metadata, not as a substitute for ownership, lifecycle, or relationships.

### Identity And Workspace

`profiles`

- `user_id` → `auth.users`
- `display_name`
- `onboarding_status`
- `terms_accepted_at`

`workspaces`

- `owner_id`
- `name`
- `status`: `active | archived`

Alpha: one owner per workspace. Multi-member households are deferred; optional private sharing covers result collaboration.

`buyer_brief_versions`

- `workspace_id`
- `version`
- `status`: `draft | active | superseded`
- `brief_json`
- `source`: `buyer | debrief | reviewer | import`
- `created_by`

Versions are immutable after activation. Evaluations reference the exact brief version used.

### Listing And Intake

`listings`

- `workspace_id`
- `canonical_url`
- `provider`: initially `redfin | other`
- `provider_listing_id`, nullable
- `address_text`, nullable
- `asking_price_cents`, nullable
- `listing_status_text`, nullable
- `user_notes`, nullable

`evaluation_requests`

- `workspace_id`
- `listing_id`
- `buyer_brief_version_id`, nullable
- `focus_questions`
- `request_snapshot_json`
- `status`
- `submitted_at`, `cancelled_at`, nullable
- `idempotency_key`

The request snapshot freezes the listing facts and permitted buyer context used to begin analysis.

### Documents And Sources

`uploads`

- `workspace_id`
- `evaluation_request_id`, nullable
- `storage_path`
- `original_filename`
- `media_type`
- `size_bytes`
- `sha256`
- `status`: `pending | quarantined | accepted | rejected | deleted`
- `scan_result`, nullable

`document_extractions`

- `upload_id`
- `extractor_version`
- `status`: `queued | processing | complete | failed`
- `text_storage_path`, nullable
- `page_count`, nullable
- `error_code`, nullable

Extracted text is private and is not stored in application logs.

`source_records`

- `evaluation_request_id`
- `source_type`: `listing | buyer_input | upload | county | permit | hazard | school | market | calculation | other`
- `title`
- `publisher`, nullable
- `url`, nullable
- `upload_id`, nullable
- `retrieved_at`
- `effective_date`, nullable
- `content_hash`, nullable
- `extraction_method`
- `evidence_status`: `primary | secondary | buyer_provided | unverified | unavailable`
- `metadata_json`

### Analysis And Review

`analysis_runs`

- `evaluation_request_id`
- `attempt`
- `status`: `queued | running | succeeded | failed | cancelled`
- `input_hash`
- `schema_version`
- `rubric_version`
- `prompt_version`
- `model`
- `started_at`, `completed_at`, nullable
- `token_input`, `token_output`, `cost_micros`, nullable
- `correlation_id`
- `error_code`, `safe_error_message`, nullable

Only server-side code inserts or updates analysis runs.

`analysis_drafts`

- `analysis_run_id`
- `evaluation_request_id`
- `draft_version`
- `structured_output_json`
- `raw_response_storage_path`, nullable and restricted
- `validation_status`
- `created_by`: `model | reviewer`
- `supersedes_draft_id`, nullable

Drafts are immutable. A reviewer edit creates a new draft version.

`validation_results`

- `analysis_draft_id`
- `validator_suite_version`
- `validator_id`
- `status`: `pass | fail | error`
- `failure_code`, nullable
- `result_json`
- `created_at`

Validator results are server-authored and immutable. Required alpha validators include schema validity, required-section completeness, focus-question coverage, claim/source linkage, source permission, source freshness, checked-date presence, deterministic calculation reconciliation, prohibited-certainty language, disclaimer presence, PII/share-field policy, duplicate/contradictory claim detection, and maximum output limits.

`independent_evaluations`

- `analysis_draft_id`
- `evaluator_version`
- `model`
- `status`: `passed | blocking_findings | error`
- `findings_json`
- `input_hash`
- `created_at`

The evaluator does not receive or reuse a generator self-score. Its instructions, schema, model/run identity, and findings are independently versioned and audited.

`approval_decisions`

- `analysis_draft_id`
- `decision`: `auto_approved | needs_review | insufficient_evidence | failed`
- `policy_version`
- `validator_suite_version`
- `independent_evaluation_id`, nullable
- `reason_codes`
- `decided_at`
- `supersedes_decision_id`, nullable

Approval decisions are immutable and server-authored. If a required input is absent or an approval audit write fails, no approved result is created.

`claim_sources`

- `analysis_draft_id`
- `claim_id`
- `source_record_id`
- `support_type`: `supports | contextual | conflicts`

Every factual claim must have at least one linked source or be explicitly marked unverified/missing in the structured output.

`review_events`

- `evaluation_request_id`
- `analysis_draft_id`
- `reviewer_id`
- `action`: `exception_opened | evidence_added | rerun_requested | rejected | post_delivery_audited | approval_revoked`
- `notes`, nullable
- `created_at`

`approved_results`

- `evaluation_request_id`
- `analysis_draft_id`
- `approval_decision_id`
- `approval_type`: `automatic`
- `approved_by`, nullable for automatic approval
- `approved_at`
- `result_version`
- `revoked_at`, nullable

Only a non-revoked approved result can be shown as complete or shared. Approval
requires an `approval_decisions.decision = auto_approved` record.

### Sharing And Audit

`share_links`

- `approved_result_id`
- `owner_id`
- `token_hash`
- `expires_at`, nullable
- `revoked_at`, nullable
- `last_accessed_at`, nullable
- `access_count`

The raw token is returned once and never stored. Share pages expose only the approved result fields allowed by the share contract; they do not expose buyer notes, financing limits, internal review notes, uploads, or raw sources by default.

`audit_events`

- `actor_user_id`, nullable
- `workspace_id`, nullable
- `entity_type`, `entity_id`
- `action`
- `correlation_id`
- `metadata_json` containing no raw buyer notes or document content
- `created_at`

## 5. Request, Analysis, And Review State Machine

`evaluation_requests.status` is the user-facing aggregate lifecycle. The canonical terminal approval states are `auto_approved`, `needs_review`, `insufficient_evidence`, and `failed`:

```text
draft
  -> submitted
  -> queued
  -> analyzing
  -> validating
  -> evaluating
  -> auto_approved
  -> needs_review -> queued
  -> insufficient_evidence -> queued
  -> failed -> queued

submitted | queued | needs_review | insufficient_evidence -> cancelled
auto_approved -> revoked
```

Rules:

- Only the owner can move `draft -> submitted` or cancel before approval.
- Submission requires a valid listing URL or address, at least one focus question or an explicit general-review choice, and accepted terms.
- Server code moves `submitted -> queued`.
- The runner moves `queued -> analyzing -> validating -> evaluating`.
- The policy engine alone moves `evaluating -> auto_approved | needs_review | insufficient_evidence | failed`.
- `auto_approved` requires a complete immutable approval decision and one non-revoked `approved_results` row in the same transaction.
- `needs_review` means a policy exception, evaluator blocking finding, or disagreement requires optional human handling.
- `insufficient_evidence` means required evidence thresholds cannot currently be met; it is not an invitation for a model to fill gaps.
- `failed` means infrastructure, parsing, validation execution, or audit persistence did not complete reliably.
- A rerun from any non-approved terminal state creates a new run and candidate; it never mutates the prior run, candidate, validation, evaluation, or decision.
- Revoking approval invalidates all associated share links.
- State transitions use a database transaction, expected prior state, actor authorization, and an audit event.
- Retry is idempotent by request plus input hash; duplicate browser submission is prevented by owner plus idempotency key.

Analysis-run status remains separate from request status so retries do not destroy request history.

## 6. Auth, RLS, Admin, And Share Model

### Authentication

- Supabase email magic link is the alpha default.
- Auth redirect URLs are allowlisted per environment.
- The web server verifies the authenticated session for protected routes.
- Anonymous users may view marketing and an approved share page only.

### RLS

- Owners can select and update their own profile, workspaces, listings, draft intake, requests, accepted upload metadata, approved results, and share-link metadata.
- Owners cannot insert/update analysis runs, drafts, validator results, independent evaluations, approval decisions, review events, approved results, role assignments, or audit events directly.
- Users cannot read another owner's rows through nested relationships.
- Storage policies scope private objects to the owning workspace and authorized service processing.
- Cross-user isolation tests are required for every user-owned table and storage bucket.

### Admin And Reviewer Authorization

- `user_roles(user_id, role, granted_by, created_at, revoked_at)` is server-managed.
- Alpha roles are `exception_reviewer`, `auditor`, and `admin`.
- Reviewer checks occur server-side and in RLS/database functions where privileged database reads are needed.
- A client-supplied role, email allowlist in browser code, or editable profile field is never sufficient.
- Role grants/revocations and review actions are audited.

### Private Sharing

- Results are private by default.
- The owner explicitly creates a random, high-entropy share link after automatic
  approval.
- The database stores only a cryptographic token hash.
- Links can expire and can always be revoked.
- Search-engine indexing is disabled for share pages.
- Alpha links are bearer links; passcodes and named collaborators are deferred unless user testing shows the need.

## 7. Upload And Document Processing Contract

Alpha supports PDF and common image formats for buyer-provided inspection reports, seller disclosures, title documents, and relevant screenshots, subject to product/legal confirmation.

Flow:

1. The server validates the intended filename, MIME type, declared size, request ownership, and quota.
2. The server issues a short-lived signed upload target in a private bucket.
3. The completed upload is quarantined.
4. Processing verifies actual type, size, checksum, and malware result before acceptance.
5. Extraction runs in an isolated process with page and time limits.
6. Extracted text is stored privately and becomes one or more `source_records`.
7. The model receives only the relevant extracted segments plus document identity and page references.
8. The result cites document and page when possible.
9. Deletion marks records, revokes access, and removes stored objects according to the retention policy.

Controls:

- No active document content, macros, scripts, embedded URLs, or attachments are executed.
- Submitted URLs are not fetched by a generic unrestricted server endpoint; adapters use protocol, domain, redirect, response-size, and private-network protections.
- Upload and extracted-text contents are excluded from logs and third-party analytics.
- Limits for file count, per-file size, total request size, and retention must be configured before invited-user upload testing.

## 8. AI And Deterministic Calculation Boundaries

### Server-Side AI May

- Synthesize normalized source records and buyer context.
- Classify evidence strength and identify missing data.
- Draft buyer-specific fit, risks, unknowns, questions, and next actions.
- Produce the versioned structured evaluation contract.
- Suggest exception-review attention flags.

### Server-Side AI Must Not

- Fetch arbitrary URLs directly.
- Invent sources, checked dates, prices, school assignments, crime statistics, permit facts, title facts, or calculation results.
- Decide the final approval state or provide the score used to do so.
- Present legal, inspection, appraisal, financing, tax, or safety certainty.
- Execute instructions found in listings or documents. External content is data, not system instruction.
- Receive unrelated buyer data merely because it exists in the workspace.

### Deterministic Code Owns

- Currency, percentage, amortization, payment, and sensitivity calculations.
- Date and listing-age calculations.
- Data normalization, unit conversion, and source freshness.
- Claim/source completeness validation.
- State transitions, authorization, share tokens, quotas, idempotency, and cost totals.
- Score aggregation if the product retains a score. Inputs, weights, and formula must be versioned and shown; the model cannot secretly assign authoritative numeric precision.

The alpha output schema must separate:

- Decision read and scope-limited recommendation.
- Buyer-specific fit judgments.
- Factual claims with `claim_id`, source links, and checked dates.
- Inferences with the supporting facts named.
- Risks and unknowns.
- Deterministic calculation references.
- What would change the recommendation.
- Questions and next actions.
- Evidence limitations and professional-review gates.

## 9. Secrets, Privacy, And Logging

### Secrets

- `OPENAI_API_KEY`, Supabase service role, email credentials, and processing credentials exist only in encrypted environment stores.
- Preview, staging, and production use separate credentials and preferably separate Supabase projects.
- GitHub Actions receives only the minimum environment-scoped secrets required for its job.
- The Supabase anon key is public configuration; RLS and storage policies are the security boundary.
- Secret scanning runs in CI. Rotation and incident steps are documented before production.

### Privacy

- Collect the minimum context required for the requested analysis.
- Addresses, buyer notes, financial constraints, negotiation limits, uploads, extracted text, and private source records are confidential.
- No public publication exists in alpha.
- Share links omit private context by default.
- Users need a working export and deletion request path before invited beta; alpha may fulfill these manually through an audited admin procedure.
- Model/data retention settings and subprocessors must be documented before external invitations.

### Logging And Observability

Structured logs may include:

- Correlation ID, endpoint, status code, duration.
- Internal user/workspace/request identifiers.
- State transition, analysis-run status, model name, schema/rubric/prompt versions.
- Token usage, estimated cost, source counts, validation error codes.

Logs must not include:

- Raw prompts/responses by default.
- Buyer notes or financial details.
- Listing/document extracted text.
- Share tokens, auth tokens, email addresses, or storage URLs with credentials.
- Full OpenAI or database error payloads returned to the browser.

User-facing errors are generic and include a correlation ID. Restricted diagnostic records use safe error codes and limited retention.

## 10. Target Repository Structure And Incremental Migration

```text
apps/
  web/
    app/
    components/
    lib/
packages/
  domain/              # schemas, types, state machine
  evaluation/          # canonical rubric, prompt, output schema, validators
  calculations/        # deterministic finance and scoring
  source-adapters/     # permitted source integrations
  ui/
supabase/
  migrations/
  seed.sql
  functions/           # only if a worker remains here
tests/
  unit/
  integration/
  e2e/
  fixtures/
docs/
  product/
  architecture/
  operations/
  decisions/
examples/
  public-briefs/       # sanitized, approved examples only
scripts/               # durable import/generation utilities
archive/
  prototype-static/    # after cutover, not during first scaffold
```

Incremental migration:

1. Leave current static files and dirty work untouched while scaffolding `apps/web` and shared packages.
2. Convert the evaluation schema/rubric into the canonical `packages/evaluation` contract. Keep the Codex skill as a thin workflow that references that contract where practical.
3. Add numbered Supabase migrations alongside the existing schema; do not rewrite deployed history.
4. Build auth, normalized intake, and RLS in the new app.
5. Build the generator, deterministic validators, independent evaluator, approval policy, and exception console against fixture outputs.
6. Build the buyer result UI from the same fixture contract.
7. Run static and full-stack experiences in parallel until the alpha path passes acceptance tests.
8. With explicit approval, move legacy static files to `archive/prototype-static`, retain sanitized examples, and remove public GitHub Issues from customer intake.
9. Inventory `outputs/`, `tmp/`, `work/`, `home-buying/`, lock files, and personal property artifacts before any move or deletion. Nothing in these directories is assumed disposable.

## 11. CI, Preview, And Deployment

### Branch And Pull Request Model

- Protect `main`.
- Use short-lived `codex/<work-package>` branches.
- Require pull requests for alpha application, migration, security, or evaluation-contract changes.
- Keep each work package file-isolated where possible.
- Require a migration/rollback note for database changes.

### Pull Request Checks

- Locked dependency install.
- Formatting and linting.
- TypeScript type check.
- Unit tests for domain/state/evaluation/calculations.
- Database migration and RLS integration tests.
- Build.
- Playwright happy-path smoke tests at desktop and mobile widths.
- Accessibility smoke checks.
- Secret scanning and dependency audit.
- Structured-output fixture/contract tests.

### Environments

- Local: local Supabase or isolated development project, fake email path, model stub by default.
- Preview: per-PR web preview using non-production data and constrained AI credentials; never connect previews to the production database.
- Staging: production-like RLS, storage, generator, evaluator, policy, exception, and audit flow.
- Production: deployed from `main` after required checks and an approved migration plan.

Database migrations run once per environment through a controlled deployment job. Failed migrations stop deployment. Destructive migrations require explicit approval, backup confirmation, and a rehearsed rollback or forward-fix.

Feature flags independently control generation, independent evaluation, automated approval, uploads, sharing, and notifications. The approval kill switch must immediately prevent new auto-approvals and route completed candidates to `needs_review` without taking the workspace or existing results offline. The broader AI kill switch must stop new model runs.

## 12. Ten-Day Parallel Work Packages

Day 1 is contract alignment. Days 2–8 are parallel implementation with daily integration. Days 9–10 are end-to-end hardening and an internal alpha rehearsal.

### WP-A: Product Contract And Golden Evaluation Suite

Owner persona: Product Manager
Days: 1–3

- Lock the alpha intake fields, output hierarchy, automated approval promise, and success measures.
- Define a versioned golden evaluation suite containing clear approvals, unsupported claims, insufficient evidence, prompt injection, contradictory sources, calculation errors, unsafe certainty, missing buyer-question coverage, and infrastructure-error cases.
- Decide what “reef-like” means as a reusable output contract.

Acceptance:

- Fixtures include URL, focus questions, sources, missing data, deterministic calculations, expected validator results, expected evaluator findings, expected canonical state, and approval history.
- The output clearly distinguishes facts, inferences, buyer fit, risks, unknowns, and next actions.
- Policy changes cannot merge unless the golden suite meets the approved false-approval threshold and produces zero approvals for blocking fixtures.

### WP-B: Application Shell And Buyer UX

Owner persona: Product Engineer, Frontend
Days: 2–8
Depends on: WP-A field/output draft

- Scaffold Next.js/TypeScript, auth screens, workspace, listing intake, request status, and result routes.
- Build responsive UI against fixtures.

Acceptance:

- A signed-in test user completes intake and views a fixture result on mobile and desktop.
- No server secret appears in the client bundle.
- Core flow passes accessibility smoke checks.

### WP-C: Database, Auth, RLS, And Sharing

Owner persona: Backend/Security Engineer
Days: 2–7

- Create normalized migrations, policies, storage buckets, role model, transition functions, and share tokens.
- Add cross-user isolation tests.

Acceptance:

- Owner A cannot read or mutate Owner B data through any tested table or storage path.
- Users cannot create analysis/validation/evaluation/review/approval records directly.
- A revoked share token stops working immediately.

### WP-D: Evaluation Contract And Analysis Runner

Owner persona: AI/Application Engineer
Days: 2–8
Depends on: WP-A fixture; coordinates with WP-C IDs/state

- Version output schema, rubric, prompt, validator, provenance, idempotency, and safe errors.
- Implement runner interface with generator stub/server-side OpenAI adapter, deterministic validator suite, independent evaluator, and versioned approval policy.
- Enforce claim/source linkage, missing-data behavior, canonical terminal states, and fail-closed transaction semantics.

Acceptance:

- Golden suite produces every expected validator, evaluator, and policy outcome.
- Duplicate run request does not create duplicate successful drafts.
- Prompt-injection and unsupported-claim fixtures cannot reach `auto_approved`.
- A generator response or generator self-score cannot directly affect approval.
- Validator/evaluator timeout, parse error, disagreement, missing audit write, or kill-switch activation prevents `auto_approved`.

### WP-E: Uploads And Source Pipeline

Owner persona: Data/Platform Engineer
Days: 3–8
Depends on: WP-C storage

- Implement signed private upload, quarantine/acceptance lifecycle, bounded extraction interface, and normalized sources.
- Begin with safe test fixtures; external listing retrieval remains behind an adapter flag.

Acceptance:

- Wrong type/oversize files are rejected.
- Accepted fixture document produces page-addressable private source records.
- No extracted content appears in logs.

### WP-F: Exception And Audit Console

Owner persona: Product Engineer, Full Stack
Days: 4–8
Depends on: WP-C state/roles; WP-D candidates and decisions

- Build queues for `needs_review`, `insufficient_evidence`, and `failed`; show source coverage, deterministic failures, evaluator findings, version history, rerun actions, optional human exception handling, and post-delivery audits.

Acceptance:

- Authorized exception handlers can add evidence, rerun, or reject, but cannot
  waive a critical gate or approve delivery.
- Authorized auditors can sample auto-approved results and revoke/flag them without mutating the original decision.
- Unauthorized users cannot access exception/audit data or transitions.
- Every action creates an immutable, versioned audit event; no console action can relabel a human exception as `auto_approved`.

### WP-G: Delivery, Tests, And Operations

Owner persona: Staff/Platform Engineer
Days: 1–10

- CI, preview/staging environments, feature flags, logs/metrics, error tracking, cost metrics, runbook, and E2E tests.

Acceptance:

- Required checks gate merge.
- Preview is isolated from production.
- Intake-to-auto-approved-result and intake-to-each-fail-closed-state E2E tests pass.
- Approval kill switch, AI kill switch, failed-job recovery, post-delivery revocation, and rollback procedure are rehearsed.

### Integration Sequence

- Day 1: Align decisions and golden path.
- Day 2: Scaffold app/packages/migrations and publish interfaces.
- Day 3: Merge domain schema and fixture contracts.
- Days 4–6: Integrate intake, persistence, stub generator/evaluator, validators, policy, and exception flow.
- Days 7–8: Integrate real model behind a flag, uploads, sharing, and observability.
- Day 9: Security/RLS/adversarial/accessibility/mobile test pass.
- Day 10: Internal alpha rehearsal, defect triage, go/no-go against acceptance criteria.

Parallel agents must not edit the same contract files without explicit ownership handoff. Shared interfaces land early through small pull requests; downstream work uses fixtures rather than waiting for full implementations.

## 13. ADRs And Decisions Requiring Alignment

Create ADRs under `docs/decisions/` when implementation begins.

### ADR-001: Primary Alpha Product Shape

Decision: the alpha promise is a private, policy-approved, one-listing analysis tailored to buyer questions. Persistent Buyer Search Brief and tour-learning features remain visible in the product direction but are not required for the ten-day alpha.

Why Michael should align: choosing the full recurring workspace as the immediate alpha would materially expand intake, UI, evaluation context, and acceptance criteria.

### ADR-002: Automated Approval And Human Exceptions

Decision: automated approval is enabled from launch and is fail-closed. Approval requires all deterministic validators plus a separate independent evaluator to satisfy a versioned application policy. A generator self-score is never an approval input.

Human review is exception handling and post-delivery auditing, not a delivery
gate. Open: who handles exceptions, what service level is offered, and what
audit sampling rate/risk rules apply.

### ADR-003: Redfin And External Source Access — Alignment Required Before Live Model Testing

Proposed: accept Redfin URLs but do not promise automated Redfin scraping. Use user-entered facts, buyer-provided documents, and permitted public/paid source adapters.

Open: whether to license a property-data provider, permit a narrowly tested metadata adapter, or operate concierge source collection during alpha.

### ADR-004: Upload Scope And Retention — Alignment Required Before User Uploads

Proposed: accept PDFs/images in a private bucket and retain them until the user deletes the request or the alpha retention window expires.

Open: allowed document categories, maximum size/count, exact retention window, subprocessors, and whether inspection/title documents are acceptable during alpha.

### ADR-005: Hosting And Background Execution

Proposed: Vercel for the Next.js app, Supabase for data/auth/storage, and an `AnalysisRunner` abstraction with the first reliable background runtime chosen during scaffold.

Open: Vercel job route versus Supabase Edge Function versus a dedicated queue. Decide based on timeout, retry, local testability, and operational simplicity; do not couple domain code to the selection.

### ADR-006: Share-Link Exposure

Proposed: bearer link to the approved result only, revocable and optionally expiring, with buyer financial constraints, private notes, uploads, reviewer notes, and raw sources excluded.

Open: default expiration and whether an address is included in the shared result.

### ADR-007: Financial Calculations

Proposed: alpha includes only deterministic calculations with explicit user inputs and assumptions. Generated spreadsheets and personalized finance workbooks are not automatically imported into the product.

Open: which calculations belong in the standard brief and which require explicit buyer input.

### ADR-008: Existing Supabase Project

Proposed: inspect the deployed project and policies before deciding whether to migrate it or create clean staging/production projects. Do not assume the checked-in schema exactly represents deployed state.

Open: current project environment, existing user data, key ownership, backup posture, and whether any real user records exist.

## 14. Alpha Exit Criteria

The architecture is implemented sufficiently for an internal alpha when:

- An invited user can authenticate, submit a private request, and track it.
- The request produces a schema-valid, source-linked candidate through a server-only generator.
- Deterministic validators and a separately versioned independent evaluator run before the application policy can record `auto_approved`.
- The golden evaluation suite has zero auto-approvals for blocking fixtures and meets the approved regression thresholds.
- Missing evidence, validator/evaluator errors or disagreement, failed audit persistence, and kill-switch activation resolve fail-closed to `needs_review`, `insufficient_evidence`, or `failed`.
- A generator self-score cannot influence or substitute for the approval decision.
- Authorized staff can inspect exceptions and run post-delivery audits without mutating or relabeling the original automated decision.
- Only the owner can view an auto-approved result unless they create a revocable
  share link.
- Cross-user RLS and storage isolation tests pass.
- Secrets are absent from browser bundles and logs exclude sensitive content.
- Generator/evaluator provenance, policy and validator versions, deterministic calculations, state transitions, exception actions, and post-delivery audits are immutable and auditable.
- The flow passes desktop/mobile E2E and accessibility smoke tests.
- Automated approval and AI execution can each be disabled without disabling access to existing approved results.
- Open legal/source/retention decisions are resolved before external invitations.
