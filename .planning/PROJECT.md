# AussieLedger

## Current State

**v1.0 shipped 2026-05-29.** 6 phases, 23 plans, ~27k LOC TypeScript, 763 SPA + 18 server tests GREEN. Audit verdict: `tech_debt` (no critical blockers; FND-02 CSV per-report export consciously deferred to v2).

The brownfield prototype that existed at project init is now a real tool: the StorageAdapter hides IndexedDB (single-user) and SQLite (small-firm VPS), the tax engine produces print-ready returns for all four AU entity types, the year-end wizard walks a non-accountant from "I have a TB" to "I have a finalised working paper", and the project ships under Apache 2.0 with a clone-and-run install.

## Current Milestone: v2.0 — Standalone App + Local Data Sovereignty

**Goal:** Ship AussieLedger as a standalone desktop app (Tauri) backed by a single-file SQLite-per-instance model, so the target audience (non-accountant business owners) can install with a double-click AND every byte of their tax data is provably local — no browser-storage opacity, no implicit network calls, no "where's my data?" confusion.

**Why now:** v1.0 proves the tax engine + wizard + persona shell are correct. The remaining v1.0 friction (`npm install` install path; browser storage opacity; AI-feature network ambiguity) all stem from the web-app shell, not from the domain logic. v2.0 swaps the shell while keeping the domain layer untouched — the Phase 3 `StorageAdapter` FINAL invariant was designed for exactly this. The same change that solves the "double-click install" UX also solves the "guaranteed local data" trust requirement.

**Target features:**
- **Tauri 2.x desktop binary** for Windows / macOS / Linux — installable from a single OS-native installer (`.msi` / `.dmg` / `.AppImage`); no Node, no terminal, no `npm install`
- **File-backed SQLite-per-instance** — each user's books live in a portable `*.aussieledger` file the user owns end-to-end (File → New / File → Open / File → Save As). The file IS the source of truth; the in-app SQLite handle is a working cache
- **Hard network sandbox** — Tauri allowlist forbids any outbound HTTP by default; without an explicit allowlist entry per host, network calls are *impossible*, not just discouraged. AI features become explicit "send this batch to Google" actions, not background calls
- **Native OS file paths** — file dialogs use the OS picker; documented default location (e.g. `~/Documents/AussieLedger/` on macOS, `Documents\AussieLedger\` on Windows); user can put the file on a USB stick, NAS, or encrypted drive
- **`FileBackedAdapter`** behind the Phase 3 `StorageAdapter` interface — domain layer (hooks, components, tax engine) sees zero change; the swap happens at the adapter
- **Auto-save + crash recovery** — desktop user doesn't manually save after every change; the file commits transactionally, with an explicit "Save As" for snapshots/backups
- **Cross-platform CI build pipeline** — every push produces signed (where the cert is available) installers on GitHub Releases; the web SPA remains a build target for users who want it
- **Migration from v1.0** — existing v1.0 IndexedDB + Express+SQLite users get a one-time "Import your v1.0 data" flow that reads the v5 JSON export and writes a v6 `.aussieledger` file

**Out of scope (deferred from v2.0):**
- Direct ATO / myGov lodgement (still v3+)
- Multi-user / firm-shared editing of a single file (single-user-per-file in v2; file-locking acceptable; concurrent edits not)
- Cloud sync / file-sync layer (Dropbox/iCloud users can manage that themselves with the file)
- Auto-update infrastructure (manual download for v2.0; auto-update v2.1)
- Mobile app (responsive web SPA continues to serve mobile users; native mobile = v3+)
- CSV per-report export (FND-02 from v1.0 carries forward as a v2 requirement, not a separate v1.1)

**Carry-over from v1.0 known gaps absorbed into v2.0:**
- FND-02 CSV per-report export (TB CSV, BAS labels CSV, Form I CSV) — natural fit alongside the file-export work
- Cosmetic: `App.tsx:114` dead `'US Big Law Firm'` string — sweep during v2.0 SPA changes
- Nyquist `nyquist_compliant: false` frontmatter on Phases 1/2/6 — retroactive flip via `/gsd:validate-phase` if Nyquist gating still matters going forward

## What This Is

A free, open-source, self-hosted Australian accounting tool that takes someone from "I have a trial balance" to "I can lodge a tax return." It's aimed at small-business owners (running a company, trust, partnership, or as a sole trader) who can't afford Xero/MYOB/QuickBooks, and at tax agents who want a no-cost workspace for their smaller clients. The product is opinionated about being non-intimidating: guided wizards and smart defaults stand in for the accounting literacy a typical SaaS assumes.

After v1.0: the prototype's visual shell is preserved; the depth is real (127-row default CoA, decimal tax math, audit-logged finalise lifecycle, print-CSS-scoped working papers per form, persona-mode-aware navigation).

## Core Value

A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return they can hand to the ATO via myGov or to their tax agent — without paying for software.

## Requirements

### Validated (shipped v1.0)

**Foundation (FND)**
- ✓ FND-01 — Durable persistence (browser cache survives) — v1.0
- ~ FND-02 — JSON export/import shipped; CSV per-report **partial, deferred to v2** — v1.0
- ✓ FND-03 — JSON import round-trip — v1.0
- ✓ FND-04 — Self-hostable without paid API keys — v1.0
- ✓ FND-05 — No misleading "ATO Connected" theatre — v1.0
- ✓ FND-06 — Always-visible "not tax advice" disclaimer — v1.0
- ✓ FND-07 — Vitest + golden tests per return type — v1.0
- ✓ FND-08 — Decimal arithmetic (decimal.js) end-to-end — v1.0
- ✓ FND-09 — Schema version + migration runner (v0→v5 chain) — v1.0

**Bookkeeping (BOOK)**
- ✓ BOOK-01..12 — All shipped v1.0 (journal lifecycle, CoA hierarchy, GST codes, period model, audit trail, search) — v1.0

**Entities (ENT)**
- ✓ ENT-01..08 — All four AU entity types + ABN/TFN validation + beneficiary/partner registers — v1.0

**Trial Balance Import (IMP)**
- ✓ IMP-01..06 — CSV/XLSX import + column-mapping UI + fuzzy match + AI gate + fingerprint dedup — v1.0

**Tax shared + per-form (TAX, IND, COY, TRT, PSP, BAS)**
- ✓ TAX-01..05 (TAX-04 stale-checkbox-only; work delivered Phase 2) — v1.0
- ✓ IND-01..04, COY-01..03 (COY-04 obsoleted → IND-04), TRT-01..03, PSP-01..02, BAS-01..06 — v1.0

**UX, Personas, Deployment**
- ✓ UX-01..05 — Year-end wizard + inline anomalies + tooltips + mobile responsive + persona toggle — v1.0
- ✓ PERS-01..03 — Owner/agent landing + per-instance setting — v1.0
- ✓ DEP-01, DEP-02, DEP-03, DEP-04, DEP-05 — Clone-and-run + dual-shape + Apache 2.0 + CONTRIBUTING + CI — v1.0

### Active

(Empty pending next-milestone questioning.)

### Out of Scope

<!-- Reviewed 2026-05-29; reasoning still valid. -->

- **Direct ATO lodgement via SBR (Standard Business Reporting)** — Multi-month compliance project; print-ready output gets the same user from A to B without it.
- **Bank feeds / Open Banking integration** — Paid APIs conflict with the open-source self-hosted ethos.
- **Bank statement CSV parsing / transaction reconciliation** — Adjacent product surface (the "Xero replacement" path) pulls in too much scope.
- **AI chatbot / conversational assistant** — User chose wizards + smart defaults. Avoids API-key-in-client problem.
- **Hosted multi-tenant SaaS / managed cloud offering** — Distribution is open-source self-hosted.
- **Client billing, invoicing, AR/AP, inventory, payroll** — Off the TB → tax return path.
- **Foreign-entity support (US LLC etc.)** — AU-only.
- **Slide generator** — Removed Phase 1.
- **FBT, LCT, fuel-tax credits, R&D, Division 7A loans, CGT events, rental schedules** — Specialist tax surfaces; out unless explicit demand.

## Context

**Codebase state (after v1.0):** ~27,041 LOC TypeScript across `src/` + `server/`. 92 test files. Stack: React 19 + TypeScript 5.8 + Vite 6 + Tailwind v4 + motion + lucide + recharts + decimal.js + idb + Express + better-sqlite3 + Zod + papaparse + sheetjs-ce + Radix tooltip. Apache 2.0 licensed. Both deployment shapes (`npm run dev` IDB-only, `npm run dev:full` Express+SQLite) work.

**Audit findings carried forward:** v1.0 audit (`milestones/v1.0-MILESTONE-AUDIT.md`) is `tech_debt` verdict — 5/5 E2E flows wire end-to-end, 69/70 requirements satisfied, FND-02 CSV consciously deferred. No user feedback themes yet (pre-public-release).

**Known issues / technical debt:**
- FND-02 CSV per-report export (roll into next milestone)
- VALIDATION.md `nyquist_compliant: false` on Phases 1/2/6 frontmatter despite tests GREEN (cosmetic)
- `App.tsx:114` dead string literal `'US Big Law Firm'`

## Constraints

- **Tech stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind v4 + motion + lucide + recharts. New dependencies must be open-source and run locally.
- **Distribution:** Open-source, self-hosted. No required paid services in the core flow. No managed-cloud assumptions. No telemetry by default.
- **Tax domain:** Australian only. Forms, labels, GST rules, PAYG mechanics, FY 1 July – 30 June.
- **Free:** No paid APIs in the critical path. AI features must be optional and gated.
- **Audience parity:** Both consumer-owner and tax-agent personas must be first-class.
- **Compliance disclaimer:** Always-visible "not tax advice" disclaimer. Help text never states deductibility.
- **Persistence:** Must survive browser cache clear. StorageAdapter interface is FINAL — additive entity-data widening only; non-entity config goes via `localStorage` under `aussieledger:settings` (Phase 6 pattern).
- **Schema migrations:** Additive only + reversible round-trip + migration test required. Encoded in CONTRIBUTING.md.

## Key Decisions

| Decision | Rationale | Outcome (post-v1.0) |
|---|---|---|
| Print-ready output, not direct ATO/SBR lodgement, in v1 | SBR is multi-month compliance; print-ready gets the same user outcome. | ✓ Good — v1.0 ships; user can transcribe to myGov or hand to agent |
| Open-source, self-hosted distribution | Sustainability without ongoing hosting cost; sidesteps multi-tenant auth in v1. | ✓ Good — Apache 2.0 LICENSE + dual-shape docs verified |
| All four entity types in v1 | Every common AU SME structure served day one. | ✓ Good — 4/4 forms shipped with golden tests; BAS+IAS too |
| Both consumer + tax-agent personas as first-class | User explicitly chose this; doubles UX surface, accepted cost. | ✓ Good — Phase 6 delivered both modes with PERS-03 invariant verified |
| Hybrid workflow (opening TB + ongoing journals) | Realistic; pure annual or pure GL miss audiences. | ✓ Good — Phase 4 ImportTB + Phase 4 journal lifecycle ship together |
| Guided wizards + smart defaults as the guidance model | Wizards deterministic + inspectable; chatbot pulls in API-key and hallucination problems. | ✓ Good — YearEndWizard 7-step + smart CoA defaults shipped |
| Strip Gemini API key from client; AI optional | Critical security issue + conflicts with self-hosted-without-paid-services. | ✓ Good — Phase 2 removed; Phase 6 added visible AiGateNote affordance |
| Remove "Pearson Specter Litt / US Big Law Firm" + "ATO Connected (Simulated)" theatre | Off-mission, actively misleading. | ✓ Good (Phase 1) — except `App.tsx:114` dead string still present; cleanup candidate |
| Keep React 19 + Vite + Tailwind v4 stack | Visual shell strong; rewriting wastes leverage. | ✓ Good — stack preserved end-to-end |
| StorageAdapter as FINAL interface (Phase 3 invariant) | Hides backend; lets persistence shape change without touching components. | ✓ Good — Phase 6 added Settings via localStorage WITHOUT touching adapter; pays off for v2 standalone app idea |
| `decimal.js` over native floats | GST rounding correctness; tax-data trust floor. | ✓ Good — BAS to-the-cent on mixed fixture; no float artefacts surfaced |
| Schema migration as additive + reversible round-trip rule | Deployed instances may be offline for months; non-additive corrupts user books. | ✓ Good — encoded in CONTRIBUTING.md; v0→v5 chain GREEN |
| Tax-rate / label catalogues per-FY (`fy2026.ts` module pattern) | Annual ATO refresh; per-FY isolation. | ✓ Good — Phase 5 pattern documented in CONTRIBUTING.md "Adding a new FY" |
| No new PDF library — `window.print()` + `@media print` CSS | Avoids React 19 compat risk; simpler distribution. | ✓ Good — UAT confirmed print works across all 5 forms |
| Radix tooltip (no `asChild` on `Tooltip.Content`) for ATO label help | React 19 compat; documented pitfall avoided. | ✓ Good — UX-03 shipped without runtime errors |
| Anomaly visual language single-source (`AnomalyBadge` yellow pill) | Same severity language across tax-output AND non-tax screens. | ✓ Good — JournalForm hot-fixed during Phase 6 to use AnomalyBadge instead of plain red div |

## Open Questions (To Resolve in Next Milestone)

- **Direction of next milestone:** v1.1 polish-and-CSV, or v2.0 standalone desktop app?
- **PDF export library** — re-visit only if v2 standalone app needs richer offline output than `window.print()`. Tauri's native print + offline-PDF capability may make this moot.
- **Auth on a self-hosted instance** — none, simple password, or multi-user with roles? Open since v1 (single-user assumed). Becomes relevant when small-firm VPS shape gets real users.
- **Tax-year currency mechanism** — manual edit of constants is fine for one FY; v1.1 should document the refresh process more concretely.
- **CSV per-report shape** — when FND-02 closes: column conventions for TB CSV vs Form-I CSV vs BAS labels CSV.
- **Anomaly fix-it deep-links** — clicking a Sidebar count badge should auto-scroll to the offending row. Not shipped v1.0; nice-to-have for v1.1.
- **Family Medicare levy threshold engine** — Phase 5 left this on a flat-2%-with-warning; v1.1 or v2 wizard.
- **Standalone packaging stack** — Tauri vs Electron vs one-click installer that bundles existing stack. See `.planning/todos/pending/2026-05-28-package-as-standalone-desktop-app-with-local-backend.md`.

<details>
<summary>v1.0 active requirements (archived 2026-05-29)</summary>

The full v1 requirement list (Active + Validated as of v1.0 ship) is archived at [`.planning/milestones/v1.0-REQUIREMENTS.md`](./milestones/v1.0-REQUIREMENTS.md).

</details>

---
*Last updated: 2026-05-29 after v1.0 milestone*
