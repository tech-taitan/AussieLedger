/**
 * useEntities hook — stub for Plan 02-1 type resolution.
 *
 * TODO Plan 02-2: implement this hook with full persistence and addLog wiring.
 * This stub exists only so TypeScript can resolve imports in test files.
 */
import type { Entity, AuditLog } from '../types';

type AddLogFn = (action: AuditLog['action'], details: string, entityId?: string) => void;

export interface EntitiesHook {
  entities: Entity[];
  selectedEntityIds: string[];
  createEntity: (entity: Entity) => void;
  updateEntity: (entity: Entity) => void;
  archiveEntity: (ids: string[]) => void;
  deactivateEntity: (ids: string[]) => void;
  deleteEntity: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
}

/** @throws Not yet implemented — Plan 02-2 implements this hook. */
export function useEntities(_addLog: AddLogFn): EntitiesHook {
  throw new Error('useEntities not yet implemented — landing in Plan 02-2');
}
