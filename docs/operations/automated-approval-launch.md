# Automated Approval Alpha Launch Checklist

## Launch Decision

This checklist gates delivery of automatically approved, buyer-visible Decision
Briefs. A successful deployment is not a launch.

**Go/no-go owner:** Michael, or one explicitly named Release Owner delegated by
Michael before the launch review. The Engineering Lead, Evaluation/Evidence Lead,
and Privacy/Security owner provide written attestations; they do not independently
authorize launch.

Default decision is **no-go**. Every required item must be checked with a linked
artifact, test result, deployment identifier, or dated attestation. An exception
cannot be waived by model confidence or an operator.

Current baseline is **no-go**: the existing backend has no live source-adapter
packet and its property-identity gate intentionally fails closed.

## 1. Bounded Coverage And Evidence

- [ ] Product accepts normal alpha delivery only for residential properties with
  a normalized, authoritative address in Seattle or King County.
- [ ] Unsupported property types and out-of-area requests fail to a safe,
  buyer-visible exception before drafting.
- [ ] A versioned coverage matrix lists each supported module, authoritative
  source, freshness limit, required/optional status, and known geographic gaps.
- [ ] Property identity is reconciled to an authoritative King County parcel
  record; listing URL or buyer-entered address alone is insufficient.
- [ ] Minimum evidence for a Quick Scan is defined and enforced:
  property identity, listing/source date, core property facts, buyer questions,
  evidence limits, and the official/local sources required by every claim shown.
- [ ] Minimum evidence for a Deep Decision Pack is defined and enforced,
  including source-linked claims, required diligence modules, comp records, and
  deterministic calculations.
- [ ] Every subject and comp row shows price, finished square feet, and calculated
  price per finished square foot from those displayed inputs.
- [ ] Missing, stale, inaccessible, or conflicting required evidence produces
  `needs_input`, `insufficient_evidence`, or `quality_exception`; it never passes.
- [ ] School, safety, permit, tax, parcel, title/document, climate/site, and
  comparable modules state their evidence limitations and professional
  verification path.
- [ ] Sensitive offer, financing, affordability, renovation, and cost-of-waiting
  modules remain disabled unless their complete-input and deterministic
  calculation gates pass.

## 2. Source Rights And Data Handling

- [ ] Every source adapter has a recorded owner, access method, permitted-use
  basis, attribution requirement, storage/caching limit, redistribution limit,
  rate limit, and fallback behavior.
- [ ] Redfin or other listing-page extraction is not a launch dependency unless
  its access and reuse are documented as permitted and operationally reliable.
- [ ] Buyer-uploaded documents have explicit consent, retention, access, deletion,
  and share rules.
- [ ] Public-record and third-party data retained in a brief comply with source
  terms and required attribution; raw licensed data is not exposed through share
  links.
- [ ] Source snapshots exclude credentials, session data, unrelated personal
  information, and prohibited content.
- [ ] Prompt-injection and malicious-document tests confirm that listing text,
  pages, and uploads cannot alter approval rules, authorization, or tool scope.
- [ ] Source failure is observable and maps to a safe exception; no adapter
  silently substitutes model knowledge.
- [ ] Privacy notice, research-aid disclaimer, model-provider data-use policy, and
  retention/deletion policy are approved for invited alpha use.

## 3. Supabase Migration And Deployment

- [ ] The production schema is represented by a reviewed, numbered migration
  rather than an untracked SQL-editor-only change.
- [ ] Migration applies cleanly to an empty environment and a production-like
  pre-migration snapshot.
- [ ] Rollback or forward-fix procedure is rehearsed against the same snapshot.
- [ ] `home_buddy_ai_evaluations` retains immutable candidate, input/candidate
  hashes, validator results, independent evaluation, approval decision, versions,
  safe reason codes, status, and timestamps.
- [ ] Browser users cannot insert, update, delete, or forge approval records.
- [ ] RLS tests prove user A cannot read user B's workspace, request, candidate,
  exception, approval, or private result.
- [ ] Service-role credentials exist only in the server environment; OpenAI,
  evaluator, and Supabase privileged keys are absent from browser bundles,
  repository history, logs, and test fixtures.
- [ ] Production `ALLOWED_ORIGIN` is exact; authentication redirects and CORS are
  verified from the deployed origin.
- [ ] Edge Function deployment identifier, code commit, schema/rubric/validator/
  evaluator versions, and environment are recorded in the release evidence.
- [ ] Production secrets are present and scoped: `OPENAI_API_KEY`,
  `OPENAI_MODEL`, `OPENAI_EVALUATOR_MODEL`, exact `ALLOWED_ORIGIN`, and
  `AUTOMATED_APPROVAL_ENABLED=false` at initial deployment.
- [ ] Rate limits, request-size/upload limits, timeouts, idempotency, retry bounds,
  cost limits, and safe error responses are verified.
- [ ] Logs and analytics exclude raw buyer notes, documents, financing limits,
  negotiation limits, tokens, and full model payloads.
- [ ] Backup/restore and deletion/export paths are tested.

## 4. Kill Switch

- [ ] `AUTOMATED_APPROVAL_ENABLED` is server-side, defaults false when missing or
  unreadable, and is checked immediately before every `ready` transition.
- [ ] Turning the switch off prevents new approvals without disabling local
  screening, sign-in, workspace access, or access to unaffected prior briefs.
- [ ] An emergency operator can disable approval without a code deploy; authorized
  operators and escalation contacts are documented.
- [ ] Kill-switch propagation time is measured and meets the release target.
- [ ] Active runs re-check the switch before delivery and fail to a safe
  non-approved state when it changes.
- [ ] Required automatic switch-off/launch-pause triggers include:
  privacy or cross-user exposure; gate bypass; unsupported high-stakes certainty;
  material arithmetic or cross-view drift; source-rights concern; corrupted
  migration; unexplained approval-rate shift; cost runaway; or a material audit
  finding affecting equivalent outputs.
- [ ] Shutdown, buyer notification, affected-result identification, correction,
  and restart authority are rehearsed.
- [ ] Restart requires the original failed control to pass, regression evidence,
  impact review, and a new explicit go decision.

## 5. Golden And End-To-End Pass Conditions

### Golden Suite

- [ ] At least one sanitized Quick Scan and one sanitized Deep Decision Pack
  fixture represent supported Seattle/King County properties.
- [ ] Fixtures include: clean pass, out-of-area, unverified address, missing
  evidence, conflicting evidence, stale evidence, failed calculation, incomplete
  sensitive module, unsupported property, privacy failure, and malformed model
  output.
- [ ] Golden expected results pin schema, rubric, validator, evaluator,
  calculation, coverage-matrix, and approval-policy versions.
- [ ] 100% of pass fixtures approve and 100% of negative fixtures fail to the
  expected safe state across three consecutive clean runs.
- [ ] Candidate hash, independent-evaluator hash, and approval-manifest hash
  reconcile in every run.
- [ ] One-page, detailed, calculation, and share views use the same approved
  values with zero unexplained drift.
- [ ] All quantitative fixtures pass deterministic arithmetic, units, rounding,
  sensitivity, and subject/comp price-per-finished-square-foot checks.
- [ ] No golden output asserts professional certainty or fills missing evidence
  from model memory.

### Deployed End-To-End

- [ ] From the production origin, an invited user can sign in, submit a supported
  property and buyer question, restore progress after reload, and receive a
  private result only after every gate passes.
- [ ] A negative fixture cannot reach `ready`, copy, or sharing.
- [ ] Duplicate clicks/retries are idempotent; delayed or out-of-order responses
  cannot overwrite a newer exception, approval, withdrawal, or correction.
- [ ] Sign-out hides private server artifacts; sign-in restores only the owner's
  records.
- [ ] Expiring/revocable sharing works; sensitive modules are excluded unless
  separately included.
- [ ] Kill-switch-off E2E proves no new result reaches `ready`.
- [ ] Local-first screening, Buyer Search Brief, and debrief continue working
  with backend unavailable, signed out, network interrupted, and approval off.
- [ ] Approved and exception experiences pass mobile, desktop, keyboard,
  screen-reader, and no-color-only checks.
- [ ] Monitoring captures state transitions, gate failures, latency, cost, and
  approval-rate anomalies without private content.

## 6. Post-Delivery Audit

- [ ] Audit owner and backup are named before the first delivery.
- [ ] At least 2 of the first 5 delivered briefs receive a documented
  post-delivery audit.
- [ ] After the first five, sample at least 20% of deliveries until Michael
  explicitly approves a lower rate.
- [ ] Mandatory audits occur for user-reported concerns, corrections, anomalous
  gate/approval metrics, new model/validator/rubric/calculation/coverage versions,
  and any newly supported source or module.
- [ ] Audit verifies property identity, source rights/freshness, claim linkage,
  question coverage, calculations, comp compliance, cross-view consistency,
  professional limits, privacy, and share payload.
- [ ] Findings are classified as material, non-material, or no issue, with owner,
  affected population, containment, correction, buyer communication, and due
  date.
- [ ] A material finding disables equivalent approvals, identifies affected
  briefs, withdraws or corrects them where needed, and triggers a new go/no-go
  decision.
- [ ] Audit results feed regression fixtures and gate changes; operators cannot
  resolve a finding by manually marking a brief approved.

## 7. Rollback And Recovery

- [ ] Previous known-good Edge Function, frontend, migration state, and version
  manifest are identifiable and recoverable.
- [ ] Rollback order is documented: disable approval, stop delivery, preserve
  evidence/audit records, assess scope, roll back code or forward-fix schema,
  verify isolation, then restore only after go approval.
- [ ] Database rollback never deletes buyer records or approval/audit evidence;
  destructive recovery requires separate explicit authorization.
- [ ] Schema changes are backward compatible with the current frontend during the
  rollback window, or the frontend is pinned to a compatible version.
- [ ] Previously delivered briefs can be marked withdrawn without deleting their
  audit history; withdrawn briefs cannot be copied or shared.
- [ ] Buyer-facing safe status and communication templates exist for delay,
  withdrawal, correction, and service suspension.
- [ ] Recovery is rehearsed in staging, including one active run, one approved
  result, one exception, and one share link.
- [ ] Restore requires golden suite, deployed E2E, kill-switch, and incident
  regression checks to pass again.

## 8. Final Go/No-Go Record

The Release Owner records:

- Release date, commit, deployment IDs, migration IDs, and approval-policy
  version.
- Named Engineering, Evaluation/Evidence, Privacy/Security, Audit, and Incident
  owners.
- Links to coverage matrix, rights register, migration rehearsal, golden results,
  E2E results, kill-switch drill, rollback drill, and open risks.
- Alpha invite count and the Seattle/King County residential promise.
- Decision: `GO`, `NO-GO`, or `PAUSED`.
- Explicit rationale, unresolved non-blocking risks, monitoring window, and next
  review date.

`GO` authorizes only invited alpha delivery within the documented coverage. It
does not authorize public launch, expanded geography, unsupported property
types, removal of the kill switch, or a lower evidence/privacy standard.
