const test = require("node:test");
const assert = require("node:assert/strict");
const adapter = require("./seattle-schools.js");
const NOW = "2026-08-13T12:00:00.000Z";
test("returns only dated 2025-26 context with explicit 2026-27 verification gap", async () => {
  const names = ["Magnolia Elementary", "McClure Middle", "Ballard High"];
  let index = 0;
  const result = await adapter.getSchoolBoundaryContext(47.646, -122.407, {
    now: () => NOW,
    fetch: async () => ({ ok: true, json: async () => ({ features: [{ attributes: { SCHOOL_NAME: names[index++] } }] }) })
  });
  assert.equal(result.ok, true); assert.equal(result.status, "current_year_gap");
  assert.equal(result.boundaryContext.elementary.school, names[0]);
  assert.equal(result.currentAssignmentConfirmed, false);
  assert.equal(result.suppressCurrentAssignmentConclusion, true);
  assert.equal(result.officialVerificationUrl, "https://seattle.explore.avela.org/");
});
test("uses official point queries and fails closed on ambiguous boundaries", async () => {
  let firstUrl;
  const result = await adapter.getSchoolBoundaryContext(47.6, -122.3, {
    now: () => NOW, fetch: async (url) => { firstUrl ||= url; return { ok: true, json: async () => ({ features: [] }) }; }
  });
  const query = new URL(firstUrl);
  assert.equal(query.searchParams.get("geometryType"), "esriGeometryPoint");
  assert.equal(query.searchParams.get("inSR"), "4326");
  assert.equal(result.ok, false); assert.equal(result.reasonCode, "boundary_not_uniquely_resolved");
});
