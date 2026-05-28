/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TrustTaxReturn — Form T renderer.
 * Plan 05-3: full implementation replacing Phase 2 placeholder.
 *
 * Renders:
 *  - PrintBanner (print-only)
 *  - Form T labels (5B / 5E / 5F / 5L / 5M / 5N / 5S / 5T / 11J / 26 / 56)
 *  - Item 57 — per-beneficiary distribution table
 *  - Mandatory streaming disclaimer (always visible, screen + print)
 *  - Print button (no-print) emitting EXPORT_DATA audit
 *  - Anomaly badges
 *  - Print footer
 */
import React, { useMemo } from 'react';
import type { Account, AuditAction, Entity, JournalEntry } from '../types';
import type { Period, FyLabel } from '../lib/period';
import { currentFy, today } from '../lib/period';
import { computeTrustReturn } from '../lib/tax/returns/fy2026/trust';
import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
import { AnomalyBadge } from './AnomalyBadge';
import { Decimal } from '../lib/money';
import { TRUST_LABELS_FULL } from '../lib/tax/labels/fy2026';
import { LabelTooltip } from './LabelTooltip';

type AddLog = (action: AuditAction, details: string, entityId?: string) => void;

interface TrustTaxReturnProps {
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
 * Form T — Trust Tax Return renderer.
 *
 * Wraps all content in `.print-form-t` so print.css class-targeting works.
 * The mandatory streaming disclaimer is rendered in both screen and print modes.
 */
export function TrustTaxReturn({
  entity,
  accounts,
  entries,
  period,
  addLog,
  fy: fyProp,
}: TrustTaxReturnProps): React.JSX.Element {
  const fy: FyLabel = fyProp ?? (period?.type === 'fy' ? period.fy : currentFy());

  const result = useMemo(
    () => computeTrustReturn({ entity, accounts, entries, fy }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity, accounts, entries, fy],
  );

  const handlePrint = () => {
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({ entityId: entity.id, form: 'T', fy, timestamp: today().toISOString() }),
      entity.id,
    );
    window.print();
  };

  const zero = new Decimal(0);

  const labels = result.labels;

  return (
    <section className="print-form-t p-4">
      <PrintBanner form="T" entityName={entity.name} fy={fy} locked={result.meta.locked} />

      {/* Screen-mode header + print button */}
      <header className="no-print flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">
          Form T — {entity.name} ({fy})
        </h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
        >
          {result.meta.locked ? 'Print finalised return' : 'Print working paper'}
        </button>
      </header>

      {/* Mandatory streaming disclaimer — ALWAYS visible (screen + print) */}
      <aside
        className="streaming-disclaimer border-2 border-red-400 p-4 my-4 bg-red-50 rounded"
        data-testid="streaming-disclaimer"
      >
        <p className="text-sm text-red-800">{result.meta.streamingDisclaimer}</p>
      </aside>

      {/* Form T Income labels */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">
          Business income &amp; interest
        </h3>
        <LabelRow code="5B" plainEnglish="Gross payments (5B)" value={labels['5B']?.value ?? zero} />
        <LabelRow code="11J" plainEnglish="Gross interest (11J)" value={labels['11J']?.value ?? zero} />
        <LabelRow
          code="5T"
          plainEnglish="Net business income (5T)"
          value={labels['5T']?.value ?? zero}
          highlight
          helpText={TRUST_LABELS_FULL['5T'].helpText}
          labelCode="5T"
        />
      </section>

      {/* Form T Expense labels */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Business expenses</h3>
        <LabelRow code="5E" plainEnglish="Cost of sales (5E)" value={labels['5E']?.value ?? zero} />
        <LabelRow code="5F" plainEnglish="Rent (5F)" value={labels['5F']?.value ?? zero} />
        <LabelRow code="5L" plainEnglish="Superannuation (5L)" value={labels['5L']?.value ?? zero} />
        <LabelRow code="5M" plainEnglish="Salaries and wages (5M)" value={labels['5M']?.value ?? zero} />
        <LabelRow code="5N" plainEnglish="All other expenses (5N)" value={labels['5N']?.value ?? zero} />
        <LabelRow
          code="5S"
          plainEnglish="Total expenses (5S)"
          value={labels['5S']?.value ?? zero}
          highlight
        />
      </section>

      {/* Net income */}
      <section className="mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">Net income</h3>
        <LabelRow
          code="26"
          plainEnglish="Net income or loss (item 26)"
          value={labels['26']?.value ?? zero}
          highlight
          helpText={TRUST_LABELS_FULL['26'].helpText}
          labelCode="26"
        />
        <LabelRow
          code="56"
          plainEnglish="Total trust net income (item 56)"
          value={labels['56']?.value ?? zero}
          highlight
        />
      </section>

      {/* Item 57 — Statement of Distribution */}
      <section className="mt-6 mb-6">
        <h3 className="font-semibold text-sm uppercase text-gray-500 mb-2">
          Item 57 — Statement of Distribution
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-3 py-2 border border-gray-200">Beneficiary</th>
                <th className="text-right px-3 py-2 border border-gray-200">Share %</th>
                <th className="text-right px-3 py-2 border border-gray-200">Total share</th>
                <th className="text-right px-3 py-2 border border-gray-200">Ordinary</th>
                <th className="text-right px-3 py-2 border border-gray-200">Interest</th>
                <th className="text-right px-3 py-2 border border-gray-200">Dividend</th>
                <th className="text-right px-3 py-2 border border-gray-200">Capital gain</th>
                <th className="text-right px-3 py-2 border border-gray-200">Foreign</th>
                <th className="text-right px-3 py-2 border border-gray-200">Other</th>
              </tr>
            </thead>
            <tbody>
              {result.meta.distribution.map((d) => {
                const beneficiary = entity.beneficiaries?.find((b) => b.id === d.beneficiaryId);
                return (
                  <tr key={d.beneficiaryId} className="border-b border-gray-100">
                    <td className="px-3 py-2 border border-gray-200">{d.name}</td>
                    <td className="text-right px-3 py-2 border border-gray-200">
                      {beneficiary?.sharePercent ?? '—'}%
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.totalShare.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.ordinary.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.interest.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.dividend.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.capitalGain.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.foreign.toFixed(2)}
                    </td>
                    <td className="text-right px-3 py-2 border border-gray-200 font-mono">
                      ${d.components.other.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
              {result.meta.distribution.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-2 text-gray-400 italic text-center">
                    No beneficiaries registered for this trust.
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
                <td colSpan={6} className="px-3 py-2 border border-gray-200" />
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
