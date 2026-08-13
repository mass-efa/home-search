"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const migration = fs.readFileSync(path.join(
  root,
  "supabase/migrations/202608020003_private_documents_and_operations.sql"
), "utf8");
const evaluator = fs.readFileSync(path.join(
  root,
  "supabase/functions/evaluate-home/index.ts"
), "utf8");
const contractMigration = fs.readFileSync(path.join(
  root, "supabase/migrations/202608130005_p0_contract_and_read_auth.sql"
), "utf8");
const app = fs.readFileSync(path.join(root, "app.html"), "utf8");
const buyerApp = fs.readFileSync(path.join(root, "assets/buddy-app.js"), "utf8");

test("automatic delivery starts disabled and is bounded by a hard cohort limit", () => {
  assert.match(migration, /automatic_release_enabled boolean not null default false/);
  assert.match(migration, /max_automatic_releases integer not null default 0/);
  assert.match(migration, /automatic_releases_used >= v_control\.max_automatic_releases/);
});

test("automatic release independently rechecks gates and matching hashes", () => {
  assert.match(migration, /gate->>'status' <> 'pass'/);
  assert.match(migration, /approval_decision->>'outcome' <> 'auto_approved'/);
  assert.match(migration, /approval_decision->>'inputHash' <> v_evaluation\.input_hash/);
  assert.match(migration, /independent_evaluation->>'inputHash' <> v_evaluation\.input_hash/);
});

test("automatic release is service-only and the evaluator degrades to review", () => {
  assert.match(migration, /auth\.role\(\) <> 'service_role'/);
  assert.match(migration, /grant execute on function public\.automatically_release_home_buddy_result\(uuid\) to service_role/);
  assert.match(evaluator, /if \(!automaticReleaseError\)[\s\S]*finalRequestStatus = "ready"/);
  assert.match(evaluator, /event_name: "automatic_release_blocked"/);
});

test("document objects are private, owner-prefixed, and size/type bounded", () => {
  assert.match(migration, /'home-buddy-private-documents', 'home-buddy-private-documents', false/);
  assert.match(migration, /storage_path like owner_id::text \|\| '\/%'/);
  assert.match(contractMigration, /byte_size <= 20971520/);
  assert.match(contractMigration, /file_size_limit = 20971520/);
  assert.match(migration, /application\/pdf/);
  assert.doesNotMatch(migration, /public\s*=\s*true/);
});

test("buyer private-media staging survives sign-in navigation and uploads only to the private bucket", () => {
  assert.match(app, /accept="[^"]*application\/pdf[^"]*image\/jpeg[^"]*image\/png/);
  assert.match(buyerApp, /indexedDB\.open\(DOCUMENT_DB_NAME/);
  assert.match(buyerApp, /from\("home-buddy-private-documents"\)/);
  assert.match(buyerApp, /documentIds: documentIds/);
});

test("the evaluator resolves only owner-readable private media and uses MIME-specific model inputs", () => {
  assert.match(evaluator, /\.from\("home_buddy_documents"\)/);
  assert.match(evaluator, /\.in\("media_type", \["application\/pdf", "image\/jpeg", "image\/png", "image\/webp"\]\)/);
  assert.match(evaluator, /type: "input_file"/);
  assert.match(evaluator, /type: "input_image"/);
  assert.match(evaluator, /trustBoundary: "untrusted_buyer_upload"/);
});

test("failed and needs-input requests can rerun without creating a duplicate request", () => {
  assert.match(evaluator, /\["needs_buyer_input", "failed"\]\.includes/);
  assert.match(evaluator, /attempt_count: Number\(existingRequest\.attempt_count/);
  assert.match(evaluator, /attempt: existingRequest \? Number\(existingRequest\.attempt_count/);
});
