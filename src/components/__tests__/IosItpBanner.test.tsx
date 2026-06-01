/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for IosItpBanner (Phase 11 IDB-04).
 *
 * Gate matrix: ALL four gates must pass for the banner to render.
 *   1. isHostedMode() === true
 *   2. iOS Safari UA (CriOS/FxiOS/EdgiOS rejected)
 *   3. !isStandalone (display-mode: standalone === false)
 *   4. !dismissed (sessionStorage key !== 'true')
 *
 * Plus: verbatim copy lock, How? expand, dismiss persists across remount.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IosItpBanner } from '../IosItpBanner';
import * as envModule from '../../lib/env';

const DISMISS_KEY = 'aussieledger:ios-itp-banner-dismissed';

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1';
const IOS_FIREFOX_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1';
const IOS_EDGE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/120.0 Mobile/15E148 Safari/604.1';

const VERBATIM_COPY =
  "Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe.";

function mockUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => ua });
}

function mockStandalone(matches: boolean) {
  // Override window.matchMedia for the display-mode: standalone query
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: query === '(display-mode: standalone)' ? matches : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

describe('IosItpBanner gate matrix', () => {
  beforeEach(() => {
    sessionStorage.removeItem(DISMISS_KEY);
    mockUA(IOS_SAFARI_UA);
    mockStandalone(false);
    vi.spyOn(envModule, 'isHostedMode').mockReturnValue(true);
  });

  afterEach(() => {
    sessionStorage.removeItem(DISMISS_KEY);
    vi.restoreAllMocks();
  });

  it('Test 1: isHostedMode=false → returns null', () => {
    vi.spyOn(envModule, 'isHostedMode').mockReturnValue(false);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 2: desktop UA → returns null', () => {
    mockUA(DESKTOP_UA);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 3: Chrome-on-iOS (CriOS) → returns null', () => {
    mockUA(IOS_CHROME_UA);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 4: Firefox-on-iOS (FxiOS) → returns null', () => {
    mockUA(IOS_FIREFOX_UA);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 5: Edge-on-iOS (EdgiOS) → returns null', () => {
    mockUA(IOS_EDGE_UA);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 6: standalone=true → returns null', () => {
    mockStandalone(true);
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 7: sessionStorage dismissed=true → returns null', () => {
    sessionStorage.setItem(DISMISS_KEY, 'true');
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 8: all gates pass → renders banner', () => {
    render(<IosItpBanner />);
    expect(screen.getByTestId('ios-itp-banner')).toBeInTheDocument();
  });

  it('Test 9: verbatim copy matches the locked text exactly', () => {
    render(<IosItpBanner />);
    // Use a partial match to locate the paragraph, then assert the full
    // verbatim text on the rendered element (JSX &apos; renders as ').
    const para = screen.getByText(/Heads up: iOS Safari may clear/);
    expect(para.textContent).toBe(VERBATIM_COPY);
  });

  it('Test 10: includes <details>How?</summary> expand with Share-menu steps', () => {
    render(<IosItpBanner />);
    const summary = screen.getByText('How?');
    expect(summary.tagName.toLowerCase()).toBe('summary');
    // Inner content mentions "Share" (the iOS Share menu)
    const banner = screen.getByTestId('ios-itp-banner');
    expect(banner.textContent).toMatch(/Share/);
  });

  it('Test 11: dismiss button click writes sessionStorage AND removes the banner', () => {
    render(<IosItpBanner />);
    const dismiss = screen.getByTestId('ios-itp-banner-dismiss');
    fireEvent.click(dismiss);
    expect(sessionStorage.getItem(DISMISS_KEY)).toBe('true');
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });

  it('Test 12: dismiss persists across unmount/remount within the same session', () => {
    const { unmount } = render(<IosItpBanner />);
    const dismiss = screen.getByTestId('ios-itp-banner-dismiss');
    fireEvent.click(dismiss);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
    unmount();

    // Remount in the same "session" (sessionStorage carries) → returns null
    render(<IosItpBanner />);
    expect(screen.queryByTestId('ios-itp-banner')).toBeNull();
  });
});
