---
phase: 07-importtb-ux-rework
plan: 3
type: execute
wave: 3
depends_on: [1, 2]
files_modified:
  - src/components/HeaderRowPicker.tsx
  - src/components/RejectedRowsPanel.tsx
  - src/components/ImportTB.tsx
  - src/components/ImportReviewPane.tsx
  - src/components/__tests__/HeaderRowPicker.test.tsx
  - src/components/__tests__/RejectedRowsPanel.test.tsx
  - src/components/__tests__/ImportTB.test.tsx
  - src/components/__tests__/ImportReviewPane.test.tsx
autonomous: true
tdd: true
requirements:
  - IMP-07
  - IMP-08
  - IMP-09
  - IMP-10
  - IMP-11
must_haves:
  truths:
    - "HeaderRowPicker renders a scrollable preview of first ~15 rows; auto-pick row highlighted; user can click any row to override"
    - "Low-confidence header detection (autoPickRow: null) renders 'Pick the header row' prompt + top-3 candidate list — does NOT auto-advance"
    - "RejectedRowsPanel renders inline below accepted rows; banner 'N rows rejected — review'; grouped by reason; per-row edit-in-place + Re-parse and include + Apply to similar"
    - "ImportReviewPane gains optional rejectedRows + tolerantParseCount + lowConfidenceParseCount props; backward compatible — Phase 4 callers without these props still work"
    - "ImportTB state machine extended with isPickingHeader + rawRows + headerDetectResult + headerRowIndex; flow: upload → (sheetPicker for XLSX) → headerRowPicker → columnMapping → reviewing → committed"
    - "ImportTB integrates currencyParse during processColumnMapping — debit/credit go through parseCurrency, low-confidence cells tag rows with AnomalyBadge in the review pane"
    - "ImportTB integrates subtotalDetect — subtotal rows move to rejectedRows with reason: 'subtotal' BEFORE the review stage"
    - "ImportTB integrates detectSplitColumns — when missingCodeFraction > 0.5, user gets 'auto-assign codes sequentially' OR 'import name-only' choice; when split detected, mergeColumns runs automatically and the code column maps to __merged_code_name"
    - "Phase 4 clean-flow regression test passes — existing makeCsvFile fixture imports identically through Phase 7 code path; onImport called once with 3 lines, zero rejected rows"
    - "Existing Phase 4 ImportTB + ImportReviewPane + XlsxSheetPicker tests all stay GREEN"
  artifacts:
    - path: "src/components/HeaderRowPicker.tsx"
      provides: "Component for header-row preview + selection; auto-pick highlight + manual fallback for low-confidence"
      exports: ["HeaderRowPicker"]
      contains: "data-testid=\"header-row-picker\""
    - path: "src/components/RejectedRowsPanel.tsx"
      provides: "Inline collapsible panel under accepted rows; grouped-by-reason rejected rows; edit-in-place + bulk apply"
      exports: ["RejectedRowsPanel", "RejectedRow", "RejectedRowReason"]
      contains: "data-testid=\"rejected-rows-banner\""
    - path: "src/components/ImportTB.tsx"
      provides: "Extended state machine with headerRowChosen step; currency-parse-aware row pipeline; subtotal-aware rejection; split-column detection"
      contains: "isPickingHeader"
    - path: "src/components/ImportReviewPane.tsx"
      provides: "Widened with rejectedRows / tolerantParseCount / lowConfidenceParseCount props; renders RejectedRowsPanel inline + 'Tolerantly parsed N cells' summary banner"
      contains: "RejectedRowsPanel"
  key_links:
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/headerDetect.ts"
      via: "detectHeaderRow on rawRows after parse"
      pattern: "detectHeaderRow"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/currencyParse.ts"
      via: "parseCurrency on debit/credit cells"
      pattern: "parseCurrency"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/subtotalDetect.ts"
      via: "detectSubtotals on parsed ImportRow[]"
      pattern: "detectSubtotals"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/columnMerge.ts"
      via: "detectSplitColumns + mergeColumns on parsed rows"
      pattern: "detectSplitColumns|mergeColumns"
    - from: "src/components/ImportTB.tsx"
      to: "src/components/HeaderRowPicker.tsx"
      via: "renders when isPickingHeader && rawRows"
      pattern: "HeaderRowPicker"
    - from: "src/components/ImportReviewPane.tsx"
      to: "src/components/RejectedRowsPanel.tsx"
      via: "renders inline when rejectedRows.length > 0"
      pattern: "RejectedRowsPanel"
    - from: "src/components/ImportReviewPane.tsx"
      to: "src/components/AnomalyBadge.tsx"
      via: "renders AnomalyBadge for rows with low-confidence parse"
      pattern: "AnomalyBadge"
---

<objective>
Wire the Phase 7 pure-function heuristics from Plan 07-2 into the UI. Two new component files (`HeaderRowPicker`, `RejectedRowsPanel`) are extracted following the Phase 4 pattern (XlsxSheetPicker pattern: small component file with own test file). ImportTB.tsx's state machine extends with one new step (`isPickingHeader`); the existing flow (sheet picker → column mapping → review → fingerprint → post) is preserved bit-for-bit. ImportReviewPane.tsx gains optional rejected-rows props; existing callers continue to work without them.

Purpose: This is the bulk of UI work for Phase 7. By keeping it as ONE plan (Wave 3, single executor session) we keep state-machine consistency in one head — splitting it across plans risks the kind of "Wave-2 ImportTB ↔ Wave-3 ImportReviewPane" handoff confusion that bit Phase 4. The Phase 4 clean-flow regression test is added explicitly as the last task — it's the single most important behavioral guarantee Phase 7 must preserve.

Output:
- 2 new component files + 2 test files flipped RED → GREEN
- 2 modified component files (ImportTB.tsx ~750 lines, ImportReviewPane.tsx ~330 lines)
- 2 modified test files (ImportTB.test.tsx adds integration cases including the Phase 4 regression; ImportReviewPane.test.tsx adds low-confidence + rejected-rows cases)
- All 5 IMP-07..11 requirements visible end-to-end in code; UAT in Plan 07-4 confirms visually
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/07-importtb-ux-rework/07-CONTEXT.md
@.planning/phases/07-importtb-ux-rework/07-RESEARCH.md
@.planning/phases/07-importtb-ux-rework/07-VALIDATION.md
@.planning/phases/07-importtb-ux-rework/07-1-PLAN.md
@.planning/phases/07-importtb-ux-rework/07-2-PLAN.md
@.planning/milestones/v1.0-phases/04-bookkeeping-core/04-4-SUMMARY.md
@src/components/ImportTB.tsx
@src/components/ImportReviewPane.tsx
@src/components/XlsxSheetPicker.tsx
@src/components/AnomalyBadge.tsx
@src/components/__tests__/ImportTB.test.tsx
@src/components/__tests__/ImportReviewPane.test.tsx

<interfaces>
<!-- Plan 07-2 FINAL exports — DO NOT MODIFY, only consume. -->

From src/lib/import/headerDetect.ts (Plan 07-2 FINAL):
```typescript
export const AUTO_PICK_THRESHOLD = 0.60;
export interface HeaderCandidate { rowIndex: number; score: number; confidence: number; matchedKeywords: string[]; stringDensity: number; }
export interface HeaderDetectResult { topCandidate: HeaderCandidate | null; alternatives: HeaderCandidate[]; autoPickRow: number | null; searchedRows: number; }
export function detectHeaderRow(rawRows: string[][], options?: { maxScanRows?: number }): HeaderDetectResult;
export function mergeHeaderRows(rowA: string[], rowB: string[]): string[];
```

From src/lib/import/currencyParse.ts (Plan 07-2 FINAL):
```typescript
import Decimal from 'decimal.js';
export interface ParseResult { decimal: Decimal | null; confidence: 'high' | 'low'; reason?: string; }
export function parseCurrency(raw: string, locale?: 'AU'): ParseResult;
```

From src/lib/import/subtotalDetect.ts (Plan 07-2 FINAL):
```typescript
import Decimal from 'decimal.js';
export interface ImportRow { rowIndex: number; code: string; name: string; debit: Decimal | null; credit: Decimal | null; rawDebit: string; rawCredit: string; }
export interface SubtotalFlag { rowIndex: number; reason: 'keyword' | 'sum-pattern' | 'keyword+sum-pattern'; keyword?: string; sumOf?: number[]; }
export function detectSubtotals(rows: ImportRow[]): SubtotalFlag[];
```

From src/lib/import/columnMerge.ts (Plan 07-2 FINAL):
```typescript
export const MISSING_CODE_THRESHOLD = 0.5;
export interface ColumnDetectResult { hasSplitColumns: boolean; codeColHeader: string | null; nameColHeader: string | null; missingCodeFraction: number; }
export function detectSplitColumns(headers: string[], rows: Record<string, string>[]): ColumnDetectResult;
export function mergeColumns(rows: Record<string, string>[], codeCol: string, nameCol: string, separator?: string): Record<string, string>[];
export function deriveRegexSignature(failingCellValue: string): string;
```

From src/lib/import/csv.ts + xlsx.ts (Plan 07-2 FINAL):
```typescript
export async function parseCsvFile(file: File, options?: { headerRowIndex?: number }): Promise<ParsedCsv>;
export function parseCsvRaw(file: File): Promise<string[][]>;
export function parseXlsxBuffer(buf: ArrayBuffer, options?: { headerRowIndex?: number }): ParsedXlsx;
export function pickSheetByName(buf: ArrayBuffer, sheetName: string, options?: { headerRowIndex?: number }): { rows: RawRow[]; headers: string[] };
export function getXlsxRawRows(buf: ArrayBuffer, sheetName: string): string[][];
```

From src/components/AnomalyBadge.tsx (Phase 5 FINAL):
```typescript
export interface AnomalyBadgeProps { severity: 'info' | 'warn'; label: string; }
export const AnomalyBadge: React.FC<AnomalyBadgeProps>;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build HeaderRowPicker component + flip HeaderRowPicker.test.tsx GREEN</name>
  <read_first>
    - src/components/__tests__/HeaderRowPicker.test.tsx (contract from Plan 07-1)
    - src/components/XlsxSheetPicker.tsx (existing Phase 4 modal pattern to mirror — buttons, data-testid, onSelect/onCancel)
    - src/components/__tests__/XlsxSheetPicker.test.tsx (testing pattern: render with @testing-library/react, fireEvent.click, screen.getByTestId)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 1093-1111: HeaderRowPicker component sketch)
    - .planning/phases/07-importtb-ux-rework/07-CONTEXT.md (lines 50-53: header-row UX decisions — clickable rows, auto-pick highlight, top-3 alternatives, low-confidence fallback)
  </read_first>
  <behavior>
    - Component receives `rows: string[][]`, `detectResult: HeaderDetectResult | null`, `onPick: (rowIndex: number) => void`, `onCancel: () => void`
    - Renders a `<div data-testid="header-row-picker">` wrapper
    - Renders a scrollable table of the first 15 rows (or `rows.length` if less); each row has `data-testid={`header-row-${i}`}` and `role="button"`/`tabIndex={0}` so clicks are detectable in tests
    - When `detectResult.autoPickRow !== null`: row at that index has `data-testid={`header-row-${i}`} className="bg-blue-50"` (highlight); also renders a banner `<div data-testid="header-auto-pick-banner">We think row {N + 1} is the header — confidence {Math.round(c.confidence * 100)}%</div>`
    - When `detectResult.autoPickRow === null`: renders `<div data-testid="header-manual-prompt">Pick the header row</div>` + a list of top-3 candidates with `data-testid={`header-candidate-${rowIndex}`}` listing their scores
    - Clicking any row in the preview table fires `onPick(rowIndex)`
    - A "pick a different row" link with `data-testid="header-show-alternatives"` toggles the alternatives panel visibility (default: collapsed when auto-pick is high-confidence; expanded when manual)
    - A Cancel button with `data-testid="header-row-picker-cancel"` fires `onCancel`
    - When two consecutive rows both qualify (both score > 0.40), renders an inline preview using `mergeHeaderRows` showing the composite labels above the row with `data-testid="header-multi-row-preview"`
  </behavior>
  <action>
    1. Create `src/components/HeaderRowPicker.tsx`. Use the existing Tailwind class vocabulary from XlsxSheetPicker (border, p-4, bg-white, text-sm, data-testid). Match the project's visual style — small modals/picker UIs are not full-screen overlays; this picker renders inline like `ImportReviewPane`. Skeleton:

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import React, { useState } from 'react';
       import type { HeaderDetectResult } from '../lib/import/headerDetect';
       import { mergeHeaderRows } from '../lib/import/headerDetect';

       interface HeaderRowPickerProps {
         rows: string[][];
         detectResult: HeaderDetectResult | null;
         onPick: (rowIndex: number) => void;
         onCancel: () => void;
       }

       export const HeaderRowPicker: React.FC<HeaderRowPickerProps> = ({
         rows, detectResult, onPick, onCancel,
       }) => {
         const autoPick = detectResult?.autoPickRow ?? null;
         const isManualMode = autoPick === null;
         const [altsOpen, setAltsOpen] = useState(isManualMode);
         const preview = rows.slice(0, 15);
         const top = detectResult?.topCandidate ?? null;
         const conf = top ? Math.round(top.confidence * 100) : 0;

         // Detect multi-row header preview opportunity:
         // when autoPick is set AND the next row also has score > 0.40
         const multiRowMerged: string[] | null = (() => {
           if (autoPick === null || !rows[autoPick] || !rows[autoPick + 1]) return null;
           const next = detectResult?.alternatives.find((a) => a.rowIndex === autoPick + 1);
           if (next && next.score > 0.40) {
             return mergeHeaderRows(rows[autoPick], rows[autoPick + 1]);
           }
           return null;
         })();

         return (
           <div data-testid="header-row-picker" className="bg-white border border-[var(--line-strong)] rounded p-4 space-y-3">
             {!isManualMode && top && (
               <div data-testid="header-auto-pick-banner" className="bg-blue-50 border border-blue-100 p-3 text-sm">
                 We think row {top.rowIndex + 1} is the header — confidence {conf}%.{' '}
                 <button
                   type="button"
                   onClick={() => setAltsOpen((o) => !o)}
                   data-testid="header-show-alternatives"
                   className="underline text-blue-700"
                 >
                   pick a different row
                 </button>
               </div>
             )}
             {isManualMode && (
               <div data-testid="header-manual-prompt" className="bg-amber-50 border border-amber-100 p-3 text-sm">
                 Pick the header row
               </div>
             )}

             {(altsOpen || isManualMode) && detectResult && (
               <div className="text-xs text-gray-600 space-y-1">
                 {detectResult.alternatives.map((c) => (
                   <div key={c.rowIndex} data-testid={`header-candidate-${c.rowIndex}`}>
                     Row {c.rowIndex + 1} — score {Math.round(c.score * 100)}%
                   </div>
                 ))}
               </div>
             )}

             {multiRowMerged && (
               <div data-testid="header-multi-row-preview" className="bg-gray-50 border border-gray-200 p-2 text-xs">
                 Merged composite header: {multiRowMerged.join(' | ')}
               </div>
             )}

             <div className="overflow-x-auto max-h-80 overflow-y-auto border border-gray-200">
               <table className="min-w-full text-xs">
                 <tbody>
                   {preview.map((row, i) => {
                     const isAuto = i === autoPick;
                     return (
                       <tr
                         key={i}
                         data-testid={`header-row-${i}`}
                         role="button"
                         tabIndex={0}
                         className={`cursor-pointer border-b ${isAuto ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                         onClick={() => onPick(i)}
                         onKeyDown={(e) => { if (e.key === 'Enter') onPick(i); }}
                       >
                         <td className="px-2 py-1 text-gray-400 w-10">{i + 1}</td>
                         {row.map((cell, j) => (
                           <td key={j} className="px-2 py-1">{cell}</td>
                         ))}
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>

             <div className="flex justify-end">
               <button
                 type="button"
                 data-testid="header-row-picker-cancel"
                 onClick={onCancel}
                 className="text-sm underline px-3 py-1"
               >
                 Cancel
               </button>
             </div>
           </div>
         );
       };
       ```

    2. Open `src/components/__tests__/HeaderRowPicker.test.tsx`. Remove `@ts-expect-error` and the `void HeaderRowPicker;` reference. Replace `it.todo` calls with real `it()` tests:

       ```typescript
       import { describe, it, expect, vi } from 'vitest';
       import { render, screen, fireEvent } from '@testing-library/react';
       import { HeaderRowPicker } from '../HeaderRowPicker';
       import type { HeaderDetectResult } from '../../lib/import/headerDetect';

       function makeResult(overrides: Partial<HeaderDetectResult> = {}): HeaderDetectResult {
         return {
           topCandidate: { rowIndex: 4, score: 0.85, confidence: 0.7, matchedKeywords: ['account','code','debit','credit'], stringDensity: 1 },
           alternatives: [
             { rowIndex: 5, score: 0.50, confidence: 0, matchedKeywords: [], stringDensity: 0.8 },
             { rowIndex: 0, score: 0.40, confidence: 0, matchedKeywords: [], stringDensity: 1 },
             { rowIndex: 1, score: 0.40, confidence: 0, matchedKeywords: [], stringDensity: 1 },
           ],
           autoPickRow: 4,
           searchedRows: 15,
           ...overrides,
         };
       }

       const sampleRows: string[][] = [
         ['Acme Pty Ltd', '', '', ''],
         ['Trial Balance', '', '', ''],
         ['FY2026', '', '', ''],
         ['', '', '', ''],
         ['Account', 'Code', 'Debit', 'Credit'],
         ['Sales', '4100', '0', '50000'],
       ];

       describe('HeaderRowPicker (IMP-07 UI)', () => {
         it('renders preview with auto-pick row highlighted (bg-blue-50)', () => {
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult()} onPick={vi.fn()} onCancel={vi.fn()} />);
           const autoRow = screen.getByTestId('header-row-4');
           expect(autoRow.className).toContain('bg-blue-50');
         });

         it('clicking any row in preview fires onPick(rowIndex)', () => {
           const onPick = vi.fn();
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult()} onPick={onPick} onCancel={vi.fn()} />);
           fireEvent.click(screen.getByTestId('header-row-2'));
           expect(onPick).toHaveBeenCalledWith(2);
         });

         it('low-confidence path (autoPickRow: null) shows "Pick the header row" prompt + top-3 candidates with scores', () => {
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult({ autoPickRow: null })} onPick={vi.fn()} onCancel={vi.fn()} />);
           expect(screen.getByTestId('header-manual-prompt')).toBeTruthy();
           // top-3 alternatives are always rendered in manual mode (auto-opened)
           expect(screen.getByTestId('header-candidate-5')).toBeTruthy();
           expect(screen.getByTestId('header-candidate-0')).toBeTruthy();
         });

         it('high-confidence path shows "We think row N is the header" with confidence percentage badge', () => {
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult()} onPick={vi.fn()} onCancel={vi.fn()} />);
           const banner = screen.getByTestId('header-auto-pick-banner');
           expect(banner.textContent).toMatch(/row 5/);          // 1-based
           expect(banner.textContent).toMatch(/70%/);            // 0.7 confidence -> 70%
         });

         it('"pick a different row" link reveals top-3 alternatives', () => {
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult()} onPick={vi.fn()} onCancel={vi.fn()} />);
           // Default collapsed in high-confidence path
           expect(screen.queryByTestId('header-candidate-5')).toBeNull();
           fireEvent.click(screen.getByTestId('header-show-alternatives'));
           expect(screen.getByTestId('header-candidate-5')).toBeTruthy();
         });

         it('Cancel link fires onCancel', () => {
           const onCancel = vi.fn();
           render(<HeaderRowPicker rows={sampleRows} detectResult={makeResult()} onPick={vi.fn()} onCancel={onCancel} />);
           fireEvent.click(screen.getByTestId('header-row-picker-cancel'));
           expect(onCancel).toHaveBeenCalled();
         });

         it('shows merged-header preview when two consecutive rows both qualify as header-like', () => {
           const multiResult = makeResult({
             topCandidate: { rowIndex: 4, score: 0.85, confidence: 0.7, matchedKeywords: ['account'], stringDensity: 1 },
             alternatives: [
               { rowIndex: 5, score: 0.50, confidence: 0, matchedKeywords: ['code','name'], stringDensity: 1 },
             ],
           });
           const multiRows: string[][] = [
             ['','','',''],['','','',''],['','','',''],['','','',''],
             ['Account', '', 'Debit', 'Credit'],
             ['Code', 'Name', '', ''],
             ['4100', 'Sales', '0', '50000'],
           ];
           render(<HeaderRowPicker rows={multiRows} detectResult={multiResult} onPick={vi.fn()} onCancel={vi.fn()} />);
           const preview = screen.getByTestId('header-multi-row-preview');
           expect(preview.textContent).toMatch(/Account \/ Code/);
           expect(preview.textContent).toMatch(/Debit/);
         });
       });
       ```

    3. Run `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx`. Expect 7 GREEN. Fix as needed.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx --reporter=default 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/HeaderRowPicker.tsx` exists and exports `HeaderRowPicker`
    - `grep -c "data-testid=\"header-row-picker\"" src/components/HeaderRowPicker.tsx` returns 1
    - `grep -c "data-testid={`header-row-" src/components/HeaderRowPicker.tsx` returns ≥ 1 (per-row testids for click testing)
    - `grep -c "data-testid=\"header-auto-pick-banner\"" src/components/HeaderRowPicker.tsx` returns 1
    - `grep -c "data-testid=\"header-manual-prompt\"" src/components/HeaderRowPicker.tsx` returns 1
    - `grep -c "data-testid=\"header-row-picker-cancel\"" src/components/HeaderRowPicker.tsx` returns 1
    - `grep -c "it.todo" src/components/__tests__/HeaderRowPicker.test.tsx` returns 0
    - `npx vitest run src/components/__tests__/HeaderRowPicker.test.tsx` exit 0 with 7 GREEN
  </acceptance_criteria>
  <done>
    HeaderRowPicker component shipped with all 7 test cases GREEN. Component ready for ImportTB integration in Task 3.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build RejectedRowsPanel component + flip RejectedRowsPanel.test.tsx GREEN</name>
  <read_first>
    - src/components/__tests__/RejectedRowsPanel.test.tsx (contract from Plan 07-1)
    - src/components/ImportReviewPane.tsx (Phase 4 pattern — table layout, data-testid conventions, aria-labels)
    - src/lib/import/columnMerge.ts (deriveRegexSignature — for "Apply to similar" logic)
    - .planning/phases/07-importtb-ux-rework/07-CONTEXT.md (lines 70-74: Rejected Rows panel UX decisions)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 837-900: Apply-to-similar diff preview pattern; RejectedRow type)
  </read_first>
  <behavior>
    - Component props per contract in Plan 07-1: `{ rejectedRows, onUpdate, onReparse, onApplyToSimilar, onIncludeAllSubtotals }`
    - Renders `<div data-testid="rejected-rows-panel">` wrapping a banner `<div data-testid="rejected-rows-banner">N rows rejected — review</div>`
    - Banner has a chevron expander; collapsed by default; click toggles panel body
    - Panel body groups rows by `reason` — sections render in order: subtotal, currency-unparseable, no-account-code, low-confidence-parse, other
    - Within each group: rows sorted by `rowIndex` ascending
    - Each rejected row renders 4 editable inputs: code, name, debit, credit — each with `aria-label={`rejected-${rowIndex}-${field}`}` (`aria-label="rejected-2-code"` etc.)
    - Field changes fire `onUpdate(rowIndex, { editedCode: newValue, ... })`
    - Each row has a `data-testid={`rejected-row-${rowIndex}-reparse`}` button labeled "Re-parse and include" → fires `onReparse(rowIndex)`
    - Each row has a `data-testid={`rejected-row-${rowIndex}-apply-similar`}` button "Apply to similar" → opens an inline `<details>` block (`data-testid={`rejected-row-${rowIndex}-similar-preview`}`) listing rows with same reason + matching regex signature (computed via `deriveRegexSignature` against `failingCellValue`); preview has a confirm button `data-testid={`rejected-row-${rowIndex}-similar-confirm`}` and a cancel button `data-testid={`rejected-row-${rowIndex}-similar-cancel`}`
    - Confirm fires `onApplyToSimilar(rowIndex)`; cancel collapses the preview without firing
    - Subtotal group renders a "Include all subtotals" bulk button `data-testid="include-all-subtotals"` → fires `onIncludeAllSubtotals`
    - Low-confidence-parse section renders COLLAPSED by default with its own sub-chevron `data-testid="low-confidence-section-expander"`; clicking expands
  </behavior>
  <action>
    1. Create `src/components/RejectedRowsPanel.tsx`. Use existing Tailwind classes from ImportReviewPane. Skeleton (fill in body, use `useState` for expansion state):

       ```typescript
       /* @license SPDX-License-Identifier: Apache-2.0 */
       import React, { useState } from 'react';
       import { ChevronDown, ChevronRight } from 'lucide-react';
       import { deriveRegexSignature } from '../lib/import/columnMerge';

       export type RejectedRowReason =
         | 'subtotal'
         | 'currency-unparseable'
         | 'no-account-code'
         | 'low-confidence-parse'
         | 'other';

       export interface RejectedRow {
         rowIndex: number;
         reason: RejectedRowReason;
         rawCode: string;
         rawName: string;
         rawDebit: string;
         rawCredit: string;
         editedCode?: string;
         editedName?: string;
         editedDebit?: string;
         editedCredit?: string;
         failingCellValue?: string;
         failingColumn?: 'debit' | 'credit' | 'code' | 'name';
       }

       interface RejectedRowsPanelProps {
         rejectedRows: RejectedRow[];
         onUpdate: (rowIndex: number, patch: Partial<RejectedRow>) => void;
         onReparse: (rowIndex: number) => void;
         onApplyToSimilar: (sourceRowIndex: number) => void;
         onIncludeAllSubtotals: () => void;
       }

       const REASON_ORDER: RejectedRowReason[] = [
         'subtotal', 'currency-unparseable', 'no-account-code', 'low-confidence-parse', 'other',
       ];
       const REASON_LABELS: Record<RejectedRowReason, string> = {
         subtotal: 'Detected as subtotal',
         'currency-unparseable': 'Currency unparseable',
         'no-account-code': 'No account code',
         'low-confidence-parse': 'Low confidence parse',
         other: 'Other',
       };

       export const RejectedRowsPanel: React.FC<RejectedRowsPanelProps> = ({
         rejectedRows, onUpdate, onReparse, onApplyToSimilar, onIncludeAllSubtotals,
       }) => {
         const [panelOpen, setPanelOpen] = useState(false);
         const [lowConfOpen, setLowConfOpen] = useState(false);
         const [openSimilar, setOpenSimilar] = useState<number | null>(null);

         const grouped = REASON_ORDER.map((reason) => ({
           reason,
           rows: rejectedRows
             .filter((r) => r.reason === reason)
             .sort((a, b) => a.rowIndex - b.rowIndex),
         })).filter((g) => g.rows.length > 0);

         const similarRowsFor = (source: RejectedRow): RejectedRow[] => {
           if (!source.failingCellValue) return [];
           const sig = deriveRegexSignature(source.failingCellValue);
           const re = new RegExp(`^${sig}$`);
           return rejectedRows.filter(
             (r) => r.reason === source.reason && r.failingCellValue && re.test(r.failingCellValue),
           );
         };

         return (
           <div data-testid="rejected-rows-panel" className="mt-4 border border-amber-200 bg-amber-50 rounded">
             <button
               type="button"
               data-testid="rejected-rows-banner"
               onClick={() => setPanelOpen((o) => !o)}
               className="w-full flex items-center gap-2 p-3 text-left text-sm font-medium"
             >
               {panelOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
               {rejectedRows.length} rows rejected — review
             </button>

             {panelOpen && grouped.map((group) => (
               <div key={group.reason} data-testid={`rejected-group-${group.reason}`} className="border-t border-amber-200 p-3 space-y-2">
                 <div className="flex items-center justify-between">
                   <h4 className="text-xs font-bold uppercase">
                     {REASON_LABELS[group.reason]} ({group.rows.length})
                   </h4>
                   {group.reason === 'subtotal' && (
                     <button
                       type="button"
                       data-testid="include-all-subtotals"
                       onClick={onIncludeAllSubtotals}
                       className="text-xs underline text-blue-700"
                     >
                       Include all subtotals
                     </button>
                   )}
                   {group.reason === 'low-confidence-parse' && (
                     <button
                       type="button"
                       data-testid="low-confidence-section-expander"
                       onClick={() => setLowConfOpen((o) => !o)}
                       className="text-xs underline"
                     >
                       {lowConfOpen ? 'Hide' : 'Show'}
                     </button>
                   )}
                 </div>

                 {(group.reason !== 'low-confidence-parse' || lowConfOpen) && group.rows.map((row) => {
                   const similar = similarRowsFor(row);
                   const isPreviewOpen = openSimilar === row.rowIndex;
                   return (
                     <div key={row.rowIndex} data-testid={`rejected-row-${row.rowIndex}`} className="bg-white border border-gray-200 p-2 rounded text-xs">
                       <div className="grid grid-cols-4 gap-2">
                         {(['code','name','debit','credit'] as const).map((field) => (
                           <input
                             key={field}
                             aria-label={`rejected-${row.rowIndex}-${field}`}
                             value={(row[`edited${field[0].toUpperCase()}${field.slice(1)}` as keyof RejectedRow] as string) ?? (row[`raw${field[0].toUpperCase()}${field.slice(1)}` as keyof RejectedRow] as string)}
                             onChange={(e) => onUpdate(row.rowIndex, {
                               [`edited${field[0].toUpperCase()}${field.slice(1)}`]: e.target.value,
                             } as Partial<RejectedRow>)}
                             className="border rounded px-1 py-0.5"
                           />
                         ))}
                       </div>
                       <div className="mt-2 flex gap-2">
                         <button
                           type="button"
                           data-testid={`rejected-row-${row.rowIndex}-reparse`}
                           onClick={() => onReparse(row.rowIndex)}
                           className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                         >
                           Re-parse and include
                         </button>
                         {similar.length > 1 && (
                           <button
                             type="button"
                             data-testid={`rejected-row-${row.rowIndex}-apply-similar`}
                             onClick={() => setOpenSimilar(isPreviewOpen ? null : row.rowIndex)}
                             className="text-xs underline"
                           >
                             Apply to similar ({similar.length} rows)
                           </button>
                         )}
                       </div>
                       {isPreviewOpen && similar.length > 1 && (
                         <div data-testid={`rejected-row-${row.rowIndex}-similar-preview`} className="mt-2 bg-gray-50 border border-gray-200 p-2 rounded">
                           <table className="text-xs w-full">
                             <thead><tr><th>Row</th><th>Current</th><th>Proposed</th></tr></thead>
                             <tbody>
                               {similar.map((s) => (
                                 <tr key={s.rowIndex}>
                                   <td>{s.rowIndex + 1}</td>
                                   <td>{s.failingCellValue}</td>
                                   <td>{row.editedCode ?? row.editedName ?? row.editedDebit ?? row.editedCredit ?? '(edit source row first)'}</td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                           <div className="mt-2 flex gap-2 justify-end">
                             <button
                               type="button"
                               data-testid={`rejected-row-${row.rowIndex}-similar-cancel`}
                               onClick={() => setOpenSimilar(null)}
                               className="text-xs underline"
                             >
                               Cancel
                             </button>
                             <button
                               type="button"
                               data-testid={`rejected-row-${row.rowIndex}-similar-confirm`}
                               onClick={() => { onApplyToSimilar(row.rowIndex); setOpenSimilar(null); }}
                               className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                             >
                               Apply to all {similar.length}
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                   );
                 })}
               </div>
             ))}
           </div>
         );
       };
       ```

    2. Open `src/components/__tests__/RejectedRowsPanel.test.tsx`. Remove `@ts-expect-error`. Flip every `it.todo` to a real `it()` test:

       ```typescript
       import { describe, it, expect, vi } from 'vitest';
       import { render, screen, fireEvent } from '@testing-library/react';
       import { RejectedRowsPanel, type RejectedRow } from '../RejectedRowsPanel';

       const baseRow = (rowIndex: number, reason: RejectedRow['reason'], overrides: Partial<RejectedRow> = {}): RejectedRow => ({
         rowIndex,
         reason,
         rawCode: '', rawName: '', rawDebit: '', rawCredit: '',
         ...overrides,
       });

       const rows: RejectedRow[] = [
         baseRow(2, 'subtotal', { rawName: 'Total Revenue', rawDebit: '0', rawCredit: '55000' }),
         baseRow(8, 'currency-unparseable', { rawName: 'Other', rawDebit: '$1,234.56 X', failingCellValue: '$1,234.56 X', failingColumn: 'debit' }),
         baseRow(9, 'currency-unparseable', { rawName: 'Misc', rawDebit: '$5,678.90 X', failingCellValue: '$5,678.90 X', failingColumn: 'debit' }),
         baseRow(11, 'low-confidence-parse', { rawName: 'Sales', rawDebit: '0', rawCredit: '1,234' }),
       ];

       describe('RejectedRowsPanel (IMP-09 + IMP-11)', () => {
         it('renders banner "N rows rejected — review" with chevron expander', () => {
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           const banner = screen.getByTestId('rejected-rows-banner');
           expect(banner.textContent).toMatch(/4 rows rejected/);
         });

         it('groups rejected rows by reason', () => {
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           expect(screen.getByTestId('rejected-group-subtotal')).toBeTruthy();
           expect(screen.getByTestId('rejected-group-currency-unparseable')).toBeTruthy();
           expect(screen.getByTestId('rejected-group-low-confidence-parse')).toBeTruthy();
         });

         it('within each reason group, rows sorted by original file rowIndex ascending', () => {
           const reversed: RejectedRow[] = [
             baseRow(20, 'currency-unparseable', { failingCellValue: '$X' }),
             baseRow(5, 'currency-unparseable', { failingCellValue: '$Y' }),
           ];
           render(<RejectedRowsPanel rejectedRows={reversed} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           const group = screen.getByTestId('rejected-group-currency-unparseable');
           const ids = Array.from(group.querySelectorAll('[data-testid^="rejected-row-"]')).map((el) => el.getAttribute('data-testid'));
           // Row 5 must appear before Row 20
           expect(ids.indexOf('rejected-row-5')).toBeLessThan(ids.indexOf('rejected-row-20'));
         });

         it('per-row edit-in-place fires onUpdate(rowIndex, patch) on field change', () => {
           const onUpdate = vi.fn();
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={onUpdate} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           const input = screen.getByLabelText('rejected-8-debit');
           fireEvent.change(input, { target: { value: '1234.56' } });
           expect(onUpdate).toHaveBeenCalledWith(8, { editedDebit: '1234.56' });
         });

         it('"Re-parse and include" button fires onReparse(rowIndex)', () => {
           const onReparse = vi.fn();
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={onReparse} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           fireEvent.click(screen.getByTestId('rejected-row-8-reparse'));
           expect(onReparse).toHaveBeenCalledWith(8);
         });

         it('"Apply this fix to similar rows" identifies similar by reason + regex signature, shows diff preview', () => {
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           // Rows 8 + 9 both have failingCellValue matching "\\$\\d+,\\d+\\.\\d+ [A-Za-z]+"
           fireEvent.click(screen.getByTestId('rejected-row-8-apply-similar'));
           expect(screen.getByTestId('rejected-row-8-similar-preview')).toBeTruthy();
         });

         it('diff preview includes confirm + cancel; cancel leaves rows unchanged', () => {
           const onApply = vi.fn();
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={onApply} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           fireEvent.click(screen.getByTestId('rejected-row-8-apply-similar'));
           fireEvent.click(screen.getByTestId('rejected-row-8-similar-cancel'));
           expect(onApply).not.toHaveBeenCalled();
           expect(screen.queryByTestId('rejected-row-8-similar-preview')).toBeNull();
         });

         it('"Include all subtotals" bulk button fires onIncludeAllSubtotals (only renders when subtotal group non-empty)', () => {
           const onInclude = vi.fn();
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={onInclude} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           fireEvent.click(screen.getByTestId('include-all-subtotals'));
           expect(onInclude).toHaveBeenCalled();
         });

         it('low-confidence-parse section starts COLLAPSED by default; clicking expander reveals rows', () => {
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           fireEvent.click(screen.getByTestId('rejected-rows-banner'));
           // Row 11 is low-confidence — must NOT render before expander click
           expect(screen.queryByTestId('rejected-row-11')).toBeNull();
           fireEvent.click(screen.getByTestId('low-confidence-section-expander'));
           expect(screen.getByTestId('rejected-row-11')).toBeTruthy();
         });

         it('renders test-id "rejected-rows-banner" so ImportReviewPane integration tests can query it', () => {
           render(<RejectedRowsPanel rejectedRows={rows} onUpdate={vi.fn()} onReparse={vi.fn()} onApplyToSimilar={vi.fn()} onIncludeAllSubtotals={vi.fn()} />);
           expect(screen.getByTestId('rejected-rows-banner')).toBeTruthy();
         });
       });
       ```

    3. Run `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx`. Expect 10 GREEN.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx --reporter=default 2>&1 | tail -10</automated>
  </verify>
  <acceptance_criteria>
    - `src/components/RejectedRowsPanel.tsx` exists; exports `RejectedRowsPanel`, `RejectedRow`, `RejectedRowReason`
    - `grep -c "data-testid=\"rejected-rows-banner\"" src/components/RejectedRowsPanel.tsx` returns 1
    - `grep -c "data-testid=\"include-all-subtotals\"" src/components/RejectedRowsPanel.tsx` returns 1
    - `grep -c "data-testid=\"low-confidence-section-expander\"" src/components/RejectedRowsPanel.tsx` returns 1
    - `grep -c "deriveRegexSignature" src/components/RejectedRowsPanel.tsx` returns 1 (imports + uses for Apply-to-similar)
    - `grep -c "it.todo" src/components/__tests__/RejectedRowsPanel.test.tsx` returns 0
    - `npx vitest run src/components/__tests__/RejectedRowsPanel.test.tsx` exit 0 with 10 GREEN
  </acceptance_criteria>
  <done>
    RejectedRowsPanel component shipped with all 10 test cases GREEN. Component ready for ImportReviewPane integration in Task 4.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extend ImportTB.tsx state machine — header-row step + currency-parse + subtotal-detect + split-column integration</name>
  <read_first>
    - src/components/ImportTB.tsx (FULL Phase 4 file — 637 lines; understand state flow before modifying)
    - src/components/__tests__/ImportTB.test.tsx (existing 9 GREEN tests MUST stay GREEN — the test file documents the contract Phase 4 expectations)
    - src/components/HeaderRowPicker.tsx (Task 1 output — props contract)
    - src/lib/import/headerDetect.ts (Task 2 in Plan 07-2 — detectHeaderRow result shape + AUTO_PICK_THRESHOLD)
    - src/lib/import/currencyParse.ts (Task 1 in Plan 07-2 — ParseResult shape)
    - src/lib/import/subtotalDetect.ts (Task 2 in Plan 07-2 — ImportRow + SubtotalFlag shapes)
    - src/lib/import/columnMerge.ts (Task 2 in Plan 07-2 — detectSplitColumns + mergeColumns)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 724-792: ImportTB state machine extension — full state additions + render guard + new rendering block placement)
    - .planning/milestones/v1.0-phases/04-bookkeeping-core/04-4-SUMMARY.md (lines 229-247: jsdom File.arrayBuffer pitfall fix + vi.doUnmock pattern — apply to any new tests touching XLSX)
  </read_first>
  <behavior>
    - New state vars added to ImportTB.tsx: `rawRows: string[][] | null`, `headerDetectResult: HeaderDetectResult | null`, `headerRowIndex: number | null`, `isPickingHeader: boolean`, `rejectedRows: RejectedRow[]`, `tolerantParseCount: number`, `lowConfidenceParseCount: number`
    - `handleFileUpload` for CSV: 1) `parseCsvRaw(file)` → rawRows; 2) `detectHeaderRow(rawRows)`; 3) if `autoPickRow !== null` → `setHeaderRowIndex(autoPickRow)` + continue to column-mapping; else → `setIsPickingHeader(true)`
    - `handleFileUpload` for XLSX: existing sheet-picker flow runs first; after sheet pick, the same header-detection branch runs (via `getXlsxRawRows`)
    - New `handleHeaderPick(rowIndex)` callback: `setHeaderRowIndex(rowIndex); setIsPickingHeader(false); proceedToColumnMapping(rowIndex)`
    - `proceedToColumnMapping(headerRowIndex)`: calls `parseCsvFile(file, { headerRowIndex })` OR `parseXlsxBuffer(buf, { headerRowIndex })` to get `ParsedCsv`; runs `detectSplitColumns(headers, rows)` → if `result.hasSplitColumns && result.missingCodeFraction < 0.5` auto-runs `mergeColumns` and seeds the column-mapping `code` field with `'__merged_code_name'`; if `missingCodeFraction > 0.5` sets a `missingCodeMode: 'pick' | 'auto-assign' | 'name-only' | null` state and renders a small picker before continuing
    - `processColumnMapping` MODIFIED: instead of `Number(r[mapping.debit])`, calls `parseCurrency(r[mapping.debit])`; tracks `tolerantParseCount` (high-confidence non-trivial parses) and `lowConfidenceParseCount`; populates `rejectedRows` for rows where parse returned `null` with the right `RejectedRowReason`
    - After parsing rows, before the review stage: runs `detectSubtotals(importRows)` → moves subtotal-flagged rows from accepted to `rejectedRows` with `reason: 'subtotal'`
    - Render guard updated to include `!isPickingHeader` AND `!missingCodeMode`:
      ```tsx
      const showUploadScreen = !isColumnMapping && !reviewing && !sheetPickerNames && !fingerprintCollision && !isPickingHeader && !missingCodeMode;
      ```
    - New render blocks inserted in the correct order:
      ```tsx
      {isPickingHeader && rawRows && (
        <HeaderRowPicker rows={rawRows} detectResult={headerDetectResult} onPick={handleHeaderPick} onCancel={resetState} />
      )}
      {missingCodeMode && (
        <div data-testid="missing-code-picker">...buttons for auto-assign / name-only/...</div>
      )}
      ```
    - `<ImportReviewPane>` receives the new optional props: `rejectedRows`, `tolerantParseCount`, `lowConfidenceParseCount`, `onRejectedRowUpdate`, `onRejectedRowReparse`, `onIncludeAllSubtotals`, `onApplyToSimilar`
    - `resetState` clears all new state vars
    - All 9 existing Phase 4 ImportTB.test.tsx tests stay GREEN — the clean-import path (no $, no subtotals, row-0 header) auto-pick header at row 0 with high confidence and proceeds identically
    - New integration tests added (extending ImportTB.test.tsx):
      - `'IMP-07: low-confidence header detection shows HeaderRowPicker, user pick advances to column mapping'`
      - `'IMP-07: high-confidence header detection auto-advances past HeaderRowPicker'`
      - `'IMP-08: $ amounts parse correctly and increment tolerantParseCount'`
      - `'IMP-09: subtotal-detected rows appear in rejectedRows with reason "subtotal"'`
      - `'IMP-10: missingCodeFraction > 0.5 renders missing-code picker with auto-assign + name-only options'`
      - `'REGRESSION: Phase 4 clean fixture imports cleanly through Phase 7 code path — onImport called once with 3 lines, zero rejectedRows'` (this is THE critical regression test)
  </behavior>
  <action>
    1. Read the entire current `src/components/ImportTB.tsx` (637 lines). The implementation must EXTEND the existing component, not replace it. Preserve:
       - Existing prop names and shapes (`accounts`, `onImport`, `activeEntityId`, `existingEntries`, `onReplace`)
       - Existing state variables for `parsedRows`, `parsedHeaders`, `xlsxBuffer`, `sheetPickerNames`, `columnMappingByName`, `isColumnMapping`, `importedRows`, `reviewing`, `isProcessing`, `fingerprintCollision`, `asAtDate`
       - Existing flow after column mapping (review → fingerprint → post)
       - AI gating with `isAiEnabled()` + `AiGateNote`
       - The `data-testid="fingerprint-collision-dialog"` + Skip/Replace/Add-additional dialog buttons

    2. Add the new imports at the top of `ImportTB.tsx`:
       ```typescript
       import { parseCsvRaw } from '../lib/import/csv';
       import { getXlsxRawRows } from '../lib/import/xlsx';
       import { detectHeaderRow, type HeaderDetectResult } from '../lib/import/headerDetect';
       import { parseCurrency } from '../lib/import/currencyParse';
       import { detectSubtotals, type ImportRow as SubtotalImportRow } from '../lib/import/subtotalDetect';
       import { detectSplitColumns, mergeColumns } from '../lib/import/columnMerge';
       import { HeaderRowPicker } from './HeaderRowPicker';
       import type { RejectedRow } from './RejectedRowsPanel';
       import Decimal from 'decimal.js';
       ```

    3. Add the new state variables near the top of the component (preserving the existing block structure):
       ```typescript
       const [rawRows, setRawRows] = useState<string[][] | null>(null);
       const [headerDetectResult, setHeaderDetectResult] = useState<HeaderDetectResult | null>(null);
       const [headerRowIndex, setHeaderRowIndex] = useState<number | null>(null);
       const [isPickingHeader, setIsPickingHeader] = useState(false);
       const [rejectedRows, setRejectedRows] = useState<RejectedRow[]>([]);
       const [tolerantParseCount, setTolerantParseCount] = useState(0);
       const [lowConfidenceParseCount, setLowConfidenceParseCount] = useState(0);
       const [pickedFile, setPickedFile] = useState<File | null>(null);
       const [pickedSheetName, setPickedSheetName] = useState<string | null>(null);
       const [missingCodeMode, setMissingCodeMode] = useState<'pick' | null>(null);
       ```

    4. Modify `handleFileUpload` for CSV (preserve XLSX behavior to flow through to header-detect after sheet pick):
       ```typescript
       if (lower.endsWith('.csv')) {
         setPickedFile(file);
         const raw = await parseCsvRaw(file);
         setRawRows(raw);
         const detect = detectHeaderRow(raw);
         setHeaderDetectResult(detect);
         if (detect.autoPickRow !== null) {
           await proceedAfterHeaderPick(detect.autoPickRow, file, null, null);
         } else {
           setIsPickingHeader(true);
         }
       } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
         const buf = await file.arrayBuffer();
         setXlsxBuffer(buf);
         setPickedFile(file);
         const { sheetNames } = parseXlsxBuffer(buf);
         if (sheetNames.length > 1) {
           setSheetPickerNames(sheetNames);
         } else {
           setPickedSheetName(sheetNames[0]);
           const raw = getXlsxRawRows(buf, sheetNames[0]);
           setRawRows(raw);
           const detect = detectHeaderRow(raw);
           setHeaderDetectResult(detect);
           if (detect.autoPickRow !== null) {
             await proceedAfterHeaderPick(detect.autoPickRow, file, buf, sheetNames[0]);
           } else {
             setIsPickingHeader(true);
           }
         }
       }
       ```

    5. Modify `handleSheetPick` to route through header detection:
       ```typescript
       const handleSheetPick = async (name: string) => {
         if (!xlsxBuffer) return;
         setSheetPickerNames(null);
         setPickedSheetName(name);
         const raw = getXlsxRawRows(xlsxBuffer, name);
         setRawRows(raw);
         const detect = detectHeaderRow(raw);
         setHeaderDetectResult(detect);
         if (detect.autoPickRow !== null) {
           await proceedAfterHeaderPick(detect.autoPickRow, pickedFile, xlsxBuffer, name);
         } else {
           setIsPickingHeader(true);
         }
       };
       ```

    6. Add `handleHeaderPick`:
       ```typescript
       const handleHeaderPick = async (rowIndex: number) => {
         setHeaderRowIndex(rowIndex);
         setIsPickingHeader(false);
         await proceedAfterHeaderPick(rowIndex, pickedFile, xlsxBuffer, pickedSheetName);
       };
       ```

    7. Add `proceedAfterHeaderPick` that calls the widened parsers + runs split-column detection:
       ```typescript
       const proceedAfterHeaderPick = async (
         rowIdx: number,
         file: File | null,
         buf: ArrayBuffer | null,
         sheet: string | null,
       ) => {
         try {
           let parsed: { rows: RawRow[]; headers: string[] };
           if (buf && sheet) {
             parsed = pickSheetByName(buf, sheet, { headerRowIndex: rowIdx });
           } else if (file) {
             parsed = await parseCsvFile(file, { headerRowIndex: rowIdx });
           } else {
             throw new Error('No file or buffer available');
           }
           // Split-column detection
           const splitResult = detectSplitColumns(parsed.headers, parsed.rows);
           let effectiveRows = parsed.rows;
           let effectiveHeaders = parsed.headers;
           if (splitResult.hasSplitColumns && splitResult.missingCodeFraction < 0.5 && splitResult.codeColHeader && splitResult.nameColHeader) {
             effectiveRows = mergeColumns(parsed.rows, splitResult.codeColHeader, splitResult.nameColHeader);
             effectiveHeaders = [...parsed.headers, '__merged_code_name'];
           }
           setParsedRows(effectiveRows);
           setParsedHeaders(effectiveHeaders);
           seedDefaultMapping(effectiveHeaders);
           if (splitResult.codeColHeader && splitResult.missingCodeFraction > 0.5) {
             setMissingCodeMode('pick');
           } else {
             setIsColumnMapping(true);
           }
         } catch (err) {
           console.error('proceedAfterHeaderPick failed', err);
           alert(`Could not parse file with header row ${rowIdx + 1}: ${(err as Error).message}`);
         }
       };
       ```

    8. Modify `processColumnMapping` to use `parseCurrency` and produce both accepted rows + rejected rows:
       ```typescript
       const processColumnMapping = () => {
         if (!parsedRows) return;
         const accepted: ReviewRow[] = [];
         const rejected: RejectedRow[] = [];
         let tolerant = 0;
         let lowConf = 0;

         parsedRows.forEach((r, idx) => {
           const code = (r[columnMappingByName.code] ?? '').toString().trim();
           const name = (r[columnMappingByName.name] ?? '').toString().trim();
           const rawDebit = (r[columnMappingByName.debit] ?? '').toString();
           const rawCredit = (r[columnMappingByName.credit] ?? '').toString();
           const debitResult = parseCurrency(rawDebit);
           const creditResult = parseCurrency(rawCredit);

           if (rawDebit.trim() !== '' && debitResult.confidence === 'high' && /[$,A]/.test(rawDebit)) tolerant++;
           if (rawCredit.trim() !== '' && creditResult.confidence === 'high' && /[$,A]/.test(rawCredit)) tolerant++;
           if (debitResult.confidence === 'low' && debitResult.decimal !== null) lowConf++;
           if (creditResult.confidence === 'low' && creditResult.decimal !== null) lowConf++;

           // Reject if either parse returned null OR no identifying info
           if (debitResult.decimal === null || creditResult.decimal === null) {
             const failingColumn: RejectedRow['failingColumn'] = debitResult.decimal === null ? 'debit' : 'credit';
             const failingCellValue = debitResult.decimal === null ? rawDebit : rawCredit;
             rejected.push({
               rowIndex: idx,
               reason: 'currency-unparseable',
               rawCode: code, rawName: name, rawDebit, rawCredit,
               failingCellValue,
               failingColumn,
             });
             return;
           }
           if (!code && !name) return;   // empty row, drop silently
           if (!code && name) {
             rejected.push({
               rowIndex: idx,
               reason: 'no-account-code',
               rawCode: code, rawName: name, rawDebit, rawCredit,
             });
             return;
           }
           const debitNum = debitResult.decimal.toNumber();
           const creditNum = creditResult.decimal.toNumber();
           if (debitNum === 0 && creditNum === 0) return;   // empty amounts, drop
           accepted.push({
             externalCode: code,
             externalName: name,
             debit: debitNum,
             credit: creditNum,
             mappedAccountId: undefined,
             confidence: 0,
             reasoning: 'Pending fuzzy match',
             _include: true,
           });
         });

         // Run subtotal detection on accepted rows (must convert to ImportRow shape)
         const subtotalInput: SubtotalImportRow[] = accepted.map((a, i) => ({
           rowIndex: i,
           code: a.externalCode,
           name: a.externalName,
           debit: new Decimal(a.debit),
           credit: new Decimal(a.credit),
           rawDebit: String(a.debit),
           rawCredit: String(a.credit),
         }));
         const subtotalFlags = detectSubtotals(subtotalInput);
         const subtotalIxs = new Set(subtotalFlags.map((f) => f.rowIndex));
         const finalAccepted: ReviewRow[] = [];
         accepted.forEach((row, i) => {
           if (subtotalIxs.has(i)) {
             rejected.push({
               rowIndex: i,
               reason: 'subtotal',
               rawCode: row.externalCode,
               rawName: row.externalName,
               rawDebit: String(row.debit),
               rawCredit: String(row.credit),
             });
             return;
           }
           // Deterministic fuzzy match — preserves Phase 4 behavior
           const result = fuzzyMatch(row, accounts);
           finalAccepted.push({
             ...row,
             mappedAccountId: result.mappedAccountId,
             confidence: result.confidence,
             reasoning:
               result.confidence >= HIGH_CONFIDENCE_THRESHOLD
                 ? 'Auto-matched (deterministic)'
                 : 'Manual review recommended',
           });
         });

         setImportedRows(finalAccepted);
         setRejectedRows(rejected);
         setTolerantParseCount(tolerant);
         setLowConfidenceParseCount(lowConf);
         setIsColumnMapping(false);
         setReviewing(true);
       };
       ```

    9. Add `handleRejectedRowReparse`, `handleRejectedRowUpdate`, `handleIncludeAllSubtotals`, `handleApplyToSimilar` callbacks. They mutate `rejectedRows` and (on reparse success) push back into `importedRows`:
       ```typescript
       const handleRejectedRowUpdate = (rowIndex: number, patch: Partial<RejectedRow>) => {
         setRejectedRows((curr) => curr.map((r) => r.rowIndex === rowIndex ? { ...r, ...patch } : r));
       };
       const handleRejectedRowReparse = (rowIndex: number) => {
         const row = rejectedRows.find((r) => r.rowIndex === rowIndex);
         if (!row) return;
         const debitResult = parseCurrency(row.editedDebit ?? row.rawDebit);
         const creditResult = parseCurrency(row.editedCredit ?? row.rawCredit);
         if (debitResult.decimal === null || creditResult.decimal === null) return;
         setRejectedRows((curr) => curr.filter((r) => r.rowIndex !== rowIndex));
         setImportedRows((curr) => [...curr, {
           externalCode: row.editedCode ?? row.rawCode,
           externalName: row.editedName ?? row.rawName,
           debit: debitResult.decimal.toNumber(),
           credit: creditResult.decimal.toNumber(),
           mappedAccountId: undefined,
           confidence: 0,
           reasoning: 'Re-parsed from rejected',
           _include: true,
         } as ReviewRow]);
       };
       const handleIncludeAllSubtotals = () => {
         const subtotals = rejectedRows.filter((r) => r.reason === 'subtotal');
         setRejectedRows((curr) => curr.filter((r) => r.reason !== 'subtotal'));
         setImportedRows((curr) => [
           ...curr,
           ...subtotals.map((s) => {
             const debit = parseCurrency(s.rawDebit).decimal?.toNumber() ?? 0;
             const credit = parseCurrency(s.rawCredit).decimal?.toNumber() ?? 0;
             return {
               externalCode: s.rawCode,
               externalName: s.rawName,
               debit, credit,
               mappedAccountId: undefined,
               confidence: 0,
               reasoning: 'Subtotal manually included',
               _include: true,
             } as ReviewRow;
           }),
         ]);
       };
       const handleApplyToSimilar = (sourceRowIndex: number) => {
         const source = rejectedRows.find((r) => r.rowIndex === sourceRowIndex);
         if (!source || !source.failingCellValue) return;
         // Stub for v1.1: simply mark them with the same edits + re-attempt parse
         // (Full bulk-apply with diff confirmation is in the panel; this is the
         // commit hook that fires when user clicks Apply confirm.)
         const sig = deriveRegexSignature(source.failingCellValue);
         const re = new RegExp(`^${sig}$`);
         const similar = rejectedRows.filter((r) => r.reason === source.reason && r.failingCellValue && re.test(r.failingCellValue));
         // For each similar row, swap in the source's edited values then attempt re-parse
         similar.forEach((s) => {
           const patched: RejectedRow = {
             ...s,
             editedCode: source.editedCode ?? s.editedCode,
             editedName: source.editedName ?? s.editedName,
             editedDebit: source.editedDebit ?? s.editedDebit,
             editedCredit: source.editedCredit ?? s.editedCredit,
           };
           handleRejectedRowUpdate(s.rowIndex, patched);
           handleRejectedRowReparse(s.rowIndex);
         });
       };
       ```
       Note: `deriveRegexSignature` import is also needed at the top of the file.

    10. Update `resetState` to clear all the new state vars.

    11. Update the render block. Insert HeaderRowPicker BETWEEN sheetPicker and columnMapping render blocks; insert missing-code picker between HeaderRowPicker and columnMapping:
        ```tsx
        {isPickingHeader && rawRows && (
          <HeaderRowPicker rows={rawRows} detectResult={headerDetectResult} onPick={handleHeaderPick} onCancel={resetState} />
        )}
        {missingCodeMode && (
          <div data-testid="missing-code-picker" className="bg-white border border-amber-200 p-4 rounded space-y-2">
            <p className="text-sm">More than half the rows are missing an account code. How would you like to proceed?</p>
            <div className="flex gap-2">
              <button type="button" data-testid="missing-code-auto-assign" onClick={() => { /* assign codes sequentially: '001', '002', ... */
                setParsedRows((parsedRows ?? []).map((r, i) => ({ ...r, [columnMappingByName.code || '__assigned_code']: String(i + 1).padStart(3, '0') })));
                setColumnMappingByName({ ...columnMappingByName, code: columnMappingByName.code || '__assigned_code' });
                setMissingCodeMode(null); setIsColumnMapping(true);
              }} className="bg-blue-600 text-white px-3 py-1 rounded text-sm">Auto-assign codes sequentially</button>
              <button type="button" data-testid="missing-code-name-only" onClick={() => { setMissingCodeMode(null); setIsColumnMapping(true); }} className="border px-3 py-1 rounded text-sm">Import name-only and map manually</button>
              <button type="button" data-testid="missing-code-cancel" onClick={resetState} className="underline text-sm">Cancel</button>
            </div>
          </div>
        )}
        ```

    12. Update the `<ImportReviewPane>` invocation in the reviewing block to pass the new props:
        ```tsx
        <ImportReviewPane
          rows={importedRows}
          accounts={accounts}
          onUpdate={(rs) => setImportedRows(rs as ReviewRow[])}
          onAccept={handleAcceptImport}
          onReject={resetState}
          rejectedRows={rejectedRows}
          tolerantParseCount={tolerantParseCount}
          lowConfidenceParseCount={lowConfidenceParseCount}
          onRejectedRowUpdate={handleRejectedRowUpdate}
          onRejectedRowReparse={handleRejectedRowReparse}
          onIncludeAllSubtotals={handleIncludeAllSubtotals}
          onApplyToSimilar={handleApplyToSimilar}
        />
        ```

    13. Extend `src/components/__tests__/ImportTB.test.tsx` with these new tests. Use the existing `vi.doUnmock` + `Object.defineProperty(file, 'arrayBuffer', ...)` patterns from Phase 4 (per 04-4-SUMMARY pitfalls). Each test must include the Phase 4 fixture-building helper. Cases to add:
        - `'IMP-07: high-confidence header detection on clean CSV (row 0) auto-advances past HeaderRowPicker'` — uploads existing clean fixture; assert `column-mapping` testid appears WITHOUT seeing `header-row-picker`
        - `'IMP-07: low-confidence header detection (Xero shape with 4 title rows) shows HeaderRowPicker; clicking row 4 advances to column-mapping'` — build a CSV with 4 title rows + header at row 4; assert `header-row-picker` testid appears OR if confidence >= 0.6 it auto-advances; click row 4 if not auto-advanced
        - `'IMP-08: $ amounts in debit column parse correctly and increment tolerantParseCount'` — fixture with `$1,234.56` cells; advance to review; assert `screen.getByTestId('import-review-pane')` shows; verify rows array has correct numeric values
        - `'IMP-09: subtotal-detected rows appear in rejectedRows panel with reason "subtotal"'` — fixture with `Total Revenue` row whose value equals sum of preceding; advance; assert `rejected-group-subtotal` testid renders
        - `'IMP-10: missing-code picker renders when >50% of code cells are empty; auto-assign sequentially fills codes'` — fixture with many empty code cells; assert `missing-code-picker` testid renders; click auto-assign; verify column-mapping advances
        - `'REGRESSION: Phase 4 clean fixture imports cleanly through Phase 7 code path — onImport called once with N lines, zero rejectedRows'` — use the EXACT Phase 4 makeCsvFile fixture from existing tests; complete the flow; assert `onImport` called once + entry has expected line count + no `rejected-rows-banner` testid visible

        Mirror the existing test setup boilerplate (mocks, vi.resetModules, vi.doUnmock for match + ai).

    14. Run `npx vitest run src/components/__tests__/ImportTB.test.tsx`. All 9 existing GREEN + 6 new GREEN.

    15. Run `npx vitest run`. Verify 0 fail, no regressions.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/ImportTB.test.tsx --reporter=default 2>&1 | tail -15</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "isPickingHeader" src/components/ImportTB.tsx` returns ≥ 4 (state + setter + render guard + render block)
    - `grep -c "HeaderRowPicker" src/components/ImportTB.tsx` returns ≥ 2 (import + render)
    - `grep -c "parseCurrency" src/components/ImportTB.tsx` returns ≥ 2 (import + use)
    - `grep -c "detectSubtotals" src/components/ImportTB.tsx` returns ≥ 2
    - `grep -c "detectSplitColumns\\|mergeColumns" src/components/ImportTB.tsx` returns ≥ 2
    - `grep -c "data-testid=\"missing-code-picker\"" src/components/ImportTB.tsx` returns 1
    - `grep -c "data-testid=\"fingerprint-collision-dialog\"" src/components/ImportTB.tsx` returns 1 (Phase 4 preserved)
    - `grep -c "isAiEnabled" src/components/ImportTB.tsx` returns ≥ 1 (Phase 3 gate preserved)
    - `grep -c "rejectedRows" src/components/ImportTB.tsx` returns ≥ 4
    - `npx vitest run src/components/__tests__/ImportTB.test.tsx` exit 0 with ≥ 15 GREEN (9 existing + 6 new)
    - `npx vitest run --reporter=default 2>&1 | grep -E "failed"` returns no failure count
  </acceptance_criteria>
  <done>
    ImportTB.tsx extends Phase 4 with the headerRowChosen step + currency-parse + subtotal-detect + split-column integration. Existing 9 GREEN preserved. 6 new IMP-07..11 + regression tests GREEN. Phase 4 fingerprint dialog + AI gate untouched.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Extend ImportReviewPane.tsx with rejectedRows + tolerant-parse banner + AnomalyBadge integration</name>
  <read_first>
    - src/components/ImportReviewPane.tsx (Phase 4 file — 210 lines; props contract, table layout)
    - src/components/__tests__/ImportReviewPane.test.tsx (existing 6 GREEN tests MUST stay GREEN)
    - src/components/RejectedRowsPanel.tsx (Task 2 output — props contract for invocation)
    - src/components/AnomalyBadge.tsx (Phase 5 — severity model)
    - .planning/phases/07-importtb-ux-rework/07-RESEARCH.md (lines 860-902: ImportReviewPane prop additions + RejectedRow type re-exported)
  </read_first>
  <behavior>
    - All existing `ImportReviewPaneProps` fields unchanged
    - New OPTIONAL fields added: `rejectedRows?: RejectedRow[]`, `tolerantParseCount?: number`, `lowConfidenceParseCount?: number`, `onRejectedRowUpdate?: (rowIndex: number, patch: Partial<RejectedRow>) => void`, `onRejectedRowReparse?: (rowIndex: number) => void`, `onIncludeAllSubtotals?: () => void`, `onApplyToSimilar?: (sourceRowIndex: number) => void`
    - When `rejectedRows` is undefined OR empty, no rejected-rows panel renders; existing Phase 4 callers unaffected
    - When `tolerantParseCount > 0`, a banner `<div data-testid="tolerant-parse-banner">Tolerantly parsed currency in N cells</div>` renders at the top of the pane
    - When `lowConfidenceParseCount > 0`, a small `<AnomalyBadge severity="warn" label={`${N} cells parsed with low confidence`} />` renders alongside the banner; clicking it expands the low-confidence section in RejectedRowsPanel
    - When `rejectedRows.length > 0`, `<RejectedRowsPanel ... />` renders below the accepted-rows table (between the accept/reject toolbar and the bottom row counter)
    - Component-level test additions:
      - `'IMP-08: tolerant-parse-banner renders when tolerantParseCount > 0'`
      - `'IMP-08: AnomalyBadge renders when lowConfidenceParseCount > 0'`
      - `'IMP-09/11: RejectedRowsPanel renders inline when rejectedRows non-empty'`
      - `'REGRESSION: omitting Phase 7 props (Phase 4 caller) does not render banner, badge, or panel'`
  </behavior>
  <action>
    1. Open `src/components/ImportReviewPane.tsx`. Widen the props interface (everything new is optional — backward-compatible):

       ```typescript
       import type { RejectedRow } from './RejectedRowsPanel';
       import { RejectedRowsPanel } from './RejectedRowsPanel';
       import { AnomalyBadge } from './AnomalyBadge';

       interface ImportReviewPaneProps {
         rows: ImportedAccount[];
         accounts: Account[];
         onUpdate: (rows: ImportedAccount[]) => void;
         onAccept: () => void;
         onReject: () => void;
         // Phase 7 additions — optional, backward-compatible
         rejectedRows?: RejectedRow[];
         tolerantParseCount?: number;
         lowConfidenceParseCount?: number;
         onRejectedRowUpdate?: (rowIndex: number, patch: Partial<RejectedRow>) => void;
         onRejectedRowReparse?: (rowIndex: number) => void;
         onIncludeAllSubtotals?: () => void;
         onApplyToSimilar?: (sourceRowIndex: number) => void;
       }
       ```

    2. Inside the component body, near the top of the return JSX, add the banner block. Below the existing accept/reject toolbar but before the `<table>`:

       ```tsx
       {(tolerantParseCount ?? 0) > 0 && (
         <div data-testid="tolerant-parse-banner" className="bg-blue-50 border border-blue-100 p-2 text-xs mb-2 flex items-center gap-2">
           <span>Tolerantly parsed currency in {tolerantParseCount} cells</span>
           {(lowConfidenceParseCount ?? 0) > 0 && (
             <AnomalyBadge severity="warn" label={`${lowConfidenceParseCount} cells low confidence`} />
           )}
         </div>
       )}
       ```

    3. After the closing `</table>` and `</div>` of the existing accepted-rows section, but inside the main `<section>`, add:

       ```tsx
       {rejectedRows && rejectedRows.length > 0 && onRejectedRowUpdate && onRejectedRowReparse && onIncludeAllSubtotals && onApplyToSimilar && (
         <RejectedRowsPanel
           rejectedRows={rejectedRows}
           onUpdate={onRejectedRowUpdate}
           onReparse={onRejectedRowReparse}
           onIncludeAllSubtotals={onIncludeAllSubtotals}
           onApplyToSimilar={onApplyToSimilar}
         />
       )}
       ```

    4. Add 4 new tests to `src/components/__tests__/ImportReviewPane.test.tsx`:

       ```typescript
       it('IMP-08: tolerant-parse-banner renders when tolerantParseCount > 0', () => {
         const rows: ImportedAccount[] = [{ externalCode: '1000', externalName: 'Cash', debit: 100, credit: 0, mappedAccountId: undefined, confidence: 0 }];
         render(<ImportReviewPane rows={rows} accounts={[]} onUpdate={vi.fn()} onAccept={vi.fn()} onReject={vi.fn()} tolerantParseCount={3} />);
         const banner = screen.getByTestId('tolerant-parse-banner');
         expect(banner.textContent).toMatch(/Tolerantly parsed currency in 3 cells/);
       });

       it('IMP-08: AnomalyBadge renders when lowConfidenceParseCount > 0', () => {
         const rows: ImportedAccount[] = [{ externalCode: '1000', externalName: 'Cash', debit: 100, credit: 0, mappedAccountId: undefined, confidence: 0 }];
         render(<ImportReviewPane rows={rows} accounts={[]} onUpdate={vi.fn()} onAccept={vi.fn()} onReject={vi.fn()} tolerantParseCount={3} lowConfidenceParseCount={2} />);
         expect(screen.getByTestId('tolerant-parse-banner').textContent).toMatch(/2 cells low confidence/);
       });

       it('IMP-09/11: RejectedRowsPanel renders inline when rejectedRows non-empty', () => {
         const rows: ImportedAccount[] = [{ externalCode: '1000', externalName: 'Cash', debit: 100, credit: 0, mappedAccountId: undefined, confidence: 0 }];
         const rejected: RejectedRow[] = [{ rowIndex: 5, reason: 'subtotal', rawCode: '', rawName: 'Total Revenue', rawDebit: '0', rawCredit: '55000' }];
         render(<ImportReviewPane rows={rows} accounts={[]} onUpdate={vi.fn()} onAccept={vi.fn()} onReject={vi.fn()}
           rejectedRows={rejected} onRejectedRowUpdate={vi.fn()} onRejectedRowReparse={vi.fn()} onIncludeAllSubtotals={vi.fn()} onApplyToSimilar={vi.fn()} />);
         expect(screen.getByTestId('rejected-rows-banner')).toBeTruthy();
         expect(screen.getByTestId('rejected-rows-banner').textContent).toMatch(/1 rows rejected/);
       });

       it('REGRESSION: omitting Phase 7 props (Phase 4 caller) does not render banner, badge, or panel', () => {
         const rows: ImportedAccount[] = [{ externalCode: '1000', externalName: 'Cash', debit: 100, credit: 0, mappedAccountId: undefined, confidence: 0 }];
         render(<ImportReviewPane rows={rows} accounts={[]} onUpdate={vi.fn()} onAccept={vi.fn()} onReject={vi.fn()} />);
         expect(screen.queryByTestId('tolerant-parse-banner')).toBeNull();
         expect(screen.queryByTestId('rejected-rows-banner')).toBeNull();
       });
       ```

       Import `RejectedRow` at the top of the test file: `import type { RejectedRow } from '../RejectedRowsPanel';`

    5. Run `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx`. Verify all 6 existing tests GREEN + 4 new GREEN = 10 total.

    6. Run `npx vitest run`. Verify 0 fail, no regressions. Total GREEN should now be ≥ 813 (763 baseline + ~50 across 07-1/2/3).
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/ImportReviewPane.test.tsx --reporter=default 2>&1 | tail -10 && echo "---FULL---" && npx vitest run --reporter=default 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - `grep -c "RejectedRowsPanel" src/components/ImportReviewPane.tsx` returns ≥ 2 (import + render)
    - `grep -c "AnomalyBadge" src/components/ImportReviewPane.tsx` returns ≥ 2 (import + render)
    - `grep -c "tolerant-parse-banner" src/components/ImportReviewPane.tsx` returns 1
    - `grep -c "rejectedRows\\?:" src/components/ImportReviewPane.tsx` returns 1 (optional prop)
    - `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx` exit 0 with ≥ 10 GREEN (6 existing + 4 new)
    - `npx vitest run --reporter=default 2>&1 | grep -E "Tests +.+passed"` shows ≥ 813 total GREEN
    - `npx vitest run --reporter=default 2>&1 | grep -E "failed"` shows no failures
    - `npm run lint` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>
    ImportReviewPane.tsx widened with all Phase 7 props (backward-compatible); RejectedRowsPanel renders inline; tolerant-parse banner + AnomalyBadge surface anomaly counts. All 5 IMP-07..11 requirements visible end-to-end in code. Full suite GREEN ≥ 813. Lint + build green. Ready for UAT in Plan 07-4.
  </done>
</task>

</tasks>

<verification>
- `npx vitest run` exit 0 with ≥ 813 GREEN (763 baseline + ~50 Phase 7 additions)
- `npm run lint` exit 0
- `npm run build` exit 0
- `grep -L "it.todo" src/lib/import/__tests__/{headerDetect,currencyParse,subtotalDetect,columnMerge}.test.ts src/components/__tests__/{HeaderRowPicker,RejectedRowsPanel}.test.tsx` returns all 6 files (none contain todo anymore)
- Phase 4 regression test in ImportTB.test.tsx GREEN — clean fixture path produces single onImport call with correct line count and zero rejectedRows
- `git diff src/lib/import/match.ts src/lib/import/fingerprint.ts` returns empty (Phase 4 invariants preserved)
- `git diff src/storage/adapter.ts src/types.ts` returns empty (Phase 3/4 invariants preserved)
</verification>

<success_criteria>
1. HeaderRowPicker + RejectedRowsPanel components shipped with full test coverage GREEN
2. ImportTB.tsx state machine extended with `isPickingHeader` step + currency-parse + subtotal-detect + split-column integration; all Phase 4 invariants preserved (fingerprint dialog, AI gate, onImport contract)
3. ImportReviewPane.tsx widened backward-compatibly; Phase 4 callers unaffected
4. Phase 4 clean-flow regression test GREEN — single most important behavioral guarantee
5. Full SPA suite GREEN ≥ 813
6. Lint + build green
7. All 5 IMP-07..11 requirements visible in code; UAT in Plan 07-4 confirms end-to-end
</success_criteria>

<output>
After completion, create `.planning/phases/07-importtb-ux-rework/07-3-SUMMARY.md` per the standard summary template.
</output>
