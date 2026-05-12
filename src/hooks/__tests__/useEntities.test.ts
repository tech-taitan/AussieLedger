/**
 * Hook test for useEntities.
 *
 * Phase 2: hooks persisted via localStorage.
 * Phase 3 (Plan 03-2): hooks persist via `StorageAdapter` (IndexedDB / SQLite).
 *
 * Tests preserve the hook public contract; persistence assertions now check
 * the adapter's `getEntities()` rather than `localStorage.getItem(...)`.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEntities } from '../useEntities';
import type { Entity } from '../../types';
import { getAdapter } from '../../storage';

const DEFAULT_ENTITY_COUNT = 2; // Sample Pty Ltd + Sample Family Trust seeded by hook

function makeEntity(id: string, name: string = 'Test Entity'): Entity {
  return {
    id,
    name,
    type: 'Company',
    status: 'Active',
  };
}

describe('useEntities', () => {
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
    const found = result.current.entities.find((e) => e.id === firstEntity.id);
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
    const found = result.current.entities.find((e) => e.id === firstId);
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
    const found = result.current.entities.find((e) => e.id === firstId);
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
    expect(result.current.entities.find((e) => e.id === firstId)).toBeUndefined();
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

  it('persists to adapter on change', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    // Wait for the load useEffect to mark ready before mutating.
    await waitFor(() => {
      expect(result.current.entities).toHaveLength(DEFAULT_ENTITY_COUNT);
    });
    act(() => {
      result.current.createEntity(makeEntity('ent-persist', 'Persist Co'));
    });
    await waitFor(async () => {
      const adapter = await getAdapter();
      const stored = await adapter.getEntities();
      const found = stored.find((e) => e.id === 'ent-persist');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Persist Co');
    });
  });
});

describe('Phase 4 — default-CoA seeding on entity creation (BOOK-05)', () => {
  it.todo('creates default CoA per type');
  it.todo('Trust entity gets BeneficiaryRow placeholder ready');
  it.todo('Partnership entity gets PartnerRow placeholder ready');
  it.todo('archiveEntity sets status Archived');
  it.todo('deleteEntity refuses if journals reference entity, suggests Archive');
});
