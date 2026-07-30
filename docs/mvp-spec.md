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

Home-Finding Buddy helps buyers:

- Learn what they actually want.
- Avoid wasting tours on poor-fit homes.
- Review listings against their real preferences.
- Capture messy tour reactions through voice or text.
- Turn each listing/tour into a sharper Buyer Search Brief.

## First-Time User Experience

The default first-time flow is listing-first and progressively disclosed:

1. Paste a Redfin or other listing URL.
2. Choose the decision stage: researching, considering a tour, considering an offer, preparing an offer, or under contract.
3. Describe what matters for this decision, using suggested topics plus an open text field.
4. Optionally add disclosures, inspection reports, tour notes, or other files.
5. Sign in when submitting so the request and result can be saved privately.
6. See a durable request page with clear analysis progress.
7. Return to a decision-first result.

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

The user can answer by voice or typing. Voice is especially valuable because the buyer can talk naturally with a partner.

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

### Request Status

Created immediately after submission.

Shows human-readable progress such as:

- Gathering property facts.
- Reviewing price and comparable sales.
- Checking records and location risks.
- Matching the home to buyer priorities.
- Preparing the decision brief.

The user should know that the request succeeded, what happens next, and how they will learn that it is ready.

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

## Implemented Static MVP

The first usable slice now lives at:

`app.html`

It is intentionally local-first and dependency-free:

- Saves workspace data in browser local storage.
- Supports optional Supabase email magic-link auth and Postgres workspace sync.
- Generates a Buyer Search Brief from conversation notes.
- Reviews pasted listings against the brief with transparent fit/risk heuristics.
- Captures tour debriefs with text or browser voice capture where supported.
- Suggests Buyer Search Brief updates after debriefs.
- Runs on GitHub Pages or any static web server.

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
9. Internal review or exception handling needed to deliver trustworthy results.

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
