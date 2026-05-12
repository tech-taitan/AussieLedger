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
  it.todo('AU four entity types only');
  it.todo('gstRegistered toggle');
  it.todo('accountingMethod radio');
  it.todo('fyEndDate default 06-30');
  it.todo('delete blocked with journals offers Archive');
  it.todo('Trust entity shows BeneficiaryRegister tab');
  it.todo('Partnership entity shows PartnerRegister tab');
});
