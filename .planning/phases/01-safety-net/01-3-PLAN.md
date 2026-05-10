---
phase: 01-safety-net
plan: 3
type: execute
wave: 1
depends_on: [1]
files_modified:
  - src/components/EntityForm.tsx
autonomous: true
requirements: [ENT-02]
must_haves:
  truths:
    - "EntityForm renders a label reading 'ABN' (not 'Registration Number (ABN/EIN)')"
    - "EntityForm contains zero occurrences of 'TFN', 'tfn', 'Tax File Number', or 'EIN' in its rendered text or source"
    - "Typing an invalid ABN (e.g. '11 111 111 111') into the ABN field produces an inline warning visible to the user; the form's submit button remains enabled and clicking it still calls onSave (warn-but-allow)"
    - "Typing a valid ABN (e.g. '51 824 753 556') does NOT produce a warning and submit succeeds"
    - "The Entity Type select offers exactly four AU options: Company, Trust, Individual, Partnership — no 'US Big Law Firm' option"
  artifacts:
    - path: src/components/EntityForm.tsx
      provides: "Entity form with ABN modulus-89 inline warning and AU-only entity type select"
      contains: "validateAbn"
  key_links:
    - from: src/components/EntityForm.tsx
      to: src/lib/validation.ts
      via: "imports `validateAbn` from `../lib/validation` and calls it in handleChange when registrationNumber digits.length === 11"
      pattern: "validateAbn\\("
---

<objective>
Wire ABN modulus-89 validation into EntityForm.tsx using the `validateAbn` function created in Wave 0. The validation is **warn-but-allow** per CONTEXT.md "Warn but allow save on invalid ABN — display an inline warning at the field, but do not block submit." Rename the existing freeform "Registration Number (ABN/EIN)" field to "ABN", remove "EIN" from placeholder, and replace the "US Big Law Firm" entity-type option with "Partnership". Touches ONLY `src/components/EntityForm.tsx` — runs in parallel with Plan 01-2 (App.tsx cleanup).

Purpose: Satisfies ENT-02 (ABN modulus-89 validation, format-check, warn-but-allow) and forces TFN absence at the form layer. Per CONTEXT.md "TFN: do not store. Remove the TFN field from the data model and the entity form entirely."

Output: EntityForm with ABN inline warning, AU-only entity-type select, no TFN/EIN references; turns Wave 0's `EntityForm.test.tsx` tests GREEN.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/01-safety-net/01-CONTEXT.md
@.planning/phases/01-safety-net/01-RESEARCH.md
@.planning/phases/01-safety-net/01-VALIDATION.md
@.planning/phases/01-safety-net/01-1-PLAN.md
@src/components/EntityForm.tsx
@src/types.ts

<interfaces>
<!-- Wave 0 created this; this plan imports from it. -->

From src/lib/validation.ts (Wave 0):
```typescript
export interface AbnValidationResult { valid: boolean; reason?: string }
export function validateAbn(input: string): AbnValidationResult;
```

From src/types.ts (Wave 0 added optional _v?: number):
```typescript
export interface Entity {
  _v?: number;
  id: string;
  name: string;
  type: string;            // freeform — Phase 4 ENT-01 will lock this to AU 4
  registrationNumber?: string;
  // ...
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Wire ABN validation, rename field, AU-only entity types, no TFN</name>
  <read_first>
    - src/components/EntityForm.tsx (current state — current label "Registration Number (ABN/EIN)" and four type options including "US Big Law Firm")
    - src/lib/validation.ts (Wave 0 — validateAbn API)
    - .planning/phases/01-safety-net/01-CONTEXT.md (sections "ABN / TFN" and "Cleanup boundary")
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 4: ABN Modulus-89 Validation > Integration into EntityForm.tsx" and "Pitfall 8: 'US Big Law Firm' Entity Type Left in EntityForm Select")
    - src/components/__tests__/EntityForm.test.tsx (Wave 0 — defines acceptance: `ABN warning` and `no TFN field` tests)
    - .planning/phases/01-safety-net/01-VALIDATION.md (ENT-02 rows)
  </read_first>
  <files>src/components/EntityForm.tsx</files>
  <behavior>
    - The registration-number `<label>` text is exactly `ABN` (not `Registration Number (ABN/EIN)`)
    - The registration-number `<input>` `placeholder` is `e.g. 51 824 753 556` (or similar real-format example) — does NOT contain `EIN`
    - The registration-number `<input>` has `aria-label="ABN"` so React Testing Library's `getByLabelText(/abn/i)` finds it
    - The Entity Type `<select>` contains exactly four `<option>` elements with values: `Company`, `Trust`, `Individual`, `Partnership`. The `US Big Law Firm` option is removed.
    - When the user types into the ABN field and the digit count reaches 11, the form calls `validateAbn(value)`. If `valid: false`, an inline warning is rendered next to the field with text containing the word `checksum` or `invalid`. The warning uses an `AlertTriangle` icon from lucide-react.
    - The warning state is stored in a NEW `warnings: Record<string, string>` state hook (separate from `errors` — warnings do NOT block submit).
    - The existing blocking-error path (`registrationNumber && data.registrationNumber.trim().length < 5`) is replaced or removed: registration is now optional and the only feedback is the warning. Submit succeeds even if ABN is invalid.
    - The component source contains zero occurrences of `TFN`, `tfn`, `Tax File Number`, `EIN`, `US Big Law Firm`
  </behavior>
  <action>
**Step 1 — Replace the entity-type `<select>` options.** Find (currently EntityForm.tsx:157-161):

```tsx
<option value="Company">Company</option>
<option value="Trust">Trust</option>
<option value="Individual">Individual</option>
<option value="US Big Law Firm">US Big Law Firm</option>
```

Replace with:

```tsx
<option value="Company">Company</option>
<option value="Trust">Trust</option>
<option value="Individual">Individual</option>
<option value="Partnership">Partnership</option>
```

**Step 2 — Add `validateAbn` import** at the top of the file, after the existing imports:

```typescript
import { validateAbn } from '../lib/validation';
import { AlertTriangle } from 'lucide-react';
```

(`AlertTriangle` is added to the existing lucide-react import group, not as a separate import statement. Combine: `import { Save, X, Building2, UserCheck, AlertTriangle } from 'lucide-react';`)

**Step 3 — Add a `warnings` state hook** alongside the existing `errors` and `touched` hooks:

```typescript
const [warnings, setWarnings] = useState<Record<string, string>>({});
```

**Step 4 — Update `validate()`** — REMOVE the registration-number length check entirely. The current block:

```typescript
if (data.registrationNumber && data.registrationNumber.trim().length < 5) {
  newErrors.registrationNumber = 'Registration format invalid';
}
```

Delete it. Registration is now optional and warning-only — never a blocking error.

**Step 5 — Update `handleChange()`** — REPLACE the existing `if (field === 'registrationNumber') {…}` block with one that runs `validateAbn` once the user has typed 11 digits:

```typescript
if (field === 'registrationNumber') {
  const newWarnings = { ...warnings };
  delete newErrors.registrationNumber; // never block on registrationNumber
  if (value && value.trim().length > 0) {
    const digits = value.replace(/[^0-9]/g, '');
    if (digits.length === 11) {
      const result = validateAbn(value);
      if (!result.valid) {
        newWarnings.registrationNumber = result.reason ?? 'ABN checksum invalid — please check the number';
      } else {
        delete newWarnings.registrationNumber;
      }
    } else {
      // Not yet 11 digits — clear any prior warning silently while user types
      delete newWarnings.registrationNumber;
    }
  } else {
    delete newWarnings.registrationNumber;
  }
  setWarnings(newWarnings);
}
```

**Step 6 — Update the registration-number field label and placeholder.** Find (currently EntityForm.tsx:178-191):

```tsx
<div className="space-y-2">
  <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
    Registration Number (ABN/EIN)
    {touched.registrationNumber && errors.registrationNumber && <span className="text-red-500 lowercase font-medium">{errors.registrationNumber}</span>}
  </label>
  <input
    type="text"
    placeholder="e.g. ABN 12 345 678 901"
    value={formData.registrationNumber || ''}
    onChange={(e) => handleChange('registrationNumber', e.target.value)}
    className={cn(
      "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors",
      touched.registrationNumber && errors.registrationNumber ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
    )}
  />
</div>
```

Replace with:

```tsx
<div className="space-y-2">
  <label htmlFor="entity-abn" className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
    <span>ABN</span>
    {warnings.registrationNumber && (
      <span className="text-amber-600 lowercase font-medium flex items-center gap-1">
        <AlertTriangle size={12} aria-hidden="true" />
        {warnings.registrationNumber}
      </span>
    )}
  </label>
  <input
    id="entity-abn"
    type="text"
    aria-label="ABN"
    placeholder="e.g. 51 824 753 556"
    value={formData.registrationNumber || ''}
    onChange={(e) => handleChange('registrationNumber', e.target.value)}
    className={cn(
      "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors",
      warnings.registrationNumber ? "border-amber-400 bg-amber-50" : "focus:border-[var(--ink)]"
    )}
  />
</div>
```

Notes:
- The label text is now exactly `ABN`.
- The placeholder is `e.g. 51 824 753 556` (the official ATO test vector — clearly an example, format-correct, valid checksum).
- The field is a WARNING zone (amber colours via Tailwind) not an error zone (red). Submit is unaffected.
- `aria-label="ABN"` ensures `screen.getByLabelText(/abn/i)` works in tests.
- `htmlFor="entity-abn"` + `id="entity-abn"` pairs the label with the input for accessibility.

**Step 7 — Confirm no TFN references.** Open the modified `EntityForm.tsx` and grep its content for `TFN`, `tfn`, `Tax File Number`, `EIN`. Confirm zero occurrences (per RESEARCH.md "Risk 2: TFN References — Zero Found", the codebase already has none — this step verifies the rename did not reintroduce any).

**Step 8 — Run `npm run lint`** to confirm no type errors. The `warnings` state has the same shape as `errors` and is wired identically to the existing pattern.
  </action>
  <verify>
    <automated>npm run lint && npx vitest run src/components/__tests__/EntityForm.test.tsx --reporter=verbose && node -e "const s=require('fs').readFileSync('src/components/EntityForm.tsx','utf-8'); ['TFN','tfn','Tax File Number','US Big Law Firm','EIN'].forEach(p=>{if(s.includes(p)){console.error('FOUND:',p);process.exit(1)}}); if(!s.includes('validateAbn')){console.error('MISSING validateAbn import');process.exit(2)}"</automated>
  </verify>
  <acceptance_criteria>
    - `npm run lint` exits 0
    - `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "ABN warning"` passes
    - `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "no TFN field"` passes
    - `src/components/EntityForm.tsx` source contains `import { validateAbn } from '../lib/validation';`
    - `src/components/EntityForm.tsx` source contains zero occurrences of: `TFN`, `tfn`, `Tax File Number`, `US Big Law Firm`, `EIN`
    - The four `<option value="…">` lines for entity type are: `Company`, `Trust`, `Individual`, `Partnership`
    - The smoke test `EntityForm renders (create mode)` in `src/components/__tests__/smoke.test.tsx` continues to pass
    - Maps to VALIDATION.md ENT-02 rows 1-4
  </acceptance_criteria>
  <done>EntityForm wired to validateAbn (warn-but-allow); AU-only entity types; no TFN/EIN; ENT-02 tests green.</done>
</task>

</tasks>

<verification>
After all tasks complete, run:

1. `npm run lint` — exits 0
2. `npm run build` — exits 0
3. `npx vitest run src/components/__tests__/EntityForm.test.tsx --reporter=verbose` — both `ABN warning` and `no TFN field` tests pass
4. `npx vitest run src/components/__tests__/smoke.test.tsx -t "EntityForm renders"` — passes
5. `npx vitest run --reporter=verbose` — full suite is green (assuming Plans 01-1 and 01-2 are also complete)

Manual sanity check (optional):
- Run `npm run dev`, open the Entity Edit view, type `11 111 111 111` into the ABN field — confirm the amber warning text and icon appear; confirm the Save button remains clickable; click Save and confirm the entity saves
- Type `51 824 753 556` into the ABN field — confirm no warning appears
</verification>

<success_criteria>
- ENT-02 satisfied at the form layer: ABN validates with modulus-89 + format check, warns but does not block, no TFN field exists.
- Plan 01-3's two tests in `EntityForm.test.tsx` are green.
- The Entity Type select contains the four AU options only.
- No collision with Plan 01-2 (this plan touches a different file).
</success_criteria>

<output>
After completion, create `.planning/phases/01-safety-net/01-3-SUMMARY.md` documenting:
- The exact final state of the Entity Type select options
- The ABN warning UX pattern (warn-but-allow, amber colours, AlertTriangle icon)
- Confirmation that zero TFN/EIN references exist in EntityForm.tsx
- Any unexpected interactions with the existing `validate()` / `handleChange()` patterns
</output>
