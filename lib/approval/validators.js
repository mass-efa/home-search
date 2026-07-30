/*
 * Deterministic validators for a canonical Home Search Decision Pack.
 *
 * Dependency-free UMD module. The output is accepted directly by
 * HomeSearchApproval.decideApproval({ validators: ... }).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HomeSearchApprovalValidators = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VALIDATOR_SUITE_VERSION = "decision-pack-validators:v1";
  var REQUIRED_SECTION_IDS = Object.freeze([
    "decision_read",
    "buyer_fit",
    "risks_unknowns",
    "questions_actions",
    "evidence_limits"
  ]);
  var DEFAULT_ALLOWED_SOURCE_PERMISSIONS = Object.freeze(["allowed", "buyer_provided"]);
  var DEFAULT_PRIVATE_SHARE_FIELDS = Object.freeze([
    "buyerNotes",
    "buyerEmail",
    "financingConstraints",
    "negotiationLimit",
    "rawDocuments",
    "rawSourceContent",
    "reviewerNotes"
  ]);
  var PROHIBITED_CERTAINTY_PATTERNS = Object.freeze([
    /\bguaranteed\b/i,
    /\bno risk\b/i,
    /\bcompletely safe\b/i,
    /\bdefinitely (?:will|won't|is|isn't|has|hasn't)\b/i,
    /\btitle is clear\b/i,
    /\bwill appraise\b/i,
    /\bwill pass inspection\b/i
  ]);

  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function isString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function pass(id) {
    return { id: id, status: "pass" };
  }

  function fail(id, code, detail) {
    return { id: id, status: "fail", failureCode: code, detail: detail };
  }

  function error(id, code, detail) {
    return { id: id, status: "error", failureCode: code, detail: detail };
  }

  function idsAreUnique(items) {
    var seen = Object.create(null);
    return items.every(function (item) {
      if (!isRecord(item) || !isString(item.id) || seen[item.id]) return false;
      seen[item.id] = true;
      return true;
    });
  }

  function collectText(candidate) {
    var values = [];
    function visit(value, key) {
      if (key === "id" || key === "sourceIds" || key === "questionId") return;
      if (typeof value === "string") {
        values.push(value);
      } else if (Array.isArray(value)) {
        value.forEach(function (item) { visit(item, null); });
      } else if (isRecord(value)) {
        Object.keys(value).forEach(function (childKey) {
          visit(value[childKey], childKey);
        });
      }
    }
    visit(candidate, null);
    return values;
  }

  function parseDate(value) {
    if (!isString(value)) return null;
    var time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }

  function validateSchema(candidate) {
    if (!isRecord(candidate)) return fail("schema_validity", "candidate_not_object", "Decision Pack must be an object.");
    var arrays = ["sections", "buyerQuestions", "questionAnswers", "claims", "sources", "calculations"];
    var missing = [];
    if (!isString(candidate.schemaVersion)) missing.push("schemaVersion");
    if (!isString(candidate.decisionRead)) missing.push("decisionRead");
    if (!isString(candidate.disclaimer)) missing.push("disclaimer");
    if (!isRecord(candidate.sharePayload)) missing.push("sharePayload");
    arrays.forEach(function (key) {
      if (!Array.isArray(candidate[key])) missing.push(key);
    });
    if (missing.length) {
      return fail("schema_validity", "missing_or_invalid_fields", "Invalid fields: " + missing.join(", ") + ".");
    }
    if (!idsAreUnique(candidate.sections) ||
        !idsAreUnique(candidate.buyerQuestions) ||
        !idsAreUnique(candidate.claims) ||
        !idsAreUnique(candidate.sources) ||
        !idsAreUnique(candidate.calculations)) {
      return fail("schema_validity", "invalid_or_duplicate_ids", "Section, question, claim, source, and calculation IDs must be present and unique.");
    }
    var invalidClaim = candidate.claims.some(function (claim) {
      return !isString(claim.text) ||
        ["fact", "inference", "buyer_judgment"].indexOf(claim.kind) === -1 ||
        ["supported", "unverified", "not_applicable"].indexOf(claim.evidenceStatus) === -1 ||
        !Array.isArray(claim.sourceIds);
    });
    if (invalidClaim) return fail("schema_validity", "invalid_claim_shape", "Every claim must include text, kind, evidenceStatus, and sourceIds.");
    return pass("schema_validity");
  }

  function validateRequiredSections(candidate, options) {
    var required = array(options.requiredSectionIds).length
      ? options.requiredSectionIds
      : REQUIRED_SECTION_IDS;
    var present = Object.create(null);
    array(candidate.sections).forEach(function (section) {
      if (isRecord(section) && isString(section.id) && isString(section.content)) present[section.id] = true;
    });
    var missing = required.filter(function (id) { return !present[id]; });
    return missing.length
      ? fail("required_sections", "missing_required_sections", "Missing sections: " + missing.join(", ") + ".")
      : pass("required_sections");
  }

  function validateQuestionCoverage(candidate) {
    var answered = Object.create(null);
    array(candidate.questionAnswers).forEach(function (answer) {
      if (isRecord(answer) && isString(answer.questionId) && isString(answer.answer)) {
        answered[answer.questionId] = true;
      }
    });
    var missing = array(candidate.buyerQuestions)
      .filter(function (question) { return isRecord(question) && isString(question.id) && !answered[question.id]; })
      .map(function (question) { return question.id; });
    return missing.length
      ? fail("focus_question_coverage", "unanswered_buyer_questions", "Unanswered question IDs: " + missing.join(", ") + ".")
      : pass("focus_question_coverage");
  }

  function validateClaimSources(candidate) {
    var sourceIds = Object.create(null);
    array(candidate.sources).forEach(function (source) {
      if (isRecord(source) && isString(source.id)) sourceIds[source.id] = true;
    });
    var invalid = array(candidate.claims).filter(function (claim) {
      if (!isRecord(claim) || claim.kind !== "fact") return false;
      if (claim.evidenceStatus === "unverified") return claim.sourceIds.length !== 0;
      if (claim.evidenceStatus === "not_applicable") return false;
      return !claim.sourceIds.length || claim.sourceIds.some(function (id) { return !sourceIds[id]; });
    }).map(function (claim) { return claim.id || "unknown"; });
    return invalid.length
      ? fail("claim_source_linkage", "unsupported_or_unknown_sources", "Invalid factual claim IDs: " + invalid.join(", ") + ".")
      : pass("claim_source_linkage");
  }

  function validateSourcePermissions(candidate, options) {
    var allowed = Object.create(null);
    var allowedValues = array(options.allowedSourcePermissions).length
      ? options.allowedSourcePermissions
      : DEFAULT_ALLOWED_SOURCE_PERMISSIONS;
    allowedValues.forEach(function (value) { allowed[value] = true; });
    var blocked = array(candidate.sources).filter(function (source) {
      return !isRecord(source) || !allowed[source.permission];
    }).map(function (source) { return source && source.id ? source.id : "unknown"; });
    return blocked.length
      ? fail("source_permission", "source_permission_not_allowed", "Disallowed source IDs: " + blocked.join(", ") + ".")
      : pass("source_permission");
  }

  function validateFreshness(candidate, options) {
    var now = parseDate(options.now || new Date().toISOString());
    var maxAgeDays = Number.isFinite(options.maxSourceAgeDays) ? options.maxSourceAgeDays : 365;
    if (now === null || maxAgeDays < 0) {
      return error("source_freshness", "invalid_freshness_configuration", "now and maxSourceAgeDays must be valid.");
    }
    var cutoff = now - (maxAgeDays * 24 * 60 * 60 * 1000);
    var stale = array(candidate.sources).filter(function (source) {
      var retrieved = parseDate(source && source.retrievedAt);
      return retrieved === null || retrieved > now || retrieved < cutoff;
    }).map(function (source) { return source && source.id ? source.id : "unknown"; });
    return stale.length
      ? fail("source_freshness", "missing_future_or_stale_source_date", "Non-current source IDs: " + stale.join(", ") + ".")
      : pass("source_freshness");
  }

  function validateCheckedDates(candidate) {
    var sourceById = Object.create(null);
    array(candidate.sources).forEach(function (source) {
      if (source && source.id) sourceById[source.id] = source;
    });
    var missing = [];
    array(candidate.claims).forEach(function (claim) {
      if (!claim || claim.kind !== "fact" || claim.evidenceStatus !== "supported") return;
      if (parseDate(claim.checkedAt) === null) missing.push(claim.id || "unknown");
      array(claim.sourceIds).forEach(function (sourceId) {
        if (!sourceById[sourceId] || parseDate(sourceById[sourceId].retrievedAt) === null) {
          missing.push("source:" + sourceId);
        }
      });
    });
    return missing.length
      ? fail("checked_dates", "missing_checked_dates", "Missing checked dates: " + missing.join(", ") + ".")
      : pass("checked_dates");
  }

  function validateCalculations(candidate) {
    var invalid = array(candidate.calculations).filter(function (calculation) {
      if (!isRecord(calculation) ||
          !Number.isFinite(calculation.displayedResult) ||
          !Number.isFinite(calculation.recomputedResult)) return true;
      var tolerance = Number.isFinite(calculation.tolerance) && calculation.tolerance >= 0
        ? calculation.tolerance
        : 0.01;
      return Math.abs(calculation.displayedResult - calculation.recomputedResult) > tolerance;
    }).map(function (calculation) { return calculation && calculation.id ? calculation.id : "unknown"; });
    return invalid.length
      ? fail("calculation_reconciliation", "calculation_mismatch", "Mismatched calculation IDs: " + invalid.join(", ") + ".")
      : pass("calculation_reconciliation");
  }

  function validateCertainty(candidate, options) {
    var patterns = array(options.prohibitedCertaintyPatterns).length
      ? options.prohibitedCertaintyPatterns
      : PROHIBITED_CERTAINTY_PATTERNS;
    var matches = [];
    collectText(candidate).forEach(function (text) {
      patterns.forEach(function (pattern) {
        if (pattern instanceof RegExp) {
          pattern.lastIndex = 0;
          if (pattern.test(text)) matches.push(pattern.source);
        }
      });
    });
    return matches.length
      ? fail("prohibited_certainty", "prohibited_certainty_language", "Matched prohibited certainty pattern.")
      : pass("prohibited_certainty");
  }

  function validateDisclaimer(candidate, options) {
    var terms = array(options.requiredDisclaimerTerms).length
      ? options.requiredDisclaimerTerms
      : ["research aid", "verify"];
    var disclaimer = typeof candidate.disclaimer === "string" ? candidate.disclaimer.toLowerCase() : "";
    var missing = terms.filter(function (term) {
      return disclaimer.indexOf(String(term).toLowerCase()) === -1;
    });
    return missing.length
      ? fail("disclaimer_presence", "incomplete_disclaimer", "Missing disclaimer terms: " + missing.join(", ") + ".")
      : pass("disclaimer_presence");
  }

  function validateSharePrivacy(candidate, options) {
    var prohibited = array(options.privateShareFields).length
      ? options.privateShareFields
      : DEFAULT_PRIVATE_SHARE_FIELDS;
    var found = [];
    function visit(value, path) {
      if (!isRecord(value) && !Array.isArray(value)) return;
      Object.keys(value).forEach(function (key) {
        var nextPath = path ? path + "." + key : key;
        if (prohibited.indexOf(key) !== -1) found.push(nextPath);
        visit(value[key], nextPath);
      });
    }
    visit(candidate.sharePayload, "");
    return found.length
      ? fail("share_field_privacy", "private_fields_in_share_payload", "Private share paths: " + found.join(", ") + ".")
      : pass("share_field_privacy");
  }

  function validateOutputLimits(candidate, options) {
    var maxBytes = Number.isFinite(options.maxOutputBytes) ? options.maxOutputBytes : 100000;
    var maxClaims = Number.isFinite(options.maxClaims) ? options.maxClaims : 200;
    var maxTextLength = Number.isFinite(options.maxTextLength) ? options.maxTextLength : 4000;
    var serialized;
    try {
      serialized = JSON.stringify(candidate);
    } catch (_error) {
      return error("output_limits", "candidate_not_serializable", "Decision Pack must be JSON serializable.");
    }
    var byteLength = typeof TextEncoder !== "undefined"
      ? new TextEncoder().encode(serialized).length
      : unescape(encodeURIComponent(serialized)).length;
    var tooLong = collectText(candidate).some(function (text) { return text.length > maxTextLength; });
    if (byteLength > maxBytes || array(candidate.claims).length > maxClaims || tooLong) {
      return fail("output_limits", "output_limit_exceeded", "Decision Pack exceeds configured output limits.");
    }
    return pass("output_limits");
  }

  function validateDecisionPack(candidate, options) {
    var config = isRecord(options) ? options : {};
    var schemaResult = validateSchema(candidate);
    var safeCandidate = isRecord(candidate) ? candidate : {};
    return [
      schemaResult,
      validateRequiredSections(safeCandidate, config),
      validateQuestionCoverage(safeCandidate),
      validateClaimSources(safeCandidate),
      validateSourcePermissions(safeCandidate, config),
      validateFreshness(safeCandidate, config),
      validateCheckedDates(safeCandidate),
      validateCalculations(safeCandidate),
      validateCertainty(safeCandidate, config),
      validateDisclaimer(safeCandidate, config),
      validateSharePrivacy(safeCandidate, config),
      validateOutputLimits(safeCandidate, config)
    ];
  }

  return Object.freeze({
    VALIDATOR_SUITE_VERSION: VALIDATOR_SUITE_VERSION,
    REQUIRED_SECTION_IDS: REQUIRED_SECTION_IDS,
    DEFAULT_ALLOWED_SOURCE_PERMISSIONS: DEFAULT_ALLOWED_SOURCE_PERMISSIONS,
    DEFAULT_PRIVATE_SHARE_FIELDS: DEFAULT_PRIVATE_SHARE_FIELDS,
    validateDecisionPack: validateDecisionPack
  });
});
