# Alpha Source Rights Register

Updated: 2026-07-29

This register controls which external sources may support an automatically
approved Decision Brief. Absence from this register means the source cannot
support a factual claim.

| Source | Purpose | Access | Storage and display policy | Status |
| --- | --- | --- | --- | --- |
| King County ArcGIS Online `PARCEL_ADDRESS_PUB_AREA_3069` | Resolve submitted address to one King County parcel PIN | Public, no API key; official hosted feature query | Query one submitted address at a time. Store normalized identity, checked date, adapter version, and source URL. Do not bulk-download or republish the layer. Attribute King County GIS / King County Assessor. | Approved for bounded identity lookup |
| King County Parcel Viewer / Property Research | Human verification and source links | Public official tools | Link to the official tool; do not scrape or cache rendered reports during alpha | Approved as verification link only |
| Buyer-submitted listing URL and notes | Intake and buyer context | Buyer-provided | Store privately. May support buyer statements or provenance, but cannot independently support an official property fact | Approved with evidence limitation |
| Buyer-uploaded documents | Transaction-specific diligence | Buyer-provided private documents | Private storage only; no public sharing by default. Page-level claims require file hash, page existence, and visual verification | Pending upload implementation |
| Redfin or other listing portal page | Listing-derived facts | Public page subject to provider terms and access controls | No automated scraping commitment. Accept the URL as an identifier until a permitted adapter or licensed feed is approved | Not approved for automated factual extraction |

## King County Identity Endpoint

```text
https://services.arcgis.com/Ej0PsM5Aw677QF1W/arcgis/rest/services/PARCEL_ADDRESS_PUB_AREA_3069/FeatureServer/0/query
```

The adapter requests selected attributes, no geometry, and at most three
records. Zero, multiple, incomplete, mismatched, or upstream-error results fail
closed.

King County describes Parcel Viewer as supporting address and parcel searches
and linking to Assessor reports. The county data catalog also warns that parcel
address layers can contain one selected address where several addresses share a
parcel and that GIS boundaries are not legal surveys. The product therefore
uses this source only to establish an address/PIN identity, not ownership,
title, legal boundaries, permitted use, valuation, or condition.

## Release Rule

Source rights, endpoint schema, attribution, and freshness must be checked again
before automatic delivery is enabled. A source transition, access restriction,
schema change, or unclear right to use the result disables the affected module
and routes the candidate to an exception state.
