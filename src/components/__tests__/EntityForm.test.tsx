import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityForm } from '../EntityForm';

describe('EntityForm — Phase 1 ABN validation (ENT-02)', () => {
  it('ABN warning — invalid ABN shows inline warning text but submit still succeeds (warn-but-allow)', () => {
    const onSave = vi.fn();
    render(<EntityForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g\. Acme Corp|Sample Pty Ltd/i), {
      target: { value: 'Test Entity' },
    });
    // Type an invalid ABN — should display a warning but not block
    const abnInput = screen.getByLabelText(/abn/i);
    fireEvent.change(abnInput, { target: { value: '11 111 111 111' } });
    // Inline warning is rendered (any element with role='status' or text containing "checksum")
    expect(screen.getByText(/checksum|invalid abn|warning/i)).toBeInTheDocument();
    // Form still submits
    fireEvent.click(screen.getByRole('button', { name: /create entity|save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('no TFN field — EntityForm source contains zero "TFN" string occurrences (case-insensitive)', async () => {
    // The component must not render any field labeled TFN. Plan 01-3 ensures this.
    render(<EntityForm onSave={() => {}} onCancel={() => {}} />);
    const screenText = document.body.textContent ?? '';
    expect(screenText).not.toMatch(/TFN/i);
    expect(screenText).not.toMatch(/Tax File Number/i);
  });
});

describe('Phase 4 — EntityForm v3 widening (ENT-01/03/04/05/06)', () => {
  it('AU four entity types only', () => {
    render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const select = screen.getByLabelText('entity-type-select') as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.value);
    expect(options.sort()).toEqual(['Company', 'Individual', 'Partnership', 'Trust']);
  });

  it('gstRegistered toggle', () => {
    render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const checkbox = screen.getByLabelText('GST registered') as HTMLInputElement;
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });

  it('accountingMethod radio', () => {
    render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const cash = screen.getByLabelText('accounting-method-cash') as HTMLInputElement;
    const accruals = screen.getByLabelText('accounting-method-accruals') as HTMLInputElement;
    expect(cash.type).toBe('radio');
    expect(accruals.type).toBe('radio');
    // Default is 'accruals'.
    expect(accruals.checked).toBe(true);
    expect(cash.checked).toBe(false);
    fireEvent.click(cash);
    expect(cash.checked).toBe(true);
    expect(accruals.checked).toBe(false);
  });

  it('fyEndDate default 06-30', () => {
    render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText('fy-end-date') as HTMLInputElement;
    expect(input.value).toBe('06-30');
  });

  it('delete blocked with journals offers Archive', () => {
    const existing = {
      id: 'ent-x',
      name: 'Existing Co',
      type: 'Company' as const,
      status: 'Active' as const,
    };
    const onDelete = vi.fn();
    const onArchive = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <EntityForm
        entity={existing}
        onSave={vi.fn()}
        onCancel={vi.fn()}
        onDelete={onDelete}
        onArchive={onArchive}
        inUseCount={3}
      />,
    );
    const deleteBtn = screen.getByTestId('entity-delete-btn');
    fireEvent.click(deleteBtn);
    expect(confirmSpy).toHaveBeenCalled();
    const msg = confirmSpy.mock.calls[0][0] as string;
    expect(msg).toMatch(/Cannot delete/i);
    expect(msg).toMatch(/Archive/i);
    expect(onArchive).toHaveBeenCalledWith('ent-x');
    expect(onDelete).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('Trust entity shows BeneficiaryRegister tab', () => {
    const existing = {
      id: 'ent-trust',
      name: 'Test Trust',
      type: 'Trust' as const,
      status: 'Active' as const,
    };
    render(<EntityForm entity={existing} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('beneficiary-register')).toBeDefined();
    expect(screen.queryByTestId('partner-register')).toBeNull();
  });

  it('Partnership entity shows PartnerRegister tab', () => {
    const existing = {
      id: 'ent-pship',
      name: 'Test Partnership',
      type: 'Partnership' as const,
      status: 'Active' as const,
    };
    render(<EntityForm entity={existing} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId('partner-register')).toBeDefined();
    expect(screen.queryByTestId('beneficiary-register')).toBeNull();
  });
});

describe('EntityForm — Phase 5 wiring (v4 fields)', () => {
  it.todo('aggregatedTurnover field — renders numeric input and passes value to onSave entity');
  it.todo('paygInstalmentAmount field — renders numeric input and passes value to onSave entity');
});
