# Authoritative Property Identity Sources

## Seattle / King County

`king-county-property-identity.js` resolves a submitted Seattle/King County street address to exactly one authoritative parcel identity. It is dependency-free and accepts an injected `fetch` implementation.

The default endpoint is King County's public ArcGIS Online hosted feature layer:

```text
https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query
```

The layer is “Parcels for King County with Address, Property and Ownership Information.” It contains King County GIS address attributes and the King County Assessor parcel identifier (`PIN`). The adapter performs a standardized exact query on `ADDR_FULL`, requests no geometry, and limits the response to three records so ambiguity is visible.

King County documents the related public tools and data here:

- Parcel Viewer: `https://kingcounty.gov/en/dept/kcit/data-information-services/gis-center/maps-apps/parcel-viewer`
- Property research: `https://kingcounty.gov/en/dept/kcit/data-information-services/gis-center/property-research`
- GIS data catalog, parcel/address layer: `https://www5.kingcounty.gov/sdc?Layer=parcel_address_area`
- ArcGIS layer metadata: `https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0`

No API key is currently required. The endpoint is configuration-injectable because King County can transition hosted services. Production should monitor layer metadata/schema availability and treat endpoint/schema drift as a failed resolution, never as permission to guess.

## Usage

```js
const { resolvePropertyIdentity } =
  require("./lib/sources/king-county-property-identity");

const result = await resolvePropertyIdentity(
  "3920 W Barrett St, Seattle, WA 98199",
  {
    fetch,
    now: () => new Date().toISOString()
  }
);
```

A successful result has `status: "resolved"` and includes normalized parcel identity, one supported evidence claim, and authoritative source metadata. The adapter returns `ok: false` and fails closed for invalid input, zero results, multiple results, transfer-limit ambiguity, missing parcel/address identity, city/state/ZIP/unit mismatch, network failure, HTTP failure, service error, or malformed JSON.

This adapter establishes property identity only. It does not prove ownership, legal boundaries, title condition, permitted use, current listing facts, market value, or physical condition. King County notes that parcel map information is subject to change and lot lines are approximate/not for legal use.
