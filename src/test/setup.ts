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
beforeEach(() => {
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
