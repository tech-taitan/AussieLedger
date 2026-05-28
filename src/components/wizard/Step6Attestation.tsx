/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step6Attestation — Year-End Wizard Step 6.
 * Checkbox + typed entity-name attestation before finalise.
 * Case-insensitive name match required.
 * Finalise button disabled until: checkbox checked AND name matches AND no blocking issues.
 */
import React, { useState } from 'react';
import type { Entity } from '../../types';

interface Step6AttestationProps {
  entity: Entity;
  hasBlockingIssues: boolean;
  onBack: () => void;
  onConfirm: () => void;
}

export function Step6Attestation({
  entity,
  hasBlockingIssues,
  onBack,
  onConfirm,
}: Step6AttestationProps): React.JSX.Element {
  const [checked, setChecked] = useState(false);
  const [typedName, setTypedName] = useState('');

  const nameMatches =
    typedName.trim().toLowerCase() === entity.name.trim().toLowerCase();
  const canFinalise = checked && nameMatches && !hasBlockingIssues;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Attestation</h3>

      {hasBlockingIssues && (
        <div className="bg-yellow-50 border border-yellow-300 p-3 text-sm text-yellow-900">
          <strong>Unmapped accounts must be resolved before finalising.</strong>
          {' '}Return to Step 4 to map all accounts with missing tax labels.
        </div>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-4 w-4 cursor-pointer"
        />
        <span className="text-sm text-gray-700">
          I confirm these are genuine business transactions and the figures match my records
          for the period.
        </span>
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Type the legal name of this entity to confirm:
        </label>
        <input
          type="text"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={entity.name}
          className="w-full border border-[var(--line)] p-2 text-sm focus:outline-none focus:border-[var(--ink)]"
        />
        {typedName.length > 0 && !nameMatches && (
          <p className="text-xs text-red-600 mt-1">
            Name does not match. Expected: <strong>{entity.name}</strong>
          </p>
        )}
      </div>

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
          data-testid="wizard-finalise"
          disabled={!canFinalise}
          onClick={onConfirm}
          className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          Proceed to Finalise
        </button>
      </div>
    </div>
  );
}
