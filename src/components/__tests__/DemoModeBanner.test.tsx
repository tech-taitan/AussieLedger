/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoModeBanner tests — Phase 14 Plan 14-2 Task 2.
 *
 * Locks:
 *   1. Renders verbatim POL-02 copy on /demo (em-dash, NOT hyphen).
 *   2. Returns null on non-/demo routes (zero DOM cost).
 *   3. Exit-demo button sets window.location.href = '/'.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DemoModeBanner } from '../DemoModeBanner';

// Verbatim POL-02 copy from CONTEXT — em-dash, NOT hyphen.
const DEMO_COPY = 'Demo Mode — playing with sample data. Your real data is safe.';

describe('DemoModeBanner (Phase 14 POL-02)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders verbatim copy + Exit-demo button on /demo pathname', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/demo', href: '' });
    render(<DemoModeBanner />);
    const banner = screen.getByTestId('demo-mode-banner');
    expect(banner).toBeInTheDocument();
    const copy = screen.getByTestId('demo-mode-copy');
    expect(copy.textContent).toBe(DEMO_COPY);
    const exit = screen.getByTestId('demo-mode-exit');
    expect(exit.textContent).toMatch(/exit/i);
  });

  it('returns null on non-/demo pathname (renders nothing)', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/', href: '' });
    render(<DemoModeBanner />);
    expect(screen.queryByTestId('demo-mode-banner')).toBeNull();
  });

  it('clicking Exit-demo navigates to / via window.location.href', () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/demo', href: '' });
    render(<DemoModeBanner />);
    const exit = screen.getByTestId('demo-mode-exit');
    fireEvent.click(exit);
    expect(window.location.href).toBe('/');
  });
});
