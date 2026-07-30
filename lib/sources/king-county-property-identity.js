/*
 * Authoritative Seattle / King County property-identity adapter.
 *
 * Dependency-free UMD module. Inject `fetch` and `now` for deterministic tests.
 * The adapter resolves exactly one King County parcel or fails closed.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.KingCountyPropertyIdentity = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var ADAPTER_VERSION = "king-county-property-identity:v1";
  var DEFAULT_ENDPOINT =
    "https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/" +
    "PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query";
  var OUT_FIELDS = [
    "OBJECTID", "PIN", "MAJOR", "MINOR", "ADDR_FULL", "FULLNAME", "UNIT_NUM",
    "ZIP5", "CTYNAME", "POSTALCTYNAME", "STATE_ABBR", "PRIMARY_ADDR", "LAT", "LON"
  ];

  var STREET_SUFFIXES = Object.freeze({
    STREET: "ST", ST: "ST",
    AVENUE: "AVE", AVE: "AVE",
    ROAD: "RD", RD: "RD",
    DRIVE: "DR", DR: "DR",
    LANE: "LN", LN: "LN",
    COURT: "CT", CT: "CT",
    PLACE: "PL", PL: "PL",
    BOULEVARD: "BLVD", BLVD: "BLVD",
    HIGHWAY: "HWY", HWY: "HWY",
    PARKWAY: "PKWY", PKWY: "PKWY",
    TERRACE: "TER", TER: "TER",
    CIRCLE: "CIR", CIR: "CIR",
    TRAIL: "TRL", TRL: "TRL",
    WAY: "WAY"
  });

  function clean(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function normalizeTokens(value) {
    return clean(value)
      .toUpperCase()
      .replace(/[.'’]/g, "")
      .replace(/[-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeStreetSuffix(value) {
    var tokens = normalizeTokens(value).split(" ");
    return tokens.map(function (token) {
      return STREET_SUFFIXES[token] || token;
    }).join(" ");
  }

  function normalizeAddress(input) {
    var raw = clean(input);
    if (!raw) return { ok: false, code: "missing_address", detail: "Address is required." };
    if (raw.length > 240) return { ok: false, code: "address_too_long", detail: "Address exceeds 240 characters." };

    var upper = raw.toUpperCase().replace(/\r?\n/g, ", ");
    var zipMatch = upper.match(/\b(98\d{3})(?:-\d{4})?\b/);
    var zip = zipMatch ? zipMatch[1] : "";
    var unitMatch = upper.match(/(?:#|\bAPT\b|\bUNIT\b|\bSTE\b)\s*([A-Z0-9-]+)\b/);
    var unit = unitMatch ? unitMatch[1].replace(/-/g, "") : "";

    var parts = upper.split(",").map(function (part) { return part.trim(); }).filter(Boolean);
    var street = parts[0] || "";
    street = street
      .replace(/(?:#|\bAPT\b|\bUNIT\b|\bSTE\b)\s*[A-Z0-9-]+\b.*$/i, "")
      .trim();

    // Accept a no-comma form by trimming a recognized Seattle/WA/ZIP suffix.
    street = street
      .replace(/\s+SEATTLE\s*,?\s+WA(?:SHINGTON)?\s+98\d{3}(?:-\d{4})?\s*$/i, "")
      .replace(/\s+SEATTLE\s*,?\s+WA(?:SHINGTON)?\s*$/i, "")
      .trim();

    var queryAddress = normalizeStreetSuffix(street);
    if (!/^\d+[A-Z]?(?:-\d+)?\s+\S+/.test(queryAddress)) {
      return {
        ok: false,
        code: "invalid_street_address",
        detail: "A house number and street name are required."
      };
    }

    var suppliedCity = /\bSEATTLE\b/i.test(upper) ? "SEATTLE" : "";
    var suppliedState = /\b(?:WA|WASHINGTON)\b/i.test(upper) ? "WA" : "";
    return {
      ok: true,
      raw: raw,
      queryAddress: queryAddress,
      unit: unit,
      suppliedCity: suppliedCity,
      suppliedState: suppliedState,
      suppliedZip: zip
    };
  }

  function escapeSqlLiteral(value) {
    return String(value).replace(/'/g, "''");
  }

  function buildQueryUrl(endpoint, normalized) {
    var url = new URL(endpoint);
    url.searchParams.set("f", "json");
    url.searchParams.set("where", "ADDR_FULL = '" + escapeSqlLiteral(normalized.queryAddress) + "'");
    url.searchParams.set("outFields", OUT_FIELDS.join(","));
    url.searchParams.set("returnGeometry", "false");
    url.searchParams.set("resultRecordCount", "3");
    url.searchParams.set("orderByFields", "OBJECTID ASC");
    return url.toString();
  }

  function fail(status, normalized, details, source) {
    return {
      ok: false,
      status: status,
      normalizedInput: normalized && normalized.ok ? {
        queryAddress: normalized.queryAddress,
        unit: normalized.unit || null,
        city: normalized.suppliedCity || null,
        state: normalized.suppliedState || null,
        zip: normalized.suppliedZip || null
      } : null,
      details: details || null,
      source: source || null
    };
  }

  function getAttributes(feature) {
    return feature && feature.attributes && typeof feature.attributes === "object"
      ? feature.attributes
      : {};
  }

  function normalizePin(attributes) {
    var pin = clean(attributes.PIN).replace(/\D/g, "");
    var major = clean(attributes.MAJOR).replace(/\D/g, "");
    var minor = clean(attributes.MINOR).replace(/\D/g, "");
    if (!pin && major && minor) pin = major.padStart(6, "0") + minor.padStart(4, "0");
    return /^\d{10}$/.test(pin) ? pin : "";
  }

  function matchesSuppliedContext(attributes, normalized) {
    var city = normalizeTokens(attributes.POSTALCTYNAME || attributes.CTYNAME);
    var state = normalizeTokens(attributes.STATE_ABBR || "WA");
    var zip = clean(attributes.ZIP5);
    var unit = normalizeTokens(attributes.UNIT_NUM).replace(/-/g, "");
    if (normalized.suppliedCity && city && city !== normalized.suppliedCity) return false;
    if (normalized.suppliedState && state && state !== normalized.suppliedState) return false;
    if (normalized.suppliedZip && zip && zip !== normalized.suppliedZip) return false;
    if (normalized.unit && unit !== normalized.unit) return false;
    return true;
  }

  function sourceMetadata(queryUrl, checkedAt) {
    return {
      id: "king-county-parcel-address",
      sourceType: "authoritative_property_identity",
      title: "King County parcel address and property layer",
      publisher: "King County GIS / King County Assessor",
      url: queryUrl,
      endpoint: DEFAULT_ENDPOINT,
      permission: "allowed",
      evidenceStatus: "primary",
      extractionMethod: "ArcGIS FeatureServer attribute query",
      checkedAt: checkedAt,
      retrievedAt: checkedAt,
      adapterVersion: ADAPTER_VERSION
    };
  }

  async function resolvePropertyIdentity(address, options) {
    var config = options && typeof options === "object" ? options : {};
    var normalized = normalizeAddress(address);
    if (!normalized.ok) return fail("invalid_input", null, normalized);

    var fetchFn = config.fetch || (typeof fetch === "function" ? fetch : null);
    if (typeof fetchFn !== "function") {
      return fail("failed", normalized, { code: "fetch_unavailable" });
    }
    var endpoint = clean(config.endpoint) || DEFAULT_ENDPOINT;
    var checkedAt = typeof config.now === "function"
      ? config.now()
      : new Date().toISOString();
    var queryUrl;
    try {
      queryUrl = buildQueryUrl(endpoint, normalized);
    } catch (_error) {
      return fail("failed", normalized, { code: "invalid_endpoint" });
    }
    var source = sourceMetadata(queryUrl, checkedAt);
    source.endpoint = endpoint;

    var response;
    try {
      response = await fetchFn(queryUrl, {
        method: "GET",
        headers: { Accept: "application/json" }
      });
    } catch (_error) {
      return fail("failed", normalized, { code: "upstream_unreachable" }, source);
    }
    if (!response || !response.ok) {
      return fail("failed", normalized, {
        code: "upstream_http_error",
        httpStatus: response && Number.isFinite(response.status) ? response.status : null
      }, source);
    }

    var payload;
    try {
      payload = await response.json();
    } catch (_error) {
      return fail("failed", normalized, { code: "upstream_invalid_json" }, source);
    }
    if (!payload || payload.error || !Array.isArray(payload.features)) {
      return fail("failed", normalized, {
        code: "upstream_service_error",
        serviceCode: payload && payload.error ? payload.error.code || null : null
      }, source);
    }
    if (payload.exceededTransferLimit) {
      return fail("ambiguous", normalized, { code: "result_limit_exceeded" }, source);
    }
    if (payload.features.length === 0) {
      return fail("zero_results", normalized, { code: "no_authoritative_match" }, source);
    }
    if (payload.features.length !== 1) {
      return fail("multiple_results", normalized, {
        code: "multiple_authoritative_matches",
        resultCount: payload.features.length
      }, source);
    }

    var attributes = getAttributes(payload.features[0]);
    var parcelId = normalizePin(attributes);
    var authoritativeAddress = normalizeStreetSuffix(attributes.ADDR_FULL || attributes.FULLNAME);
    if (!parcelId || !authoritativeAddress) {
      return fail("ambiguous", normalized, { code: "incomplete_authoritative_identity" }, source);
    }
    if (authoritativeAddress !== normalized.queryAddress) {
      return fail("ambiguous", normalized, {
        code: "authoritative_address_mismatch",
        authoritativeAddress: authoritativeAddress
      }, source);
    }
    if (!matchesSuppliedContext(attributes, normalized)) {
      return fail("ambiguous", normalized, { code: "city_state_zip_or_unit_mismatch" }, source);
    }

    var city = normalizeTokens(attributes.POSTALCTYNAME || attributes.CTYNAME || "SEATTLE");
    var state = normalizeTokens(attributes.STATE_ABBR || "WA");
    var zip = clean(attributes.ZIP5);
    var unit = normalizeTokens(attributes.UNIT_NUM);
    var displayAddress = authoritativeAddress +
      (unit ? " UNIT " + unit : "") +
      (city ? ", " + city : "") +
      (state ? ", " + state : "") +
      (zip ? " " + zip : "");

    return {
      ok: true,
      status: "resolved",
      identity: {
        jurisdiction: "King County, Washington",
        parcelId: parcelId,
        major: parcelId.slice(0, 6),
        minor: parcelId.slice(6),
        normalizedStreetAddress: authoritativeAddress,
        unit: unit || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        displayAddress: displayAddress,
        primaryAddress: attributes.PRIMARY_ADDR === 1,
        latitude: Number.isFinite(attributes.LAT) ? attributes.LAT : null,
        longitude: Number.isFinite(attributes.LON) ? attributes.LON : null
      },
      evidence: [{
        claim: "King County parcel " + parcelId + " is associated with " + displayAddress + ".",
        claimType: "fact",
        evidenceStatus: "supported",
        checkedAt: checkedAt,
        sourceId: source.id
      }],
      source: source
    };
  }

  return Object.freeze({
    ADAPTER_VERSION: ADAPTER_VERSION,
    DEFAULT_ENDPOINT: DEFAULT_ENDPOINT,
    OUT_FIELDS: Object.freeze(OUT_FIELDS.slice()),
    normalizeAddress: normalizeAddress,
    buildQueryUrl: buildQueryUrl,
    resolvePropertyIdentity: resolvePropertyIdentity
  });
});
