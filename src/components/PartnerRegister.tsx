/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PartnerRegister — Partnership partner register UI (ENT-08).
 *
 * Mirrors BeneficiaryRegister shape. `sharePerType` field is typed in PartnerRow
 * but UI-hidden in Phase 4 (Phase 5 will design Form P streaming overrides).
 */
import React from 'react';
import type { PartnerRow } from '../types';
import { Plus, Trash2 } from 'lucide-react';

interface PartnerRegisterProps {
  rows: PartnerRow[];
  onChange: (rows: PartnerRow[]) => void;
  readOnly?: boolean;
}

export const PartnerRegister: React.FC<PartnerRegisterProps> = ({
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

  const updateRow = (id: string, patch: Partial<PartnerRow>) =>
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const total = rows.reduce((s, r) => s + Number(r.sharePercent || 0), 0);
  const showWarning = rows.length > 0 && Math.abs(total - 100) > 0.001;

  return (
    <section
      className="bg-white border border-[var(--line)] rounded p-4"
      data-testid="partner-register"
    >
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--ink)]">
          Partner register
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={addRow}
            className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-800"
            data-testid="add-partner"
          >
            <Plus size={14} /> Add partner
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No partners yet. Add the first partner to enable Partnership
          distributions in Phase 5 returns.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex gap-2 items-center"
              data-testid={`partner-row-${r.id}`}
            >
              <input
                type="text"
                value={r.name}
                onChange={(e) => updateRow(r.id, { name: e.target.value })}
                placeholder="Partner name"
                aria-label="partner-name"
                className="flex-1 border border-[var(--line)] rounded px-2 py-1 text-sm"
                disabled={readOnly}
              />
              <input
                type="number"
                value={r.sharePercent}
                onChange={(e) =>
                  updateRow(r.id, { sharePercent: Number(e.target.value) })
                }
                aria-label="partner-share"
                className="w-24 border border-[var(--line)] rounded px-2 py-1 text-sm text-right"
                step="0.01"
                disabled={readOnly}
              />
              <span className="text-xs text-gray-500">%</span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => removeRow(r.id)}
                  aria-label="remove-partner"
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
          data-testid="partner-warning"
        >
          Total share is {total.toFixed(2)}%, not 100%.
        </p>
      )}
    </section>
  );
};
