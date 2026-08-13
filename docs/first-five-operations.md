# First Five Users: Concierge Operations Contract

Status: operating contract for the first five invited buyers  
Scope: one private listing request through delivery and learning  
Default posture: gate-driven delivery, human-owned exceptions and asynchronous audit

## Purpose

The first five users are a product-learning cohort, not a scale test. The
operation must ensure that every valid request has an owner, every buyer knows
what is happening, and no recommendation that failed a critical automated gate
is presented as a finished decision packet.

This contract adds the smallest human exception, audit, and support loop around
the existing workspace and `home_buddy_ai_evaluations` records. A candidate that
passes every deterministic gate and the independent evaluator is released to
the authorized buyer immediately. It does not enable public publication,
payments, or a general-purpose support system.

## Cohort Authorization Gate

This contract becomes operational only after internal production validation has
passed and Michael explicitly authorizes up to five named/provisioned buyers.
An implemented automatic-release path, a successful internal request, or a
deployed change does not itself authorize an external invitation.

Before the first invitation, retain a dated go record containing:

- Exact frontend, function, schema/migration, prompt/rubric, gate, evaluator,
  calculator, and source-adapter versions.
- Clean test result for the exact candidate plus one successful production path
  in each stage and one fail-closed exception.
- Evidence that cross-user isolation, duplicate-submit protection, notification,
  kill switch, withdrawal/correction, and mobile return work.
- Named concierge, technical, exception/audit, and policy owners.
- The five-user allowlist and Michael's explicit go decision.

For the first five buyers, audit **100% of released packs asynchronously**. This
exceeds the general alpha sampling floor because five releases are the smallest
useful operating sample. Delivery is not delayed. Numeric offer guidance and
all high-consequence or low-confidence cases remain mandatory audit cases at
every later stage.

After the fifth buyer, hold the documented go/change/stop review before adding
any user. Expansion is a separate approval decision and requires no open
critical incident, acceptable audit defects, functioning support/withdrawal,
and credible comprehension and value evidence.

## Roles

One person may hold multiple roles for the first five users, but each request
must name an individual owner.

- **Concierge owner:** accountable for buyer communication, status, timing, and
  final delivery.
- **Exception/audit reviewer:** corrects failed or uncertain cases and audits
  released samples for identity, evidence, calculations, unknowns,
  recommendation strength, and buyer-question coverage.
- **Technical owner:** resolves failed runs, access problems, and data defects.
- **Policy owner:** authorizes gate/rubric changes, kill-switch recovery, and
  incident closure. Michael is the default unless he explicitly delegates it.

Routine release has no human release owner. Passing the complete automated
release contract is the authorization for private delivery.

The concierge owner is the buyer's single point of accountability. Internal
handoffs must not require the buyer to diagnose the workflow.

## Request Lifecycle

Use one canonical lifecycle for the buyer request. The existing automated
approval outcomes are evidence-gate inputs, not buyer lifecycle statuses.

| Status | Entry condition | Required owner action | Exit |
| --- | --- | --- | --- |
| `submitted` | Signed-in buyer submits a valid listing request | Confirm durable request ID and receipt | Concierge claims it |
| `in_analysis` | Automated research has begun; concierge ownership may be assigned asynchronously | Monitor timing and handle communication without blocking analysis | Candidate passes and releases, needs buyer input, or enters exception |
| `in_review` | A deterministic gate or independent evaluator produced an exception | Investigate, correct inputs/policy, and rerun the complete gate | Release automatically after a pass, request buyer input, or cancel |
| `needs_buyer_input` | A missing fact or document blocks a useful result | Ask one specific, answerable question and state why it matters | Buyer responds, declines, or the reviewer proceeds with an explicit limitation |
| `ready` | Complete automated release contract passes and the server signs the private version | Create its private result destination and begin notification immediately | Notification is sent |
| `delivered` | Ready notification succeeds and private result is accessible | Record delivery time and monitor open state | Buyer opens it, requests help, or the request is closed |
| `closed` | Buyer confirms completion, becomes inactive, or the learning interview is complete | Record outcome and unresolved limitations | Terminal |
| `cancelled` | Buyer cancels, listing is invalid, or work cannot responsibly continue | Record a safe reason and tell the buyer | Terminal |

Do not expose `auto_approved`, `needs_review`, `insufficient_evidence`, `failed`,
validator names, model errors, or internal reason codes as the primary buyer
status. Map them into the lifecycle:

- `auto_approved`/gate pass advances directly to signed private release; no
  routine human review is inserted.
- `needs_review` remains `in_review` and creates a reviewer action.
- `insufficient_evidence` becomes `needs_buyer_input` when the buyer can help,
  otherwise it remains `in_review` for correction or suppression and a complete
  gate rerun, or becomes `cancelled`.
- `failed` remains `in_analysis` while a bounded retry is attempted, then moves
  to `in_review` for technical triage or `cancelled`.

Every transition records request ID, prior status, new status, actor, timestamp,
and a safe reason code. Never place buyer-private narrative in an analytics
event or notification log.

## Reviewer Queue And Ownership

The internal queue may be a minimal protected view or a disciplined manual
tracker for five users. It must show:

- Request ID, submitted time, current status, and status age.
- Buyer identifier sufficient for authorized follow-up.
- Listing address or URL.
- Decision stage and requested analysis depth.
- Concierge owner, exception/audit reviewer when applicable, and policy owner.
- Latest approval outcome and blocking reason category.
- Next action, next-action owner, and due time.
- Delivered result version and delivery/open timestamps.

An unassigned request is an incident, not a normal queue state. The concierge
owner should claim a new request within two business hours. If the result will
not be delivered within one business day, the owner must send a proactive,
specific update. These are internal operating targets, not public completion
promises until actual timing supports them.

Claiming and owner assignment are operational accountability, not release
gates. Automated analysis and a passing release continue without waiting for a
concierge action.

## Reviewer Actions

The queue needs only these actions for the first five users:

1. **Claim request:** assign concierge owner and move `submitted` to
   `in_analysis`.
2. **Open evidence package:** view the immutable candidate, source records,
   checked dates, validation results, and buyer questions.
3. **Return for revision:** preserve the prior candidate and state the exact
   correction required.
4. **Request buyer input:** ask one focused question or request one named
   document; move to `needs_buyer_input`.
5. **Audit released result:** perform the release checklist asynchronously on
   the sampled immutable version and record defects without silently editing it.
6. **Deliver/retry notification:** send the private result link and move to `delivered` only after
   notification succeeds.
7. **Withdraw or correct:** stop access to an affected version, preserve its
   audit record, explain the issue to the buyer, and prepare a corrected
   version.
8. **Cancel:** use only when the buyer requests it or responsible analysis is
   impossible.

### Exception And Audit Checklist

For every exception before rerunning gates, and for every sampled release after
delivery, the reviewer confirms:

- Property identity is correct or the limitation is prominent.
- The top recommendation is proportional to the available evidence.
- The three strongest reasons and three largest risks are supported.
- Facts, inferences, buyer preferences, and unknowns are visibly distinct.
- Source links and checked dates are present for material claims.
- Calculations reconcile and do not imply appraisal precision.
- Every buyer priority is answered, marked unknown, or assigned a next action.
- Inspection, legal, financing, appraisal, tax, and insurance limits are clear.
- Private buyer context is absent from public surfaces.
- The result states what evidence could change the recommendation.

## Buyer States And Copy

Use calm, outcome-oriented language. Never make the buyer interpret internal
quality systems.

The normal customer path is exactly `Request received` → `We're researching
this home` → `Your decision packet is ready`. A passing request never pauses for
routine reviewer approval. The `in_review` row below is exception-only and may
appear only after a deterministic gate or independent evaluator fails.

| Buyer state | Heading | Supporting copy | Primary action |
| --- | --- | --- | --- |
| `submitted` | Request received | We saved your home and priorities privately. We’ll keep this page updated as the analysis moves forward. | View request |
| `in_analysis` | We’re researching this home | We’re checking property facts, market context, risks, and the questions you asked—not just summarizing the listing. | Add information |
| `in_review` | We’re resolving an evidence issue | One part of the analysis needs correction or clarification before a reliable decision packet can be released. | View request |
| `needs_buyer_input` | One detail would improve your result | We need the item below because it could materially change the recommendation. You can provide it or ask us to continue with the limitation noted. | Provide detail |
| `ready` | Your decision packet is ready | Your private result separates what is supported, what is inferred, and what still needs verification. | View decision packet |
| `delivered`, unopened | Your decision packet is waiting | Open the private result to see the recommendation, largest risks, and next actions. | View decision packet |
| `delivered`, opened | What would help you decide? | Ask a follow-up, add a document, capture a tour reaction, or compare another home. | Ask a follow-up |
| delayed | We need more time for a reliable result | We’re still working on the specific item below. Your request is safe, and we’ll update you by the stated time. | View update |
| failed but recoverable | We couldn’t complete one part of the analysis | Your request is saved. We’re reviewing the issue and will either complete it or tell you exactly what is unavailable. | View request |
| `cancelled` | This request has been closed | We couldn’t responsibly complete this analysis for the reason below. No finished recommendation was released. | Analyze another home |
| corrected/withdrawn | We’re correcting this result | We found an issue that could affect part of the decision packet. We’ve withdrawn that version while we prepare a correction. | View update |

Notification content must not include financing limits, negotiation posture,
inspection findings, or other sensitive details. It may include the property
address only if the buyer has consented to address-bearing email; otherwise use
“your home analysis.”

## Event Contract

Events must be sent to a central, access-controlled store. Browser local storage
is useful for debugging but is not the system of record. Use pseudonymous IDs
and join authorized buyer identity server-side only when needed.

All events include:

- `event_id`
- `event_name`
- `occurred_at`
- `anonymous_id`
- `session_id`
- `user_id` when authenticated
- `request_id` when a request exists
- `result_version_id` when a delivered result exists
- `surface` and app version

Do not include free-form priorities, document contents, report findings,
financing details, email addresses, or listing notes in event properties.

| Event | Fires when | Required safe properties |
| --- | --- | --- |
| `landing_viewed` | First product entry renders | referrer category, device class |
| `listing_entered` | A syntactically valid URL or address is accepted | source category: Redfin, Zillow, other, address |
| `request_step_completed` | Buyer successfully advances a request step | step name, step number, optional-fields-used booleans |
| `auth_link_requested` | Buyer requests the secure link | success boolean |
| `auth_completed` | Authenticated session resumes the pending request | method |
| `request_submitted` | Durable request record is created | decision stage, analysis depth, document-count band |
| `request_status_changed` | Canonical lifecycle status changes | prior status, new status, actor role, safe reason code |
| `request_claimed` | Concierge owner accepts accountability | time since submission band |
| `buyer_input_requested` | A focused buyer question is sent | category, blocking boolean |
| `buyer_input_received` | Requested input is attached to the request | category, response-time band |
| `result_released` | Complete gate passes and the server signs a private result version | decision stage, gate version, evidence-status category |
| `result_audit_selected` | A released version enters asynchronous sampling | risk band, sampling rule |
| `result_audit_closed` | A sampled audit is completed | outcome category, corrective-action category |
| `result_notification_sent` | Ready notification provider accepts delivery | channel, success boolean |
| `result_opened` | Buyer opens the specific delivered result version | time since ready band |
| `result_summary_viewed` | Decision summary becomes visible for the first time | result version |
| `result_detail_expanded` | Buyer opens a detailed diligence section | section category |
| `result_source_opened` | Buyer follows a source link | source category, claim category |
| `follow_up_started` | Buyer begins a question or adds evidence | follow-up type |
| `tour_debrief_started` | Buyer begins the tour-reaction flow | days since result band |
| `second_listing_started` | Buyer starts a different listing after first delivery | days since first result band |
| `feedback_submitted` | Buyer answers the learning prompt | structured answers only |

Count `result_opened` only for a released, request-specific result version. A
generic saved-homes page or local heuristic screening does not qualify.

## First-Five Feedback Prompt

After the buyer has viewed the decision summary, ask no more than four
structured questions:

1. Did this increase your confidence in what to do next? `Yes / Somewhat / No`
2. Did it surface anything important you had not already considered?
   `Yes / No`
3. What will you do next? `Tour / Investigate / Offer / Pause / Other`
4. What was the single most confusing or missing thing? Optional free text,
   stored as private research data rather than analytics.

The concierge owner should offer a 15-minute follow-up conversation, but using
the product must not require scheduling one.

## Success Criteria

The first-five cohort is successful when all service-integrity criteria pass
and there is a credible value signal. Five users are too few for statistical
optimization.

### Service integrity: all required

- Every submitted request receives a durable ID and immediate confirmation.
- Every request is claimed by a named concierge owner within two business
  hours.
- Every buyer receives a result or a specific proactive update within one
  business day.
- Every delivered result passes the automated release contract and has a preserved
  version/audit record.
- Required asynchronous samples are selected without delaying buyer delivery;
  every selected audit reaches a recorded outcome.
- No private result is exposed to another user or a public page.
- No internal failure or approval code is presented as the buyer's primary
  status.
- Central events can reconstruct submission, ownership, delivery, and open
  history for every request.
- One request in each decision stage demonstrates stage-appropriate direct
  recommendation vocabulary and bounded modules.
- A gate-passing request is delivered without a routine reviewer action; a
  failing request remains private and enters a recorded exception path.
- Schools and safety either meet their active evidence requirements or display
  an explicit gap and next action.
- Stale or model-inferred preferences do not silently control a material
  recommendation.

### Usability and comprehension

- At least four of five buyers submit without live assistance.
- At least four of five can identify the recommendation, largest risk,
  evidence status, and next action after viewing the result.
- No buyer mistakes the product for an inspection, appraisal, legal opinion,
  financing approval, or guaranteed prediction.

### Value signal

- At least three of five report increased decision confidence or a meaningful
  new consideration.
- At least two of five take a product-supported next action: ask a follow-up,
  add evidence, debrief a tour, share privately, or begin a second listing.
- The team can name the top two repeated causes of buyer confusion or reviewer
  rework from observed evidence, not intuition.

## Daily Operating Rhythm

For the first five users:

1. Review the queue at the start and end of each business day.
2. Claim new requests and set the next action and due time.
3. Escalate any request approaching the one-business-day update threshold.
4. Verify notification success and private-link access after every delivery.
5. Review buyer opens, structured feedback, and follow-up actions.
6. Record one concise learning per request.

After five users, hold a go/change/stop review. Decide whether to improve
activation, evidence quality, reviewer tooling, result comprehension, or
retention based on the cohort evidence. Do not enable broader access solely
because five requests completed; expansion requires acceptable gate, audit,
privacy, comprehension, and value results.
