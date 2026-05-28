/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabelTooltip } from '../LabelTooltip';

describe('LabelTooltip (UX-03)', () => {
  it('Test T.1: renders a button with aria-label "Help for P1" and class containing "no-print"', () => {
    render(<LabelTooltip helpText="X is the gross income label." labelCode="P1" />);
    const btn = screen.getByRole('button', { name: /Help for P1/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('no-print');
  });

  it('Test T.2: renders a span with class containing "print-only" whose textContent equals helpText', () => {
    render(<LabelTooltip helpText="X is the gross income label." labelCode="P1" />);
    // Find the print-only span containing the help text
    const allSpans = document.querySelectorAll('span.print-only');
    expect(allSpans.length).toBeGreaterThan(0);
    // At least one should contain the helpText
    const matchingSpan = Array.from(allSpans).find(
      (s) => s.textContent === 'X is the gross income label.',
    );
    expect(matchingSpan).toBeTruthy();
  });

  it('Test T.3: the button textContent is "?"', () => {
    render(<LabelTooltip helpText="X is the gross income label." labelCode="P1" />);
    const btn = screen.getByRole('button', { name: /Help for P1/i });
    expect(btn.textContent).toBe('?');
  });
});
