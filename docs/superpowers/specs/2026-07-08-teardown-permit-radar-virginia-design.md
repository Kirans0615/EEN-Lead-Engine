# Teardown Permit Radar — Virginia (Fairfax County) Expansion

## Context

Tool 2 in the Live Intel section ("Teardown Permit Radar — Live") currently queries only
Montgomery County, MD's dataMontgomery Socrata API for two permit types: Demolition
(teardown signal) and New Single-Family Construction (active-builder signal). This design
adds Fairfax County, VA as a second jurisdiction, selectable from the tool itself.

**Scope boundary:** this covers Tool 2 (Teardown Permit Radar) only. Tool 1 (SDAT Property
Finder), Tool 3 (Code Violation Sweep), and the static "Engine 02" strategy playbook
(index.html:179-222, MD-specific intern workflow/links) are all out of scope and unchanged.
Porting the full 8-engine lead-source playbook to Virginia's different court/records systems
is a separate, larger effort.

## Data source research (verified live)

Fairfax County publishes a public, key-free ArcGIS FeatureServer — same technology family
(Esri REST) that Tool 1 already queries against MD iMAP, just a different endpoint/schema:

- Service: `https://www.fairfaxcounty.gov/lambert/rest/services/LDS/DevelopmentTracker/FeatureServer/5`
  ("Recent Building Permits - Parcels"), 10,921+ live records spanning 2015–2026, updated nightly from PLUS.
- Field `APPTYPEALIAS` is a coded-value domain with 37 permit types, including
  `Residential New` (1,099 live records — confirmed via `returnCountOnly` query) and
  `Residential Demolition` (defined in the domain but **0 live records**, confirmed by direct
  query; same result for `Commercial Demolition`). An adjacent "Active Site Construction"
  layer was also checked and has no demolition record type either.
- **Conclusion:** Fairfax has no public demolition-permit feed today. New-construction /
  active-builder mode is fully replicable; demolition/teardown-adjacency mode is not.
- Decision (confirmed with user): ship new-construction-only for Virginia. Do not show a
  Demolition option when Fairfax is selected — no dead-end queries, no fake parity.

Key fields on the Fairfax layer relevant here: `RECORDID`, `APPTYPEALIAS`, `RECORD_STATUS`,
`SUBMITTED_DATE`, `ISSUED_DATE`, `ESTIMATED_COST`, `ADDRESS_1`, `ADDRESS_2`, `CITY`, `ZIP_CODE`.
`SUBMITTED_DATE`/`ISSUED_DATE` serialize as epoch-ms in JSON responses (standard Esri REST
behavior); the query `where` clause itself can use an ANSI date literal
(`SUBMITTED_DATE > timestamp '2026-04-01 00:00:00'`) rather than needing epoch math client-side.

## UI changes (index.html)

Add a **County** dropdown to Tool 2's form grid, first field, above Permit Type:

```html
<select id="pm-county">
  <option value="mont" selected>Montgomery, MD</option>
  <option value="ffx">Fairfax, VA</option>
</select>
```

Behavior on change (`setCounty()`):
1. **Permit Type options** — MD keeps `Demolition` + `New construction` (unchanged). VA shows
   only `New single-family construction (active builders)` — no Demolition option rendered.
2. **Default zip list** — VA defaults to Fairfax luxury/teardown-comparable zips:
   `22101,22102` (McLean), `22066` (Great Falls), `22181,22182` (Vienna), `22124` (Oakton).
3. **Helper text** under the zip field updates to name the Fairfax areas (mirrors existing
   MD helper text pattern).

Look-back window (1/3/6/12 months) stays a single shared control for both counties.

**Copy updates:**
- Tool 2 header/description (index.html:490-491) becomes county-aware — swap the phrase
  currently hardcoded to "Montgomery County's live permit feed" based on the selected county.
- Live Intel section intro (index.html:377) updates to mention both counties are queryable
  from Tool 2.
- README.md's Live Intel bullet updates to note Fairfax, VA new-construction coverage
  alongside Montgomery, MD demolition + new-construction.

Everything else in the card — Run button, status line, results table and its columns — stays
structurally identical.

## Data flow / normalization (app.js)

**Normalized row shape** — both jurisdictions' parsers produce the same shape the existing
render loop (app.js:829-837) already expects, so that loop needs no changes:

```js
{ date, address, status, detail, mapUrl, pipelineNote }
```

**Per-jurisdiction query builders**, selected by `#pm-county`:
- `buildMontgomeryQuery(type, zips, months)` — existing Socrata SoQL logic (app.js:794-806),
  untouched.
- `buildFairfaxQuery(zips, months)` — new. Queries
  `.../DevelopmentTracker/FeatureServer/5/query` with:
  - `where`: `ZIP_CODE IN ('22101','22102',...) AND APPTYPEALIAS='Residential New' AND SUBMITTED_DATE > timestamp '<since> 00:00:00'`
  - `outFields`: `RECORDID,APPTYPEALIAS,RECORD_STATUS,SUBMITTED_DATE,ISSUED_DATE,ESTIMATED_COST,ADDRESS_1,ADDRESS_2,CITY,ZIP_CODE`
  - `orderByFields`: `SUBMITTED_DATE DESC`
  - `resultRecordCount`: `60`
  - `f`: `json`
  - No permit-type parameter needed client-side beyond the fixed `APPTYPEALIAS` filter, since
    VA only offers one mode.

**Per-jurisdiction parsers** map raw rows into the normalized shape:
- MD (existing): `applicationtype`/`worktype` → detail; `stno+stname+suffix` → address;
  `addeddate` → date; `status` → status.
- VA (new): `ADDRESS_1 + ', ' + CITY + ' ' + ZIP_CODE` → address; `ESTIMATED_COST` formatted
  via existing `fmtMoney()` → detail (VA has no `description`/declared-valuation field for
  this permit type, so estimated cost is the closest analog); `RECORD_STATUS` → status;
  `SUBMITTED_DATE` (epoch ms) → date, reusing the existing `fmtIso()` helper (app.js:426-430)
  unchanged — it does `new Date(s)` internally, which already accepts a numeric epoch-ms
  value exactly as it accepts MD's ISO date strings, so no new formatter is needed.

**Pipeline integration:**
- Note text becomes county-aware: MD's demolition note stays as-is
  ("Permit adjacency — demolition filed ..."); the new-construction note for VA becomes
  "Active builder site (Fairfax new-construction permit) — applicant is a cash-buyer prospect."
- Source tag passed to `pipeBtn()` becomes `'Teardown Permit Radar — Fairfax, VA'` (vs. plain
  `'Teardown Permit Radar'` for MD) so leads in the Pipeline Tracker CRM are traceable back to
  jurisdiction.

## Error handling

Fully shared across jurisdictions, no new branching required:
- Network/timeout errors: existing 25s-timeout `fetchJson` + existing generic catch
  (`"County endpoint error (...) — retry in a minute."`) works verbatim against the Esri
  endpoint.
- Zero results: existing `"No permits in that window — extend the look-back."` works verbatim.
- Zip validation: existing 5-digit regex already accepts Fairfax zips unchanged.

## Out of scope (explicit)

- Tool 1 (SDAT Property Finder) — no Virginia parcel/assessment data added.
- Tool 3 (Code Violation Sweep) — no Virginia code-enforcement data added.
- The static "Engine 02" narrative playbook and its MD-specific intern workflow/links.
- Any Virginia demolition-permit signal — no public source currently exists; revisit if
  Fairfax later publishes one, or if a proxy signal (e.g. land-value-jump detection against
  the Real Estate Parcels dataset) is explicitly requested as separate future work.
