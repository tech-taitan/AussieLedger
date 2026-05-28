---
phase: 06-personas-wizard-and-deployment
plan: 2
type: execute
wave: 2
depends_on: [06-1]
files_modified:
  - src/types.ts
  - src/components/YearEndWizard.tsx
  - src/components/wizard/Step1Confirm.tsx
  - src/components/wizard/Step2Unreconciled.tsx
  - src/components/wizard/Step3GstCodes.tsx
  - src/components/wizard/Step4UnmappedAccounts.tsx
  - src/components/wizard/Step5Preview.tsx
  - src/components/wizard/Step6Attestation.tsx
  - src/components/wizard/Step7Finalise.tsx
  - src/components/wizard/__tests__/Step1Confirm.test.tsx
  - src/components/wizard/__tests__/Step4UnmappedAccounts.test.tsx
  - src/components/wizard/__tests__/Step6Attestation.test.tsx
  - src/components/__tests__/YearEndWizard.test.tsx
  - src/components/JournalForm.tsx
  - src/components/__tests__/JournalForm.test.tsx
  - src/hooks/useEntities.ts
  - src/hooks/__tests__/useEntities.test.ts
autonomous: true
requirements: [UX-01, PERS-03]

must_haves:
  truths:
    - "Wizard renders 7 steps; user can advance via Next; current step persists on Entity.wizardState[fy]"
    - "Finalise button is disabled when any account referenced in posted entries is unmapped (taxLabel undefined or empty)"
    - "Finalise button is disabled until attestation checkbox is checked AND typed entity-name matches (case-insensitive)"
    - "Finalise click writes returnStatusByFy[fy]='finalised', lockedFys gains fy, wizardState[fy].completedAt is set, and emits LOCK_FY audit log"
    - "Unfinalise click on finalised FY writes returnStatusByFy[fy]='draft', removes fy from lockedFys, and emits UNLOCK_FY audit log"
    - "JournalForm shows a 'FY is finalised — use Reverse and Re-post' banner and disables Save when editing an entry whose date falls in a finalised FY"
    - "Step5Preview embeds the Phase-5 renderer for the entity type — no new tax math"
  artifacts:
    - path: "src/components/YearEndWizard.tsx"
      provides: "7-step wizard orchestrator wired to advanceStep / finaliseEntity / unfinaliseEntity"
      min_lines: 120
    - path: "src/components/wizard/Step1Confirm.tsx"
      provides: "FY + entity confirmation step"
    - path: "src/components/wizard/Step4UnmappedAccounts.tsx"
      provides: "Unmapped-accounts list with per-row 'Map this account' inline action; hard-block source for Finalise"
    - path: "src/components/wizard/Step5Preview.tsx"
      provides: "Embeds TaxReturnAssistant/CompanyTaxReturn/TrustTaxReturn/PartnershipTaxReturn based on entity.type"
    - path: "src/components/wizard/Step6Attestation.tsx"
      provides: "Checkbox + typed-entity-name attestation"
    - path: "src/components/wizard/Step7Finalise.tsx"
      provides: "Writes finalisation via onUpdateEntity + emits LOCK_FY audit log"
  key_links:
    - from: "src/components/YearEndWizard.tsx"
      to: "src/lib/persona.ts"
      via: "advanceStep / finaliseEntity / unfinaliseEntity imports"
      pattern: "from\\s+['\"]\\.\\.\\/lib\\/persona['\"]"
    - from: "src/components/wizard/Step5Preview.tsx"
      to: "src/components/TaxReturnAssistant.tsx + CompanyTaxReturn + TrustTaxReturn + PartnershipTaxReturn"
      via: "entity.type-dispatched embed"
      pattern: "entity\\.type\\s*===\\s*['\"]Individual['\"]"
    - from: "src/components/JournalForm.tsx"
      to: "Entity.returnStatusByFy"
      via: "lockedFy prop computed by ViewRouter"
      pattern: "lockedFy"
---

<objective>
Build the Year-End Wizard end-to-end and wire the finalise/unfinalise lifecycle. The wizard is a thin orchestrator around already-shipped Phase-5 renderers — zero new tax math. Add the JournalForm guard that blocks edits on a finalised FY and routes the user to the Reverse-and-Re-post workflow (already shipped Phase 4).

Purpose: Land UX-01 (year-end wizard with unmapped-accounts hard-block on Finalise) and the finalise lifecycle that turns AussieLedger from a working-paper tool into a year-bound lodgement-ready tool. Surface PERS-03 data preservation (wizard/finalise mutations only touch returnStatusByFy/wizardState/lockedFys — never entries/accounts).

Output: YearEndWizard + 7 step components; JournalForm finalised-FY guard; useEntities `addLog`-wired updateEntity helper for audit emission; integration tests covering wizard sequence + finalise gate.
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
@.planning/phases/06-personas-wizard-and-deployment/06-1-PLAN.md
@.planning/phases/04-bookkeeping-core/04-CONTEXT.md
@src/components/TaxReturnAssistant.tsx
@src/components/CompanyTaxReturn.tsx
@src/components/TrustTaxReturn.tsx
@src/components/PartnershipTaxReturn.tsx
@src/components/JournalForm.tsx
@src/hooks/useEntities.ts
@src/hooks/useJournals.ts
@src/lib/period.ts

<interfaces>
<!-- Contracts the executor needs. Pre-extracted so no codebase scan is required. -->

From src/lib/persona.ts (created in 06-1 — consume only):
```typescript
export interface Settings { mode: 'owner' | 'agent'; primaryEntityId?: string; }
export interface WizardStateFy { step: number; dismissedAnomalies: string[]; completedAt?: string; }
export function advanceStep(entity: Entity, fy: string, nextStep: number): Entity;
export function finaliseEntity(entity: Entity, fy: string): Entity;
export function unfinaliseEntity(entity: Entity, fy: string): Entity;
```

From src/types.ts (updated in 06-1):
```typescript
export interface Entity {
  // ...all existing fields...
  returnStatusByFy?: Record<string, 'draft' | 'finalised'>;
  wizardState?: Record<string, WizardStateFy>;
  lockedFys?: string[];  // existing — write here in finaliseEntity
}
export type AuditAction = '...' | 'LOCK_FY' | 'UNLOCK_FY';  // already widened in Phase 4
```

From src/components/TaxReturnAssistant.tsx (Phase 5 — consume only):
```typescript
interface TaxReturnAssistantProps {
  accounts: Account[];
  entries: JournalEntry[];
  entity?: Entity;
  addLog?: (log: Omit<AuditLog, 'id' | 'timestamp' | 'user'>) => void;
  onUpdateAccount?: (a: Account) => void;
}
```

From src/components/CompanyTaxReturn.tsx (Phase 5 — consume only):
```typescript
interface CompanyTaxReturnProps {
  accounts: Account[];
  entries: JournalEntry[];
  entity?: Entity;
  addLog?: (log: Omit<AuditLog, 'id' | 'timestamp' | 'user'>) => void;
  onUpdateAccount?: (a: Account) => void;
}
```

From src/components/TrustTaxReturn.tsx + PartnershipTaxReturn.tsx (Phase 5 — consume only):
```typescript
interface TrustTaxReturnProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  addLog?: (...);
}
// PartnershipTaxReturnProps: same shape
```

From src/hooks/useEntities.ts (Phase 4 — consume `updateEntity`; widen to forward addLog if not already):
```typescript
export interface EntitiesHook {
  entities: Entity[];
  updateEntity: (e: Entity) => void;
  // ...
}
```

From src/hooks/useAuditLog.ts (Phase 1 → 2 → 3 — consume only):
```typescript
export interface UseAuditLogReturn {
  addLog: (entry: Omit<AuditLog, 'id' | 'timestamp' | 'user'>) => void;
  // ...
}
```

From src/lib/period.ts (Phase 2 — consume only):
```typescript
export function today(): Date;            // test-seamable now-provider
export function currentFy(): string;      // e.g. "FY2026"
export function fyForDate(iso: string): string;  // derives FY from a journal date
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: 7-step wizard components + YearEndWizard orchestrator (TDD)</name>
  <files>
    src/components/wizard/Step1Confirm.tsx,
    src/components/wizard/Step2Unreconciled.tsx,
    src/components/wizard/Step3GstCodes.tsx,
    src/components/wizard/Step4UnmappedAccounts.tsx,
    src/components/wizard/Step5Preview.tsx,
    src/components/wizard/Step6Attestation.tsx,
    src/components/wizard/Step7Finalise.tsx,
    src/components/wizard/__tests__/Step1Confirm.test.tsx,
    src/components/wizard/__tests__/Step4UnmappedAccounts.test.tsx,
    src/components/wizard/__tests__/Step6Attestation.test.tsx,
    src/components/YearEndWizard.tsx,
    src/components/__tests__/YearEndWizard.test.tsx
  </files>

  <read_first>
    - src/components/YearEndWizard.tsx (the SCAFFOLD created in Plan 06-1; you are now replacing the placeholder body with the full 7-step implementation while keeping the props signature and test-id contract that 06-1 Test W.1–W.4 already exercise)
    - src/components/__tests__/YearEndWizard.test.tsx (current scaffold tests W.1–W.4 — must continue to GREEN after this plan; ADD new integration tests W.5+)
    - src/components/TaxReturnAssistant.tsx (Phase-5 Form I renderer — embedded by Step5Preview; understand props)
    - src/components/CompanyTaxReturn.tsx (Phase-5 Form C renderer — embedded by Step5Preview)
    - src/components/TrustTaxReturn.tsx (Phase-5 Form T renderer)
    - src/components/PartnershipTaxReturn.tsx (Phase-5 Form P renderer)
    - src/lib/persona.ts (advanceStep / finaliseEntity / unfinaliseEntity — call site for steps 6-7)
    - src/lib/period.ts (currentFy() — wizard's default FY)
    - src/types.ts (Entity, Account, JournalEntry, AuditLog, AuditAction including LOCK_FY/UNLOCK_FY)
  </read_first>

  <behavior>
    Tests are written FIRST and committed RED before implementation.

    **YearEndWizard.test.tsx — extend with W.5–W.12 (W.1–W.4 from 06-1 still GREEN):**
    - Test W.5: `render(<YearEndWizard entity={e} ... fy="FY2026" />)` where `e.wizardState['FY2026'].step === 4` shows DOM containing data-testid="wizard-step-4-unmapped".
    - Test W.6: From step 6, clicking the attestation checkbox + typing the exact entity name (case-insensitive) enables the "Finalise" button (`data-testid="wizard-finalise"`).
    - Test W.7: At step 6 with checkbox unchecked, Finalise button is disabled (assert `disabled` attribute).
    - Test W.8: At step 6 with checkbox checked + typed name "ACME pty ltd" while entity.name is "Acme Pty Ltd" — Finalise enabled (case-insensitive match).
    - Test W.9: At step 6 with checkbox checked + typed name "Wrong Name" — Finalise disabled.
    - Test W.10: When there are unmapped accounts in posted entries, Finalise button (when visible at step 7 review) is disabled regardless of attestation state.
    - Test W.11: Clicking the Finalise button (with all gates open) calls onUpdateEntity once with `returnStatusByFy['FY2026'] === 'finalised'` AND calls onAddLog once with `action === 'LOCK_FY'`.
    - Test W.12: An "Unfinalise FY2026" button (`data-testid="wizard-unfinalise"`) is visible when entity.returnStatusByFy['FY2026'] === 'finalised' AND clicking it (after typing the matching entity name in the modal) calls onUpdateEntity with returnStatusByFy['FY2026'] === 'draft' AND onAddLog with action === 'UNLOCK_FY'.

    **Step1Confirm.test.tsx:**
    - Test S1.1: Renders entity name + FY in the prompt.
    - Test S1.2: A "Yes, continue" button is data-testid="step1-confirm-yes" — click advances step.
    - Test S1.3: Shows the count of unreconciled draft journals in the stats line.

    **Step4UnmappedAccounts.test.tsx:**
    - Test S4.1: Empty unmapped list → renders "All accounts mapped." plus a green check.
    - Test S4.2: Two unmapped accounts referenced in posted entries → renders 2 rows, each with `data-testid="unmapped-row"`.
    - Test S4.3: Per-row "Map this account" button has `data-testid="unmapped-map-{accountId}"` and calls `onNavigateToAccount(accountId)` prop.
    - Test S4.4: When unmappedCount > 0, the step exposes `hasBlockingIssues = true` via the data attribute `data-blocking="true"` on its root element.

    **Step6Attestation.test.tsx:**
    - Test S6.1: Initial render → checkbox unchecked + text input empty + Finalise button disabled.
    - Test S6.2: Check the box → button still disabled (name field empty).
    - Test S6.3: Check box + type entity.name exactly → button enabled.
    - Test S6.4: Check box + type entity.name in different case → button enabled (case-insensitive).
    - Test S6.5: Check box + type partial match → button disabled.
    - Test S6.6: Component accepts `onConfirm` prop, called on Finalise click with no args.
    - Test S6.7: Component accepts `hasBlockingIssues` prop — when `true`, button stays disabled regardless of inputs.
  </behavior>

  <action>
    Step 1 — Create the wizard directory: `mkdir -p src/components/wizard/__tests__`.

    Step 2 — Replace src/components/YearEndWizard.tsx with the full orchestrator. Keep the prop signature from 06-1 scaffold so existing Test W.1–W.4 stay GREEN. Add `onAddLog: (log: Omit<AuditLog, 'id'|'timestamp'|'user'>) => void` to props (previously optional in scaffold). Implementation outline:
    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useMemo } from 'react';
    import { advanceStep, finaliseEntity, unfinaliseEntity } from '../lib/persona';
    import { currentFy } from '../lib/period';
    import type { Entity, Account, JournalEntry, AuditLog } from '../types';
    import { Step1Confirm } from './wizard/Step1Confirm';
    import { Step2Unreconciled } from './wizard/Step2Unreconciled';
    import { Step3GstCodes } from './wizard/Step3GstCodes';
    import { Step4UnmappedAccounts } from './wizard/Step4UnmappedAccounts';
    import { Step5Preview } from './wizard/Step5Preview';
    import { Step6Attestation } from './wizard/Step6Attestation';
    import { Step7Finalise } from './wizard/Step7Finalise';

    interface YearEndWizardProps {
      entity: Entity;
      accounts: Account[];
      entries: JournalEntry[];
      fy?: string;  // defaults to currentFy()
      onUpdateEntity: (e: Entity) => void;
      onAddLog: (log: Omit<AuditLog, 'id'|'timestamp'|'user'>) => void;
      onNavigateToAccount?: (accountId: string) => void;
    }

    export function YearEndWizard({ entity, accounts, entries, fy: fyProp, onUpdateEntity, onAddLog, onNavigateToAccount }: YearEndWizardProps): React.JSX.Element {
      const fy = fyProp ?? currentFy();
      const step = entity.wizardState?.[fy]?.step ?? 1;
      const status = entity.returnStatusByFy?.[fy] ?? 'draft';

      // Compute unmapped accounts (referenced in posted entries but no taxLabel)
      const unmappedAccounts = useMemo(() => {
        const postedAccountIds = new Set<string>();
        for (const entry of entries) {
          const posted = entry.status === 'posted' || (entry.status === undefined && entry.isPosted);
          if (!posted) continue;
          for (const line of entry.lines) postedAccountIds.add(line.accountId);
        }
        return accounts.filter(a => postedAccountIds.has(a.id) && (!a.taxLabel || a.taxLabel === ''));
      }, [accounts, entries]);

      const hasBlockingIssues = unmappedAccounts.length > 0;

      const next = (n?: number) => onUpdateEntity(advanceStep(entity, fy, n ?? step + 1));
      const back = () => onUpdateEntity(advanceStep(entity, fy, Math.max(1, step - 1)));
      const finalise = () => {
        onUpdateEntity(finaliseEntity(entity, fy));
        onAddLog({ action: 'LOCK_FY', entityId: entity.id, details: `Finalised ${fy} for ${entity.name}` });
      };
      const unfinalise = () => {
        onUpdateEntity(unfinaliseEntity(entity, fy));
        onAddLog({ action: 'UNLOCK_FY', entityId: entity.id, details: `Unfinalised ${fy} for ${entity.name}` });
      };

      return (
        <div className="space-y-6">
          <div data-testid="wizard-step-indicator" className="text-sm font-bold">
            Year-End Wizard — Step {step} of 7 — {entity.name} {fy}
            {status === 'finalised' && <span className="ml-2 text-green-700">[FINALISED]</span>}
          </div>
          {status === 'finalised' && (
            <UnfinaliseSection
              entity={entity}
              fy={fy}
              onUnfinalise={unfinalise}
            />
          )}
          {step === 1 && <Step1Confirm entity={entity} fy={fy} entries={entries} onNext={() => next(2)} />}
          {step === 2 && <Step2Unreconciled entries={entries} onBack={back} onNext={() => next(3)} />}
          {step === 3 && <Step3GstCodes accounts={accounts} onBack={back} onNext={() => next(4)} />}
          {step === 4 && (
            <div data-testid="wizard-step-4-unmapped">
              <Step4UnmappedAccounts
                unmapped={unmappedAccounts}
                onNavigateToAccount={onNavigateToAccount ?? (() => {})}
                onBack={back}
                onNext={() => next(5)}
              />
            </div>
          )}
          {step === 5 && <Step5Preview entity={entity} accounts={accounts} entries={entries} onBack={back} onNext={() => next(6)} />}
          {step === 6 && (
            <Step6Attestation
              entity={entity}
              hasBlockingIssues={hasBlockingIssues}
              onBack={back}
              onConfirm={() => next(7)}
            />
          )}
          {step === 7 && (
            <Step7Finalise
              entity={entity}
              fy={fy}
              hasBlockingIssues={hasBlockingIssues}
              onFinalise={finalise}
              onBack={back}
            />
          )}
          <button
            data-testid="wizard-next"
            disabled={step >= 7}
            onClick={() => next()}
            className="px-4 py-2 bg-[var(--ink)] text-white font-bold disabled:opacity-50"
          >
            Next
          </button>
        </div>
      );
    }

    function UnfinaliseSection(...): { ... renders typed-entity-name confirm + button data-testid="wizard-unfinalise" ... }
    ```

    Step 3 — Implement each Step component. Each gets the SPDX header. Concrete signatures:

    **Step1Confirm.tsx** — props: `{ entity, fy, entries, onNext }`. Renders heading "Year-End Preparation — {entity.name} {fy}", paragraph "Have you finished entering all transactions for the year?", stats line `Last journal entry: {N} days ago. {count} draft journals remain.`, two buttons: "Yes, continue" (data-testid="step1-confirm-yes") and "Not yet — review my journals" (data-testid="step1-confirm-back"). The latter does nothing in v1 — sets wizard state.dismissedAnomalies aside (planner discretion).

    **Step2Unreconciled.tsx** — props: `{ entries, onBack, onNext }`. Lists draft journals (status === 'draft') with date + reference + description. Soft warning, never blocks Next.

    **Step3GstCodes.tsx** — props: `{ accounts, onBack, onNext }`. Lists accounts where `gstCode` is missing or is 'N-T' but the account type is Revenue/Expense. Soft warning, never blocks Next.

    **Step4UnmappedAccounts.tsx** — props: `{ unmapped: Account[]; onNavigateToAccount: (id: string) => void; onBack; onNext }`. Renders empty state when unmapped.length === 0 with text "All accounts mapped." plus `<CheckCircle className="text-green-600" />`. Otherwise renders each as a row with class `data-testid="unmapped-row"`; each row has account.code + account.name and a button `data-testid={`unmapped-map-${account.id}`}` text "Map this account" calling `onNavigateToAccount(account.id)`. Root element has `data-blocking={unmapped.length > 0 ? 'true' : 'false'}`.

    **Step5Preview.tsx** — props: `{ entity, accounts, entries, onBack, onNext }`. Dispatches by entity.type:
    ```typescript
    if (entity.type === 'Individual') return <TaxReturnAssistant accounts={accounts} entries={entries} entity={entity} />;
    if (entity.type === 'Company') return <CompanyTaxReturn accounts={accounts} entries={entries} entity={entity} />;
    if (entity.type === 'Trust') return <TrustTaxReturn entity={entity} accounts={accounts} entries={entries} />;
    if (entity.type === 'Partnership') return <PartnershipTaxReturn entity={entity} accounts={accounts} entries={entries} />;
    return <p>Unknown entity type.</p>;
    ```
    Wrap in a div containing Back / Next buttons.

    **Step6Attestation.tsx** — props: `{ entity: Entity; hasBlockingIssues: boolean; onBack: () => void; onConfirm: () => void; }`. Implementation:
    ```typescript
    const [checked, setChecked] = useState(false);
    const [typedName, setTypedName] = useState('');
    const nameMatches = typedName.trim().toLowerCase() === entity.name.trim().toLowerCase();
    const canFinalise = checked && nameMatches && !hasBlockingIssues;
    // ... render checkbox, name input, button data-testid="wizard-finalise" disabled={!canFinalise} onClick={onConfirm}
    ```
    Render a yellow callout if hasBlockingIssues showing "{N} unmapped accounts must be resolved before finalising. Return to Step 4."

    **Step7Finalise.tsx** — props: `{ entity, fy, hasBlockingIssues, onFinalise, onBack }`. Renders summary "Ready to finalise FY {fy} for {entity.name}". A confirm button data-testid="wizard-finalise-confirm" disabled when hasBlockingIssues, calling onFinalise.

    Step 4 — Write the four test files per <behavior>. Mock TaxReturnAssistant / CompanyTaxReturn / TrustTaxReturn / PartnershipTaxReturn imports via vi.mock to keep YearEndWizard tests narrow to wizard logic (avoid pulling Phase-5 renderer dependencies).

    Step 5 — Run the verify command. The complete wizard test set must be GREEN.
  </action>

  <verify>
    <automated>npx vitest run src/components/__tests__/YearEndWizard.test.tsx src/components/wizard/__tests__ --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - Files exist: src/components/YearEndWizard.tsx (≥ 120 lines) and all 7 step files under src/components/wizard/
    - `grep -n 'from .*lib/persona' src/components/YearEndWizard.tsx` returns matches for `advanceStep`, `finaliseEntity`, `unfinaliseEntity`
    - `grep -n 'currentFy' src/components/YearEndWizard.tsx` returns a match (FY default source)
    - `grep -nE "entity\\.type\\s*===\\s*['\"]Individual['\"]" src/components/wizard/Step5Preview.tsx` returns a match (and one each for Company/Trust/Partnership)
    - `grep -n "TaxReturnAssistant\\|CompanyTaxReturn\\|TrustTaxReturn\\|PartnershipTaxReturn" src/components/wizard/Step5Preview.tsx` returns 4+ matches
    - `grep -n 'data-testid="wizard-finalise"' src/components/wizard/Step6Attestation.tsx` returns a match
    - `grep -nE "toLowerCase\\(\\)" src/components/wizard/Step6Attestation.tsx` returns ≥ 2 matches (case-insensitive name comparison)
    - `grep -n "LOCK_FY\\|UNLOCK_FY" src/components/YearEndWizard.tsx` returns ≥ 2 matches
    - `grep -rE 'new Date\\(\\)' src/components/YearEndWizard.tsx src/components/wizard/` returns ZERO matches (Phase 2 rule — must use today() or finaliseEntity from persona.ts)
    - The vitest command exits 0 with W.1–W.12 + S1.1–S1.3 + S4.1–S4.4 + S6.1–S6.7 all GREEN (≥ 21 wizard tests added)
  </acceptance_criteria>

  <done>YearEndWizard + 7 step components ship; wizard sequence + attestation + finalise/unfinalise lifecycle GREEN; Step5Preview correctly embeds Phase-5 renderers by entity type.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: JournalForm finalised-FY guard + useEntities addLog wiring (TDD)</name>
  <files>
    src/components/JournalForm.tsx,
    src/components/__tests__/JournalForm.test.tsx,
    src/hooks/useEntities.ts,
    src/hooks/__tests__/useEntities.test.ts
  </files>

  <read_first>
    - src/components/JournalForm.tsx (entire file — preserve every existing prop and behaviour; add new optional prop `lockedFy`)
    - src/components/__tests__/JournalForm.test.tsx (existing test patterns — extend, don't rewrite)
    - src/hooks/useEntities.ts (entire file — note existing updateEntity signature; widen if needed to support audit emission)
    - src/hooks/__tests__/useEntities.test.ts (existing pattern)
    - src/lib/period.ts (currentFy, fyForDate — used to derive lockedFy from entity.date + entity.returnStatusByFy)
    - src/hooks/useJournals.ts — confirm `reversePosted` signature (existing Phase 4 export; Phase 6 routes finalised-FY corrections through this)
  </read_first>

  <behavior>
    **JournalForm.test.tsx — add new test cases JF.1–JF.4:**
    - Test JF.1: `render(<JournalForm accounts={[...]} onSave={fn} onCancel={fn} />)` (no lockedFy prop) — Save button enabled when form is balanced (existing behaviour unaffected).
    - Test JF.2: `render(<JournalForm ... lockedFy="FY2026" />)` — DOM contains a banner with substring "FY is finalised — use Reverse and Re-post" with `data-testid="locked-fy-banner"`.
    - Test JF.3: With `lockedFy="FY2026"`, the Save button has the `disabled` attribute regardless of form balance state.
    - Test JF.4: With `lockedFy="FY2026"` and an editing original, the Reverse button (if `onReverse` provided) remains enabled (user can still reverse-and-re-post).

    **useEntities.test.ts — add UE.1–UE.2:**
    - Test UE.1: When `updateEntity` is called with an entity whose `returnStatusByFy` changed (new FY finalised), the hook emits the new entity through its state-setter. Does NOT modify entries, accounts, audit logs (PERS-03 invariant).
    - Test UE.2: `updateEntity` accepts the additional fields `returnStatusByFy` and `wizardState` and persists them through to subsequent `entities[]` reads (round-trip).
  </behavior>

  <action>
    Step 1 — Extend src/components/JournalForm.tsx props:
    ```typescript
    interface JournalFormProps {
      // ...existing props (accounts, onSave, onCancel, editingOriginal, onEdit, onReverse, onVoidDraft)...
      /** Phase 6 (UX-01): when set, the entry's FY is finalised — disable Save; banner directs user to Reverse-and-Re-post. */
      lockedFy?: string;
    }
    ```

    Step 2 — Inside the component, after the existing `isBalanced` computation, add:
    ```typescript
    const isLocked = !!lockedFy;
    ```

    Step 3 — Above the existing form (just below the heading/Cancel button area), conditionally render:
    ```typescript
    {isLocked && (
      <div
        data-testid="locked-fy-banner"
        className="bg-amber-50 border border-amber-300 p-3 mb-4 text-sm text-amber-900"
      >
        <strong>FY is finalised — use Reverse and Re-post to correct.</strong>{' '}
        Post-finalise corrections must go through the Reverse workflow so the audit trail remains intact. ({lockedFy})
      </div>
    )}
    ```

    Step 4 — Disable Save (existing button) when `isLocked || !isBalanced || Object.keys(formErrors).length > 0`. The Reverse button (when `onReverse` is set) remains enabled — finalised-FY corrections must still be possible via reverse.

    Step 5 — Update src/hooks/useEntities.ts:
    - Confirm `updateEntity(e: Entity)` correctly persists every field including the new returnStatusByFy + wizardState (since the hook does whole-collection save, no code change should be needed — but VERIFY via test UE.2).
    - If updateEntity strips unknown fields, fix the spread/save logic to preserve them.

    Step 6 — Write JF.1–JF.4 tests extending the existing JournalForm.test.tsx (do NOT rewrite). Use the same RTL pattern (`render`, `screen.getByTestId`, `fireEvent`).

    Step 7 — Write UE.1–UE.2 tests extending the existing useEntities.test.ts. Use the `renderHook` pattern.

    Step 8 — Verify by running tests.
  </action>

  <verify>
    <automated>npx vitest run src/components/__tests__/JournalForm.test.tsx src/hooks/__tests__/useEntities.test.ts --reporter=verbose</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n 'lockedFy' src/components/JournalForm.tsx` returns ≥ 3 matches (prop decl + isLocked computation + banner + save-disabled gate)
    - `grep -n 'data-testid="locked-fy-banner"' src/components/JournalForm.tsx` returns a match
    - `grep -n 'Reverse and Re-post' src/components/JournalForm.tsx` returns a match
    - All JF.1–JF.4 tests GREEN
    - All UE.1–UE.2 tests GREEN
    - Existing JournalForm + useEntities tests remain GREEN (no regressions)
  </acceptance_criteria>

  <done>JournalForm respects finalised-FY lock with visible banner + disabled Save (Reverse button still works); useEntities round-trips returnStatusByFy + wizardState; PERS-03 invariant test confirms no entries/accounts mutation.</done>
</task>

</tasks>

<verification>
- All YearEndWizard + step component tests GREEN
- JournalForm + useEntities extensions GREEN
- Existing Phase 5 renderer tests (TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, PartnershipTaxReturn) remain GREEN — Step5Preview consumes them without modification
- Existing Phase 4 journal lifecycle tests (postDraft, editPosted, reversePosted, voidDraft) remain GREEN
- `npx vitest run` full suite — no regressions; +25–35 new GREEN
- `npm run build` exits 0
- `npm run lint` exits 0
</verification>

<success_criteria>
- src/components/YearEndWizard.tsx + src/components/wizard/{Step1..Step7}.tsx committed and ≥ 21 new tests GREEN
- Wizard advances steps 1 → 7; persists Entity.wizardState[fy].step on every Next click via advanceStep
- Step 4 (unmapped accounts) computes `unmapped` deterministically from accounts × posted entries; hasBlockingIssues = unmapped.length > 0
- Step 6 attestation requires checkbox + case-insensitive entity-name match
- Finalise click writes returnStatusByFy[fy]='finalised' + emits LOCK_FY audit log
- Unfinalise click on a finalised FY writes 'draft' + emits UNLOCK_FY audit log
- JournalForm with `lockedFy="FY2026"` prop renders banner + disables Save; Reverse button still works
- useEntities.updateEntity round-trips returnStatusByFy + wizardState without mutating entries/accounts (PERS-03 invariant)
- Step5Preview embeds Phase-5 renderers by entity.type — zero new tax math
</success_criteria>

<output>
After completion, create `.planning/phases/06-personas-wizard-and-deployment/06-2-SUMMARY.md` documenting:
- Wizard step-by-step behaviour and prop signatures (so Plan 06-3 ViewRouter can wire the wizard route correctly)
- Test count delta
- The `<YearEndWizard>` props contract (Plan 06-3 will mount this from ViewRouter)
- The JournalForm `lockedFy` prop contract (Plan 06-3 will compute it in ViewRouter from active entity)
- Verification command outputs (vitest + lint + build EXIT 0)
</output>
