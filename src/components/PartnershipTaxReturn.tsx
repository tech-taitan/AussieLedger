/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import type { Account, Entity, JournalEntry, AuditAction } from '../types';
import type { Period, FyLabel } from '../lib/period';
import { currentFy } from '../lib/period';
import { computePartnershipReturn } from '../lib/tax/returns/fy2026/partnership';

type AddLog = (action: AuditAction, details: string, entityId?: string) => void;

interface PartnershipTaxReturnProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  addLog?: AddLog;
}

/**
 * Form P (Partnership) tax return renderer.
 *
 * Phase 5 Wave 0: skeleton — Plan 05-3 implements the full Form P layout
 * (P1/P2/P8 labels + per-partner distribution table + Print button + audit emission).
 *
 * This skeleton is shipped so ViewRouter can import + route to it without compile errors.
 * The "Pending Phase 5 Plan 05-3" heading is intentional — it makes the placeholder
 * visible to anyone running the app between Plan 05-1 and Plan 05-3.
 */
export function PartnershipTaxReturn({
  entity,
  accounts,
  entries,
  period,
}: PartnershipTaxReturnProps): React.JSX.Element {
  // Touch the compute function to validate the import path and types compile.
  const fy: FyLabel = period?.type === 'fy' ? period.fy : currentFy();
  const _result = computePartnershipReturn({ entity, accounts, entries, fy });
  void _result;

  return (
    <section className="print-form-p p-4">
      <h2 className="text-xl font-bold">Form P — Partnership Tax Return</h2>
      <p className="text-sm italic text-gray-500">
        Pending Phase 5 Plan 05-3 implementation. Entity: {entity.name} (FY: {fy}).
      </p>
    </section>
  );
}
