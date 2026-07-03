# EEN Lead Engine — Private Client Intelligence

Internal lead-generation and marketing operating system for **Empower Estates Network**'s
luxury wholesaling expansion in Maryland / the DMV.

**Live:** https://kirans0615.github.io/EEN-Lead-Engine/

## What it is

Built specifically for **luxury wholesaling** ($700K–$2M+), not volume wholesaling:
price-band doctrine (Entry/Core/Ultra), dispo-first buyer network, fee-visibility
exit structuring (assignment vs. double close vs. novation), and white-glove process.

A single-page static app (no build step, no server) with these modules:

1. **Command Center** — the 5-stage operating flow (Source → Stack → Score → Sequence → Close) with live pipeline stats
2. **Lead Source Engines** — 8 proprietary lead-origination playbooks built on Maryland public records (probate, permits, SDAT tenure, tax sale, land records, USPS vacancy, divorce dockets, advisor referrals), each with direct links to the live data sources and a step-by-step plan
2b. **Live Intel** — tools that query real government data in the browser:
   SDAT Property Finder (MD iMAP ArcGIS REST — two profiles: **motivated homeowners**
   [tired landlords, absentee/out-of-state, long-tenure, trust transfers] and **development
   land** [near-vacant lots]; includes the owner's real **mailing address** automatically),
   Teardown Permit Radar (dataMontgomery permits, daily), and Code Violation Sweep. Results
   push straight into the Pipeline Tracker.
2c. **Skip Trace** — resolves owner **phone + email** via the Tracerfy API
   (`POST /v1/api/trace/lookup/`, Bearer token). Fires only on an explicit per-lead click
   with a confirm; surfaces DNC + litigator + deceased flags; tracks credit spend locally.
   The token is entered at runtime and stored **only in the browser's localStorage** — it is
   never committed to this repo or shipped in the public bundle. Each user pastes their own.
3. **Signal Stacker** — interactive 0–100 motivation scoring across 14 stacked signals
4. **Deal Analyzer** — max-allowable-offer calculators for teardown/lot deals and luxury flips
5. **Marketing Sequences** — the 6-touch discreet campaign plus three copy-ready letter templates
6. **Buyer Network** — dispo-first CRM for the thin luxury buyer pool (builders, flippers,
   developers, family offices) with buy-box tracking and a 45-day stale-touch alarm
7. **Pipeline Tracker** — localStorage CRM with status tracking and CSV export
8. **MD Compliance** — Md. Real Prop. § 10-715 (eff. Oct 1 2025) per-deal disclosure checklist,
   plus confidentiality and named-buyer (Band 2+) gates
9. **White-Glove Meeting Kit** — per-meeting checklist (valuation dossier, POF, NDA, comp book)

All entered data stays in the browser (localStorage). Nothing is transmitted anywhere.

## Stack

Vanilla HTML/CSS/JS. Brand tokens mirror empowerestatesnetwork.com (Hubot Sans /
Julius Sans One, black/white with a Private Client gold accent).

## Develop

Open `index.html` with VS Code Live Server, same workflow as the EEN-Website repo.

---
© EEN 2026 · Not legal advice — contracts and § 10-715 disclosures require a Maryland attorney.
