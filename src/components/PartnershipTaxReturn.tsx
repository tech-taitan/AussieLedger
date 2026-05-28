/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartnershipTaxReturn — Form P renderer.
 * Plan 05-3: full implementation replacing Wave 0 skeleton.
 *
 * Renders:
 *  - PrintBanner (print-only)
 *  - Form P labels (P1 / P2 / P8)
 *  - Item 54 — per-partner distribution table
 *  - Print button (no-print) emitting EXPORT_DATA audit
 *  - AnomalyBadge for each anomaly (including loss-share warning)
 *  - Print footer
 */
import React, { useMemo } from 'react';
import type { Account, AuditAction, Entity, JournalEntry } from '../types';
import type { Period, FyLabel } from '../lib/period';
import { currentFy, today } from '../lib/period';
import { computePartnershipReturn } from '../lib/tax/returns/fy2026/partnership';
import type { DistributedShare } from '../lib/tax/returns/fy2026/trust';
import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
import { AnomalyBadge } from './AnomalyBadge';
import { Decimal } from '../lib/money';
import { PARTNERSHIP_LABELS_FULL } from '../lib/tax/labels/fy2026';
import { LabelTooltip } from './LabelTooltip';

type AddLog = (action: AuditAction, details: string, entityId?: string) => void;

interface PartnershipTaxReturnProps {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  addLog?: AddLog;
  fy?: FyLabel;
}

interface LabelRowProps {
  code: string;
  plainEnglish: string;
  value: Decimal;
  highlight?: boolean;
  helpText?: string;
  labelCode?: string;
}

function LabelRow({ code, plainEnglish, value, highlight, helpText, labelCode }: LabelRowProps): React.JSX.Element {
  return (
    <div
      className={`flex justify-between items-center py-2 px-3 border-b border-gray-100 ${highlight ? 'bg-emerald-50 font-bold' : ''}`}
    >
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono font-bold w-12 text-center">
          {code}
        </span>
        <span className="text-sm">
          {plainEnglish}
          {helpText && labelCode && <LabelTooltip helpText={helpText} labelCode={labelCode} />}
        </span>
      </div>
      <span className={`text-sm font-mono ${highlight ? 'text-emerald-700 font-bold' : ''}`}>
        ${value.toFixed(2)}
      </span>
    </div>
  );
}

/**
 * Form P — Partnership Tax Return renderer.
 *
 * Wraps all content in `.print-form-p` so print.css class-targeting works.
 * Replaces the Wave 0 skeleton shipped in Plan 05-1.
 */
export function PartnershipTaxReturn({
  entity,
  accounts,
  entries,
  period,
  addLog,
  fy: fyProp,
}: PartnershipTaxReturnProps): React.JSX.Element {
  const fy: FyLabel = fyProp ?? (period?.type === 'fy' ? period.fy : currentFy());

  const result = useMemo(
    () => computePartnershipReturn({ entity, accounts, entries, fy }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity, accounts, entries, fy],
  );

  const handlePrint = () => {
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({ entityId: entity.id, form: 'P', fy, timestamp: today().toISOString() }),
      entity.id,
    );
    window.print();
  };

  const zero = new Decimal(0);
  const labels = result.labels;
  const distribution = result.meta.distribution as DistributedShare[];

  return (
    <section className="print-form-p p-4">
      <PrintBanner form="P" entityName={entity.name} fy={fy} locked={result.meta.locked} />

      {/* Screen-mode header + print button */}
      <header className="no-print flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Form P — Partnership Tax Return — {entity.name} ({fy})
        </h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {result.meta.locked ? 'Print finalised return' : 'Print working paper'}
        </button>
      </header>

      {/* Form P Income + expense + net income labels */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">
          Business income &amp; deductions
        </h3>
        <LabelRow code="P1" plainEnglish="Gross income (P1)" value={labels['P1']?.value ?? zero} helpText={PARTNERSHIP_LABELS_FULL['P1'].helpText} labelCode="P1" />
        <LabelRow code="P2" plainEnglish="Total deductions (P2)" value={labels['P2']?.value ?? zero} helpText={PARTNERSHIP_LABELS_FULL['P2'].helpText} labelCode="P2" />
        <LabelRow
          code="P8"
          plainEnglish="Net income or loss (P8)"
          value={labels['P8']?.value ?? zero}
          highlight
          helpText={PARTNERSHIP_LABELS_FULL['P8'].helpText}
          labelCode="P8"
        />
      </section>

      {/* Item 54 — Statement of Distribution per Partner */}
      <section className="mt-6 mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">
          Item 54 — Statement of Distribution per Partner
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 border border-gray-200">Partner</th>
                <th className="text-right px-3 py-2 border border-gray-200">Share %</th>
                <th className="text-right px-3 py-2 border border-gray-200">Total share</th>
              </tr>
            </thead>
            <tbody>
              {distribution.map((d) => {
                const partner = entity.partners?.find((p) => p.id === d.beneficiaryId);
                return (
                  <tr key={d.beneficiaryId} className="border-b border-gray-100">
                    <td className="px-3 py-2 border border-gray-200">{d.name}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">
                      {partner?.sharePercent ?? '—'}%
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.totalShare.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {distribution.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-2 text-gray-400 italic text-center">
                    No partners registered for this partnership.
                  </td>
                </tr>
              )}
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="px-3 py-2 border border-gray-200">
                  <strong>Total</strong>
                </td>
                <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                  <strong>${result.meta.distributionTotal.toFixed(2)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Anomalies */}
      {result.meta.anomalies.length > 0 && (
        <section className="mt-4 mb-4">
          <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Anomalies</h3>
          <ul className="space-y-2">
            {result.meta.anomalies.map((a) => (
              <li key={a.id}>
                <AnomalyBadge severity={a.severity} message={a.message} label={a.label} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>
    </section>
  );
}
