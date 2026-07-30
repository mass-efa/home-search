# Automated Approval Engine

`index.js` is a dependency-free, fail-closed policy engine. It does not generate or evaluate a home analysis itself. It consumes:

- Immutable identifiers and version fields for an analysis candidate.
- Results from deterministic validators.
- The result of a separately executed independent evaluator.

It returns a deeply frozen decision manifest with exactly one outcome:

- `auto_approved`
- `needs_review`
- `insufficient_evidence`
- `failed`

## Input

```js
{
  decisionId: "optional database-generated id",
  analysisDraftId: "required",
  inputHash: "required hash of the frozen evaluation input",
  policyVersion: "alpha-approval-policy:v1",
  validatorSuiteVersion: "alpha-validator-suite:v1",
  decidedAt: "optional server timestamp",
  validators: [
    {
      id: "schema_validity",
      status: "pass" // pass | fail | error
    }
  ],
  independentEvaluator: {
    evaluatorVersion: "alpha-independent-evaluator:v1",
    inputHash: "must equal the top-level inputHash",
    status: "passed", // passed | blocking_findings | error
    findingCodes: []
  }
}
```

All default critical validator IDs must be present. A missing/error result, malformed input, evaluator error, or evaluator input-hash mismatch returns `failed`. Failed evidence gates return `insufficient_evidence`. Other policy or independent-evaluator findings return `needs_review`. Only a complete clean set returns `auto_approved`.

Do not pass prose or a generator self-score as a validator result. Validator statuses must come from deterministic application code. The independent evaluator is input to policy; it never directly approves.

## Node

```js
const { decideApproval } = require("./lib/approval");
const manifest = decideApproval(input);
```

## Browser

Load `lib/approval/index.js`, then call:

```js
const manifest = window.HomeSearchApproval.decideApproval(input);
```

## Integration

1. Freeze the analysis request/candidate input and calculate `inputHash` server-side.
2. Run every deterministic validator and persist its immutable result.
3. Run the independent evaluator against that same input hash and persist its immutable result.
4. Call `decideApproval`.
5. Persist the returned manifest and state transition in one transaction.
6. Create an approved result only when `manifest.outcome === "auto_approved"`.

Database authorization must prevent browsers, owners, generators, and evaluator calls from writing approval decisions. A server-side kill switch should bypass this engine and record `needs_review`; it must never synthesize a passing input.

## Minimal Decision Pack

`validators.js` deterministically converts a canonical candidate into the engine's validator array:

```js
{
  schemaVersion: "decision-pack:v1",
  decisionRead: "Needs diligence",
  disclaimer: "This is a research aid. Verify material facts.",
  sections: [{ id: "decision_read", content: "..." }],
  buyerQuestions: [{ id: "q1", text: "..." }],
  questionAnswers: [{ questionId: "q1", answer: "..." }],
  claims: [{
    id: "c1",
    kind: "fact", // fact | inference | buyer_judgment
    text: "...",
    evidenceStatus: "supported", // supported | unverified | not_applicable
    sourceIds: ["s1"],
    checkedAt: "2026-07-29T12:00:00Z"
  }],
  sources: [{
    id: "s1",
    title: "...",
    permission: "allowed", // allowed | buyer_provided by default
    retrievedAt: "2026-07-29T12:00:00Z"
  }],
  calculations: [{
    id: "payment",
    displayedResult: 5000,
    recomputedResult: 5000,
    tolerance: 0.01
  }],
  sharePayload: { decisionRead: "Needs diligence" }
}
```

Required section IDs are exported as `REQUIRED_SECTION_IDS`. Call:

```js
const results = HomeSearchApprovalValidators.validateDecisionPack(candidate, {
  now: "2026-07-29T12:00:00Z",
  maxSourceAgeDays: 365
});
```

Pass `results` directly as `decideApproval(...).validators`. Production must supply a trusted server timestamp through `now`; tests should always pin it. Configuration may tighten gates but approval policy must not use configuration to remove the engine's default critical gates.
