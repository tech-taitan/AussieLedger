import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfGate } from '../PdfGate';

describe('PdfGate', () => {
  it('button is disabled by default', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button enables after checkbox tick', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls onConfirmed when enabled button clicked', () => {
    const onConfirmed = vi.fn();
    render(<PdfGate onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirmed when disabled button clicked (unchecked)', () => {
    const onConfirmed = vi.fn();
    render(<PdfGate onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('isLoading prop forces button text to "Generating..." and keeps it disabled', () => {
    render(<PdfGate onConfirmed={() => {}} isLoading />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Generating');
  });

  it('renders the locked confirmation label verbatim', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    expect(
      screen.getByText(/I confirm I have reviewed these figures and understand this is a working paper, not lodged advice\./i),
    ).toBeInTheDocument();
  });
});
