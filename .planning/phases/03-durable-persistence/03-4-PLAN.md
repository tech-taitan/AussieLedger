---
phase: 03-durable-persistence
plan: 4
type: execute
wave: 3
depends_on: [2, 3]
files_modified:
  - src/components/DataPage.tsx
  - src/components/AdapterFallbackBanner.tsx
  - src/components/__tests__/DataPage.test.tsx
  - src/components/shell/Sidebar.tsx
  - src/components/shell/MainLayout.tsx
  - src/components/ViewRouter.tsx
  - src/types.ts
  - vite.config.ts
  - scripts/test-dev-full.mjs
  - README.md
autonomous: false
requirements:
  - FND-02
  - FND-03
  - DEP-02
must_haves:
  truths:
    - "DataPage exists at view='data'; reachable from a Sidebar 'Data' nav entry"
    - "DataPage shows current adapter kind ('Local (IndexedDB)' or 'Server (SQLite)'), current schema version, and last-export timestamp (or empty-state)"
    - "Export button downloads aussieledger-YYYY-MM-DD-HHmm.json containing the full PersistedRoot"
    - "Import file picker reads JSON, runs through migrate(), and either auto-imports (empty instance) or requires user to type literal 'REPLACE' (case-sensitive)"
    - "Refusing import where _v > CURRENT_VERSION surfaces MigrationError-style alert"
    - "vite.config.ts has server.proxy['/api'] -> 'http://localhost:4000'"
    - "scripts/test-dev-full.mjs boots dev:full, hits /api/health, exits 0"
    - "README documents both deployment shapes (npm run dev IDB / npm run dev:full SQLite), Windows VS Build Tools prereq, and data/ gitignore"
    - "Adapter-fallback banner renders inside MainLayout when getFellBackToLocal() === true ('Server unreachable — running in local mode'); dismissible per session; does NOT render on clean local-only boot (storageMode='local' override or no probe attempted)"
    - "Phase 3 visual sweep: app boots, all views work, no console errors"
  artifacts:
    - path: "src/components/DataPage.tsx"
      provides: "Export/Import UI + status line; sits at view='data'"
      contains: "Export"
    - path: "src/components/AdapterFallbackBanner.tsx"
      provides: "Top-of-app banner; reads getAdapterKind() + getFellBackToLocal() from src/storage; dismissible (session-only); only renders when fallback occurred"
      contains: "Server unreachable"
    - path: "src/components/shell/MainLayout.tsx"
      provides: "Renders <AdapterFallbackBanner /> above the main content area"
      contains: "AdapterFallbackBanner"
    - path: "src/components/shell/Sidebar.tsx"
      provides: "Adds 'Data' NavButton between Master Dashboard and System Audit"
      contains: "'data'"
    - path: "src/components/ViewRouter.tsx"
      provides: "Routes view='data' to <DataPage />"
      contains: "DataPage"
    - path: "src/types.ts"
      provides: "View union widened to include 'data'"
      contains: "| 'data'"
    - path: "vite.config.ts"
      provides: "server.proxy['/api'] -> http://localhost:4000"
      contains: "/api"
    - path: "scripts/test-dev-full.mjs"
      provides: "Integration smoke (already created in Plan 03-1; ensure passes now)"
      contains: "/api/health"
    - path: "README.md"
      provides: "Phase 3 deployment shapes documentation"
      contains: "npm run dev:full"
  key_links:
    - from: "src/components/DataPage.tsx"
      to: "src/storage/index.ts"
      via: "getAdapter() + getAdapterKind() + getCachedHealth()"
      pattern: "getAdapter|getAdapterKind"
    - from: "src/components/AdapterFallbackBanner.tsx"
      to: "src/storage/index.ts"
      via: "getAdapterKind() + getFellBackToLocal()"
      pattern: "getFellBackToLocal"
    - from: "src/components/shell/MainLayout.tsx"
      to: "src/components/AdapterFallbackBanner.tsx"
      via: "rendered above main content"
      pattern: "AdapterFallbackBanner"
    - from: "src/components/shell/Sidebar.tsx"
      to: "view: 'data'"
      via: "setView('data')"
      pattern: "setView\\('data'\\)"
    - from: "src/components/ViewRouter.tsx"
      to: "src/components/DataPage.tsx"
      via: "case 'data': return <DataPage ... />"
      pattern: "DataPage"
    - from: "vite.config.ts"
      to: "http://localhost:4000"
      via: "server.proxy"
      pattern: "proxy"
    - from: "scripts/test-dev-full.mjs"
      to: "/api/health"
      via: "fetch poll loop"
      pattern: "/api/health"
---

<objective>
Land the Data page UI (Export, Import with REPLACE confirmation, status line), wire the "Data" sidebar nav entry, hook ViewRouter to render it, add the Vite `/api` proxy, ensure `npm run dev:full` integration smoke passes, document both deployment shapes in README, AND implement the adapter-fallback banner ("Server unreachable — running in local mode") (W5) so users notice when the probe was attempted and fell back. After this plan, Phase 3 success criterion #2 (prominent Export action) and #3 (Import on fresh instance) are visible end-to-end.

Purpose: Closes the user-facing surface for FND-02 (export) and FND-03 (import), finalises the dual-deployment story by wiring the Vite proxy and integration test, AND closes the CONTEXT.md "fallback is silent + audible" gap by rendering the banner promised in CONTEXT line 52 and listed in VALIDATION.md line 108.

Output:
- `src/components/DataPage.tsx` (~250 lines: layout, Export button, Import file picker, REPLACE confirmation dialog, status line)
- `src/components/AdapterFallbackBanner.tsx` (~60 lines: dismissible banner reading getFellBackToLocal())
- `src/components/__tests__/DataPage.test.tsx` widened tests GREEN
- `src/components/shell/MainLayout.tsx` renders AdapterFallbackBanner
- `src/components/shell/Sidebar.tsx` adds Data nav entry
- `src/components/ViewRouter.tsx` routes 'data' -> DataPage
- `src/types.ts` View union widened
- `vite.config.ts` adds server.proxy
- README.md updated
- `node scripts/test-dev-full.mjs` exits 0 (verified manually after server starts)
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/03-durable-persistence/03-CONTEXT.md
@.planning/phases/03-durable-persistence/03-RESEARCH.md
@.planning/phases/03-durable-persistence/03-VALIDATION.md
@.planning/phases/03-durable-persistence/03-2-PLAN.md
@.planning/phases/03-durable-persistence/03-3-PLAN.md
@src/storage/adapter.ts
@src/storage/index.ts
@src/components/shell/Sidebar.tsx
@src/components/shell/MainLayout.tsx
@src/components/ViewRouter.tsx
@src/types.ts
@vite.config.ts
@src/lib/migrations/index.ts
@src/components/MigrationError.tsx

<interfaces>
<!-- Contracts this plan depends on -->

From src/storage/index.ts (Plan 03-2):
```typescript
export function getAdapter(): Promise<StorageAdapter>;
export function getAdapterKind(): 'local' | 'server' | null;
export function getCachedHealth(): HealthResponse | null;
export function getFellBackToLocal(): boolean;  // W5 — banner reads this
```

From src/storage/local.ts (Plan 03-2):
```typescript
// LocalAdapter has these extras for the Data page:
async getLastExportAt(): Promise<string | null>;
async setLastExportAt(iso: string): Promise<void>;
```

From src/lib/migrations/index.ts:
```typescript
export const CURRENT_VERSION = 2;
export function migrate(raw: Record<string, unknown>): PersistedRoot;
```

Sidebar.tsx view type (must widen):
```typescript
// Current src/types.ts View union — need to add 'data':
export type View = 'master-dashboard' | 'audit-trail' | 'dashboard' | 'journals' |
                   'trial-balance' | 'tax-return' | 'company-tax' | 'trust-tax' |
                   'bas-ias' | 'import' | 'entity-form' | 'account-manager' /* | 'data' */;
```

ViewRouter consumes the View union and switches on it.

MainLayout.tsx renders the app shell (header, sidebar, main content). The
AdapterFallbackBanner sits ABOVE the main content area (between header and
the routed view body) so it's visible from every view.

Export filename format (from CONTEXT specifics):
- `aussieledger-{YYYY-MM-DD}-{HHmm}.json`, e.g. `aussieledger-2026-05-11-1430.json`
- Local time

Import confirmation literal:
- `REPLACE` (uppercase, case-sensitive, no partial-match)

Adapter-fallback banner spec (W5, from CONTEXT line 52 + VALIDATION line 108):
- Text: "Server unreachable — running in local mode. Refresh once the server is up."
- Renders only when `getAdapterKind() === 'local'` AND `getFellBackToLocal() === true`
- Does NOT render when:
  - storageMode='local' override was used (no probe = no fallback)
  - getAdapterKind() === 'server' (no need for banner)
  - User dismissed it this session
- Dismissible via a small "x" button. Dismissal is session-state (resets on reload — which is the right thing because the next probe attempt resets the flag).
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Build DataPage.tsx + AdapterFallbackBanner.tsx + add 'data' to View union + wire Sidebar + ViewRouter + MainLayout banner; make DataPage tests GREEN</name>
  <files>src/components/DataPage.tsx, src/components/AdapterFallbackBanner.tsx, src/components/__tests__/DataPage.test.tsx, src/components/shell/Sidebar.tsx, src/components/shell/MainLayout.tsx, src/components/ViewRouter.tsx, src/types.ts</files>
  <read_first>
    - A:/Projects/AussieLedger/src/types.ts (current View union)
    - A:/Projects/AussieLedger/src/components/shell/Sidebar.tsx (current nav structure)
    - A:/Projects/AussieLedger/src/components/shell/MainLayout.tsx (current shell layout; identify the spot above main content where the banner should mount)
    - A:/Projects/AussieLedger/src/components/ViewRouter.tsx (view switch)
    - A:/Projects/AussieLedger/src/components/MigrationError.tsx (for newer-version refuse path)
    - A:/Projects/AussieLedger/src/lib/migrations/index.ts (migrate + CURRENT_VERSION)
    - A:/Projects/AussieLedger/src/storage/index.ts (getAdapter, getAdapterKind, getCachedHealth, getFellBackToLocal)
    - A:/Projects/AussieLedger/src/storage/local.ts (LocalAdapter.getLastExportAt/setLastExportAt — exists if adapter is local)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md "Export / Import" section (filename, payload, REPLACE) AND line 52 (fallback banner spec)
    - A:/Projects/AussieLedger/src/components/__tests__/DataPage.test.tsx (skeleton from Plan 03-1 - widen)
    - A:/Projects/AussieLedger/.planning/codebase/CONVENTIONS.md (Tailwind + lucide-react + component patterns)
  </read_first>
  <behavior>
    - src/types.ts View union includes 'data'
    - Sidebar adds a NavButton with label "Data", icon from lucide (HardDriveDownload), placed between Master Dashboard and System Audit; clicking sets view='data'
    - ViewRouter renders <DataPage /> for view='data'
    - DataPage renders:
      - Header: "Data Management"
      - Status panel: Adapter ("Local (IndexedDB)" / "Server (SQLite)"), Schema Version (CURRENT_VERSION), Last Export ("Never" or formatted ISO)
      - Export button: triggers download of full PersistedRoot as JSON; filename aussieledger-YYYY-MM-DD-HHmm.json (LOCAL time)
      - Import section: file input + confirmation dialog
        - On file selection: parse JSON, run through migrate() to get migrated state
        - If migrate() throws because _v > CURRENT_VERSION: render MigrationError-style inline alert ("Cannot import: file is from a newer version")
        - If existing data is non-empty: show modal with text field; user must type literal "REPLACE" (case-sensitive) before "Confirm" enables
        - If empty: show single-tap "Confirm import" button
        - On confirm: call adapter.importAll(migrated), then refresh status line
    - AdapterFallbackBanner:
      - Reads `getAdapterKind()` + `getFellBackToLocal()` (both module-level functions; safe to call from useEffect)
      - Renders ONLY when `getAdapterKind() === 'local'` AND `getFellBackToLocal() === true`
      - Shows text: "Server unreachable — running in local mode. Refresh once the server is up."
      - Has a small dismiss button (lucide `X`) that hides the banner for the rest of the session (component-local `dismissed` state)
      - Does NOT poll — it's a one-shot read at mount because the flag only changes via `_resetAdapter() + initAdapter()` which is a page reload in practice
    - MainLayout renders <AdapterFallbackBanner /> immediately inside its main content wrapper, above the routed view body
    - All DataPage tests in src/components/__tests__/DataPage.test.tsx GREEN
    - 200+ existing tests still pass; lint clean
  </behavior>
  <action>
    Step 1 - Widen `src/types.ts` View union. Find the current `View` type definition (likely 1 line) and add `'data'`. Example (your union may have different members; do not invent; only ADD `'data'` to whatever exists):
    ```typescript
    export type View =
      | 'master-dashboard'
      | 'audit-trail'
      | 'data'              // <-- ADDED in Phase 3 Plan 03-4
      | 'dashboard'
      | 'journals'
      | 'trial-balance'
      | 'tax-return'
      | 'company-tax'
      | 'trust-tax'
      | 'bas-ias'
      | 'import'
      | 'entity-form'
      | 'account-manager';
    ```
    Open src/types.ts first, locate the actual View definition, add 'data' to it. Do NOT change other view names. If the View union is named differently (e.g. ViewName), update it. The test file already references 'data' implicitly via routing.

    Step 2 - Update `src/components/shell/Sidebar.tsx` to add the Data nav entry. Add a new NavButton:

    Add `HardDriveDownload` to the lucide imports.

    Add a new NavButton inside the `<nav>` immediately after the "System Audit" button (line ~118 in current file):
    ```tsx
              <NavButton
                active={view === 'data'}
                onClick={() => setView('data')}
                icon={<HardDriveDownload size={18} />}
                label="Data"
              />
    ```

    Step 3 - Update `src/components/ViewRouter.tsx` to route view='data' to <DataPage />. Add an import at the top:
    ```typescript
    import { DataPage } from './DataPage';
    ```
    Add a case in the view switch (alongside the other view cases):
    ```tsx
        case 'data':
          return <DataPage />;
    ```
    (The exact pattern depends on the current ViewRouter switch structure; replicate the surrounding pattern.)

    Step 4 - **W5: Create `src/components/AdapterFallbackBanner.tsx`**. Reads `getAdapterKind()` + `getFellBackToLocal()` at mount and renders the "Server unreachable" banner ONLY when fallback occurred. Dismissible per-session:
    ```tsx
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * W5 — Adapter-fallback banner.
     *
     * Renders ONLY when the probe was attempted AND exhausted (i.e.
     * `getFellBackToLocal() === true`). On a clean local-only boot
     * (storageMode='local' override or no probe attempted) this is silent.
     *
     * Dismissal is session-state — the next page reload re-checks the flag.
     */
    import React, { useEffect, useState } from 'react';
    import { X, AlertTriangle } from 'lucide-react';
    import { getAdapterKind, getFellBackToLocal } from '../storage';

    export const AdapterFallbackBanner: React.FC = () => {
      // Read once at mount. The flag only changes via _resetAdapter() + initAdapter(),
      // which in practice means a page reload.
      const [show, setShow] = useState<boolean>(() => {
        return getAdapterKind() === 'local' && getFellBackToLocal();
      });

      // Re-check after first paint in case the adapter init resolved later than render.
      useEffect(() => {
        if (getAdapterKind() === 'local' && getFellBackToLocal()) {
          setShow(true);
        }
      }, []);

      if (!show) return null;

      return (
        <div
          role="alert"
          className="flex items-start gap-3 bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-2 text-sm"
          data-testid="adapter-fallback-banner"
        >
          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="font-semibold">Server unreachable</strong>
            &nbsp;— running in local mode. Refresh once the server is up.
          </div>
          <button
            onClick={() => setShow(false)}
            className="shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Dismiss banner"
            data-testid="adapter-fallback-dismiss"
          >
            <X size={16} />
          </button>
        </div>
      );
    };
    ```

    Step 5 - **W5: Wire the banner into MainLayout.** Open `src/components/shell/MainLayout.tsx`. Add the import:
    ```typescript
    import { AdapterFallbackBanner } from '../AdapterFallbackBanner';
    ```
    Then locate the main content area (the JSX region that wraps `{children}` — typically a `<main>` or content `<div>` after the header/sidebar). Insert `<AdapterFallbackBanner />` immediately above the children render, so the banner shows on EVERY view (not just the Data page). Example (adapt to whatever the current structure is):
    ```tsx
    {/* ...header, sidebar, etc. ... */}
    <main className="..." /* existing classes */>
      <AdapterFallbackBanner />
      {children}
    </main>
    ```
    Keep all existing MainLayout props and structure intact — this is an additive change.

    Step 6 - Create `src/components/DataPage.tsx`:
    ```tsx
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import React, { useEffect, useState, useRef } from 'react';
    import { Download, Upload, AlertTriangle, HardDriveDownload, CheckCircle2 } from 'lucide-react';
    import { getAdapter, getAdapterKind } from '../storage';
    import { CURRENT_VERSION, migrate, type PersistedRoot } from '../lib/migrations';

    function fmtFilename(d: Date = new Date()): string {
      const pad = (n: number) => String(n).padStart(2, '0');
      const y = d.getFullYear();
      const mo = pad(d.getMonth() + 1);
      const da = pad(d.getDate());
      const h = pad(d.getHours());
      const mi = pad(d.getMinutes());
      return `aussieledger-${y}-${mo}-${da}-${h}${mi}.json`;
    }

    function fmtTimestamp(iso: string | null): string {
      if (!iso) return 'Never';
      try {
        const d = new Date(iso);
        return d.toLocaleString();
      } catch {
        return iso;
      }
    }

    function adapterLabel(kind: 'local' | 'server' | null): string {
      if (kind === 'server') return 'Server (SQLite)';
      if (kind === 'local') return 'Local (IndexedDB)';
      return 'Unknown';
    }

    export const DataPage: React.FC = () => {
      const [kind, setKind] = useState<'local' | 'server' | null>(null);
      const [lastExport, setLastExport] = useState<string | null>(null);
      const [migrationError, setMigrationError] = useState<string | null>(null);
      const [confirmText, setConfirmText] = useState('');
      const [pendingImport, setPendingImport] = useState<PersistedRoot | null>(null);
      const [importMessage, setImportMessage] = useState<string | null>(null);
      const [hasExistingData, setHasExistingData] = useState(false);
      const fileInputRef = useRef<HTMLInputElement>(null);

      useEffect(() => {
        let cancelled = false;
        (async () => {
          const k = getAdapterKind();
          if (cancelled) return;
          setKind(k);
          const adapter = await getAdapter();
          // Only LocalAdapter has getLastExportAt; ServerAdapter does not in v1
          const maybe = adapter as unknown as { getLastExportAt?: () => Promise<string | null> };
          if (typeof maybe.getLastExportAt === 'function') {
            const ts = await maybe.getLastExportAt();
            if (!cancelled) setLastExport(ts);
          }
          // Detect non-empty state for confirmation gating
          const [ents, accs, ents2, logs] = await Promise.all([
            adapter.getEntities(), adapter.getAccounts(), adapter.getEntries(), adapter.getAuditLogs(),
          ]);
          if (!cancelled) {
            const nonEmpty = (ents.length > 0) || (accs.length > 0) ||
                             (Object.keys(ents2).length > 0) || (logs.length > 0);
            setHasExistingData(nonEmpty);
          }
        })().catch(err => console.error('DataPage init failed', err));
        return () => { cancelled = true; };
      }, []);

      const handleExport = async () => {
        try {
          const adapter = await getAdapter();
          const snapshot = await adapter.exportAll();
          const json = JSON.stringify(snapshot, null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fmtFilename();
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          const iso = new Date().toISOString();
          const maybeLocal = adapter as unknown as { setLastExportAt?: (iso: string) => Promise<void> };
          if (typeof maybeLocal.setLastExportAt === 'function') {
            await maybeLocal.setLastExportAt(iso);
            setLastExport(iso);
          }
        } catch (err) {
          alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };

      const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMigrationError(null);
        setImportMessage(null);
        try {
          const text = await file.text();
          const raw = JSON.parse(text) as Record<string, unknown>;
          const migrated = migrate(raw);
          setPendingImport(migrated);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('newer than the application version')) {
            setMigrationError(`Cannot import: file is from a newer version (${msg})`);
          } else {
            setMigrationError(`Cannot import: ${msg}`);
          }
        } finally {
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      const confirmImport = async () => {
        if (!pendingImport) return;
        if (hasExistingData && confirmText !== 'REPLACE') return;
        try {
          const adapter = await getAdapter();
          await adapter.importAll(pendingImport);
          setImportMessage('Import succeeded. Refresh the page to see imported data.');
          setPendingImport(null);
          setConfirmText('');
          setHasExistingData(true);
        } catch (err) {
          setMigrationError(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };

      const cancelImport = () => {
        setPendingImport(null);
        setConfirmText('');
      };

      return (
        <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              <HardDriveDownload className="text-blue-600" />
              Data Management
            </h1>
            <p className="text-sm text-gray-500">
              Export your full dataset as JSON or import a previously-exported file.
              Exports include all entities, accounts, journals, and audit logs.
            </p>
          </header>

          <section className="bg-white border border-[var(--line)] p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Status</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">Adapter</dt>
                <dd className="font-medium" data-testid="adapter-kind">{adapterLabel(kind)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Schema Version</dt>
                <dd className="font-medium" data-testid="schema-version">v{CURRENT_VERSION}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Last Export</dt>
                <dd className="font-medium" data-testid="last-export">
                  {lastExport ? fmtTimestamp(lastExport) : 'Never'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="bg-white border border-[var(--line)] p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Export</h2>
            <p className="text-sm text-gray-500">
              Downloads a JSON file containing the complete dataset.
            </p>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 bg-[var(--ink)] text-white px-4 py-2 font-medium hover:opacity-90 transition-opacity"
              data-testid="export-button"
            >
              <Download size={18} />
              Export data
            </button>
          </section>

          <section className="bg-white border border-[var(--line)] p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Import</h2>
            {hasExistingData ? (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  This instance currently contains data. Importing will REPLACE all current data.
                  You will be asked to type "REPLACE" to confirm.
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No existing data on this instance. Import will proceed with a single confirmation.
              </p>
            )}
            <input
              type="file"
              accept=".json,application/json"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              data-testid="import-file-input"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 bg-white border border-[var(--line-strong)] text-[var(--ink)] px-4 py-2 font-medium hover:bg-gray-50 transition-colors"
              data-testid="import-button"
            >
              <Upload size={18} />
              Choose file...
            </button>

            {migrationError && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2" data-testid="migration-error">
                {migrationError}
              </div>
            )}

            {importMessage && (
              <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2" data-testid="import-success">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <span>{importMessage}</span>
              </div>
            )}
          </section>

          {pendingImport && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" data-testid="confirm-dialog">
              <div className="bg-white p-6 max-w-md w-full space-y-4">
                <h3 className="text-lg font-bold">Confirm import</h3>
                {hasExistingData ? (
                  <>
                    <p className="text-sm text-gray-700">
                      This will <strong>REPLACE</strong> all current data in this instance with the contents of the imported file.
                    </p>
                    <p className="text-sm text-gray-700">
                      Type the literal word <code className="px-1 bg-gray-100 font-mono">REPLACE</code> (uppercase) to confirm:
                    </p>
                    <input
                      type="text"
                      value={confirmText}
                      onChange={e => setConfirmText(e.target.value)}
                      className="w-full border border-[var(--line-strong)] px-3 py-2 font-mono text-sm"
                      placeholder="Type REPLACE"
                      data-testid="confirm-text"
                      autoFocus
                    />
                  </>
                ) : (
                  <p className="text-sm text-gray-700">
                    Proceed with import? No existing data will be overwritten.
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={cancelImport}
                    className="px-4 py-2 text-sm font-medium border border-[var(--line-strong)] hover:bg-gray-50"
                    data-testid="cancel-import"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmImport}
                    disabled={hasExistingData && confirmText !== 'REPLACE'}
                    className="px-4 py-2 text-sm font-medium bg-[var(--ink)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    data-testid="confirm-import"
                  >
                    Confirm import
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    };
    ```

    Step 7 - Replace `src/components/__tests__/DataPage.test.tsx` `.todo` with GREEN tests INCLUDING a banner-rendering test (W5):
    ```tsx
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     */
    import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
    import { render, screen, fireEvent, waitFor } from '@testing-library/react';
    import { DataPage } from '../DataPage';
    import { AdapterFallbackBanner } from '../AdapterFallbackBanner';
    import { initAdapter, _resetAdapter } from '../../storage';
    import { CURRENT_VERSION } from '../../lib/migrations';

    beforeEach(async () => {
      _resetAdapter();
      localStorage.clear();
      // Force LocalAdapter path (no /api/health) — probe will throw and fall back.
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('no server'); }));
      await initAdapter();
    });

    afterEach(() => { vi.unstubAllGlobals(); });

    describe('DataPage (FND-02 / FND-03 UI)', () => {
      it('renders Export button', async () => {
        render(<DataPage />);
        expect(await screen.findByTestId('export-button')).toBeInTheDocument();
      });

      it('renders Import file picker', async () => {
        render(<DataPage />);
        expect(await screen.findByTestId('import-button')).toBeInTheDocument();
        expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
      });

      it('shows current adapter kind ("Local (IndexedDB)")', async () => {
        render(<DataPage />);
        const adapter = await screen.findByTestId('adapter-kind');
        expect(adapter).toHaveTextContent('Local (IndexedDB)');
      });

      it('shows current schema version', async () => {
        render(<DataPage />);
        const v = await screen.findByTestId('schema-version');
        expect(v).toHaveTextContent(`v${CURRENT_VERSION}`);
      });

      it('shows "Never" empty-state for last-export', async () => {
        render(<DataPage />);
        const ts = await screen.findByTestId('last-export');
        expect(ts).toHaveTextContent('Never');
      });

      it('import on empty: single confirmation, then importAll fires', async () => {
        render(<DataPage />);
        const fileInput = await screen.findByTestId('import-file-input');
        const file = new File(
          [JSON.stringify({ _v: CURRENT_VERSION, entities: [], accounts: [], allEntries: {}, auditLogs: [] })],
          'test.json',
          { type: 'application/json' },
        );
        await waitFor(() => {
          // ensure existing-data probe completed (renders the "no existing data" copy)
          expect(screen.getByText(/No existing data/i)).toBeInTheDocument();
        });
        fireEvent.change(fileInput, { target: { files: [file] } });
        const confirm = await screen.findByTestId('confirm-import');
        // Empty instance: no REPLACE typing required; button is enabled immediately
        expect(confirm).not.toBeDisabled();
        fireEvent.click(confirm);
        await screen.findByTestId('import-success');
      });

      it('REPLACE confirmation required when existing data', async () => {
        // Pre-populate via adapter
        const { getAdapter } = await import('../../storage');
        const a = await getAdapter();
        await a.saveEntities([{ _v: 2, id: 'e1', name: 'Existing', type: 'Company', status: 'Active' }]);

        render(<DataPage />);
        await waitFor(() => {
          expect(screen.getByText(/REPLACE all current data/i)).toBeInTheDocument();
        });
        const fileInput = screen.getByTestId('import-file-input');
        const file = new File(
          [JSON.stringify({ _v: CURRENT_VERSION, entities: [], accounts: [], allEntries: {}, auditLogs: [] })],
          'test.json',
          { type: 'application/json' },
        );
        fireEvent.change(fileInput, { target: { files: [file] } });
        const confirmBtn = await screen.findByTestId('confirm-import');
        expect(confirmBtn).toBeDisabled();
        // Wrong text doesn't enable
        const txt = screen.getByTestId('confirm-text');
        fireEvent.change(txt, { target: { value: 'replace' } });
        expect(confirmBtn).toBeDisabled();
        // Correct uppercase text enables
        fireEvent.change(txt, { target: { value: 'REPLACE' } });
        expect(confirmBtn).not.toBeDisabled();
      });

      it('shows MigrationError when import _v > CURRENT_VERSION', async () => {
        render(<DataPage />);
        const fileInput = await screen.findByTestId('import-file-input');
        const futureFile = new File(
          [JSON.stringify({ _v: CURRENT_VERSION + 1, entities: [], accounts: [], allEntries: {}, auditLogs: [] })],
          'future.json',
          { type: 'application/json' },
        );
        fireEvent.change(fileInput, { target: { files: [futureFile] } });
        const err = await screen.findByTestId('migration-error');
        expect(err.textContent).toMatch(/newer version/);
      });
    });

    describe('AdapterFallbackBanner (W5)', () => {
      it('renders banner when probe attempted and fell back to local', async () => {
        // beforeEach already triggered fall-back via fetch=throw
        render(<AdapterFallbackBanner />);
        const banner = await screen.findByTestId('adapter-fallback-banner');
        expect(banner).toBeInTheDocument();
        expect(banner.textContent).toMatch(/Server unreachable/);
      });

      it('banner is dismissible', async () => {
        render(<AdapterFallbackBanner />);
        const banner = await screen.findByTestId('adapter-fallback-banner');
        expect(banner).toBeInTheDocument();
        const dismiss = screen.getByTestId('adapter-fallback-dismiss');
        fireEvent.click(dismiss);
        await waitFor(() => {
          expect(screen.queryByTestId('adapter-fallback-banner')).not.toBeInTheDocument();
        });
      });

      it('does NOT render when storageMode override forced local (no probe attempted)', async () => {
        // Reset and force local via override (no probe = no fallback)
        _resetAdapter();
        localStorage.setItem('storageMode', 'local');
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ ok: true, version: 2, aiEnabled: false }), { status: 200 })));
        await initAdapter();
        render(<AdapterFallbackBanner />);
        expect(screen.queryByTestId('adapter-fallback-banner')).not.toBeInTheDocument();
      });
    });
    ```

    Step 8 - Verify:
    - `npm run lint` exits 0
    - `npm run test` exits 0 — DataPage tests GREEN, AdapterFallbackBanner tests GREEN, all other tests still GREEN
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test</automated>
  </verify>
  <acceptance_criteria>
    - `src/types.ts` View union contains literal `'data'`
    - `src/components/shell/Sidebar.tsx` contains literal `setView('data')` AND `label="Data"`
    - `src/components/shell/Sidebar.tsx` contains literal `HardDriveDownload` (imported from lucide-react)
    - `src/components/shell/MainLayout.tsx` contains literal `<AdapterFallbackBanner />` (mounted above main content)
    - `src/components/shell/MainLayout.tsx` contains literal `import { AdapterFallbackBanner }`
    - `src/components/ViewRouter.tsx` contains literal `import { DataPage } from './DataPage'`
    - `src/components/ViewRouter.tsx` contains literal `case 'data':` AND `<DataPage`
    - `src/components/AdapterFallbackBanner.tsx` contains literal `Server unreachable` (W5 banner text)
    - `src/components/AdapterFallbackBanner.tsx` contains literal `getFellBackToLocal()` (reads the fallback flag)
    - `src/components/AdapterFallbackBanner.tsx` contains literal `getAdapterKind()`
    - `src/components/DataPage.tsx` contains literal `export const DataPage`
    - `src/components/DataPage.tsx` contains literal `aussieledger-` (filename prefix)
    - `src/components/DataPage.tsx` contains literal `'REPLACE'` (the confirmation literal)
    - `src/components/DataPage.tsx` contains literal `migrate(raw)` (uses migrate() before adapter.importAll)
    - `src/components/DataPage.tsx` contains literal `adapter.importAll`
    - `src/components/DataPage.tsx` contains literal `getAdapterKind`
    - `src/components/DataPage.tsx` contains literal `CURRENT_VERSION`
    - `npx vitest run src/components/__tests__/DataPage.test.tsx -t "import on empty"` exits 0
    - `npx vitest run src/components/__tests__/DataPage.test.tsx -t "REPLACE confirmation"` exits 0
    - `npx vitest run src/components/__tests__/DataPage.test.tsx -t "renders banner when probe attempted"` exits 0
    - `npx vitest run src/components/__tests__/DataPage.test.tsx -t "banner is dismissible"` exits 0
    - `npm run lint` exits 0
    - `npm run test` exits 0
  </acceptance_criteria>
  <done>
    DataPage component fully wired with Export, Import (with REPLACE confirmation), status line, migration-newer refusal; AdapterFallbackBanner implemented (W5) and mounted in MainLayout — renders only on probed-and-fell-back path, dismissible; Sidebar/ViewRouter/types updated to expose the Data page; tests GREEN including 3 banner tests.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Vite /api proxy + dev:full integration smoke + README updates</name>
  <files>vite.config.ts, scripts/test-dev-full.mjs, README.md</files>
  <read_first>
    - A:/Projects/AussieLedger/vite.config.ts (current — must preserve existing define block + alias + hmr)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-RESEARCH.md §3 (Vite proxy snippet)
    - A:/Projects/AussieLedger/scripts/test-dev-full.mjs (created in Plan 03-1)
    - A:/Projects/AussieLedger/README.md (current content; preserve and add Phase 3 deployment sections)
    - A:/Projects/AussieLedger/.planning/phases/03-durable-persistence/03-CONTEXT.md (server scope, env vars, README requirements)
  </read_first>
  <behavior>
    - vite.config.ts adds server.proxy['/api'] -> http://localhost:4000 (changeOrigin: true; ws not set, defaults false)
    - Existing define + alias + hmr blocks preserved
    - scripts/test-dev-full.mjs (which already exists from Plan 03-1) is verified to work: spawns `npm run dev:full`, polls /api/health, kills, exits 0
    - README.md gains:
      - "Deployment shapes" section: documents both `npm run dev` (IDB, no server) and `npm run dev:full` (Vite + Express + SQLite)
      - Production: `npm run build && npm run build:server && npm run start:server`
      - Windows prerequisite for SQLite: Python 3 (Microsoft Store) + Visual Studio Build Tools 2022 with Desktop C++ workload
      - Env vars table: PORT, HOST, DB_PATH, GEMINI_API_KEY
      - "Data durability" section noting IndexedDB survives Clear-Cookies but NOT Clear-Site-Data; SQLite is a file on disk
      - "data/ is gitignored" note
      - "AI features are optional" note (FND-04 already documented; widened to mention server-mode key)
      - Reverse-proxy note for VPS shared-firm shape (caddy/nginx + basic auth or VPN)
  </behavior>
  <action>
    Step 1 - Update `vite.config.ts` to add proxy. The new file:
    ```typescript
    import tailwindcss from '@tailwindcss/vite';
    import react from '@vitejs/plugin-react';
    import path from 'path';
    import { defineConfig, loadEnv } from 'vite';

    export default defineConfig(({ mode }) => {
      const env = loadEnv(mode, '.', '');
      const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';
      return {
        plugins: [react(), tailwindcss()],
        define: {
          'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        },
        resolve: {
          alias: {
            '@': path.resolve(__dirname, '.'),
          },
        },
        server: {
          // HMR is disabled in AI Studio via DISABLE_HMR env var.
          hmr: process.env.DISABLE_HMR !== 'true',
          proxy: {
            // Phase 3: forward /api/* to the Express server (dev:full).
            // When `npm run dev` runs without the server, fetch('/api/health')
            // simply 502s and the adapter probe falls back to LocalAdapter.
            '/api': {
              target: apiTarget,
              changeOrigin: true,
              // ws: NOT enabled - Vite HMR uses its own websocket; do not intercept.
            },
          },
        },
      };
    });
    ```

    Step 2 - Verify `scripts/test-dev-full.mjs` (Plan 03-1 created it). Read it and confirm it does spawn `npm run dev:full`, poll `http://localhost:4000/api/health`, kill, exit 0/1. If it needs adjustment for the actual server start time (server's first boot includes mkdir + migrate, may take 2-3s), increase POLL_INTERVAL_MS to 1000 (already 500 — fine).

    Actually verify by running:
    ```
    node scripts/test-dev-full.mjs
    ```
    Expected: starts dev:full, /api/health responds, script exits 0. If it fails on Windows because better-sqlite3 didn't build, document in summary as "manual-UAT-only on Windows without VS Build Tools."

    Step 3 - Update `README.md`. Read the current README first, then APPEND (or weave into appropriate sections) the following content. Use the existing tone/structure; the snippets below are content to include, not literal text to paste verbatim if the README's headings differ:

    ```markdown
    ## Deployment shapes

    AussieLedger ships with two deployment options. Both produce a fully working app; pick the one that matches your usage.

    ### 1. Local single-user (no server) — IndexedDB

    The simplest setup. No backend, no SQLite. Data lives in your browser's IndexedDB.

    ```bash
    npm install
    npm run dev          # development at http://localhost:3000
    npm run build        # production build into dist/
    npm run preview      # serve the production build locally
    ```

    Pros: zero infrastructure. Cons: data lives in *this* browser on *this* machine. If you "Clear all site data" in the browser, your AussieLedger data is gone — **Export your data periodically (see Data page)**.

    ### 2. Self-hosted firm (Express + SQLite)

    Add the optional server tier for a shared instance (single firm, behind reverse proxy). Data persists in a SQLite file on the server.

    ```bash
    npm install                       # installs better-sqlite3 as optional dep
    npm run dev:full                  # vite + server, both with hot reload
    npm run build && npm run build:server
    npm run start:server              # production server only
    ```

    `npm run start:server` listens on `http://127.0.0.1:4000` by default. The SPA's Vite proxy forwards `/api/*` from `http://localhost:3000` to the server during development. In production, serve the built SPA (from `dist/`) through the same reverse proxy that fronts the server, so `/api/*` reaches the Express process.

    ### Windows prerequisites for `dev:full` / `start:server`

    `better-sqlite3` is a native Node module. **Windows builds from source**; there are no prebuilt binaries shipped. You need:

    1. **Python 3** on `PATH` — install from the Microsoft Store (recommended) or python.org. Anaconda/embeddable distributions do not set PATH correctly.
    2. **Visual Studio Build Tools 2022** with the "Desktop development with C++" workload (~6 GB on disk; the free Build Tools download — no full IDE required).
    3. **Node 20 LTS or 22 LTS**.

    After installing the tools, run `npm rebuild better-sqlite3 --build-from-source`. macOS and Linux receive prebuilt binaries automatically.

    `better-sqlite3` is an `optionalDependencies` entry — `npm install` succeeds even when the build fails. In that case, `npm run dev` continues to work (IndexedDB only); `dev:full` will fail loudly when the server tries to load the missing native binding.

    ### Server environment variables

    | Variable | Default | Purpose |
    |----------|---------|---------|
    | `PORT` | `4000` | Server bind port |
    | `HOST` | `127.0.0.1` | Server bind interface — **change to `0.0.0.0` only if running behind a trusted reverse proxy** |
    | `DB_PATH` | `./data/ledger.db` | SQLite file path |
    | `GEMINI_API_KEY` | unset | Gemini API key — when set, enables AI-assisted import; when unset, deterministic fuzzy match is the only path |

    `data/` is gitignored. Production deploys should mount or back up `data/ledger.db*` (the WAL + SHM companions matter — back up while server is stopped or use `cp data/ledger.db*`).

    ### Auth / shared-firm note

    Phase 3 ships **no built-in auth**. The server binds `127.0.0.1` by default. For shared/firm use on a VPS:

    1. Set `HOST=0.0.0.0` (or keep `127.0.0.1` and reverse-proxy).
    2. Front the server with **Caddy** or **nginx** + basic auth, OR put it behind a VPN.

    Auth + multi-user features are tracked for a later milestone.

    ## Data durability

    | Action | IndexedDB (no server) | SQLite (server) |
    |--------|-----------------------|------------------|
    | Close + reopen browser | Survives | Survives |
    | Clear "cookies and cached images" | Survives | Survives |
    | "Clear all site data" (Chrome Application tab) | **Lost** | Survives |
    | Server restart | n/a | Survives |
    | `rm -rf data/` | n/a | **Lost** |

    **Export your data regularly via the Data page** — it's the single recovery path for the local IDB shape.

    ## AI features (optional)

    AI-assisted account matching (in the Trial Balance import flow) is **optional**. The application is fully functional without an API key:

    - In **local mode** (no server): set `GEMINI_API_KEY` in `.env.local` before `npm run dev` / `npm run build`. The key is bundled into the SPA — acceptable only for fully-private self-hosted installs.
    - In **server mode**: set `GEMINI_API_KEY` in the server's environment. The key stays server-side; the SPA calls `/api/ai/match-accounts` which proxies to Gemini.

    When neither is configured, the deterministic Levenshtein-based matcher (Phase 2) is the only path.
    ```

    Step 4 - Verify all of:
    - `npm run lint` exits 0
    - `npm run test` exits 0
    - `npm run test:server` exits 0 (server suite still green from Plan 03-3)
    - `npm run build` exits 0
    - `npm run build:server` exits 0
    - Optionally (if better-sqlite3 built locally): `node scripts/test-dev-full.mjs` exits 0 — manual check, NOT in the verify command
  </action>
  <verify>
    <automated>npm run lint &amp;&amp; npm run test &amp;&amp; npm run test:server &amp;&amp; npm run build</automated>
  </verify>
  <acceptance_criteria>
    - `vite.config.ts` contains literal `proxy:` AND literal `'/api'` AND literal `http://localhost:4000`
    - `vite.config.ts` still contains literal `'process.env.GEMINI_API_KEY'` (existing define preserved)
    - `vite.config.ts` still contains literal `alias` with `'@': path.resolve(__dirname, '.')`
    - `README.md` contains literal `npm run dev:full` AND literal `npm run start:server`
    - `README.md` contains literal `Visual Studio Build Tools 2022` (Windows prereq)
    - `README.md` contains literal `GEMINI_API_KEY` AND literal `DB_PATH` AND literal `HOST` AND literal `PORT` (env vars table)
    - `README.md` contains literal `IndexedDB` AND literal `SQLite` (deployment shapes)
    - `README.md` contains literal `REPLACE` or references the Export/Data page
    - `scripts/test-dev-full.mjs` exists and contains literal `/api/health` (verified — should be from Plan 03-1)
    - `npm run lint` exits 0
    - `npm run test` exits 0
    - `npm run test:server` exits 0
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>
    Vite proxy wired; README documents both deployment shapes with Windows prereq + env vars + durability table + AI mode; integration smoke script in place from Plan 03-1; all builds green.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Human verification of FND-01 cache-clear + DEP-02 dual-shape boot + Data page UX + adapter-fallback banner</name>
  <what-built>
    Phase 3 end-to-end: dual-deployment storage with IndexedDB (no-server) + SQLite (server), Data page with Export/Import, REPLACE confirmation flow, AI proxy moved server-side, adapter-fallback banner. Plan 03-1 scaffolded the test infrastructure + FINAL StorageAdapter interface + shared Zod schemas; 03-2 implemented LocalAdapter + legacy-localStorage migration + hook refactor + getFellBackToLocal flag; 03-3 implemented the Express + better-sqlite3 server with REST routes, transactional whole-collection replace, server-side migration runner, Zod validation (shared schemas), the Gemini AI proxy, and ServerAdapter with money.ts deserialise boundary; 03-4 added the Data page UI, AdapterFallbackBanner (W5), Sidebar nav entry, Vite /api proxy, and README documentation.
  </what-built>
  <how-to-verify>
    Eight manual checks (per 03-VALIDATION.md "Manual-Only Verifications" + W5):

    1. **DEP-02b — `npm run dev` (no server)**
       - Run `npm run dev` from the repo root.
       - Open `http://localhost:3000` in Chrome.
       - Expected: the "Server unreachable — running in local mode" banner appears at the top (W5 — probe was attempted, no server present, fellBackToLocal=true).
       - Dismiss the banner with the X — it disappears for the session.
       - Click "Data" in the sidebar.
       - Expected: "Adapter: Local (IndexedDB)", "Schema Version: v2", "Last Export: Never", Export and Import buttons visible.
       - Click "Export data". Expected: a file `aussieledger-YYYY-MM-DD-HHmm.json` downloads. Open the file: should contain `_v: 2`, `entities`, `accounts`, `allEntries`, `auditLogs` keys.
       - Status panel "Last Export" now shows current timestamp.

    2. **FND-01a — Real Chrome cache-clear preserves IDB**
       - With the dev server running and data created (Step 1), open Chrome DevTools.
       - Application tab -> Storage -> Clear site data.
       - **Tick:** "Cookies and other site data", "Cached images and files".
       - **DO NOT TICK:** "IndexedDB" (or anything mentioning IDB explicitly).
       - Click "Clear site data".
       - Reload the AussieLedger tab.
       - Expected: your data is still present (the entities, the journals, the export-timestamp metadata). The Data page still shows "Local (IndexedDB)".

    3. **DEP-02c — `npm run dev:full` (server shape)** — REQUIRES Windows VS Build Tools (or non-Windows OS) for better-sqlite3 to build
       - Stop `npm run dev`. Run `npm run dev:full`.
       - Expected: console shows two prefixes (vite, api) both starting; api line includes "AussieLedger server listening on http://127.0.0.1:4000, DB at ./data/ledger.db, AI disabled" (or "enabled" if GEMINI_API_KEY was set).
       - Open `http://localhost:3000/` in a NEW Chrome incognito window (fresh storage).
       - Expected: the "Server unreachable" banner does NOT appear (probe succeeded).
       - Click "Data". Expected: "Adapter: Server (SQLite)".
       - Create an entity in the app. Export data — file downloads with the new entity in `entities` array. Decimal values in exported JSON appear as strings preserving full precision (e.g. `"100.50000"` not `100.5`).

    4. **FND-01b — SQLite survives server restart**
       - With `dev:full` running and data created, press Ctrl+C in the terminal to stop both processes.
       - Re-run `npm run dev:full`.
       - Reload the SPA tab. Expected: data still present.
       - Inspect `./data/ledger.db` exists; size > 0 bytes. WAL companions `ledger.db-wal` and `ledger.db-shm` may also exist.

    5. **W5 — Banner appears when server killed mid-session**
       - With `dev:full` running, kill ONLY the api process (Ctrl+C, then `npm run dev` to restart Vite alone — or kill the api process by PID and leave vite running).
       - Reload the SPA tab.
       - Expected: the "Server unreachable" banner appears (probe was attempted on reload, server now down, fellBackToLocal=true).
       - The Data page shows "Local (IndexedDB)" because the SPA fell back.
       - Dismiss the banner. It stays dismissed for the session.

    6. **FND-03 — Import + REPLACE confirmation**
       - From the SPA, click Data -> Export to download a backup JSON.
       - In a DIFFERENT browser tab or fresh profile (LocalAdapter, empty), click Data -> Choose file -> select the exported JSON.
       - Expected: confirmation dialog appears. Because no existing data, no REPLACE typing is required. Click Confirm. Expected: "Import succeeded" message. Reload page. Data is present.
       - Try import again in a tab that ALREADY has data. Expected: REPLACE dialog requires typing "REPLACE" (case-sensitive). Typing "replace" (lowercase) keeps Confirm disabled. Typing "REPLACE" enables Confirm. Cancel button works.

    7. **AI proxy (optional)** — Only if you have a real `GEMINI_API_KEY`
       - Set `GEMINI_API_KEY=<your-real-key>` in the env before `npm run dev:full`. Visit the SPA. Click Data -> "Adapter: Server (SQLite)", and (assuming health response includes aiEnabled=true) ImportTB will show the AI button.
       - The AI button now calls /api/ai/match-accounts (server proxies to Gemini using server-held key).
       - In DevTools Network tab, confirm that no GEMINI key is in any client-side request; only `/api/ai/match-accounts` is called.

    8. **Visual sweep**
       - Navigate to Master Dashboard, System Audit, Data, an Entity Dashboard, Journals, Trial Balance, Tax Assistant, BAS, ImportTB. Expected: all views render; no console errors; disclaimer footer still present (from Phase 1); no regressions from Phase 2's visual surface.

    Approve if all 8 checks pass. Note any issues (especially around (3) if better-sqlite3 didn't build on your Windows machine — that's a known optional-dep gap, the LocalAdapter path still works).
  </how-to-verify>
  <resume-signal>Type "approved" if all checks pass, OR describe issues with specific check numbers.</resume-signal>
</task>

</tasks>

<verification>
After Tasks 1 + 2 complete (Task 3 is the human checkpoint):
1. `npm run lint` exits 0
2. `npm run test` exits 0 with DataPage tests GREEN + AdapterFallbackBanner tests GREEN + all prior tests green
3. `npm run test:server` exits 0
4. `npm run build` exits 0
5. `npm run build:server` exits 0
6. Sidebar contains a "Data" entry; clicking sets view='data' and renders DataPage
7. ViewRouter routes 'data' to <DataPage />
8. MainLayout renders <AdapterFallbackBanner /> above main content
9. vite.config.ts has server.proxy['/api'] -> http://localhost:4000
10. README.md documents both deployment shapes, Windows prereq, env vars, durability table, AI mode
11. scripts/test-dev-full.mjs exists (from Plan 03-1) and contains the /api/health poll loop
</verification>

<success_criteria>
- Phase 3 success criterion #2 (prominent Export action in main nav producing complete JSON) satisfied — Data nav entry visible, Export downloads aussieledger-*.json
- Phase 3 success criterion #3 (Import on fresh instance restores) satisfied — Import + REPLACE confirmation flow working
- Phase 3 success criterion #4 (npm run dev IDB / npm run dev:full SQLite, both produce working apps) satisfied — verified in manual checkpoint
- W5 banner (CONTEXT line 52 + VALIDATION line 108): renders on probed-and-fell-back path, silent otherwise, dismissible
- vite.config.ts proxy lands so dev:full /api/* requests reach the server
- README updates document both shapes for users
- DataPage tests green; AdapterFallbackBanner tests green; Sidebar/ViewRouter/MainLayout/types updated
- All 4 phase requirement IDs (FND-01, FND-02, FND-03, DEP-02) covered across plans 03-1 through 03-4
- Manual UAT checkpoint hands off to /gsd:verify-work
</success_criteria>

<output>
After Tasks 1 + 2 complete (and human checkpoint cleared in Task 3), create `.planning/phases/03-durable-persistence/03-4-SUMMARY.md` summarising:
- DataPage created (~250 lines) with status panel, Export, Import with REPLACE confirmation
- AdapterFallbackBanner created (~60 lines) — W5 implementation reading getFellBackToLocal()
- MainLayout wired to render the banner above main content
- Sidebar Data nav entry (between Master Dashboard and System Audit)
- ViewRouter routes 'data' -> DataPage
- src/types.ts View union widened
- vite.config.ts server.proxy['/api'] -> localhost:4000
- README documents both deployment shapes, Windows VS Build Tools prereq, env vars, durability table, AI mode
- Tests: count GREEN (full SPA + server suites)
- Manual UAT checkpoint results (link or paste the user's approval / issues), specifically confirming the W5 banner behaved correctly across the three scenarios (manual UAT step 1 = appears; step 3 = doesn't appear; step 5 = appears after mid-session kill)
- Hand-off to /gsd:verify-work: Phase 3 ready for verification; FND-01 + FND-02 + FND-03 + DEP-02 all delivered; FND-02 CSV half is "partially delivered" (per CONTEXT) and that should be noted in VERIFICATION.md
</output>
