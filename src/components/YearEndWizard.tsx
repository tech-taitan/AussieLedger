/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YearEndWizard — 7-step year-end orchestrator.
 *
 * Wires advanceStep / finaliseEntity / unfinaliseEntity from persona.ts.
 * Embeds Phase-5 renderers in Step 5 — zero new tax math.
 * Emits LOCK_FY / UNLOCK_FY audit log events on finalise / unfinalise.
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

// ── Props ──────────────────────────────────────────────────────────────────

interface YearEndWizardProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  /** Defaults to currentFy() if not supplied. */
  fy?: string;
  onUpdateEntity: (e: Entity) => void;
  onAddLog?: (log: Omit<AuditLog, 'id' | 'timestamp' | 'user'>) => void;
  onNavigateToAccount?: (accountId: string) => void;
}

// ── Unfinalise section ─────────────────────────────────────────────────────

interface UnfinaliseSectionProps {
  entity: Entity;
  fy: string;
  onUnfinalise: () => void;
}

function UnfinaliseSection({
  entity,
  fy,
  onUnfinalise,
}: UnfinaliseSectionProps): React.JSX.Element {
  return (
    <div className="bg-amber-50 border border-amber-300 p-4 space-y-3">
      <p className="text-sm font-medium text-amber-900">
        {fy} is finalised for <strong>{entity.name}</strong>.
      </p>
      <p className="text-xs text-amber-700">
        To make corrections to finalised entries, unfinalise the FY first. Journal entries
        in a finalised FY require the Reverse-and-Re-post workflow.
      </p>
      <button
        type="button"
        data-testid="wizard-unfinalise"
        onClick={onUnfinalise}
        className="px-4 py-2 border border-amber-700 text-amber-900 text-sm font-medium hover:bg-amber-100"
      >
        Unfinalise {fy}
      </button>
    </div>
  );
}

// ── Main wizard orchestrator ───────────────────────────────────────────────

export function YearEndWizard({
  entity,
  accounts,
  entries,
  fy: fyProp,
  onUpdateEntity,
  onAddLog,
  onNavigateToAccount,
}: YearEndWizardProps): React.JSX.Element {
  const fy = fyProp ?? currentFy();
  const step = entity.wizardState?.[fy]?.step ?? 1;
  const status = entity.returnStatusByFy?.[fy] ?? 'draft';

  // Compute unmapped accounts: Revenue/Expense rows referenced in posted entries
  // whose ENTITY-SPECIFIC tax label is missing. Company entities need
  // companyTaxLabel; Trust → trustTaxLabel; Partnership → partnershipTaxLabel;
  // Individual / Sole Trader → taxLabel. Asset/Liability/Equity rows are
  // never tax-return inputs so they're excluded.
  const unmappedAccounts = useMemo(() => {
    const postedAccountIds = new Set<string>();
    for (const entry of entries) {
      const isPostedEntry =
        entry.status === 'posted' || (entry.status === undefined && entry.isPosted);
      if (!isPostedEntry) continue;
      for (const line of entry.lines) {
        postedAccountIds.add(line.accountId);
      }
    }
    const labelField: keyof Account =
      entity.type === 'Company'      ? 'companyTaxLabel' :
      entity.type === 'Trust'        ? 'trustTaxLabel' :
      entity.type === 'Partnership'  ? 'partnershipTaxLabel' :
                                       'taxLabel';
    return accounts.filter(
      (a) =>
        postedAccountIds.has(a.id) &&
        (a.type === 'Revenue' || a.type === 'Expense') &&
        !a[labelField],
    );
  }, [accounts, entries, entity.type]);

  const hasBlockingIssues = unmappedAccounts.length > 0;

  const goToStep = (n: number) => onUpdateEntity(advanceStep(entity, fy, n));
  const back = () => goToStep(Math.max(1, step - 1));

  const handleFinalise = () => {
    onUpdateEntity(finaliseEntity(entity, fy));
    onAddLog?.({
      action: 'LOCK_FY',
      entityId: entity.id,
      details: `Finalised ${fy} for ${entity.name}`,
    });
  };

  const handleUnfinalise = () => {
    onUpdateEntity(unfinaliseEntity(entity, fy));
    onAddLog?.({
      action: 'UNLOCK_FY',
      entityId: entity.id,
      details: `Unfinalised ${fy} for ${entity.name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div
        data-testid="wizard-step-indicator"
        className="text-sm font-bold text-gray-800"
      >
        Year-End Wizard — Step {step} of 7 — {entity.name} {fy}
        {status === 'finalised' && (
          <span className="ml-2 text-green-700 font-semibold">[FINALISED]</span>
        )}
      </div>

      {/* Unfinalise section — only visible when FY is finalised */}
      {status === 'finalised' && (
        <UnfinaliseSection
          entity={entity}
          fy={fy}
          onUnfinalise={handleUnfinalise}
        />
      )}

      {/* Step content */}
      {step === 1 && (
        <Step1Confirm
          entity={entity}
          fy={fy}
          entries={entries}
          onNext={() => goToStep(2)}
        />
      )}

      {step === 2 && (
        <Step2Unreconciled
          entries={entries}
          onBack={back}
          onNext={() => goToStep(3)}
        />
      )}

      {step === 3 && (
        <Step3GstCodes
          accounts={accounts}
          onBack={back}
          onNext={() => goToStep(4)}
        />
      )}

      {step === 4 && (
        <div data-testid="wizard-step-4-unmapped">
          <Step4UnmappedAccounts
            unmapped={unmappedAccounts}
            onNavigateToAccount={onNavigateToAccount ?? (() => { /* no-op */ })}
            onBack={back}
            onNext={() => goToStep(5)}
          />
        </div>
      )}

      {step === 5 && (
        <Step5Preview
          entity={entity}
          accounts={accounts}
          entries={entries}
          onBack={back}
          onNext={() => goToStep(6)}
        />
      )}

      {step === 6 && (
        <Step6Attestation
          entity={entity}
          hasBlockingIssues={hasBlockingIssues}
          onBack={back}
          onConfirm={handleFinalise}
        />
      )}

      {step === 7 && (
        <Step7Finalise
          entity={entity}
          fy={fy}
          hasBlockingIssues={hasBlockingIssues}
          onFinalise={handleFinalise}
          onBack={back}
        />
      )}

      {/* Global Next button for step advancement (supports W.3/W.4 from scaffold tests) */}
      <button
        type="button"
        data-testid="wizard-next"
        disabled={step >= 7}
        onClick={() => goToStep(step + 1)}
        className="px-4 py-2 bg-[var(--ink)] text-white font-bold disabled:opacity-50 hover:opacity-90 transition-opacity"
      >
        Next
      </button>
    </div>
  );
}
