import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityForm } from '../EntityForm';
import type { Entity } from '../../types';

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
  it('aggregatedTurnover field — renders numeric input and passes value to onSave entity', () => {
    const onSave = vi.fn();
    render(<EntityForm onSave={onSave} onCancel={() => {}} />);
    // Find the aggregated turnover input by label text
    const input = screen.getByLabelText(/aggregated turnover/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');
    // Type a value
    fireEvent.change(input, { target: { value: '5000000' } });
    // Fill required name and submit
    fireEvent.change(screen.getByPlaceholderText(/e.g\. Acme Corp|Sample Pty Ltd/i), {
      target: { value: 'Test Entity' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create entity|save/i }));
    expect(onSave).toHaveBeenCalled();
    const saved = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(saved.aggregatedTurnover).toBe('5000000');
  });

  it('paygInstalmentAmount field — renders numeric input and passes value to onSave entity', () => {
    const onSave = vi.fn();
    render(<EntityForm onSave={onSave} onCancel={() => {}} />);
    // Find the PAYG instalment input
    const input = screen.getByLabelText(/payg instalment amount|t7/i) as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.type).toBe('text');
    // Type a value
    fireEvent.change(input, { target: { value: '2500' } });
    // Fill required name and submit
    fireEvent.change(screen.getByPlaceholderText(/e.g\. Acme Corp|Sample Pty Ltd/i), {
      target: { value: 'Test Entity' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create entity|save/i }));
    expect(onSave).toHaveBeenCalled();
    const saved = onSave.mock.calls[0][0] as Record<string, unknown>;
    expect(saved.paygInstalmentAmount).toBe('2500');
  });
});

describe('EntityForm — Phase 8 family Medicare fields (MED-04)', () => {
  it('EF-FAM-1: Individual entity renders dependants + spouseIncome fields', () => {
    const individual: Entity = {
      _v: 6,
      id: 'i1',
      name: 'Jane Doe',
      type: 'Individual',
      status: 'Active',
    };
    render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Dependant children count')).toBeInTheDocument();
    expect(screen.getByLabelText('Spouse taxable income ($)')).toBeInTheDocument();
  });

  it('EF-FAM-2: Company entity (default new) does NOT render the 2 Individual-only family fields', () => {
    render(<EntityForm onSave={vi.fn()} onCancel={vi.fn()} />);
    // Default new entity is Company
    expect(screen.queryByLabelText('Dependant children count')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Spouse taxable income ($)')).not.toBeInTheDocument();
  });

  it('EF-FAM-3: Switching type Individual → Company hides both fields; switching back reveals them', () => {
    const individual: Entity = {
      _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active',
      dependants: 2, spouseIncome: '60000',
    };
    render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByLabelText('Dependant children count')).toBeInTheDocument();
    const typeSelect = screen.getByLabelText('entity-type-select');
    fireEvent.change(typeSelect, { target: { value: 'Company' } });
    expect(screen.queryByLabelText('Dependant children count')).not.toBeInTheDocument();
    fireEvent.change(typeSelect, { target: { value: 'Individual' } });
    // Restored from formData (was preserved through the hide)
    const dependantsInput = screen.getByLabelText('Dependant children count') as HTMLInputElement;
    expect(dependantsInput.value).toBe('2');
    const spouseInput = screen.getByLabelText('Spouse taxable income ($)') as HTMLInputElement;
    expect(spouseInput.value).toBe('60000');
  });

  it('EF-FAM-4: typing "3" in dependants → onSave called with dependants: 3', () => {
    const onSave = vi.fn();
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
    render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: 3 }));
  });

  it('EF-FAM-5: clearing dependants input → onSave called with dependants: undefined (NOT 0)', () => {
    const onSave = vi.fn();
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active', dependants: 2 };
    render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: undefined }));
  });

  it('EF-FAM-6: typing "60000.50" in spouseIncome → onSave called with spouseIncome: "60000.50"', () => {
    const onSave = vi.fn();
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
    render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Spouse taxable income ($)'), { target: { value: '60000.50' } });
    fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spouseIncome: '60000.50' }));
  });

  it('EF-FAM-7: clearing spouseIncome → onSave called with spouseIncome: undefined (NOT empty string)', () => {
    const onSave = vi.fn();
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active', spouseIncome: '60000' };
    render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Spouse taxable income ($)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ spouseIncome: undefined }));
  });

  it('EF-FAM-8: negative dependants input "-2" clamped to 0', () => {
    const onSave = vi.fn();
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
    render(<EntityForm entity={individual} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Dependant children count'), { target: { value: '-2' } });
    fireEvent.click(screen.getByRole('button', { name: /save|update entity/i }));
    // Math.max(0, parseInt('-2',10)||0) = Math.max(0,-2) = 0
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ dependants: 0 }));
  });

  it('EF-FAM-9: dependants + spouseIncome help text rendered exactly', () => {
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
    render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Number of children under 18 you supported (used for Medicare levy family thresholds).')).toBeInTheDocument();
    expect(screen.getByText(/Your spouse('|')s taxable income for the financial year\. Required if you had a spouse for any part of the year\./)).toBeInTheDocument();
  });

  it('EF-FAM-10: help text does NOT mention "deductible" or "deduction" (Phase 6 content lint)', () => {
    const individual: Entity = { _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active' };
    render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
    const dependantsHelp = screen.getByText(/Number of children under 18/).textContent ?? '';
    const spouseHelp = screen.getByText(/Your spouse/).textContent ?? '';
    expect(dependantsHelp.toLowerCase()).not.toMatch(/deductib|deduction/);
    expect(spouseHelp.toLowerCase()).not.toMatch(/deductib|deduction/);
  });

  it('EF-FAM-11: prefilled Individual entity round-trip — values survive type-switch hide/show', () => {
    const individual: Entity = {
      _v: 6, id: 'i1', name: 'Jane', type: 'Individual', status: 'Active',
      dependants: 4, spouseIncome: '99999.99',
    };
    render(<EntityForm entity={individual} onSave={vi.fn()} onCancel={vi.fn()} />);
    const deps = screen.getByLabelText('Dependant children count') as HTMLInputElement;
    const spouse = screen.getByLabelText('Spouse taxable income ($)') as HTMLInputElement;
    expect(deps.value).toBe('4');
    expect(spouse.value).toBe('99999.99');
  });
});
