# Architecture Research

**Domain:** Self-hosted open-source AU accounting / tax-return SPA (brownfield)
**Researched:** 2026-05-10
**Confidence:** HIGH (based on direct codebase analysis + known patterns for this deployment class)

---

## System Overview

The target architecture is a **thin optional server + thick client** model: a React SPA that can run
entirely in-browser for single-user local use, backed by a lightweight Node/Express server that adds
durable SQLite persistence, optional AI proxying, and multi-client workspace support when needed.
Both shapes share identical front-end code; the server is opt-in, not required.

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER  (React 19 SPA — identical in all deployment shapes)        │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │  Shell   │  │ Ledger   │  │   Tax    │  │ Wizard   │             │
│  │ (layout  │  │ (journal,│  │ (return  │  │ (guided  │             │
│  │  nav,    │  │  CoA,    │  │  assemb- │  │  year-   │             │
│  │  mode)   │  │  TB)     │  │  ly)     │  │  end)    │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       │             │             │             │                    │
│  ┌────┴─────────────┴─────────────┴─────────────┴────────────────┐   │
│  │              Storage Adapter (interface)                       │   │
│  │   .read(query)  .write(mutation)  .export()  .import()        │   │
│  └──────────┬────────────────────────────────────────────────────┘   │
│             │                                                         │
│     ┌───────┴────────┐                                               │
│     │  LocalAdapter  │  (IndexedDB + mandatory JSON export)          │
│     │  (single-user  │  used when no server is present               │
│     │   no-server)   │                                               │
│     └────────────────┘                                               │
└─────────────────────────────────────────────┬────────────────────────┘
                                              │ HTTP (REST)
                              ┌───────────────┴──────────────────┐
                              │  Optional Node/Express Server     │
                              │  server/                          │
                              │  ├── index.ts   (entry)           │
                              │  ├── routes/                      │
                              │  │   ├── entities.ts              │
                              │  │   ├── journals.ts              │
                              │  │   ├── accounts.ts              │
                              │  │   └── ai.ts  (proxy, opt-in)   │
                              │  ├── db/                          │
                              │  │   ├── client.ts  (better-sqli) │
                              │  │   ├── migrations/              │
                              │  │   └── schema.sql               │
                              │  └── auth.ts  (optional PIN gate) │
                              │                                    │
                              │  SQLite file (data/ledger.db)      │
                              └──────────────────────────────────┘
```

---

## Component Boundaries

| Component | Responsibility | Talks To |
|-----------|----------------|----------|
| **Shell** | Layout, sidebar, bottom-nav, mode preference (consumer/agent), entity context header | All feature components; Storage Adapter for mode preference |
| **Ledger** | Journal entry CRUD, Chart of Accounts CRUD, Trial Balance report, period filtering | Storage Adapter |
| **Tax** | Return assembly per entity type (Individual, Company, Trust, Partnership), BAS/IAS, PDF export | Storage Adapter (read-only); `lib/tax/` engine |
| **Wizard** | Year-end guided workflow: step sequencing, anomaly flagging, CoA mapping review | Ledger + Tax components via shared state/context |
| **Storage Adapter** | Unified read/write interface; switches between LocalAdapter (IndexedDB) and ServerAdapter (HTTP) at startup | IndexedDB (local) or Express server (remote) |
| **`lib/tax/`** | Pure functions: label rollup, GST calc, BAS aggregation, tax bracket math. No React, no I/O | Called by Tax components and tests |
| **`lib/period/`** | Financial year / quarter / custom range logic, AU FY calendar (1 Jul – 30 Jun) | Called by Ledger and Tax |
| **`lib/schema/`** | Zod (or hand-rolled) runtime validators for all domain types; migration helpers | Called by Storage Adapter on read, called by server on receipt |
| **Server (optional)** | REST API over SQLite; Gemini proxy; optional PIN auth; multi-client workspace | React SPA (via ServerAdapter); SQLite file |
| **`server/db/`** | better-sqlite3 client, migration runner, typed query functions | Called by server routes only |

---

## Recommended Project Structure

```
AussieLedger/
├── src/                          # React SPA (unchanged entry point)
│   ├── main.tsx
│   ├── App.tsx                   # Slimmed shell orchestrator (target: ~200 lines)
│   ├── index.css
│   ├── types.ts                  # Shared domain types (keep, extend)
│   ├── constants.ts              # CoA defaults, tax labels, GST codes (keep, expand)
│   │
│   ├── lib/
│   │   ├── utils.ts              # cn() — keep
│   │   ├── tax/
│   │   │   ├── individual.ts     # Individual return label rollup
│   │   │   ├── company.ts        # Company return label rollup
│   │   │   ├── trust.ts          # Trust return label rollup
│   │   │   ├── partnership.ts    # Partnership return label rollup
│   │   │   ├── bas.ts            # BAS / IAS aggregation
│   │   │   └── index.ts          # Re-exports
│   │   ├── period.ts             # AU FY, quarter, custom range helpers
│   │   └── schema.ts             # Runtime type validators
│   │
│   ├── storage/
│   │   ├── adapter.ts            # StorageAdapter interface
│   │   ├── local.ts              # IndexedDB implementation
│   │   └── server.ts             # HTTP fetch implementation
│   │
│   ├── hooks/
│   │   ├── useEntities.ts
│   │   ├── useJournals.ts
│   │   ├── useAccounts.ts
│   │   └── useAppMode.ts         # consumer | agent preference
│   │
│   └── components/
│       ├── shell/
│       │   ├── Sidebar.tsx
│       │   ├── BottomNav.tsx
│       │   └── Header.tsx
│       ├── ledger/
│       │   ├── JournalForm.tsx
│       │   ├── JournalList.tsx
│       │   ├── AccountManager.tsx
│       │   └── TrialBalance.tsx
│       ├── tax/
│       │   ├── IndividualReturn.tsx
│       │   ├── CompanyReturn.tsx
│       │   ├── TrustReturn.tsx
│       │   ├── PartnershipReturn.tsx
│       │   ├── BasIasAssistant.tsx
│       │   └── ReturnExport.tsx  # PDF / print
│       ├── wizard/
│       │   └── YearEndWizard.tsx
│       └── shared/               # EntityForm, AuditTrail, ImportTB, etc.
│
├── server/                       # Optional Node server (new)
│   ├── index.ts                  # Express entry; binds to configurable port
│   ├── auth.ts                   # Optional PIN/passphrase gate
│   ├── routes/
│   │   ├── entities.ts
│   │   ├── journals.ts
│   │   ├── accounts.ts
│   │   ├── audit.ts
│   │   └── ai.ts                 # Gemini proxy (reads key from env, never sent to browser)
│   └── db/
│       ├── client.ts             # better-sqlite3 singleton
│       ├── migrations/
│       │   └── 001_initial.sql
│       └── queries/              # Typed query wrappers per domain
│
├── data/                         # Gitignored; SQLite lives here
│   └── .gitkeep
│
├── tests/
│   ├── lib/tax/                  # Pure function tests (Vitest)
│   ├── lib/period.test.ts
│   ├── storage/                  # Adapter tests (mock DB)
│   └── components/               # RTL integration tests
│
└── vite.config.ts                # Add server proxy for /api when VITE_API_URL set
```

---

## Persistence Layer: Recommendation and Rationale

### Candidates Evaluated

**Option A: File System Access API (browser, no server)**

The FSA API lets the browser read/write a local JSON file the user picks. Keeps the "zero-server" shape.

- No install friction. User points to a `.json` or `.sqlite3` file.
- Requires user gesture to re-grant permission each session (Chrome/Edge) — annoying for daily use.
- No WAL, no transactions, no concurrent access.
- Not supported in Firefox at all (as of mid-2025). Self-hosters may use Firefox.
- Schema migration requires custom hand-rolled logic.
- Cannot support the small-firm shape (VPS + multiple browser clients).
- **Verdict: eliminates itself due to Firefox gap and session-permission friction.**

**Option B: IndexedDB with mandatory JSON export on every write**

Keeps the no-server constraint. Export is the durability guarantee.

- Works in all browsers.
- Survives cache clears only if the user exports and keeps the file — this is not "durable" by default; it's "durable if the user remembers."
- IndexedDB has no SQL, no schema enforcement, weak query capability. Joins across entities/journals require in-memory JS.
- Migration tooling (e.g. `idb`) is workable but not as mature as SQL migration runners.
- Still cannot support the shared-VPS shape.
- Acceptable for a pure offline personal-use v0 but inadequate for the stated v1 goals.
- **Verdict: acceptable stopgap only; not the v1 persistence story.**

**Option C: WASM SQLite in the browser (sql.js / wa-sqlite / OPFS-backed)**

Runs SQLite entirely in-browser using WebAssembly. OPFS backend makes it durable without a server.

- True SQL in the browser: joins, aggregates, full schema, migrations.
- OPFS (Origin Private File System) makes it persistent across page reloads without user interaction.
- Initial WASM load is 700–900 KB (sql.js) or ~350 KB (wa-sqlite). Adds cold-start latency.
- OPFS access requires cross-origin isolation headers (`COOP`/`COEP`) — non-trivial to configure on a VPS or when embedded.
- Debugging/inspection requires custom tooling; SQLite file is not a normal file the user can open.
- Still cannot support concurrent access from multiple browser tabs (write locking).
- Multi-client VPS shape would need a server anyway; WASM SQLite just postpones the problem.
- **Verdict: compelling for single-user offline-first, but the cross-origin header requirement on VPS and the inability to share data across clients makes it a poor fit for both deployment shapes with one codebase.**

**Option D (RECOMMENDED): Thin Node/Express + better-sqlite3 server with IndexedDB fallback**

A small `server/` directory (Express + better-sqlite3) that the user can run alongside the SPA. The React app auto-detects whether a server is present at startup:

```
GET /api/health → 200   →  use ServerAdapter (HTTP → SQLite)
GET /api/health → fail  →  use LocalAdapter  (IndexedDB, degraded but functional)
```

Why this wins:

- `better-sqlite3` is synchronous, zero-config, single-file, no managed cloud, no daemon. `npm install && node server/index.js` is all it takes.
- SQLite schema migrations via a simple numbered `.sql` runner (no ORM needed at this scale).
- Supports the small-firm shape natively: run `node server/index.js` on a VPS, multiple accountant browsers connect to the same `/api`. SQLite WAL mode handles concurrent reads; writes serialize correctly.
- Keeps the Gemini key server-side permanently; the AI route is just another Express handler.
- The `express` dependency is already in `package.json` (installed but unused) — this is the intended architecture that was never built.
- The `LocalAdapter` (IndexedDB) is the fallback for the zero-server case (`npm run dev` with no server started), making "just run the front end" still work for evaluation and light use.
- Schema is a normal `.db` file the user can back up, inspect with DB Browser for SQLite, or export via the app's export route.

Single-user shape: `npm run dev` starts Vite dev server + `node server/index.js` (or a combined `concurrently` script). In production: `npm run build` → serve `dist/` statically + run the server process.

Small-firm shape: VPS runs the server (`node server/index.js --port 4000`), nginx proxies `/api` to it and serves the static `dist/` on port 443. Auth is a simple passphrase PIN stored as a hashed env var.

**Confidence: HIGH.** This pattern (Vite SPA + thin Express + better-sqlite3) is standard for self-hosted TypeScript tooling. The express+tsx+better-sqlite3 trio runs on Node 18+ with no native compilation issues on Linux/macOS/Windows.

---

## Data Flow

### Startup (adapter selection)

```
main.tsx renders <App>
    ↓
StorageAdapter.init()
    ↓ (race: GET /api/health, timeout 500ms)
    ├── success → ServerAdapter.connect()   → all reads/writes go to /api
    └── failure → LocalAdapter.connect()    → all reads/writes go to IndexedDB
```

### Journal Entry Write Path (server shape)

```
User fills JournalForm
    ↓
JournalForm validates (debits = credits, schema.validateEntry())
    ↓
useJournals.save(entry)
    ↓
ServerAdapter.write("journals", { entityId, entry })
    ↓
POST /api/entities/:id/journals
    ↓
server/db/queries/journals.ts → better-sqlite3 → ledger.db (WAL mode)
    ↓
200 { id, createdAt }
    ↓
useJournals updates local React state (optimistic UI pattern)
    ↓
AuditLog appended (server-side, same transaction)
```

### Tax Return Assembly

```
User opens a Tax Return component
    ↓
useJournals.forPeriod(entityId, fyStart, fyEnd) → filtered journal lines
    ↓
lib/tax/{entityType}.rollup(lines, accounts) → label-keyed totals map
    ↓
ReturnComponent renders label rows from totals map
    ↓
ReturnExport.toPDF() → react-pdf or jsPDF → browser download
```

Tax assembly is **read-only and stateless** — it derives from journal data, never persists its own state. This is the critical invariant that makes tax math testable as pure functions.

### Consumer vs Agent Mode

```
App reads useAppMode() → 'consumer' | 'agent' (persisted preference)
    ↓
'consumer': Shell shows single-entity nav, wizard-first entry points, guided labels
'agent':    Shell shows master client dashboard, bulk tools, compact data-dense views
```

Both modes read/write identical underlying data. Mode is a rendering concern only.

---

## Deployment Topology

### Shape 1: Single-user local (developer / owner self-host)

```
Laptop
├── npm run dev  (Vite dev server :3000)
├── node server/index.js  (Express :4000)
└── data/ledger.db  (SQLite file, local disk)

Browser → http://localhost:3000
Vite proxies /api/* → http://localhost:4000
```

Production variant (no dev server):
```
npm run build → dist/
node server/index.js --serve-static dist/ --port 3000
# Single process serves static files + API
Browser → http://localhost:3000
```

### Shape 2: Small-firm shared VPS

```
VPS (Ubuntu, 1 GB RAM sufficient)
├── pm2 / systemd: node server/index.js --port 4000
├── nginx: / → dist/ static, /api → :4000 proxy
├── data/ledger.db  (on VPS persistent disk)
└── Optional: PIN auth middleware (env: APP_PIN_HASH)

Tax agent's browser → https://ledger.firm.example
Client browser (supervised session) → same URL
```

No Docker required (though a `Dockerfile` is a good addition for reproducibility). No managed cloud services. Backup = `cp data/ledger.db data/ledger.db.bak` on a cron.

Multi-client data isolation in the shared shape uses the existing multi-entity model: each client is an `Entity`. The tax agent mode's master dashboard is the client switcher. No multi-tenant auth needed — a single passphrase gates the instance.

---

## Migration Path: localStorage SPA → Target Architecture

This is a **six-step brownfield migration**, designed to keep the app working and visually unchanged at every step. No step requires a full rewrite.

### Step 0 (Pre-condition) — Stabilize the shell before touching storage

Before changing anything structural, extract custom hooks from `App.tsx` so state transitions are explicit:

```
src/hooks/useEntities.ts      ← lift from App.tsx state + effects
src/hooks/useJournals.ts      ← lift from App.tsx state + effects
src/hooks/useAccounts.ts      ← lift from App.tsx state + effects
```

`App.tsx` becomes a thin orchestrator (~200 lines) wiring hooks to view routing. The visual shell is untouched. This is safe to do with no behavior change.

### Step 1 — Centralize tax math (blocks Step 4, but independent of storage)

Extract duplicated label-aggregation logic from the four tax components into `src/lib/tax/`. Each component becomes a view layer that calls `rollup()`. Write Vitest unit tests for each rollup function. This step is independent of storage and can run in parallel with Step 2.

### Step 2 — Introduce the Storage Adapter interface

Add `src/storage/adapter.ts` defining the interface. Implement `LocalAdapter` wrapping the existing `localStorage` logic (literal refactor, no behavior change). Wire `App.tsx` (or the new hooks) to call `adapter.read/write` instead of `localStorage` directly.

At this point the app works identically, but persistence is behind an interface.

### Step 3 — Swap LocalAdapter internals to IndexedDB

Replace `localStorage` with `idb` (a lightweight IndexedDB wrapper) inside `LocalAdapter`. Run the existing manual smoke tests. App still has no server dependency. This is the durability improvement for the no-server shape — IndexedDB is not cleared when the user clears "cookies and cached images"; only "all site data" removes it.

Add a one-time migration: on first load, if `localStorage` has data and IndexedDB is empty, copy it across, then clear `localStorage`.

### Step 4 — Build the server and ServerAdapter

```
server/
├── index.ts
├── db/client.ts          (better-sqlite3 singleton, WAL enabled)
├── db/migrations/001.sql (CREATE TABLE entities, accounts, journals, audit_logs)
└── routes/               (entities, journals, accounts, ai)
```

`ServerAdapter` calls these routes. The startup probe (`GET /api/health`) selects which adapter to use.

At this point: `npm run dev` (no server) → IndexedDB. `npm run dev:full` (Vite + server) → SQLite. Both work.

### Step 5 — Add server-side AI proxy

Move `@google/genai` calls from `ImportTB.tsx` and `SlideGenerator.tsx` (to be removed) into `server/routes/ai.ts`. The front end calls `/api/ai/match-accounts`. The API key lives in `server/.env`, never in the bundle. `SlideGenerator.tsx` is deleted (out of scope).

### Step 6 — Multi-client workspace shape and agent mode

Add the `useAppMode` hook and the agent-mode master dashboard view. The underlying data model is already multi-entity; this step is purely a rendering/UX layer on top of the established architecture.

---

## Key Architectural Patterns

### Pattern 1: Storage Adapter Interface

**What:** A thin interface in front of all persistence. Components and hooks never call `localStorage`, `indexedDB`, or `fetch` directly — they call `adapter.read(query)` and `adapter.write(mutation)`.

**Why:** Makes the IndexedDB → SQLite migration a single file swap. Enables testing with an in-memory `MockAdapter`. Prevents the "storage leak" pattern where a component starts writing to localStorage directly.

**Interface shape:**
```typescript
interface StorageAdapter {
  getEntities(): Promise<Entity[]>
  saveEntity(e: Entity): Promise<void>
  getJournals(entityId: string): Promise<JournalEntry[]>
  saveJournal(entityId: string, j: JournalEntry): Promise<void>
  getAccounts(entityId: string): Promise<Account[]>
  saveAccount(entityId: string, a: Account): Promise<void>
  getAuditLogs(entityId: string): Promise<AuditLog[]>
  exportAll(): Promise<string>   // JSON dump for backup
}
```

### Pattern 2: Pure Tax Engine in lib/tax/

**What:** All tax math (label rollup, GST calc, BAS aggregation, bracket math) lives in pure TypeScript functions with no React imports, no side effects, no I/O.

**Why:** Testable with Vitest without a DOM. A fix to, e.g., the 1A GST calculation propagates to all four entity-type components automatically. Tax law updates are localized to one file per return type.

```typescript
// lib/tax/bas.ts
export function rollupBAS(
  lines: JournalLine[],
  accounts: Account[],
  period: DateRange
): BASLabels { ... }
```

### Pattern 3: Schema-versioned SQLite Migrations

**What:** Each breaking change to the data schema gets a numbered `.sql` file in `server/db/migrations/`. The server runs them in order on startup and tracks the current version in a `schema_version` table.

**Why:** Self-hosters upgrading from v1.0 to v1.1 run `git pull && node server/index.js` and the migration runs automatically. No manual "ALTER TABLE" instructions in a README.

### Pattern 4: Optimistic UI with Server Confirmation

**What:** On write, update local React state immediately (optimistic), then fire the API call. On failure, roll back the local state and surface the error.

**Why:** Keeps the UI snappy on localhost. Consistent with how the app currently works (state mutation → `useEffect` persists). The async persistence just becomes explicit.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Shared Mutable State Across Components via App.tsx Props

**What:** Continuing to pass all state down as props from App.tsx.
**Why bad:** App.tsx becomes a 2000-line god component. Every new feature requires threading props through the entire tree.
**Instead:** Lift state to hooks (`useJournals`, `useEntities`, `useAccounts`). Components import the hook directly. App.tsx coordinates routing only.

### Anti-Pattern 2: Tax Logic Inside Components

**What:** Each tax return component contains its own `useMemo(() => lines.reduce(...), [entries])` rollup logic.
**Why bad:** Four places to fix a GST calculation error. Divergence is inevitable. Untestable without rendering.
**Instead:** Components call `lib/tax/{type}.rollup()`. Components are thin render layers.

### Anti-Pattern 3: Migration-Less Schema Changes

**What:** Changing the shape of `Entity` or `JournalEntry` in `types.ts` without a migration.
**Why bad:** Existing users' data silently breaks deserialization. localStorage prototype already has this risk.
**Instead:** Every type change that affects persisted fields gets a versioned migration and a runtime validator that detects old shapes and upgrades them.

### Anti-Pattern 4: Per-Entity CoA Forks Without a Base Template

**What:** Each entity starts with a fully independent copy of the chart of accounts, and changes to the default CoA never propagate.
**Why bad:** A 150-account default CoA copied 20 times for a tax agent's clients is 3000 rows. CoA maintenance becomes manual per-client work.
**Instead:** Accounts are either "default" (owned by a template) or "override" (entity-specific). The default CoA ships as a migration seed. Entities inherit defaults and can add/override.

### Anti-Pattern 5: Direct ATO Connectivity Theatre

**What:** Fake "Connected to ATO (Simulated)" UI chrome.
**Why bad:** Misleading. Creates expectation of real ATO integration that does not and will not exist in v1.
**Instead:** Remove entirely. Replace with a clear disclaimer that outputs are working papers for manual lodgement.

---

## Build Order (accounts for brownfield start)

The order is driven by three constraints:
1. The storage adapter must exist before the server can replace it.
2. Tax math must be pure functions before tax return components can be tested.
3. The visual shell must keep working at every step.

```
Phase 1 — Safety net (unblocks everything)
  1a. Vitest + React Testing Library setup
  1b. CI: npm run lint + npm run test on every push

Phase 2 — Decompose App.tsx (unblocks Steps 3–6 of migration)
  2a. Extract useEntities, useJournals, useAccounts hooks
  2b. Extract shell components (Sidebar, Header, BottomNav)
  2c. Move tax components into src/components/tax/

Phase 3 — Centralize tax math (independent, can overlap Phase 2)
  3a. lib/tax/{individual,company,trust,partnership,bas}.ts
  3b. Unit tests for each rollup function
  3c. Refactor components to call lib/tax/* (visual output unchanged)

Phase 4 — Storage Adapter + IndexedDB (persistence durability)
  4a. StorageAdapter interface
  4b. LocalAdapter wrapping localStorage (no-op refactor)
  4c. Swap LocalAdapter internals to IndexedDB + one-time migration
  4d. Export/import JSON backup

Phase 5 — Server + SQLite (enables small-firm shape + AI proxy)
  5a. server/ scaffold: Express + better-sqlite3 + migrations
  5b. ServerAdapter (HTTP)
  5c. Startup adapter probe
  5d. AI proxy route; remove key from client bundle

Phase 6 — Product features (tax returns, wizard, extended CoA)
  Built on stable foundations from Phases 1–5.
  Each return type, wizard step, and CoA expansion is a feature sprint
  without touching infrastructure.
```

---

## Scaling Considerations

This is a self-hosted tool. "Scale" means: grows gracefully as data volume increases within a single firm, not multi-tenant SaaS scale.

| Concern | Now | At 1 entity / 1000 entries | At 20 clients / 50k entries |
|---------|-----|---------------------------|------------------------------|
| Storage | localStorage (5 MB cap) | IndexedDB (no practical cap) | SQLite (handles millions of rows trivially) |
| Query speed | In-memory JS filter | In-memory JS filter still fine | SQLite indexes on entity_id + date; sub-millisecond |
| Memory | All entries in React state | Paginate journal list (virtual scroll) | Load per-entity on demand; never load all 50k |
| Concurrent users | 1 | 1 | 2–5 (WAL mode handles concurrent reads; serial writes) |
| Backup | None | Manual JSON export | Nightly `cp ledger.db ledger.db.bak` cron |

The first real bottleneck is the React state holding all journal entries for all entities in memory simultaneously. The fix is lazy loading per entity (load entries when an entity is activated, discard when switched away). This is a hook-level change, not an architecture change.

---

## Sources

- Codebase analysis: `src/App.tsx` (1,126 lines), `src/types.ts`, `src/constants.ts`, `package.json` — direct inspection, HIGH confidence
- `.planning/codebase/CONCERNS.md` — direct inspection, HIGH confidence
- `.planning/PROJECT.md` — direct inspection, HIGH confidence
- better-sqlite3 architecture pattern: well-established for Node self-hosted tooling; synchronous API is the deliberate design choice for single-process use — HIGH confidence (training data, widely documented)
- IndexedDB durability semantics vs localStorage: browser-clearing behaviour is documented in MDN and Chromium spec — HIGH confidence
- WASM SQLite COEP/COOP requirement: `SharedArrayBuffer` dependency for OPFS worker requires cross-origin isolation headers — HIGH confidence (known platform constraint)
- Express + better-sqlite3 + Vite proxy pattern: standard for local-first TypeScript apps — HIGH confidence

---

*Architecture research for: AussieLedger (brownfield React SPA → thin-server + durable persistence)*
*Researched: 2026-05-10*
