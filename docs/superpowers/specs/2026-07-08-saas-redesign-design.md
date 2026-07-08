# EEN Lead Engine — "Less Wordy, More SaaS" Redesign

## Context

The EEN Lead Engine (`/Users/kiransen/Desktop/EEN-Lead-Engine`, single-page vanilla HTML/CSS/JS,
no build step) is currently written and styled as an internal operator playbook: dense
strategy essays, intern-workflow instructions, and a functional-but-utilitarian dark UI. The
goal of this pass is to make the same tool read and look like a polished, marketable SaaS
product to "the average real estate individual" — without changing its underlying niche
(luxury wholesaling, $700K–$2M+, MD/VA) or any of its interactive functionality (Live Intel
queries, calculators, CRM, compliance checklist all keep working exactly as they do today).

**Explicitly out of scope for this pass** (confirmed with user):
- Broadening the niche/positioning away from luxury wholesaling — stays as-is.
- Any SaaS productization work (multi-tenancy, accounts, billing, configurable jurisdictions,
  backend). This is a presentation-layer pass only.
- Any change to the Live Intel query logic, calculators, localStorage CRM, or compliance
  checklist behavior — copy and CSS only, functionality is untouched.

## Part A — Copy strategy

Applies page-wide, not just to the Lead Source Engines section, though that section has the
most to cut.

### A1. Lead Source Engine cards (index.html:145-368, 8 cards)

Each card currently has: an icon/title, a `.desc` paragraph (kept), a collapsed `<details>`
containing a `.why` essay (2-4 sentences) + a 5-step `<ol>` intern workflow + 2-3 source
links, and a `.meta` badge row.

**Change:** Remove the `.why` essay and the 5-step `<ol>` workflow entirely. Fold the single
most important sentence of the "why" into the existing `.desc` line (so `.desc` becomes
2 sentences max: what it is + why it's underused). Keep the `<details>` element structurally
(so the collapse/expand pattern and its CSS/JS stay unchanged) but its content becomes just
the source links — relabel the `<summary>` from "The Plan — how it works" to "Data sources"
to match the new, smaller content. Keep the `.meta` badge row as-is (already terse).

Net effect per card: ~150-200 words → ~40-50 words. This is a copy edit, not a markup
restructure — `<details>`/`<summary>` stays because Task-level CSS (`.engine details`,
`.engine summary`, `.engine .plan`) already targets it and removing the element would mean
also touching more CSS than necessary.

### A2. Section intro callouts ("How this section works" boxes)

Appears on Command Center (~line 92), Lead Source Engines (~line 142), and Live Intel
(~line 377) via the shared `.how-it-works` component. Currently 3-4 sentence paragraphs
including intern-assignment/cadence instructions (e.g. "Assign each engine to a specific
intern as a named weekly deliverable").

**Change:** Cut each to 1-2 plain sentences describing what the section does and why it
matters to a seller/buyer, drop any instruction language aimed at an internal team (intern
cadence, task assignment). The `section-sub` paragraphs directly under each `<h2>` get the
same tightening.

### A3. Terminology

Keep brand/niche terms that are load-bearing for the luxury positioning (Private Client,
price bands, gold accent, the § 10-715 compliance framing). Trim insider-jargon phrasing in
body copy where a plainer phrase says the same thing in fewer words (e.g. "dispo-first buyer
network" → "the buyer list"; "white-glove process" can stay, it reads as premium rather than
jargon). This is a copyediting judgment call applied case-by-case during implementation, not
a fixed find/replace list.

### A4. Other sections (Signal Stacker, Deal Analyzer, Buyer Network, Marketing Sequences,
Pipeline Tracker, MD Compliance, White-Glove Meeting Kit)

These are already mostly functional UI (forms, tables, checklists) rather than prose. Apply
the same tightening pass only to descriptive paragraphs directly under each `<h2>` /
`.how-it-works` box, if present — no restructuring of the functional UI itself.

## Part B — Visual polish (same dark/gold theme)

All changes are in `styles.css` (and inline styles moved into it where found in index.html).
No new color palette, no light-mode variant — the existing token set
(`--color-bg`, `--color-gold`, `--font-display`, etc., styles.css:5-34) stays.

### B1. Spacing scale

Introduce explicit spacing tokens (e.g. `--space-1: 4px` through `--space-6: 48px`) in `:root`
and use them for section (`.panel`) vertical margins, `.card` internal padding, and gaps
between `.card-grid` items — replacing today's ad-hoc pixel values (`padding: 28px 20px`,
`gap: 20px`, etc. scattered through the file) with a consistent scale. Increase overall
breathing room: section-to-section spacing and card internal padding both go up roughly 25-40%
from current values.

### B2. Typography hierarchy

Establish a clearer type scale: fewer distinct font-sizes in play (audit currently shows
`.engine p.desc` at 0.9rem, `.plan ol` at 0.87rem, `.helper` at 0.76rem, `.tool-status` at
0.84rem — several near-duplicate sizes that don't read as an intentional scale). Consolidate
to a small set (e.g. body/base, small/meta, micro/helper) with clearer size and weight jumps
between heading levels (`.section-heading`, `h3`, `.desc`) so the page scans instead of reads
top-to-bottom like a document.

### B3. Card consistency

Audit `.card`, `.engine`, `.card.tool` (styles.css:181, 221, 447) for consistent
border/radius/shadow/hover treatment — today `.card.tool` only adds a margin override, engine
cards add their own icon/head layout. Converge on one shared visual card language (border,
`--radius-card`, `--shadow-card`, hover state) that every card type inherits, with type-specific
rules layered on top only where functionally necessary (icon layout, table wrap, etc.).

### B4. Badges

`.badge`/`.badge.gold` (styles.css:258-264) currently render as small bordered pills, 2-3 per
card in a wrapped flex row. Keep the pill treatment (it's a reasonable, common SaaS pattern)
but tighten sizing/spacing so a 2-3 badge row reads as one clean line rather than wrapping
unevenly at typical viewport widths.

### B5. Forms & buttons

`input`/`select`/`.btn` (styles.css:279-306) get modernized padding, border, and focus/hover
states — larger touch targets, a clearer focus ring (already using `--color-gold` on focus,
keep that), smoother hover transitions using the existing `--transition` token.

### B6. Icons

The existing inline SVG icon set (engine cards, section headers, links) stays — just
standardize stroke-width/size across contexts (`.engine__icon svg` today hardcodes
`width: 20px; height: 20px`; other inline SVGs elsewhere in the file vary) so icon weight
feels consistent rather than incidental.

## Explicit non-goals (repeated for clarity)

- No copy/CSS change should alter any element ID that JS (`app.js`) selects via `$('#...')`.
  This is a presentation pass — every `id` attribute currently referenced in app.js must
  survive unchanged (verified in implementation by grepping app.js for every touched section's
  IDs before and after).
- No change to price bands, compliance logic, calculator formulas, or live-query behavior.
