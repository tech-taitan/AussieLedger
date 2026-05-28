/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Persona module — Settings persistence + wizard lifecycle pure functions.
 *
 * Settings are per-browser-instance config (not entity data) so they
 * are stored in localStorage under a fixed key. StorageAdapter stays FINAL.
 */

import React from 'react';
import type { Entity } from '../types.js';
import { today } from './period.js';
export type { WizardStateFy } from '../types.js';

// ── Settings types ────────────────────────────────────────────────────────

export interface Settings {
  mode: 'owner' | 'agent';
  primaryEntityId?: string; // auto when one entity; set via radio otherwise
}

export const SETTINGS_KEY = 'aussieledger:settings';

// ── Settings persistence ──────────────────────────────────────────────────

/** Read Settings from localStorage. Returns null on first run or parse error. */
export function getSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? (JSON.parse(raw) as Settings) : null;
  } catch {
    return null;
  }
}

/** Write Settings to localStorage. */
export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/** Remove Settings from localStorage (for tests + Settings page "reset"). */
export function clearSettings(): void {
  localStorage.removeItem(SETTINGS_KEY);
}

// ── useSettings hook ──────────────────────────────────────────────────────

export function useSettings(): {
  settings: Settings | null;
  setSettings: (s: Settings) => void;
  clearSettings: () => void;
} {
  const [settings, setSettingsState] = React.useState<Settings | null>(
    () => getSettings(),
  );

  const setSettings = React.useCallback((s: Settings) => {
    saveSettings(s);
    setSettingsState(s);
  }, []);

  const clearSettingsCallback = React.useCallback(() => {
    clearSettings();
    setSettingsState(null);
  }, []);

  return { settings, setSettings, clearSettings: clearSettingsCallback };
}

// ── Wizard lifecycle pure functions ───────────────────────────────────────

/**
 * Finalise an entity for the given FY.
 * - Sets returnStatusByFy[fy] = 'finalised'
 * - Adds fy to lockedFys (deduped)
 * - Sets wizardState[fy].step = 7 and completedAt = ISO timestamp
 * - NEVER mutates the input entity (returns new object)
 */
export function finaliseEntity(entity: Entity, fy: string): Entity {
  const existingWizardState = entity.wizardState?.[fy] ?? { dismissedAnomalies: [] };
  return {
    ...entity,
    returnStatusByFy: {
      ...entity.returnStatusByFy,
      [fy]: 'finalised' as const,
    },
    lockedFys: Array.from(new Set([...(entity.lockedFys ?? []), fy])),
    wizardState: {
      ...entity.wizardState,
      [fy]: {
        ...existingWizardState,
        step: 7,
        completedAt: today().toISOString(),
      },
    },
  };
}

/**
 * Unfinalise an entity for the given FY.
 * - Sets returnStatusByFy[fy] = 'draft'
 * - Removes fy from lockedFys
 * - Does NOT clear wizardState[fy].completedAt (preserves audit trail)
 * - NEVER mutates the input entity
 */
export function unfinaliseEntity(entity: Entity, fy: string): Entity {
  return {
    ...entity,
    returnStatusByFy: {
      ...entity.returnStatusByFy,
      [fy]: 'draft' as const,
    },
    lockedFys: (entity.lockedFys ?? []).filter((f) => f !== fy),
  };
}

/**
 * Advance wizard step for the given FY.
 * - Creates initial wizardState[fy] = { step: nextStep, dismissedAnomalies: [] } if absent
 * - Preserves existing dismissedAnomalies otherwise
 * - NEVER mutates the input entity
 */
export function advanceStep(entity: Entity, fy: string, nextStep: number): Entity {
  const existing = entity.wizardState?.[fy];
  return {
    ...entity,
    wizardState: {
      ...entity.wizardState,
      [fy]: {
        ...(existing ?? { dismissedAnomalies: [] }),
        step: nextStep,
      },
    },
  };
}

/**
 * Resolve the primary entity ID from settings + available entities.
 * - Returns settings.primaryEntityId if it exists in entities
 * - Returns entities[0].id when exactly one entity exists
 * - Returns null otherwise (no deterministic choice)
 */
export function getPrimaryEntityId(
  entities: Entity[],
  settings: Settings | null,
): string | null {
  if (settings?.primaryEntityId) {
    const found = entities.find((e) => e.id === settings.primaryEntityId);
    if (found) return found.id;
  }
  if (entities.length === 1) return entities[0].id;
  return null;
}
