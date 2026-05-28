/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getSettings,
  saveSettings,
  clearSettings,
  finaliseEntity,
  unfinaliseEntity,
  advanceStep,
  SETTINGS_KEY,
} from '../persona';
import type { Entity } from '../../types';

// ── Minimal fixture entity ────────────────────────────────────────────────
function makeEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'e1',
    name: 'Acme Pty',
    type: 'Company',
    status: 'Active',
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('getSettings / saveSettings (UX-05)', () => {
  it('Test 3.1: returns null when localStorage is empty', () => {
    expect(getSettings()).toBeNull();
  });

  it('Test 3.2: saveSettings + getSettings round-trips { mode, primaryEntityId }', () => {
    saveSettings({ mode: 'owner', primaryEntityId: 'e1' });
    expect(getSettings()).toEqual({ mode: 'owner', primaryEntityId: 'e1' });
  });

  it("Test 3.3: agent mode — primaryEntityId absent when not provided", () => {
    saveSettings({ mode: 'agent' });
    const s = getSettings();
    expect(s?.mode).toBe('agent');
    expect(s?.primaryEntityId).toBeUndefined();
  });

  it("Test 3.4: storage key is literally 'aussieledger:settings'", () => {
    saveSettings({ mode: 'owner' });
    expect(localStorage.getItem(SETTINGS_KEY)).not.toBeNull();
    expect(localStorage.getItem('aussieledger:settings')).not.toBeNull();
  });
});

describe('finaliseEntity (UX-01 / PERS-03)', () => {
  it('Test 3.5: finaliseEntity sets returnStatusByFy[FY2026] = finalised + lockedFys + completedAt + step 7', () => {
    const entity = makeEntity();
    const out = finaliseEntity(entity, 'FY2026');
    expect(out.returnStatusByFy?.['FY2026']).toBe('finalised');
    expect(out.lockedFys).toContain('FY2026');
    expect(out.wizardState?.['FY2026'].completedAt).toBeTruthy();
    // ISO string check
    expect(() => new Date(out.wizardState!['FY2026'].completedAt!)).not.toThrow();
    expect(out.wizardState?.['FY2026'].step).toBe(7);
  });

  it('Test 3.6: finaliseEntity does NOT mutate original entity (immutable)', () => {
    const entity = makeEntity();
    const before = JSON.stringify(entity);
    finaliseEntity(entity, 'FY2026');
    expect(JSON.stringify(entity)).toBe(before);
  });
});

describe('unfinaliseEntity (UX-01)', () => {
  it('Test 3.7: unfinaliseEntity sets returnStatusByFy[FY2026] = draft and removes from lockedFys', () => {
    const entity = makeEntity({ lockedFys: ['FY2025', 'FY2026'] });
    const finalised = finaliseEntity(entity, 'FY2026');
    const out = unfinaliseEntity(finalised, 'FY2026');
    expect(out.returnStatusByFy?.['FY2026']).toBe('draft');
    expect(out.lockedFys).not.toContain('FY2026');
    expect(out.lockedFys).toContain('FY2025');
  });
});

describe('advanceStep (UX-01)', () => {
  it('Test 3.8: advanceStep sets wizardState[FY2026].step and preserves dismissedAnomalies', () => {
    const entity = makeEntity({
      wizardState: {
        FY2026: { step: 2, dismissedAnomalies: ['anomaly-1'] },
      },
    });
    const out = advanceStep(entity, 'FY2026', 3);
    expect(out.wizardState?.['FY2026'].step).toBe(3);
    expect(out.wizardState?.['FY2026'].dismissedAnomalies).toEqual(['anomaly-1']);
  });

  it('Test 3.9: advanceStep creates initial dismissedAnomalies: [] when wizardState[fy] absent', () => {
    const entity = makeEntity();
    const out = advanceStep(entity, 'FY2026', 2);
    expect(out.wizardState?.['FY2026'].step).toBe(2);
    expect(out.wizardState?.['FY2026'].dismissedAnomalies).toEqual([]);
  });
});

describe('PERS-03 — chained mutations do not bleed across steps', () => {
  it('Test 3.10: finalise → advanceStep → unfinalise chain does not mutate non-wizard fields', () => {
    const original = makeEntity({
      notes: 'test-notes',
      gstRegistered: true,
      beneficiaries: [{ id: 'b1', name: 'Bob', sharePercent: 100 }],
    });
    const finalised = finaliseEntity(original, 'FY2026');
    const stepped = advanceStep(finalised, 'FY2026', 3);
    const unfinalised = unfinaliseEntity(stepped, 'FY2026');

    // Non-wizard fields untouched
    expect(unfinalised.notes).toBe('test-notes');
    expect(unfinalised.gstRegistered).toBe(true);
    expect(unfinalised.beneficiaries).toEqual([{ id: 'b1', name: 'Bob', sharePercent: 100 }]);

    // Only returnStatusByFy, wizardState, lockedFys changed
    expect(unfinalised.returnStatusByFy?.['FY2026']).toBe('draft');
    expect(unfinalised.lockedFys).not.toContain('FY2026');
  });
});
