/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ProfessionalAdviceBanner,
  PROFESSIONAL_ADVICE_COPY,
} from '../ProfessionalAdviceBanner';

describe('ProfessionalAdviceBanner', () => {
  it('renders with the testid hook', () => {
    render(<ProfessionalAdviceBanner />);
    expect(screen.getByTestId('professional-advice-banner')).toBeTruthy();
  });

  it('renders the locked copy verbatim', () => {
    render(<ProfessionalAdviceBanner />);
    expect(screen.getByText(PROFESSIONAL_ADVICE_COPY)).toBeTruthy();
  });

  it('copy explicitly mentions "registered tax agent or qualified accountant"', () => {
    expect(PROFESSIONAL_ADVICE_COPY).toMatch(/registered tax agent or qualified accountant/);
  });

  it('copy explicitly mentions "does not provide tax or accounting advice"', () => {
    expect(PROFESSIONAL_ADVICE_COPY).toMatch(/does not provide tax or accounting advice/);
  });

  it('copy explicitly mentions "before lodging"', () => {
    expect(PROFESSIONAL_ADVICE_COPY).toMatch(/before lodging/);
  });

  it('uses role=note + aria-label for screen readers', () => {
    render(<ProfessionalAdviceBanner />);
    const node = screen.getByRole('note', { name: 'Professional advice disclaimer' });
    expect(node).toBeTruthy();
  });

  it('accepts an optional className for caller-controlled spacing', () => {
    render(<ProfessionalAdviceBanner className="custom-extra" />);
    const node = screen.getByTestId('professional-advice-banner');
    expect(node.className).toContain('custom-extra');
  });
});
