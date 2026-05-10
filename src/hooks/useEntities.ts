/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { Entity } from '../types';
import { AddLog } from './useAccounts';

const STORAGE_KEY = 'ledger_entities_list';

/**
 * Default entities seeded on first run (when no ledger_entities_list in localStorage).
 * Duplicated from App.tsx to avoid hook→App import cycle.
 */
const DEFAULT_ENTITIES: Entity[] = [
  { _v: 1, id: 'ent-1', name: 'Sample Pty Ltd', type: 'Company', registrationNumber: 'ABN 11 111 111 111', businessAddress: '1 Sample Street, Sydney NSW 2000', contactPerson: 'Demo Contact', status: 'Active' },
  { _v: 1, id: 'ent-2', name: 'Sample Family Trust', type: 'Trust', registrationNumber: 'ABN 22 222 222 222', businessAddress: '2 Sample Lane, Melbourne VIC 3000', contactPerson: 'Demo Contact', status: 'Active' },
];

export interface EntitiesHook {
  entities: Entity[];
  selectedEntityIds: string[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  setEntities: (entities: Entity[]) => void;
  createEntity: (entity: Entity) => void;
  updateEntity: (entity: Entity) => void;
  archiveEntity: (ids: string[]) => void;
  deactivateEntity: (ids: string[]) => void;
  deleteEntity: (ids: string[]) => void;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
}

export function useEntities(addLog: AddLog): EntitiesHook {
  const [entities, setEntities] = useState<Entity[]>(DEFAULT_ENTITIES);
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Entity[];
      if (Array.isArray(parsed)) setEntities(parsed);
    } catch (err) {
      console.error('Failed to parse ledger_entities_list', err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entities));
  }, [entities]);

  const createEntity = useCallback((entity: Entity) => {
    setEntities(prev => [...prev, entity]);
    addLog('CREATE_ENTITY', `Created new entity: ${entity.name} (${entity.type})`, entity.id);
  }, [addLog]);

  const updateEntity = useCallback((entity: Entity) => {
    setEntities(prev => prev.map(e => e.id === entity.id ? entity : e));
    addLog('UPDATE_ENTITY', `Updated entity details for ${entity.name}`, entity.id);
  }, [addLog]);

  const archiveEntity = useCallback((ids: string[]) => {
    setEntities(prev => prev.map(entity =>
      ids.includes(entity.id) ? { ...entity, status: 'Archived' as const } : entity
    ));
    addLog('UPDATE_ENTITY', `Bulk archived ${ids.length} entities`);
    setSelectedEntityIds([]);
  }, [addLog]);

  const deactivateEntity = useCallback((ids: string[]) => {
    setEntities(prev => prev.map(entity =>
      ids.includes(entity.id) ? { ...entity, status: 'Deactivated' as const } : entity
    ));
    addLog('UPDATE_ENTITY', `Bulk deactivated ${ids.length} entities`);
    setSelectedEntityIds([]);
  }, [addLog]);

  const deleteEntity = useCallback((ids: string[]) => {
    setEntities(prev => prev.filter(entity => !ids.includes(entity.id)));
    addLog('UPDATE_ENTITY', `Bulk deleted ${ids.length} entities`);
    setSelectedEntityIds([]);
  }, [addLog]);

  const toggleSelection = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEntityIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntityIds([]);
  }, []);

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
  };
}
