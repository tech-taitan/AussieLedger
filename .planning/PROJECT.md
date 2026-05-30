# AussieLedger

## Current State

**v1.1 shipped 2026-05-30.** Cumulative: 9 phases · 31 plans · ~32k LOC TypeScript · 983 SPA + 18 server tests GREEN. v1.1 audit verdict: `passed` (15/15 v1.1 requirements satisfied; 3 non-blocking tech-debt items documented).

After v1.0 + v1.1: the brownfield prototype is now a robust tool. Persistence hides IndexedDB + SQLite behind the FINAL StorageAdapter. The tax engine produces print-ready returns for all four AU entity types with correct family Medicare levy + MLS. The year-end wizard walks a non-accountant from messy real-world TB import to finalised working paper. Per-report CSV exports + Sidebar anomaly fix-it deep-links + Apache 2.0 LICENSE + clone-and-run.

**v1.1 closed every v1.0 known gap** — FND-02 CSV exports shipped, family Medicare engine shipped, cosmetic + Nyquist sweep landed, plus bonus correction of 4 stale Phase-5 single-Medicare constants to FY2025-26 values. Honest record: only ~2 days of intense work because v1.0 set up clean foundations.

## Current Milestone: v1.2 — Public Hosting + IndexedDB Hardening

**Goal:** Put AussieLedger on a public URL so anyone can use it in a browser, backed entirely by the existing v1.0 IndexedDB persistence — zero third-party databases, zero hosted user data, zero ongoing service costs. Harden the IndexedDB-only path (persistent-storage permission, backup-nag UX, quota checks) so users who arrive at the hosted SPA cold can trust it with their tax data. Polish the open-source release surface for the new "go to the URL, start using it" audience.

**Why now (sequencing decision):** The user-data-sovereignty story has TWO layers — (A) the data is local to the user's machine, and (B) the data lives in a file the user can see/copy/back up. v1.2 ships layer A on the web (IndexedDB + hardening) — proving the architecture publicly and giving users immediate access. v2.0 ships layer B (sqlite-wasm + File System Access API + Tauri desktop wrapper) — upgrades to user-owned files when users want a "real file" mental model. Splitting these means v1.2 ships in 1-2 weeks (immediate public reach), and v2.0's architectural pivot is informed by real user feedback from the hosted v1.2.

**Target features:**
- **Public SPA hosting** — deploy to a free static-host (GitHub Pages / Cloudflare Pages / similar) with CI auto-deploy from `main`. Custom domain optional. README points users at the hosted URL.
- **IndexedDB hardening** — `navigator.storage.persist()` request on first use (prevents browser eviction under storage pressure). Quota-check on app load with friendly "your browser allocates ~XGB" disclosure. Backup-nag UX (toast "Last JSON export: N days ago — back up now" with snooze).
- **Pre-unload guard** — browser-native "are you sure?" if user has unsaved changes (matches the "you have edited journals but haven't exported" pattern).
- **Open-source release polish for hosted form** — README rewrite: top-of-fold "try the live demo at [URL]" + "or clone and self-host"; demo-data seed option (`/demo` route with anonymised sample books); deployment runbook for self-hosters.
- **AI feature gating on hosted SPA** — public build ships with no `GEMINI_API_KEY` → `AiGateNote` already shows "AI optional, configure your own key" (Phase 6); v1.2 adds an inline "paste your Gemini key" UI that stores in `localStorage` per-browser (never sent to a server; pure client-side proxy disabled when hosted-online).
- **PWA wrapper (optional)** — service worker + manifest for offline use + installable to OS dock. Doesn't change data architecture; adds "use AussieLedger from your home screen" affordance.

**Explicit non-goals:**
- File System Access API · sqlite-wasm · Tauri packaging — all deferred to v2.0
- Server-side hosting of user data — explicit non-goal of the milestone
- Telemetry / analytics on the hosted SPA — explicit non-goal (privacy first; no third party)
- Multi-user accounts / auth — explicit non-goal (every browser is its own instance)
- Backend AI proxy hosted by us — explicit non-goal (user supplies their own key; client-side only)

## Next Milestone (v2.0) — Pre-locked Direction

**v2.0 — Local-File-Backed Data Sovereignty** ships once v1.2 has reached real users:

- **sqlite-wasm in the browser** (`@sqlite.org/sqlite-wasm`) — real SQLite running entirely client-side; pure WASM; same DDL control we'd want in a Tauri rusqlite path (no `tauri-plugin-sql` NUMERIC-affinity bugs from the v2.0 research)
- **File System Access API** (Chromium-first; OPFS fallback for Safari/Firefox; IndexedDB fallback for old browsers) — user picks a `.aussieledger` SQLite file on their disk; browser remembers permission; file is the source of truth
- **`BrowserSqliteAdapter`** behind the FINAL Phase-3 `StorageAdapter` — additive implementation only; existing v1.0/v1.1 IndexedDB users get a one-time guided "import to a file" flow
- **Tauri desktop wrapper** (optional v2.1 add-on) — once `BrowserSqliteAdapter` is proven in production, wrapping it in Tauri is a thinner spike (the data layer is already done; Tauri just adds the OS shell + hard network sandbox)
- Full research preserved at `.planning/future-milestones/v2.0-standalone-app/research/` (Tauri-specific findings; needs revision against sqlite-wasm path before v2.0 planning starts — but ~60% of the architecture decisions carry forward)

Run `/gsd:new-milestone` after v1.2 ships to lock v2.0 specifics. The PRD express path is available: `/gsd:plan-phase {N} --prd .planning/future-milestones/v2.0-standalone-app/research/SUMMARY.md` once a milestone is opened.

## What This Is

A free, open-source, self-hosted Australian accounting tool that takes someone from "I have a trial balance" to "I can lodge a tax return." It's aimed at small-business owners (running a company, trust, partnership, or as a sole trader) who can't afford Xero/MYOB/QuickBooks, and at tax agents who want a no-cost workspace for their smaller clients. The product is opinionated about being non-intimidating: guided wizards and smart defaults stand in for the accounting literacy a typical SaaS assumes.

After v1.0: the prototype's visual shell is preserved; the depth is real (127-row default CoA, decimal tax math, audit-logged finalise lifecycle, print-CSS-scoped working papers per form, persona-mode-aware navigation).

## Core Value

A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return they can hand to the ATO via myGov or to their tax agent — without paying for software.

## Requirements

### Validated (shipped v1.0 + v1.1)

**Foundation (FND)**
- ✓ FND-01 — Durable persistence (browser cache survives) — v1.0
- ✓ FND-02 — **CSV per-report exports CLOSED** (TB CSV + BAS labels CSV + Form I labels CSV via FND-10/11/12) — v1.0 partial → v1.1 full
- ✓ FND-03 — JSON import round-trip — v1.0
- ✓ FND-04 — Self-hostable without paid API keys — v1.0
- ✓ FND-05 — No misleading "ATO Connected" theatre — v1.0
- ✓ FND-06 — Always-visible "not tax advice" disclaimer — v1.0
- ✓ FND-07 — Vitest + golden tests per return type — v1.0
- ✓ FND-08 — Decimal arithmetic (decimal.js) end-to-end — v1.0
- ✓ FND-09 — Schema version + migration runner (v0→v6 chain) — v1.0 + v1.1 (v5→v6 added)
- ✓ FND-10, FND-11, FND-12 — TB / BAS labels / Form I CSV exports with UTF-8 BOM + quote-all + CRLF + apostrophe-prefix leading-zero codes — v1.1

**Bookkeeping (BOOK)**
- ✓ BOOK-01..12 — All shipped v1.0 (journal lifecycle, CoA hierarchy, GST codes, period model, audit trail, search) — v1.0

**Entities (ENT)**
- ✓ ENT-01..08 — All four AU entity types + ABN/TFN validation + beneficiary/partner registers — v1.0

**Trial Balance Import (IMP)**
- ✓ IMP-01..06 — CSV/XLSX import + column-mapping UI + fuzzy match + AI gate + fingerprint dedup — v1.0
- ✓ IMP-07..11 — Real-world unformatted TB handling: header-row auto-detection + tolerant currency parser + subtotal detection + split-column merge + RejectedRowsPanel with apply-to-similar — v1.1

**Tax shared + per-form (TAX, IND, COY, TRT, PSP, BAS, MED)**
- ✓ TAX-01..05 (TAX-04 stale-checkbox-only; work delivered Phase 2) — v1.0
- ✓ IND-01..04, COY-01..03 (COY-04 obsoleted → IND-04), TRT-01..03, PSP-01..02, BAS-01..06 — v1.0
- ✓ MED-01..04 — Family Medicare levy + family MLS threshold engines; v5→v6 additive migration; Form I family assumption row — v1.1
- ✓ **Bonus: 4 stale FY2024-25 single-Medicare/MLS constants** corrected to FY2025-26 values (Phase 8 scope expansion) — v1.1

**UX, Personas, Deployment, Polish**
- ✓ UX-01..05 — Year-end wizard + inline anomalies + tooltips + mobile responsive + persona toggle — v1.0
- ✓ UX-06 — Sidebar anomaly count badges deep-link with cycle + 300ms yellow flash + position toast — v1.1
- ✓ PERS-01..03 — Owner/agent landing + per-instance setting — v1.0
- ✓ DEP-01, DEP-02, DEP-03, DEP-04, DEP-05 — Clone-and-run + dual-shape + Apache 2.0 + CONTRIBUTING + CI — v1.0
- ✓ CLEAN-01, CLEAN-02 — Cosmetic + Nyquist sweep (App.tsx already fixed in Phase 1; v1.0 phases 1/2/6 Nyquist frontmatter flipped; v1.1 phases 7/8/9 also flipped at milestone close) — v1.1

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
