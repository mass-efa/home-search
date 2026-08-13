# Home Search Service Roadmap

This repo is currently a public static workflow for publishing buyer-oriented home evaluation briefs. To turn it into a service that other people can use, the product should evolve in small steps instead of jumping straight to a full marketplace or real-estate platform.

## Product Thesis

Help serious home buyers turn a listing URL or address into a decision-ready diligence brief that separates:

- What is known from what needs verification.
- Reasons to pursue from reasons to pause.
- Offer strategy from inspection, title, financing, and lifestyle risk.
- Public listing facts from buyer-private notes.

The service should feel like a practical second brain for home buying, not a generic listing search engine.

## Recommended First Public Service

Build a hosted request-and-review service:

1. A user submits a listing URL, address, and buyer priorities.
2. The service creates a private evaluation request.
3. An AI-backed analysis job drafts a structured brief using the home-evaluation rubric.
4. The immutable draft passes deterministic release gates and an independent
   evaluator; passing private results release immediately, while exceptions enter
   human investigation.
5. The user gets a shareable private link, with optional public publication later.

This is the best first service because it preserves the value of the current repo while solving the biggest public-use gaps: privacy, direct submission, durable status, and repeatability.

## Service Levels

### V0: Public Prototype

Current state:

- Static GitHub Pages site.
- Public request form.
- GitHub Issues as queue.
- Manual or Codex-assisted evaluation.
- Static HTML briefs under `homes/`.

Good for validating the workflow. Not enough for real public users because requests are public, submission still depends on GitHub, and evaluation generation is manual.

### V1: Hosted Intake Service

Goal: make the current workflow usable by people who do not know or care about GitHub.

Core features:

- Direct submission endpoint.
- Private request records.
- Request status page.
- Email notification when a brief is ready.
- Admin/reviewer view for queued requests.
- Static or server-rendered brief pages.

Recommended implementation:

- Keep the static marketing and public examples on GitHub Pages for now.
- Deploy the existing Worker or a small backend API for direct submissions.
- Store requests in a real database instead of GitHub Issues.
- Keep GitHub Issues only as an internal fallback or engineering queue.

Minimum data model:

- `users`: email, auth provider, created time.
- `evaluation_requests`: user id, listing URL, address, priorities, privacy setting, status, created time.
- `evaluation_drafts`: request id, model output, reviewer notes, source links, risk flags.
- `published_briefs`: request id, slug, visibility, published time.

### V2: AI-Assisted Evaluation Pipeline

Goal: reduce manual work while keeping a fail-closed automated release gate and
asynchronous human quality audit.

Core features:

- Analysis job runner.
- Structured output matching the rubric.
- Source capture with dates.
- Confidence and missing-data flags.
- Immediate private delivery after complete gate and evaluator pass.
- Human exception handling and risk-weighted post-delivery audit.
- Regeneration or targeted revision flow.

The first automation may release only to the authorized buyer after the complete
Decision Pack Contract passes. It must never auto-publish publicly. Stale,
gated, conflicting, or inadequate data fails closed to an exception or a
bounded unknown.

### V3: Multi-User Product

Goal: make this useful as a repeated buyer workflow.

Core features:

- User accounts.
- Saved homes.
- Side-by-side comparison.
- Buyer criteria profile.
- Private notes.
- Agent/lender/partner sharing.
- Offer-readiness checklist.
- Paid plans or credits.

## Recommended Technical Direction

### Short Term

Use the current repo as the public shell:

- Keep `index.html`, `submit.html`, `requests.html`, and example briefs.
- Deploy `worker/github-issue-worker.js` or replace it with a hosted API.
- Update `assets/config.js` with the deployed endpoint.
- Add basic rate limiting and spam controls before broad sharing.

This can make the site usable quickly, but it should still be treated as a public prototype.

### Production Direction

Move toward a small full-stack app:

- Frontend: Next.js or Remix.
- Backend/API: same app runtime or Cloudflare Workers.
- Database: Supabase Postgres, Neon Postgres, or Cloudflare D1.
- Auth: Clerk, Supabase Auth, Auth.js, or magic-link email.
- Jobs: GitHub Actions for early internal runs, then Trigger.dev, Inngest, Cloudflare Queues, or a small worker.
- AI: OpenAI API with structured outputs and a review workflow.
- Hosting: Vercel, Cloudflare Pages/Workers, or Render/Fly for a simple full-stack deployment.

For this product, Postgres is a better default than GitHub Issues once real users arrive. The object model is straightforward, and user privacy matters.

## Privacy And Trust Requirements

Before inviting public users, the service needs:

- Clear notice that briefs are research aids, not appraisal, inspection, legal, financing, or tax advice.
- Private-by-default evaluations.
- Explicit user action before making a brief public.
- A policy for handling addresses, buyer notes, financing constraints, and negotiation limits.
- A deletion/export path for user data.
- Source timestamps on every brief.
- Fail-closed automated gates plus an independent evaluator before private
  delivery, with human exception handling and asynchronous audit.

## Monetization Options

Practical early options:

- Free sample brief plus paid detailed evaluations.
- Credit-based pricing per home.
- Subscription for active buyers comparing multiple homes.
- Agent-assisted package for buyers who want shareable diligence briefs.

Avoid starting with ads or lead generation. Trust is the product.

## First Milestone

Ship V1 as a private-request service:

1. Pick hosting and database.
2. Replace public GitHub issue submission with private request storage.
3. Add request status states: `submitted`, `in_analysis`, `needs_buyer_input`,
   `in_review` (exceptions only), `ready`, `delivered`, `closed`, `cancelled`.
4. Add an admin queue.
5. Generate an immutable candidate from the existing rubric and run the complete
   release contract.
6. Send a ready notification.
7. Let the user view a private brief link.

For the buyer-facing MVP shape, see [mvp-spec.md](mvp-spec.md).

## Current MVP Execution Decision

Do not wait for a permanent product name or custom domain to validate the private buyer loop. Use **Homei** only as a reversible working UI name during controlled testing; retain neutral repository, database, and infrastructure names until naming and trademark review are complete.

The immediate release is a controlled private cohort, not an open public launch. GitHub Pages may remain the temporary public shell, while authenticated requests, buyer notes, files, evaluations, and released results remain in private application storage.

### P0: Controlled Buyer Journey

Ship and verify in this order:

1. Confirm one production request in each of `pre_tour`, `post_tour`, and
   `pre_offer` can travel through the four-step intake, authentication,
   evaluation, gate-driven release, and buyer result without manual database
   repair or a routine reviewer wait.
2. Preserve intake work through authentication failures, refreshes, and browser changes.
3. Support document intake and an evidence-aware revision path without overwriting the original released result.
4. Make the result decision-first on phone and desktop, with traceable evidence, unknowns, checked dates, and no more than three prominent next actions.
5. Add privacy-safe funnel and failure instrumentation defined in `mvp-spec.md`.
6. Run at least three controlled property cases—one per decision stage—including
   an unparseable or incomplete listing and a case that correctly requires buyer
   input. Verify stage-specific module suppression, preference freshness, and
   active schools/safety evidence.
7. Invite 3–5 real buyers with a named concierge/support owner and collect a short debrief after result open.

Resend is the selected production authentication-email provider and
`tryhomei.us` is the registered controlled-MVP domain. The
`auth.tryhomei.us` Resend/Supabase SMTP integration reached **Ready to Send** on
August 13, 2026. External-recipient magic-link delivery and signed-in return to
Homei were verified the same day. Custom-domain email is not a blocker for
implementation or controlled tests with provisioned project-team recipients,
but it is required before inviting external buyers. If built-in email throttling
interferes before activation, preserve the request and use an explicit concierge
recovery path rather than weakening authentication.

P0 accepts photos and page-stable documents as buyer evidence. Structured typed
debrief is also P0. Audio capture/transcription is P1; video upload and analysis
are P2. Product copy must not promise video before its evidence, privacy,
retention, and cost contract exists.

### Expansion Gate

Do not broaden invitations until:

- No cross-user or public-data exposure is found.
- Submission and result-open recovery work on mobile.
- At least 80% of completed controlled-cohort results are opened.
- Three buyers report new insight or increased confidence.
- Operational owners can identify and resolve `needs input`, evaluation failure, reviewer backlog, and delivery failure states.

After that gate, choose the smallest next investment supported by observed behavior: document revisions and follow-ups, repeat-listing history, tour debrief, or Buyer Search Brief refinement. Domain selection, permanent branding, broad SMTP delivery, payments, and public acquisition should follow demonstrated repeat value rather than precede it.

## Immediate Next Actions

1. Freeze the exact candidate in a reviewed commit and record the production
   migration/function identifiers below.
2. Complete the remaining three-stage production-origin walkthroughs, including
   the lost-draft/auth-return and responsive mobile paths.
3. Implement the recovery contract and privacy-safe measurement contract in
   `mvp-spec.md`, then verify duplicate-submit and notification behavior live.
4. Test three controlled properties through automated approval and reviewer
   exception paths while both release switches remain disabled by default.
5. Prepare a concierge-supported invitation and debrief for 3–5 real buyers,
   then ask Michael for the separate named-cohort go decision.
6. Keep GitHub Pages as the temporary shell and private-by-default Supabase
   storage as the product system of record. Monitor delivery failures and
   throttling through Resend and Supabase as the controlled cohort expands.

## MVP Execution Checkpoint

### Release authorization ladder

Passing a technical gate authorizes a result version, not a broader rollout.
Each phase below requires a separate product go decision; success in one phase
does not implicitly enable the next.

| Phase | Authorized users | Release behavior | Hard go decision |
| --- | --- | --- | --- |
| Internal production validation | Michael and explicitly designated internal test accounts only | Exercise the production gate/release path with controlled properties; no external invitation | Exact candidate is frozen; migrations and versions are recorded; tests pass; one pass and one fail-closed exception are demonstrated; privacy isolation, kill switch, and withdrawal work |
| First-five invite rollout | At most five individually invited, provisioned buyers | Passing private results release immediately; humans own support/exceptions; every release is audited asynchronously | All Wave 3 gates pass; Michael explicitly authorizes the named cohort; owners and incident procedures are active |
| Later automated-release expansion | Additional private-beta buyers within an explicit access policy | Routine gate-driven private release with risk-weighted audit; no public auto-publication | First-five go/change/stop review passes; no critical incident is open; defect, comprehension, value, support, cost, and delivery evidence supports expansion |

The phrase **automated approval** refers only to the internal release contract:
deterministic gates, independent evaluator pass, and signed manifest. It never
means public publication, unrestricted signup, removal of fail-closed controls,
or automatic authorization to expand the cohort.

At every phase, a policy-owner kill switch must be able to pause all releases or
one implicated module/source adapter without losing submitted requests. A
withdrawn result must stop serving immediately, retain its immutable audit
record, show the buyer a correction state, and require a new version to rerun
the complete release contract.

### Wave 1: Foundations established

- Chosen Homei working headline and private decision-support posture.
- Canonical `pre_tour`, `post_tour`, and `pre_offer` product contracts, direct
  recommendation vocabularies, and legacy-stage migration rules.
- Four-step `Home` → `Decision` → `Evidence` → `Review and send` intake contract.
- Fail-closed deterministic gates, independent evaluator, immediate private
  delivery, human exception handling, and asynchronous audit policy.
- Preference freshness/precedence, post-tour synthesis, media phasing, and
  schools/safety evidence contracts.

These are product and operating foundations. They do not count as implemented
until the buyer-facing application, persisted values, API payloads, release
states, fixtures, and analytics conform.

### Wave 2: Walkthrough gate

Before Michael's walkthrough:

1. The UI and API use only the three canonical stage values; legacy values are
   handled only at a migration boundary.
2. Step 4 visibly reconciles the selected stage, direct recommendation set,
   current-request priorities, confirmed preference version, evidence/files,
   bounded modules, privacy/limits, and final action.
3. The normal buyer path is `Request received` → `Researching` → `Decision
   packet ready`, with immediate gated delivery and no approval/reviewer copy.
4. Stale or conflicting material preferences require explicit confirmation or
   exclusion; current-request priorities win.
5. The file picker enforces exact caps of 2/3/5 by stage and 20 MB per supported
   file before staging.
6. Post-tour prompts and output preserve better/worse reactions, observations
   versus interpretations, partner disagreement, open questions,
   recommendation delta, and confirmable preference suggestions.
7. Voice is hidden or clearly experimental/P1 unless correction, consent,
   retention, and synthesis acceptance criteria pass.

Walkthrough acceptance requires one desktop and 390-pixel mobile run per stage,
one gate-passing immediate release, one exception needing buyer input, no lost
draft through authentication, and no buyer-visible internal approval terms.

### Wave 3: Controlled-cohort gate

- Active official-source schools and safety adapters with explicit gaps.
- Three stage fixtures plus unparseable listing, stale preference, over-cap
  media, duplicate submit, and exception/correction cases.
- Privacy-safe central event reconstruction from intake through result open and
  asynchronous audit.
- Notification, cross-device return, withdrawal/correction, and concierge
  incident procedures verified.
- First-five invitation and structured learning loop ready.

Only after Wave 3 passes should external controlled-cohort invitations begin.

### Internal production validation record — 2026-08-13

Current decision: **internal production validation remains in progress. The
trust and fail-closed backend path has passed; external first-five invitations
remain no-go.**

| Workstream | Status | Evidence from this validation | Remaining gate |
| --- | --- | --- | --- |
| Product / release | In progress | Release authorization ladder and 100% first-five audit rule recorded; automatic release remains off | Freeze/version the candidate, name cohort/owners, and obtain Michael's explicit go |
| Data / security | Passed for tested scope | Forward migrations `202608130004`, `202608130005`, and least-privilege hotfix `202608130006`; four legacy requests canonicalized; constraints validated; storage private at 20 MB; release control `false / 0 / 0` | Rehearse empty-environment migration and backup/forward-fix procedure |
| Backend / evaluation | Passed for fail-closed scope | `evaluate-home` production version 11, platform JWT verification on, exact production CORS, environment release gate pinned false; one synthetic pre-tour request ended `needs_buyer_input` with no release | Produce one supported gate-passing fixture per stage; verify duplicate retry and notification |
| Privacy / auth | Passed for tested scope | Two disposable users saw only their own rows; direct preference insert returned 403; cross-user function call returned 404; 23h59m session passed and 24h01m session lost private reads and received `reauthentication_required` | Repeat through the production UI and document shared-device browser-storage decision |
| Operations | Passed for control mechanics | Database kill switch rejected automatic release; rollback-only manual-result withdrawal changed result/request state and wrote the audit event; disposable users and token were removed | Verify correction notification and measure operational propagation/response time |
| Frontend / design | Published; authenticated return pending | GitHub Pages build `1149722023` published merge `3bff2a0`; 390-pixel production Chrome advanced all three stages through Step 4 without horizontal overflow; 64 automated tests plus 17 golden approval cases pass | Run production-origin authenticated return on mobile and desktop and verify no lost draft |

No production buyer record was altered by the validation. Synthetic records
were owned by disposable users and were removed through auth-user cascade after
the tests. The one-hour deployment token was revoked immediately after use.
