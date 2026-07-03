/* EEN Lead Engine — interactivity. No dependencies, all data in localStorage. */
(function () {
  'use strict';

  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  var fmtUSD = function (n) {
    if (!isFinite(n)) n = 0;
    return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  /* ---------- Toast ---------- */
  var toastEl = $('#toast');
  var toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  /* ---------- Mobile nav ---------- */
  var sidebar = $('#sidebar');
  var scrim = $('#scrim');
  var navToggle = $('#nav-toggle');
  function closeNav() {
    sidebar.classList.remove('open');
    scrim.classList.remove('show');
    navToggle.setAttribute('aria-expanded', 'false');
  }
  navToggle.addEventListener('click', function () {
    var open = sidebar.classList.toggle('open');
    scrim.classList.toggle('show', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });
  scrim.addEventListener('click', closeNav);
  $$('[data-nav]').forEach(function (link) {
    link.addEventListener('click', closeNav);
  });

  /* Active nav highlighting on scroll */
  var sections = $$('section.panel');
  var navLinks = $$('[data-nav]');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        navLinks.forEach(function (l) {
          l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id);
        });
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });
  sections.forEach(function (s) { observer.observe(s); });

  /* ---------- Signal Stacker ---------- */
  var SIGNALS = [
    { id: 'probate', name: 'Probate / estate filed', pts: 30, hint: 'Register of Wills match' },
    { id: 'lispendens', name: 'Lis pendens / pre-foreclosure', pts: 30, hint: 'Court or land records' },
    { id: 'divorce', name: 'Divorce filing (60+ days old)', pts: 25, hint: 'Case Search match' },
    { id: 'taxdelinq', name: 'Tax delinquent / tax-sale list', pts: 25, hint: 'County finance list' },
    { id: 'expired', name: 'Expired / withdrawn listing', pts: 20, hint: 'Agent intel or portal' },
    { id: 'vacant', name: 'Vacant (USPS / observed)', pts: 20, hint: 'HUD data or drive-by' },
    { id: 'absentee', name: 'Absentee / out-of-state owner', pts: 15, hint: 'SDAT mailing mismatch' },
    { id: 'tenure', name: 'Owned 25+ years', pts: 15, hint: 'SDAT transfer date' },
    { id: 'equity', name: 'High equity (60%+)', pts: 15, hint: 'Low or no mortgage on record' },
    { id: 'lien', name: 'HOA / mechanic’s lien', pts: 15, hint: 'mdlandrec.net' },
    { id: 'teardownecon', name: 'Land ≥55% of assessed value', pts: 15, hint: 'SDAT Finder TEARDOWN flag' },
    { id: 'trustxfer', name: '$0 / trust transfer on record', pts: 15, hint: 'SDAT "Paid $0" flag' },
    { id: 'adjacency', name: 'Next to recent teardown', pts: 10, hint: 'Permit Radar adjacency' },
    { id: 'original', name: 'Original condition, renovated street', pts: 10, hint: 'Permit adjacency + drive-by' },
    { id: 'maintenance', name: 'Visible deferred maintenance', pts: 10, hint: 'Drive-by observation' },
    { id: 'seniorcredit', name: 'Senior / homeowner tax credit', pts: 10, hint: 'Assessment record flag' },
    { id: 'codecase', name: 'Code enforcement case', pts: 10, hint: 'dataMontgomery' }
  ];

  var grid = $('#signal-grid');
  SIGNALS.forEach(function (sig) {
    var label = document.createElement('label');
    label.className = 'signal';
    label.innerHTML =
      '<input type="checkbox" data-pts="' + sig.pts + '" id="sig-' + sig.id + '">' +
      '<span><span class="s-name">' + sig.name + '</span>' +
      '<span class="s-pts">+' + sig.pts + ' pts · ' + sig.hint + '</span></span>';
    grid.appendChild(label);
  });

  var TIERS = [
    { min: 60, cls: 'tier-hot', name: 'HOT', action: 'Founder contact within 24 hours: personal letter same day, DNC-scrubbed call, drive-by this week. This lead is a deal in motion.' },
    { min: 40, cls: 'tier-warm', name: 'WARM', action: 'Enter the full 6-touch discreet sequence today and monitor monthly for new signals that promote it to Hot.' },
    { min: 20, cls: 'tier-watch', name: 'WATCH', action: 'Quarterly keep-warm mail. Re-stack signals every 90 days — luxury motivation builds slowly, then all at once.' },
    { min: 0, cls: 'tier-cold', name: 'COLD', action: 'Select the signals that apply to this property. Below 20, leave it on the source list and re-check next cycle.' }
  ];

  var BAND_RULES = {
    entry: ' Band 1: standard white-glove sequence applies; both builder and flipper exits are available — fastest band to move.',
    core: ' Band 2: match against the Buyer Network BEFORE contracting — builder exits only unless a flipper is pre-committed. Founder handles all voice contact.',
    ultra: ' Band 3: NO mass mail at any score. Referral-grid introduction only, and a written buyer commitment before any contract.',
    below: ''
  };

  function renderScore() {
    var total = 0;
    $$('#signal-grid input').forEach(function (cb) {
      cb.closest('.signal').classList.toggle('on', cb.checked);
      if (cb.checked) total += parseInt(cb.getAttribute('data-pts'), 10);
    });
    var score = Math.min(100, total);
    var band = $('#band-select').value;
    var tierEl = $('#score-tier');
    if (band === 'below') {
      $('#score-num').textContent = score;
      $('#score-bar').style.width = score + '%';
      tierEl.textContent = 'ROUTE OUT';
      tierEl.className = 'tier tier-cold';
      $('#score-action').textContent = 'Below the $700K luxury floor — this is not a Private Client lead. Route it to EEN’s standard wholesale operation and keep this system’s brand untouched.';
      var si = $('#lead-score'); if (si) si.value = score || '';
      return;
    }
    var tier = TIERS.filter(function (t) { return score >= t.min; })[0];
    $('#score-num').textContent = score;
    $('#score-bar').style.width = score + '%';
    tierEl.textContent = tier.name;
    tierEl.className = 'tier ' + tier.cls;
    $('#score-action').textContent = tier.action + (BAND_RULES[band] || '');
    var scoreInput = $('#lead-score');
    if (scoreInput) scoreInput.value = score || '';
  }
  grid.addEventListener('change', renderScore);
  $('#band-select').addEventListener('change', renderScore);
  renderScore();

  /* ---------- Deal Analyzer ---------- */
  var modeTd = $('#mode-teardown');
  var modeFl = $('#mode-flip');
  var paneTd = $('#calc-teardown');
  var paneFl = $('#calc-flip');
  var results = $('#calc-results');
  var mode = 'teardown';

  function setMode(m) {
    mode = m;
    var teardown = m === 'teardown';
    modeTd.classList.toggle('active', teardown);
    modeFl.classList.toggle('active', !teardown);
    modeTd.setAttribute('aria-selected', String(teardown));
    modeFl.setAttribute('aria-selected', String(!teardown));
    paneTd.hidden = !teardown;
    paneFl.hidden = teardown;
    renderCalc();
  }
  modeTd.addEventListener('click', function () { setMode('teardown'); });
  modeFl.addEventListener('click', function () { setMode('flip'); });

  function num(id) { return parseFloat($(id).value) || 0; }

  function row(label, value, hero) {
    return '<div class="row' + (hero ? ' hero' : '') + '"><span>' + label + '</span><span class="v">' + value + '</span></div>';
  }

  function exitStructure(fee, price) {
    if (!price) return '—';
    var pct = fee / price * 100;
    var pctTxt = pct.toFixed(1) + '% of price — ';
    if (pct < 2.5) return pctTxt + 'assignment viable (disclose per § 10-715)';
    if (pct <= 5) return pctTxt + 'DOUBLE CLOSE recommended: fee this visible kills luxury deals';
    return pctTxt + 'NOVATION or double close + consider a JV split with the buyer';
  }

  function renderCalc() {
    var html = '';
    if (mode === 'teardown') {
      var lot = num('#td-lot');
      var fee = num('#td-fee');
      var costs = lot * num('#td-costs') / 100;
      var margin = lot * num('#td-margin') / 100;
      var mao = Math.max(0, lot - fee - costs - margin);
      html += row('Builder pays for the lot', fmtUSD(lot));
      html += row('− Transaction costs (double-close, transfer/recordation, title ×2)', fmtUSD(costs));
      html += row('− Safety margin', fmtUSD(margin));
      html += row('− Your fee', fmtUSD(fee));
      html += row('Maximum allowable offer to seller', fmtUSD(mao), true);
      html += row('Recommended exit structure', exitStructure(fee, mao));
      if (lot >= 1500000 && num('#td-margin') < 8) {
        html += row('Band 2+ warning', 'Lot over $1.5M with margin under 8% — buyer pool thins fast up here; raise the safety margin');
      }
    } else {
      var arv = num('#fl-arv');
      var pct = num('#fl-pct') / 100;
      var rehab = num('#fl-rehab');
      var ffee = num('#fl-fee');
      var buyerPays = arv * pct - rehab;
      var mao2 = Math.max(0, buyerPays - ffee);
      html += row('After-repair value (ARV)', fmtUSD(arv));
      html += row('× Investor discount (' + Math.round(pct * 100) + '% of ARV)', fmtUSD(arv * pct));
      html += row('− Renovation estimate', fmtUSD(rehab));
      html += row('= What a luxury flipper will pay', fmtUSD(buyerPays));
      html += row('− Your fee', fmtUSD(ffee));
      html += row('Maximum allowable offer to seller', fmtUSD(mao2), true);
      html += row('Recommended exit structure', exitStructure(ffee, mao2));
    }
    results.innerHTML = html;
  }
  $$('#calc-teardown input, #calc-flip input').forEach(function (inp) {
    inp.addEventListener('input', renderCalc);
  });
  renderCalc();

  /* ---------- Copy templates ---------- */
  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = $('#' + btn.getAttribute('data-copy'));
      navigator.clipboard.writeText(pre.textContent).then(function () {
        toast('Letter copied — personalize every bracket before sending');
      }, function () {
        toast('Copy failed — select the text manually');
      });
    });
  });

  /* ---------- Pipeline Tracker (localStorage) ---------- */
  var LS_LEADS = 'een-lead-engine:leads';
  function loadLeads() {
    try { return JSON.parse(localStorage.getItem(LS_LEADS)) || []; }
    catch (e) { return []; }
  }
  function saveLeads(leads) { localStorage.setItem(LS_LEADS, JSON.stringify(leads)); }

  var STATUSES = ['New', 'Contacted', 'Negotiating', 'Under Contract', 'Closed', 'Dead'];
  var STATUS_CLASS = {
    'New': 'st-new', 'Contacted': 'st-contacted', 'Negotiating': 'st-negotiating',
    'Under Contract': 'st-contract', 'Closed': 'st-closed', 'Dead': 'st-dead'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderLeads() {
    var leads = loadLeads();
    var tbody = $('#lead-rows');
    var empty = $('#lead-empty');
    tbody.innerHTML = '';
    empty.style.display = leads.length ? 'none' : 'block';

    leads.forEach(function (lead, i) {
      var tr = document.createElement('tr');
      var opts = STATUSES.map(function (s) {
        return '<option' + (s === lead.status ? ' selected' : '') + '>' + s + '</option>';
      }).join('');
      tr.innerHTML =
        '<td style="white-space:nowrap;">' + escapeHtml(lead.date) + '</td>' +
        '<td>' + escapeHtml(lead.addr) + '</td>' +
        '<td>' + escapeHtml(lead.source) + '</td>' +
        '<td><span class="status-pill ' + (lead.score >= 60 ? 'st-negotiating' : 'st-new') + '">' + escapeHtml(lead.score || '–') + '</span></td>' +
        '<td><select data-i="' + i + '" aria-label="Status for ' + escapeHtml(lead.addr) + '">' + opts + '</select></td>' +
        '<td>' + escapeHtml(lead.note || '') + '</td>' +
        '<td><button type="button" class="btn danger small" data-del="' + i + '">Remove</button></td>';
      tbody.appendChild(tr);
    });
    renderStats(leads);
  }

  function renderStats(leads) {
    leads = leads || loadLeads();
    var hot = leads.filter(function (l) { return (parseInt(l.score, 10) || 0) >= 60; }).length;
    var active = leads.filter(function (l) { return ['New', 'Contacted', 'Negotiating'].indexOf(l.status) !== -1; }).length;
    var contract = leads.filter(function (l) { return ['Under Contract', 'Closed'].indexOf(l.status) !== -1; }).length;
    $('#stat-total').textContent = leads.length;
    $('#stat-hot').textContent = hot;
    $('#stat-active').textContent = active;
    $('#stat-contract').textContent = contract;
  }

  $('#lead-add').addEventListener('click', function () {
    var addr = $('#lead-addr').value.trim();
    if (!addr) { toast('Enter a property address first'); $('#lead-addr').focus(); return; }
    var leads = loadLeads();
    leads.unshift({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      addr: addr,
      source: $('#lead-source').value,
      score: $('#lead-score').value,
      status: 'New',
      note: $('#lead-note').value.trim()
    });
    saveLeads(leads);
    $('#lead-addr').value = '';
    $('#lead-note').value = '';
    renderLeads();
    toast('Lead added to pipeline');
  });

  $('#lead-rows').addEventListener('change', function (e) {
    var sel = e.target.closest('select[data-i]');
    if (!sel) return;
    var leads = loadLeads();
    leads[parseInt(sel.getAttribute('data-i'), 10)].status = sel.value;
    saveLeads(leads);
    renderLeads();
  });

  $('#lead-rows').addEventListener('click', function (e) {
    var btn = e.target.closest('[data-del]');
    if (!btn) return;
    var i = parseInt(btn.getAttribute('data-del'), 10);
    var leads = loadLeads();
    if (!confirm('Remove "' + leads[i].addr + '" from the pipeline?')) return;
    leads.splice(i, 1);
    saveLeads(leads);
    renderLeads();
    toast('Lead removed');
  });

  $('#lead-export').addEventListener('click', function () {
    var leads = loadLeads();
    if (!leads.length) { toast('Nothing to export yet'); return; }
    var head = 'Date,Address,Source,Score,Status,Note\n';
    var csv = head + leads.map(function (l) {
      return [l.date, l.addr, l.source, l.score, l.status, l.note].map(function (v) {
        return '"' + String(v || '').replace(/"/g, '""') + '"';
      }).join(',');
    }).join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'een-pipeline-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Pipeline exported as CSV');
  });

  /* ---------- Compliance checklist (localStorage) ---------- */
  var LS_CHECKS = 'een-lead-engine:compliance';
  var CHECKS = [
    { name: 'Attorney-drafted contract set in use', desc: 'Purchase contract, assignment agreement, and both § 10-715 disclosure forms drafted or reviewed by a Maryland real estate attorney.' },
    { name: 'Property scope confirmed', desc: 'Verify: is this owner-occupied residential, 4 or fewer units? If yes, § 10-715 applies in full.' },
    { name: 'Seller disclosure delivered BEFORE contract signing', desc: 'Written disclosure of your intent to assign or sell your equitable interest, delivered and acknowledged before the seller signs.' },
    { name: 'Title-conveyance disclosure included', desc: 'Disclosure states you may not be able to convey title to the property yourself.' },
    { name: 'Buyer disclosure delivered BEFORE assignment', desc: 'Written disclosure to the end buyer/assignee before the assignment is completed.' },
    { name: 'Signed copies archived', desc: 'Both signed disclosures stored with the deal file — they are your defense against rescission.' },
    { name: 'Exit structure decided', desc: 'Assignment vs. double closing vs. novation chosen deliberately; transactional funding confirmed if double-closing.' },
    { name: 'Marketing claims audit', desc: 'No advertising language that implies you are a licensed broker; DNC scrubbing on any called numbers.' },
    { name: 'Inspection-period exit intact', desc: 'Contract retains a clean contingency exit if dispo fails — never let a luxury contract go hard without a confirmed buyer.' },
    { name: 'Confidentiality commitments documented', desc: 'Any NDA or discretion promise made to the seller is in writing and honored in all marketing — no address, photos, or terms shared without consent.' },
    { name: 'Named buyer matched (Band 2+)', desc: 'For deals over $1.2M: a specific Buyer Network entry has confirmed interest in this buy-box before the offer goes out.' }
  ];

  var KIT = [
    { name: 'Valuation dossier prepared', desc: 'Comps, land-value analysis, and permit activity on their street — printed and bound. This is what separates EEN from a "we buy houses" caller.' },
    { name: 'Proof of funds letter', desc: 'Current, on letterhead, covering the offer range you intend to present.' },
    { name: 'Title partner letter', desc: 'FD Title relationship letter / settlement track record — third-party credibility.' },
    { name: 'Confidentiality offer ready', desc: 'NDA prepared and offered proactively. Discretion is the product; prove it before they ask.' },
    { name: 'Two exit paths priced', desc: 'Cash as-is now vs. flexible-timeline private sale — luxury sellers respond to choice, not ultimatum.' },
    { name: 'Comp book of private sales', desc: 'What builders/buyers actually paid on nearby streets (from Permit Radar + SDAT) — evidence, not assertion.' },
    { name: 'Brand check', desc: 'EEN Private Client materials only. Nothing in the folder says or implies mass-market investor.' }
  ];

  function initChecklist(listSel, resetSel, lsKey, items, confirmMsg) {
    var listEl = $(listSel);
    function load() {
      try { return JSON.parse(localStorage.getItem(lsKey)) || {}; }
      catch (e) { return {}; }
    }
    function render() {
      var state = load();
      listEl.innerHTML = '';
      items.forEach(function (c, i) {
        var done = !!state[i];
        var label = document.createElement('label');
        label.className = 'check-item' + (done ? ' done' : '');
        label.innerHTML =
          '<input type="checkbox" data-ci="' + i + '"' + (done ? ' checked' : '') + '>' +
          '<span><span class="c-name">' + c.name + '</span><br><span class="c-desc">' + c.desc + '</span></span>';
        listEl.appendChild(label);
      });
    }
    listEl.addEventListener('change', function (e) {
      var cb = e.target.closest('input[data-ci]');
      if (!cb) return;
      var state = load();
      state[cb.getAttribute('data-ci')] = cb.checked;
      localStorage.setItem(lsKey, JSON.stringify(state));
      render();
    });
    $(resetSel).addEventListener('click', function () {
      if (!confirm(confirmMsg)) return;
      localStorage.removeItem(lsKey);
      render();
      toast('Checklist reset');
    });
    render();
  }

  initChecklist('#check-list', '#check-reset', LS_CHECKS, CHECKS, 'Reset the compliance checklist for a new deal?');
  initChecklist('#kit-list', '#kit-reset', 'een-lead-engine:kit', KIT, 'Reset the meeting kit for the next meeting?');

  /* ============================================================
     LIVE INTEL — real queries against Maryland public data systems
     - SDAT parcels:  MD iMAP ArcGIS REST (mdgeodata.md.gov)
     - Permits & code violations: dataMontgomery Socrata API
     ============================================================ */

  var SDAT_URL = 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_PropertyData/MapServer/0/query';
  var SOCRATA = 'https://data.montgomerycountymd.gov/resource/';
  var DS_DEMO = 'b6ht-fw3x';   // Demolition Permits
  var DS_RES = 'm88u-pqki';    // Residential Permits
  var DS_CODE = 'k9nj-z35d';   // Housing Code Violations

  function fmtMoney(n) {
    n = parseInt(n, 10) || 0;
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K';
    return '$' + n;
  }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtTradate(s) { // "19970922" -> "Sep 1997"
    if (!s || s.length < 6) return '—';
    var m = parseInt(s.slice(4, 6), 10);
    return (MONTHS[m - 1] || '') + ' ' + s.slice(0, 4);
  }
  function fmtIso(s) { // "2026-06-30T..." -> "Jun 30, 2026"
    if (!s) return '—';
    var d = new Date(s);
    return isNaN(d) ? s.slice(0, 10) : MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function setStatus(id, msg, cls) {
    var el = $(id);
    el.className = 'tool-status' + (cls ? ' ' + cls : '');
    el.innerHTML = msg;
  }

  function fetchJson(url, timeoutMs) {
    var ctrl = new AbortController();
    var t = setTimeout(function () { ctrl.abort(); }, timeoutMs || 25000);
    return fetch(url, { signal: ctrl.signal })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(function () { clearTimeout(t); });
  }

  /* Shared: add a lead from a live-result row */
  function addLeadDirect(addr, source, note) {
    var leads = loadLeads();
    var exists = leads.some(function (l) { return l.addr.toLowerCase() === addr.toLowerCase(); });
    if (exists) { toast('Already in the pipeline: ' + addr); return; }
    leads.unshift({
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      addr: addr, source: source, score: '', status: 'New', note: note
    });
    saveLeads(leads);
    renderLeads();
    toast('Added to pipeline: ' + addr);
  }
  function pipeBtn(addr, source, note) {
    return '<button type="button" class="btn ghost small" data-pipe="1" ' +
      'data-addr="' + encodeURIComponent(addr) + '" ' +
      'data-source="' + encodeURIComponent(source) + '" ' +
      'data-note="' + encodeURIComponent(note) + '">+ Pipeline</button>';
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-pipe]');
    if (!btn) return;
    addLeadDirect(
      decodeURIComponent(btn.getAttribute('data-addr')),
      decodeURIComponent(btn.getAttribute('data-source')),
      decodeURIComponent(btn.getAttribute('data-note'))
    );
  });

  /* ---------- Tool 1: SDAT Property Finder ---------- */
  $('#sd-run').addEventListener('click', function () {
    var jur = $('#sd-jur').value;
    var zip = $('#sd-zip').value.trim();
    var minval = parseInt($('#sd-minval').value, 10) || 0;
    var year = $('#sd-year').value;
    var ownerMode = $('#sd-owner').value;
    var sort = $('#sd-sort').value;

    var where = ["JURSCODE='" + jur + "'", 'NFMTTLVL>=' + minval, "LU='R'", 'ADDRESS IS NOT NULL'];
    if (/^\d{5}$/.test(zip)) where.push("ZIPCODE='" + zip + "'");
    if (year) where.push("TRADATE<'" + year + "0101'");
    if (ownerMode === 'occupied') where.push("OOI='H'");
    if (ownerMode === 'absentee') where.push("OOI<>'H'");
    if (ownerMode === 'outofstate') where.push("OWNSTATE<>'MD'", "OWNSTATE<>''");

    var base = SDAT_URL + '?' + new URLSearchParams({
      where: where.join(' AND '),
      returnGeometry: 'false',
      f: 'json'
    }).toString();
    var rowsUrl = base + '&' + new URLSearchParams({
      outFields: 'ADDRESS,CITY,YEARBLT,TRADATE,CONSIDR1,NFMLNDVL,NFMTTLVL,OWNSTATE,OOI,SDATWEBADR,ACRES',
      orderByFields: sort,
      resultRecordCount: '50'
    }).toString();
    var countUrl = base + '&returnCountOnly=true';

    setStatus('#sd-status', '<span class="spin"></span>Querying Maryland SDAT…');
    $('#sd-wrap').hidden = true;

    Promise.all([fetchJson(rowsUrl), fetchJson(countUrl).catch(function () { return null; })])
      .then(function (res) {
        var data = res[0], countData = res[1];
        if (data.error) throw new Error(data.error.message || 'query rejected');
        var feats = data.features || [];
        var total = countData && countData.count != null ? countData.count : feats.length;
        var tbody = $('#sd-rows');
        tbody.innerHTML = '';
        if (!feats.length) {
          setStatus('#sd-status', 'No parcels matched — widen the filters (lower min value or loosen tenure).', 'err');
          return;
        }
        feats.forEach(function (f) {
          var a = f.attributes;
          var addr = (a.ADDRESS || '').trim();
          var cityAddr = addr + (a.CITY ? ', ' + a.CITY.trim() : '');
          var land = a.NFMLNDVL || 0, tot = a.NFMTTLVL || 0;
          var pct = tot ? Math.round(land / tot * 100) : 0;
          var flags = '';
          if (pct >= 55) flags += '<span class="flag-chip flag-teardown">TEARDOWN ECON</span>';
          if (!a.CONSIDR1) flags += '<span class="flag-chip flag-trust">TRUST/ESTATE XFER</span>';
          if (a.OWNSTATE && a.OWNSTATE !== 'MD') flags += '<span class="flag-chip flag-oos">OWNER: ' + escapeHtml(a.OWNSTATE) + '</span>';
          var srcName = ownerMode === 'occupied' ? 'Long-Tenure Equity Map' : 'Absentee & Vacancy';
          var note = 'Live SDAT: built ' + (a.YEARBLT || '?') + ', owned since ' + fmtTradate(a.TRADATE) +
            ', land ' + fmtMoney(land) + ' (' + pct + '% of value)';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escapeHtml(cityAddr) + '</td>' +
            '<td>' + escapeHtml(a.YEARBLT || '—') + '</td>' +
            '<td style="white-space:nowrap;">' + fmtTradate(a.TRADATE) + '</td>' +
            '<td>' + (a.CONSIDR1 ? fmtMoney(a.CONSIDR1) : '$0') + '</td>' +
            '<td>' + fmtMoney(land) + '</td>' +
            '<td>' + fmtMoney(tot) + '</td>' +
            '<td><span class="landpct' + (pct >= 55 ? ' hi' : '') + '">' + pct + '%</span></td>' +
            '<td>' + (flags || '—') + '</td>' +
            '<td>' + (a.SDATWEBADR ? '<a class="rec-link" href="' + escapeHtml(a.SDATWEBADR) + '" target="_blank" rel="noopener noreferrer">SDAT ↗</a>' : '—') + '</td>' +
            '<td>' + pipeBtn(cityAddr, srcName, note) + '</td>';
          tbody.appendChild(tr);
        });
        $('#sd-wrap').hidden = false;
        setStatus('#sd-status', total.toLocaleString() + ' matching parcels in state records — showing top ' + feats.length + '.', 'ok');
      })
      .catch(function (err) {
        setStatus('#sd-status', 'State endpoint error (' + escapeHtml(err.message) + ') — retry in a minute.', 'err');
      });
  });

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

  /* ---------- Tool 3: Code Violation Sweep ---------- */
  $('#cv-run').addEventListener('click', function () {
    var zips = zipList($('#cv-zips').value);
    if (!zips.length) { setStatus('#cv-status', 'Enter at least one 5-digit zip.', 'err'); return; }
    var months = parseInt($('#cv-months').value, 10);
    var zipsIn = "('" + zips.join("','") + "')";
    var url = SOCRATA + DS_CODE + '.json?' + new URLSearchParams({
      '$select': 'street_address,city,zip_code,count(*) AS cnt,max(date_filed) AS filed,max(item) AS sample_item',
      '$where': 'zip_code in' + zipsIn + " AND date_filed > '" + sinceIso(months) + "' AND item != 'No Violations Observed'",
      '$group': 'street_address,city,zip_code',
      '$order': 'filed DESC',
      '$limit': '60'
    }).toString();

    setStatus('#cv-status', '<span class="spin"></span>Querying code enforcement…');
    $('#cv-wrap').hidden = true;

    fetchJson(url)
      .then(function (rows) {
        var tbody = $('#cv-rows');
        tbody.innerHTML = '';
        if (!rows.length) {
          setStatus('#cv-status', 'No cases in these zips for that window — that itself is data. Extend the look-back.', 'err');
          return;
        }
        rows.forEach(function (v) {
          var cityAddr = (v.street_address || '') + (v.city ? ', ' + v.city : '') + (v.zip_code ? ' ' + v.zip_code : '');
          var note = 'Code enforcement: ' + (v.cnt || 1) + ' violation(s), latest ' + fmtIso(v.filed) + ' — stack with SDAT owner check';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td style="white-space:nowrap;">' + fmtIso(v.filed) + '</td>' +
            '<td>' + escapeHtml(cityAddr) + '</td>' +
            '<td>' + escapeHtml(v.sample_item || '—') + '</td>' +
            '<td>' + escapeHtml(v.cnt || '1') + '</td>' +
            '<td>' + pipeBtn(cityAddr, 'Absentee & Vacancy', note) + '</td>';
          tbody.appendChild(tr);
        });
        $('#cv-wrap').hidden = false;
        setStatus('#cv-status', rows.length + ' properties with open or recent cases.', 'ok');
      })
      .catch(function (err) {
        setStatus('#cv-status', 'County endpoint error (' + escapeHtml(err.message) + ') — retry in a minute.', 'err');
      });
  });

  /* ---------- Buyer Network (localStorage) ---------- */
  var LS_BUYERS = 'een-lead-engine:buyers';
  function loadBuyers() {
    try { return JSON.parse(localStorage.getItem(LS_BUYERS)) || []; }
    catch (e) { return []; }
  }
  function saveBuyers(b) { localStorage.setItem(LS_BUYERS, JSON.stringify(b)); }

  function daysSince(iso) {
    if (!iso) return Infinity;
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  function renderBuyers() {
    var buyers = loadBuyers();
    var tbody = $('#by-rows');
    var empty = $('#by-empty');
    tbody.innerHTML = '';
    empty.style.display = buyers.length ? 'none' : 'block';
    var stale = 0;

    buyers.forEach(function (b, i) {
      var d = daysSince(b.touched);
      var isStale = d > 45;
      if (isStale) stale++;
      var touchTxt = b.touched
        ? new Date(b.touched).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + (isStale ? ' ⚠ ' + d + 'd' : '')
        : 'never';
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(b.name) + '</td>' +
        '<td>' + escapeHtml(b.type) + '</td>' +
        '<td style="white-space:nowrap;">' + escapeHtml(b.band) + '</td>' +
        '<td>' + escapeHtml(b.product) + '</td>' +
        '<td>' + escapeHtml(b.zips || '—') + '</td>' +
        '<td style="white-space:nowrap;' + (isStale ? 'color:var(--color-amber);font-weight:600;' : '') + '">' + touchTxt + '</td>' +
        '<td>' + escapeHtml(b.note || '') + '</td>' +
        '<td style="white-space:nowrap;"><button type="button" class="btn ghost small" data-touch="' + i + '">Log touch</button> ' +
        '<button type="button" class="btn danger small" data-bydel="' + i + '">Remove</button></td>';
      tbody.appendChild(tr);
    });

    $('#stat-buyers').textContent = buyers.length;
    var st = $('#by-status');
    if (buyers.length) {
      st.className = 'tool-status' + (stale ? ' err' : ' ok');
      st.textContent = buyers.length + ' buyers on the book' + (stale ? ' — ' + stale + ' untouched for 45+ days, call them this week.' : ' — all inside the 45-day touch window.');
    } else {
      st.className = 'tool-status';
      st.textContent = '';
    }
  }

  $('#by-add').addEventListener('click', function () {
    var name = $('#by-name').value.trim();
    if (!name) { toast('Enter a buyer or company name first'); $('#by-name').focus(); return; }
    var buyers = loadBuyers();
    buyers.unshift({
      name: name,
      type: $('#by-type').value,
      band: $('#by-band').value,
      product: $('#by-product').value,
      zips: $('#by-zips').value.trim(),
      note: $('#by-note').value.trim(),
      touched: new Date().toISOString()
    });
    saveBuyers(buyers);
    $('#by-name').value = ''; $('#by-zips').value = ''; $('#by-note').value = '';
    renderBuyers();
    toast('Buyer added to the network');
  });

  $('#by-rows').addEventListener('click', function (e) {
    var t = e.target.closest('[data-touch]');
    if (t) {
      var buyers = loadBuyers();
      buyers[parseInt(t.getAttribute('data-touch'), 10)].touched = new Date().toISOString();
      saveBuyers(buyers);
      renderBuyers();
      toast('Touch logged');
      return;
    }
    var del = e.target.closest('[data-bydel]');
    if (del) {
      var i = parseInt(del.getAttribute('data-bydel'), 10);
      var list = loadBuyers();
      if (!confirm('Remove "' + list[i].name + '" from the buyer network?')) return;
      list.splice(i, 1);
      saveBuyers(list);
      renderBuyers();
      toast('Buyer removed');
    }
  });

  renderLeads();
  renderBuyers();
})();
