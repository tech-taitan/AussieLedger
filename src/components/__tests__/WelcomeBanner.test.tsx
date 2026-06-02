/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WelcomeBanner tests — Phase 14 Plan 14-2 Task 1.
 *
 * Locks:
 *   1. Verbatim POL-01 trust-banner copy (em-dash, NOT hyphen).
 *   2. Primary CTA "Create your first entity" invokes onCreateEntity prop.
 *   3. Secondary CTA "Try the demo" navigates window.location.href to '/demo'.
 *   4. Semantic HTML — section with role="region" or accessible name.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeBanner } from '../WelcomeBanner';

// Verbatim POL-01 copy from CONTEXT — em-dash, NOT hyphen.
const TRUST_COPY = 'Your data stays in your browser — no servers, no accounts.';

describe('WelcomeBanner (Phase 14 POL-01)', () => {
  beforeEach(() => {
    vi.stubGlobal('location', { ...window.location, href: '' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the verbatim trust-banner copy (em-dash)', () => {
    render(<WelcomeBanner onCreateEntity={() => {}} />);
    const trustCopy = screen.getByTestId('welcome-trust-copy');
    expect(trustCopy.textContent).toBe(TRUST_COPY);
  });

  it('renders a primary CTA "Create your first entity" that invokes onCreateEntity', () => {
    const onCreateEntity = vi.fn();
    render(<WelcomeBanner onCreateEntity={onCreateEntity} />);
    const button = screen.getByTestId('welcome-create-entity');
    expect(button.textContent).toBe('Create your first entity');
    fireEvent.click(button);
    expect(onCreateEntity).toHaveBeenCalledTimes(1);
  });

  it('renders a secondary CTA "Try the demo" that navigates to /demo', () => {
    render(<WelcomeBanner onCreateEntity={() => {}} />);
    const button = screen.getByTestId('welcome-try-demo');
    expect(button.textContent).toBe('Try the demo');
    fireEvent.click(button);
    expect(window.location.href).toBe('/demo');
  });

  it('uses semantic HTML — section with role="region" and accessible label', () => {
    render(<WelcomeBanner onCreateEntity={() => {}} />);
    const region = screen.getByRole('region', { name: /welcome/i });
    expect(region).toBeInTheDocument();
    expect(region.tagName.toLowerCase()).toBe('section');
  });
});
