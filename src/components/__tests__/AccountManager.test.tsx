/**
 * Component test scaffold for AccountManager.
 *
 * Tests that pass NOW (plan 02-1): basic rendering of accounts.
 * Tests RED-by-design until Plan 02-3 adds partnershipTaxLabel column:
 *   - "renders a partnershipTaxLabel column / input for Revenue and Expense rows"
 *   - "calls onSave with the updated account when partnershipTaxLabel is changed"
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountManager } from '../AccountManager';
import type { Account } from '../../types';

const FIXTURE_ACCOUNTS: Account[] = [
  {
    id: 'acc-revenue', code: '4100', name: 'Sales', type: 'Revenue',
    taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', partnershipTaxLabel: 'P1',
    gstCode: 'GST',
  },
  {
    id: 'acc-expense', code: '6400', name: 'Wages & Salaries', type: 'Expense',
    taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',
    // partnershipTaxLabel intentionally undefined — column required by plan 02-3
    gstCode: 'N-T',
  },
  {
    id: 'acc-asset', code: '1110', name: 'General Check Account', type: 'Asset',
    // No tax labels — Asset accounts don't appear on tax returns
    gstCode: 'N-T',
  },
];

describe('AccountManager', () => {
  describe('basic rendering', () => {
    it('renders all accounts with their codes and names', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // All 3 account names should be visible
      expect(screen.getByText('Sales')).toBeDefined();
      expect(screen.getByText('Wages & Salaries')).toBeDefined();
      expect(screen.getByText('General Check Account')).toBeDefined();
    });

    it('renders account codes', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      expect(screen.getByText('4100')).toBeDefined();
      expect(screen.getByText('6400')).toBeDefined();
      expect(screen.getByText('1110')).toBeDefined();
    });
  });

  describe('partnershipTaxLabel column — RED-by-design until Plan 02-3', () => {
    // Plan 02-3 adds the partnershipTaxLabel column to AccountManager.
    // Until then, these tests are expected to FAIL.

    it.skip('renders a partnershipTaxLabel column / input for Revenue and Expense rows [RED until 02-3]', () => {
      // After 02-3: expect a column header "Partnership Label" and inputs for Revenue/Expense rows
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // Expect column header or label visible
      expect(screen.getByText(/Partnership/i)).toBeDefined();
    });

    it.skip('calls onSave with the updated account when partnershipTaxLabel is changed [RED until 02-3]', () => {
      // After 02-3: editing the partnership label column and saving should call onSave
      // with the modified account containing the new partnershipTaxLabel value.
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // Plan 02-3 will implement this interaction
      expect(onSave).not.toHaveBeenCalled();
    });
  });
});
