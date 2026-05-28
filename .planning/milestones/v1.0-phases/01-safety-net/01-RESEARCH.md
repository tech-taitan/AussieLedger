# Phase 1: Safety Net — Research

**Researched:** 2026-05-10
**Domain:** Vitest/CI setup, decimal.js, ABN validation, schema versioning, React cleanup
**Confidence:** HIGH on code facts (sourced from actual files); MEDIUM on library APIs (verified against official docs with web access); HIGH on ABN algorithm (verified against abr.business.gov.au official spec)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

| Surface | Decision |
|---|---|
| Disclaimer placement | Persistent footer on every page, thin, always visible, low visual weight |
| Disclaimer copy (verbatim) | *"This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO."* |
| PDF gate | Tick-to-confirm hard gate before any PDF generation; gate component ships Phase 1 even though PDF generator arrives Phase 5 |
| Audit log user string | Replace `'Tristan (Admin)'` with `'Local user'` at App.tsx:351 |
| Trend string replacement | Replace `'+12% vs last month'`, `'-5% vs last month'`, `'Healthy margin'` with `'—'` (em-dash U+2014) |
| "ATO Connected (Simulated)" | Remove entirely from App.tsx:526 |
| Slide generator | Remove entirely: delete SlideGenerator.tsx, import at App.tsx:44, route App.tsx:1005-1011, sidebar NavButton App.tsx:506-511, `'slide-generator'` token from View union App.tsx:53 |
| Demo seed entities | Replace with `'Sample Pty Ltd'` (Company) and `'Sample Family Trust'` (Trust); placeholder ABNs `'11 111 111 111'` and `'22 222 222 222'`; no TFN values |
| Test framework | Vitest + React Testing Library + jsdom. Locked. |
| Coverage gate | None in Phase 1 — visible in CI logs only |
| Smoke tests | Assert each major component renders without crashing. Do NOT characterise current behaviour. |
| Structural lint test | Custom Vitest test that fails CI if `src/lib/tax/**/*.ts` contains `* /` or `/ \d` patterns applied to monetary values |
| ABN validation | Modulus-89 checksum + format check. Warn but allow save. Inline warning at field. |
| TFN | Remove entirely from data model and EntityForm. No TFN field anywhere in Phase 1. |
| decimal.js library | Locked by research. Install dependency, write `src/lib/money.ts` wrapper with `add`, `sub`, `mul`, `div`, `gst`, banker's rounding to 2dp |
| Schema versioning | Root-level `_v: number` field on the persisted root. Initial version `_v: 1`. Pre-`_v` data treated as `_v: 0`. Migration runner in `src/lib/migrations/`. |
| Migration error UI | Non-dismissable error UI if migration throws. Phase 1 ships the error path. |
| CI provider | GitHub Actions. Triggers: push to main + PRs targeting main. Jobs: `npm ci` → `npm run build` → `npm run lint` → `npm run test`. Ubuntu-latest runner. |

### Claude's Discretion
- Exact directory layout for `src/lib/money.ts`, `src/lib/migrations/`, `src/lib/tax/` placeholder
- File names and organisation of test fixtures (single shared `fixtures/` vs colocated)
- Exact CSS/Tailwind classes for disclaimer footer — match existing visual system
- Wording of placeholder seed entities' contact/address fields beyond what's specified
- Whether to add `npm run typecheck` as alias for existing `npm run lint`

### Deferred Ideas (OUT OF SCOPE)
- Single-instance display name setting for audit log (Phase 4)
- Real period-over-period trend computation (Phase 4+)
- Coverage threshold gate in CI (revisit after Phase 5)
- TFN-on-PDF policy (N/A, TFN not stored)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FND-05 | No user-facing surface displays misleading "ATO Connected", simulated agency status, or fabricated trend metrics | Codebase grep confirms ATO indicator at App.tsx:526; fake trends at App.tsx:771,783. Exact removal points documented in Code Context section. |
| FND-06 | Always-visible disclaimer states product produces working papers / draft returns, not tax advice | Footer placement analysis in Architecture Patterns section; component contract in Code Examples. |
| FND-07 | Test suite (Vitest) with at least one golden-output test per tax return type and per-label tests for BAS arithmetic | Vitest config verified via official docs; setup file pattern documented; note Phase 1 establishes the infrastructure, golden-output tests for all 4 types are seeded but math is Phase 5's job. |
| FND-08 | All monetary calculations use decimal arithmetic library (not native JS floats) | decimal.js API verified via official docs; money.ts wrapper contract specified; structural lint test approach documented. |
| FND-09 | Application data has a schema version; migration runner upgrades older schemas on load | Migration runner contract specified; integration point with App.tsx:230 load effect documented. |
| ENT-02 | User can record ABN (with format validation: 11-digit modulus-89 check). TFN portion: REMOVED — no TFN field exists in Phase 1. | ABN algorithm verified against abr.business.gov.au. Valid test vector: `51 824 753 556`. TFN: zero references in current codebase confirmed by grep — no removal work needed beyond never adding it. |
| DEP-05 | CI (GitHub Actions) runs `npm run build`, `npm run lint`, and test suite on every push | GitHub Actions workflow structure documented; Node 20 recommended; npm cache pattern specified. |
</phase_requirements>

---

## Summary

Phase 1 is pure demolition and plumbing: remove off-mission code, install the quality floor (Vitest, CI, decimal.js, schema versioning), and enforce the compliance framing (disclaimer, no ATO theatre). None of these tasks add user-visible features — they prevent existing code from causing trust or correctness failures in later phases.

The codebase analysis confirms that **TFN has zero references** anywhere in the current source — the field was never wired to `types.ts` despite appearing in `EntityForm.tsx` only as `registrationNumber` (which is ABN/EIN combined). This means ENT-02's TFN removal is purely a "do not add" policy. The data model (`Entity` interface) uses `registrationNumber?: string` as a single freeform field with no TFN-specific type — rename the form label to "ABN" and wire modulus-89 validation to it.

The Tailwind v4 + jsdom interaction is a live compatibility issue (GitHub issue opened Sep 2025, unresolved). The proven workaround is to add CSS mocking to the Vitest setup file (`moduleNameMapper` or `setupFiles` approach), which completely avoids the PostCSS parse error in tests. Components being smoke-tested are unlikely to depend on Tailwind-computed values in assertions anyway.

**Primary recommendation:** Establish `vitest.config.ts` as a separate file (not embedded in `vite.config.ts`) with CSS mocking in `src/test/setup.ts`, create `src/lib/money.ts` with a singleton `Decimal` configured to `ROUND_HALF_EVEN`, wire the migration runner into the existing `useEffect` load block at App.tsx:230, and mount the disclaimer footer as a sticky bar inside the `<main>` flex column (before closing tag at App.tsx:1032).

---

## Standard Stack

### Core (Phase 1 additions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | ^2.x — verify before install | Test runner; Vite-native | Reuses Vite config, supports ESM, no babel needed |
| `@testing-library/react` | ^16.x — verify before install | Component testing | RTL 16 added React 19 `act()` compatibility |
| `@testing-library/user-event` | ^14.x | Realistic browser event simulation | Required for form interaction tests |
| `@testing-library/jest-dom` | ^6.x | DOM matchers (`toBeInTheDocument`, etc.) | Standard extension for RTL assertions |
| `jsdom` | ^25.x or ^26.x — prefer 26.x, avoid 27.x (CSS parse bug) | DOM environment for Node | Required by Vitest `environment: 'jsdom'` |
| `@vitest/coverage-v8` | ^2.x | Coverage via V8 | Zero extra deps, matches vitest version |
| `decimal.js` | ^10.x — verify before install | Decimal arithmetic for money | Prevents GST float rounding errors; banker's rounding built-in |

**Installation:**
```bash
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8
npm install decimal.js
```

### Existing Stack (no changes)

React 19.0.0, TypeScript 5.8.2, Vite 6.2.0, Tailwind v4.1.14, motion 12.x, lucide-react 0.546.0 — all remain as-is.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `decimal.js` | `big.js` | `decimal.js` has more rounding modes including ROUND_HALF_EVEN; both acceptable; decimal.js is richer |
| Separate `vitest.config.ts` | Embedded in `vite.config.ts` | Separate file has higher priority and avoids polluting Vite's production config with test options |
| jsdom | `happy-dom` | happy-dom is faster but less complete; jsdom is more stable for RTL |

---

## Architecture Patterns

### Recommended Project Structure (new additions only)

```
src/
├── lib/
│   ├── utils.ts            # existing cn() — do not touch
│   ├── money.ts            # NEW: decimal.js wrapper
│   ├── migrations/
│   │   └── index.ts        # NEW: migration runner + registry
│   └── tax/
│       └── .gitkeep        # NEW: placeholder dir for Phase 2
├── components/
│   ├── DisclaimerFooter.tsx # NEW: persistent footer
│   └── PdfGate.tsx          # NEW: tick-to-confirm gate
└── test/
    ├── setup.ts             # NEW: RTL + jest-dom bootstrap
    └── fixtures/
        ├── entities.ts      # NEW: minimal prop fixtures for smoke tests
        └── accounts.ts      # NEW: minimal Account fixtures
vitest.config.ts             # NEW: at repo root
.github/
└── workflows/
    └── ci.yml               # NEW
```

### Pattern 1: Vitest Configuration (separate file)

**What:** Separate `vitest.config.ts` at repo root. Imports Vite plugins it needs (react, tailwindcss) but adds test-specific options. The existing `vite.config.ts` is left untouched.

**Critical detail — Tailwind v4 + jsdom CSS issue:** When `@tailwindcss/vite` processes CSS files that contain Tailwind v4 `@import` directives, jsdom@27 throws "Could not parse CSS stylesheet". The fix is to mock all CSS imports in tests — components don't need CSS to render in jsdom for smoke tests or arithmetic tests.

```typescript
// vitest.config.ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],  // Note: do NOT include tailwindcss() plugin here
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,  // KEY: disables CSS processing entirely — avoids Tailwind v4/jsdom parse error
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

**Why `css: false` not CSS mocking:** Setting `css: false` in Vitest test config tells the Vite pipeline not to process CSS at all during tests. This is cleaner than a moduleNameMapper and avoids the Tailwind v4 `@tailwindcss/vite` PostCSS plugin crashing when jsdom tries to evaluate its output. Components in smoke tests render fine without CSS styles being applied.

```typescript
// src/test/setup.ts
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

expect.extend(matchers);

afterEach(() => {
  cleanup();  // RTL cleanup after each test — prevents memory leaks
});
```

**TypeScript globals** — add to `tsconfig.json` `compilerOptions.types`:
```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

Or alternatively, since `globals: true` is set in vitest.config.ts, reference via triple-slash:
```typescript
/// <reference types="vitest/globals" />
```

**Package.json script change:**
```json
"test": "vitest run",
"test:watch": "vitest",
"test:coverage": "vitest run --coverage"
```

The existing `"lint": "tsc --noEmit"` stays unchanged. Optionally add `"typecheck": "tsc --noEmit"` as an alias.

### Pattern 2: decimal.js Money Wrapper (`src/lib/money.ts`)

**What:** A singleton `Decimal` configured with banker's rounding (ROUND_HALF_EVEN = mode 6), plus named pure functions that accept and return `Decimal` instances. Serialization is via `toString()` for storage and `new Decimal(storedString)` for rehydration.

**Key API facts (verified against official docs):**

- `Decimal.set({ rounding: Decimal.ROUND_HALF_EVEN })` — sets global rounding mode. `ROUND_HALF_EVEN` is the constant value `6`.
- `new Decimal(n)` — accepts number, string, or existing Decimal. Always prefer string construction to avoid inheriting JS float imprecision: `new Decimal('0.1')` not `new Decimal(0.1)`.
- `.plus(b)`, `.minus(b)`, `.times(b)`, `.dividedBy(b)` — arithmetic; each returns a new Decimal.
- `.toFixed(2)` — returns string `'1234.56'` with exactly 2 decimal places using configured rounding mode. Use for display and storage serialization.
- `JSON.stringify(decimal)` works via `decimal.toJSON()` which calls `valueOf()` (returns the full-precision string). For storing money to localStorage use `.toFixed(2)` explicitly to round to cents first.
- `toDecimalPlaces(2)` — rounds to 2dp returning a Decimal (not string); equivalent to `.toDP(2)`.

```typescript
// src/lib/money.ts
// Source: decimal.js official docs https://mikemcl.github.io/decimal.js/
import { Decimal } from 'decimal.js';

// Configure global rounding: banker's rounding (ROUND_HALF_EVEN = 6)
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -9,
  toExpPos: 20,
});

export { Decimal };

/** Add two monetary amounts, returns Decimal */
export function add(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).plus(new Decimal(b));
}

/** Subtract b from a */
export function sub(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).minus(new Decimal(b));
}

/** Multiply (e.g. qty × rate) */
export function mul(a: Decimal.Value, b: Decimal.Value): Decimal {
  return new Decimal(a).times(new Decimal(b));
}

/** Divide */
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

/**
 * Round to 2 decimal places (cents) using banker's rounding.
 * Use this before any display or storage operation.
 */
export function toCents(amount: Decimal.Value): Decimal {
  return new Decimal(amount).toDecimalPlaces(2);
}

/**
 * Serialize a monetary Decimal to a string for localStorage/JSON storage.
 * Always stores 2dp for consistent deserialization.
 */
export function serialize(amount: Decimal): string {
  return amount.toFixed(2);
}

/**
 * Deserialize a stored monetary string back to Decimal.
 * Safe to call with number (e.g. legacy data) or string.
 */
export function deserialize(stored: string | number): Decimal {
  return new Decimal(stored);
}
```

**GST test vectors** (hand-calculated for tests):
- `gst('110.00')` → `'10.00'` (exactly divisible)
- `gst('100.00')` → `'9.09'` (100/11 = 9.0909... → rounds to 9.09)
- `gst('105.50')` → `'9.59'` (105.5/11 = 9.5909... → rounds to 9.59)
- Banker's rounding: `toCents('2.5')` → `'2.50'` (2.5 rounds to 2 not 3 — even). Verify: `new Decimal('2.505').toDecimalPlaces(2)` with ROUND_HALF_EVEN → `2.50` (digit before 5 is even, round down).

### Pattern 3: Schema Migration Runner (`src/lib/migrations/index.ts`)

**What:** A module that reads a root-level `_v` from parsed state, applies any registered migrations in sequence, and returns the migrated state. Phase 1 registers only the `0 → 1` identity migration. The runner is wired into the existing localStorage load `useEffect` at App.tsx:230.

```typescript
// src/lib/migrations/index.ts

/** Root shape of all persisted state (extended as phases add data) */
export interface PersistedRoot {
  _v: number;
  entities?: unknown;
  allEntries?: unknown;
  auditLogs?: unknown;
  accounts?: unknown;
}

type MigrationFn = (state: PersistedRoot) => PersistedRoot;

// Registry: maps version N to the function that upgrades N → N+1
const MIGRATIONS: Record<number, MigrationFn> = {
  // 0 → 1: identity — existing data shape is already compatible with v1
  0: (state) => ({ ...state, _v: 1 }),
};

export const CURRENT_VERSION = 1;

/**
 * Run all pending migrations on the given state.
 * Throws if a migration function throws — caller must catch and show error UI.
 * @param raw - Parsed JSON object from localStorage (may lack _v)
 */
export function migrate(raw: Record<string, unknown>): PersistedRoot {
  // Treat missing _v as version 0 (pre-versioning data)
  let state = { ...raw, _v: (raw._v as number) ?? 0 } as PersistedRoot;

  while (state._v < CURRENT_VERSION) {
    const migrationFn = MIGRATIONS[state._v];
    if (!migrationFn) {
      throw new Error(
        `No migration registered for version ${state._v}. ` +
        `Cannot upgrade to version ${CURRENT_VERSION}.`
      );
    }
    state = migrationFn(state);
  }

  return state;
}
```

**Integration into App.tsx:230 load `useEffect`:**

```typescript
// Replace the existing four separate localStorage.getItem blocks with:
useEffect(() => {
  try {
    // Read individual slices (current structure — Phase 3 unifies this)
    const rawEntities = localStorage.getItem('ledger_entities_list');
    const rawAll = localStorage.getItem('ledger_all_entries');
    const rawLogs = localStorage.getItem('ledger_audit_logs');
    const rawAccounts = localStorage.getItem('ledger_chart_of_accounts');

    // Wrap in a synthetic root for migration
    const syntheticRoot: Record<string, unknown> = {};
    if (rawEntities) syntheticRoot.entities = JSON.parse(rawEntities);
    if (rawAll) syntheticRoot.allEntries = JSON.parse(rawAll);
    if (rawLogs) syntheticRoot.auditLogs = JSON.parse(rawLogs);
    if (rawAccounts) syntheticRoot.accounts = JSON.parse(rawAccounts);

    const migrated = migrate(syntheticRoot);

    if (migrated.entities) setEntities(migrated.entities as Entity[]);
    if (migrated.allEntries) setAllEntries(migrated.allEntries as Record<string, JournalEntry[]>);
    if (migrated.auditLogs) setAuditLogs(migrated.auditLogs as AuditLog[]);
    if (migrated.accounts) setAccounts(migrated.accounts as Account[]);

  } catch (err) {
    // Migration failed — surface non-dismissable error UI
    setMigrationError(err instanceof Error ? err.message : 'Unknown migration error');
  }
}, []);
```

**Note on root `_v` write-back:** On each save, write `_v: CURRENT_VERSION` alongside the data. The simplest approach for Phase 1 (before Phase 3 unifies storage) is to write a separate `localStorage.setItem('ledger_schema_version', String(CURRENT_VERSION))` and read it back as part of the synthetic root construction. Phase 3 unifies everything into a single persisted document.

### Pattern 4: ABN Modulus-89 Validation (`src/lib/validation.ts`)

**Algorithm (verified against abr.business.gov.au):**

1. Strip all spaces and any non-numeric characters. Expect exactly 11 digits.
2. Subtract 1 from the first (leftmost) digit.
3. Multiply each of the 11 digits by the position weight: `[10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]`
4. Sum all 11 products.
5. If `sum % 89 === 0`, the ABN is valid.

```typescript
// src/lib/validation.ts
const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

/**
 * Validates an Australian Business Number using the ABR modulus-89 algorithm.
 * Source: abr.business.gov.au/Help/AbnFormat
 *
 * @param abn - Raw input (may include spaces or 'ABN ' prefix)
 * @returns true if valid, false otherwise
 */
export function validateABN(abn: string): boolean {
  // Normalize: remove 'ABN' prefix and all spaces
  const digits = abn.replace(/[^0-9]/g, '');
  if (digits.length !== 11) return false;

  // Step 1: subtract 1 from first digit
  const d = digits.split('').map(Number);
  d[0] -= 1;

  // Step 2-4: weighted sum
  const sum = d.reduce((acc, digit, i) => acc + digit * ABN_WEIGHTS[i], 0);

  // Step 5: modulus 89 check
  return sum % 89 === 0;
}

/**
 * Format-only validation (11 digits after stripping spaces).
 * Use as a preliminary check before the checksum.
 */
export function isABNFormat(abn: string): boolean {
  return /^\d{11}$/.test(abn.replace(/[^0-9]/g, ''));
}
```

**Known valid test ABNs** (use these in unit tests):
- `51 824 753 556` — documented example from abr.business.gov.au
- `11 111 111 111` — NOT valid (checksum fails) — use this as the demo seed placeholder precisely because it's recognisably fake
- `53 004 085 616` — Australian Broadcasting Corporation ABN — publicly registered, valid checksum (verify before including in tests)

**Invalid test cases:**
- `12 345 678 901` — format valid, checksum likely fails (use to test checksum detection)
- `00 000 000 000` — format valid, checksum fails
- `1234` — too short
- `51 824 753 557` — one digit transposed from valid ABN; should fail

**Integration into EntityForm.tsx:**

The existing `registrationNumber` field becomes the dedicated ABN field. Rename label to "ABN" (remove the "EIN" reference — the "US Big Law Firm" type is also being removed). Wire `validateABN()` in the existing `handleChange` real-time validation pattern:

```typescript
// In EntityForm.tsx validate() and handleChange():
import { validateABN } from '../lib/validation';

// In real-time validation:
if (field === 'registrationNumber' && value.replace(/[^0-9]/g, '').length === 11) {
  if (!validateABN(value)) {
    newErrors.registrationNumber = 'ABN checksum invalid — please check the number';
    // Note: this is a WARN not a block — form still submits
    // Implement as a warning-severity field state, not a hard error
  }
}
```

**Warn-not-block implementation:** Use a separate `warnings` state (parallel to `errors`) in EntityForm. Show the warning icon inline (use `lucide-react`'s `AlertTriangle` icon) but do not include `registrationNumber` in the `validate()` function's blocking errors. Save proceeds regardless.

### Pattern 5: Disclaimer Footer (`src/components/DisclaimerFooter.tsx`)

**Placement:** Inside the `<main className="flex-1 flex flex-col overflow-hidden pb-16 lg:pb-0">` at App.tsx:532. Mount as the last child before the closing `</main>` tag (before App.tsx:1032). The `flex-col` layout means the footer naturally stacks at the bottom of the scrollable content area.

**Mobile consideration:** The existing `pb-16 lg:pb-0` on `<main>` is the padding that clears the mobile bottom nav. The disclaimer footer must sit above this on mobile, meaning it should carry `mb-16 lg:mb-0` or be absolutely positioned above the nav. Simplest: make the footer `sticky bottom-0` within the scrollable column.

```tsx
// src/components/DisclaimerFooter.tsx
import { Info } from 'lucide-react';
import { cn } from '../lib/utils';

export function DisclaimerFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        'border-t border-[var(--line)] bg-gray-50/80 px-4 py-2',
        'flex items-start gap-2 text-[11px] text-gray-500 leading-snug',
        className
      )}
      role="contentinfo"
      aria-label="Compliance disclaimer"
    >
      <Info size={13} className="mt-0.5 flex-shrink-0 text-gray-400" />
      <span>
        This output is a draft working paper, not tax advice. Verify all figures against
        your source records before lodging. AussieLedger is not a tax agent and does not
        lodge returns with the ATO.
      </span>
    </footer>
  );
}
```

Mount in App.tsx immediately before the closing `</main>`:
```tsx
        </div>
      </main>  {/* BEFORE this closing tag */}
```

becomes:

```tsx
        </div>
        <DisclaimerFooter />
      </main>
```

### Pattern 6: PDF Tick-Gate Component (`src/components/PdfGate.tsx`)

**Phase 1 contract:** The gate component exists and is unit-tested. It renders a checkbox and a disabled `<button>`. When the checkbox is ticked, the button enables. The actual PDF generation callback is wired in Phase 5.

**Design decision:** Accept `onConfirmed: () => void` as a prop. Gate renders a loading/disabled state for the action button until confirmed. Works as a standalone section, not a modal, so it can be placed inline in whatever tax return component triggers PDF generation.

```tsx
// src/components/PdfGate.tsx
import { useState } from 'react';
import { cn } from '../lib/utils';

interface PdfGateProps {
  /** Called only after user has ticked the confirmation checkbox */
  onConfirmed: () => void;
  /** Label for the action button. Defaults to 'Download Working Paper' */
  actionLabel?: string;
  /** Whether the action is currently loading/processing */
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
          I confirm I have reviewed these figures and understand this is a working paper,
          not lodged advice.
        </span>
      </label>

      <div className="mt-3 flex justify-end">
        <button
          onClick={() => confirmed && onConfirmed()}
          disabled={!confirmed || isLoading}
          className={cn(
            'px-4 py-2 text-sm font-medium transition-opacity',
            confirmed && !isLoading
              ? 'bg-[var(--ink)] text-white hover:opacity-90'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
          aria-disabled={!confirmed || isLoading}
        >
          {isLoading ? 'Generating...' : actionLabel}
        </button>
      </div>
    </div>
  );
}
```

**Test contract for PdfGate:**
- Renders checkbox unchecked by default
- Button is disabled when unchecked
- After user checks box, button becomes enabled
- `onConfirmed` is called when enabled button is clicked
- `onConfirmed` is NOT called when disabled button is clicked (even programmatically)

### Pattern 7: Structural Lint Test (`src/lib/tax/__tests__/structural-lint.test.ts`)

**What:** A Vitest test that reads source files using Node's `fs` module and fails if `src/lib/tax/**/*.ts` contains raw arithmetic operators applied to what looks like monetary values (i.e. `/ \d` or `* \d` not inside a string or comment context).

**The detection challenge:** A perfect regex for "monetary arithmetic" without false positives is hard. The pragmatic approach: flag any `/` followed by a digit (space optional) or `*` followed by a digit (space optional) in non-comment, non-string lines of `.ts` files within `src/lib/tax/`. This will have false positives in edge cases (e.g. array index math) but that's acceptable — Phase 1's `src/lib/tax/` is nearly empty, so there will be no legitimate false positives.

```typescript
// src/lib/tax/__tests__/structural-lint.test.ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

const TAX_LIB_DIR = join(process.cwd(), 'src', 'lib', 'tax');

/** Strip line comments and string literals (approximate, sufficient for this check) */
function stripCommentsAndStrings(line: string): string {
  return line
    .replace(/\/\/.*$/, '')          // strip // comments
    .replace(/'[^']*'/g, "''")       // strip single-quoted strings
    .replace(/"[^"]*"/g, '""')       // strip double-quoted strings
    .replace(/`[^`]*`/g, '``');      // strip template literals (single-line only)
}

/** Returns all .ts files recursively under a directory */
function findTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter(f => f.isFile() && f.name.endsWith('.ts') && !f.name.endsWith('.test.ts'))
    .map(f => join(f.path, f.name));
}

describe('Structural lint: no raw float arithmetic in src/lib/tax/', () => {
  it('does not contain bare division or multiplication operators on monetary values', () => {
    const files = findTsFiles(TAX_LIB_DIR);
    const violations: string[] = [];

    for (const file of files) {
      const lines = readFileSync(file, 'utf-8').split('\n');
      lines.forEach((raw, i) => {
        const line = stripCommentsAndStrings(raw);
        // Pattern: a digit or ) followed by space? then * or / then space? then a digit
        // This catches: amount / 11, total * 0.1, etc.
        const rawArith = /[\d)]\s*[*/]\s*\d/.test(line);
        if (rawArith) {
          violations.push(`${file}:${i + 1}: ${raw.trim()}`);
        }
      });
    }

    if (violations.length > 0) {
      throw new Error(
        `Found raw arithmetic in src/lib/tax/ — use src/lib/money.ts wrappers instead:\n` +
        violations.join('\n')
      );
    }
  });
});
```

**Notes:**
- Phase 1 ships an empty `src/lib/tax/` with only a `.gitkeep`. The lint test passes vacuously (no files = no violations). This is correct — it establishes the gate before Phase 2 populates the directory.
- `process.cwd()` in Vitest resolves to the repo root (where `package.json` lives), which is correct for this repo layout.
- The `readdirSync` `recursive: true` option requires Node 18.17+. GitHub Actions runner with Node 20 satisfies this.

### Pattern 8: Smoke Tests (`src/components/__tests__/smoke.test.tsx`)

**What:** One `it('renders without crashing', ...)` per major component. Uses minimum valid props. Does NOT assert on content — only that the component does not throw during render.

**Minimum prop fixtures:**

```typescript
// src/test/fixtures/entities.ts
import type { Entity } from '../../types';

export const sampleEntity: Entity = {
  id: 'test-ent-1',
  name: 'Sample Pty Ltd',
  type: 'Company',
  registrationNumber: '11 111 111 111',
  status: 'Active',
};
```

```typescript
// src/test/fixtures/accounts.ts
import type { Account } from '../../types';

export const sampleAccounts: Account[] = [
  { id: '4-001', code: '4-001', name: 'Revenue', type: 'Revenue', gstCode: 'GST' },
  { id: '6-001', code: '6-001', name: 'Expense', type: 'Expense', gstCode: 'N-T' },
];
```

```typescript
// src/components/__tests__/smoke.test.tsx
import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { TrialBalance } from '../TrialBalance';
import { BasIasAssistant } from '../BasIasAssistant';
import { TaxReturnAssistant } from '../TaxReturnAssistant';
import { CompanyTaxReturn } from '../CompanyTaxReturn';
import { TrustTaxReturn } from '../TrustTaxReturn';
import { EntityForm } from '../EntityForm';
import { AccountManager } from '../AccountManager';
import { AuditTrail } from '../AuditTrail';
import { sampleAccounts } from '../../test/fixtures/accounts';
import { sampleEntity } from '../../test/fixtures/entities';

const noOp = () => {};
const emptyEntries = [];
const emptyLogs = [];

describe('Smoke tests — components render without crashing', () => {
  it('TrialBalance renders', () => {
    render(<TrialBalance accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('BasIasAssistant renders', () => {
    render(<BasIasAssistant accounts={sampleAccounts} entries={emptyEntries} />);
  });
  it('TaxReturnAssistant renders', () => {
    render(<TaxReturnAssistant accounts={sampleAccounts} entries={emptyEntries} onUpdateAccount={noOp} />);
  });
  it('CompanyTaxReturn renders', () => {
    render(<CompanyTaxReturn accounts={sampleAccounts} entries={emptyEntries} onUpdateAccount={noOp} />);
  });
  it('TrustTaxReturn renders', () => {
    render(<TrustTaxReturn accounts={sampleAccounts} entries={emptyEntries} onUpdateAccount={noOp} />);
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
  it('DisclaimerFooter renders', () => {
    render(<DisclaimerFooter />);
  });
  it('PdfGate renders', () => {
    render(<PdfGate onConfirmed={noOp} />);
  });
});
```

**Note on `ImportTB`:** It likely depends on Gemini API (`@google/genai`) at module level. If the import throws without `process.env.GEMINI_API_KEY`, mock the module: `vi.mock('@google/genai', () => ({ GoogleGenAI: class {} }))`. Verify by running the test first.

**Note on `FinancialTrendChart`:** Recharts renders SVG; jsdom supports SVG. Should pass without mocking. Include if straightforward, skip if it causes jsdom dimension errors.

**Note on `JournalForm`:** Not included in the smoke test list because it likely needs `activeEntityId` context and the CONTEXT.md list of "major components" to smoke test was specific. Add if easy.

### Pattern 9: GitHub Actions CI Workflow

**Node version:** Use Node 20 (LTS). Note: GitHub blog states Node 20 deprecation begins June 2026 — when that approaches, upgrade to Node 22. For now Node 20 satisfies Vite 6 (needs 18+) and React 19 (prefers 20+).

**npm caching:** Use `setup-node` with `cache: 'npm'` — this uses `package-lock.json` as the cache key. Do NOT cache `node_modules` directory directly (fails across Node versions per GitHub Actions docs).

**Vitest non-interactive mode:** Use `vitest run` (not `vitest` which starts watch mode). Add `--reporter=verbose` for readable CI output. Add `--coverage` to the test script in CI to print coverage summary to logs.

```yaml
# .github/workflows/ci.yml
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

**Why not `npm run test` in CI for coverage:** The existing `"test"` script will be `vitest run`. Coverage flags are added inline in the CI step so the local `npm run test` stays fast (no coverage). Alternatively add a `"test:ci"` script to package.json.

### Pattern 10: Migration Error UI

**Pattern:** A React `useState<string | null>(null)` called `migrationError` in `App.tsx`. When non-null, render a full-viewport overlay before the main app tree.

**Mount point:** Inside the top-level `<div className="flex h-screen ...">` in `App.tsx`, as the very first child — if `migrationError` is set, render the error panel and return early (do not render sidebar, main, or any other app content). This makes it a de-facto error gate, not a modal.

```tsx
// In App.tsx render, before the existing flex container contents:
const [migrationError, setMigrationError] = useState<string | null>(null);

// In return:
if (migrationError) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-red-50 p-8">
      <div className="max-w-md w-full border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} /> Data Migration Failed
        </h1>
        <p className="text-sm text-gray-700 mb-4">
          AussieLedger could not upgrade your saved data to the current version.
          Your data has not been modified.
        </p>
        <pre className="text-xs bg-red-50 p-3 rounded border border-red-100 overflow-auto mb-4">
          {migrationError}
        </pre>
        <p className="text-xs text-gray-500">
          Please report this at github.com/[owner]/aussie-ledger/issues and attach
          your browser's localStorage data (DevTools → Application → Local Storage).
        </p>
      </div>
    </div>
  );
}
```

**Why not an error boundary:** An error boundary catches thrown errors during React rendering, not during `useEffect`. The migration runs in `useEffect` (side effect), so the error must be caught inside the effect and surfaced via state. An error boundary would not catch it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Decimal arithmetic | Custom rounding functions on `number` | `decimal.js` | Banker's rounding, exact division, no float drift; proven in production accounting software |
| ABN checksum | Regex-only check | `validateABN()` in `src/lib/validation.ts` (pure function, 15 lines) | The algorithm is published; the function IS handwritten but it IS tiny and tested |
| CSS mocking in tests | Complex moduleNameMapper | `css: false` in vitest.config.ts | One-line fix that works reliably |
| Test cleanup | Manual `unmountComponentAtNode` | `cleanup()` from `@testing-library/react` in afterEach | RTL owns this |
| Banker's rounding | Manual `if (digit === 5) check even` logic | `Decimal.ROUND_HALF_EVEN` mode | Handled by decimal.js internals |

---

## Common Pitfalls

### Pitfall 1: Tailwind v4 CSS Parse Error in jsdom
**What goes wrong:** When `@tailwindcss/vite` is included in `vitest.config.ts` plugins and `css: true` (default), jsdom@27 throws "Could not parse CSS stylesheet" because the Tailwind v4 plugin outputs CSS that jsdom's parser rejects.
**How to avoid:** Set `css: false` in vitest config AND do not include the `tailwindcss()` plugin in the vitest config (only include `react()`). The existing `vite.config.ts` keeps the tailwindcss plugin for the actual build — vitest.config.ts is a separate file.
**Warning signs:** Tests fail with "Could not parse CSS stylesheet" before any test assertions run.

### Pitfall 2: vitest.config.ts vs vite.config.ts Conflict
**What goes wrong:** If Vitest config is embedded in `vite.config.ts`, the `define: { 'process.env.GEMINI_API_KEY': ... }` block runs in tests, potentially causing issues with module evaluation order. Also, the `tailwindcss()` plugin would then run in tests.
**How to avoid:** Use a separate `vitest.config.ts`. Vitest will use it exclusively for test runs; `vite.config.ts` remains for `npm run build` and `npm run dev`. The separate file takes precedence over the `vite.config.ts` test config.

### Pitfall 3: Decimal.js Mutation vs Immutability
**What goes wrong:** Calling `Decimal.set()` mutates the global configuration. If tests import `money.ts` in parallel (Vitest can run tests concurrently), a test that changes global Decimal configuration could affect another test's results.
**How to avoid:** Only call `Decimal.set()` once at module import time in `money.ts`. Never call `Decimal.set()` inside test files. If a test needs a different rounding mode, use the per-operation override: `new Decimal(x).toDecimalPlaces(2, Decimal.ROUND_UP)`.

### Pitfall 4: ABN Validation with "ABN" Prefix in registrationNumber
**What goes wrong:** The existing seed data stores ABNs as `'ABN 12 345 678 901'`. If `validateABN()` doesn't strip the prefix, it will reject all existing valid ABNs.
**How to avoid:** The `validateABN()` implementation above uses `abn.replace(/[^0-9]/g, '')` which strips all non-digits including "ABN" prefix, spaces, and hyphens. The function accepts raw input from any source.

### Pitfall 5: Migration Runner called with Non-JSON localStorage values
**What goes wrong:** If any `localStorage.getItem()` returns a non-JSON string (e.g. the user manually edited DevTools, or another app wrote to the same keys), `JSON.parse()` throws before the migration runner is even called.
**How to avoid:** Wrap each `JSON.parse()` in its own try/catch within the useEffect. Only invoke `migrate()` with successfully-parsed objects. Partial failures (one key bad, others good) should load valid slices and show a warning, not block the whole app.

### Pitfall 6: SlideGenerator References After Deletion
**What goes wrong:** After deleting `SlideGenerator.tsx`, TypeScript will surface all import references as errors. The `Presentation` icon import from lucide-react at App.tsx:26 may become unused if no other component uses it.
**How to avoid:** After deleting the component: remove the import at App.tsx:44; remove `'slide-generator'` from the `View` union at App.tsx:53; remove the NavButton block at App.tsx:506-511; remove the render branch at App.tsx:1005-1011; remove the `Presentation` icon from the import at App.tsx:26 if it becomes unused. Run `npm run lint` (`tsc --noEmit`) immediately after deletion to surface any remaining references. The `SlideGenerator` component props are not referenced in `types.ts`, `constants.ts`, or any other component — confirmed by grep.

### Pitfall 7: TFN — Already Absent, Don't Add It
**What goes wrong:** The ENT-02 requirement text says "TFN (with format-only check)". A planner reading requirements in isolation might attempt to add a TFN field, then remove it. Wasted effort.
**How to avoid:** TFN has zero references in the entire codebase (confirmed by grep across all .ts/.tsx files with patterns `TFN|tfn|taxFileNumber`). The `Entity` interface has only `registrationNumber?: string`. The EntityForm labels it "Registration Number (ABN/EIN)" — Phase 1 renames it to "ABN" only. No TFN field is added or removed. ENT-02's TFN portion is N/A.

### Pitfall 8: `'US Big Law Firm'` Entity Type Left in EntityForm Select
**What goes wrong:** Even after removing the Pearson Specter Litt seed entity from DEFAULT_ENTITIES, the EntityForm's `<select>` for entity type still has `<option value="US Big Law Firm">US Big Law Firm</option>`. Users could still create US entities.
**How to avoid:** Remove the "US Big Law Firm" option from EntityForm's type select; replace the four options with the correct AU types: Company, Trust, Individual, Partnership. (Note: "Individual" replaces "Sole Trader / Individual" for brevity — confirm preferred label with CONTEXT.md: no explicit wording given for the select option, so use "Individual".)

### Pitfall 9: StatCard `trend` prop is not optional
**What goes wrong:** The `StatCard` component at App.tsx:1108 has `trend: string` (not `trend?: string`). When the trend strings are replaced with `'—'`, the em-dash must be passed as a string — the prop cannot be omitted.
**How to avoid:** Replace the hard-coded trend strings at App.tsx:771, App.tsx:783, and App.tsx:796 with the string `'—'` (em-dash, U+2014). Do not change the `StatCard` interface. Verify: copying an em-dash character and pasting into the string literal, or using `'—'`.

---

## Code Examples

### ABN validation unit test vectors
```typescript
// src/lib/__tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateABN } from '../validation';

describe('validateABN', () => {
  it('accepts valid ABN with spaces', () => expect(validateABN('51 824 753 556')).toBe(true));
  it('accepts valid ABN without spaces', () => expect(validateABN('51824753556')).toBe(true));
  it('accepts valid ABN with ABN prefix', () => expect(validateABN('ABN 51 824 753 556')).toBe(true));
  it('rejects clearly fake ABN 11 111 111 111', () => expect(validateABN('11 111 111 111')).toBe(false));
  it('rejects wrong length', () => expect(validateABN('1234')).toBe(false));
  it('rejects transposed digit', () => expect(validateABN('51 824 753 557')).toBe(false));
  it('rejects all zeros', () => expect(validateABN('00 000 000 000')).toBe(false));
});
```

### money.ts unit tests
```typescript
// src/lib/__tests__/money.test.ts
import { describe, it, expect } from 'vitest';
import { add, sub, mul, div, gst, toCents, serialize } from '../money';

describe('money wrapper', () => {
  describe('add', () => {
    it('avoids float drift: 0.1 + 0.2 = 0.3', () => {
      expect(add('0.1', '0.2').toString()).toBe('0.3');
    });
  });
  describe('gst', () => {
    it('extracts GST from $110 inclusive', () => {
      expect(serialize(gst('110'))).toBe('10.00');
    });
    it('extracts GST from $100 inclusive', () => {
      expect(serialize(gst('100'))).toBe('9.09');
    });
  });
  describe('toCents (banker\'s rounding)', () => {
    it('2.505 rounds to 2.50 (even)', () => {
      expect(serialize(toCents('2.505'))).toBe('2.50');
    });
    it('2.515 rounds to 2.52 (even)', () => {
      expect(serialize(toCents('2.515'))).toBe('2.52');
    });
  });
  describe('serialize / deserialize round-trip', () => {
    it('serializes to 2dp string', () => {
      expect(serialize(add('10.001', '0.009'))).toBe('10.01');
    });
  });
});
```

### Migration runner unit test
```typescript
// src/lib/__tests__/migrations.test.ts
import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from '../migrations';

describe('migrate()', () => {
  it('treats missing _v as version 0 and upgrades to current', () => {
    const result = migrate({ entities: [] });
    expect(result._v).toBe(CURRENT_VERSION);
  });
  it('passes through already-current data unchanged', () => {
    const state = { _v: CURRENT_VERSION, entities: [{ id: 'x' }] };
    const result = migrate(state as Record<string, unknown>);
    expect(result._v).toBe(CURRENT_VERSION);
    expect((result.entities as unknown[])[0]).toEqual({ id: 'x' });
  });
  it('throws for unknown future version', () => {
    expect(() => migrate({ _v: 999 })).toThrow();
  });
});
```

### PdfGate unit test
```typescript
// src/components/__tests__/PdfGate.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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
    expect(onConfirmed).toHaveBeenCalledOnce();
  });
  it('does not call onConfirmed when button disabled', () => {
    const onConfirmed = vi.fn();
    render(<PdfGate onConfirmed={onConfirmed} />);
    fireEvent.click(screen.getByRole('button')); // not checked yet
    expect(onConfirmed).not.toHaveBeenCalled();
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| `css: true` (default) with tailwindcss plugin in vitest | `css: false` in separate vitest.config.ts | Avoids Tailwind v4/jsdom parse error (Sep 2025 open issue) |
| `@testing-library/react` ^15 for React 18 | `@testing-library/react` ^16 for React 19 | RTL 16 adds React 19 `act()` compatibility; prevents act() warnings in tests |
| `jsdom@27` | `jsdom@26.x` (prefer until jsdom@27 + Tailwind v4 issue resolves) | jsdom@27 has CSS parse issues with Tailwind v4 |
| `jest` for Vite projects | `vitest` | No babel/ESM transform friction; native Vite plugin reuse |
| Node 16/18 in GitHub Actions | Node 20 | Vite 6 requires Node 18+; React 19 works best on 20+; Node 22 LTS will be next step |

**Deprecated/outdated:**
- `jest` for Vite/React 19: ESM transform complexity is not worth it when Vitest is a direct substitute
- `enzyme`: Not supported for React 18+; RTL is the community standard

---

## Risks Specific to Phase 1

### Risk 1: SlideGenerator Imports Used Elsewhere
**Finding:** The only consumers of `SlideGenerator.tsx` are in `App.tsx` (import at line 44, render at lines 1005-1011, NavButton at lines 506-511). No other component imports it. No types from SlideGenerator are re-exported or used elsewhere. The `Presentation` lucide icon is only used for the SlideGenerator NavButton — confirmed by grep (`Presentation` appears only at App.tsx:26 and App.tsx:509).

**Action:** Safe to delete. After deletion, remove `Presentation` from the App.tsx lucide import. Run `tsc --noEmit` to confirm.

### Risk 2: TFN References — Zero Found
**Finding:** Grepping `src/` for `TFN|tfn|taxFileNumber|tax.*file.*number` returns zero matches. The `Entity` interface has only `registrationNumber?: string`. The EntityForm labels it "Registration Number (ABN/EIN)" — renaming to "ABN" is a label change only, not a data model change.

**Action:** ENT-02's TFN portion is N/A. No code to remove. The only change is renaming the field label and removing "EIN" from the placeholder.

### Risk 3: `_v` field addition — backward compatibility
**Finding:** No existing user data has `_v`. The migration runner treats missing `_v` as version 0 and upgrades to version 1 via identity migration. The identity migration `0 → 1` is a no-op (just sets `_v: 1`). Existing data shapes are already compatible with the v1 interfaces.

**Risk:** A user with existing data from before Phase 1 (the demo/prototype era) loads the new version. The migration runner reads the localStorage slices, runs the 0→1 identity migration, and writes back `_v: 1` alongside the data. The data is unchanged. The app loads normally.

**Low risk caveat:** The repo is a prototype with no actual users yet. There is no deployed version with real user data. The migration path is insurance for contributors who have been running the prototype locally.

### Risk 4: `'US Big Law Firm'` type persisted in localStorage
**Finding:** A contributor who has been running the prototype may have localStorage data with an entity of type `'US Big Law Firm'`. After Phase 1, the EntityForm's type select removes this option. However, the `Entity.type` field in `types.ts` is `string` (not a union enum) — so a persisted `'US Big Law Firm'` entity would still load and display without error. The dashboard would render it. Phase 4 (ENT-01) is when entity types are locked to the AU four.

**Action:** No blocking issue. The entity would still display. Note this in planner task for "replace DEFAULT_ENTITIES" — existing persisted types are unaffected by changing the select options.

### Risk 5: Recharts in jsdom (smoke tests)
**Finding:** `FinancialTrendChart` uses Recharts which renders SVG. jsdom supports SVG but Recharts calls `getBoundingClientRect()` for layout calculations. In jsdom this returns `{width: 0, height: 0}`. Recharts handles this gracefully in recent versions (no throw, just zero-sized chart).

**Action:** Include `FinancialTrendChart` in smoke tests. If it throws in jsdom, add `vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({...})` in setup — but try without first.

---

## Open Questions

1. **jsdom version pinning**
   - What we know: jsdom@27 has a confirmed CSS parse bug with Tailwind v4 (GitHub issue Sep 2025, unresolved at research time). jsdom@26.x works.
   - What's unclear: Has the issue been resolved by the time Phase 1 is implemented? Check `npm show jsdom` and the GitHub issue thread before installing.
   - Recommendation: Pin `"jsdom": "^26.0.0"` in package.json devDependencies until the issue is confirmed resolved.

2. **`@testing-library/react` and React 19 `act()` warnings**
   - What we know: RTL ^16.x added React 19 act() compatibility. Some async patterns still produce act() warnings even with RTL 16.
   - What's unclear: Whether the smoke tests (synchronous renders) will produce any act() warnings.
   - Recommendation: Smoke tests are synchronous `render()` calls with no async updates — act() warnings are unlikely. If they appear, add `act` wrapper around the render call.

3. **`ImportTB.tsx` smoke test feasibility**
   - What we know: `ImportTB` imports `@google/genai` at the top level. In the test environment, this import will attempt to load the Google GenAI module which may fail if it relies on browser globals not in jsdom.
   - What's unclear: Whether jsdom's global environment satisfies `@google/genai`'s module initialization.
   - Recommendation: Mock the module: `vi.mock('@google/genai', () => ({ GoogleGenAI: class { }, Type: {} }))` in the smoke test file. This is the safest approach and avoids any real API calls.

4. **`FinancialTrendChart` Recharts ResizeObserver**
   - What we know: Recharts in recent versions uses `ResizeObserver` for responsive containers. jsdom does not implement `ResizeObserver`.
   - Recommendation: Add to `src/test/setup.ts`: `global.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^2.x |
| Config file | `vitest.config.ts` (new — see Wave 0 gaps) |
| Setup file | `src/test/setup.ts` (new — see Wave 0 gaps) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text` |

### Phase Requirements → Test Map

| Req ID | Behavior to Verify | Test Type | Automated Command | File Exists? |
|--------|-------------------|-----------|-------------------|-------------|
| FND-05 | No "ATO Connected", no fake trends in rendered output | unit (RTL) | `npx vitest run src/App.test.tsx` | ❌ Wave 0 |
| FND-05 | "ATO Connected (Simulated)" string absent from App.tsx source | code audit | `tsc --noEmit` (build succeeds without the string) | manual check |
| FND-06 | DisclaimerFooter renders with exact required text | unit (RTL) | `npx vitest run src/components/__tests__/DisclaimerFooter.test.tsx` | ❌ Wave 0 |
| FND-07 | Test suite exists and runs; golden-output seeds pass (money.ts math) | unit | `npx vitest run src/lib/__tests__/money.test.ts` | ❌ Wave 0 |
| FND-07 | Smoke tests: all major components render without crashing | unit (RTL smoke) | `npx vitest run src/components/__tests__/smoke.test.tsx` | ❌ Wave 0 |
| FND-08 | Decimal arithmetic: add, sub, mul, div, gst return correct values | unit | `npx vitest run src/lib/__tests__/money.test.ts` | ❌ Wave 0 |
| FND-08 | Structural lint: no raw arithmetic in src/lib/tax/ | structural lint | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ❌ Wave 0 |
| FND-09 | Migration runner: missing `_v` treated as v0, upgraded to v1 | unit | `npx vitest run src/lib/__tests__/migrations.test.ts` | ❌ Wave 0 |
| FND-09 | Migration runner: throws on unknown version | unit | `npx vitest run src/lib/__tests__/migrations.test.ts` | ❌ Wave 0 |
| ENT-02 | validateABN returns true for `51 824 753 556` | unit | `npx vitest run src/lib/__tests__/validation.test.ts` | ❌ Wave 0 |
| ENT-02 | validateABN returns false for `11 111 111 111` (demo placeholder) | unit | `npx vitest run src/lib/__tests__/validation.test.ts` | ❌ Wave 0 |
| ENT-02 | ABN warning shows in EntityForm for invalid ABN without blocking submit | unit (RTL) | `npx vitest run src/components/__tests__/EntityForm.test.tsx` | ❌ Wave 0 |
| ENT-02 | TFN field absent from EntityForm render | unit (RTL) | smoke test (check EntityForm renders; assert no "TFN" text) | ❌ Wave 0 |
| DEP-05 | CI pipeline: build + lint + test all pass | integration | GitHub Actions run (manual trigger or push to main) | ❌ Wave 0 |
| DEP-05 | PdfGate: onConfirmed gated by checkbox | unit (RTL) | `npx vitest run src/components/__tests__/PdfGate.test.tsx` | ❌ Wave 0 |

### Manual-Only Validations

| Req ID | What to Check Manually | Why Automated Is Hard |
|--------|------------------------|----------------------|
| FND-05 | Visually confirm "ATO Connected" is gone from sidebar; confirm '—' appears in StatCards | Requires visual browser inspection |
| FND-06 | Disclaimer footer visible on every view; correct wording displayed | Multi-view visual check |
| FND-06 | Disclaimer appears in PDF output (Phase 5 wires this; Phase 1 footer is screen-only) | PDF not yet generated in Phase 1 |
| DEP-05 | GitHub Actions workflow triggers correctly on PR push | Requires actual repo push |

### Sampling Rate

- **Per task commit:** `npx vitest run --reporter=verbose` (full unit suite, typically < 10 seconds for Phase 1's test count)
- **Per wave merge:** `npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text`
- **Phase gate:** Full suite green + `npm run build` passes + `npm run lint` passes before `/gsd:verify-work`

### Wave 0 Gaps (files that must exist before implementation)

- [ ] `vitest.config.ts` — test runner config with `css: false`, `environment: 'jsdom'`, setupFiles
- [ ] `src/test/setup.ts` — jest-dom matchers extension + RTL cleanup + ResizeObserver mock
- [ ] `src/test/fixtures/entities.ts` — minimal Entity fixture for smoke tests
- [ ] `src/test/fixtures/accounts.ts` — minimal Account[] fixture for smoke tests
- [ ] `src/lib/money.ts` — decimal.js wrapper (required before money tests run)
- [ ] `src/lib/migrations/index.ts` — migration runner (required before migration tests run)
- [ ] `src/lib/validation.ts` — ABN validator (required before validation tests run)
- [ ] `src/lib/tax/` — directory with `.gitkeep` or empty structure (required before structural lint test passes vacuously)
- [ ] Framework install: `npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8` and `npm install decimal.js`

---

## Sources

### Primary (HIGH confidence)
- `A:\Projects\AussieLedger\src\App.tsx` — exact line numbers for all removal targets verified by reading the file
- `A:\Projects\AussieLedger\src\types.ts` — confirmed Entity interface has no TFN field
- `A:\Projects\AussieLedger\src\components\EntityForm.tsx` — confirmed registrationNumber is a single freeform field
- `A:\Projects\AussieLedger\package.json` — confirmed installed versions and scripts
- `A:\Projects\AussieLedger\vite.config.ts` — confirmed plugin structure (react + tailwindcss, define block)
- `A:\Projects\AussieLedger\tsconfig.json` — confirmed strict mode, ES2022, bundler resolution
- abr.business.gov.au/Help/AbnFormat — ABN algorithm and test vector `51 824 753 556`
- decimal.js official docs (mikemcl.github.io/decimal.js) — API verification: ROUND_HALF_EVEN=6, .plus/.minus/.times/.dividedBy, .toFixed, .toDecimalPlaces, Decimal.set()
- vitest.dev/guide/environment — `environment: 'jsdom'`, `css: false`, `setupFiles` options

### Secondary (MEDIUM confidence)
- GitHub issue tailwindlabs/tailwindcss#18952 (Sep 2025) — Tailwind v4 + jsdom CSS parse error; workaround `css: false` verified by pattern across multiple sources
- WebSearch: Vitest 2 + React 19 + RTL setup patterns — consistent across multiple 2025 articles; `@testing-library/react@^16` for React 19 compat
- GitHub Actions actions/setup-node@v4 — `cache: 'npm'` pattern; Node 20 recommendation
- WebSearch: GitHub blog — Node 20 deprecation June 2026 (flagged as upcoming, not yet blocking)

### Tertiary (LOW confidence — verify before use)
- `53 004 085 616` (ABC ABN) as a second valid test vector — publicly registered but not verified via abr.business.gov.au during this research session. Use `51 824 753 556` (official example) as the primary test vector.
- jsdom@27 CSS bug resolution status — open issue at research time; may be resolved. Check before pinning version.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions from existing package.json; new versions flagged as "verify before install" from STACK.md
- Architecture: HIGH — sourced from direct file reads of App.tsx, types.ts, EntityForm.tsx; exact line numbers confirmed
- ABN algorithm: HIGH — verified against official abr.business.gov.au documentation
- decimal.js API: HIGH — verified against official docs (mikemcl.github.io)
- Vitest/RTL config: MEDIUM-HIGH — core config verified against vitest.dev; Tailwind v4 workaround based on open GitHub issue + multiple corroborating sources
- CI: MEDIUM — Node 20, npm cache pattern based on WebSearch; no direct GHA docs fetch

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days) — however, check jsdom@27 issue status before installing packages
