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
 * Default entities seeded on first run (when the adapter returns an empty entities array).
 * Duplicated from App.tsx to avoid hook->App import cycle.
 */
const DEFAULT_ENTITIES: Entity[] = [
  {
    _v: 2,
    id: 'ent-1',
    name: 'Sample Pty Ltd',
    type: 'Company',
    registrationNumber: 'ABN 11 111 111 111',
    businessAddress: '1 Sample Street, Sydney NSW 2000',
    contactPerson: 'Demo Contact',
    status: 'Active',
  },
  {
    _v: 2,
    id: 'ent-2',
    name: 'Sample Family Trust',
    type: 'Trust',
    registrationNumber: 'ABN 22 222 222 222',
    businessAddress: '2 Sample Lane, Melbourne VIC 3000',
    contactPerson: 'Demo Contact',
    status: 'Active',
  },
];

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
      if (loaded.length > 0) setEntities(loaded);
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
