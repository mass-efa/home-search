const test = require("node:test");
const assert = require("node:assert/strict");
const adapter = require("./king-county-property-identity.js");
const fixtures = require("./fixtures/king-county-property-identity.cjs");

const NOW = "2026-07-29T12:00:00.000Z";

function response(payload, options = {}) {
  return {
    ok: options.ok !== false,
    status: options.status || 200,
    async json() {
      if (options.jsonError) throw new Error("bad json");
      return payload;
    }
  };
}

function resolverFor(payload, options = {}) {
  let request;
  const fetch = async (url, init) => {
    request = { url, init };
    if (options.throwFetch) throw new Error("offline");
    return response(payload, options);
  };
  return {
    resolve(address) {
      return adapter.resolvePropertyIdentity(address, {
        fetch,
        now: () => NOW
      });
    },
    getRequest() {
      return request;
    }
  };
}

test("normalizes a Seattle address without guessing parcel identity", () => {
  const normalized = adapter.normalizeAddress("3920 W. Barrett Street, Seattle, WA 98199");
  assert.equal(normalized.ok, true);
  assert.equal(normalized.queryAddress, "3920 W BARRETT ST");
  assert.equal(normalized.suppliedCity, "SEATTLE");
  assert.equal(normalized.suppliedZip, "98199");
});

test("rejects missing or non-street input before fetch", async () => {
  const resolver = resolverFor(fixtures.singleMatch);
  assert.equal((await resolver.resolve("")).status, "invalid_input");
  assert.equal((await resolver.resolve("Seattle WA")).status, "invalid_input");
  assert.equal(resolver.getRequest(), undefined);
});

test("queries the authoritative ArcGIS layer and resolves one parcel", async () => {
  const resolver = resolverFor(fixtures.singleMatch);
  const result = await resolver.resolve("3920 W Barrett Street, Seattle, WA 98199");
  assert.equal(result.ok, true);
  assert.equal(result.status, "resolved");
  assert.equal(result.identity.parcelId, "1234567890");
  assert.equal(result.identity.displayAddress, "3920 W BARRETT ST, SEATTLE, WA 98199");
  assert.equal(result.source.publisher, "King County GIS / King County Assessor");
  assert.equal(result.source.evidenceStatus, "primary");
  assert.equal(result.evidence[0].checkedAt, NOW);

  const query = new URL(resolver.getRequest().url);
  assert.equal(query.origin, "https://services.arcgis.com");
  assert.equal(query.searchParams.get("where"), "ADDR_FULL = '3920 W BARRETT ST'");
  assert.equal(query.searchParams.get("returnGeometry"), "false");
  assert.equal(query.searchParams.get("resultRecordCount"), "3");
});

test("fails closed for zero authoritative results", async () => {
  const result = await resolverFor(fixtures.zeroMatches).resolve("3920 W Barrett St, Seattle, WA 98199");
  assert.equal(result.ok, false);
  assert.equal(result.status, "zero_results");
});

test("fails closed for multiple authoritative results", async () => {
  const result = await resolverFor(fixtures.multipleMatches).resolve("3920 W Barrett St, Seattle, WA 98199");
  assert.equal(result.ok, false);
  assert.equal(result.status, "multiple_results");
});

test("fails closed for parcel, address, zip, and unit ambiguity", async () => {
  const missingPin = structuredClone(fixtures.singleMatch);
  missingPin.features[0].attributes.PIN = "";
  missingPin.features[0].attributes.MAJOR = "";
  missingPin.features[0].attributes.MINOR = "";
  assert.equal(
    (await resolverFor(missingPin).resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "ambiguous"
  );

  const wrongZip = structuredClone(fixtures.singleMatch);
  wrongZip.features[0].attributes.ZIP5 = "98109";
  assert.equal(
    (await resolverFor(wrongZip).resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "ambiguous"
  );

  assert.equal(
    (await resolverFor(fixtures.singleMatch).resolve("3920 W Barrett St Unit 4, Seattle, WA 98199")).status,
    "ambiguous"
  );
});

test("fails closed for transfer limits and upstream failures", async () => {
  assert.equal(
    (await resolverFor({ features: [], exceededTransferLimit: true })
      .resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "ambiguous"
  );
  assert.equal(
    (await resolverFor({}, { ok: false, status: 503 })
      .resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "failed"
  );
  assert.equal(
    (await resolverFor({}, { throwFetch: true })
      .resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "failed"
  );
  assert.equal(
    (await resolverFor({}, { jsonError: true })
      .resolve("3920 W Barrett St, Seattle, WA 98199")).status,
    "failed"
  );
});
