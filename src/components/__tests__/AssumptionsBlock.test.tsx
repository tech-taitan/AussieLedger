/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssumptionsBlock, ASSUMPTIONS } from '../AssumptionsBlock';

describe('AssumptionsBlock', () => {
  it('renders five assumption lines', () => {
    render(<AssumptionsBlock />);
    ASSUMPTIONS.forEach((line) => {
      expect(screen.getByText(`· ${line}`)).toBeInTheDocument();
    });
  });

  it('renders the section header', () => {
    render(<AssumptionsBlock />);
    expect(
      screen.getByText(/Assumptions used by this working paper/),
    ).toBeInTheDocument();
  });

  it('renders the Phase 6 caveat footer', () => {
    render(<AssumptionsBlock />);
    expect(screen.getByText(/Phase 6 wizard will capture real values/)).toBeInTheDocument();
  });
});
