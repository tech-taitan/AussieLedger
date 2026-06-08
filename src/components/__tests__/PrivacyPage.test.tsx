/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PrivacyPage tests — Phase 14 Plan 14-2 Task 3.
 *
 * Locks:
 *   1. role="main" + h1 "Privacy" present
 *   2. <ul> with 12 <li> children
 *   3. VERBATIM hosted AI privacy bullet (textContent flatten — strips <code>)
 *   4. Repo link to github.com/tech-taitan/AussieLedger
 *   5. "Apache 2.0" disclosed
 *   6. "no cookies" mentioned
 *   7. "no analytics" mentioned
 *   8. "IndexedDB" mentioned
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrivacyPage } from '../PrivacyPage';

// Verbatim hosted AI privacy bullet.
// textContent flatten strips the inline <code> tags around GEMINI_API_KEY.
const VERBATIM_AI_BULLET =
  'AI features are not available on the public hosted version. Self-host with your own GEMINI_API_KEY on a local Express server to enable AI account-matching today. The public hosted build does not send data to Google.';

describe('PrivacyPage (Phase 14 POL-03)', () => {
  it('renders with role="main" and an <h1> "Privacy" heading', () => {
    render(<PrivacyPage />);
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    const heading = screen.getByRole('heading', { level: 1, name: /privacy/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders a <ul> with exactly 12 <li> children', () => {
    render(<PrivacyPage />);
    const list = screen.getByTestId('privacy-bullets');
    expect(list.tagName.toLowerCase()).toBe('ul');
    const items = list.querySelectorAll(':scope > li');
    expect(items.length).toBe(12);
  });

  it('contains the VERBATIM hosted AI privacy bullet (textContent flatten)', () => {
    render(<PrivacyPage />);
    const ai = screen.getByTestId('privacy-ai-bullet');
    // textContent strips <code> tags so the embedded GEMINI_API_KEY flattens
    // to plain text. Whitespace-normalise to handle JSX line wraps.
    const flat = (ai.textContent ?? '').replace(/\s+/g, ' ').trim();
    expect(flat).toBe(VERBATIM_AI_BULLET);
  });

  it('contains a link to the GitHub repo at github.com/tech-taitan/AussieLedger', () => {
    render(<PrivacyPage />);
    const link = screen.getByTestId('privacy-repo-link');
    expect(link.getAttribute('href')).toBe('https://github.com/tech-taitan/AussieLedger');
  });

  it('mentions "Apache 2.0" (license disclosure)', () => {
    render(<PrivacyPage />);
    const main = screen.getByRole('main');
    expect(main.textContent).toMatch(/Apache 2\.0/);
  });

  it('mentions "no cookies" (cookies bullet)', () => {
    render(<PrivacyPage />);
    const main = screen.getByRole('main');
    expect(main.textContent?.toLowerCase()).toMatch(/no cookies/);
  });

  it('mentions "no analytics" (analytics bullet)', () => {
    render(<PrivacyPage />);
    const main = screen.getByRole('main');
    expect(main.textContent?.toLowerCase()).toMatch(/no analytics/);
  });

  it('mentions "IndexedDB" (server-side storage bullet)', () => {
    render(<PrivacyPage />);
    const main = screen.getByRole('main');
    expect(main.textContent).toMatch(/IndexedDB/);
  });
});
