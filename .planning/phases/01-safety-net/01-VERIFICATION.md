---
phase: 01-safety-net
status: human_needed
verified: 2026-05-10
score: 6/6 must-haves verified (automated); 1 item requires visual human check per VALIDATION.md
re_verification: false
human_verification:
  - test: "Visually confirm disclaimer footer, em-dash trend placeholders, and no ATO theatre on all views in the running dev server"
    expected: "Footer visible on every view; no green-dot ATO Connected indicator; em-dash in StatCard trend slots; Sample Pty Ltd and Sample Family Trust as the only demo entities; Slide Generator nav absent"
    why_human: "The automated suite verifies DOM text and source-code strings; layout, visual placement, and the Slide Generator URL-direct-access path can only be confirmed by a human stepping through the running app"
notes:
  - "'US Big Law Firm' string literal remains at App.tsx:114 in a dead conditional branch for entity-card icon selection. No entity has this type; string never renders. The automated DOM test passes. The PLAN 01-2 source-level acceptance criterion (node -e script) was not converted to an automated test. This is cosmetic dead code, not a functional gap — flagged as warning."
---

# Phase 1: Safety Net — Verification Report

**Phase Goal:** The codebase is safe to build on — misleading ATO theatre is gone, Vitest runs in CI with at least one golden test per return type, decimal arithmetic is installed, and a schema version field exists on every persisted type.

**Verified:** 2026-05-10
**Status:** HUMAN NEEDED (all automated checks pass; visual sign-off per VALIDATION.md is outstanding)
**Re-verification:** No — initial verification

---

## Summary

Phase 1 delivered every substantive requirement. All 72 automated tests pass (with 11 `.todo` placeholders by design for Phase 5), the build and typecheck are clean, and the GitHub Actions CI workflow is correctly configured. The codebase is structurally safe to build on. The one outstanding item is the manual visual checkpoint defined in `01-VALIDATION.md` — clicking through every view in the running dev server to confirm the disclaimer footer, em-dash trend placeholders, and absence of ATO theatre — which was deferred by the Plan 01-2 executor due to sandbox interruptions. One cosmetic finding: the string literal `'US Big Law Firm'` persists in a dead conditional branch at `App.tsx:114` and was never converted to a failing automated test, but it never renders to any user-facing surface.

---

## Observable Truths Verification

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | No page shows "ATO Connected", "Pearson Specter Litt", "US Big Law Firm" (rendered), or hard-coded trend strings | VERIFIED | `App.test.tsx` "no ATO Connected", "no foreign demo seed", "trend placeholder" all pass; DOM textContent clean |
| 2 | Persistent, non-dismissable working-paper disclaimer on every tax output surface | VERIFIED | `<DisclaimerFooter />` mounted at `App.tsx:1023` inside `<main>`; `App.test.tsx` "footer present on every view" passes; `DisclaimerFooter.test.tsx` asserts locked exact-text |
| 3 | `npm run test` runs Vitest in CI; golden-output test scaffolds per return type and BAS exist | VERIFIED | 72 GREEN, 11 TODO (scaffolds for Phase 5); `ci.yml` runs `vitest run` on push/PR to main; `golden.test.ts` and `bas.test.ts` exist with correct `.todo` structure |
| 4 | `decimal.js` installed and used; no bare float arithmetic in tax-engine paths | VERIFIED | `decimal.js@10.6.0` in `package.json`; `money.ts` uses `Decimal.ROUND_HALF_EVEN`; structural-lint test passes vacuously (no `.ts` files in `src/lib/tax/` yet); 13 money tests GREEN |
| 5 | Every persisted type in `src/types.ts` carries `_v: number`; migration runner stub exists | VERIFIED | `_v?: number` on Entity, Account, JournalLine, JournalEntry, AuditLog (optional by design in Phase 1 per CONTEXT.md Option A); `migrate()` runner with 0→1 identity migration; 5 schema-version tests GREEN; 5 runner tests GREEN |
| 6 | EntityForm validates ABN (modulus-89); TFN field does not exist anywhere | VERIFIED | `validateAbn()` imported and called in `EntityForm.tsx`; warn-but-allow pattern; zero occurrences of TFN/tfn/Tax File Number in `types.ts` and `EntityForm.tsx`; 2 EntityForm tests GREEN |

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `vitest.config.ts` | Vitest config with jsdom, css:false, setupFiles | VERIFIED | Contains `environment: 'jsdom'`, `css: false`, `setupFiles: ['./src/test/setup.ts']` |
| `src/test/setup.ts` | RTL bootstrap, polyfills, @google/genai mock | VERIFIED | jest-dom matchers, ResizeObserver polyfill, matchMedia polyfill, `vi.mock('@google/genai')` |
| `src/lib/money.ts` | decimal.js wrapper with banker's rounding | VERIFIED | Exports `add`, `sub`, `mul`, `div`, `gst`, `round`, `serialize`, `deserialize`; `Decimal.ROUND_HALF_EVEN` configured at module load |
| `src/lib/validation.ts` | ABN modulus-89 validator | VERIFIED | `validateAbn()` with correct algorithm; ATO test vector `51 824 753 556` passes; 9 validation tests GREEN |
| `src/lib/migrations/index.ts` | Migration runner with 0→1 identity migration | VERIFIED | `migrate()` + `CURRENT_VERSION=1`; throws on unknown future version; 5 runner tests GREEN |
| `src/components/DisclaimerFooter.tsx` | Persistent footer with locked exact-text disclaimer | VERIFIED | 33-word locked text verbatim; `role="contentinfo"`; `aria-label="Compliance disclaimer"` |
| `src/components/PdfGate.tsx` | Tick-to-confirm hard gate | VERIFIED | `onConfirmed` blocked until checkbox ticked; 6 gate tests GREEN |
| `src/components/MigrationError.tsx` | Non-dismissable full-viewport migration error UI | VERIFIED | No onDismiss/onClose prop; `role="alert"`; message in `<pre>`; 3 tests GREEN |
| `.github/workflows/ci.yml` | GitHub Actions CI: build + lint + test on push/PR to main | VERIFIED | `ubuntu-latest`, Node 20, `actions/checkout@v4`, `actions/setup-node@v4`, `npm ci → build → lint → vitest run`; 5 CI config tests GREEN |
| `src/App.tsx` | Cleaned-up root component | VERIFIED | `DisclaimerFooter` mounted; `migrate()` wired; `MigrationError` early-return; `'Local user'` audit-log user; two AU demo seeds; no slide-generator references |
| `src/components/SlideGenerator.tsx` | DELETED | VERIFIED | File does not exist; structural test confirms |
| `src/components/EntityForm.tsx` | ABN inline warning, AU-only entity types, no TFN | VERIFIED | `validateAbn` imported; `warnings` state; amber warning on invalid ABN; four AU options (Company, Trust, Individual, Partnership); zero TFN/EIN references |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `package.json` `test` script | `vitest.config.ts` | `"test": "vitest run"` auto-loads config | VERIFIED | Confirmed in `package.json`; `vitest run` exits 0 |
| `src/lib/money.ts` | `decimal.js` | `Decimal.ROUND_HALF_EVEN` at module load | VERIFIED | Import at line 6; `Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN })` at lines 10-15 |
| `src/lib/migrations/index.ts` | `src/types.ts` | `_v: number` aligned across both | VERIFIED | `PersistedRoot._v` in migrations; `_v?: number` on all 5 persisted interfaces in types.ts |
| `tsconfig.json` | `vitest.config.ts` | `types: ["vitest/globals", "@testing-library/jest-dom"]` | VERIFIED | Present in tsconfig.json line 25; vitest.config.ts excluded from tsconfig to avoid vite version conflict |
| `src/App.tsx` | `src/components/DisclaimerFooter.tsx` | `<DisclaimerFooter />` before `</main>` | VERIFIED | App.tsx line 1023: `<DisclaimerFooter />` |
| `src/App.tsx` | `src/lib/migrations/index.ts` | `migrate()` wraps localStorage load in useEffect | VERIFIED | App.tsx line 270: `const migrated = migrate(syntheticRoot)` |
| `src/App.tsx` | `src/components/MigrationError.tsx` | Early-return `<MigrationError>` when `migrationError` non-null | VERIFIED | App.tsx lines 420-422 |
| `src/components/EntityForm.tsx` | `src/lib/validation.ts` | `validateAbn()` called on registrationNumber change when 11 digits | VERIFIED | Import at line 9; called at EntityForm.tsx line 83 |

---

## Requirements Coverage

| Requirement | Plan | Description | Status | Evidence |
|-------------|------|-------------|--------|----------|
| FND-05 | 01-2 | No misleading ATO theatre, simulated status, or fabricated trend metrics | SATISFIED | ATO Connected block removed; trend strings replaced with em-dash; Pearson/US Big Law seeds replaced; 4 App.test.tsx + 2 structural.test.ts tests GREEN |
| FND-06 | 01-1, 01-2 | Always-visible disclaimer; working-paper not tax advice | SATISFIED | DisclaimerFooter mounted on every view; PdfGate gate component exists; 2 DisclaimerFooter tests + 6 PdfGate tests GREEN |
| FND-07 | 01-1 | Vitest with golden-output test per return type + BAS per-label tests | SATISFIED | 72 GREEN; `golden.test.ts` (4 `.todo`) and `bas.test.ts` (7 `.todo`) scaffolds exist per Phase 1 scope; smoke tests for all 15 major components GREEN |
| FND-08 | 01-1 | Decimal arithmetic library installed and used; no bare float arithmetic | SATISFIED | `decimal.js@10.6.0` installed; `money.ts` wrapper with ROUND_HALF_EVEN; structural-lint test guards `src/lib/tax/`; 13 money tests GREEN |
| FND-09 | 01-1, 01-2 | Schema version field on every persisted type; migration runner stub | SATISFIED | `_v?: number` on all 5 persisted interfaces; `migrate()` with 0→1 identity; `<MigrationError>` gate; 5 schema-version + 5 runner + 3 MigrationError tests GREEN |
| ENT-02 | 01-1, 01-3 | ABN format validation (modulus-89); TFN format check N/A — TFN removed | SATISFIED | `validateAbn()` in EntityForm; warn-but-allow; zero TFN references in types.ts and EntityForm.tsx; 2 EntityForm tests GREEN |
| DEP-05 | 01-1 | CI runs build, lint, test on every push | SATISFIED | `.github/workflows/ci.yml` configured; 5 CI config tests GREEN |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/App.tsx` | 114 | `entity.type === 'US Big Law Firm'` — dead string literal in icon branch | WARNING | Cosmetic only. No entity has this type after DEFAULT_ENTITIES cleanup; string never renders; DOM tests pass. The source-level acceptance criterion from PLAN 01-2 (`node -e` script checking for 'US Big Law Firm' in source) was not automated into a test file. Zero functional impact. |

---

## Test Suite Results

**Full suite result:** 72 PASS / 11 TODO / 0 FAIL

| Test File | Count | Status |
|-----------|-------|--------|
| `src/lib/__tests__/money.test.ts` | 13 | GREEN |
| `src/lib/__tests__/validation.test.ts` | 9 | GREEN |
| `src/lib/migrations/__tests__/runner.test.ts` | 5 | GREEN |
| `src/lib/tax/__tests__/structural-lint.test.ts` | 1 | GREEN |
| `src/lib/tax/__tests__/golden.test.ts` | 4 | TODO (Phase 5) |
| `src/lib/tax/__tests__/bas.test.ts` | 7 | TODO (Phase 5) |
| `src/components/__tests__/DisclaimerFooter.test.tsx` | 2 | GREEN |
| `src/components/__tests__/PdfGate.test.tsx` | 6 | GREEN |
| `src/components/__tests__/MigrationError.test.tsx` | 3 | GREEN |
| `src/components/__tests__/smoke.test.tsx` | 15 | GREEN |
| `src/components/__tests__/EntityForm.test.tsx` | 2 | GREEN |
| `src/__tests__/App.test.tsx` | 4 | GREEN |
| `src/__tests__/structural.test.ts` | 2 | GREEN |
| `src/__tests__/types-schema-version.test.ts` | 5 | GREEN |
| `src/__tests__/ci-config.test.ts` | 5 | GREEN |

**Build:** `npm run build` exits 0 (pre-existing chunk-size warning unrelated to Phase 1)
**Lint:** `npm run lint` (`tsc --noEmit`) exits 0

---

## CONTEXT.md Locked Decisions — Verification

| Decision | Status | Evidence |
|----------|--------|----------|
| Disclaimer copy is exact 33-word verbatim text | VERIFIED | DisclaimerFooter.tsx renders the text verbatim; DisclaimerFooter.test.tsx asserts it |
| Trend-string replacement is `'—'` (em-dash U+2014) | VERIFIED | App.tsx lines 769, 781, 795: `trend="—"` at all three StatCard call sites; App.test.tsx asserts count ≥ 3 |
| Demo seeds are exactly `'Sample Pty Ltd'` (Company) and `'Sample Family Trust'` (Trust) with placeholder ABNs `'ABN 11 111 111 111'` and `'ABN 22 222 222 222'` | VERIFIED | App.tsx lines 57-58: exact match; structural.test.ts + App.test.tsx assert no foreign seeds |
| Audit-log user is `'Local user'` | VERIFIED | App.tsx line 358: `user: 'Local user'` |
| ABN validation is warn-but-allow | VERIFIED | EntityForm.tsx: warning stored in `warnings` state (not `errors`); submit button not disabled by warnings |
| TFN does not exist anywhere in the data model | VERIFIED | Zero matches for TFN/tfn/Tax File Number in `src/types.ts`, `src/components/EntityForm.tsx`; EntityForm.test.tsx "no TFN field" test GREEN |

---

## Human Verification Required

The Plan 01-2 human-verify checkpoint (Task 3) was not completed by the executor due to sandbox interruptions. The following checks require running the dev server:

### 1. Disclaimer visible on all views

**Test:** Run `npm run dev`, open `http://localhost:3000`, click through every sidebar entry (`Master`, `Dashboard`, `Journals`, `Trial Balance`, `Tax Return`, `Company Tax`, `Trust Tax`, `BAS & IAS`, `Import TB`, `Edit Entity`, `Audit Trail`, `CoA Manager`).

**Expected:** The disclaimer text "This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO." is visible at the bottom of the main content column on each view.

**Why human:** Visual placement and layout confirmation; automated test only verifies DOM text presence on initial render.

### 2. ATO theatre absent from sidebar

**Test:** While the dev server is running, check the sidebar bottom section.

**Expected:** No green-dot status indicator, no "Connected to ATO (Simulated)" text, no "Accountant Mode" label, no "Slide Generator" navigation button.

**Why human:** Visual confirmation of sidebar layout; automated tests check DOM textContent but not visual indicator rendering.

### 3. Em-dash in StatCard trend slots

**Test:** Select an entity (e.g. "Sample Pty Ltd") to navigate to the entity dashboard.

**Expected:** The three StatCards (Total Revenue, Total Expenses, Net Profit) show the em-dash character `—` in their trend slots, not `+12% vs last month`, `-5% vs last month`, or `Healthy margin`.

**Why human:** The em-dash vs hyphen distinction is a visual character; automated tests check source-level regex, not rendered glyph appearance.

### 4. Demo seed entity list correct

**Test:** Open the entity selector / master dashboard.

**Expected:** Exactly two entities: "Sample Pty Ltd" and "Sample Family Trust". No "Acme Corp", "Smith Family Trust", "Tech Innovations", "Pearson Specter Litt", or "US Big Law Firm" visible.

**Why human:** Confirms localStorage has no residual old seeds from prior app state; automated tests only check DEFAULT_ENTITIES in source.

### 5. Slide Generator surface unreachable

**Test:** Attempt to navigate to the slide generator by manually changing the URL or checking the sidebar.

**Expected:** No slide generator nav button exists; no slide generator view is reachable.

**Why human:** Route removal confirmation requires user interaction; structural tests check source code, not runtime routing.

---

## Gaps Summary

No blocking gaps were found. All six must-haves are verified by automated tests. The only outstanding item is the manual visual checkpoint defined in `01-VALIDATION.md § Manual-Only Verifications`.

**Cosmetic finding (not a gap):** `App.tsx:114` retains a dead string literal `'US Big Law Firm'` in an icon-selection conditional branch. It never renders, and the automated "no foreign demo seed" test checks rendered DOM content (which is clean). The PLAN 01-2 source-level acceptance criterion for this string was not encoded in an automated test. This can be cleaned up as a one-line fix at any point; it is not a blocker.

---

_Verified: 2026-05-10_
_Verifier: Claude (gsd-verifier)_
