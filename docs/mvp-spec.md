# Home-Finding Buddy MVP Spec

## MVP Principle

The MVP must be usable by a real buyer from the first session.

That means the product should not start as an admin tool, a static demo, or a fully automated research engine. It should start as a buyer-facing workspace that captures preferences, reviews listings, and improves over time. Behind the scenes, some analysis can be manual or semi-manual at first, but the user experience should feel coherent and useful.

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

### 1. Create Search Workspace

The buyer starts a private search workspace.

Required fields:

- Buyer name or household name.
- Email.
- Search area, if known.
- Budget range, if comfortable sharing.
- Timeline.
- Whether they are working with a human agent.

The product should make privacy explicit:

- The workspace is private by default.
- Listing reviews and notes are not public.
- Sharing with an agent or partner is optional.

### 2. Guided Buyer Conversation

The first session should feel conversational, not like a mortgage form.

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

### 3. Generate Buyer Search Brief

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

First aha moment:

> "This says what we want better than we could."

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

### Buyer Home

Shows:

- Current Buyer Search Brief summary.
- Saved listings.
- Recent recommendations.
- Open questions.
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

### Listing Review

Shows:

- Recommendation.
- Fit/risk score.
- Buyer-specific match/mismatch.
- Diligence checklist.
- Tour checklist.
- Open questions.
- Debrief button.

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

- Buyer completes first conversation.
- Buyer generates Buyer Search Brief.
- Buyer says the brief is accurate or useful.

Engagement:

- Buyer submits at least 3 listings.
- Buyer completes at least 1 tour debrief.
- Buyer accepts at least 1 profile update suggestion.

Value:

- Buyer skips a home they otherwise would have toured.
- Buyer identifies a hidden risk before touring or offering.
- Buyer/partner alignment improves.
- Buyer shares brief with a human agent or advisor.

Retention:

- Buyer returns before reviewing a new listing.
- Buyer returns after a tour to debrief.
- Buyer says the product understands their search better over time.

## First Build Slice

Build in this order:

1. Auth and private workspace.
2. Buyer conversation with text input.
3. Buyer Search Brief generation.
4. Add listing form.
5. Buyer-specific listing review output.
6. Tour debrief capture, text first.
7. Voice input for debrief.
8. Profile update suggestions.
9. Shareable Buyer Search Brief.
10. Internal admin queue.

The MVP should be voice-shaped, with text fallback. The product should treat voice transcripts as first-class search memory from the beginning, while preserving typed input for noisy cars, privacy-sensitive moments, unsupported browsers, and quick edits.
