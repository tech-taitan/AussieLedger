/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrintBanner, FULL_PRINT_DISCLAIMER } from '../PrintBanner';

describe('PrintBanner', () => {
  it('renders banner title and entity name and disclaimer', () => {
    render(<PrintBanner form="I" entityName="Acme Sole Trader" fy="FY2026" />);
    expect(screen.getByText(/Form I — Individual Tax Return \(NAT 2541\)/)).toBeInTheDocument();
    expect(screen.getByText('Acme Sole Trader')).toBeInTheDocument();
    expect(screen.getByText(FULL_PRINT_DISCLAIMER)).toBeInTheDocument();
  });

  it('shows [LOCKED FY] tag when locked prop is true', () => {
    render(<PrintBanner form="C" entityName="Pty Ltd" fy="FY2026" locked />);
    expect(screen.getByText(/\[LOCKED FY\]/)).toBeInTheDocument();
  });

  it('does not show [LOCKED FY] tag when locked is false (default)', () => {
    render(<PrintBanner form="C" entityName="Pty Ltd" fy="FY2026" />);
    expect(screen.queryByText(/\[LOCKED FY\]/)).toBeNull();
  });

  it('FULL_PRINT_DISCLAIMER includes a "registered tax agent or qualified accountant" prompt', () => {
    // Locked copy assertion — the printed working paper must direct users
    // to professional advice. Removing this should break a test, not slip
    // through silently.
    expect(FULL_PRINT_DISCLAIMER).toMatch(/registered tax agent or qualified accountant/);
  });

  it('uses correct NAT reference per form code', () => {
    const { rerender } = render(<PrintBanner form="T" entityName="The Trust" fy="FY2026" />);
    expect(screen.getByText(/NAT 0660/)).toBeInTheDocument();

    rerender(<PrintBanner form="P" entityName="The Partnership" fy="FY2026" />);
    expect(screen.getByText(/NAT 0659/)).toBeInTheDocument();

    rerender(<PrintBanner form="BAS" entityName="X" fy="FY2026" />);
    expect(screen.getByText(/Business Activity Statement/)).toBeInTheDocument();

    rerender(<PrintBanner form="C" entityName="Y" fy="FY2026" />);
    expect(screen.getByText(/NAT 0656/)).toBeInTheDocument();
  });
});
