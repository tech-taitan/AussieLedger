/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

/**
 * The 5 fixed assumptions used in Phase 5 v1 Individual tax return computations.
 * Phase 6 wizard will capture real values from the user.
 */
export const ASSUMPTIONS: readonly string[] = [
  'Marital status: single (no spouse income captured)',
  'Age: under 65 (no Seniors and Pensioners Tax Offset applied)',
  'Medicare exemption: none (full 2% levy applied unless shading applies)',
  'Private health cover: assumed (no Medicare Levy Surcharge applied)',
  'Dependants: zero',
] as const;

/**
 * Form I "Assumptions used" boxed section.
 * Renders the 5 Phase 5 v1 fixed assumptions with a header and Phase 6 caveat.
 * Displayed on the Individual Tax Return surface below the disclaimer banner.
 */
export function AssumptionsBlock(): React.JSX.Element {
  return (
    <section
      className="border border-gray-400 rounded p-4 my-4"
      data-testid="assumptions-block"
    >
      <h3 className="text-sm font-bold mb-2">Assumptions used by this working paper</h3>
      <ul className="text-xs text-gray-700 space-y-1">
        {ASSUMPTIONS.map((a, i) => (
          <li key={i}>· {a}</li>
        ))}
      </ul>
      <p className="text-xs text-gray-500 mt-2 italic">Phase 6 wizard will capture real values.</p>
    </section>
  );
}
