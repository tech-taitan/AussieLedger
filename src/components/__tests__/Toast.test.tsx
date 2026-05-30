/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for Toast primitive (Phase 9).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('T.1: renders with message text and data-testid="toast"', () => {
    const onDismiss = vi.fn();
    render(<Toast message="hi" onDismiss={onDismiss} />);
    expect(screen.getByTestId('toast')).toBeDefined();
    expect(screen.getByText('hi')).toBeDefined();
  });

  it('T.2: auto-dismisses after default duration (3000ms)', () => {
    const onDismiss = vi.fn();
    render(<Toast message="test" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('T.3: auto-dismisses after custom duration (500ms)', () => {
    const onDismiss = vi.fn();
    render(<Toast message="x" duration={500} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(499);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('T.4: clicking the toast calls onDismiss immediately', () => {
    const onDismiss = vi.fn();
    render(<Toast message="click me" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('toast'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('T.5: toast has role="status" for accessibility', () => {
    const onDismiss = vi.fn();
    render(<Toast message="a11y test" onDismiss={onDismiss} />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('renders with default info tone class', () => {
    const onDismiss = vi.fn();
    const { container } = render(<Toast message="info" onDismiss={onDismiss} />);
    const el = container.querySelector('[data-testid="toast"]');
    expect(el?.className).toContain('bg-[var(--ink)]');
  });

  it('renders with warn tone class when tone="warn"', () => {
    const onDismiss = vi.fn();
    const { container } = render(<Toast message="warn" onDismiss={onDismiss} tone="warn" />);
    const el = container.querySelector('[data-testid="toast"]');
    expect(el?.className).toContain('bg-amber-600');
  });
});
