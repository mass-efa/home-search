"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { mapEvidence } = require("./index.js");

const sources = [
  {
    id: "official-parcel",
    title: "County parcel record",
    origin: "official_record",
    retrievedAt: "2026-07-29T12:00:00Z",
    url: "https://example.invalid/parcel"
  },
  {
    id: "listing",
    title: "Normalized listing",
    origin: "listing_adapter",
    retrievedAt: "2026-07-29T12:00:00Z"
  },
  {
    id: "buyer-text",
    title: "Buyer intake",
    origin: "buyer_submitted",
    retrievedAt: "2026-07-29T12:00:00Z",
    privateFileId: "intake/1"
  }
];

function baseInput() {
  return {
    identity: {
      resolved: true,
      address: "100 Example Ave, Seattle, WA 98101",
      parcelId: "SYNTHETIC-100",
      sourceIds: ["official-parcel", "listing"],
      checkedAt: "2026-07-29T12:00:00Z",
      conflict: false
    },
    sources,
    evaluation: { claims: [] }
  };
}

test("maps a resolved critical identity claim to eligible evidence", () => {
  const result = mapEvidence(baseInput());
  assert.deepEqual(result.claims[0], {
    id: "claim-property-identity",
    kind: "fact",
    classification: "fact",
    materiality: "critical",
    text: "The subject property is 100 Example Ave, Seattle, WA 98101.",
    evidenceStatus: "supported",
    sourceIds: ["official-parcel", "listing"],
    checkedAt: "2026-07-29T12:00:00Z",
    conflict: false,
    parcelId: "SYNTHETIC-100"
  });
});

test("blocks critical identity laundering when identity has only buyer text", () => {
  const input = baseInput();
  input.identity.sourceIds = ["buyer-text"];
  const identity = mapEvidence(input).claims[0];
  assert.equal(identity.classification, "unknown");
  assert.equal(identity.evidenceStatus, "unverified");
  assert.deepEqual(identity.sourceIds, []);
  assert.equal(identity.materiality, "critical");
});

test("represents conflicting identity candidates as a critical unknown", () => {
  const input = baseInput();
  input.identity.conflict = true;
  input.identity.candidates = [
    { value: "100 Example Ave", sourceId: "official-parcel" },
    { value: "100 Example Ave Unit B", sourceId: "listing" }
  ];
  const identity = mapEvidence(input).claims[0];
  assert.equal(identity.classification, "unknown");
  assert.equal(identity.conflict, true);
  assert.deepEqual(identity.sourceIds, []);
  assert.deepEqual(identity.conflictSourceIds, ["official-parcel", "listing"]);
});

test("maps an adapter-supported fact and keeps buyer text only as corroboration", () => {
  const input = baseInput();
  input.evaluation.claims.push({
    id: "claim-beds",
    classification: "fact",
    materiality: "material",
    text: "The listing reports four bedrooms.",
    sourceIds: ["listing", "buyer-text"],
    checkedAt: "2026-07-29T12:00:00Z"
  });
  const claim = mapEvidence(input).claims[1];
  assert.equal(claim.kind, "fact");
  assert.equal(claim.evidenceStatus, "supported");
  assert.deepEqual(claim.sourceIds, ["listing"]);
  assert.deepEqual(claim.buyerCorroborationSourceIds, ["buyer-text"]);
});

test("never launders a buyer-submitted assertion into a supported fact", () => {
  const input = baseInput();
  input.evaluation.claims.push({
    id: "claim-roof",
    classification: "fact",
    materiality: "critical",
    text: "The roof was replaced last year.",
    sourceIds: ["buyer-text"],
    checkedAt: "2026-07-29T12:00:00Z"
  });
  const claim = mapEvidence(input).claims[1];
  assert.equal(claim.classification, "unknown");
  assert.equal(claim.kind, "fact");
  assert.equal(claim.evidenceStatus, "unverified");
  assert.deepEqual(claim.sourceIds, []);
  assert.deepEqual(claim.buyerSubmittedSourceIds, ["buyer-text"]);
});

test("preserves an inference without converting it to a fact", () => {
  const input = baseInput();
  input.evaluation.claims.push({
    id: "claim-leverage",
    classification: "inference",
    materiality: "material",
    text: "Long marketing time may create negotiating leverage.",
    sourceIds: ["listing"],
    reasoning: "The normalized listing history shows extended exposure.",
    checkedAt: "2026-07-29T12:00:00Z"
  });
  const claim = mapEvidence(input).claims[1];
  assert.equal(claim.kind, "inference");
  assert.equal(claim.classification, "inference");
  assert.equal(claim.evidenceStatus, "supported");
  assert.deepEqual(claim.sourceIds, ["listing"]);
});

test("emits a source-free unverified unknown when evidence is missing", () => {
  const input = baseInput();
  input.evaluation.claims.push({
    id: "claim-permit",
    classification: "unknown",
    materiality: "critical",
    text: "Permit closure is not established.",
    sourceIds: ["missing-source"],
    nextAction: "Obtain the official permit record.",
    checkedAt: "2026-07-29T12:00:00Z"
  });
  const claim = mapEvidence(input).claims[1];
  assert.equal(claim.classification, "unknown");
  assert.equal(claim.evidenceStatus, "unverified");
  assert.deepEqual(claim.sourceIds, []);
  assert.deepEqual(claim.attemptedSourceIds, ["missing-source"]);
});

test("maps buyer preferences as buyer judgments, not official facts", () => {
  const input = baseInput();
  input.evaluation.claims.push({
    id: "claim-yard-fit",
    classification: "buyer_judgment",
    materiality: "material",
    text: "The yard feels large enough for the buyer.",
    sourceIds: ["buyer-text"],
    checkedAt: "2026-07-29T12:00:00Z"
  });
  const claim = mapEvidence(input).claims[1];
  assert.equal(claim.kind, "buyer_judgment");
  assert.equal(claim.classification, "judgment");
  assert.equal(claim.evidenceStatus, "supported");
  assert.deepEqual(claim.sourceIds, ["buyer-text"]);
});

test("normalizes source permissions according to provenance", () => {
  const result = mapEvidence(baseInput());
  assert.equal(result.sources[0].permission, "allowed");
  assert.equal(result.sources[2].permission, "buyer_provided");
});
