# Claim-Level Evidence Mapper

`index.js` maps normalized property identity, source-adapter results, and draft
evaluation claims into the `claims` and `sources` arrays accepted by
`lib/approval/validators.js`.

```js
const { mapEvidence } = require("./lib/evidence");

const mapped = mapEvidence({
  identity: {
    resolved: true,
    address: "100 Example Ave, Seattle, WA 98101",
    parcelId: "SYNTHETIC-100",
    sourceIds: ["parcel", "listing"],
    checkedAt: "2026-07-29T12:00:00Z",
    conflict: false
  },
  sources: [
    {
      id: "parcel",
      title: "County parcel record",
      origin: "official_record",
      retrievedAt: "2026-07-29T12:00:00Z"
    },
    {
      id: "listing",
      title: "Normalized listing",
      origin: "listing_adapter",
      retrievedAt: "2026-07-29T12:00:00Z"
    }
  ],
  evaluation: {
    claims: [
      {
        id: "beds",
        classification: "fact",
        materiality: "material",
        text: "The listing reports four bedrooms.",
        sourceIds: ["listing"],
        checkedAt: "2026-07-29T12:00:00Z"
      }
    ]
  }
});
```

Recognized source origins are `official_record`, `listing_adapter`,
`document_adapter`, and `buyer_submitted`. Only the first three can support a
factual claim. Buyer text can support a `buyer_judgment` or be retained as
corroboration, but it cannot become an official fact.

Unknowns use `kind: "fact"`, `classification: "unknown"`,
`evidenceStatus: "unverified"`, and an empty `sourceIds` array. This preserves
the richer product taxonomy while matching the current approval validator
schema. Conflicting identity evidence becomes a critical unknown and therefore
fails closed.

Run:

```bash
node --test lib/evidence/index.test.cjs
```
