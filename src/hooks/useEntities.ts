/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { Entity, BeneficiaryRow, PartnerRow, JournalEntry } from '../types';
import { AddLog } from './useAccounts';
import { getAdapter } from '../storage';
import { getDefaultCoaFor, type EntityCoaType } from '../lib/coa';

/**
 * Default entities seeded on first run. Production ships empty — users
 * start with no entities and create their own via the WelcomeBanner /
 * "Add Entity" affordances. The previous Sample Pty Ltd + Sample Family
 * Trust placeholders were removed because they cluttered the Settings
 * Primary Entity card.
 *
 * Tests that depend on a pre-populated entity list seed the adapter
 * themselves via `adapter.saveEntities([...])` before calling
 * `renderHook(useEntities)`.
 */
const DEFAULT_ENTITIES: Entity[] = [];

/**
 * Match the two sample entities that earlier app versions seeded into
 * IDB (`Sample Pty Ltd` + `Sample Family Trust`). On load, we filter
 * these out for existing users so their Settings → Primary Entity card
 * doesn't carry placeholder noise. Only matches if id + exact original
 * name + type are unchanged — a renamed sample is treated as real data
 * the user adopted and is preserved.
 */
function isUnusedSampleEntity(e: Entity): boolean {
  return (
    (e.id === 'ent-1' && e.name === 'Sample Pty Ltd' && e.type === 'Company') ||
    (e.id === 'ent-2' && e.name === 'Sample Family Trust' && e.type === 'Trust')
  );
}

const AU_FOUR: EntityCoaType[] = ['Individual', 'Company', 'Trust', 'Partnership'];

export interface EntitiesHook {
  entities: Entity[];
  selectedEntityIds: string[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  setEntities: (entities: Entity[]) => void;
  /**
   * Adds the entity to in-memory state and (for AU four-type entities) seeds
   * the FY2026 default CoA into the storage adapter. Resolves after the seed
   * write completes — callers (e.g. App.tsx) should await before calling
   * `useAccounts.reload()` so the AccountManager picks up the new rows.
   */
  createEntity: (entity: Entity) => Promise<void>;
  updateEntity: (entity: Entity) => void;
  archiveEntity: (ids: string[]) => void;
  deactivateEntity: (ids: string[]) => void;
  deleteEntity: (ids: string[]) => void;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
  // Phase 4 additions
  /**
   * References-aware delete. For any id whose `allEntries[id]` has >0 entries,
   * the entity is NOT deleted and is returned in `blocked`. Free ids are deleted
   * and returned in `deleted`. Callers (EntityForm) prompt the user to Archive
   * blocked entities instead.
   */
  tryDeleteEntity: (
    ids: string[],
    allEntries: Record<string, JournalEntry[]>,
  ) => { deleted: string[]; blocked: string[] };
  setBeneficiaries: (entityId: string, rows: BeneficiaryRow[]) => void;
  setPartners: (entityId: string, rows: PartnerRow[]) => void;
}

export function useEntities(addLog: AddLog): EntitiesHook {
  const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const adapter = await getAdapter();
      const loaded = await adapter.getEntities();
      if (cancelled) return;
      // Strip the unused Sample Pty Ltd / Sample Family Trust placeholders
      // that earlier versions seeded — preserves anything the user has
      // actually touched.
      const cleaned = loaded.filter((e) => !isUnusedSampleEntity(e));
      if (cleaned.length > 0) setEntities(cleaned);
      setReady(true);
    })().catch((err) => {
      console.error('useEntities load failed', err);
      setReady(true); // unblock UI even on error
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    getAdapter()
      .then((a) => a.saveEntities(entities))
      .catch((err) => console.error('useEntities save failed', err));
  }, [entities, ready]);

  const createEntity = useCallback(
    async (entity: Entity) => {
      setEntities((prev) => [...prev, entity]);
      addLog(
        'CREATE_ENTITY',
        `Created new entity: ${entity.name} (${entity.type})`,
        entity.id,
      );

      // Phase 4 — seed default CoA per entity type. Awaited so App.tsx can
      // chain `useAccounts.reload()` after the seed lands in storage.
      const t = entity.type as EntityCoaType;
      if ((AU_FOUR as string[]).includes(t)) {
        try {
          const adapter = await getAdapter();
          const existing = await adapter.getAccounts();
          const seed = getDefaultCoaFor(t, 'FY2026');
          const byId = Object.fromEntries(existing.map((a) => [a.id, a]));
          for (const s of seed) {
            if (!byId[s.id]) byId[s.id] = s;
          }
          await adapter.saveAccounts(Object.values(byId));
        } catch (err) {
          console.error('default CoA seeding failed', err);
        }
      }
    },
    [addLog],
  );

  const updateEntity = useCallback(
    (entity: Entity) => {
      setEntities((prev) =>
        prev.map((e) => (e.id === entity.id ? entity : e)),
      );
      addLog(
        'UPDATE_ENTITY',
        `Updated entity details for ${entity.name}`,
        entity.id,
      );
    },
    [addLog],
  );

  const archiveEntity = useCallback(
    (ids: string[]) => {
      setEntities((prev) =>
        prev.map((entity) =>
          ids.includes(entity.id)
            ? { ...entity, status: 'Archived' as const }
            : entity,
        ),
      );
      addLog('UPDATE_ENTITY', `Bulk archived ${ids.length} entities`);
      setSelectedEntityIds([]);
    },
    [addLog],
  );

  const deactivateEntity = useCallback(
    (ids: string[]) => {
      setEntities((prev) =>
        prev.map((entity) =>
          ids.includes(entity.id)
            ? { ...entity, status: 'Deactivated' as const }
            : entity,
        ),
      );
      addLog('UPDATE_ENTITY', `Bulk deactivated ${ids.length} entities`);
      setSelectedEntityIds([]);
    },
    [addLog],
  );

  const deleteEntity = useCallback(
    (ids: string[]) => {
      setEntities((prev) => prev.filter((entity) => !ids.includes(entity.id)));
      addLog('UPDATE_ENTITY', `Bulk deleted ${ids.length} entities`);
      setSelectedEntityIds([]);
    },
    [addLog],
  );

  const toggleSelection = useCallback(
    (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setSelectedEntityIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
      );
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedEntityIds([]);
  }, []);

  const tryDeleteEntity = useCallback(
    (
      ids: string[],
      allEntries: Record<string, JournalEntry[]>,
    ): { deleted: string[]; blocked: string[] } => {
      const blocked: string[] = [];
      const deletable: string[] = [];
      for (const id of ids) {
        if ((allEntries[id]?.length ?? 0) > 0) {
          blocked.push(id);
        } else {
          deletable.push(id);
        }
      }
      if (deletable.length > 0) {
        setEntities((prev) => prev.filter((e) => !deletable.includes(e.id)));
        addLog('DELETE_ENTITY', `Deleted ${deletable.length} entities`);
        setSelectedEntityIds([]);
      }
      return { deleted: deletable, blocked };
    },
    [addLog],
  );

  const setBeneficiaries = useCallback(
    (entityId: string, rows: BeneficiaryRow[]) => {
      setEntities((prev) =>
        prev.map((e) =>
          e.id === entityId ? { ...e, _v: 3, beneficiaries: rows } : e,
        ),
      );
      addLog('UPDATE_ENTITY', `Updated beneficiaries (${rows.length} rows)`, entityId);
    },
    [addLog],
  );

  const setPartners = useCallback(
    (entityId: string, rows: PartnerRow[]) => {
      setEntities((prev) =>
        prev.map((e) =>
          e.id === entityId ? { ...e, _v: 3, partners: rows } : e,
        ),
      );
      addLog('UPDATE_ENTITY', `Updated partners (${rows.length} rows)`, entityId);
    },
    [addLog],
  );

  return {
    entities,
    selectedEntityIds,
    activeEntityId,
    setActiveEntityId,
    setEntities,
    createEntity,
    updateEntity,
    archiveEntity,
    deactivateEntity,
    deleteEntity,
    toggleSelection,
    clearSelection,
    tryDeleteEntity,
    setBeneficiaries,
    setPartners,
  };
}
