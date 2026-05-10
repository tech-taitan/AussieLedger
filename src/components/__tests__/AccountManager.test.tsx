/**
 * Component test for AccountManager.
 *
 * Tests partnershipTaxLabel column, Review-needed banner, and _needsReview clearing
 * implemented in Plan 02-3.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

const FIXTURE_WITH_REVIEW: Account[] = [
  {
    id: 'acc-needs-review', code: '5100', name: 'Consulting Revenue', type: 'Revenue',
    gstCode: 'GST',
    _needsReview: true,
  },
  {
    id: 'acc-ok', code: '4100', name: 'Sales', type: 'Revenue',
    taxLabel: '6S',
    gstCode: 'GST',
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

  describe('partnershipTaxLabel column', () => {
    it('renders a "Partnership Label" column header', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      expect(screen.getByText(/Partnership Label/i)).toBeDefined();
    });

    it('renders partnershipTaxLabel inputs for Revenue and Expense rows', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // Revenue account (Sales) has a partnership label input
      const salesInput = screen.getByRole('textbox', { name: /Partnership label for Sales/i });
      expect(salesInput).toBeDefined();
      // Expense account (Wages & Salaries) has a partnership label input
      const wagesInput = screen.getByRole('textbox', { name: /Partnership label for Wages/i });
      expect(wagesInput).toBeDefined();
    });

    it('renders dash placeholder for Asset rows in partnership column', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // No input for Asset account — just a dash
      expect(screen.queryByRole('textbox', { name: /Partnership label for General Check Account/i })).toBeNull();
    });
  });

  describe('Review-needed banner', () => {
    it('renders the review-needed banner when any account has _needsReview === true', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_WITH_REVIEW}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      expect(screen.getByText(/Review needed/i)).toBeDefined();
      // Consulting Revenue appears in both the banner and the table row
      const consultingElements = screen.getAllByText(/Consulting Revenue/i);
      expect(consultingElements.length).toBeGreaterThan(0);
    });

    it('does not render the review-needed banner when no accounts have _needsReview', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_ACCOUNTS}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      expect(screen.queryByText(/Review needed/i)).toBeNull();
    });
  });

  describe('_needsReview clearing on edit', () => {
    it('clears _needsReview when account is saved via edit', () => {
      const onSave = vi.fn();
      const onCancel = vi.fn();
      render(
        <AccountManager
          accounts={FIXTURE_WITH_REVIEW}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
      // Click the Edit button for Consulting Revenue (uses aria-label)
      const editBtn = screen.getByRole('button', { name: /Edit Consulting Revenue/i });
      expect(editBtn).toBeDefined();
      fireEvent.click(editBtn);

      // After clicking edit, the row is in edit mode — the save button (Save icon) appears
      const saveBtn = screen.getByRole('button', { name: /Save Consulting Revenue/i });
      expect(saveBtn).toBeDefined();
      fireEvent.click(saveBtn);

      // Click "Commit Changes" to call onSave
      const commitBtn = screen.getByText(/Commit Changes/i);
      fireEvent.click(commitBtn);
      expect(onSave).toHaveBeenCalledOnce();
      // The saved accounts should have _needsReview: undefined for the edited account
      const savedAccounts: Account[] = onSave.mock.calls[0][0];
      const editedAccount = savedAccounts.find((a: Account) => a.id === 'acc-needs-review');
      expect(editedAccount?._needsReview).toBeUndefined();
    });
  });
});
