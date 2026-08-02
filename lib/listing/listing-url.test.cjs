const assert = require("node:assert/strict");
const { parseListingUrl } = require("./listing-url.js");

assert.deepEqual(
  parseListingUrl("https://www.redfin.com/WA/Seattle/1515-28th-Ave-W-98199/home/126099"),
  {
    provider: "redfin",
    address: "1515 28th Ave W, Seattle, WA 98199",
    city: "Seattle",
    state: "WA",
    zip: "98199"
  }
);
assert.equal(parseListingUrl("https://example.com/home/123"), null);
assert.equal(parseListingUrl("not a url"), null);

console.log("listing URL tests passed");
