# Project Research Summary

**Project:** AussieLedger
**Domain:** Self-hosted open-source Australian bookkeeping to tax-return SPA (brownfield)
**Researched:** 2026-05-10
**Confidence:** MEDIUM-HIGH

---

## Executive Summary

AussieLedger is a free, self-hosted, open-source tool that takes an Australian small business from "I have a trial balance" to "I have a print-ready working paper I can transcribe into myGov or hand to my tax agent." The product differentiates through zero cost, local data ownership, all four AU entity types without upsell, and a wizard-first guided path for non-accountants. These capabilities either do not exist in free alternatives (GnuCash, Manager.io) or are locked behind paid plans in commercial tools (Xero at ~$35-$85/month, MYOB at ~$29-$99/month). The existing codebase is a React 19 + Vite + Tailwind v4 prototype with a strong visual shell but demo-grade depth: 16 chart-of-accounts entries, 5-10 tax labels per form when real returns need 50+, localStorage-only persistence, and a Gemini API key embedded in the client bundle.

The recommended approach is a six-phase brownfield migration: stabilise the shell and add tests first (Phase 1), decompose the monolithic App.tsx and centralise all tax math into pure functions (Phase 2), replace localStorage with a durable thin Node/Express + SQLite server backed by an IndexedDB fallback (Phase 3), then build out the full product-feature surface -- CoA, bookkeeping core, BAS/IAS, income tax returns for all four entity types, print-ready output, year-end wizard, and dual persona modes (Phases 4-6). Each phase keeps the app working and visually unchanged. No phase is a rewrite. The server tier is opt-in; a single "npm run dev" with no server still works via IndexedDB fallback.

The three phase-1-blocking risks are: (1) localStorage will destroy user data on a cache clear and must be replaced before any real data can accumulate; (2) the Gemini API key is currently in the client bundle -- a critical security issue that must be moved server-side; (3) the "ATO Connected (Simulated)" indicator and the absence of a compliance disclaimer are regulatory risks under TASA that must be removed before any tax output feature ships. Beyond these blockers, the most invisible correctness risks are GST rounding using native JS floats (produces systematically wrong BAS totals) and the base-rate-entity company tax test (passive-income companies are taxed at 30%, not 25% -- the distinction is non-obvious and absent from the prototype).

---

## Key Findings

### Recommended Stack

The existing stack (React 19, TypeScript 5.8, Vite 6, Tailwind v4, motion, lucide, recharts) is strong and must not be replaced. The Express dependency is already installed but unused -- it is the intended server tier that was never built. Five additions are required:

**Core additions:**

- **Vitest + React Testing Library + jsdom** -- Vite-native test runner, zero extra config, TypeScript-native. RTL enforces user-centric queries correct for form-heavy tax UI. Must be installed before any tax math is written or refactored. Jest is the wrong choice: ESM/Vite friction makes it painful.
- **better-sqlite3 (server) + IndexedDB/idb (browser fallback)** -- durable persistence. The recommended architecture is a thin Express server with better-sqlite3 as primary data store; IndexedDB adapter as fallback when no server is running. This beats all alternatives: sql.js/WASM requires COOP/COEP cross-origin isolation headers non-trivial on VPS deployments; File System Access API is not supported in Firefox; pure IndexedDB cannot support a multi-client shared-VPS shape. better-sqlite3 is synchronous, zero-config, single-file, and the express+tsx+better-sqlite3 trio runs on Node 18+ on Linux/macOS/Windows without native compilation issues.
- **decimal.js (or big.js)** -- decimal arithmetic for all money calculations. Native JS number with /11 for GST produces rounding errors that accumulate across a BAS and produce wrong totals. This is a correctness blocker, not a nice-to-have.
- **@react-pdf/renderer** -- PDF export; React-component API; runs client-side; produces print-ready A4. Print CSS via @media print is acceptable for v1 and should precede PDF library work. Puppeteer is rejected -- requires headless Chrome + server.
- **Native Intl APIs** -- zero-dependency AU locale formatting: Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }) for AUD display; Intl.DateTimeFormat("en-AU") for DD/MM/YYYY dates. No date library needed unless FY/quarter logic warrants it.

**Remove from critical path:** @google/genai must never be in the client bundle. Move calls to server/routes/ai.ts (reads key from env var) or strip AI features entirely. AI features must be opt-in and must not break a serverless self-hosted instance.

**Version note:** All version numbers are sourced from training data (cutoff August 2025). Run "npm show <package> version" before each phase to confirm latest stable.

---

### Feature Taxonomy

#### Table Stakes -- must ship in v1 or the product feels broken

**Bookkeeping core:**

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Double-entry journal entry, debit=credit enforced at data layer (not just UI) | Low | Prototype has this but enforcement is UI-only |
| Chart of Accounts: 80-150 AU SME defaults, GST codes (GST/FRE/INP/N-T/CAP), ATO tax-label pre-mapping for all 4 entity types | Medium | Current 16 entries is insufficient; the pre-mapping is the highest-leverage single feature -- unlocks all tax return outputs without manual setup |
| Account hierarchy (parent/child groupings) | Medium | Users need "Total Operating Expenses", not 40 flat lines |
| Edit and reverse posted journal entries with immutable audit trace | Medium | Reversal must leave an audit record |
| Opening TB import: deterministic CSV/Excel parser with column-mapping UI | High | Current AI-only path is fragile; deterministic path must be primary |
| Trial balance report with consistent AU financial year period model (1 Jul - 30 Jun) | Low | Period model must be applied consistently across all reports |
| Durable persistence that survives browser cache clear | High | localStorage-only is a critical failure |

**Entity management (Low complexity):**
- All four AU entity types: Company (Pty Ltd), Trust, Sole Trader/Individual, Partnership
- ABN (11-digit, modulus-89 checksum) and TFN (9-digit) fields with AU-format validation
- GST registration flag (drives BAS requirement)
- Accounting method flag: cash vs accruals (affects G1/G3 reporting)

**Tax outputs -- BAS/IAS (Medium complexity):**
- BAS: G1, G2, G3, G10, G11, 1A, 1B (GST section); W1, W2 (PAYG withholding); T7 (PAYG instalment)
- IAS: PAYG-only periods for non-GST-registered entities
- Period selection: monthly/quarterly matching ATO-prescribed boundaries (Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun)
- Print-ready BAS/IAS summary with ATO field labels and codes; no UI chrome in print output

**Tax outputs -- income tax returns:**

| Form | Complexity | Key challenge |
|------|-----------|---------------|
| Individual (Form I / NAT 0660) business schedule: items 1, 6, 15, P1, P2, P8 | High | All business schedule labels, not just 5-10 |
| Company (Form C / NAT 0656): gross sales, total expenses, taxable income, BRE tax rate, franking account | High | BRE test required -- see pitfalls below |
| Trust (Form T / NAT 0659): trust income, deductions, beneficiary distribution schedule | Very High | Distributions must reconcile to trust net income; streaming disclaimer required |
| Partnership (Form P / NAT 0976): income/loss, partner distribution statements with share percentages | High | Partner share percentages must be maintained |
| FY-versioned tax rate/threshold constants | Low | Never magic numbers: 25% BRE / 30% standard company; individual brackets + Medicare levy + LITO |

**Guidance and quality floor (Medium complexity):**
- In-context plain-English help on every ATO label
- Anomaly flags: unbalanced TB, unmapped accounts, GST mismatches -- surfaced in-context at the point of the problem
- Compliance disclaimer: persistent, non-dismissable on every tax output page -- not a click-through
- Audit trail: immutable per-entry log of create / edit / reverse actions
- Data export: JSON + CSV

#### Differentiators -- competitive advantage, should ship v1

| Feature | Complexity | Notes |
|---------|-----------|-------|
| Guided year-end wizard (owner mode) | High | Sequenced: review unmapped accounts -> confirm GST -> preview return -> attest -> finalise; wizard-first; skippable for agent mode |
| Both personas in one tool, mode-switched | Medium | Consumer: simplified nav, wizard-first. Agent: multi-client list, fast switch, no hand-holding. Mode is a local instance setting, not a paywall. |
| Completely free, self-hosted, all four entity types | Low (policy) | No subscription, no seat limits, no trust/partnership upsell |
| ATO-labelled print-ready outputs with ATO field codes | High | "Gross business income (6S): $142,000" -- agents can use directly as lodgement source |
| Hybrid workflow: import opening TB + ongoing journals | Medium | Meets the lapsed-subscription segment where they are |
| Tax-year versioning of rates/thresholds | Medium | FY-tagged label files, changelogs, documented annual refresh process |

#### Anti-features -- explicitly out of scope (do not let these sneak back in)

| Anti-Feature | Why excluded |
|---|---|
| SBR / direct ATO lodgement | ATO developer registration + certification is multi-month before any user value; print-ready achieves the same user outcome |
| Bank feeds / Open Banking | Paid APIs (Basiq, Yodlee), CDR accreditation, PCI-adjacent security; conflicts with self-hosted + free constraint |
| Bank statement CSV parsing + transaction reconciliation | Second product surface; not on the TB -> tax critical path |
| AI chatbot | API key in client bundle, hallucination risk on tax advice, breaks offline instances; wizards + smart defaults achieve the same goal deterministically |
| Invoicing, AR/AP, inventory, payroll | None on the TB -> tax return critical path |
| FBT, Division 7A, CGT, rental schedules, R&D | Specialist surfaces; v2+ modules after core forms are solid; document as known gaps |
| Multi-tenant hosted SaaS | Conflicts with self-hosted + free ethos |
| Foreign entity support | AU-only; remove "Pearson Specter Litt / US Big Law Firm" seed entity immediately |
| "ATO Connected" indicator | Simulated version is actively misleading; real version requires SBR; remove entirely |

---

### Architecture Approach

The target architecture is a thin optional server + thick client: a React SPA that runs entirely in-browser for single-user local use, backed by a lightweight Node/Express server that adds durable SQLite persistence, Gemini proxying, and multi-client workspace support when opted in. Both shapes share identical front-end code. The storage layer is hidden behind a StorageAdapter interface that selects ServerAdapter (HTTP -> better-sqlite3) or LocalAdapter (IndexedDB fallback) at startup via a 500ms health-probe race. All tax math lives in pure TypeScript functions in src/lib/tax/ with no React imports -- testable without a DOM, and a single fix propagates to all four entity-type return components.

**Major components:**

1. **Shell** -- layout, sidebar/bottom-nav, mode preference (consumer vs agent), entity context header
2. **Ledger** -- journal entry CRUD, Chart of Accounts CRUD, Trial Balance, period filtering
3. **Tax** -- return assembly per entity type, BAS/IAS, PDF export; reads from storage via lib/tax/ pure functions; never writes its own state
4. **Wizard** -- year-end guided workflow: step sequencing, anomaly flagging, CoA mapping review
5. **StorageAdapter** -- unified interface switching between LocalAdapter (IndexedDB) and ServerAdapter (HTTP) at startup via 500ms health-probe
6. **lib/tax/** -- pure functions: label rollup per entity type, GST calc, BAS aggregation, tax bracket math; fully Vitest-testable without a DOM
7. **lib/period/** -- AU FY / quarter / custom range logic; every date default in the app derives from this module; no new Date(year, 0, 1) hardcodes anywhere
8. **Server (optional)** -- Express + better-sqlite3; REST API, Gemini proxy, optional PIN auth
9. **server/db/migrations/** -- numbered .sql files; runs in order on startup; self-hosters upgrade with git pull && node server/index.js

**Patterns to enforce:**
- Storage Adapter interface: no component ever calls localStorage, indexedDB, or fetch directly -- enables MockAdapter in tests and makes the IndexedDB -> SQLite migration a single-file swap
- Pure tax engine in lib/tax/: components are thin render layers calling rollup() functions -- never contain their own rollup logic
- Schema-versioned migrations: every persisted type carries _v: number; migration registry maps v{N} -> v{N+1}; self-hosters upgrade automatically on server start
- Decimal arithmetic everywhere: all money uses decimal.js; no native number in financial calculations

**Anti-patterns to actively avoid:**
- All state passed as props from App.tsx (currently 1,126 lines -- target ~200 lines after hook extraction)
- Tax logic inside components (currently duplicated across 4 return components)
- Migration-less schema changes
- Per-entity CoA forks without a base template (150 accounts x 20 clients = 3000 rows of manual maintenance)
- ATO connectivity theatre ("ATO Connected" badge, simulated indicators)

---

### Critical Pitfalls

#### Phase-1-blocking (must resolve before any real user data can accumulate)

1. **localStorage data loss** -- cache clear destroys all accounting records permanently with no recovery; Chrome storage eviction can occur silently under disk pressure; ~5 MB cap will be hit; no schema version means code updates silently corrupt deserialized data. Prevention: replace with IndexedDB + server SQLite via StorageAdapter; add _v schema version to all persisted types; prominent Export action in main nav; confirm-plus-export required before any entity deletion.

2. **Gemini API key in client bundle** -- key is in the Vite define config and appears in compiled JS; any user who opens DevTools can extract it; quota theft is trivial. Prevention: move all @google/genai calls to server/routes/ai.ts; key reads from process.env; client never sees it; AI features disabled when no server is running.

3. **"ATO Connected (Simulated)" + absent compliance disclaimer** -- the indicator implies ATO registration and real-time submission capability; it is a TASA/TPB regulatory risk, not a cosmetic cleanup; the absent disclaimer means users may treat working papers as lodgement-ready. Prevention: remove indicator entirely in Phase 1; add persistent non-dismissable disclaimer to every tax output page; never use "lodge", "submit", or "ATO Connected" copy anywhere.

#### Tax-correctness pitfalls (invisible until they produce wrong returns)

4. **GST rounding with native JS floats** -- /11 inline on each journal line without per-line rounding accumulates floating-point errors; a BAS with 200 transactions can be out by $1-$3, triggering ATO reconciliation flags. Additionally, FRE (GST-free) and INP (input-taxed) are distinct classifications with different effects on G11 and input-tax-credit clawback -- collapsing them into a single "no GST" code produces wrong BAS totals. Prevention: all money arithmetic through decimal.js; add INP as a first-class GST code; BAS aggregation follows ATO field-by-field logic; unit tests with fixture transactions including GST-free, input-taxed, and standard-rated lines.

5. **Base-rate-entity company tax rate** -- the 25% small-company rate only applies if passive income (dividends, interest, rent, royalties, capital gains) is less than 80% of assessable income; a passive-income-dominated company is taxed at 30%. Applying 25% unconditionally overstates refunds or underpays tax by 5 percentage points on full taxable income. Prevention: company return wizard asks for passive income percentage; rate is derived from the BRE test, not hardcoded; shown explicitly on return summary with its basis; unit test: 90% dividend income -> 30% rate applied.

6. **Stale ATO label specs** -- labels, field names, and section headings change every financial year; using prior-year labels means users transcribe values into the wrong myGov fields. Prevention: all label strings in a single versioned file src/lib/tax/labels/fy{YYYY}.ts; each file tagged to its FY; source commented with NAT reference; documented annual refresh process before each FY-end release.

7. **Trust streaming omission** -- v1 implements simple "net income / beneficiary %" distributions; ATO streaming rules (post-2010) allow specific income classes (franked dividends, capital gains) to be streamed to specific beneficiaries; wrong streaming treatment can invalidate the tax-effectiveness of a distribution (top-rate trustee tax at 47% instead of beneficiary rates). Prevention: v1 explicitly does not support streaming; mandatory disclaimer on every trust return output; data model must store income-type breakdowns on beneficiary distribution records so streaming can be added in v2 without a breaking migration.

---

## Implications for Roadmap

### Suggested Phase Structure

The six-phase structure below is derived from the architecture research migration order, constrained by the feature dependency graph and the three phase-1-blocking pitfalls. The ordering constraint is strict: each phase unblocks the next.

---

### Phase 1: Foundation -- Safety Net and Cleanup

**Rationale:** Three blocking risks (localStorage, API key, regulatory theatre) must be cleared before any user data accumulates and before the codebase is safe to extend. This phase delivers no visible new product features but makes everything that follows safe and testable.

**Delivers:**
- Vitest + React Testing Library + jsdom installed, CI passing (lint + test + build on every push)
- ESLint 9 flat config + Prettier configured
- "ATO Connected (Simulated)" indicator removed entirely
- "Pearson Specter Litt / US Big Law Firm" seed entity and all US demo content removed
- Hard-coded trend strings removed
- Compliance disclaimer infrastructure: persistent, non-dismissable on every tax output page
- Gemini API key removed from client bundle (proxied via server or AI stripped from critical path)
- _v schema version field added to all persisted types in src/types.ts
- ABN checksum validation (modulus-89) and TFN format validation on entity form

**Pitfalls addressed:** Pitfalls 2 (TPB/regulatory), 7 (localStorage -- schema version groundwork), 9 (ABN/TFN validation), 14 ("ATO Connected" theatre), API-key security mistake.

**Research flag:** Standard patterns -- no deeper research needed.

---

### Phase 2: Decompose and Centralise -- Shell and Tax Engine

**Rationale:** App.tsx is currently 1,126 lines with all state as props-drilling. Before the storage adapter can be introduced, state must be lifted into custom hooks. Simultaneously, tax math must be extracted to pure functions in lib/tax/ so it can be unit-tested independently and all four entity-type components share a single engine.

**Delivers:**
- useEntities, useJournals, useAccounts hooks extracted; App.tsx target ~200 lines
- Shell components extracted: Sidebar, Header, BottomNav
- Tax components moved to src/components/tax/ directory structure
- src/lib/tax/{individual,company,trust,partnership,bas}.ts pure function modules
- src/lib/period.ts: AU FY boundaries, quarter helpers, BAS period helpers -- all date defaults derive from this module; no new Date(year, 0, 1) hardcodes anywhere
- Vitest unit tests for each lib/tax/ rollup function with golden outputs verified against ATO instructions
- All financial calculations use decimal.js (never native number)
- Existing tax component behaviour visually identical after refactor

**Pitfalls addressed:** Pitfalls 1 (stale labels -- label files get FY tag at creation), 3 (GST rounding -- decimal.js introduced here), 6 (FY cadence -- period.ts introduced here), 8 (no tests on tax math), 13 (error visibility -- NaN assertions in all rollup functions).

**Research flag:** Standard patterns for hook extraction and pure function refactoring. Tax math content (correct label mappings per NAT form) requires ATO verification before golden test outputs can be signed off.

---

### Phase 3: Persistence -- StorageAdapter and Durable Storage

**Rationale:** With hooks owning state and tax math behind an interface, the storage layer can be replaced without touching components. This phase delivers the v1 durability guarantee.

**Delivers:**
- src/storage/adapter.ts -- StorageAdapter interface
- LocalAdapter wrapping existing localStorage (literal refactor) then internals swapped to IndexedDB + one-time migration from localStorage on first load
- server/ scaffold: Express + better-sqlite3 + numbered .sql migration runner + WAL mode
- ServerAdapter (HTTP fetch) with 500ms startup health-probe adapter selection
- JSON export/import route; prominent "Export data" action in main nav
- Schema migration round-trip test: v0 data loaded by current schema migrates correctly
- "npm run dev" (no server) -> IndexedDB fallback; "npm run dev:full" -> SQLite; both working
- Auth: optional PIN gate (hashed env var) for shared VPS instances

**Pitfalls addressed:** Pitfall 7 (localStorage data loss -- fully resolved), Pitfall 12 (schema migration -- migration runner in place).

**Research flag:** Express + better-sqlite3 + StorageAdapter is HIGH confidence -- standard for self-hosted TypeScript tooling. No deeper research needed.

---

### Phase 4: Bookkeeping Core -- CoA, Journals, TB, Import

**Rationale:** With a durable, testable foundation, the core bookkeeping surface can be built to v1 quality. The CoA with GST codes and tax-label pre-mapping is the prerequisite for everything in Phase 5 -- BAS G1/G10/G11 bucketing and all tax return label rollups depend on it.

**Delivers:**
- Default CoA: 80-150 AU SME accounts with GST codes and ATO tax-label pre-mapping for all four entity types -- "base template" model so per-entity copies are overlays, not full forks
- Account hierarchy: parent/child groupings with subtotal rows on trial balance
- Journal entry: create, edit, reverse, void with data-layer balance enforcement and full audit-log trace per action
- Opening TB import: deterministic CSV/Excel parser with column-mapping UI; AI-assisted matching becomes optional; idempotent re-imports
- Trial balance: date-range filtered using lib/period.ts consistently
- Beneficiary/partner register for Trust/Partnership entities (required by Phase 5 return assembly)
- Period model applied consistently to dashboard, TB, BAS, and tax outputs

**Pitfalls addressed:** Pitfall 6 (FY cadence -- period model applied to all reports), anti-pattern 4 (per-entity CoA forks).

**Research flag:** The CoA default account list and tax-label pre-mappings require ATO domain knowledge. Recommend a /gsd:research-phase step reviewing NAT 0660/0656/0659/0976 label sets and standard AU SME account structures before designing the seed data.

---

### Phase 5: Tax Outputs -- BAS, IAS, and All Four Return Types

**Rationale:** With bookkeeping core in place and pure tax functions already tested, tax return components become thin render layers. This phase completes the TB -> working paper pipeline for every AU entity type -- the core value delivery.

**Delivers:**
- BAS: G1, G2, G3, G10, G11, 1A, 1B, W1, W2, T7 -- correct GST code separation (FRE vs INP distinct), decimal arithmetic, ATO worksheet method
- IAS: PAYG-only output for non-GST-registered entities
- Individual return (Form I / NAT 0660): full business schedule -- items 1, 6, 15, P1, P2, P8; all labels mapped from CoA
- Company return (Form C / NAT 0656): BRE test wizard (passive income % -> 25% or 30% rate); rate shown with its basis on the return
- Trust return (Form T / NAT 0659): beneficiary distribution schedule; mandatory streaming disclaimer; income-type fields on distribution records for v2 streaming support
- Partnership return (Form P / NAT 0976): income/loss, partner distribution statements with share percentages
- FY-versioned label files (src/lib/tax/labels/fy2026.ts); documented annual refresh process
- Print-ready output: @media print CSS with ATO field codes alongside plain-English labels, ATO form order, no UI chrome in print, A4 verified; working-paper disclaimer on every printed page
- Golden-output unit tests for each return type verified against current ATO form instructions

**Pitfalls addressed:** Pitfalls 1 (stale labels), 3 (GST rounding -- already in place from Phase 2), 4 (BRE company tax), 5 (trust streaming -- disclaimer + data model placeholder), 10 (print layout usability).

**Research flag:** Trust return beneficiary distribution logic and the BRE passive-income test are non-obvious. Recommend a /gsd:research-phase step on these two topics before implementing Form T and Form C. Individual marginal rates and LITO phase-out thresholds must be verified against current-year ATO tables.

---

### Phase 6: Personas, Wizard, and Quality Polish

**Rationale:** With all four entity types producing correct print-ready output, the dual-persona UX layer and the year-end wizard can be built on top of the stable data model. This phase completes the v1 product.

**Delivers:**
- Consumer/owner mode: simplified nav, wizard-first entry points, plain-English labels with jargon as secondary
- Tax-agent mode: multi-client entity list, fast switching, compact data-dense views, no wizard overhead
- Mode is a local instance setting, not a paywall; stored via useAppMode hook
- Year-end preparation wizard: guided sequence -- review unmapped accounts -> verify GST codes -> confirm period -> preview return -> attest -> finalise; gates "finalise" behind verify-mappings step; never asks "is this deductible?" (only "what did you record?"); mandatory warnings on high-risk categories (motor vehicle, travel, meals, home office)
- Anomaly flags: unmapped accounts, unbalanced TB, GST mismatches surfaced in-context
- In-context plain-English help on every ATO label; describes what to put in the field, not whether it is deductible
- PDF export via @react-pdf/renderer (upgrades print-CSS baseline from Phase 5)
- Diagnostic export: JSON package for GitHub issue reporting; no telemetry by default
- README: TPB boundary statement, AU-only scope, self-hosting instructions, VPS deployment guide

**Pitfalls addressed:** Pitfall 11 (wizard leading to wrong deductions), UX pitfalls on jargon and gating finalise behind mapping verification.

**Research flag:** Wizard step sequence and wording of in-context help for high-risk expense categories benefit from a /gsd:research-phase reviewing ATO guidance on common small-business deduction mistakes. Verify @react-pdf/renderer React 19 compatibility before install.

---

### Phase Ordering Rationale

- Phase 1 before everything: Three blocking risks must be cleared before any user data accumulates.
- Phase 2 before Phase 3: StorageAdapter hooks depend on custom hooks (useJournals etc.) existing; pure tax functions must be in lib/tax/ before they can be tested without a DOM.
- Phase 3 before Phase 4: Journal edit/reverse, beneficiary register, and CoA expansion all write to persistence; they must use the StorageAdapter, not localStorage directly.
- Phase 4 before Phase 5: BAS G1/G10/G11 bucketing and all tax return label rollups require CoA with GST codes and tax-label mappings. Trust/Partnership returns require beneficiary/partner registers.
- Phase 5 before Phase 6: The year-end wizard preview step requires the tax return components to exist and be correct.
- Both personas deferred to Phase 6: Mode is a rendering concern -- both modes read/write identical underlying data. If scope must be cut, Phases 1-5 deliver a complete correct single-mode tool and the dual-persona layer is additive.

### Cross-Cutting Tensions the Roadmapper Must Weigh

1. **All four entity types in v1 doubles tax-form scope.** Four separate form assemblies, four label files, four sets of golden tests, and significantly different distribution logic for Trust and Partnership. Trust return is the highest-complexity form (streaming disclaimer, beneficiary schedule, net-income reconciliation). Phase 5 is the largest phase and will likely require multiple sprints.

2. **Both personas first-class doubles UX scope.** PROJECT.md accepts this cost but flags it as a revisit point. The recommended mitigation is deferring all persona and wizard work to Phase 6 so that if scope must be cut, a complete correct single-mode tool is already delivered by Phase 5.

3. **Print-ready vs PDF library.** @react-pdf/renderer requires a separate layout model from the screen UI (no Tailwind classes). Recommendation: use @media print CSS in Phase 5; introduce the library in Phase 6 as an upgrade. Browser "Print to PDF" is sufficient for v1.

4. **Tests-first creates short-term friction.** Installing Vitest and writing golden-output tests before building features slows Phases 1-2 visibly. Hold the line: a tax tool without tests on its tax math is actively harmful because users will trust it.

5. **Optional AI features.** The Gemini proxy enables AI-assisted account matching in TB import. Must be optional and explicitly disabled in the no-server shape. The deterministic wizard path must work fully without AI.

---

### Research Flags

**Needs deeper research before phase begins:**
- Phase 4 (CoA and tax-label pre-mapping): correct mapping of 80-150 AU SME account names to NAT form labels for all four entity types. Recommend /gsd:research-phase reviewing NAT 0660/0656/0659/0976 label sets and MYOB/Xero default CoA structures.
- Phase 5 (Trust and Company returns): trust streaming boundaries and BRE passive-income test are non-obvious. Recommend focused research on these two topics before building Form T and Form C.
- Phase 6 (PDF library): verify @react-pdf/renderer React 19 compatibility before committing.

**Standard patterns (skip research-phase):**
- Phase 1: Cleanup and tooling -- ESLint, Vitest, CI setup are well-documented, HIGH confidence.
- Phase 2: Hook extraction, pure function refactoring, decimal.js -- standard React refactoring patterns.
- Phase 3: Express + better-sqlite3 + StorageAdapter -- HIGH confidence, standard for self-hosted TypeScript tooling.
- Phase 6 (persona modes): Mode is a rendering concern; useAppMode hook pattern is straightforward.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Existing stack HIGH (direct package.json inspection). Additions (Vitest, better-sqlite3, decimal.js) HIGH. @react-pdf/renderer React 19 compat MEDIUM -- verify before Phase 6. Version numbers need npm show verification before each phase. |
| Features | HIGH | AU tax domain is stable and well-understood. ATO form structures (NAT 0656/0660/0659/0976) published annually. Individual marginal rates / LITO MEDIUM -- verify against current ATO tables each FY. Competitor pricing MEDIUM -- may have changed. |
| Architecture | HIGH | Based on direct codebase analysis (App.tsx at 1,126 lines, package.json, CONCERNS.md). Thin-server + StorageAdapter + pure-tax-engine pattern is established for self-hosted TypeScript tooling. IndexedDB durability semantics confirmed from MDN/Chromium spec. |
| Pitfalls | MEDIUM-HIGH | AU tax domain pitfalls (GST rounding, BRE test, trust streaming, FY cadence) HIGH from domain knowledge. TPB/TASA regulatory framing MEDIUM -- verify at tpb.gov.au. ATO label change frequency MEDIUM -- requires annual verification. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address During Planning

- **TPB/regulatory framing:** Verify current TPB guidance at tpb.gov.au before finalising disclaimer language. Confirm a free, open-source, self-run tool does not require TPB registration for the tool itself.
- **Individual marginal rates and LITO thresholds for FY2026:** Flag for verification against current ATO tax tables before building the individual return rollup.
- **@react-pdf/renderer React 19 compatibility:** Run "npm show @react-pdf/renderer version" and check GitHub issues before committing to it in Phase 6.
- **CoA default account list:** The 80-150 AU SME default accounts and their tax-label pre-mappings need to be derived from ATO return instructions and current-year CoA structures. This is Phase 4's highest-risk design decision.
- **Trust streaming v1 scope:** The disclaimer wording and data model placeholder fields need to be specified precisely before Phase 5 begins.
- **Auth on shared VPS instance:** PROJECT.md flags this as open. The recommended v1 approach is optional PIN gate (hashed env var); confirm this is acceptable before building server auth in Phase 3.

---

## Sources

### Primary (HIGH confidence)
- .planning/PROJECT.md -- project scope, constraints, key decisions, open questions
- .planning/codebase/CONCERNS.md -- direct codebase quality analysis
- src/App.tsx (1,126 lines), src/types.ts, src/constants.ts, package.json -- direct inspection
- ATO form specifications: NAT 0656 (Company), NAT 0660 (Individual), NAT 0659 (Trust), NAT 0976 (Partnership) -- stable AU tax domain
- ATO BAS worksheet method (NAT 7392) -- stable
- ATO company tax rates FY2025-26 (25% BRE / 30% standard) -- confirmed
- ATO GST classification codes (FRE, INP, N-T, GST, CAP) -- stable
- MDN Intl API (ECMA standard) -- stable
- MDN IndexedDB durability semantics -- stable

### Secondary (MEDIUM confidence)
- ATO individual marginal rates FY2025-26 -- training data; verify against current ATO tax tables before building individual return
- ATO Base Rate Entity rules -- Tax Laws Amendment (Enterprise Tax Plan) Act 2017; $50M threshold current but verify annually
- ATO Trust streaming rules -- Tax Laws Amendment (2011 Measures No. 5) Act 2011, Subdivision 207-B ITAA 1997
- Vitest, React Testing Library, better-sqlite3, @react-pdf/renderer documentation -- training data (cutoff August 2025); run "npm show <package> version" before install
- Competitor pricing (Xero, MYOB, QuickBooks) -- training data; may have changed
- TPB/TASA regulatory requirements -- training data; verify at tpb.gov.au

### Tertiary (LOW confidence)
- @electric-sql/pglite -- newer project; rejected on complexity grounds; not evaluated further
- ATO ABN checksum algorithm -- documented at abr.business.gov.au; implementation is straightforward but verify before shipping

---

*Research completed: 2026-05-10*
*Ready for roadmap: yes*
