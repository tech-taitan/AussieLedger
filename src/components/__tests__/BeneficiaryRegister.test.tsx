/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BeneficiaryRegister } from '../BeneficiaryRegister';
import type { BeneficiaryRow } from '../../types';

describe('BeneficiaryRegister (ENT-07)', () => {
  it('renders for Trust entity', () => {
    render(<BeneficiaryRegister rows={[]} onChange={vi.fn()} />);
    expect(screen.getByTestId('beneficiary-register')).toBeDefined();
    expect(screen.getByTestId('add-beneficiary')).toBeDefined();
    expect(screen.getByText(/No beneficiaries yet/i)).toBeDefined();
  });

  it('stores sharePercent only in UI', () => {
    const rows: BeneficiaryRow[] = [
      {
        id: 'b1',
        name: 'Alice',
        sharePercent: 50,
        sharePerType: { interest: 25, dividend: 25 },
      },
    ];
    render(<BeneficiaryRegister rows={rows} onChange={vi.fn()} />);
    // Only name + share% inputs exposed.
    expect(screen.getByLabelText('beneficiary-name')).toBeDefined();
    expect(screen.getByLabelText('beneficiary-share')).toBeDefined();
    // Phase 5 streaming-override field names must NOT be in UI.
    expect(screen.queryByLabelText(/interest/i)).toBeNull();
    expect(screen.queryByLabelText(/dividend/i)).toBeNull();
    expect(screen.queryByLabelText(/capitalGain/i)).toBeNull();
  });

  it('add row appends new BeneficiaryRow', () => {
    const onChange = vi.fn();
    render(<BeneficiaryRegister rows={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('add-beneficiary'));
    expect(onChange).toHaveBeenCalledOnce();
    const arg = onChange.mock.calls[0][0] as BeneficiaryRow[];
    expect(arg).toHaveLength(1);
    expect(arg[0]).toMatchObject({ name: '', sharePercent: 0 });
    expect(arg[0].id).toBeDefined();
  });

  it('remove row removes existing', () => {
    const onChange = vi.fn();
    const rows: BeneficiaryRow[] = [
      { id: 'b1', name: 'Alice', sharePercent: 50 },
      { id: 'b2', name: 'Bob', sharePercent: 50 },
    ];
    render(<BeneficiaryRegister rows={rows} onChange={onChange} />);
    const removeBtns = screen.getAllByLabelText('remove-beneficiary');
    fireEvent.click(removeBtns[0]);
    expect(onChange).toHaveBeenCalledOnce();
    const arg = onChange.mock.calls[0][0] as BeneficiaryRow[];
    expect(arg).toHaveLength(1);
    expect(arg[0].id).toBe('b2');
  });

  it('total sharePercent warning when not 100', () => {
    const rows: BeneficiaryRow[] = [
      { id: 'b1', name: 'Alice', sharePercent: 50 },
      { id: 'b2', name: 'Bob', sharePercent: 49 },
    ];
    render(<BeneficiaryRegister rows={rows} onChange={vi.fn()} />);
    const warning = screen.getByTestId('beneficiary-warning');
    expect(warning).toBeDefined();
    expect(warning.textContent).toMatch(/99/);
  });
});
