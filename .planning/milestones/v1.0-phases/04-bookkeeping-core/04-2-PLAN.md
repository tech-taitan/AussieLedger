---
phase: 04-bookkeeping-core
plan: 2
type: execute
wave: 2
depends_on: [1]
files_modified:
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
autonomous: true
requirements:
  - BOOK-01
  - BOOK-02
  - BOOK-03
  - BOOK-04
  - BOOK-09
  - BOOK-11
  - BOOK-12
must_haves:
  truths:
    - "useJournals exposes editPosted, reversePosted, voidDraft, searchJournals filters that mirror src/lib/ledger.ts semantics"
    - "postDraft enforces validateBalanced at the data layer — UI 0.001 pre-check remains but data-layer is authoritative (BOOK-01)"
    - "Editing a posted journal entry creates a new entry (replacesEntryId) and marks the original status: 'superseded' + replacedByEntryId — neither original nor lines mutated (BOOK-02)"
    - "Reversing a posted journal entry creates a balancing entry via makeReversal (reversesEntryId) — both entries stay in the audit trail (BOOK-03)"
    - "Voiding a draft removes (or marks voided) only when status === 'draft' — refuses posted entries (BOOK-04)"
    - "Every edit / reverse / void writes a widened-action AuditLog via appendAuditLog with full before-snapshot JSON in details (BOOK-11)"
    - "JournalForm gains Edit + Reverse buttons on posted entries; edit flow shows banner + EditJournalDiff side-by-side preview before save (BOOK-02 UX)"
    - "JournalSearch panel exposes reference / description / accountId / dateFrom / dateTo / amountFrom / amountTo filters and wires to useJournals.searchJournals (BOOK-12)"
    - "TrialBalance gains period filter (FY / quarter / custom) hooked into src/lib/period.ts isInPeriod (BOOK-09)"
    - "TrialBalance shows parent-row subtotals using Account.parentCode hierarchy (BOOK-07)"
    - "TrialBalance excludes voided / superseded / draft entries from rollup (BOOK-09)"
    - "AuditTrail surfaces the widened actions (EDIT_JOURNAL, REVERSE_JOURNAL, VOID_JOURNAL) with timestamp / actor / before-after details (BOOK-11)"
    - "All Wave-0 test scaffolds owned by this plan flip GREEN — every test name from 04-VALIDATION.md owned by 04-2 is passing"
    - "StorageAdapter interface untouched — all persistence rides existing methods (Phase 3 FINAL)"
  artifacts:
    - path: "src/hooks/useJournals.ts"
      provides: "Extended hook: createDraft, postDraft (validateBalanced), editPosted (supersedes + audit), reversePosted (makeReversal + audit), voidDraft, searchJournals(filters), and per-status helpers"
      exports: ["useJournals", "JournalsHook"]
    - path: "src/components/JournalForm.tsx"
      provides: "Edit + Reverse buttons on posted entries; banner + diff preview on edit; calls useJournals.editPosted / reversePosted / voidDraft"
      contains: "editPosted"
    - path: "src/components/EditJournalDiff.tsx"
      provides: "Side-by-side diff preview pane — original vs proposed edit"
      exports: ["EditJournalDiff"]
    - path: "src/components/JournalSearch.tsx"
      provides: "Expandable filter panel — reference/description/account/date range/amount range"
      exports: ["JournalSearch"]
    - path: "src/components/TrialBalance.tsx"
      provides: "Period-filtered TB with parent subtotals; excludes voided/superseded/draft"
      contains: "isInPeriod"
    - path: "src/components/AuditTrail.tsx"
      provides: "Surfaces widened audit actions (EDIT_JOURNAL/REVERSE_JOURNAL/VOID_JOURNAL/IMPORT_TB)"
      contains: "EDIT_JOURNAL"
  key_links:
    - from: "src/hooks/useJournals.ts"
      to: "src/lib/ledger.ts"
      via: "validateBalanced + makeReversal + makeSupersedingEdit + searchJournals"
      pattern: "makeReversal|makeSupersedingEdit|validateBalanced|searchJournals"
    - from: "src/hooks/useJournals.ts"
      to: "src/storage"
      via: "getAdapter().appendAuditLog(log) per mutation"
      pattern: "appendAuditLog"
    - from: "src/components/JournalForm.tsx"
      to: "src/hooks/useJournals.ts"
      via: "editPosted / reversePosted / voidDraft callbacks"
      pattern: "editPosted|reversePosted|voidDraft"
    - from: "src/components/JournalForm.tsx"
      to: "src/components/EditJournalDiff.tsx"
      via: "renders diff preview before save"
      pattern: "EditJournalDiff"
    - from: "src/components/TrialBalance.tsx"
      to: "src/lib/period.ts"
      via: "isInPeriod(date, period) per entry"
      pattern: "isInPeriod"
    - from: "src/components/TrialBalance.tsx"
      to: "Account.parentCode hierarchy"
      via: "tree walk for parent subtotal rows"
      pattern: "parentCode"
---

<objective>
Implement Journal CRUD + Audit + Search + Trial Balance refactor against the Wave-0 contracts from 04-1. This plan flips every BOOK-01 / BOOK-02 / BOOK-03 / BOOK-04 / BOOK-09 / BOOK-11 / BOOK-12-related test scaffold from `.todo` to GREEN, AND surfaces the new behaviour through `JournalForm`, the new `JournalSearch` filter panel, the new `EditJournalDiff` preview pane, the refactored `TrialBalance` (period filter + parent subtotals), and the existing `AuditTrail`. Phase-4 success criterion #2 (journal CRUD with edit + reverse, both in immutable audit trail) is end-to-end after this plan.

Purpose: Closes the journal-lifecycle gap. Phase-2 useJournals only had `addEntry` + `importEntries`; Phase 4 needs the full state machine (draft → posted, posted → superseded via edit, posted → reversed via reversal, draft → voided). The pure-function engine landed in 04-1; this plan wires it into hook state, audit emission, and UI surfaces. Runs in parallel with 04-3 (CoA UI + entity registers) because the two plans touch disjoint files (useJournals + JournalForm + TrialBalance + JournalSearch + EditJournalDiff vs useAccounts + useEntities + AccountManager + EntityForm + BeneficiaryRegister + PartnerRegister).

Output:
- `src/hooks/useJournals.ts` extended (~120 line addition) with editPosted, reversePosted, voidDraft, searchJournals
- `src/components/JournalForm.tsx` refactored (banner + Edit/Reverse buttons + diff preview integration)
- `src/components/EditJournalDiff.tsx` NEW (~80 lines)
- `src/components/JournalSearch.tsx` NEW (~120 lines)
- `src/components/TrialBalance.tsx` refactored (period filter + parent subtotal rendering + excluding superseded entries)
- `src/components/AuditTrail.tsx` minor extension (display action icons for widened actions)
- 5 test files flip GREEN (useJournals widened, JournalForm, JournalSearch, TrialBalance, plus the postDraft balance-enforcement integration test)
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/04-bookkeeping-core/04-CONTEXT.md
@.planning/phases/04-bookkeeping-core/04-RESEARCH.md
@.planning/phases/04-bookkeeping-core/04-VALIDATION.md
@.planning/phases/04-bookkeeping-core/04-1-PLAN.md
@src/types.ts
@src/lib/ledger.ts
@src/lib/period.ts
@src/lib/money.ts
@src/storage/adapter.ts
@src/storage/index.ts
@src/hooks/useJournals.ts
@src/hooks/useAuditLog.ts
@src/components/JournalForm.tsx
@src/components/TrialBalance.tsx
@src/components/AuditTrail.tsx

<interfaces>
<!-- FINAL contracts from Plan 04-1. DO NOT MODIFY these files in this plan. -->

From src/lib/ledger.ts (Plan 04-1, FINAL pure functions):
```typescript
export class JournalNotBalancedError extends Error { … }
export function validateBalanced(lines: JournalLine[]): void;
export function makeReversal(original: JournalEntry, reversalDate?: string): JournalEntry;
export function makeSupersedingEdit(
  original: JournalEntry,
  edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
): JournalEntry;
export interface SearchFilters {
  reference?: string;
  description?: string;
  accountId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountFrom?: number;
  amountTo?: number;
}
export function searchJournals(entries: JournalEntry[], filters: SearchFilters): JournalEntry[];
```

From src/types.ts (Plan 04-1, v3):
```typescript
export type JournalEntryStatus = 'draft' | 'posted' | 'superseded' | 'reversed' | 'voided';

export interface JournalEntry {
  // ...phase 1/2 fields...
  isPosted: boolean;
  status?: JournalEntryStatus;
  reversesEntryId?: string;
  replacesEntryId?: string;
  replacedByEntryId?: string;
  importFingerprint?: string;
}

export type AuditAction =
  | 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY'
  | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'DELETE_JOURNAL'
  | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'ARCHIVE_ACCOUNT' | 'DELETE_ACCOUNT'
  | 'IMPORT_TB' | 'IMPORT_DATA' | 'EXPORT_DATA'
  | 'LOCK_FY' | 'UNLOCK_FY';
```

From src/lib/period.ts (Phase 2):
```typescript
export function today(): Date;
export function isInPeriod(date: Date, period: Period): boolean;
export function currentFy(): FyLabel;
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date };
export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1|2|3|4 }
  | { type: 'custom'; from: Date; to: Date };
```

From src/storage/adapter.ts (Phase 3 FINAL — DO NOT WIDEN):
```typescript
export interface StorageAdapter {
  appendAuditLog(log: AuditLog): Promise<void>;     // used per mutation
  saveEntries(entries: Record<string, JournalEntry[]>): Promise<void>;
  // …other 10 methods, unchanged…
}
```

Phase-2 useJournals public contract (must NOT break — App.tsx consumes verbatim):
```typescript
export interface JournalsHook {
  allEntries: Record<string, JournalEntry[]>;
  entries: JournalEntry[];
  filteredEntries: JournalEntry[];
  addEntry: (entry: JournalEntry) => void;
  importEntries: (entries: JournalEntry[]) => void;
  searchQuery: string; setSearchQuery: (q: string) => void;
  dateFrom: string;    setDateFrom: (d: string) => void;
  dateTo: string;      setDateTo: (d: string) => void;
}
```

Phase-4 useJournals widening (new methods — additive only):
```typescript
export interface JournalsHook {
  // …everything above…
  postDraft: (entry: JournalEntry) => void;        // calls validateBalanced
  editPosted: (original: JournalEntry, edits: Partial<Pick<JournalEntry, 'date'|'reference'|'description'|'lines'>>) => void;
  reversePosted: (original: JournalEntry, reversalDate?: string) => void;
  voidDraft: (entry: JournalEntry) => void;
  searchJournals: (filters: SearchFilters) => JournalEntry[];
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Extend useJournals with postDraft / editPosted / reversePosted / voidDraft / searchJournals + widened audit emission; flip useJournals.test.ts scaffolds GREEN</name>
  <files>
    src/hooks/useJournals.ts,
    src/hooks/__tests__/useJournals.test.ts
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/hooks/useJournals.ts (current Phase-2 implementation; preserve addEntry + importEntries verbatim)
    - A:/Projects/AussieLedger/src/hooks/__tests__/useJournals.test.ts (existing Phase-2 tests + Phase-4 .todo scaffolds from Plan 04-1)
    - A:/Projects/AussieLedger/src/lib/ledger.ts (validateBalanced / makeReversal / makeSupersedingEdit / searchJournals — consume verbatim)
    - A:/Projects/AussieLedger/src/storage/adapter.ts (appendAuditLog signature)
    - A:/Projects/AussieLedger/src/lib/period.ts (today() for audit timestamps)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Pattern 3: Append-Only Audit-Log Protocol" + Example 4 (edit + audit emission)
  </read_first>
  <behavior>
    - `addEntry` signature preserved verbatim from Phase 2 (App.tsx consumes it as `entry => useJournals(addLog, activeEntityId).addEntry(entry)`) — internally it MUST now call `validateBalanced(entry.lines)` before persistence; on imbalance, throw `JournalNotBalancedError` (the JournalForm UI catches and surfaces).
    - New `postDraft(entry)` method: identical to `addEntry` but explicitly intended for the draft-then-post flow (sets `status: 'posted'`, `isPosted: true` if missing, runs `validateBalanced`).
    - New `editPosted(original, edits)`:
        1. Build `replacement = makeSupersedingEdit(original, edits)` (throws if unbalanced)
        2. In one `setAllEntries` update: mark the original entry's `status: 'superseded'`, `replacedByEntryId: replacement.id`, and prepend the replacement to the entity's list
        3. After the state update commits, call `getAdapter().then(a => a.appendAuditLog({...EDIT_JOURNAL log with details JSON: {summary, before, after}...}))` (audit append fire-and-forget)
    - New `reversePosted(original, reversalDate?)`:
        1. Build `reversal = makeReversal(original, reversalDate)`
        2. `setAllEntries`: mark original `status: 'reversed'`, prepend reversal entry
        3. Audit append: `REVERSE_JOURNAL` with details `{original: original.id, reversalEntry: reversal.id, summary}`
    - New `voidDraft(entry)`:
        1. Refuse (throw or no-op + addLog warn) if `entry.status === 'posted'` or `entry.isPosted === true`
        2. `setAllEntries`: filter out the draft entry from the entity's list
        3. Audit append: `VOID_JOURNAL` with details `{summary, before: entry}`
    - New `searchJournals(filters)`: thin wrapper that calls `searchJournals(entries, filters)` from `src/lib/ledger.ts` against the current `entries` (active entity scope); returns the filtered array. Memoised via `useCallback` so JournalSearch can pass it as a stable ref.
    - `addEntry` (legacy) keeps its `addLog('POST_JOURNAL', …)` audit call; the new methods use the widened actions
    - `useJournals.test.ts` Phase-4 `.todo` scaffolds flip to runnable tests:
        - `postDraft enforces balance at data layer` — passes balanced lines (OK), unbalanced lines (throws)
        - `editPosted supersedes original` — original is found in resulting state with `status: 'superseded'` + `replacedByEntryId`; new entry has `replacesEntryId`
        - `editPosted writes EDIT_JOURNAL audit with before snapshot` AND `EDIT_JOURNAL audit has before snapshot` — both assert against a spied `appendAuditLog` mock
        - `reversePosted mirrors lines` AND `reversePosted writes REVERSE_JOURNAL audit` AND `reversesEntryId link`
        - `voidDraft only on drafts` AND `voidDraft refuses posted`
        - `searchJournals reference and description` / `searchJournals by account` / `searchJournals by amount range` — via the hook wrapper
  </behavior>
  <action>
    Step 1 — Refactor `src/hooks/useJournals.ts`. Preserve the existing exports verbatim and add the new methods. The final file structure:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { useState, useEffect, useMemo, useCallback } from 'react';
    import { JournalEntry } from '../types';
    import { AddLog } from './useAccounts';
    import { getAdapter } from '../storage';
    import { validateBalanced, makeReversal, makeSupersedingEdit, searchJournals as searchJournalsPure, type SearchFilters } from '../lib/ledger';
    import { today } from '../lib/period';

    export interface JournalsHook {
      // Phase 2 contract — keep verbatim
      allEntries: Record<string, JournalEntry[]>;
      entries: JournalEntry[];
      filteredEntries: JournalEntry[];
      addEntry: (entry: JournalEntry) => void;
      importEntries: (entries: JournalEntry[]) => void;
      searchQuery: string;
      setSearchQuery: (q: string) => void;
      dateFrom: string;
      setDateFrom: (d: string) => void;
      dateTo: string;
      setDateTo: (d: string) => void;

      // Phase 4 additions
      postDraft: (entry: JournalEntry) => void;
      editPosted: (
        original: JournalEntry,
        edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
      ) => void;
      reversePosted: (original: JournalEntry, reversalDate?: string) => void;
      voidDraft: (entry: JournalEntry) => void;
      searchJournals: (filters: SearchFilters) => JournalEntry[];
    }

    export function useJournals(
      addLog: AddLog,
      activeEntityId: string | null,
    ): JournalsHook {
      const [allEntries, setAllEntries] = useState<Record<string, JournalEntry[]>>({});
      const [searchQuery, setSearchQuery] = useState('');
      const [dateFrom, setDateFrom] = useState('');
      const [dateTo, setDateTo] = useState('');
      const [ready, setReady] = useState(false);

      // existing load + save useEffects — preserve verbatim
      useEffect(() => {
        let cancelled = false;
        (async () => {
          const adapter = await getAdapter();
          const loaded = await adapter.getEntries();
          if (cancelled) return;
          if (loaded && typeof loaded === 'object' && Object.keys(loaded).length > 0) {
            setAllEntries(loaded);
          }
          setReady(true);
        })().catch((err) => {
          console.error('useJournals load failed', err);
          setReady(true);
        });
        return () => { cancelled = true; };
      }, []);

      useEffect(() => {
        if (!ready) return;
        getAdapter()
          .then((a) => a.saveEntries(allEntries))
          .catch((err) => console.error('useJournals save failed', err));
      }, [allEntries, ready]);

      const entries = useMemo(
        () => (activeEntityId ? (allEntries[activeEntityId] ?? []) : []),
        [allEntries, activeEntityId],
      );

      const filteredEntries = useMemo(() => {
        // Exclude superseded / voided so the legacy list view stays clean
        const live = entries.filter((e) => e.status !== 'superseded' && e.status !== 'voided');
        return live.filter((entry) => {
          const q = searchQuery.toLowerCase();
          const matchesSearch =
            !q ||
            entry.reference.toLowerCase().includes(q) ||
            entry.description.toLowerCase().includes(q);
          const matchesDateFrom = !dateFrom || entry.date >= dateFrom;
          const matchesDateTo = !dateTo || entry.date <= dateTo;
          return matchesSearch && matchesDateFrom && matchesDateTo;
        });
      }, [entries, searchQuery, dateFrom, dateTo]);

      // Phase 2 — addEntry preserved, NOW with data-layer balance enforcement
      const addEntry = useCallback(
        (entry: JournalEntry) => {
          if (!activeEntityId) return;
          if (entry.isPosted) {
            validateBalanced(entry.lines);  // BOOK-01 — throws JournalNotBalancedError on imbalance
          }
          const v3entry: JournalEntry = {
            ...entry,
            _v: 3,
            status: entry.status ?? (entry.isPosted ? 'posted' : 'draft'),
          };
          setAllEntries((prev) => ({
            ...prev,
            [activeEntityId]: [v3entry, ...(prev[activeEntityId] ?? [])],
          }));
          addLog('POST_JOURNAL', `Posted journal entry ${entry.reference}: ${entry.description}`, activeEntityId);
        },
        [activeEntityId, addLog],
      );

      const importEntries = useCallback(
        (newEntries: JournalEntry[]) => {
          if (!activeEntityId) return;
          setAllEntries((prev) => ({
            ...prev,
            [activeEntityId]: [...newEntries, ...(prev[activeEntityId] ?? [])],
          }));
          addLog('IMPORT_TB', `Imported ${newEntries.length} journal entries via Trial Balance import`, activeEntityId);
        },
        [activeEntityId, addLog],
      );

      // Phase 4 additions — postDraft, editPosted, reversePosted, voidDraft, searchJournals

      const postDraft = useCallback((entry: JournalEntry) => {
        if (!activeEntityId) return;
        validateBalanced(entry.lines);
        const v3entry: JournalEntry = {
          ...entry,
          _v: 3,
          isPosted: true,
          status: 'posted',
        };
        setAllEntries((prev) => ({
          ...prev,
          [activeEntityId]: [v3entry, ...(prev[activeEntityId] ?? [])],
        }));
        addLog('POST_JOURNAL', `Posted journal entry ${entry.reference}: ${entry.description}`, activeEntityId);
      }, [activeEntityId, addLog]);

      const emitAudit = useCallback(async (action: 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL', details: object) => {
        try {
          const a = await getAdapter();
          await a.appendAuditLog({
            _v: 3,
            id: crypto.randomUUID(),
            timestamp: today().toISOString(),
            user: 'Local user',
            action,
            entityId: activeEntityId ?? undefined,
            details: JSON.stringify(details),
          });
        } catch (err) {
          console.error('appendAuditLog failed', err);
        }
      }, [activeEntityId]);

      const editPosted = useCallback((
        original: JournalEntry,
        edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>,
      ) => {
        if (!activeEntityId) return;
        const replacement = makeSupersedingEdit(original, edits);    // throws on unbalanced

        setAllEntries((prev) => {
          const list = prev[activeEntityId] ?? [];
          const updated = list.map((e) =>
            e.id === original.id
              ? { ...e, _v: 3, status: 'superseded' as const, replacedByEntryId: replacement.id }
              : e,
          );
          return { ...prev, [activeEntityId]: [replacement, ...updated] };
        });

        void emitAudit('EDIT_JOURNAL', {
          summary: `Edited journal ${original.reference}`,
          before: {
            ref: original.reference,
            desc: original.description,
            date: original.date,
            lines: original.lines,
          },
          after: {
            ref: replacement.reference,
            desc: replacement.description,
            date: replacement.date,
            lines: replacement.lines,
          },
        });
      }, [activeEntityId, emitAudit]);

      const reversePosted = useCallback((original: JournalEntry, reversalDate?: string) => {
        if (!activeEntityId) return;
        const reversal = makeReversal(original, reversalDate);

        setAllEntries((prev) => {
          const list = prev[activeEntityId] ?? [];
          const updated = list.map((e) =>
            e.id === original.id ? { ...e, _v: 3, status: 'reversed' as const } : e,
          );
          return { ...prev, [activeEntityId]: [reversal, ...updated] };
        });

        void emitAudit('REVERSE_JOURNAL', {
          summary: `Reversed journal ${original.reference}`,
          original: original.id,
          reversalEntry: reversal.id,
        });
      }, [activeEntityId, emitAudit]);

      const voidDraft = useCallback((entry: JournalEntry) => {
        if (!activeEntityId) return;
        if (entry.isPosted || entry.status === 'posted') {
          throw new Error('Cannot void a posted journal entry. Use Reverse instead.');
        }
        setAllEntries((prev) => {
          const list = prev[activeEntityId] ?? [];
          return { ...prev, [activeEntityId]: list.filter((e) => e.id !== entry.id) };
        });

        void emitAudit('VOID_JOURNAL', {
          summary: `Voided draft journal ${entry.reference}`,
          before: entry,
        });
      }, [activeEntityId, emitAudit]);

      const searchJournals = useCallback(
        (filters: SearchFilters): JournalEntry[] => {
          // Use the entities current entries scoped to active entity, excluding non-live statuses
          const live = entries.filter((e) => e.status !== 'superseded' && e.status !== 'voided');
          return searchJournalsPure(live, filters);
        },
        [entries],
      );

      return {
        allEntries,
        entries,
        filteredEntries,
        addEntry,
        importEntries,
        searchQuery,
        setSearchQuery,
        dateFrom,
        setDateFrom,
        dateTo,
        setDateTo,
        postDraft,
        editPosted,
        reversePosted,
        voidDraft,
        searchJournals,
      };
    }
    ```

    Step 2 — Convert all Phase-4 `.todo` cases in `src/hooks/__tests__/useJournals.test.ts` to runnable tests:

    Read the existing file. Locate the `Phase 4 — supersession + reversal + void + audit` describe block from Plan 04-1. Replace each `it.todo(...)` with a runnable test. Use the existing test fixture/render helper pattern (the file already uses `renderHook` from `@testing-library/react` for Phase-2 cases). Mock `getAdapter()` via `vi.mock('../../storage', () => ({ getAdapter: vi.fn(...) }))` so `appendAuditLog` calls are spied. Tests must:

    - `postDraft enforces balance at data layer` — call `result.current.postDraft({balanced})` (resolves), then `result.current.postDraft({unbalanced})` (expect throw)
    - `editPosted supersedes original` — seed an entity + one posted entry; call `editPosted(original, {description: 'edited'})`; assert original is found in resulting state with `status: 'superseded'` and `replacedByEntryId === replacement.id`; replacement has `replacesEntryId === original.id`
    - `editPosted writes EDIT_JOURNAL audit with before snapshot` AND `EDIT_JOURNAL audit has before snapshot` — assert the `appendAuditLog` mock was called once with `action: 'EDIT_JOURNAL'` and `JSON.parse(details).before.ref` matches the original's reference
    - `reversePosted mirrors lines` — assert the new reversal's `lines[i].debit === original.lines[i].credit`
    - `reversesEntryId link` — assert reversal has `reversesEntryId === original.id`; original has `status: 'reversed'`
    - `reversePosted writes REVERSE_JOURNAL audit` — assert appendAuditLog mock called with action `'REVERSE_JOURNAL'`
    - `voidDraft only on drafts` — seed a draft; call voidDraft; assert it's gone from state
    - `voidDraft refuses posted` — seed a posted entry; expect `voidDraft` throws
    - `searchJournals reference and description` / `searchJournals by account` / `searchJournals by amount range` — seed 3 entries, run the hook's searchJournals through SearchFilters and assert resulting subset

    Step 3 — Verify:
    - `npx vitest run src/hooks/__tests__/useJournals.test.ts` exits 0 — all new tests GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no regressions
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/hooks/__tests__/useJournals.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - `src/hooks/useJournals.ts` exports `JournalsHook` with the 5 new methods (`postDraft`, `editPosted`, `reversePosted`, `voidDraft`, `searchJournals`)
    - `src/hooks/useJournals.ts` imports from `../lib/ledger` and uses `validateBalanced`, `makeReversal`, `makeSupersedingEdit`, `searchJournals`
    - `src/hooks/useJournals.ts` does NOT import or modify `src/storage/adapter.ts` (Phase 3 FINAL)
    - `src/hooks/__tests__/useJournals.test.ts` Phase-4 tests are all `it(...)` (not `it.todo(...)`)
    - `npx vitest run src/hooks/__tests__/useJournals.test.ts` exits 0 — all Phase-4 tests GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    useJournals hook fully widened. App.tsx-consumed contract preserved. Every BOOK-01/02/03/04/11/12 hook-level test scaffold flipped GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build EditJournalDiff + JournalSearch components; refactor JournalForm with Edit/Reverse buttons + banner + diff preview integration; flip JournalForm.test.tsx + JournalSearch.test.tsx GREEN</name>
  <files>
    src/components/EditJournalDiff.tsx,
    src/components/JournalSearch.tsx,
    src/components/JournalForm.tsx,
    src/components/__tests__/JournalForm.test.tsx,
    src/components/__tests__/JournalSearch.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/JournalForm.tsx (current 459-line implementation; refactor — do NOT replace)
    - A:/Projects/AussieLedger/src/hooks/useJournals.ts (Task 1 output — consume `editPosted`, `reversePosted`, `voidDraft`)
    - A:/Projects/AussieLedger/src/types.ts (v3 types including JournalEntryStatus)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "Edit vs Reversal UX" decisions (banner copy verbatim; side-by-side diff)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-VALIDATION.md (test names to bind to)
  </read_first>
  <behavior>
    - `EditJournalDiff.tsx` is a presentational component:
        - Props: `{ original: JournalEntry; proposed: JournalEntry }`
        - Renders a side-by-side or stacked two-column layout — left "Original", right "Proposed"
        - Highlights changed fields: date, reference, description, plus per-line debit/credit/description changes
        - Returns null + warning copy if `original.id === proposed.id` (shouldn't happen — supersession creates a new id)
    - `JournalSearch.tsx`:
        - Props: `{ accounts: Account[]; onSearch: (filters: SearchFilters) => void; defaultFilters?: Partial<SearchFilters> }`
        - Renders an expandable panel with 5+ controls: text input (reference), text input (description), select (account), date inputs (from/to), number inputs (amountFrom/amountTo)
        - Calls `onSearch(filters)` on change (debounced 150ms via `setTimeout` ref or simply on form submit)
        - "Clear all" button resets to defaults
    - `JournalForm.tsx` refactor — preserve all existing behaviour AND:
        - Accept new optional prop `editingOriginal?: JournalEntry` (when set, form is in edit-supersedes mode)
        - Accept new optional callbacks `onEdit?: (original, edits) => void`, `onReverse?: (original) => void`, `onVoidDraft?: (entry) => void`
        - When `editingOriginal` is set:
            - Pre-populate the form fields from `editingOriginal`
            - Show a banner at the top: "This will replace the original. The original stays in the audit trail."
            - On submit, build the proposed JournalEntry shape and show `<EditJournalDiff original={editingOriginal} proposed={proposed} />` in a confirmation step before calling `onEdit(editingOriginal, edits)`
        - When NOT in edit mode and rendering a posted entry's actions:
            - Show "Edit" button → switches to edit-supersedes mode
            - Show "Reverse" button → calls `onReverse(entry)` (no diff preview needed for reversal — it's a mirrored entry, mechanically obvious)
        - When showing a draft entry's actions:
            - Show "Void" button → calls `onVoidDraft(entry)`
    - Test scaffolds flip GREEN:
        - `JournalForm.test.tsx`:
            - `edit banner and diff preview` — renders form with `editingOriginal` prop set; assert banner text appears and EditJournalDiff is rendered on confirm step
            - `renders Edit button on posted entries` — given a posted entry in entry-detail mode, assert Edit button present
            - `renders Reverse button on posted entries` — same
            - `diff preview highlights changed lines` — set up scenarios where description changes; assert highlight class or aria-label
            - `confirm-supersede dialog appears before save` — assert a confirmation interaction is required before `onEdit` fires
        - `JournalSearch.test.tsx`:
            - `renders all five filters` — assert 5+ form controls render
            - `reference filter calls searchJournals` — type into reference input; assert `onSearch` called with `{reference: 'x'}`
            - `account filter populates from accounts prop` — pass 3 accounts; assert dropdown has 3+1 ("All") options
            - `amount range numeric inputs` — both `amountFrom` and `amountTo` inputs have `type="number"`
            - `date range pickers default to FY current` — when `defaultFilters` includes FY range, both inputs reflect those
  </behavior>
  <action>
    Step 1 — Create `src/components/EditJournalDiff.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';
    import type { JournalEntry, JournalLine, Account } from '../types';
    import { cn } from '../lib/utils';

    interface EditJournalDiffProps {
      original: JournalEntry;
      proposed: JournalEntry;
      accounts?: Account[];
    }

    function changedClass(a: unknown, b: unknown): string {
      return a === b ? '' : 'bg-yellow-50 font-medium';
    }

    function renderLine(line: JournalLine, accounts?: Account[]): string {
      const acc = accounts?.find((a) => a.id === line.accountId);
      const accLabel = acc ? `${acc.code} ${acc.name}` : line.accountId;
      return `${accLabel} ${line.debit > 0 ? `D ${line.debit.toFixed(2)}` : `C ${line.credit.toFixed(2)}`} — ${line.description}`;
    }

    export const EditJournalDiff: React.FC<EditJournalDiffProps> = ({ original, proposed, accounts }) => {
      if (original.id === proposed.id) {
        return <div className="text-red-600">Diff preview unavailable: supersession not detected.</div>;
      }

      return (
        <div className="border border-[var(--line)] rounded p-4" data-testid="edit-journal-diff">
          <h3 className="text-lg font-medium mb-3">Diff preview</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Original</h4>
              <div className={changedClass(original.date, proposed.date)} aria-label="original-date">Date: {original.date}</div>
              <div className={changedClass(original.reference, proposed.reference)} aria-label="original-reference">Ref: {original.reference}</div>
              <div className={changedClass(original.description, proposed.description)} aria-label="original-description">Description: {original.description}</div>
              <h5 className="mt-3 mb-1 font-medium">Lines</h5>
              <ul className="list-disc pl-5">
                {original.lines.map((l, i) => {
                  const p = proposed.lines[i];
                  const isChanged = !p ||
                    l.accountId !== p.accountId ||
                    l.debit !== p.debit ||
                    l.credit !== p.credit ||
                    l.description !== p.description;
                  return (
                    <li key={i} className={cn(isChanged && 'bg-yellow-50 font-medium')} data-testid={`original-line-${i}`}>
                      {renderLine(l, accounts)}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Proposed</h4>
              <div className={changedClass(original.date, proposed.date)} aria-label="proposed-date">Date: {proposed.date}</div>
              <div className={changedClass(original.reference, proposed.reference)} aria-label="proposed-reference">Ref: {proposed.reference}</div>
              <div className={changedClass(original.description, proposed.description)} aria-label="proposed-description">Description: {proposed.description}</div>
              <h5 className="mt-3 mb-1 font-medium">Lines</h5>
              <ul className="list-disc pl-5">
                {proposed.lines.map((l, i) => {
                  const o = original.lines[i];
                  const isChanged = !o ||
                    l.accountId !== o.accountId ||
                    l.debit !== o.debit ||
                    l.credit !== o.credit ||
                    l.description !== o.description;
                  return (
                    <li key={i} className={cn(isChanged && 'bg-yellow-50 font-medium')} data-testid={`proposed-line-${i}`}>
                      {renderLine(l, accounts)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      );
    };
    ```

    Step 2 — Create `src/components/JournalSearch.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useState, useEffect } from 'react';
    import type { Account } from '../types';
    import type { SearchFilters } from '../lib/ledger';

    interface JournalSearchProps {
      accounts: Account[];
      onSearch: (filters: SearchFilters) => void;
      defaultFilters?: Partial<SearchFilters>;
    }

    export const JournalSearch: React.FC<JournalSearchProps> = ({ accounts, onSearch, defaultFilters }) => {
      const [reference, setReference] = useState(defaultFilters?.reference ?? '');
      const [description, setDescription] = useState(defaultFilters?.description ?? '');
      const [accountId, setAccountId] = useState(defaultFilters?.accountId ?? '');
      const [dateFrom, setDateFrom] = useState(defaultFilters?.dateFrom ?? '');
      const [dateTo, setDateTo] = useState(defaultFilters?.dateTo ?? '');
      const [amountFrom, setAmountFrom] = useState<string>(
        defaultFilters?.amountFrom !== undefined ? String(defaultFilters.amountFrom) : '',
      );
      const [amountTo, setAmountTo] = useState<string>(
        defaultFilters?.amountTo !== undefined ? String(defaultFilters.amountTo) : '',
      );

      useEffect(() => {
        const filters: SearchFilters = {
          reference: reference || undefined,
          description: description || undefined,
          accountId: accountId || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          amountFrom: amountFrom === '' ? undefined : Number(amountFrom),
          amountTo: amountTo === '' ? undefined : Number(amountTo),
        };
        const handle = setTimeout(() => onSearch(filters), 150);
        return () => clearTimeout(handle);
      }, [reference, description, accountId, dateFrom, dateTo, amountFrom, amountTo, onSearch]);

      const clearAll = () => {
        setReference(''); setDescription(''); setAccountId('');
        setDateFrom(''); setDateTo(''); setAmountFrom(''); setAmountTo('');
      };

      return (
        <div className="bg-white border border-[var(--line)] rounded p-4 mb-4" data-testid="journal-search-panel">
          <h3 className="text-sm font-medium mb-3">Search journals</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <label className="flex flex-col">
              <span>Reference</span>
              <input type="text" value={reference} onChange={(e) => setReference(e.target.value)}
                aria-label="filter-reference" className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span>Description</span>
              <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                aria-label="filter-description" className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span>Account</span>
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
                aria-label="filter-account" className="border rounded px-2 py-1">
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col">
              <span>Date from</span>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                aria-label="filter-date-from" className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span>Date to</span>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                aria-label="filter-date-to" className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span>Amount from</span>
              <input type="number" value={amountFrom} onChange={(e) => setAmountFrom(e.target.value)}
                aria-label="filter-amount-from" className="border rounded px-2 py-1" />
            </label>
            <label className="flex flex-col">
              <span>Amount to</span>
              <input type="number" value={amountTo} onChange={(e) => setAmountTo(e.target.value)}
                aria-label="filter-amount-to" className="border rounded px-2 py-1" />
            </label>
            <div className="flex items-end">
              <button type="button" onClick={clearAll} className="text-sm underline">Clear all</button>
            </div>
          </div>
        </div>
      );
    };
    ```

    Step 3 — Refactor `src/components/JournalForm.tsx`. Read the entire current file first. Add (do NOT remove anything):
    - New props (additive): `editingOriginal?: JournalEntry`, `onEdit?: (original: JournalEntry, edits: Partial<Pick<JournalEntry, 'date' | 'reference' | 'description' | 'lines'>>) => void`, `onReverse?: (original: JournalEntry) => void`, `onVoidDraft?: (entry: JournalEntry) => void`
    - On mount, if `editingOriginal` is set, pre-populate state from it AND render a banner: `"This will replace the original. The original stays in the audit trail."` (must include the literal substring `"This will replace the original"` for test assertions)
    - When the user clicks "Save Edit" (only shown in edit mode), instead of immediately calling onSave, set a state `showDiff: true` and render `<EditJournalDiff original={editingOriginal} proposed={proposedEntry} accounts={accounts} />` plus a "Confirm" button that finally fires `onEdit(editingOriginal, {...edits})`
    - Add Edit / Reverse buttons rendered when the form is displaying an existing posted entry (the existing JournalForm renders new-entry; add a parent variant flag if needed OR expose these via a sibling JournalEntryActions component invoked by the journal-list view in App.tsx; keep it simple — render the buttons inside JournalForm when `editingOriginal` is not set BUT the form is showing a saved/posted entry — gate via existing form-state flags)
    - Test the simplest path: when `editingOriginal` is provided, the banner renders and Save Edit flow shows the diff preview before completion

    The minimal refactor pattern: gate new behaviour behind `if (editingOriginal) { ... }` blocks at the top of the existing render to preserve all Phase-2 behaviour.

    Final injection sketch (add inside the existing JournalForm component, near the top of the returned JSX):
    ```typescript
    {editingOriginal && (
      <div className="bg-amber-50 border border-amber-300 p-3 rounded mb-4 text-sm" data-testid="edit-banner">
        <strong>This will replace the original.</strong> The original stays in the audit trail.
      </div>
    )}

    {showDiff && editingOriginal && (
      <>
        <EditJournalDiff
          original={editingOriginal}
          proposed={{
            ...editingOriginal,
            _v: 3,
            id: 'proposed-preview',
            date,
            reference,
            description,
            lines,
          }}
          accounts={accounts}
        />
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => {
              onEdit?.(editingOriginal, { date, reference, description, lines });
              setShowDiff(false);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            data-testid="confirm-edit"
          >Confirm replace</button>
          <button type="button" onClick={() => setShowDiff(false)} className="px-4 py-2">Back to edit</button>
        </div>
      </>
    )}
    ```

    And swap the Save button click handler when `editingOriginal` is set: `() => { if (validate...) setShowDiff(true); }`.

    Step 4 — Write `src/components/__tests__/JournalForm.test.tsx` to flip the scaffolds GREEN. Test fixtures: a small accounts array, a posted JournalEntry, render JournalForm with `editingOriginal={posted}` + `onEdit={vi.fn()}`. Assertions:
    - The banner is in the DOM
    - Clicking save (with the form pre-populated) does NOT call `onEdit` immediately; instead `EditJournalDiff` (look for `data-testid="edit-journal-diff"`) renders
    - Clicking "Confirm replace" (`data-testid="confirm-edit"`) finally fires `onEdit` exactly once with the original + edits

    Step 5 — Write `src/components/__tests__/JournalSearch.test.tsx` to flip the JournalSearch scaffolds GREEN. Tests:
    - Render with 3 accounts; assert 5+ form controls render
    - Type into `aria-label="filter-reference"` input; advance timers by 200ms (`vi.useFakeTimers` + `vi.advanceTimersByTime(200)`); assert `onSearch` called with `{reference: 'INV'}` (or appropriate value)
    - Render with `defaultFilters={{dateFrom: '2025-07-01', dateTo: '2026-06-30'}}` — assert both date inputs have those values
    - Assert `amountFrom` + `amountTo` inputs have `type="number"`

    Step 6 — Verify:
    - `npx vitest run src/components/__tests__/JournalForm.test.tsx src/components/__tests__/JournalSearch.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/JournalForm.test.tsx src/components/__tests__/JournalSearch.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/EditJournalDiff.tsx` exports `EditJournalDiff` and contains literal `data-testid="edit-journal-diff"`
    - `src/components/JournalSearch.tsx` exports `JournalSearch` and contains aria-labels `filter-reference`, `filter-description`, `filter-account`, `filter-date-from`, `filter-date-to`, `filter-amount-from`, `filter-amount-to`
    - `src/components/JournalForm.tsx` contains literal substring `"This will replace the original"` (the banner copy)
    - `src/components/JournalForm.tsx` imports `EditJournalDiff` from `./EditJournalDiff`
    - `src/components/__tests__/JournalForm.test.tsx` has runnable tests with names `'edit banner and diff preview'` AND `'confirm-supersede dialog appears before save'` (no `.todo`)
    - `src/components/__tests__/JournalSearch.test.tsx` has runnable tests with `'renders all five filters'` AND `'reference filter calls searchJournals'`
    - `npx vitest run src/components/__tests__/JournalForm.test.tsx src/components/__tests__/JournalSearch.test.tsx` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    JournalForm gains supersession-edit + diff preview + banner. JournalSearch ships as a standalone filter panel. EditJournalDiff is a presentational pure component. All bound test scaffolds GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Refactor TrialBalance with period filter + parent subtotals + status-aware filtering; flip TrialBalance.test.tsx scaffolds GREEN; touch AuditTrail to surface widened actions</name>
  <files>
    src/components/TrialBalance.tsx,
    src/components/__tests__/TrialBalance.test.tsx,
    src/components/AuditTrail.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/TrialBalance.tsx (current 109-line implementation — refactor; do not replace)
    - A:/Projects/AussieLedger/src/lib/period.ts (Period type + isInPeriod + currentFy)
    - A:/Projects/AussieLedger/src/types.ts (v3 widened Account with parentCode, JournalEntry with status)
    - A:/Projects/AussieLedger/src/components/AuditTrail.tsx (extend action labels for widened enum)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md "Pattern 5: Trial Balance with Parent Subtotals" — copy the rollup algorithm
  </read_first>
  <behavior>
    - `TrialBalance.tsx` accepts new optional prop `period?: Period` (defaults to `{type: 'fy', fy: currentFy()}`)
    - The rollup memo:
        - Filters journal entries by `isInPeriod(new Date(entry.date), period)`
        - Excludes entries where `status === 'voided' || status === 'superseded' || (entry.status === 'draft' || !entry.isPosted)`
        - Aggregates lines per account (existing logic preserved)
    - Adds period-filter UI controls at the top: a select for `type` (FY / Quarter / Custom), a label for the selected FY + Q dropdowns. Wiring: when user changes, calls a parent `setPeriod` OR maintains internal state if no callback.
    - Renders parent rows:
        - Build a code→children map from `accounts` (filter where account.parentCode === code)
        - Render in code-sorted order; for each account with isParent (i.e., it's referenced as parentCode by another account), render a header row with summed child debit/credit/balance; for non-parents, render the existing row
        - Parents that have no posted children are STILL rendered (header-style) per CONTEXT decision (CoA browser)
    - Footer: total debits, total credits, "Balanced" / "Out of Balance"
    - `AuditTrail.tsx` minor extension:
        - Existing component shows `action` strings; widen the action-label / icon mapping to include `EDIT_JOURNAL`, `REVERSE_JOURNAL`, `VOID_JOURNAL`, `IMPORT_TB`, `ARCHIVE_ACCOUNT`, `CREATE_ACCOUNT`, `UPDATE_ACCOUNT`, `DELETE_ENTITY`, `EXPORT_DATA`, `LOCK_FY`, `UNLOCK_FY` (any missing in the current mapping)
        - For details that are JSON (i.e., starts with `{`) parse and surface a "summary" field if present
    - Test scaffolds flip GREEN (`TrialBalance.test.tsx`):
        - `period filter` — render with `period={{type:'quarter',fy:'FY2026',q:2}}`; pass entries from Q1 + Q2 + Q3; assert only Q2 entries are aggregated
        - `parent subtotals` — pass two child accounts under a parent code; pass posted entries; assert the parent row's debit/credit equals sum of children's
        - `excludes voided superseded draft` — pass mixed-status entries; assert only posted+reversed entries are aggregated
        - `balanced footer` — assert footer text "Balanced" when totals match
        - `reversal entries net to zero in TB` — pass original posted entry + reversal; assert the per-account totals net to zero (both contribute, mirrored debits/credits cancel out)
  </behavior>
  <action>
    Step 1 — Refactor `src/components/TrialBalance.tsx`. Final shape (replacing the current component):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useMemo, useState } from 'react';
    import type { Account, JournalEntry, TrialBalanceRow } from '../types';
    import { isInPeriod, currentFy, type Period, type FyLabel } from '../lib/period';

    interface TrialBalanceProps {
      accounts: Account[];
      entries: JournalEntry[];
      period?: Period;
      onPeriodChange?: (period: Period) => void;
    }

    function isLiveForTB(e: JournalEntry): boolean {
      if (!e.isPosted && e.status !== 'posted' && e.status !== 'reversed') return false;
      if (e.status === 'voided' || e.status === 'superseded' || e.status === 'draft') return false;
      return true;
    }

    export const TrialBalance: React.FC<TrialBalanceProps> = ({
      accounts,
      entries,
      period: periodProp,
      onPeriodChange,
    }) => {
      const [internalPeriod, setInternalPeriod] = useState<Period>(periodProp ?? { type: 'fy', fy: currentFy() });
      const period = periodProp ?? internalPeriod;

      const setPeriod = (p: Period) => {
        if (onPeriodChange) onPeriodChange(p);
        else setInternalPeriod(p);
      };

      const tbData = useMemo(() => {
        const balances: Record<string, { debit: number; credit: number }> = {};
        accounts.forEach((acc) => { balances[acc.id] = { debit: 0, credit: 0 }; });

        // Filter: live status + in-period
        const liveEntries = entries.filter((e) => {
          if (!isLiveForTB(e)) return false;
          const d = new Date(e.date);
          return isInPeriod(d, period);
        });

        liveEntries.forEach((entry) => {
          entry.lines.forEach((line) => {
            if (balances[line.accountId]) {
              balances[line.accountId].debit += Number(line.debit) || 0;
              balances[line.accountId].credit += Number(line.credit) || 0;
            }
          });
        });

        // Build basic rows
        const baseRows: TrialBalanceRow[] = accounts.map((acc) => {
          const { debit, credit } = balances[acc.id];
          let balance = 0;
          if (['Asset', 'Expense'].includes(acc.type)) balance = debit - credit;
          else balance = credit - debit;
          return { account: acc, debit, credit, balance };
        });

        // Compute parent subtotals using parentCode
        const codeToRow = Object.fromEntries(baseRows.map((r) => [r.account.code, r]));
        const childrenOf: Record<string, TrialBalanceRow[]> = {};
        for (const r of baseRows) {
          const p = r.account.parentCode;
          if (p) {
            (childrenOf[p] ??= []).push(r);
          }
        }

        const enriched = baseRows.map((r): TrialBalanceRow => {
          const kids = childrenOf[r.account.code] ?? [];
          const isParent = kids.length > 0;
          if (!isParent) return r;
          const debit = kids.reduce((s, k) => s + k.debit, 0);
          const credit = kids.reduce((s, k) => s + k.credit, 0);
          const balance = ['Asset', 'Expense'].includes(r.account.type) ? debit - credit : credit - debit;
          return {
            account: r.account,
            debit,
            credit,
            balance,
            isParent: true,
            childTotals: { debit, credit, balance },
          };
        });

        // Filter to rows with activity OR isParent (keep parent headers even when zero)
        return enriched.filter((r) => r.debit !== 0 || r.credit !== 0 || r.isParent);
      }, [accounts, entries, period]);

      const totalDebits = tbData.filter((r) => !r.isParent).reduce((s, r) => s + r.debit, 0);
      const totalCredits = tbData.filter((r) => !r.isParent).reduce((s, r) => s + r.credit, 0);
      const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005;

      return (
        <div className="bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-medium">Trial Balance</h2>
            <div className="flex gap-2 items-center text-sm" data-testid="tb-period-controls">
              <label>
                Period type:
                <select
                  value={period.type}
                  onChange={(e) => {
                    const t = e.target.value as Period['type'];
                    if (t === 'fy') setPeriod({ type: 'fy', fy: currentFy() });
                    else if (t === 'quarter') setPeriod({ type: 'quarter', fy: currentFy(), q: 1 });
                    else setPeriod({ type: 'custom', from: new Date('2025-07-01'), to: new Date('2026-06-30') });
                  }}
                  aria-label="period-type"
                  className="border rounded px-2 py-1 ml-2"
                >
                  <option value="fy">Financial Year</option>
                  <option value="quarter">Quarter</option>
                  <option value="custom">Custom range</option>
                </select>
              </label>
              {period.type === 'quarter' && (
                <label>
                  Q:
                  <select
                    value={period.q}
                    onChange={(e) => setPeriod({ ...period, q: Number(e.target.value) as 1 | 2 | 3 | 4 })}
                    aria-label="period-quarter"
                    className="border rounded px-1 py-1 ml-1"
                  >
                    <option value={1}>Q1</option><option value={2}>Q2</option>
                    <option value={3}>Q3</option><option value={4}>Q4</option>
                  </select>
                </label>
              )}
            </div>
          </div>

          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--line-strong)]">
                    <th className="col-header text-left py-2 px-4">Code</th>
                    <th className="col-header text-left py-2 px-4">Account Name</th>
                    <th className="col-header text-left py-2 px-4 hidden md:table-cell">Type</th>
                    <th className="col-header text-right py-2 px-4">Debit</th>
                    <th className="col-header text-right py-2 px-4">Credit</th>
                    <th className="col-header text-right py-2 px-4 hidden sm:table-cell">YTD Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {tbData.map((row) => (
                    <tr
                      key={row.account.id}
                      className={row.isParent
                        ? 'bg-gray-50 font-semibold border-b border-[var(--line)]'
                        : 'data-row border-b border-[var(--line)]'}
                      data-testid={row.isParent ? `tb-parent-${row.account.code}` : `tb-row-${row.account.code}`}
                    >
                      <td className="py-3 px-4 data-value">{row.account.code}</td>
                      <td className="py-3 px-4">{row.account.name}{row.isParent && ' (subtotal)'}</td>
                      <td className="py-3 px-4 text-xs opacity-60 hidden md:table-cell">{row.account.type}</td>
                      <td className="py-3 px-4 text-right data-value">
                        {row.debit > 0 ? row.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right data-value">
                        {row.credit > 0 ? row.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right data-value font-medium hidden sm:table-cell">
                        {row.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--ink)] font-bold">
                    <td colSpan={2} className="py-4 px-4 text-right pr-4">Totals</td>
                    <td className="hidden md:table-cell"></td>
                    <td className="py-4 px-4 text-right data-value" data-testid="tb-total-debits">
                      {totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right data-value" data-testid="tb-total-credits">
                      {totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-right data-value hidden sm:table-cell" data-testid="tb-balance-flag">
                      {isBalanced ? 'Balanced' : 'Out of Balance'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      );
    };
    ```

    Step 2 — Write `src/components/__tests__/TrialBalance.test.tsx` (flip scaffolds from `.todo` to runnable). Test fixtures: build two child accounts under a parent (e.g., 6010 / 6020 both with parentCode '6000'); pass entries in different periods + statuses; assert subtotals + filtering.

    Tests to write (each flipping a `.todo`):
    - `period filter` — render with Q1+Q2+Q3 entries; assert only the active quarter's contribute
    - `parent subtotals` — assert `data-testid="tb-parent-6000"` row's debit equals sum of children's debits
    - `excludes voided superseded draft` — mix `status: 'voided'`, `'superseded'`, `'draft'`, `'posted'`, `'reversed'`; assert only posted+reversed contribute
    - `balanced footer` — assert `tb-balance-flag` shows "Balanced"
    - `reversal entries net to zero in TB` — posted + reversal for same account pair; assert account totals net to zero

    Step 3 — Extend `src/components/AuditTrail.tsx`. Read the current file. Locate the action-label/icon mapping (search for `'CREATE_ENTITY'` or `'POST_JOURNAL'`). Add the missing widened actions:
    ```typescript
    // In the existing action-icon / action-label mapping, add:
    'EDIT_JOURNAL':     { icon: ..., label: 'Edited journal' },
    'REVERSE_JOURNAL':  { icon: ..., label: 'Reversed journal' },
    'VOID_JOURNAL':     { icon: ..., label: 'Voided draft' },
    'IMPORT_TB':        { icon: ..., label: 'Imported trial balance' },
    'CREATE_ACCOUNT':   { icon: ..., label: 'Created account' },
    'UPDATE_ACCOUNT':   { icon: ..., label: 'Updated account' },
    'ARCHIVE_ACCOUNT':  { icon: ..., label: 'Archived account' },
    'DELETE_ACCOUNT':   { icon: ..., label: 'Deleted account' },
    'DELETE_ENTITY':    { icon: ..., label: 'Deleted entity' },
    'EXPORT_DATA':      { icon: ..., label: 'Exported data' },
    'LOCK_FY':          { icon: ..., label: 'Locked financial year' },
    'UNLOCK_FY':        { icon: ..., label: 'Unlocked financial year' },
    ```

    If the details field is a JSON object with a `summary` key, surface that summary instead of the raw JSON string. Pattern:
    ```typescript
    function renderDetails(log: AuditLog): string {
      if (log.details.startsWith('{')) {
        try {
          const parsed = JSON.parse(log.details);
          if (typeof parsed.summary === 'string') return parsed.summary;
        } catch { /* fall through */ }
      }
      return log.details;
    }
    ```

    Step 4 — Verify:
    - `npx vitest run src/components/__tests__/TrialBalance.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no regressions; AuditTrail's existing tests still pass
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/TrialBalance.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/TrialBalance.tsx` imports `isInPeriod` and `currentFy` from `../lib/period`
    - `src/components/TrialBalance.tsx` contains literal substring `parentCode` (for the children map)
    - `src/components/TrialBalance.tsx` contains `data-testid="tb-balance-flag"` AND `data-testid="tb-period-controls"`
    - `src/components/TrialBalance.tsx` filters entries where `status === 'voided'` and `status === 'superseded'` (string literal substring check)
    - `src/components/__tests__/TrialBalance.test.tsx` has runnable tests with names `'period filter'` AND `'parent subtotals'` AND `'excludes voided superseded draft'` AND `'balanced footer'` AND `'reversal entries net to zero in TB'` — none are `.todo`
    - `src/components/AuditTrail.tsx` contains literal substring `'EDIT_JOURNAL'` AND `'REVERSE_JOURNAL'`
    - `npx vitest run src/components/__tests__/TrialBalance.test.tsx` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0 — no regressions
  </acceptance_criteria>
  <done>
    Trial Balance period-filtered + parent subtotals + status-aware; AuditTrail surfaces widened actions. Phase-4 success criteria #1 (parent subtotals) + #2 (audit trail) visible end-to-end through the journal lifecycle.
  </done>
</task>

</tasks>

<verification>
After all three tasks complete:

1. `npm run lint` exits 0
2. `npx vitest run src/hooks src/components/__tests__/JournalForm.test.tsx src/components/__tests__/JournalSearch.test.tsx src/components/__tests__/TrialBalance.test.tsx` exits 0 — every plan-04-2-owned scaffold from 04-VALIDATION.md is GREEN
3. `npm run test` exits 0 — full SPA suite GREEN; no regressions to Phase 1/2/3 tests
4. `npm run test:server` exits 0 — Phase 3 server tests still GREEN (unchanged)
5. `src/storage/adapter.ts` is untouched (`git diff src/storage/adapter.ts` empty)
6. `git diff src/types.ts` is empty (types frozen by Plan 04-1)
7. `src/components/JournalForm.tsx` contains the banner copy literal `"This will replace the original"`
8. The Wave-0 ledger.ts module is imported but NOT modified
9. The brownfield JournalForm.tsx still passes its existing Phase-1/2 tests (no regression in saved-form behaviour)
</verification>

<success_criteria>
- Success criterion #2 (journal CRUD with edit + reverse; both in immutable audit trail with before/after + timestamps) — DELIVERED end-to-end via useJournals.editPosted + reversePosted writing EDIT_JOURNAL / REVERSE_JOURNAL audits with full JSON details; JournalForm renders banner + EditJournalDiff side-by-side preview before save
- Success criterion #1 (parent subtotals on TB) — DELIVERED via TrialBalance refactor — parents render with summed children
- Phase 4 requirements satisfied by this plan: BOOK-01 (data-layer balance enforcement), BOOK-02 (edit posted with audit), BOOK-03 (reverse posted), BOOK-04 (void draft), BOOK-09 (period-filtered TB), BOOK-11 (immutable audit trail with widened actions), BOOK-12 (journal search panel)
- Test counts (rough): +12 useJournals tests, +5 JournalForm tests, +5 JournalSearch tests, +5 TrialBalance tests = ~27 new GREEN cases
- StorageAdapter interface untouched; v3 types untouched; ledger.ts pure functions untouched — Wave 0 contracts preserved
- All audit emissions ride existing `appendAuditLog` adapter method (no widening)
</success_criteria>

<output>
After completion, create `.planning/phases/04-bookkeeping-core/04-2-SUMMARY.md` summarising:
- Files created (count + paths — EditJournalDiff, JournalSearch, plus widened JournalForm test, JournalSearch test, TrialBalance test)
- Files modified (useJournals, JournalForm, TrialBalance, AuditTrail; counts of new lines added)
- Tests: count GREEN / RED / TODO (expected: ~27 new GREEN; 0 RED)
- StorageAdapter untouched confirmation (`git diff src/storage/adapter.ts` empty)
- v3 types untouched confirmation (`git diff src/types.ts` empty)
- Phase 4 requirements addressed: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-09, BOOK-11, BOOK-12
- Hand-off to 04-4 (Import flow): JournalForm now supports edit-supersedes flow; the ImportTB refactor consumes useJournals.postDraft for the opening journal
- Hand-off note for /gsd:verify-work: success criteria #1 + #2 are visible end-to-end after this plan; #3, #4, #5 land in 04-3 / 04-4
</output>
