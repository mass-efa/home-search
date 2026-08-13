const test = require("node:test");
const assert = require("node:assert/strict");
const adapter = require("./seattle-safety.js");
const NOW = "2026-08-13T12:00:00.000Z";
test("resolves official MCPP and compares two rolling 12-month periods", async () => {
  const urls = [];
  const fetch = async (url) => {
    urls.push(url); const parsed = new URL(url);
    if (parsed.hostname === "services.arcgis.com") return { ok: true, json: async () => ({ features: [{ attributes: { neighborhood: "Magnolia" } }] }) };
    const prior = parsed.searchParams.get("$where").includes("2024-08-13");
    return { ok: true, json: async () => [{ offense_category: "Burglary", incident_count: prior ? "8" : "5" }] };
  };
  const result = await adapter.getSafetyContext(47.646, -122.407, { fetch, now: () => NOW });
  assert.equal(result.ok, true); assert.equal(result.geography.name, "Magnolia");
  assert.equal(result.periods.current.byOffenseCategory[0].count, 5);
  assert.equal(result.periods.prior.byOffenseCategory[0].count, 8);
  assert.equal(result.units, "reported_offenses"); assert.equal(urls.length, 3);
});
test("fails closed when MCPP does not resolve uniquely or incident API fails", async () => {
  const zero = await adapter.getSafetyContext(47.6, -122.3, { now: () => NOW, fetch: async () => ({ ok: true, json: async () => ({ features: [] }) }) });
  assert.equal(zero.ok, false); assert.equal(zero.reasonCode, "mcpp_not_uniquely_resolved");
  const bad = await adapter.getSafetyContext(47.6, -122.3, { now: () => NOW, fetch: async (url) => url.includes("arcgis") ? ({ ok: true, json: async () => ({ features: [{ attributes: { neighborhood: "Northgate" } }] }) }) : ({ ok: false, status: 503, json: async () => ({}) }) });
  assert.equal(bad.ok, false); assert.equal(bad.reasonCode, "upstream_http_error");
});
