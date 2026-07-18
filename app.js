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
        '<td style="white-space:nowrap;">' + leadSkipBtn(lead) +
        ' <button type="button" class="btn danger small" data-del="' + i + '">Remove</button></td>';
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
    { name: 'Skip-trace contacts vetted (TCPA)', desc: 'Before calling any skip-traced number: confirm it is NOT flagged DNC and the person is NOT a litigator. Prefer mail/email for first contact; keep consent records for calls and texts.' },
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
  var FFX_BUILDING_PERMITS_URL = 'https://www.fairfaxcounty.gov/lambert/rest/services/LDS/DevelopmentTracker/FeatureServer/5/query';
  var FFX_SALES_URL = 'https://services1.arcgis.com/ioennV6PpG5Xodq0/ArcGIS/rest/services/OpenData_A5/FeatureServer/1/query';
  var FFX_LAND_URL = 'https://services1.arcgis.com/ioennV6PpG5Xodq0/ArcGIS/rest/services/OpenData_A6/FeatureServer/3/query';
  var FFX_LEGAL_URL = 'https://services1.arcgis.com/ioennV6PpG5Xodq0/ArcGIS/rest/services/OpenData_A7/FeatureServer/1/query';

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

  /* ============================================================
     SKIP TRACE — Tracerfy (paid, per-record). Token stored only in
     this browser; never in the repo/public bundle. Fires only on an
     explicit click with confirmation. Tracks credit spend locally.
     ============================================================ */
  var TRACERFY_URL = 'https://tracerfy.com/v1/api/trace/lookup/';
  var LS_TOKEN = 'een-lead-engine:sttoken';
  var LS_CREDITS = 'een-lead-engine:stcredits';

  function getToken() { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; } }
  function getCredits() { return parseInt(localStorage.getItem(LS_CREDITS) || '0', 10) || 0; }
  function addCredits(n) { localStorage.setItem(LS_CREDITS, String(getCredits() + (parseInt(n, 10) || 0))); }

  function renderCreditPill() {
    var pill = $('#st-credits-pill');
    var tok = getToken();
    if (!tok) { pill.textContent = 'Not connected'; pill.className = 'st-credits'; return; }
    pill.textContent = getCredits() + ' credits used · connected';
    pill.className = 'st-credits on';
  }

  var tokInput = $('#st-token');
  if (tokInput && getToken()) tokInput.value = getToken();
  $('#st-save').addEventListener('click', function () {
    var v = tokInput.value.trim();
    if (!v) { setStatus('#st-status', 'Paste a token first.', 'err'); return; }
    localStorage.setItem(LS_TOKEN, v);
    renderCreditPill();
    setStatus('#st-status', 'Token saved to this browser only.', 'ok');
    toast('Skip Trace connected');
  });
  $('#st-clear').addEventListener('click', function () {
    localStorage.removeItem(LS_TOKEN);
    tokInput.value = '';
    renderCreditPill();
    setStatus('#st-status', 'Token cleared from this browser.', '');
  });

  function skipBtn(addr, city, state, zip) {
    return '<button type="button" class="btn ghost small skip-btn" data-skip="1" ' +
      'data-addr="' + encodeURIComponent(addr || '') + '" ' +
      'data-city="' + encodeURIComponent(city || '') + '" ' +
      'data-state="' + encodeURIComponent(state || 'MD') + '" ' +
      'data-zip="' + encodeURIComponent(zip || '') + '">⚲ Skip trace</button>';
  }

  // Parse a free-text lead address like "9412 Fernwood Rd, Bethesda MD 20817"
  function parseAddr(full) {
    var out = { addr: full || '', city: '', state: 'MD', zip: '' };
    if (!full) return out;
    var zipM = full.match(/(\d{5})(?:-\d{4})?\s*$/);
    if (zipM) out.zip = zipM[1];
    var stM = full.match(/\b([A-Z]{2})\b\s*\d{5}/) || full.match(/\b([A-Z]{2})\b\s*$/);
    if (stM) out.state = stM[1];
    var parts = full.split(',');
    out.addr = parts[0].trim();
    if (parts.length > 1) {
      // "Bethesda MD 20817" -> city = Bethesda
      out.city = parts[1].trim().replace(/\b[A-Z]{2}\b.*$/, '').replace(/\d{5}.*$/, '').trim();
    }
    return out;
  }

  function leadSkipBtn(lead) {
    var p = parseAddr(lead.addr);
    return skipBtn(p.addr, p.city, p.state, p.zip);
  }

  function renderPersons(data) {
    var persons = (data && data.persons) || [];
    if (!persons.length) return '<div class="skip-inner"><p class="muted">No contact match found for this address (no credits charged for a miss on most plans).</p></div>';
    var html = '<div class="skip-inner">';
    persons.forEach(function (p) {
      html += '<div class="person">';
      html += '<div><span class="p-name">' + escapeHtml(p.full_name || ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || 'Unknown') + '</span>';
      if (p.age) html += '<span class="p-meta">age ' + escapeHtml(p.age) + '</span>';
      if (p.deceased) html += ' <span class="tag-deceased">DECEASED — probate?</span>';
      if (p.litigator) html += ' <span class="tag-lit">⚠ LITIGATOR — do not call</span>';
      html += '</div>';
      if (p.mailing_address && p.mailing_address.street) {
        var m = p.mailing_address;
        html += '<div class="p-meta" style="margin:4px 0 2px;">Mails to: ' + escapeHtml([m.street, m.city, m.state, m.zip].filter(Boolean).join(', ')) + '</div>';
      }
      var phones = p.phones || [];
      if (phones.length) {
        html += '<div class="contact-row">';
        phones.forEach(function (ph) {
          var num = (ph.number || '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
          html += '<a class="contact-chip" href="tel:' + escapeHtml(ph.number || '') + '">' + escapeHtml(num) +
            ' <span class="p-meta">' + escapeHtml(ph.type || '') + '</span>' +
            (ph.dnc ? ' <span class="tag-dnc">DNC</span>' : ' <span class="tag-safe">OK</span>') + '</a>';
        });
        html += '</div>';
      }
      var emails = p.emails || [];
      if (emails.length) {
        html += '<div class="contact-row">';
        emails.forEach(function (em) {
          html += '<a class="contact-chip email" href="mailto:' + escapeHtml(em.email || '') + '">✉ ' + escapeHtml(em.email || '') + '</a>';
        });
        html += '</div>';
      }
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  // Shared by every skip-trace entry point (Live Intel result rows, Pipeline leads,
  // and manual Property Lookup): confirm, call Tracerfy, track credits, render results.
  // renderTo(html) decides where the result panel goes — a table row or a plain div.
  function performSkipTrace(addr, city, state, zip, btn, renderTo) {
    var token = getToken();
    if (!token) {
      toast('Add your Tracerfy token in Skip Trace settings first');
      var s = $('#st-settings'); if (s) { s.open = true; s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }
    if (!confirm('Skip trace ' + addr + '?\n\nThis calls the paid Tracerfy API and may cost several credits (billed per contact found). Continue?')) return;

    var origText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Tracing…';

    fetch(TRACERFY_URL, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: addr, city: city, state: state, zip: zip, find_owner: true })
    })
      .then(function (r) {
        if (r.status === 401 || r.status === 403) throw new Error('auth rejected — check your token');
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (data.credits_deducted) addCredits(data.credits_deducted);
        renderCreditPill();
        btn.disabled = false;
        btn.textContent = data.hit ? '✓ Traced' : '○ No hit';
        renderTo(renderPersons(data));
        toast(data.hit ? 'Trace complete · ' + (data.credits_deducted || 0) + ' credits' : 'No contact match');
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = origText;
        toast('Skip trace failed: ' + err.message);
      });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-skip]');
    if (!btn) return;
    var addr = decodeURIComponent(btn.getAttribute('data-addr'));
    var city = decodeURIComponent(btn.getAttribute('data-city'));
    var state = decodeURIComponent(btn.getAttribute('data-state'));
    var zip = decodeURIComponent(btn.getAttribute('data-zip'));

    var row = btn.closest('tr');
    var renderTo;
    if (row) {
      renderTo = function (panelHtml) {
        var colspan = row.children.length;
        var next = row.nextElementSibling;
        if (next && next.classList.contains('skip-panel')) next.remove();
        var pr = document.createElement('tr');
        pr.className = 'skip-panel';
        pr.innerHTML = '<td colspan="' + colspan + '">' + panelHtml + '</td>';
        row.after(pr);
      };
    } else {
      var host = document.getElementById(btn.getAttribute('data-panel'));
      renderTo = function (panelHtml) { if (host) host.innerHTML = panelHtml; };
    }

    performSkipTrace(addr, city, state, zip, btn, renderTo);
  });

  /* ---------- Property Lookup: manual skip trace (not from a live query) ---------- */
  $('#lu-run').addEventListener('click', function () {
    var raw = $('#lu-addr').value.trim();
    if (!raw) { setStatus('#lu-status', 'Enter an address first.', 'err'); return; }
    var p = parseAddr(raw);
    if (!p.addr) { setStatus('#lu-status', 'Could not read an address from that input.', 'err'); return; }
    setStatus('#lu-status', '', '');
    performSkipTrace(p.addr, p.city, p.state, p.zip, this, function (html) {
      $('#lu-panel').innerHTML = html;
    });
  });

  /* ============================================================
     LAND OFFER GENERATOR — Fairfax, VA only. Uses the county's live
     new-construction permits as a candidate list of parcels, then
     cross-references each parcel's FULL sale history (a different
     system than the permit feed) for a "flip comp": a sale followed
     6-36 months later by a resale at 1.8x+ — the signature of a
     builder buying land, tearing down, building, and selling. This
     pattern is detected directly from the sales data itself; trying
     to correlate flips to a specific permit by date proximity turned
     out to be unreliable in testing (permits on a parcel can be
     unrelated later work, not the original teardown/rebuild).
     ============================================================ */
  function fetchFairfaxCandidateParcels(zips) {
    var zipsIn = "('" + zips.join("','") + "')";
    var params = {
      where: 'ZIP_CODE IN' + zipsIn + " AND APPTYPEALIAS='Residential New'",
      outFields: 'PARCEL_ID,ADDRESS_1,ZIP_CODE',
      orderByFields: 'SUBMITTED_DATE DESC',
      resultRecordCount: '500',
      f: 'json'
    };
    var url = FFX_BUILDING_PERMITS_URL + '?' + new URLSearchParams(params).toString();
    return fetchJson(url).then(function (data) {
      if (data.error) throw new Error(data.error.message || 'query rejected');
      var seen = {};
      var out = [];
      (data.features || []).forEach(function (f) {
        var a = f.attributes;
        if (!a.PARCEL_ID || seen[a.PARCEL_ID]) return;
        seen[a.PARCEL_ID] = true;
        out.push({ parcelId: a.PARCEL_ID });
      });
      return out;
    });
  }

  // Fairfax's sales table logs EVERY recorded deed instrument, not just
  // arm's-length sales — $0/nominal "no consideration" transfers, pending
  // verification, corrective deeds, foreclosures, etc. show up interleaved
  // with real sales. Left in, these break flip detection: a real purchase
  // and its real resale stop being *adjacent* array entries whenever one of
  // these noise records sits between them, so the pair is never evaluated.
  // A price floor well above nominal/token deeds (seen up to ~$1,200) and
  // well below any real Fairfax land or home sale filters this out cleanly.
  var SALE_NOISE_FLOOR = 50000;

  function fetchParcelSalesHistory(parcelId) {
    var url = FFX_SALES_URL + '?' + new URLSearchParams({
      where: "PARID='" + parcelId + "'",
      outFields: 'PRICE,SALEDT',
      orderByFields: 'SALEDT ASC',
      resultRecordCount: '20',
      f: 'json'
    }).toString();
    return fetchJson(url).then(function (data) {
      if (data.error) throw new Error(data.error.message || 'query rejected');
      return (data.features || [])
        .map(function (f) {
          return { price: f.attributes.PRICE || 0, saleDt: f.attributes.SALEDT };
        })
        .filter(function (s) { return s.price >= SALE_NOISE_FLOOR && s.saleDt; });
    });
  }

  function fetchParcelLegal(parcelId) {
    var url = FFX_LEGAL_URL + '?' + new URLSearchParams({
      where: "PARID='" + parcelId + "'",
      outFields: 'ZIP1,CITYNAME,ACRES,ADRNO,ADRDIR,ADRSTR,ADRSUF,ADRSUF2',
      resultRecordCount: '1',
      f: 'json'
    }).toString();
    return fetchJson(url).then(function (data) {
      if (data.error || !data.features || !data.features.length) return null;
      return data.features[0].attributes;
    });
  }

  // Legal Description's own ACRES field is unreliable (null for many parcels,
  // confirmed empirically) — Land Data is the consistent source, so fetch both
  // and prefer Land Data's acreage, falling back to Legal's only if needed.
  function fetchParcelAcresFallback(parcelId) {
    var url = FFX_LAND_URL + '?' + new URLSearchParams({
      where: "PARID='" + parcelId + "'",
      outFields: 'ACRES',
      resultRecordCount: '1',
      f: 'json'
    }).toString();
    return fetchJson(url).then(function (data) {
      if (data.error || !data.features || !data.features.length) return null;
      return data.features[0].attributes.ACRES || null;
    });
  }

  var MS_PER_MONTH = 30.44 * 24 * 3600 * 1000;

  // Finds the most recent qualifying "bought low, resold high, in a plausible
  // teardown-rebuild timeframe" pair anywhere in a parcel's sale history.
  function detectFlipComp(sales, monthsBack) {
    var cutoff = Date.now() - monthsBack * MS_PER_MONTH;
    var best = null;
    for (var i = 0; i < sales.length - 1; i++) {
      var a = sales[i], b = sales[i + 1];
      if (!a.price || a.price <= 0 || !a.saleDt || !b.saleDt) continue;
      var holdMonths = (b.saleDt - a.saleDt) / MS_PER_MONTH;
      if (holdMonths < 6 || holdMonths > 36) continue;
      var multiple = b.price / a.price;
      if (multiple < 1.8) continue;
      if (a.saleDt < cutoff) continue;
      if (!best || a.saleDt > best.purchaseDt) {
        best = {
          purchasePrice: a.price, purchaseDt: a.saleDt,
          resalePrice: b.price, resaleDt: b.saleDt,
          holdMonths: holdMonths, multiple: multiple
        };
      }
    }
    return best;
  }

  function ogMedian(arr) {
    var s = arr.slice().sort(function (x, y) { return x - y; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function renderOfferGenRow(comp) {
    $('#og-wrap').hidden = false;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + escapeHtml(comp.cityAddr) + '</td>' +
      '<td style="white-space:nowrap;">' + fmtMoney(comp.purchasePrice) + ' · ' + fmtIso(comp.purchaseDt) + '</td>' +
      '<td style="white-space:nowrap;">' + fmtMoney(comp.resalePrice) + ' · ' + fmtIso(comp.resaleDt) + '</td>' +
      '<td>' + comp.holdMonths.toFixed(0) + ' mo</td>' +
      '<td>' + comp.multiple.toFixed(2) + '×</td>' +
      '<td>' + fmtMoney(comp.perAcre) + '</td>' +
      '<td>' + pipeBtn(comp.cityAddr, 'Land Offer Generator — Fairfax, VA',
        'Builder land comp: bought ' + fmtMoney(comp.purchasePrice) + ', resold ' + fmtMoney(comp.resalePrice) +
        ' (' + comp.holdMonths.toFixed(0) + 'mo hold, ' + comp.multiple.toFixed(2) + '× multiple)') + '</td>';
    $('#og-rows').appendChild(tr);
  }

  function renderOfferGenSuggestion(comps, subjectAcres) {
    var box = $('#og-result');
    box.hidden = false;
    var perAcres = comps.map(function (c) { return c.perAcre; });
    var med = ogMedian(perAcres);
    var lo = Math.min.apply(null, perAcres);
    var hi = Math.max.apply(null, perAcres);
    var suggested = med * subjectAcres;
    var conservative = lo * subjectAcres;
    var aggressive = hi * subjectAcres;
    var html = '';
    html += row('Comps used', comps.length + ' qualifying flip' + (comps.length > 1 ? 's' : ''));
    html += row('Median land value', fmtMoney(med) + ' / acre');
    html += row('Range across comps', fmtMoney(lo) + ' – ' + fmtMoney(hi) + ' / acre');
    html += row('Suggested land offer (median × ' + subjectAcres + ' ac)', fmtMoney(suggested), true);
    html += row('Conservative — aggressive range', fmtMoney(conservative) + ' – ' + fmtMoney(aggressive));
    html += '<div class="row"><button type="button" class="btn ghost small" id="og-send">Send ' + fmtMoney(suggested) + ' to Deal Analyzer →</button></div>';
    box.innerHTML = html;
    $('#og-send').addEventListener('click', function () {
      $('#td-lot').value = Math.round(suggested);
      setMode('teardown');
      $('#analyzer').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast('Sent ' + fmtMoney(suggested) + ' to Deal Analyzer');
    });
  }

  $('#og-run').addEventListener('click', function () {
    var zips = zipList($('#og-zips').value);
    if (!zips.length) { setStatus('#og-status', 'Enter at least one 5-digit zip.', 'err'); return; }
    var subjectAcres = parseFloat($('#og-acres').value) || 0;
    if (!subjectAcres) { setStatus('#og-status', 'Enter the subject lot size in acres.', 'err'); return; }
    var months = parseInt($('#og-months').value, 10);

    $('#og-wrap').hidden = true;
    $('#og-result').hidden = true;
    $('#og-rows').innerHTML = '';
    setStatus('#og-status', '<span class="spin"></span>Finding candidate parcels…');

    fetchFairfaxCandidateParcels(zips).then(function (candidates) {
      if (!candidates.length) {
        setStatus('#og-status', 'No new-construction permits found in that zip — try a wider zip list.', 'err');
        return;
      }
      var comps = [];
      var done = 0;
      setStatus('#og-status', '<span class="spin"></span>Checking ' + candidates.length + ' candidate parcels for flip comps… (0/' + candidates.length + ')');

      runPool(candidates, 6, function (cand) {
        return Promise.all([fetchParcelSalesHistory(cand.parcelId), fetchParcelLegal(cand.parcelId), fetchParcelAcresFallback(cand.parcelId)])
          .then(function (res) {
            var sales = res[0], legal = res[1], landAcres = res[2];
            var acres = landAcres || (legal && legal.ACRES) || null;
            if (!legal || !acres) return;
            var acresRatio = acres / subjectAcres;
            if (acresRatio < 0.5 || acresRatio > 2) return;
            var flip = detectFlipComp(sales, months);
            if (!flip) return;
            var addr = [legal.ADRNO, legal.ADRDIR, legal.ADRSTR, legal.ADRSUF, legal.ADRSUF2].filter(Boolean).join(' ');
            var cityAddr = addr + (legal.CITYNAME ? ', ' + legal.CITYNAME : '') + (legal.ZIP1 ? ' ' + legal.ZIP1 : '');
            var comp = {
              cityAddr: cityAddr, acres: acres,
              purchasePrice: flip.purchasePrice, purchaseDt: flip.purchaseDt,
              resalePrice: flip.resalePrice, resaleDt: flip.resaleDt,
              holdMonths: flip.holdMonths, multiple: flip.multiple,
              perAcre: flip.purchasePrice / acres
            };
            comps.push(comp);
            renderOfferGenRow(comp);
            renderOfferGenSuggestion(comps, subjectAcres);
          })
          .catch(function () { /* one bad parcel shouldn't kill the whole scan */ })
          .then(function () {
            done++;
            if (done < candidates.length) {
              setStatus('#og-status', '<span class="spin"></span>Checking candidate parcels for flip comps… (' + done + '/' + candidates.length + ')');
            } else {
              setStatus('#og-status', comps.length
                ? comps.length + ' qualifying flip comp' + (comps.length > 1 ? 's' : '') + ' found.'
                : 'No qualifying flip comps for that lot size in this zip / look-back. Builder teardown-rebuilds cluster on smaller in-fill lots — try adding neighboring zips, a longer look-back, or a smaller subject acreage.', comps.length ? 'ok' : 'err');
            }
          });
      });
    }).catch(function (err) {
      setStatus('#og-status', 'Fairfax endpoint error (' + escapeHtml(err.message) + ') — retry in a minute.', 'err');
    });
  });

  renderCreditPill();

  /* Property-type hint toggle */
  $('#sd-ptype').addEventListener('change', function () {
    var land = this.value === 'land';
    $('#sd-ptype-hint').textContent = land
      ? 'Near-vacant lots (residential/ag, little or no structure) — pair with the Permit Radar for building activity.'
      : 'Improved residential parcels — the seller profiles below.';
    // land parcels often have no owner-occupancy/tenure meaning; relax those controls
    $('#sd-minval').value = land ? '400000' : '900000';
  });

  /* Permit Radar: county switch reconfigures type options, zip defaults, and copy */
  var PM_COUNTY_CONFIG = {
    mont: {
      zips: '20814,20815,20816,20817,20852,20854,20895',
      zipsHint: 'Montgomery luxury zips: 20814/15/16/17 Bethesda–Chevy Chase, 20852 N. Bethesda, 20854 Potomac, 20895 Kensington.',
      typeOptions: '<option value="demo" selected>Demolition (teardown signals)</option>' +
        '<option value="build">New single-family construction (active builders)</option>',
      desc: 'Engine 02 running on Montgomery County\'s live permit feed (updated daily). Demolition permits show you tomorrow\'s construction sites — every dated home nearby just became a provable teardown lot. New-construction permits reveal which builders are actively buying.',
      sourceNote: 'Source: dataMontgomery (Montgomery County open data, refreshed daily). New-construction rows also cross-reference Maryland SDAT for the <strong>Lot Purchase</strong> column — what the builder paid, the lot size, and the owner\'s mailing address (a builder-identity proxy — SDAT withholds owner names). That lookup runs against a slow state API (~1/sec), so large result sets can take several minutes to fully populate. Adding a permit to the pipeline logs it as a <em>permit-adjacency</em> lead — the play is canvassing and mailing the dated homes around the site, not the site itself.'
    },
    ffx: {
      zips: '22101,22102,22066,22180,22181,22182,22124',
      zipsHint: 'Fairfax luxury zips: 22101/22102 McLean, 22066 Great Falls, 22180/22181/22182 Vienna, 22124 Oakton.',
      typeOptions: '<option value="build" selected>New single-family construction (active builders)</option>',
      desc: 'Engine 02 running on Fairfax County\'s live permit feed (updated nightly). Fairfax does not publish demolition permits through this public feed, so this jurisdiction runs new-construction / active-builder mode only — every new-construction permit applicant is a cash-buyer prospect worth calling.',
      sourceNote: 'Source: Fairfax County GIS &amp; Mapping Services open data (Recent Building Permits, refreshed nightly). Every row cross-references Fairfax\'s tax records for the <strong>Lot Purchase</strong> column — sale price and lot size. Fairfax publishes no owner name or mailing address anywhere in its open data, so unlike Montgomery there\'s no builder-identity field to show here. Adding a permit to the pipeline logs it as an active-builder lead — the applicant is a cash-buyer prospect.'
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

  /* ---------- Tool 1: SDAT Property Finder ---------- */
  $('#sd-run').addEventListener('click', function () {
    var jur = $('#sd-jur').value;
    var zip = $('#sd-zip').value.trim();
    var ptype = $('#sd-ptype').value;
    var minval = parseInt($('#sd-minval').value, 10) || 0;
    var year = $('#sd-year').value;
    var built = $('#sd-built').value;
    var ownerMode = $('#sd-owner').value;
    var sort = $('#sd-sort').value;
    var isLand = ptype === 'land';

    var where = ["JURSCODE='" + jur + "'", 'NFMTTLVL>=' + minval, 'ADDRESS IS NOT NULL'];
    if (isLand) {
      where.push("LU in('R','A')", 'NFMIMPVL<50000'); // near-vacant: negligible structure value
    } else {
      where.push("LU='R'");
    }
    if (/^\d{5}$/.test(zip)) where.push("ZIPCODE='" + zip + "'");
    if (!isLand) {
      // Tenure: valid, non-blank transfer date so blanks can't leak in or top the ASC sort
      if (year) where.push("TRADATE<'" + year + "0101'");
      if (year || sort.indexOf('TRADATE') === 0) where.push("TRADATE>'10000101'");
      // Year built: exclude modern rebuilds (a 2009 build on a 1986-held lot isn't a dated seller)
      if (built) where.push("YEARBLT<'" + built + "'", "YEARBLT>'1000'");
    }
    if (ownerMode === 'occupied') where.push("OOI='H'");
    if (ownerMode === 'landlord') where.push("OOI<>'H'");
    if (ownerMode === 'outofstate') where.push("OWNSTATE<>'MD'", "OWNSTATE<>''");
    if (ownerMode === 'trust') where.push('(CONSIDR1=0 OR CONSIDR1 IS NULL)');

    var base = SDAT_URL + '?' + new URLSearchParams({
      where: where.join(' AND '),
      returnGeometry: 'false',
      f: 'json'
    }).toString();
    var rowsUrl = base + '&' + new URLSearchParams({
      outFields: 'ADDRESS,CITY,ZIPCODE,YEARBLT,TRADATE,CONSIDR1,NFMLNDVL,NFMIMPVL,NFMTTLVL,OWNADD1,OWNCITY,OWNSTATE,OWNERZIP,OOI,SDATWEBADR,ACRES',
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
          setStatus('#sd-status', 'No parcels matched — widen the filters (lower min value, loosen tenure, or switch profile).', 'err');
          return;
        }
        feats.forEach(function (f) {
          var a = f.attributes;
          var addr = (a.ADDRESS || '').trim();
          var city = (a.CITY || '').trim();
          var zipc = (a.ZIPCODE || '').trim();
          var st = (a.OWNSTATE || '').trim();
          var cityAddr = addr + (city ? ', ' + city : '');
          var land = a.NFMLNDVL || 0, tot = a.NFMTTLVL || 0;
          var pct = tot ? Math.round(land / tot * 100) : 0;

          // Owner mailing address (real skip-trace-lite, free)
          var ownerCity = [a.OWNCITY, st].filter(Boolean).join(' ');
          var ownerFull = [a.OWNADD1, ownerCity, a.OWNERZIP].filter(Boolean).join(', ');
          var propUpper = (addr || '').toUpperCase();
          var absentee = a.OWNADD1 && propUpper && a.OWNADD1.toUpperCase().indexOf(propUpper.split(' ')[0]) === -1;
          var ownerCell = ownerFull
            ? '<span class="owner-mail' + (absentee ? ' absentee' : '') + '">' + escapeHtml(ownerFull) + (absentee ? ' ⚑' : '') + '</span>'
            : '—';

          var flags = '';
          if (isLand) flags += '<span class="flag-chip flag-teardown">VACANT / LOW-IMPROV</span>';
          else if (pct >= 55) flags += '<span class="flag-chip flag-teardown">TEARDOWN ECON</span>';
          if (!a.CONSIDR1) flags += '<span class="flag-chip flag-trust">$0 / TRUST XFER</span>';
          if (a.OOI && a.OOI !== 'H') flags += '<span class="flag-chip flag-trust">NON-OCC (LANDLORD)</span>';
          if (st && st !== 'MD') flags += '<span class="flag-chip flag-oos">OWNER: ' + escapeHtml(st) + '</span>';

          var srcName = isLand ? 'Teardown Permit Radar'
            : ownerMode === 'occupied' ? 'Long-Tenure Equity Map'
            : ownerMode === 'landlord' ? 'Tired Landlord'
            : 'Absentee & Vacancy';
          var note = (isLand ? 'Live SDAT land: ' + (a.ACRES || '?') + ' acres, land ' + fmtMoney(land) + ', improv ' + fmtMoney(a.NFMIMPVL || 0)
            : 'Live SDAT: built ' + (a.YEARBLT || '?') + ', owned since ' + fmtTradate(a.TRADATE) + ', land ' + pct + '% of value')
            + (ownerFull ? '. Owner mails to ' + ownerFull : '');

          var zSlug = [addr, city, 'MD', zipc].filter(Boolean).join(' ').replace(/[,#.]/g, '').replace(/\s+/g, '-');
          var zillow = 'https://www.zillow.com/homes/' + encodeURIComponent(zSlug) + '_rb/';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escapeHtml(cityAddr) + ' <a class="rec-link" href="' + zillow + '" target="_blank" rel="noopener noreferrer" title="Open this property on Zillow">Zillow ↗</a></td>' +
            '<td>' + escapeHtml(a.YEARBLT || (isLand ? 'lot' : '—')) + '</td>' +
            '<td style="white-space:nowrap;">' + fmtTradate(a.TRADATE) + '</td>' +
            '<td>' + fmtMoney(land) + '</td>' +
            '<td>' + fmtMoney(tot) + '</td>' +
            '<td><span class="landpct' + (pct >= 55 ? ' hi' : '') + '">' + pct + '%</span></td>' +
            '<td>' + ownerCell + '</td>' +
            '<td>' + (flags || '—') + '</td>' +
            '<td>' + skipBtn(addr, city, st || 'MD', zipc) + '</td>' +
            '<td>' + pipeBtn(cityAddr, srcName, note) + '</td>';
          tbody.appendChild(tr);
        });
        $('#sd-wrap').hidden = false;
        var absCount = feats.filter(function (f) { var a = f.attributes; return a.OWNSTATE && a.OWNSTATE !== 'MD'; }).length;
        setStatus('#sd-status', total.toLocaleString() + ' parcels in state records — showing top ' + feats.length +
          ' with owner mailing addresses' + (absCount ? ' (' + absCount + ' out-of-state ⚑)' : '') + '.', 'ok');
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
  function fetchFairfaxPermits(zips, months) {
    var zipsIn = "('" + zips.join("','") + "')";
    var since = sinceIso(months).slice(0, 10); // 'YYYY-MM-DD'
    var where = 'ZIP_CODE IN' + zipsIn + " AND APPTYPEALIAS='Residential New' AND SUBMITTED_DATE > timestamp '" + since + " 00:00:00'";
    var params = {
      where: where,
      outFields: 'RECORDID,APPTYPEALIAS,RECORD_STATUS,SUBMITTED_DATE,ISSUED_DATE,ESTIMATED_COST,ADDRESS_1,ADDRESS_2,CITY,ZIP_CODE,PARCEL_ID',
      orderByFields: 'SUBMITTED_DATE DESC',
      resultRecordCount: '500',
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
          note: 'Active builder site (Fairfax new-construction permit) — applicant is a cash-buyer prospect',
          lotLookup: a.PARCEL_ID ? { kind: 'ffx', parcelId: a.PARCEL_ID } : null
        };
      });
    });
  }

  function fetchMontgomeryPermits(type, zips, months) {
    var zipsIn = "('" + zips.join("','") + "')";
    var params;
    if (type === 'demo') {
      params = {
        '$where': 'zip in' + zipsIn + " AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '500'
      };
    } else {
      params = {
        '$where': 'zip in' + zipsIn + " AND worktype='CONSTRUCT' AND usecode='SINGLE FAMILY DWELLING' AND addeddate > '" + sinceIso(months) + "'",
        '$order': 'addeddate DESC', '$limit': '500'
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
          note: note,
          lotLookup: (type === 'build' && p.stno && p.stname && p.zip)
            ? { kind: 'mont', stno: p.stno, stname: p.stname, zip: p.zip }
            : null
        };
      });
    });
  }

  /* Lot Purchase: for new-construction rows only, cross-references the county's tax/parcel
     records (a different system than the permit feed) to surface what the builder paid for
     the lot and its size. MD joins by address (SDAT, same source Tool 1 uses); Fairfax joins
     by PARCEL_ID against its Sales + Land tables. Fairfax publishes no owner name or mailing
     address anywhere in its open data, so — unlike MD — there is no builder-identity field to
     show; only price and lot size are available there. */
  function fetchMontgomeryLotIntel(lookup) {
    var where = "JURSCODE='MONT' AND ADDRESS LIKE '" + lookup.stno + ' ' + lookup.stname + "%' AND ZIPCODE='" + lookup.zip + "'";
    var url = SDAT_URL + '?' + new URLSearchParams({
      where: where,
      outFields: 'CONSIDR1,ACRES,TRADATE,OWNADD1,OWNCITY,OWNSTATE,OWNERZIP',
      orderByFields: 'TRADATE DESC',
      resultRecordCount: '1',
      returnGeometry: 'false',
      f: 'json'
    }).toString();
    return fetchJson(url).then(function (data) {
      if (data.error || !data.features || !data.features.length) return null;
      var a = data.features[0].attributes;
      var ownerCity = [a.OWNCITY, a.OWNSTATE].filter(Boolean).join(' ');
      var ownerAddr = [a.OWNADD1, ownerCity, a.OWNERZIP].filter(Boolean).join(', ');
      return { price: a.CONSIDR1 || 0, acres: a.ACRES || null, ownerAddr: ownerAddr || null };
    });
  }

  function fetchFairfaxLotIntel(lookup) {
    var pid = "'" + lookup.parcelId + "'";
    var salesUrl = FFX_SALES_URL + '?' + new URLSearchParams({
      where: 'PARID=' + pid, outFields: 'PRICE,SALEDT', orderByFields: 'SALEDT DESC',
      resultRecordCount: '1', f: 'json'
    }).toString();
    var landUrl = FFX_LAND_URL + '?' + new URLSearchParams({
      where: 'PARID=' + pid, outFields: 'ACRES', resultRecordCount: '1', f: 'json'
    }).toString();
    return Promise.all([fetchJson(salesUrl), fetchJson(landUrl)]).then(function (res) {
      var sale = res[0].features && res[0].features[0] ? res[0].features[0].attributes : null;
      var land = res[1].features && res[1].features[0] ? res[1].features[0].attributes : null;
      if (!sale && !land) return null;
      return { price: sale ? (sale.PRICE || 0) : null, acres: land ? land.ACRES : null, ownerAddr: null };
    });
  }

  function formatLotIntel(info) {
    if (!info) return 'No sale record found';
    var parts = [];
    if (info.price === 0) parts.push('$0 (family/trust transfer)');
    else if (info.price) parts.push(fmtMoney(info.price));
    if (info.acres) parts.push(info.acres.toFixed(2) + ' ac');
    if (info.ownerAddr) parts.push('mails to ' + info.ownerAddr);
    return parts.length ? parts.join(' · ') : 'No sale record found';
  }

  // Concurrency-limited pool: runs `worker` over `items` with at most `limit` in flight at
  // once, so a large result set doesn't fire hundreds of simultaneous requests at a free
  // public county endpoint. Each item's result lands as soon as it's ready, independent of
  // the others, rather than waiting for the whole batch (Promise.all) to finish.
  function runPool(items, limit, worker) {
    var i = 0;
    function next() {
      if (i >= items.length) return;
      var idx = i++;
      worker(items[idx], idx).catch(function () {}).then(next);
    }
    for (var k = 0; k < Math.min(limit, items.length); k++) next();
  }

  function renderPermitRows(rows, sourceLabel) {
    var tbody = $('#pm-rows');
    tbody.innerHTML = '';
    if (!rows.length) {
      setStatus('#pm-status', 'No permits in that window — extend the look-back.', 'err');
      return;
    }
    var lotJobs = [];
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      var lotCell = r.lotLookup ? '<span class="spin"></span>Loading…' : '—';
      tr.innerHTML =
        '<td style="white-space:nowrap;">' + r.dateStr + '</td>' +
        '<td>' + escapeHtml(r.cityAddr) + '</td>' +
        '<td>' + escapeHtml(r.status || '—') + '</td>' +
        '<td>' + escapeHtml(r.detail || '—') + '</td>' +
        '<td class="lot-cell">' + lotCell + '</td>' +
        '<td><a class="rec-link" href="' + r.mapsUrl + '" target="_blank" rel="noopener noreferrer">Map ↗</a></td>' +
        '<td>' + pipeBtn(r.cityAddr, sourceLabel, r.note) + '</td>';
      tbody.appendChild(tr);
      if (r.lotLookup) lotJobs.push({ lookup: r.lotLookup, cell: tr.querySelector('.lot-cell') });
    });
    var baseStatus = rows.length + ' permits found (newest first).';
    $('#pm-wrap').hidden = false;
    setStatus('#pm-status', baseStatus, 'ok');

    if (lotJobs.length) {
      var lotDone = 0;
      runPool(lotJobs, 6, function (job) {
        var fetcher = job.lookup.kind === 'ffx' ? fetchFairfaxLotIntel : fetchMontgomeryLotIntel;
        return fetcher(job.lookup)
          .then(function (info) { job.cell.textContent = formatLotIntel(info); })
          .catch(function () { job.cell.textContent = 'Lookup failed'; })
          .then(function () {
            lotDone++;
            var msg = baseStatus + ' Fetching lot purchase data… (' + lotDone + '/' + lotJobs.length + ')' +
              (job.lookup.kind === 'mont' ? ' — Maryland\'s state records API is slow (~1/sec), this can take several minutes for large result sets.' : '');
            setStatus('#pm-status', lotDone < lotJobs.length ? msg : baseStatus + ' Lot purchase data complete.', 'ok');
          });
      });
    }
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
