/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

/**
 * The 5 fixed assumptions used in Phase 5 v1 Individual tax return computations
 * (single-filing default). Phase 8 — when the engine emits dynamic assumptions
 * (e.g. family Medicare row), TaxReturnAssistant passes them via the `assumptions` prop.
 */
export const ASSUMPTIONS: readonly string[] = [
  'Marital status: single (no spouse income captured)',
  'Age: under 65 (no Seniors and Pensioners Tax Offset applied)',
  'Medicare exemption: none (full 2% levy applied unless shading applies)',
  'Private health cover: assumed (no Medicare Levy Surcharge applied)',
  'Dependants: zero',
] as const;

export interface AssumptionsBlockProps {
  /**
   * Phase 8 — optional dynamic assumptions list. When provided, REPLACES the static ASSUMPTIONS
   * constant (empty array means render no rows). When omitted (legacy callers), falls back to
   * the static ASSUMPTIONS list for backward compat.
   */
  assumptions?: string[];
}

/**
 * Form I "Assumptions used" boxed section.
 * Phase 8: accepts optional `assumptions` prop; defaults to Phase 5 static ASSUMPTIONS.
 */
export function AssumptionsBlock({ assumptions }: AssumptionsBlockProps = {}): React.JSX.Element {
  const rows = assumptions ?? ASSUMPTIONS;
  return (
    <section
      className="border border-gray-400 rounded p-4 my-4"
      data-testid="assumptions-block"
    >
      <h3 className="text-sm font-bold mb-2">Assumptions used by this working paper</h3>
      <ul className="text-xs text-gray-700 space-y-1">
        {rows.map((a, i) => (
          <li key={i}>· {a}</li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2 italic">Phase 6 wizard will capture real values.</p>
    </section>
  );
}
