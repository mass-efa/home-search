const test = require("node:test");
const assert = require("node:assert/strict");
const approval = require("./index.js");

function passingInput() {
  return {
    analysisDraftId: "draft-1",
    inputHash: "sha256:abc",
    validatorSuiteVersion: "validators:v1",
    decidedAt: "2026-07-29T12:00:00.000Z",
    validators: approval.DEFAULT_CRITICAL_GATES.map((id) => ({ id, status: "pass" })),
    independentEvaluator: {
      evaluatorVersion: "evaluator:v1",
      inputHash: "sha256:abc",
      status: "passed",
      findingCodes: []
    }
  };
}

test("auto-approves only a complete clean input", () => {
  const manifest = approval.decideApproval(passingInput());
  assert.equal(manifest.outcome, approval.OUTCOMES.AUTO_APPROVED);
  assert.deepEqual(manifest.reasonCodes, []);
  assert.equal(Object.isFrozen(manifest), true);
  assert.equal(Object.isFrozen(manifest.validators), true);
});

test("fails closed when a critical validator is missing", () => {
  const input = passingInput();
  input.validators = input.validators.filter((item) => item.id !== "schema_validity");
  const manifest = approval.decideApproval(input);
  assert.equal(manifest.outcome, approval.OUTCOMES.FAILED);
  assert.ok(manifest.reasonCodes.includes("missing_critical_validator"));
});

test("callers can add but cannot remove default critical gates", () => {
  const input = passingInput();
  input.criticalGates = [];
  input.validators = input.validators.filter((item) => item.id !== "schema_validity");
  assert.equal(approval.decideApproval(input).outcome, approval.OUTCOMES.FAILED);
});

test("routes evidence gate failures to insufficient evidence", () => {
  const input = passingInput();
  input.validators.find((item) => item.id === "claim_source_linkage").status = "fail";
  const manifest = approval.decideApproval(input);
  assert.equal(manifest.outcome, approval.OUTCOMES.INSUFFICIENT_EVIDENCE);
});

test("routes policy failures to needs review", () => {
  const input = passingInput();
  input.validators.find((item) => item.id === "prohibited_certainty").status = "fail";
  const manifest = approval.decideApproval(input);
  assert.equal(manifest.outcome, approval.OUTCOMES.NEEDS_REVIEW);
});

test("treats independent evaluator blocking findings as needs review", () => {
  const input = passingInput();
  input.independentEvaluator.status = "blocking_findings";
  input.independentEvaluator.findingCodes = ["unsupported_material_claim"];
  const manifest = approval.decideApproval(input);
  assert.equal(manifest.outcome, approval.OUTCOMES.NEEDS_REVIEW);
  assert.ok(manifest.reasonCodes.includes("unsupported_material_claim"));
});

test("fails closed on evaluator error or input mismatch", () => {
  const errorInput = passingInput();
  errorInput.independentEvaluator.status = "error";
  assert.equal(approval.decideApproval(errorInput).outcome, approval.OUTCOMES.FAILED);

  const mismatchInput = passingInput();
  mismatchInput.independentEvaluator.inputHash = "sha256:different";
  assert.equal(approval.decideApproval(mismatchInput).outcome, approval.OUTCOMES.FAILED);
});

test("fails closed for a validator error even with a custom failure code", () => {
  const input = passingInput();
  const validator = input.validators.find((item) => item.id === "schema_validity");
  validator.status = "error";
  validator.failureCode = "validator_timeout";
  assert.equal(approval.decideApproval(input).outcome, approval.OUTCOMES.FAILED);
});

test("rejects attempted human or model override", () => {
  const human = passingInput();
  human.humanOverride = "auto_approved";
  assert.equal(approval.decideApproval(human).outcome, approval.OUTCOMES.FAILED);

  const model = passingInput();
  model.modelOverride = "auto_approved";
  assert.equal(approval.decideApproval(model).outcome, approval.OUTCOMES.FAILED);
});
