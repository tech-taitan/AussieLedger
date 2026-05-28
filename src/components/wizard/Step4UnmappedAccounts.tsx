/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Step4UnmappedAccounts — Year-End Wizard Step 4.
 * Lists accounts referenced in posted entries with no tax-label mapping.
 * HARD BLOCK on Finalise when unmapped.length > 0 (via data-blocking attribute).
 * User CAN still advance to Step 5 (preview) — gate is only on Finalise.
 */
import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { Account } from '../../types';

interface Step4UnmappedAccountsProps {
  unmapped: Account[];
  onNavigateToAccount: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step4UnmappedAccounts({
  unmapped,
  onNavigateToAccount,
  onBack,
  onNext,
}: Step4UnmappedAccountsProps): React.JSX.Element {
  const hasBlocking = unmapped.length > 0;

  return (
    <div data-testid="step4-root" data-blocking={hasBlocking ? 'true' : 'false'} className="space-y-4">
      <h3 className="text-lg font-semibold">Unmapped Accounts</h3>

      {!hasBlocking ? (
        <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
          <CheckCircle className="text-green-600" size={18} />
          <span>All accounts mapped.</span>
        </div>
      ) : (
        <>
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-3">
            <strong>{unmapped.length} account{unmapped.length !== 1 ? 's' : ''} need tax-label mapping</strong>
            {' '}before you can finalise. Use the "Map this account" button to open the Chart of Accounts mapper.
          </div>

          <ul className="space-y-2">
            {unmapped.map((account) => (
              <li
                key={account.id}
                data-testid="unmapped-row"
                className="flex items-center justify-between border border-gray-200 p-3 bg-white text-sm"
              >
                <span className="text-gray-800">
                  <span className="font-mono text-gray-500 mr-2">{account.code}</span>
                  {account.name}
                </span>
                <button
                  type="button"
                  data-testid={`unmapped-map-${account.id}`}
                  onClick={() => onNavigateToAccount(account.id)}
                  className="px-3 py-1 border border-[var(--ink)] text-xs font-medium hover:bg-gray-50"
                >
                  Map this account
                </button>
              </li>
            ))}
          </ul>
        </>
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
          onClick={onNext}
          className="px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium hover:opacity-90"
        >
          Next (Preview Return)
        </button>
      </div>
    </div>
  );
}
