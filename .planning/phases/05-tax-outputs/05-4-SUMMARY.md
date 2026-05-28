---
phase: 05-tax-outputs
plan: 4
subsystem: bas-ias-wave3
tags: [bas, ias, simpler-bas, payg, compute-bas, compute-ias, bas-ias-assistant, view-router, partnership-route, uat-pending]
status: PARTIAL — Tasks 1+2 complete; Task 3 UAT checkpoint pending user sign-off
dependency_graph:
  requires:
    - wave-0-scaffold-from-05-1 (BAS_LABELS_FULL, ReturnLabel, BasReturnLabels, IasReturnLabels, PrintBanner, print.css)
    - individual-company-returns-from-05-2 (computeIndividualReturn pattern, LabelRow pattern)
    - trust-partnership-returns-from-05-3 (PartnershipTaxReturn fully implemented)
    - period-ts-from-phase-2 (isInPeriod, quarterBoundaries, currentFy, today)
    - money-ts-from-phase-1 (gst() helper, Decimal, ROUND_HALF_UP, ROUND_DOWN)
  provides:
    - computeBas-full (G1/G2/G3/G10/G11/1A/1B/W1/W2/W3/W4/W5/T7 + simplerBasMode + period filter)
    - computeIas-full (PAYG-only W1/W2/W3/W4/W5/T7 delegating to computeBas)
    - BasIasAssistant-refactored (period selector + Simpler BAS lodgement + internal-only + IAS + Print)
    - ViewRouter-partnership-route (partnership-tax view → PartnershipTaxReturn)
    - View-type-widened (added partnership-tax to View union)
  affects:
    - src/lib/tax/returns/fy2026/bas.ts
    - src/lib/tax/returns/fy2026/ias.ts
    - src/components/BasIasAssistant.tsx
    - src/components/ViewRouter.tsx
    - src/types.ts
tech_stack:
  added: []
  patterns:
    - "computeBas: per-line gst() accumulation for 1A/1B (Pitfall 4 — bank rounding per-line BEFORE aggregation)"
    - "G1 ROUND_HALF_UP / W2 ROUND_DOWN per ATO worksheet method — explicit per-label rounding"
    - "G2/G3/G10/G11 internalOnly: true — Simpler BAS lodgement/working-paper split"
    - "computeIas delegates to computeBas: strip G*/1A/1B/netGst, force shape: IAS"
    - "BasIasAssistant: useMemo([entity, accounts, entries, shape, periodChoice, fy]) for compute"
    - "BasIasAssistant: entity? optional with DEFAULT_BAS_ENTITY for smoke test backward compat"
    - "ViewRouter: partnership-tax view added (additive) alongside existing trust-tax"
key_files:
  created: []
  modified:
    - src/lib/tax/returns/fy2026/bas.ts (~140 lines — full implementation replacing skeleton)
    - src/lib/tax/returns/fy2026/ias.ts (~65 lines — full implementation replacing skeleton)
    - src/lib/tax/returns/fy2026/__tests__/bas.test.ts (~220 lines — 8 tests GREEN)
    - src/lib/tax/returns/fy2026/__tests__/ias.test.ts (~70 lines — 2 tests GREEN)
    - src/components/BasIasAssistant.tsx (~250 lines — Phase 2 placeholder replaced)
    - src/components/__tests__/BasIasAssistant.test.tsx (~200 lines — 6 tests GREEN)
    - src/components/ViewRouter.tsx (+15 lines — partnership-tax route added)
    - src/components/__tests__/ViewRouter.test.tsx (~80 lines — 1 test GREEN)
    - src/types.ts (+1 line — 'partnership-tax' added to View union)
decisions:
  - "computeBas Period input (not fy+quarter separate fields) — matches plan 05-4 must_haves; isInPeriod handles all Period shapes (fy/quarter/custom)"
  - "entity? optional with DEFAULT_BAS_ENTITY on BasIasAssistant — smoke test backward compat; matches TaxReturnAssistant pattern from 05-2"
  - "BasIasAssistant uses periodChoice state (1..4 | 'fy') defaulting to Q1 — renders Q1 of currentFy() on mount per plan requirement"
  - "PAYG Withholding account detection via /PAYG\\s*Withholding/i regex — consistent with Phase 2 bas.ts pattern"
  - "ViewRouter bas-ias route updated to require activeEntity (guarded with && activeEntity) — ensures entity prop is always defined when BasIasAssistant mounts"
metrics:
  duration_minutes: ~14
  completed_date: "2026-05-28"
  tasks_completed: 2
  tasks_total: 3
  files_modified: 9
  tests_added: 17
  tests_green: 17
  tests_green_total_spa: 526
  uat_pending: true
---

# Phase 5 Plan 4: Wave 3 BAS/IAS + UAT Summary (PARTIAL)

**Status: Tasks 1+2 complete — awaiting Task 3 UAT human-verify checkpoint.**

Full computeBas (Simpler BAS — G1/1A/1B/W1/W2/T7 lodgement + G2/G3/G10/G11 internal-only), computeIas (PAYG-only delegation), BasIasAssistant refactor (period selector + lodgement/internal-only split + IAS shape dispatch + Print audit), ViewRouter Partnership route — 17 new GREEN tests, success criterion #1 locked end-to-end.

---

## Commits (Tasks 1 + 2)

| Task | Commit    | Description |
| ---- | --------- | ----------- |
| 1    | `46eab69` | feat(05-4): computeBas + computeIas full implementation — 10 tests GREEN |
| 2    | `dc59bc6` | feat(05-4): BasIasAssistant refactor + ViewRouter Partnership route — 7 tests GREEN |

---

## What Was Built

### Task 1: computeBas + computeIas

**`computeBas(input: ComputeBasInput): BasReturn`** (`src/lib/tax/returns/fy2026/bas.ts`):

Input: `{ entity: Entity; accounts: Account[]; entries: JournalEntry[]; period: Period }`

Logic flow:
1. `filterPostedEntries(entries)` — excludes superseded/voided/draft + replacedByEntryId
2. `isInPeriod(new Date(entry.date), period)` — quarter or FY filter
3. Line walk:
   - Revenue (credit-positive): G1 += all revenue; G2 += FRE export; G3 += other FRE; 1A += gst(amt) per-line if GST
   - Expense (debit-positive): wages → W1; non-wage GST → 1B += gst(amt) per-line; non-wage → G11
   - Asset CAP: G10 += debit; 1B += gst(amt) per-line
   - Liability PAYG Withholding: W2 += credit
4. W5 = W2 + W3 + W4; T7 = entity.paygInstalmentAmount ?? 0
5. Per-label rounding: G1 ROUND_HALF_UP; W2 ROUND_DOWN; 1A/1B toDecimalPlaces(2) after per-line accumulation
6. Anomalies: not-gst-registered warn; payg-i-unset info; locked-fy info
7. G2/G3/G10/G11 flagged `internalOnly: true` for Simpler BAS rendering split

**`computeIas(input): IasReturn`** (`src/lib/tax/returns/fy2026/ias.ts`):
- Delegates to `computeBas`; extracts `{ W1, W2, W3, W4, W5, T7 }` from labels
- Forces `meta.shape = 'IAS'`, `meta.natReference = 'NAT 4159 (IAS)'`

**Tests (10 GREEN):**
- bas.test.ts: G1/1A/1B to-the-cent (success criterion #1), G2/G3/G10/G11 internalOnly, W1 wages, W2 PAYG, T7 entity override, Q1/Q2 period filter, exclude superseded/voided/draft, explicit rounding modes
- ias.test.ts: PAYG-only labels (no G1/1A), T7 from entity.paygInstalmentAmount

### Task 2: BasIasAssistant + ViewRouter

**`BasIasAssistant.tsx`** refactored (`~250 lines`):
- Period selector: Full FY / Q1 / Q2 / Q3 / Q4 (defaults to Q1 of currentFy())
- BAS/IAS shape dispatch via entity.gstRegistered
- Simpler BAS lodgement section: G1, 1A, 1B, W1, W2, T7 (highlighted)
- Internal-only section: G2*, G3*, G10*, G11* (muted + italic disclaimer)
- IAS section: W1, W2, W3, W4, W5 (highlighted), T7
- Print button → addLog?.('EXPORT_DATA', JSON.stringify({form, fy, quarter?}), entity.id) → window.print()
- PrintBanner (print-only) + anomaly badges + print footer

**`ViewRouter.tsx`** additions:
- `import { PartnershipTaxReturn }` added
- `'partnership-tax'` view routes to `<PartnershipTaxReturn entity={activeEntity} .../>`
- `'bas-ias'` route updated to require `activeEntity` (guarded with `&& activeEntity`)

**`src/types.ts`**:
- `'partnership-tax'` added to `View` union

**Tests (7 GREEN):**
- BasIasAssistant: BAS lodgement labels G1/1A/1B/W1/W2/T7 visible; IAS shape (no G1); G1=$18,200 1A=$1,000 1B=$100 to-the-cent; T7=$1,500 from paygInstalmentAmount; print EXPORT_DATA audit; internal-only G2/G3/G10/G11 section
- ViewRouter: routes partnership-tax to PartnershipTaxReturn (Form P heading visible)

---

## BAS Hand-Calc Reference Table (success criterion #1)

Mixed fixture: $11k GST sale + $5k FRE sale + $2.2k INP sale + $1.1k GST expense

| Label | Expected | Derivation | Rounding mode |
|-------|----------|-----------|---------------|
| G1    | $18,200.00 | 11000 + 5000 + 2200 | ROUND_HALF_UP (final) |
| 1A    | $1,000.00  | gst(11000) = 11000/11 = 1000 exactly | per-line gst() banker's |
| 1B    | $100.00    | gst(1100) = 1100/11 = 100 exactly | per-line gst() banker's |
| W1    | $5,000.00  | wages debit | toDecimalPlaces(2) |
| W2    | $1,000.00  | PAYG withheld credit | ROUND_DOWN (final) |
| T7    | $1,500.00  | entity.paygInstalmentAmount = '1500' | toDecimalPlaces(2) |
| G2*   | $0.00      | FRE export (none in fixture) | internal-only |
| G3*   | $5,000.00  | FRE non-export (5k sale) | internal-only |
| G10*  | $0.00      | CAP asset (none in fixture) | internal-only |
| G11*  | $1,100.00  | non-wage expenses | internal-only |

---

## Per-Label Rounding Modes

| Label | Rounding | Source | Notes |
|-------|----------|--------|-------|
| G1    | ROUND_HALF_UP | ATO worksheet method | Applied as final toDecimalPlaces(2, ROUND_HALF_UP) |
| 1A    | gst() per-line (banker's, 2dp) | RESEARCH Pitfall 4 | Per-line BEFORE aggregation |
| 1B    | gst() per-line (banker's, 2dp) | RESEARCH Pitfall 4 | Per-line BEFORE aggregation |
| W2    | ROUND_DOWN | ATO worksheet method | Applied as final toDecimalPlaces(2, ROUND_DOWN) |
| All others | banker's (ROUND_HALF_EVEN) | money.ts global config | toDecimalPlaces(2) |

---

## ViewRouter Partnership-Route Diff

Added in ViewRouter.tsx:
```typescript
// Import added at top:
import { PartnershipTaxReturn } from './PartnershipTaxReturn';

// New route block after trust-tax:
{view === 'partnership-tax' && activeEntity && (
  <PartnershipTaxReturn
    entity={activeEntity}
    accounts={accounts}
    entries={journals.filteredEntries}
  />
)}
```

---

## UAT Checkpoint (Task 3 — PENDING)

The manual UAT (Task 3) is a `checkpoint:human-verify` gate covering all 5 Phase 5 success criteria across 12 UAT steps (≥25 manual verification points). This SUMMARY will be updated after the UAT is approved.

UAT steps to verify:
- STEP 0: Boot app + confirm loads
- STEP 1: Wave-0 corrections (NAT comment fixes + BRE cite + REQUIREMENTS.md)
- STEP 2: Individual entity (Form I + B&P + LITO + Medicare + IND-04)
- STEP 3: Company entity (Form C + BRE 30%/25% + franking)
- STEP 4: Trust entity (Form T + per-beneficiary + streaming disclaimer)
- STEP 5: Partnership entity (Form P + per-partner + loss path)
- STEP 6: BAS end-to-end (success criterion #1: G1=$18,200/1A=$1,000/1B=$100)
- STEP 7: IAS end-to-end (non-GST entity)
- STEP 8: Locked-FY behaviour
- STEP 9: Anomaly badges + assumptions
- STEP 10: Migration integrity (export/import v4)
- STEP 11: Regression sweep (npm run test + lint + build)
- STEP 12: Goal-backward checklist (5 success criteria ticked)

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Smoke test backward compat — entity prop required**
- **Found during:** Task 2 full-suite run
- **Issue:** `smoke.test.tsx` calls `<BasIasAssistant accounts={...} entries={...}/>` without `entity` prop (Phase 2 interface had no entity). New interface made entity required.
- **Fix:** Made `entity?` optional with `DEFAULT_BAS_ENTITY` fallback; entity type defaulted to Company + gstRegistered: true (generic BAS entity). Matches TaxReturnAssistant pattern from Plan 05-2.
- **Files modified:** `src/components/BasIasAssistant.tsx`
- **Commit:** `dc59bc6`

**2. [Rule 1 - Bug] Test assertions getByText failed on multi-match DOM elements**
- **Found during:** Task 2 BasIasAssistant test run
- **Issue:** "Internal-only" text appears in both the section `<h3>` and the `<p>` disclaimer at bottom. Also "Form P" appears in both print banner and screen heading.
- **Fix:** Changed to `getAllByText(...).length > 0` for known duplicate patterns.
- **Files modified:** BasIasAssistant.test.tsx, ViewRouter.test.tsx
- **Commit:** `dc59bc6`

---

## Test Count Delta

| File | Before | After |
|------|--------|-------|
| bas.test.ts | 8 it.todo | 8 GREEN |
| ias.test.ts | 2 it.todo | 2 GREEN |
| BasIasAssistant.test.tsx | 6 it.todo | 6 GREEN |
| ViewRouter.test.tsx | 1 it.todo | 1 GREEN |
| **Total** | **17 todo → 0** | **+17 GREEN** |

Total SPA: 526 GREEN + 11 todo (remaining EntityForm Phase 5 v4 wiring — outside Phase 5 scope) + 0 RED.

---

## Build / Lint / Test Results (Tasks 1 + 2)

- `npm run build` EXIT 0 (chunk-size warning pre-existing)
- `npm run lint` EXIT 0
- `npx vitest run` — 526 passed | 11 todo | 0 failed
- `npm run test:server` — 18 passed | 0 failed

---

## UAT Results (Task 3 — PENDING)

*To be completed after user UAT sign-off.*

---

## Self-Check: PARTIAL (Tasks 1+2 verified; Task 3 pending)

Files verified:
- `src/lib/tax/returns/fy2026/bas.ts` — FOUND, exports computeBas, ComputeBasInput, BasReturn
- `src/lib/tax/returns/fy2026/ias.ts` — FOUND, exports computeIas, IasReturn
- `src/components/BasIasAssistant.tsx` — FOUND, entity? optional, BAS/IAS dispatch, print audit
- `src/components/ViewRouter.tsx` — FOUND, partnership-tax route present
- `src/types.ts` — FOUND, 'partnership-tax' in View union

Commits:
- `46eab69` — FOUND (Task 1)
- `dc59bc6` — FOUND (Task 2)
