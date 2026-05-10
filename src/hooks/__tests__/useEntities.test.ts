/**
 * Hook test scaffold for useEntities.
 *
 * RED-by-design until Plan 02-2 creates src/hooks/useEntities.ts.
 * Once 02-2 lands, these tests must all pass (GREEN).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntities } from '../useEntities';
import type { Entity } from '../../types';

const DEFAULT_ENTITY_COUNT = 2; // Sample Pty Ltd + Sample Family Trust from constants

function makeEntity(id: string, name: string = 'Test Entity'): Entity {
  return {
    id,
    name,
    type: 'Company',
    status: 'Active',
  };
}

describe('useEntities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with DEFAULT_ENTITIES (2 entities)', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    expect(result.current.entities).toHaveLength(DEFAULT_ENTITY_COUNT);
  });

  it('createEntity appends and calls addLog with CREATE_ENTITY', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    act(() => {
      result.current.createEntity(makeEntity('ent-new', 'New Company Pty Ltd'));
    });
    expect(result.current.entities).toHaveLength(DEFAULT_ENTITY_COUNT + 1);
    expect(addLog).toHaveBeenCalledOnce();
    expect(addLog.mock.calls[0][0]).toBe('CREATE_ENTITY');
  });

  it('updateEntity replaces existing entity and calls addLog with UPDATE_ENTITY', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstEntity = result.current.entities[0];
    act(() => {
      result.current.updateEntity({ ...firstEntity, name: 'Updated Name Pty Ltd' });
    });
    const found = result.current.entities.find(e => e.id === firstEntity.id);
    expect(found?.name).toBe('Updated Name Pty Ltd');
    expect(addLog).toHaveBeenCalledOnce();
    expect(addLog.mock.calls[0][0]).toBe('UPDATE_ENTITY');
  });

  it('archiveEntity flips status to Archived for given ids and calls addLog', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    act(() => {
      result.current.archiveEntity([firstId]);
    });
    const found = result.current.entities.find(e => e.id === firstId);
    expect(found?.status).toBe('Archived');
    expect(addLog).toHaveBeenCalledOnce();
  });

  it('deactivateEntity flips status to Deactivated', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    act(() => {
      result.current.deactivateEntity([firstId]);
    });
    const found = result.current.entities.find(e => e.id === firstId);
    expect(found?.status).toBe('Deactivated');
  });

  it('deleteEntity removes given ids', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    act(() => {
      result.current.deleteEntity([firstId]);
    });
    expect(result.current.entities).toHaveLength(DEFAULT_ENTITY_COUNT - 1);
    expect(result.current.entities.find(e => e.id === firstId)).toBeUndefined();
  });

  it('toggleSelection adds/removes id from selectedEntityIds', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    act(() => {
      result.current.toggleSelection(firstId);
    });
    expect(result.current.selectedEntityIds).toContain(firstId);
    act(() => {
      result.current.toggleSelection(firstId);
    });
    expect(result.current.selectedEntityIds).not.toContain(firstId);
  });

  it('persists to ledger_entities_list on change', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    act(() => {
      result.current.createEntity(makeEntity('ent-persist', 'Persist Co'));
    });
    const stored = JSON.parse(localStorage.getItem('ledger_entities_list') ?? '[]');
    const found = stored.find((e: Entity) => e.id === 'ent-persist');
    expect(found).toBeDefined();
    expect(found.name).toBe('Persist Co');
  });
});
