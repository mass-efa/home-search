/*
 * Home-Finding Buddy automated approval engine.
 *
 * Dependency-free UMD module: use `require("./lib/approval")` in Node or
 * `window.HomeSearchApproval` in a browser. The engine does not call a model,
 * fetch sources, or permit human/model overrides. It only evaluates recorded
 * deterministic validator results and one independent evaluator result.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HomeSearchApproval = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ENGINE_VERSION = "approval-engine:v1";
  var DEFAULT_POLICY_VERSION = "alpha-approval-policy:v1";
  var OUTCOMES = Object.freeze({
    AUTO_APPROVED: "auto_approved",
    NEEDS_REVIEW: "needs_review",
    INSUFFICIENT_EVIDENCE: "insufficient_evidence",
    FAILED: "failed"
  });

  var VALIDATOR_STATUSES = Object.freeze(["pass", "fail", "error"]);
  var EVALUATOR_STATUSES = Object.freeze(["passed", "blocking_findings", "error"]);

  var DEFAULT_CRITICAL_GATES = Object.freeze([
    "schema_validity",
    "required_sections",
    "focus_question_coverage",
    "claim_source_linkage",
    "source_permission",
    "source_freshness",
    "checked_dates",
    "calculation_reconciliation",
    "prohibited_certainty",
    "disclaimer_presence",
    "share_field_privacy",
    "output_limits"
  ]);

  var EVIDENCE_GATES = Object.freeze([
    "claim_source_linkage",
    "source_permission",
    "source_freshness",
    "checked_dates"
  ]);

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function uniqueStrings(values) {
    var seen = Object.create(null);
    var output = [];
    (values || []).forEach(function (value) {
      if (!isNonEmptyString(value) || seen[value]) return;
      seen[value] = true;
      output.push(value);
    });
    return output;
  }

  function cloneJson(value) {
    if (value === undefined) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.keys(value).forEach(function (key) {
      deepFreeze(value[key]);
    });
    return Object.freeze(value);
  }

  function reason(code, source, detail) {
    var item = { code: code, source: source };
    if (isNonEmptyString(detail)) item.detail = detail;
    return item;
  }

  function invalidManifest(input, errors) {
    return makeManifest(input, OUTCOMES.FAILED, errors.map(function (message) {
      return reason("invalid_approval_input", "engine", message);
    }), [], null);
  }

  function validateInput(input) {
    var errors = [];
    if (!isRecord(input)) return ["Approval input must be an object."];
    if (!isNonEmptyString(input.analysisDraftId)) errors.push("analysisDraftId is required.");
    if (!isNonEmptyString(input.inputHash)) errors.push("inputHash is required.");
    if (!isNonEmptyString(input.validatorSuiteVersion)) errors.push("validatorSuiteVersion is required.");
    if (!Array.isArray(input.validators)) errors.push("validators must be an array.");
    if (!isRecord(input.independentEvaluator)) errors.push("independentEvaluator is required.");
    if (input.override !== undefined || input.humanOverride !== undefined || input.modelOverride !== undefined) {
      errors.push("Approval overrides are not permitted.");
    }
    return errors;
  }

  function normalizeValidators(validators) {
    var normalized = [];
    var errors = [];
    var seen = Object.create(null);

    validators.forEach(function (validator, index) {
      if (!isRecord(validator)) {
        errors.push("Validator at index " + index + " must be an object.");
        return;
      }
      var id = validator.id;
      var status = validator.status;
      if (!isNonEmptyString(id)) {
        errors.push("Validator at index " + index + " is missing id.");
        return;
      }
      if (seen[id]) {
        errors.push("Duplicate validator id: " + id + ".");
        return;
      }
      if (VALIDATOR_STATUSES.indexOf(status) === -1) {
        errors.push("Validator " + id + " has an invalid status.");
        return;
      }
      seen[id] = true;
      normalized.push({
        id: id,
        status: status,
        failureCode: isNonEmptyString(validator.failureCode) ? validator.failureCode : null,
        detail: isNonEmptyString(validator.detail) ? validator.detail : null
      });
    });

    return { values: normalized, errors: errors };
  }

  function normalizeEvaluator(evaluator) {
    var errors = [];
    if (!isNonEmptyString(evaluator.evaluatorVersion)) errors.push("independentEvaluator.evaluatorVersion is required.");
    if (!isNonEmptyString(evaluator.inputHash)) errors.push("independentEvaluator.inputHash is required.");
    if (EVALUATOR_STATUSES.indexOf(evaluator.status) === -1) {
      errors.push("independentEvaluator.status is invalid.");
    }
    return {
      value: {
        evaluatorVersion: evaluator.evaluatorVersion || null,
        inputHash: evaluator.inputHash || null,
        status: evaluator.status || null,
        findingCodes: uniqueStrings(evaluator.findingCodes)
      },
      errors: errors
    };
  }

  function makeManifest(input, outcome, reasons, validators, evaluator) {
    var manifest = {
      schemaVersion: "approval-decision-manifest:v1",
      engineVersion: ENGINE_VERSION,
      policyVersion: isNonEmptyString(input && input.policyVersion)
        ? input.policyVersion
        : DEFAULT_POLICY_VERSION,
      decisionId: isNonEmptyString(input && input.decisionId) ? input.decisionId : null,
      analysisDraftId: isNonEmptyString(input && input.analysisDraftId) ? input.analysisDraftId : null,
      inputHash: isNonEmptyString(input && input.inputHash) ? input.inputHash : null,
      validatorSuiteVersion: isNonEmptyString(input && input.validatorSuiteVersion)
        ? input.validatorSuiteVersion
        : null,
      independentEvaluatorVersion: evaluator ? evaluator.evaluatorVersion : null,
      outcome: outcome,
      reasonCodes: uniqueStrings(reasons.map(function (item) { return item.code; })),
      reasons: cloneJson(reasons),
      validators: cloneJson(validators),
      independentEvaluator: cloneJson(evaluator),
      decidedAt: isNonEmptyString(input && input.decidedAt) ? input.decidedAt : null
    };
    return deepFreeze(manifest);
  }

  function decideApproval(input) {
    var inputErrors = validateInput(input);
    if (inputErrors.length) return invalidManifest(input, inputErrors);

    var normalizedValidators = normalizeValidators(input.validators);
    var normalizedEvaluator = normalizeEvaluator(input.independentEvaluator);
    var normalizationErrors = normalizedValidators.errors.concat(normalizedEvaluator.errors);
    if (normalizationErrors.length) return invalidManifest(input, normalizationErrors);

    var validators = normalizedValidators.values;
    var evaluator = normalizedEvaluator.value;
    // Callers may add gates, but cannot weaken the policy defaults.
    var criticalGates = uniqueStrings(
      DEFAULT_CRITICAL_GATES.concat(Array.isArray(input.criticalGates) ? input.criticalGates : [])
    );
    var evidenceGates = uniqueStrings(
      EVIDENCE_GATES.concat(Array.isArray(input.evidenceGates) ? input.evidenceGates : [])
    );
    var byId = Object.create(null);
    var reasons = [];

    validators.forEach(function (validator) {
      byId[validator.id] = validator;
    });

    criticalGates.forEach(function (gateId) {
      if (!byId[gateId]) {
        reasons.push(reason("missing_critical_validator", gateId));
      }
    });

    validators.forEach(function (validator) {
      if (validator.status === "error") {
        reasons.push(reason(
          validator.failureCode || "validator_error",
          validator.id,
          validator.detail
        ));
      } else if (validator.status === "fail") {
        reasons.push(reason(
          validator.failureCode || "validator_failed",
          validator.id,
          validator.detail
        ));
      }
    });

    if (evaluator.inputHash !== input.inputHash) {
      reasons.push(reason("evaluator_input_hash_mismatch", "independent_evaluator"));
    }
    if (evaluator.status === "error") {
      reasons.push(reason("independent_evaluator_error", "independent_evaluator"));
    } else if (evaluator.status === "blocking_findings") {
      if (evaluator.findingCodes.length) {
        evaluator.findingCodes.forEach(function (code) {
          reasons.push(reason(code, "independent_evaluator"));
        });
      } else {
        reasons.push(reason("independent_evaluator_blocked", "independent_evaluator"));
      }
    }

    var hasSystemFailure = validators.some(function (validator) {
      return validator.status === "error";
    }) || reasons.some(function (item) {
      return item.code === "missing_critical_validator" ||
        item.code === "independent_evaluator_error" ||
        item.code === "evaluator_input_hash_mismatch";
    });
    if (hasSystemFailure) {
      return makeManifest(input, OUTCOMES.FAILED, reasons, validators, evaluator);
    }

    var evidenceLookup = Object.create(null);
    evidenceGates.forEach(function (id) { evidenceLookup[id] = true; });
    var hasEvidenceFailure = validators.some(function (validator) {
      return validator.status === "fail" && evidenceLookup[validator.id];
    });
    if (hasEvidenceFailure) {
      return makeManifest(input, OUTCOMES.INSUFFICIENT_EVIDENCE, reasons, validators, evaluator);
    }

    if (reasons.length) {
      return makeManifest(input, OUTCOMES.NEEDS_REVIEW, reasons, validators, evaluator);
    }

    return makeManifest(input, OUTCOMES.AUTO_APPROVED, [], validators, evaluator);
  }

  return Object.freeze({
    ENGINE_VERSION: ENGINE_VERSION,
    DEFAULT_POLICY_VERSION: DEFAULT_POLICY_VERSION,
    DEFAULT_CRITICAL_GATES: DEFAULT_CRITICAL_GATES,
    EVIDENCE_GATES: EVIDENCE_GATES,
    OUTCOMES: OUTCOMES,
    decideApproval: decideApproval
  });
});
