# Teardown Permit Radar — Virginia (Fairfax County) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Fairfax County, VA as a second jurisdiction in Tool 2 ("Teardown Permit Radar — Live") so a Fairfax zip code returns real new-construction permit data, the same way a Montgomery County zip already does.

**Architecture:** A new `#pm-county` dropdown selects the jurisdiction. Each jurisdiction gets its own fetch+normalize function (`fetchMontgomeryPermits` — refactored from existing inline code, `fetchFairfaxPermits` — new) that both resolve to the same row shape `{dateStr, cityAddr, status, detail, mapsUrl, note}`. One shared `renderPermitRows(rows, sourceLabel)` function renders either jurisdiction's results into the existing table — the render/Pipeline-integration code does not need to know which jurisdiction it's looking at.

**Tech Stack:** Vanilla JS (ES5-style, matches existing file), no build step, no framework. Data sources: Socrata SoQL (Montgomery, existing) and Esri ArcGIS REST (Fairfax, new — same REST dialect Tool 1 already uses against MD iMAP).

## Global Constraints

- No test framework exists in this repo (static site, no build step, no `package.json`). Per task, "verification" means one of: (a) a `curl` call against the real public API confirming the exact query URL returns real, correctly-filtered rows, or (b) a manual browser check (serve the directory locally, click through the UI, confirm the network response and rendered table). Do not introduce a test framework, `package.json`, or new dependency — that is out of scope.
- Fairfax endpoint (verified live during planning): `https://www.fairfaxcounty.gov/lambert/rest/services/LDS/DevelopmentTracker/FeatureServer/5/query` — no API key required.
- Fairfax `where`-clause date filter must use the ANSI timestamp literal form `SUBMITTED_DATE > timestamp 'YYYY-MM-DD 00:00:00'` — confirmed working against the live service (returned real McLean/Great Falls "Residential New" records when tested during planning).
- Fairfax supports **new-construction mode only** (`APPTYPEALIAS='Residential New'`). Do not add a Demolition option for Fairfax — confirmed zero live records for `Residential Demolition` / `Commercial Demolition` on this service; there is no public Fairfax demolition feed.
- Default Fairfax zips: `22101,22102,22066,22181,22182,22124` (McLean, Great Falls, Vienna, Oakton).
- Pipeline source label for Fairfax leads must be exactly `'Teardown Permit Radar — Fairfax, VA'` (vs. plain `'Teardown Permit Radar'` for Montgomery), so CRM entries are traceable to jurisdiction.
- Scope is Tool 2 only. Do not touch Tool 1 (SDAT Property Finder), Tool 3 (Code Violation Sweep), or the static "Engine 02" narrative playbook.

---

### Task 1: Markup — county selector, description IDs, and copy updates

**Files:**
- Modify: `index.html:373-378` (Live Intel section intro)
- Modify: `index.html:487-525` (Tool 2 card)
- Modify: `README.md` (Live Intel bullet, currently describing Tool 2 as Montgomery-only)

**Interfaces:**
- Produces: DOM elements `#pm-county` (select, values `mont`/`ffx`), `#pm-desc` (p, replaces the current unlabeled `<p class="muted">` in Tool 2's head) — Task 2/3/4 JS reads/writes these by ID.

- [ ] **Step 1: Update the Live Intel section intro to mention both counties**

In `index.html`, find this paragraph (around line 377):

```html
          <p>Tool 1 queries the <strong>State of Maryland's SDAT parcel database</strong> (via MD iMAP) for two target profiles: <strong>motivated homeowners</strong> (tired landlords, absentee, long-tenure, trust transfers) and <strong>development
   land</strong> (near-vacant lots). Tool 2 queries <strong>Montgomery County's live permit system</strong> for building activity. Tool 3 pulls <strong>housing-code violations</strong>. All three are free public records with the owner's <strong>mailing address included automatically</strong> — a free skip-trace of where to reach them. To resolve phone and email, each result has a <strong>Skip Trace</strong> button (paid Tracerfy lookup — see the bar below).</p>
```

Replace the "Tool 2 queries..." sentence with:

```html
          <p>Tool 1 queries the <strong>State of Maryland's SDAT parcel database</strong> (via MD iMAP) for two target profiles: <strong>motivated homeowners</strong> (tired landlords, absentee, long-tenure, trust transfers) and <strong>development
   land</strong> (near-vacant lots). Tool 2 queries <strong>Montgomery County, MD and Fairfax County, VA's</strong> live permit systems for building activity — pick the county in the tool itself. Tool 3 pulls <strong>housing-code violations</strong>. All three are free public records with the owner's <strong>mailing address included automatically</strong> — a free skip-trace of where to reach them. To resolve phone and email, each result has a <strong>Skip Trace</strong> button (paid Tracerfy lookup — see the bar below).</p>
```

- [ ] **Step 2: Replace the Tool 2 card markup**

Find the entire Tool 2 card (around lines 487-525):

```html
        <!-- Tool 2: Permit Radar Live -->
        <div class="card tool">
          <div class="tool__head">
            <h3>2 · Teardown Permit Radar — Live</h3>
            <p class="muted">Engine 02 running on Montgomery County's live permit feed (updated daily). Demolition permits show you tomorrow's construction sites — every dated home nearby just became a provable teardown lot. New-construction permits reveal which builders are actively buying.</p>
          </div>
          <div class="calc-grid tool-grid">
            <div>
              <label class="f-label" for="pm-type">Permit type</label>
              <select id="pm-type">
                <option value="demo" selected>Demolition (teardown signals)</option>
                <option value="build">New single-family construction (active builders)</option>
              </select>
            </div>
            <div>
              <label class="f-label" for="pm-zips">Zip codes (comma-separated)</label>
              <input type="text" id="pm-zips" value="20814,20815,20816,20817,20854,20895" autocomplete="off">
            </div>
            <div>
              <label class="f-label" for="pm-months">Look back</label>
              <select id="pm-months">
                <option value="3">3 months</option>
                <option value="6" selected>6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
            <div class="full" style="margin-top:14px;">
              <button type="button" class="btn" id="pm-run">Query county permits</button>
              <span class="tool-status" id="pm-status" role="status"></span>
            </div>
          </div>
          <div class="table-wrap" id="pm-wrap" hidden>
            <table aria-label="Permit results">
              <thead><tr><th>Filed</th><th>Address</th><th>Status</th><th>Detail</th><th>Map</th><th><span class="sr-only">Add</span></th></tr></thead>
              <tbody id="pm-rows"></tbody>
            </table>
          </div>
          <p class="helper" style="margin-top:10px;">Source: dataMontgomery (Montgomery County open data, refreshed daily). Adding a permit to the pipeline logs it as a <em>permit-adjacency</em> lead — the play is canvassing and mailing the dated homes around the site, not the site itself.</p>
        </div>
```

Replace it with:

```html
        <!-- Tool 2: Permit Radar Live -->
        <div class="card tool">
          <div class="tool__head">
            <h3>2 · Teardown Permit Radar — Live</h3>
            <p class="muted" id="pm-desc">Engine 02 running on Montgomery County's live permit feed (updated daily). Demolition permits show you tomorrow's construction sites — every dated home nearby just became a provable teardown lot. New-construction permits reveal which builders are actively buying.</p>
          </div>
          <div class="calc-grid tool-grid">
            <div>
              <label class="f-label" for="pm-county">County</label>
              <select id="pm-county">
                <option value="mont" selected>Montgomery, MD</option>
                <option value="ffx">Fairfax, VA</option>
              </select>
            </div>
            <div>
              <label class="f-label" for="pm-type">Permit type</label>
              <select id="pm-type">
                <option value="demo" selected>Demolition (teardown signals)</option>
                <option value="build">New single-family construction (active builders)</option>
              </select>
            </div>
            <div>
              <label class="f-label" for="pm-zips">Zip codes (comma-separated)</label>
              <input type="text" id="pm-zips" value="20814,20815,20816,20817,20854,20895" autocomplete="off">
              <p class="helper" id="pm-zips-hint">Montgomery luxury zips: 20814/15/16/17 Bethesda–Chevy Chase, 20854 Potomac, 20895 Kensington.</p>
            </div>
            <div>
              <label class="f-label" for="pm-months">Look back</label>
              <select id="pm-months">
                <option value="3">3 months</option>
                <option value="6" selected>6 months</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
              </select>
            </div>
            <div class="full" style="margin-top:14px;">
              <button type="button" class="btn" id="pm-run">Query county permits</button>
              <span class="tool-status" id="pm-status" role="status"></span>
            </div>
          </div>
          <div class="table-wrap" id="pm-wrap" hidden>
            <table aria-label="Permit results">
              <thead><tr><th>Filed</th><th>Address</th><th>Status</th><th>Detail</th><th>Map</th><th><span class="sr-only">Add</span></th></tr></thead>
              <tbody id="pm-rows"></tbody>
            </table>
          </div>
          <p class="helper" style="margin-top:10px;" id="pm-source-note">Source: dataMontgomery (Montgomery County open data, refreshed daily). Adding a permit to the pipeline logs it as a <em>permit-adjacency</em> lead — the play is canvassing and mailing the dated homes around the site, not the site itself.</p>
        </div>
```

(This adds `id="pm-county"`, `id="pm-desc"` on the head paragraph, `id="pm-zips-hint"` under the zip field, and `id="pm-source-note"` on the footer helper text — all four get swapped by the county-change handler in Task 4.)

- [ ] **Step 3: Update README.md's Live Intel bullet**

Find this line in `README.md`:

```
   Teardown Permit Radar (dataMontgomery permits, daily), and Code Violation Sweep. Results
```

Replace with:

```
   Teardown Permit Radar (dataMontgomery permits, daily, plus Fairfax County VA new-construction
   permits), and Code Violation Sweep. Results
```

- [ ] **Step 4: Verify markup change**

Run: `grep -n 'pm-county\|pm-desc\|pm-zips-hint\|pm-source-note' index.html`
Expected: four matches, one per new/updated ID, all inside the Tool 2 card.

Run: `grep -n "Fairfax" README.md`
Expected: at least one match in the Live Intel bullet.

- [ ] **Step 5: Commit**

```bash
git add index.html README.md
git commit -m "Add Fairfax county selector markup to Teardown Permit Radar"
```

---

### Task 2: Fairfax data fetch + normalize (new, pure logic)

**Files:**
- Modify: `app.js:408-412` (add Fairfax endpoint constant next to existing `SDAT_URL`/`SOCRATA`/`DS_*` constants)
- Modify: `app.js` inside the `/* ---------- Tool 2: Permit Radar Live ---------- */` section (around line 776 in current file) — add `fetchFairfaxPermits` above the existing `$('#pm-run')` click handler

**Interfaces:**
- Consumes: `fetchJson(url)` (app.js:438, existing), `fmtMoney(n)` (app.js:414, existing), `fmtIso(s)` (app.js:426-430, existing — already handles numeric epoch-ms input via `new Date(s)`, no change needed), `sinceIso(months)` (app.js:781-785, existing), `zipList(raw)` (app.js:777-780, existing)
- Produces: `fetchFairfaxPermits(zips, months)` → `Promise<Array<{dateStr, cityAddr, status, detail, mapsUrl, note}>>` — Task 4 calls this.

- [ ] **Step 1: Add the Fairfax endpoint constant**

In `app.js`, find (around line 408-412):

```js
  var SDAT_URL = 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0/query';
  var SOCRATA = 'https://data.montgomerycountymd.gov/resource/';
  var DS_DEMO = 'b6ht-fw3x';   // Demolition Permits
  var DS_RES = 'm88u-pqki';    // Residential Permits
  var DS_CODE = 'k9nj-z35d';   // Housing Code Violations
```

Add directly below it:

```js
  var FFX_BUILDING_PERMITS_URL = 'https://www.fairfaxcounty.gov/lambert/rest/services/LDS/DevelopmentTracker/FeatureServer/5/query';
```

- [ ] **Step 2: Write a throwaway verification script for the query URL shape (not committed)**

This project has no test framework, so verification here is: build the exact URL the function will build, then `curl` it against the real live endpoint to confirm real rows come back. Create a scratch file (outside the repo) to compute the URL:

Create `/private/tmp/claude-501/-Users-kiransen/e64bc2df-df73-4952-b81d-4304ceb79a6c/scratchpad/ffx-url-check.js`:

```js
var URLSearchParams = require('url').URLSearchParams;
var zips = ['22101', '22102', '22066', '22181', '22182', '22124'];
var months = 6;
var since = new Date();
since.setMonth(since.getMonth() - months);
var sinceStr = since.toISOString().slice(0, 10);
var zipsIn = "('" + zips.join("','") + "')";
var where = 'ZIP_CODE IN' + zipsIn + " AND APPTYPEALIAS='Residential New' AND SUBMITTED_DATE > timestamp '" + sinceStr + " 00:00:00'";
var params = new URLSearchParams({
  where: where,
  outFields: 'RECORDID,APPTYPEALIAS,RECORD_STATUS,SUBMITTED_DATE,ISSUED_DATE,ESTIMATED_COST,ADDRESS_1,ADDRESS_2,CITY,ZIP_CODE',
  orderByFields: 'SUBMITTED_DATE DESC',
  resultRecordCount: '60',
  f: 'json'
});
console.log('https://www.fairfaxcounty.gov/lambert/rest/services/LDS/DevelopmentTracker/FeatureServer/5/query?' + params.toString());
```

Run: `node /private/tmp/claude-501/-Users-kiransen/e64bc2df-df73-4952-b81d-4304ceb79a6c/scratchpad/ffx-url-check.js`

Expected: prints one URL string.

- [ ] **Step 3: Curl the printed URL to confirm real data comes back**

Run: `curl -s "<paste the URL printed in Step 2>" | head -c 2000`

Expected: JSON containing a non-empty `"features"` array, each with `"attributes"` including `"APPTYPEALIAS":"Residential New"` and a `ZIP_CODE` from the requested list (e.g. `"22101"`, `"22066"`). If `"features":[]`, widen `months` in the script and retry before moving on — do not proceed to Step 4 with an unverified query shape.

- [ ] **Step 4: Implement `fetchFairfaxPermits` in app.js**

Inside the `/* ---------- Tool 2: Permit Radar Live ---------- */` section, find the existing helpers (`zipList`, `sinceIso`) around app.js:776-785:

```js
  /* ---------- Tool 2: Permit Radar Live ---------- */
  function zipList(raw) {
    return raw.split(',').map(function (z) { return z.trim(); })
      .filter(function (z) { return /^\d{5}$/.test(z); });
  }
  function sinceIso(months) {
    var d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10) + 'T00:00:00';
  }
```

Add directly below it (before the existing `$('#pm-run').addEventListener(...)` block):

```js
  function fetchFairfaxPermits(zips, months) {
    var zipsIn = "('" + zips.join("','") + "')";
    var since = sinceIso(months).slice(0, 10); // 'YYYY-MM-DD'
    var where = 'ZIP_CODE IN' + zipsIn + " AND APPTYPEALIAS='Residential New' AND SUBMITTED_DATE > timestamp '" + since + " 00:00:00'";
    var params = {
      where: where,
      outFields: 'RECORDID,APPTYPEALIAS,RECORD_STATUS,SUBMITTED_DATE,ISSUED_DATE,ESTIMATED_COST,ADDRESS_1,ADDRESS_2,CITY,ZIP_CODE',
      orderByFields: 'SUBMITTED_DATE DESC',
      resultRecordCount: '60',
      f: 'json'
    };
    var url = FFX_BUILDING_PERMITS_URL + '?' + new URLSearchParams(params).toString();

    return fetchJson(url).then(function (data) {
      if (data.error) throw new Error(data.error.message || 'query rejected');
      var feats = data.features || [];
      return feats.map(function (f) {
        var a = f.attributes;
        var addr = [a.ADDRESS_1, a.ADDRESS_2].filter(Boolean).join(' ');
        var cityAddr = addr + (a.CITY ? ', ' + a.CITY : '') + (a.ZIP_CODE ? ' ' + a.ZIP_CODE : '');
        var detail = a.ESTIMATED_COST ? 'declared ' + fmtMoney(a.ESTIMATED_COST) : '';
        return {
          dateStr: fmtIso(a.SUBMITTED_DATE),
          cityAddr: cityAddr,
          status: a.RECORD_STATUS || '',
          detail: detail,
          mapsUrl: 'https://www.google.com/maps/search/' + encodeURIComponent(cityAddr),
          note: 'Active builder site (Fairfax new-construction permit) — applicant is a cash-buyer prospect'
        };
      });
    });
  }
```

- [ ] **Step 5: Verify the function is syntactically valid**

Run: `node --check app.js`
Expected: no output (exit code 0). This only checks JS syntax validity — it does not execute the file (the file still can't run standalone in Node since it references `document`/`window` at module scope; that's expected and fine).

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "Add fetchFairfaxPermits query/normalize function"
```

---

### Task 3: Refactor Montgomery path + shared renderer (no behavior change)

**Files:**
- Modify: `app.js:787-845` (the existing `$('#pm-run').addEventListener('click', ...)` block)

**Interfaces:**
- Consumes: `fetchFairfaxPermits` (Task 2), `fetchJson`, `fmtMoney`, `fmtIso`, `escapeHtml` (existing), `pipeBtn` (app.js:462-467, existing), `setStatus` (app.js:432-436, existing)
- Produces: `fetchMontgomeryPermits(type, zips, months)` → `Promise<Array<{dateStr, cityAddr, status, detail, mapsUrl, note}>>`, `renderPermitRows(rows, sourceLabel)` — Task 4's click handler calls both.

- [ ] **Step 1: Replace the existing click handler with the refactored version**

Find the entire existing block (app.js:787-845):

```js
  $('#pm-run').addEventListener('click', function () {
    var type = $('#pm-type').value;
    var zips = zipList($('#pm-zips').value);
    if (!zips.length) { setStatus('#pm-status', 'Enter at least one 5-digit zip.', 'err'); return; }
    var months = parseInt($('#pm-months').value, 10);
    var zipsIn = "('" + zips.join("','") + "')";

    var params;
    if (type === 'demo') {
      params = {
        '$where': 'zip in' + zipsIn + " AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '60'
      };
    } else {
      params = {
        '$where': 'zip in' + zipsIn + " AND worktype='CONSTRUCT' AND usecode='SINGLE FAMILY DWELLING' AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '60'
      };
    }
    var url = SOCRATA + (type === 'demo' ? DS_DEMO : DS_RES) + '.json?' + new URLSearchParams(params).toString();

    setStatus('#pm-status', '<span class="spin"></span>Querying dataMontgomery…');
    $('#pm-wrap').hidden = true;

    fetchJson(url)
      .then(function (rows) {
        var tbody = $('#pm-rows');
        tbody.innerHTML = '';
        if (!rows.length) {
          setStatus('#pm-status', 'No permits in that window — extend the look-back.', 'err');
          return;
        }
        rows.forEach(function (p) {
          var addr = [p.stno, p.stname, p.suffix].filter(Boolean).join(' ');
          var cityAddr = addr + (p.city ? ', ' + p.city : '') + (p.zip ? ' ' + p.zip : '');
          var detail = type === 'demo'
            ? (p.applicationtype || p.worktype || '')
            : ((p.description || '').slice(0, 90) + (p.declaredvaluation ? ' · declared ' + fmtMoney(p.declaredvaluation) : ''));
          var maps = 'https://www.google.com/maps/search/' + encodeURIComponent(cityAddr);
          var note = type === 'demo'
            ? 'Permit adjacency — demolition filed ' + fmtIso(p.addeddate) + '; canvass dated homes on this street'
            : 'Active builder site (new SFD construction) — applicant is a cash-buyer prospect';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td style="white-space:nowrap;">' + fmtIso(p.addeddate) + '</td>' +
            '<td>' + escapeHtml(cityAddr) + '</td>' +
            '<td>' + escapeHtml(p.status || '—') + '</td>' +
            '<td>' + escapeHtml(detail || '—') + '</td>' +
            '<td><a class="rec-link" href="' + maps + '" target="_blank" rel="noopener noreferrer">Map ↗</a></td>' +
            '<td>' + pipeBtn(cityAddr, 'Teardown Permit Radar', note) + '</td>';
          tbody.appendChild(tr);
        });
        $('#pm-wrap').hidden = false;
        setStatus('#pm-status', rows.length + ' permits found (newest first).', 'ok');
      })
      .catch(function (err) {
        setStatus('#pm-status', 'County endpoint error (' + escapeHtml(err.message) + ') — retry in a minute.', 'err');
      });
  });
```

Replace it with:

```js
  function fetchMontgomeryPermits(type, zips, months) {
    var zipsIn = "('" + zips.join("','") + "')";
    var params;
    if (type === 'demo') {
      params = {
        '$where': 'zip in' + zipsIn + " AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '60'
      };
    } else {
      params = {
        '$where': 'zip in' + zipsIn + " AND worktype='CONSTRUCT' AND usecode='SINGLE FAMILY DWELLING' AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '60'
      };
    }
    var url = SOCRATA + (type === 'demo' ? DS_DEMO : DS_RES) + '.json?' + new URLSearchParams(params).toString();

    return fetchJson(url).then(function (rows) {
      return rows.map(function (p) {
        var addr = [p.stno, p.stname, p.suffix].filter(Boolean).join(' ');
        var cityAddr = addr + (p.city ? ', ' + p.city : '') + (p.zip ? ' ' + p.zip : '');
        var detail = type === 'demo'
          ? (p.applicationtype || p.worktype || '')
          : ((p.description || '').slice(0, 90) + (p.declaredvaluation ? ' · declared ' + fmtMoney(p.declaredvaluation) : ''));
        var note = type === 'demo'
          ? 'Permit adjacency — demolition filed ' + fmtIso(p.addeddate) + '; canvass dated homes on this street'
          : 'Active builder site (new SFD construction) — applicant is a cash-buyer prospect';
        return {
          dateStr: fmtIso(p.addeddate),
          cityAddr: cityAddr,
          status: p.status || '',
          detail: detail,
          mapsUrl: 'https://www.google.com/maps/search/' + encodeURIComponent(cityAddr),
          note: note
        };
      });
    });
  }

  function renderPermitRows(rows, sourceLabel) {
    var tbody = $('#pm-rows');
    tbody.innerHTML = '';
    if (!rows.length) {
      setStatus('#pm-status', 'No permits in that window — extend the look-back.', 'err');
      return;
    }
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td style="white-space:nowrap;">' + r.dateStr + '</td>' +
        '<td>' + escapeHtml(r.cityAddr) + '</td>' +
        '<td>' + escapeHtml(r.status || '—') + '</td>' +
        '<td>' + escapeHtml(r.detail || '—') + '</td>' +
        '<td><a class="rec-link" href="' + r.mapsUrl + '" target="_blank" rel="noopener noreferrer">Map ↗</a></td>' +
        '<td>' + pipeBtn(r.cityAddr, sourceLabel, r.note) + '</td>';
      tbody.appendChild(tr);
    });
    $('#pm-wrap').hidden = false;
    setStatus('#pm-status', rows.length + ' permits found (newest first).', 'ok');
  }

  $('#pm-run').addEventListener('click', function () {
    var county = $('#pm-county').value;
    var zips = zipList($('#pm-zips').value);
    if (!zips.length) { setStatus('#pm-status', 'Enter at least one 5-digit zip.', 'err'); return; }
    var months = parseInt($('#pm-months').value, 10);

    setStatus('#pm-status', '<span class="spin"></span>Querying ' + (county === 'ffx' ? 'Fairfax County…' : 'dataMontgomery…'));
    $('#pm-wrap').hidden = true;

    var request = county === 'ffx'
      ? fetchFairfaxPermits(zips, months)
      : fetchMontgomeryPermits($('#pm-type').value, zips, months);
    var sourceLabel = county === 'ffx' ? 'Teardown Permit Radar — Fairfax, VA' : 'Teardown Permit Radar';

    request
      .then(function (rows) { renderPermitRows(rows, sourceLabel); })
      .catch(function (err) {
        setStatus('#pm-status', 'County endpoint error (' + escapeHtml(err.message) + ') — retry in a minute.', 'err');
      });
  });
```

- [ ] **Step 2: Verify syntax**

Run: `node --check app.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual regression check — Montgomery still behaves exactly as before**

Run: `cd /Users/kiransen/Desktop/EEN-Lead-Engine && python3 -m http.server 8765` (leave running)

Open `http://localhost:8765/` in a browser, scroll to "Live Intel" → Tool 2. With County left on "Montgomery, MD" (default) and Permit Type on "Demolition", click "Query county permits".

Expected: identical behavior to before this task — either a populated results table with Montgomery addresses (e.g. zips 20814-20895) and a "+ Pipeline" button per row, or the "No permits in that window" message if the window is genuinely empty. Switch Permit Type to "New single-family construction" and re-run — same expectation. Stop the server (`Ctrl-C`) when done.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "Refactor Montgomery permit fetch into shared row-normalizing pattern"
```

---

### Task 4: Wire up the county switch (UI behavior)

**Files:**
- Modify: `app.js` — add a `change` handler for `#pm-county` near the existing `#sd-ptype` change handler pattern (app.js:648-656)

**Interfaces:**
- Consumes: `#pm-county`, `#pm-type`, `#pm-zips`, `#pm-desc`, `#pm-zips-hint`, `#pm-source-note` (all from Task 1's markup)
- Produces: none consumed by later tasks — this is the last task.

- [ ] **Step 1: Add the county-change handler**

In `app.js`, find the existing pattern this mirrors (around app.js:648-656):

```js
  /* Property-type hint toggle */
  $('#sd-ptype').addEventListener('change', function () {
    var land = this.value === 'land';
    $('#sd-ptype-hint').textContent = land
      ? 'Near-vacant lots (residential/ag, little or no structure) — pair with the Permit Radar for building activity.'
      : 'Improved residential parcels — the seller profiles below.';
    // land parcels often have no owner-occupancy/tenure meaning; relax those controls
    $('#sd-minval').value = land ? '400000' : '900000';
  });
```

Add a new handler directly below it, before the `/* ---------- Tool 1: SDAT Property Finder ---------- */` comment:

```js
  /* Permit Radar: county switch reconfigures type options, zip defaults, and copy */
  var PM_COUNTY_CONFIG = {
    mont: {
      zips: '20814,20815,20816,20817,20854,20895',
      zipsHint: 'Montgomery luxury zips: 20814/15/16/17 Bethesda–Chevy Chase, 20854 Potomac, 20895 Kensington.',
      typeOptions: '<option value="demo" selected>Demolition (teardown signals)</option>' +
        '<option value="build">New single-family construction (active builders)</option>',
      desc: 'Engine 02 running on Montgomery County\'s live permit feed (updated daily). Demolition permits show you tomorrow\'s construction sites — every dated home nearby just became a provable teardown lot. New-construction permits reveal which builders are actively buying.',
      sourceNote: 'Source: dataMontgomery (Montgomery County open data, refreshed daily). Adding a permit to the pipeline logs it as a <em>permit-adjacency</em> lead — the play is canvassing and mailing the dated homes around the site, not the site itself.'
    },
    ffx: {
      zips: '22101,22102,22066,22181,22182,22124',
      zipsHint: 'Fairfax luxury zips: 22101/22102 McLean, 22066 Great Falls, 22181/22182 Vienna, 22124 Oakton.',
      typeOptions: '<option value="build" selected>New single-family construction (active builders)</option>',
      desc: 'Engine 02 running on Fairfax County\'s live permit feed (updated nightly). Fairfax does not publish demolition permits through this public feed, so this jurisdiction runs new-construction / active-builder mode only — every new-construction permit applicant is a cash-buyer prospect worth calling.',
      sourceNote: 'Source: Fairfax County GIS &amp; Mapping Services open data (Recent Building Permits, refreshed nightly). Adding a permit to the pipeline logs it as an active-builder lead — the applicant is a cash-buyer prospect.'
    }
  };
  $('#pm-county').addEventListener('change', function () {
    var cfg = PM_COUNTY_CONFIG[this.value];
    $('#pm-type').innerHTML = cfg.typeOptions;
    $('#pm-zips').value = cfg.zips;
    $('#pm-zips-hint').textContent = cfg.zipsHint;
    $('#pm-desc').textContent = cfg.desc;
    $('#pm-source-note').innerHTML = cfg.sourceNote;
  });
```

- [ ] **Step 2: Verify syntax**

Run: `node --check app.js`
Expected: no output, exit code 0.

- [ ] **Step 3: Manual end-to-end check — the actual scenario the user asked for**

Run: `cd /Users/kiransen/Desktop/EEN-Lead-Engine && python3 -m http.server 8765` (leave running)

Open `http://localhost:8765/` in a browser, scroll to Tool 2. Select "Fairfax, VA" in the County dropdown.

Expected after selecting Fairfax:
- Permit Type dropdown now shows only "New single-family construction (active builders)" — no Demolition option.
- Zip field auto-fills to `22101,22102,22066,22181,22182,22124`.
- Helper text under zips mentions McLean/Great Falls/Vienna/Oakton.
- Header description mentions Fairfax and explains the demolition-feed limitation.

Click "Query county permits".

Expected: a status line showing "Querying Fairfax County…" then a populated results table with real Fairfax addresses (e.g. streets in MCLEAN 22101, GREAT FALLS 22066), a "Filed" date, a status like "Issued", a "Map ↗" link, and a "+ Pipeline" button per row. Click "+ Pipeline" on one row, then scroll to the Pipeline Tracker section and confirm the new lead appears with source `Teardown Permit Radar — Fairfax, VA`.

Switch County back to "Montgomery, MD" and confirm the Permit Type/zips/description/source-note all revert, and running a query still works as in Task 3's check. Stop the server when done.

- [ ] **Step 4: Commit**

```bash
git add app.js
git commit -m "Wire up county switch for Teardown Permit Radar (Fairfax, VA support)"
```
