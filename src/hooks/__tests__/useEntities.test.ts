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
import type { Entity, Account } from '../../types';
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
  it('creates default CoA per type', async () => {
    const addLog = vi.fn();
    const adapter = await getAdapter();
    const saveSpy = vi.spyOn(adapter, 'saveAccounts');
    const { result } = renderHook(() => useEntities(addLog));
    // Wait for the hook to settle (default entities loaded).
    await waitFor(() => {
      expect(result.current.entities.length).toBeGreaterThan(0);
    });
    act(() => {
      result.current.createEntity({
        id: 'ent-coa-co',
        name: 'Default CoA Co Pty Ltd',
        type: 'Company',
        status: 'Active',
      });
    });
    // Async fire-and-forget CoA seeding — wait for adapter.saveAccounts to be invoked
    // with the seed payload (>= 80 accounts) before asserting.
    await waitFor(
      () => {
        const big = saveSpy.mock.calls.find((c) => (c[0] as Account[]).length >= 80);
        expect(big).toBeDefined();
      },
      { timeout: 3000 },
    );
    const seedCall = saveSpy.mock.calls.find((c) => (c[0] as Account[]).length >= 80);
    const seeded = seedCall![0] as Account[];
    expect(seeded.every((a) => a.isDefault === true)).toBe(true);
    saveSpy.mockRestore();
  });

  it('Trust entity gets BeneficiaryRow placeholder ready', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    await waitFor(() => {
      expect(result.current.entities.length).toBeGreaterThan(0);
    });
    // ent-2 is the seeded Sample Family Trust.
    act(() => {
      result.current.setBeneficiaries('ent-2', [
        { id: 'b1', name: 'Alice', sharePercent: 100 },
      ]);
    });
    const updated = result.current.entities.find((e) => e.id === 'ent-2');
    expect(updated?.beneficiaries).toHaveLength(1);
    expect(updated?.beneficiaries?.[0].name).toBe('Alice');
  });

  it('Partnership entity gets PartnerRow placeholder ready', async () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    await waitFor(() => {
      expect(result.current.entities.length).toBeGreaterThan(0);
    });
    act(() => {
      result.current.createEntity({
        id: 'ent-pship',
        name: 'Sample Partnership',
        type: 'Partnership',
        status: 'Active',
      });
    });
    act(() => {
      result.current.setPartners('ent-pship', [
        { id: 'p1', name: 'Bob', sharePercent: 50 },
        { id: 'p2', name: 'Carol', sharePercent: 50 },
      ]);
    });
    const updated = result.current.entities.find((e) => e.id === 'ent-pship');
    expect(updated?.partners).toHaveLength(2);
  });

  it('archiveEntity sets status Archived', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    act(() => {
      result.current.archiveEntity([firstId]);
    });
    expect(result.current.entities.find((e) => e.id === firstId)?.status).toBe('Archived');
  });

  it('Test UE.1 (PERS-03): updateEntity with returnStatusByFy change does NOT modify entries/accounts', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstEntity = result.current.entities[0];

    // Update entity with returnStatusByFy — should only change entity, not anything else
    const updatedEntity = {
      ...firstEntity,
      returnStatusByFy: { FY2026: 'finalised' as const },
    };

    act(() => {
      result.current.updateEntity(updatedEntity);
    });

    // The entity should have the new returnStatusByFy
    const found = result.current.entities.find((e) => e.id === firstEntity.id);
    expect(found?.returnStatusByFy?.['FY2026']).toBe('finalised');

    // addLog called for the entity update (not for entries/accounts)
    expect(addLog).toHaveBeenCalledOnce();
    expect(addLog.mock.calls[0][0]).toBe('UPDATE_ENTITY');
  });

  it('Test UE.2: updateEntity round-trips returnStatusByFy + wizardState', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstEntity = result.current.entities[0];

    const updatedEntity = {
      ...firstEntity,
      returnStatusByFy: { FY2026: 'draft' as const, FY2025: 'finalised' as const },
      wizardState: {
        FY2026: { step: 4, dismissedAnomalies: ['a1', 'a2'], completedAt: undefined },
      },
    };

    act(() => {
      result.current.updateEntity(updatedEntity);
    });

    const found = result.current.entities.find((e) => e.id === firstEntity.id);
    expect(found?.returnStatusByFy?.['FY2026']).toBe('draft');
    expect(found?.returnStatusByFy?.['FY2025']).toBe('finalised');
    expect(found?.wizardState?.['FY2026']?.step).toBe(4);
    expect(found?.wizardState?.['FY2026']?.dismissedAnomalies).toContain('a1');
  });

  it('deleteEntity refuses if journals reference entity, suggests Archive', () => {
    const addLog = vi.fn();
    const { result } = renderHook(() => useEntities(addLog));
    const firstId = result.current.entities[0].id;
    const allEntries: Record<string, Array<{
      id: string;
      date: string;
      reference: string;
      description: string;
      lines: Array<{ accountId: string; description: string; debit: number; credit: number; taxAmount: number }>;
      isPosted: boolean;
    }>> = {
      [firstId]: [
        {
          id: 'je-block-1',
          date: '2025-07-01',
          reference: 'OPEN',
          description: 'Test',
          isPosted: true,
          lines: [
            { accountId: 'a', description: '', debit: 10, credit: 0, taxAmount: 0 },
            { accountId: 'b', description: '', debit: 0, credit: 10, taxAmount: 0 },
          ],
        },
      ],
    };
    let outcome: { deleted: string[]; blocked: string[] } = { deleted: [], blocked: [] };
    act(() => {
      outcome = result.current.tryDeleteEntity([firstId], allEntries);
    });
    expect(outcome.blocked).toContain(firstId);
    expect(outcome.deleted).not.toContain(firstId);
    // Entity remains in the list.
    expect(result.current.entities.find((e) => e.id === firstId)).toBeDefined();
  });
});
