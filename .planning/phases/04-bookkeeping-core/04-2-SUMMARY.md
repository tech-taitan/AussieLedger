---
phase: 04-bookkeeping-core
plan: 2
subsystem: wave-2-journal-crud-audit-trial-balance
tags:
  - journal-lifecycle
  - supersession-edit
  - reversal
  - void
  - audit-trail
  - trial-balance
  - period-filter
  - parent-subtotals
  - journal-search
  - book-01
  - book-02
  - book-03
  - book-04
  - book-09
  - book-11
  - book-12
dependency_graph:
  requires:
    - storage-adapter-interface-from-03-1
    - v3-types-from-04-1
    - ledger-pure-functions-from-04-1
    - validateBalanced-from-04-1
    - makeReversal-from-04-1
    - makeSupersedingEdit-from-04-1
    - searchJournals-from-04-1
    - period-isInPeriod-from-02-2
    - period-currentFy-from-02-2
    - period-today-from-02-2
  provides:
    - useJournals-postDraft
    - useJournals-editPosted
    - useJournals-reversePosted
    - useJournals-voidDraft
    - useJournals-searchJournals
    - JournalForm-edit-supersedes-mode
    - JournalForm-edit-banner
    - JournalForm-diff-confirm-step
    - JournalForm-reverse-button
    - JournalForm-void-button
    - EditJournalDiff-side-by-side-preview
    - JournalSearch-filter-panel
    - TrialBalance-period-filter
    - TrialBalance-parent-subtotals
    - TrialBalance-status-filter
    - AuditTrail-widened-actions
    - AuditTrail-json-summary-rendering
  affects:
    - src/hooks/useJournals.ts
    - src/hooks/__tests__/useJournals.test.ts
    - src/components/JournalForm.tsx
    - src/components/__tests__/JournalForm.test.tsx
    - src/components/EditJournalDiff.tsx
    - src/components/JournalSearch.tsx
    - src/components/__tests__/JournalSearch.test.tsx
    - src/components/TrialBalance.tsx
    - src/components/__tests__/TrialBalance.test.tsx
    - src/components/AuditTrail.tsx
tech_stack:
  added: []
  patterns:
    - "Supersession chain: editPosted marks original status: 'superseded' + replacedByEntryId; replacement carries replacesEntryId — no mutation of the original. Audit trail preserves the lineage."
    - "Reversal mirroring: reversePosted calls ledger.makeReversal which swaps debit/credit per line; both original (status: 'reversed') and reversal (status: 'posted', reversesEntryId) coexist in the TB and net to zero."
    - "Audit emission via getAdapter().appendAuditLog — fire-and-forget after the state mutation commits. JSON details carry both a human-readable `summary` AND a structured `before`/`after` snapshot so the AuditTrail UI can surface the summary while preserving the full diff payload for forensics."
    - "BOOK-09 status filter (TrialBalance.isLiveForTB): drops voided / superseded / draft entries; keeps posted + reversed. Reversal-entry mirrored lines cancel the original in the rollup, so the leaf rows show debit=credit when an entry has been fully reversed."
    - "Parent subtotals via Account.parentCode hierarchy: build a code→children map, render parent rows with summed child debit/credit. Footer totals exclude parent rows to avoid double-counting."
    - "JournalForm edit-supersedes flow: clicking Save Edit sets showDiff=true (does NOT immediately call onEdit); user reviews the EditJournalDiff side-by-side preview, then clicks 'Confirm replace' to fire onEdit(original, edits)."
    - "JournalSearch debounced filter dispatch: 150ms setTimeout inside useEffect keyed on all 7 inputs; useFakeTimers + advanceTimersByTime(200) in tests."
    - "today() from src/lib/period.ts for audit timestamps; new Date(entry.date) is date PARSING (allowed by structural-lint). Zero parameterless new Date() occurrences in any 04-2 file."
key_files:
  created:
    - src/components/EditJournalDiff.tsx (~145 lines — side-by-side diff preview with yellow-highlighted field/line changes)
    - src/components/JournalSearch.tsx (~170 lines — 7-axis filter panel with 150ms debounce + Clear-all)
  modified:
    - src/hooks/useJournals.ts (122 -> 297 lines — added postDraft, editPosted, reversePosted, voidDraft, searchJournals, emitAudit; preserved Phase-2 addEntry/importEntries contract)
    - src/hooks/__tests__/useJournals.test.ts (107 -> 359 lines — 12 .todo cases flipped GREEN; 6 Phase-2 cases preserved with isPosted:false tweak so empty-lines fixture stays compatible with data-layer balance check)
    - src/components/JournalForm.tsx (459 -> 539 lines — added editingOriginal/onEdit/onReverse/onVoidDraft props, banner, diff confirm step, Reverse/Void buttons; preserved entire Phase-2 new-entry path)
    - src/components/__tests__/JournalForm.test.tsx (14 -> 169 lines — 5 .todo cases flipped GREEN)
    - src/components/__tests__/JournalSearch.test.tsx (14 -> 102 lines — 5 .todo cases flipped GREEN)
    - src/components/TrialBalance.tsx (109 -> 256 lines — period filter UI, isLiveForTB status filter, parentCode aggregation, balanced footer, test-ids)
    - src/components/__tests__/TrialBalance.test.tsx (14 -> 200 lines — 5 .todo cases flipped GREEN)
    - src/components/AuditTrail.tsx (98 -> 119 lines — widened getActionColor switch + renderDetails JSON-summary parsing)
  untouched:
    - src/storage/adapter.ts (FINAL from Plan 03-1) — git diff empty
    - src/types.ts (FROZEN by Plan 04-1) — git diff empty
    - src/lib/ledger.ts (FINAL pure functions from Plan 04-1) — git diff empty
    - src/lib/period.ts (Phase 2 module) — git diff empty
decisions:
  - "BOOK-02 edit-supersedes UX wires through two states (form → showDiff → confirm). Plan specified gating Save Edit behind the diff preview; implementation also added a 'Back to edit' button so users can iterate on the proposed edit without losing form state. (Plan-conformant addition; no test-name churn.)"
  - "JournalForm pre-existing Phase-2 baseline used `Math.abs(totalDebits - totalCredits) < 0.001` for UI balance gating; data-layer (ledger.validateBalanced) uses 0.005. The 0.001 UI gate stays — it's strictly tighter, so any imbalance the data layer would reject is also rejected by the UI gate. Plan's BOOK-01 truth (data-layer authoritative) holds."
  - "useJournals.addEntry preserves its Phase-2 audit log via addLog('POST_JOURNAL') for backward compatibility with App.tsx; the new lifecycle methods (editPosted/reversePosted/voidDraft) use the widened audit emission path via getAdapter().appendAuditLog() with structured JSON details. Two audit emission paths is intentional — App.tsx's existing addEntry calls do not need refactoring."
  - "TrialBalance leaf rows still render at non-zero debit/credit even when they net to zero (e.g. posted + reversal). This preserves audit visibility: the user sees the gross moves on the row but the YTD-balance column shows the net. Footer totals stay balanced. Plan validation test 'reversal entries net to zero in TB' asserts the leaf row's debit and credit both equal the gross AND the YTD balance is 0.00."
  - "TrialBalance test queries use direct td-cell indexing (cells[3] = debit, cells[4] = credit, cells[5] = YTD balance) rather than getByText, because the same numeric string appears in multiple columns when debit == YTD balance. Trade-off: tighter coupling to the column layout in exchange for unambiguous assertions. (Rule 3 auto-fix: getByText raised multi-match errors on first run.)"
  - "Audit emission is fire-and-forget (void emitAudit(...)) — the state mutation commits synchronously via setAllEntries, the audit append runs async via the adapter promise chain. Errors are console.error'd but do not block the lifecycle action. Acceptable for v1; if audit-log durability becomes critical it can be made awaitable."
metrics:
  duration: ~12 min
  completed: 2026-05-12
  tasks_total: 3
  tasks_completed: 3
  files_created: 2
  files_modified: 8
  tests_green_added_by_04_2: 27  # 12 useJournals + 5 JournalForm + 5 JournalSearch + 5 TrialBalance
  tests_green_total_spa_at_summary: 354  # observed in final run (includes parallel 04-3 GREEN flips on AccountManager / EntityForm / registers)
  tests_todo_remaining_spa_at_summary: 26  # belongs to 04-4 ImportTB + ImportReviewPane + XlsxSheetPicker scaffolds
  tests_green_total_server: 18  # unchanged from Phase 3 baseline
  tests_red: 0
  commits: 3  # plus 1 docs commit for this SUMMARY (added separately)
  storage_adapter_unchanged: true
  v3_types_unchanged: true
  ledger_ts_unchanged: true
  parameterless_new_date_in_owned_files: 0
---

# Phase 4 Plan 2: Journal CRUD + Audit + Trial Balance Refactor — Summary

Wave 2 of Phase 4 closed the journal-lifecycle gap. The Phase-2 useJournals only exposed `addEntry` + `importEntries`; Phase 4 needs the full state machine (draft → posted, posted → superseded via edit, posted → reversed via reversal, draft → voided). The pure-function engine landed in Wave 0 (04-1); this plan wires it into hook state, audit emission, and UI surfaces — JournalForm (edit-supersedes mode + Reverse + Void), JournalSearch (BOOK-12 filter panel), EditJournalDiff (side-by-side preview), TrialBalance (period-filtered + parent subtotals + status-aware), and AuditTrail (widened action labels + JSON-summary rendering).

Wave 2 ran in parallel with Plan 04-3 (CoA UI + entity registers); the two plans touched fully disjoint files (verified at start and end). git serialised the four commits naturally — no rebase / no force-push needed.

## Commits

| Hash       | Type | Scope | Files                                                                                                                                                        |
| ---------- | ---- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `176ee55`  | feat | 04-2  | src/hooks/useJournals.ts, src/hooks/\_\_tests\_\_/useJournals.test.ts                                                                                        |
| `05a8a57`  | feat | 04-2  | src/components/EditJournalDiff.tsx, src/components/JournalSearch.tsx, src/components/JournalForm.tsx, JournalForm.test.tsx, JournalSearch.test.tsx           |
| `2bf2f66`  | feat | 04-2  | src/components/TrialBalance.tsx, src/components/AuditTrail.tsx, src/components/\_\_tests\_\_/TrialBalance.test.tsx                                           |
| docs (this commit) | docs | 04-2  | .planning/phases/04-bookkeeping-core/04-2-SUMMARY.md                                                                                                 |

## What Changed

### Task 1 — useJournals extension (`176ee55`)

**New exports on `JournalsHook`:**

- `postDraft(entry)` — calls `validateBalanced(entry.lines)` BEFORE persistence (BOOK-01 data-layer enforcement). Throws `JournalNotBalancedError` on imbalance. Marks `status: 'posted', isPosted: true, _v: 3`.
- `editPosted(original, edits)` — builds `replacement = makeSupersedingEdit(original, edits)` (throws if `edits.lines` is supplied unbalanced). Single `setAllEntries` update: marks original `status: 'superseded'` + `replacedByEntryId: replacement.id`, prepends replacement. Audit emission via `emitAudit('EDIT_JOURNAL', { summary, before, after })`.
- `reversePosted(original, reversalDate?)` — builds `reversal = makeReversal(original, reversalDate)`. Marks original `status: 'reversed'`; prepends reversal. Audit emission via `emitAudit('REVERSE_JOURNAL', { summary, original, reversalEntry })`.
- `voidDraft(entry)` — throws if `entry.isPosted || entry.status === 'posted'`. Else filters the entry out of the entity's list. Audit emission via `emitAudit('VOID_JOURNAL', { summary, before: entry })`.
- `searchJournals(filters)` — memoised `useCallback` wrapping `ledger.searchJournals(entries, filters)` scoped to active-entity entries, filtering out superseded / voided.

**Preservation:** Phase-2 `addEntry`, `importEntries`, `filteredEntries`, `searchQuery`, `setSearchQuery`, `dateFrom/To` all preserved verbatim. `addEntry` now calls `validateBalanced` only when `entry.isPosted === true` (so the legacy fixture with empty lines stays compatible by passing `isPosted: false`).

**Audit emission helper:** `emitAudit(action, details)` is a single async helper that fetches the adapter, constructs an `AuditLog` with `_v: 3, id: crypto.randomUUID(), timestamp: today().toISOString(), user: 'Local user', action, entityId, details: JSON.stringify(details)`. Fire-and-forget — errors are `console.error`'d but never block the lifecycle mutation.

**12 `.todo` cases flipped GREEN:**
- `postDraft enforces balance at data layer` (balanced OK; unbalanced throws)
- `editPosted supersedes original` (original gets status: 'superseded' + replacedByEntryId; replacement carries replacesEntryId)
- `editPosted writes EDIT_JOURNAL audit with before snapshot` (spied via `vi.spyOn(adapter, 'appendAuditLog')`)
- `EDIT_JOURNAL audit has before snapshot` (parsed `details.before.lines` is an array matching original.lines.length)
- `reversePosted mirrors lines` (reversal.lines[i].debit === original.lines[i].credit, swapped)
- `reversePosted writes REVERSE_JOURNAL audit`
- `reversesEntryId link` (reversal.reversesEntryId === original.id; original.status === 'reversed')
- `voidDraft only on drafts` (draft is gone from state after voidDraft)
- `voidDraft refuses posted` (throws on a posted entry)
- `searchJournals reference and description` (independent matches on `reference: 'INV'` and `description: 'wages'`)
- `searchJournals by account` (line accountId filter)
- `searchJournals by amount range` (line debit/credit in [amountFrom, amountTo])

### Task 2 — EditJournalDiff + JournalSearch + JournalForm refactor (`05a8a57`)

**`src/components/EditJournalDiff.tsx` (new):**
- Props: `{ original: JournalEntry; proposed: JournalEntry; accounts?: Account[] }`
- Renders `data-testid="edit-journal-diff"` wrapper
- Two-column grid (md:grid-cols-2): Original / Proposed
- Field-level diff: `date`, `reference`, `description` — yellow-highlight via `bg-yellow-50 font-medium` when values differ
- Per-line diff: render up to `max(original.lines.length, proposed.lines.length)` rows; highlight any line where `accountId | debit | credit | description` differs
- aria-labels: `original-{date,reference,description}` + `proposed-{date,reference,description}`
- Falls back to a red error message if `original.id === proposed.id` (defensive — supersession always produces a fresh id)

**`src/components/JournalSearch.tsx` (new):**
- Props: `{ accounts: Account[]; onSearch: (filters: SearchFilters) => void; defaultFilters?: Partial<SearchFilters> }`
- 7 controls + Clear-all button; aria-labels: `filter-reference`, `filter-description`, `filter-account`, `filter-date-from`, `filter-date-to`, `filter-amount-from`, `filter-amount-to`
- 150ms debounce via `setTimeout` inside `useEffect` keyed on all 7 input values + onSearch
- Account dropdown: `<option value="">All accounts</option>` + one per account (4 total for 3 accounts)
- Amount inputs: `type="number"` with `step="0.01"`
- `data-testid="journal-search-panel"` and `data-testid="search-clear-all"`

**`src/components/JournalForm.tsx` refactor:**
- Additive new props: `editingOriginal?`, `onEdit?`, `onReverse?`, `onVoidDraft?`
- `isEditMode = !!editingOriginal` controls the divergent paths
- Form fields pre-populate from `editingOriginal` when set (date, reference, description, lines via spread-clone)
- Title: "New Journal Entry" or "Edit Journal Entry (supersedes)"
- Banner (`data-testid="edit-banner"`) carries the literal copy `"This will replace the original. The original stays in the audit trail."` (test-asserted substring `"This will replace the original"`)
- Submit handler: in edit mode, after validation passes, sets `showDiff = true` instead of calling `onSave` — preserves the proposed JournalEntry as `proposedEntry` (id `'proposed-preview'`)
- Diff confirm step (`data-testid="edit-confirm-step"`): renders `<EditJournalDiff />` + Confirm replace button (`data-testid="confirm-edit"`) + Back to edit button
- Reverse button (`data-testid="reverse-button"`) visible in edit mode when `onReverse` supplied
- Void button (`data-testid="void-button"`) visible for drafts when `onVoidDraft` supplied (non-edit mode)
- Submit button text + testid swap: `'Save Edit'` / `'save-edit-button'` vs `'Post Journal'` / `'post-journal-button'`

**10 `.todo` cases flipped GREEN (5 JournalForm + 5 JournalSearch).**

### Task 3 — TrialBalance + AuditTrail (`2bf2f66`)

**`src/components/TrialBalance.tsx` refactor:**
- Optional `period?: Period` + `onPeriodChange?: (period: Period) => void` props; falls back to internal `useState` initialised to `{ type: 'fy', fy: currentFy() }`
- Period-type select (`aria-label="period-type"`): Financial Year / Quarter / Custom range
- Quarter dropdown (`aria-label="period-quarter"`) visible only when `period.type === 'quarter'`
- `isLiveForTB(entry)` BOOK-09 filter: drops `voided | superseded | draft`; keeps `posted | reversed`; treats absent-status v2 entries as live iff `isPosted === true`
- `isInPeriod(new Date(entry.date), period)` per entry (date PARSE — structural-lint compliant)
- Parent subtotal aggregation: build `childrenOf` map from `Account.parentCode`; for each row that is a parent (has ≥ 1 child), compute `debit = sum(kids.debit), credit = sum(kids.credit), balance = (Asset/Expense ? D-C : C-D)`. Parent rows render with `(subtotal)` suffix and `data-testid="tb-parent-{code}"`; leaf rows use `data-testid="tb-row-{code}"`
- Row visibility: keep rows where `debit !== 0 || credit !== 0 || isParent` (parent headers stay visible at zero so the CoA hierarchy is always discoverable in the TB)
- Footer totals exclude `isParent` rows to avoid double-counting; `tb-balance-flag` shows "Balanced" when `|totalDebits - totalCredits| < 0.005` (matches ledger.ts BALANCE_TOLERANCE)
- Other test-ids: `tb-period-controls`, `tb-total-debits`, `tb-total-credits`

**`src/components/AuditTrail.tsx` extension:**
- `getActionColor` switch widened to all 17 actions in the v3 AuditAction enum (EDIT_JOURNAL, REVERSE_JOURNAL, VOID_JOURNAL, DELETE_JOURNAL, CREATE/UPDATE/ARCHIVE/DELETE_ACCOUNT, DELETE_ENTITY, IMPORT_TB, EXPORT_DATA, LOCK_FY, UNLOCK_FY)
- `renderDetails(details)` — if details starts with `{`, parse as JSON and surface `parsed.summary` if it's a string; else fall through to raw. This lets the new EDIT/REVERSE/VOID audit JSON payloads render their human-readable `summary` in the existing line-clamp-2 cell

**5 `.todo` cases flipped GREEN (TrialBalance).**

## Test Results

| Surface | Baseline (pre-04-2) | After 04-2 | Delta from 04-2 |
| --- | --- | --- | --- |
| SPA GREEN | 296 | 354 | +27 owned (12 useJournals + 5 JournalForm + 5 JournalSearch + 5 TrialBalance); +31 came from parallel 04-3 GREEN flips on AccountManager / EntityForm / registers |
| SPA TODO | 80 | 26 | -27 owned (5 still belong to 04-4 ImportTB / ImportReviewPane / XlsxSheetPicker) |
| SPA RED / failing | 0 | 0 | unchanged |
| Server GREEN | 18 | 18 | unchanged (Plan 04-2 does no server work) |

**Per-task verification:**
- `npx vitest run src/hooks/__tests__/useJournals.test.ts` — 18 passed (6 Phase-2 + 12 Phase-4)
- `npx vitest run src/components/__tests__/JournalForm.test.tsx src/components/__tests__/JournalSearch.test.tsx` — 10 passed
- `npx vitest run src/components/__tests__/TrialBalance.test.tsx` — 5 passed
- `npm run lint` — exit 0 (tsc --noEmit + server tsc --noEmit)
- `npm run test` — exit 0 (354 passed + 26 todo + 0 failed across 47 test files)
- `npm run test:server` — exit 0 (18 passed across 6 test files)
- `npm run build` — exit 0 (Vite production build, 16.71 s, 961 kB JS / 282 kB gzip; expected size given app surface)

**Invariant checks (all PASS):**
- `git diff src/storage/adapter.ts` — empty (Phase 3 StorageAdapter FINAL preserved)
- `git diff src/types.ts` — empty (v3 types from Plan 04-1 frozen)
- `git diff src/lib/ledger.ts` — empty (Wave 0 pure functions consumed verbatim)
- `git diff src/lib/period.ts` — empty
- Grep `\bnew Date\s*\(\s*\)|\bDate\.now\s*\(` across all 04-2-owned source files — zero matches (`new Date(entry.date)` and `new Date('2025-07-01')` are date PARSING and allowed by structural-lint)

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 3 - Blocking] TrialBalance test getByText ambiguity**
- **Found during:** Task 3 first vitest run (3 / 5 tests failed)
- **Issue:** `within(rentRow).getByText('100.00')` matched both the Debit column AND the YTD Balance column when the two values happened to be equal (which is the common case for a single-leg journal posting). Testing Library raised "Found multiple elements with the text" errors.
- **Fix:** Added a `debitCellValue(row)` helper that pulls the row's `<td>` children and reads cell index 3 (debit) / 4 (credit) / 5 (YTD balance) directly. Tightens the test assertions to specific cells while keeping the production component unchanged.
- **Files modified:** `src/components/__tests__/TrialBalance.test.tsx` only
- **Commit:** `2bf2f66`

**2. [Rule 3 - Blocking] Phase-2 useJournals fixture incompatible with new balance check**
- **Found during:** Task 1 — the new `addEntry` validateBalanced call rejected the Phase-2 `makeEntry` fixture (empty `lines: []`) because the fixture defaulted to `isPosted: true`.
- **Issue:** Pre-existing Phase-2 tests `entries selector returns the entity's slice…`, `addEntry appends and calls addLog with POST_JOURNAL`, `filteredEntries respects searchQuery`, `persists to adapter on change` all instantiated entries with no lines and `isPosted: true`. The new data-layer balance enforcement throws on `< 2 lines`.
- **Fix:** Updated the four Phase-2 tests to pass `isPosted: false` when using the empty-lines fixture (drafts are NOT subject to validateBalanced in the new addEntry path). Functional contract of the tests preserved — the assertions on entries/filteredEntries/addLog don't depend on isPosted.
- **Files modified:** `src/hooks/__tests__/useJournals.test.ts` only
- **Commit:** `176ee55`

### Plan-conformant additions (NOT auto-fixes — these were obvious refinements during transcription)

- **JournalForm: "Back to edit" button.** The plan specified only the "Confirm replace" button on the diff confirm step. Added a sibling "Back to edit" button so users can iterate on the proposed edit without losing form state. No test-name churn; the confirm-supersede test only asserts the Confirm path.
- **AuditTrail.renderDetails error fallback.** The plan said `if (log.details.startsWith('{')) { try parse, return summary } return raw`. Explicit `catch { /* fall through */ }` keeps the function total even on malformed JSON.

### Architectural changes considered & rejected

None — the plan was fully concrete and the Wave 0 contracts held without modification.

### Authentication gates

None — Plan 04-2 is purely SPA-side; no Gemini API, no auth flows.

## Hand-off

**To Plan 04-4 (Wave 3 — ImportTB refactor):**
- `useJournals.postDraft` is the entry point for the opening-balances journal: `postDraft({...openingEntry, importFingerprint: fingerprint})` runs `validateBalanced` then persists with `status: 'posted'`. The `importFingerprint` field is already on the v3 JournalEntry type (Plan 04-1).
- `JournalForm.tsx` exposes the edit-supersedes flow; ImportTB does NOT need to use it (imports always create new entries, never supersedes), but if a user discovers an import error after the fact they can use the JournalForm edit flow on the opening journal.
- `searchJournals` is available via `useJournals.searchJournals(filters)` for the journals view — App.tsx wiring of the JournalSearch component is left to the consumer; the plan deliberately did not modify App.tsx (which is owned by the orchestrator / shell concern).
- AuditTrail is ready for the `IMPORT_TB` action label (already wired in this plan).
- TrialBalance now respects period boundaries — ImportTB can post an opening-balances journal dated `asAtDate` and the TB will correctly include it when the user's period filter covers that date.

**To Plan 04-3 (Wave 2 sibling, also running):**
- Disjoint file ownership held end-to-end. Both plans modify `src/components/AuditTrail.tsx`? — NO, only 04-2 touches AuditTrail. Both plans touch `useEntities` / `useAccounts`? — NO, those are 04-3 only.
- 04-2 left `src/types.ts` and `src/storage/adapter.ts` untouched as required.
- No coordination needed at App.tsx — neither plan modified it.

**To `/gsd:verify-work`:**
- Phase 4 success criterion #1 (CoA browsable + parent subtotals on TB) — PARTIAL: TB parent subtotals delivered here (04-2); CoA browsing delivered by 04-3.
- Phase 4 success criterion #2 (Journal CRUD + audit with edit + reverse, both in immutable audit trail with before/after + timestamps) — DELIVERED end-to-end by this plan. Verifiable via `editPosted writes EDIT_JOURNAL audit with before snapshot` + `reversePosted writes REVERSE_JOURNAL audit` + the AuditTrail UI rendering both.
- Success criteria #3 (CSV/XLSX import + column-mapping + fuzzy-match), #4 (Idempotent re-import), #5 (AU entity registers) — DEFERRED to Plans 04-3 (#5) and 04-4 (#3, #4).

## Requirements Addressed

| Requirement | How Plan 04-2 Satisfies |
| --- | --- |
| **BOOK-01** Data-layer balance enforcement | `useJournals.addEntry` (for posted entries) and `useJournals.postDraft` call `ledger.validateBalanced(entry.lines)` BEFORE persisting. Throws `JournalNotBalancedError` on imbalance > 0.005. UI's existing 0.001 pre-check is strictly tighter so it stays for fast feedback. Unit test: `postDraft enforces balance at data layer`. |
| **BOOK-02** Edit posted via supersession + audit | `useJournals.editPosted(original, edits)` calls `ledger.makeSupersedingEdit` (which generates a fresh id with `replacesEntryId: original.id`), marks original `status: 'superseded'` + `replacedByEntryId`, emits `EDIT_JOURNAL` audit log with full before/after JSON snapshot. `JournalForm` renders the banner + EditJournalDiff side-by-side preview + Confirm replace button. Component test: `confirm-supersede dialog appears before save`. |
| **BOOK-03** Reverse posted via balancing entry + audit | `useJournals.reversePosted(original, reversalDate?)` calls `ledger.makeReversal` (mirrored debits/credits, fresh id, `reversesEntryId: original.id`, `status: 'posted'`), marks original `status: 'reversed'`, emits `REVERSE_JOURNAL` audit log. Both original and reversal coexist in the TB and net to zero. Unit tests: `reversePosted mirrors lines`, `reversesEntryId link`. |
| **BOOK-04** Void draft only | `useJournals.voidDraft(entry)` throws when `entry.isPosted || entry.status === 'posted'`; else removes the draft and emits `VOID_JOURNAL` audit log with full entry snapshot in `before`. Unit tests: `voidDraft only on drafts`, `voidDraft refuses posted`. |
| **BOOK-09** Period-filtered TB excluding voided / superseded / draft | `TrialBalance.isLiveForTB` drops voided/superseded/draft, keeps posted+reversed. `isInPeriod(new Date(entry.date), period)` filters by period boundary. Tests: `period filter`, `excludes voided superseded draft`, `balanced footer`. |
| **BOOK-11** Immutable audit trail with widened actions | `useJournals.emitAudit` writes via `getAdapter().appendAuditLog(...)` with structured JSON details `{summary, before, after}`. `AuditTrail` widened action-label switch surfaces all 17 v3 audit actions. `renderDetails` surfaces the JSON `summary` for human readability. Test: `EDIT_JOURNAL audit has before snapshot`. |
| **BOOK-12** Journal search filter panel | `JournalSearch` exposes reference / description / account / date range / amount range filters. `useJournals.searchJournals(filters)` wraps the Wave 0 `ledger.searchJournals` pure function scoped to active-entity live entries. Tests: all 5 `.todo` cases. |

Partial / boundary:
- **BOOK-07** Parent subtotals on TB — DELIVERED here (the TrialBalance parent aggregation). The CoA TreeView UI for AccountManager is Plan 04-3's territory.

## Self-Check: PASSED

Verified by re-checking each load-bearing artifact:

```
FOUND: src/hooks/useJournals.ts                                  (modified, 297 lines)
FOUND: src/hooks/__tests__/useJournals.test.ts                   (modified, 18 tests passing)
FOUND: src/components/EditJournalDiff.tsx                        (created, 145 lines)
FOUND: src/components/JournalSearch.tsx                          (created, 170 lines)
FOUND: src/components/JournalForm.tsx                            (modified, 539 lines)
FOUND: src/components/__tests__/JournalForm.test.tsx             (modified, 5 tests passing)
FOUND: src/components/__tests__/JournalSearch.test.tsx           (modified, 5 tests passing)
FOUND: src/components/TrialBalance.tsx                           (modified, 256 lines)
FOUND: src/components/__tests__/TrialBalance.test.tsx            (modified, 5 tests passing)
FOUND: src/components/AuditTrail.tsx                             (modified, 119 lines)

FOUND: commit 176ee55  (Task 1 — useJournals)
FOUND: commit 05a8a57  (Task 2 — EditJournalDiff + JournalSearch + JournalForm)
FOUND: commit 2bf2f66  (Task 3 — TrialBalance + AuditTrail)

INVARIANT: git diff src/storage/adapter.ts  → empty (StorageAdapter FINAL preserved)
INVARIANT: git diff src/types.ts            → empty (v3 types from Plan 04-1 frozen)
INVARIANT: git diff src/lib/ledger.ts       → empty (Wave 0 pure functions consumed verbatim)
INVARIANT: parameterless new Date() / Date.now() in any 04-2-owned source file → zero matches

VERIFICATION:
  npm run lint                                    → exit 0
  npx vitest run src/hooks/__tests__/useJournals.test.ts          → 18 passed
  npx vitest run src/components/__tests__/JournalForm.test.tsx    → 5 passed
  npx vitest run src/components/__tests__/JournalSearch.test.tsx  → 5 passed
  npx vitest run src/components/__tests__/TrialBalance.test.tsx   → 5 passed
  npm run test                                    → 354 passed + 26 todo + 0 failed across 47 files
  npm run test:server                             → 18 passed across 6 files
  npm run build                                   → exit 0 (16.71 s)
```
