"use strict";

const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const readJson = (file) =>
  JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const clone = (value) => structuredClone(value);

const canonical = readJson("fixtures/canonical-candidate.json");
const variants = readJson("fixtures/adversarial-variants.json");
const expected = readJson("expected-outcomes.json");
const NOW = Date.parse("2026-07-29T18:00:00Z");
const MONEY_TOLERANCE = 1;
const FLOAT_TOLERANCE = 1e-6;

function pathTokens(expression) {
  return expression
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter(Boolean);
}

function getAt(object, expression) {
  return pathTokens(expression).reduce((value, token) => value[token], object);
}

function setAt(object, expression, value) {
  const tokens = pathTokens(expression);
  const final = tokens.pop();
  const parent = tokens.reduce((current, token) => current[token], object);
  parent[final] = value;
}

function resolveCopies(value, source) {
  if (Array.isArray(value)) {
    return value.map((item) => resolveCopies(item, source));
  }
  if (value && typeof value === "object") {
    if (Object.keys(value).length === 1 && value.$copy) {
      return clone(getAt(source, value.$copy));
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        resolveCopies(item, source)
      ])
    );
  }
  return value;
}

function applyVariant(base, variant) {
  const candidate = clone(base);
  for (const [expression, value] of Object.entries(variant.patch)) {
    setAt(candidate, expression, resolveCopies(value, base));
  }
  return candidate;
}

function validate(candidate) {
  const failures = new Set();
  const fail = (code) => failures.add(code);
  const sourceIds = new Set(candidate.sources.map((source) => source.id));

  if (!candidate.subject.identityResolved || !candidate.subject.parcelId) {
    fail("IDENTITY_UNRESOLVED");
  }

  for (const claim of candidate.claims) {
    if (
      ["critical", "material"].includes(claim.materiality) &&
      claim.type === "fact" &&
      (!claim.sourceIds.length ||
        claim.sourceIds.some((sourceId) => !sourceIds.has(sourceId)))
    ) {
      fail(
        claim.materiality === "critical"
          ? "CRITICAL_CLAIM_UNSOURCED"
          : "MATERIAL_CLAIM_UNSOURCED"
      );
    }
    if (
      claim.documentLocator &&
      (!claim.documentLocator.pageExists ||
        !claim.documentLocator.visuallyVerified ||
        claim.documentLocator.pdfPage < 1)
    ) {
      fail("DOCUMENT_PAGE_INVALID");
    }
  }

  if (!candidate.buyer.questions.length) {
    fail("BUYER_QUESTIONS_MISSING");
  }
  for (const question of candidate.buyer.questions) {
    if (
      !question.status ||
      !question.answer ||
      !question.decisionImpact ||
      !question.nextAction
    ) {
      fail("BUYER_QUESTION_INCOMPLETE");
    }
  }

  const records = candidate.comparables.records;
  const eligible = records.filter((comp) =>
    ["primary", "secondary"].includes(comp.inclusion)
  );
  const weightTotal = eligible.reduce((sum, comp) => sum + comp.weight, 0);
  if (Math.abs(weightTotal - 1) > FLOAT_TOLERANCE) {
    fail("COMP_WEIGHTS_INVALID");
  }

  for (const comp of eligible) {
    const expectedPricePerSf = comp.salePrice / comp.finishedSf;
    if (Math.abs(comp.pricePerFinishedSf - expectedPricePerSf) > 0.01) {
      fail("COMP_PRICE_PER_SF_MISMATCH");
    }
    const adjustmentTotal = Object.values(comp.adjustments).reduce(
      (sum, amount) => sum + amount,
      0
    );
    if (
      Math.abs(comp.salePrice + adjustmentTotal - comp.adjustedValue) >
      MONEY_TOLERANCE
    ) {
      fail("COMP_ADJUSTMENT_MISMATCH");
    }
  }

  const weighted = eligible.reduce(
    (sum, comp) => sum + comp.adjustedValue * comp.weight,
    0
  );
  if (
    Math.abs(weighted - candidate.comparables.weightedAdjustedValue) >
    MONEY_TOLERANCE
  ) {
    fail("WEIGHTED_VALUE_MISMATCH");
  }

  for (const scenario of Object.values(candidate.comparables.scenarios)) {
    if (!scenario.recalculated || !scenario.inputVersion) {
      fail("SCENARIO_NOT_RECALCULATED");
    }
  }

  if (candidate.comparables.numericOfferGuidanceEnabled) {
    if (eligible.length < 5) {
      fail("NUMERIC_GUIDANCE_COMPS_INSUFFICIENT");
    }
    const ageHours =
      (NOW - Date.parse(candidate.subject.statusCheckedAt)) / (60 * 60 * 1000);
    if (!Number.isFinite(ageHours) || ageHours > 24 || ageHours < 0) {
      fail("NUMERIC_GUIDANCE_STATUS_STALE");
    }
  }

  if (!candidate.recommendation.professionalBoundaries.length) {
    fail("PROFESSIONAL_BOUNDARY_MISSING");
  }
  if (!candidate.recommendation.supportingClaimIds.length) {
    fail("RECOMMENDATION_SUPPORT_MISSING");
  }

  if (
    candidate.privacy.ownerUserId !== candidate.privacy.requestUserId ||
    candidate.privacy.crossUserDataDetected
  ) {
    fail("CROSS_USER_DATA");
  }
  if (
    !candidate.privacy.shareProjectionAuthorized ||
    candidate.privacy.privateFieldsInShare.length
  ) {
    fail("PRIVATE_FIELD_IN_SHARE");
  }

  if (
    candidate.security.promptInjectionDetected &&
    candidate.security.untrustedInstructionsExecuted
  ) {
    fail("PROMPT_INJECTION_INTEGRITY");
  }

  if (candidate.render.analysisVersion !== candidate.analysisVersion) {
    fail("RENDER_VERSION_MISMATCH");
  }
  if (
    candidate.render.uncataloguedClaims ||
    candidate.render.uncataloguedNumbers ||
    !candidate.render.citationsPreserved
  ) {
    fail("RENDER_INTEGRITY");
  }

  if (candidate.evaluator.result !== "pass") {
    fail("EVALUATOR_NOT_PASS");
  }
  if (candidate.evaluator.candidateHash !== candidate.candidateHash) {
    fail("EVALUATOR_HASH_MISMATCH");
  }

  return {
    release: failures.size === 0,
    failureCodes: [...failures].sort()
  };
}

function assertOutcome(id, actual) {
  const wanted = expected[id];
  if (!wanted) {
    throw new Error(`Missing expected outcome for ${id}`);
  }
  const actualCodes = [...actual.failureCodes].sort();
  const wantedCodes = [...wanted.failureCodes].sort();
  const matches =
    actual.release === wanted.release &&
    JSON.stringify(actualCodes) === JSON.stringify(wantedCodes);
  if (!matches) {
    throw new Error(
      `${id}\nexpected ${JSON.stringify(wanted)}\nactual   ${JSON.stringify(actual)}`
    );
  }
}

let passed = 0;
const canonicalOutcome = validate(canonical);
assertOutcome("canonical-candidate", canonicalOutcome);
console.log("PASS canonical-candidate -> released");
passed += 1;

for (const variant of variants) {
  const candidate = applyVariant(canonical, variant);
  const outcome = validate(candidate);
  assertOutcome(variant.id, outcome);
  console.log(
    `PASS ${variant.id} -> blocked (${outcome.failureCodes.join(", ")})`
  );
  passed += 1;
}

console.log(`\n${passed} golden approval cases passed.`);
