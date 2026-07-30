# Automated Approval UI Brief

## Purpose

Integrate fail-closed automated approval into the current local-first MVP without
turning the static screening read into an approved Decision Brief.

This brief applies to the existing listing flow in `app.html` and
`assets/buddy-app.js`:

- Submitting `data-listing-form` continues to create an immediate local screening
  read.
- `data-run-ai-evaluation` becomes the action that requests a private,
  evidence-checked Decision Brief.
- `data-listing-stack` remains the result location.
- Authentication remains required for server analysis.
- Browser storage and local Buyer Search Brief/debrief behavior continue to work
  when Supabase or the analysis endpoint is unavailable.

No client state, model response, or operator action may label a result approved
unless the server returns a passed, versioned approval decision.

## Buyer-Visible Product Distinction

The listing card must clearly separate two artifacts.

### Local Screening Read

Always label the current heuristic output:

> **Local screening read**
>
> A quick fit and diligence prompt based only on what you entered and your Buyer
> Search Brief. It has not checked live sources and is not an approved Decision
> Brief.

The existing recommendation, fit signals, concerns, and rubric sections may
remain underneath this label. The local score must not use a visual treatment
that implies evidence approval.

Primary server action:

> **Create evidence-checked brief**

Supporting text when available:

> Private server analysis checks required evidence and calculations before a
> brief can be delivered.

### Approved Decision Brief

Show the server result only when its approval state is `approved` and all
required gates passed.

Header:

> **Evidence-checked Decision Brief**

Status:

> **Checks passed**

Supporting text:

> Required evidence, calculation, privacy, and coverage checks passed on
> {checked date}. This remains a research aid; verify high-stakes facts with the
> appropriate professionals.

The approved brief renders above the local screening read. The local read remains
available in a collapsed section titled `Earlier local screening read` so the
buyer can distinguish the two and see that approval did not rewrite their local
workspace history.

## Exact Analysis States And Copy

Store one server-analysis object per listing rather than relying on the current
free-text `aiStatus`.

| State | Buyer-visible status | Supporting copy | Primary action |
| --- | --- | --- | --- |
| `local_only` | `Local screening only` | `Sign in and create an evidence-checked brief when you want source-backed analysis.` | `Sign in to continue` |
| `backend_unavailable` | `Evidence checks unavailable` | `The private analysis service is not configured. Your local workspace and screening read still work.` | None |
| `ready_to_submit` | `Ready for evidence checks` | `Your listing will be checked privately against required evidence, calculations, and coverage rules.` | `Create evidence-checked brief` |
| `submitting` | `Sending securely…` | `Creating a private analysis request.` | Disabled `Sending…` |
| `researching` | `Checking the property…` | `Gathering and organizing available listing, market, and diligence evidence.` | Disabled `Analysis in progress` |
| `drafting` | `Building your decision brief…` | `Applying your questions and Buyer Search Brief to the evidence.` | Disabled `Analysis in progress` |
| `validating` | `Running required checks…` | `Verifying coverage, sources, calculations, evidence limits, and privacy before delivery.` | Disabled `Checking brief` |
| `needs_input` | `We need one more detail` | Use the server-provided safe reason, followed by `Your brief will continue after you provide it.` | `Add requested detail` |
| `quality_exception` | `We could not safely approve this brief` | Use the safe exception copy rules below. | `Review what is needed` or `Try checks again` |
| `approved` | `Checks passed` | `Your evidence-checked Decision Brief is ready.` | `View Decision Brief` |
| `failed_retryable` | `Analysis interrupted` | `Your private request was not delivered. Your local screening read is still available.` | `Try again` |
| `failed_final` | `We cannot complete this analysis` | `We could not complete the required checks for this property. No Decision Brief was delivered.` | `View what is needed` |

For asynchronous server work, polling or refresh must restore the same state after
reload. A browser timeout is not evidence that the server failed.

## State Placement In The Current UI

### Listing Section Note

Replace the current `data-ai-backend-state` copy with one of:

- Endpoint absent: `Evidence-checked briefs are not configured. Local screening
  remains available.`
- Endpoint configured, signed out: `Sign in to create a private,
  evidence-checked brief.`
- Endpoint configured, signed in: `Evidence-checked briefs are available for
  Seattle and King County residential properties.`

### Listing Card

Directly after the listing-card header:

1. Render the analysis status panel.
2. If `approved`, render the approved Decision Brief.
3. Render the local screening read in a clearly labeled container.
4. Preserve fit signals, concerns, diligence moves, and debrief beneath the
   artifact they belong to.

Do not replace `review.skillEvaluation` with `listing.aiEvaluation` as the current
code does. They are separate artifacts with different trust levels.

### Progress And Accessibility

- Use a text status in addition to color and animation.
- The status container uses `role="status"` and `aria-live="polite"` for normal
  changes.
- `needs_input`, `quality_exception`, and final failure use `role="alert"` when
  first received.
- Move focus to the exception heading only after a user-initiated request, not on
  background polling.
- Disable duplicate submission while a request is active.
- Preserve readable state and actions at mobile width.

## Fail-Closed Response Contract

The UI may show an approved brief only when the authenticated server response
contains all of:

- Stable `requestId` and `evaluationId`.
- `approvalState: "approved"`.
- `approvalVersion`.
- `approvedAt`.
- `coverage.region: "Seattle/King County"` and `coverage.passed: true`.
- A non-empty array of required gates where every gate has `result: "passed"`.
- Approved evaluation payload and its schema/rubric version.
- Evidence-limit text.
- Checked date or source-freshness timestamp.

The client must treat a missing, unknown, malformed, or contradictory field as
`quality_exception`, never as `approved`.

The server remains authoritative. Local storage may cache a server state for
display, but cannot manufacture, upgrade, or override it. A later server
correction or revocation replaces the cached status and hides the formerly
approved artifact behind a correction notice.

## Exception Behavior

### Safe Buyer-Facing Exception Categories

The server supplies a category and safe message; the client does not display raw
errors, prompts, stack traces, source credentials, or internal gate details.

| Category | Exact default buyer copy | Next action |
| --- | --- | --- |
| `outside_coverage` | `This alpha currently supports residential properties in Seattle and King County. We did not create a Decision Brief for this listing.` | `Keep local screening read` |
| `address_unverified` | `We could not verify the property address well enough to run the required checks.` | `Confirm address` |
| `missing_buyer_input` | `A required buyer detail is missing for the analysis you requested.` | `Add requested detail` |
| `insufficient_evidence` | `The available evidence is not strong enough to approve this Decision Brief.` | `See missing evidence` |
| `conflicting_evidence` | `Important sources disagree, so we did not approve the brief.` | `See the conflict to verify` |
| `stale_evidence` | `Required information is too old to support this decision.` | `Try checks again` |
| `calculation_failed` | `A required calculation did not reconcile, so no Decision Brief was delivered.` | `Try checks again` |
| `sensitive_module_incomplete` | `This financial or negotiation analysis needs complete buyer inputs before it can be shown.` | `Complete private inputs` |
| `unsupported_property` | `This property type is not supported by the alpha approval rules.` | `Keep local screening read` |
| `privacy_check_failed` | `A privacy check prevented delivery. No Decision Brief was shared.` | `Review sharing details` |
| `system_exception` | `A required check could not complete. No Decision Brief was delivered.` | `Try again later` |

An exception panel must:

- State clearly that no approved brief was delivered.
- Preserve the local screening read and all local workspace data.
- Show only remediable requested inputs or verification steps.
- Never invite the buyer to bypass a gate.
- Never downgrade silently from Deep Decision Pack to Quick Scan. A scope change
  requires buyer confirmation.
- Retain the prior request state on refresh.

If a previously approved brief is corrected or revoked, show:

> **This brief has been withdrawn**
>
> A later quality check found an issue that may affect this analysis. Do not rely
> on the earlier brief. We will show a corrected version only after all required
> checks pass again.

The withdrawn brief must not remain copyable or shareable.

## Request Input Changes In The Current MVP

Before enabling automated approval, the listing form requires:

- Listing URL: required.
- Address: required for alpha, even when URL parsing is planned.
- Buyer question: add a required field labeled `What should we especially
  investigate?`
- Decision stage: add a required selector with `Deciding whether to tour`,
  `Investigating`, `Considering an offer`, and `Offer preparation`.
- Analysis level: `Quick Scan` or `Deep Decision Pack`, with concise boundaries.

Buyer Search Brief, budget, and financing inputs remain optional unless a
requested module requires them. The UI must ask only for the missing input rather
than treating all optional workspace fields as approval prerequisites.

Before submission, show:

> Private by default. This is a research aid for Seattle and King County
> residential properties. Unsupported or incomplete analyses stop without
> delivering a Decision Brief.

## Acceptance Criteria

### Artifact Integrity

- A new listing immediately produces the existing local screening read and labels
  it unapproved and source-limited.
- Server analysis never overwrites or masquerades as the local screening read.
- An approved Decision Brief appears only when every required server field and
  gate is present and passed.
- Missing, unknown, failed, or contradictory approval data renders
  `quality_exception`.
- Approved, withdrawn, and local artifacts remain visually and semantically
  distinct after reload.

### State Behavior

- Every state in this brief renders the exact status, supporting copy, and valid
  action.
- Reloading during `researching`, `drafting`, or `validating` restores the server
  state by request ID.
- Repeated clicks cannot create duplicate active requests for the same listing
  and analysis version.
- Retry uses the same request when safe or a server-provided idempotency key.
- A stale response cannot replace a newer approved, exception, withdrawn, or
  corrected state.

### Exceptions And Coverage

- An out-of-area listing cannot reach `approved`.
- An unverified address, failed privacy check, failed calculation, incomplete
  gate set, or insufficient evidence cannot reach `approved`.
- Exception copy never exposes raw backend errors or private diagnostics.
- Corrected inputs rerun all versioned gates; no client action directly changes
  an exception to approved.
- A withdrawn brief loses copy/share actions immediately and shows the withdrawal
  warning.

### Privacy And Professional Limits

- Server actions are disabled until the user is authenticated.
- One user cannot retrieve another user's request, state, exception, or result.
- Sensitive finance and negotiation modules remain excluded from shared views
  unless separately included by the buyer.
- Every approved brief displays checked date, evidence limits, and research-aid
  language.
- No status or recommendation implies appraisal, inspection, legal, title,
  financing, tax, insurance, or future-market certainty.

### Local-First Resilience

- With no Supabase configuration, no analysis endpoint, network loss, sign-out,
  or server exception, local workspace, screening, Buyer Search Brief, and tour
  debrief functions continue to work.
- Server failure never deletes an earlier local or approved result.
- Signing out hides private server artifacts from the active UI while retaining
  only the minimum local reference needed to restore them after authentication.

### Usability And Verification

- A buyer can distinguish local screening from an approved Decision Brief without
  opening explanatory help.
- Progress, exception, approval, and withdrawal states are usable with keyboard
  and screen reader and do not rely on color.
- The listing flow is verified at desktop and mobile widths.
- Tests cover every state, malformed approval responses, out-of-order responses,
  retry/idempotency, reload restoration, cross-user isolation, and local-only
  fallback.

## Implementation Boundary

This is a UI integration contract, not approval to weaken the canonical product
rules. The existing Edge Function currently returns an evaluation directly and
does not expose the full state/gate contract above. The UI must not simulate
approval until the backend supplies authoritative request states and versioned
gate results.
