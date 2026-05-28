# Milestones

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
