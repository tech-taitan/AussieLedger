/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for UpdateBanner (Phase 13 PWA-01).
 *
 * Locks:
 *   - Renders nothing when useUpdateBanner returns visible=false
 *   - Renders the VERBATIM CONTEXT copy "A new version of AussieLedger is
 *     available." when visible=true
 *   - Update button (data-testid='update-banner-update') invokes
 *     triggerUpdate from the hook
 *   - Later button (data-testid='update-banner-later') invokes snooze from
 *     the hook
 *   - role="status" attribute is present
 *   - Fixed top-0 left-0 right-0 z-50 positioning classes (locks the
 *     positioning decision against regression — see 13-2-PLAN truth #12/#13)
 *
 * Tests stub the useUpdateBanner hook via vi.spyOn — distinct from the
 * hook's own tests (which use the __setRegisterSWForTests seam to control
 * registerSW). Here we don't care about the registration internals; we just
 * need to verify the component renders correctly for any given hook output.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UpdateBanner } from '../UpdateBanner';
import * as hookModule from '../../hooks/useUpdateBanner';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('UpdateBanner — visibility', () => {
  it('renders nothing when visible is false', () => {
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: false,
      needRefresh: false,
      triggerUpdate: vi.fn(),
      snooze: vi.fn(),
    });
    const { container } = render(<UpdateBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the verbatim CONTEXT copy when visible is true', () => {
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: true,
      needRefresh: true,
      triggerUpdate: vi.fn(),
      snooze: vi.fn(),
    });
    render(<UpdateBanner />);
    expect(
      screen.getByText('A new version of AussieLedger is available.'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('update-banner')).toBeInTheDocument();
    expect(screen.getByTestId('update-banner-update')).toBeInTheDocument();
    expect(screen.getByTestId('update-banner-later')).toBeInTheDocument();
  });
});

describe('UpdateBanner — button wiring', () => {
  it('clicking Update button invokes triggerUpdate', () => {
    const triggerUpdate = vi.fn();
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: true,
      needRefresh: true,
      triggerUpdate,
      snooze: vi.fn(),
    });
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-update'));
    expect(triggerUpdate).toHaveBeenCalledTimes(1);
  });

  it('clicking Later button invokes snooze', () => {
    const snooze = vi.fn();
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: true,
      needRefresh: true,
      triggerUpdate: vi.fn(),
      snooze,
    });
    render(<UpdateBanner />);
    fireEvent.click(screen.getByTestId('update-banner-later'));
    expect(snooze).toHaveBeenCalledTimes(1);
  });
});

describe('UpdateBanner — accessibility + positioning lock', () => {
  it('uses role="status" (informational, polite — matches AdapterFallbackBanner pattern)', () => {
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: true,
      needRefresh: true,
      triggerUpdate: vi.fn(),
      snooze: vi.fn(),
    });
    render(<UpdateBanner />);
    const banner = screen.getByTestId('update-banner');
    expect(banner).toHaveAttribute('role', 'status');
  });

  it('uses fixed top-0 left-0 right-0 z-50 positioning (floats above MainLayout chrome)', () => {
    vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
      visible: true,
      needRefresh: true,
      triggerUpdate: vi.fn(),
      snooze: vi.fn(),
    });
    render(<UpdateBanner />);
    const banner = screen.getByTestId('update-banner');
    expect(banner.className).toMatch(/\bfixed\b/);
    expect(banner.className).toMatch(/\btop-0\b/);
    expect(banner.className).toMatch(/\bleft-0\b/);
    expect(banner.className).toMatch(/\bright-0\b/);
    expect(banner.className).toMatch(/\bz-50\b/);
  });
});
