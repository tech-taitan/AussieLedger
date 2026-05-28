/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * YearEndWizard — scaffold component (full implementation lands in Plan 06-2).
 * Provides the step-machine interface for TDD GREEN in Plan 06-1.
 */

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

export function YearEndWizard({
  entity,
  fy,
  onUpdateEntity,
}: YearEndWizardProps): React.JSX.Element {
  const step = entity.wizardState?.[fy]?.step ?? 1;

  return (
    <div className="space-y-6">
      <div
        data-testid="wizard-step-indicator"
        className="text-sm font-bold"
      >
        Year-End Wizard — Step {step} of 7
      </div>

      <div className="bg-white border border-gray-200 p-6">
        <p className="text-gray-600">
          Wizard step content lands in Plan 06-2.
        </p>
      </div>

      <button
        type="button"
        data-testid="wizard-next"
        onClick={() => onUpdateEntity(advanceStep(entity, fy, step + 1))}
        className="px-4 py-2 bg-gray-900 text-white font-bold rounded hover:bg-gray-700 transition-colors"
      >
        Next
      </button>
    </div>
  );
}
