---
phase: 04-bookkeeping-core
plan: 4
type: execute
wave: 3
depends_on: [1, 2, 3]
files_modified:
  - src/components/ImportTB.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/components/XlsxSheetPicker.tsx
  - src/components/__tests__/XlsxSheetPicker.test.tsx
  - src/components/ImportReviewPane.tsx
  - src/components/__tests__/ImportReviewPane.test.tsx
autonomous: false
requirements:
  - IMP-01
  - IMP-02
  - IMP-03
  - IMP-04
  - IMP-05
  - IMP-06
must_haves:
  truths:
    - "ImportTB parses CSV via src/lib/import/csv.ts (PapaParse, BOM-safe) instead of the hand-rolled `text.split('\\n')` from Phase 2"
    - "ImportTB parses XLSX via src/lib/import/xlsx.ts (SheetJS) — accepts .xls and .xlsx; the old flow only accepted CSV"
    - "Multi-sheet XLSX presents an XlsxSheetPicker modal; auto-selects when exactly one sheet name matches /trial|TB|balance/i (case-insensitive)"
    - "Column-mapping UI confirmation step persists — user can override code/name/debit/credit column choices by name (not just by index)"
    - "Row-level Review pane (ImportReviewPane) surfaces fuzzy-match results: confidence ≥ 0.85 auto-applies; below threshold shows top-3 + 'create new' option; per-row include/exclude/edit"
    - "Import works fully without GEMINI_API_KEY — the AI-assist section is gated by isAiEnabled() and the deterministic fuzzyMatch path is the always-visible default (IMP-04)"
    - "Before posting, the import flow computes importFingerprint via src/lib/import/fingerprint.ts and checks existing entries for a matching fingerprint on the active entity"
    - "On fingerprint match, dialog offers Skip / Replace / Add-additional (NOT silent skip, NOT hard block) per CONTEXT decision"
    - "Posting produces a single opening-balances JournalEntry tagged with importFingerprint and isPosted: true + status: 'posted'; the entry is created via useJournals.postDraft (which validates balance)"
    - "All Wave-0 test scaffolds owned by this plan flip GREEN — ImportTB.test.tsx + XlsxSheetPicker.test.tsx + ImportReviewPane.test.tsx"
    - "Manual UAT checkpoint covers all 5 success criteria end-to-end before phase verify"
  artifacts:
    - path: "src/components/ImportTB.tsx"
      provides: "Refactored import flow: file upload (CSV+XLSX) → sheet picker if needed → column mapping by name → review pane → fingerprint check → post"
      contains: "computeImportFingerprint"
    - path: "src/components/XlsxSheetPicker.tsx"
      provides: "Modal for multi-sheet XLSX selection; auto-selects on single trial/TB/balance match"
      exports: ["XlsxSheetPicker"]
    - path: "src/components/ImportReviewPane.tsx"
      provides: "Row-level review UI — include/exclude/edit/accept-fuzzy/create-new actions per row"
      exports: ["ImportReviewPane"]
  key_links:
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/csv.ts"
      via: "parseCsvFile"
      pattern: "parseCsvFile"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/xlsx.ts"
      via: "parseXlsxFile / pickSheetByName"
      pattern: "parseXlsxFile|pickSheetByName"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/fingerprint.ts"
      via: "computeImportFingerprint before post"
      pattern: "computeImportFingerprint"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/match.ts"
      via: "fuzzyMatch per row (deterministic path)"
      pattern: "fuzzyMatch"
    - from: "src/components/ImportTB.tsx"
      to: "src/components/XlsxSheetPicker.tsx"
      via: "renders modal when multi-sheet"
      pattern: "XlsxSheetPicker"
    - from: "src/components/ImportTB.tsx"
      to: "src/components/ImportReviewPane.tsx"
      via: "renders review step"
      pattern: "ImportReviewPane"
    - from: "src/components/ImportTB.tsx"
      to: "src/hooks/useJournals.ts (postDraft)"
      via: "props.onImport receives the opening-balances entry which the parent's useJournals.postDraft posts"
      pattern: "onImport"
---

<objective>
Refactor `ImportTB.tsx` against the Wave-0 contracts from 04-1 — replace the hand-rolled CSV split with `parseCsvFile`, add XLSX support via `parseXlsxFile`, add multi-sheet picker via the new `XlsxSheetPicker`, add the row-level review UI via the new `ImportReviewPane`, add the fingerprint-based Skip/Replace/Add-additional idempotency dialog, and preserve the AI-optional gate from Phase 3. After this plan lands, Phase-4 success criteria #3 (CSV/XLSX import + column mapping + fuzzy match + AI-optional) and #4 (idempotent re-import) are visible end-to-end. The plan ends with a human-verify checkpoint covering all 5 success criteria + 23 phase requirements.

Purpose: Closes the import-flow gaps. Phase-2 ImportTB used `text.split('\n')` (breaks on Excel BOM exports per RESEARCH Pitfall 5) and had no XLSX support, no row-review pane, no idempotency. Phase-4 swaps in the deterministic library wrappers and surfaces the full review flow. Runs in Wave 3 (sequential after 04-2 + 04-3) because it depends on useJournals.postDraft (04-2) for the final posting step, and on EntityForm's accountingMethod / gstRegistered fields (04-3) for default GST inheritance on imported rows.

Output:
- `src/components/ImportTB.tsx` refactored (~250 line change — deterministic parse, sheet picker integration, review pane integration, fingerprint dialog; AI-assist gate preserved)
- `src/components/XlsxSheetPicker.tsx` NEW (~70 lines)
- `src/components/ImportReviewPane.tsx` NEW (~180 lines)
- Test files flip GREEN
- One human-verify checkpoint task at the end of the plan
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
@.planning/phases/04-bookkeeping-core/04-2-PLAN.md
@.planning/phases/04-bookkeeping-core/04-3-PLAN.md
@src/types.ts
@src/lib/import/csv.ts
@src/lib/import/xlsx.ts
@src/lib/import/fingerprint.ts
@src/lib/import/match.ts
@src/lib/ai.ts
@src/components/ImportTB.tsx
@src/hooks/useJournals.ts

<interfaces>
<!-- FINAL contracts from Plans 04-1 / 04-2 / 04-3. DO NOT MODIFY any of them. -->

From src/lib/import/csv.ts (Plan 04-1):
```typescript
export interface ParsedCsv { rows: RawRow[]; headers: string[]; }
export async function parseCsvFile(file: File): Promise<ParsedCsv>;
export function parseCsvText(text: string): ParsedCsv;
```

From src/lib/import/xlsx.ts (Plan 04-1):
```typescript
export interface ParsedXlsx { rows: RawRow[]; headers: string[]; sheetNames: string[]; }
export async function parseXlsxFile(file: File): Promise<ParsedXlsx>;
export function parseXlsxBuffer(buf: ArrayBuffer): ParsedXlsx;
export function pickSheetByName(buf: ArrayBuffer, sheetName: string): { rows: RawRow[]; headers: string[] };
```

From src/lib/import/fingerprint.ts (Plan 04-1):
```typescript
export interface ColumnMappingByName { code: string; name: string; debit: string; credit: string; }
export type RawRow = Record<string, string>;
export async function computeImportFingerprint(
  rows: RawRow[],
  mapping: ColumnMappingByName,
  entityId: string,
  asAtDate: string,
): Promise<string>;
```

From src/lib/import/match.ts (Phase 2, retained):
```typescript
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const TOP_N_CANDIDATES = 3;
export function fuzzyMatch(
  imported: Pick<ImportedAccount, 'externalCode' | 'externalName'>,
  accounts: Account[],
): MatchResult;
```

From src/lib/ai.ts (Phase 3, retained):
```typescript
export function isAiEnabled(): boolean;   // gates the AI section visibility
export const GEMINI_MODEL: string;
```

From src/types.ts (v3 widened):
```typescript
export interface JournalEntry {
  // …
  importFingerprint?: string;          // set on opening-balances entry for IMP-05
  status?: JournalEntryStatus;
}
```

From src/hooks/useJournals.ts (Plan 04-2):
```typescript
export interface JournalsHook {
  // …
  postDraft: (entry: JournalEntry) => void;   // validates balance, sets status: 'posted'
  importEntries: (entries: JournalEntry[]) => void;  // legacy bulk-import (kept for compat)
  allEntries: Record<string, JournalEntry[]>;
}
```

Existing ImportTB component prop contract (preserve):
```typescript
interface ImportTBProps {
  accounts: Account[];
  onImport: (entries: JournalEntry[]) => void;
  // Phase 4 additions (additive)
  activeEntityId?: string;             // for fingerprint
  existingEntries?: JournalEntry[];    // active entity's entries, for fingerprint dedup check
  // Phase 4 Replace-path correctness hook: when the fingerprint dialog's Replace button
  // fires, ImportTB calls onReplace(existingId, newEntry) — the parent (App.tsx) must mark
  // the existing entry as status: 'superseded' + replacedByEntryId so the 04-2 TrialBalance
  // rollup (which filters status !== 'superseded') doesn't double-count both the original
  // and replacement opening balances. Wire via useJournals.supersedeImport (a thin helper
  // mirroring editPosted's supersession arm — adds it in this plan's Task 2 wiring step).
  onReplace?: (existingId: string, newEntry: JournalEntry) => void;
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build XlsxSheetPicker + ImportReviewPane components; flip their test scaffolds GREEN</name>
  <files>
    src/components/XlsxSheetPicker.tsx,
    src/components/__tests__/XlsxSheetPicker.test.tsx,
    src/components/ImportReviewPane.tsx,
    src/components/__tests__/ImportReviewPane.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/types.ts (ImportedAccount, Account, JournalEntry)
    - A:/Projects/AussieLedger/src/lib/import/match.ts (fuzzyMatch + HIGH_CONFIDENCE_THRESHOLD)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md "CSV/XLSX parsing" + "Multi-sheet XLSX" decisions
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md Pattern 4 (two-step import flow) + Pitfall 5 (BOM)
  </read_first>
  <behavior>
    - `XlsxSheetPicker.tsx`:
        - Props: `{ sheetNames: string[]; onSelect: (name: string) => void; onCancel: () => void; autoSelectMatcher?: RegExp }`
        - `autoSelectMatcher` defaults to `/trial|TB|balance/i`
        - On mount, if exactly one sheet name matches the regex, calls `onSelect(matchedName)` immediately (skips the modal)
        - Otherwise renders a modal with the sheet names as a list of buttons; clicking calls `onSelect(name)`
        - Cancel button calls `onCancel`
    - `ImportReviewPane.tsx`:
        - Props: `{ rows: ImportedAccount[]; accounts: Account[]; onUpdate: (rows: ImportedAccount[]) => void; onAccept: () => void; onReject: () => void }`
        - Each row shows:
            - External code + name (read-only)
            - Match status badge:
                - confidence ≥ 0.85 + mappedAccountId set → "Auto-matched" green badge + show the matched account
                - confidence < 0.85 → "Review" amber badge + show top-3 candidates from existing accounts as buttons + a "Create new account" option
                - confidence 0 → "No match" red badge + force user to pick
            - Per-row Include / Exclude toggle (boolean; excluded rows don't post)
            - Per-row Edit (inline) — debit and credit amount inputs
        - Top of pane: "Accept import" button (fires `onAccept`) and "Reject all" button (fires `onReject`)
        - The fuzzy-match results are passed in via `rows[i].mappedAccountId` + `rows[i].confidence` (computed upstream); the pane only renders + allows user override
  </behavior>
  <action>
    Step 1 — Create `src/components/XlsxSheetPicker.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useEffect } from 'react';

    interface XlsxSheetPickerProps {
      sheetNames: string[];
      onSelect: (sheetName: string) => void;
      onCancel: () => void;
      autoSelectMatcher?: RegExp;
    }

    const DEFAULT_MATCHER = /trial|TB|balance/i;

    export const XlsxSheetPicker: React.FC<XlsxSheetPickerProps> = ({
      sheetNames,
      onSelect,
      onCancel,
      autoSelectMatcher = DEFAULT_MATCHER,
    }) => {
      useEffect(() => {
        const matches = sheetNames.filter((n) => autoSelectMatcher.test(n));
        if (matches.length === 1) {
          onSelect(matches[0]);
        }
      }, [sheetNames, autoSelectMatcher, onSelect]);

      const matches = sheetNames.filter((n) => autoSelectMatcher.test(n));
      if (matches.length === 1) {
        // Auto-select fired in effect; render nothing
        return null;
      }

      return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" data-testid="xlsx-sheet-picker-modal">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium mb-3">This workbook has {sheetNames.length} sheets</h3>
            <p className="text-sm opacity-60 mb-4">Which sheet contains the trial balance?</p>
            <ul className="space-y-2 mb-4">
              {sheetNames.map((name) => (
                <li key={name}>
                  <button
                    type="button"
                    onClick={() => onSelect(name)}
                    className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
                    data-testid={`sheet-option-${name}`}
                  >
                    {name}
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button type="button" onClick={onCancel} className="text-sm underline">Cancel</button>
            </div>
          </div>
        </div>
      );
    };
    ```

    Step 2 — Create `src/components/__tests__/XlsxSheetPicker.test.tsx` and flip scaffolds:
    - `auto-selects single matching sheet` — render with sheetNames `['Sheet1', 'Trial Balance', 'Other']`; spy onSelect; assert onSelect called once with `'Trial Balance'` and modal NOT rendered
    - `modal shown when multiple sheets` — sheetNames `['Trial Balance', 'TB Detail']` (both match the regex); assert modal IS rendered with both options
    - `regex matches trial / TB / balance case-insensitive` — assert sheetNames `['BALANCE_SHEET', 'other']` triggers single auto-select on 'BALANCE_SHEET'
    - `user pick fires onSelect with sheet name` — multi-sheet scenario; click `sheet-option-Foo`; assert onSelect called with `'Foo'`

    Step 3 — Create `src/components/ImportReviewPane.tsx`:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React from 'react';
    import type { Account, ImportedAccount } from '../types';
    import { HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';
    import { cn } from '../lib/utils';

    interface ImportReviewPaneProps {
      rows: ImportedAccount[];
      accounts: Account[];
      onUpdate: (rows: ImportedAccount[]) => void;
      onAccept: () => void;
      onReject: () => void;
    }

    interface RowExtra extends ImportedAccount {
      _include?: boolean;
      _candidates?: Array<{ accountId: string; confidence: number; name: string }>;
    }

    export const ImportReviewPane: React.FC<ImportReviewPaneProps> = ({
      rows,
      accounts,
      onUpdate,
      onAccept,
      onReject,
    }) => {
      const updateRow = (idx: number, patch: Partial<RowExtra>) => {
        const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
        onUpdate(next);
      };

      return (
        <section className="bg-white border border-[var(--line)] rounded p-4" data-testid="import-review-pane">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-lg font-medium">Review {rows.length} rows</h3>
            <div className="flex gap-2">
              <button type="button" onClick={onAccept} className="bg-blue-600 text-white px-4 py-2 rounded text-sm" data-testid="accept-import">
                Accept import
              </button>
              <button type="button" onClick={onReject} className="px-4 py-2 text-sm underline" data-testid="reject-import">
                Reject all
              </button>
            </div>
          </div>

          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Include</th>
                <th className="text-left py-2 px-2">External</th>
                <th className="text-left py-2 px-2">Match</th>
                <th className="text-right py-2 px-2">Debit</th>
                <th className="text-right py-2 px-2">Credit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const matched = accounts.find((a) => a.id === r.mappedAccountId);
                const conf = r.confidence ?? 0;
                const status = matched && conf >= HIGH_CONFIDENCE_THRESHOLD
                  ? 'auto'
                  : conf > 0 ? 'review' : 'nomatch';

                return (
                  <tr key={`${r.externalCode}-${idx}`} className="border-b" data-testid={`review-row-${idx}`}>
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        checked={(r as RowExtra)._include !== false}
                        onChange={(e) => updateRow(idx, { _include: e.target.checked })}
                        aria-label={`include-${idx}`}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <div className="font-mono text-xs">{r.externalCode}</div>
                      <div>{r.externalName}</div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        status === 'auto' && 'bg-green-100 text-green-800',
                        status === 'review' && 'bg-amber-100 text-amber-800',
                        status === 'nomatch' && 'bg-red-100 text-red-800',
                      )} data-testid={`status-${idx}`}>
                        {status === 'auto' && 'Auto-matched'}
                        {status === 'review' && 'Review'}
                        {status === 'nomatch' && 'No match'}
                      </span>
                      {matched && (
                        <div className="text-xs mt-1">→ {matched.code} {matched.name}</div>
                      )}
                      {status !== 'auto' && (
                        <div className="mt-2">
                          <select
                            value={r.mappedAccountId ?? ''}
                            onChange={(e) => updateRow(idx, { mappedAccountId: e.target.value || undefined })}
                            aria-label={`pick-account-${idx}`}
                            className="border rounded px-2 py-1 text-xs"
                          >
                            <option value="">(unmapped)</option>
                            {accounts.filter((a) => !a.isArchived).map((a) => (
                              <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => updateRow(idx, { mappedAccountId: `NEW:${r.externalCode}:${r.externalName}` })}
                            className="ml-2 text-xs text-blue-600 underline"
                            data-testid={`create-new-${idx}`}
                          >
                            Create new account
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={r.debit}
                        onChange={(e) => updateRow(idx, { debit: Number(e.target.value) })}
                        className="w-24 border rounded px-1 py-1 text-right text-xs"
                        aria-label={`debit-${idx}`}
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        value={r.credit}
                        onChange={(e) => updateRow(idx, { credit: Number(e.target.value) })}
                        className="w-24 border rounded px-1 py-1 text-right text-xs"
                        aria-label={`credit-${idx}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      );
    };
    ```

    Step 4 — Create `src/components/__tests__/ImportReviewPane.test.tsx` and flip scaffolds:
    - `auto-applies high confidence` — pass a row with `confidence: 0.9` and a valid mappedAccountId; assert the row's status badge is "Auto-matched" (via `data-testid="status-0"` text content)
    - `create new account option` — pass a row with `confidence: 0.5`; assert `data-testid="create-new-0"` is in DOM; click it; assert `onUpdate` called with mappedAccountId starting with `'NEW:'`
    - `per-row include/exclude toggle` — pass a row; toggle `aria-label="include-0"`; assert onUpdate called with `_include: false`
    - `per-row edit-inline` — pass a row; change the debit input; assert onUpdate called with new debit number
    - `reject whole import button` — click `data-testid="reject-import"`; assert onReject called once

    Step 5 — Verify:
    - `npx vitest run src/components/__tests__/XlsxSheetPicker.test.tsx src/components/__tests__/ImportReviewPane.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/XlsxSheetPicker.test.tsx src/components/__tests__/ImportReviewPane.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/XlsxSheetPicker.tsx` exports `XlsxSheetPicker` AND contains literal `data-testid="xlsx-sheet-picker-modal"`
    - `src/components/XlsxSheetPicker.tsx` contains literal `/trial|TB|balance/i`
    - `src/components/ImportReviewPane.tsx` exports `ImportReviewPane` AND contains literal `data-testid="import-review-pane"`
    - `src/components/ImportReviewPane.tsx` imports `HIGH_CONFIDENCE_THRESHOLD` from `../lib/import/match`
    - `src/components/__tests__/XlsxSheetPicker.test.tsx` Phase-4 tests all runnable
    - `src/components/__tests__/ImportReviewPane.test.tsx` Phase-4 tests all runnable
    - `npx vitest run src/components/__tests__/XlsxSheetPicker.test.tsx src/components/__tests__/ImportReviewPane.test.tsx` exits 0
    - `npm run lint` exits 0
  </acceptance_criteria>
  <done>
    XlsxSheetPicker auto-selects on single match; ImportReviewPane renders per-row review with include/exclude/edit/create-new. Both ship with full test coverage.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Refactor ImportTB to consume parseCsvFile + parseXlsxFile + XlsxSheetPicker + ImportReviewPane + computeImportFingerprint; preserve AI-optional gate; flip ImportTB.test.tsx scaffolds GREEN</name>
  <files>
    src/components/ImportTB.tsx,
    src/components/__tests__/ImportTB.test.tsx
  </files>
  <read_first>
    - A:/Projects/AussieLedger/src/components/ImportTB.tsx (current 634-line implementation — refactor; preserve AI-assist + deterministic-match logic)
    - A:/Projects/AussieLedger/src/lib/import/csv.ts (parseCsvFile / parseCsvText)
    - A:/Projects/AussieLedger/src/lib/import/xlsx.ts (parseXlsxFile / pickSheetByName)
    - A:/Projects/AussieLedger/src/lib/import/fingerprint.ts (computeImportFingerprint)
    - A:/Projects/AussieLedger/src/lib/import/match.ts (fuzzyMatch — unchanged)
    - A:/Projects/AussieLedger/src/lib/ai.ts (isAiEnabled gate)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-CONTEXT.md (Idempotent re-import → Skip/Replace/Add-additional decisions)
    - A:/Projects/AussieLedger/.planning/phases/04-bookkeeping-core/04-RESEARCH.md Example 6 (fingerprint usage)
  </read_first>
  <behavior>
    - ImportTB accepts new optional props: `activeEntityId?: string`, `existingEntries?: JournalEntry[]`, `onReplace?: (existingId, newEntry) => void`. The parent (App.tsx) wires all three — but the component remains backward-compatible if missing (skip fingerprint dedup if activeEntityId/existingEntries absent; fall through to `onImport` if onReplace absent — best-effort, with a TODO comment).
    - **App.tsx wiring (required for correct TB rollup):** add a new `useJournals.supersedeImport(existingId, newEntry)` thin helper in 04-2 T1 OR inline equivalent in App.tsx — pattern mirrors `editPosted`'s supersession arm. Body: in one setAllEntries update, mark the existing entry as `{ ...existing, _v: 3, status: 'superseded' as const, replacedByEntryId: newEntry.id }` AND prepend `newEntry` to the entity's entries. Also emit `EDIT_JOURNAL` audit with `{ summary: 'Opening balance replaced via TB re-import', before: existing, after: newEntry }`. Without this wiring, the 04-2 TrialBalance rollup (which filters `status !== 'superseded'`) would count BOTH the original opening journal AND the replacement, doubling the opening balances and silently corrupting all subsequent reports.
    - File-pick step accepts both `.csv` and `.xlsx` / `.xls`:
        - On CSV: `await parseCsvFile(file)` → set rows + headers state
        - On XLSX: `await parseXlsxFile(file)` → if `sheetNames.length > 1`, set XlsxSheetPicker visible with sheetNames; else use the first sheet's rows directly
        - XlsxSheetPicker's `onSelect` calls `pickSheetByName(buffer, name)` and sets rows + headers
    - Column-mapping step uses HEADER NAMES, not indices (the Phase-2 flow used numeric indices on a `string[][]` shape; the new flow uses `Record<string, string>` rows where keys are header names). UI: dropdown per role (code / name / debit / credit), populated with the parsed header list.
    - Map step → ImportReviewPane: build initial `ImportedAccount[]` from rows + chosen mapping; run `fuzzyMatch` per row using the existing match.ts; pass the resulting list to ImportReviewPane
    - AI-assist section: gated behind `isAiEnabled()` (unchanged from Phase 3); the deterministic fuzzyMatch path runs unconditionally and is the default; AI-assist re-runs the matching with Gemini if user clicks it
    - Before posting:
        - Compute `fingerprint = await computeImportFingerprint(filteredRows, mappingByName, activeEntityId, asAtDate)`
        - Search `existingEntries` for any entry with `importFingerprint === fingerprint`
        - If found, render a dialog with three buttons:
            - **Skip:** close the dialog, do not post (idempotent path)
            - **Replace existing journal:** post the new entry AND mark the existing entry as `status: 'voided'` (or similar — note: we don't have a direct delete-entry API, so the parent will see the fingerprint match too; for now, simplest correct behaviour is to embed the prior id in the new entry's description and let the parent handle it. The component just emits the `replacePriorImportId` hint via the `onImport` callback)
            - **Import as additional:** allow posting alongside; the new entry gets a fresh fingerprint (or appends `:duplicate-{n}` to the fingerprint string) so dedup doesn't keep firing
    - The final post step builds a single opening-balances JournalEntry:
        ```typescript
        {
          id: crypto.randomUUID(),
          _v: 3,
          date: asAtDate,
          reference: `OPENING-${asAtDate}`,
          description: `Opening balances imported ${asAtDate}`,
          lines: [/* one line per included row */],
          isPosted: true,
          status: 'posted',
          importFingerprint: fingerprint,
        }
        ```
        Calls `onImport([entry])` (a single entry — IMP-06 requires a SINGLE dated opening journal)
    - Test scaffolds flip GREEN:
        - `column mapping UI confirmation` — render with parsed rows; assert 4 mapping dropdowns (code/name/debit/credit); pick mappings; advance to review step; assert the rows in ImportReviewPane reflect the mapping
        - `deterministic path works without AI` — mock `isAiEnabled()` to return false; render; assert AI section is NOT in DOM AND the deterministic-match button IS clickable AND running it surfaces ImportReviewPane
        - `fingerprint Skip Replace dialog` — render with `existingEntries=[{importFingerprint: 'matching-hash', ...}]` and rows that produce that fingerprint; advance to post; assert dialog `data-testid="fingerprint-collision-dialog"` is rendered with Skip / Replace / Add-additional buttons
        - `single opening journal posted` — happy path: rows mapped, no collision; click Accept; assert `onImport` called once with an array of length 1, the entry has `importFingerprint` set, `isPosted: true`, `status: 'posted'`
        - `XLSX flow opens sheet picker when multi-sheet` — feed an XLSX `File` (use the Phase 04-1 fixture builder) with multiple sheets; assert XlsxSheetPicker modal renders
        - `XLSX flow auto-selects single matching sheet` — feed XLSX with one sheet named 'Trial Balance' + two other un-matching names; assert no modal, rows are picked from 'Trial Balance' automatically
  </behavior>
  <action>
    Step 1 — Refactor `src/components/ImportTB.tsx`. This is a substantial refactor — the entire flow changes from "hand-rolled CSV split → flat AI button" to "library parse → optional sheet picker → column-mapping by name → review pane → fingerprint check → post".

    Read the existing file end-to-end first. Preserve:
    - The `motion` animations + lucide icons
    - The AI-assist section structure (just gate it on `isAiEnabled()`)
    - The `runAIMapping` function body (it now uses `/api/ai/match-accounts` via Phase 3)
    - The `runDeterministicMapping` core logic (consumes fuzzyMatch)

    Add (additive):
    - Accept new props `activeEntityId?: string` and `existingEntries?: JournalEntry[]`
    - State for the new flow stages:
        ```typescript
        const [sheetPickerNames, setSheetPickerNames] = useState<string[] | null>(null);
        const [xlsxBuffer, setXlsxBuffer] = useState<ArrayBuffer | null>(null);
        const [parsedRows, setParsedRows] = useState<RawRow[] | null>(null);
        const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
        const [columnMappingByName, setColumnMappingByName] = useState<ColumnMappingByName>({
          code: '', name: '', debit: '', credit: '',
        });
        const [importedRows, setImportedRows] = useState<ImportedAccount[]>([]);
        const [reviewing, setReviewing] = useState(false);
        const [fingerprintCollision, setFingerprintCollision] = useState<{
          fingerprint: string;
          existing: JournalEntry;
        } | null>(null);
        const [asAtDate, setAsAtDate] = useState<string>(today().toISOString().split('T')[0]);
        ```
    - New `handleFileUpload`:
        ```typescript
        const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const lower = file.name.toLowerCase();
          if (lower.endsWith('.csv')) {
            const { rows, headers } = await parseCsvFile(file);
            setParsedRows(rows);
            setParsedHeaders(headers);
            setIsColumnMapping(true);
          } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            const buf = await file.arrayBuffer();
            setXlsxBuffer(buf);
            const { sheetNames, rows, headers } = parseXlsxBuffer(buf);
            if (sheetNames.length > 1) {
              setSheetPickerNames(sheetNames);
            } else {
              setParsedRows(rows);
              setParsedHeaders(headers);
              setIsColumnMapping(true);
            }
          } else {
            alert('Unsupported file type. Please choose .csv, .xls, or .xlsx.');
          }
        };
        ```
    - Sheet picker integration:
        ```typescript
        {sheetPickerNames && xlsxBuffer && (
          <XlsxSheetPicker
            sheetNames={sheetPickerNames}
            onSelect={(name) => {
              const { rows, headers } = pickSheetByName(xlsxBuffer, name);
              setParsedRows(rows);
              setParsedHeaders(headers);
              setSheetPickerNames(null);
              setIsColumnMapping(true);
            }}
            onCancel={() => {
              setSheetPickerNames(null);
              setXlsxBuffer(null);
            }}
          />
        )}
        ```
    - Column-mapping UI: replace the numeric-index mapping with a per-role dropdown populated from `parsedHeaders`:
        ```typescript
        {isColumnMapping && parsedRows && (
          <div className="bg-white border border-[var(--line)] rounded p-4 mt-4" data-testid="column-mapping">
            <h3 className="text-sm font-medium mb-3">Confirm column mapping</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(['code','name','debit','credit'] as const).map((role) => (
                <label key={role} className="flex flex-col">
                  <span>{role.charAt(0).toUpperCase() + role.slice(1)} column</span>
                  <select
                    value={columnMappingByName[role]}
                    onChange={(e) => setColumnMappingByName({ ...columnMappingByName, [role]: e.target.value })}
                    aria-label={`map-${role}`}
                    className="border rounded px-2 py-1"
                  >
                    <option value="">— select —</option>
                    {parsedHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={processColumnMapping}
              disabled={!columnMappingByName.code || !columnMappingByName.name
                || !columnMappingByName.debit || !columnMappingByName.credit}
              className="mt-3 bg-blue-600 text-white px-4 py-2 rounded text-sm"
              data-testid="confirm-mapping"
            >Continue to review</button>
          </div>
        )}
        ```
    - New `processColumnMapping`:
        ```typescript
        const processColumnMapping = () => {
          if (!parsedRows) return;
          const imported: ImportedAccount[] = parsedRows.map((r) => ({
            externalCode: r[columnMappingByName.code] ?? '',
            externalName: r[columnMappingByName.name] ?? '',
            debit: Number(r[columnMappingByName.debit] ?? 0),
            credit: Number(r[columnMappingByName.credit] ?? 0),
          })).filter((r) => r.debit !== 0 || r.credit !== 0);

          // Run deterministic fuzzy match
          const matched = imported.map((row) => {
            const result = fuzzyMatch(row, accounts);
            return {
              ...row,
              mappedAccountId: result.mappedAccountId,
              confidence: result.confidence,
              reasoning: result.confidence >= HIGH_CONFIDENCE_THRESHOLD
                ? 'Auto-matched (deterministic)'
                : 'Manual review recommended',
            };
          });
          setImportedRows(matched);
          setIsColumnMapping(false);
          setReviewing(true);
        };
        ```
    - Review pane integration:
        ```typescript
        {reviewing && (
          <ImportReviewPane
            rows={importedRows}
            accounts={accounts}
            onUpdate={setImportedRows}
            onAccept={() => handleAcceptImport()}
            onReject={() => {
              setReviewing(false);
              setImportedRows([]);
              setParsedRows(null);
            }}
          />
        )}
        ```
    - New `handleAcceptImport`:
        ```typescript
        const handleAcceptImport = async () => {
          const included = importedRows.filter((r) => (r as RowExtra)._include !== false);
          // Compute fingerprint
          if (activeEntityId && parsedRows) {
            const fingerprint = await computeImportFingerprint(
              parsedRows,
              columnMappingByName,
              activeEntityId,
              asAtDate,
            );
            const collision = (existingEntries ?? []).find((e) => e.importFingerprint === fingerprint);
            if (collision) {
              setFingerprintCollision({ fingerprint, existing: collision });
              return;
            }
            // No collision — proceed
            postOpeningBalances(included, fingerprint);
          } else {
            postOpeningBalances(included, undefined);
          }
        };
        const postOpeningBalances = (rows: ImportedAccount[], fingerprint: string | undefined) => {
          const lines: JournalLine[] = rows
            .filter((r) => r.mappedAccountId && !r.mappedAccountId.startsWith('NEW:'))
            .map((r) => ({
              accountId: r.mappedAccountId!,
              description: `Opening: ${r.externalName}`,
              debit: r.debit,
              credit: r.credit,
              taxAmount: 0,
            }));
          const entry: JournalEntry = {
            _v: 3,
            id: crypto.randomUUID(),
            date: asAtDate,
            reference: `OPENING-${asAtDate}`,
            description: `Opening balances imported ${asAtDate}`,
            lines,
            isPosted: true,
            status: 'posted',
            importFingerprint: fingerprint,
          };
          onImport([entry]);
          // Reset state
          setImportedRows([]);
          setParsedRows(null);
          setReviewing(false);
          setFingerprintCollision(null);
        };
        ```
    - Fingerprint-collision dialog:
        ```typescript
        {fingerprintCollision && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" data-testid="fingerprint-collision-dialog">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-2">Duplicate trial balance detected</h3>
              <p className="text-sm mb-4">
                A trial-balance import already exists for this entity as-at {fingerprintCollision.existing.date}
                (reference {fingerprintCollision.existing.reference}).
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  data-testid="fp-skip"
                  onClick={() => setFingerprintCollision(null)}
                  className="text-sm underline"
                >Skip</button>
                <button
                  type="button"
                  data-testid="fp-replace"
                  onClick={() => {
                    const included = importedRows.filter((r) => (r as RowExtra)._include !== false);
                    // Replace: post a new entry that supersedes the existing opening journal.
                    // CRITICAL: the new entry sets replacesEntryId, AND the parent (App.tsx) must
                    // mark the existing entry as status: 'superseded' + replacedByEntryId so the
                    // TrialBalance rollup (04-2 T3 filter `status !== 'superseded'`) excludes it.
                    // Without that linkage, TB would double-count both the original and replacement.
                    // ImportTB emits BOTH the new entry AND an explicit supersedes hint via the
                    // onReplace callback; App.tsx wires onReplace to useJournals.supersedeImport
                    // (a thin helper that does the same status-flip as editPosted's supersession arm).
                    const lines: JournalLine[] = included
                      .filter((r) => r.mappedAccountId && !r.mappedAccountId.startsWith('NEW:'))
                      .map((r) => ({ accountId: r.mappedAccountId!, description: `Opening: ${r.externalName}`,
                        debit: r.debit, credit: r.credit, taxAmount: 0 }));
                    const entry: JournalEntry = {
                      _v: 3,
                      id: crypto.randomUUID(),
                      date: asAtDate,
                      reference: `OPENING-${asAtDate}-REPLACE`,
                      description: `Opening balances replacing import ${fingerprintCollision.existing.id}`,
                      lines,
                      isPosted: true,
                      status: 'posted',
                      importFingerprint: fingerprintCollision.fingerprint,
                      replacesEntryId: fingerprintCollision.existing.id,
                    };
                    // onReplace MUST exist on the ImportTB props contract; App.tsx wires it.
                    // If onReplace is not provided (transitional / test harness), fall back to
                    // onImport — but the parent SHOULD wire onReplace for correct TB behaviour.
                    if (typeof onReplace === 'function') {
                      onReplace(fingerprintCollision.existing.id, entry);
                    } else {
                      onImport([entry]);
                    }
                    setFingerprintCollision(null);
                    setReviewing(false);
                    setImportedRows([]);
                    setParsedRows(null);
                  }}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >Replace existing journal</button>
                <button
                  type="button"
                  data-testid="fp-additional"
                  onClick={() => {
                    // Add-additional: append :additional to fingerprint so dedup doesn't fire next time
                    const included = importedRows.filter((r) => (r as RowExtra)._include !== false);
                    postOpeningBalances(included, `${fingerprintCollision.fingerprint}:additional-${Date.now()}`);
                  }}
                  className="bg-gray-200 px-3 py-1 rounded text-sm"
                >Import as additional</button>
              </div>
            </div>
          </div>
        )}
        ```
    - AI-assist section: wrap the existing AI section in `{isAiEnabled() && <>{...}</>}`. The deterministic match path runs unconditionally via processColumnMapping (above) — so the import works fully without AI.

    Step 2 — Flip `src/components/__tests__/ImportTB.test.tsx` Phase-4 scaffolds GREEN:
    - `column mapping UI confirmation` — render with a CSV file (use `new File([csvText], 'tb.csv')`); wait for `data-testid="column-mapping"` to appear; pick mappings via `aria-label="map-code"` etc.; click `data-testid="confirm-mapping"`; assert `data-testid="import-review-pane"` appears
    - `deterministic path works without AI` — mock `isAiEnabled()` to return false (via vi.mock); render and assert the AI section is NOT in DOM; complete the deterministic flow end-to-end; assert it works
    - `fingerprint Skip Replace dialog` — render with `existingEntries=[{importFingerprint: <fp>}]` where `<fp>` matches what will be computed from the test rows; complete the flow; click Accept; assert `data-testid="fingerprint-collision-dialog"` is rendered
    - `single opening journal posted` — render; complete flow with no collision; click Accept; assert onImport called once with `[entry]` where `entry.importFingerprint` is a 64-char hex AND `entry.lines.length > 0` AND `entry.isPosted === true`
    - `XLSX flow opens sheet picker when multi-sheet` — feed an XLSX File with 2+ sheets (build via XLSX library in the test); assert XlsxSheetPicker modal appears
    - `XLSX flow auto-selects single matching sheet` — feed an XLSX with one sheet named 'Trial Balance' + one named 'Notes'; assert no modal renders; mapping step appears directly

    Step 3 — Verify:
    - `npx vitest run src/components/__tests__/ImportTB.test.tsx` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npx vitest run src/components/__tests__/ImportTB.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/ImportTB.tsx` imports `parseCsvFile` from `../lib/import/csv`
    - `src/components/ImportTB.tsx` imports `parseXlsxBuffer` (or `parseXlsxFile`) AND `pickSheetByName` from `../lib/import/xlsx`
    - `src/components/ImportTB.tsx` imports `computeImportFingerprint` from `../lib/import/fingerprint`
    - `src/components/ImportTB.tsx` imports `XlsxSheetPicker` from `./XlsxSheetPicker`
    - `src/components/ImportTB.tsx` imports `ImportReviewPane` from `./ImportReviewPane`
    - `src/components/ImportTB.tsx` retains the `isAiEnabled()` gate on the AI section
    - `src/components/ImportTB.tsx` contains literal `data-testid="fingerprint-collision-dialog"`
    - `src/components/ImportTB.tsx` posts a single opening JournalEntry with `importFingerprint` set
    - `src/components/__tests__/ImportTB.test.tsx` Phase-4 tests all runnable, not `.todo`
    - `npx vitest run src/components/__tests__/ImportTB.test.tsx` exits 0 — all GREEN
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    ImportTB consumes the Wave-0 library wrappers. CSV + XLSX + sheet picker + column mapping by name + review pane + fingerprint Skip/Replace/Add-additional dialog + single-opening-journal post + AI-optional gate all wired. IMP-01..06 visible end-to-end.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual UAT — verify all 5 Phase 4 success criteria + 23 requirements end-to-end</name>
  <what-built>
    Wave 0 (04-1): v3 type widening + v2→v3 additive migration + per-type default CoA (Individual/Company/Trust/Partnership × FY2026 spine) + pure-function ledger engine + import fingerprint helper + PapaParse/SheetJS thin wrappers.

    Wave 2 (04-2): useJournals.editPosted / reversePosted / voidDraft / searchJournals; JournalForm refactor with banner + EditJournalDiff; JournalSearch filter panel; TrialBalance period filter + parent subtotals; AuditTrail widened action labels.

    Wave 2 (04-3): useAccounts.archiveAccount + isAccountInUse; useEntities createEntity seeds CoA + tryDeleteEntity reference-check + setBeneficiaries/setPartners; AccountManager tree-view + archive-vs-delete + GST_CODES fix + isDefault badge + archive-toggle; EntityForm v3 fields + Trust/Partnership tabs + Block-or-Archive delete dialog; BeneficiaryRegister + PartnerRegister components.

    Wave 3 (04-4 — this plan, tasks 1+2): XlsxSheetPicker + ImportReviewPane components; ImportTB refactored to use the library wrappers, sheet picker, review pane, fingerprint dedup dialog.
  </what-built>
  <how-to-verify>
    Run a complete end-to-end UAT pass against a fresh local instance. Before starting:
    - `npm run test` exits 0
    - `npm run test:server` exits 0
    - `npm run lint` exits 0
    - `npm run dev` (no-server, IndexedDB) — open http://localhost:3000

    **Success criterion #1 — CoA browsable + parent subtotals on TB (BOOK-05/07):**
    1. Open the app. From the Entities view, create a new entity of type "Company". Wait ~1s for the default CoA to seed.
    2. Navigate to Account Manager. Confirm:
       - 80–150 accounts visible, grouped under parent headings ("Current Assets" → "Cash on Hand", "Business Bank Account", ...; "Operating Expenses" → "Rent — Business Premises", "Council Rates", "Utilities", ...).
       - Parent rows render in bold/header style with depth indentation on children.
       - "Show archived" toggle is present and OFF by default.
       - Every default account has a small "default" badge.
       - The GST_CODES dropdown shows exactly: GST, FRE, INP, N-T, CAP (no "ITS").
    3. Post a few journal entries against children of "Operating Expenses" (e.g. 100 to Rent, 50 to Utilities).
    4. Navigate to Trial Balance. Confirm:
       - "Operating Expenses" parent row shows the sum (150 in this example).
       - Period filter dropdown is present (FY / Quarter / Custom).
       - Footer says "Balanced".

    **Success criterion #2 — Journal CRUD + audit (BOOK-01/02/03/04/11/12):**
    5. Create a journal entry (Date + Reference + Description + 2 lines). Try to save with unbalanced debits/credits — assert it's blocked (BOOK-01 enforced at data layer; previously only at UI).
    6. Save a balanced posted entry. Locate it in the journals list.
    7. Click "Edit" on the posted entry. Confirm:
       - Banner appears: "This will replace the original. The original stays in the audit trail."
       - Change the description. Click Save.
       - The diff preview pane (EditJournalDiff) appears showing Original vs Proposed side-by-side, with the changed description highlighted.
       - Click "Confirm replace". The original entry now shows status superseded; a new entry appears with the new description.
    8. Click "Reverse" on the new entry. A reversal entry appears, mirroring the lines.
    9. Open the Audit Trail. Confirm:
       - There are entries for POST_JOURNAL (original), EDIT_JOURNAL (with before+after summaries), REVERSE_JOURNAL (with original + reversal ids).
       - Timestamps are non-empty; "Local user" is the actor.
    10. Open the JournalSearch panel. Type the reference into the reference filter — assert results filter; clear; use the amount filter (range 90–110) — assert correct rows.

    **Success criterion #3 — CSV/XLSX import + column mapping + fuzzy match + AI-optional (IMP-01..04):**
    11. Confirm `GEMINI_API_KEY` is UNSET in `.env`. Restart `npm run dev` if needed.
    12. Navigate to Import TB. Confirm: no AI-assist section is visible.
    13. Upload a CSV with 5–10 rows in the format `Code,Name,Debit,Credit` including one row with a slightly different account name (e.g. "Sales Revenue" vs the default's "Sales of Goods"). Confirm:
        - Column-mapping UI appears with 4 dropdowns populated by the CSV's headers.
        - After confirming the mapping, the ImportReviewPane shows each row with a match status (Auto-matched / Review / No match).
        - The "Sales Revenue" row likely shows Review with top-3 candidates including "Sales of Goods".
    14. Click "Create new account" on one Review row. Click "Accept import".
    15. Confirm a single opening-balances journal is created (single entry with N lines), dated today.

    **Success criterion #4 — Idempotent re-import (IMP-05):**
    16. Without changing anything, re-import the same CSV. Confirm:
        - The fingerprint dialog appears: "Duplicate trial balance detected".
        - Three buttons: Skip, Replace existing journal, Import as additional.
    17. Click Skip — no new journal is created.
    18. Re-import again. Click Replace. Confirm:
        - The new opening entry has `replacesEntryId` pointing to the prior import.
        - The PRIOR entry now has `status: 'superseded'` and `replacedByEntryId` pointing to the new entry (via App.tsx `supersedeImport` wiring — without this, the TB doubles).
        - In the Audit Trail an `EDIT_JOURNAL` row appears with summary "Opening balance replaced via TB re-import" plus before+after snapshots.
        - Navigate to Trial Balance — totals match the single replacement entry, NOT 2× the original (regression check for the Replace double-count risk).

    **Success criterion #5 — Trust beneficiary + Partnership partner registers (ENT-07/08):**
    19. Create a new entity of type Trust. In EntityForm, confirm:
        - The BeneficiaryRegister section is visible.
        - Add 2 beneficiaries (Alice 60%, Bob 40%). Save. Re-open the entity. Confirm both rows persisted.
        - Try with shares summing to 99% — confirm a soft warning text appears.
    20. Create a new entity of type Partnership. Confirm PartnerRegister appears with the same add/remove behaviour.

    **Coverage — additional ENT requirements (ENT-01/03/04/05/06):**
    21. In EntityForm for the Trust above, confirm:
        - Entity-type select offers exactly Company / Trust / Individual / Partnership.
        - "GST registered" checkbox is present.
        - Accounting method radios for cash / accruals are present.
        - "Financial year end (MM-DD)" input defaults to "06-30".
    22. Try to delete the Trust entity (which has the Phase-2 + Phase-4 journals attached). Confirm dialog appears: "Cannot delete — N journals reference this entity. Archive instead?". Click OK → entity moves to Archived (not deleted).

    **Coverage — AccountManager archive flow (BOOK-06):**
    23. In AccountManager, try to delete a default account. Confirm dialog says "This is a default account. Archive instead of delete?" — accept; account moves to archived (not deleted).
    24. Toggle "Show archived" — the archived account reappears with reduced opacity.

    **Final cross-check:**
    25. `npm run test` exits 0 — all phase 1/2/3/4 tests GREEN.
    26. `npm run test:server` exits 0 — Phase 3 server tests preserved.
    27. `npm run lint` exits 0.
    28. `git diff src/storage/adapter.ts` is empty (StorageAdapter interface untouched).

    If any step fails, document the failure in the resume signal so the next /gsd:plan-phase --gaps cycle can pick it up.
  </how-to-verify>
  <resume-signal>
    Type "approved — all 28 UAT checks passed" (or describe issues if any check failed). Once approved, Plan 04-4 is complete and Phase 4 hands off to `/gsd:verify-work 4` for goal-backward verification.
  </resume-signal>
</task>

</tasks>

<verification>
After all three tasks complete (including the human-verify checkpoint):

1. `npm run lint` exits 0
2. `npx vitest run src/components/__tests__/ImportTB.test.tsx src/components/__tests__/XlsxSheetPicker.test.tsx src/components/__tests__/ImportReviewPane.test.tsx` exits 0 — every plan-04-4-owned scaffold GREEN
3. `npm run test` exits 0 — full SPA suite GREEN; no regressions
4. `npm run test:server` exits 0 — Phase 3 server tests unchanged
5. `src/storage/adapter.ts` is untouched (`git diff src/storage/adapter.ts` empty)
6. `src/types.ts` untouched (`git diff src/types.ts` empty since Plan 04-1 closed it)
7. `src/lib/import/*` untouched (Wave 0 contracts preserved)
8. `src/lib/coa/*` untouched
9. Manual UAT checkpoint marked "approved" with all 28 checks passing
</verification>

<success_criteria>
- Success criterion #3 (CSV/XLSX import + column mapping + fuzzy match + AI-optional, works without GEMINI_API_KEY) — DELIVERED end-to-end via ImportTB refactor consuming parseCsvFile + parseXlsxFile + XlsxSheetPicker + ImportReviewPane + isAiEnabled gate
- Success criterion #4 (idempotent re-import) — DELIVERED via computeImportFingerprint + Skip/Replace/Add-additional dialog
- Phase 4 requirements satisfied by this plan: IMP-01 (CSV/XLSX upload), IMP-02 (column-mapping UI), IMP-03 (fuzzy match + create-new), IMP-04 (AI optional), IMP-05 (idempotent), IMP-06 (single dated opening journal)
- Test counts (rough): +4 XlsxSheetPicker tests, +5 ImportReviewPane tests, +6 ImportTB tests = ~15 new GREEN cases
- StorageAdapter untouched; v3 types untouched; Wave 0 modules untouched
- AI-assist remains optional and gated — the deterministic import path is the always-visible default
- Phase 4 end-to-end UAT checkpoint covering all 5 success criteria + 23 requirements passes
</success_criteria>

<output>
After completion AND human-verify checkpoint approval, create `.planning/phases/04-bookkeeping-core/04-4-SUMMARY.md` summarising:
- Files created (XlsxSheetPicker, ImportReviewPane, plus widened tests)
- Files modified (ImportTB; line count of changes)
- Tests: count GREEN / RED / TODO (expected: ~15 new GREEN; 0 RED)
- StorageAdapter / v3 types / Wave 0 modules untouched confirmation
- Phase 4 requirements addressed: IMP-01, IMP-02, IMP-03, IMP-04, IMP-05, IMP-06
- AI-optional confirmation (no GEMINI_API_KEY → deterministic flow works fully)
- UAT result: 28/28 checks passed (or document which failed)
- Hand-off to `/gsd:verify-work 4`: all 5 success criteria visible end-to-end; ready for goal-backward verification
- Note for STATE.md update: Phase 4 closed; total plan count goes from 11 to 15 (Phase 4: 04-1 / 04-2 / 04-3 / 04-4); test count expected to land ≈ 350+ SPA tests + 18 server tests
</output>
