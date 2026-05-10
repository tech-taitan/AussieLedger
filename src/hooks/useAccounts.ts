/**
 * useAccounts hook — stub for Plan 02-1 type resolution.
 *
 * TODO Plan 02-2: implement this hook with full persistence and addLog wiring.
 * This stub exists only so TypeScript can resolve imports in test files.
 */
import type { Account, AuditLog } from '../types';

type AddLogFn = (action: AuditLog['action'], details: string, entityId?: string) => void;

export interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}

/** @throws Not yet implemented — Plan 02-2 implements this hook. */
export function useAccounts(_addLog: AddLogFn): AccountsHook {
  throw new Error('useAccounts not yet implemented — landing in Plan 02-2');
}
