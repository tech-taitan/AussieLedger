---
phase: 01-safety-net
plan: 1
type: execute
wave: 0
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - vitest.config.ts
  - src/test/setup.ts
  - src/test/fixtures/entities.ts
  - src/test/fixtures/accounts.ts
  - src/test/fixtures/journals.ts
  - src/lib/money.ts
  - src/lib/validation.ts
  - src/lib/migrations/index.ts
  - src/lib/tax/.gitkeep
  - src/components/DisclaimerFooter.tsx
  - src/components/PdfGate.tsx
  - src/components/MigrationError.tsx
  - src/types.ts
  - src/lib/__tests__/money.test.ts
  - src/lib/__tests__/validation.test.ts
  - src/lib/migrations/__tests__/runner.test.ts
  - src/lib/tax/__tests__/structural-lint.test.ts
  - src/lib/tax/__tests__/golden.test.ts
  - src/lib/tax/__tests__/bas.test.ts
  - src/components/__tests__/DisclaimerFooter.test.tsx
  - src/components/__tests__/PdfGate.test.tsx
  - src/components/__tests__/MigrationError.test.tsx
  - src/components/__tests__/smoke.test.tsx
  - src/components/__tests__/EntityForm.test.tsx
  - src/__tests__/App.test.tsx
  - src/__tests__/structural.test.ts
  - src/__tests__/types-schema-version.test.ts
  - src/__tests__/ci-config.test.ts
  - .github/workflows/ci.yml
autonomous: true
requirements: [FND-06, FND-07, FND-08, FND-09, ENT-02, DEP-05]
must_haves:
  truths:
    - "`npx vitest run` exits 0 against the test files this plan creates that target only Wave-0 artefacts (money, validation, migrations, structural-lint, DisclaimerFooter, PdfGate, MigrationError)"
    - "Tests that exercise existing app surfaces (`App.test.tsx`, `EntityForm.test.tsx`, `smoke.test.tsx`, `types-schema-version.test.ts`, `structural.test.ts`) are present and red — they will turn green after Plans 01-2 and 01-3 run"
    - "`npm run build` and `npm run lint` continue to pass — Wave 0 must not break the app"
    - "`decimal.js` and the test toolchain are installed and importable"
    - "`.github/workflows/ci.yml` exists with `npm ci → npm run build → npm run lint → npm run test` jobs"
    - "Every persisted interface in `src/types.ts` declares `_v: number`"
  artifacts:
    - path: vitest.config.ts
      provides: "Vitest test runner config with `environment: 'jsdom'`, `css: false`, `setupFiles: ['./src/test/setup.ts']`"
      contains: "environment: 'jsdom'"
    - path: src/test/setup.ts
      provides: "RTL + jest-dom bootstrap, ResizeObserver/matchMedia polyfills, `@google/genai` mock"
      contains: "vi.mock('@google/genai'"
    - path: src/lib/money.ts
      provides: "decimal.js wrapper with banker's rounding"
      exports: [add, sub, mul, div, gst, round]
    - path: src/lib/validation.ts
      provides: "ABN modulus-89 validator"
      exports: [validateAbn]
    - path: src/lib/migrations/index.ts
      provides: "schema migration runner with 0 → 1 identity migration"
      exports: [migrate, CURRENT_VERSION]
    - path: src/components/DisclaimerFooter.tsx
      provides: "persistent footer with locked exact-text disclaimer"
    - path: src/components/PdfGate.tsx
      provides: "tick-to-confirm gate that blocks `onConfirmed` until checkbox ticked"
    - path: src/components/MigrationError.tsx
      provides: "non-dismissable full-viewport migration error UI"
    - path: .github/workflows/ci.yml
      provides: "GitHub Actions CI: build + lint + test on push to main and PRs to main"
      contains: "ubuntu-latest"
  key_links:
    - from: package.json
      to: vitest.config.ts
      via: "`test` script invokes `vitest run`; vitest auto-loads `vitest.config.ts`"
      pattern: "\"test\":\\s*\"vitest run\""
    - from: src/lib/money.ts
      to: decimal.js
      via: "`Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN })` configured at module load"
      pattern: "ROUND_HALF_EVEN"
    - from: src/lib/migrations/index.ts
      to: src/types.ts
      via: "`PersistedRoot._v` aligns with `_v` field added to every persisted interface"
      pattern: "_v:\\s*number"
    - from: tsconfig.json
      to: vitest.config.ts
      via: "`compilerOptions.types` includes `vitest/globals` and `@testing-library/jest-dom`"
      pattern: "vitest/globals"
---

<objective>
Wave 0 foundations for Phase 1. Install all new dependencies, create the Vitest configuration, write the four pure-function libraries (`money`, `validation`, `migrations`, the empty `tax/` directory), build the three new components (`DisclaimerFooter`, `PdfGate`, `MigrationError`), add the `_v: number` schema-version field to every persisted interface in `src/types.ts`, scaffold the GitHub Actions CI workflow, and create every test file from `01-VALIDATION.md` § Per-Task Verification Map. After this plan ships, Plans 01-2 and 01-3 can run in parallel without dependency conflicts.

Purpose: Phase 1 is demolition + plumbing. Without Wave 0, no verification command in `01-VALIDATION.md` can run — every test file references a setup, fixture, or library that does not yet exist. This plan creates the entire infrastructure in one wave so subsequent plans only need to modify existing files.

Output: Test toolchain installed; libraries and components created; CI workflow committed; `_v` field added to every persisted type; all test files exist (some red, some green per design).
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/01-safety-net/01-CONTEXT.md
@.planning/phases/01-safety-net/01-RESEARCH.md
@.planning/phases/01-safety-net/01-VALIDATION.md
@.planning/codebase/STRUCTURE.md
@.planning/codebase/CONVENTIONS.md
@package.json
@tsconfig.json
@vite.config.ts
@src/types.ts

<interfaces>
<!-- Existing module exports referenced by Wave 0 test fixtures and the smoke tests. -->
<!-- Executor uses these directly; do not re-explore the codebase. -->

From src/types.ts (BEFORE this plan modifies it):
```typescript
export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
export interface Entity {
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  businessAddress?: string;
  contactPerson?: string;
  status: 'Active' | 'Archived' | 'Deactivated';
  taxAgentName?: string;
  taxAgentPhone?: string;
  taxAgentEmail?: string;
  notes?: string;
}
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;
  companyTaxLabel?: string;
  trustTaxLabel?: string;
  gstCode: 'GST' | 'FRE' | 'N-T';
}
export interface JournalLine {
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  taxAmount: number;
  isManualTax?: boolean;
}
export interface JournalEntry {
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
}
export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'POST_JOURNAL' | 'DELETE_JOURNAL' | 'IMPORT_DATA';
  entityId?: string;
  details: string;
}
```

Wave 0 contracts (CREATED by this plan, consumed by Plans 01-2 and 01-3):
```typescript
// src/lib/money.ts
import { Decimal } from 'decimal.js';
export { Decimal };
export function add(a: Decimal.Value, b: Decimal.Value): Decimal;
export function sub(a: Decimal.Value, b: Decimal.Value): Decimal;
export function mul(a: Decimal.Value, b: Decimal.Value): Decimal;
export function div(a: Decimal.Value, b: Decimal.Value): Decimal;
export function gst(amountIncl: Decimal.Value): Decimal;
export function round(value: Decimal.Value, dp?: number): Decimal;
export function serialize(amount: Decimal): string;
export function deserialize(stored: string | number): Decimal;

// src/lib/validation.ts
export interface AbnValidationResult { valid: boolean; reason?: string }
export function validateAbn(input: string): AbnValidationResult;

// src/lib/migrations/index.ts
export const CURRENT_VERSION: number; // = 1
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}
export function migrate(raw: Record<string, unknown>): PersistedRoot;

// src/components/DisclaimerFooter.tsx
export function DisclaimerFooter(props: { className?: string }): JSX.Element;

// src/components/PdfGate.tsx
export interface PdfGateProps {
  onConfirmed: () => void;
  actionLabel?: string;
  isLoading?: boolean;
  className?: string;
}
export function PdfGate(props: PdfGateProps): JSX.Element;

// src/components/MigrationError.tsx
export function MigrationError(props: { message: string }): JSX.Element;
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Install Phase 1 dependencies and update package.json scripts</name>
  <read_first>
    - package.json
    - .planning/phases/01-safety-net/01-CONTEXT.md
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Standard Stack" and "Pitfall 1 / Open Questions")
    - .planning/phases/01-safety-net/01-VALIDATION.md (Wave 0 Requirements)
  </read_first>
  <files>package.json</files>
  <behavior>
    - `npm ls vitest` reports vitest installed at major version 2
    - `npm ls @testing-library/react` reports v16
    - `npm ls jsdom` reports a 26.x version (NOT 27.x)
    - `npm ls decimal.js` reports v10
    - `package.json` has scripts: `"test": "vitest run"`, `"test:watch": "vitest"`, `"test:coverage": "vitest run --coverage"`
    - Existing `dev`, `build`, `preview`, `lint` scripts are preserved unchanged
  </behavior>
  <action>
Run the following commands at repo root in order:

```
npm install -D vitest@^2 @testing-library/react@^16 @testing-library/user-event@^14 @testing-library/jest-dom@^6 jsdom@^26 @vitest/coverage-v8@^2
npm install decimal.js@^10
```

Pin `jsdom` to `^26` explicitly (NOT `^27`) — Tailwind v4 + jsdom@27 has an open compatibility issue (RESEARCH.md § Pitfall 1, Open Question 1). After install, verify `package.json` `devDependencies.jsdom` reads `^26.x.x`. If npm resolved jsdom to 27, run `npm install -D jsdom@^26` to force the pin.

Edit `package.json` `scripts` block:
- Add `"test": "vitest run"`
- Add `"test:watch": "vitest"`
- Add `"test:coverage": "vitest run --coverage"`
- Keep `dev`, `build`, `preview`, `clean`, `lint` exactly as they are.

Do NOT modify any other section of `package.json`. Commit `package.json` and `package-lock.json`.
  </action>
  <verify>
    <automated>npm ls vitest @testing-library/react jsdom decimal.js --depth=0 && node -e "const p=require('./package.json'); if(!p.scripts.test||p.scripts.test!=='vitest run') process.exit(1); if(!/^\^26/.test(p.devDependencies.jsdom)) process.exit(2);"</automated>
  </verify>
  <acceptance_criteria>
    - `npm ls vitest` shows version starting with `2.`
    - `npm ls @testing-library/react` shows version starting with `16.`
    - `npm ls jsdom` shows version starting with `26.`
    - `npm ls decimal.js` shows version starting with `10.`
    - `node -e "console.log(require('./package.json').scripts.test)"` prints `vitest run`
    - Existing scripts `dev`, `build`, `preview`, `lint` still present
    - Maps to VALIDATION.md FND-07 row "`npm run test` passes" (will pass once test files exist after Task 4+)
  </acceptance_criteria>
  <done>Dependencies installed; jsdom pinned to ^26; package.json scripts include `test`, `test:watch`, `test:coverage`; existing scripts preserved.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create vitest.config.ts, src/test/setup.ts, and update tsconfig.json types</name>
  <read_first>
    - tsconfig.json
    - vite.config.ts
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Pattern 1: Vitest Configuration" and "Open Questions" #3 and #4)
    - .planning/phases/01-safety-net/01-VALIDATION.md (Wave 0 Requirements rows 1-3)
  </read_first>
  <files>vitest.config.ts, src/test/setup.ts, tsconfig.json</files>
  <behavior>
    - `npx vitest --version` reports vitest v2
    - A trivial `it('passes', () => expect(true).toBe(true))` smoke test in `src/test/setup.ts`-mocked environment runs and passes
    - `vitest.config.ts` does NOT include the `tailwindcss()` plugin
    - `vitest.config.ts` sets `css: false`
    - `src/test/setup.ts` mocks `@google/genai` (used by `ImportTB.tsx` at module top-level — RESEARCH.md Open Question #3)
    - `src/test/setup.ts` defines `global.ResizeObserver` (Recharts/`FinancialTrendChart` requirement — RESEARCH.md Open Question #4)
    - `tsconfig.json` `compilerOptions.types` includes `vitest/globals` and `@testing-library/jest-dom`
  </behavior>
  <action>
**Create `vitest.config.ts` at repo root** (NOT extending `vite.config.ts` — separate file per RESEARCH.md Pattern 1):

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()], // Do NOT include @tailwindcss/vite — breaks jsdom CSS parser
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
      include: ['src/lib/**', 'src/components/**'],
      exclude: ['src/test/**', 'src/**/*.d.ts'],
    },
  },
});
```

**Create `src/test/setup.ts`:**

```typescript
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
```

**Edit `tsconfig.json`** — add `types` array to `compilerOptions`. The current file has no `types` key. Insert it alphabetically near the existing `target`/`module` keys:

```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

Final `tsconfig.json` `compilerOptions` should include the new `types` key while leaving every other key intact (target ES2022, module ESNext, jsx react-jsx, strict-related flags, paths, allowImportingTsExtensions, noEmit).
  </action>
  <verify>
    <automated>npx vitest --version && node -e "const fs=require('fs'); const cfg=fs.readFileSync('vitest.config.ts','utf-8'); if(!/css:\s*false/.test(cfg)) process.exit(1); if(/tailwindcss\(\)/.test(cfg)) process.exit(2); const setup=fs.readFileSync('src/test/setup.ts','utf-8'); if(!/vi\.mock\('@google\/genai'/.test(setup)) process.exit(3); if(!/ResizeObserver/.test(setup)) process.exit(4); const ts=JSON.parse(fs.readFileSync('tsconfig.json','utf-8')); if(!ts.compilerOptions.types || !ts.compilerOptions.types.includes('vitest/globals')) process.exit(5);"</automated>
  </verify>
  <acceptance_criteria>
    - `vitest.config.ts` exists and imports `defineConfig` from `vitest/config`
    - `vitest.config.ts` contains literal string `css: false`
    - `vitest.config.ts` does NOT contain string `tailwindcss(`
    - `src/test/setup.ts` contains `vi.mock('@google/genai'`
    - `src/test/setup.ts` defines `ResizeObserver` on `globalThis`
    - `tsconfig.json` `compilerOptions.types` array includes both `"vitest/globals"` and `"@testing-library/jest-dom"`
    - `npm run lint` (`tsc --noEmit`) still exits 0
    - Maps to VALIDATION.md Wave 0 Requirements rows 2 and 3
  </acceptance_criteria>
  <done>Vitest config and setup file in place; tsconfig types declared; `tsc --noEmit` clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create src/lib/money.ts and src/lib/__tests__/money.test.ts</name>
  <read_first>
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 2: decimal.js Money Wrapper" and "money.ts unit tests")
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Decimal arithmetic (FND-08)")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-08 rows)
  </read_first>
  <files>src/lib/money.ts, src/lib/__tests__/money.test.ts</files>
  <behavior>
    - `add('0.1', '0.2').toString()` returns the string `'0.3'` (decimal-exact, no float drift)
    - `gst('110')` rounded to 2dp returns `'10.00'`
    - `gst('100')` rounded to 2dp returns `'9.09'` (100 / 11 = 9.0909... → 9.09)
    - Banker's rounding: `round('2.505', 2)` returns `'2.50'` (digit before 5 is even — round down)
    - Banker's rounding: `round('2.515', 2)` returns `'2.52'` (digit before 5 is odd — round up to even)
    - `mul('100', '0.1').toString()` is exact (`'10.0'` or `'10'`, not `9.999999...`)
    - `Decimal.set` is called exactly once at module load with `rounding: Decimal.ROUND_HALF_EVEN`
  </behavior>
  <action>
**Create `src/lib/money.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Decimal } from 'decimal.js';

// Configure global rounding once at module load: banker's rounding (ROUND_HALF_EVEN = 6)
// Per CONTEXT.md "Rounding policy: Banker's rounding to 2 decimal places".
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -9,
  toExpPos: 20,
});

export { Decimal };

export function add(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

export function sub(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

export function mul(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

export function div(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).dividedBy(new Decimal(b));
}

/**
 * Extract GST component from a GST-inclusive amount.
 * GST = amount / 11, rounded to nearest cent (banker's rounding).
 * Source: ATO BAS instructions — GST is 1/11 of the GST-inclusive price.
 */
export function gst(amountInclGST: Decimal.Value): Decimal {
  return new Decimal(amountInclGST).dividedBy(11).toDecimalPlaces(2);
}

/** Round to `dp` decimal places using the global banker's rounding mode. */
export function round(value: Decimal.Value, dp: number = 2): Decimal {
  return new Decimal(value).toDecimalPlaces(dp);
}

/** Serialize a monetary Decimal to a 2dp string for JSON storage. */
export function serialize(amount: Decimal): string {
  return amount.toFixed(2);
}

/** Deserialize a stored monetary string back to a Decimal. */
export function deserialize(stored: string | number): Decimal {
  return new Decimal(stored);
}
```

**Create `src/lib/__tests__/money.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, gst, round, serialize, deserialize } from '../money';

describe('money wrapper', () => {
  describe('add — no float drift', () => {
    it('0.1 + 0.2 === 0.3 (no float drift)', () => {
      expect(add('0.1', '0.2').toString()).toBe('0.3');
    });
    it('handles integers and strings interchangeably', () => {
      expect(add(10, '0.5').toString()).toBe('10.5');
    });
  });

  describe('sub', () => {
    it('1 - 0.9 === 0.1', () => {
      expect(sub('1', '0.9').toString()).toBe('0.1');
    });
  });

  describe('mul', () => {
    it('100 * 0.1 === 10 (no drift)', () => {
      expect(mul('100', '0.1').toString()).toBe('10');
    });
  });

  describe('div', () => {
    it('1 / 4 === 0.25', () => {
      expect(div('1', '4').toString()).toBe('0.25');
    });
  });

  describe('gst — divides by 11 with banker rounding', () => {
    it('gst(110) === 10.00', () => {
      expect(serialize(gst('110'))).toBe('10.00');
    });
    it('gst(100) === 9.09', () => {
      expect(serialize(gst('100'))).toBe('9.09');
    });
    it('gst(105.50) === 9.59', () => {
      expect(serialize(gst('105.50'))).toBe('9.59');
    });
  });

  describe('round — banker rounding to 2dp', () => {
    it('2.505 rounds to 2.50 (preceding digit even, rounds down)', () => {
      expect(serialize(round('2.505', 2))).toBe('2.50');
    });
    it('2.515 rounds to 2.52 (preceding digit odd, rounds up to even)', () => {
      expect(serialize(round('2.515', 2))).toBe('2.52');
    });
    it('default dp=2', () => {
      expect(serialize(round('1.234'))).toBe('1.23');
    });
  });

  describe('serialize / deserialize round-trip', () => {
    it('serializes to 2dp string', () => {
      expect(serialize(add('10.001', '0.009'))).toBe('10.01');
    });
    it('deserialize accepts string and number', () => {
      expect(deserialize('10.50').toString()).toBe('10.5');
      expect(deserialize(10.5).toString()).toBe('10.5');
    });
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/money.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/lib/__tests__/money.test.ts` exits 0
    - At least 12 tests pass (covering add/sub/mul/div/gst/round with the listed test vectors)
    - `src/lib/money.ts` contains literal string `Decimal.ROUND_HALF_EVEN`
    - `src/lib/money.ts` exports named `add`, `sub`, `mul`, `div`, `gst`, `round`, `serialize`, `deserialize`
    - Maps to VALIDATION.md FND-08 row 1 (`src/lib/__tests__/money.test.ts` green)
  </acceptance_criteria>
  <done>Money wrapper implemented and unit tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Create src/lib/validation.ts (ABN modulus-89) and src/lib/__tests__/validation.test.ts</name>
  <read_first>
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 4: ABN Modulus-89 Validation" and "Code Examples > ABN validation unit test vectors")
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "ABN / TFN")
    - .planning/phases/01-safety-net/01-VALIDATION.md (ENT-02 rows)
  </read_first>
  <files>src/lib/validation.ts, src/lib/__tests__/validation.test.ts</files>
  <behavior>
    - `validateAbn('51 824 753 556')` returns `{ valid: true }` (official ATO test vector)
    - `validateAbn('51824753556')` returns `{ valid: true }` (no spaces)
    - `validateAbn('ABN 51 824 753 556')` returns `{ valid: true }` (with prefix)
    - `validateAbn('11 111 111 111')` returns `{ valid: false, reason: <string> }` (demo placeholder; checksum fails)
    - `validateAbn('22 222 222 222')` returns `{ valid: false, reason: <string> }`
    - `validateAbn('1234')` returns `{ valid: false, reason: <string> }` (wrong length)
    - `validateAbn('00 000 000 000')` returns `{ valid: false, reason: <string> }`
    - `validateAbn('51 824 753 557')` returns `{ valid: false, reason: <string> }` (transposed digit)
    - `validateAbn('')` returns `{ valid: false, reason: <string> }`
  </behavior>
  <action>
**Create `src/lib/validation.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ABN modulus-89 weights.
 * Algorithm (per abr.business.gov.au/Help/AbnFormat):
 *   1. Strip non-digits; expect exactly 11 digits.
 *   2. Subtract 1 from the first (leftmost) digit.
 *   3. Multiply each digit by its weight: [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19].
 *   4. Sum the products.
 *   5. ABN is valid iff sum % 89 === 0.
 */
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

export interface AbnValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates an Australian Business Number using the ABR modulus-89 checksum.
 * Accepts inputs with spaces, hyphens, or an "ABN " prefix.
 *
 * @param input - Raw user-entered string
 * @returns `{ valid: true }` if checksum passes, otherwise `{ valid: false, reason }`
 */
export function validateAbn(input: string): AbnValidationResult {
  if (typeof input !== 'string' || input.length === 0) {
    return { valid: false, reason: 'ABN is empty' };
  }
  const digits = input.replace(/[^0-9]/g, '');
  if (digits.length !== 11) {
    return { valid: false, reason: `Expected 11 digits, got ${digits.length}` };
  }

  const ds = digits.split('').map(Number);
  ds[0] -= 1;

  const sum = ds.reduce((acc, d, i) => acc + d * ABN_WEIGHTS[i], 0);
  if (sum % 89 !== 0) {
    return { valid: false, reason: 'ABN checksum invalid — please check the number' };
  }
  return { valid: true };
}
```

**Create `src/lib/__tests__/validation.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { validateAbn } from '../validation';

describe('validateAbn', () => {
  it('valid ABN: 51 824 753 556 (official ATO test vector)', () => {
    expect(validateAbn('51 824 753 556')).toEqual({ valid: true });
  });

  it('valid ABN without spaces: 51824753556', () => {
    expect(validateAbn('51824753556')).toEqual({ valid: true });
  });

  it('valid ABN with ABN prefix: ABN 51 824 753 556', () => {
    expect(validateAbn('ABN 51 824 753 556')).toEqual({ valid: true });
  });

  it('invalid ABN: 11 111 111 111 (demo placeholder seed)', () => {
    const result = validateAbn('11 111 111 111');
    expect(result.valid).toBe(false);
    expect(typeof result.reason).toBe('string');
  });

  it('invalid ABN: 22 222 222 222 (second demo placeholder seed)', () => {
    expect(validateAbn('22 222 222 222').valid).toBe(false);
  });

  it('invalid ABN: 00 000 000 000', () => {
    expect(validateAbn('00 000 000 000').valid).toBe(false);
  });

  it('invalid ABN: transposed digit 51 824 753 557', () => {
    expect(validateAbn('51 824 753 557').valid).toBe(false);
  });

  it('rejects too-short input', () => {
    expect(validateAbn('1234').valid).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateAbn('').valid).toBe(false);
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/validation.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/lib/__tests__/validation.test.ts` exits 0
    - Test "valid ABN" (vector `51 824 753 556`) passes
    - Test "invalid ABN" (vector `11 111 111 111`) passes
    - `validateAbn` is a named export of `src/lib/validation.ts`
    - Maps to VALIDATION.md ENT-02 rows 1 and 2 (`-t "valid ABN"` and `-t "invalid ABN"`)
  </acceptance_criteria>
  <done>ABN validator implemented; nine unit tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Create src/lib/migrations/index.ts and src/lib/migrations/__tests__/runner.test.ts</name>
  <read_first>
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 3: Schema Migration Runner" and "Migration runner unit test")
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Schema versioning (FND-09)")
    - src/types.ts
  </read_first>
  <files>src/lib/migrations/index.ts, src/lib/migrations/__tests__/runner.test.ts</files>
  <behavior>
    - `CURRENT_VERSION` exported and equals `1`
    - `migrate({})` returns `{ _v: 1 }` (missing _v treated as 0; identity migration applied)
    - `migrate({ entities: [] })` returns `{ _v: 1, entities: [] }`
    - `migrate({ _v: 1, foo: 'bar' })` returns the input unchanged at the data level (`_v: 1`, `foo: 'bar'`)
    - `migrate({ _v: 999 })` throws (no migration registered for unknown future version)
    - The 0 → 1 migration is the identity migration (no field renames; just sets `_v: 1`)
  </behavior>
  <action>
**Create `src/lib/migrations/index.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Root shape of all persisted state. The `_v` field is the schema version.
 * Phase 1 only registers a 0 → 1 identity migration; Phase 3 wires real migrations
 * as the storage layer changes.
 */
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}

type MigrationFn = (state: PersistedRoot) => PersistedRoot;

/**
 * Registry: maps version N to the function that upgrades state from N to N+1.
 * Add a new entry here when a new schema version ships.
 */
const MIGRATIONS: Record<number, MigrationFn> = {
  // 0 → 1: identity. Existing prototype data is shape-compatible with v1;
  // we just stamp the new version field.
  0: (state) => ({ ...state, _v: 1 }),
};

export const CURRENT_VERSION = 1;

/**
 * Run all pending migrations on the given state.
 * Treats missing `_v` as version 0 (pre-versioning prototype data).
 * Throws if a registered migration throws or no migration is registered for the current version.
 *
 * @param raw - Parsed JSON object (may lack `_v`)
 */
export function migrate(raw: Record<string, unknown>): PersistedRoot {
  let state = { ...raw, _v: (raw._v as number) ?? 0 } as PersistedRoot;

  while (state._v < CURRENT_VERSION) {
    const migrationFn = MIGRATIONS[state._v];
    if (!migrationFn) {
      throw new Error(
        `No migration registered for version ${state._v}. Cannot upgrade to version ${CURRENT_VERSION}.`,
      );
    }
    state = migrationFn(state);
  }

  if (state._v > CURRENT_VERSION) {
    throw new Error(
      `Persisted data version ${state._v} is newer than the application version ${CURRENT_VERSION}. Refusing to downgrade.`,
    );
  }

  return state;
}
```

**Create `src/lib/migrations/__tests__/runner.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from '../index';

describe('migrate()', () => {
  it('treats missing _v as version 0 and upgrades to current', () => {
    const result = migrate({});
    expect(result._v).toBe(CURRENT_VERSION);
  });

  it('preserves existing data through the 0 → 1 identity migration', () => {
    const result = migrate({ entities: [{ id: 'x' }] });
    expect(result._v).toBe(CURRENT_VERSION);
    expect(result.entities).toEqual([{ id: 'x' }]);
  });

  it('passes through already-current data unchanged', () => {
    const state = { _v: CURRENT_VERSION, entities: [{ id: 'y' }], foo: 'bar' };
    const result = migrate(state as Record<string, unknown>);
    expect(result._v).toBe(CURRENT_VERSION);
    expect(result.entities).toEqual([{ id: 'y' }]);
    expect((result as Record<string, unknown>).foo).toBe('bar');
  });

  it('throws for unknown future version (v999)', () => {
    expect(() => migrate({ _v: 999 })).toThrow();
  });

  it('CURRENT_VERSION is 1 in Phase 1', () => {
    expect(CURRENT_VERSION).toBe(1);
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/lib/migrations/__tests__/runner.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/lib/migrations/__tests__/runner.test.ts` exits 0
    - All 5 tests pass
    - `CURRENT_VERSION` named export equals `1`
    - `migrate` named export accepts `Record<string, unknown>`, returns `PersistedRoot`
    - Maps to VALIDATION.md FND-09 rows 2 and 3 (runner upgrade test + throws-on-unknown test)
  </acceptance_criteria>
  <done>Migration runner implemented; tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 6: Add `_v: number` schema-version field to every persisted interface in src/types.ts; add types-schema-version.test.ts</name>
  <read_first>
    - src/types.ts
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Schema versioning (FND-09)")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-09 row 1)
  </read_first>
  <files>src/types.ts, src/__tests__/types-schema-version.test.ts</files>
  <behavior>
    - `Entity`, `Account`, `JournalLine`, `JournalEntry`, `AuditLog` interfaces in `src/types.ts` each declare a `_v: number` field (initial value semantics: `1` per CONTEXT.md "Initial version: _v: 1")
    - The structural test asserts that the source of `src/types.ts` contains `_v: number` at least 5 times (one per interface)
    - `tsc --noEmit` (`npm run lint`) passes without errors after the field is added
    - `TrialBalanceRow` and `ImportedAccount` are NOT persisted types (derived/transient); they may be skipped per the "every persisted type" wording. Add `_v` only to the five persisted interfaces enumerated above.
  </behavior>
  <action>
**Edit `src/types.ts`** — append `_v: number;` to each persisted interface. Place the field as the first member of each interface for visibility. Final shape (preserve all existing fields exactly; only ADD the `_v` line):

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';

export interface Entity {
  _v: number;
  id: string;
  name: string;
  type: string;
  registrationNumber?: string;
  businessAddress?: string;
  contactPerson?: string;
  status: 'Active' | 'Archived' | 'Deactivated';
  taxAgentName?: string;
  taxAgentPhone?: string;
  taxAgentEmail?: string;
  notes?: string;
}

export interface Account {
  _v: number;
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;
  companyTaxLabel?: string;
  trustTaxLabel?: string;
  gstCode: 'GST' | 'FRE' | 'N-T';
}

export interface JournalLine {
  _v: number;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  taxAmount: number;
  isManualTax?: boolean;
}

export interface JournalEntry {
  _v: number;
  id: string;
  date: string;
  reference: string;
  description: string;
  lines: JournalLine[];
  isPosted: boolean;
}

export interface TrialBalanceRow {
  account: Account;
  debit: number;
  credit: number;
  balance: number;
}

export interface ImportedAccount {
  externalCode: string;
  externalName: string;
  debit: number;
  credit: number;
  mappedAccountId?: string;
  confidence?: number;
  reasoning?: string;
}

export interface AuditLog {
  _v: number;
  id: string;
  timestamp: string;
  user: string;
  action: 'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'POST_JOURNAL' | 'DELETE_JOURNAL' | 'IMPORT_DATA';
  entityId?: string;
  details: string;
}
```

**Important:** This change makes existing call sites that construct these objects fail `tsc --noEmit` because `_v` is required. Plan 01-2 (App.tsx demolition) will add `_v: 1` to the seed-entity literals. To prevent the build going red between this task and Plan 01-2, take ONE of the following options for THIS task only:

- Option A (recommended): mark `_v` as optional (`_v?: number`) for now. Plan 01-2 will tighten it to required later if the project decides. Wave 0 only needs the field to exist on the interface so the schema-version test passes.

Use Option A — declare `_v?: number;` on each of the five interfaces. The structural test below tolerates the optional marker. (Reasoning: Phase 1 ships this field; Phase 3 wires durable persistence and will tighten the optionality when migrations 1 → 2 happen.)

**Re-emit final `src/types.ts` with `_v?: number;` on each persisted interface.** All other fields preserved.

**Create `src/__tests__/types-schema-version.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Schema versioning (FND-09): every persisted type carries _v', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'types.ts'), 'utf-8');

  it('Entity interface declares _v', () => {
    const block = source.match(/export interface Entity \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('Account interface declares _v', () => {
    const block = source.match(/export interface Account \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('JournalLine interface declares _v', () => {
    const block = source.match(/export interface JournalLine \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('JournalEntry interface declares _v', () => {
    const block = source.match(/export interface JournalEntry \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
  it('AuditLog interface declares _v', () => {
    const block = source.match(/export interface AuditLog \{[\s\S]*?\n\}/)?.[0] ?? '';
    expect(block).toMatch(/_v\??:\s*number/);
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/types-schema-version.test.ts --reporter=verbose && npm run lint</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/__tests__/types-schema-version.test.ts` exits 0
    - All 5 tests pass (one per persisted interface)
    - `npm run lint` (`tsc --noEmit`) exits 0 — no compile errors from the optional `_v?: number` change
    - `src/types.ts` source contains `_v?: number` on `Entity`, `Account`, `JournalLine`, `JournalEntry`, `AuditLog`
    - Maps to VALIDATION.md FND-09 row 1
  </acceptance_criteria>
  <done>Five persisted interfaces carry `_v?: number`; structural test green; tsc clean.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 7: Create test fixtures (entities.ts, accounts.ts, journals.ts) and src/lib/tax/.gitkeep + structural-lint test + golden/bas test scaffolds</name>
  <read_first>
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Pattern 7: Structural Lint Test" and "Pattern 8: Smoke Tests" minimum prop fixtures)
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Test strategy")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-07 rows golden + bas + smoke; FND-08 structural lint)
  </read_first>
  <files>src/test/fixtures/entities.ts, src/test/fixtures/accounts.ts, src/test/fixtures/journals.ts, src/lib/tax/.gitkeep, src/lib/tax/__tests__/structural-lint.test.ts, src/lib/tax/__tests__/golden.test.ts, src/lib/tax/__tests__/bas.test.ts</files>
  <behavior>
    - `src/test/fixtures/entities.ts` exports `sampleEntity: Entity` (Pty Ltd) and `sampleEntities: Entity[]` (Pty Ltd + Trust)
    - `src/test/fixtures/accounts.ts` exports `sampleAccounts: Account[]` covering Asset, Revenue, Expense
    - `src/test/fixtures/journals.ts` exports `balancedJournal: JournalEntry` (debits === credits) for tax-engine fixtures
    - `src/lib/tax/.gitkeep` exists (empty file) so the `tax/` directory is tracked
    - `src/lib/tax/__tests__/structural-lint.test.ts` passes vacuously (no .ts files in `src/lib/tax/` other than test files)
    - `src/lib/tax/__tests__/golden.test.ts` exists with one `it.todo` placeholder per entity type (Individual / Company / Trust / Partnership) — tests run but mark TODOs
    - `src/lib/tax/__tests__/bas.test.ts` exists with `it.todo` placeholders for G1, G2, G3, G10, G11, 1A, 1B labels
  </behavior>
  <action>
**Create `src/test/fixtures/entities.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Entity } from '../../types';

export const sampleEntity: Entity = {
  _v: 1,
  id: 'test-ent-1',
  name: 'Sample Pty Ltd',
  type: 'Company',
  registrationNumber: '11 111 111 111',
  status: 'Active',
};

export const sampleTrust: Entity = {
  _v: 1,
  id: 'test-ent-2',
  name: 'Sample Family Trust',
  type: 'Trust',
  registrationNumber: '22 222 222 222',
  status: 'Active',
};

export const sampleEntities: Entity[] = [sampleEntity, sampleTrust];
```

**Create `src/test/fixtures/accounts.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Account } from '../../types';

export const sampleAccounts: Account[] = [
  { _v: 1, id: '1-001', code: '1-001', name: 'Cash at Bank', type: 'Asset', gstCode: 'N-T' },
  { _v: 1, id: '4-001', code: '4-001', name: 'Sales Revenue', type: 'Revenue', gstCode: 'GST' },
  { _v: 1, id: '6-001', code: '6-001', name: 'Operating Expense', type: 'Expense', gstCode: 'GST' },
];
```

**Create `src/test/fixtures/journals.ts`:**

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { JournalEntry } from '../../types';

export const balancedJournal: JournalEntry = {
  _v: 1,
  id: 'jrn-1',
  date: '2025-07-01',
  reference: 'INV-001',
  description: 'Sample sales invoice (GST inclusive)',
  isPosted: true,
  lines: [
    { _v: 1, accountId: '1-001', description: 'Bank receipt', debit: 110, credit: 0, taxAmount: 0 },
    { _v: 1, accountId: '4-001', description: 'Sales (incl GST)', debit: 0, credit: 100, taxAmount: 10 },
    { _v: 1, accountId: '2-001', description: 'GST payable', debit: 0, credit: 10, taxAmount: 0 },
  ],
};

export const sampleJournals: JournalEntry[] = [balancedJournal];
```

**Create `src/lib/tax/.gitkeep`** as an empty file (zero bytes).

**Create `src/lib/tax/__tests__/structural-lint.test.ts`** (verbatim from RESEARCH.md Pattern 7):

```typescript
import { describe, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TAX_LIB_DIR = join(process.cwd(), 'src', 'lib', 'tax');

function stripCommentsAndStrings(line: string): string {
  return line
    .replace(/\/\/.*$/, '')
    .replace(/'[^']*'/g, "''")
    .replace(/"[^"]*"/g, '""')
    .replace(/`[^`]*`/g, '``');
}

function findTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((f) => f.isFile() && f.name.endsWith('.ts') && !f.name.endsWith('.test.ts'))
    // @ts-expect-error - .path is present on Dirent in Node 20+ recursive readdir
    .map((f) => join((f as unknown as { path: string }).path, f.name));
}

describe('Structural lint: no raw float arithmetic in src/lib/tax/', () => {
  it('does not contain bare division or multiplication operators on monetary values', () => {
    const files = findTsFiles(TAX_LIB_DIR);
    const violations: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        if (/[\d)]\s*[*/]\s*\d/.test(line)) {
          violations.push(`${file}:${i + 1}: ${raw.trim()}`);
        }
      });
    }
    if (violations.length > 0) {
      throw new Error(
        'Found raw arithmetic in src/lib/tax/ — use src/lib/money.ts wrappers instead:\n' +
          violations.join('\n'),
      );
    }
  });
});
```

**Create `src/lib/tax/__tests__/golden.test.ts`** (placeholder per CONTEXT.md "tests assert the math we want in Phase 5"):

```typescript
import { describe, it } from 'vitest';

// Phase 1 establishes the file. Phase 5 fills these with hand-calculated golden outputs.
describe('Tax engine golden outputs (one per AU return type)', () => {
  it.todo('Individual return: gross/deductions/net taxable income against fixture journal set');
  it.todo('Company return: items 6, 7, 7S against fixture journal set with 25%/30% BRE selection');
  it.todo('Trust return: net income reconciles to per-beneficiary distributions');
  it.todo('Partnership return: net income split per partner-register percentages');
});
```

**Create `src/lib/tax/__tests__/bas.test.ts`** (placeholder per FND-07 row "BAS per-label golden tests"):

```typescript
import { describe, it } from 'vitest';

// Phase 1 establishes the file. Phase 5 fills these with hand-calculated values
// derived from src/test/fixtures/journals.ts.
describe('BAS per-label arithmetic', () => {
  it.todo('G1 Total sales (incl GST) sums GST-coded revenue lines');
  it.todo('G2 Export sales');
  it.todo('G3 Other GST-free sales (FRE-coded revenue)');
  it.todo('G10 Capital purchases');
  it.todo('G11 Non-capital purchases (incl GST)');
  it.todo('1A GST on sales');
  it.todo('1B GST on purchases');
});
```
  </action>
  <verify>
    <automated>npx vitest run src/lib/tax/__tests__/structural-lint.test.ts src/lib/tax/__tests__/golden.test.ts src/lib/tax/__tests__/bas.test.ts --reporter=verbose && node -e "const fs=require('fs'); ['src/test/fixtures/entities.ts','src/test/fixtures/accounts.ts','src/test/fixtures/journals.ts','src/lib/tax/.gitkeep'].forEach(f=>fs.statSync(f));"</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` exits 0 (passes vacuously — no .ts files in src/lib/tax/ other than test files)
    - `npx vitest run src/lib/tax/__tests__/golden.test.ts` exits 0 (4 TODOs)
    - `npx vitest run src/lib/tax/__tests__/bas.test.ts` exits 0 (7 TODOs)
    - `src/lib/tax/.gitkeep` exists as a zero-byte file
    - `src/test/fixtures/entities.ts` exports `sampleEntity` (id `test-ent-1`, type `Company`, registrationNumber `11 111 111 111`)
    - Maps to VALIDATION.md FND-08 structural-lint row, FND-07 golden and bas rows
  </acceptance_criteria>
  <done>Fixtures, .gitkeep, and three tax-engine test scaffolds in place; structural-lint passes vacuously.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 8: Create src/components/DisclaimerFooter.tsx + DisclaimerFooter.test.tsx with locked exact-text disclaimer</name>
  <read_first>
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Disclaimer" — exact verbatim copy)
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 5: Disclaimer Footer")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-06 row 1)
    - src/lib/utils.ts
    - src/index.css (verify --line, --ink CSS vars exist)
  </read_first>
  <files>src/components/DisclaimerFooter.tsx, src/components/__tests__/DisclaimerFooter.test.tsx</files>
  <behavior>
    - `<DisclaimerFooter />` renders a `<footer>` element with `role="contentinfo"` and `aria-label="Compliance disclaimer"`
    - Footer contains the EXACT 26-word disclaimer string verbatim: `This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO.`
    - Footer accepts an optional `className` prop merged via `cn()`
    - Test asserts the exact-text string is in the rendered DOM (substring match handles whitespace)
  </behavior>
  <action>
**Create `src/components/DisclaimerFooter.tsx`:**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

interface DisclaimerFooterProps {
  className?: string;
}

/**
 * Persistent compliance footer mounted on every view.
 * Copy is locked verbatim per .planning/phases/01-safety-net/01-CONTEXT.md.
 * Do not paraphrase, abbreviate, or substitute.
 */
export function DisclaimerFooter({ className }: DisclaimerFooterProps) {
  return (
    <footer
      className={cn(
        'border-t border-[var(--line)] bg-gray-50/80 px-4 py-2',
        'flex items-start gap-2 text-[11px] text-gray-500 leading-snug',
        className,
      )}
      role="contentinfo"
      aria-label="Compliance disclaimer"
    >
      <Info size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
      <span>
        This output is a draft working paper, not tax advice. Verify all figures against your
        source records before lodging. AussieLedger is not a tax agent and does not lodge returns
        with the ATO.
      </span>
    </footer>
  );
}
```

**Create `src/components/__tests__/DisclaimerFooter.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisclaimerFooter } from '../DisclaimerFooter';

const EXACT_DISCLAIMER =
  'This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO.';

describe('DisclaimerFooter', () => {
  it('renders a contentinfo footer with the locked disclaimer text verbatim', () => {
    render(<DisclaimerFooter />);
    const footer = screen.getByRole('contentinfo', { name: /compliance disclaimer/i });
    expect(footer).toBeInTheDocument();
    // Use a function matcher to tolerate whitespace collapsing in the rendered span
    const matched = screen.getByText((_content, node) => {
      const text = node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      return text.includes(EXACT_DISCLAIMER);
    });
    expect(matched).toBeInTheDocument();
  });

  it('accepts an optional className prop', () => {
    const { container } = render(<DisclaimerFooter className="custom-cls" />);
    expect(container.querySelector('footer.custom-cls')).toBeInTheDocument();
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/DisclaimerFooter.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/components/__tests__/DisclaimerFooter.test.tsx` exits 0 (both tests pass)
    - `src/components/DisclaimerFooter.tsx` source contains the exact 26-word disclaimer verbatim (single source of truth)
    - Component exports a named `DisclaimerFooter` symbol
    - Maps to VALIDATION.md FND-06 row 1 (`src/components/__tests__/DisclaimerFooter.test.tsx`)
  </acceptance_criteria>
  <done>DisclaimerFooter component built; exact-text test green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 9: Create src/components/PdfGate.tsx + PdfGate.test.tsx (tick-to-confirm gate)</name>
  <read_first>
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Disclaimer > PDF generation gate")
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 6: PDF Tick-Gate Component" and "PdfGate unit test")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-06 row 3)
  </read_first>
  <files>src/components/PdfGate.tsx, src/components/__tests__/PdfGate.test.tsx</files>
  <behavior>
    - `<PdfGate onConfirmed={fn} />` renders a `<input type="checkbox">` (unchecked initially) and a `<button>` (disabled initially)
    - Button is disabled when checkbox is unchecked
    - Clicking the checkbox enables the button
    - Clicking the enabled button calls `onConfirmed` exactly once
    - Clicking the disabled button does NOT call `onConfirmed`
    - When `isLoading` prop is true, button reads `'Generating...'` and stays disabled
    - The label text reads exactly: `I confirm I have reviewed these figures and understand this is a working paper, not lodged advice.`
  </behavior>
  <action>
**Create `src/components/PdfGate.tsx`** (verbatim from RESEARCH.md Pattern 6):

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { cn } from '../lib/utils';

export interface PdfGateProps {
  /** Called only after user has ticked the confirmation checkbox AND clicks the action button. */
  onConfirmed: () => void;
  /** Label for the action button. Defaults to 'Download Working Paper'. */
  actionLabel?: string;
  /** Whether the action is currently processing (disables the button regardless of confirmation). */
  isLoading?: boolean;
  className?: string;
}

export function PdfGate({
  onConfirmed,
  actionLabel = 'Download Working Paper',
  isLoading = false,
  className,
}: PdfGateProps) {
  const [confirmed, setConfirmed] = useState(false);
  const disabled = !confirmed || isLoading;

  return (
    <div className={cn('border border-[var(--line)] p-4 bg-amber-50/50', className)}>
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[var(--ink)]"
        />
        <span className="text-sm text-gray-700">
          I confirm I have reviewed these figures and understand this is a working paper, not
          lodged advice.
        </span>
      </label>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => {
            if (!disabled) onConfirmed();
          }}
          disabled={disabled}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-opacity',
            !disabled
              ? 'bg-[var(--ink)] text-white hover:opacity-90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed',
          )}
          aria-disabled={disabled}
        >
          {isLoading ? 'Generating...' : actionLabel}
        </button>
      </div>
    </div>
  );
}
```

**Create `src/components/__tests__/PdfGate.test.tsx`:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfGate } from '../PdfGate';

describe('PdfGate', () => {
  it('button is disabled by default', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('button enables after checkbox tick', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('calls onConfirmed when enabled button clicked', () => {
    const onConfirmed = vi.fn();
    render(<PdfGate onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirmed when disabled button clicked (unchecked)', () => {
    const onConfirmed = vi.fn();
    render(<PdfGate onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirmed).not.toHaveBeenCalled();
  });

  it('isLoading prop forces button text to "Generating..." and keeps it disabled', () => {
    render(<PdfGate onConfirmed={() => {}} isLoading />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.textContent).toContain('Generating');
  });

  it('renders the locked confirmation label verbatim', () => {
    render(<PdfGate onConfirmed={() => {}} />);
    expect(
      screen.getByText(/I confirm I have reviewed these figures and understand this is a working paper, not lodged advice\./i),
    ).toBeInTheDocument();
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/PdfGate.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/components/__tests__/PdfGate.test.tsx` exits 0 (6 tests pass)
    - `<PdfGate>` exports `onConfirmed`, `actionLabel`, `isLoading`, `className` props per the locked interface
    - Maps to VALIDATION.md FND-06 row 3 (`onConfirmed` callback gated by checkbox)
  </acceptance_criteria>
  <done>PdfGate component + 6 unit tests green.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 10: Create src/components/MigrationError.tsx + MigrationError.test.tsx</name>
  <read_first>
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "Schema versioning > Failure behaviour")
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 10: Migration Error UI")
    - .planning/phases/01-safety-net/01-VALIDATION.md (FND-09 row 3)
  </read_first>
  <files>src/components/MigrationError.tsx, src/components/__tests__/MigrationError.test.tsx</files>
  <behavior>
    - `<MigrationError message="boom" />` renders a full-viewport overlay
    - Overlay contains heading text including "Data Migration Failed"
    - The `message` prop is rendered inside a `<pre>` element (verbatim, not transformed)
    - Component is non-dismissable (no close button, no backdrop click handler)
    - Component renders without `onClose`/`onDismiss` props (deliberately absent)
  </behavior>
  <action>
**Create `src/components/MigrationError.tsx`:**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle } from 'lucide-react';

interface MigrationErrorProps {
  /** Raw error message from the migration runner. Rendered verbatim inside a <pre>. */
  message: string;
}

/**
 * Full-viewport non-dismissable error UI surfaced when the schema migration runner throws.
 * Per CONTEXT.md "Failure behaviour: surface a non-dismissable error UI explaining the
 * failure; do not auto-discard data."
 *
 * Deliberately accepts no `onDismiss` / `onClose` prop — there is no recovery path
 * the user can take from inside the app. They must inspect their localStorage data.
 */
export function MigrationError({ message }: MigrationErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-red-50 p-8"
    >
      <div className="max-w-md w-full border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} aria-hidden="true" /> Data Migration Failed
        </h1>
        <p className="text-sm text-gray-700 mb-4">
          AussieLedger could not upgrade your saved data to the current version. Your data has
          not been modified.
        </p>
        <pre className="text-xs bg-red-50 p-3 rounded border border-red-100 overflow-auto mb-4">
          {message}
        </pre>
        <p className="text-xs text-gray-500">
          Please inspect your browser&apos;s localStorage data
          (DevTools → Application → Local Storage) and report this error so it can be triaged.
        </p>
      </div>
    </div>
  );
}
```

**Create `src/components/__tests__/MigrationError.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MigrationError } from '../MigrationError';

describe('MigrationError', () => {
  it('renders the migration-failed heading', () => {
    render(<MigrationError message="boom" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Data Migration Failed/i)).toBeInTheDocument();
  });

  it('renders the raw message inside a <pre>', () => {
    render(<MigrationError message="No migration registered for version 5." />);
    const pre = screen.getByText('No migration registered for version 5.');
    expect(pre.tagName.toLowerCase()).toBe('pre');
  });

  it('exposes no dismissal affordance (no buttons)', () => {
    render(<MigrationError message="x" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
```
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/MigrationError.test.tsx --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run src/components/__tests__/MigrationError.test.tsx` exits 0
    - All 3 tests pass
    - `MigrationError` component accepts ONLY a `message: string` prop (no onDismiss/onClose)
    - Maps to VALIDATION.md FND-09 row 3 (MigrationError mounts on migration failure)
  </acceptance_criteria>
  <done>MigrationError component + 3 unit tests green; non-dismissable contract enforced.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 11: Create the App.test.tsx, smoke.test.tsx, EntityForm.test.tsx, structural.test.ts, and ci-config.test.ts files (these are RED until Plans 01-2 and 01-3 land)</name>
  <read_first>
    - .planning/phases/01-safety-net/01-VALIDATION.md (Per-Task Verification Map — every row marked "✅ created in W0")
    - .planning/phases/01-safety-net/01-RESEARCH.md (sections "Pattern 8: Smoke Tests" and "Risks Specific to Phase 1 — Risk 5: Recharts in jsdom")
    - .planning/phases/01-safety-net/01-CONTEXT.md (locked decisions for cleanup: ATO Connected, demo seeds, trend strings, slide generator, audit-log user)
    - src/App.tsx (lines 44, 53, 55-60, 351, 506-511, 526, 771, 783, 796, 1005-1011)
  </read_first>
  <files>src/__tests__/App.test.tsx, src/__tests__/structural.test.ts, src/__tests__/ci-config.test.ts, src/components/__tests__/smoke.test.tsx, src/components/__tests__/EntityForm.test.tsx</files>
  <behavior>
    - `App.test.tsx` defines four named tests: `'no ATO Connected'`, `'no foreign demo seed'`, `'trend placeholder'`, `'footer present on every view'`
    - `App.test.tsx` is RED today (Plan 01-2 makes it green)
    - `smoke.test.tsx` renders every major component listed in CONTEXT.md "Smoke tests": App, JournalForm, TrialBalance, BasIasAssistant, TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, EntityForm, AccountManager, AuditTrail, ImportTB, FinancialTrendChart
    - `EntityForm.test.tsx` defines two named tests: `'ABN warning'` and `'no TFN field'` — RED today, Plan 01-3 makes them green
    - `structural.test.ts` defines `'no slide-generator'` test that fails if `src/App.tsx` source contains the substring `slide-generator` — RED today, Plan 01-2 makes it green
    - `ci-config.test.ts` asserts `.github/workflows/ci.yml` exists and triggers on `push: branches: [main]` and `pull_request: branches: [main]`
  </behavior>
  <action>
**These tests are deliberately RED at the end of Wave 0** — they target App.tsx and EntityForm.tsx surfaces that Plans 01-2 and 01-3 will modify. Wave 0 only creates the test files. The orchestrator will accept Wave 0 as complete when the Wave-0-only tests (Tasks 3-10) are green AND the test files in this task exist with the listed test names.

**Create `src/__tests__/App.test.tsx`:**

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from '../App';

const VIEW_LABELS = [
  'master-dashboard',
  'dashboard',
  'journals',
  'trial-balance',
  'tax-return',
  'company-tax',
  'trust-tax',
  'bas-ias',
  'import',
  'edit-entity',
  'audit-trail',
  'coa-manager',
];

describe('App.tsx — Phase 1 cleanup acceptance', () => {
  it('no ATO Connected — sidebar text does not contain "ATO Connected" or "Simulated"', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/ATO Connected/i);
    expect(text).not.toMatch(/\(Simulated\)/i);
  });

  it('no foreign demo seed — no "Pearson Specter Litt" or "US Big Law Firm" anywhere', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('Pearson Specter Litt');
    expect(text).not.toContain('US Big Law Firm');
  });

  it('trend placeholder — em-dash (U+2014) appears in StatCard trend slots, no "+12%" or "-5% vs last month" or "Healthy margin"', () => {
    const { container } = render(<App />);
    const text = container.textContent ?? '';
    expect(text).not.toContain('+12% vs last month');
    expect(text).not.toContain('-5% vs last month');
    expect(text).not.toContain('Healthy margin');
    // The em-dash character — (U+2014) is the locked replacement
    expect(text).toContain('—');
  });

  it('footer present on every view — DisclaimerFooter renders the locked disclaimer once on initial render', () => {
    const { container } = render(<App />);
    expect(container.textContent ?? '').toContain('AussieLedger is not a tax agent');
    // Footer mounts inside <main>; verify role
    expect(container.querySelector('footer[role="contentinfo"]')).toBeInTheDocument();
    // Sanity: every view name from the union is conceptually reachable (smoke check that the union is intact)
    expect(VIEW_LABELS.length).toBeGreaterThan(0);
  });
});
```

**Create `src/__tests__/structural.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('Slide generator removal (FND-05 cleanup)', () => {
  const appPath = join(process.cwd(), 'src', 'App.tsx');

  it('no slide-generator — src/App.tsx contains no "slide-generator" view token, no "SlideGenerator" import, no "Slide Generator" nav label', () => {
    const source = readFileSync(appPath, 'utf-8');
    expect(source).not.toContain('slide-generator');
    expect(source).not.toContain('SlideGenerator');
    expect(source).not.toContain('Slide Generator');
  });

  it('no slide-generator — src/components/SlideGenerator.tsx file is deleted', () => {
    const slidePath = join(process.cwd(), 'src', 'components', 'SlideGenerator.tsx');
    expect(existsSync(slidePath)).toBe(false);
  });
});
```

**Create `src/__tests__/ci-config.test.ts`:**

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('GitHub Actions CI workflow (DEP-05)', () => {
  const ciPath = join(process.cwd(), '.github', 'workflows', 'ci.yml');

  it('CI workflow file exists at .github/workflows/ci.yml', () => {
    expect(existsSync(ciPath)).toBe(true);
  });

  it('triggers on push to main', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toMatch(/on:[\s\S]*push:[\s\S]*branches:\s*\[main\]/);
  });

  it('triggers on pull_request to main', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toMatch(/pull_request:[\s\S]*branches:\s*\[main\]/);
  });

  it('runs build, lint, and test jobs', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toContain('npm ci');
    expect(yml).toContain('npm run build');
    expect(yml).toContain('npm run lint');
    expect(yml).toMatch(/vitest run|npm run test/);
  });

  it('runs on ubuntu-latest with Node 20', () => {
    const yml = readFileSync(ciPath, 'utf-8');
    expect(yml).toContain('ubuntu-latest');
    expect(yml).toMatch(/node-version:\s*['"]?20/);
  });
});
```

**Create `src/components/__tests__/smoke.test.tsx`:**

```tsx
import { describe, it } from 'vitest';
import { render } from '@testing-library/react';
import { TrialBalance } from '../TrialBalance';
import { BasIasAssistant } from '../BasIasAssistant';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import { CompanyTaxReturn } from '../CompanyTaxReturn';
import { TrustTaxReturn } from '../TrustTaxReturn';
import { EntityForm } from '../EntityForm';
import { AccountManager } from '../AccountManager';
import { AuditTrail } from '../AuditTrail';
import { JournalForm } from '../JournalForm';
import { ImportTB } from '../ImportTB';
import { FinancialTrendChart } from '../FinancialTrendChart';
import { DisclaimerFooter } from '../DisclaimerFooter';
import { PdfGate } from '../PdfGate';
import { MigrationError } from '../MigrationError';
import App from '../../App';
import { sampleAccounts } from '../../test/fixtures/accounts';

const noOp = () => {};
const emptyEntries: never[] = [];
const emptyLogs: never[] = [];

describe('Smoke tests — every major component renders without crashing (FND-07)', () => {
  it('App renders', () => {
    render(<App />);
  });
  it('TrialBalance renders', () => {
    render(<TrialBalance accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('BasIasAssistant renders', () => {
    render(<BasIasAssistant accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('TaxReturnAssistant renders', () => {
    render(
      <TaxReturnAssistant
        accounts={sampleAccounts}
        entries={emptyEntries}
        onUpdateAccount={noOp}
      />,
    );
  });
  it('CompanyTaxReturn renders', () => {
    render(
      <CompanyTaxReturn
        accounts={sampleAccounts}
        entries={emptyEntries}
        onUpdateAccount={noOp}
      />,
    );
  });
  it('TrustTaxReturn renders', () => {
    render(
      <TrustTaxReturn accounts={sampleAccounts} entries={emptyEntries} onUpdateAccount={noOp} />,
    );
  });
  it('EntityForm renders (create mode)', () => {
    render(<EntityForm onSave={noOp} onCancel={noOp} />);
  });
  it('AccountManager renders', () => {
    render(<AccountManager accounts={sampleAccounts} onSave={noOp} onCancel={noOp} />);
  });
  it('AuditTrail renders', () => {
    render(<AuditTrail logs={emptyLogs} />);
  });
  it('JournalForm renders', () => {
    render(
      <JournalForm
        accounts={sampleAccounts}
        onSave={noOp}
        onCancel={noOp}
        existingEntries={emptyEntries}
      />,
    );
  });
  it('ImportTB renders', () => {
    render(<ImportTB accounts={sampleAccounts} onImport={noOp} />);
  });
  it('FinancialTrendChart renders', () => {
    render(<FinancialTrendChart accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('DisclaimerFooter renders', () => {
    render(<DisclaimerFooter />);
  });
  it('PdfGate renders', () => {
    render(<PdfGate onConfirmed={noOp} />);
  });
  it('MigrationError renders', () => {
    render(<MigrationError message="test" />);
  });
});
```

**Note on JournalForm and TrialBalance prop shapes:** If a smoke test crashes with a prop mismatch (e.g. JournalForm requires more props than `accounts/onSave/onCancel/existingEntries`), the executor MUST inspect the component's props interface and pass valid minimum props. Do NOT change the component signatures. Smoke tests must render successfully without modifying production code.

**Create `src/components/__tests__/EntityForm.test.tsx`:**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntityForm } from '../EntityForm';

describe('EntityForm — Phase 1 ABN validation (ENT-02)', () => {
  it('ABN warning — invalid ABN shows inline warning text but submit still succeeds (warn-but-allow)', () => {
    const onSave = vi.fn();
    render(<EntityForm onSave={onSave} onCancel={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/e.g\. Acme Corp|Sample Pty Ltd/i), {
      target: { value: 'Test Entity' },
    });
    // Type an invalid ABN — should display a warning but not block
    const abnInput = screen.getByLabelText(/abn/i);
    fireEvent.change(abnInput, { target: { value: '11 111 111 111' } });
    // Inline warning is rendered (any element with role='status' or text containing "checksum")
    expect(screen.getByText(/checksum|invalid abn|warning/i)).toBeInTheDocument();
    // Form still submits
    fireEvent.click(screen.getByRole('button', { name: /create entity|save/i }));
    expect(onSave).toHaveBeenCalled();
  });

  it('no TFN field — EntityForm source contains zero "TFN" string occurrences (case-insensitive)', async () => {
    // The component must not render any field labeled TFN. Plan 01-3 ensures this.
    render(<EntityForm onSave={() => {}} onCancel={() => {}} />);
    const screenText = document.body.textContent ?? '';
    expect(screenText).not.toMatch(/TFN/i);
    expect(screenText).not.toMatch(/Tax File Number/i);
  });
});
```
  </action>
  <verify>
    <automated>node -e "['src/__tests__/App.test.tsx','src/__tests__/structural.test.ts','src/__tests__/ci-config.test.ts','src/components/__tests__/smoke.test.tsx','src/components/__tests__/EntityForm.test.tsx'].forEach(f=>require('fs').statSync(f));" && npx vitest run src/__tests__/ci-config.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - All five test files exist on disk
    - `src/__tests__/App.test.tsx` contains the test names: `no ATO Connected`, `no foreign demo seed`, `trend placeholder`, `footer present on every view`
    - `src/__tests__/structural.test.ts` contains the test name: `no slide-generator`
    - `src/components/__tests__/EntityForm.test.tsx` contains the test names: `ABN warning`, `no TFN field`
    - `src/components/__tests__/smoke.test.tsx` includes render() calls for at least 12 distinct components from the CONTEXT.md "Smoke tests" list
    - `npx vitest run src/__tests__/ci-config.test.ts` is the only one of these that may fail (it runs after Task 12 creates ci.yml; Wave 0's last task is the CI workflow file)
    - These tests intentionally remain RED for App.test, structural.test, EntityForm.test until Plans 01-2 and 01-3 ship — that is the design.
    - Maps to VALIDATION.md rows: FND-05 (4 rows), FND-06 (footer-present row), FND-07 (smoke row), ENT-02 (ABN warning + no TFN rows), DEP-05 (CI workflow rows)
  </acceptance_criteria>
  <done>Five test files in place. Wave-0-completable subset (ci-config) green. App/structural/smoke/EntityForm tests deliberately red — handed off to Plans 01-2 and 01-3.</done>
</task>

<task type="auto">
  <name>Task 12: Create .github/workflows/ci.yml (GitHub Actions CI)</name>
  <read_first>
    - .planning/phases/01-safety-net/01-RESEARCH.md (section "Pattern 9: GitHub Actions CI Workflow")
    - .planning/phases/01-safety-net/01-CONTEXT.md (section "CI (DEP-05)")
    - .planning/phases/01-safety-net/01-VALIDATION.md (DEP-05 rows)
    - src/__tests__/ci-config.test.ts (created in Task 11 — this workflow must satisfy its assertions)
  </read_first>
  <files>.github/workflows/ci.yml</files>
  <behavior>
    - File `.github/workflows/ci.yml` exists
    - Workflow name is `CI`
    - Triggers on `push` to `main` AND on `pull_request` to `main`
    - Runs on `ubuntu-latest` with `node-version: '20'`
    - Steps: `actions/checkout@v4` → `actions/setup-node@v4` (with `cache: 'npm'`) → `npm ci` → `npm run build` → `npm run lint` → `vitest run` (with coverage flags printed in logs only — no failing threshold)
    - The locally-runnable `src/__tests__/ci-config.test.ts` (from Task 11) passes against this file
  </behavior>
  <action>
**Create `.github/workflows/ci.yml`** (verbatim from RESEARCH.md Pattern 9, with coverage flags inline):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Type check (lint)
        run: npm run lint

      - name: Test (with coverage in logs)
        run: npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text
```

The `.github/` directory does not yet exist — create it. Coverage is printed to logs only (no `--coverage.thresholds.lines=NN` flag) per CONTEXT.md "Coverage gate: None in Phase 1".
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/ci-config.test.ts --reporter=verbose</automated>
  </verify>
  <acceptance_criteria>
    - `.github/workflows/ci.yml` exists
    - All 5 tests in `src/__tests__/ci-config.test.ts` pass:
      - workflow file exists
      - triggers on push to main
      - triggers on pull_request to main
      - runs npm ci + npm run build + npm run lint + vitest
      - runs on ubuntu-latest with Node 20
    - Maps to VALIDATION.md DEP-05 rows 1 and 2
  </acceptance_criteria>
  <done>CI workflow committed; ci-config tests green.</done>
</task>

</tasks>

<verification>
After all tasks complete, run:

1. `npm run lint` (`tsc --noEmit`) — exits 0
2. `npm run build` — exits 0 (the build must still succeed; no app-runtime changes in this plan)
3. `npx vitest run --reporter=verbose` — runs all tests; expected outcome:
   - GREEN: money.test.ts, validation.test.ts, runner.test.ts, structural-lint.test.ts, golden.test.ts (4 todos), bas.test.ts (7 todos), DisclaimerFooter.test.tsx, PdfGate.test.tsx, MigrationError.test.tsx, types-schema-version.test.ts, ci-config.test.ts
   - RED (by design — handed to Plans 01-2 and 01-3): App.test.tsx, structural.test.ts, smoke.test.tsx (some renders may fail due to ATO Connected indicator + Pearson Specter Litt seeds), EntityForm.test.tsx
4. `node -e "require('fs').statSync('.github/workflows/ci.yml')"` — exits 0
5. Manual: open the running app via `npm run dev` — confirm `<DisclaimerFooter>` is NOT yet mounted (Plan 01-2 wires it). The component exists but is unused at this point.
</verification>

<success_criteria>
- Wave 0 infrastructure complete: deps installed, vitest config + setup written, three libraries (money, validation, migrations) implemented and tested, three components (DisclaimerFooter, PdfGate, MigrationError) implemented and tested, fixtures created, structural-lint and tax-test scaffolds created, schema-version field added to persisted types, CI workflow committed.
- All Wave-0-only tests green (~30+ tests pass).
- App.test, structural.test, smoke.test, EntityForm.test exist on disk and contain the named tests required by VALIDATION.md — they are RED, awaiting Plans 01-2 and 01-3.
- `npm run build` and `npm run lint` continue to pass.
- Plans 01-2 and 01-3 can now run in parallel (they touch disjoint files: App.tsx vs EntityForm.tsx).
</success_criteria>

<output>
After completion, create `.planning/phases/01-safety-net/01-1-SUMMARY.md` documenting:
- All files created (libraries, components, tests, config, fixtures, CI workflow)
- Test count green / red / todo
- The handoff: which tests are RED-by-design and which plans turn them green (01-2 → App.test + structural.test + smoke.test; 01-3 → EntityForm.test)
- Any deviations from this plan (e.g. if jsdom 26 had to be force-pinned, if a smoke test required a Recharts ResizeObserver workaround beyond what setup.ts provides)
</output>
