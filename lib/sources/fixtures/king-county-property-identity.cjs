const singleMatch = {
  features: [{
    attributes: {
      OBJECTID: 101,
      PIN: "1234567890",
      MAJOR: "123456",
      MINOR: "7890",
      ADDR_FULL: "3920 W BARRETT ST",
      FULLNAME: "3920 W BARRETT ST",
      UNIT_NUM: null,
      ZIP5: "98199",
      CTYNAME: "SEATTLE",
      POSTALCTYNAME: "SEATTLE",
      STATE_ABBR: "WA",
      PRIMARY_ADDR: 1,
      LAT: 47.646,
      LON: -122.407
    }
  }]
};

module.exports = {
  singleMatch,
  zeroMatches: { features: [] },
  multipleMatches: {
    features: [
      singleMatch.features[0],
      {
        attributes: {
          ...singleMatch.features[0].attributes,
          OBJECTID: 102,
          PIN: "1234567891"
        }
      }
    ]
  }
};
