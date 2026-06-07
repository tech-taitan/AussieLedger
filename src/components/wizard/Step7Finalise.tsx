/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step7Finalise — Year-End Wizard Step 7.
 * Summary confirmation + Finalise button. Hard-blocked when hasBlockingIssues.
 */
import React from 'react';
import type { Entity } from '../../types';
import { ProfessionalAdviceBanner } from '../ProfessionalAdviceBanner';

interface Step7FinaliseProps {
  entity: Entity;
  fy: string;
  hasBlockingIssues: boolean;
  onFinalise: () => void;
  onBack: () => void;
}

export function Step7Finalise({
  entity,
  fy,
  hasBlockingIssues,
  onFinalise,
  onBack,
}: Step7FinaliseProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Ready to Finalise</h3>

      <ProfessionalAdviceBanner />

      <div className="bg-gray-50 border border-gray-200 p-4 text-sm">
        <p className="font-medium text-gray-800 mb-1">
          You are about to finalise {fy} for <strong>{entity.name}</strong>.
        </p>
        <p className="text-gray-600">
          Once finalised, journal entries in this financial year will be locked. You can
          unfinalise later using the same attestation process if corrections are needed.
        </p>
      </div>

      {hasBlockingIssues && (
        <div className="bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          <strong>Cannot finalise.</strong> There are unmapped accounts that must be
          resolved first. Return to Step 4.
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          type="button"
          data-testid="wizard-finalise-confirm"
          disabled={hasBlockingIssues}
          onClick={onFinalise}
          className="px-6 py-2 bg-green-700 text-white text-sm font-semibold disabled:opacity-40 hover:bg-green-800 transition-colors"
        >
          Finalise {fy}
        </button>
      </div>
    </div>
  );
}
