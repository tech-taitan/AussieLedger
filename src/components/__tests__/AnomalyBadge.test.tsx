/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnomalyBadge } from '../AnomalyBadge';

describe('AnomalyBadge', () => {
  it('renders info and warn severity variants', () => {
    const { rerender } = render(<AnomalyBadge severity="info" message="Info msg" />);
    expect(screen.getByTestId('anomaly-badge')).toHaveAttribute('data-severity', 'info');

    rerender(<AnomalyBadge severity="warn" message="Warn msg" />);
    expect(screen.getByTestId('anomaly-badge')).toHaveAttribute('data-severity', 'warn');
  });

  it('prefixes with label when label prop is provided', () => {
    render(<AnomalyBadge severity="warn" message="passive 90%" label="6F" />);
    expect(screen.getByText('[6F]')).toBeInTheDocument();
    expect(screen.getByText(/passive 90%/)).toBeInTheDocument();
  });

  it('renders message without label prefix when label is absent', () => {
    render(<AnomalyBadge severity="info" message="Check this" />);
    expect(screen.getByText(/Check this/)).toBeInTheDocument();
    expect(screen.queryByText(/\[/)).toBeNull();
  });
});
