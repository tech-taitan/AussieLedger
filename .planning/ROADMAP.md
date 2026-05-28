# Roadmap: AussieLedger

**Created:** 2026-05-10
**Granularity:** Standard (6 phases)
**Coverage:** 70/70 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Safety Net** — Remove regulatory theatre, install test infrastructure, lock in decimal arithmetic and schema versioning before any user data accumulates (completed 2026-05-10)
- [x] **Phase 2: Decompose and Tax Engine** — Break up the monolithic App.tsx, extract pure tax functions into a shared lib, remove AI key from client bundle, introduce period model (completed 2026-05-10)
- [x] **Phase 3: Durable Persistence** — Replace localStorage with a StorageAdapter backed by IndexedDB (no-server) and SQLite (server); add export/import (completed 2026-05-12; FND-02 CSV per-report exports deferred to Phases 4 + 5 per 03-UAT.md)
- [x] **Phase 4: Bookkeeping Core** — Full 80–150 account CoA with GST codes and tax-label pre-mapping, complete journal CRUD, TB import, entity management with AU-specific fields (completed 2026-05-13; 23/23 requirements delivered + 28-step UAT all pass + goal-backward PASS per 04-UAT.md)
- [ ] **Phase 5: Tax Outputs** — All four AU return types (Individual, Company, Trust, Partnership), BAS/IAS, and print-ready working-paper output
- [ ] **Phase 6: Personas, Wizard, and Deployment** — Dual consumer/agent modes, year-end preparation wizard, anomaly flags, in-context help, and open-source deployment polish

---

## Phase Details

### Phase 1: Safety Net

**Goal:** The codebase is safe to build on — misleading ATO theatre is gone, Vitest runs in CI with at least one golden test per return type, decimal arithmetic is installed, and a schema version field exists on every persisted type

**Depends on:** Nothing (first phase)

**Requirements:** FND-05, FND-06, FND-07, FND-08, FND-09, ENT-02, DEP-05

**Success Criteria** (what must be TRUE):
1. No page in the running app shows "ATO Connected", "ATO Connected (Simulated)", "Pearson Specter Litt", "US Big Law Firm", or any hard-coded percentage trend string
2. A persistent, non-dismissable working-paper disclaimer is visible on every tax output surface ("AussieLedger produces a working paper only. It is not tax advice...")
3. `npm run test` runs Vitest in CI (GitHub Actions) and passes; there is at least one golden-output test per tax return type (Individual, Company, Trust, Partnership) and per-label tests for BAS arithmetic
4. `decimal.js` (or equivalent) is installed and used for all monetary arithmetic; no bare `/11` or float multiplication remains in financial calculations
5. Every persisted type in `src/types.ts` carries a `_v: number` schema-version field; a migration runner stub exists ready to be wired to real migrations in Phase 3
6. The Entity form validates ABN (11-digit modulus-89 checksum) and TFN (format-only check) with inline feedback before save

**Plans:** 3/3 plans complete
- [ ] 01-1-PLAN.md — Wave 0 foundations (deps install, vitest config, money/validation/migrations libs, DisclaimerFooter/PdfGate/MigrationError components, fixtures, CI workflow, schema-version field, all test scaffolds)
- [ ] 01-2-PLAN.md — App.tsx demolition: remove ATO theatre, slide generator, demo seeds; replace audit-log user; mount disclaimer footer; wire migration runner + MigrationError gate (Wave 1)
- [ ] 01-3-PLAN.md — EntityForm: wire ABN modulus-89 inline warning (warn-but-allow); AU-only entity-type select; verify zero TFN/EIN references (Wave 1, parallel with 01-2)

---

### Phase 2: Decompose and Tax Engine

**Goal:** App.tsx is a thin orchestrator, all tax math lives in pure testable functions in `lib/tax/`, the Gemini API key is removed from the client bundle, and a canonical AU period module drives all date defaults

**Depends on:** Phase 1

**Requirements:** FND-04, TAX-01, TAX-03, TAX-04, TAX-05, BOOK-08, BOOK-10

**Success Criteria** (what must be TRUE):
1. `src/App.tsx` is ≤ 250 lines; `useEntities`, `useJournals`, and `useAccounts` hooks exist and own their respective state; shell components (Sidebar, Header, BottomNav) are extracted into `src/components/shell/`
2. `src/lib/tax/{individual,company,trust,partnership,bas}.ts` exist as pure functions with no React imports; Vitest unit tests cover each rollup function with golden outputs verified against ATO instructions
3. All tax-rate and threshold constants live in a single FY-versioned module (`src/lib/tax/labels/fy2026.ts`); no magic numbers remain in any component
4. Every account in the default CoA has a pre-set GST code from the AU set (GST, FRE, INP, N-T, CAP) and a tax-label mapping for every relevant entity type; users can override these mappings in the CoA editor
5. `src/lib/period.ts` exists; every date-range default in the app derives from it; no `new Date(year, 0, 1)` or December 31 hardcodes remain; BAS quarter boundaries match ATO-prescribed periods
6. A self-hosted instance started with no `GEMINI_API_KEY` configured runs fully — no broken pages, no console errors — because AI features are optional and gated

**Plans:** 4/4 plans complete
- [x] 02-1-PLAN.md — Wave 0 foundations: types/constants widened, tax engine modules + fy2026 labels + period + ai + import/match + v1-to-v2 migration body, all test scaffolds (RED-by-design hooks/components/structural tests handed to plans 02-2/02-3/02-4) [COMPLETE 2026-05-10]
- [x] 02-2-PLAN.md — Hooks: useAuditLog, useAccounts, useJournals, useEntities (Wave 1) [COMPLETE 2026-05-10]
- [ ] 02-3-PLAN.md — Tax-component migrations to compute*; ImportTB AI gating + deterministic fuzzyMatch; AccountManager partnership column + Review-needed banner (Wave 1, parallel with 02-2)
- [ ] 02-4-PLAN.md — App.tsx demolition (≤ 250 lines); shell + EntityCard + MasterDashboard + ViewRouter extraction; migration 1→2 registered; structural lints enabled (Wave 2)

---

### Phase 3: Durable Persistence

**Goal:** User data survives a browser cache clear in both deployment shapes; the StorageAdapter interface hides the underlying store from all components and hooks; JSON export/import works end-to-end

**Depends on:** Phase 2

**Requirements:** FND-01, FND-02, FND-03, DEP-02

**Success Criteria** (what must be TRUE):
1. After a user enters journals and clears the browser cache (cookies + site data), the data is still present on next load — either from IndexedDB (no-server shape) or SQLite (server shape)
2. A prominent "Export data" action in the main navigation produces a complete JSON file containing all entities, journals, accounts, and audit logs
3. A user can import a previously-exported JSON file on a fresh instance and restore all data exactly
4. `npm run dev` (no server) starts successfully with IndexedDB as the persistence backend; `npm run dev:full` (Vite + Express server) starts successfully with SQLite as the persistence backend; both produce working apps
5. A schema migration round-trip test passes: data serialised in v0 format is correctly upgraded to the current schema by the migration runner without data loss

**Plans:** 4 plans (Wave 0 + 2 + 2 + 3)
- [x] 03-1-PLAN.md — Wave 0: deps install, StorageAdapter interface (FINAL 12 methods incl. saveAuditLogs), shared Zod schemas, fake-indexeddb setup, 17 Wave-0 test scaffolds, server vitest config [COMPLETE 2026-05-11]
- [x] 03-2-PLAN.md — LocalAdapter (IndexedDB via idb), legacy-localStorage migration, adapter selection probe, 4-hook refactor, main.tsx initAdapter wiring (Wave 2, parallel with 03-3) [COMPLETE 2026-05-11]
- [x] 03-3-PLAN.md — Express + better-sqlite3 server (server/), REST routes per collection with transactional whole-collection replace, Zod validation, 001-initial.sql migration runner, ServerAdapter (HTTP) replacing 03-2 stub, Gemini AI proxy + IS_AI_ENABLED widening, ImportTB.tsx moves to /api/ai/match-accounts (Wave 2, parallel with 03-2) [COMPLETE 2026-05-11]
- [x] 03-4-PLAN.md — DataPage UI (Export, Import with REPLACE confirmation, status line), Sidebar Data nav entry, ViewRouter routes data view, vite.config.ts /api proxy, README dual-shape docs + Windows VS Build Tools prereq, human-verify checkpoint (Wave 3) [COMPLETE 2026-05-12; Task 3 UAT approved, all 8 manual checks passed]

---

### Phase 4: Bookkeeping Core

**Goal:** Users can manage a complete Australian SME chart of accounts, record and edit journals with full audit history, import an opening trial balance from CSV/XLSX, and view a correctly-period-filtered trial balance

**Depends on:** Phase 3

**Requirements:** BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, BOOK-09, BOOK-11, BOOK-12, ENT-01, ENT-03, ENT-04, ENT-05, ENT-06, ENT-07, ENT-08, IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06

**Success Criteria** (what must be TRUE):
1. A user can browse a default CoA of 80–150 Australian SME accounts grouped under parent headings (e.g. "Operating Expenses" → "Rent", "Utilities"); parent rows show subtotals on the trial balance
2. A user can create a journal entry, post it, then edit or reverse it; the original and reversal both appear in the immutable audit trail with before/after values and timestamps
3. A user can upload a CSV or XLSX trial balance, use the column-mapping UI to confirm column choices, match unrecognised accounts to the internal CoA (or create new ones), and post an opening-balances journal — without needing an AI API key
4. Re-uploading the same CSV does not create duplicate opening-balance journals (idempotent import)
5. A Trust entity carries a beneficiary register (name + share); a Partnership entity carries a partner register (name + percentage); these registers are used by Phase 5 return assembly

**Plans:** 4 plans (Wave 0 + 2 + 2 + 3) — planned 2026-05-12
- [x] 04-1-PLAN.md — Wave 0: deps install (papaparse@^5.5.3, xlsx@0.20.3 via SheetJS CDN), v2→v3 additive migration, 127-row base CoA + 4 per-type overlays + getDefaultCoaFor resolver, src/lib/ledger.ts posting engine (validateBalanced/makeReversal/makeSupersedingEdit/searchJournals), src/lib/import/{csv,xlsx,fingerprint}.ts wrappers, 12 hook/component test scaffolds (4 tasks) [COMPLETE 2026-05-12; 296 SPA GREEN, +47 new GREEN, +69 new todos, 18 server unchanged]
- [x] 04-2-PLAN.md — Wave 2 (parallel with 04-3): useJournals lifecycle (postDraft/editPosted/reversePosted/voidDraft/searchJournals); JournalForm Edit+Reverse + banner + EditJournalDiff; JournalSearch panel; TrialBalance period-filter + parent subtotals + status-aware exclusion; AuditTrail widened (3 tasks) [COMPLETE 2026-05-12; 4 commits; +27 GREEN]
- [x] 04-3-PLAN.md — Wave 2 (parallel with 04-2): useAccounts/useEntities extensions (archive, isDefault, isAccountInUse, tryDeleteEntity, beneficiary/partner writers, CoA seeding on entity creation); AccountManager + CoaTreeView refactor + GST 'ITS'→'INP' typo fix; EntityForm AU-4 + GST/method/FY-end + Block-or-Archive delete; BeneficiaryRegister + PartnerRegister components (3 tasks) [COMPLETE 2026-05-12; 4 commits; +33 GREEN]
- [x] 04-4-PLAN.md — Wave 3: ImportTB refactor (PapaParse + xlsx CE + XlsxSheetPicker auto-select + ImportReviewPane row-level review + Skip/Replace/Add-additional fingerprint dialog + onReplace prop for TB-correct supersession + AI-assist gate preserved) + useJournals.supersedeImport helper; manual UAT covering all 5 success criteria + 23 reqs (2 auto tasks + 1 human-verify) [COMPLETE 2026-05-13; 3 commits; +17 GREEN; UAT all 28 steps PASS]

---

### Phase 5: Tax Outputs

**Goal:** Every Australian entity type produces a correct, print-ready working paper that a user can hand to their tax agent or transcribe into myGov; BAS and IAS cover all required GST and PAYG labels using decimal arithmetic

**Depends on:** Phase 4

**Requirements:** BAS-01, BAS-02, BAS-03, BAS-04, BAS-05, BAS-06, TAX-02, IND-01, IND-02, IND-03, IND-04, COY-01, COY-02, COY-03, TRT-01, TRT-02, TRT-03, PSP-01, PSP-02 *(IND-04 re-scoped from obsoleted COY-04 in 05-CONTEXT 2026-05-13)*

**Success Criteria** (what must be TRUE):
1. A BAS produced for a period with a mix of GST-taxable, GST-free (FRE), and input-taxed (INP) transactions shows correct values for G1, G2, G3, G10, G11, 1A, 1B, W1, W2, and T7; the totals match a hand-calculated reference to the cent
2. A Company return shows the tax rate (25% or 30%) derived from the Base Rate Entity test with its basis stated explicitly ("25% applied — passive income below 80% threshold"); a unit test confirms a 90%-dividend-income company triggers 30%
3. A Trust return includes a per-beneficiary distribution statement that reconciles to the trust's net income; a mandatory streaming disclaimer is visible on the output
4. An Individual return populates all business-schedule labels (P1, P2, P8, item 15) from the entity's GL and calculates marginal-rate tax payable using FY-versioned brackets including LITO and Medicare levy
5. The print output (via browser print or `@media print` CSS) for any return type shows ATO field codes alongside plain-English labels (e.g. "Gross business income (6S): $142,000"), contains the working-paper disclaimer, and contains no screen UI chrome (sidebar, nav buttons, hover states)

**Plans:** 4 plans (Wave 0 + 2 + 2 + 3) — planned 2026-05-13
- [x] 05-1-PLAN.md — Wave 0: v3→v4 additive migration (Entity.aggregatedTurnover + paygInstalmentAmount); FY2026 rate helpers (marginal post-Stage-3 / LITO / Medicare / BRE / smallBizOffset for IND-04); 3 in-repo corrections (NAT comments + BRE legislative cite + REQUIREMENTS verification); shared print primitives (PrintBanner / AnomalyBadge / AssumptionsBlock / print.css); 26 test scaffolds (5 tasks) [COMPLETE 2026-05-28; 455 SPA GREEN, +84 new GREEN, 80 todos, 0 RED; lint + build EXIT 0]
- [x] 05-2-PLAN.md — Wave 2 (parallel with 05-3): computeIndividualReturn (Form I + B&P + LITO + Medicare + IND-04) + computeCompanyReturn (Form C + BRE 25%/30% + franking) + TaxReturnAssistant refactor + CompanyTaxReturn refactor + EntityForm widening (3 tasks) [COMPLETE 2026-05-28; +29 GREEN (7 individual + 7 company + 6 TaxReturnAssistant + 7 CompanyTaxReturn + 2 EntityForm); success criteria #2 + #4 locked; lint + build EXIT 0]
- [x] 05-3-PLAN.md — Wave 2 (parallel with 05-2): computeTrustReturn (Form T + per-beneficiary distribution + mandatory streaming disclaimer) + computePartnershipReturn (Form P + per-partner distribution) + TrustTaxReturn refactor + PartnershipTaxReturn new (3 tasks) [COMPLETE 2026-05-28; +27 GREEN (10 trust + 7 partnership + 6 TrustTaxReturn + 4 PartnershipTaxReturn); success criterion #3 locked; lint + build EXIT 0]
- [ ] 05-4-PLAN.md — Wave 3: computeBas (Simpler BAS with G1/1A/1B/W1/W2/T7 lodgement + G2/G3/G10/G11 internal-only) + computeIas + BasIasAssistant refactor + ViewRouter wiring + Print-button audit; manual UAT checkpoint covering all 5 success criteria + 19 working reqs (2 auto tasks + 1 human-verify)

---

### Phase 6: Personas, Wizard, and Deployment

**Goal:** Both consumer/owner and tax-agent personas are fully working; the year-end wizard walks a non-accountant to a finalised working paper; the project is ready for public open-source use

**Depends on:** Phase 5

**Requirements:** UX-01, UX-02, UX-03, UX-04, UX-05, PERS-01, PERS-02, PERS-03, DEP-01, DEP-03, DEP-04

**Success Criteria** (what must be TRUE):
1. A user in owner mode lands on their primary entity dashboard with the year-end wizard one click away; a user in agent mode lands on a multi-client list with fast entity switching; switching modes via a setting preserves all data
2. The year-end wizard completes a full sequence — review unmapped accounts, confirm CoA GST codes, check unreconciled items, preview tax output, attest ("I confirm these are genuine business expenses"), finalise — and refuses to reach "finalise" until all unmapped accounts are resolved
3. Anomaly flags (unbalanced journal entries, unmapped accounts referenced in posted entries, GST code mismatches, accounts missing tax-label mappings) surface in-context on the relevant screen, not only in a separate report
4. Every ATO label and field in tax output has a tooltip or side-panel showing a plain-English explanation of what it means and what data populates it; the help text never states whether an expense is deductible
5. A new user can clone the repository, run `npm install && npm run build`, serve the built output, and have a fully working instance with no paid services configured; the README documents both single-user local and small-firm VPS deployment shapes; a CONTRIBUTING.md states the schema-migration rule

**Plans:** TBD

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Safety Net | 3/3 | Complete    | 2026-05-10 |
| 2. Decompose and Tax Engine | 4/4 | Complete   | 2026-05-10 |
| 3. Durable Persistence | 3/4 (Plan 03-4 awaiting human-verify) | In progress | - |
| 4. Bookkeeping Core | 1/4 | In progress (Wave 0 landed 2026-05-12; Wave 2 next) | - |
| 5. Tax Outputs | 3/4 (05-1 + 05-2 + 05-3 complete; 05-4 Tasks 1+2 done — UAT checkpoint) | In progress | - |
| 6. Personas, Wizard, and Deployment | 0/? | Not started | - |

---

## Requirement Coverage

| Category | Count | Phases |
|----------|-------|--------|
| Foundation (FND) | 9 | 1 (FND-05, 06, 07, 08, 09), 2 (FND-04), 3 (FND-01, 02, 03) |
| Bookkeeping Core (BOOK) | 12 | 2 (BOOK-08, 10), 4 (BOOK-01–07, 09, 11, 12) |
| Entity Management (ENT) | 8 | 1 (ENT-02), 4 (ENT-01, 03–08) |
| Trial Balance Import (IMP) | 6 | 4 (IMP-01–06) |
| BAS / IAS (BAS) | 6 | 5 (BAS-01–06) |
| Tax Shared (TAX) | 5 | 2 (TAX-01, 03, 04, 05), 5 (TAX-02) |
| Individual Return (IND) | 3 | 5 (IND-01–03) |
| Company Return (COY) | 4 | 5 (COY-01–04) |
| Trust Return (TRT) | 3 | 5 (TRT-01–03) |
| Partnership Return (PSP) | 2 | 5 (PSP-01–02) |
| Guidance / UX (UX) | 5 | 6 (UX-01–05) |
| Personas (PERS) | 3 | 6 (PERS-01–03) |
| Deployment (DEP) | 5 | 1 (DEP-05), 3 (DEP-02), 6 (DEP-01, 03, 04) |

**Total: 70/70 requirements mapped. No orphans.**

---

## Phase Ordering Rationale

- **Phase 1 before everything:** Three blocking risks (ATO theatre, no tests, float arithmetic) must be cleared before any user data accumulates and before tax math is written or refactored.
- **Phase 2 before Phase 3:** The StorageAdapter hooks depend on `useJournals`, `useEntities`, `useAccounts` existing; pure tax functions must be in `lib/tax/` before they can be tested without a DOM.
- **Phase 3 before Phase 4:** Journal edit/reverse, beneficiary register, and CoA expansion all write to persistence; they must use the StorageAdapter, not localStorage directly.
- **Phase 4 before Phase 5:** BAS G1/G10/G11 bucketing and all tax return label rollups require a CoA with GST codes and tax-label mappings. Trust/Partnership returns require beneficiary/partner registers from entity management.
- **Phase 5 before Phase 6:** The year-end wizard preview step requires correct, complete tax return components.
- **Persona and wizard work deferred to Phase 6:** Mode is a rendering concern — both modes read/write identical underlying data. If scope must be cut, Phases 1–5 deliver a complete correct single-mode tool; Phase 6 is additive.

---

## Research Flags

**Before Phase 4 begins:**
- CoA default account list and tax-label pre-mappings: correct mapping of 80–150 AU SME account names to NAT form labels for all four entity types. Review NAT 0660/0656/0659/0976 label sets before designing seed data.

**Before Phase 5 begins:**
- Trust streaming boundaries and BRE passive-income test. Confirm current-year individual marginal rates, LITO phase-out thresholds, and Medicare levy against ATO tax tables before building Individual return rollup.

**Before Phase 6 begins:**
- Verify `@react-pdf/renderer` React 19 compatibility before committing to it for PDF export upgrade.

---

*Roadmap created: 2026-05-10*
*Last updated: 2026-05-10 after initial creation*
