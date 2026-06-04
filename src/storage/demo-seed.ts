/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo data seeder — Phase 14 Plan 14-1 Task 3.
 *
 * Hard-coded demo fixtures for the /demo route. Loaded ONCE on first
 * demo-adapter init via initAdapter()'s demo-branch wiring (Plan 14-1
 * Task 4). Idempotent — does nothing if entities already exist (protects
 * users mid-exploration from being overwritten on subsequent demo loads
 * within the same browser).
 *
 * FY2025-26 sole-trader narrative (CONTEXT-locked FY): owner-funded cash
 * sales, equipment purchase, monthly rent/utilities expenses, owner
 * drawings, GST collected on sales / paid on BAS. The shape is designed
 * to populate a meaningful Trial Balance + Tax Return + BAS for the
 * tax-engine demos without overwhelming the visitor.
 *
 * STRUCTURAL-LINT INVARIANT (Phase 2 + Phase 11): all timestamps are
 * LITERAL ISO date strings (e.g. '2025-07-15'). NO `new Date()` calls —
 * seed data is static; structural-lint-period.test.ts regex
 * `\bnew\s+Date\s*\(\s*\)` does not match a literal string and this file
 * has no imports from period.ts.
 *
 * AIza-scan safe: contains no Google API key shapes (no 'AIza' prefix
 * substring anywhere in the file body).
 */
import type { LocalAdapter } from './local';
import type { Entity, Account, JournalEntry } from '../types';
import { CURRENT_VERSION } from '../lib/migrations';
import { getDefaultCoaFor } from '../lib/coa';

const DEMO_ENTITY_ID = 'demo-entity-sole-trader-001';

const DEMO_ENTITY: Entity = {
  _v: CURRENT_VERSION,
  id: DEMO_ENTITY_ID,
  name: 'Demo Sole Trader (Sample Data)',
  type: 'SoleTrader',
  status: 'Active',
  registrationNumber: '00 000 000 000',
  gstRegistered: true,
  accountingMethod: 'cash',
  fyEndDate: '06-30',
};

// Chart of Accounts — full FY2026 Individual / sole-trader spine so the
// demo accurately reflects what a real sole owner gets after the startup
// wizard. The 197 rows cover Asset/Liability/Equity/Revenue/Expense with
// tax labels pre-mapped to NAT 2541 + NAT 2543. The 15 demo journals
// below post to a handful of these accounts to keep the Trial Balance
// non-trivial; the remaining rows show as nil-balance (the user can
// hide them via the standard TB toggle).
const DEMO_ACCOUNTS: Account[] = getDefaultCoaFor('Individual', 'FY2026');

// Account-ID aliases used by the demo journals below. The FY2026 seed
// uses deterministic ids of the form `coa-FY2026-<code>`, so each demo
// journal line points to a row already present in DEMO_ACCOUNTS.
const ACC_BANK         = 'coa-FY2026-1020'; // Business Bank Account
const ACC_EQUIPMENT    = 'coa-FY2026-1510'; // Plant & Equipment (at cost)
const ACC_GST_PAYABLE  = 'coa-FY2026-2100'; // GST Collected (Output Tax)
const ACC_OWNER_CAP    = 'coa-FY2026-3010'; // Owner's Capital Contribution
const ACC_OWNER_DRAW   = 'coa-FY2026-3020'; // Owner's Drawings
const ACC_SALES        = 'coa-FY2026-4020'; // Sales of Services
const ACC_RENT         = 'coa-FY2026-6200'; // Rent — Business Premises
const ACC_UTILITIES    = 'coa-FY2026-6230'; // Utilities — Electricity
const ACC_OFFICE       = 'coa-FY2026-6600'; // Printing & Stationery

// 15 FY2025-26 journals (1 Jul 2025 – 30 Jun 2026). Each entry is balanced
// (sum debits === sum credits). Literal ISO dates per structural-lint
// invariant. Decimal-typed amounts (number) match JournalLine's debit/credit
// type signature.
const DEMO_JOURNALS: JournalEntry[] = [
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-001',
    date: '2025-07-15',
    reference: 'DEMO-001',
    description: 'Opening capital — owner contribution',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_BANK, description: 'Cash deposit',     debit: 10000, credit: 0, taxAmount: 0 },
      { accountId: ACC_OWNER_CAP, description: 'Capital introduced', debit: 0, credit: 10000, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-002',
    date: '2025-08-20',
    reference: 'DEMO-002',
    description: 'Equipment purchase',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_EQUIPMENT, description: 'Laptop + tools', debit: 3000, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',   debit: 0, credit: 3000, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-003',
    date: '2025-09-10',
    reference: 'DEMO-003',
    description: 'Cash sale — first client',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_BANK, description: 'Cash received',  debit: 1100, credit: 0, taxAmount: 0 },
      { accountId: ACC_SALES, description: 'Sales (ex GST)', debit: 0, credit: 1000, taxAmount: 100 },
      { accountId: ACC_GST_PAYABLE, description: 'GST collected',  debit: 0, credit: 100, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-004',
    date: '2025-10-01',
    reference: 'DEMO-004',
    description: 'Monthly rent — October',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_RENT, description: 'Rent expense', debit: 800, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment', debit: 0, credit: 800, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-005',
    date: '2025-11-15',
    reference: 'DEMO-005',
    description: 'Utilities — November',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_UTILITIES, description: 'Electricity bill', debit: 150, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',     debit: 0, credit: 150, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-006',
    date: '2025-12-12',
    reference: 'DEMO-006',
    description: 'Cash sale — larger client',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_BANK, description: 'Cash received',  debit: 2200, credit: 0, taxAmount: 0 },
      { accountId: ACC_SALES, description: 'Sales (ex GST)', debit: 0, credit: 2000, taxAmount: 200 },
      { accountId: ACC_GST_PAYABLE, description: 'GST collected',  debit: 0, credit: 200, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-007',
    date: '2026-01-08',
    reference: 'DEMO-007',
    description: 'Office supplies — January',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_OFFICE, description: 'Stationery + ink', debit: 300, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',     debit: 0, credit: 300, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-008',
    date: '2026-02-22',
    reference: 'DEMO-008',
    description: 'Cash sale — February',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_BANK, description: 'Cash received',  debit: 1650, credit: 0, taxAmount: 0 },
      { accountId: ACC_SALES, description: 'Sales (ex GST)', debit: 0, credit: 1500, taxAmount: 150 },
      { accountId: ACC_GST_PAYABLE, description: 'GST collected',  debit: 0, credit: 150, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-009',
    date: '2026-03-05',
    reference: 'DEMO-009',
    description: 'BAS payment — quarterly GST remittance',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_GST_PAYABLE, description: 'GST Payable clear', debit: 450, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',      debit: 0, credit: 450, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-010',
    date: '2026-04-12',
    reference: 'DEMO-010',
    description: "Owner's drawings — April",
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_OWNER_DRAW, description: 'Drawings',     debit: 500, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment', debit: 0, credit: 500, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-011',
    date: '2026-05-18',
    reference: 'DEMO-011',
    description: 'Utilities — May',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_UTILITIES, description: 'Electricity + water', debit: 180, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',        debit: 0, credit: 180, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-012',
    date: '2026-06-10',
    reference: 'DEMO-012',
    description: 'Cash sale — closing FY',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_BANK, description: 'Cash received',  debit: 2750, credit: 0, taxAmount: 0 },
      { accountId: ACC_SALES, description: 'Sales (ex GST)', debit: 0, credit: 2500, taxAmount: 250 },
      { accountId: ACC_GST_PAYABLE, description: 'GST collected',  debit: 0, credit: 250, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-013',
    date: '2026-06-20',
    reference: 'DEMO-013',
    description: 'Monthly rent — June',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_RENT, description: 'Rent expense', debit: 800, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment', debit: 0, credit: 800, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-014',
    date: '2026-06-25',
    reference: 'DEMO-014',
    description: 'Utilities — June (closing)',
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_UTILITIES, description: 'Closing utilities', debit: 175, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment',      debit: 0, credit: 175, taxAmount: 0 },
    ],
  },
  {
    _v: CURRENT_VERSION,
    id: 'demo-j-015',
    date: '2026-06-30',
    reference: 'DEMO-015',
    description: "Owner's drawings — June closing",
    isPosted: true,
    status: 'posted',
    lines: [
      { accountId: ACC_OWNER_DRAW, description: 'Drawings',     debit: 400, credit: 0, taxAmount: 0 },
      { accountId: ACC_BANK, description: 'Bank payment', debit: 0, credit: 400, taxAmount: 0 },
    ],
  },
];

/**
 * Seed the demo IDB with a sole-trader fixture set.
 *
 * Idempotent: if the adapter already has any entities, returns immediately
 * without writing. This protects users mid-exploration from being
 * overwritten when initAdapter() runs again on a subsequent /demo visit
 * within the same browser.
 *
 * Audit logs are NOT seeded — demo doesn't need a fake history.
 */
export async function seedDemoData(adapter: LocalAdapter): Promise<void> {
  const existing = await adapter.getEntities();
  if (existing.length > 0) return;
  await adapter.saveEntities([DEMO_ENTITY]);
  await adapter.saveAccounts(DEMO_ACCOUNTS);
  await adapter.saveEntries({ [DEMO_ENTITY_ID]: DEMO_JOURNALS });
}
