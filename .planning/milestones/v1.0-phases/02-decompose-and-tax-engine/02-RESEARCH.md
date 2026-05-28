# Phase 2: Decompose and Tax Engine — Research

**Researched:** 2026-05-10
**Domain:** React hook extraction, pure-function tax engine, AU period model, AI gating, schema migration
**Confidence:** HIGH (all findings sourced from direct codebase inspection and locked CONTEXT.md decisions)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AI-optional UX (FND-04)**
- No key: ImportTB AI flow hidden entirely. Single deterministic flow: upload → column-map → fuzzy-match → manual review/override.
- Key mechanism: `.env.local` via Vite `define` block. Key is bundled into build artefact — acceptable for private self-hosted; unsafe for shared. `.env.example` must document this with a strong warning.
- Fuzzy match: Levenshtein on lowercased+punctuation-stripped names. Exact `code` match = confidence 1.0 hard tie-break. Confidence = `1 - distance / maxLen`.
- Confidence presentation: ≥ 0.85 auto-selects single best (with "Change" affordance). < 0.85 shows top-3 with percentages + "Create new account" option.
- Detection: `IS_AI_ENABLED = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')`. The placeholder string `'MY_GEMINI_API_KEY'` is treated as "not configured".
- Remaining call site: `src/components/ImportTB.tsx:79`. Gated by `IS_AI_ENABLED`.

**Tax engine API shape (TAX-05)**
- One `compute*` per entity type. Pure functions, no React imports.
- `TaxInput` has `fy: FyLabel`, `entries: JournalEntry[]`, `accounts: Account[]`, `period: Period`.
- Each label result: `{ value: Decimal; source: JournalLine[]; basis?: string }`.
- `Decimal` instances throughout — never `number`. JSX boundary calls `.toFixed(2)`.
- Phase 2 stubs: `value: new Decimal(0)`, `source: []` for every label.
- Existing inline math is preserved temporarily (relocated into the stubs, not zeroed out). Visual output unchanged.

**Schema migration v1→v2 (TAX-03, TAX-04)**
- `_v: 2` after Phase 2 migration. Registered in `src/lib/migrations/index.ts`.
- Re-derives missing fields for each `Account`: inspect existing labels, add `partnershipTaxLabel` (new field), populate via name-inference table.
- Unmapped accounts: `_needsReview: true` transient flag, "Review needed" banner in CoA editor and master dashboard.
- Migration always succeeds (never throws on regular Account).
- GST union widened: `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'`. No auto-re-categorisation.
- Seed CoA: all 16 accounts in `src/constants.ts` get full per-entity-type tax labels.
- Override mechanism: AccountManager.tsx adds 4th column `partnershipTaxLabel`.

**Period model surface (BOOK-10)**
- File: `src/lib/period.ts` — pure functions, no React, no external date library.
- Exports: `FyLabel`, `Period`, `today()`, `currentFy()`, `fyBoundaries()`, `quarterOf()`, `quarterBoundaries()`, `isInPeriod()`.
- `today()` is the test seam. App code calls `today()` not `new Date()`. Tests use `vi.spyOn(periodModule, 'today')`.
- FY label: `'FY{end-year}'`. `'FY2026'` = 1 Jul 2025 – 30 Jun 2026.
- BAS quarters: Q1=Jul-Sep, Q2=Oct-Dec, Q3=Jan-Mar, Q4=Apr-Jun.
- Time-of-day ignored. No timezone handling. Documented constraint.

**Decomposition target (TAX-05 + roadmap)**
- App.tsx ≤ 250 lines after Phase 2. Currently 1,116 lines.
- Hooks extracted to `src/hooks/` (new directory).
- Shell components to `src/components/shell/`.
- `MainLayout.tsx` is at Claude's discretion.

### Claude's Discretion

- Hook directory: `src/hooks/` vs `src/state/` vs `src/lib/state/`.
- Whether `MainLayout.tsx` is its own component or stays inline in `App.tsx`.
- Name → label inference table exact content for v1→v2 migration.
- Internal structure of `src/lib/tax/labels/fy2026.ts` (flat vs nested).
- `IS_AI_ENABLED` constant location (`src/lib/ai.ts`?).
- Whether to keep existing `vi.mock('@google/genai')` setup-time mock or refine.
- Internal structure of fuzzy-match function (`src/lib/import/match.ts`?).

### Deferred Ideas (OUT OF SCOPE)

- Server-side proxy for Gemini calls (Phase 3)
- Calendar-month / week / arbitrary-recurrence period helpers
- Date-library swap (date-fns / Day.js)
- Real CoA inference table for v1→v2 beyond 16 accounts (Phase 4)
- AI-improved fuzzy match ranking
- Settings page for runtime API key (Phase 6)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FND-04 | Self-hosted instance works without any third-party API keys configured; AI features must be optional | AI gating via `IS_AI_ENABLED` constant; ImportTB conditional render; Levenshtein fuzzy match |
| TAX-01 | Tax-rate and threshold constants centralised in a single FY-versioned module; no magic numbers in components | `src/lib/tax/labels/fy2026.ts` with NAT-referenced constants; types prevent wrong label IDs at compile time |
| TAX-03 | Each account in default CoA pre-mapped to correct ATO labels for every relevant entity type on first install | Seed CoA update in `src/constants.ts`; migration 1→2 re-derives missing fields |
| TAX-04 | User can override auto-mapping for any account in CoA editor | `partnershipTaxLabel` 4th column in AccountManager.tsx |
| TAX-05 | All tax-output components consume a single shared tax engine library of pure functions | `src/lib/tax/{individual,company,trust,partnership,bas}.ts`; no React imports; structural lint extended |
| BOOK-08 | Each account carries a GST code from AU set: GST, FRE (GST-free), INP (input-taxed), N-T (not reportable), CAP (capital) | GST union widened in `src/types.ts`; migration 1→2 adds new options |
| BOOK-10 | User can filter and report on any period: FY (1 Jul – 30 Jun), BAS quarter, or custom date range — same period model applies to TB, BAS, and tax returns | `src/lib/period.ts` pure functions; `today()` seam; all date defaults replaced |
</phase_requirements>

---

## Summary

Phase 2 is a structural refactor with no new product features. The App.tsx (1,116 lines) must become a thin orchestrator of ≤ 250 lines. The primary work is extracting four custom hooks, extracting three shell components, creating five pure-function tax engine modules, building a canonical AU period model, implementing schema migration 1→2, and gating the Gemini API call behind `IS_AI_ENABLED`.

The existing tax components contain demo-grade inline rollup math using raw JS floats and native `number`. The migration strategy is to relocate that existing inline math verbatim into the Phase 2 `compute*` stub functions (preserving visual output) and have the components call those stubs. Phase 5 rewrites the internals without touching the API. This is the safest migration path — the component smoke tests stay green and users see no regression.

The most implementation-load-bearing findings are: (1) `addAuditLog` is owned by `useAuditLog`, and other hooks receive `addLog` as a constructor parameter rather than via context to avoid circular imports; (2) the `IS_AI_ENABLED` gate uses `process.env.GEMINI_API_KEY` (not `import.meta.env`) because vite.config.ts uses the `define` block; (3) `_needsReview` is a transient field that should persist on `Account` at `_v: 2` but get cleared by user action in the CoA editor; (4) the structural lint test must be extended with a separate regex check for React imports in `src/lib/tax/**`.

**Primary recommendation:** Extract hooks first (in dependency order: `useAuditLog` → `useAccounts` → `useJournals` → `useEntities`), then shell components, then tax engine, then period model, then migration, then AI gating. This order keeps all 12 smoke tests green at each step.

---

## Standard Stack

### Core (already installed — no new dependencies required for Phase 2)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `decimal.js` | 10.6.0 | All monetary values in tax engine | Already configured with ROUND_HALF_EVEN in `src/lib/money.ts` |
| `vitest` | 2.1.9 | Unit tests for hooks, tax engine, period | Already installed; use `renderHook` from `@testing-library/react` |
| `@testing-library/react` | 16.3.2 | Hook testing via `renderHook` | Already installed; `renderHook` is stable in RTL 16 |

### New modules Phase 2 creates (no npm installs)

| Module | Path | Purpose |
|--------|------|---------|
| `useEntities` | `src/hooks/useEntities.ts` | Entity state, persistence, audit dispatch |
| `useJournals` | `src/hooks/useJournals.ts` | Journal state, persistence, audit dispatch |
| `useAccounts` | `src/hooks/useAccounts.ts` | Account state, persistence, audit dispatch |
| `useAuditLog` | `src/hooks/useAuditLog.ts` | Audit log state and persistence |
| `period.ts` | `src/lib/period.ts` | AU FY / BAS quarter / custom period model |
| `individual.ts` | `src/lib/tax/individual.ts` | Individual return compute function |
| `company.ts` | `src/lib/tax/company.ts` | Company return compute function |
| `trust.ts` | `src/lib/tax/trust.ts` | Trust return compute function |
| `partnership.ts` | `src/lib/tax/partnership.ts` | Partnership return compute function |
| `bas.ts` | `src/lib/tax/bas.ts` | BAS/IAS compute function |
| `fy2026.ts` | `src/lib/tax/labels/fy2026.ts` | FY-versioned tax constants |
| `ai.ts` | `src/lib/ai.ts` | `IS_AI_ENABLED` constant |
| `match.ts` | `src/lib/import/match.ts` | Levenshtein fuzzy match |
| `v1-to-v2.ts` | `src/lib/migrations/v1-to-v2.ts` | Migration function (registered in index.ts) |
| `Sidebar.tsx` | `src/components/shell/Sidebar.tsx` | Extracted shell component |
| `Header.tsx` | `src/components/shell/Header.tsx` | Extracted shell component |
| `BottomNav.tsx` | `src/components/shell/BottomNav.tsx` | Extracted shell component |

**No new npm dependencies required for Phase 2.** The Levenshtein implementation is a simple pure function (~20 lines) that can be written inline in `match.ts` without a library.

---

## Architecture Patterns

### Recommended Project Structure (Phase 2 additions)

```
src/
├── App.tsx                    # ≤ 250 lines after extraction
├── hooks/                     # NEW in Phase 2
│   ├── useAuditLog.ts
│   ├── useAccounts.ts
│   ├── useJournals.ts
│   └── useEntities.ts
├── lib/
│   ├── money.ts               # Phase 1 — unchanged
│   ├── migrations/
│   │   ├── index.ts           # Update CURRENT_VERSION to 2; register 1→2
│   │   └── v1-to-v2.ts        # NEW: migration function
│   ├── ai.ts                  # NEW: IS_AI_ENABLED
│   ├── import/
│   │   └── match.ts           # NEW: fuzzy match
│   ├── period.ts              # NEW: AU period model
│   └── tax/
│       ├── __tests__/         # Phase 1 structural lint; extend here
│       ├── labels/
│       │   └── fy2026.ts      # NEW: FY-versioned constants
│       ├── individual.ts      # NEW
│       ├── company.ts         # NEW
│       ├── trust.ts           # NEW
│       ├── partnership.ts     # NEW
│       └── bas.ts             # NEW
└── components/
    ├── shell/                 # NEW directory
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   └── BottomNav.tsx
    ├── TaxReturnAssistant.tsx  # Modified: calls computeIndividual()
    ├── CompanyTaxReturn.tsx    # Modified: calls computeCompany()
    ├── TrustTaxReturn.tsx      # Modified: calls computeTrust()
    ├── BasIasAssistant.tsx     # Modified: calls computeBas()
    └── ImportTB.tsx            # Modified: AI gating
```

---

## Question-by-Question Technical Guidance

### 1. Hook Extraction Recipe

#### The circular-import problem and its solution

`addAuditLog` is currently a plain function in `App.tsx` that closes over `setAuditLogs`. After extraction, other hooks need to call `addLog` when they mutate state. The options are:

**Option A — `addLog` passed as a constructor parameter (RECOMMENDED)**

```typescript
// src/hooks/useAuditLog.ts
export interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}

export function useAuditLog(): AuditLogHook {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Load on mount
  useEffect(() => {
    const raw = localStorage.getItem('ledger_audit_logs');
    if (raw) {
      try { setAuditLogs(JSON.parse(raw) as AuditLog[]); } catch { /* ignore */ }
    }
  }, []);

  // Persist on change
  useEffect(() => {
    localStorage.setItem('ledger_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  const addLog = useCallback(
    (action: AuditLog['action'], details: string, entityId?: string) => {
      const newLog: AuditLog = {
        id: crypto.randomUUID(),
        timestamp: today().toISOString(),
        user: 'Local user',
        action,
        entityId,
        details,
      };
      setAuditLogs(prev => [newLog, ...prev]);
    },
    []
  );

  return { auditLogs, addLog };
}
```

```typescript
// src/hooks/useAccounts.ts
export function useAccounts(addLog: AuditLogHook['addLog']): AccountsHook {
  // ...
  const updateAccount = useCallback((updated: Account) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    addLog('IMPORT_DATA', `Updated tax mapping for account ${updated.code} - ${updated.name}`, '');
  }, [addLog]);
  // ...
}
```

**Why not a context provider:** A context provider for `addLog` would require wrapping App in a provider, adding a dependency inversion that Phase 3's StorageAdapter will supersede. Passing `addLog` as a parameter is simpler, testable without providers, and Phase 3 can swap it for a server-side call without changing hook signatures.

**Why not a singleton/module-level hook:** Module-level state breaks React's rendering model and makes tests stateful between runs.

#### Hook interfaces

```typescript
// useAuditLog
interface AuditLogHook {
  auditLogs: AuditLog[];
  addLog: (action: AuditLog['action'], details: string, entityId?: string) => void;
}

// useAccounts
interface AccountsHook {
  accounts: Account[];
  updateAccount: (updated: Account) => void;
  saveAll: (accounts: Account[]) => void;
}

// useJournals
interface JournalsHook {
  allEntries: Record<string, JournalEntry[]>;
  entries: JournalEntry[];           // computed: allEntries[activeEntityId] || []
  filteredEntries: JournalEntry[];   // computed: entries filtered by searchQuery/dateFrom/dateTo
  addEntry: (entry: JournalEntry) => void;
  importEntries: (entries: JournalEntry[]) => void;
  // Filter state owned here or lifted to App — see note below
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  dateFrom: string;
  setDateFrom: (d: string) => void;
  dateTo: string;
  setDateTo: (d: string) => void;
}

// useEntities
interface EntitiesHook {
  entities: Entity[];
  selectedEntityIds: string[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  createEntity: (entity: Entity) => void;
  updateEntity: (entity: Entity) => void;
  archiveEntity: (ids: string[]) => void;
  deactivateEntity: (ids: string[]) => void;
  deleteEntity: (ids: string[]) => void;
  toggleSelection: (id: string, e?: React.MouseEvent) => void;
  clearSelection: () => void;
}
```

**Note on filter state:** `searchQuery`, `dateFrom`, `dateTo` can live in `useJournals` (since they're journal-specific) or stay in App.tsx as local state passed into the hook. Recommendation: put filter state in `useJournals` to keep App.tsx thin. The hook returns derived `filteredEntries`.

#### Persistence hook-up pattern (preserve existing Phase 1 shape)

Each hook follows this exact pattern from current App.tsx, to be preserved until Phase 3's StorageAdapter:

```typescript
// Load on mount (with migration)
useEffect(() => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      setState(parsed);
    } catch { /* ignore bad JSON */ }
  }
}, []); // empty deps — run once

// Save on change
useEffect(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}, [state]);
```

The migration runner is invoked once in App.tsx on startup (before hooks set state), or alternatively each hook can invoke `migrate()` on its own slice. Given the runner operates on the synthetic root object (see current `App.tsx:228–279`), the cleanest Phase 2 approach is to keep the migration call in App.tsx before mounting hooks, and pass migrated initial values as parameters to hooks. Phase 3 moves this into the StorageAdapter.

---

### 2. Shell Component Extraction

#### Prop interfaces (verbatim from CONTEXT.md, with types filled in)

```typescript
// src/components/shell/Sidebar.tsx
interface SidebarProps {
  view: View;
  setView: (v: View) => void;
  activeEntity: Entity | undefined;
  entities: Entity[];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

// src/components/shell/Header.tsx
interface HeaderProps {
  view: View;
  entities: Entity[];
  activeEntityId: string | null;
  setActiveEntityId: (id: string | null) => void;
  setView: (v: View) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setShowNewJournal: (show: boolean) => void;
}

// src/components/shell/BottomNav.tsx
interface BottomNavProps {
  view: View;
  setView: (v: View) => void;
  setActiveEntityId: (id: string | null) => void;
  setIsSidebarOpen: (open: boolean) => void;
  activeEntityId: string | null;
}
```

**Where callbacks come from after extraction:** App.tsx remains the owner of `view`, `isSidebarOpen`, `showNewJournal`. These are UI-state variables that live in App.tsx (not in any hook) and are passed down as props to shell components. This is correct — they are not persisted state. App.tsx after extraction still owns: `view`, `isSidebarOpen`, `showNewJournal`, `migrationError`.

**Animation risk:** The `AnimatePresence` / `motion` wrappers in the Sidebar overlay and the main content area (`<AnimatePresence mode="wait">`) will survive extraction because the shell components receive `isOpen` as a prop and manage their own `motion` elements internally. The risk would be if the parent's re-render caused the `AnimatePresence` key to change unexpectedly. Mitigation: move the `AnimatePresence` wrapper inside the shell component rather than in App.tsx, so the animation state is co-located with the animated elements.

**`MainLayout.tsx` recommendation:** Create it. It composes `Sidebar`, `Header`, the `<main>` wrapper, `BottomNav`, and `DisclaimerFooter`. App.tsx renders `<MainLayout>` and passes the content area as `children`. This keeps App.tsx cleaner than passing all shell props at the root level. Estimated App.tsx line savings: ~100 lines.

---

### 3. Tax Engine Module Skeleton

#### Type definitions (`src/lib/tax/types.ts` or inline in each module)

```typescript
import { Decimal } from '../money';
import { JournalEntry, JournalLine, Account } from '../../types';
import { FyLabel, Period } from '../period';

// Source: CONTEXT.md § Tax engine API shape
export interface LabelResult {
  value: Decimal;
  source: JournalLine[];
  basis?: string;  // Human-readable calculation explanation for Phase 6 drill-down
}

export interface TaxInput {
  fy: FyLabel;            // e.g. 'FY2026' — explicit, no defaulting
  entries: JournalEntry[];
  accounts: Account[];
  period: Period;         // from src/lib/period.ts
}

// Individual extends TaxInput (no extra fields in Phase 2)
export type IndividualInput = TaxInput;

// Company extends TaxInput (no extra fields in Phase 2)
export type CompanyInput = TaxInput;

// Trust extends TaxInput — Phase 4 adds beneficiary register
export interface TrustInput extends TaxInput {
  beneficiaries?: Array<{ name: string; share: number }>; // stub for Phase 4
}

// Partnership extends TaxInput — Phase 4 adds partner register
export interface PartnershipInput extends TaxInput {
  partners?: Array<{ name: string; share: number }>; // stub for Phase 4
}

// BAS uses a quarter or FY period
export type BasInput = TaxInput;

// Return types — one LabelResult per ATO field code
export interface IndividualReturn {
  '6S': LabelResult;   // Total business income — Source: NAT 0660 FY2025-26
  '6K': LabelResult;   // Gross interest — Source: NAT 0660 FY2025-26
  '6L': LabelResult;   // Salary and wage expenses — Source: NAT 0660 FY2025-26
  '6N': LabelResult;   // All other expenses — Source: NAT 0660 FY2025-26
  '6Q': LabelResult;   // Cost of sales — Source: NAT 0660 FY2025-26
  '7T': LabelResult;   // Taxable income or loss (derived: income - expenses)
}

export interface CompanyReturn {
  '6A': LabelResult;   // Gross sales — Source: NAT 0656 FY2025-26
  '6F': LabelResult;   // Gross interest — Source: NAT 0656 FY2025-26
  '6T': LabelResult;   // Total income (derived)
  '6C': LabelResult;   // Superannuation expenses — Source: NAT 0656 FY2025-26
  '6G': LabelResult;   // Rent expenses — Source: NAT 0656 FY2025-26
  '6X': LabelResult;   // All other expenses — Source: NAT 0656 FY2025-26
  '6S': LabelResult;   // Total expenses (derived)
  '7T': LabelResult;   // Taxable income or loss (derived)
}

export interface TrustReturn {
  '5B': LabelResult;   // Gross payments (Sales) — Source: NAT 0659 FY2025-26
  '11J': LabelResult;  // Gross interest — Source: NAT 0659 FY2025-26
  '5T': LabelResult;   // Total business income (derived)
  '5E': LabelResult;   // Cost of sales — Source: NAT 0659 FY2025-26
  '5F': LabelResult;   // Rent expenses — Source: NAT 0659 FY2025-26
  '5L': LabelResult;   // Superannuation expenses — Source: NAT 0659 FY2025-26
  '5M': LabelResult;   // Salary and wage expenses — Source: NAT 0659 FY2025-26
  '5N': LabelResult;   // All other expenses — Source: NAT 0659 FY2025-26
  '5S': LabelResult;   // Total expenses (derived)
  '26': LabelResult;   // Net income or loss (derived)
}

// Partnership return shape — mirrors NAT 0976 structure (Phase 5 fills actuals)
export interface PartnershipReturn {
  'P1': LabelResult;   // Gross income — Source: NAT 0976 FY2025-26
  'P2': LabelResult;   // Total deductions — Source: NAT 0976 FY2025-26
  'P8': LabelResult;   // Net income or loss
}

export interface BasReturn {
  G1: LabelResult;    // Total sales — Source: NAT 7392
  G2: LabelResult;    // Export sales
  G3: LabelResult;    // Other GST-free sales
  G10: LabelResult;   // Capital purchases
  G11: LabelResult;   // Non-capital purchases
  '1A': LabelResult;  // GST on sales
  '1B': LabelResult;  // GST on purchases
  W1: LabelResult;    // Total salary and wages
  W2: LabelResult;    // Amounts withheld from W1
  netGst: LabelResult; // Derived: 1A - 1B
}
```

#### Phase 2 stub implementation pattern

The key constraint from CONTEXT.md: "compute* functions return shaped-but-empty results in Phase 2 — enough to type-check and to migrate the 4 existing tax components onto." However, the existing inline math (which is demo-grade but produces visible numbers) must be preserved so visual output does not change.

The resolution: **move the existing inline rollup formulas from components into the Phase 2 stub bodies**. The stubs relocate the math, not zero it out. Components call `compute*()` and render the typed result.

```typescript
// src/lib/tax/individual.ts
// Source: relocated from TaxReturnAssistant.tsx lines 29-58
// TODO Phase 5: replace with ATO-correct rollup against NAT 0660 FY-year
import { Decimal } from '../money';
import { IndividualInput, IndividualReturn, LabelResult } from './types';

const ZERO_RESULT: LabelResult = { value: new Decimal(0), source: [] };

export function computeIndividual(input: IndividualInput): IndividualReturn {
  const { entries, accounts } = input;

  // Relocated from TaxReturnAssistant.tsx useMemo — raw float math kept verbatim for now
  // Phase 5 rewrites this using money.ts wrappers and ATO-verified label logic
  const labelBalances: Record<string, number> = {};

  entries.forEach(entry => {
    entry.lines.forEach(line => {
      const account = accounts.find(a => a.id === line.accountId);
      if (account?.taxLabel) {
        const amount = (Number(line.credit) || 0) - (Number(line.debit) || 0);
        const isExpense = ['6L', '6N', '6Q'].includes(account.taxLabel);
        const multiplier = isExpense ? -1 : 1;
        labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] || 0) + amount * multiplier;
      }
    });
  });

  const makeResult = (label: string): LabelResult => ({
    value: new Decimal(labelBalances[label] ?? 0),
    source: [],
    // basis will be filled in Phase 5
  });

  return {
    '6S': makeResult('6S'),
    '6K': makeResult('6K'),
    '6L': makeResult('6L'),
    '6N': makeResult('6N'),
    '6Q': makeResult('6Q'),
    '7T': {
      value: new Decimal((labelBalances['6S'] ?? 0) + (labelBalances['6K'] ?? 0)
                         - (labelBalances['6L'] ?? 0) - (labelBalances['6N'] ?? 0)
                         - (labelBalances['6Q'] ?? 0)),
      source: [],
    },
  };
}
```

**The component migration pattern:**

```typescript
// TaxReturnAssistant.tsx BEFORE:
const taxData = useMemo(() => {
  // 30 lines of inline rollup math...
}, [entries, accounts]);

// TaxReturnAssistant.tsx AFTER:
import { computeIndividual } from '../lib/tax/individual';
import { currentFy, fyBoundaries } from '../lib/period';

const taxReturn = useMemo(() => {
  const fy = currentFy();
  const period = { type: 'fy' as const, fy };
  return computeIndividual({ fy, entries, accounts, period });
}, [entries, accounts]);

// Render: taxReturn['6S'].value.toFixed(2)
```

**Important:** The existing float math in the relocated stub is intentional for Phase 2. The structural lint test (`/[\d)]\s*[*/]\s*\d/`) catches raw arithmetic. Since the relocated math uses `number` types but wraps the result in `new Decimal(...)`, the lint test needs awareness of this. Recommendation: annotate the stub bodies with `// TODO Phase 5: replace with money.ts` and add a `/* lint-ok */` comment — OR, better, convert the stub arithmetic to use `money.ts` wrappers immediately. Converting is safer because the structural lint test (which forbids raw `/` and `*` on digits) will fail CI otherwise.

**Resolution: convert stub arithmetic to use money.ts wrappers from day 1.** This satisfies the structural lint, produces the same output, and Phase 5 only needs to change the aggregation logic, not the Decimal wrapping. Example:

```typescript
// Use add() from money.ts; this passes the structural lint
const creditAmount = new Decimal(line.credit || 0);
const debitAmount  = new Decimal(line.debit  || 0);
const amount = creditAmount.minus(debitAmount);
const adjustedAmount = isExpense ? amount.negated() : amount;
labelBalances[account.taxLabel] = (labelBalances[account.taxLabel] ?? new Decimal(0)).plus(adjustedAmount);
```

---

### 4. `src/lib/tax/labels/fy2026.ts` Shape

#### Directory layout recommendation

**Single file `fy2026.ts` containing all entity types** (not per-entity-type files). Rationale: the 16-account seed CoA has only a handful of labels per entity type. The file is easily scanned as one unit. The per-file split (`fy2026/individual.ts`) adds indirection before there is enough content to justify it. Phase 4, when the CoA expands to 80–150 accounts, is the natural time to split.

#### Typing so wrong label IDs are caught at compile time

Use template literal types or string literal unions for label keys:

```typescript
// src/lib/tax/labels/fy2026.ts

/**
 * FY2026 tax constants for AussieLedger.
 * Australian financial year: 1 July 2025 – 30 June 2026.
 *
 * MAINTENANCE: Update these values annually before the FY start.
 * Cross-check against current-year ATO publications before each release.
 * Stale constants are caught by golden tests in Phase 5.
 */

export const FY = 'FY2026' as const;
export type FY2026 = typeof FY;

// ── Individual return label set ────────────────────────────────────────────
// Source: NAT 0660 (Individual tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/individual-tax-return-instructions-2026

export type IndividualLabel =
  | '6S'   // Total business income
  | '6K'   // Gross interest
  | '6L'   // Salary and wage expenses
  | '6N'   // All other expenses
  | '6Q';  // Cost of sales

export const INDIVIDUAL_LABELS: Record<IndividualLabel, { title: string; description: string }> = {
  '6S': { title: 'Total Business Income', description: 'Gross payments where ABN not quoted and other business income. Source: NAT 0660 FY2025-26 item 6.' },
  '6K': { title: 'Gross Interest', description: 'Total interest earned. Source: NAT 0660 FY2025-26 item 6.' },
  '6L': { title: 'Salary and Wage Expenses', description: 'Gross salaries, wages, directors fees. Source: NAT 0660 FY2025-26 item 6.' },
  '6N': { title: 'All Other Expenses', description: 'Operational expenses not elsewhere categorised. Source: NAT 0660 FY2025-26 item 6.' },
  '6Q': { title: 'Cost of Sales', description: 'Direct costs of goods sold. Source: NAT 0660 FY2025-26 item 6.' },
};

// ── Company return label set ───────────────────────────────────────────────
// Source: NAT 0656 (Company tax return instructions) FY2025-26
// https://www.ato.gov.au/forms-and-instructions/company-tax-return-instructions-2026

export type CompanyLabel =
  | '6A'   // Gross sales
  | '6F'   // Gross interest
  | '6T'   // Total income (derived)
  | '6C'   // Superannuation expenses
  | '6G'   // Rent expenses
  | '6X'   // All other expenses
  | '6S'   // Total expenses (derived)
  | '7T';  // Taxable income or loss

export const COMPANY_LABELS: Record<CompanyLabel, { title: string; description: string }> = {
  '6A': { title: 'Gross sales', description: 'Total sales of goods and services, ex GST. Source: NAT 0656 FY2025-26.' },
  '6F': { title: 'Gross interest', description: 'Interest from accounts and investments. Source: NAT 0656 FY2025-26.' },
  '6T': { title: 'Total income', description: 'Sum of all income items. Derived.' },
  '6C': { title: 'Superannuation expenses', description: 'Employer superannuation contributions. Source: NAT 0656 FY2025-26.' },
  '6G': { title: 'Rent expenses', description: 'Business premises rent. Source: NAT 0656 FY2025-26.' },
  '6X': { title: 'All other expenses', description: 'General business and admin expenses. Source: NAT 0656 FY2025-26.' },
  '6S': { title: 'Total expenses', description: 'Sum of all expense items. Derived.' },
  '7T': { title: 'Taxable income or loss', description: 'Income minus expenses. Source: NAT 0656 FY2025-26.' },
};

// ── Trust return label set ─────────────────────────────────────────────────
// Source: NAT 0659 (Trust tax return instructions) FY2025-26

export type TrustLabel =
  | '5B' | '11J' | '5T' | '5E' | '5F' | '5L' | '5M' | '5N' | '5S' | '26';

export const TRUST_LABELS: Record<TrustLabel, { title: string; description: string }> = {
  '5B':  { title: 'Gross payments (Sales)', description: 'Total gross business income. Source: NAT 0659 FY2025-26.' },
  '11J': { title: 'Gross interest', description: 'Interest income. Source: NAT 0659 FY2025-26.' },
  '5T':  { title: 'Total business income', description: 'Sum of all income. Derived.' },
  '5E':  { title: 'Cost of sales', description: 'Direct costs. Source: NAT 0659 FY2025-26.' },
  '5F':  { title: 'Rent expenses', description: 'Business rent. Source: NAT 0659 FY2025-26.' },
  '5L':  { title: 'Superannuation expenses', description: 'Employer superannuation. Source: NAT 0659 FY2025-26.' },
  '5M':  { title: 'Salary and wage expenses', description: 'Gross salaries and wages. Source: NAT 0659 FY2025-26.' },
  '5N':  { title: 'All other expenses', description: 'Miscellaneous deductions. Source: NAT 0659 FY2025-26.' },
  '5S':  { title: 'Total expenses', description: 'Sum of all expenses. Derived.' },
  '26':  { title: 'Net income or loss', description: 'Distributable trust income. Source: NAT 0659 FY2025-26.' },
};

// ── Partnership return label set ───────────────────────────────────────────
// Source: NAT 0976 (Partnership tax return instructions) FY2025-26

export type PartnershipLabel = 'P1' | 'P2' | 'P8';

export const PARTNERSHIP_LABELS: Record<PartnershipLabel, { title: string; description: string }> = {
  'P1': { title: 'Gross income', description: 'Total partnership income. Source: NAT 0976 FY2025-26.' },
  'P2': { title: 'Total deductions', description: 'Total allowable deductions. Source: NAT 0976 FY2025-26.' },
  'P8': { title: 'Net income or loss', description: 'P1 minus P2. Derived.' },
};

// ── BAS label set ──────────────────────────────────────────────────────────
// Source: NAT 7392 (BAS instructions) FY2025-26

export type BasLabel = 'G1' | 'G2' | 'G3' | 'G10' | 'G11' | '1A' | '1B' | 'W1' | 'W2';

export const BAS_LABELS: Record<BasLabel, { title: string; description: string }> = {
  'G1':  { title: 'Total sales', description: 'GST-inclusive total sales. Source: NAT 7392.' },
  'G2':  { title: 'Export sales', description: 'GST-free export sales. Source: NAT 7392.' },
  'G3':  { title: 'Other GST-free sales', description: 'GST-free sales excluding exports. Source: NAT 7392.' },
  'G10': { title: 'Capital purchases', description: 'GST-inclusive capital acquisitions. Source: NAT 7392.' },
  'G11': { title: 'Non-capital purchases', description: 'GST-inclusive non-capital acquisitions. Source: NAT 7392.' },
  '1A':  { title: 'GST on sales', description: 'GST collected on sales (G1 - G2 - G3) / 11. Source: NAT 7392.' },
  '1B':  { title: 'GST on purchases', description: 'GST input tax credits. Source: NAT 7392.' },
  'W1':  { title: 'Total salary, wages and other payments', description: 'PAYG withholding base. Source: NAT 7392.' },
  'W2':  { title: 'Amounts withheld from W1', description: 'PAYG withholding amounts. Source: NAT 7392.' },
};

// ── GST rate ───────────────────────────────────────────────────────────────
// Source: A New Tax System (Goods and Services Tax) Act 1999, s 9-70
// Rate unchanged since 2000; update this comment if rate ever changes
export const GST_RATE = '0.1' as const;   // 10% — use as Decimal string, never as float
export const GST_DIVISOR = '11' as const;  // GST = inclusive amount / 11

// ── Tax rates (stubs — Phase 5 fills in bracket math) ────────────────────
// Source: ITAA 1997, ATO company tax rates table
export const COMPANY_TAX_RATE_BASE = '0.25' as const;  // 25% BRE rate — Source: ATO FY2025-26
export const COMPANY_TAX_RATE_FULL = '0.30' as const;  // 30% non-BRE rate
export const BRE_PASSIVE_THRESHOLD = '0.80' as const;  // 80% passive income threshold
export const BRE_TURNOVER_THRESHOLD = '50000000' as const; // $50M AUD
```

**Compile-time safety:** By using `Record<IndividualLabel, ...>` with a string literal union type, TypeScript will error if code references `INDIVIDUAL_LABELS['6Z']` (unknown label). Components and engine functions that index into these records get compile-time correctness.

---

### 5. Period Model Implementation Details

#### Complete `src/lib/period.ts` implementation

```typescript
/**
 * Australian financial year and BAS period model.
 *
 * KNOWN CONSTRAINT: Time-of-day is ignored — all boundaries are at midnight local time.
 * No timezone handling. The app assumes the user's machine clock reflects AEST/AEDT.
 * This is a v1 limitation; do not add timezone logic without a test suite covering DST edge cases.
 *
 * FORBIDDEN: Do not use `new Date()` or `Date.now()` anywhere outside this module.
 * Use `today()` instead. The structural lint test enforces this.
 */

export type FyLabel = `FY${number}`;

export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
  | { type: 'custom'; from: Date; to: Date };

// ── Test seam ──────────────────────────────────────────────────────────────
// Tests use vi.spyOn(periodModule, 'today').mockReturnValue(new Date('2026-05-10'))
// App code always calls today() — never new Date()
let _nowProvider: () => Date = () => new Date();

export function today(): Date {
  return _nowProvider();
}

/** Only for tests. Do not call in production code. */
export function _setNowProvider(fn: () => Date): void {
  _nowProvider = fn;
}

/** Reset to real clock. Call in test afterEach. */
export function _resetNowProvider(): void {
  _nowProvider = () => new Date();
}

// ── FY label helpers ───────────────────────────────────────────────────────
/**
 * Return the FY label for the given date.
 * AU FY runs 1 July – 30 June; the label is the calendar year of the END date.
 * 1 Jul 2025 – 30 Jun 2026 → 'FY2026'
 */
export function currentFy(now?: Date): FyLabel {
  const d = now ?? today();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  // If month is Jan–Jun, the FY end year is the current calendar year
  // If month is Jul–Dec, the FY end year is calendar year + 1
  const endYear = month <= 6 ? year : year + 1;
  return `FY${endYear}`;
}

/**
 * Parse FyLabel and return the start/end Date for the financial year.
 * 'FY2026' → { from: 2025-07-01, to: 2026-06-30 }
 */
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date } {
  const endYear = Number(fy.replace('FY', ''));
  if (Number.isNaN(endYear)) throw new Error(`Invalid FyLabel: ${fy}`);
  // Start is 1 July of (endYear - 1)
  const from = new Date(endYear - 1, 6, 1);   // month 6 = July (0-indexed)
  // End is 30 June of endYear
  const to   = new Date(endYear, 5, 30);       // month 5 = June
  return { from, to };
}

/**
 * Determine which FY and quarter a given date falls in.
 * Returns { fy: 'FY2026', q: 1 | 2 | 3 | 4 }
 */
export function quarterOf(date: Date): { fy: FyLabel; q: 1 | 2 | 3 | 4 } {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();

  if (month >= 7 && month <= 9) {
    return { fy: `FY${year + 1}`, q: 1 };  // Jul-Sep → Q1 of FY ending next year
  } else if (month >= 10 && month <= 12) {
    return { fy: `FY${year + 1}`, q: 2 };  // Oct-Dec → Q2
  } else if (month >= 1 && month <= 3) {
    return { fy: `FY${year}`, q: 3 };      // Jan-Mar → Q3
  } else {
    return { fy: `FY${year}`, q: 4 };      // Apr-Jun → Q4
  }
}

/**
 * Return the start/end Date for a given BAS quarter within a financial year.
 * Quarter boundaries (ATO-prescribed):
 *   Q1 = 1 Jul – 30 Sep
 *   Q2 = 1 Oct – 31 Dec
 *   Q3 = 1 Jan – 31 Mar
 *   Q4 = 1 Apr – 30 Jun
 */
export function quarterBoundaries(
  fy: FyLabel,
  q: 1 | 2 | 3 | 4
): { from: Date; to: Date } {
  const endYear = Number(fy.replace('FY', ''));
  const startYear = endYear - 1;

  const QUARTER_MAP: Record<1 | 2 | 3 | 4, { from: Date; to: Date }> = {
    1: { from: new Date(startYear, 6, 1),  to: new Date(startYear, 8, 30) },  // Jul–Sep
    2: { from: new Date(startYear, 9, 1),  to: new Date(startYear, 11, 31) }, // Oct–Dec
    3: { from: new Date(endYear, 0, 1),    to: new Date(endYear, 2, 31) },    // Jan–Mar
    4: { from: new Date(endYear, 3, 1),    to: new Date(endYear, 5, 30) },    // Apr–Jun
  };

  return QUARTER_MAP[q];
}

/**
 * Return true if the given date falls within the specified period (inclusive boundaries).
 * Date comparisons ignore time-of-day.
 */
export function isInPeriod(date: Date, period: Period): boolean {
  const { from, to } =
    period.type === 'fy'      ? fyBoundaries(period.fy) :
    period.type === 'quarter' ? quarterBoundaries(period.fy, period.q) :
                                 period;

  // Normalise to midnight for comparison
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const f = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const t = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  return d >= f && d <= t;
}
```

#### `today()` provider: `vi.spyOn` vs `_setNowProvider`

**Recommendation: use `vi.spyOn` against the exported `today` function.** This is idiomatic Vitest and requires no extra exports. The `_setNowProvider` escape hatch is worth keeping for cases where `vi.spyOn` doesn't work cleanly (e.g. in non-Vitest environments or if the module is re-exported), but the primary pattern for tests should be:

```typescript
import * as periodModule from '../lib/period';

beforeEach(() => {
  vi.spyOn(periodModule, 'today').mockReturnValue(new Date('2026-02-15'));
});
afterEach(() => {
  vi.restoreAllMocks();
});
```

`_setNowProvider` / `_resetNowProvider` serve as a manual fallback. Keep both.

#### Structural lint test extension for `new Date(` detection

The existing `structural-lint.test.ts` scans `src/lib/tax/**/*.ts` for raw arithmetic. The `new Date(` check should be a **separate test** (different concern) covering the entire `src/` tree except `src/lib/period.ts` and test files:

```typescript
describe('Structural lint: no new Date() outside period.ts', () => {
  it('does not use new Date() anywhere except src/lib/period.ts', () => {
    // Scan all .ts/.tsx in src/ except period.ts and test files
    // Pattern to detect: /\bnew Date\s*\(/ that is not a comment
    // False-positive risks:
    //   1. `new Date('2026-...')` in test fixtures — excluded by *.test.ts filter
    //   2. Strings like "new Date(" in JSX text content — stripped by comment/string remover
    //   3. `// new Date(` in comments — stripped by comment remover
    // The stripCommentsAndStrings helper already handles cases 2 and 3.
  });
});
```

**False-positive risk analysis:**
- Test files: excluded by `!f.name.endsWith('.test.ts') && !f.name.endsWith('.test.tsx')` filter.
- Strings containing the literal text `"new Date("`: stripped by the existing `stripCommentsAndStrings` helper which removes `"[^"]*"` patterns.
- Comments: stripped by `replace(/\/\/.*$/, '')`.
- The one genuine remaining risk: `new Date(someVar)` used in `src/types.ts` or similar as a type cast. Check: `src/types.ts` has no `new Date` calls. `src/constants.ts` has no `new Date` calls. The only real `new Date` usages in non-period code are in `App.tsx:356` (`new Date().toISOString()` in `addAuditLog`) — this moves into `useAuditLog.ts` which must import `today()` from `period.ts`.
- `Date.now()`: add a separate regex `/\bDate\.now\s*\(/.test(line)` in the same test.

---

### 6. Migration `1 → 2` Implementation

#### File structure

```
src/lib/migrations/
├── index.ts           # CURRENT_VERSION bumped to 2; registers 1→2 migration
└── v1-to-v2.ts        # The migration function
```

#### Name → label inference table

Live in `v1-to-v2.ts` as a static comment-documented map. The table maps normalised account names to per-entity-type labels:

```typescript
// src/lib/migrations/v1-to-v2.ts

import { Account } from '../../types';

/**
 * Name → label inference table for migration 1 → 2.
 * Covers the 16 default CoA accounts plus common real-world synonyms.
 * Format: normalised name (lowercase, alphanumeric+space) → { taxLabel, companyTaxLabel, trustTaxLabel, partnershipTaxLabel }
 *
 * Phase 4 extends this table to cover the 80–150-account expansion.
 * Source: NAT 0660 (Individual), NAT 0656 (Company), NAT 0659 (Trust), NAT 0976 (Partnership)
 */
const INFERENCE_TABLE: Record<string, Partial<{
  taxLabel: string;
  companyTaxLabel: string;
  trustTaxLabel: string;
  partnershipTaxLabel: string;
}>> = {
  // Revenue accounts
  'sales':                 { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'gross sales':           { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'service income':        { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'consulting income':     { taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B',  partnershipTaxLabel: 'P1' },
  'interest income':       { taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', partnershipTaxLabel: 'P1' },
  'bank interest':         { taxLabel: '6K', companyTaxLabel: '6F', trustTaxLabel: '11J', partnershipTaxLabel: 'P1' },
  // Expense accounts
  'advertising':           { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'marketing':             { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'bank charges':          { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'bank fees':             { taxLabel: '6N', companyTaxLabel: '6X', trustTaxLabel: '5N',  partnershipTaxLabel: 'P2' },
  'rent':                  { taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F',  partnershipTaxLabel: 'P2' },
  'rent expense':          { taxLabel: '6N', companyTaxLabel: '6G', trustTaxLabel: '5F',  partnershipTaxLabel: 'P2' },
  'wages':                 { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'salaries':              { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'wages salaries':        { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'wages and salaries':    { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'director fees':         { taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M',  partnershipTaxLabel: 'P2' },
  'superannuation':        { taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L',  partnershipTaxLabel: 'P2' },
  'super':                 { taxLabel: '6L', companyTaxLabel: '6C', trustTaxLabel: '5L',  partnershipTaxLabel: 'P2' },
  'cost of sales':         { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
  'cost of goods sold':    { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
  'cogs':                  { taxLabel: '6Q', companyTaxLabel: '6X', trustTaxLabel: '5E',  partnershipTaxLabel: 'P2' },
};

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export function migrateV1ToV2(state: PersistedRoot): PersistedRoot {
  // Guard: idempotent check
  if (state._v >= 2) return state;

  const accounts = (state.accounts as Account[] | undefined) ?? [];

  const migratedAccounts = accounts.map((account): Account => {
    const normalised = normaliseName(account.name);
    const inferred = INFERENCE_TABLE[normalised];

    const partnershipTaxLabel =
      account.partnershipTaxLabel ?? inferred?.partnershipTaxLabel;
    const taxLabel =
      account.taxLabel ?? inferred?.taxLabel;
    const companyTaxLabel =
      account.companyTaxLabel ?? inferred?.companyTaxLabel;
    const trustTaxLabel =
      account.trustTaxLabel ?? inferred?.trustTaxLabel;

    const needsReview =
      account.type === 'Revenue' || account.type === 'Expense'
        ? !taxLabel || !companyTaxLabel || !trustTaxLabel || !partnershipTaxLabel
        : false; // Asset/Liability/Equity don't need tax labels

    return {
      ...account,
      taxLabel,
      companyTaxLabel,
      trustTaxLabel,
      partnershipTaxLabel,
      ...(needsReview ? { _needsReview: true } : {}),
    };
  });

  return {
    ...state,
    _v: 2,
    accounts: migratedAccounts,
  };
}
```

#### `_needsReview` — persistent or transient?

**Make it persistent on `Account` at `_v: 2`.** Rationale: the banner must survive a page refresh. If it were only derived state, it would re-trigger on every load including after the user has reviewed and dismissed. The flag should be cleared by the user explicitly in the CoA editor, which calls `updateAccount({ ..., _needsReview: undefined })`. This requires adding `_needsReview?: boolean` to the `Account` interface in `src/types.ts`.

The field is `_needsReview` (underscore prefix convention, matching `_v`) to signal it is internal/operational state.

#### Idempotency guard

The migration uses `if (state._v >= 2) return state;` as the guard. The migration runner already handles this at the loop level (`while (state._v < CURRENT_VERSION)`), so double protection is provided.

#### `partnershipTaxLabel` addition to `Account` type

```typescript
// src/types.ts additions for _v: 2
export interface Account {
  _v?: number;
  id: string;
  code: string;
  name: string;
  type: AccountType;
  taxLabel?: string;
  companyTaxLabel?: string;
  trustTaxLabel?: string;
  partnershipTaxLabel?: string;   // NEW in _v: 2
  gstCode: 'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'; // WIDENED: INP and CAP added
  _needsReview?: boolean;          // NEW in _v: 2 — transient operational flag
}
```

---

### 7. AI Gating Mechanics

#### `IS_AI_ENABLED` constant

**Location:** `src/lib/ai.ts` (new file, Claude's discretion confirmed).

**The `process.env` vs `import.meta.env` question:** The existing `vite.config.ts` uses the `define` block:
```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```
This means `process.env.GEMINI_API_KEY` is a build-time string replacement. The value at `ImportTB.tsx:79` already uses `process.env.GEMINI_API_KEY`. The `IS_AI_ENABLED` constant must use the same access pattern:

```typescript
// src/lib/ai.ts
/**
 * IS_AI_ENABLED is a BUILD-TIME constant computed from the GEMINI_API_KEY environment variable.
 * The variable is injected by Vite's define block (see vite.config.ts).
 *
 * A blank key or the placeholder value 'MY_GEMINI_API_KEY' is treated as "not configured".
 * This prevents a self-hosted instance with the template .env.example from accidentally
 * appearing to have AI configured.
 *
 * SECURITY NOTE: The API key is bundled into the client-side JavaScript. This is acceptable
 * for a fully-private self-hosted instance running on your own machine. It is NOT acceptable
 * for any publicly accessible deployment. For shared instances, move AI calls to a server-side
 * proxy (Phase 3).
 */
export const IS_AI_ENABLED: boolean = Boolean(
  process.env.GEMINI_API_KEY &&
  process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
);
```

Do NOT use `import.meta.env.VITE_GEMINI_API_KEY` — the existing config exposes it as `process.env.GEMINI_API_KEY` via `define`. Changing to `import.meta.env` would require updating `vite.config.ts` and the existing call site simultaneously.

#### ImportTB conditional render strategy

The 589-line ImportTB component should not grow in bulk. The gating pattern is a top-level conditional that short-circuits the AI-dependent JSX subtree:

```typescript
// src/components/ImportTB.tsx additions
import { IS_AI_ENABLED } from '../lib/ai';
import { fuzzyMatch } from '../lib/import/match';

// Replace runAIMapping with runDeterministicMapping
const runDeterministicMapping = () => {
  const mapped = fileData.map(imported => {
    const result = fuzzyMatch(imported, accounts);
    return { ...imported, ...result };
  });
  setFileData(mapped);
  setMappingComplete(true);
  setIsProcessing(false);
};

// In JSX — the AI "Enhance with AI" button only renders if IS_AI_ENABLED:
{IS_AI_ENABLED && (
  <button onClick={runAIMapping} className="...">
    <Sparkles size={16} />
    Enhance with AI
  </button>
)}

// The primary action is always the deterministic path:
<button onClick={runDeterministicMapping} className="...">
  Auto-match Accounts
</button>
```

The component has two action buttons in the mapping step: "Auto-match Accounts" (always visible) and "Enhance with AI" (conditionally visible). This avoids doubling the component's rendering logic — both paths share the same state machine; only the trigger and the source of confidence scores differs.

The AI call site at line 79 (`new GoogleGenAI(...)`) is wrapped in `if (IS_AI_ENABLED)` within `runAIMapping`. The function can remain in the file but becomes unreachable when `IS_AI_ENABLED` is false.

#### Fuzzy match implementation

```typescript
// src/lib/import/match.ts
import { ImportedAccount, Account } from '../../types';

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export interface MatchResult {
  mappedAccountId?: string;
  confidence: number;
  candidates: Array<{ accountId: string; confidence: number; name: string }>;
}

// Confidence threshold constants (locked in CONTEXT.md)
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;
export const TOP_N_CANDIDATES = 3;

export function fuzzyMatch(
  imported: Pick<ImportedAccount, 'externalCode' | 'externalName'>,
  accounts: Account[]
): MatchResult {
  // Step 1: Exact code match (confidence 1.0)
  if (imported.externalCode) {
    const exactCode = accounts.find(a => a.code === imported.externalCode.trim());
    if (exactCode) {
      return {
        mappedAccountId: exactCode.id,
        confidence: 1.0,
        candidates: [{ accountId: exactCode.id, confidence: 1.0, name: exactCode.name }],
      };
    }
  }

  // Step 2: Levenshtein on normalised name
  const normImported = normalise(imported.externalName);
  const ranked = accounts
    .map(account => {
      const normAccount = normalise(account.name);
      const distance = levenshtein(normImported, normAccount);
      const maxLen = Math.max(normImported.length, normAccount.length);
      const confidence = maxLen === 0 ? 0 : 1 - distance / maxLen;
      return { accountId: account.id, confidence, name: account.name };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];
  const candidates = ranked.slice(0, TOP_N_CANDIDATES);

  if (!best || best.confidence < 0) {
    return { confidence: 0, candidates: [] };
  }

  if (best.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return { mappedAccountId: best.accountId, confidence: best.confidence, candidates };
  }

  return { confidence: best.confidence, candidates };
}
```

---

### 8. Tests for Phase 2

#### Hook tests with `renderHook`

```typescript
// src/hooks/__tests__/useAuditLog.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuditLog } from '../useAuditLog';

describe('useAuditLog', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty audit log', () => {
    const { result } = renderHook(() => useAuditLog());
    expect(result.current.auditLogs).toHaveLength(0);
  });

  it('addLog prepends a new entry', () => {
    const { result } = renderHook(() => useAuditLog());
    act(() => {
      result.current.addLog('CREATE_ENTITY', 'Created Sample Pty Ltd', 'ent-1');
    });
    expect(result.current.auditLogs).toHaveLength(1);
    expect(result.current.auditLogs[0].action).toBe('CREATE_ENTITY');
  });

  it('persists to localStorage on change', async () => {
    const { result } = renderHook(() => useAuditLog());
    act(() => {
      result.current.addLog('POST_JOURNAL', 'Posted journal JE-001', 'ent-1');
    });
    const stored = JSON.parse(localStorage.getItem('ledger_audit_logs') ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].action).toBe('POST_JOURNAL');
  });

  it('loads from localStorage on mount', () => {
    const existing = [{ id: 'log-1', timestamp: '2026-01-01T00:00:00.000Z', user: 'Local user', action: 'CREATE_ENTITY', details: 'test' }];
    localStorage.setItem('ledger_audit_logs', JSON.stringify(existing));
    const { result } = renderHook(() => useAuditLog());
    expect(result.current.auditLogs).toHaveLength(1);
    expect(result.current.auditLogs[0].id).toBe('log-1');
  });
});
```

**Mock localStorage in tests:** jsdom@26 provides a functional `localStorage` stub. `localStorage.clear()` in `beforeEach` is sufficient. No extra mocking needed.

#### Tax engine stub structure tests

```typescript
// src/lib/tax/__tests__/golden.test.ts (extending Phase 1 placeholder)
import { describe, it, expect } from 'vitest';
import { computeIndividual } from '../individual';
import { computeCompany }    from '../company';
import { computeTrust }      from '../trust';
import { computePartnership } from '../partnership';
import { computeBas }        from '../bas';
import { Decimal } from '../../money';
import type { TaxInput } from '../types';
import { currentFy, fyBoundaries } from '../../period';

const fy = 'FY2026' as const;
const period = { type: 'fy' as const, fy };
const baseInput: TaxInput = { fy, entries: [], accounts: [], period };

describe('Tax engine — Phase 2 structural tests (Phase 5 fills golden numbers)', () => {
  it.todo('computeIndividual returns correct 6S for fixture with known sales entries');
  it.todo('computeCompany returns 25% rate for non-passive-income company');
  it.todo('computeBas returns correct 1A for fixture with GST-inclusive sales');

  it('computeIndividual returns shaped result with Decimal values', () => {
    const result = computeIndividual(baseInput);
    expect(result['6S'].value).toBeInstanceOf(Decimal);
    expect(result['6K'].value).toBeInstanceOf(Decimal);
    expect(result['7T'].value).toBeInstanceOf(Decimal);
    expect(Array.isArray(result['6S'].source)).toBe(true);
  });

  it('computeCompany returns shaped result with Decimal values', () => {
    const result = computeCompany(baseInput);
    expect(result['6A'].value).toBeInstanceOf(Decimal);
    expect(result['7T'].value).toBeInstanceOf(Decimal);
  });

  it('computeTrust returns shaped result with Decimal values', () => {
    const result = computeTrust({ ...baseInput });
    expect(result['26'].value).toBeInstanceOf(Decimal);
  });

  it('computePartnership returns shaped result with Decimal values', () => {
    const result = computePartnership({ ...baseInput });
    expect(result['P8'].value).toBeInstanceOf(Decimal);
  });

  it('computeBas returns shaped result with Decimal values', () => {
    const result = computeBas(baseInput);
    expect(result.G1.value).toBeInstanceOf(Decimal);
    expect(result['1A'].value).toBeInstanceOf(Decimal);
  });
});
```

#### Period tests

```typescript
// src/lib/__tests__/period.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as period from '../period';

afterEach(() => { vi.restoreAllMocks(); });

describe('currentFy', () => {
  it('returns FY2026 for a date in Jul 2025', () => {
    vi.spyOn(period, 'today').mockReturnValue(new Date('2025-07-01'));
    expect(period.currentFy()).toBe('FY2026');
  });
  it('returns FY2026 for a date in Jun 2026', () => {
    vi.spyOn(period, 'today').mockReturnValue(new Date('2026-06-30'));
    expect(period.currentFy()).toBe('FY2026');
  });
  it('returns FY2027 for a date in Jul 2026', () => {
    vi.spyOn(period, 'today').mockReturnValue(new Date('2026-07-01'));
    expect(period.currentFy()).toBe('FY2027');
  });
  it('returns FY2026 for a date in Jan 2026 (mid-year)', () => {
    vi.spyOn(period, 'today').mockReturnValue(new Date('2026-01-15'));
    expect(period.currentFy()).toBe('FY2026');
  });
});

describe('fyBoundaries', () => {
  it('FY2026 starts 2025-07-01 and ends 2026-06-30', () => {
    const { from, to } = period.fyBoundaries('FY2026');
    expect(from.toISOString().slice(0, 10)).toBe('2025-07-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-06-30');
  });
});

describe('quarterOf', () => {
  it('1 Jul 2025 is Q1 of FY2026', () => {
    const { fy, q } = period.quarterOf(new Date('2025-07-01'));
    expect(fy).toBe('FY2026'); expect(q).toBe(1);
  });
  it('30 Sep 2025 is Q1 of FY2026', () => {
    const { fy, q } = period.quarterOf(new Date('2025-09-30'));
    expect(fy).toBe('FY2026'); expect(q).toBe(1);
  });
  it('1 Oct 2025 is Q2 of FY2026', () => {
    const { fy, q } = period.quarterOf(new Date('2025-10-01'));
    expect(fy).toBe('FY2026'); expect(q).toBe(2);
  });
  it('1 Jan 2026 is Q3 of FY2026', () => {
    const { fy, q } = period.quarterOf(new Date('2026-01-01'));
    expect(fy).toBe('FY2026'); expect(q).toBe(3);
  });
  it('1 Apr 2026 is Q4 of FY2026', () => {
    const { fy, q } = period.quarterOf(new Date('2026-04-01'));
    expect(fy).toBe('FY2026'); expect(q).toBe(4);
  });
  it('29 Feb 2028 (leap year) is Q3 of FY2028', () => {
    const { fy, q } = period.quarterOf(new Date('2028-02-29'));
    expect(fy).toBe('FY2028'); expect(q).toBe(3);
  });
});

describe('quarterBoundaries', () => {
  it('FY2026 Q1 = 2025-07-01 to 2025-09-30', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 1);
    expect(from.toISOString().slice(0, 10)).toBe('2025-07-01');
    expect(to.toISOString().slice(0, 10)).toBe('2025-09-30');
  });
  it('FY2026 Q2 = 2025-10-01 to 2025-12-31', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 2);
    expect(from.toISOString().slice(0, 10)).toBe('2025-10-01');
    expect(to.toISOString().slice(0, 10)).toBe('2025-12-31');
  });
  it('FY2026 Q3 = 2026-01-01 to 2026-03-31', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 3);
    expect(from.toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-03-31');
  });
  it('FY2026 Q4 = 2026-04-01 to 2026-06-30', () => {
    const { from, to } = period.quarterBoundaries('FY2026', 4);
    expect(from.toISOString().slice(0, 10)).toBe('2026-04-01');
    expect(to.toISOString().slice(0, 10)).toBe('2026-06-30');
  });
});
```

#### Migration round-trip test

```typescript
// src/lib/migrations/__tests__/v1-to-v2.test.ts
import { describe, it, expect } from 'vitest';
import { migrate } from '../index';

const v1State = {
  _v: 1,
  entities: [],
  allEntries: {},
  auditLogs: [],
  accounts: [
    { id: '4-4100', code: '4100', name: 'Sales', type: 'Revenue', taxLabel: '6S', companyTaxLabel: '6A', trustTaxLabel: '5B', gstCode: 'GST' },
    { id: '6-6400', code: '6400', name: 'Wages & Salaries', type: 'Expense', taxLabel: '6L', companyTaxLabel: '6X', trustTaxLabel: '5M', gstCode: 'N-T' },
    { id: '1-1110', code: '1110', name: 'General Check Account', type: 'Asset', gstCode: 'N-T' },
    { id: '9-9999', code: '9999', name: 'Obscure Account XYZ', type: 'Expense', gstCode: 'GST' },
  ],
};

describe('Migration 1 → 2', () => {
  it('bumps _v to 2', () => {
    const result = migrate(v1State);
    expect(result._v).toBe(2);
  });

  it('adds partnershipTaxLabel for known Sales account', () => {
    const result = migrate(v1State);
    const sales = (result.accounts as any[]).find(a => a.id === '4-4100');
    expect(sales.partnershipTaxLabel).toBe('P1');
  });

  it('adds partnershipTaxLabel for known Wages account', () => {
    const result = migrate(v1State);
    const wages = (result.accounts as any[]).find(a => a.id === '6-6400');
    expect(wages.partnershipTaxLabel).toBe('P2');
  });

  it('preserves existing taxLabel values', () => {
    const result = migrate(v1State);
    const sales = (result.accounts as any[]).find(a => a.id === '4-4100');
    expect(sales.taxLabel).toBe('6S');
    expect(sales.companyTaxLabel).toBe('6A');
  });

  it('marks unmapped Revenue/Expense accounts as _needsReview', () => {
    const result = migrate(v1State);
    const obscure = (result.accounts as any[]).find(a => a.id === '9-9999');
    expect(obscure._needsReview).toBe(true);
  });

  it('does NOT mark Asset accounts as _needsReview', () => {
    const result = migrate(v1State);
    const asset = (result.accounts as any[]).find(a => a.id === '1-1110');
    expect(asset._needsReview).toBeFalsy();
  });

  it('is idempotent — running twice produces the same result', () => {
    const once = migrate(v1State);
    const twice = migrate(once as Record<string, unknown>);
    expect(twice._v).toBe(2);
    const accountsOnce = (once.accounts as any[]).map(a => a.id);
    const accountsTwice = (twice.accounts as any[]).map(a => a.id);
    expect(accountsOnce).toEqual(accountsTwice);
  });

  it('widens gstCode to allow INP and CAP in the type system', () => {
    // This is a TypeScript compile-time check; at runtime, existing codes are preserved
    const v1WithCustomCode = {
      ...v1State,
      accounts: [{ ...v1State.accounts[0], gstCode: 'INP' }],
    };
    expect(() => migrate(v1WithCustomCode)).not.toThrow();
  });
});
```

---

### 9. App.tsx ≤ 250 Lines Audit

#### Current line count: 1,116

#### What stays in App.tsx after Phase 2

- `View` type union (~1 line)
- `DEFAULT_ENTITIES` constant (~5 lines)
- `export default function App()` body:
  - `migrationError` state + migration startup call (~15 lines)
  - `view`, `isSidebarOpen`, `showNewJournal` state (~3 lines)
  - Hook composition: `useAuditLog()`, `useAccounts(addLog)`, `useJournals(addLog, activeEntityId)`, `useEntities(addLog)` (~8 lines)
  - `if (migrationError) return <MigrationError ...>` (~3 lines)
  - `return <MainLayout ...><ViewRouter /></MainLayout>` (~10–30 lines depending on prop threading)

#### What moves out

| Currently in App.tsx | Moves to |
|---------------------|----------|
| `EntityCard` component (~130 lines) | Stays in App.tsx or moves to `src/components/EntityCard.tsx` |
| `NavButton`, `MobileNavButton` helpers (~20 lines) | Move into `Sidebar.tsx` and `BottomNav.tsx` |
| `useState` blocks lines 207–214 | Distributed across hooks + App.tsx local state |
| `useEffect` load block lines 228–280 | `App.tsx` (migration startup) + hooks |
| `useEffect` save blocks lines 282–299 | Into each hook |
| `addAuditLog` function (~12 lines) | Into `useAuditLog` |
| Entity handlers (`handleSaveEntry`, `handleImport`, `handleUpdateEntity`, etc.) (~60 lines) | Into respective hooks as exposed mutators |
| `totalRevenue`, `totalExpenses`, `netProfit` derivations (~15 lines) | Stay in App or move to `useJournals` |
| Sidebar JSX (~90 lines, App.tsx 437–525) | `src/components/shell/Sidebar.tsx` |
| Header JSX (~50 lines, App.tsx 529–576) | `src/components/shell/Header.tsx` |
| Main content AnimatePresence wrapper + view dispatch (~430 lines, 578–1020) | `ViewRouter` component or inline in App.tsx with components split out |
| BottomNav JSX (~40 lines, App.tsx 1024–1062) | `src/components/shell/BottomNav.tsx` |
| `EntityCard`, `StatCard`, dashboard JSX | Stay as views called by ViewRouter |

#### `ViewRouter` recommendation

Extract a `ViewRouter` component. It receives `view`, `accounts`, `entries`, `filteredEntries`, `entities`, `activeEntityId`, and the handler callbacks as props, and renders the correct component tree. This is cleaner than 28 separate `{view === 'X' && <Component />}` conditionals inline in App.tsx.

```typescript
// src/components/ViewRouter.tsx
interface ViewRouterProps {
  view: View;
  // ... all data and callbacks
}

export function ViewRouter({ view, accounts, filteredEntries, entities, activeEntityId, ... }: ViewRouterProps) {
  return (
    <>
      {view === 'master-dashboard' && <MasterDashboard ... />}
      {view === 'dashboard'        && activeEntityId && <EntityDashboard ... />}
      {view === 'journals'         && <JournalView ... />}
      {view === 'trial-balance'    && <TrialBalanceView ... />}
      {view === 'tax-return'       && <TaxReturnAssistant ... />}
      {view === 'company-tax'      && <CompanyTaxReturn ... />}
      {view === 'trust-tax'        && <TrustTaxReturn ... />}
      {view === 'bas-ias'          && <BasIasAssistant ... />}
      {view === 'import'           && <ImportTB ... />}
      {view === 'edit-entity'      && <EntityForm ... />}
      {view === 'audit-trail'      && <AuditTrail ... />}
      {view === 'coa-manager'      && <AccountManager ... />}
    </>
  );
}
```

#### Estimated post-refactor App.tsx line count

- Imports: ~15 lines
- Types + DEFAULT_ENTITIES: ~10 lines
- App function body: ~30 lines (hook calls + state + migration)
- JSX return: ~30 lines (`<MainLayout>`, `<ViewRouter>`)
- **Total: ~85–100 lines** — well within the ≤ 250 target.

Note: `EntityCard`, `StatCard`, dashboard JSX currently account for ~500 lines. If `EntityCard` and the full master dashboard JSX stay in App.tsx, the count rises to ~400 lines. **Recommendation:** Extract `EntityCard` to `src/components/EntityCard.tsx` (~130 lines) and `MasterDashboard` to `src/components/MasterDashboard.tsx` (~120 lines). These moves are not explicitly listed in CONTEXT.md but are necessary to hit ≤ 250.

---

### 10. Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Levenshtein distance | Custom O(n²) with bugs | The ~20-line standard DP implementation (hand-roll is fine here — libraries add 0 value) | Simple enough to write correctly once; no library needed |
| Decimal arithmetic | Native JS `number` operations | `src/lib/money.ts` wrappers (decimal.js) | Float rounding errors compound across many journal lines |
| Date arithmetic | Raw `new Date()` calls scattered throughout | `src/lib/period.ts` functions | AU FY has non-obvious edge cases; centralised = testable |
| Migration logic | Ad-hoc localStorage cleanup code | `src/lib/migrations/v1-to-v2.ts` registered in runner | Runner guarantees idempotency and version ordering |
| Confidence thresholds | Magic numbers in ImportTB.tsx | Exported constants `HIGH_CONFIDENCE_THRESHOLD`, `TOP_N_CANDIDATES` in `match.ts` | Tunable in one place; testable |

---

## Common Pitfalls

### Pitfall 1: Hook Circular Import via AuditLog

**What goes wrong:** `useJournals` imports `useAuditLog` directly, and `useAuditLog` — if it ever imports from a journal utility — creates a circular module graph. TypeScript will compile this but the module may initialise with `undefined` values at runtime.

**How to avoid:** Never have `useAuditLog` import from any other hook. Pass `addLog` as a function parameter to `useJournals`, `useAccounts`, and `useEntities` from App.tsx. App.tsx calls `const { addLog } = useAuditLog()` first, then passes `addLog` to the other hooks.

**Warning signs:** `import { useAuditLog } from './useAuditLog'` appearing inside `useJournals.ts`.

### Pitfall 2: Structural Lint Fails on Relocated Float Math

**What goes wrong:** The existing inline rollup math in the 4 tax components uses raw `number` arithmetic (`amount * multiplier`, etc.). If this math is relocated verbatim into `src/lib/tax/*.ts`, the structural lint test (`/[\d)]\s*[*/]\s*\d/`) will fail CI.

**How to avoid:** Convert all arithmetic in the relocated stubs to use `Decimal` operations from `money.ts` before Phase 2 is committed. The Decimal version is functionally identical and passes the lint.

### Pitfall 3: `IS_AI_ENABLED` Computed at Runtime Instead of Build Time

**What goes wrong:** If `IS_AI_ENABLED` is implemented as a function that reads `process.env.GEMINI_API_KEY` at call time, it will always be `undefined` in the browser (env vars are only available at build time via Vite's `define` block). The function will always return `false`, hiding AI even when configured.

**How to avoid:** `IS_AI_ENABLED` must be a module-level `const`, evaluated once when the module loads. Vite replaces `process.env.GEMINI_API_KEY` with the literal string value at build time. A function call would re-read the (now-replaced) string correctly, but a module-level const is cleaner and unambiguous.

### Pitfall 4: `_needsReview` Banner Persists After User Resolves Account

**What goes wrong:** If `_needsReview` is derived state (computed on every load), the banner will re-appear every time the user loads the page, even after they've resolved the account in the CoA editor.

**How to avoid:** `_needsReview` is a persistent field on `Account`. The CoA editor's `updateAccount` call must explicitly clear it: `{ ..., _needsReview: undefined }`. The migration only sets it to `true` for genuinely unmapped accounts; it never resets it.

### Pitfall 5: `today()` Spied But Original Module Cached

**What goes wrong:** Vitest caches module instances. If `period.ts` is imported in both the test file and the module under test, and they resolve to different module instances, `vi.spyOn(periodModule, 'today')` spies on the test's copy but the module under test calls the uncached copy.

**How to avoid:** Import the module under test using the same path resolution. Use `vi.mock('../lib/period')` at the top of test files if spying on module exports proves unreliable. The `_setNowProvider` escape hatch is the alternative if `vi.spyOn` has module-caching issues.

### Pitfall 6: Animation Break on Shell Component Extraction

**What goes wrong:** The `AnimatePresence` component in App.tsx wraps content that changes on view transitions. If the `key` prop on animated children is tied to the parent's identity (which changes when shell components re-render), animations may flash or stutter.

**How to avoid:** Move each `AnimatePresence` wrapper inside the extracted component, co-located with the animated elements. The Sidebar's overlay `AnimatePresence` should live in `Sidebar.tsx`, not in App.tsx.

---

## Code Examples

### Pattern: Hook that accepts `addLog` as parameter

```typescript
// src/hooks/useAccounts.ts
import { useState, useEffect, useCallback } from 'react';
import { Account } from '../types';
import { AuditLog } from '../types';
import { migrate, CURRENT_VERSION } from '../lib/migrations';
import { CHART_OF_ACCOUNTS } from '../constants';

const STORAGE_KEY = 'ledger_chart_of_accounts';

type AddLog = (action: AuditLog['action'], details: string, entityId?: string) => void;

export function useAccounts(addLog: AddLog) {
  const [accounts, setAccounts] = useState<Account[]>(CHART_OF_ACCOUNTS);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Account[];
        setAccounts(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  const updateAccount = useCallback((updated: Account) => {
    setAccounts(prev => prev.map(a => a.id === updated.id ? updated : a));
    addLog('IMPORT_DATA', `Updated account ${updated.code} - ${updated.name}`, '');
  }, [addLog]);

  const saveAll = useCallback((updated: Account[]) => {
    setAccounts(updated);
    addLog('IMPORT_DATA', 'Updated Chart of Accounts configuration', '');
  }, [addLog]);

  return { accounts, updateAccount, saveAll };
}
```

### Pattern: Tax engine module (no React)

```typescript
// src/lib/tax/company.ts — no React import, no JSX, no hooks
import { Decimal } from '../money';
import { CompanyInput, CompanyReturn, LabelResult } from './types';

const ZERO: LabelResult = { value: new Decimal(0), source: [] };

export function computeCompany(input: CompanyInput): CompanyReturn {
  const { entries, accounts } = input;

  const labelTotals: Record<string, Decimal> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      const account = accounts.find(a => a.id === line.accountId);
      if (!account?.companyTaxLabel) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);
      const amount = account.type === 'Expense'
        ? debit.minus(credit)   // expenses: positive = cost
        : credit.minus(debit);  // income: positive = revenue

      labelTotals[account.companyTaxLabel] =
        (labelTotals[account.companyTaxLabel] ?? new Decimal(0)).plus(amount);
    }
  }

  const make = (label: string): LabelResult => ({
    value: labelTotals[label] ?? new Decimal(0),
    source: [], // Phase 5 fills source tracing
  });

  const totalIncome = (labelTotals['6A'] ?? new Decimal(0))
    .plus(labelTotals['6F'] ?? new Decimal(0));

  const totalExpenses = (labelTotals['6C'] ?? new Decimal(0))
    .plus(labelTotals['6G'] ?? new Decimal(0))
    .plus(labelTotals['6X'] ?? new Decimal(0));

  return {
    '6A': make('6A'),
    '6F': make('6F'),
    '6T': { value: totalIncome, source: [] },
    '6C': make('6C'),
    '6G': make('6G'),
    '6X': make('6X'),
    '6S': { value: totalExpenses, source: [] },
    '7T': { value: totalIncome.minus(totalExpenses), source: [] },
  };
}
```

### Pattern: Period module `today()` seam with vi.spyOn

```typescript
// In a test file:
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as period from '../../lib/period';
import { computeIndividual } from '../../lib/tax/individual';

afterEach(() => vi.restoreAllMocks());

it('uses period.today() for timestamp in addLog', () => {
  vi.spyOn(period, 'today').mockReturnValue(new Date('2026-01-15'));
  // ... test that uses the mocked date
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| One god component owns all state and all JSX | Hooks extract state slices; shell components extracted | Phase 2 | App.tsx becomes testable; hooks can be swapped in Phase 3 |
| Tax math inline in each component (floats) | Pure-function tax engine in `lib/tax/` (Decimal) | Phase 2 → 5 | Phase 2 gets the structure; Phase 5 gets correctness |
| All date defaults scattered in components | Centralised `period.ts` with `today()` seam | Phase 2 | Period filtering becomes testable and AU-correct |
| Gemini key always required (build fails without it) | `IS_AI_ENABLED` gate; deterministic path always works | Phase 2 | Self-hosted instances work without any API key |
| 3 GST codes (`GST | FRE | N-T`) | 5 GST codes (`GST | FRE | INP | N-T | CAP`) | Phase 2 | Correct BAS G3/G4 split becomes possible |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `vitest.config.ts` (exists, Phase 1) |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FND-04 | `IS_AI_ENABLED` is false when no key set | unit | `npx vitest run src/lib/__tests__/ai.test.ts` | ❌ Wave 0 |
| FND-04 | ImportTB renders without AI button when `IS_AI_ENABLED` false | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | ❌ Wave 0 |
| FND-04 | `fuzzyMatch` returns a result for all accounts (no key needed) | unit | `npx vitest run src/lib/import/__tests__/match.test.ts` | ❌ Wave 0 |
| TAX-01 | `fy2026.ts` exports all required label sets | unit (structural) | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ✅ (extend existing) |
| TAX-01 | No magic number in any tax component (structural) | unit (structural) | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ✅ (extend existing) |
| TAX-03 | All 16 seed CoA accounts have all 4 entity-type labels in constants.ts | unit | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ❌ Wave 0 |
| TAX-03 | Migration 1→2 populates partnershipTaxLabel for known accounts | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts` | ❌ Wave 0 |
| TAX-03 | Migration marks unmapped Revenue/Expense accounts as _needsReview | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts` | ❌ Wave 0 |
| TAX-04 | AccountManager renders partnershipTaxLabel column | component | `npx vitest run src/components/__tests__/AccountManager.test.tsx` | ❌ Wave 0 |
| TAX-05 | `computeIndividual` returns typed `IndividualReturn` with Decimal values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts` | ✅ (extend existing) |
| TAX-05 | `computeCompany` returns typed `CompanyReturn` with Decimal values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts` | ✅ (extend existing) |
| TAX-05 | `computeTrust` returns typed `TrustReturn` with Decimal values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts` | ✅ (extend existing) |
| TAX-05 | `computePartnership` returns typed `PartnershipReturn` with Decimal values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts` | ✅ (extend existing) |
| TAX-05 | `computeBas` returns typed `BasReturn` with Decimal values | unit | `npx vitest run src/lib/tax/__tests__/bas.test.ts` | ✅ (extend existing) |
| TAX-05 | No React import in any `src/lib/tax/*.ts` file | unit (structural) | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ✅ (extend existing) |
| BOOK-08 | Account gstCode accepts 'INP' and 'CAP' (TypeScript compile-time) | type check | `npm run lint` (tsc --noEmit) | ✅ (lint passes after types.ts update) |
| BOOK-10 | `currentFy()` returns correct FyLabel for dates across FY boundary | unit | `npx vitest run src/lib/__tests__/period.test.ts` | ❌ Wave 0 |
| BOOK-10 | `quarterBoundaries` returns ATO-correct date ranges for all 4 quarters | unit | `npx vitest run src/lib/__tests__/period.test.ts` | ❌ Wave 0 |
| BOOK-10 | `isInPeriod` correctly includes/excludes boundary dates | unit | `npx vitest run src/lib/__tests__/period.test.ts` | ❌ Wave 0 |
| (App≤250) | App.tsx is ≤ 250 lines | structural | `npx vitest run src/__tests__/structural.test.ts` | ✅ (extend existing) |
| (hooks) | `useAuditLog` persists to localStorage and loads on mount | unit | `npx vitest run src/hooks/__tests__/useAuditLog.test.ts` | ❌ Wave 0 |
| (hooks) | `useAccounts` exposes updateAccount that calls addLog | unit | `npx vitest run src/hooks/__tests__/useAccounts.test.ts` | ❌ Wave 0 |
| (smoke) | All 12 existing component smoke tests remain green | component | `npx vitest run src/components/__tests__/smoke.test.tsx` | ✅ (must stay green) |
| (migration) | Migration round-trip: v1 → v2 preserves all existing fields | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts` | ❌ Wave 0 |
| (migration) | Migration is idempotent | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts src/components/__tests__/smoke.test.tsx` (structural lint + smoke = fast gate)
- **Per wave merge:** `npm run test` (full suite)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

Files that must be created before implementation tests can run:

- [ ] `src/lib/__tests__/ai.test.ts` — covers FND-04 (IS_AI_ENABLED logic)
- [ ] `src/lib/__tests__/period.test.ts` — covers BOOK-10 (full period test suite per examples above)
- [ ] `src/lib/import/__tests__/match.test.ts` — covers FND-04 (fuzzy match correctness)
- [ ] `src/lib/migrations/__tests__/v1-to-v2.test.ts` — covers TAX-03 (migration round-trip + idempotency)
- [ ] `src/hooks/__tests__/useAuditLog.test.ts` — covers hook persistence contract
- [ ] `src/hooks/__tests__/useAccounts.test.ts` — covers hook + addLog integration
- [ ] `src/hooks/__tests__/useJournals.test.ts` — covers hook + addLog integration
- [ ] `src/hooks/__tests__/useEntities.test.ts` — covers hook + addLog integration
- [ ] `src/components/__tests__/AccountManager.test.tsx` — covers TAX-04 (partnershipTaxLabel column)
- [ ] `src/components/__tests__/ImportTB.test.tsx` — covers FND-04 (AI gating render)

Extend existing:
- [ ] `src/lib/tax/__tests__/structural-lint.test.ts` — add React-import check + no-new-Date check
- [ ] `src/lib/tax/__tests__/golden.test.ts` — add Phase 2 structural shape tests (Phase 1 tests are all `.todo`)
- [ ] `src/lib/tax/__tests__/bas.test.ts` — add Phase 2 structural shape tests
- [ ] `src/__tests__/structural.test.ts` — add App.tsx ≤ 250 line count assertion

---

## Risks Specific to Phase 2

### Risk 1: Refactor regression — safest extraction order

To keep all 12 smoke tests green at every commit:

1. **`useAuditLog` first** — no dependencies on other hooks; isolated. Tests: hook unit tests.
2. **`useAccounts(addLog)` second** — depends only on `useAuditLog`'s `addLog` parameter. The `AccountManager` smoke test stays green because `useAccounts` exposes the same `updateAccount` callback shape.
3. **`useJournals(addLog, activeEntityId)` third** — depends on `activeEntityId` from App.tsx (not extracted yet). Tests: hook unit tests + `JournalForm` smoke still gets `accounts` from `useAccounts`.
4. **`useEntities(addLog)` fourth** — depends on `useAuditLog`. Tests: hook unit tests.
5. **Shell components** — pure JSX extraction; no state changes; smoke tests unaffected.
6. **Tax engine modules** — create modules; migrate 4 components; smoke tests must stay green at each component migration.
7. **Period model** — `period.ts` creation is safe; wiring `today()` calls throughout app is the risky step. Do this in one atomic commit with the structural lint test for `new Date(` enabled.
8. **Migration 1→2** — register in `index.ts`; test round-trip before registering.
9. **AI gating** — `IS_AI_ENABLED` + `ImportTB` conditional render; smoke test for ImportTB must pass in both IS_AI_ENABLED=true and =false modes.

### Risk 2: Tax component migration produces zero output if stubs return `new Decimal(0)`

CONTEXT.md is explicit: "The engine's Phase-2 skeleton returns the same numeric outputs the inline code currently produces (i.e. the existing demo-grade math is preserved temporarily)." Therefore stubs must NOT return all zeros. They must relocate the existing inline math.

Resolution: the stub bodies contain the relocated arithmetic converted to Decimal (as shown in §3). Components migrated to call `compute*()` will see the same numbers they produced before. Phase 5 rewrites internals only.

### Risk 3: `new Date(` structural lint — false positive management

The lint test for `new Date(` outside `period.ts` will flag:
- `src/App.tsx:356` — currently `new Date().toISOString()` in `addAuditLog`. **Resolution:** this moves into `useAuditLog` which must import `today()`. Resolved by the hook extraction.
- Any test fixture file containing `new Date('2026-...')` as a test vector. **Resolution:** exclude `*.test.ts` and `*.test.tsx` from the scan (same filter as the float arithmetic lint).
- Any comment or string containing the text "new Date(" in non-test source. **Resolution:** the existing `stripCommentsAndStrings` helper handles this.
- `Date.now()`: not currently used in the codebase. Add to the lint pattern anyway.

After hook extraction, the only legitimate `new Date` usage is inside `period.ts` itself. The lint should scan `src/` excluding `src/lib/period.ts`, `src/**/*.test.ts`, `src/**/*.test.tsx`.

---

## Open Questions

1. **Filter state location:** Should `searchQuery`, `dateFrom`, `dateTo` live in `useJournals` (hook-owned) or remain as local state in App.tsx passed to the hook? Both work. Recommendation: put them in `useJournals` to minimise App.tsx's state surface. If filtering needs to be driven by URL params in a future phase, it's easier to extract from the hook than from App.tsx.

2. **EntityCard extraction:** The `EntityCard` component (currently embedded in App.tsx, ~130 lines) is not mentioned in CONTEXT.md's extraction list. Hitting ≤ 250 lines in App.tsx likely requires extracting it. Planner should spec this as an explicit task or confirm it's implied by the "≤ 250 lines" success criterion.

3. **MasterDashboard JSX:** Similarly, the master dashboard view logic in App.tsx is ~200 lines of JSX. Hitting ≤ 250 requires it to move to its own component. The planner should confirm whether `ViewRouter` + `MasterDashboard` component extractions are in scope or whether the ≤ 250 target allows them to stay as inline JSX (it does not — the math doesn't work without extracting them).

4. **`@testing-library/jest-dom` not listed in package.json devDependencies:** It is listed in `01-1-SUMMARY.md` as installed (v6.9.1) but is absent from `package.json` as shown. This may be a summary error or the package was installed but not in the snapshot read. Verify before Phase 2 wave 0 test authoring.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `A:\Projects\AussieLedger\src\App.tsx` (1,116 lines — full inspection of state blocks, handlers, JSX structure)
- `A:\Projects\AussieLedger\src\types.ts` — current type definitions
- `A:\Projects\AussieLedger\src\constants.ts` — current 16-account CoA with existing label mappings
- `A:\Projects\AussieLedger\src\lib\money.ts` — decimal.js wrapper, ROUND_HALF_EVEN confirmed
- `A:\Projects\AussieLedger\src\lib\migrations\index.ts` — runner contract, CURRENT_VERSION=1
- `A:\Projects\AussieLedger\src\lib\tax\__tests__\structural-lint.test.ts` — lint test implementation
- `A:\Projects\AussieLedger\src\components\TaxReturnAssistant.tsx` — inline rollup at lines 29–58
- `A:\Projects\AussieLedger\src\components\CompanyTaxReturn.tsx` — inline rollup at lines 29–59
- `A:\Projects\AussieLedger\src\components\TrustTaxReturn.tsx` — inline rollup at lines 29–59
- `A:\Projects\AussieLedger\src\components\BasIasAssistant.tsx` — inline rollup at lines 11–86
- `A:\Projects\AussieLedger\src\components\ImportTB.tsx` — Gemini call at line 79
- `A:\Projects\AussieLedger\vite.config.ts` — confirms `process.env.GEMINI_API_KEY` via define block
- `A:\Projects\AussieLedger\package.json` — confirms installed dependencies and versions
- `A:\Projects\AussieLedger\.planning\phases\02-decompose-and-tax-engine\02-CONTEXT.md` — all locked decisions

### Secondary (HIGH confidence — project planning documents)

- `.planning\REQUIREMENTS.md` — FND-04, TAX-01, TAX-03, TAX-04, TAX-05, BOOK-08, BOOK-10
- `.planning\ROADMAP.md` — Phase 2 success criteria
- `.planning\research\PITFALLS.md` — §1 stale ATO label specs, §3 GST rounding, §6 FY cadence
- `.planning\research\ARCHITECTURE.md` — hook extraction pattern, tax engine pure-function pattern
- `.planning\phases\01-safety-net\01-1-SUMMARY.md` — Phase 1 deliverables confirmed

---

## Metadata

**Confidence breakdown:**
- Hook extraction recipe: HIGH — based on direct App.tsx code inspection; patterns are standard React
- Tax engine skeleton: HIGH — TypeScript types are precise; stub strategy confirmed by CONTEXT.md
- Period model implementation: HIGH — AU FY rules are stable; implementation is straightforward
- Migration 1→2: HIGH — runner contract is clear from Phase 1; inference table is Claude's discretion
- AI gating: HIGH — vite.config.ts confirms `process.env.GEMINI_API_KEY` access pattern
- App.tsx line count estimate: MEDIUM — depends on EntityCard/MasterDashboard extraction decisions not in CONTEXT.md
- Test architecture: HIGH — Vitest + RTL 16 + jsdom@26 confirmed working from Phase 1

**Research date:** 2026-05-10
**Valid until:** 2026-06-10 (30 days; stack is stable; ATO label specs do not change within a FY)
