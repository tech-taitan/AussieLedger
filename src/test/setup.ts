import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import {
  IDBCursor,
  IDBCursorWithValue,
  IDBDatabase,
  IDBFactory,
  IDBIndex,
  IDBKeyRange,
  IDBObjectStore,
  IDBOpenDBRequest,
  IDBRequest,
  IDBTransaction,
  IDBVersionChangeEvent,
} from 'fake-indexeddb';
import { _resetAdapter, initAdapter } from '../storage';

afterEach(() => {
  cleanup();
});

// Fresh IndexedDB factory per test — full isolation, no cross-test state leak.
// Manual assignment (NOT 'fake-indexeddb/auto') because Vitest setup-file load order
// can leave 'auto' incomplete. See research §8.
//
// We also expose the IDB-* constructor classes globally because the `idb`
// wrapper performs `value instanceof IDBRequest` checks at runtime; if those
// globals are undefined under jsdom the wrapper throws ReferenceError.
beforeEach(async () => {
  const g = globalThis as unknown as Record<string, unknown>;
  g.indexedDB = new IDBFactory();
  g.IDBKeyRange = IDBKeyRange;
  g.IDBRequest = IDBRequest;
  g.IDBOpenDBRequest = IDBOpenDBRequest;
  g.IDBTransaction = IDBTransaction;
  g.IDBDatabase = IDBDatabase;
  g.IDBObjectStore = IDBObjectStore;
  g.IDBIndex = IDBIndex;
  g.IDBCursor = IDBCursor;
  g.IDBCursorWithValue = IDBCursorWithValue;
  g.IDBVersionChangeEvent = IDBVersionChangeEvent;

  // Reset and pre-initialise the storage adapter so hooks calling
  // `getAdapter()` don't throw in tests that don't explicitly init.
  //
  // We set `storageMode = 'local'` BEFORE init so the probe is bypassed —
  // otherwise every test would burn ~3s waiting for 6 retries × 500ms.
  // Tests covering probe selection (`src/storage/__tests__/index.test.ts`)
  // call `_resetAdapter()` + `localStorage.clear()` in their own beforeEach
  // to override this.
  _resetAdapter();
  localStorage.setItem('storageMode', 'local');
  try {
    await initAdapter();
  } catch {
    // tests that need the adapter will fail loudly when they touch it
  }
  localStorage.removeItem('storageMode');
});

// ResizeObserver polyfill — Recharts (FinancialTrendChart) requires it; jsdom does not provide it.
class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: typeof ResizeObserverPolyfill }).ResizeObserver =
  ResizeObserverPolyfill;

// matchMedia polyfill — some lucide / motion paths use it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// ImportTB.tsx imports @google/genai at module top level. The Gemini SDK
// reads process env on construction; mock to avoid real network attempts in tests.
vi.mock('@google/genai', () => ({
  GoogleGenAI: class GoogleGenAIMock {
    constructor() {}
  },
  Type: {},
}));
