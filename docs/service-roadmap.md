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
4. The draft enters a review state before publication or sharing.
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

Goal: reduce manual work while keeping a review gate.

Core features:

- Analysis job runner.
- Structured output matching the rubric.
- Source capture with dates.
- Confidence and missing-data flags.
- Reviewer approval before user delivery.
- Regeneration or targeted revision flow.

The first automation should draft, not auto-publish. Home buying is too high-stakes for unsupervised publication, especially when listing data can be stale, gated, or wrong.

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
- Human review before any high-confidence recommendation is delivered as final.

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
3. Add request status states: `queued`, `drafting`, `review`, `ready`, `published`, `cancelled`.
4. Add an admin queue.
5. Generate a reviewable draft from the existing rubric.
6. Send a ready notification.
7. Let the user view a private brief link.

For the buyer-facing MVP shape, see [mvp-spec.md](mvp-spec.md).

## Current MVP Execution Decision

Do not wait for a permanent product name or custom domain to validate the private buyer loop. Use **Homei** only as a reversible working UI name during controlled testing; retain neutral repository, database, and infrastructure names until naming and trademark review are complete.

The immediate release is a controlled private cohort, not an open public launch. GitHub Pages may remain the temporary public shell, while authenticated requests, buyer notes, files, evaluations, and released results remain in private application storage.

### P0: Controlled Buyer Journey

Ship and verify in this order:

1. Confirm one production request can travel from buyer submission through authentication, evaluation, reviewer decision, release, and buyer result without manual database repair.
2. Preserve intake work through authentication failures, refreshes, and browser changes.
3. Support document intake and an evidence-aware revision path without overwriting the original released result.
4. Make the result decision-first on phone and desktop, with traceable evidence, unknowns, checked dates, and no more than three prominent next actions.
5. Add privacy-safe funnel and failure instrumentation defined in `mvp-spec.md`.
6. Run at least three controlled property cases, including an unparseable or incomplete listing and a case that correctly requires buyer input.
7. Invite 3–5 real buyers with a named concierge/support owner and collect a short debrief after result open.

Custom-domain authentication email is desirable before expanding the cohort, but it is not a blocker for implementation or controlled tests with provisioned recipients. If built-in email throttling interferes, preserve the request and use an explicit concierge recovery path rather than weakening authentication.

### Expansion Gate

Do not broaden invitations until:

- No cross-user or public-data exposure is found.
- Submission and result-open recovery work on mobile.
- At least 80% of completed controlled-cohort results are opened.
- Three buyers report new insight or increased confidence.
- Operational owners can identify and resolve `needs input`, evaluation failure, reviewer backlog, and delivery failure states.

After that gate, choose the smallest next investment supported by observed behavior: document revisions and follow-ups, repeat-listing history, tour debrief, or Buyer Search Brief refinement. Domain selection, permanent branding, broad SMTP delivery, payments, and public acquisition should follow demonstrated repeat value rather than precede it.

## Immediate Next Actions

1. Complete the P0 controlled buyer journey and verify it on desktop and mobile.
2. Implement the recovery contract and privacy-safe measurement contract in `mvp-spec.md`.
3. Test three controlled properties through automated approval and reviewer exception paths.
4. Prepare a concierge-supported invitation and debrief for 3–5 real buyers.
5. Keep GitHub Pages as the temporary shell and private-by-default Supabase storage as the product system of record.
6. Select a permanent name, domain, and custom SMTP provider before expanding beyond the controlled cohort.
