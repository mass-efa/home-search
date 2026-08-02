/* Convert supported listing URLs into normalized buyer-visible property facts. */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.HomeSearchListingUrl = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DIRECTION = { N: "N", S: "S", E: "E", W: "W", NE: "NE", NW: "NW", SE: "SE", SW: "SW" };
  var SUFFIX = {
    St: "St", Street: "St", Ave: "Ave", Avenue: "Ave", Rd: "Rd", Road: "Rd",
    Dr: "Dr", Drive: "Dr", Ln: "Ln", Lane: "Ln", Ct: "Ct", Court: "Ct",
    Pl: "Pl", Place: "Pl", Blvd: "Blvd", Boulevard: "Blvd", Way: "Way",
    Ter: "Ter", Terrace: "Ter", Cir: "Cir", Circle: "Cir", Trl: "Trl", Trail: "Trl"
  };

  function titleToken(token) {
    var upper = String(token || "").toUpperCase();
    if (DIRECTION[upper]) return DIRECTION[upper];
    var title = upper.charAt(0) + upper.slice(1).toLowerCase();
    return SUFFIX[title] || title;
  }

  function parseRedfinUrl(value) {
    var url;
    try { url = new URL(String(value || "")); } catch (_error) { return null; }
    if (!/(^|\.)redfin\.com$/i.test(url.hostname)) return null;
    var parts = url.pathname.split("/").filter(Boolean);
    var homeIndex = parts.indexOf("home");
    if (homeIndex < 3) return null;
    var state = String(parts[0] || "").toUpperCase();
    var city = String(parts[1] || "").split("-").map(titleToken).join(" ");
    var slugParts = String(parts[homeIndex - 1] || "").split("-").filter(Boolean);
    var zip = /^\d{5}$/.test(slugParts[slugParts.length - 1] || "") ? slugParts.pop() : "";
    if (!/^\d+[A-Za-z]?$/.test(slugParts[0] || "") || !city || !state) return null;
    var street = slugParts.map(titleToken).join(" ");
    return {
      provider: "redfin",
      address: street + ", " + city + ", " + state + (zip ? " " + zip : ""),
      city: city,
      state: state,
      zip: zip
    };
  }

  return Object.freeze({ parseListingUrl: parseRedfinUrl });
});
