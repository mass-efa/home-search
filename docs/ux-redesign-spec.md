# Home-Finding Buddy UX Redesign Specification

Status: implementation-ready direction for design Passes 1–3  
Primary funnel: `landing_view → listing_validated → request_started → report_ready → report_opened`

## Experience Principle

The product begins with the buyer's immediate job: understand a specific home. It progressively asks for context only when that context improves the analysis.

Primary path:

> Paste listing → confirm home → explain what matters → optionally add documents → start analysis → review decision packet

The interface should feel calm, consumer-friendly, and trustworthy. Use Airbnb as a reference for visual warmth, progressive disclosure, spacious layouts, and mobile quality without copying its assets or exact components. Source transparency and explicit unknowns are part of the product experience, not footnotes.

## Global Navigation

### Signed out

- Brand link: `Home-Finding Buddy`
- Secondary link: `Example report`
- Tertiary link: `Sign in`
- Primary CTA: `Analyze a home`

### Signed in

- Desktop links: `Homes`, `Your preferences`, `Account`
- Primary CTA: `Add a home`
- Mobile: compact brand mark and profile button; persistent bottom navigation with `Homes`, `Add`, and `Profile`

Do not expose `Brief`, `Listings`, `Debrief`, `Account`, or `Public Site` as equal first-session destinations.

## Implementation View Map

The ten experience views below map into six application-level views. Preserve existing data hooks while adding these contracts:

| Application view | Experience content | Required hook |
| --- | --- | --- |
| `landing` | View 1: Listing Entry | `[data-view="landing"]` |
| `request` | Views 2–5 as progressive panels | `[data-view="request"]` |
| `processing` | View 6: Analysis in Progress | `[data-view="processing"]` |
| `results` | View 7: Decision Packet | `[data-view="results"]` |
| `workspace` | Views 8–10 and signed-in dashboard | `[data-view="workspace"]` |
| `account` | Account and session management | `[data-view="account"]` |

Navigation and flow hooks:

- View actions: `[data-view-target="request"]`
- Navigation actions: `[data-nav-view]`
- Request panels: numeric `[data-request-step]`
- Panel actions: `[data-request-next]` and `[data-request-back]`
- Request progress: `[data-request-progress]`
- Analysis submit: `[data-submit-analysis]`
- Active listing: `[data-active-listing-title]`
- Status: `[data-analysis-status]` or `[data-processing-status]`
- Progress: analysis/processing progress hooks already supported by the client
- Processing stages: `[data-analysis-stage]`

Views 2–5 are steps within `request`, not separate routes. Views 9–10 open from `workspace` or a specific home without becoming top-level navigation items.

## View 1: Listing Entry

Route/state: public landing and signed-in empty home

### Content

- Eyebrow: `Decision support for homebuyers`
- H1: `Understand a home before you commit.`
- Supporting text: `Paste a listing to get a buyer-specific analysis of price, risks, records, and fit.`
- Field label: `Listing link`
- Placeholder: `Paste a Redfin, Zillow, or listing link`
- Primary CTA: `Analyze this home`
- Secondary CTA: `See an example report`
- Trust line: `Private by default. Source-backed. Built to support—not replace—professional advice.`

### Validation

- Empty: `Paste a listing link to continue.`
- Invalid URL: `That doesn't look like a listing link. Check the URL and try again.`
- Unsupported source: `We can't import this site automatically yet. Add the address instead.`
- Alternative field label: `Property address`
- Alternative placeholder: `123 Main St, Seattle, WA`
- Alternative CTA: `Continue with address`

### Loading

- Input state: spinner and `Finding this home…`
- Disable the primary CTA while resolving.
- Never show a blank page or indefinite spinner.

### Mobile

- Keep the H1 within the first viewport with the URL field and CTA visible.
- Use a 16 px minimum input font to prevent browser zoom.
- Stack the field and full-width CTA.
- Do not show multi-row global navigation.

## View 2: Confirm Home

Route/state: listing resolved

### Property preview card

Show when available:

- Primary photo
- Address
- Asking price
- Beds, baths, square feet
- Listing status
- Source name

### Copy and actions

- H1: `Is this the right home?`
- Supporting text: `We'll use this listing as the starting point for your analysis.`
- Primary CTA: `Yes, continue`
- Secondary CTA: `Use a different listing`

### Partial-data state

- Banner: `We found the property, but some listing details are missing. You can still continue.`
- Editable labels: `Address`, `Asking price`, `Listing status`
- CTA: `Save and continue`

### Error state

- H1: `We couldn't confirm that home`
- Body: `The listing may be private, expired, or blocking automated access. Add the address and any details you have.`
- Fields: `Property address`, `Asking price (optional)`, `Listing notes (optional)`
- Primary CTA: `Continue manually`
- Secondary CTA: `Try another link`

### Mobile

- Use a large 16:10 property image.
- Keep the confirmation CTA sticky at the bottom after the card is visible.

## View 3: Personalize the Analysis

Step label: `1 of 2 · Your priorities`

### Content

- H1: `What would make or break this home for you?`
- Supporting text: `Tell us what you care about, what worries you, and what decision you're trying to make.`
- Field label: `What should we pay special attention to?`
- Placeholder: `For example: Is the asking price supported? We care about quiet streets, natural light, and avoiding major near-term repairs.`
- Voice action: `Talk instead`
- Voice recording action: `Finish recording`
- Suggestion group label: `Common priorities`
- Suggestion chips:
  - `Price & comparable sales`
  - `Condition & repairs`
  - `Neighborhood`
  - `Schools`
  - `Commute`
  - `Noise & privacy`
  - `Future resale`
  - `Insurance & hazards`

### Decision context

- Field label: `Where are you in the process?`
- Options:
  - `Deciding whether to tour`
  - `Deciding whether to offer`
  - `Preparing an offer`
  - `Already under contract`
- Optional expandable section: `Add budget, timeline, or household context`
- Expanded fields:
  - `Comfortable budget`
  - `Timing`
  - `Who is making the decision?`

### Actions

- Primary CTA: `Continue`
- Secondary CTA: `Skip for now`
- Save entered text automatically.

### Voice states

- Idle: `Talk instead`
- Recording: `Listening… Speak naturally about the home.`
- Processing: `Turning your recording into notes…`
- Failed: `We couldn't process that recording. Try again or type your notes.`

### Mobile

- Chips wrap horizontally with 44 px minimum height.
- Keep `Continue` in a sticky bottom action bar.
- Expanding optional context must not clear written or recorded notes.

## View 4: Add Documents

Step label: `2 of 2 · Documents`

### Content

- H1: `Have documents for this home?`
- Supporting text: `Disclosures, inspections, and tour notes can make the analysis sharper. You can also add them later.`
- Upload label: `Add files`
- Upload helper: `PDF, image, or text files`
- Supported document chips:
  - `Disclosure packet`
  - `Inspection report`
  - `Seller documents`
  - `Tour notes`
  - `Comparable sales`

### File states

- Uploading: filename, progress indicator, `Uploading…`
- Ready: filename, type, size, `Ready`
- Processing: `Reading document…`
- Failed: `Upload failed. Try again.`
- Unsupported: `We can't read this file type yet. Upload a PDF, image, or text file.`
- Remove action: `Remove`

### Actions

- Primary CTA: `Review request`
- Secondary CTA: `Skip for now`

### Mobile

- Open the native file picker from one full-width `Add files` button.
- Display each file as a compact row; do not use a dense desktop drop zone.

## View 5: Review Request

### Content

- H1: `Ready to analyze this home`
- Property summary: image, address, price
- Section label: `Your priorities`
- Empty priorities copy: `No special priorities added`
- Section label: `Documents`
- Empty documents copy: `No documents added`
- Edit actions: `Edit priorities`, `Add documents`

### Analysis depth

- Group label: `Choose your analysis`
- Option 1 title: `Decision brief`
- Option 1 description: `A focused fit, risk, and next-step read. Usually ready in a few minutes.`
- Option 2 title: `Deep decision packet`
- Option 2 description: `A fuller review of records, comparable sales, documents, and buyer-specific diligence. Takes longer.`
- Do not promise a completion time until production timing supports it.

### Authentication gate

If signed out:

- Heading: `Where should we save your report?`
- Body: `Enter your email to keep the report private and get a link when it's ready.`
- Field label: `Email`
- Placeholder: `you@example.com`
- CTA: `Email me a secure sign-in link`
- Confirmation: `Check your email for a secure sign-in link. Your request is saved.`
- Error: `We couldn't send the sign-in link. Check the email and try again.`

If signed in:

- Primary CTA: `Start analysis`
- Legal helper: `This is a research aid, not an inspection, appraisal, or legal opinion.`

### Mobile

- Use stacked summary cards.
- Keep `Start analysis` sticky.
- Authentication should appear inline, not as an unrelated account screen.

## View 6: Analysis in Progress

### Content

- H1: `We're analyzing this home`
- Supporting text: `We're checking the claims—not just summarizing the listing.`
- Property summary card
- Progress stages:
  1. `Listing captured`
  2. `Checking public records`
  3. `Reviewing market and comparable sales`
  4. `Evaluating fit and risks`
  5. `Checking evidence`
- Completed-stage label: `Complete`
- Active-stage label: `In progress`
- Pending-stage label: `Waiting`
- Background message: `You can leave this page. We'll email you when the report is ready.`
- Secondary CTA: `Back to your homes`

### Delayed state

- Heading: `This is taking longer than expected`
- Body: `Your analysis is still running. You can leave this page and we'll notify you when it is ready.`
- CTA: `View my homes`

### Needs-input state

- Heading: `We need one detail to continue`
- Body: dynamic, plain-language explanation
- Primary CTA: `Add missing detail`
- Secondary CTA: `Continue with what we have`

### Failed state

- Heading: `We couldn't finish the analysis`
- Body: `Your request is saved. Try again, or send it for manual review.`
- Primary CTA: `Try again`
- Secondary CTA: `Request help`

### Mobile

- Present progress vertically.
- Avoid animated percentages that imply unsupported precision.
- Keep property address visible near the top.

## View 7: Decision Packet

### Summary header

- Property image, address, asking price, report date
- Evidence status:
  - `Evidence checked`
  - `Some evidence still needs review`
  - `Limited source data`
- Recommendation examples:
  - `Strong fit—investigate before offering`
  - `Worth touring—with specific questions`
  - `Mixed fit—resolve these risks first`
  - `Likely skip based on your priorities`
- Confidence label: `Confidence: High`, `Confidence: Medium`, or `Confidence: Limited`
- Primary CTA: `Review the top 3 things to investigate`
- Secondary actions: `Ask a follow-up`, `Save`, `Share privately`

### Required report sections

1. `Bottom line`
2. `Why it may fit you`
3. `What could disappoint you`
4. `Price and comparable sales`
5. `Property condition and physical risks`
6. `Area and daily life`
7. `Documents reviewed`
8. `What we couldn't verify yet`
9. `Questions for your agent or inspector`
10. `Recommended next steps`
11. `Sources`

### Claim presentation

Each factual claim must support:

- Source name
- Checked date
- Link when available
- Confidence or evidence limitation when material

Do not bury unknowns in a disclaimer. `What we couldn't verify yet` must be visible in the main report.

### Follow-up composer

- Heading: `Ask about this home`
- Placeholder: `Ask a follow-up about price, risk, fit, or a source…`
- CTA: `Ask`
- Suggested prompts:
  - `What are the biggest offer risks?`
  - `Which comparable sale matters most?`
  - `What should I inspect in person?`

### Report states

- No source evidence: `We could not independently verify this claim. Treat it as a lead for follow-up.`
- Human review pending: `A final evidence check is still in progress.`
- Updated report: `Updated [date]`
- Stale source: `This source may have changed since it was checked on [date].`

### Mobile

- Keep recommendation and evidence status above the fold.
- Use accordion sections below the summary, with `Bottom line` expanded.
- Sticky bottom actions: `Ask` and `Next steps`.
- Tables must transform into stacked comparison cards.

## View 8: Your Homes

### Header

- H1: `Your homes`
- Primary CTA: `Add a home`

### Home card

- Property photo
- Address and price
- Status:
  - `Draft`
  - `Analyzing`
  - `Ready`
  - `Needs input`
  - `Needs review`
- Recommendation when available
- Last updated date
- Contextual CTA:
  - `Finish request`
  - `View progress`
  - `View report`
  - `Add missing detail`

### Empty state

- H1: `Start with a home you're considering`
- Body: `Paste a listing and we'll help you understand the fit, risks, and questions worth investigating.`
- CTA: `Analyze a home`
- Secondary CTA: `See an example report`

### Error state

- `We couldn't load your homes. Refresh the page or try again in a moment.`
- CTA: `Try again`

### Mobile

- Single-column cards with a 4:3 image.
- The whole card may open the property, but keep the contextual CTA visibly labeled.

## View 9: Tour Debrief

Entry point: contextual action on a property, labeled `I toured this home`

### Content

- H1: `You saw it in person. What changed?`
- Supporting text: `Capture the reaction while it's fresh. We'll suggest—not automatically make—updates to your preferences.`
- Field label: `Your tour reaction`
- Placeholder: `What felt better or worse than expected? What did you disagree on? Would you want to go back tomorrow?`
- Voice action: `Talk through the tour`
- Quick reactions:
  - `More excited`
  - `Less excited`
  - `Still unsure`
- Prompts:
  - `Better than expected`
  - `Worse than expected`
  - `New concern`
  - `Partner reaction`
  - `Would revisit`
- Primary CTA: `Save debrief`

### Saved state

- Confirmation: `Tour debrief saved`
- Heading: `Suggested preference updates`
- Approval actions per suggestion: `Accept` and `Not now`
- Completion CTA: `Back to this home`

### Mobile

- Optimize for one-handed voice capture.
- Keep the record control and save CTA reachable near the bottom.

## View 10: Your Preferences

This is progressive profile memory, not a required onboarding form.

### Content

- H1: `Your preferences`
- Supporting text: `These help every analysis reflect what matters to you. You control every update.`
- Sections:
  - `Search summary`
  - `Must-haves`
  - `Strong preferences`
  - `Nice-to-haves`
  - `Dealbreakers`
  - `Risk tolerance`
  - `Tradeoffs to watch`
- Primary CTA: `Update preferences`
- Secondary CTA: `Add context`
- Suggested update actions: `Accept`, `Edit`, `Dismiss`
- Empty state: `Your preferences will take shape as you analyze and tour homes.`
- Empty-state CTA: `Tell us what matters`

## Visual System

### Foundations

- Canvas: warm off-white
- Surfaces: white
- Primary text: near-black
- Secondary text: neutral gray with WCAG AA contrast
- Brand accent: one restrained coral or terracotta
- Success, warning, and error colors must not rely on color alone
- Maximum content width: approximately 1200 px
- Reading width for report prose: 680–760 px
- Spacing: 8 px base with 16, 24, 32, 48, and 64 px steps
- Corner radii: 12–16 px for cards and inputs; pill radius only for chips and compact actions
- Borders: subtle 1 px neutral
- Shadows: soft and sparse; never use elevation as the only boundary

### Typography

- Friendly sans-serif UI family with strong readability
- H1: 48–56 px desktop, 32–40 px mobile
- Body: 16–18 px
- Minimum interactive text: 14 px
- Avoid oversized headlines that push the primary task below the fold

### Interaction

- Minimum touch target: 44 × 44 px
- Visible keyboard focus on every interactive control
- Reduced-motion support
- Buttons use one dominant primary style per view
- Destructive actions require explicit confirmation
- Autosave states: `Saving…`, `Saved`, `Couldn't save`

## Pass 1: Architecture and Low-Fidelity Prototype

### Deliverables

- Clickable desktop and mobile prototype for Views 1–7
- Property preview, progressive input, processing, and results states
- Five moderated buyer usability sessions

### Success criteria

- At least 4 of 5 participants start by pasting a listing without instruction.
- At least 4 of 5 understand that documents and detailed preferences are optional.
- At least 4 of 5 can identify the report's recommendation, main risk, evidence status, and next action.
- No participant mistakes the product for an inspection, appraisal, or legal opinion.

## Pass 2: Polished Responsive Design

### Deliverables

- Responsive Views 1–10
- Component and token specification
- Empty, loading, partial-data, error, needs-review, and success states
- Keyboard, focus, contrast, and screen-reader annotations
- Event instrumentation map

### Decision gates

- Validate whether authentication belongs before analysis starts or after an initial preview.
- Validate the names `Decision brief` and `Deep decision packet`.
- Validate recommendation language with buyers for clarity and appropriate caution.

## Pass 3: Frontend Implementation and Verification

### Build order

1. Listing entry and validation
2. Property confirmation
3. Priorities and documents
4. Review and authentication gate
5. Processing state
6. Decision packet
7. Your Homes
8. Tour debrief and preferences

### Required verification

- Desktop: 1440 px and 1024 px widths
- Mobile: 390 px width and one additional narrow width
- Keyboard-only completion of the request flow
- Screen-reader labels for all inputs, status messages, and progress stages
- Local-first mode still works without Supabase
- Private inputs and reports never appear in public pages or browser-delivered secrets
- Every backend failure maps to a user-facing recovery state

## Analytics Events

Use consistent event names and no private free-text payloads.

| Event | Trigger | Key properties |
| --- | --- | --- |
| `landing_view` | Listing Entry shown | signed-in state, referrer category |
| `example_report_opened` | Example report selected | placement |
| `listing_submitted` | URL/address submitted | source category, URL vs address |
| `listing_validated` | Property confirmation shown | source category, completeness |
| `listing_validation_failed` | Resolution fails | failure category |
| `priorities_added` | Buyer continues with context | chip count, voice vs text, no raw text |
| `documents_added` | File becomes ready | document category, count, no filename |
| `request_reviewed` | Review Request shown | depth default, signed-in state |
| `auth_link_requested` | Secure link requested | success/failure only |
| `request_started` | Analysis begins | depth, document count, decision stage |
| `analysis_delayed` | Delayed state shown | elapsed-time band |
| `analysis_failed` | Failed state shown | safe error category |
| `report_ready` | Report reaches ready state | depth, evidence status |
| `report_opened` | Buyer opens result | time-to-open band |
| `report_section_opened` | Report section expanded | section name |
| `top_risks_viewed` | Top-three CTA opened | count |
| `followup_asked` | Follow-up submitted | suggested vs custom, no raw text |
| `report_shared` | Private share completed | recipient type only |
| `second_listing_started` | Buyer begins another request | days since first report |
| `tour_debrief_started` | Debrief opened | report recommendation |
| `tour_debrief_saved` | Debrief saved | voice vs text, reaction |
| `preference_update_decided` | Suggestion accepted/dismissed | action, preference category |

### Funnel metrics

- Listing submission rate
- Listing validation success rate
- Validated listing → request started conversion
- Time to request started
- Request started → report ready success rate
- Time to report ready
- Report return/open rate
- Top-risk and evidence-section engagement
- Follow-up, private-share, tour-debrief, and second-listing rates

### Guardrails

- Unsupported listing-source rate
- Low-confidence claim rate
- Human-review rate
- Analysis failure and retry rate
- Advice-boundary comprehension in usability testing
- No free-text priorities, document names, addresses, or email addresses in analytics
