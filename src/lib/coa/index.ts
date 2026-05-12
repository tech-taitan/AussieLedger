/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Account } from '../../types';
import type { DefaultAccountSeed, EntityCoaType } from './types';
import { FY2026_BASE_SPINE } from './fy2026/base';
import { FY2026_INDIVIDUAL_OVERLAY } from './fy2026/individual';
import { FY2026_COMPANY_OVERLAY } from './fy2026/company';
import { FY2026_TRUST_OVERLAY } from './fy2026/trust';
import { FY2026_PARTNERSHIP_OVERLAY } from './fy2026/partnership';

export type { DefaultAccountSeed, EntityCoaType };

function pickOverlay(type: EntityCoaType): DefaultAccountSeed[] {
  switch (type) {
    case 'Individual':   return FY2026_INDIVIDUAL_OVERLAY;
    case 'Company':      return FY2026_COMPANY_OVERLAY;
    case 'Trust':        return FY2026_TRUST_OVERLAY;
    case 'Partnership':  return FY2026_PARTNERSHIP_OVERLAY;
  }
}

/**
 * Resolve the default CoA for a given entity type and FY label.
 *
 * Phase 4 ships only FY2026. Other FY labels throw.
 *
 * Merge rules: overlay rows that match a base row by `code` override base fields
 * per-field (only fields that are set on the overlay take effect). Overlay rows
 * with new codes are appended.
 */
export function getDefaultCoaFor(entityType: EntityCoaType, fy: string): Account[] {
  if (fy !== 'FY2026') {
    throw new Error(`No default CoA available for ${fy} — only FY2026 is shipped in Phase 4.`);
  }

  const overlay = pickOverlay(entityType);
  const merged: Record<string, DefaultAccountSeed> = Object.fromEntries(
    FY2026_BASE_SPINE.map((row) => [row.code, row]),
  );

  for (const o of overlay) {
    const existing = merged[o.code];
    merged[o.code] = existing
      ? {
          ...existing,
          ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)),
        }
      : o;
  }

  return Object.values(merged).map((seed): Account => ({
    _v: 3,
    id: `coa-${fy}-${seed.code}`,
    code: seed.code,
    name: seed.name,
    type: seed.type,
    parentCode: seed.parentCode,
    gstCode: seed.gstCode,
    taxLabel: seed.taxLabel,
    companyTaxLabel: seed.companyTaxLabel,
    trustTaxLabel: seed.trustTaxLabel,
    partnershipTaxLabel: seed.partnershipTaxLabel,
    isDefault: true,
    isArchived: false,
  }));
}
