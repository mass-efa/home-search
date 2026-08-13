import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  isAcceptedPrivateMediaType,
  normalizeDecisionStage,
  resolveAnalysisPolicy,
  tokenRequiresReauthentication,
  validateStageRecommendation,
  validateRequiredSourceCoverage
} from "../../supabase/functions/_shared/trust-policy.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migration = fs.readFileSync(path.join(
  root, "supabase/migrations/202608130004_wave1_trust_foundations.sql"
), "utf8");
const priorMigration = fs.readFileSync(path.join(
  root, "supabase/migrations/202608020003_private_documents_and_operations.sql"
), "utf8");
const contractMigration = fs.readFileSync(path.join(
  root, "supabase/migrations/202608130005_p0_contract_and_read_auth.sql"
), "utf8");
const privilegeMigration = fs.readFileSync(path.join(
  root, "supabase/migrations/202608130006_p0_function_privileges.sql"
), "utf8");
const edge = fs.readFileSync(path.join(root, "supabase/functions/evaluate-home/index.ts"), "utf8");
const buyerApp = fs.readFileSync(path.join(root, "assets/buddy-app.js"), "utf8");
const app = fs.readFileSync(path.join(root, "app.html"), "utf8");

function jwt(iat) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode({ iat })}.signature`;
}

test("absolute session age expires at 24 hours and rejects malformed tokens", () => {
  const now = 2_000_000_000;
  assert.equal(tokenRequiresReauthentication(`Bearer ${jwt(now - 86399)}`, now), false);
  assert.equal(tokenRequiresReauthentication(`Bearer ${jwt(now - 86400)}`, now), true);
  assert.equal(tokenRequiresReauthentication("Bearer malformed", now), true);
  assert.equal(tokenRequiresReauthentication(`Bearer ${jwt(now + 61)}`, now), true);
});

test("the browser session anchor cannot be extended by a refreshed JWT", () => {
  assert.match(buyerApp, /SESSION_ANCHOR_KEY/);
  assert.match(buyerApp, /Math\.min\(issuedAt, Number\(anchor\.verifiedAt\)\)/);
  assert.match(buyerApp, /return !issuedAt \|\| Date\.now\(\) - issuedAt >= SESSION_MAX_AGE_MS/);
  assert.doesNotMatch(buyerApp, /issuedAt = Number\(payload\.iat/);
});

test("only three decision stages and three bounded depths are accepted", () => {
  for (const stage of ["pre_tour", "post_tour", "pre_offer"]) {
    for (const depth of ["quick-scan", "decision-brief", "deep-decision-pack"]) {
      const result = resolveAnalysisPolicy(stage, depth);
      assert.equal(result.ok, true);
      assert.ok(result.policy.maxDocuments > 0);
      assert.ok(result.policy.maxOutputTokens <= 7000);
    }
  }
  assert.deepEqual(resolveAnalysisPolicy("shopping", "quick-scan"), {
    ok: false, code: "invalid_decision_stage"
  });
  assert.deepEqual(resolveAnalysisPolicy("pre_offer", "unlimited"), {
    ok: false, code: "invalid_analysis_depth"
  });
  assert.equal(normalizeDecisionStage("active-offer"), "pre_offer");
  assert.equal(normalizeDecisionStage("under-contract"), "pre_offer");
  assert.equal(normalizeDecisionStage("pre-offer"), "post_tour");
  assert.equal(normalizeDecisionStage("post-tour"), "post_tour");
  assert.equal(resolveAnalysisPolicy("pre_tour", "quick-scan").policy.maxDocuments, 2);
  assert.equal(resolveAnalysisPolicy("post_tour", "decision-brief").policy.maxDocuments, 3);
  assert.equal(resolveAnalysisPolicy("pre_offer", "deep-decision-pack").policy.maxDocuments, 5);
  for (const depth of ["quick-scan", "decision-brief", "deep-decision-pack"]) {
    assert.equal(resolveAnalysisPolicy("pre_tour", depth).policy.maxDocumentBytes, 20 * 1024 * 1024);
  }
});

test("direct recommendations are deterministic and stage bounded", () => {
  const allowed = {
    pre_tour: ["tour", "skip", "watch", "investigate"],
    post_tour: ["revisit", "pause", "pursue", "investigate"],
    pre_offer: ["pursue", "pause", "investigate", "offer-prep"]
  };
  for (const [stage, recommendations] of Object.entries(allowed)) {
    for (const recommendation of recommendations) {
      assert.equal(validateStageRecommendation(stage, recommendation).status, "pass");
    }
  }
  assert.equal(validateStageRecommendation("pre_tour", "offer-prep").status, "fail");
  assert.equal(validateStageRecommendation("post_tour", "tour").failureCode,
    "recommendation_outside_stage_contract");
  assert.equal(validateStageRecommendation("pre_offer", "skip").status, "fail");
});

test("private media accepts PDF and bounded image types but explicitly rejects video", () => {
  for (const type of ["application/pdf", "image/jpeg", "image/png", "image/webp"]) {
    assert.equal(isAcceptedPrivateMediaType(type), true);
  }
  assert.equal(isAcceptedPrivateMediaType("video/mp4"), false);
  assert.equal(isAcceptedPrivateMediaType("image/svg+xml"), false);
});

test("school and safety coverage fails closed on missing, stale, or conflicting evidence", () => {
  const now = "2026-08-13T12:00:00.000Z";
  const missing = validateRequiredSourceCoverage({}, now);
  assert.ok(missing.every((gate) => gate.status === "fail"));
  const stale = validateRequiredSourceCoverage({
    schools: { status: "complete", checkedAt: "2026-01-01T00:00:00.000Z" },
    safety: { status: "complete", checkedAt: now, conflicting: true }
  }, now);
  assert.deepEqual(stale.map((gate) => gate.failureCode), [
    "schools_source_stale_or_missing", "safety_source_conflicting"
  ]);
  const complete = validateRequiredSourceCoverage({
    schools: { status: "complete", checkedAt: now },
    safety: { status: "complete", checkedAt: now }
  }, now);
  assert.ok(complete.every((gate) => gate.status === "pass"));
  const schoolGap = {
    schools: { status: "current_year_gap", checkedAt: now, suppressCurrentAssignmentConclusion: true,
      officialVerificationUrl: "https://seattle.explore.avela.org/" },
    safety: { status: "complete", checkedAt: now }
  };
  assert.ok(validateRequiredSourceCoverage(schoolGap, now, 30, {
    stage: "pre_tour", depth: "quick-scan"
  }).every((gate) => gate.status === "pass"));
  assert.equal(validateRequiredSourceCoverage(schoolGap, now, 30, {
    stage: "post-tour", depth: "quick-scan"
  })[0].status, "fail");
});

test("automatic delivery requires both emergency environment and DB gates", () => {
  assert.match(edge, /AUTOMATED_APPROVAL_ENABLED.*=== "true"/);
  assert.match(edge, /requestStatus === "in_review" && emergencyApprovalEnabled/);
  assert.match(migration, /not coalesce\(v_control\.automatic_release_enabled, false\)/);
  assert.match(migration, /max_automatic_releases/);
  assert.match(priorMigration, /automatic_release_enabled boolean not null default false/);
});

test("finalization is idempotent, version safe, audited, and revocable", () => {
  assert.match(migration, /v_existing_id is not null then return v_existing_id/);
  assert.match(migration, /coalesce\(max\(version\), 0\) \+ 1/);
  assert.match(migration, /home_buddy_release_audits/);
  assert.match(migration, /first_release_full_audit_count integer not null default 20/);
  assert.match(migration, /create or replace function public\.revoke_home_buddy_result/);
  assert.match(migration, /status = 'withdrawn'/);
  assert.match(migration, /decision_stage = 'pre_tour'/);
  assert.match(migration, /analysis_depth = 'quick-scan'/);
  assert.match(migration, /suppressCurrentAssignmentConclusion/);
});

test("RLS and ownership foundations do not expose buyer data cross-user", () => {
  assert.match(migration, /owners can read own preference versions[\s\S]*auth\.uid\(\) = owner_id/);
  assert.doesNotMatch(migration, /home_buddy_preference_versions for update/);
  assert.match(migration, /active staff can read release audits/);
  assert.doesNotMatch(migration, /owners can read release audits/);
  assert.match(migration, /assert_home_buddy_recent_auth/);
  assert.match(migration, /auth\.jwt\(\)->>'iat'/);
  assert.match(migration, /auth\.jwt\(\)->>'session_id'/);
  assert.match(migration, /from auth\.sessions/);
  assert.match(edge, /supabase\.rpc\("assert_home_buddy_recent_auth"\)/);
});

test("canonical contract, recent private reads, and authoritative preferences are server enforced", () => {
  assert.match(contractMigration, /decision_stage in \('pre_tour', 'post_tour', 'pre_offer'\)/);
  assert.match(contractMigration, /home_buddy_has_recent_auth\(\)/);
  assert.match(contractMigration, /owners can read released results[\s\S]*withdrawn_at is null and public\.home_buddy_has_recent_auth/);
  assert.match(contractMigration, /owners can read private home documents[\s\S]*home_buddy_has_recent_auth/);
  assert.match(contractMigration, /create_home_buddy_preference_version/);
  assert.match(contractMigration, /pg_advisory_xact_lock/);
  assert.match(contractMigration, /authoritative_preference_pin_required/);
  assert.match(edge, /brief: authoritativePreference\.data \? authoritativePreference\.data\.preferences : null/);
  assert.match(edge, /authoritativePreferenceContent: buyerContext\.brief/);
  assert.match(edge, /allowedRecommendations: resolvedPolicy\.allowedRecommendations/);
  assert.match(edge, /validators\.push\(validateStageRecommendation/);
  assert.match(edge, /"stage_recommendation"/);
  assert.match(edge, /Your research is complete\. Your decision packet is being prepared for private delivery\./);
  assert.match(edge, /Decision packet ready\./);
});

test("public RPC privileges are fail-closed and role-specific", () => {
  assert.match(privilegeMigration,
    /automatically_release_home_buddy_result\(uuid\)[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(privilegeMigration,
    /grant execute on function public\.automatically_release_home_buddy_result\(uuid\) to service_role/);
  assert.match(privilegeMigration,
    /create_home_buddy_preference_version\(uuid, jsonb, text, timestamptz\)[\s\S]*from public, anon, authenticated, service_role/);
  assert.match(privilegeMigration,
    /grant execute on function public\.create_home_buddy_preference_version[\s\S]*to authenticated/);
  assert.match(privilegeMigration,
    /validate_home_buddy_document_ownership\(\)[\s\S]*from public, anon, authenticated, service_role/);
});

test("the browser locks every private route and never renders prior reports while signed out", () => {
  assert.match(buyerApp, /\["processing", "results", "workspace", "debrief"\][\s\S]*!remote\.user/);
  assert.match(buyerApp, /node\.hidden = !remote\.user \|\| !state\.listings\.length/);
  assert.match(buyerApp, /if \(!remote\.user\) \{[\s\S]*Your private reports are locked/);
  assert.doesNotMatch(buyerApp, /remote\.configured && !remote\.user/);
});

test("view and request-step transitions return buyers to the beginning of the next task", () => {
  assert.match(buyerApp, /if \(previousView !== name\) window\.scrollTo/);
  assert.match(buyerApp, /activeHeading\.focus\(\{ preventScroll: true \}\)/);
});

test("the buyer intake implements the canonical three-stage walkthrough contract", () => {
  assert.match(app, /option value="pre_tour"/);
  assert.match(app, /option value="post_tour"/);
  assert.match(app, /option value="pre_offer"/);
  assert.match(buyerApp, /pre_tour:[\s\S]*maxDocuments: 2[\s\S]*Tour · Skip · Watch · Investigate/);
  assert.match(buyerApp, /post_tour:[\s\S]*maxDocuments: 3[\s\S]*Revisit · Pause · Pursue · Investigate/);
  assert.match(buyerApp, /pre_offer:[\s\S]*maxDocuments: 5[\s\S]*Pursue · Pause · Investigate · Offer-prep/);
  assert.doesNotMatch(app, /option value="considering-tour"|option value="post-tour"|option value="pre-offer"/);
});

test("final request review states preference, file, scope, and immediate-delivery expectations", () => {
  for (const marker of [
    "data-review-priority-count", "data-review-preference-freshness", "data-review-file-count",
    "data-stage-scope-title", "data-review-delivery-expectation"
  ]) assert.match(app, new RegExp(marker));
  assert.match(buyerApp, /Automatic after evidence checks/);
  assert.match(buyerApp, /create_home_buddy_preference_version/);
  assert.match(buyerApp, /Saved preferences need confirmation/);
  assert.match(buyerApp, /await clearStagedDocuments\(\);[\s\S]*auth\.signOut/);
});
