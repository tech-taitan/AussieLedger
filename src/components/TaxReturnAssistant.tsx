/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaxReturnAssistant — Phase 5 Plan 05-2 refactor.
 * Form I (NAT 2541) + B&P schedule (NAT 2543) renderer with:
 *   - Print button + EXPORT_DATA audit emission
 *   - Assumptions block
 *   - Inline + consolidated AnomalyBadges
 *   - IND-04 small-biz offset line (item7D)
 *   - print-form-i CSS scope
 *
 * Prop contract backward-compatible with Phase 2 (entity/accounts/entries/period/addLog).
 * Phase 5 adds optional `fy?: FyLabel` and `entity` (required for compute).
 */
import React, { useMemo } from 'react';
import type { Account, Entity, JournalEntry, AuditAction } from '../types';
import type { FyLabel, Period } from '../lib/period';
import { currentFy, today } from '../lib/period';
import { computeIndividualReturn } from '../lib/tax/returns/fy2026/individual';
import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
import { AnomalyBadge } from './AnomalyBadge';
import { AssumptionsBlock } from './AssumptionsBlock';
import { INDIVIDUAL_LABELS_FULL } from '../lib/tax/labels/fy2026';
import type { IndividualLabel } from '../lib/tax/labels/fy2026';
import type { Anomaly } from '../lib/tax/returns/fy2026/types';
import type { Decimal } from '../lib/money';

// ── Prop contract ──────────────────────────────────────────────────────────

interface TaxReturnAssistantProps {
  /** Phase 5 (required for compute). Omitted in Phase 2 legacy callers — treated as an unknown Individual. */
  entity?: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
  /** Phase 5 addition (additive). Defaults to currentFy() if not supplied. */
  fy?: FyLabel;
  /** Phase 2 legacy prop — kept for smoke test compatibility, ignored by Phase 5 logic. */
  onUpdateAccount?: (account: Account) => void;
}

// ── LabelRow helper ───────────────────────────────────────────────────────

interface LabelRowProps {
  code: string;
  plainEnglish: string;
  value: Decimal | undefined;
  anomalies?: Anomaly[];
  highlight?: boolean;
}

function LabelRow({ code, plainEnglish, value, anomalies, highlight }: LabelRowProps) {
  return (
    <div
      className={`grid grid-cols-3 gap-2 py-1 border-b border-gray-100 ${highlight ? 'font-bold' : ''}`}
    >
      <span className="font-mono text-xs text-gray-500">{code}</span>
      <span className="text-sm">{plainEnglish}</span>
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

// ── Main component ────────────────────────────────────────────────────────

/** Default placeholder entity for legacy callers that don't supply entity */
const DEFAULT_ENTITY: Entity = {
  _v: 4,
  id: 'unknown',
  name: 'Unknown Entity',
  type: 'Individual',
  status: 'Active',
};

export const TaxReturnAssistant: React.FC<TaxReturnAssistantProps> = ({
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
    () => computeIndividualReturn({ entity, accounts, entries, fy: effectiveFy }),
    [entity, accounts, entries, effectiveFy],
  );

  const isLocked = result.meta.locked;

  const handlePrint = () => {
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({ entityId: entity.id, form: 'I', fy: effectiveFy, timestamp: today().toISOString() }),
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

  const getLabel = (code: IndividualLabel) => INDIVIDUAL_LABELS_FULL[code];
  const L = result.labels;

  return (
    <section className="print-form-i p-4">
      {/* Print-only banner — hidden on screen */}
      <PrintBanner form="I" entityName={entity.name} fy={effectiveFy} locked={isLocked} />

      {/* Screen header — hidden on print */}
      <header className="no-print flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Form I — {entity.name} ({effectiveFy})</h2>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
        >
          {isLocked ? 'Print finalised return' : 'Print working paper'}
        </button>
      </header>

      {/* Main Return — Item 15 flow-through */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">Main Return (NAT 2541)</h3>
        <LabelRow
          code="Item 15"
          plainEnglish={getLabel('item15').plainEnglish}
          value={L.item15?.value}
          anomalies={inlineAnomaliesByLabel['item15']}
          highlight
        />

        {/* Tax computation rows */}
        <div className="mt-2">
          <h4 className="text-xs font-bold uppercase text-gray-400 mb-1">Tax Calculation</h4>
          <LabelRow
            code="Marginal tax"
            plainEnglish="Tax before offsets"
            value={result.meta.taxBeforeOffsets as Decimal}
          />
          <LabelRow
            code={getLabel('T1').natReference?.split(' ').pop() ?? 'T1'}
            plainEnglish={getLabel('T1').plainEnglish}
            value={L.T1?.value}
          />
          <LabelRow
            code={getLabel('M1').natReference?.split(' ').pop() ?? 'M1'}
            plainEnglish={getLabel('M1').plainEnglish}
            value={L.M1?.value}
          />
          <LabelRow
            code={getLabel('M2').natReference?.split(' ').pop() ?? 'M2'}
            plainEnglish={getLabel('M2').plainEnglish}
            value={L.M2?.value}
          />
          <LabelRow
            code="item7D"
            plainEnglish={getLabel('item7D').plainEnglish}
            value={L.item7D?.value}
            anomalies={inlineAnomaliesByLabel['item7D']}
          />
          <LabelRow
            code="Tax payable"
            plainEnglish="Estimated tax payable (after offsets)"
            value={result.meta.taxAfterOffsets as Decimal}
            highlight
          />
        </div>
      </section>

      {/* B&P Schedule */}
      <section className="mb-6">
        <h3 className="text-sm font-bold uppercase text-gray-500 mb-2">
          Business &amp; Professional Items Schedule (NAT 2543)
        </h3>
        <LabelRow
          code="P1"
          plainEnglish={getLabel('P1').plainEnglish}
          value={L.P1?.value}
          anomalies={inlineAnomaliesByLabel['P1']}
        />
        <LabelRow
          code="P2"
          plainEnglish={getLabel('P2').plainEnglish}
          value={L.P2?.value}
          anomalies={inlineAnomaliesByLabel['P2']}
        />
        <LabelRow
          code="P8"
          plainEnglish={getLabel('P8').plainEnglish}
          value={L.P8?.value}
          anomalies={inlineAnomaliesByLabel['P8']}
          highlight
        />
        <div className="ml-4 mt-1">
          {(['B', 'C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'N'] as IndividualLabel[]).map((code) => {
            const labelEntry = L[code];
            if (!labelEntry?.value.greaterThan(0)) return null;
            return (
              <div key={code}>
                <LabelRow
                  code={code}
                  plainEnglish={getLabel(code).plainEnglish}
                  value={labelEntry.value}
                  anomalies={inlineAnomaliesByLabel[code]}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Assumptions block — always shown for Individual */}
      <AssumptionsBlock />

      {/* Consolidated Anomalies section */}
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
