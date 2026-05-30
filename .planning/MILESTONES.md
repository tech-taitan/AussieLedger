# Milestones

## v1.1 — Polish, Closure, and TB Import Rework (Shipped: 2026-05-30)

**Delivered:** Closes every v1.0 known gap, polishes UX-02 with anomaly fix-it deep-links, and rebuilds the TB-import path to handle real-world unformatted Xero/MYOB/QuickBooks/Excel exports. No architectural pivot — v1.0's stack is preserved end-to-end.

**Stats:** 3 phases · 8 plans · 17 tasks · 2 days (2026-05-29 → 2026-05-30; intense) · 57 commits · 17 feat commits · ~32k LOC TypeScript · 983 SPA tests GREEN + 18 server tests GREEN · 15/15 requirements satisfied · 220 new tests vs v1.0 baseline

**Key accomplishments:**
- **ImportTB UX Rework (Phase 7)** — Header-row auto-detection (handles trailing title/date rows + multi-row headers) with low-confidence manual fallback · Tolerant currency parser preserving decimal.js precision (`$`, `AUD`, parens-negatives, thousands separators, whitespace) · Subtotal detection (keyword + sum-pattern; sum-wins-on-coded for Xero `4999 — Total Revenue`) · Split-column merge + missing-code handling · RejectedRowsPanel with inline edit + "Apply to similar" diff preview
- **Family Medicare Levy Engine (Phase 8)** — Replaced Phase 5's `family → flat 2% + warning` fallback with the real Australian family Medicare levy AND family MLS threshold engines · v5→v6 additive migration adding `Entity.dependants` + `Entity.spouseIncome` · Levy charged on TAXPAYER income (combined income gates threshold) · `isFamilyFiling` predicate with single-parent + DINK case coverage · **Bonus:** 4 stale Phase-5 single-Medicare/MLS constants corrected to FY2025-26 values
- **Exports + Polish + Cleanup (Phase 9)** — FND-02 closed via per-report CSV exports (TB / BAS labels / Form I labels) with UTF-8 BOM + quote-all + CRLF + apostrophe-prefixed leading-zero codes + decimal-precision-preserving raw strings · UX-06 Sidebar anomaly count badges deep-link with cycle state + 300ms yellow flash + position toast · CLEAN-01 discovered already-fixed in Phase 1 (resolved as REQUIREMENTS doc-only update) · CLEAN-02 Nyquist frontmatter flipped on v1.0 phases 1/2/6 · Nyquist drift on v1.1's own VALIDATION files flipped in milestone-close commit
- **v1.0 → v1.1 continuity verified** — Every v1.0 known gap closed; FND-02 CSV deferred → shipped; family Medicare deferred → shipped; cosmetic + Nyquist debt cleared; ImportTB messy-TB friction closed; bonus stale-constants correction

**Audit verdict:** `passed` — no critical blockers; all 5 E2E flows wire end-to-end (gsd-integration-checker).

### Known Gaps (carried to next milestone)

- **Pre-existing `<button>`-in-`<button>` React warning** in Sidebar NavButton (inherited from Phase 6; not introduced by v1.1) — refactor candidate for v1.2 polish or v2.0 standalone-app phase.
- **CSV round-trip apostrophe asymmetry** — Phase-9 TB CSV apostrophe-prefixes leading-zero codes for Excel; Phase-7 ImportTB doesn't strip on re-import. By design; document as scope boundary if round-trip becomes a v2+ requirement.

---

## v1.0 — AussieLedger Initial Release (Shipped: 2026-05-29)

**Delivered:** A free, self-hosted, open-source Australian bookkeeping-to-tax-return tool. A non-accountant business owner can take a trial balance, record adjustments, walk a year-end wizard, and produce a print-ready tax return — without paying for software.

**Stats:** 6 phases · 23 plans · 23 tasks · 22 days (2026-05-07 → 2026-05-29) · 147 commits · ~27k LOC TypeScript · 763 SPA tests GREEN + 18 server tests GREEN · 70/70 requirements mapped (69 satisfied, 1 partial deferred to v2)

**Key accomplishments:**
- **Safety Net (Phase 1)** — ATO theatre + demo seeds removed; Vitest + golden tests installed; decimal arithmetic via decimal.js; schema-version field on every persisted type; EntityForm ABN modulus-89 validation
- **Tax Engine + App.tsx decompose (Phase 2)** — `App.tsx` reduced to ≤250-line orchestrator; pure tax-math modules in `src/lib/tax/`; Gemini API key removed from client bundle; canonical AU period module
- **Durable Persistence (Phase 3)** — `StorageAdapter` FINAL interface hiding IndexedDB (LocalAdapter) and SQLite (ServerAdapter); JSON export/import round-trip; both deployment shapes work; data survives browser cache clear
- **Bookkeeping Core (Phase 4)** — 127-row AU SME default CoA with per-type tax-label mappings; journal lifecycle (post/edit-supersedes/reverse/void); TrialBalance with period filter + parent subtotals; CSV/XLSX TB import with fingerprint dedup
- **Tax Outputs (Phase 5)** — Print-ready Form I / C / T / P + Simpler BAS + IAS; FY2026 rate helpers (marginal, LITO, Medicare+MLS, BRE, small-biz offset); BAS to-the-cent (G1=$18,200 / 1A=$1,000 / 1B=$100); `@media print` scoping per form
- **Personas, Wizard, Deployment (Phase 6)** — Year-end wizard (7 steps, typed-entity-name attestation, finalise lock); owner/agent persona modes (Settings via localStorage, NOT StorageAdapter); inline `AnomalyBadge` + Sidebar count badges; Radix tooltips on all 5 tax forms; Apache 2.0 LICENSE + CONTRIBUTING.md + audience-first README

**Audit verdict:** `tech_debt` — no critical blockers; all 5 E2E flows wire end-to-end (gsd-integration-checker).

### Known Gaps (carried to next milestone)
- **FND-02 CSV per-report export** — JSON export delivered v1.0; CSV per-report (TB CSV, BAS labels CSV, Form I CSV) consciously deferred to v2 (Phase 3 UAT 2026-05-12, re-confirmed Phase 4 + Phase 6). Roll into v2.0 requirements.
- **Nyquist VALIDATION.md frontmatter** — Phases 1, 2, 6 have `nyquist_compliant: false` despite tests being GREEN. Retroactive fix via `/gsd:validate-phase 01 02 06` if Nyquist gating matters going forward. No runtime impact.
- **Cosmetic:** `App.tsx:114` dead string literal `'US Big Law Firm'` never renders — cleanup candidate.

---
