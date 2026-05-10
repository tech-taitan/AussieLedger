import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
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
