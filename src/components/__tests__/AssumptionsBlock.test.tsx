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

describe('AssumptionsBlock — Phase 8 dynamic assumptions prop', () => {
  it('renders the custom assumptions list when prop is provided', () => {
    render(<AssumptionsBlock assumptions={['Custom row 1', 'Custom row 2']} />);
    expect(screen.getByText('· Custom row 1')).toBeInTheDocument();
    expect(screen.getByText('· Custom row 2')).toBeInTheDocument();
    // Static rows NOT present
    expect(screen.queryByText(`· ${ASSUMPTIONS[0]}`)).not.toBeInTheDocument();
  });

  it('renders an empty list when assumptions=[] is provided (respects empty array)', () => {
    const { container } = render(<AssumptionsBlock assumptions={[]} />);
    const li = container.querySelectorAll('[data-testid="assumptions-block"] li');
    expect(li.length).toBe(0);
    expect(screen.getByText(/Assumptions used by this working paper/)).toBeInTheDocument();
  });

  it('keeps the Phase 6 caveat footer regardless of assumptions prop', () => {
    render(<AssumptionsBlock assumptions={['x']} />);
    expect(screen.getByText(/Phase 6 wizard will capture real values/)).toBeInTheDocument();
  });
});
