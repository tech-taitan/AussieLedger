---
phase: 09-exports-polish-cleanup
plan: 1
status: complete
subsystem: export,ux,cleanup
tags: [csv-export, anomaly-ux, toast, sidebar, trial-balance, bas, form-i, nyquist]
dependency_graph:
  requires: []
  provides: [FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02]
  affects: [src/lib/export/csv.ts, src/components/TrialBalance.tsx, src/components/BasIasAssistant.tsx, src/components/TaxReturnAssistant.tsx, src/components/shell/Sidebar.tsx, src/components/ViewRouter.tsx, src/components/CoaTreeView.tsx, src/App.tsx]
tech_stack:
  added: []
  patterns: [Papa.unparse object form, UTF-8 BOM blob, Blob+anchor download, CSS-first @keyframes, void offsetWidth reflow trick, lift-state to App.tsx]
key_files:
  created:
    - src/lib/export/csv.ts
    - src/lib/export/__tests__/csv.test.ts
    - src/components/Toast.tsx
    - src/components/__tests__/Toast.test.tsx
  modified:
    - src/components/TrialBalance.tsx
    - src/components/__tests__/TrialBalance.test.tsx
    - src/components/BasIasAssistant.tsx
    - src/components/__tests__/BasIasAssistant.test.tsx
    - src/components/TaxReturnAssistant.tsx
    - src/components/__tests__/TaxReturnAssistant.test.tsx
    - src/components/shell/Sidebar.tsx
    - src/components/__tests__/Sidebar.test.tsx
    - src/components/ViewRouter.tsx
    - src/components/__tests__/ViewRouter.test.tsx
    - src/components/CoaTreeView.tsx
    - src/components/__tests__/CoaTreeView.test.tsx
    - src/components/AccountManager.tsx
    - src/components/__tests__/AccountManager.test.tsx
    - src/components/shell/MainLayout.tsx
    - src/App.tsx
    - src/index.css
    - .planning/REQUIREMENTS.md
    - .planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md
    - .planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md
    - .planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md
decisions:
  - "Papa.unparse object form `{fields:[...], data:[]}` used for all 3 serialisers — guarantees header row even when data is empty"
  - "UTF-8 BOM (U+FEFF) prepended to all CSV blobs for Excel compatibility"
  - "Leading-zero account codes preserved via applyLeadingZeroPrefix — prefix apostrophe only when code starts with 0"
  - "Decimal.toString() used throughout — never parseFloat/Number() on money strings"
  - "UX-06 scroll state lifted to App.tsx — avoids prop-drilling through MainLayout children boundary"
  - "CSS-first @keyframes flash-yellow in index.css — Tailwind v4 has no tailwind.config.js"
  - "void el.offsetWidth synchronous reflow trick for CSS animation re-trigger on repeated clicks"
  - "CLEAN-01 documented as already-fixed-in-Phase-1 — stale audit entry; REQUIREMENTS.md traceability note honest about discovery"
metrics:
  duration: "~3h (2026-05-30)"
  completed: "2026-05-30"
  tasks_completed: 4
  files_changed: 22
  tests_added: 73
  tests_total: 983
---

# Phase 9 Plan 1: FND-10/11/12 CSV Exports + UX-06 Anomaly Deep-Links + CLEAN-01/02 Summary

**One-liner:** JWT-free CSV exports for TB/BAS/Form-I with UTF-8 BOM + Excel leading-zero preservation, plus Sidebar anomaly-badge click-to-scroll cycle navigation with 300ms flash.

## What Was Built

### Task 1 — FND-10/11/12 Pure-Function CSV Serialisers (commit 7883f52)

Created `src/lib/export/csv.ts` with three pure-function serialisers:

- `exportTrialBalanceCsv` — one row per non-parent account: `code, name, type, debit, credit, balance, period_start, period_end`. Excludes `isParent` subtotal rows. Leading-zero codes preserved via `applyLeadingZeroPrefix`.
- `exportBasLabelsCsv` — one row per BAS label: `label_code, plain_english, value, source`. `source` = `'internal-only'` when `label.internalOnly === true`, else `'lodgement'`.
- `exportFormILabelsCsv` — one row per Form I label: `label_code, plain_english, value, source_account_codes`. Derives `source_account_codes` by joining accounts whose `taxLabel` matches the label code.

All three use `Papa.unparse({fields:[...], data:[]}, {quotes:true, newline:'\r\n'})` — object form guarantees header row for empty periods. UTF-8 BOM (U+FEFF) prepended to every CSV string before Blob creation.

Helper functions inlined (no external deps): `slugify`, `fmtPeriodSlug`, `applyLeadingZeroPrefix`, `periodBoundaryStrings`.

37 unit tests GREEN covering slugify, fmtPeriodSlug, period boundaries, all three serialisers including empty-period header-only case, decimal precision, BOM byte, leading-zero prefix, comma-in-name quoting.

### Task 2 — Toast Primitive + Button Wiring (commits f7e24fe, d9665c2)

Created `src/components/Toast.tsx` — 30-line transient feedback component with auto-dismiss (default 3000ms), click-to-dismiss, and `tone` prop (`'info' | 'warn'`). 7 unit tests GREEN.

Wired Export CSV buttons on three views:
- `TrialBalance.tsx` — button in period controls div; `data-testid="export-csv-button-tb"`; empty-period toast; audit log emission
- `BasIasAssistant.tsx` — button before Print; `data-testid="export-csv-button-bas"`; empty-period toast; audit log emission
- `TaxReturnAssistant.tsx` — button in header; `data-testid="export-csv-button-form-i"`; empty-period toast; audit log emission

Each handler: calls serialiser → triggers Blob+anchor download → calls `addLog?.('EXPORT_DATA', ...)` → shows toast if `isEmpty`.

### Task 3 — UX-06 Anomaly Badge Deep-Links (commit 8197ff3)

Sidebar badge navigation with cycle state:
- Sidebar: `journalCycleIdx` + `accountCycleIdx` state; badge renders as `<button>` with `data-testid` when count > 0; `handleJournalsBadgeClick` / `handleAccountsBadgeClick` call `onAnomalyScroll?.(target, idx)` and show Toast with position feedback; cycle resets when view changes away
- `App.tsx`: owns `scrollToJournalIdx`, `scrollToAccountIdx`, `filterUnbalanced`, `filterMissingMappings` state + `handleAnomalyScroll` callback (state lifted here to bridge Sidebar/ViewRouter sibling boundary)
- `MainLayout.tsx`: `onAnomalyScroll` prop threads from App to Sidebar
- `JournalsView` (in ViewRouter): `filterUnbalanced` + `scrollToJournalIdx` + `onClearAnomalyFilter` props; `unbalancedEntries` useMemo; anomaly-filter banner with "Clear filter" button; `rowRefs` + scroll + `void el.offsetWidth` + `anomaly-flash` class
- `CoaTreeView.tsx`: `filterMissingMappings` + `scrollToAccountIdx` + `onClearAnomalyFilter` props; filter useMemo; banner; `rowRefs` + scroll + flash
- `AccountManager.tsx`: forwards UX-06 props to CoaTreeView
- `index.css`: `@keyframes flash-yellow` + `.anomaly-flash` CSS class (CSS-first, Tailwind v4)

29 new tests: S.8-S.13 (Sidebar badge clicks + cycle), C.1-C.6 (CoaTreeView filter/scroll), J.1-J.4 (JournalsView filter), A.1 (AccountManager passthrough).

### Task 4 — CLEAN-01 + CLEAN-02 Doc Sweep (commit cea235d)

**CLEAN-01 (doc-only):** REQUIREMENTS.md CLEAN-01 row updated from `[ ]` to `[x]` with traceability note "already fixed in Phase 1 — stale audit entry from v1.0 review; negative assertion in `src/__tests__/App.test.tsx:28` GREEN confirms absence". No code change needed.

**CLEAN-02 (frontmatter flips):** `nyquist_compliant: false` → `true` in:
- `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md`
- `.planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md`
- `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md`

REQUIREMENTS.md traceability table updated: FND-10/11/12, UX-06, CLEAN-01, CLEAN-02 all `Complete (09-1)`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 7883f52 | feat(09-1): FND-10/11/12 pure-function CSV serialisers + unit tests |
| 2a | f7e24fe | feat(09-1): Toast primitive + tests |
| 2b | d9665c2 | feat(09-1): Export CSV buttons on TB/BAS/Form-I + audit log + empty-period toast |
| 3 | 8197ff3 | feat(09-1): UX-06 anomaly badge deep-links + cycle state + 300ms flash + filter banners |
| 4 | cea235d | docs(09-1): CLEAN-01 + CLEAN-02 — REQUIREMENTS row + 3 Nyquist frontmatter flips |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Papa.unparse object form required for header-only empty CSV**
- **Found during:** Task 1 implementation
- **Issue:** `Papa.unparse([], opts)` returns `""` — no header row. Empty-period export would download a blank file with no column headers.
- **Fix:** Used `Papa.unparse({fields:[...fields], data}, opts)` throughout — object form always emits the header row regardless of data length.
- **Files modified:** `src/lib/export/csv.ts`

**2. [Rule 3 - Blocking] `slugify` not exported from persona.ts; `fmtPeriod` not in period.ts**
- **Found during:** Task 1 implementation
- **Issue:** Plan references these as imports but they don't exist in the codebase.
- **Fix:** Inlined both in `src/lib/export/csv.ts` per plan's own pitfall notes.
- **Files modified:** `src/lib/export/csv.ts`

**3. [Rule 1 - Bug] TrialBalance JSX nesting error on initial button insertion**
- **Found during:** Task 2 button wiring
- **Issue:** Adding Export CSV button inside a new div created unbalanced JSX; Toast as sibling to root div caused type error.
- **Fix:** Placed button inside existing `tb-period-controls` div; moved Toast inside root div with `relative` class.
- **Files modified:** `src/components/TrialBalance.tsx`

**4. [Rule 1 - Bug] `D` function not exported from money.ts**
- **Found during:** Task 1 test writing
- **Issue:** Plan suggested `import { D } from '../../money'` but no such export exists.
- **Fix:** Used `new Decimal(value)` directly in test files.
- **Files modified:** `src/lib/export/__tests__/csv.test.ts`

**5. [Rule 3 - Blocking] UX-06 scroll state location — Sidebar/ViewRouter sibling boundary**
- **Found during:** Task 3 architecture
- **Issue:** Sidebar is inside MainLayout, ViewRouter is a child of MainLayout's `children` prop — they are siblings and cannot share state directly via props.
- **Fix:** Lifted `scrollToJournalIdx`, `scrollToAccountIdx`, `filterUnbalanced`, `filterMissingMappings` state to `App.tsx`; passed down to ViewRouter as props and `handleAnomalyScroll` through MainLayout to Sidebar.
- **Files modified:** `src/App.tsx`, `src/components/shell/MainLayout.tsx`, `src/components/ViewRouter.tsx`

## Test Results

**Baseline:** 910 tests GREEN (before Plan 09-1 started)
**Final:** 983 tests GREEN (73 new tests added)
**Test files:** 101 (all passing)
**Build:** EXIT 0 (Vite build clean, pre-existing chunk-size warning only)
**TypeScript:** EXIT 0 (tsc --noEmit)

## UAT Outcome

**UAT approved:** 2026-05-30
**UAT log:** `.planning/phases/09-exports-polish-cleanup/09-UAT.md`

All 10 UAT checks PASSED (FND-10/11/12 CSV exports, UX-06 anomaly badge deep-links, CLEAN-01/02 doc sweep). User signed off 2026-05-30.

**Final test counts:**
- SPA: 983 GREEN + 11 todo + 0 RED (983 is ~48 above the planning estimate of ~935 — significantly more comprehensive coverage than projected; 73 new tests vs ~25 planned)
- Server: 18 GREEN
- Lint: EXIT 0
- Build: EXIT 0 (Vite, pre-existing chunk-size warning only)

**Plan status:** COMPLETE

---

## Self-Check: PASSED

Files verified to exist:
- src/lib/export/csv.ts: FOUND
- src/components/Toast.tsx: FOUND
- .planning/REQUIREMENTS.md (FND-10 [x]): FOUND
- 01-VALIDATION.md nyquist_compliant: true: FOUND

Commits verified:
- 7883f52: FOUND
- f7e24fe: FOUND
- d9665c2: FOUND
- 8197ff3: FOUND
- cea235d: FOUND
