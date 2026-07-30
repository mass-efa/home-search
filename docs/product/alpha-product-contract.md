# Home Search Alpha Product Contract

## Status And Purpose

This contract defines the customer, promise, product boundary, trust standard,
and success test for the first five alpha users.

It is subordinate to the approved direction in
[`docs/product-reset-plan.md`](../product-reset-plan.md): the front door is a
private Decision Brief for one live listing, and the Buyer Workspace is the
retention loop. The alpha should prove that buyers value the decision support
before the team invests in broad automation, search, or a full real-estate
platform.

## First Customer And Triggering Moment

### First Customer

The first customer is a serious, self-directed home buyer in Seattle or King
County who:

- Is actively considering a specific home, usually found on Redfin.
- Expects to decide within hours or days whether to tour, investigate, pursue,
  prepare an offer, or walk away.
- Can interpret normal listing information but cannot easily combine market,
  property, diligence, financial, and lifestyle evidence into one decision.
- Wants a deeper and more independent analysis than a portal summary or an
  informal agent conversation.
- Is willing to provide the questions, priorities, and documents that matter to
  their decision.

The buyer's partner is a core reader and collaborator. A buyer's agent, lender,
inspector, attorney, or other advisor may receive selected outputs, but is not
the first customer.

The alpha should begin with invited design partners rather than anonymous public
traffic. Its delivery promise is limited to residential properties in Seattle
and King County because existing source familiarity and reference work make
quality control more achievable.

### Triggering Moment

The triggering moment is:

> "I found a home I may care about, and I need to know what deserves attention
> before I spend more time, money, or emotional energy on it."

Common immediate decisions include:

- Is this worth touring?
- What might make this a bad fit despite attractive listing photos?
- What should I investigate before becoming attached?
- Does the price appear supported, stretched, or unusually compelling?
- What documents, inspections, or agent questions matter most?
- If I pursue it, what would justify enthusiasm and what should cap it?

A completed Buyer Search Brief is not required before the first analysis. The
product may collect lightweight buyer context during intake and progressively
build a durable profile after delivering value.

## Customer Pain And Job To Be Done

### Pain

Listing portals organize seller-supplied facts and market signals. Agents often
provide valuable local context, but their analysis can be informal, narrow, or
shaped by transaction incentives and limited time. Buyers are left to assemble
listing details, comparable sales, schools, safety, permits, inspections, title,
site risk, monthly ownership implications, lifestyle fit, and negotiation
questions across many sources.

The result is not merely missing information. It is decision fragmentation:

- Facts, estimates, assumptions, and opinions blur together.
- Important unknowns appear late, after emotional attachment.
- Generic checklists do not reflect what this buyer cares about.
- Partners struggle to align on tradeoffs.
- Dense research does not translate into a clear next action.
- The reasoning behind a recommendation is hard to audit or share.

### Job To Be Done

When I find a home that may be worth pursuing, help me turn the listing, my
questions, available documents, and current evidence into a trustworthy next
decision, so I can spend my attention wisely, avoid preventable surprises, and
have a more productive conversation with my partner and advisors.

The product succeeds when it improves a real decision. Producing a long report
is not success by itself.

## Buyer Promise

> Paste a Redfin or other listing link and tell us what worries you. We will give
> you a private, evidence-checked decision brief that explains what fits, what
> could hurt, what remains unknown, and what to verify next.

The promise has five parts:

1. **Decision first:** lead with tour, skip, watch, investigate, pursue, or
   offer-prep and explain what would change that read.
2. **Buyer specific:** answer the buyer's submitted questions and apply the
   context they chose to provide.
3. **Evidence aware:** distinguish sourced facts, calculations, inferences,
   judgments, assumptions, conflicts, and unknowns.
4. **Actionable:** give the next three actions, including questions for the right
   professional when verification is required.
5. **Private and fail-closed:** keep the result private by default and deliver it
   only after deterministic approval gates pass. Any unsupported, conflicting,
   sensitive, or out-of-coverage case stops in an exception state.

The product is a research and decision-support aid. It is not an appraisal,
inspection, legal opinion, financing approval, tax opinion, title opinion, or
substitute for licensed professionals.

## Product Levels

The alpha should test two levels of help without presenting them as finalized
commercial packages.

### Quick Scan

The Quick Scan answers:

> "Is this home worth more of my attention, and what should I investigate next?"

It is appropriate before a tour or early in consideration when the buyer has a
listing URL but may not yet have disclosures, inspection reports, title
documents, or detailed financing inputs.

Required output:

- Decision read and confidence.
- Main reasons it may fit.
- Main reasons it may disappoint or create risk.
- Direct response to each buyer question: answered, partially answered, or open.
- High-value unknowns and evidence limitations.
- What would change the recommendation.
- Next three actions.
- Tour and agent-question checklist.
- Property and market facts needed to support the decision, with sources and
  checked dates where available.

Quick Scan boundary:

- It may include directional price and negotiation context.
- It does not promise a full adjusted comparable-sale model.
- It does not provide a personalized offer ceiling, affordability conclusion,
  renovation budget, ownership model, or cost-of-waiting analysis.
- It does not imply review of documents the buyer has not supplied.
- If the available evidence cannot support a responsible decision read, the
  output must say so and recommend the missing input or a Deep Decision Pack.

The Quick Scan must not be a lower-trust product. It is narrower in scope, not
looser in sourcing, privacy, or evidence labeling.

### Deep Decision Pack

The Deep Decision Pack answers:

> "I may tour again, pursue, negotiate, or prepare an offer. What does a
> defensible, buyer-specific decision require?"

It is appropriate when the buyer has meaningful intent and additional evidence
or questions justify deeper analysis.

It is generated from one approved, canonical analysis record and can render:

- A one-page decision view.
- An interactive detailed brief.
- Calculation and audit views.
- A PDF derived from the approved record when useful.

Required core:

- Everything in the Quick Scan.
- Detailed property and listing-history register.
- Buyer-specific fit and likely disappointment points.
- Area value, comparable sales, and negotiation analysis.
- Subject and every comparable showing calculated price per finished square foot
  as a visible cross-check.
- Condition, inspection, title, permit, HOA, legal, climate, and site-risk
  modules where relevant.
- Source-linked factual claims, conflicts, missing-data flags, and methodology.
- Consolidated diligence questions for the buyer's agent, seller, inspector,
  lender, title officer, or attorney as appropriate.
- Automated quality-gate results, analysis version, and audit state.

Conditional modules appear only when evidence and buyer inputs support them:

- Target range, compromise zone, stretch, or stopping rule.
- Personalized ownership economics and monthly costs.
- Renovation and capital reserve scenarios.
- Scarcity and replacement-opportunity analysis.
- Cost-of-waiting scenarios.
- Page-level maps for inspection, disclosure, title, permit, or environmental
  documents.
- Spreadsheet export for sophisticated buyers.

Deep Decision Pack boundary:

- It does not guarantee complete discovery of property defects, title matters,
  legal restrictions, financing risk, or future market performance.
- Personalized offer, affordability, financing, and walk-away outputs require
  explicit buyer inputs and stricter deterministic validation.
- A model may draft explanations or propose inputs, but deterministic
  calculations must produce quantitative outputs.

### Escalation From Quick Scan To Deep Decision Pack

Escalation should be recommended when one or more conditions apply:

- The buyer is preparing to offer or waive a contingency.
- Material documents are available for review.
- Pricing support or negotiation posture is central to the decision.
- The property has unusual condition, title, permit, site, insurance, or
  financing risk.
- Buyer-specific affordability, renovation, or walk-away constraints matter.
- The Quick Scan exposes a material conflict or unknown that requires deeper
  evidence.

For alpha, deterministic intake rules may recommend the appropriate level. An
ambiguous scope, missing required input, or unusual risk enters `needs input` or
`quality exception` rather than being guessed. The buyer must approve any
meaningful scope or price change before deeper work begins.

## End-To-End Alpha Journey

1. **Understand the offer**
   - The invited buyer sees a concise landing page, one intentionally sanitized
     example, the research-aid boundary, and the private-by-default promise.
   - GitHub terminology and public issue queues never appear in the customer
     experience.

2. **Submit a live listing**
   - The buyer signs in and provides a Redfin or other listing URL.
   - The buyer answers: "What do you especially want us to investigate?"
   - Address, decision stage, deadline, and lightweight priorities are requested
     with sensible optionality.
   - The buyer may upload disclosures, inspection, title, permit, HOA, or other
     supporting documents.

3. **Confirm scope and consent**
   - The product confirms Quick Scan or Deep Decision Pack scope, what evidence
     was received, expected timing, and any missing input.
   - Privacy, document handling, research-aid limitations, and restricted
     operational access are clear before submission.

4. **Track the request**
   - The buyer sees a private status:
     `submitted`, `needs input`, `researching`, `drafting`, `validating`,
     `quality exception`, `ready`, `failed`, or `cancelled`.
   - The system can request a missing fact without exposing internal diagnostics.

5. **Build the evidence packet**
   - Listing and user-supplied facts are captured with source and date.
   - The analyst gathers decision-relevant official or primary evidence where
     practical.
   - Unavailable, gated, stale, or conflicting data is explicitly flagged.
   - Listing text and uploaded documents are treated as untrusted inputs.

6. **Draft and calculate**
   - A versioned rubric and structured report contract shape the draft.
   - Deterministic calculations produce quantitative outputs and retain inputs,
     units, methods, versions, and rounding rules.
   - Custom buyer questions remain visible throughout the analysis.

7. **Validate and approve**
   - Deterministic gates verify property identity, launch geography, source
     freshness and minimum coverage, schema completeness, arithmetic,
     comparable-sale compliance, evidence labels, professional-boundary
     language, buyer-question coverage, sensitive-module inputs, privacy
     settings, and cross-view reconciliation.
   - A draft becomes `ready` only when every required gate passes. A warning
     cannot override a failing gate.
   - A failed or indeterminate gate routes the request to `needs input`,
     `quality exception`, or `failed`; it cannot become buyer-visible or
     shareable.
   - Restricted operators may investigate an exception and correct inputs or
     system defects, but they cannot bypass a required gate. The corrected run
     must pass the same versioned validations.

8. **Receive the decision**
   - The buyer opens a mobile-friendly result that begins with the recommendation,
     reasons, risks, unknowns, decision rule, and next actions.
   - The buyer can progressively open deeper evidence, calculations, sources, and
     methodology.

9. **Act, follow up, and share selectively**
   - The buyer records the action they intend to take.
   - They can ask a targeted follow-up or add a missing document.
   - They can create and revoke a private share link. Sensitive financial,
     negotiation, or identity details are excluded unless explicitly included.

10. **Build buyer memory**
    - The product may suggest preference learnings from questions, decisions, or
      tour reactions.
    - No suggestion changes the Buyer Search Brief until the buyer accepts it.
    - A later listing records which approved profile version informed its
      analysis.

## Alpha MVP Scope

### Required

- Invited-user authentication and cross-user isolation.
- Private URL-and-questions intake with optional document upload.
- Clear Quick Scan and Deep Decision Pack scope records.
- Private request status and missing-input flow.
- Versioned, structured analysis based on the canonical home-evaluation rubric.
- Source records, checked dates, claim/evidence labels, conflicts, and unknowns.
- Deterministic calculation records for any quantitative analysis.
- Versioned deterministic approval gates, exception queue, and audit trail.
- Decision-first buyer result with direct answers to submitted questions.
- Comparable-sale price-per-finished-square-foot compliance in every Deep
  Decision Pack comp table.
- Private delivery, expiring/revocable share links, and sensitive-field controls.
- Targeted follow-up and document addition.
- Minimal, buyer-approved preference learning.
- Funnel, quality, turnaround, exception-handling time, audit-sampling, and cost
  telemetry that excludes raw private buyer content.
- Mobile and desktop usability.

Concierge/manual evidence gathering and exception investigation are acceptable
when they create a coherent buyer experience and accelerate learning. Manual
work may correct or enrich inputs, but it may not bypass automated approval.

### Not In Alpha

- MLS integration or a general home-search engine.
- Guaranteed automatic extraction from Redfin or other portals.
- Fully automated research across all jurisdictions.
- Public publication or delivery that bypasses deterministic approval.
- Autonomous offer, appraisal, inspection, legal, title, financing, tax, or
  insurance advice.
- Agent CRM, lead marketplace, or transaction management.
- Native mobile applications.
- Anonymous public request queues.
- Complex subscriptions, credits, coupons, or billing infrastructure.
- Side-by-side comparison unless the first-five-user research makes it essential.
- Silent updates to buyer preferences.

## First-Five-User Success Test

The first five completed deliveries are a learning gate, not a
statistically conclusive launch test. Every delivery should include a short
pre-intake and post-decision interview.

### Must-Pass Trust And Quality Gates

- 5 of 5 requests and results remain private except for explicit buyer sharing.
- 5 of 5 delivered results pass every required automated gate and retain a
  versioned gate and audit record.
- 5 of 5 results show evidence limitations, checked dates, and explicit unknowns.
- Every Deep Decision Pack comp table shows the subject and each comp's price per
  finished square foot.
- Zero material cross-user data exposure.
- Zero unsupported high-stakes conclusion presented as professional certainty.
- Zero unexplained drift between one-page, detailed, and calculation views.
- At least 2 of the first 5 delivered results receive a post-delivery audit
  sample; any result with a user-reported material concern, later correction, or
  anomalous quality signal is audited automatically in addition to the sample.
- Any material audit finding pauses equivalent deliveries until the defect is
  fixed, affected results are identified, and the corrected validation passes.

### Product Learning Targets

- At least 3 of 5 buyers say the result changed or materially clarified their
  next decision.
- At least 4 of 5 can accurately explain the recommendation, top risk, biggest
  unknown, and next action after reading the result.
- At least 3 of 5 report one material issue, question, or tradeoff they had not
  previously considered.
- At least 3 of 5 take or explicitly commit to a tracked next action within seven
  days.
- At least 4 of 5 say the output was worth the effort required to submit inputs.
- At least 2 of 5 submit a second listing, add a tour debrief, or state a credible
  intent to reuse the product within 30 days.

### Operational Learning Targets

Track, but do not make an arbitrary alpha pass/fail threshold:

- Intake completion time and abandonment point.
- Time from submission to gate-approved delivery.
- Exception-investigation and post-delivery-audit minutes by analysis module.
- Number and cause of `needs input` transitions.
- AI and external-service cost per delivered result.
- Material factual, source-linkage, calculation, and presentation corrections.
- Quick Scan-to-Deep escalation rate and reason.
- Which sections users open, share, question, or ignore.

The alpha should pause expansion if a material privacy incident occurs or if the
team cannot reliably meet the automated approval and evidence standard.

## Pricing Hypotheses

Pricing is not committed for alpha. The first five users may receive the product
free or at a clearly disclosed design-partner price in exchange for feedback.
The team should test value and packaging language before building billing.

Hypotheses to investigate:

1. **Free Quick Scan, paid Deep Decision Pack**
   - Quick Scan demonstrates value and qualifies intent.
   - Deep work is priced to reflect evidence, computation, and exception-handling
     effort.
   - Risk: the free product may attract low-intent volume or give away the
     highest-frequency value.

2. **Paid per listing**
   - Quick Scan could test in the range of $25–$75.
   - Deep Decision Pack could test in the range of $250–$750 depending on
     documents, financial modeling, and turnaround.
   - Risk: buyers may compare the price with services they perceive as included
     with their agent relationship.

3. **Buyer search package**
   - A fixed package could include one Deep Decision Pack and several Quick
     Scans, with a progressively learned Buyer Search Brief.
   - Risk: packaging before repeat-use evidence may obscure the strongest wedge.

4. **Expert or rush add-ons**
   - Faster turnaround, complex document review, or specialist referral may
     command a premium later.
   - Risk: do not imply licensed expertise the service does not provide.

Alpha research should ask about perceived value before revealing a price, then
test concrete package choices. Stated willingness to pay should be treated as
weaker evidence than an actual paid pilot.

## Trust And Privacy Requirements

### Private By Default

- Requests, buyer notes, uploads, analysis drafts, results, and Buyer Search
  Briefs are private by default.
- Nothing becomes public through submission, analysis, delivery, or sharing.
- Sharing requires an explicit buyer action and must be expiring and revocable.
- Public examples require intentional sanitization and separate approval.

### Buyer Control

- The buyer can see who may access their request and why.
- The buyer can request export and deletion.
- The buyer controls whether financing constraints, offer targets, negotiation
  limits, identity, and personal context appear in a shared view.
- Tour notes and proposed preference changes never silently update the approved
  Buyer Search Brief.

### Evidence And Professional Boundaries

- Factual claims retain source links or document references and checked dates.
- Buyer-supplied, listing-supplied, inferred, calculated, conflicting, and
  analyst-judgment information remain distinguishable.
- Missing or inaccessible evidence creates an explicit unknown, not invented
  content.
- School assignments, crime/safety, permits, title, condition, financing,
  insurance, taxes, valuation, and legal conclusions carry appropriate
  verification guidance.
- The product clearly states that it is a research aid, not a substitute for
  qualified professionals.

### Automated Approval, Exceptions, And Audit

- Only the versioned approval service may move an alpha result to `ready`.
- Required gates cover identity, bounded geography, source freshness and minimum
  coverage, schema and question completeness, arithmetic, comparable-sale
  compliance, cross-view reconciliation, evidence limits, professional
  boundaries, sensitive-module prerequisites, ownership, and share settings.
- Gates fail closed: unavailable, contradictory, stale, malformed, unsupported,
  or out-of-coverage inputs cannot be converted into a passing result by model
  confidence or operator discretion.
- Exceptions retain the failed gate, safe user-facing reason, restricted
  diagnostics, input and output hashes, schema/rubric/model/calculation versions,
  timestamps, and remediation history.
- Operators may correct evidence, data, or software and rerun validation. They
  cannot directly mark an exception `ready`.
- Approval, substantive edits, exception handling, delivery, correction, and
  share activity are auditable.
- Offer targets, ceilings, affordability, financing, and cost-of-waiting outputs
  require complete buyer inputs, deterministic calculation checks, sensitivity
  bounds, and the stricter sensitive-module gate.
- Post-delivery audits use a documented random sample plus mandatory sampling for
  user-reported concerns, corrections, anomalies, and new gate or model versions.
  A material finding triggers containment, impact review, buyer correction where
  needed, and a release hold for equivalent outputs.

### Bounded Alpha Coverage

- The alpha promise covers residential properties in Seattle and King County
  only.
- A request must pass address normalization and county/geography validation
  before research begins.
- The system must maintain a versioned coverage matrix for source availability
  and module support within the launch area. A property or module outside
  demonstrated coverage enters `quality exception` or is explicitly omitted; it
  is never implied to be complete.
- Requests outside Seattle and King County are not accepted as normal alpha
  deliveries. They may be logged as research interest without creating a
  Decision Brief promise.
- Geographic coverage may expand only after its official-source adapters,
  evidence minimums, exception behavior, and audit results meet the same launch
  standard.

### Security And Data Handling

- OpenAI keys, Supabase service-role keys, and other privileged credentials never
  enter browser-delivered code.
- Authentication, ownership, authorization, rate limits, quotas, validation, and
  idempotency are enforced server-side.
- Cross-user row-level-security tests are required.
- Raw private buyer content is excluded from product analytics, routine logs, and
  public issue trackers.
- Uploaded and externally sourced content is untrusted and must not control
  system instructions or authorization.
- Retention, deletion, backup, incident response, and model-provider data-use
  policies must be documented before expanding beyond invited alpha users.

## Open Decisions Requiring Michael's Alignment

These decisions are intentionally not settled by this contract:

1. **Alpha offer:** Should all first five users receive both levels, or should the
   team test Quick Scan as the default and recommend Deep only when justified?
   Recommendation: default to Quick Scan triage, with deterministic escalation
   criteria and a buyer-confirmed scope change.

2. **Turnaround promise:** What delivery window can the automated pipeline and
   exception process reliably offer? Recommendation: measure two internal runs,
   including one exception, before publishing a promise; show a request-specific
   estimate during the first five.

3. **Design-partner payment:** Free, refundable deposit, or paid pilot?
   Recommendation: start free for users one and two to fix the workflow, then
   test a real paid offer with users three through five if quality is stable.

4. **Quick Scan depth:** How much price/comparable context is necessary for a
   responsible tour decision? Recommendation: include directional context when
   evidence is available, but reserve adjusted comp modeling for Deep.

5. **Deep Decision Pack base modules:** Should financial modeling and document
   review be standard or conditional? Recommendation: keep them conditional on
   buyer intent, inputs, and available documents so the base pack remains
   operationally viable.

6. **Sharing defaults:** What expiration should a new share link use?
   Recommendation: seven days, with buyer-selected extension and immediate
   revocation.

7. **Named recommendation states:** Keep the full set of tour, skip, watch,
   investigate, pursue, and offer-prep, or simplify by decision stage?
   Recommendation: retain the states in the underlying schema but show only
   context-appropriate choices in the interface.

8. **Audit policy:** What random post-delivery sampling rate should follow the
   first five users? Recommendation: audit at least 20% of deliveries plus every
   mandatory trigger, and increase the rate automatically after any material
   finding or validation-version change.

9. **Exception ownership:** Who may investigate quality exceptions and
   post-delivery audit findings? This determines operational permissions and
   response capacity, but no operator may bypass an approval gate.

10. **Sensitive module sharing:** Should financial and negotiation modules always
    require a separate share toggle, even when the buyer shares the full pack?
    Recommendation: yes.

11. **Public example:** Which property can become the intentionally sanitized
    example, and what facts or calculations must be altered or removed?
    The existing Barrett package must not be assumed public-safe.

12. **Brand and package names:** “Quick Scan” and “Deep Decision Pack” are
    working names. Validate comprehension and trust before public launch.

## Contract Change Rule

Changes to the first customer, buyer promise, Quick Scan/Deep boundary, trust
standard, or alpha success gate require a recorded product decision. User-test
findings should be added to the canonical product documentation before being
encoded into the interface or backend.
