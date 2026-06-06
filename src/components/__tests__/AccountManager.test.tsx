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
      // Phase 4: AccountManager renders both a tree view (CoaTreeView) and the
      // editable table, so names/codes appear in two surfaces. Assert ≥1 match.
      expect(screen.getAllByText('Sales').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Wages & Salaries').length).toBeGreaterThan(0);
      expect(screen.getAllByText('General Check Account').length).toBeGreaterThan(0);
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
      // Phase 4: same dual-surface rendering note as above.
      expect(screen.getAllByText('4100').length).toBeGreaterThan(0);
      expect(screen.getAllByText('6400').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1110').length).toBeGreaterThan(0);
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

  describe('Phase 4 — AccountManager refactor (BOOK-06, BOOK-07)', () => {
    it('tree view parents first', () => {
      const accounts: Account[] = [
        {
          id: 'acc-child', code: '6010', name: 'Rent',
          type: 'Expense', gstCode: 'GST', parentCode: '6000',
        },
        {
          id: 'acc-parent', code: '6000', name: 'Operating Expenses',
          type: 'Expense', gstCode: 'N-T', parentCode: null,
        },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Default view is table — switch to tree for the coa-row testids.
      fireEvent.click(screen.getByTestId('view-mode-tree'));
      const rows = screen.getAllByTestId(/^coa-row-/);
      const parentIndex = rows.findIndex((r) => r.getAttribute('data-testid') === 'coa-row-6000');
      const childIndex = rows.findIndex((r) => r.getAttribute('data-testid') === 'coa-row-6010');
      expect(parentIndex).toBeGreaterThanOrEqual(0);
      expect(childIndex).toBeGreaterThanOrEqual(0);
      expect(parentIndex).toBeLessThan(childIndex);
    });

    it('archive only for default', () => {
      const accounts: Account[] = [
        {
          id: 'acc-def', code: '4100', name: 'Sales',
          type: 'Revenue', gstCode: 'GST', isDefault: true,
        },
      ];
      const onArchive = vi.fn();
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          onArchiveAccount={onArchive}
        />,
      );
      const deleteBtn = screen.getByRole('button', { name: /Delete Sales/i });
      fireEvent.click(deleteBtn);
      expect(onArchive).toHaveBeenCalledWith('acc-def');
      confirmSpy.mockRestore();
    });

    it('GST dropdown is AU set', () => {
      const accounts: Account[] = [
        { id: 'acc-1', code: '1000', name: 'Cash', type: 'Asset', gstCode: 'N-T' },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Start editing
      fireEvent.click(screen.getByRole('button', { name: /Edit Cash/i }));
      const gstSelect = screen.getByRole('combobox', { name: /GST code for Cash/i });
      const options = Array.from(gstSelect.querySelectorAll('option')).map((o) => o.value);
      expect(options).toEqual(['GST', 'FRE', 'INP', 'N-T', 'CAP']);
      expect(options).not.toContain('ITS');
    });

    it('archive vs delete dialog appears for default account', () => {
      const accounts: Account[] = [
        {
          id: 'acc-def', code: '4100', name: 'Sales',
          type: 'Revenue', gstCode: 'GST', isDefault: true,
        },
      ];
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          onArchiveAccount={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Delete Sales/i }));
      expect(confirmSpy).toHaveBeenCalled();
      const message = confirmSpy.mock.calls[0][0] as string;
      expect(message).toMatch(/Archive/i);
      confirmSpy.mockRestore();
    });

    it('shows per-entity-type template badge', () => {
      const accounts: Account[] = [
        {
          id: 'acc-def', code: '4100', name: 'Sales',
          type: 'Revenue', gstCode: 'GST', isDefault: true,
        },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Default badge in the table view (always rendered as "default-badge-row-{code}");
      // the tree view also renders a "default-badge-{code}" — assert at least one default badge exists.
      expect(
        screen.queryByTestId('default-badge-row-4100') ??
        screen.queryByTestId('default-badge-4100'),
      ).not.toBeNull();
    });

    it('archived accounts hidden from default view', () => {
      const accounts: Account[] = [
        {
          id: 'acc-live', code: '4100', name: 'Sales',
          type: 'Revenue', gstCode: 'GST',
        },
        {
          id: 'acc-arc', code: '4200', name: 'Old Sales',
          type: 'Revenue', gstCode: 'GST', isArchived: true,
        },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Switch to tree to inspect coa-row testids.
      fireEvent.click(screen.getByTestId('view-mode-tree'));
      expect(screen.queryByTestId('coa-row-4200')).toBeNull();
      expect(screen.getByTestId('coa-row-4100')).toBeDefined();
    });

    it('renders ONLY one of tree/table at a time (no duplicate sections)', () => {
      const accounts: Account[] = [
        { id: 'acc-1', code: '4100', name: 'Sales', type: 'Revenue', gstCode: 'GST' },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      // Default is table mode — the editable table headers are present
      // and the tree's coa-row is not rendered.
      expect(screen.getByText(/Tax Mapping/i)).toBeDefined();
      expect(screen.queryByTestId('coa-row-4100')).toBeNull();

      // Toggle to tree — table headers disappear, coa-row appears.
      fireEvent.click(screen.getByTestId('view-mode-tree'));
      expect(screen.queryByText(/Tax Mapping/i)).toBeNull();
      expect(screen.queryByTestId('coa-row-4100')).not.toBeNull();
    });

    it('archived accounts surface via filter toggle', () => {
      const accounts: Account[] = [
        {
          id: 'acc-live', code: '4100', name: 'Sales',
          type: 'Revenue', gstCode: 'GST',
        },
        {
          id: 'acc-arc', code: '4200', name: 'Old Sales',
          type: 'Revenue', gstCode: 'GST', isArchived: true,
        },
      ];
      render(
        <AccountManager
          accounts={accounts}
          onSave={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      fireEvent.click(screen.getByTestId('view-mode-tree'));
      const toggle = screen.getByTestId('show-archived-toggle').querySelector('input')!;
      fireEvent.click(toggle);
      expect(screen.getByTestId('coa-row-4200')).toBeDefined();
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

  describe('Phase 9 UX-06 — AccountManager passes anomaly filter props to CoaTreeView', () => {
    it('A.1: filterMissingMappings=true — anomaly-filter-banner rendered inside tree view', () => {
      const unmappedAccount: Account = {
        id: 'acc-unmapped', code: '5100', name: 'Misc Expense',
        type: 'Expense', gstCode: undefined as never,
      };
      render(
        <AccountManager
          accounts={[unmappedAccount]}
          onSave={vi.fn()}
          onCancel={vi.fn()}
          filterMissingMappings={true}
        />
      );
      fireEvent.click(screen.getByTestId('view-mode-tree'));
      expect(screen.getByTestId('anomaly-filter-banner')).toBeTruthy();
    });
  });
});
