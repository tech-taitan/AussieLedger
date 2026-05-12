/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BeneficiaryRegister — Trust beneficiary register UI (ENT-07).
 *
 * Phase 4 scope: name + sharePercent UI only.
 * Phase 5 will expand `sharePerType` into streaming-override UI (interest /
 * dividend / capitalGain / foreign / other). The `sharePerType` field is typed
 * in BeneficiaryRow and preserved through edits — UI just doesn't expose it yet.
 */
import React from 'react';
import type { BeneficiaryRow } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface BeneficiaryRegisterProps {
  rows: BeneficiaryRow[];
  onChange: (rows: BeneficiaryRow[]) => void;
  readOnly?: boolean;
}

export const BeneficiaryRegister: React.FC<BeneficiaryRegisterProps> = ({
  rows,
  onChange,
  readOnly,
}) => {
  const addRow = () =>
    onChange([
      ...rows,
      { id: crypto.randomUUID(), name: '', sharePercent: 0 },
    ]);

  const removeRow = (id: string) => onChange(rows.filter((r) => r.id !== id));

  const updateRow = (id: string, patch: Partial<BeneficiaryRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + Number(r.sharePercent || 0), 0);
  const showWarning = rows.length > 0 && Math.abs(total - 100) > 0.001;

  return (
    <section
      className="bg-white border border-[var(--line)] rounded p-4"
      data-testid="beneficiary-register"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
          Beneficiary register
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
            data-testid="add-beneficiary"
          >
            <Plus size={14} /> Add beneficiary
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No beneficiaries yet. Add the first beneficiary to enable Trust
          distributions in Phase 5 returns.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex gap-2 items-center"
              data-testid={`beneficiary-row-${r.id}`}
            >
              <input
                type="text"
                value={r.name}
                onChange={(e) => updateRow(r.id, { name: e.target.value })}
                placeholder="Beneficiary name"
                aria-label="beneficiary-name"
                className="flex-1 border border-[var(--line)] rounded px-2 py-1 text-sm"
                disabled={readOnly}
              />
              <input
                type="number"
                value={r.sharePercent}
                onChange={(e) =>
                  updateRow(r.id, { sharePercent: Number(e.target.value) })
                }
                aria-label="beneficiary-share"
                className="w-24 border border-[var(--line)] rounded px-2 py-1 text-sm text-right"
                step="0.01"
                disabled={readOnly}
              />
              <span className="text-xs text-gray-500">%</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label="remove-beneficiary"
                  className="text-gray-400 hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <div className="mt-3 pt-3 border-t border-[var(--line)] flex justify-between text-xs">
          <span className="text-gray-500 uppercase tracking-wider">Total</span>
          <span className="font-mono font-bold">{total.toFixed(2)}%</span>
        </div>
      )}

      {showWarning && (
        <p
          className="text-xs text-amber-700 mt-2"
          data-testid="beneficiary-warning"
        >
          Total share is {total.toFixed(2)}%, not 100%. This will cause an
          unbalanced trust distribution in Phase 5.
        </p>
      )}
    </section>
  );
};
