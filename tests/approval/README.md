# Automated Approval Golden Tests

This dependency-free suite converts the P0 Decision Pack release contract into
executable examples. It tests release eligibility; it is not the production
validator or a substitute for integration, authorization, source-adapter, and
rendering tests.

Run from the repository root:

```bash
node tests/approval/run.js
```

## Assets

- `fixtures/canonical-candidate.json`: synthetic, releasable candidate.
- `fixtures/adversarial-variants.json`: small patches that create blocking cases.
- `expected-outcomes.json`: exact release result and failure codes.
- `run.js`: dependency-free Node runner and reference validations.

The runner uses a fixed clock matching the synthetic fixture so results do not
decay with wall time.

## Coverage

The canonical candidate demonstrates:

- Resolved property identity.
- Atomic sourced claims and a page-stable inspection citation.
- Complete buyer-question statuses.
- Five eligible comps with visible $/finished square foot.
- Category adjustments, normalized weights, deterministic weighted value, and
  recalculated scenarios.
- Recommendation support, counterevidence, change conditions, and professional
  boundaries.
- Same-user authorization, safe share projection, render consistency, and an
  independent evaluator pass bound to the candidate hash.

The adversarial set proves fail-closed behavior for:

1. Property/parcel ambiguity.
2. Unsupported critical evidence.
3. Missing buyer questions.
4. Comparable weight and weighted-value drift.
5. Incorrect price per finished square foot.
6. Invalid or unverified document-page citations.
7. Missing professional boundary.
8. Cross-user data.
9. Private fields in a share projection.
10. Executed prompt injection.
11. Stale status used for numeric offer guidance.
12. Too few eligible comps for numeric guidance.
13. Fixed-offset rather than recalculated scenarios.
14. Independent evaluator exception.
15. Evaluator/candidate hash mismatch.
16. Render/analysis version mismatch.

## Schema assumptions

These fixtures intentionally use a small contract-facing schema rather than
prematurely choosing the production database shape:

- IDs are opaque strings.
- Dates are ISO 8601; money is numeric dollars; rates would be decimals.
- A candidate is immutable once it enters `evaluable`.
- `critical` and `material` factual claims require valid source IDs.
- Numeric offer guidance requires five eligible primary/secondary closed comps
  and status checked within 24 hours.
- Comp weights apply to the eligible population and total exactly `1.0`.
- Calculations retain full precision; validations use explicit tolerances.
- Uploaded-document citations bind file ID, file hash, PDF page, page existence,
  and visual verification.
- Share authorization is evaluated on the rendered projection, not inferred
  from workspace ownership.
- The evaluator can only pass or return an exception and must bind its result to
  the immutable candidate hash.

When production schemas are introduced, adapters should map them into this
logical validation shape or these fixtures should be version-migrated. Failure
codes should remain stable enough for operations, metrics, and user-safe status
messages.
