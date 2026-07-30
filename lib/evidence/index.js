/*
 * Claim-level evidence mapper.
 *
 * Converts normalized identity/source-adapter results plus an evaluation into
 * the claims/sources shape consumed by lib/approval/validators.js.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HomeSearchEvidence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var VERSION = "claim-evidence-mapper:v1";
  var OFFICIAL_ORIGINS = Object.freeze([
    "official_record",
    "listing_adapter",
    "document_adapter"
  ]);

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function record(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function text(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function stableId(prefix, value, index) {
    var normalized = text(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    return prefix + "-" + (normalized || String(index + 1));
  }

  function isNonBuyerEvidence(source) {
    return source && OFFICIAL_ORIGINS.indexOf(source.origin) !== -1;
  }

  function normalizeSource(source, index) {
    var origin = text(source.origin) || "unknown";
    return {
      id: text(source.id) || stableId("source", source.title, index),
      title: text(source.title) || "Untitled source",
      permission: origin === "buyer_submitted" ? "buyer_provided" : "allowed",
      retrievedAt: text(source.retrievedAt),
      origin: origin,
      url: text(source.url) || undefined,
      privateFileId: text(source.privateFileId) || undefined,
      adapter: text(source.adapter) || undefined
    };
  }

  function sourceIndex(sources) {
    var result = Object.create(null);
    sources.forEach(function (source) {
      result[source.id] = source;
    });
    return result;
  }

  function supportedNonBuyerIds(ids, byId) {
    return array(ids).filter(function (id) {
      return isNonBuyerEvidence(byId[id]);
    });
  }

  function buyerSourceIds(ids, byId) {
    return array(ids).filter(function (id) {
      return byId[id] && byId[id].origin === "buyer_submitted";
    });
  }

  function mapIdentity(identity, byId, claims) {
    var candidates = array(identity.candidates);
    var conflictSourceIds = candidates
      .map(function (candidate) { return candidate.sourceId; })
      .filter(Boolean);
    var resolvedSources = supportedNonBuyerIds(identity.sourceIds, byId);
    var unresolved =
      identity.resolved !== true ||
      !text(identity.address) ||
      identity.conflict === true ||
      resolvedSources.length === 0;

    if (unresolved) {
      claims.push({
        id: "claim-property-identity",
        kind: "fact",
        classification: "unknown",
        materiality: "critical",
        text: "The subject property identity is not established.",
        evidenceStatus: "unverified",
        sourceIds: [],
        checkedAt: text(identity.checkedAt),
        conflict: identity.conflict === true,
        conflictSourceIds: conflictSourceIds,
        nextAction: "Resolve the address, unit, and parcel against authoritative records."
      });
      return;
    }

    claims.push({
      id: "claim-property-identity",
      kind: "fact",
      classification: "fact",
      materiality: "critical",
      text: "The subject property is " + text(identity.address) + ".",
      evidenceStatus: "supported",
      sourceIds: resolvedSources,
      checkedAt: text(identity.checkedAt),
      conflict: false,
      parcelId: text(identity.parcelId) || undefined
    });
  }

  function mapEvaluationClaim(item, index, byId) {
    var requested = text(item.classification) || "unknown";
    var allIds = array(item.sourceIds);
    var nonBuyerIds = supportedNonBuyerIds(allIds, byId);
    var submittedIds = buyerSourceIds(allIds, byId);
    var base = {
      id: text(item.id) || stableId("claim", item.text, index),
      text: text(item.text) || "Information is unavailable.",
      materiality: text(item.materiality) || "context",
      checkedAt: text(item.checkedAt),
      conflict: item.conflict === true,
      conflictSourceIds: array(item.conflictSourceIds)
    };

    if (requested === "fact" && nonBuyerIds.length) {
      base.kind = "fact";
      base.classification = "fact";
      base.evidenceStatus = "supported";
      base.sourceIds = nonBuyerIds;
      if (submittedIds.length) base.buyerCorroborationSourceIds = submittedIds;
      return base;
    }

    if (requested === "fact") {
      /*
       * Critical rule: buyer prose is an input, not official evidence.
       * Preserve its provenance but emit an unverified factual unknown with no
       * sourceIds so approval validators cannot treat it as supported.
       */
      base.kind = "fact";
      base.classification = "unknown";
      base.evidenceStatus = "unverified";
      base.sourceIds = [];
      base.buyerSubmittedSourceIds = submittedIds;
      base.requestedClassification = "fact";
      base.nextAction =
        text(item.nextAction) || "Verify this statement using an eligible source.";
      return base;
    }

    if (requested === "inference") {
      base.kind = "inference";
      base.classification = "inference";
      base.evidenceStatus = nonBuyerIds.length ? "supported" : "unverified";
      base.sourceIds = nonBuyerIds;
      base.buyerSubmittedSourceIds = submittedIds;
      base.reasoning = text(item.reasoning);
      return base;
    }

    if (requested === "buyer_judgment") {
      base.kind = "buyer_judgment";
      base.classification = "judgment";
      base.evidenceStatus = submittedIds.length ? "supported" : "unverified";
      base.sourceIds = submittedIds;
      return base;
    }

    base.kind = "fact";
    base.classification = "unknown";
    base.evidenceStatus = "unverified";
    base.sourceIds = [];
    base.attemptedSourceIds = allIds;
    base.nextAction = text(item.nextAction) || "Gather evidence before concluding.";
    return base;
  }

  function mapEvidence(input) {
    if (!record(input)) throw new TypeError("Evidence input must be an object.");
    var sources = array(input.sources).map(normalizeSource);
    var byId = sourceIndex(sources);
    var claims = [];

    mapIdentity(record(input.identity) ? input.identity : {}, byId, claims);
    array(input.evaluation && input.evaluation.claims).forEach(function (item, index) {
      if (record(item)) claims.push(mapEvaluationClaim(item, index, byId));
    });

    return {
      mapperVersion: VERSION,
      claims: claims,
      sources: sources
    };
  }

  return Object.freeze({
    VERSION: VERSION,
    OFFICIAL_ORIGINS: OFFICIAL_ORIGINS,
    mapEvidence: mapEvidence
  });
});
