/* Dated SPS 2025-26 attendance-boundary context; never asserts current assignment. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SeattleSchoolSource = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var VERSION = "seattle-schools:v1";
  var ENDPOINTS = Object.freeze({
    elementary: "https://services2.arcgis.com/I7NQBinfvOmxQbXs/arcgis/rest/services/sps_attendance_area_ES_2025_2026/FeatureServer/0/query",
    middle: "https://services2.arcgis.com/I7NQBinfvOmxQbXs/arcgis/rest/services/sps_attendance_area_MS_2025_2026/FeatureServer/0/query",
    high: "https://services2.arcgis.com/I7NQBinfvOmxQbXs/arcgis/rest/services/sps_attendance_area_HS_2025_2026/FeatureServer/0/query"
  });
  var VERIFY_URL = "https://seattle.explore.avela.org/";
  function queryUrl(endpoint, latitude, longitude) {
    var url = new URL(endpoint);
    [["f", "json"], ["geometry", longitude + "," + latitude], ["geometryType", "esriGeometryPoint"],
      ["inSR", "4326"], ["spatialRel", "esriSpatialRelIntersects"], ["outFields", "*"],
      ["returnGeometry", "false"]].forEach(function (pair) { url.searchParams.set(pair[0], pair[1]); });
    return url.toString();
  }
  function schoolName(attributes) {
    var keys = ["SCHOOL", "SCHOOL_NAME", "School_Name", "NAME", "Name", "ES", "MS", "HS"];
    for (var i = 0; i < keys.length; i += 1) if (attributes && attributes[keys[i]]) return String(attributes[keys[i]]).trim();
    return "";
  }
  async function getSchoolBoundaryContext(latitude, longitude, options) {
    var config = options || {};
    var fetchFn = config.fetch || (typeof fetch === "function" ? fetch : null);
    var checkedAt = typeof config.now === "function" ? config.now() : new Date().toISOString();
    if (!fetchFn || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return { ok: false, status: "incomplete", checkedAt: checkedAt, reasonCode: "invalid_location" };
    try {
      var levels = Object.keys(ENDPOINTS);
      var queries = levels.map(function (level) { return queryUrl((config.endpoints || ENDPOINTS)[level], latitude, longitude); });
      var payloads = await Promise.all(queries.map(async function (url) {
        var response = await fetchFn(url, { headers: { Accept: "application/json" } });
        if (!response || !response.ok) throw new Error("upstream_http_error");
        return response.json();
      }));
      var context = {};
      for (var i = 0; i < levels.length; i += 1) {
        if (!payloads[i] || payloads[i].error || !Array.isArray(payloads[i].features) || payloads[i].features.length !== 1) throw new Error("boundary_not_uniquely_resolved");
        var name = schoolName(payloads[i].features[0].attributes);
        if (!name) throw new Error("school_name_missing");
        context[levels[i]] = { school: name, boundarySchoolYear: "2025-26", sourceUrl: queries[i] };
      }
      return {
        ok: true, status: "current_year_gap", checkedAt: checkedAt, adapterVersion: VERSION,
        geography: { type: "SPS_attendance_boundary", method: "official_point_in_polygon" },
        boundaryContext: context,
        currentSchoolYear: "2026-27", currentAssignmentConfirmed: false,
        suppressCurrentAssignmentConclusion: true,
        officialVerificationUrl: VERIFY_URL,
        officialEntryUrl: "https://www.seattleschools.org/enroll/find-your-school/",
        provenance: { publisher: "Seattle Public Schools", boundarySchoolYear: "2025-26" },
        limitations: [
          "These polygons are dated 2025-26 boundary context, not a verified 2026-27 assignment.",
          "Assignments can depend on grade, program, services, choice, capacity, and district changes.",
          "Verify the current address through the official SPS/Avela tool before relying on any assignment."
        ]
      };
    } catch (error) { return { ok: false, status: "incomplete", checkedAt: checkedAt,
      reasonCode: error && error.message || "upstream_failed", officialVerificationUrl: VERIFY_URL }; }
  }
  return Object.freeze({ ADAPTER_VERSION: VERSION, ENDPOINTS: ENDPOINTS,
    OFFICIAL_VERIFICATION_URL: VERIFY_URL, getSchoolBoundaryContext: getSchoolBoundaryContext });
});
