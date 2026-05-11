/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Adapter selection module — the SPA's single entry point for storage.
 *
 * On first `initAdapter()` call, probes `/api/health` (AbortSignal.timeout(500),
 * up to 6 retries ~= 3s budget). Success -> `ServerAdapter`. Exhaustion ->
 * `LocalAdapter` (and records `fellBackToLocal = true` so Plan 03-4's banner
 * can render).
 *
 * `localStorage.storageMode` override (`'local'` | `'server'`) bypasses the
 * probe entirely; this is the documented power-user hatch.
 *
 * Subsequent `initAdapter()` calls are memoised — the underlying adapter
 * Promise is returned verbatim.
 */
import type { StorageAdapter, AdapterKind, HealthResponse } from './adapter';
import { LocalAdapter } from './local';
import { ServerAdapter } from './server';

const PROBE_TIMEOUT_MS = 500;
const PROBE_RETRIES = 6;
const STORAGE_MODE_KEY = 'storageMode';

let adapterPromise: Promise<StorageAdapter> | null = null;
let adapterKind: AdapterKind | null = null;
let cachedHealth: HealthResponse | null = null;

/**
 * True iff the adapter probe was attempted AND exhausted (server expected but
 * unreachable). Plan 03-4's "Server unreachable" banner reads this. False on
 * an explicit `storageMode` override and false on a clean server-200 path.
 */
let fellBackToLocal = false;

async function probeServer(): Promise<HealthResponse | null> {
  for (let i = 0; i < PROBE_RETRIES; i++) {
    try {
      const res = await fetch('/api/health', {
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (res.ok) {
        const body = (await res.json()) as HealthResponse;
        if (body && body.ok === true && typeof body.version === 'number') {
          return body;
        }
      }
    } catch {
      // probe attempt failed; retry until budget exhausted
    }
  }
  return null;
}

export async function initAdapter(): Promise<StorageAdapter> {
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {
    const forced =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem(STORAGE_MODE_KEY)
        : null;
    if (forced === 'local') {
      adapterKind = 'local';
      fellBackToLocal = false;
      const a = new LocalAdapter();
      await a.ready();
      return a;
    }
    if (forced === 'server') {
      adapterKind = 'server';
      fellBackToLocal = false;
      const a = new ServerAdapter();
      await a.ready();
      return a;
    }
    // No override — probe was attempted.
    const health = await probeServer();
    if (health?.ok) {
      adapterKind = 'server';
      cachedHealth = health;
      fellBackToLocal = false;
      const a = new ServerAdapter();
      await a.ready();
      return a;
    }
    // Probe exhausted — fall back to LocalAdapter AND record the fallback
    // so Plan 03-4's banner can render.
    adapterKind = 'local';
    fellBackToLocal = true;
    const a = new LocalAdapter();
    await a.ready();
    return a;
  })();
  return adapterPromise;
}

export function getAdapter(): Promise<StorageAdapter> {
  if (!adapterPromise) {
    throw new Error('Adapter not initialised; call initAdapter() first');
  }
  return adapterPromise;
}

export function getAdapterKind(): AdapterKind | null {
  return adapterKind;
}

export function getCachedHealth(): HealthResponse | null {
  return cachedHealth;
}

/** True iff probe was attempted and exhausted. Plan 03-4 banner reads this. */
export function getFellBackToLocal(): boolean {
  return fellBackToLocal;
}

/** Test-only reset. */
export function _resetAdapter(): void {
  adapterPromise = null;
  adapterKind = null;
  cachedHealth = null;
  fellBackToLocal = false;
}
