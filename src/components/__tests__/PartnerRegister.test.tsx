/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartnerRegister } from '../PartnerRegister';
import type { PartnerRow } from '../../types';

describe('PartnerRegister (ENT-08)', () => {
  it('renders for Partnership entity', () => {
    render(<PartnerRegister rows={[]} onChange={vi.fn()} />);
    expect(screen.getByTestId('partner-register')).toBeDefined();
    expect(screen.getByTestId('add-partner')).toBeDefined();
    expect(screen.getByText(/No partners yet/i)).toBeDefined();
  });

  it('add row appends new PartnerRow', () => {
    const onChange = vi.fn();
    render(<PartnerRegister rows={[]} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('add-partner'));
    expect(onChange).toHaveBeenCalledOnce();
    const arg = onChange.mock.calls[0][0] as PartnerRow[];
    expect(arg).toHaveLength(1);
    expect(arg[0]).toMatchObject({ name: '', sharePercent: 0 });
    expect(arg[0].id).toBeDefined();
  });

  it('total sharePercent warning when not 100', () => {
    const rows: PartnerRow[] = [
      { id: 'p1', name: 'Bob', sharePercent: 33 },
      { id: 'p2', name: 'Carol', sharePercent: 33 },
    ];
    render(<PartnerRegister rows={rows} onChange={vi.fn()} />);
    const warning = screen.getByTestId('partner-warning');
    expect(warning).toBeDefined();
    expect(warning.textContent).toMatch(/66/);
  });
});
