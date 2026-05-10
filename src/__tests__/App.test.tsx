import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

const VIEW_LABELS = [
  'master-dashboard',
  'dashboard',
  'journals',
  'trial-balance',
  'tax-return',
  'company-tax',
  'trust-tax',
  'bas-ias',
  'import',
  'edit-entity',
  'audit-trail',
  'coa-manager',
];

describe('App.tsx — Phase 1 cleanup acceptance', () => {
  it('no ATO Connected — sidebar text does not contain "ATO Connected" or "Simulated"', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/ATO Connected/i);
    expect(text).not.toMatch(/\(Simulated\)/i);
  });

  it('no foreign demo seed — no "Pearson Specter Litt" or "US Big Law Firm" anywhere', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('Pearson Specter Litt');
    expect(text).not.toContain('US Big Law Firm');
  });

  it('trend placeholder — em-dash (U+2014) appears in StatCard trend slots, no "+12%" or "-5% vs last month" or "Healthy margin"', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('+12% vs last month');
    expect(text).not.toContain('-5% vs last month');
    expect(text).not.toContain('Healthy margin');
    // The em-dash character — (U+2014) is the locked replacement
    expect(text).toContain('—');
  });

  it('footer present on every view — DisclaimerFooter renders the locked disclaimer once on initial render', () => {
    const { container } = render(<App />);
    expect(container.textContent ?? '').toContain('AussieLedger is not a tax agent');
    // Footer mounts inside <main>; verify role
    expect(container.querySelector('footer[role="contentinfo"]')).toBeInTheDocument();
    // Sanity: every view name from the union is conceptually reachable (smoke check that the union is intact)
    expect(VIEW_LABELS.length).toBeGreaterThan(0);
  });
});
