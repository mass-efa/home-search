# Home-Finding Buddy MVP Spec

## MVP Principle

The MVP must be usable by a real buyer from the first session.

That means the product should not start as an admin tool, a static demo, or a fully automated research engine. It should start with the buyer's immediate job: turn a listing they are considering into a decision-ready review. Behind the scenes, some analysis can be manual or semi-manual at first, but the user experience should feel coherent and useful.

The acquisition promise and retention promise are related but distinct:

- Acquire with a decision packet for one home.
- Retain with a private home-buying second brain that learns from listings, tours, and changing preferences.

The Buyer Search Brief makes future reviews better, but it must not block a buyer from submitting their first home.

## Target User

Primary early user:

- A serious home buyer who is actively browsing listings, touring homes, and trying to understand what they actually want.

Secondary early user:

- A partner, spouse, or collaborator who needs to align on tradeoffs.

Optional collaborator:

- A human real estate agent, lender, inspector, or advisor who can receive a clean buyer/search brief.

## Core Product Promise

Primary headline:

> **Know what matters before you tour, offer, or walk away.**

Supporting promise:

> Share a listing, what you care about, and any documents you have. Homei turns them into a source-backed decision packet built around your priorities.

Use **Homei** as the reversible working product name during private testing. The
headline is the acquisition promise; “a private home-buying second brain” is the
retention promise. Do not describe the product as knowing everything about a
home or as replacing an agent, inspector, appraiser, lender, title professional,
attorney, insurance professional, or tax advisor.

Homei helps buyers:

- Learn what they actually want.
- Avoid wasting tours on poor-fit homes.
- Review listings against their real preferences.
- Capture messy tour reactions through voice or text.
- Turn each listing/tour into a sharper Buyer Search Brief.

## Three Decision Stages

Every request has exactly one buyer-visible stage. The stage determines the
question, direct recommendation vocabulary, evidence freshness, output modules,
and next action.

### Pre-tour: Is this worth my time?

- **Direct recommendation:** `tour`, `skip`, `watch`, or `investigate`.
- **Core output:** fit, likely disappointment points, price context, material
  location/property unknowns, tour checklist, and agent questions.
- **Bounded modules:** valuation is directional; offer ceiling, personalized
  affordability, and negotiation ladder are suppressed.

### Post-tour: What did we learn?

- **Direct recommendation:** `revisit`, `pause`, `pursue`, or `investigate`.
- **Core output:** what felt better/worse, observations versus interpretations,
  unresolved questions, partner agreement/disagreement, recommendation change,
  and proposed preference updates.
- **Bounded modules:** tour observations are buyer-supplied evidence, not
  verified property facts; preference changes require confirmation.

Post-tour intake must capture, with text as the P0 baseline:

- Gut reaction and current decision inclination.
- What felt better and worse than expected.
- Buyer-observed physical facts, kept separate from interpretations.
- Partner reactions and unresolved agreement/disagreement.
- New concerns, questions, and evidence to request.
- Whether the tour changed the importance of any preference.

Its result must retain this structure, show the change from any pre-tour
recommendation, and ask the buyer to accept or reject each preference change.

### Pre-offer: What should I verify, value, and protect?

- **Direct recommendation:** `pursue`, `pause`, `investigate`, or `offer-prep`.
- **Core output:** deeper comps/value context, document findings, condition and
  records risks, ownership economics when requested, and a deadline-aware
  diligence plan.
- **Bounded modules:** numeric offer guidance, affordability, renovation,
  negotiation, and cost-of-waiting appear only when their decision-pack gates
  pass. Missing evidence suppresses the conclusion, not the topic.

### Migration From Previous Stages

The prior values `researching`, `considering a tour`, `considering an offer`,
`preparing an offer`, and `under contract` are no longer presented to buyers.
Map stored requests as follows:

- `researching` and `considering a tour` → `pre_tour`
- `considering an offer` → `post_tour` when a tour/debrief exists; otherwise
  `pre_offer`
- `preparing an offer` and `under contract` → `pre_offer`, retaining the more
  specific legacy state as internal context

Ambiguous historical requests must ask the buyer to confirm their stage before
generating a new version. Migration never changes an already released result.

## First-Time User Experience

The default intake is a four-step, listing-first flow:

1. **Home:** paste a Redfin/other listing URL or enter an address.
2. **Decision:** choose `Pre-tour`, `Post-tour`, or `Pre-offer` and describe what
   matters now, using suggested topics plus free text or voice-shaped text.
3. **Evidence:** optionally add disclosures, inspection/tour reports, and photos.
   Photos are supported now; video is explicitly later. Never imply that an
   uploaded image establishes a professional condition finding.
4. **Review and send:** review the saved inputs, sign in if needed, accept the
   research-aid/privacy framing, and submit one idempotent request.

After submission, show a durable request state and deliver the decision-first
result immediately when every automated release gate passes. A routine reviewer
wait is not part of the buyer journey.

Stage media caps are exact and apply to the total files on the initial request:

- `pre_tour`: 2 files.
- `post_tour`: 3 files.
- `pre_offer`: 5 files.
- Every file: PDF, JPEG, PNG, or WebP; maximum 20 MB.

The UI must show the applicable cap before file selection, prevent over-cap
staging, and preserve a recoverable draft if upload fails. Video is not an
accepted file type.

The interface should preserve work before sign-in and should not ask for information that is not yet needed. Privacy, evidence limits, and the expected result should be clear at the point of submission.

### Optional Search Context

The buyer can add household and search context before or after the first request. It should improve the analysis without feeling like an onboarding requirement.

Useful fields:

- Buyer name or household name.
- Search area, if known.
- Budget range, if comfortable sharing.
- Timeline.
- Whether they are working with a human agent.

The product should make privacy explicit:

- The workspace is private by default.
- Listing reviews and notes are not public.
- Sharing with an agent or partner is optional.

### Optional Guided Buyer Conversation

After the buyer submits or receives value from a first review, the product should invite them to sharpen future recommendations through a conversational experience, not a mortgage-style form.

The product asks about:

- Current life and daily rhythms.
- Future life they are buying for.
- Commute and routine.
- Noise, privacy, hosting, walkability, schools, pets, work-from-home, guests.
- Renovation and maintenance tolerance.
- Emotional reactions to homes they have already seen.
- Dealbreakers and false positives.
- Financial stress boundaries.

The user can answer by typing in P0. Voice is especially valuable because the
buyer can talk naturally with a partner, but capture/transcription is
experimental and P1 until consent, correction, retention, and structured
synthesis are verified. If an experimental control remains visible during P0,
it must be labeled accordingly and typed input remains complete.

### Generate Buyer Search Brief

After the guided conversation, the product creates a structured brief.

Sections:

- Search thesis.
- Must-haves.
- Strong preferences.
- Nice-to-haves.
- Dealbreakers.
- Tradeoffs to watch.
- Hidden risk sensitivity.
- Partner alignment / disagreement notes, if relevant.
- Diligence checklist.
- What to ask a human agent.
- What the product should pay special attention to in future listing reviews.

Second-brain aha moment:

> "This says what we want better than we could."

The brief is an accelerator for repeated use, not a prerequisite for the first listing review.

### Preference Freshness

Every preference stores importance, source, confidence, scope, household
agreement state, created date, last-confirmed date, and superseded value when it
changes. Request-specific priorities govern that request.

- Ask “Still right?” only for material preferences that are older than 30 days,
  conflict with the current request, follow three tours, or follow a material
  budget/location/timeline change.
- Tour- or model-derived changes remain suggestions until accepted.
- Stale preferences may inform a question but may not silently control a
  high-impact recommendation.
- Every buyer-fit judgment must link to the active preference version that
  supports it.

“Confirmed” is an explicit buyer action, never inferred from generation,
submission, authentication, or passive display. When confirmation is required,
the buyer may confirm/edit the material preference or exclude it from this
analysis. The request cannot relabel an old version as buyer-confirmed.

Precedence is authoritative:

1. Current-request priority or correction.
2. Explicitly confirmed active preference version.
3. Older preference as question context only.
4. Model- or tour-inferred preference as an unconfirmed suggestion only.

## Activation Funnel

The immediate release should optimize this sequence:

1. Landing or app entry viewed.
2. Listing URL entered.
3. Request flow started.
4. Decision stage selected.
5. Buyer priorities provided.
6. Optional documents added.
7. Sign-in completed.
8. First request submitted.
9. Result completed.
10. Result opened.

The primary activation metric is:

> Percentage of qualified visitors who submit a first real listing and open the completed result.

Supporting activation metrics:

- Listing URL entry rate.
- Completion rate at each request step.
- Time to first request.
- Sign-in completion rate.
- Request-to-result completion time.
- Result open rate.

Instrument events for every funnel step before materially expanding the feature set.

### Immediate User-Test Cohort

The first external cohort should be deliberately small: 3–5 active buyers with a real listing decision in the next 30 days. Each tester receives a direct invitation, a one-sentence explanation of the research-aid boundary, and one concrete task: submit a home they are genuinely considering and return to read the completed decision brief.

The tester should not need to understand GitHub, Supabase, AI models, prompts, review queues, or the distinction between automated and concierge research. A tester invitation is successful when the buyer can:

1. Open the product on a phone.
2. Understand the promise before signing in.
3. Paste a listing and describe what matters.
4. Recover from an authentication or submission problem without losing work.
5. Recognize that the request was accepted and know when to return.
6. Open the finished result and identify a next action.

For each tester, capture a short qualitative debrief within 48 hours of result open:

- What decision were you trying to make?
- What did the brief reveal or confirm?
- What did you distrust, misunderstand, or have to work around?
- Would you submit another home, and would you pay $10–$15 for the same depth?

## Recurring Product Loop

### 1. Add Listing

Buyer pastes a listing URL or address.

The product creates a listing record with:

- URL.
- Address.
- Asking price.
- Known status.
- Buyer notes.
- Optional screenshots/uploads later.

For the MVP, listing ingestion can be lightweight. It does not need full MLS integration on day one.

### 2. Get Fit And Risk Review

The review combines:

- Base home-evaluation rubric.
- Buyer Search Brief.
- Prior listing/tour feedback.
- User-provided listing details.
- Manual or semi-manual research, if needed.

Output:

- Tour / skip / watch / investigate recommendation.
- Fit score with explanation.
- Why it matches the buyer.
- Why it may disappoint the buyer.
- Hidden diligence risks.
- Questions for the human agent or listing side.
- What to inspect during tour.
- What would change the recommendation.

Second aha moment:

> "It helped us avoid a bad tour or notice a hidden issue before getting emotionally attached."

## Result Experience

Every completed review should have a dedicated result view. The first screen must answer four questions within seconds:

1. What is the recommendation?
2. Why?
3. What are the largest risks or unknowns?
4. What should the buyer do next?

Use this hierarchy:

1. Decision summary: tour, investigate, pursue, pause, or another stage-appropriate recommendation.
2. Three strongest reasons supporting the recommendation.
3. Three largest risks or unknowns.
4. Questions or facts that could change the recommendation.
5. Detailed diligence sections with evidence.
6. Sources and checked dates.
7. Next actions: ask a follow-up, add a document, share privately, compare another home, or debrief after touring.

Detailed Barrett-style analysis remains a core output, but it belongs beneath this executive decision layer. Facts, assumptions, buyer-specific fit, risks, and unknowns must remain visibly distinct.

### Result Comprehension Standard

The result must be scannable before it is exhaustive. On both phone and desktop, the initial viewport should identify the property, recommendation, recommendation strength or evidence limitation, and primary next action. The buyer should not have to interpret an internal gate, model status, or research workflow.

Acceptance criteria:

- The recommendation uses stage-appropriate language and is never presented as professional legal, inspection, appraisal, financing, or tax advice.
- Each top reason and risk links or scrolls to the supporting evidence when evidence exists.
- Missing evidence is labeled as an unknown, not converted into a negative fact.
- Sources show a human-readable publisher, link, and checked date.
- The result states what would change the recommendation.
- The next-action area offers no more than three prominent choices, ordered by likely usefulness.
- Adding a document or asking a follow-up preserves the original released result and creates an auditable revision.

### Provisional Brand Presentation

Use **Homei** as a reversible working presentation name during private MVP testing, paired with a descriptive line such as **“Know the home before you buy it.”** This is not a permanent company or domain decision and must not trigger repository, database, package, or infrastructure renaming.

Brand application rules for this phase:

- Keep the experience warm, calm, plainspoken, and confidence-building rather than playful or cartoonish.
- Use “your home-buying research partner” to explain the product on first encounter; do not rely on the name alone.
- Keep the working name in one configurable UI location so it can be replaced after naming and trademark review.
- `tryhomei.us` is the registered controlled-MVP domain, pending naming review.
  Authentication email should use `Homei <login@auth.tryhomei.us>` after Resend
  verification.
- Do not publish claims implying brokerage, agency, inspection, appraisal, or fiduciary services.

### 3. Voice Tour Debrief

After a tour, the buyer taps `Debrief this home`.

Voice prompts:

- Gut reaction?
- What felt better than expected?
- What felt worse?
- What did your partner react to?
- What would make you hesitate to offer?
- Would you be excited to see it again tomorrow?
- Did this change what you think matters?

Output:

- Tour summary.
- Updated fit score.
- Liked / disliked / unresolved.
- New risks or questions.
- Profile updates suggested.
- Recommendation: skip, watch, revisit, pursue, or offer-prep.

Voice synthesis must retain the original transcript, speaker and confidence
information when available, notable exact statements, and a buyer-editable
structured summary. The summary separates reactions, physical observations,
interpretations, unresolved questions, partner agreement/disagreement,
preference suggestions, and recommendation implications. “I saw moisture” may
not become “the home has a moisture problem.” Material preference, budget, or
recommendation changes require buyer confirmation.

P0 accepts typed or pasted debriefs using this structure. Audio capture and
transcription are P1. Video intake and analysis are P2; the P0 UI must not
promise video support.

Third aha moment:

> "It learned from our reaction and made the next review sharper."

### 4. Update Buyer Search Brief

The product suggests profile changes after each listing or tour:

- "Increase priority of quiet private outdoor space."
- "Move main-level gathering space from nice-to-have to strong preference."
- "Add busy-road feel as a dealbreaker."
- "Lower appetite for older-home system risk."

The buyer approves or rejects profile updates.

## MVP Screens

### Listing Request

The primary first-time screen.

Must support:

- Listing URL as the dominant entry point.
- Decision-stage selection.
- Suggested investigation topics plus free-form priorities.
- Optional document upload affordance.
- Progressive disclosure and saved in-progress answers.
- Sign-in at submission rather than before value is clear.
- Clear privacy and research-aid framing.
- The four visible steps are `Home`, `Decision`, `Evidence`, and `Review and
  send`; authentication is part of the final step, not a fifth conceptual task.
- Photo upload with per-file state and removal before submission.
- Clear “Video support is coming later” copy wherever video could reasonably be
  expected.

Step 4 must visibly reconcile:

- Home identity and listing URL.
- Exactly one canonical stage: `pre_tour`, `post_tour`, or `pre_offer`.
- The stage-specific direct recommendation set and expected output.
- Current-request priorities and the saved preference version/status being used.
- Selected filenames, file count, allowed cap, and optional notes.
- Included research modules and conclusions that are explicitly suppressed.
- Private-by-default, research-aid, file-processing, and professional-boundary
  notices.
- One final stage-specific submit action.

The buyer must be able to edit each input category without losing other work.
The review states that the request is saved, passing results release immediately
after automated checks, and an exception may instead ask for one specific input.

### Request Status

Created immediately after submission.

Shows human-readable progress such as:

- Gathering property facts.
- Reviewing price and comparable sales.
- Checking records and location risks.
- Matching the home to buyer priorities.
- Preparing the decision brief.

The user should know that the request succeeded, what happens next, and how they will learn that it is ready.

Do not imply continuously changing progress when the system only knows a durable state. Prefer honest state labels with an updated time and expected next step. A request that needs buyer input must explain exactly what is missing and provide a direct way to supply it.

The canonical happy path is:

`Request received` → `Researching` → `Decision packet ready`

There is no buyer-visible routine review step, approval state, or invented
percentage. `We’re resolving an evidence issue` appears only after a gate or the
independent evaluator creates an exception. Internal terms including
`auto_approved`, validator, evaluator, approval, and review queue are never the
primary buyer message.

### Listing Result

Shows:

- Decision summary.
- Strongest reasons.
- Largest risks and unknowns.
- Recommendation-changing questions.
- Detailed diligence and evidence.
- Sources and checked dates.
- Follow-up and next-step actions.

### Buyer Home

This becomes the primary returning-user screen after the buyer has submitted a request.

Shows:

- Homes requiring attention.
- New or completed results.
- Decision deadlines, when known.
- Recent tour reactions.
- Current Buyer Search Brief summary.
- Next suggested action.

Primary actions:

- Add listing.
- Start voice debrief.
- Continue buyer conversation.
- Share brief.

### Buyer Conversation

Chat/voice interface for preference discovery.

Must support:

- Text input.
- Voice input.
- Save/resume.
- "Generate or update brief" action.

### Buyer Search Brief

Structured, editable artifact.

Must support:

- View.
- Edit.
- Approve suggested updates.
- Share link.
- Export/copy summary.

### Tour Debrief

Voice-first capture screen.

Must support:

- Push-to-talk or explicit recording.
- Live transcript, if possible.
- Save transcript.
- Generate debrief summary.
- Suggest Buyer Search Brief updates.

### Admin / Concierge Queue

Internal-only MVP screen or lightweight workflow.

Shows:

- New buyer workspaces.
- Listing review requests.
- Drafts needing review.
- Ready-to-send outputs.

This allows the MVP to be useful before all analysis is fully automated.

## Failure And Recovery Contract

No recoverable failure may erase a pasted listing, buyer priorities, notes, or selected files. Every failure state must answer: what happened, whether the buyer's work is safe, and what to do next.

Priority recovery cases:

1. **Email throttled or unavailable:** preserve the draft, explain the temporary limitation in plain language, show when retry is reasonable, and offer a reviewer-assisted path for the controlled test cohort.
2. **Preference or account detour:** save the in-progress request before leaving it, show a clear return control, and restore the exact request step and entered fields when the buyer returns.
3. **Magic link opened in another browser or expired:** return the buyer to the preserved request after a fresh sign-in rather than restarting intake.
4. **Listing URL cannot be parsed:** accept an address and user-provided listing facts; never reject a legitimate request solely because automated extraction failed.
5. **Submission times out or is retried:** use an idempotent request identifier so the buyer cannot accidentally create duplicate paid or reviewed work.
6. **Analysis needs more evidence:** show a `Needs your input` state with the smallest specific request, such as an address, disclosure, or inspection report.
7. **Analysis or review is delayed:** retain the request, show the last confirmed state, and give a realistic notification expectation without inventing progress.
8. **Result cannot load:** keep the durable request visible and provide a retry path; do not show an empty workspace as though the request never existed.

Internal errors, provider names, stack traces, raw model output, approval gates, and database status names must not be exposed as the primary buyer message.

## Mobile Experience Standard

The listing request, status, result summary, document addition, and tour debrief must work at a 390-pixel viewport without horizontal scrolling. Mobile is the primary test surface because buyers often act from listing apps, open email links on phones, and debrief immediately after tours.

Acceptance criteria:

- Primary actions remain visible and have at least a 44-pixel touch target.
- The listing URL field supports paste without obscuring the next action.
- A fixed or sticky action may be used only when it does not cover form errors, consent, or result content.
- Long addresses, URLs, source names, and recommendation text wrap without clipping.
- Keyboard focus does not strand the user or hide the active field and action.
- Documents show upload state and recoverable errors; a buyer can leave and return without losing the request draft.
- Preference and sign-in detours show a prominent return action and restore the buyer to the same request step.
- Result sections use meaningful headings and native disclosure controls where collapse improves scanning.
- Text remains the complete fallback when voice capture is unavailable or inappropriate.

## Schools And Safety Evidence Contract

Schools and safety are active research modules for every stage, not generic
boilerplate. Their depth is proportional to the decision stage and buyer
priority, but every released pack either provides compliant coverage or names
the gap and verification action.

**Schools:** distinguish official current assignment, boundary/change risk,
publicly reported school facts, and secondary ratings. Official district or
boundary evidence with a checked date is required to state assignment;
otherwise assignment is unknown. Ratings may be secondary context only. Never
label a school “good” or “bad,” guarantee future assignment, or use school data
as a proxy for neighborhood demographics.

**Safety:** identify the official/local dataset, incident period, geography,
category definitions, relationship to the property, checked date, and reporting
limitations. Do not convert reputation, anecdotes, or third-party grades into a
safety conclusion. Avoid “safe” and “unsafe”; report observable patterns,
comparison boundaries, uncertainty, and a buyer-verifiable next action.

Acceptance criteria:

- Every displayed assignment and safety statistic has claim-level sourcing and
  a checked date.
- An unavailable official lookup becomes an explicit coverage gap, never a
  reassuring inference.
- Pre-offer evidence meets the stricter freshness and geography requirements in
  the Decision Pack Contract.
- The direct recommendation cannot depend on a school or safety assertion that
  failed its evidence gate.

## Implemented Static MVP

The first usable slice now lives at:

`app.html`

It is intentionally local-first and dependency-free:

- Saves workspace data in browser local storage.
- Supports optional Supabase email magic-link auth and Postgres workspace sync.
- Generates a Buyer Search Brief from conversation notes.
- Reviews pasted listings against the brief with transparent fit/risk heuristics.
- Captures tour debriefs with text and includes experimental browser voice
  capture where supported; voice output is not a release-grade synthesis yet.
- Suggests Buyer Search Brief updates after debriefs.
- Runs on Cloudflare Pages or any static web server.

This is not the final production architecture. It is a usable learning loop that can be put in front of early users immediately.

## Technical Approach For A Production MVP

Recommended stack:

- Web app: Next.js or Remix.
- Database: Supabase Postgres or Neon Postgres.
- Auth: magic link email or Supabase Auth.
- File/transcript storage: Supabase Storage or database text fields at first.
- Voice input: browser speech-to-text for prototype, then server-side transcription when reliability matters.
- AI generation: OpenAI API with structured outputs.
- Jobs: synchronous generation for small drafts at first; background jobs later.
- Hosting: Vercel or Cloudflare Pages/Workers.

Do not require a mobile app for MVP. A mobile-friendly web app is enough for drive-back debriefs.

## Data Model

Minimum entities:

- `users`
- `workspaces`
- `workspace_members`
- `buyer_profiles`
- `conversations`
- `conversation_messages`
- `listings`
- `listing_reviews`
- `tour_debriefs`
- `profile_update_suggestions`
- `share_links`

Important statuses:

- Buyer profile: `draft`, `active`, `needs_review`.
- Listing review: `requested`, `drafting`, `ready`, `needs_more_info`.
- Profile update suggestion: `suggested`, `accepted`, `rejected`.

## Day-One Manual Work Is Acceptable

The MVP can use a concierge layer:

- User submits buyer conversation or listing.
- Product stores the request.
- Internal reviewer/Codex workflow generates the brief or review.
- User receives a polished result in the app.

This is acceptable because the user still experiences the core product loop. The goal is to validate whether the workflow is valuable before automating every research step.

## What Not To Build First

Do not build first:

- MLS integration.
- Full property search.
- Offer-writing automation.
- Agent CRM.
- Paid marketplace.
- Native mobile app.
- Fully autonomous legal/financial/inspection recommendations.

Those can come later. The MVP should own buyer memory and listing judgment, not inventory.

## Success Metrics

Activation:

- Buyer submits a first real listing.
- Buyer opens the completed result.
- Buyer says the review increased confidence or revealed something new.

Engagement:

- Buyer submits at least 3 listings.
- Buyer completes at least 1 tour debrief.
- Buyer asks at least 1 follow-up question or adds a document.
- Buyer accepts at least 1 profile update suggestion.

Value:

- Buyer skips a home they otherwise would have toured.
- Buyer identifies a hidden risk before touring or offering.
- Buyer/partner alignment improves.
- Buyer shares brief with a human agent or advisor.

Retention:

- Buyer returns before reviewing a new listing.
- Buyer returns after a tour to debrief.
- Buyer submits a second listing within 14 days.
- Buyer says the product understands their search better over time.

### User-Test Measurement Contract

For the first cohort, optimize for learning and successful decisions rather than traffic. Record events with an anonymous session or authenticated user identifier, request identifier where applicable, timestamp, device class, and entry page. Do not put addresses, buyer notes, financial constraints, document contents, or authentication tokens in analytics payloads.

Required MVP events use the deployed privacy-validated vocabulary:

- `landing_view`, `view_opened`
- `listing_url_entered`, `listing_submitted`, `listing_validated`
- `request_step_viewed`, `request_reviewed`, `request_started`
- `documents_added` with count and success only
- `auth_started`, `auth_link_requested`, `auth_link_sent`, `auth_completed`, `auth_gate_viewed`
- `analysis_failed`, `report_ready`, `report_opened`, `evidence_expanded`
- `debrief_started`, `second_home_started`

Later follow-up, sharing, tour-completion, and profile-learning events should be
added only alongside the corresponding buyer-visible feature and database event
allowlist. Do not send an event name the server does not explicitly permit.

Each failure event should include a controlled error category and recovery action, never raw sensitive content.

Initial go/no-go signals after 3–5 real buyers:

- Every tester can submit or recover a real request without losing entered work.
- At least 80% of completed results are opened by the submitting buyer.
- Median result-open-to-identifiable-next-action time is under two minutes during observed testing.
- At least 3 testers say the brief revealed something new or materially increased decision confidence.
- At least 2 testers voluntarily submit or state a clear intention to submit a second listing.
- No private buyer content is exposed to another user or a public page.

These are directional cohort thresholds, not statistically meaningful growth targets. Failures should produce a prioritized learning backlog before the cohort expands.

## Release Sequence

### Immediate Release: First Request And Result

Build and validate:

1. Mobile-first, listing-URL-first entry.
2. Progressive request questions.
3. Optional document intake.
4. Sign-in at submission with in-progress answers preserved.
5. Durable request status and analysis progress.
6. Decision-summary-first result page.
7. Sources, checked dates, evidence limits, and next actions.
8. Funnel instrumentation from URL entry through result open.
9. Internal exception handling and asynchronous audit needed to maintain
   trustworthy results.
10. Immediate private delivery when all deterministic gates and the independent
    evaluator pass; human review is reserved for exceptions and asynchronous
    audit.

P0 acceptance order:

1. **Trust and privacy:** private records remain scoped to the authenticated buyer; no secret or private content reaches browser-delivered configuration, public pages, logs, or analytics.
2. **Journey completion:** one real buyer can complete listing entry → preserved sign-in → request → trustworthy review/release → result open on both desktop and mobile.
3. **Recovery:** throttled auth, unparseable listings, duplicate submission, missing evidence, and delayed analysis have tested recovery paths.
4. **Decision usefulness:** the released result meets the result comprehension standard and preserves evidence limits.
5. **Measurement:** the required funnel and failure events can be inspected for a controlled tester without collecting sensitive content.
6. **Cohort readiness:** tester invitation, support owner, concierge fallback, and qualitative debrief are prepared before the first external invitation.

P1 begins only after the P0 journey works reliably. It includes document-driven
revisions, follow-up questions, stronger buyer-home history, and audio capture
and transcription for the structured debrief. Comparison, sharing, and broader
profile learning remain later unless user testing shows they are blocking repeat
use.

Three-stage acceptance criteria:

- A buyer sees only the three current stages and receives stage-appropriate
  direct recommendation language.
- One fixture per stage demonstrates the required core output and suppression of
  out-of-scope conditional modules.
- A gate-passing candidate reaches the buyer without a routine reviewer action.
- A failed or uncertain gate remains private, maps to a useful buyer status, and
  creates an exception action.
- Photos can be attached without implying visual inspection; video is not
  accepted or promised.
- Preference freshness, schools, and safety rules are represented in release
  fixtures and cannot be bypassed by recommendation prose.

### Later Retention Work: The Buyer Second Brain

Build after the first-request funnel is usable and measurable:

1. Returning buyer home.
2. Guided buyer conversation.
3. Buyer Search Brief generation and editing.
4. Saved homes and result history.
5. Tour debrief capture, text first.
6. Voice input for debrief.
7. Profile update suggestions.
8. Follow-up questions and document additions.
9. Side-by-side comparison.
10. Partner or advisor sharing.

The MVP should be voice-shaped, with text fallback. The product should treat voice transcripts as first-class search memory from the beginning, while preserving typed input for noisy cars, privacy-sensitive moments, unsupported browsers, and quick edits.
