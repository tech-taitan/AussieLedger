---
phase: 06-personas-wizard-and-deployment
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - src/types.ts
  - src/lib/schemas.ts
  - src/lib/migrations/index.ts
  - src/lib/migrations/v4-to-v5.ts
  - src/lib/migrations/__tests__/v4-to-v5.test.ts
  - src/lib/migrations/__tests__/round-trip.test.ts
  - src/lib/persona.ts
  - src/lib/__tests__/persona.test.ts
  - src/hooks/useAnomalyCounts.ts
  - src/hooks/__tests__/useAnomalyCounts.test.ts
  - src/lib/tax/labels/fy2026.ts
  - src/lib/tax/__tests__/label-help-text.test.ts
  - src/components/LabelTooltip.tsx
  - src/components/__tests__/LabelTooltip.test.tsx
  - src/components/PersonaModeModal.tsx
  - src/components/__tests__/PersonaModeModal.test.tsx
  - src/components/AiGateNote.tsx
  - src/components/__tests__/AiGateNote.test.tsx
  - src/components/YearEndWizard.tsx
  - src/components/__tests__/YearEndWizard.test.tsx
  - src/components/__tests__/Sidebar.test.tsx
  - src/styles/print.css
  - LICENSE
  - CONTRIBUTING.md
  - README.md
  - src/__tests__/readme.test.ts
  - src/__tests__/license.test.ts
  - src/__tests__/contributing.test.ts
  - src/__tests__/spdx-headers.test.ts
autonomous: true
requirements: [UX-01, UX-02, UX-03, UX-05, DEP-01, DEP-03, DEP-04]

must_haves:
  truths:
    - "v4→v5 migration upgrades existing entities additively; round-trip preserves data"
    - "useSettings round-trips Settings via localStorage under key 'aussieledger:settings'"
    - "useAnomalyCounts returns deterministic counts for unbalanced journals and unmapped accounts"
    - "Every label in INDIVIDUAL/COMPANY/TRUST/PARTNERSHIP/BAS/IAS catalogues has a non-empty helpText"
    - "No helpText string contains the words 'deductible' or 'write off' (case-insensitive)"
    - "LabelTooltip renders a 'no-print' button on screen and a '.print-only' inline subtitle"
    - "LICENSE file at repo root contains 'Apache License' and 'Version 2.0'"
    - "CONTRIBUTING.md contains the words 'schema', 'migration', 'round-trip', 'additive'"
    - "package.json declares \"license\": \"Apache-2.0\""
    - "README.md contains 'npm install && npm run build' and sections for both deployment shapes"
    - "Every .ts/.tsx under src/ has SPDX-License-Identifier: Apache-2.0 header"
  artifacts:
    - path: "src/lib/migrations/v4-to-v5.ts"
      provides: "Additive v4→v5 migration export migrateV4ToV5"
      contains: "export function migrateV4ToV5"
    - path: "src/lib/persona.ts"
      provides: "Settings type, useSettings hook, finaliseEntity / advanceStep / unfinaliseEntity pure functions"
      exports: ["Settings", "WizardStateFy", "getSettings", "saveSettings", "useSettings", "finaliseEntity", "unfinaliseEntity", "advanceStep"]
    - path: "src/hooks/useAnomalyCounts.ts"
      provides: "useAnomalyCounts(accounts, entries, activeEntityId) → { journals, accounts }"
      exports: ["useAnomalyCounts", "AnomalyCounts"]
    - path: "src/components/LabelTooltip.tsx"
      provides: "Radix tooltip wrapper for ATO label help"
      exports: ["LabelTooltip"]
    - path: "src/components/PersonaModeModal.tsx"
      provides: "First-run modal scaffold"
      exports: ["PersonaModeModal"]
    - path: "src/components/AiGateNote.tsx"
      provides: "Visible inline note when isAiEnabled()=false"
      exports: ["AiGateNote"]
    - path: "src/components/YearEndWizard.tsx"
      provides: "Wizard scaffold + step-machine pure helpers (real implementation lands in 06-2)"
      exports: ["YearEndWizard"]
    - path: "LICENSE"
      provides: "Apache 2.0 full license text"
      contains: "Apache License"
    - path: "CONTRIBUTING.md"
      provides: "Schema-migration rule + dev/test guide + PR template instructions"
      contains: "Schema Migrations"
    - path: "README.md"
      provides: "Audience-first rewrite + quick-start + two deployment shapes"
      contains: "npm install && npm run build"
  key_links:
    - from: "src/lib/migrations/index.ts"
      to: "src/lib/migrations/v4-to-v5.ts"
      via: "MIGRATIONS registry entry 4 → migrateV4ToV5"
      pattern: "4:\\s*migrateV4ToV5"
    - from: "src/lib/migrations/index.ts"
      to: "CURRENT_VERSION = 5"
      via: "constant bump"
      pattern: "CURRENT_VERSION\\s*=\\s*5"
    - from: "src/components/LabelTooltip.tsx"
      to: "@radix-ui/react-tooltip"
      via: "import * as Tooltip"
      pattern: "from\\s+['\"]@radix-ui/react-tooltip['\"]"
    - from: "src/lib/persona.ts"
      to: "localStorage 'aussieledger:settings'"
      via: "getItem/setItem"
      pattern: "aussieledger:settings"
---

<objective>
Wave 1 foundations for Phase 6. Lands every primitive, type, migration, helper, scaffold, test scaffold, and release artefact that Plans 06-2 and 06-3 will consume in parallel. Zero behavioural changes to existing flows — every widening is additive.

Purpose: Front-load all schema, hook, component, lint-test, and release scaffolding so the two Wave 2 plans can run completely independently with zero cross-talk. Also closes DEP-03/DEP-04 (LICENSE + CONTRIBUTING + README + SPDX lint) which need no downstream wiring.

Output: v4→v5 additive migration; Settings/persona module + useSettings hook; useAnomalyCounts hook; LabelTooltip + PersonaModeModal + AiGateNote + YearEndWizard scaffolds; helpText widening on all 6 label catalogues; print.css additive rule; LICENSE; CONTRIBUTING.md; README rewrite; @radix-ui/react-tooltip dep installed; 12 new test files; package.json license field.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md
@.planning/phases/06-personas-wizard-and-deployment/06-RESEARCH.md
@.planning/phases/06-personas-wizard-and-deployment/06-VALIDATION.md
@src/types.ts
@src/lib/migrations/index.ts
@src/lib/migrations/v3-to-v4.ts
@src/lib/tax/labels/fy2026.ts
@src/styles/print.css
@src/components/AnomalyBadge.tsx
@package.json

<interfaces>
<!-- Key contracts the executor needs. Embedded so no codebase scan is required. -->

From src/types.ts (existing — DO NOT REMOVE):
```typescript
export interface Entity {
  // ...all existing fields preserved (id, name, type, ..., lockedFys?, beneficiaries?, partners?,
  //    aggregatedTurnover?, paygInstalmentAmount?)
}
```

NEW Entity fields to add (additive only, both optional, both undefined-default):
```typescript
/** _v:5 — Per-FY return lifecycle. 'draft' = working paper; 'finalised' = locked. */
returnStatusByFy?: Record<string, 'draft' | 'finalised'>;
/** _v:5 — Per-FY wizard resume state. */
wizardState?: Record<string, WizardStateFy>;
```

NEW interface (export from src/types.ts):
```typescript
export interface WizardStateFy {
  step: number;                  // 1-7
  dismissedAnomalies: string[];
  completedAt?: string;          // ISO timestamp when finalised
}
```

From src/lib/migrations/index.ts (existing):
```typescript
export const CURRENT_VERSION = 4;  // BUMP TO 5 in this plan
const MIGRATIONS: Record<number, MigrationFn> = { 0: ..., 1: ..., 2: ..., 3: migrateV3ToV4 };
// ADD: 4: migrateV4ToV5
```

From src/lib/tax/labels/fy2026.ts (existing 6 catalogues to widen with helpText):
```typescript
export const INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, { title; description; natReference; plainEnglish; }> = {...}
export const COMPANY_LABELS_FULL: Record<CompanyLabel, ...> = {...}
export const TRUST_LABELS_FULL: Record<TrustLabel, ...> = {...}
export const PARTNERSHIP_LABELS_FULL: Record<PartnershipLabel, ...> = {...}
export const BAS_LABELS_FULL: Record<BasLabel, ...> = {...}
// IAS catalogue: declare IAS_LABELS_FULL: Record<IasLabel, {...}> (NEW — was only IasLabel type previously)
```

From src/components/AnomalyBadge.tsx (existing — reuse without modification):
```typescript
interface AnomalyBadgeProps { severity: 'warn'|'info'; message: string; label?: string; }
```

From src/lib/ai.ts (existing):
```typescript
export function isAiEnabled(): boolean;       // current; use this only
export const IS_AI_ENABLED: boolean;          // @deprecated — do NOT use in new code
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install Radix tooltip, widen schemas, v4→v5 migration, persona module, useAnomalyCounts hook, all Wave 0 test scaffolds (TDD)</name>
  <files>
    package.json,
    src/types.ts,
    src/lib/schemas.ts,
    src/lib/migrations/index.ts,
    src/lib/migrations/v4-to-v5.ts,
    src/lib/migrations/__tests__/v4-to-v5.test.ts,
    src/lib/migrations/__tests__/round-trip.test.ts,
    src/lib/persona.ts,
    src/lib/__tests__/persona.test.ts,
    src/hooks/useAnomalyCounts.ts,
    src/hooks/__tests__/useAnomalyCounts.test.ts
  </files>

  <read_first>
    - src/types.ts (entire file — must preserve every existing field; understand Entity, Account, JournalEntry, JournalLine, BeneficiaryRow, PartnerRow, AuditAction shapes)
    - src/lib/migrations/index.ts (existing CURRENT_VERSION = 4 + MIGRATIONS registry pattern)
    - src/lib/migrations/v3-to-v4.ts (canonical additive-migration template to mirror)
    - src/lib/migrations/__tests__/v3-to-v4.test.ts (existing migration test layout — copy pattern)
    - src/lib/migrations/__tests__/round-trip.test.ts (existing round-trip — extend, don't replace)
    - src/lib/schemas.ts (existing Zod shapes to widen)
    - src/lib/ai.ts (use isAiEnabled() function only — IS_AI_ENABLED is @deprecated)
    - src/hooks/useJournals.ts (entry.status / entry.isPosted semantics — anomaly count source-of-truth for posted entries)
    - package.json (current dep list — confirm @radix-ui/react-tooltip not yet present; preserve existing scripts)
  </read_first>

  <behavior>
    Tests must be written FIRST and committed RED before implementation.

    1. **v4-to-v5.test.ts** (TDD RED → GREEN):
       - Test 1.1: `migrateV4ToV5({ _v: 4, entities: [{ id: 'e1', name: 'Acme', type: 'Company' }] })` returns `{ _v: 5, entities: [...{ returnStatusByFy: undefined, wizardState: undefined }] }`.
       - Test 1.2: `migrateV4ToV5({ _v: 5, entities: [...] })` returns the input unchanged (idempotent — early return).
       - Test 1.3: All Phase-4 + Phase-5 existing fields preserved verbatim on each entity (`lockedFys`, `aggregatedTurnover`, `paygInstalmentAmount`, `beneficiaries`, `partners`, `gstRegistered`, `accountingMethod`, `fyEndDate`).
       - Test 1.4: `migrateV4ToV5({ _v: 4, entities: undefined })` returns `{ _v: 5, entities: [] }`.

    2. **round-trip.test.ts** (extend existing — add Phase 6 case):
       - Test 2.1: Hand-build `_v: 0` blob with one entity + one account + one journal + one audit log → call `migrate(blob)` → assert `result._v === 5` AND result.entities[0].returnStatusByFy is undefined AND result.entities[0].wizardState is undefined.
       - Test 2.2: `migrate({ _v: 6, ... })` throws "newer than" error (refuse downgrade — already tested but assert against CURRENT_VERSION = 5).

    3. **persona.test.ts** (TDD RED → GREEN — covers UX-05, PERS-03):
       - Test 3.1: `getSettings()` returns `null` when localStorage is empty.
       - Test 3.2: `saveSettings({ mode: 'owner', primaryEntityId: 'e1' })` then `getSettings()` returns the same object.
       - Test 3.3: `saveSettings({ mode: 'agent' })` then `getSettings()?.mode === 'agent'` and `primaryEntityId === undefined`.
       - Test 3.4: localStorage key MUST be the literal string `'aussieledger:settings'` — assert via `localStorage.getItem('aussieledger:settings')` returns non-null after saveSettings.
       - Test 3.5: `finaliseEntity(entity, 'FY2026')` returns new Entity with `returnStatusByFy['FY2026'] === 'finalised'` AND `lockedFys` includes `'FY2026'` AND `wizardState['FY2026'].completedAt` is a non-empty ISO string AND `wizardState['FY2026'].step === 7`.
       - Test 3.6: `finaliseEntity(entity, 'FY2026')` does NOT mutate original entity (immutable).
       - Test 3.7: `unfinaliseEntity(finalisedEntity, 'FY2026')` returns entity with `returnStatusByFy['FY2026'] === 'draft'` AND `lockedFys` does NOT include `'FY2026'`.
       - Test 3.8: `advanceStep(entity, 'FY2026', 3)` returns entity with `wizardState['FY2026'].step === 3` and preserves `dismissedAnomalies`.
       - Test 3.9: `advanceStep` creates initial `dismissedAnomalies: []` when wizardState[fy] is absent.
       - Test 3.10: PERS-03 — `finaliseEntity` then `advanceStep` then `unfinaliseEntity` chain does not mutate any field on the input arrays other than `returnStatusByFy`, `wizardState`, `lockedFys`.

    4. **useAnomalyCounts.test.ts** (TDD RED → GREEN — covers UX-02):
       - Test 4.1: Empty inputs → `{ journals: 0, accounts: 0 }`.
       - Test 4.2: One posted entry with debit=$100 + credit=$50 (unbalanced > 0.005) → `journals === 1`.
       - Test 4.3: One posted entry with debit=$100.005 + credit=$100 (within 0.005 tolerance) → `journals === 0`.
       - Test 4.4: Draft entry unbalanced → `journals === 0` (only posted entries count).
       - Test 4.5: One account with `taxLabel: undefined` referenced by a posted entry → `accounts === 1`.
       - Test 4.6: Same unmapped account NOT referenced in any posted entry → `accounts === 0`.
       - Test 4.7: Account with `taxLabel: ''` (empty string) referenced in posted entry → `accounts === 1`.
       - Test 4.8: When `activeEntityId` provided, count only that entity's entries (others ignored).
       - Test 4.9: When `activeEntityId === null`, count across all entities.

    All test files: include the SPDX header block.
  </behavior>

  <action>
    Step 1 — Install dependency. Run `npm install @radix-ui/react-tooltip@^1.2.8` (do NOT use --legacy-peer-deps; package declares React 19 in peerDependencies). Verify package.json dependencies now contains `"@radix-ui/react-tooltip": "^1.2.8"`.

    Step 2 — Add `"license": "Apache-2.0"` field to package.json (alongside `"name"` / `"version"` / `"private"`).

    Step 3 — Widen src/types.ts. Add two optional fields to Entity (immediately after `paygInstalmentAmount?: string;`):
    ```typescript
    // _v:5 additions (Phase 6)
    /** Per-FY return lifecycle. 'draft' = working paper; 'finalised' = locked. */
    returnStatusByFy?: Record<string, 'draft' | 'finalised'>;
    /** Per-FY wizard resume state. */
    wizardState?: Record<string, WizardStateFy>;
    ```
    Append at the bottom of types.ts:
    ```typescript
    export interface WizardStateFy {
      _v?: number;
      step: number;
      dismissedAnomalies: string[];
      completedAt?: string;
    }
    ```

    Step 4 — Widen src/lib/schemas.ts. Find the existing Entity Zod schema and add:
    ```typescript
    returnStatusByFy: z.record(z.string(), z.enum(['draft', 'finalised'])).optional(),
    wizardState: z.record(z.string(), z.object({
      step: z.number(),
      dismissedAnomalies: z.array(z.string()),
      completedAt: z.string().optional(),
    })).optional(),
    ```

    Step 5 — Create src/lib/migrations/v4-to-v5.ts (template — mirror exactly the v3-to-v4.ts shape):
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Migration v4 → v5 (additive only — Phase 6).
     *
     * Adds two optional Entity fields:
     *   - returnStatusByFy?: Record<string, 'draft' | 'finalised'>
     *   - wizardState?: Record<string, WizardStateFy>
     *
     * Both default to undefined. Non-destructive: every existing field preserved.
     */
    import type { Entity } from '../../types.js';
    import type { PersistedRoot } from './index.js';

    export function migrateV4ToV5(state: PersistedRoot): PersistedRoot {
      if (state._v >= 5) return state;
      const entities = ((state.entities as Entity[] | undefined) ?? []).map((e): Entity => ({
        ...e,
        returnStatusByFy: (e as Entity & { returnStatusByFy?: Record<string, 'draft' | 'finalised'> }).returnStatusByFy,
        wizardState: (e as Entity & { wizardState?: Record<string, import('../../types.js').WizardStateFy> }).wizardState,
      }));
      return { ...state, _v: 5, entities };
    }
    ```

    Step 6 — Update src/lib/migrations/index.ts. Import migrateV4ToV5; bump `CURRENT_VERSION = 5`; add `4: migrateV4ToV5` to MIGRATIONS registry; add JSDoc line "// 4 → 5: additive Phase 6 widening (Entity.returnStatusByFy + wizardState)."

    Step 7 — Create src/lib/persona.ts with the SPDX header. Implement:
    - `export const SETTINGS_KEY = 'aussieledger:settings';`
    - `export interface Settings { mode: 'owner' | 'agent'; primaryEntityId?: string; }`
    - `export type { WizardStateFy } from '../types.js';`
    - `export function getSettings(): Settings | null` — try/catch JSON.parse; return null on miss/parse error.
    - `export function saveSettings(s: Settings): void` — localStorage.setItem.
    - `export function clearSettings(): void` — localStorage.removeItem (for tests + Settings page "reset").
    - `export function useSettings(): { settings: Settings | null; setSettings: (s: Settings) => void; clearSettings: () => void }` — useState + useCallback per RESEARCH Pattern 1.
    - `export function finaliseEntity(entity: Entity, fy: string): Entity` per RESEARCH "Finalise Write Pattern" (use `today().toISOString()` from `../lib/period.js` — NEVER `new Date()` — Phase 2 structural lint enforces this).
    - `export function unfinaliseEntity(entity: Entity, fy: string): Entity` — sets `returnStatusByFy[fy] = 'draft'`, removes `fy` from `lockedFys` array, does NOT clear `wizardState[fy].completedAt`.
    - `export function advanceStep(entity: Entity, fy: string, nextStep: number): Entity` per RESEARCH "Wizard Step Persistence" pattern; creates `{ step: nextStep, dismissedAnomalies: [] }` when wizardState[fy] absent; preserves existing dismissedAnomalies otherwise.
    - `export function getPrimaryEntityId(entities: Entity[], settings: Settings | null): string | null` — returns settings.primaryEntityId if set + present in entities; else returns entities[0]?.id when entities.length === 1; else null.

    Step 8 — Create src/hooks/useAnomalyCounts.ts with SPDX header, implementing RESEARCH Pattern 5 verbatim. Export `AnomalyCounts` interface and `useAnomalyCounts` hook. Must use `useMemo([accounts, entries, activeEntityId])` per Pitfall 4. Posted detection: `e.status === 'posted' || (e.status === undefined && e.isPosted)`. Tolerance: `Math.abs(debit - credit) > 0.005`. Account count: account is referenced in posted entry AND (account.taxLabel is undefined OR empty string).

    Step 9 — Write all four test files with the test cases in <behavior>. Use existing test patterns (look at src/lib/migrations/__tests__/v3-to-v4.test.ts and src/hooks/__tests__/useJournals.test.ts as templates). Each test file gets the SPDX header.

    Step 10 — Run `npx vitest run src/lib/migrations src/lib/__tests__/persona.test.ts src/hooks/__tests__/useAnomalyCounts.test.ts` — expect first run RED (no implementation), commit RED, then implement, run again GREEN.

    Step 11 — Run `npx vitest run` to confirm the migration version bump did not break any existing test (existing round-trip test asserting CURRENT_VERSION = 4 must be updated to 5).
  </action>

  <verify>
    <automated>npx vitest run src/lib/migrations src/lib/__tests__/persona.test.ts src/hooks/__tests__/useAnomalyCounts.test.ts --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `npm ls @radix-ui/react-tooltip` exits 0 and reports `@radix-ui/react-tooltip@1.2.x`
    - `grep -n '"license"' package.json` returns a line containing `"Apache-2.0"`
    - `grep -n 'returnStatusByFy' src/types.ts` returns at least 1 match
    - `grep -n 'WizardStateFy' src/types.ts` returns at least 2 matches (interface decl + Entity field)
    - `grep -nE 'CURRENT_VERSION\s*=\s*5' src/lib/migrations/index.ts` returns a match
    - `grep -nE '^\s*4:\s*migrateV4ToV5' src/lib/migrations/index.ts` returns a match
    - `grep -n 'aussieledger:settings' src/lib/persona.ts` returns a match
    - `grep -n 'useMemo' src/hooks/useAnomalyCounts.ts` returns a match
    - All four test files exist: v4-to-v5.test.ts, persona.test.ts, useAnomalyCounts.test.ts; round-trip.test.ts extended
    - The vitest command above exits 0 with ≥ 18 new GREEN tests (4 migration + 10 persona + 9 useAnomalyCounts at minimum)
    - `grep -rE 'new Date\(\)' src/lib/persona.ts` returns ZERO matches (Phase 2 structural rule)
  </acceptance_criteria>

  <done>v4→v5 migration registered + GREEN; Settings/persona module + useSettings/finaliseEntity/unfinaliseEntity/advanceStep GREEN; useAnomalyCounts GREEN; Radix tooltip installed; package.json license set.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: helpText widening on all 6 label catalogues + LabelTooltip + print.css extension + label-help-text lint test + UI scaffolds (TDD)</name>
  <files>
    src/lib/tax/labels/fy2026.ts,
    src/lib/tax/__tests__/label-help-text.test.ts,
    src/components/LabelTooltip.tsx,
    src/components/__tests__/LabelTooltip.test.tsx,
    src/components/PersonaModeModal.tsx,
    src/components/__tests__/PersonaModeModal.test.tsx,
    src/components/AiGateNote.tsx,
    src/components/__tests__/AiGateNote.test.tsx,
    src/components/YearEndWizard.tsx,
    src/components/__tests__/YearEndWizard.test.tsx,
    src/components/__tests__/Sidebar.test.tsx,
    src/styles/print.css
  </files>

  <read_first>
    - src/lib/tax/labels/fy2026.ts (entire 422-line file — note all 6 catalogues: INDIVIDUAL_LABELS_FULL, COMPANY_LABELS_FULL, TRUST_LABELS_FULL, PARTNERSHIP_LABELS_FULL, BAS_LABELS_FULL — NB: IAS catalogue currently only has `IasLabel` TYPE, no `IAS_LABELS_FULL` constant)
    - src/styles/print.css (current 70-line file — preserve every existing rule; only ADD a new @media print block for `.label-help-text`)
    - src/components/AnomalyBadge.tsx (existing pattern — Phase 5 component to mirror for SPDX/Tailwind style)
    - src/components/__tests__/AnomalyBadge.test.tsx (existing test pattern — React Testing Library + Vitest)
    - src/components/__tests__/PrintBanner.test.tsx (existing print-only DOM test pattern)
    - src/lib/ai.ts (isAiEnabled() — do NOT call IS_AI_ENABLED in new code)
    - .planning/phases/06-personas-wizard-and-deployment/06-RESEARCH.md (Pattern 3 LabelTooltip code block — implement verbatim; Pattern 10 AiGateNote)
    - .planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md (UX-03 "Help text NEVER states whether an expense is deductible" — content rule)
  </read_first>

  <behavior>
    1. **label-help-text.test.ts** (TDD RED first — covers UX-03):
       - Test L.1: For every key in INDIVIDUAL_LABELS_FULL, the entry has a `helpText` field of type string AND `helpText.trim().length >= 20` (i.e. real sentence, not placeholder).
       - Test L.2: Same for COMPANY_LABELS_FULL.
       - Test L.3: Same for TRUST_LABELS_FULL.
       - Test L.4: Same for PARTNERSHIP_LABELS_FULL.
       - Test L.5: Same for BAS_LABELS_FULL.
       - Test L.6: Same for `IAS_LABELS_FULL` (NEW catalogue — declare alongside the existing IasLabel type).
       - Test L.7: For all helpText strings concatenated, the regex `/deductibility|deductible|write off|write-off|tax advantage|claim/i` does NOT match. (Compliance rule — UX-03.)

    2. **LabelTooltip.test.tsx** (TDD RED first — covers UX-03):
       - Test T.1: `render(<LabelTooltip helpText="X is the gross income label." labelCode="P1" />)` — DOM contains a button with aria-label `"Help for P1"` and class containing `"no-print"`.
       - Test T.2: Same render — DOM contains a `<span>` with class containing `"print-only"` whose textContent equals `"X is the gross income label."`.
       - Test T.3: The button textContent is `"?"`.

    3. **PersonaModeModal.test.tsx** (TDD RED first — covers UX-05):
       - Test P.1: `render(<PersonaModeModal onComplete={fn} />)` shows a heading containing `"running your own business"` OR `"manage clients"`.
       - Test P.2: Two buttons present with `data-testid="persona-mode-owner"` and `data-testid="persona-mode-agent"`.
       - Test P.3: Clicking `data-testid="persona-mode-owner"` calls onComplete with `{ mode: 'owner' }`.
       - Test P.4: Clicking `data-testid="persona-mode-agent"` calls onComplete with `{ mode: 'agent' }`.

    4. **AiGateNote.test.tsx** (DEP-01 + FND-04):
       - Test A.1: `render(<AiGateNote />)` returns null when `isAiEnabled()` returns true (mock via vi.mock).
       - Test A.2: When `isAiEnabled()` returns false, DOM contains the substring `"AI suggestions disabled"` AND substring `"Gemini API key"` AND substring `"optional"`.

    5. **YearEndWizard.test.tsx** (scaffold tests — full integration lands in Plan 06-2):
       - Test W.1: `render(<YearEndWizard entity={e} accounts={[]} entries={[]} fy="FY2026" onUpdateEntity={fn} onAddLog={fn} />)` renders without crashing.
       - Test W.2: A heading with data-testid="wizard-step-indicator" is in the DOM showing step 1.
       - Test W.3: A "Next" button exists with data-testid="wizard-next".
       - Test W.4: Clicking "Next" calls `onUpdateEntity` with an entity whose wizardState['FY2026'].step === 2.

    6. **Sidebar.test.tsx** (NEW — covers UX-02 anomaly badge prop wiring + PERS-01 mode-aware items):
       - Test S.1: `render(<Sidebar mode="owner" anomalyCounts={{ journals: 3, accounts: 0 }} ... />)` — DOM contains a button labelled "Journal Entries" AND that button's subtree contains the text "3".
       - Test S.2: Same render with `anomalyCounts={{ journals: 0, accounts: 0 }}` — DOM contains "Journal Entries" but NO badge pill (test by absence of element with class `"bg-red-500"` inside the journals button).
       - Test S.3: `mode="owner"` — DOM does NOT contain a button labelled "Master Dashboard" (entity switcher removed in owner mode).
       - Test S.4: `mode="agent"` — DOM contains a button labelled "Clients" (renamed from "Master Dashboard") OR "Master Dashboard".
       - NB: These tests will be RED on commit 1; Plan 06-3 makes them GREEN. Mark them `it.todo()` if the Sidebar widening doesn't ship in this plan — but PREFER to write them now as RED and gate Plan 06-3 on making them GREEN.

    Mark Sidebar.test.tsx test cases S.1–S.4 as `it.todo()` so Plan 06-3 can flip them to `it()` once implementation lands. All other test cases above must be GREEN at end of this plan.
  </behavior>

  <action>
    Step 1 — Widen the type-literal of every label catalogue in src/lib/tax/labels/fy2026.ts:
    - Change `INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, { title; description; natReference; plainEnglish; }>` to `Record<IndividualLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string; }>` (helpText REQUIRED so test L.1 hard-fails on absence).
    - Apply the same widening to the 4 other existing catalogues (COMPANY_LABELS_FULL, TRUST_LABELS_FULL, PARTNERSHIP_LABELS_FULL, BAS_LABELS_FULL).
    - **Add a new constant IAS_LABELS_FULL** of type `Record<IasLabel, { title: string; description: string; natReference: string; plainEnglish: string; helpText: string; }>` for IasLabel keys W1, W2, W3, W4, W5, T7.

    Step 2 — Write helpText strings (1–3 sentences each, 20–250 chars). Source content from the ATO NAT instructions named in 06-CONTEXT.md canonical refs. Frame strings as "what this label captures + where the data comes from". NEVER use the words "deductible", "deductibility", "write off", "write-off", "tax advantage", "claim".

    Canonical examples (use this style for every entry):
    - INDIVIDUAL_LABELS_FULL['P1'].helpText = `"Gross income from your main business or professional activities for the year. Populated from accounts of type Revenue tagged with the P1 tax label."`
    - INDIVIDUAL_LABELS_FULL['P2'].helpText = `"Total business expenses for the year. Populated from accounts of type Expense tagged with the P2 tax label. Excludes private and non-business amounts."`
    - INDIVIDUAL_LABELS_FULL['M1'].helpText = `"Medicare levy at the applicable rate (full 2% above the upper threshold; shaded in below). Single thresholds only — family thresholds require dependant and spouse income data not yet captured."`
    - COMPANY_LABELS_FULL['6S'].helpText = `"Total expenses for the company across all categories. Populated by summing all accounts of type Expense in the financial year."`
    - TRUST_LABELS_FULL['5T'].helpText = `"Net income or loss of the trust before distribution to beneficiaries. The amount distributed in Item 57 must reconcile to this figure."`
    - BAS_LABELS_FULL['G1'].helpText = `"Total sales including GST for the period. Populated from credits to Revenue accounts tagged GST in the BAS period."`
    - BAS_LABELS_FULL['1A'].helpText = `"Total GST collected on sales for the period. Calculated as the sum of GST amounts on G1-tagged transactions."`
    - IAS_LABELS_FULL['W1'].helpText = `"Total wages and salaries paid in the period before any amounts withheld. Source: accounts tagged W1."`
    - IAS_LABELS_FULL['T7'].helpText = `"PAYG instalment amount for the period. Populated from the entity's stored ATO instalment notice amount."`

    Write a helpText for EVERY key in EVERY catalogue. Run test L.1–L.6 to verify; iterate any missing keys.

    Step 3 — Extend src/styles/print.css. APPEND (do not remove existing rules) a new block at the end of the file:
    ```css
    /* Phase 6: ATO label tooltip help — shown inline under each label on print */
    @media print {
      .label-help-text {
        display: block;
        font-size: 8pt;
        color: #666;
        font-style: italic;
        margin-top: 2pt;
      }
    }
    ```
    Also extend the `@media screen { .print-only { display: none; } }` block to add `.label-help-text { display: none; }`. Actually replace with:
    ```css
    @media screen {
      .print-only { display: none; }
    }
    ```
    is already correct because LabelTooltip's print span uses class `print-only label-help-text` — covered.

    Step 4 — Create src/components/LabelTooltip.tsx. Implement RESEARCH Pattern 3 VERBATIM, with the modification: the screen button gets class `"no-print"` AND data-testid="label-tooltip-trigger"; the print span gets class `"print-only label-help-text"`. CRITICAL: Do NOT use `asChild` on `Tooltip.Content` (React 19 throws — Pitfall 2). `Tooltip.Trigger` MAY use `asChild`. Include SPDX header.

    Step 5 — Create src/components/PersonaModeModal.tsx with SPDX header. Props: `{ onComplete: (s: Settings) => void; }` where `Settings` is imported from `../lib/persona`. Render a centred modal (motion.div + backdrop) with heading `"Welcome to AussieLedger"`, prompt `"Are you running your own business, or do you manage clients for others?"`, two large buttons. Owner button: `data-testid="persona-mode-owner"`, calls `onComplete({ mode: 'owner' })`. Agent button: `data-testid="persona-mode-agent"`, calls `onComplete({ mode: 'agent' })`. Style with existing Tailwind tokens (bg-white, border, shadow).

    Step 6 — Create src/components/AiGateNote.tsx with SPDX header. Implementation:
    ```typescript
    import { isAiEnabled } from '../lib/ai';
    export function AiGateNote(): React.JSX.Element | null {
      if (isAiEnabled()) return null;
      return (
        <p className="text-xs text-gray-500 italic mt-1" data-testid="ai-gate-note">
          AI suggestions disabled — add a Gemini API key to <code>.env.local</code> to enable (optional).
        </p>
      );
    }
    ```

    Step 7 — Create src/components/YearEndWizard.tsx as a SCAFFOLD only (full implementation lands in Plan 06-2). Skeleton must be sufficient for Test W.1–W.4 to GREEN. Implementation:
    ```typescript
    import React from 'react';
    import { advanceStep } from '../lib/persona';
    import type { Entity, Account, JournalEntry, AuditLog } from '../types';

    interface YearEndWizardProps {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      fy: string;
      onUpdateEntity: (e: Entity) => void;
      onAddLog?: (log: Omit<AuditLog, 'id' | 'timestamp' | 'user'>) => void;
    }

    export function YearEndWizard({ entity, fy, onUpdateEntity }: YearEndWizardProps): React.JSX.Element {
      const step = entity.wizardState?.[fy]?.step ?? 1;
      return (
        <div className="space-y-6">
          <div data-testid="wizard-step-indicator" className="text-sm font-bold">
            Year-End Wizard — Step {step} of 7
          </div>
          <div className="bg-white border border-[var(--line-strong)] p-6">
            <p className="text-gray-600">Wizard step content lands in Plan 06-2.</p>
          </div>
          <button
            data-testid="wizard-next"
            onClick={() => onUpdateEntity(advanceStep(entity, fy, step + 1))}
            className="px-4 py-2 bg-[var(--ink)] text-white font-bold"
          >
            Next
          </button>
        </div>
      );
    }
    ```

    Step 8 — Write all 6 test files per <behavior>. Use `import { describe, it, expect, vi } from 'vitest'` + `@testing-library/react`. For Sidebar.test.tsx, mark assertions S.1–S.4 as `it.todo(...)` placeholders — Plan 06-3 will flip them.

    Step 9 — Run the verify command. Confirm: existing test count + ≥ 18 new GREEN.
  </action>

  <verify>
    <automated>npx vitest run src/lib/tax/__tests__/label-help-text.test.ts src/components/__tests__/LabelTooltip.test.tsx src/components/__tests__/PersonaModeModal.test.tsx src/components/__tests__/AiGateNote.test.tsx src/components/__tests__/YearEndWizard.test.tsx --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "helpText:" src/lib/tax/labels/fy2026.ts` returns a count equal to or greater than the total number of label entries across all 6 catalogues (≥ 60)
    - `grep -nE "deductible|deductibility|write[- ]off|tax advantage|\\bclaim\\b" src/lib/tax/labels/fy2026.ts` returns ZERO matches (case-sensitive; helpText content rule)
    - `grep -n "IAS_LABELS_FULL" src/lib/tax/labels/fy2026.ts` returns at least one match
    - `grep -n "label-help-text" src/styles/print.css` returns a match inside `@media print`
    - `grep -n "from '@radix-ui/react-tooltip'" src/components/LabelTooltip.tsx` returns a match
    - `grep -n "asChild" src/components/LabelTooltip.tsx` returns matches ONLY for `Tooltip.Trigger`, NOT for `Tooltip.Content` (verify by reading the file: `Tooltip.Content` must NOT have `asChild` prop)
    - `grep -n "data-testid=\"persona-mode-owner\"" src/components/PersonaModeModal.tsx` returns a match
    - `grep -n "data-testid=\"persona-mode-agent\"" src/components/PersonaModeModal.tsx` returns a match
    - `grep -n "isAiEnabled" src/components/AiGateNote.tsx` returns a match
    - `grep -n "data-testid=\"wizard-step-indicator\"" src/components/YearEndWizard.tsx` returns a match
    - The vitest command exits 0 with all listed test files GREEN (Sidebar.test.tsx assertions still it.todo — acceptable)
    - `grep -rE 'IS_AI_ENABLED' src/components/AiGateNote.tsx` returns ZERO matches (use isAiEnabled() function only — deprecated constant forbidden in new code)
  </acceptance_criteria>

  <done>All 6 label catalogues have helpText; deductibility lint GREEN; LabelTooltip renders both screen + print; PersonaModeModal + AiGateNote + YearEndWizard scaffolds GREEN; Sidebar test file exists with todo assertions for Plan 06-3.</done>
</task>

<task type="auto">
  <name>Task 3: Public release artefacts — LICENSE, CONTRIBUTING.md, README rewrite, SPDX-headers lint, file-content tests</name>
  <files>
    LICENSE,
    CONTRIBUTING.md,
    README.md,
    src/__tests__/license.test.ts,
    src/__tests__/contributing.test.ts,
    src/__tests__/readme.test.ts,
    src/__tests__/spdx-headers.test.ts
  </files>

  <read_first>
    - README.md (current 161-line file — preserve any project-specific facts; rewrite structure entirely)
    - .planning/PROJECT.md (audience definition — owner + tax agent; "What This Is" section)
    - .planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md (public-release decisions §"Public release scope")
    - .planning/phases/06-personas-wizard-and-deployment/06-RESEARCH.md (§ CONTRIBUTING.md Schema-Migration Rule Wording — use verbatim; § Apache 2.0 LICENSE — full text at https://www.apache.org/licenses/LICENSE-2.0.txt)
    - package.json scripts (use verbatim: `dev`, `dev:full`, `build`, `build:server`, `start:server`, `test`, `lint`)
    - One source file (e.g. src/lib/persona.ts you just created) — confirm SPDX header block format
  </read_first>

  <action>
    Step 1 — Create LICENSE at repo root. Fetch full text from `https://www.apache.org/licenses/LICENSE-2.0.txt` (WebFetch). The file MUST start with the header `Apache License` followed by `Version 2.0, January 2004`. No modifications. End-of-line: LF (Unix). Approx 11,357 bytes.

    Step 2 — Create CONTRIBUTING.md with this exact outline (use the markdown headings verbatim — the test asserts on them):

    ```markdown
    # Contributing to AussieLedger

    Thanks for your interest in contributing.

    ## Dev Setup

    ### Single-user local (no server)
    \`\`\`bash
    npm install
    npm run dev
    \`\`\`
    Visit http://localhost:3000. Data persists in IndexedDB.

    ### Full-stack (small-firm VPS shape)
    \`\`\`bash
    npm install
    npm run dev:full
    \`\`\`
    Vite on :3000 + Express on :4000. Data persists in SQLite at \`./data/ledger.db\`.
    (Windows: requires Visual Studio Build Tools for better-sqlite3 native compile.)

    ## Tests

    \`\`\`bash
    npm test              # full Vitest suite (SPA)
    npm run test:server   # server-side suite
    npm run lint          # TypeScript noEmit (SPA + server)
    npm run build         # production build (catches type errors not in dev)
    \`\`\`

    All PRs must keep the suite GREEN and \`npm run build\` exiting 0.

    ## Schema Migrations

    AussieLedger uses an integer schema version (\`_v\`) on all persisted data.

    **The hard rule:** Every schema change MUST be:

    1. **Additive only** — new fields are optional with sensible defaults. No field may be removed or renamed. No type may be changed to an incompatible type.

    2. **Reversible round-trip** — a \`v{N}→v{N+1}\` migration test is required that:
       - Constructs a representative \`_v: N\` blob (the oldest realistic shape)
       - Runs it through \`migrate()\` in \`src/lib/migrations/index.ts\`
       - Asserts the result is \`_v: N+1\` with all existing fields preserved and all new fields populated with correct defaults
       - Calls \`adapter.importAll(migrated)\` then \`adapter.exportAll()\` and asserts the exported shape matches the migrated shape (round-trip integrity)

    3. **Registered** — add \`N: migrateVNToV{N+1}\` to the \`MIGRATIONS\` registry in \`src/lib/migrations/index.ts\` and bump \`CURRENT_VERSION\`.

    4. **Named consistently** — migration file: \`src/lib/migrations/vN-to-v{N+1}.ts\`. Test file: \`src/lib/migrations/__tests__/vN-to-v{N+1}.test.ts\`.

    **Why:** A deployed instance may have been offline for 6 months. On next load, the migration runner must upgrade every version gap without losing data. Non-additive changes corrupt that user's books permanently.

    ## Adding a New Financial Year

    AussieLedger uses a per-FY module pattern. To add FY2027:

    1. Create \`src/lib/tax/labels/fy2027.ts\` — copy fy2026.ts and update constants (marginal brackets, LITO, Medicare, MLS, NAT references).
    2. Create \`src/lib/tax/returns/fy2027/{individual,company,trust,partnership,bas,ias}.ts\` — copy fy2026 modules and adjust label mappings if ATO forms changed.
    3. Create \`src/lib/tax/rates/fy2027/{marginal,lito,medicare,bre,smallBizOffset}.ts\`.
    4. Wire dispatch in \`currentFy()\` / period.ts as required.
    5. Add golden tests in \`src/lib/tax/returns/fy2027/__tests__/\` matching the fy2026 test layout.

    Existing FY modules MUST NOT be modified — the per-FY pattern is the rule.

    ## Pull Request Template

    Include in your PR description:
    - **What:** one-line summary
    - **Why:** reference to issue / requirement ID
    - **How tested:** \`npm test\` output + manual verification steps
    - **Schema impact:** none / additive (provide migration file path)
    - **AI feature impact:** none / requires Gemini API key

    A \`.github/PULL_REQUEST_TEMPLATE.md\` will surface these prompts automatically.

    ## License

    Apache 2.0. See \`LICENSE\` at the repo root and per-file SPDX headers.
    ```

    Step 3 — Rewrite README.md (replace entirely). Required structure (test asserts on substrings):

    ```markdown
    # AussieLedger

    Free, self-hosted, open-source Australian bookkeeping → tax return tool.
    AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).

    ## What This Is

    **For small-business owners** — take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

    **For tax agents** — a no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes.

    ## Quick Start

    \`\`\`bash
    git clone <repo-url>
    cd AussieLedger
    npm install && npm run build
    npm run dev
    \`\`\`

    Visit http://localhost:3000. On first load, you'll be asked to pick **owner mode** (single business) or **agent mode** (multiple clients).

    ## Deployment Shapes

    AussieLedger ships in two shapes from the same codebase.

    ### Single-user local (no server)

    \`\`\`bash
    npm install
    npm run dev
    \`\`\`
    Data persists in your browser's IndexedDB. Survives cache clear unless you clear site data. Export your data periodically via the Data page.

    ### Small-firm VPS (Vite + Express + SQLite)

    \`\`\`bash
    npm install
    npm run build
    npm run build:server
    npm run start:server &
    # serve dist/ via your reverse proxy (Caddy / nginx)
    \`\`\`

    Set env vars: \`PORT\` (default 4000), \`DB_PATH\` (default ./data/ledger.db), \`GEMINI_API_KEY\` (optional — enables AI account-matching in TB import). For multi-user access, run behind your reverse proxy with basic auth or VPN.

    Windows dev note: \`npm run dev:full\` requires Visual Studio Build Tools for the native \`better-sqlite3\` compile.

    ## How It Works

    - **Persistence:** StorageAdapter abstracts the storage layer. LocalAdapter (IndexedDB) + ServerAdapter (HTTP → Express → SQLite). Same SPA bundle, runtime probe picks the shape.
    - **Tax engine:** Pure functions in \`src/lib/tax/\` consume Chart of Accounts + Journal Entries and produce ATO-label-tagged working papers. Decimal arithmetic throughout (decimal.js).
    - **Print working papers:** \`window.print()\` + \`@media print\` CSS. No PDF library. ATO field codes shown alongside plain-English labels.
    - **Year-end wizard:** Guided 7-step flow (confirm → unreconciled → GST codes → unmapped → preview → attest → finalise). Locks the FY when finalised; post-finalise corrections route through Reverse-and-Re-post.

    ## Optional: AI Account-Matching

    If \`GEMINI_API_KEY\` is set in \`.env.local\` (single-user) or as a server env var (small-firm), the TB import shows an "AI re-match accounts" button. Without a key, you'll see a one-line note saying AI suggestions are disabled — the rest of the app works exactly the same.

    ## Contributing

    See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

    ## License

    Apache 2.0. See [LICENSE](./LICENSE).

    AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
    ```

    Step 4 — Create src/__tests__/license.test.ts:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect } from 'vitest';
    import { readFileSync } from 'node:fs';
    import { resolve } from 'node:path';

    describe('LICENSE (DEP-04)', () => {
      const repoRoot = resolve(__dirname, '../..');

      it('file exists at repo root', () => {
        const content = readFileSync(resolve(repoRoot, 'LICENSE'), 'utf8');
        expect(content.length).toBeGreaterThan(10000);
      });

      it('contains the Apache License header', () => {
        const content = readFileSync(resolve(repoRoot, 'LICENSE'), 'utf8');
        expect(content).toContain('Apache License');
        expect(content).toContain('Version 2.0');
      });

      it('package.json declares license: Apache-2.0', () => {
        const pkg = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8'));
        expect(pkg.license).toBe('Apache-2.0');
      });
    });
    ```

    Step 5 — Create src/__tests__/contributing.test.ts asserting CONTRIBUTING.md exists at repo root, length > 1000 chars, and contains every keyword: `'Schema Migrations'`, `'Additive only'`, `'round-trip'`, `'migration'`, `'Adding a New Financial Year'`, `'Pull Request Template'`, `'CURRENT_VERSION'`.

    Step 6 — Create src/__tests__/readme.test.ts asserting README.md contains every substring: `'npm install && npm run build'`, `'Single-user local'`, `'Small-firm VPS'`, `'StorageAdapter'`, `'owner mode'`, `'agent mode'`, `'Apache 2.0'`.

    Step 7 — Create src/__tests__/spdx-headers.test.ts asserting every `.ts`/`.tsx` file under `src/` whose path does NOT include `__tests__` (test files exempt from the lint to keep test scaffolding light) AND does NOT end with `.d.ts` contains the substring `'SPDX-License-Identifier: Apache-2.0'` within the first 200 characters of the file.
    - Use `fast-glob` style traversal via Node's `readdirSync`/recursive walk OR import an existing helper if one exists.
    - The test MUST also pass for the files created in Plan 06-1 (persona.ts, useAnomalyCounts.ts, v4-to-v5.ts, LabelTooltip.tsx, PersonaModeModal.tsx, AiGateNote.tsx, YearEndWizard.tsx) — confirm headers were added in Task 1 + Task 2.
    - Skeleton:
    ```typescript
    import { describe, it, expect } from 'vitest';
    import { readFileSync, readdirSync, statSync } from 'node:fs';
    import { resolve, join } from 'node:path';

    function collect(dir: string, out: string[] = []): string[] {
      for (const name of readdirSync(dir)) {
        const full = join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name === '__tests__' || name === 'node_modules') continue;
          collect(full, out);
        } else if ((name.endsWith('.ts') || name.endsWith('.tsx')) && !name.endsWith('.d.ts')) {
          out.push(full);
        }
      }
      return out;
    }

    describe('SPDX headers (DEP-04)', () => {
      const srcDir = resolve(__dirname, '..');
      const files = collect(srcDir);

      it.each(files)('%s has Apache-2.0 SPDX header', (file) => {
        const head = readFileSync(file, 'utf8').slice(0, 200);
        expect(head).toContain('SPDX-License-Identifier: Apache-2.0');
      });
    });
    ```

    Step 8 — Verify by running the new test files + full suite.
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/license.test.ts src/__tests__/contributing.test.ts src/__tests__/readme.test.ts src/__tests__/spdx-headers.test.ts --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - File `LICENSE` exists at repo root with > 10000 bytes
    - `grep -c "Apache License" LICENSE` returns ≥ 1
    - `grep -c "Version 2.0" LICENSE` returns ≥ 1
    - File `CONTRIBUTING.md` exists at repo root
    - `grep -c "Schema Migrations" CONTRIBUTING.md` returns ≥ 1
    - `grep -c "Additive only" CONTRIBUTING.md` returns ≥ 1
    - `grep -c "round-trip" CONTRIBUTING.md` returns ≥ 1
    - `grep -c "Adding a New Financial Year" CONTRIBUTING.md` returns ≥ 1
    - `grep -c "npm install && npm run build" README.md` returns ≥ 1
    - `grep -c "Single-user local" README.md` returns ≥ 1
    - `grep -c "Small-firm VPS" README.md` returns ≥ 1
    - `grep -c "owner mode" README.md` returns ≥ 1
    - `grep -c "agent mode" README.md` returns ≥ 1
    - `grep -nE '"license":\s*"Apache-2.0"' package.json` returns a match
    - The vitest command exits 0 with all 4 new test files GREEN
    - SPDX headers test passes for every src/**/*.ts(x) (≥ 50 files asserted)
  </acceptance_criteria>

  <done>LICENSE + CONTRIBUTING.md + README rewrite shipped; package.json license set to Apache-2.0; SPDX-headers lint test enforces per-file SPDX header on every src/**/*.ts(x) file; all four release test files GREEN.</done>
</task>

</tasks>

<verification>
- All 12 new test files exist and are GREEN (excluding Sidebar.test.tsx assertions which are it.todo for Plan 06-3)
- Run full suite: `npx vitest run` — expect ~544–550 GREEN (526 prior + ≥ 18 from this plan)
- `npx tsc --noEmit` — TypeScript compiles cleanly (no errors from type widenings)
- `npm run build` exits 0
- `npm run lint` exits 0
- Schema migration round-trip GREEN at CURRENT_VERSION = 5
- LabelTooltip renders without React 19 errors (no `asChild` on `Tooltip.Content`)
- helpText content lint test enforces no "deductible" / "write off" wording
</verification>

<success_criteria>
- v4→v5 migration committed and registered; CURRENT_VERSION = 5
- src/types.ts widened with returnStatusByFy + wizardState + WizardStateFy
- src/lib/persona.ts ships Settings, useSettings, finaliseEntity, unfinaliseEntity, advanceStep — all GREEN
- src/hooks/useAnomalyCounts.ts ships hook with useMemo — all GREEN
- All 6 label catalogues (Individual / Company / Trust / Partnership / BAS / IAS) carry helpText fields — content lint GREEN
- LabelTooltip + PersonaModeModal + AiGateNote + YearEndWizard scaffold components committed — render tests GREEN
- print.css extended with `.label-help-text` print rule
- LICENSE (Apache 2.0 full text) + CONTRIBUTING.md + README.md rewrite committed
- package.json declares `"license": "Apache-2.0"`
- @radix-ui/react-tooltip@^1.2.8 installed
- src/__tests__/{license,contributing,readme,spdx-headers}.test.ts all GREEN
- Test count: 526 prior → ≥ 544 (delta ≥ +18; expected target ~+25 with all scaffolds + lint tests)
- Sidebar.test.tsx exists with `it.todo()` placeholders for Plan 06-3
</success_criteria>

<output>
After completion, create `.planning/phases/06-personas-wizard-and-deployment/06-1-SUMMARY.md` documenting:
- New files created (count + paths)
- Files modified (counts of widenings + migration registry update)
- Test count delta (prior → new GREEN)
- Verification command outputs (vitest summary, lint, build EXIT 0)
- What Plans 06-2 and 06-3 can now consume in parallel
- Any helpText drafted by Claude that the user should review before public release
</output>
