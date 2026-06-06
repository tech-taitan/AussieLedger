/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RawUploadPreview — full data-table view of the parsed file during the
 * column-mapping stage. Renders every row + every column so the user can
 * see exactly what was uploaded before deciding which columns map to
 * Code / Name / Debit / Credit / Balance.
 *
 * Columns that the user has already mapped to a role are highlighted
 * with a per-role tint:
 *   code:    blue
 *   name:    emerald
 *   debit:   rose
 *   credit:  rose
 *   balance: violet
 *
 * The table has a sticky header and scrolls vertically inside the
 * fixed 380px viewport — keeps the mapping controls reachable above
 * even on very tall files.
 */
import React from 'react';
import type { RawRow } from '../lib/import/fingerprint';

export interface MappedColumns {
  code?: string;
  name?: string;
  debit?: string;
  credit?: string;
  balance?: string;
}

interface RawUploadPreviewProps {
  headers: string[];
  rows: RawRow[];
  mapped: MappedColumns;
}

const ROLE_TINT: Record<keyof MappedColumns, { th: string; td: string; chip: string }> = {
  code:    { th: 'bg-blue-50    text-blue-800',    td: 'bg-blue-50/50',    chip: 'bg-blue-100 text-blue-700' },
  name:    { th: 'bg-emerald-50 text-emerald-800', td: 'bg-emerald-50/50', chip: 'bg-emerald-100 text-emerald-700' },
  debit:   { th: 'bg-rose-50    text-rose-800',    td: 'bg-rose-50/50',    chip: 'bg-rose-100 text-rose-700' },
  credit:  { th: 'bg-rose-50    text-rose-800',    td: 'bg-rose-50/50',    chip: 'bg-rose-100 text-rose-700' },
  balance: { th: 'bg-violet-50  text-violet-800',  td: 'bg-violet-50/50',  chip: 'bg-violet-100 text-violet-700' },
};

function roleOf(
  header: string,
  mapped: MappedColumns,
): keyof MappedColumns | null {
  for (const [role, h] of Object.entries(mapped) as [keyof MappedColumns, string | undefined][]) {
    if (h && h === header) return role;
  }
  return null;
}

export const RawUploadPreview: React.FC<RawUploadPreviewProps> = ({
  headers,
  rows,
  mapped,
}) => {
  return (
    <div
      data-testid="raw-upload-preview"
      className="border border-[var(--line)] rounded mt-4"
    >
      <div className="flex items-baseline justify-between p-2 border-b border-[var(--line)] bg-gray-50">
        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-600">
          Source data ({rows.length} {rows.length === 1 ? 'row' : 'rows'} · {headers.length} columns)
        </h4>
        <div className="flex flex-wrap gap-1 text-[10px]">
          {(['code', 'name', 'debit', 'credit', 'balance'] as const).map((role) => {
            const header = mapped[role];
            if (!header) return null;
            return (
              <span
                key={role}
                className={`px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${ROLE_TINT[role].chip}`}
              >
                {role}: {header}
              </span>
            );
          })}
        </div>
      </div>
      <div className="overflow-auto max-h-[380px]">
        <table className="text-xs w-full">
          <thead className="sticky top-0 z-10 bg-white shadow-sm">
            <tr>
              <th className="text-right px-2 py-1.5 border-b border-[var(--line)] text-gray-400 font-mono w-10">#</th>
              {headers.map((h) => {
                const role = roleOf(h, mapped);
                const cls = role ? ROLE_TINT[role].th : 'bg-white';
                return (
                  <th
                    key={h}
                    className={`text-left px-2 py-1.5 border-b border-[var(--line)] whitespace-nowrap font-semibold ${cls}`}
                    data-testid={`raw-header-${h}`}
                  >
                    {h}
                    {role && (
                      <span className="ml-1 text-[9px] uppercase tracking-wider font-bold opacity-70">
                        ({role})
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={idx}
                className="border-b border-gray-100 hover:bg-gray-50/50"
                data-testid={`raw-row-${idx}`}
              >
                <td className="text-right px-2 py-1 text-gray-400 font-mono">{idx + 1}</td>
                {headers.map((h) => {
                  const role = roleOf(h, mapped);
                  const cls = role ? ROLE_TINT[role].td : '';
                  const v = (row[h] ?? '').toString();
                  return (
                    <td
                      key={h}
                      className={`px-2 py-1 whitespace-nowrap ${cls} ${role === 'debit' || role === 'credit' || role === 'balance' ? 'text-right font-mono' : ''}`}
                    >
                      {v || <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
