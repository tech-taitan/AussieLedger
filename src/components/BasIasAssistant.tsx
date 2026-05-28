/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BasIasAssistant — Phase 5 Plan 05-4 refactor.
 * BAS (Business Activity Statement) and IAS (Instalment Activity Statement) renderer.
 *
 * Dispatches:
 *   - entity.gstRegistered === false → IAS shape (PAYG labels only)
 *   - else                          → BAS shape (Simpler BAS lodgement + internal-only section)
 *
 * Features:
 *   - Period selector (Full FY / Q1 / Q2 / Q3 / Q4), default Q1
 *   - Print button emitting EXPORT_DATA audit log
 *   - PrintBanner (print-only)
 *   - Simpler BAS lodgement section: G1, 1A, 1B, W1, W2, T7
 *   - Internal-only section (BAS only): G2, G3, G10, G11 — NOT lodged
 *   - IAS section: W1, W2, W3, W4, W5, T7
 *   - Anomaly badges
 *   - Print footer (FOOTER_DISCLAIMER)
 */
import React, { useState, useMemo } from 'react';
import type { Account, AuditAction, Entity, JournalEntry } from '../types';
import type { Period, FyLabel } from '../lib/period';
import { currentFy, today } from '../lib/period';
import { computeBas } from '../lib/tax/returns/fy2026/bas';
import { computeIas } from '../lib/tax/returns/fy2026/ias';
import type { BasReturn } from '../lib/tax/returns/fy2026/bas';
import { PrintBanner, FOOTER_DISCLAIMER } from './PrintBanner';
import { AnomalyBadge } from './AnomalyBadge';
import type { Decimal } from '../lib/money';

// ── Prop contract ─────────────────────────────────────────────────────────

type AddLog = (action: AuditAction, details: string, entityId?: string) => void;

interface BasIasAssistantProps {
  /** Phase 5 (required for full compute). Omitted in Phase 2 legacy callers — treated as a generic GST-registered entity. */
  entity?: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  addLog?: AddLog;
  /** Override FY (defaults to currentFy()). */
  fy?: FyLabel;
}

/** Default entity used when the `entity` prop is omitted (smoke test backward compat). */
const DEFAULT_BAS_ENTITY: Entity = {
  _v: 4,
  id: 'default-bas',
  name: 'Unknown Entity',
  type: 'Company',
  status: 'Active',
  gstRegistered: true,
};

// ── LabelRow helper ───────────────────────────────────────────────────────

interface LabelRowProps {
  code: string;
  plainEnglish: string;
  value: Decimal | undefined;
  highlight?: boolean;
  muted?: boolean;
}

function LabelRow({ code, plainEnglish, value, highlight, muted }: LabelRowProps): React.JSX.Element {
  const rowClass = [
    'flex justify-between items-center py-2 px-3 border-b border-gray-100',
    highlight ? 'bg-blue-50 font-bold' : '',
    muted ? 'opacity-60' : '',
  ].join(' ');

  return (
    <div className={rowClass}>
      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono font-bold w-10 text-center">
          {code}
        </span>
        <span className="text-sm">{plainEnglish}</span>
      </div>
      <span className="font-mono text-sm">
        ${(value ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
      </span>
    </div>
  );
}

// ── BasIasAssistant ───────────────────────────────────────────────────────

export function BasIasAssistant({
  entity: entityProp,
  accounts,
  entries,
  addLog,
  fy: fyProp,
}: BasIasAssistantProps): React.JSX.Element {
  const entity = entityProp ?? DEFAULT_BAS_ENTITY;
  const fy = fyProp ?? currentFy();
  const [periodChoice, setPeriodChoice] = useState<'fy' | 1 | 2 | 3 | 4>(1);

  const period: Period = periodChoice === 'fy'
    ? { type: 'fy', fy }
    : { type: 'quarter', fy, q: periodChoice };

  const shape = entity.gstRegistered === false ? 'IAS' : 'BAS';

  const result = useMemo(
    () => shape === 'IAS'
      ? computeIas({ entity, accounts, entries, period })
      : computeBas({ entity, accounts, entries, period }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entity, accounts, entries, shape, periodChoice, fy],
  );

  const handlePrint = () => {
    const quarterStr = periodChoice !== 'fy' ? `Q${periodChoice}` : undefined;
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({
        entityId: entity.id,
        form: shape,
        fy,
        ...(quarterStr ? { quarter: quarterStr } : {}),
        timestamp: today().toISOString(),
      }),
      entity.id,
    );
    window.print();
  };

  const scopeClass = shape === 'IAS' ? 'print-form-ias' : 'print-form-bas';

  return (
    <section className={`${scopeClass} p-4`}>
      {/* PrintBanner — print-only */}
      <PrintBanner
        form={shape}
        entityName={entity.name}
        fy={fy}
        locked={result.meta.locked}
      />

      {/* Screen header with period selector + print button */}
      <header className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">
          {shape} — {entity.name} ({fy})
        </h2>
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm font-medium">Period:</label>
          <select
            value={periodChoice as string | number}
            onChange={(e) => {
              const val = e.target.value;
              setPeriodChoice(val === 'fy' ? 'fy' : (Number(val) as 1 | 2 | 3 | 4));
            }}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="fy">Full FY</option>
            <option value={1}>Q1 (Jul–Sep)</option>
            <option value={2}>Q2 (Oct–Dec)</option>
            <option value={3}>Q3 (Jan–Mar)</option>
            <option value={4}>Q4 (Apr–Jun)</option>
          </select>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            {result.meta.locked ? 'Print finalised return' : 'Print working paper'}
          </button>
        </div>
      </header>

      {/* ── BAS shape ── */}
      {shape === 'BAS' && (
        <>
          {/* Simpler BAS lodgement labels */}
          <section className="mb-6">
            <h3 className="font-bold text-lg mb-3 border-b pb-2">
              BAS Lodgement labels (Simpler BAS)
            </h3>
            <div>
              <LabelRow
                code="G1"
                plainEnglish="Total sales (GST-inclusive)"
                value={(result as BasReturn).labels.G1?.value}
                highlight
              />
              <LabelRow
                code="1A"
                plainEnglish="GST on sales"
                value={(result as BasReturn).labels['1A']?.value}
              />
              <LabelRow
                code="1B"
                plainEnglish="GST on purchases"
                value={(result as BasReturn).labels['1B']?.value}
              />
              <LabelRow
                code="W1"
                plainEnglish="Total salary, wages and other payments"
                value={(result as BasReturn).labels.W1?.value}
              />
              <LabelRow
                code="W2"
                plainEnglish="Amounts withheld from payments at W1"
                value={(result as BasReturn).labels.W2?.value}
              />
              <LabelRow
                code="T7"
                plainEnglish="PAYG instalment amount"
                value={(result as BasReturn).labels.T7?.value}
              />
            </div>
          </section>

          {/* Internal-only working-paper labels */}
          <section className="mb-6 text-gray-500">
            <h3 className="font-semibold mb-3 border-b pb-2">
              Internal-only working-paper labels (NOT lodged under Simpler BAS)
            </h3>
            <div>
              <LabelRow
                code="G2*"
                plainEnglish="Export sales (internal only)"
                value={(result as BasReturn).labels.G2?.value}
                muted
              />
              <LabelRow
                code="G3*"
                plainEnglish="Other GST-free sales (internal only)"
                value={(result as BasReturn).labels.G3?.value}
                muted
              />
              <LabelRow
                code="G10*"
                plainEnglish="Capital purchases (internal only)"
                value={(result as BasReturn).labels.G10?.value}
                muted
              />
              <LabelRow
                code="G11*"
                plainEnglish="Non-capital purchases (internal only)"
                value={(result as BasReturn).labels.G11?.value}
                muted
              />
            </div>
            <p className="text-xs italic mt-2">
              * Internal-only — not lodged under Simpler BAS
            </p>
          </section>
        </>
      )}

      {/* ── IAS shape ── */}
      {shape === 'IAS' && (
        <section className="mb-6">
          <h3 className="font-bold text-lg mb-3 border-b pb-2">
            IAS Labels (PAYG only)
          </h3>
          <div>
            <LabelRow
              code="W1"
              plainEnglish="Total salary, wages and other payments"
              value={result.labels.W1?.value}
            />
            <LabelRow
              code="W2"
              plainEnglish="Amounts withheld from payments at W1"
              value={result.labels.W2?.value}
            />
            <LabelRow
              code="W3"
              plainEnglish="Amounts withheld where no ABN quoted"
              value={result.labels.W3?.value}
            />
            <LabelRow
              code="W4"
              plainEnglish="Amounts withheld from investment distributions"
              value={result.labels.W4?.value}
            />
            <LabelRow
              code="W5"
              plainEnglish="Total withholding (W2 + W3 + W4)"
              value={result.labels.W5?.value}
              highlight
            />
            <LabelRow
              code="T7"
              plainEnglish="PAYG instalment amount"
              value={result.labels.T7?.value}
            />
          </div>
        </section>
      )}

      {/* ── Anomalies ── */}
      {result.meta.anomalies.length > 0 && (
        <section className="mt-4 mb-6">
          <h3 className="font-semibold mb-2">Anomalies</h3>
          <ul className="space-y-1">
            {result.meta.anomalies.map((a) => (
              <li key={a.id}>
                <span>
                  <AnomalyBadge
                    severity={a.severity}
                    message={a.message}
                    label={a.label}
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Print footer */}
      <footer className="print-footer print-only">
        {FOOTER_DISCLAIMER}
      </footer>
    </section>
  );
}
