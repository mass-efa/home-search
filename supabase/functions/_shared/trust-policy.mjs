export const MAX_SESSION_AGE_SECONDS = 24 * 60 * 60;

export const ANALYSIS_DEPTH_POLICIES = Object.freeze({
  "quick-scan": Object.freeze({
    version: "analysis-depth-policy:v1", maxDocuments: 2,
    maxDocumentBytes: 20 * 1024 * 1024, maxOutputTokens: 2200,
    requiredSources: Object.freeze(["property_identity", "schools", "safety"])
  }),
  "decision-brief": Object.freeze({
    version: "analysis-depth-policy:v1", maxDocuments: 3,
    maxDocumentBytes: 20 * 1024 * 1024, maxOutputTokens: 4200,
    requiredSources: Object.freeze(["property_identity", "schools", "safety"])
  }),
  "deep-decision-pack": Object.freeze({
    version: "analysis-depth-policy:v1", maxDocuments: 5,
    maxDocumentBytes: 20 * 1024 * 1024, maxOutputTokens: 7000,
    requiredSources: Object.freeze(["property_identity", "schools", "safety"])
  })
});

const ALLOWED_STAGES = new Set(["pre_tour", "post_tour", "pre_offer"]);
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf", "image/jpeg", "image/png", "image/webp"
]);
export const STAGE_RECOMMENDATIONS = Object.freeze({
  pre_tour: Object.freeze(["tour", "skip", "watch", "investigate"]),
  post_tour: Object.freeze(["revisit", "pause", "pursue", "investigate"]),
  pre_offer: Object.freeze(["pursue", "pause", "investigate", "offer-prep"])
});

export function resolveAnalysisPolicy(stage, depth) {
  if (!ALLOWED_STAGES.has(stage)) return { ok: false, code: "invalid_decision_stage" };
  const policy = ANALYSIS_DEPTH_POLICIES[depth];
  if (!policy) return { ok: false, code: "invalid_analysis_depth" };
  return { ok: true, stage, depth, policy, allowedRecommendations: STAGE_RECOMMENDATIONS[stage] };
}

export function validateStageRecommendation(stage, recommendation) {
  const allowed = STAGE_RECOMMENDATIONS[stage] || [];
  const normalized = typeof recommendation === "string" ? recommendation.trim().toLowerCase() : "";
  return {
    id: "stage_recommendation",
    status: allowed.includes(normalized) ? "pass" : "fail",
    failureCode: allowed.includes(normalized) ? null : "recommendation_outside_stage_contract",
    detail: allowed.includes(normalized) ? null : `Recommendation must be one of: ${allowed.join(", ")}.`
  };
}

export function normalizeDecisionStage(stage) {
  var mappings = {
    "considering-tour": "pre_tour", "post-tour": "post_tour",
    "active-offer": "pre_offer", "under-contract": "pre_offer",
    "pre_offer": "pre_offer", "post_tour": "post_tour", "pre_tour": "pre_tour"
  };
  // Legacy `pre-offer` meant post-tour in the old UI. Only the boundary maps it;
  // new callers must use the unambiguous canonical underscore values.
  if (stage === "pre-offer") return "post_tour";
  return mappings[stage] || stage;
}

export function isAcceptedPrivateMediaType(mediaType) {
  return ALLOWED_MEDIA_TYPES.has(mediaType) && !String(mediaType).startsWith("video/");
}

export function decodeJwtPayload(token) {
  try {
    const encoded = String(token).split(".")[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    return JSON.parse(atob(padded));
  } catch (_error) {
    return null;
  }
}

export function tokenRequiresReauthentication(authorization, nowSeconds = Date.now() / 1000) {
  const token = String(authorization).replace(/^Bearer\s+/i, "");
  const claims = decodeJwtPayload(token);
  const issuedAt = claims && typeof claims.iat === "number" ? claims.iat : 0;
  return !issuedAt || issuedAt > nowSeconds + 60 || nowSeconds - issuedAt >= MAX_SESSION_AGE_SECONDS;
}

export function validateRequiredSourceCoverage(coverage, nowIso, maxAgeDays = 30, context = {}) {
  const now = Date.parse(nowIso);
  return ["schools", "safety"].map((module) => {
    const item = coverage && coverage[module] ? coverage[module] : {};
    const checkedAt = Date.parse(item.checkedAt || "");
    const stale = !Number.isFinite(checkedAt) || checkedAt > now || now - checkedAt > maxAgeDays * 86400000;
    const datedSchoolException = module === "schools"
      && context.stage === "pre_tour" && context.depth === "quick-scan"
      && item.status === "current_year_gap" && item.suppressCurrentAssignmentConclusion === true
      && typeof item.officialVerificationUrl === "string" && item.officialVerificationUrl.startsWith("https://");
    const complete = (item.status === "complete" || datedSchoolException) && !item.conflicting && !stale;
    return {
      id: `${module}_source_coverage`,
      status: complete ? "pass" : "fail",
      failureCode: complete ? null : (item.conflicting
        ? `${module}_source_conflicting`
        : (stale ? `${module}_source_stale_or_missing` : `${module}_source_incomplete`)),
      detail: complete ? null : `Required ${module} evidence is missing, stale, or conflicting.`
    };
  });
}
