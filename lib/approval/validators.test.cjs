const test = require("node:test");
const assert = require("node:assert/strict");
const validators = require("./validators.js");
const approval = require("./index.js");

const NOW = "2026-07-29T12:00:00.000Z";

function validCandidate() {
  return {
    schemaVersion: "decision-pack:v1",
    decisionRead: "Needs diligence",
    disclaimer: "This is a research aid. Verify material facts with qualified professionals.",
    sections: validators.REQUIRED_SECTION_IDS.map((id) => ({
      id,
      content: "Decision-support content for " + id + "."
    })),
    buyerQuestions: [{ id: "q1", text: "What should I investigate?" }],
    questionAnswers: [{ questionId: "q1", answer: "Verify drainage and permits." }],
    claims: [{
      id: "claim-1",
      kind: "fact",
      text: "The source reports a 2024 permit.",
      evidenceStatus: "supported",
      sourceIds: ["source-1"],
      checkedAt: "2026-07-28T12:00:00.000Z"
    }],
    sources: [{
      id: "source-1",
      title: "County permit record",
      permission: "allowed",
      retrievedAt: "2026-07-28T12:00:00.000Z"
    }],
    calculations: [{
      id: "calc-1",
      displayedResult: 2500,
      recomputedResult: 2500.005,
      tolerance: 0.01
    }],
    sharePayload: {
      decisionRead: "Needs diligence",
      summary: "Verify drainage and permits."
    }
  };
}

function resultsById(candidate, options) {
  return Object.fromEntries(
    validators.validateDecisionPack(candidate, { now: NOW, ...options })
      .map((result) => [result.id, result])
  );
}

test("valid candidate passes all approval engine default gates", () => {
  const results = validators.validateDecisionPack(validCandidate(), { now: NOW });
  assert.deepEqual(results.map((item) => item.id), approval.DEFAULT_CRITICAL_GATES);
  assert.ok(results.every((item) => item.status === "pass"));
});

test("schema and required section gates fail deterministically", () => {
  const candidate = validCandidate();
  candidate.schemaVersion = "";
  candidate.sections = candidate.sections.filter((section) => section.id !== "buyer_fit");
  const results = resultsById(candidate);
  assert.equal(results.schema_validity.status, "fail");
  assert.equal(results.required_sections.status, "fail");
});

test("buyer question coverage catches missing answers", () => {
  const candidate = validCandidate();
  candidate.questionAnswers = [];
  assert.equal(resultsById(candidate).focus_question_coverage.status, "fail");
});

test("claim-source linkage catches missing and unknown sources", () => {
  const candidate = validCandidate();
  candidate.claims[0].sourceIds = ["missing-source"];
  assert.equal(resultsById(candidate).claim_source_linkage.status, "fail");
});

test("source permissions fail closed", () => {
  const candidate = validCandidate();
  candidate.sources[0].permission = "unknown";
  assert.equal(resultsById(candidate).source_permission.status, "fail");
});

test("freshness and checked-date gates are separate", () => {
  const candidate = validCandidate();
  candidate.sources[0].retrievedAt = "2020-01-01T00:00:00.000Z";
  candidate.claims[0].checkedAt = "";
  const results = resultsById(candidate, { maxSourceAgeDays: 365 });
  assert.equal(results.source_freshness.status, "fail");
  assert.equal(results.checked_dates.status, "fail");
});

test("calculation gate compares displayed and recomputed values", () => {
  const candidate = validCandidate();
  candidate.calculations[0].recomputedResult = 2600;
  assert.equal(resultsById(candidate).calculation_reconciliation.status, "fail");
});

test("prohibited certainty language is rejected", () => {
  const candidate = validCandidate();
  candidate.decisionRead = "The title is clear and this home will pass inspection.";
  assert.equal(resultsById(candidate).prohibited_certainty.status, "fail");
});

test("disclaimer must contain required policy terms", () => {
  const candidate = validCandidate();
  candidate.disclaimer = "For information only.";
  assert.equal(resultsById(candidate).disclaimer_presence.status, "fail");
});

test("private fields cannot appear anywhere in share payload", () => {
  const candidate = validCandidate();
  candidate.sharePayload.details = { financingConstraints: "$6,000 monthly limit" };
  assert.equal(resultsById(candidate).share_field_privacy.status, "fail");
});

test("output size, claim count, and text limits are enforced", () => {
  const candidate = validCandidate();
  candidate.sections[0].content = "x".repeat(41);
  assert.equal(resultsById(candidate, { maxTextLength: 40 }).output_limits.status, "fail");
});

test("validator results feed the approval engine without translation", () => {
  const candidate = validCandidate();
  const deterministicResults = validators.validateDecisionPack(candidate, { now: NOW });
  const manifest = approval.decideApproval({
    analysisDraftId: "draft-1",
    inputHash: "sha256:decision-pack",
    validatorSuiteVersion: validators.VALIDATOR_SUITE_VERSION,
    validators: deterministicResults,
    independentEvaluator: {
      evaluatorVersion: "independent-evaluator:v1",
      inputHash: "sha256:decision-pack",
      status: "passed",
      findingCodes: []
    }
  });
  assert.equal(manifest.outcome, approval.OUTCOMES.AUTO_APPROVED);
});
