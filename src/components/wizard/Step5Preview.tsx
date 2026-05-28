/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step5Preview — Year-End Wizard Step 5.
 * Embeds the Phase-5 renderer for the entity's type.
 * Zero new tax math — this is a thin orchestrator.
 */
import React from 'react';
import type { Entity, Account, JournalEntry } from '../../types';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import { CompanyTaxReturn } from '../CompanyTaxReturn';
import { TrustTaxReturn } from '../TrustTaxReturn';
import { PartnershipTaxReturn } from '../PartnershipTaxReturn';

interface Step5PreviewProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  onBack: () => void;
  onNext: () => void;
}

export function Step5Preview({
  entity,
  accounts,
  entries,
  onBack,
  onNext,
}: Step5PreviewProps): React.JSX.Element {
  let renderer: React.ReactNode;

  if (entity.type === 'Individual') {
    renderer = (
      <TaxReturnAssistant
        accounts={accounts}
        entries={entries}
        entity={entity}
      />
    );
  } else if (entity.type === 'Company') {
    renderer = (
      <CompanyTaxReturn
        accounts={accounts}
        entries={entries}
        entity={entity}
      />
    );
  } else if (entity.type === 'Trust') {
    renderer = (
      <TrustTaxReturn
        entity={entity}
        accounts={accounts}
        entries={entries}
      />
    );
  } else if (entity.type === 'Partnership') {
    renderer = (
      <PartnershipTaxReturn
        entity={entity}
        accounts={accounts}
        entries={entries}
      />
    );
  } else {
    renderer = <p className="text-gray-500 text-sm">Unknown entity type.</p>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Preview Return</h3>
      <div className="border border-gray-200 p-4">
        {renderer}
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
          onClick={onNext}
          className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium hover:opacity-90"
        >
          Next (Attestation)
        </button>
      </div>
    </div>
  );
}
