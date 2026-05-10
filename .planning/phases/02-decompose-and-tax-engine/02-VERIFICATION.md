---
phase: 02-decompose-and-tax-engine
status: human_needed
verified: 2026-05-10
score: 6/6
human_verification:
  - test: "Run npm run dev with no .env.local (or rename it). Navigate to Import TB. Confirm Auto-match Accounts button is visible and Enhance with AI button is NOT visible. Click Auto-match on a file upload and confirm fuzzy match results appear without any API key."
    expected: "Single deterministic flow visible; no AI section; fuzzy-match produces candidates"
    why_human: "IS_AI_ENABLED is a build-time constant (Vite define block). The test suite mocks it. Only a real dev server confirms the build-time injection path behaves as documented."
  - test: "Run npm run dev with a real GEMINI_API_KEY set in .env.local. Navigate to Import TB. Confirm both Auto-match Accounts and Enhance with AI buttons are visible."
    expected: "Both buttons present when key is configured"
    why_human: "Same build-time injection reason."
  - test: "Open browser dev tools. Navigate to Application > Local Storage. After first load confirm ledger_schema_version equals '2'."
    expected: "ledger_schema_version === '2'"
    why_human: "localStorage state is runtime, not verifiable by Vitest in jsdom without mocking."
  - test: "Pre-seed a v1 account in localStorage: set ledger_chart_of_accounts to [{\"id\":\"x\",\"code\":\"X\",\"name\":\"Sales\",\"type\":\"Revenue\",\"gstCode\":\"GST\",\"taxLabel\":\"6S\",\"companyTaxLabel\":\"6A\",\"trustTaxLabel\":\"5B\"}] and ledger_schema_version to '1'. Reload the app. Inspect the stored account — confirm partnershipTaxLabel is now 'P1'."
    expected: "partnershipTaxLabel 'P1' inferred by migration; schema version bumped to 2"
    why_human: "Migration path through real localStorage on a live dev server; not exercised by jsdom hook tests."
  - test: "Navigate to Configure Accounts. Confirm the Partnership Label column is visible and that Revenue and Expense rows show a populated or editable partnershipTaxLabel. Asset, Liability, and Equity rows should show an empty/placeholder state."
    expected: "Partnership Label column present; Revenue/Expense rows editable"
    why_human: "Visual column presence requires DOM rendering in the actual browser."
  - test: "Navigate through every view: Master Dashboard, Entity Dashboard, Journals, Trial Balance, Tax Return Assistant, Company Tax, Trust Tax, BAS & IAS, Import TB, Configure Accounts, Audit Trail, Edit Entity. Confirm no console errors and no broken layout."
    expected: "All 12 views render without errors; visual parity with pre-Phase-2 state"
    why_human: "Visual regression check; smoke tests cover component mounting but not full user-flow rendering in a real browser."
  - test: "Open the Review-needed banner scenario: pre-seed an account with type Revenue and no partnershipTaxLabel (and name not in the inference table). After migration runs, navigate to Configure Accounts and confirm the amber Review needed banner appears listing the unmapped account."
    expected: "Banner visible listing accounts with _needsReview: true"
    why_human: "Banner render depends on post-migration localStorage state in a real session."
  - test: "Confirm there are no console errors on any view, including when activeEntityId is null (master-dashboard state)."
    expected: "Zero console errors across all views"
    why_human: "Runtime error detection requires a live browser session."
---

# Phase 2: Decompose and Tax Engine — Verification Report

**Phase Goal:** App.tsx is a thin orchestrator, all tax math lives in pure testable functions in `lib/tax/`, the Gemini API key is removed from the client bundle, and a canonical AU period module drives all date defaults

**Verified:** 2026-05-10
**Status:** HUMAN NEEDED — all 6 automated must-haves verified; 8 manual checks outstanding (visual parity, runtime AI gating, live migration, console-error confirmation)
**Re-verification:** No — initial verification

---

## Summary

Phase 2 achieved its architectural goal. The automated evidence is conclusive on the six success criteria: App.tsx is 151 non-blank lines (target was 250), the four hooks own state, the shell is extracted, five pure tax-engine modules exist with relocated demo math and no React imports, FY-versioned constants are centralised in a single module, the period model enforces `today()` throughout, and `IS_AI_ENABLED` gates the Gemini key so the app builds and all 200 tests pass with no key configured. The test suite itself (structural lints, shape tests, migration tests, smoke tests) provides strong machine-verifiable confidence. The remaining items are visual-regression, runtime-injection, and live-migration confirmations that require a human on a real dev server — they are quality assurance, not goal-blocking gaps.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `src/App.tsx` is ≤ 250 non-blank lines; `useEntities`, `useJournals`, `useAccounts` hooks exist; shell in `src/components/shell/` | VERIFIED | App.tsx has 151 non-blank lines (confirmed by `wc -l` and structural.test.ts passing); 4 hook files exist with full implementations; Sidebar.tsx, Header.tsx, BottomNav.tsx, MainLayout.tsx all exist |
| 2 | `src/lib/tax/{individual,company,trust,partnership,bas}.ts` exist as pure functions with no React imports; Vitest unit tests cover each rollup | VERIFIED | All 5 modules exist; `grep -r "import.*react" src/lib/tax/*.ts` returns no matches; structural-lint test "no React import" passes; golden.test.ts + bas.test.ts shape tests pass; relocated math is substantive (not zeros for 4/5 modules, partnership correctly returns zeros per CONTEXT.md) |
| 3 | All tax-rate constants in `src/lib/tax/labels/fy2026.ts`; no magic numbers in components | VERIFIED | `fy2026.ts` exports `INDIVIDUAL_LABELS`, `COMPANY_LABELS`, `TRUST_LABELS`, `PARTNERSHIP_LABELS`, `BAS_LABELS`, `GST_RATE`, `GST_DIVISOR`, `COMPANY_TAX_RATE_BASE`, `COMPANY_TAX_RATE_FULL`, `BRE_PASSIVE_THRESHOLD`, `BRE_TURNOVER_THRESHOLD`; structural-lint "no float arithmetic in src/lib/tax/**" passes; tax components import from lib/tax rather than using inline constants |
| 4 | Every default CoA account has pre-set GST code + tax-label mapping for all entity types; user can override | VERIFIED | All 7 Revenue/Expense accounts in `constants.ts` carry all four labels (`taxLabel`, `companyTaxLabel`, `trustTaxLabel`, `partnershipTaxLabel`); structural-lint "seed CoA fully mapped" passes; AccountManager renders a "Partnership Label" column with editable inputs; `_needsReview` + Review-needed banner wired |
| 5 | `src/lib/period.ts` exists; every date-range default derives from it; no parameterless `new Date()` outside it; BAS quarter boundaries match ATO periods | VERIFIED | `period.ts` exports all 8 required symbols; structural test "no raw new Date() outside src/lib/period.ts" passes GREEN; `quarter{Boundaries}` returns Jul–Sep/Oct–Dec/Jan–Mar/Apr–Jun per CONTEXT.md spec; period.test.ts passes covering all boundary cases |
| 6 | Self-hosted instance with no `GEMINI_API_KEY` runs fully — no broken pages, no console errors — AI features gated | PARTIAL (human needed) | `IS_AI_ENABLED` constant exists and is computed from `process.env.GEMINI_API_KEY` at build time; ImportTB gates AI section behind `IS_AI_ENABLED`; `npm run build` passes with no errors; 200/200 tests pass; but live runtime confirmation (no console errors, all 12 views render) requires human check on a dev server |

**Score:** 6/6 automated truths verified; 1 truth (SC6) needs human runtime confirmation

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/App.tsx` | Thin orchestrator ≤ 250 lines | VERIFIED | 151 non-blank lines; imports 4 hooks, MainLayout, ViewRouter, MigrationError, migrate |
| `src/lib/period.ts` | AU period model with `today()` seam | VERIFIED | All 8 exports present; uses `_nowProvider` closure as test seam |
| `src/lib/ai.ts` | `IS_AI_ENABLED` constant | VERIFIED | `export const IS_AI_ENABLED = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')` |
| `src/lib/import/match.ts` | `fuzzyMatch` Levenshtein + exact-code | VERIFIED | Exports `fuzzyMatch`, `HIGH_CONFIDENCE_THRESHOLD = 0.85`, `TOP_N_CANDIDATES = 3`, `MatchResult` |
| `src/lib/migrations/index.ts` | `CURRENT_VERSION = 2`; 1→2 registered | VERIFIED | `CURRENT_VERSION = 2`; `MIGRATIONS[1] = migrateV1ToV2`; imports from `./v1-to-v2` |
| `src/lib/migrations/v1-to-v2.ts` | Migration body with 22-entry inference table | VERIFIED | `migrateV1ToV2` exports; INFERENCE_TABLE has 22 entries; idempotent guard present |
| `src/lib/tax/individual.ts` | `computeIndividual` with relocated math | VERIFIED | Relocated from TaxReturnAssistant.tsx; returns `{6S,6K,6L,6N,6Q,7T}` as `LabelResult` with `Decimal` |
| `src/lib/tax/company.ts` | `computeCompany` with relocated math | VERIFIED | Relocated from CompanyTaxReturn.tsx; returns `{6A,6F,6T,6C,6G,6X,6S,7T}` |
| `src/lib/tax/trust.ts` | `computeTrust` with relocated math | VERIFIED | Relocated from TrustTaxReturn.tsx; returns all 10 trust labels |
| `src/lib/tax/partnership.ts` | `computePartnership` stub (zeros per spec; no prior component) | VERIFIED | Returns `{P1,P2,P8}` with correct polarity logic; zeros for empty entries is correct per CONTEXT.md |
| `src/lib/tax/bas.ts` | `computeBas` with relocated math | VERIFIED | Relocated from BasIasAssistant.tsx; returns all 10 BAS fields including `netGst` |
| `src/lib/tax/labels/fy2026.ts` | FY-versioned constants for all entity types | VERIFIED | 11 required exports present; NAT-reference comments included |
| `src/hooks/useAuditLog.ts` | `{ auditLogs, addLog }` with localStorage | VERIFIED | Loads from `ledger_audit_logs`; uses `today()` for timestamps |
| `src/hooks/useAccounts.ts` | `{ accounts, updateAccount, saveAll }` | VERIFIED | Loads from `ledger_chart_of_accounts`; calls `addLog` on mutations |
| `src/hooks/useJournals.ts` | Full journals hook with filters | VERIFIED | All fields present; legacy `ledger_entries` fallback included |
| `src/hooks/useEntities.ts` | Full entities hook with CRUD | VERIFIED | All 11 exports including `setEntities` for migration seeding |
| `src/components/shell/Sidebar.tsx` | Extracted sidebar | VERIFIED | `function Sidebar` present; AnimatePresence overlay included |
| `src/components/shell/Header.tsx` | Extracted header | VERIFIED | `export function Header` present |
| `src/components/shell/BottomNav.tsx` | Extracted bottom nav | VERIFIED | `export function BottomNav` present; `MobileNavButton` private helper included |
| `src/components/shell/MainLayout.tsx` | Composition component | VERIFIED | Composes Sidebar, Header, BottomNav, DisclaimerFooter |
| `src/components/EntityCard.tsx` | Extracted entity card | VERIFIED | `export function EntityCard` present |
| `src/components/MasterDashboard.tsx` | Extracted master dashboard | VERIFIED | `export function MasterDashboard` present; consumes EntityCard |
| `src/components/ViewRouter.tsx` | View routing component | VERIFIED | `function ViewRouter` present; routes all 12 view values |
| `src/types.ts` (Account widened) | `gstCode` union includes INP and CAP; `partnershipTaxLabel?`; `_needsReview?` | VERIFIED | Lines 47–49 of types.ts confirm all three additions |
| `src/constants.ts` (seed CoA) | All Revenue/Expense accounts have 4 entity-type labels | VERIFIED | 7 Revenue/Expense entries each carry `taxLabel`, `companyTaxLabel`, `trustTaxLabel`, `partnershipTaxLabel` |
| `src/components/AccountManager.tsx` | Partnership column + Review banner | VERIFIED | "Partnership Label" column header at line 130; editable input at lines 252–265; amber Review-needed banner at lines 109–119 |
| `src/components/ImportTB.tsx` | AI gated via `IS_AI_ENABLED` | VERIFIED | Imports `IS_AI_ENABLED` from `../lib/ai`; AI flow gated at line 105 (`if (!IS_AI_ENABLED) return`); AI button conditional at line 336 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `App.tsx` | `hooks/useAuditLog.ts` | `const { auditLogs, addLog } = useAuditLog()` | WIRED | Line 25 of App.tsx |
| `App.tsx` | `hooks/useAccounts.ts` | `useAccounts(addLog)` | WIRED | Line 26 of App.tsx |
| `App.tsx` | `hooks/useJournals.ts` | `useJournals(addLog, activeEntityId)` | WIRED | Line 41 of App.tsx |
| `App.tsx` | `hooks/useEntities.ts` | `useEntities(addLog)` | WIRED | Line 40 of App.tsx |
| `App.tsx` | `lib/migrations/index.ts` | `migrate(syntheticRoot)` in startup useEffect | WIRED | Lines 81–106 of App.tsx |
| `migrations/index.ts` | `migrations/v1-to-v2.ts` | `MIGRATIONS[1] = migrateV1ToV2` | WIRED | Line 34 of migrations/index.ts |
| `TaxReturnAssistant.tsx` | `lib/tax/individual.ts` | `computeIndividual(...)` at line 33 | WIRED | Import at line 9 |
| `CompanyTaxReturn.tsx` | `lib/tax/company.ts` | `computeCompany(...)` at line 33 | WIRED | Import at line 9 |
| `TrustTaxReturn.tsx` | `lib/tax/trust.ts` | `computeTrust(...)` at line 33 | WIRED | Import at line 9 |
| `BasIasAssistant.tsx` | `lib/tax/bas.ts` | `computeBas(...)` at line 15 | WIRED | Import at line 3 |
| `ImportTB.tsx` | `lib/ai.ts` | `IS_AI_ENABLED` imported and used at lines 105, 336 | WIRED | Import at line 12 |
| `ImportTB.tsx` | `lib/import/match.ts` | `fuzzyMatch(...)` called in deterministic flow | WIRED | Import at line 13 |
| `hooks/useAuditLog.ts` | `lib/period.ts` | `today().toISOString()` for log timestamps | WIRED | Import at line 7 |

---

## Requirements Coverage

| Requirement | Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| FND-04 | 02-1, 02-3 | Self-hosted instance works without API keys | SATISFIED | `IS_AI_ENABLED` gates ImportTB AI section; `npm run build` passes; all 200 tests pass with no key configured |
| TAX-01 | 02-1 | Tax-rate constants in single FY-versioned module | SATISFIED | `fy2026.ts` is the single source for all rate constants; structural lint "no float arithmetic" passes |
| TAX-03 | 02-1, 02-3, 02-4 | Default CoA pre-mapped to ATO labels for all entity types | SATISFIED | All 7 Revenue/Expense seed accounts have 4 entity-type labels; migration v1→v2 re-derives missing fields via INFERENCE_TABLE |
| TAX-04 | 02-3 | User can override CoA label mappings | SATISFIED | AccountManager renders editable `taxLabel`, `companyTaxLabel`, `trustTaxLabel`, `partnershipTaxLabel` columns; `_needsReview` cleared on save |
| TAX-05 | 02-1, 02-3 | All tax components consume shared pure-function engine | SATISFIED | All 4 existing tax components call their respective `compute*` function; structural lint forbids React imports in `src/lib/tax/**` |
| BOOK-08 | 02-1 | Account.gstCode union includes INP and CAP | SATISFIED | `types.ts` line 48: `'GST' \| 'FRE' \| 'INP' \| 'N-T' \| 'CAP'`; TypeScript compiles clean |
| BOOK-10 | 02-1, 02-2, 02-4 | Period model centralises date defaults; BAS quarter boundaries correct | SATISFIED | `period.ts` exports verified; structural lint "no parameterless new Date()" passes; `today()` used in all hooks; BAS quarter test coverage confirmed |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/hooks/useEntities.ts` | 6 | `import React from 'react'` — unused default import alongside `React.MouseEvent` usage | Info | The `React` import is actually used at line 88 for `React.MouseEvent` typing; not a true unused import. No action needed. |
| `src/components/AccountManager.tsx` | 51 | `id: \`acc-${Date.now()}\`` — `Date.now()` inside a template literal for ID generation | Info | Template-literal string is correctly excluded by the structural lint's string-strip regex. This uses `Date.now()` as a unique-ID source (not a "now" date producer in the date-range sense). The CONTEXT.md does not forbid ID generation patterns. No action needed. |

No blockers or warnings found. Both items above are intentional patterns.

---

## Human Verification Required

The following 8 checks correspond to the checkpoint:human-verify task in 02-4-PLAN.md (Task 3). They confirm runtime and visual behaviour that automated tests cannot cover.

### 1. AI-disabled mode (no key)

**Test:** Run `npm run dev` with no `.env.local` (or rename it temporarily). Navigate to Import TB. Confirm the "Auto-match Accounts" button is visible and the "Enhance with AI" button is NOT visible.
**Expected:** Single deterministic flow; no AI section rendered
**Why human:** `IS_AI_ENABLED` is replaced by Vite's `define` block at build time with the literal `false`. Only a real dev-server build confirms the injection path works end-to-end.

### 2. AI-enabled mode (with key)

**Test:** Set a test `GEMINI_API_KEY` in `.env.local`, restart the dev server, navigate to Import TB. Confirm both "Auto-match Accounts" and "Enhance with AI" buttons appear.
**Expected:** Both buttons visible
**Why human:** Same build-time injection reason as above.

### 3. Schema version in localStorage

**Test:** Open browser dev tools, Application tab, Local Storage. After first load, confirm `ledger_schema_version` reads `'2'`.
**Expected:** `ledger_schema_version === '2'`
**Why human:** localStorage state is a runtime concern; Vitest jsdom tests mock it.

### 4. Migration v1→v2 on live data

**Test:** Pre-seed localStorage: set `ledger_chart_of_accounts` to `[{"id":"x","code":"X","name":"Sales","type":"Revenue","gstCode":"GST","taxLabel":"6S","companyTaxLabel":"6A","trustTaxLabel":"5B"}]` and `ledger_schema_version` to `"1"`. Reload the app. Inspect the account — confirm `partnershipTaxLabel` is now `"P1"` and schema version is `"2"`.
**Expected:** Migration runs; `partnershipTaxLabel: 'P1'` inferred; version bumped
**Why human:** Integration of the migration runner, the version-guard pattern in App.tsx, and localStorage write-back requires a live session.

### 5. Partnership Label column in Configure Accounts

**Test:** Navigate to Configure Accounts. Confirm the "Partnership Label" column header is visible. Revenue and Expense rows should show populated or editable `partnershipTaxLabel` values. Asset, Liability, Equity rows should show empty/placeholder values.
**Expected:** Partnership Label column present and correct
**Why human:** Visual column presence requires browser DOM rendering.

### 6. All 12 views render without errors

**Test:** Navigate through all views: Master Dashboard → Entity Dashboard (click an entity) → Journals → Trial Balance → Tax Return Assistant → Company Tax → Trust Tax → BAS & IAS → Import TB → Configure Accounts → Audit Trail → Edit Entity.
**Expected:** All 12 views render without layout breaks or console errors
**Why human:** Visual regression; smoke tests confirm component mounting but not full composed layout in a real browser.

### 7. Review-needed banner for unmapped accounts

**Test:** Pre-seed an account with `type: "Revenue"`, a name not in the INFERENCE_TABLE (e.g. `"Obscure Revenue XYZ"`), and no `partnershipTaxLabel`. After migration runs, navigate to Configure Accounts and confirm the amber "Review needed" banner appears listing that account.
**Expected:** Amber banner visible listing the unmapped account
**Why human:** Banner depends on the `_needsReview` flag set by the live migration run.

### 8. No console errors on any view

**Test:** While performing check 6, keep the browser dev tools Console tab open. Confirm zero errors appear across all view navigations, including the master-dashboard state where `activeEntityId` is null.
**Expected:** Zero console errors
**Why human:** Runtime error detection requires a live browser session.

---

## Gaps Summary

No gaps were found. All 6 ROADMAP success criteria have machine-verifiable implementations in the codebase:

- **SC1 (App decomposition):** App.tsx is 151 lines; hooks and shell components exist and are wired.
- **SC2 (Tax engine):** 5 pure modules with no React imports; shape tests + relocated-math tests pass.
- **SC3 (FY-versioned constants):** `fy2026.ts` is the single source; structural lint enforces.
- **SC4 (CoA pre-mapping + override):** Seed CoA fully mapped; AccountManager with Partnership column; Review banner; migration wired.
- **SC5 (Period model):** `period.ts` enforced via structural lint; `today()` used everywhere.
- **SC6 (AI optional):** `IS_AI_ENABLED` gates ImportTB; build passes; tests pass — runtime confirmation is human-only.

The 8 human verification items are quality-assurance confirmations of already-implemented behaviour, not gap disclosures.

---

## Test Run Summary (at time of verification)

| Metric | Value |
|---|---|
| Tests passing | 200 |
| Tests failing | 0 |
| Tests todo (Phase 5 placeholders) | 11 |
| `npm run lint` (tsc --noEmit) | PASS |
| `npm run build` | PASS (1,173 kB bundle; chunk-size warning is pre-existing, not Phase 2's concern) |
| App.tsx non-blank lines | 151 (target ≤ 250) |

---

*Verified: 2026-05-10*
*Verifier: Claude (gsd-verifier)*
