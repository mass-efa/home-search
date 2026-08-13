/* Official Seattle safety context: SPD MCPP geography + SPD public incident data. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SeattleSafetySource = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var VERSION = "seattle-safety:v1";
  var MCPP_ENDPOINT = "https://services.arcgis.com/ZOyb2t4B0UYuYNYH/ArcGIS/rest/services/SPD_Boundaries/FeatureServer/0/query";
  var INCIDENT_ENDPOINT = "https://data.seattle.gov/resource/tazs-3rd5.json";

  function isoDate(date) { return date.toISOString().slice(0, 10) + "T00:00:00"; }
  function shiftYear(date, years) { var d = new Date(date); d.setUTCFullYear(d.getUTCFullYear() + years); return d; }
  function sql(value) { return String(value).replace(/'/g, "''"); }
  function failure(code, checkedAt, detail) {
    return { ok: false, status: "incomplete", checkedAt: checkedAt, reasonCode: code,
      detail: detail || null, adapterVersion: VERSION };
  }
  function mcppUrl(endpoint, latitude, longitude) {
    var url = new URL(endpoint);
    url.searchParams.set("f", "json");
    url.searchParams.set("geometry", longitude + "," + latitude);
    url.searchParams.set("geometryType", "esriGeometryPoint");
    url.searchParams.set("inSR", "4326");
    url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
    url.searchParams.set("outFields", "neighborhood");
    url.searchParams.set("returnGeometry", "false");
    return url.toString();
  }
  function incidentUrl(endpoint, neighborhood, start, end) {
    var url = new URL(endpoint);
    url.searchParams.set("$select", "offense_category,count(*) as incident_count");
    url.searchParams.set("$where", "report_date_time >= '" + isoDate(start) + "' AND report_date_time < '" + isoDate(end) + "' AND neighborhood = '" + sql(neighborhood) + "'");
    url.searchParams.set("$group", "offense_category");
    url.searchParams.set("$order", "incident_count DESC");
    url.searchParams.set("$limit", "500");
    return url.toString();
  }
  async function json(fetchFn, url) {
    var response = await fetchFn(url, { headers: { Accept: "application/json" } });
    if (!response || !response.ok) throw new Error("upstream_http_error");
    var value = await response.json();
    if (value && value.error) throw new Error("upstream_service_error");
    return value;
  }
  function rows(value) {
    if (!Array.isArray(value)) throw new Error("invalid_incident_response");
    return value.map(function (row) {
      return { category: String(row.offense_category || "Unknown"), count: Number(row.incident_count || 0) };
    }).filter(function (row) { return Number.isFinite(row.count) && row.count >= 0; });
  }
  async function getSafetyContext(latitude, longitude, options) {
    var config = options || {};
    var fetchFn = config.fetch || (typeof fetch === "function" ? fetch : null);
    var checkedAt = typeof config.now === "function" ? config.now() : new Date().toISOString();
    if (!fetchFn || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return failure("invalid_location", checkedAt);
    var end = new Date(checkedAt);
    var currentStart = shiftYear(end, -1);
    var priorStart = shiftYear(end, -2);
    try {
      var boundaryUrl = mcppUrl(config.mcppEndpoint || MCPP_ENDPOINT, latitude, longitude);
      var boundary = await json(fetchFn, boundaryUrl);
      if (!boundary || !Array.isArray(boundary.features) || boundary.features.length !== 1) return failure("mcpp_not_uniquely_resolved", checkedAt);
      var neighborhood = String(boundary.features[0].attributes && boundary.features[0].attributes.neighborhood || "").trim();
      if (!neighborhood) return failure("mcpp_name_missing", checkedAt);
      var currentUrl = incidentUrl(config.incidentEndpoint || INCIDENT_ENDPOINT, neighborhood.toUpperCase(), currentStart, end);
      var priorUrl = incidentUrl(config.incidentEndpoint || INCIDENT_ENDPOINT, neighborhood.toUpperCase(), priorStart, currentStart);
      var results = await Promise.all([json(fetchFn, currentUrl), json(fetchFn, priorUrl)]);
      return {
        ok: true, status: "complete", checkedAt: checkedAt, adapterVersion: VERSION,
        geography: { type: "SPD_MCPP", name: neighborhood, resolution: "official_point_in_polygon" },
        periods: {
          current: { start: isoDate(currentStart), endExclusive: isoDate(end), byOffenseCategory: rows(results[0]) },
          prior: { start: isoDate(priorStart), endExclusive: isoDate(currentStart), byOffenseCategory: rows(results[1]) }
        },
        units: "reported_offenses",
        provenance: [
          { publisher: "Seattle Police Department", dataset: "MCPP boundaries", url: boundaryUrl },
          { publisher: "Seattle Police Department / City of Seattle Open Data", dataset: "SPD Crime Data", url: INCIDENT_ENDPOINT, datasetId: "tazs-3rd5" }
        ],
        freshness: { checkedAt: checkedAt, rollingMonths: 12, comparisonMonths: 12 },
        completeness: { complete: true, groupedBy: "offense_category" },
        limitations: [
          "Counts are reported offenses, not a measure of individual risk or unreported incidents.",
          "MCPP-level counts are broader than the property and are not population-normalized.",
          "Recent records may change as SPD updates classifications and reports."
        ]
      };
    } catch (error) { return failure(error && error.message || "upstream_failed", checkedAt); }
  }
  return Object.freeze({ ADAPTER_VERSION: VERSION, MCPP_ENDPOINT: MCPP_ENDPOINT,
    INCIDENT_ENDPOINT: INCIDENT_ENDPOINT, getSafetyContext: getSafetyContext });
});
