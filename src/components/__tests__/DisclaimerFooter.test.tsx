import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisclaimerFooter } from '../DisclaimerFooter';

const EXACT_DISCLAIMER =
  'This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO.';

describe('DisclaimerFooter', () => {
  it('renders a contentinfo footer with the locked disclaimer text verbatim', () => {
    render(<DisclaimerFooter />);
    const footer = screen.getByRole('contentinfo', { name: /compliance disclaimer/i });
    expect(footer).toBeInTheDocument();
    // Check the footer's full text content (whitespace-collapsed) contains the exact disclaimer
    const footerText = footer.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(footerText).toContain(EXACT_DISCLAIMER);
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<DisclaimerFooter className="custom-cls" />);
    expect(container.querySelector('footer.custom-cls')).toBeInTheDocument();
  });
});
