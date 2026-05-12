/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { getDefaultCoaFor, type EntityCoaType } from '../index';
import type { Account } from '../../../types';

const ENTITY_TYPES: EntityCoaType[] = ['Individual', 'Company', 'Trust', 'Partnership'];
const AU_GST = ['GST', 'FRE', 'INP', 'N-T', 'CAP'];

function isHeader(a: Account): boolean {
  return a.parentCode === null || a.parentCode === undefined;
}

describe('Default CoA structural integrity (per entity type)', () => {
  it('Company default CoA size', () => {
    const coa = getDefaultCoaFor('Company', 'FY2026');
    expect(coa.length).toBeGreaterThanOrEqual(80);
    expect(coa.length).toBeLessThanOrEqual(150);
  });

  it('per-type CoA sizes', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      expect(coa.length, `${t} CoA size`).toBeGreaterThanOrEqual(80);
      expect(coa.length, `${t} CoA size`).toBeLessThanOrEqual(150);
    }
  });

  it('no duplicate codes', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      const codes = coa.map((a) => a.code);
      expect(new Set(codes).size).toBe(codes.length);
    }
  });

  it('parent codes resolve', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      const codeSet = new Set(coa.map((a) => a.code));
      for (const a of coa) {
        if (a.parentCode !== null && a.parentCode !== undefined) {
          expect(codeSet.has(a.parentCode), `${t} ${a.code} parent ${a.parentCode} resolves`).toBe(true);
        }
      }
    }
  });

  it('tax label coverage', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      for (const a of coa) {
        if (isHeader(a)) continue;
        if (a.type === 'Revenue' || a.type === 'Expense') {
          const hasAny =
            Boolean(a.taxLabel) ||
            Boolean(a.companyTaxLabel) ||
            Boolean(a.trustTaxLabel) ||
            Boolean(a.partnershipTaxLabel);
          expect(hasAny, `${t} account ${a.code} ${a.name} has at least one tax label`).toBe(true);
        }
      }
    }
  });

  it('GST codes in AU set', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      for (const a of coa) {
        expect(AU_GST).toContain(a.gstCode);
      }
    }
  });

  it('codes are 4-digit and follow type prefix convention', () => {
    for (const t of ENTITY_TYPES) {
      const coa = getDefaultCoaFor(t, 'FY2026');
      for (const a of coa) {
        expect(a.code, `${a.code} is 4 digits`).toMatch(/^\d{4}$/);
        const prefix = a.code[0];
        const expected: string | string[] = {
          Asset:     '1',
          Liability: '2',
          Equity:    '3',
          Revenue:   '4',
          Expense:   ['5', '6'],
        }[a.type];
        const ok = Array.isArray(expected) ? expected.includes(prefix) : prefix === expected;
        expect(ok, `${t} ${a.code} type ${a.type} has prefix ${prefix} matching ${JSON.stringify(expected)}`).toBe(true);
      }
    }
  });

  it('throws on unsupported FY', () => {
    expect(() => getDefaultCoaFor('Company', 'FY2025')).toThrow(/only FY2026/);
    expect(() => getDefaultCoaFor('Company', 'FY2027')).toThrow(/only FY2026/);
  });

  it('every default account isDefault=true and isArchived=false', () => {
    const coa = getDefaultCoaFor('Company', 'FY2026');
    for (const a of coa) {
      expect(a.isDefault).toBe(true);
      expect(a.isArchived).toBe(false);
    }
  });

  it('deterministic ids — re-call returns same id per code', () => {
    const a = getDefaultCoaFor('Company', 'FY2026');
    const b = getDefaultCoaFor('Company', 'FY2026');
    const aById = Object.fromEntries(a.map((x) => [x.code, x.id]));
    const bById = Object.fromEntries(b.map((x) => [x.code, x.id]));
    expect(aById).toEqual(bById);
  });
});
