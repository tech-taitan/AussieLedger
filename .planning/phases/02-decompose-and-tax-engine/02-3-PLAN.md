---
phase: 02-decompose-and-tax-engine
plan: 3
type: execute
wave: 1
depends_on: [1]
files_modified:
  - src/components/TaxReturnAssistant.tsx
  - src/components/CompanyTaxReturn.tsx
  - src/components/TrustTaxReturn.tsx
  - src/components/BasIasAssistant.tsx
  - src/components/ImportTB.tsx
  - src/components/AccountManager.tsx
autonomous: true
requirements: [FND-04, TAX-03, TAX-04, TAX-05]
gap_closure: false

must_haves:
  truths:
    - "TaxReturnAssistant calls computeIndividual and renders LabelResult.value.toFixed(2); no inline rollup math remains"
    - "CompanyTaxReturn calls computeCompany and renders typed CompanyReturn; no inline rollup remains"
    - "TrustTaxReturn calls computeTrust and renders typed TrustReturn; no inline rollup remains"
    - "BasIasAssistant calls computeBas and renders typed BasReturn; no inline rollup remains"
    - "ImportTB hides the AI section when IS_AI_ENABLED is false; primary action 'Auto-match Accounts' calls fuzzyMatch from src/lib/import/match.ts; the AI button is gated"
    - "AccountManager renders a partnershipTaxLabel column/input for Revenue and Expense rows; editing it persists via onSave with _needsReview cleared"
    - "All 12 component smoke tests + 5 component tests for these touched components stay/turn green"
  artifacts:
    - path: "src/components/TaxReturnAssistant.tsx"
      provides: "Individual tax assistant UI consuming computeIndividual"
      contains: "computeIndividual"
    - path: "src/components/CompanyTaxReturn.tsx"
      provides: "Company tax assistant UI consuming computeCompany"
      contains: "computeCompany"
    - path: "src/components/TrustTaxReturn.tsx"
      provides: "Trust tax assistant UI consuming computeTrust"
      contains: "computeTrust"
    - path: "src/components/BasIasAssistant.tsx"
      provides: "BAS/IAS assistant UI consuming computeBas"
      contains: "computeBas"
    - path: "src/components/ImportTB.tsx"
      provides: "ImportTB with deterministic-first flow; AI button gated by IS_AI_ENABLED"
      contains: "IS_AI_ENABLED"
    - path: "src/components/AccountManager.tsx"
      provides: "AccountManager with partnershipTaxLabel column"
      contains: "partnershipTaxLabel"
  key_links:
    - from: "src/components/TaxReturnAssistant.tsx"
      to: "src/lib/tax/individual.ts"
      via: "import { computeIndividual } from '../lib/tax/individual'"
      pattern: "from '\\.\\./lib/tax/individual'"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/ai.ts"
      via: "import { IS_AI_ENABLED } from '../lib/ai'"
      pattern: "from '\\.\\./lib/ai'"
    - from: "src/components/ImportTB.tsx"
      to: "src/lib/import/match.ts"
      via: "import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match'"
      pattern: "from '\\.\\./lib/import/match'"
    - from: "src/components/AccountManager.tsx"
      to: "src/types.ts"
      via: "Account.partnershipTaxLabel field referenced in render + onSave"
      pattern: "partnershipTaxLabel"
---

<objective>
Migrate the 4 tax components to consume the Phase 2 tax engine, gate ImportTB's AI flow behind IS_AI_ENABLED with a deterministic fuzzyMatch primary path, and add the partnershipTaxLabel column to AccountManager. This plan touches ONLY components — disjoint from plan 02-2's hooks. Both run in Wave 1 in parallel.

Purpose:
- Eliminate duplicated rollup logic in tax components (TAX-05 success criterion)
- Make ImportTB usable without GEMINI_API_KEY configured (FND-04 success criterion)
- Add the override surface for partnershipTaxLabel (TAX-04 success criterion)
- Keep visual output unchanged — the relocated math from plan 02-1 produces the same numeric outputs the inline math did

Output:
- 4 tax components migrated (each ~30 inline-math lines deleted, replaced by 5-line compute*() call + render adapter)
- ImportTB has 2 buttons: "Auto-match Accounts" (always) and "Enhance with AI" (conditional)
- AccountManager has a 4th editable column 'Partnership Label'
- AccountManager test + ImportTB test in plan 02-1 turn from RED to GREEN
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md
@.planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md
@.planning/phases/02-decompose-and-tax-engine/02-VALIDATION.md
@.planning/phases/02-decompose-and-tax-engine/02-1-SUMMARY.md
@src/lib/tax/types.ts
@src/lib/tax/individual.ts
@src/lib/tax/company.ts
@src/lib/tax/trust.ts
@src/lib/tax/bas.ts
@src/lib/tax/labels/fy2026.ts
@src/lib/period.ts
@src/lib/ai.ts
@src/lib/import/match.ts
@src/types.ts
@src/components/TaxReturnAssistant.tsx
@src/components/CompanyTaxReturn.tsx
@src/components/TrustTaxReturn.tsx
@src/components/BasIasAssistant.tsx
@src/components/ImportTB.tsx
@src/components/AccountManager.tsx

<interfaces>
<!-- Migration recipe per component (CONTEXT.md locked: visual output unchanged; demo math relocated). -->

Tax-component migration pattern (apply uniformly):
```typescript
// BEFORE (inline rollup):
const taxData = useMemo(() => { /* 30 lines */ }, [entries, accounts]);
// usage: taxData['6S'].toLocaleString(...)

// AFTER:
import { computeIndividual } from '../lib/tax/individual';  // or computeCompany / computeTrust / computeBas
import { currentFy } from '../lib/period';

const taxReturn = useMemo(() => {
  const fy = currentFy();
  return computeIndividual({ fy, entries, accounts, period: { type: 'fy', fy } });
}, [entries, accounts]);
// usage: Number(taxReturn['6S'].value.toFixed(2)).toLocaleString(undefined, { minimumFractionDigits: 2 })
// NOTE: keep .toLocaleString() formatting at the JSX boundary — Decimal → string via .toFixed(2), then Number(...).toLocaleString for grouping
```

ImportTB AI gating recipe:
```typescript
// New imports:
import { IS_AI_ENABLED } from '../lib/ai';
import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';

// New deterministic mapper (replaces sole reliance on runAIMapping):
const runDeterministicMapping = () => {
  setIsProcessing(true);
  const mapped: ImportedAccount[] = fileData.map(imported => {
    const result = fuzzyMatch(imported, accounts);
    return {
      ...imported,
      mappedAccountId: result.mappedAccountId,
      confidence: result.confidence,
      reasoning: result.confidence >= HIGH_CONFIDENCE_THRESHOLD ? 'Auto-matched (deterministic)' : 'Manual review recommended',
    };
  });
  setFileData(mapped);
  setMappingComplete(true);
  setIsProcessing(false);
};

// In JSX (the existing "Run AI Mapping" button area):
<button onClick={runDeterministicMapping} className="...">Auto-match Accounts</button>
{IS_AI_ENABLED && (
  <button onClick={runAIMapping} className="...">
    <Sparkles size={16} /> Enhance with AI
  </button>
)}
```

The runAIMapping function STAYS in the file — but its body is unreachable when IS_AI_ENABLED is false. Wrap the body's first executable line in `if (!IS_AI_ENABLED) return;` as defence-in-depth.

AccountManager partnership column recipe:
- Add a new <th>Partnership Label</th> in the table header after the "Trust Label" column.
- For each row, add a <td> containing an <input> bound to account.partnershipTaxLabel (default '').
- onChange: call the existing onUpdate / setAccounts pattern with `{ ...account, partnershipTaxLabel: e.target.value, _needsReview: undefined }` (the undefined clears the migration banner — see 02-RESEARCH.md "Pitfall 4").
- Render the partnership column ONLY for rows where account.type === 'Revenue' || account.type === 'Expense'. For Asset/Liability/Equity, render an empty cell with `—` placeholder text.
- Preserve all existing columns and their behaviour.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Migrate the 4 tax components to consume compute* functions</name>
  <read_first>
    - src/components/TaxReturnAssistant.tsx (current — particularly lines 29-58 for the inline rollup that gets DELETED)
    - src/components/CompanyTaxReturn.tsx (current — lines 29-60 inline rollup)
    - src/components/TrustTaxReturn.tsx (current — lines 29-60 inline rollup)
    - src/components/BasIasAssistant.tsx (current — lines 11-86 inline rollup)
    - src/lib/tax/types.ts and src/lib/tax/{individual,company,trust,bas}.ts (created in plan 02-1; imported by your migrated components)
    - src/lib/period.ts (currentFy import)
    - src/components/__tests__/smoke.test.tsx (the 12 component smoke tests — must stay green)
    - .planning/phases/02-decompose-and-tax-engine/02-RESEARCH.md § 3 "The component migration pattern"
  </read_first>
  <behavior>
    Each migrated component:
    - Imports its compute* function and currentFy from period
    - useMemo computes the typed return once per (entries, accounts) change
    - Render reads `taxReturn[label].value.toFixed(2)` (or pipes through a helper) — never `Number(taxReturn[label])` since LabelResult is an object, not a number
    - Existing render JSX (the per-label expanded row, edit-account UI, totals row) is preserved verbatim — only the data lookup changes from `taxData[label]` (number) to `taxReturn[label].value.toFixed(2)` (string) → `Number(...)` for `.toLocaleString` formatting
    - Smoke tests remain green (each component renders without crash with empty entries/accounts)
    - No file imports the deprecated TAX_LABELS / COMPANY_TAX_LABELS / TRUST_TAX_LABELS from src/constants.ts in the new code paths — switch to the typed labels from src/lib/tax/labels/fy2026.ts (INDIVIDUAL_LABELS, COMPANY_LABELS, TRUST_LABELS)
  </behavior>
  <action>
    Step A — TaxReturnAssistant.tsx:
    1. Replace import `import { TAX_LABELS } from '../constants';` with `import { INDIVIDUAL_LABELS } from '../lib/tax/labels/fy2026';`
    2. Add imports: `import { computeIndividual } from '../lib/tax/individual';` and `import { currentFy } from '../lib/period';`
    3. DELETE lines 29-58 (the inline `taxData` useMemo block).
    4. INSERT in its place:
       ```typescript
       const taxReturn = useMemo(() => {
         const fy = currentFy();
         return computeIndividual({ fy, entries, accounts, period: { type: 'fy', fy } });
       }, [entries, accounts]);
       ```
    5. In the render block (current line 80+), change the `Object.entries(TAX_LABELS).map(...)` iteration to `Object.entries(INDIVIDUAL_LABELS).map(([label, info]) => ...)`. Where the inline JSX reads `taxData[label]`, replace with `Number(taxReturn[label as keyof typeof taxReturn].value.toFixed(2))` so existing `.toLocaleString()` calls continue to work.
    6. Render the totals row using `taxReturn['7T'].value.toFixed(2)` instead of `taxData['7T']`.
    7. The `editingAccountId` and `onUpdateAccount` flow is unchanged.

    Step B — CompanyTaxReturn.tsx: Apply same pattern with `computeCompany` and `COMPANY_LABELS` from fy2026. The current component reads from `COMPANY_TAX_LABELS.INCOME` / `.EXPENSES` / `.RECONCILIATION` — refactor the `renderSection` calls to instead pass slices of COMPANY_LABELS:
    ```typescript
    const INCOME_KEYS = ['6A', '6F', '6T'] as const;
    const EXPENSE_KEYS = ['6C', '6G', '6X', '6S'] as const;
    const RECON_KEYS = ['7T'] as const;
    const incomeLabels = Object.fromEntries(INCOME_KEYS.map(k => [k, COMPANY_LABELS[k]]));
    const expenseLabels = Object.fromEntries(EXPENSE_KEYS.map(k => [k, COMPANY_LABELS[k]]));
    const reconLabels = Object.fromEntries(RECON_KEYS.map(k => [k, COMPANY_LABELS[k]]));
    ```
    Pass `incomeLabels`, `expenseLabels`, `reconLabels` to the existing renderSection helper. Replace `data[label]` lookups in renderSection with `Number(taxReturn[label as keyof typeof taxReturn].value.toFixed(2))`.

    Step C — TrustTaxReturn.tsx: Same pattern with `computeTrust` and `TRUST_LABELS`. INCOME_KEYS = ['5B','11J','5T']; EXPENSE_KEYS = ['5E','5F','5L','5M','5N','5S']; RECON_KEYS = ['26'].

    Step D — BasIasAssistant.tsx:
    1. Add imports: `import { computeBas } from '../lib/tax/bas';`, `import { BAS_LABELS } from '../lib/tax/labels/fy2026';`, `import { currentFy } from '../lib/period';`.
    2. DELETE lines 11-86 (the inline `basData` useMemo).
    3. INSERT:
       ```typescript
       const basReturn = useMemo(() => {
         const fy = currentFy();
         return computeBas({ fy, entries, accounts, period: { type: 'fy', fy } });
       }, [entries, accounts]);
       ```
    4. The existing `renderRow(label, description, value, isHighlight)` helper takes a `value: number`. Update its callers to pass `Number(basReturn[label].value.toFixed(2))` where `label` is one of 'G1', 'G2', 'G3', 'G10', 'G11', '1A', '1B', 'W1', 'W2'. The `netGst` line uses `Number(basReturn.netGst.value.toFixed(2))`. The `totalPayg` figure was previously computed inline as `Math.max(0, w2)` — that math is now inside computeBas; render `Number(basReturn.W2.value.toFixed(2))`.
    5. The `netPayment` figure (current line 88) becomes `Number(basReturn.netGst.value.toFixed(2)) + Number(basReturn.W2.value.toFixed(2))`.

    Step E — Run smoke + tax-engine tests:
    `npx vitest run src/components/__tests__/smoke.test.tsx src/lib/tax/__tests__/`
    All 12 smoke tests must remain green; tax engine shape tests stay green.

    Step F — Run the full Phase 2 suite to verify nothing else broke:
    `npx vitest run --reporter=verbose`
    All previously-green tests remain green. RED-by-design tests still red as inherited from 02-1.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/smoke.test.tsx src/lib/tax/__tests__/</automated>
  </verify>
  <acceptance_criteria>
    - TaxReturnAssistant.tsx imports computeIndividual from '../lib/tax/individual' AND INDIVIDUAL_LABELS from '../lib/tax/labels/fy2026'
    - TaxReturnAssistant.tsx no longer imports TAX_LABELS from '../constants' (grep confirms)
    - CompanyTaxReturn.tsx imports computeCompany; no longer imports COMPANY_TAX_LABELS
    - TrustTaxReturn.tsx imports computeTrust; no longer imports TRUST_TAX_LABELS
    - BasIasAssistant.tsx imports computeBas; no inline `basData` useMemo
    - All 4 components contain a useMemo of their compute* call with [entries, accounts] deps
    - All 4 components reference `.value.toFixed(2)` at the JSX boundary (Decimal serialization point)
    - 12 component smoke tests: GREEN
    - Tax engine shape tests: GREEN
    - npm run lint passes
  </acceptance_criteria>
  <done>
    The 4 tax components consume the typed compute* engine instead of inline rollup math. Visual output preserved (tested via smoke + observable-render assertions). Phase 5 will rewrite the engine internals with no further component changes.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ImportTB AI gating + AccountManager partnership column</name>
  <read_first>
    - src/components/ImportTB.tsx (full — particularly line 79 `new GoogleGenAI(...)` and the surrounding runAIMapping function lines 76+)
    - src/components/AccountManager.tsx (full — locate the column structure to extend)
    - src/components/__tests__/ImportTB.test.tsx (RED-by-design from plan 02-1 — your changes must turn this GREEN)
    - src/components/__tests__/AccountManager.test.tsx (RED-by-design from plan 02-1 — your changes must turn this GREEN)
    - src/lib/ai.ts (IS_AI_ENABLED constant)
    - src/lib/import/match.ts (fuzzyMatch + HIGH_CONFIDENCE_THRESHOLD)
    - src/types.ts (Account.partnershipTaxLabel and Account._needsReview)
    - .planning/phases/02-decompose-and-tax-engine/02-CONTEXT.md § "AI-optional UX (FND-04)" and § "Override mechanism (TAX-04)"
  </read_first>
  <behavior>
    ImportTB.tsx (assertions in src/components/__tests__/ImportTB.test.tsx):
    - When vi.mock('../../lib/ai', () => ({ IS_AI_ENABLED: false })): "Auto-match Accounts" button visible; "Enhance with AI" button NOT visible
    - When IS_AI_ENABLED: true: BOTH buttons visible
    - Clicking "Auto-match Accounts" calls fuzzyMatch once per imported row
    - All visual layout otherwise identical to current state

    AccountManager.tsx (assertions in src/components/__tests__/AccountManager.test.tsx):
    - Renders a column/heading "Partnership Label" (or matching aria-label) for the 16 accounts
    - For Revenue rows (e.g. Sales): the partnershipTaxLabel input is visible and editable
    - For Expense rows: the partnershipTaxLabel input is visible
    - For Asset/Liability/Equity rows: the partnership column shows '—' or empty cell (no input)
    - Editing the partnershipTaxLabel and triggering save calls onSave with the updated account having { ...orig, partnershipTaxLabel: 'P1', _needsReview: undefined }
  </behavior>
  <action>
    Step A — ImportTB.tsx changes:
    1. Add imports at top: `import { IS_AI_ENABLED } from '../lib/ai';` and `import { fuzzyMatch, HIGH_CONFIDENCE_THRESHOLD } from '../lib/import/match';`
    2. Add a new function `runDeterministicMapping` per the recipe in <interfaces>.
    3. Locate the existing `runAIMapping` function (currently the sole "Run mapping" trigger). At its first executable line, add `if (!IS_AI_ENABLED) return;` as defence-in-depth (the gate around the button is the primary defence; this catches programmatic invocation).
    4. In the JSX where the existing "Run mapping" / AI button is rendered, replace with the two-button block:
       ```tsx
       <div className="flex gap-2">
         <button onClick={runDeterministicMapping} disabled={isProcessing} className="bg-[var(--ink)] text-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
           {isProcessing ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
           Auto-match Accounts
         </button>
         {IS_AI_ENABLED && (
           <button onClick={runAIMapping} disabled={isProcessing} className="border border-[var(--line-strong)] bg-white px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-gray-50 transition-colors">
             <Sparkles size={16} className="text-amber-500" />
             Enhance with AI
           </button>
         )}
       </div>
       ```
    5. Preserve every other piece of ImportTB UI (column-mapping wizard, preview table, file upload).

    Step B — AccountManager.tsx changes:
    1. Locate the existing table column definitions. Find the `Trust Label` column (or its <th> equivalent).
    2. After the Trust Label header <th>, add a new <th> reading `<th>Partnership Label</th>` (match existing styling classes).
    3. In the row render (current map over `accounts`), for each row add a new <td>:
       ```tsx
       <td className="...same classes as the trust column...">
         {(account.type === 'Revenue' || account.type === 'Expense') ? (
           <input
             type="text"
             value={account.partnershipTaxLabel ?? ''}
             onChange={(e) => onUpdate({
               ...account,
               partnershipTaxLabel: e.target.value || undefined,
               _needsReview: undefined,
             })}
             aria-label={`Partnership label for ${account.name}`}
             className="...same input classes as the trust column..."
           />
         ) : (
           <span className="text-gray-300">—</span>
         )}
       </td>
       ```
    4. If AccountManager currently uses an internal `editedAccounts` state that flushes on Save (rather than per-row onUpdate), wire the partnership column through the same state machinery — DO NOT introduce a parallel save path. Read the existing handler and mirror its pattern.
    5. If a "Review needed" indicator is needed: per CONTEXT.md, a banner listing accounts where `_needsReview === true` appears in this view. Add a banner at the top of AccountManager:
       ```tsx
       {accounts.some(a => a._needsReview) && (
         <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
           <h4 className="font-bold text-amber-900">Review needed</h4>
           <p className="text-sm text-amber-800">The following accounts have incomplete tax-label mappings (added by schema migration):</p>
           <ul className="mt-2 text-sm text-amber-800 list-disc list-inside">
             {accounts.filter(a => a._needsReview).map(a => (<li key={a.id}>{a.code} – {a.name}</li>))}
           </ul>
         </div>
       )}
       ```

    Step C — Run the targeted tests:
    `npx vitest run src/components/__tests__/AccountManager.test.tsx src/components/__tests__/ImportTB.test.tsx src/components/__tests__/smoke.test.tsx`
    Both component tests must turn GREEN. All 12 smoke tests stay green.

    Step D — Run full suite:
    `npx vitest run --reporter=verbose`
    All previously-green tests still green. The only remaining RED-by-design tests are the App.tsx ≤ 250 lines + no-raw-new-Date structural assertions (handed to plan 02-4). Confirm count.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/AccountManager.test.tsx src/components/__tests__/ImportTB.test.tsx src/components/__tests__/smoke.test.tsx</automated>
  </verify>
  <acceptance_criteria>
    - src/components/ImportTB.tsx imports IS_AI_ENABLED from '../lib/ai' and fuzzyMatch from '../lib/import/match'
    - src/components/ImportTB.tsx has TWO action buttons in the mapping step: "Auto-match Accounts" (always) and "Enhance with AI" (gated by IS_AI_ENABLED)
    - src/components/ImportTB.tsx runAIMapping body has `if (!IS_AI_ENABLED) return;` as the first executable line
    - src/components/AccountManager.tsx renders a "Partnership Label" column for Revenue/Expense rows; renders '—' for Asset/Liability/Equity
    - Editing partnershipTaxLabel persists via onUpdate/onSave with `_needsReview: undefined` set
    - "Review needed" banner appears when any account has _needsReview === true
    - src/components/__tests__/ImportTB.test.tsx: GREEN (3 assertions)
    - src/components/__tests__/AccountManager.test.tsx: GREEN (3 assertions)
    - All 12 component smoke tests: GREEN
    - npm run lint passes
  </acceptance_criteria>
  <done>
    ImportTB works without GEMINI_API_KEY; AccountManager exposes partnershipTaxLabel for override; both Wave-0 component tests turn from RED to GREEN. Plan 02-4 owns the App.tsx demolition and migration registration.
  </done>
</task>

</tasks>

<verification>
- All 6 component tests touched (4 tax + ImportTB + AccountManager) pass at end of plan
- All 12 component smoke tests stay green
- `npm run lint` passes
- ONLY remaining RED tests inherited from plan 02-1: App.tsx ≤ 250 lines + no-raw-new-Date (handed to 02-4)
</verification>

<success_criteria>
1. **Zero inline rollup logic** in TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, BasIasAssistant — all consume their compute* function via useMemo
2. **All compute* calls pass an explicit fy + period** (no defaulting — matches 02-CONTEXT.md "FY parameter is explicit")
3. **ImportTB primary action is deterministic** (Auto-match Accounts via fuzzyMatch); AI is the optional enhancement
4. **AccountManager partnership column** renders for Revenue/Expense; editing clears `_needsReview`
5. **AccountManager "Review needed" banner** appears for any account flagged by migration
6. **All 12 component smoke tests stay green** at every commit boundary
7. **AccountManager + ImportTB Wave-0 tests turn GREEN** — handed-off RED-by-design count drops by 6
</success_criteria>

<output>
After completion, create `.planning/phases/02-decompose-and-tax-engine/02-3-SUMMARY.md` documenting:
- 6 component files modified with line-count deltas (each tax component should LOSE ~20-30 lines net)
- AI gating behaviour confirmed (manual verification note: with no .env.local, dev server shows no AI button)
- AccountManager screenshot description (partnership column visible, banner visible when migration flags accounts)
- Tests turned green: ImportTB.test.tsx (3 cases), AccountManager.test.tsx (3 cases)
- Confirmation that App.tsx is byte-identical to its pre-plan-02-3 state
</output>
