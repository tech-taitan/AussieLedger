/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings page — mode toggle, primary entity selection, first-run prompt reset.
 * UX-05, PERS-01, PERS-02.
 */

import React from 'react';
import type { Settings as SettingsType } from '../lib/persona';
import type { Entity } from '../types';

interface SettingsProps {
  settings: SettingsType | null;
  onChange: (s: SettingsType) => void;
  onClearSettings: () => void;
  entities: Entity[];
  /** Phase 15 POL-CODE-05 — currently-active entity (looked up by ViewRouter from activeEntityId). */
  activeEntity?: Entity;
  /** Phase 15 POL-CODE-05 — invoked when the Active Entity Edit button is clicked; delegates to setView('edit-entity'). */
  onEditActiveEntity?: () => void;
}

export function Settings({
  settings,
  onChange,
  onClearSettings,
  entities,
  activeEntity,
  onEditActiveEntity,
}: SettingsProps): React.JSX.Element {
  const mode = settings?.mode ?? 'owner';

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-xl font-bold">Settings</h2>

      <section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider">Mode</h3>
        <p className="text-xs text-gray-500">
          Owner mode: simplified nav for running your own business. Agent mode:
          multi-client list for managing clients.
        </p>
        <select
          data-testid="settings-mode-toggle"
          value={mode}
          onChange={(e) =>
            onChange({
              mode: e.target.value as 'owner' | 'agent',
              primaryEntityId: settings?.primaryEntityId,
            })
          }
          className="border border-[var(--line)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--ink)]"
        >
          <option value="owner">Owner — running my own business</option>
          <option value="agent">Agent — I manage clients</option>
        </select>
      </section>

      {mode === 'owner' && entities.length >= 2 && (
        <section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">
          <h3 className="font-bold text-sm uppercase tracking-wider">
            Primary Entity
          </h3>
          <p className="text-xs text-gray-500">
            Select which entity is your primary when in owner mode.
          </p>
          <div
            data-testid="settings-primary-entity"
            className="space-y-2"
          >
            {entities.map((e) => (
              <label key={e.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="primary-entity"
                  value={e.id}
                  checked={settings?.primaryEntityId === e.id}
                  onChange={() => onChange({ mode, primaryEntityId: e.id })}
                  className="accent-[var(--ink)]"
                />
                <span className="text-sm">{e.name}</span>
                <span className="text-xs text-gray-400">({e.type})</span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* Phase 15 POL-CODE-05 — Active Entity section. Duplicate access point to setView('edit-entity'); */}
      {/* ViewRouter.tsx:179 header button stays unchanged per CONTEXT decision. */}
      <section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider">Active Entity</h3>
        {activeEntity ? (
          <>
            <p className="text-sm">
              {activeEntity.name}
              <span className="text-xs text-gray-400 ml-2">({activeEntity.type})</span>
            </p>
            <button
              data-testid="settings-edit-active-entity"
              onClick={() => onEditActiveEntity?.()}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              Edit Entity Details
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-500">No active entity selected</p>
            <p className="text-xs text-gray-400">Select an entity from the Master Dashboard to edit</p>
          </>
        )}
      </section>

      <section className="bg-white border border-[var(--line-strong)] p-6 space-y-3">
        <h3 className="font-bold text-sm uppercase tracking-wider">
          First-Run Prompt
        </h3>
        <p className="text-xs text-gray-500">
          Show the mode selection prompt again on next load.
        </p>
        <button
          data-testid="settings-clear"
          onClick={onClearSettings}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          Show mode prompt again
        </button>
      </section>
    </div>
  );
}
