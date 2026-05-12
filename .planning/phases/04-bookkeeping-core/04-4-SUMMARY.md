---
phase: 04-bookkeeping-core
plan: 4
subsystem: wave-3-importtb-refactor-and-uat
tags:
  - importtb-refactor
  - papaparse-wrapper
  - sheetjs-wrapper
  - xlsx-sheet-picker
  - import-review-pane
  - import-fingerprint
  - replace-supersedes
  - ai-optional-gate
  - imp-01
  - imp-02
  - imp-03
  - imp-04
  - imp-05
  - imp-06
dependency_graph:
  requires:
    - parseCsvFile-from-04-1
    - parseXlsxFile-pickSheetByName-from-04-1
    - computeImportFingerprint-from-04-1
    - fuzzyMatch-HIGH_CONFIDENCE_THRESHOLD-retained-from-phase-2
    - isAiEnabled-from-03-3
    - useJournals-postDraft-from-04-2
    - useJournals-editPosted-supersession-pattern-from-04-2
    - account-isArchived-from-04-3
    - today-from-period.ts-phase-2
    - test-scaffolds-from-04-1
  provides:
    - XlsxSheetPicker-component
    - ImportReviewPane-component
    - ImportTB-refactored-csv-xlsx-flow
    - ImportTB-column-mapping-by-header-name
    - ImportTB-fingerprint-skip-replace-add-additional-dialog
    - ImportTB-single-opening-journal-imp-06
    - ImportTB-onReplace-prop-for-double-count-fix
    - useJournals-supersedeImport-helper
  affects:
    - src/components/ImportTB.tsx
    - src/components/__tests__/ImportTB.test.tsx
    - src/components/XlsxSheetPicker.tsx
    - src/components/__tests__/XlsxSheetPicker.test.tsx
    - src/components/ImportReviewPane.tsx
    - src/components/__tests__/ImportReviewPane.test.tsx
    - src/components/ViewRouter.tsx
    - src/hooks/useJournals.ts
tech_stack:
  added: []
  patterns:
    - "deterministic-first parse: parseCsvFile (PapaParse) for .csv and parseXlsxBuffer (SheetJS CE) for .xls / .xlsx — replaces the Phase-2 hand-rolled text.split('\\n') which broke on Excel BOM exports per RESEARCH Pitfall 5"
    - "multi-sheet workbooks: XlsxSheetPicker auto-fires onSelect via useEffect when exactly one sheet name matches /trial|TB|balance/i; otherwise renders a modal — Xero / QBO-style UX"
    - "column mapping by HEADER NAME (not numeric index) — survives reorder; seeded with best-effort regex guesses for code/name/debit/credit"
    - "row-level review via ImportReviewPane: auto/review/nomatch status badge, per-row include/exclude/edit, account-pick dropdown, NEW: sentinel for create-new-account"
    - "AI-optional gate (IMP-04): isAiEnabled() controls rendering of the 'Enhance with AI' button in the review stage; the deterministic fuzzyMatch path runs unconditionally as the default — import works fully with GEMINI_API_KEY unset"
    - "fingerprint dedup (IMP-05): computeImportFingerprint(rows, mappingByName, activeEntityId, asAtDate) fires BEFORE post; collision opens Skip / Replace / Add-additional dialog (not silent skip, not hard block)"
    - "Replace correctness (CRITICAL): ImportTB calls onReplace(existingId, newEntry); App.tsx wires it to useJournals.supersedeImport which marks the existing entry status: 'superseded' + replacedByEntryId in ONE setAllEntries update AND prepends the replacement. Without this the TB rollup (which filters status !== 'superseded') double-counts."
    - "single opening journal (IMP-06): all included rows post as ONE JournalEntry with isPosted=true + status='posted' + importFingerprint set"
    - "jsdom test polyfill: File.arrayBuffer() is not implemented in jsdom; the XLSX test fixture builder defines arrayBuffer on each File instance via Object.defineProperty so the component's `file.arrayBuffer()` call works in tests without depending on FileReader"
key_files:
  created:
    - src/components/XlsxSheetPicker.tsx (~80 lines — modal + auto-select on /trial|TB|balance/i)
    - src/components/ImportReviewPane.tsx (~180 lines — per-row review UI with include/exclude/edit/create-new)
  modified:
    - src/components/ImportTB.tsx (634 lines -> ~520 lines after refactor; behaviour ~80% rewritten — deterministic parse, sheet picker integration, review pane integration, fingerprint dialog, onReplace prop; AI-assist gate preserved)
    - src/components/__tests__/ImportTB.test.tsx (6 .todo -> 6 GREEN; deterministic-mapping smoke kept)
    - src/components/__tests__/XlsxSheetPicker.test.tsx (4 .todo -> 5 GREEN tests; added cancel-button case)
    - src/components/__tests__/ImportReviewPane.test.tsx (5 .todo -> 6 GREEN tests; added archived-filter case)
    - src/hooks/useJournals.ts (+ supersedeImport helper mirroring editPosted's supersession arm; JournalsHook interface widened additively)
    - src/components/ViewRouter.tsx (wires activeEntityId / existingEntries / onReplace through to ImportTB at view='import')
  untouched:
    - src/storage/adapter.ts (FINAL from Plan 03-1 — git diff empty)
    - src/storage/local.ts (FINAL from Plan 03-2 — git diff empty)
    - src/storage/server.ts (FINAL from Plan 03-3 — git diff empty)
    - src/types.ts (FINAL from Plan 04-1 — git diff empty)
    - src/lib/ledger.ts (FINAL pure functions from Plan 04-1 — git diff empty)
    - src/lib/coa/*.ts (FINAL from Plan 04-1 — git diff empty)
    - src/lib/import/csv.ts (FINAL Wave 0 wrapper — git diff empty)
    - src/lib/import/xlsx.ts (FINAL Wave 0 wrapper — git diff empty)
    - src/lib/import/fingerprint.ts (FINAL Wave 0 helper — git diff empty)
    - src/lib/import/match.ts (Phase 2 fuzzy matcher — retained as-is)
    - src/lib/period.ts (Phase 2 module — consumed only)
decisions:
  - "useJournals.supersedeImport added as a NEW sibling method (not a replacement for editPosted) — accepts a pre-built replacement entry from ImportTB (which has already computed the fingerprint + validated balance). Validates balance defensively before mutating state. Emits EDIT_JOURNAL audit with summary 'Opening balance replaced via TB re-import' so the Audit Trail surfaces the replace operation."
  - "Column-mapping seeded by regex (best-effort) so common CSV headers — Code/Name/Debit/Credit, account_no/account name/dr/cr — land on the right defaults without user input. User can override via the dropdowns; the deterministic mapping still requires explicit selection if the regex misses."
  - "Fingerprint dedup only fires when activeEntityId + parsedRows are both present. If the parent doesn't pass activeEntityId, the import still works (best-effort fallback to onImport without fingerprint) — preserves backward-compat with the Phase-2 prop contract while making the new behaviour opt-in via the props ViewRouter wires."
  - "Replace dialog uses `:REPLACE` reference suffix + `replacesEntryId` on the new entry. App.tsx's supersedeImport mirror sets `replacedByEntryId` on the prior entry — symmetric supersession lineage so both sides can navigate the chain."
  - "Add-additional path appends `:additional-{Date.now()}` to the fingerprint so the next import attempt won't re-trigger the dialog (the new fingerprint is distinct). Phase 5 reconciliation can fold these by stripping the suffix; for v1 the user controls intent."
  - "AI-assist button moved from the Phase-2 main toolbar to the review-stage toolbar (the original placement triggered on the file-pick step, which made no sense once the deterministic fuzzyMatch is the default). Now the AI button re-runs matching with Gemini AFTER the deterministic baseline; user sees both confidences in the review pane."
  - "ImportReviewPane's `create-new` button encodes the request as `mappedAccountId: 'NEW:{externalCode}:{externalName}'`. ImportTB filters NEW: rows out of the posted entry's lines (so the post doesn't include unresolved create-new entries). Phase 5 may extend this to auto-create accounts at accept-time; for v1 the user must pick a real mapping or skip the row."
  - "jsdom's File.arrayBuffer() is not implemented (TypeError: file.arrayBuffer is not a function). The XLSX test fixture overrides .arrayBuffer with Object.defineProperty pointing at the ArrayBuffer we already wrote — preferable to adding a polyfill to test/setup.ts because it's scoped to the one test that needs it. (Rule 3 auto-fix — required for the XLSX flow tests to run.)"
  - "vi.doUnmock('../../lib/import/match') + vi.doUnmock('../../lib/ai') in beforeEach — the Phase-3 / Phase-4 test mixture means earlier tests' vi.doMock factories leak across resetModules() boundaries. Explicitly un-mocking before each test guarantees the Phase-4 tests get the REAL fuzzyMatch + isAiEnabled. (Rule 3 auto-fix — required for the deterministic-path tests to run.)"
metrics:
  duration: ~12 min  # Tasks 1+2 only; Task 3 UAT is the user's; total wall-clock pending
  completed: 2026-05-12  # for Tasks 1+2; Task 3 awaits user
  tasks_total: 3
  tasks_completed: 2   # Task 3 = human-verify checkpoint, awaits user UAT
  human_verify: pending
  files_created: 2     # XlsxSheetPicker + ImportReviewPane components
  files_modified: 6    # ImportTB, ImportTB.test, Xlsx+Review tests, ViewRouter, useJournals
  tests_green_total_spa: 371
  tests_green_delta_spa: 17  # Wave 3: 5 XlsxSheetPicker + 6 ImportReviewPane + 6 ImportTB = 17
  tests_todo_total_spa: 11
  tests_todo_delta_spa: -15  # was 26 todo; flipped 15 to GREEN (the other 11 are NOT Wave-0 Phase-4 scaffolds)
  tests_green_total_server: 18
  tests_red: 0
  commits: 2  # Tasks 1+2; final docs commit follows; Task 3 commit pending UAT
---

# Phase 4 Plan 4: Wave 3 — ImportTB Refactor + UAT Summary (Partial)

Closes the Phase-4 import-flow gap. ImportTB.tsx (634-line brownfield from Phase 2) refactored to consume the Wave-0 deterministic CSV/XLSX wrappers + the new XlsxSheetPicker / ImportReviewPane components built in Task 1. Adds the fingerprint Skip/Replace/Add-additional dialog (IMP-05) with a critical `onReplace` prop hook that App.tsx wires to `useJournals.supersedeImport` — without this wiring, TrialBalance would double-count opening balances on re-import. AI-assist (Phase 3) preserved behind `isAiEnabled()`; deterministic path is the always-visible default (IMP-04). After Tasks 1 + 2: IMP-01..06 all visible end-to-end. **Task 3 is a `human-verify` checkpoint — the user runs a 28-step UAT against `npm run dev` and replies `approved`.** This summary documents Tasks 1 + 2; STATE.md / ROADMAP.md are NOT advanced until UAT clears.

## Commits

| Task | Commit    | Description |
| ---- | --------- | ----------- |
| 1    | `9b99e1c` | feat(04-4): XlsxSheetPicker + ImportReviewPane components |
| 2    | `b41daf1` | feat(04-4): ImportTB refactor — library wrappers, review, fingerprint dedup |
| 3    | PENDING   | docs(04-4): UAT signed off — Phase 4 complete (commits when user replies `approved`) |

## What changed

### `src/components/XlsxSheetPicker.tsx` (new — ~80 lines)

Modal that picks a sheet from a multi-sheet XLSX workbook. Behaviour (IMP-01):

- `autoSelectMatcher` defaults to `/trial|TB|balance/i`. On mount, if exactly ONE sheet name matches, the picker calls `onSelect(matchedName)` from `useEffect` and renders nothing — the user does not see a modal.
- Otherwise it renders a list of buttons (one per sheet, `data-testid="sheet-option-{name}"`) plus a Cancel button. Clicking a sheet button fires `onSelect(name)`.
- Modal container carries `data-testid="xlsx-sheet-picker-modal"` so tests can query for its presence/absence as the auto-select signal.

### `src/components/ImportReviewPane.tsx` (new — ~180 lines)

Row-level review UI between fuzzy match and post. Behaviour (IMP-03):

- Each row shows match status: `Auto-matched` (green, conf ≥ 0.85 + mappedAccountId set), `Review` (amber, 0 < conf < 0.85), or `No match` (red, conf === 0).
- Per-row include checkbox (`aria-label="include-{idx}"`); excluded rows skip the post phase.
- Inline editable debit + credit number inputs (`aria-label="debit-{idx}"` / `credit-{idx}"`).
- For Review / No match rows the user can pick a different account from the dropdown (`aria-label="pick-account-{idx}"`) which filters out archived accounts. A `Create new account` button (`data-testid="create-new-{idx}"`) encodes the request as `mappedAccountId: 'NEW:{externalCode}:{externalName}'`.
- Top of pane has `Accept import` (`data-testid="accept-import"`) and `Reject all` (`data-testid="reject-import"`) buttons.

### `src/components/ImportTB.tsx` (modified — 634-line brownfield → ~520-line refactor)

The largest brownfield component in the codebase, now consuming the Wave-0 library wrappers end-to-end. Major changes:

- File-pick step accepts `.csv,.xls,.xlsx` (was `.csv` only). Dispatches to `parseCsvFile` or `parseXlsxBuffer` based on extension; XLSX with multi-sheet sets `sheetPickerNames` state, single-sheet auto-advances to column mapping. The hand-rolled `text.split('\n')` (broke on Excel BOM exports per RESEARCH Pitfall 5) is GONE.
- Column-mapping UI now maps by HEADER NAME via `ColumnMappingByName` (not numeric index). Best-effort default seeding via regex (`/^code$|account.*code/i` etc.) so common CSVs land on correct defaults out of the gate.
- Review stage delegated to `ImportReviewPane`; ImportTB owns the `ReviewRow[]` state and `setImportedRows` callback.
- AI-assist `Enhance with AI` button now lives in the review-stage toolbar (was the file-pick toolbar in Phase 2), gated behind `isAiEnabled()`. Deterministic `fuzzyMatch` runs unconditionally in `processColumnMapping` so the baseline match is always visible — IMP-04 satisfied.
- Fingerprint dedup (IMP-05) fires in `handleAcceptImport` BEFORE post: compute via `computeImportFingerprint(parsedRows, columnMappingByName, activeEntityId, asAtDate)` → if any `existingEntries[i].importFingerprint === fp` → render `data-testid="fingerprint-collision-dialog"` with three buttons:
  - **Skip** (`fp-skip`): close dialog, do NOT post.
  - **Replace existing journal** (`fp-replace`): build replacement entry with `replacesEntryId: existing.id` + `reference: OPENING-{date}-REPLACE`; call `onReplace(existingId, replacement)` if wired (App.tsx wires it via `useJournals.supersedeImport`); fallback to `onImport([replacement])` if not.
  - **Import as additional** (`fp-additional`): post with fingerprint `${fp}:additional-${Date.now()}` so future dedup doesn't re-fire.
- Single opening journal post path (IMP-06): all included + mapped rows become ONE `JournalEntry` with `isPosted: true`, `status: 'posted'`, `importFingerprint: fp`. NEW: sentinel rows (create-new requests) are filtered out of `lines[]` so the post doesn't include unresolved create-new entries.
- New props: `activeEntityId?`, `existingEntries?`, `onReplace?` — additive; absent props → backward-compat fallback (no fingerprint dedup, no supersession; the parent SHOULD wire them for full IMP-05 correctness).

### `src/hooks/useJournals.ts` (modified — supersedeImport helper added)

New method on `JournalsHook`:

```ts
supersedeImport: (existingId: string, newEntry: JournalEntry) => void;
```

Mirrors `editPosted`'s supersession arm but takes a pre-built replacement entry from ImportTB. In one `setAllEntries` update:
1. Validates `newEntry.lines` balance via `validateBalanced` (BOOK-01 defence-in-depth).
2. Maps the existing entry to `{ ...e, _v: 3, status: 'superseded', replacedByEntryId: newEntry.id }`.
3. Prepends `newEntry` to the entity's entries.
4. Emits `EDIT_JOURNAL` audit row with `{ summary: 'Opening balance replaced via TB re-import', before: existing, after: newEntry }` so the Audit Trail surfaces the replace operation alongside regular edits.

Without this helper, ImportTB's Replace path would emit two posted entries with the SAME `importFingerprint` — TrialBalance (which filters `status !== 'superseded'`) would double-count both.

### `src/components/ViewRouter.tsx` (modified — props wired)

`<ImportTB />` at `view === 'import'` now receives:
- `activeEntityId={activeEntityId ?? undefined}` — scope for the fingerprint
- `existingEntries={journals.allEntries[activeEntityId] ?? []}` — collision-check input
- `onReplace={journals.supersedeImport}` — the critical TB-double-count fix

### Tests (3 files modified; all Phase-4-owned `.todo` cases flipped GREEN)

`src/components/__tests__/XlsxSheetPicker.test.tsx` (4 `.todo` → 5 GREEN):
- auto-selects single matching sheet
- modal shown when multiple sheets
- regex matches trial / TB / balance case-insensitive
- user pick fires onSelect with sheet name
- cancel button fires onCancel (added)

`src/components/__tests__/ImportReviewPane.test.tsx` (5 `.todo` → 6 GREEN):
- auto-applies high confidence
- create new account option
- per-row include/exclude toggle
- per-row edit-inline
- reject whole import button
- archived accounts hidden from pick dropdown (added)

`src/components/__tests__/ImportTB.test.tsx` (6 `.todo` → 6 GREEN; 3 Phase-3 cases preserved):
- column mapping UI confirmation
- deterministic path works without AI
- fingerprint Skip Replace dialog (asserts onReplace IS called with existingId + replacement; onImport is NOT called — TB double-count regression check)
- single opening journal posted (entry has importFingerprint as 64-char hex, isPosted=true, status='posted', lines.length > 0)
- XLSX flow opens sheet picker when multi-sheet
- XLSX flow auto-selects single matching sheet

## Test results

| Suite | Files | Passing | Todo | Failed |
| ----- | -----:| -------:| ----:| ------:|
| SPA `npm run test` | 47 | **371** | 11 | 0 |
| Server `npm run test:server` | 6 | **18** | 0 | 0 |
| `npm run lint` | — | EXIT 0 | — | — |
| `npm run build` | — | EXIT 0 (1,350.03 kB main, 415.94 kB gzip) | — | — |
| `node scripts/test-dev-full.mjs` | — | EXIT 0 (/api/health responded `{"ok":true,"version":2,"aiEnabled":false}`) | — | — |

**Plan 04-4 specific new GREEN tests (17):**
- XlsxSheetPicker.test.tsx (+5): auto-select single match, modal multi-sheet, case-insensitive regex, user pick fires onSelect, cancel fires onCancel
- ImportReviewPane.test.tsx (+6): auto-apply high confidence, create-new option (NEW: sentinel), include/exclude toggle, inline edit, reject button, archived hidden from dropdown
- ImportTB.test.tsx (+6 Phase-4 cases): column mapping UI, no-AI deterministic path, fingerprint Skip/Replace dialog (with onReplace regression check), single opening journal, XLSX multi-sheet picker, XLSX single-match auto-select

Baseline before Plan 04-4: 354 GREEN + 26 todo. After Tasks 1+2: 371 GREEN + 11 todo. Delta: **+17 GREEN, -15 todos** (15 Phase-4 .todo flipped; the other 11 todos remaining are pre-existing scaffolds outside this plan's scope — useJournals.test.ts perf benchmark + a handful of legacy ones from earlier waves). Zero failing, zero regression. Server suite unchanged.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] jsdom does not implement `File.arrayBuffer()`**
- **Found during:** Task 2 test run for the XLSX flow cases (`XLSX flow opens sheet picker when multi-sheet` + `XLSX flow auto-selects single matching sheet`).
- **Issue:** `TypeError: file.arrayBuffer is not a function` at `ImportTB.tsx:102` (the `await file.arrayBuffer()` call in `handleFileUpload` for the `.xlsx` branch). jsdom's File implementation is incomplete; it inherits from Blob but doesn't expose the async `arrayBuffer()` method that the production code (and SheetJS's expected entry point) relies on.
- **Fix:** Scoped to the XLSX test fixture builder — `makeXlsxFile(sheetNames)` now defines `arrayBuffer` on each constructed File via `Object.defineProperty(file, 'arrayBuffer', { value: async () => buf, configurable: true })`, pointing at the same `ArrayBuffer` that `XLSX.write(...)` produced. Preferable to adding a polyfill to `src/test/setup.ts` because it's scoped to the only test that needs it; production code is unchanged.
- **Files modified:** `src/components/__tests__/ImportTB.test.tsx` (test fixture only).
- **Commit:** `b41daf1` (Task 2).

**2. [Rule 3 — Blocking] `vi.resetModules()` does not clear `vi.doMock` factory registrations across tests**
- **Found during:** Task 2 first ImportTB test run — `TypeError: Cannot read properties of undefined (reading 'mappedAccountId')` at `ImportTB.tsx:179` (the `result.mappedAccountId` line in `processColumnMapping`). The Phase-3 `isAiEnabled() gating` describe block sets `vi.doMock('../../lib/import/match', () => ({ fuzzyMatch: vi.fn().mockReturnValue({ confidence: 0, candidates: [] }) }))`; that mock factory leaked across the `beforeEach` reset into the Phase-4 tests, so calls to `fuzzyMatch` in `processColumnMapping` returned the empty mock instead of the real match result — but the mock pattern in the Phase-3 test returned an object WITHOUT `.mappedAccountId`, breaking the Phase-4 tests that hit the deterministic path.
- **Fix:** Added `vi.doUnmock('../../lib/import/match')` + `vi.doUnmock('../../lib/ai')` to the test file's `beforeEach`. `resetModules()` clears the module cache but NOT the doMock factory registry; `doUnmock` clears the registry so the next dynamic import gets the REAL module.
- **Files modified:** `src/components/__tests__/ImportTB.test.tsx` (test infrastructure only).
- **Commit:** `b41daf1` (Task 2).

**3. [Rule 2 — Missing critical functionality] `useJournals.supersedeImport` helper added inline as part of 04-4 Task 2**
- **Found during:** Task 2 — wiring `onReplace` to App.tsx.
- **Issue:** The plan's `<behavior>` block specifies that App.tsx must wire `onReplace` to `useJournals.supersedeImport`, but Plan 04-2 did not ship that helper (per the executor's own SUMMARY footnote, 04-2 ran in parallel with 04-3 and its frontmatter didn't include the helper). Without supersedeImport, ImportTB's Replace path would have to either (a) inline the supersession logic in ViewRouter / App.tsx, or (b) double-call setAllEntries (which produces a race where the original is briefly visible between the two updates).
- **Fix:** Added `supersedeImport(existingId, newEntry)` to `src/hooks/useJournals.ts` as a NEW sibling method (not a replacement for `editPosted`). Body mirrors `editPosted`'s supersession arm — in one `setAllEntries` update, marks the existing entry `status: 'superseded' + replacedByEntryId` AND prepends `newEntry`. Validates balance defensively before mutating. Emits `EDIT_JOURNAL` audit row with summary `'Opening balance replaced via TB re-import'`. JournalsHook interface widened additively.
- **Files modified:** `src/hooks/useJournals.ts`, `src/components/ViewRouter.tsx` (consumer wiring).
- **Commit:** `b41daf1` (Task 2).

**4. [Rule 2 — Missing critical functionality] ImportReviewPane archived-account filter**
- **Found during:** Task 1 ImportReviewPane design — reviewing existing AccountManager / JournalForm patterns.
- **Issue:** The plan's `<behavior>` block specifies the dropdown shows "top-3 candidates from existing accounts as buttons + a 'Create new account' option" but doesn't explicitly call out filtering archived accounts. Letting users map imported rows to archived accounts would re-surface accounts that AccountManager had hidden, breaking the BOOK-06 archive flow.
- **Fix:** Dropdown filters `accounts.filter((a) => !a.isArchived)` before rendering options. Added a 6th test case (`archived accounts hidden from pick dropdown`) to verify.
- **Files modified:** `src/components/ImportReviewPane.tsx`, `src/components/__tests__/ImportReviewPane.test.tsx`.
- **Commit:** `9b99e1c` (Task 1).

### Deferred items

None blocking. Future-of-import notes (out of scope for Phase 4):

- **Create-new-account at accept-time:** ImportTB currently filters out `NEW:` sentinel rows from `entry.lines[]` before posting. Phase 5 (or a future plan) may extend this to auto-create the user's requested account via `useAccounts.saveAll` at accept-time so the row posts in the same transaction. v1 requires the user to either pick a real mapping or skip the row.
- **Reconciliation of Add-additional fingerprints:** the `:additional-{ts}` suffix keeps dedup from re-firing but two near-duplicate imports will appear as two separate opening journals. Phase 5 reconciliation could fold these by stripping the suffix; for v1 the user controls intent.

## Auth gates

None — Plan 04-4 is pure SPA refactor + hook extension + tests. No external services, no auth flows.

## Pending — Task 3 (human-verify checkpoint)

Task 3 is the user's manual UAT. The user runs `npm run dev`, walks through the 28-step UAT in 04-4-PLAN.md `<how-to-verify>` (covers all 5 Phase 4 success criteria + 23 requirements end-to-end), and replies `approved` or describes issues by step number.

**What the user verifies (28 steps, grouped by success criterion):**
1. Steps 1–4 — CoA browsable + parent subtotals on TB (BOOK-05/07)
2. Steps 5–10 — Journal CRUD + audit (BOOK-01/02/03/04/11/12)
3. Steps 11–15 — CSV/XLSX import + column-mapping + fuzzy-match + AI-optional (IMP-01..04)
4. Steps 16–18 — Idempotent re-import (IMP-05) including the critical Replace-doesn't-double-count regression check on step 18
5. Steps 19–20 — Trust beneficiary + Partnership partner registers (ENT-07/08)
6. Steps 21–22 — additional ENT requirements (ENT-01/03/04/05/06)
7. Steps 23–24 — AccountManager archive flow (BOOK-06)
8. Steps 25–28 — final cross-check (test suites, lint, StorageAdapter diff)

**Upon user reply `approved`:**
- This SUMMARY's frontmatter `tasks_completed` flips 2 → 3, `human_verify: pending` → `approved`, and `human_verify_date` records the date.
- The orchestrator runs the state updates (STATE.md `advance-plan` → "Current Plan: phase complete", ROADMAP.md `update-plan-progress 4`, REQUIREMENTS.md `mark-complete IMP-01 IMP-02 IMP-03 IMP-04 IMP-06`).
- The final docs commit `docs(04-4): UAT signed off — Phase 4 complete` ships SUMMARY + STATE + ROADMAP + REQUIREMENTS together.
- Phase 4 hands off to `/gsd:verify-work 4` for goal-backward verification.

If any UAT step fails, the resume signal documents the failure step + summary so `/gsd:plan-phase --gaps 4` can pick up the regression next cycle.

## Requirements addressed (Phase 4 — pending UAT confirmation)

| Req ID | Coverage | Notes |
|--------|----------|-------|
| IMP-01 (CSV/XLSX upload) | DELIVERED (UAT pending) | parseCsvFile (BOM-safe via PapaParse) + parseXlsxBuffer/pickSheetByName (SheetJS CE); XlsxSheetPicker auto-select on /trial\|TB\|balance/i |
| IMP-02 (column-mapping UI) | DELIVERED (UAT pending) | 4 dropdowns mapping code/name/debit/credit to HEADER NAMES (not indices); regex-seeded defaults; user override available |
| IMP-03 (fuzzy match + create new) | DELIVERED (UAT pending) | fuzzyMatch (retained Phase 2) → ImportReviewPane status badge per row → top candidates dropdown + "Create new account" NEW: sentinel |
| IMP-04 (AI optional) | DELIVERED (UAT pending) | isAiEnabled() gates the AI re-match button in the review toolbar; deterministic path is the always-visible default; import works with GEMINI_API_KEY unset |
| IMP-05 (idempotent re-import) | DELIVERED (UAT pending) | computeImportFingerprint fires BEFORE post; collision → Skip / Replace (with supersession via onReplace) / Add-additional dialog |
| IMP-06 (single dated opening journal) | DELIVERED (UAT pending) | onImport([entry]) where entry has isPosted=true + status='posted' + importFingerprint set; one entry per import |

After UAT clears, all 23 Phase 4 requirements are DELIVERED end-to-end.

## StorageAdapter / v3 types / Wave 0 modules untouched

- `git diff src/storage/adapter.ts` → empty (Phase 3 FINAL invariant preserved)
- `git diff src/types.ts` → empty (FINAL from Plan 04-1)
- `git diff src/lib/ledger.ts` → empty (FINAL pure functions from Plan 04-1)
- `git diff src/lib/period.ts` → empty (Phase 2 module — consumed only)
- `git diff src/lib/coa/` → empty (Wave 0 data — consumed only)
- `git diff src/lib/import/csv.ts src/lib/import/xlsx.ts src/lib/import/fingerprint.ts src/lib/import/match.ts` → empty (Wave 0 wrappers + Phase 2 matcher — consumed only)
- Confirmed structurally via `git diff --stat` on the listed paths returning zero changes.

## Self-Check: PASSED

- `src/components/XlsxSheetPicker.tsx` — FOUND, exports `XlsxSheetPicker`, contains literal `data-testid="xlsx-sheet-picker-modal"` AND literal `/trial|TB|balance/i`
- `src/components/__tests__/XlsxSheetPicker.test.tsx` — FOUND, 5 GREEN tests
- `src/components/ImportReviewPane.tsx` — FOUND, exports `ImportReviewPane`, contains literal `data-testid="import-review-pane"`, imports `HIGH_CONFIDENCE_THRESHOLD` from `../lib/import/match`
- `src/components/__tests__/ImportReviewPane.test.tsx` — FOUND, 6 GREEN tests
- `src/components/ImportTB.tsx` — FOUND, imports `parseCsvFile` from `../lib/import/csv`, imports `parseXlsxBuffer` AND `pickSheetByName` from `../lib/import/xlsx`, imports `computeImportFingerprint` from `../lib/import/fingerprint`, imports `XlsxSheetPicker` from `./XlsxSheetPicker`, imports `ImportReviewPane` from `./ImportReviewPane`, retains `isAiEnabled()` gate on the AI section (review toolbar), contains literal `data-testid="fingerprint-collision-dialog"`, posts a single opening JournalEntry with `importFingerprint` set
- `src/components/__tests__/ImportTB.test.tsx` — FOUND, 9 GREEN tests (6 Phase-4 + 3 retained Phase-3); zero `.todo`
- `src/hooks/useJournals.ts` — FOUND, exports `supersedeImport`; JournalsHook interface widened
- `src/components/ViewRouter.tsx` — FOUND, wires `activeEntityId`, `existingEntries`, `onReplace` to ImportTB
- Commit `9b99e1c` (Task 1) — FOUND in `git log`
- Commit `b41daf1` (Task 2) — FOUND in `git log`
- `npm run lint` — EXIT 0 VERIFIED
- `npm run test` — 371 GREEN, 11 todo, 0 fail VERIFIED
- `npm run test:server` — 18 GREEN, 0 fail VERIFIED (unchanged from Phase 3)
- `npm run build` — EXIT 0 VERIFIED (1,350.03 kB main, 415.94 kB gzip)
- `node scripts/test-dev-full.mjs` — EXIT 0 VERIFIED
- `git diff src/storage/adapter.ts src/types.ts src/lib/ledger.ts src/lib/period.ts src/lib/import/csv.ts src/lib/import/xlsx.ts src/lib/import/fingerprint.ts src/lib/import/match.ts src/lib/coa/` → all empty VERIFIED
