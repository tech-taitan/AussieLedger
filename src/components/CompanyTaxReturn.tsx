/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CompanyTaxReturn — Phase 5 Plan 05-2 refactor.
 * Form C (NAT 0656) renderer with:
 *   - Print button + EXPORT_DATA audit emission
 *   - BRE rate selection with explicit basis text
 *   - Franking account section (opening/movements/closing)
 *   - Inline + consolidated AnomalyBadges
 *   - print-form-c CSS scope
 *
 * Prop contract backward-compatible: entity? optional for smoke-test compat.
 */
import React, { useMemo } from 'react';
import type { Account, Entity, JournalEntry, AuditAction } from '../types';
import type { FyLabel, Period } from '../lib/period';
import { currentFy, today } from '../lib/period';
import { computeCompanyReturn } from '../lib/tax/returns/fy2026/company';
import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
import { AnomalyBadge } from './AnomalyBadge';
import { COMPANY_LABELS_FULL } from '../lib/tax/labels/fy2026';
import type { CompanyLabel } from '../lib/tax/labels/fy2026';
import { LabelTooltip } from './LabelTooltip';
import type { Anomaly } from '../lib/tax/returns/fy2026/types';
import type { Decimal } from '../lib/money';

// ── Prop contract ──────────────────────────────────────────────────────────

interface CompanyTaxReturnProps {
  /** Phase 5 (required for compute). Optional for legacy callers. */
  entity?: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
  /** Phase 5 addition. Defaults to currentFy() if not supplied. */
  fy?: FyLabel;
  /** Phase 2 legacy prop — kept for smoke test compatibility. */
  onUpdateAccount?: (account: Account) => void;
}

// ── LabelRow helper ───────────────────────────────────────────────────────

interface LabelRowProps {
  code: string;
  plainEnglish: string;
  value: Decimal | undefined;
  anomalies?: Anomaly[];
  highlight?: boolean;
  helpText?: string;
  labelCode?: string;
}

function LabelRow({ code, plainEnglish, value, anomalies, highlight, helpText, labelCode }: LabelRowProps) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 py-1 border-b border-gray-100 ${highlight ? 'font-bold' : ''}`}
    >
      <span className="font-mono text-xs text-gray-500">{code}</span>
      <span className="text-sm">
        {plainEnglish}
        {helpText && labelCode && <LabelTooltip helpText={helpText} labelCode={labelCode} />}
      </span>
      <span className="text-sm text-right font-mono">
        ${value?.toFixed(2) ?? '0.00'}
      </span>
      {anomalies && anomalies.length > 0 && (
        <div className="col-span-3 flex flex-wrap gap-1 mt-1">
          {anomalies.map((a) => (
            <span key={a.id}>
              <AnomalyBadge severity={a.severity} message={a.message} label={a.label} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Default entity ─────────────────────────────────────────────────────────

const DEFAULT_ENTITY: Entity = {
  _v: 4,
  id: 'unknown',
  name: 'Unknown Company',
  type: 'Company',
  status: 'Active',
};

// ── Main component ────────────────────────────────────────────────────────

export const CompanyTaxReturn: React.FC<CompanyTaxReturnProps> = ({
  entity: entityProp,
  accounts,
  entries,
  period,
  addLog,
  fy,
}) => {
  const entity: Entity = entityProp ?? DEFAULT_ENTITY;
  const effectiveFy: FyLabel = fy ?? (
    period?.type === 'fy' ? period.fy : currentFy()
  );

  const result = useMemo(
    () => computeCompanyReturn({ entity, accounts, entries, fy: effectiveFy }),
    [entity, accounts, entries, effectiveFy],
  );

  const isLocked = result.meta.locked;

  const handlePrint = () => {
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({ entityId: entity.id, form: 'C', fy: effectiveFy, timestamp: today().toISOString() }),
      entity.id,
    );
    window.print();
  };

  // Build inline anomalies map by label code
  const inlineAnomaliesByLabel: Record<string, Anomaly[]> = {};
  for (const a of result.meta.anomalies) {
    if (a.label) {
      (inlineAnomaliesByLabel[a.label] ??= []).push(a);
    }
  }

  const getLabel = (code: CompanyLabel) => COMPANY_LABELS_FULL[code];
  const L = result.labels;
  const taxRatePct = Math.round(Number(result.meta.taxRate) * 100);

  return (
    <section className="print-form-c p-4">
      {/* Print-only banner */}
      <PrintBanner form="C" entityName={entity.name} fy={effectiveFy} locked={isLocked} />

      {/* Screen header */}
      <header className="no-print flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Form C — {entity.name} ({effectiveFy})</h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 transition-colors"
        >
          {isLocked ? 'Print finalised return' : 'Print working paper'}
        </button>
      </header>

      {/* Applied Tax Rate box (prominent) */}
      <div className="border border-indigo-300 bg-indigo-50 rounded p-3 mb-4">
        <strong className="text-lg">{taxRatePct}% applied</strong>
        <br />
        <em className="text-sm text-gray-600">{result.meta.taxRateBasis as string}</em>
      </div>

      {/* Income labels */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Income (NAT 0656)</h3>
        <LabelRow code="6A" plainEnglish={getLabel('6A').plainEnglish} value={L['6A']?.value} helpText={getLabel('6A').helpText} labelCode="6A" />
        <LabelRow code="6F" plainEnglish={getLabel('6F').plainEnglish} value={L['6F']?.value} />
        <LabelRow code="6H" plainEnglish={getLabel('6H').plainEnglish} value={L['6H']?.value} />
        <LabelRow code="6T" plainEnglish={getLabel('6T').plainEnglish} value={L['6T']?.value} highlight />
      </section>

      {/* Expense labels */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Expenses</h3>
        <LabelRow code="6C" plainEnglish={getLabel('6C').plainEnglish} value={L['6C']?.value} />
        <LabelRow code="6G" plainEnglish={getLabel('6G').plainEnglish} value={L['6G']?.value} />
        <LabelRow code="6X" plainEnglish={getLabel('6X').plainEnglish} value={L['6X']?.value} />
        <LabelRow code="6S" plainEnglish={getLabel('6S').plainEnglish} value={L['6S']?.value} highlight helpText={getLabel('6S').helpText} labelCode="6S" />
      </section>

      {/* Taxable income */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Taxable Income</h3>
        <LabelRow code="7T" plainEnglish={getLabel('7T').plainEnglish} value={L['7T']?.value} highlight helpText={getLabel('7T').helpText} labelCode="7T" />
        <LabelRow code="CS_B" plainEnglish={getLabel('CS_B').plainEnglish} value={L['CS_B']?.value} highlight />
      </section>

      {/* Franking Account */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Franking Account</h3>
        <LabelRow
          code="Opening"
          plainEnglish={getLabel('franking_open').plainEnglish}
          value={L['franking_open']?.value}
        />
        <LabelRow
          code="Movements"
          plainEnglish={getLabel('franking_move').plainEnglish}
          value={L['franking_move']?.value}
        />
        <LabelRow
          code="Closing"
          plainEnglish={getLabel('franking_close').plainEnglish}
          value={L['franking_close']?.value}
          highlight
        />
      </section>

      {/* Consolidated Anomalies */}
      {result.meta.anomalies.length > 0 && (
        <section className="mt-4 border border-gray-200 p-3 rounded">
          <h3 className="text-sm font-bold mb-2">Notices &amp; Anomalies</h3>
          <ul className="space-y-1">
            {result.meta.anomalies.map((a) => (
              <li key={a.id}>
                <AnomalyBadge severity={a.severity} message={a.message} label={a.label} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Print-only footer */}
      <footer className="print-footer print-only">{FOOTER_DISCLAIMER}</footer>
    </section>
  );
};
