# Decision Pack Contract

Status: P0 draft for approval
Owner: Evaluation and Evidence Lead
Reference benchmark: private `outputs/3920_barrett/` package
Contract version: `decision-pack/0.1`

## Purpose

The Decision Pack turns a listing URL, buyer priorities, uploaded documents, and
independent research into a private, decision-ready analysis. It must help a
buyer answer:

1. What decision does the available evidence support now?
2. What supports or weakens that decision?
3. What is known, inferred, judged, assumed, conflicting, or still unknown?
4. What should the buyer verify or do next?

This is buyer-side decision support, not an appraisal, inspection,
environmental assessment, survey, title opinion, legal, tax, financing, or
insurance advice.

One versioned, released analysis record is the source of truth for the web
brief, one-page view, PDF, calculation views, and any spreadsheet export.
Rendered outputs may summarize or omit details, but may not introduce new
facts, formulas, or recommendations.

Routine delivery is automated and fail-closed. A pack becomes releasable only
when deterministic validators and an independent structured evaluator pass
every critical gate. Human review is reserved for exceptions, appeals, policy
changes, and post-delivery quality sampling; it is not a routine prerequisite.

## Layers

### Layer 1: Decision View

The first screen and one-page export must contain:

- Property identity, listing status, ask, and checked date.
- Decision read: `tour`, `skip`, `watch`, `investigate`, `pursue`, or
  `offer-prep`.
- Plain-language recommendation and overall confidence.
- Three strongest reasons for the recommendation.
- Three material risks or unknowns.
- What would change the recommendation.
- The next three concrete actions.
- Direct status of every buyer question.
- Target, stretch, ceiling, monthly cost, or capital plan only when the
  corresponding conditional module passes its gate.
- Evidence limits and professional-verification notice.

### Layer 2: Detailed Brief

The interactive brief expands the same record into:

1. Decision rationale and decision rule.
2. Property snapshot and listing history.
3. Buyer-specific fit and likely disappointment points.
4. Buyer questions and answers.
5. Comparable sales, value range, and negotiation posture.
6. Condition and uploaded-document findings.
7. Title, permit, HOA, legal, climate, and physical-site risks.
8. Schools, safety, neighborhood, appreciation, and lifestyle context.
9. Scarcity and replacement opportunity.
10. Renovation and capital-risk plan.
11. Ownership economics and cost of waiting.
12. Tour and diligence checklist.
13. Ready-to-send agent or seller questions.
14. Sources, conflicts, methodology, checked dates, and limitations.

Only applicable modules appear as substantive analysis. An omitted module must
be represented in coverage metadata with its omission reason.

### Layer 3: Calculation and Audit View

Operations-facing and optionally buyer-visible views expose:

- Subject fact register and verification status.
- Comparable database, inclusion decisions, quality scores, and conflicts.
- Adjustment inputs, reasoning, weights, scenarios, and outputs.
- Ownership, renovation, scarcity, and waiting assumptions.
- Claim-to-source links and document-page maps.
- Calculation versions, formulas, units, rounding, and reconciliation results.
- Automated evaluations, human exception decisions, releases, and timestamps.

## Module Requirements

### Stage-specific recommendation and scope

Every analysis declares exactly one buyer-visible decision stage:

| Stage | Direct recommendation vocabulary | Required emphasis | Suppressed unless separately gated |
| --- | --- | --- | --- |
| `pre_tour` | `tour`, `skip`, `watch`, `investigate` | Buyer fit, likely disappointments, directional value context, location/property unknowns, tour checklist | Offer ceiling, affordability conclusion, negotiation ladder |
| `post_tour` | `revisit`, `pause`, `pursue`, `investigate` | Structured reactions and observations, disagreement, recommendation delta, follow-up evidence, proposed preferences | Unconfirmed preference changes; professional condition conclusions from buyer observations |
| `pre_offer` | `pursue`, `pause`, `investigate`, `offer-prep` | Current status, deeper comps, documents, records, condition, economics and deadline-aware diligence | Every conditional module whose evidence/input gate does not pass |

The recommendation must use the vocabulary for its declared stage. A direct
recommendation is required even when it is `investigate`; a generic summary or
score is not a substitute. Stage bounds reduce implied completeness—they do not
relax identity, evidence, privacy, professional-boundary, or rendering gates.

### Required for every delivered pack

| Module | Minimum deliverable |
| --- | --- |
| Identity and status | Normalized address; URL; ask; status; checked date; conflicts |
| Decision read | Recommendation, confidence, rationale, change conditions, actions |
| Buyer fit | Relevant buyer criteria, positive fit, tradeoffs, missing buyer context |
| Buyer questions | Every submitted question with a status and next action |
| Property snapshot | Beds, baths, finished area, lot, year, parking, taxes/HOA if known |
| Listing history | Price/status events with dates and source limits |
| Value context | Subject plus eligible comps, visible $/finished sf, range and caveats |
| Condition and diligence | Known findings, risks, unknowns, specialist verification |
| Records and rights | Permit/title/HOA/legal coverage status; never implied complete |
| Location context | Schools, safety, lifestyle, climate/site coverage or explicit gaps |
| Risks and unknowns | Prioritized, material, and tied to actions |
| Sources and limits | Claim links, access dates, conflicts, methodology, disclaimer |
| Automated release gate | Gate version, evaluator result, release time, contract and data versions |

### Conditional modules

| Module | Gate |
| --- | --- |
| Offer target, ladder, or ceiling | Live decision, adequate comp evidence, buyer intent, and numeric-guidance gates pass |
| Ownership economics | Buyer-approved financing/cash assumptions and current tax/insurance inputs or labeled estimates |
| Affordability judgment | Explicit buyer budget/cash-flow constraints; private by default |
| Renovation/capital plan | Relevant condition or buyer request; scoped allowances labeled as estimates |
| Cost of waiting | Time horizon, alternative housing cost, replacement assumptions, scenario disclosure |
| Scarcity/replacement analysis | Defined criteria and evidence; estimates labeled as judgments |
| Negotiation strategy | Current status/activity verified or explicitly unknown; agent/legal boundary |
| Document page maps | Corresponding uploaded document is readable and page-stable |
| Shareable partner/agent view | Buyer chooses included modules; financing and ceiling excluded by default |

Failure of a conditional gate suppresses the conclusion, not the topic. The pack
must state which inputs or verification are missing.

### Buyer preferences and media inputs

Buyer-fit claims reference a versioned preference with importance, source,
confidence, scope, household agreement state, created date, and last-confirmed
date. Request-specific priorities govern the request. A material preference is
stale when older than 30 days, contradicted by the request, followed by three
tours, or affected by a material budget/location/timeline change. Stale
preferences may trigger confirmation but cannot silently control a material
recommendation. Model- and tour-derived changes remain proposals until accepted.

P0 accepts page-stable documents, typed/pasted debriefs, and still photos.
Photo-derived statements are observations or inferences with image locators and
confidence; they are not professional inspection findings. P1 may add audio
capture and transcription. A structured voice record must retain transcript,
speaker/confidence metadata when available, notable statements, reactions,
observations, interpretations, questions, agreement/disagreement, preference
proposals, and recommendation implications. Video is P2 and cannot be accepted
or promised until a specific evidence, privacy, retention, and cost contract is
approved.

Initial-request media caps are `pre_tour: 2`, `post_tour: 3`, and
`pre_offer: 5`, with a 20 MB maximum per PDF, JPEG, PNG, or WebP file. These are
total caps, not per-selection caps. Excess files fail before staging or upload;
the buyer's other request data remains saved.

Audio/voice capture is experimental and P1 unless a release explicitly confirms
the transcript, correction, consent, retention, and structured-synthesis
acceptance criteria. Until then, P0 uses typed or pasted content and must not
represent keyword grouping as reliable voice understanding.

## Evidence Taxonomy

Every material statement has exactly one primary type:

- **Fact:** Directly supported by an identified source. Facts carry source,
  access date, and freshness. A fact may be `official-record`,
  `transaction-document`, `inspection-derived`, `listing-derived`,
  `buyer-supplied`, or `observed`.
- **Inference:** A reasoned conclusion from cited facts, with the reasoning
  stated and plausible alternatives acknowledged.
- **Judgment:** An analyst or reviewer evaluation, recommendation, adjustment,
  prioritization, or qualitative score. Its criteria and author/version are
  retained.
- **Assumption:** An editable input used for a calculation or scenario because
  the future is unknowable or an authoritative value is unavailable.
- **Unknown:** Information not established. It includes the decision relevance,
  attempted sources, and the smallest useful next step.

`Conflict` is a flag, not a sixth type. Conflicting facts retain every source
value and must not be merged into a false consensus. `Buyer-specific fit` is
normally a judgment derived from buyer-supplied criteria plus facts.

No model-generated statement becomes a fact by repetition. Absence of evidence
is not evidence of absence.

## Claims, Sources, and Citations

### Claim record

Every material claim stores:

- Stable claim ID and analysis version.
- Exact normalized proposition.
- Evidence type and subject.
- Materiality: `critical`, `material`, or `context`.
- Source links or assumption IDs.
- Source excerpt locator, not a long copied passage.
- Checked date and effective/event date when applicable.
- Confidence and conflict state.
- Validation/release state and public/share visibility.

Atomic claims are required. A sentence containing several independently
verifiable facts must link each fact or be split.

### Source record

A source stores provider, title, URL or private-file ID, source type,
publisher/author when available, access date, publication/effective date,
geography, permissions, retention class, and snapshot/hash when permitted.
Private documents never receive public URLs.

Preferred order is official record or original transaction document, then
MLS-distributed/listing evidence, then reputable secondary data. Portal
estimates and neighborhood aggregates are contextual and must not be presented
as appraisal-grade valuation evidence.

### Citation rules

- Critical and material factual claims require at least one direct source.
- High-consequence claims should use an authoritative primary source or be
  explicitly marked provisional and routed to professional verification.
- Listing status, price, days on market, taxes, schools, safety, permits, and
  market data carry a checked date.
- Cross-source conflicts are visible beside the affected claim.
- Sources attach to claims and comparable records, not only a bibliography.
- The bibliography is generated from used source records.

### Uploaded-document page references

Each PDF finding cites the document label and displayed PDF page. When printed
page numbering differs, store both, for example `PDF p. 9 (printed p. 7)`.
The citation stores file hash, document version, page index, and finding
locator. A replaced file creates a new document version; references never
silently retarget.

OCR-only text is labeled as OCR-derived until visually verified. Tables,
diagrams, handwritten notes, signatures, and ambiguous scans require visual
review. Page maps summarize findings but do not imply the entire document was
professionally interpreted.

## Comparable-Sale Contract

Every comparable table includes the subject as a visible reference row.

### Required fields for the subject

- Address, current ask and price date.
- Beds, baths, finished area, lot area, year built/remodeled, property type.
- Garage/parking, view, privacy, layout, condition/finish.
- Calculated ask per finished square foot.
- Source, checked date, verification/conflict state for every material field.

### Required fields for every comp

- Address and stable record ID.
- Sale date and recorded/verified sale price.
- Original/final list price, days on market, and concessions if reliably known.
- Beds, baths, finished area, lot area, year, property type.
- Garage, view, privacy, layout, condition/finish, and relevant micro-location.
- Calculated sale price per finished square foot.
- Source URL/record, checked date, conflicts, and quality score.
- Inclusion state: `primary`, `secondary`, `bracket`, or `excluded`, with reason.

### Price-per-finished-square-foot

`price_per_finished_sf = price / finished_area`

The calculation uses price and finished area shown in the same analysis record.
Finished area must use a declared, consistent definition. Missing or conflicting
area suppresses $/sf or labels it provisional. Store full precision; display
whole dollars. $/sf is a required cross-check, never the sole valuation method.

### Adjustment requirements

Each included adjusted comp stores category-level values and rationale for:

- Time/market conditions.
- Living area.
- Lot size and usability.
- Privacy.
- View.
- Micro-location.
- Age, condition, and finish.
- Bath count and layout.
- Garage and outdoor utility.
- Systems, condition, and identified risk.

`adjusted_value = sale_price + sum(category_adjustments)`

Positive means the subject is superior for that category; negative means the
comp is superior. Zero means no supported adjustment, not necessarily equality.
Every non-zero adjustment is a judgment with author, version, range or
sensitivity where feasible, evidence, and explanation.

Weights must be non-negative and total exactly 1.0 within the chosen comp
population. Weight rationale considers similarity, recency, evidence quality,
and gross-adjustment burden. The UI must identify the exact included population.
Large gross adjustments or weak source quality reduce confidence.

Low/base/high valuation cases must recalculate from scenario-specific category
assumptions or comp populations. Adding an unexplained fixed offset to an
aggregate result is not acceptable.

## Deterministic Calculations

The language model may propose inputs and explanations. Versioned code computes
and validates all quantitative outputs.

Every calculation stores calculator version, analysis version, inputs, source or
assumption IDs, units, method/formula, raw result, displayed result, rounding
rule, timestamp, and validation state.

Minimum specifications:

- **Weighted adjusted value:** `sum(adjusted_value_i * normalized_weight_i)`.
- **Mean/median/trimmed mean:** computed only from the explicitly named included
  population.
- **Mortgage P&I:** standard fully amortizing fixed-payment formula using
  principal, periodic rate, and number of periods.
- **Monthly ownership:** P&I + tax/12 + insurance + HOA + utilities + maintenance
  reserve + capital reserve. Included categories are visible; no double counting.
- **Maintenance/capital reserve:** explicit percentage base and period.
- **Renovation scenarios:** sum project allowances by selected timing and
  scenario. Recurring maintenance is separated from one-time capital.
- **Cost of waiting:** scenario-specific future price, financing, alternative
  housing, transaction timing, principal/equity treatment, and renovation
  difference. It must not be reduced to price appreciation plus rent while
  implying a complete economic comparison.
- **Discount/premium:** denominator and comparison anchor are explicit.
- **Scarcity score:** weighted inputs and denominator are explicit; market-count
  estimates remain judgments unless produced from a reproducible census.

Money is stored to cents and displayed according to view-specific declared
rounding. Rates are stored as decimals. Areas use square feet unless declared
otherwise. Dates use ISO 8601 internally.

## Reconciliation Checks

Delivery is blocked unless:

- All layers reference one releasable analysis version.
- Same-named metrics have the same raw value, formula version, and assumptions.
- Subject and comp $/sf recompute from displayed inputs within rounding tolerance.
- Category adjustments sum to each net adjustment.
- Net adjustment plus sale price equals adjusted value.
- Included comp weights total 1.0 within `0.000001`.
- Weighted contributions equal the weighted indication within $1.
- Low/base/high values derive from their declared scenario inputs.
- Monthly totals equal visible components within $1 after display rounding.
- Renovation summaries equal included project rows and do not silently mix
  recurring and one-time costs.
- Negotiation targets, ceilings, and ranges are ordered and identical across
  layers.
- Every critical/material fact has an eligible source or is relabeled.
- Every cited document page exists in the referenced file version.
- Every buyer question appears exactly once in the status register.
- Shared outputs exclude fields not approved for that share view.

## Buyer-Question Status Model

Each submitted or follow-up question retains the buyer's wording and receives:

- `answered`: supported response directly addresses the question.
- `partially_answered`: material parts remain unresolved.
- `open`: insufficient evidence; no reliable answer yet.
- `needs_buyer_input`: answer depends on missing preference or financial input.
- `needs_document`: a named document is required.
- `needs_professional_verification`: licensed/specialist judgment is required.
- `not_applicable`: rules-valid reason.
- `deferred`: buyer or exception handler intentionally postponed it.

Each status includes a concise answer, linked claims, remaining unknowns,
decision impact, next action, owner, and last-updated time. “Answered” is not
allowed when the response is only generic guidance.

## Confidence and Evidence Rules

Confidence is recorded separately for each material claim, module, and the
overall recommendation:

- **High:** authoritative/direct evidence, current enough for the decision,
  materially corroborated, and no unresolved conflict.
- **Moderate:** credible evidence supports the direction but a meaningful
  limitation, conflict, judgment, or freshness issue remains.
- **Low:** indirect, sparse, stale, materially conflicting, or assumption-heavy
  evidence.
- **Insufficient:** a conclusion would be misleading; report an unknown.

Overall confidence cannot exceed the lowest confidence among critical modules.
An exception handler may correct evidence or classification and rerun the gate,
but cannot waive this rule. Confidence expresses evidence quality, not
probability that the recommendation is “right.”

Required module coverage is measured, but coverage percentage must not obscure a
critical gap. Unavailable evidence creates an unknown and action, never invented
content. Material evidence becoming stale before delivery triggers refresh or a
visible warning.

## Automated Release System

### Release states

```text
draft -> validating -> evaluable -> released
             |             |
             v             v
          blocked       exception
                            |
                            v
                       corrected -> validating
```

- `draft`: analysis may change and cannot be delivered or shared.
- `validating`: deterministic schema, arithmetic, evidence, privacy, and
  rendering checks are running.
- `blocked`: at least one critical gate failed. The pack remains private and
  returns structured failure reasons.
- `evaluable`: deterministic gates passed and the immutable candidate is ready
  for the independent evaluator.
- `exception`: the evaluator found ambiguity, unsupported synthesis, a policy
  boundary, or another condition requiring human investigation.
- `released`: every critical gate passed, the evaluator returned `pass`, and the
  release manifest was signed by the server.
- `withdrawn`: a previously released pack was retracted because of correction,
  privacy, source, or policy concerns. Existing share links stop serving it.

Only `released` versions may be delivered or shared. Corrections always create a
new version and rerun the complete gate; humans cannot directly promote a pack.

Release is customer-visible and immediate: once deterministic gates pass, the
independent evaluator returns `pass`, and the server signs the manifest, the
private version becomes available to the authorized buyer and notification
begins. There is no routine human approval queue between `evaluable` and
`released`. Human work is limited to blocked/exception correction, buyer
appeals, policy changes, incidents, and asynchronous post-delivery audit.

Buyer-facing states map to `Request received`, `Researching`, `Needs your
input`, `Decision packet ready`, and `Correcting a result`. Internal validator,
evaluator, audit, and release codes are not buyer-facing statuses.

### Critical all-or-nothing gates

Every gate returns `pass` or `fail` with machine-readable reasons. There is no
warning-only path for:

1. **Identity:** one subject property/parcel is established without material
   ambiguity.
2. **Schema:** required records, types, versions, and state transitions validate.
3. **Evidence:** each critical/material factual claim meets its module minimum,
   source dates are present, and conflicts are disclosed.
4. **Questions:** every buyer question exists exactly once with a valid status,
   answer/unknown, decision impact, and next action.
5. **Calculations:** formulas, units, populations, scenario inputs, and
   reconciliation checks pass.
6. **Recommendation:** the decision read cites supporting claims, exposes
   counterevidence, states change conditions, and does not rely on a suppressed
   module.
7. **Professional boundary:** high-stakes unknowns remain unknown and name the
   appropriate specialist; no appraisal, inspection, legal, lending, title,
   environmental, insurance, or tax certainty is implied.
8. **Privacy and authorization:** ownership and field visibility pass; private
   inputs and another user's data cannot enter the release or share projection.
9. **Prompt-injection integrity:** untrusted source content did not alter system
   instructions, tools, evidence policy, or release behavior.
10. **Render integrity:** all released layers use the candidate version, preserve
    citations and limits, and introduce no uncatalogued claim or number.

### Evidence minimums by module

Meeting a count does not override a conflict or low-quality source. When a
minimum cannot be met, the module must be suppressed or explicitly report
coverage/unknowns as specified.

| Module | Minimum to release |
| --- | --- |
| Identity/status | Address plus parcel/unit resolution from one authoritative record or two independent credible sources; current status/ask checked within 24 hours for offer-stage use, otherwise visibly dated |
| Property snapshot | Source for every displayed material field; conflicts retained; no inferred missing dimensions |
| Listing history | Dated event records from MLS-distributed or corroborated portal evidence; current-state caveat when MLS is unavailable |
| Buyer fit | At least one explicit buyer priority tied to each fit judgment; missing context labeled |
| Buyer questions | Complete status register; each `answered` item linked to adequate claims |
| Value context | Subject plus at least three eligible closed comps for a directional range; at least five primary/secondary comps for numeric offer guidance, unless an exception is suppressed rather than waived; every row has source, sale date/price, finished area or explicit gap, $/sf when computable, and inclusion reason |
| Adjusted valuation | At least three primary comps; category rationales, normalized weights, sensitivity, gross-adjustment flags, and all arithmetic checks |
| Condition/documents | Every cited document finding has file version/page; OCR-sensitive material visually verified; document scope and limitations shown |
| Records/title/permits | Official lookup result or explicit `not obtained`; absence of a found record is never stated as proof of no issue |
| Schools | Official assignment/boundary evidence or explicit assignment unknown; ratings only as secondary context |
| Safety | Official/local data with period and geography or an explicit coverage gap; reputation/third-party grades cannot establish safety |
| Climate/site | Applicable official hazard source or explicit not-checked/unknown state |
| Ownership economics | Buyer-approved purchase/down-payment/rate/term plus sourced or labeled tax, insurance, HOA, utilities, maintenance, and reserve inputs |
| Renovation/capital | Finding or buyer-request basis for each line; low/base/high allowance source class; recurring and one-time costs separated |
| Cost of waiting | Explicit horizon, alternative housing, future-price and rate scenarios, replacement differences, and disclosed exclusions |
| Numeric negotiation | Value-context and adjusted-valuation minimums, current status/activity check, buyer intent, uncertainty range, and hard-stop disclaimer |
| Scarcity | Reproducible criteria and results, or the output is labeled an analyst judgment rather than a market count |

For schools, official assignment must include the applicable school year or
effective date, boundary source, and checked date. Ratings are secondary context
and cannot establish assignment or quality. For safety, the release must state
dataset owner, observation period, geography, category definitions, property
relationship, and reporting limitations. “Safe/unsafe” conclusions and
reputation-based substitutes fail the evidence and recommendation gates.

### Independent evaluator

After deterministic gates pass, a second model/evaluator receives the immutable
candidate, relevant claim graph, gate results, and evaluation rubric. It must be
independent from the drafting run: no shared hidden reasoning, no authority to
edit the pack, no tool access that changes records, and no awareness of a desired
commercial or negotiating outcome.

It may return only:

- `pass`: no enumerated release defect found.
- `exception`: one or more structured defect codes, affected claim/module IDs,
  explanation, and required correction or human investigation.

The evaluator checks evidence-to-claim entailment, overstatement, internal
contradiction, recommendation support, counterevidence, question completeness,
professional boundaries, and user-facing clarity. It does not:

- Establish facts from its own memory.
- Supply missing sources or calculations.
- Resolve source conflicts.
- Waive evidence minimums or deterministic failures.
- Decide whether an offer, property, or price is personally right for the buyer.
- Promote a candidate to `released`.

The release service verifies evaluator identity/version, candidate hash, pass
schema, and unchanged deterministic results before signing the release manifest.
Evaluator timeout, malformed output, model unavailability, or uncertainty fails
closed to `exception`.

### Human exception handling

A human may inspect a blocked/exception case, correct claims, sources,
classifications, buyer inputs, formulas, or policy configuration, and document
the change. A human may also suppress an optional module. The corrected version
must restart at `validating`; no person may override a critical gate or manually
mark it `released`.

### Post-delivery sampling

- Randomly audit at least 20% of alpha releases and 10% of private-beta releases,
  with a minimum of five audits per week when volume permits.
- Audit 100% of numeric offer guidance during alpha, plus all packs with
  environmental, structural, title, insurance, legal, or low-confidence critical
  issues.
- Risk-weight sampling by evaluator version, source adapter, geography, document
  OCR use, valuation complexity, and recent rule changes.
- Score material factual error, unsupported inference, arithmetic/reconciliation
  failure, missed risk, privacy exposure, question completeness, and decision
  clarity.
- Any privacy exposure, cross-user data, critical arithmetic failure, or
  materially unsafe high-stakes statement triggers immediate withdrawal,
  affected-user notification review, release pause for the implicated version,
  and incident investigation.
- Repeated material defects trigger a kill switch and return that module or the
  entire service to human exception handling until corrected fixtures pass.
- Sampling results version the rubric and gates; they never silently rewrite a
  released pack.

Sampling is asynchronous and never inserts a routine reviewer wait before a
gate-passing release. Audit selection is recorded at release time. A selected
audit records owner, due time, outcome, affected modules/claims, and corrective
action. Withdrawal and buyer-notification rules apply immediately when a hard
stop defect is found.

## Hard Stops

A pack cannot move to `released` when any of the following applies:

- Subject identity or parcel/unit is materially uncertain.
- A critical factual claim lacks evidence or is contradicted without disclosure.
- A claimed current status, ask, offer activity, or decision deadline is stale
  enough to mislead.
- A material uploaded document is unreadable, incomplete, or page references
  cannot be verified.
- Comparable population, finished area, sale price, or weight arithmetic is
  materially unresolved.
- A calculation or cross-layer reconciliation check fails.
- Low/base/high scenarios are unexplained aggregate offsets.
- A recommendation depends on a suppressed conditional module.
- Offer ceiling, affordability, or personalized financing appears without
  adequate buyer inputs and the applicable automated gates.
- Environmental, structural, title, legal, lending, insurance, or inspection
  uncertainty is presented as professionally resolved.
- A critical buyer question is omitted.
- The output exposes another user’s data, an unauthorized private field, or a
  private document/source.
- Prompt injection or untrusted-document instructions may have influenced
  system behavior or evidence selection.
- Release manifest, evaluator/gate version, contract version, or canonical
  analysis version is missing or does not match the candidate hash.

## Sanitized Barrett Fixture Specification

The current Barrett source artifacts remain private and unchanged. The fixture
will be a newly created synthetic/sanitized derivative only after approval.

### Purpose

The fixture must test reasoning depth and cross-layer consistency, not preserve
Michael's exact finances, preferences, negotiating position, or private
documents.

### Required fixture components

- Synthetic address and altered listing/transaction identifiers.
- Sanitized buyer priorities that preserve the analytical tensions: large usable
  lot, privacy, long-term layout, garage, dated finishes, bath/layout compromise.
- Synthetic source records representing listing portals, official records, and
  a page-stable inspection packet.
- Subject fact register with verified, inspection-derived, assumed, conflicting,
  and unknown examples.
- At least six comps plus subject, including primary, bracket, excluded, and
  conflicting records.
- Category-level comp adjustments, normalized weights, and truly recalculated
  low/base/high scenarios.
- Inspection/document page map with positive findings, limitations, and open
  diligence.
- Renovation/capital scenarios with recurring costs separated.
- Optional ownership, negotiation, scarcity, and waiting modules using fictional
  buyer assumptions.
- At least six buyer questions spanning all major statuses.
- Claim graph, conflict examples, citations, release/exception events, visibility rules,
  and expected validation results.
- Expected Layer 1, Layer 2, and Layer 3 snapshots generated from the same record.

### Sanitization requirements

- Replace address, names, contact details, URLs, parcel/MLS identifiers, document
  metadata, personal budget, down payment, rate, utilities, rent, target,
  ceiling, and seller-specific strategy.
- Shift or synthesize prices, dates, areas, and costs while preserving formula
  relationships and representative complexity.
- Use licensed, permitted, or wholly synthetic images and documents.
- Do not publish original inspection pages, portal screenshots, photographs, or
  source text merely because obvious identifiers were removed.
- Run a privacy review and arithmetic/reconciliation suite before fixture use.

### Barrett reconciliation items captured by the fixture

- The memo's adjusted model uses six displayed comps with normalized weights and
  produces approximately $2.216M. The workbook includes eight comps and produces
  $2,210,850. The fixture must choose and declare one population; neither value
  is silently canonical.
- The memo's monthly ownership table differs from workbook formula results by
  roughly $95-$111 per month at several price points, while the target still
  rounds to approximately $13.65K. The fixture must derive every view from one
  component set.
- The workbook's low/base/high aggregate outputs appear to be fixed offsets from
  base rather than category-level scenario recalculations. The fixture must use
  explicit scenario inputs.
- Workbook scarcity counts and replacement timing are screening judgments, not a
  reproducible MLS census. The fixture must label them accordingly.
- The source appendix supports broad groups of facts but does not provide
  claim-level links for all comp and subject fields. The fixture must.

## Open Decisions

1. **Default paid unit:** Recommend one base Decision Pack with conditional deep
   modules, rather than “Quick Scan” and “Deep Pack” as two different quality
   standards. A faster scan can be a preview, but factual standards should not
   weaken. Product approval needed.
2. **Canonical Barrett computation:** Choose whether the reference valuation
   population is the memo's six verified comps or the workbook's eight-comp
   model after source verification. Do not choose based on the preferred number.
3. **Financial privacy:** Recommend excluding financing, affordability, target,
   and walk-away fields from share links by default, with explicit per-share
   inclusion.
4. **Offer guidance in alpha:** Numeric ranges require the stricter automated
   evidence gates and 100% post-delivery human sampling during alpha; otherwise
   deliver negotiation questions and evidence without a numeric ceiling.
5. **Confidence display:** Recommend module confidence plus a plain-language
   overall confidence, not a pseudo-precise percentage.
6. **Source snapshots:** Decide what portal and official-record content may be
   retained under provider terms; store metadata/hash when a snapshot is not
   permitted.
7. **Fixture publication:** Decide whether the sanitized Barrett derivative is
   internal-only for P0 or also becomes the public landing-page example after a
   separate privacy and rights review.

## P0 Acceptance Tests for This Contract

- A fixture can render all three layers without manually copied values.
- Every required module is present or carries a rules-valid coverage-gap record.
- Every material fact resolves to an eligible source and date.
- All comparable, calculation, citation, question, privacy, and reconciliation
  checks pass.
- An auditor can identify why the recommendation was made, what could change it,
  and which professional verifications remain.
- A share view can be proven free of excluded private fields.
