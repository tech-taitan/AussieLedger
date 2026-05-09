# AussieLedger

## What This Is

A free, open-source, self-hosted Australian accounting tool that takes someone from "I have a trial balance" to "I can lodge a tax return." It's aimed at small-business owners (running a company, trust, partnership, or as a sole trader) who can't afford Xero/MYOB/QuickBooks, and at tax agents who want a no-cost workspace for their smaller clients. The product is opinionated about being non-intimidating: guided wizards and smart defaults stand in for the accounting literacy a typical SaaS assumes.

The current codebase (React 19 + Vite + TypeScript) is a well-styled prototype with credible bones — multi-entity ledger, journal-entry form, trial balance, BAS/IAS, individual/company/trust tax assistants, CSV TB import — but most depth is demo-grade and several existing features are off-mission. This phase of work redirects the prototype toward the vision above.

## Core Value

A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return they can hand to the ATO via myGov or to their tax agent — without paying for software.

## Requirements

### Validated

<!-- Inferred from existing codebase — features that exist and broadly work in the prototype. -->

- ✓ Multi-entity ledger with localStorage persistence — `src/App.tsx`
- ✓ Multi-line journal entry form with debit/credit balance enforcement and GST auto-calc — `src/components/JournalForm.tsx`
- ✓ Trial balance report with date filtering — `src/components/TrialBalance.tsx`
- ✓ Chart of Accounts manager (CRUD, GST code, tax-label mapping for individual/company/trust) — `src/components/AccountManager.tsx`
- ✓ Entity create/edit form with field validation — `src/components/EntityForm.tsx`
- ✓ Master dashboard (entity grid, bulk select/archive/deactivate/delete) — `src/App.tsx`
- ✓ Audit trail viewer (concept; needs real depth) — `src/components/AuditTrail.tsx`
- ✓ Responsive shell: collapsible sidebar (desktop) + bottom-nav (mobile) — `src/App.tsx`
- ✓ Visual design system: Tailwind v4, custom CSS variables, Inter + JetBrains Mono, lucide icons, motion animations — `src/index.css`, components

These are kept and built upon. Quality varies — see `.planning/codebase/CONCERNS.md` for the honest read on each.

### Active

<!-- v1 scope. All hypotheses until shipped. -->

**Foundation**
- [ ] Open-source self-hostable distribution: anyone can clone, run `npm install && npm run dev`, and have a working instance on their own machine or VPS — no paid services required in the critical path
- [ ] Replace browser `localStorage` with durable, exportable persistence so users don't lose books on a cache clear (mechanism TBD — local file / SQLite / IndexedDB-with-export)
- [ ] Move the Gemini API key off the client. Either remove AI features from the critical path or proxy them through an optional self-hostable backend
- [ ] Strip the off-mission demo content: `"Pearson Specter Litt / US Big Law Firm"` seed, `"ATO Connected (Simulated)"` indicator, hard-coded `+12% / -5% vs last month` trend strings

**Bookkeeping core**
- [ ] Hybrid workflow: import opening TB (CSV / Excel) → record journals throughout the year → produce closing TB and tax outputs at year-end
- [ ] Robust trial balance import: deterministic CSV parser with column-mapping UI; AI-assisted account matching becomes optional, not the only path; idempotent re-imports
- [ ] Expanded chart of accounts (current 16 entries → a credible AU SME default of 80–150 accounts) with sensible GST codes and tax-label pre-mapping
- [ ] Bank-style account hierarchy (parent/child) so users can group accounts under headings (e.g. "Operating Expenses" → individual lines)
- [ ] Edit / reverse posted journal entries (currently post-only) with full audit-log trace
- [ ] Period model: financial year, quarters, custom date ranges — applied consistently to TB, dashboard, BAS, tax return

**Tax outputs (print-ready)**
- [ ] Individual tax return with business schedule (Form I + Business and Professional Items)
- [ ] Company tax return (Form C) — covers the common labels for a small Pty Ltd: gross sales, deductions, taxable income, base-rate-entity tax, franking
- [ ] Trust tax return (Form T) including beneficiary distribution statements
- [ ] Partnership tax return (Form P) including partner distributions
- [ ] BAS calculation (G1, G2, G3, G10, G11, 1A, 1B, W1, W2, T7) and IAS for PAYG-only periods
- [ ] Print/PDF export of any return as a labelled summary the user can transcribe into myGov or hand to a tax agent

**Guidance for non-accountants**
- [ ] Year-end preparation wizard: a guided sequence (e.g. "review unreconciled items → confirm CoA mappings → preview return → finalise") that walks a non-accountant through the work in order
- [ ] Smart account-to-tax-label defaults: every account in the default CoA arrives pre-mapped to the right ATO labels for each entity type
- [ ] Anomaly flagging: out-of-balance entries, missing periods, GST mismatches, unmapped accounts surfaced in-context (not buried in reports)
- [ ] In-context plain-English help on every label and field — what it means, what to put there, common mistakes

**Two personas, one app**
- [ ] Consumer/owner mode: single-entity focus, simplified nav, wizard-first workflow
- [ ] Tax-agent mode: multi-client workspace, fast switching between entities, no hand-holding required
- [ ] Mode is a setting on the self-hosted instance, not an account-tier paywall

**Quality floor (so it can actually be trusted with tax data)**
- [ ] Tests for tax math: BAS aggregation, individual/company/trust label rollups, trial balance, GST calculations
- [ ] Reproducible builds, basic CI (`npm run build`, `npm run lint`, tests) so contributors and self-hosters get a green signal before deploying
- [ ] Clear, prominent disclaimer that this is software, not tax advice; users / agents are responsible for the final return

### Out of Scope

<!-- Explicit boundaries. Each has a reason so they don't sneak back in. -->

- **Direct ATO lodgement via SBR (Standard Business Reporting)** — Requires ATO software-developer registration, ongoing certification, AUSkey/RAM credential handling, and conformance with the SBR taxonomy. Multi-month compliance project before any user value. Print-ready output gets the same user from A to B without it.
- **Bank feeds / Open Banking integration** — Paid APIs (Basiq, Yodlee), commercial agreements, security/PCI considerations. Conflicts with the open-source self-hosted ethos and "free in the critical path" constraint.
- **Bank statement CSV parsing / transaction reconciliation** — Adjacent product surface (the "Xero replacement" path). Could be a later milestone but pulls in scope (categorisation, rules engine, splits, transfers) that isn't on the year-end-tax critical path.
- **AI chatbot / conversational assistant** — User explicitly chose wizards + smart defaults over a chatbot. Avoids the "talk-to-your-books" demoware trap and the API-key-in-client problem the prototype already had.
- **Hosted multi-tenant SaaS / managed cloud offering** — Distribution is open-source self-hosted. No central hosting, no billing, no per-user accounts on a shared server. (Anyone can fork and host commercially if they want.)
- **Client billing, invoicing, accounts receivable / payable, inventory, payroll** — These are general-ledger features that don't sit on the path from TB → tax return. Out for v1.
- **Foreign-entity support (US LLC, etc.)** — The current demo includes a "US Big Law Firm" seed entity. AU-only in v1. Removed.
- **Slide generator** — Off-mission decorative feature in the current prototype. Removed unless explicit user demand surfaces.
- **FBT, LCT, fuel-tax credits, R&D, Division 7A loans, CGT events, rental schedules** — Specialist tax surfaces. Document as gaps; out of v1 unless a specific Active requirement adds them.

## Context

**Existing codebase state.** Brownfield. Detailed map at `.planning/codebase/` (STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md). Two-line summary:

- **Strong:** the visual shell, journal-entry form, multi-entity model, dashboard.
- **Weak:** depth in every tax surface (5–10 labels each, real returns have 50+); chart of accounts has only 16 entries; persistence is `localStorage` only; no tests; Gemini API key is in the client bundle; tax math is duplicated across 4 components rather than centralised.

**User landscape.** Australian SME owners and tax agents who currently use spreadsheets or whose accounting tool subscription has lapsed. The closest commercial competitors (Xero, MYOB, QuickBooks Online, Reckon) all charge $30–$80/month per company. Free alternatives (GnuCash, Manager.io free tier) exist but are either UK/US-flavoured or weak on AU tax labels.

**Tax-domain landscape.** Australian tax returns are label-driven (each form is a list of labelled fields filled with aggregated GL data). Print-ready output that maps GL accounts to labels is genuinely useful — it's the same artefact a tax agent produces internally before final lodgement. ATO publishes label specs (NAT 0660, 0656, 0659, 0976) annually; currency matters.

**Audit-and-correctness posture.** This is software handling tax data. The bar for math correctness, reproducibility, and audit traceability is materially higher than the current prototype meets. Tests, schema versioning, and an actual immutable audit log are quality-floor requirements, not niceties.

## Constraints

- **Tech stack**: React 19 + TypeScript (~5.8) + Vite 6 + Tailwind v4 + motion + lucide + recharts — keep the existing stack to preserve the visual work and the running prototype. New dependencies should be open-source and run locally.
- **Distribution**: Open-source, self-hosted. Implies no required paid services in the core flow, no managed-cloud assumptions, no telemetry by default. A hosted demo for evaluation is fine; a hosted production tier is out.
- **Tax domain**: Australian only. Forms, labels, GST rules, PAYG mechanics, financial-year cadence (1 July – 30 June). Currency of label specs needs a reproducible refresh path.
- **Free**: No paid APIs in the critical path. AI features (if retained) must be optional and must not break a self-hosted instance that has no API key.
- **Audience parity**: Both consumer-owner and tax-agent personas must be first-class. Pick neither as second-class.
- **Compliance disclaimer**: Always-visible disclaimer that the product produces working papers / draft returns, not tax advice; the user/agent retains responsibility for the lodged return.
- **Persistence**: Must survive a browser cache clear. `localStorage`-only is not acceptable for v1.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Print-ready output, not direct ATO/SBR lodgement, in v1 | SBR is a multi-month compliance project before delivering any user value. Print-ready returns get the user from TB → ATO via myGov or via their agent — same outcome. | — Pending |
| Open-source, self-hosted distribution | Sustainability without ongoing hosting cost; aligns with "free" promise; sidesteps multi-tenant auth complexity in v1. | — Pending |
| All four entity types (Company, Trust, Sole trader/Individual, Partnership) in v1 | Every common AU SME structure should be served from day one; missing any one excludes a meaningful audience. | — Pending |
| Both consumer and tax-agent personas as first-class | The user explicitly chose this. It roughly doubles the v1 UX surface; we accept the cost in exchange for serving both audiences honestly. | ⚠️ Revisit — may need to re-scope after early phases prove the doubled cost |
| Hybrid workflow (opening TB + ongoing journals) | Realistic — most users will arrive with some books somewhere; pure "annual TB-in/return-out" misses the year; pure "ongoing GL" assumes too much upfront commitment. | — Pending |
| Guided wizards + smart defaults as the guidance model (not chatbot, not just tooltips) | Wizards are deterministic and inspectable; smart defaults reduce the work; an AI chatbot pulls in API-key, hallucination, and offline-self-host problems. | — Pending |
| Strip Gemini API key from client; AI features become optional | Critical security issue today; conflicts with self-hosted-without-paid-services constraint. | — Pending |
| Remove "Pearson Specter Litt / US Big Law Firm" seed and "ATO Connected (Simulated)" theatre | Off-mission and actively misleading for AU users. | — Pending |
| Keep React 19 + Vite + Tailwind v4 stack | The visual shell is already strong; rewriting wastes the existing leverage. | ✓ Good |

## Open Questions (To Resolve in Later Phases)

- **Auth on a self-hosted instance** — none, simple password, or full multi-user with roles? Likely "none for single-user instance, optional simple-password gate for shared instance" but worth a phase-level decision before building.
- **BAS/IAS treatment** — when the user said "lodge a tax return," does that include BAS lodgement workpapers? Current app has BAS calc; v1 should probably keep it print-ready as well.
- **Multi-client workspace shape for tax agents** — single instance with a client list, or one instance per client with a switcher? Affects data model and persistence design.
- **Tax-year currency mechanism** — how do label specs and rates get refreshed each financial year? Manual edit of constants is OK for v1; a documented refresh process needs to exist.
- **Persistence mechanism** — local file via File System Access API, SQLite via WASM, IndexedDB with mandatory export, or a self-hosted SQLite-backed Node server? Trade-off between "single-page-app simplicity" and "real durability".
- **PDF export library** — Vite-compatible, open-source, AU date/currency-friendly. Candidates worth evaluating: jsPDF, pdf-lib, react-pdf.
- **Test framework** — likely Vitest + React Testing Library given the stack; lock this in early so tests can land alongside features.

---
*Last updated: 2026-05-09 after initialization*
