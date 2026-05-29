# Architecture Patterns — v2.0 Tauri Desktop Integration

**Domain:** Tauri 2.x desktop shell grafted onto existing Vite SPA + Express server (brownfield)
**Researched:** 2026-05-29
**Overall confidence:** HIGH (Tauri 2.x docs verified via official sources; StorageAdapter patterns drawn directly from v1.0 source)

---

## Integration Points

### The Invariant That Makes v2.0 Possible

`src/storage/adapter.ts` exports `StorageAdapter` — a 12-method interface that every hook and component uses exclusively. No hook, component, or tax-engine function touches IndexedDB, `fetch()`, or any storage primitive directly. This interface is explicitly marked FINAL in the Phase 3 context: it may only grow by adding new adapter implementations, never by widening the interface itself.

v2.0's `FileBackedAdapter` is the third implementation behind this interface. The domain layer (tax engine, wizard, hooks, all components) sees zero change.

### Files Touched vs Files Left Alone

**Left alone (zero v2.0 changes):**
- `src/lib/tax/` — entire tax engine
- `src/lib/period.ts`, `src/lib/money.ts`, `src/lib/ai.ts` — except the IS_AI_ENABLED addition below
- `src/lib/migrations/` — all five migration steps (v0→v5 chain extended, not rewritten)
- `src/components/` — every component except `ImportTB.tsx` (one-line AI branch) and new `FileOpenSplash.tsx`
- `src/types.ts`, `src/constants.ts`
- `src/storage/adapter.ts` — FINAL interface, do not touch
- `src/storage/local.ts` — LocalAdapter stays for web SPA shape
- `src/storage/server.ts` — ServerAdapter stays for VPS shape
- `server/` — entire Express+SQLite server (retained for VPS shape; see Q8)

**Modified in v2.0:**
- `src/storage/index.ts` — `initAdapter()` gains a third selection branch: `'file'` mode triggered by Tauri context
- `src/lib/migrations/index.ts` — register `5: migrateV5ToV6` and bump `CURRENT_VERSION` to 6
- `src/lib/ai.ts` — add `'file'` adapter branch to `IS_AI_ENABLED` check
- `src/components/ImportTB.tsx` — add `invoke()` AI branch for Tauri shape (one `else if` block)
- `vite.config.ts` — add Tauri-specific build targets and `clearScreen: false`
- `package.json` — add `tauri:dev` and `tauri:build` scripts

**New in v2.0:**
- `src/storage/file.ts` — `FileBackedAdapter` implementation
- `src/lib/migrations/v5-to-v6.ts` — migration (see Q2)
- `src/components/FileOpenSplash.tsx` — boot splash for file selection in Tauri context
- `src-tauri/` — Rust project (Cargo.toml, src/main.rs, src/lib.rs, src/commands.rs, tauri.conf.json, capabilities/)
- `.github/workflows/tauri-build.yml` — cross-platform CI

---

## Q1 — FileBackedAdapter Design

### Architecture Decision: Rust Commands, Not Tauri SQL Plugin

The Tauri SQL plugin (`@tauri-apps/plugin-sql`) opens databases relative to `AppConfig` base directory only — it cannot open a user-chosen absolute file path without a workaround. For a product whose core UX promise is "your file, your path, on a USB stick", this constraint is disqualifying.

**Adopted approach:** Custom Rust commands in `src-tauri/src/commands.rs` using `rusqlite` with `features = ["bundled"]`, with the open file path stored in Tauri-managed `Mutex<Option<Connection>>` state. The TypeScript `FileBackedAdapter` calls these commands via `invoke()`.

```
FileBackedAdapter (src/storage/file.ts)
  ├── static open(path)           → invoke('db_open', { path })
  ├── getEntities()               → invoke('db_get_entities')
  ├── saveEntities(entities)      → invoke('db_save_entities', { data: entities })
  ├── getAccounts()               → invoke('db_get_accounts')
  ├── saveAccounts(accounts)      → invoke('db_save_accounts', { data: accounts })
  ├── getEntries()                → invoke('db_get_entries')
  ├── saveEntries(entries)        → invoke('db_save_entries', { data: entries })
  ├── getAuditLogs()              → invoke('db_get_audit_logs')
  ├── saveAuditLogs(logs)         → invoke('db_save_audit_logs', { data: logs })
  ├── appendAuditLog(log)         → invoke('db_append_audit_log', { log })
  ├── exportAll()                 → invoke('db_export_all')
  ├── importAll(state)            → invoke('db_import_all', { state })
  └── close()                     → invoke('db_close')
```

### Rust State Pattern

```rust
// src-tauri/src/lib.rs
pub struct DbState(pub Mutex<Option<rusqlite::Connection>>);

// Registered during app setup:
app.manage(DbState(Mutex::new(None)));
```

Connections start as `None`. `db_open` acquires the lock, opens the rusqlite connection at the user-chosen absolute path, and replaces `None`. All other commands lock the mutex and fail-fast with a typed error if `None` (file not opened yet — surfaces as a boot error in the React splash screen).

### FileBackedAdapter Lifecycle

```typescript
// src/storage/file.ts
class FileBackedAdapter implements StorageAdapter {
  private constructor(private readonly filePath: string) {}

  // Called by boot sequence after user picks or creates a file
  static async open(path: string): Promise<FileBackedAdapter> {
    await invoke('db_open', { path });   // Rust: open rusqlite, run SQL migrations, init file_meta
    return new FileBackedAdapter(path);
  }

  async ready(): Promise<void> { /* resolves immediately after open() */ }

  async getEntities(): Promise<Entity[]>  { return invoke('db_get_entities'); }
  async saveEntities(entities: Entity[]): Promise<void>  { return invoke('db_save_entities', { data: entities }); }
  // ... (all 12 interface methods delegate to invoke() — pattern is identical)

  async close(): Promise<void> { await invoke('db_close'); }
}
```

The whole-collection transactional replace pattern (existing in LocalAdapter and ServerAdapter) is preserved: Rust's `db_save_entities` deletes all rows for the collection then inserts the new set within a single `rusqlite::Transaction`. Matching the v1.0 hook behaviour exactly.

### Relation to `server/` Express+SQLite

`server/` is **kept entirely**. The `server/` shape and the Tauri shape serve different audiences:

| Shape | Adapter | Who uses it |
|-------|---------|-------------|
| `npm run dev` | LocalAdapter (IndexedDB) | Single-user web, browser only |
| `npm run dev:full` | ServerAdapter (HTTP → Express → SQLite) | Small-firm VPS, multiple clients |
| `tauri:build` binary | FileBackedAdapter (Rust → rusqlite → user file) | Desktop install |

`server/` is not replaced by Tauri — it is a parallel deployment shape. All three adapters coexist behind the same `StorageAdapter` interface.

### `AdapterKind` Addition

`src/storage/adapter.ts` currently exports `AdapterKind = 'local' | 'server'`. v2.0 widens this union to `'local' | 'server' | 'file'`. This is the only additive change to the adapter module — the `StorageAdapter` interface itself is untouched.

---

## Q2 — Migration Chain Extension

### What v5→v6 Does

`src/lib/migrations/v5-to-v6.ts`:

```typescript
export function migrateV5ToV6(state: PersistedRoot): PersistedRoot {
  // Additive only. v5→v6 is an identity bump in the base case.
  // If v2.0 adds new domain fields to Entity or Settings, they are back-filled here.
  return { ...state, _v: 6 };
}
```

At minimum this is an identity migration that bumps `_v` from 5 to 6. The version bump signals that a v2.0 binary has touched the data. Additional widening (new Entity fields, new Settings fields) is appended here as v2.0 development progresses.

### File-Format Metadata Lives in SQL, Not in PersistedRoot

File-specific metadata (creation date, schema version, app version at creation, last-opened timestamp) lives in a dedicated SQLite table managed entirely by the Rust layer:

```sql
-- Applied by Rust db_open command on first creation — NOT by the JS migration runner
CREATE TABLE IF NOT EXISTS file_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Rows: file_created_at, schema_version, app_version, last_opened_at
```

**Why the split:** `PersistedRoot` is the cross-shape portable format used by `exportAll()` / `importAll()` / JSON export. File-format metadata is `.aussieledger`-specific and must NOT appear in JSON exports (which are shape-agnostic and must remain importable into the web SPA shape). The Rust layer manages `file_meta` independently of the JS migration runner.

### SQL Schema Ladder (Rust side)

The Rust layer (`db_open` command) runs its own SQL migration ladder, independent of the JS migration runner:

```
src-tauri/src/db/
  001-initial.sql   — creates entities, accounts, journal_entries, journal_lines,
                      audit_logs, file_meta tables
  002-...           — future schema bumps (v2.1+)
```

The JS `migrate()` function in `src/lib/migrations/index.ts` migrates **data shape** (field additions, renames to the JSON blob). The Rust SQL migrations manage the **SQLite table schema**. Independent ladders.

### Import Flow from v1.0 (IndexedDB or VPS → .aussieledger)

1. User clicks "Import v1.0 data" in File menu.
2. SPA calls `adapter.exportAll()` on the current adapter (LocalAdapter or ServerAdapter).
3. Returns `PersistedRoot` at `_v: 5`.
4. `migrate(root)` applies v5→v6 → `_v: 6`.
5. User picks a save path via Tauri dialog → `FileBackedAdapter.open(path)` creates a new empty `.aussieledger` file.
6. `adapter.importAll(migratedRoot)` writes all data transactionally.

---

## Q3 — Boot Sequence

### Adapter Selection Gate (Modified `src/storage/index.ts`)

```typescript
export async function initAdapter(): Promise<StorageAdapter> {
  if (adapterPromise) return adapterPromise;
  adapterPromise = (async () => {

    // NEW v2.0: Tauri context detection
    if (await isTauriContext()) {
      const path = await resolveFilePath();        // boot splash / file dialog
      const a = await FileBackedAdapter.open(path);
      adapterKind = 'file';
      return a;
    }

    // Existing web-shape logic unchanged below this point
    const forced = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_MODE_KEY)
      : null;
    // ... existing probe logic (LocalAdapter / ServerAdapter selection) ...

  })();
  return adapterPromise;
}

async function isTauriContext(): Promise<boolean> {
  try {
    const { isTauri } = await import('@tauri-apps/api/core');
    return isTauri();
  } catch {
    return false;  // @tauri-apps/api not bundled in web build — safe fallback
  }
}
```

The `isTauri()` API from `@tauri-apps/api/core` checks for `window.__TAURI_INTERNALS__`. In browser contexts and in Vitest/jsdom, this returns false, so the existing LocalAdapter/ServerAdapter probe runs unchanged.

### `resolveFilePath()` — Boot Steps

```
1. invoke('get_last_opened_file')
   → Rust reads recent-files list from OS app-data dir (separate from .aussieledger files)
   → Returns { lastPath: string | null }

2. IF lastPath exists AND invoke('file_exists', { path: lastPath }) is true:
   → Return lastPath immediately (silent re-open, no splash needed)

3. ELSE:
   → Render <FileOpenSplash /> component in the webview
     (React component, not OS dialog — two large buttons)

4a. User clicks "Open existing file":
   → Tauri dialog plugin: open({
       filters: [{ name: 'AussieLedger', extensions: ['aussieledger'] }]
     })
   → Returns chosen absolute path
   → invoke('save_last_opened_file', { path }) — persist for next launch
   → Return path

4b. User clicks "Create new file":
   → Tauri dialog plugin: save({
       filters: [{ name: 'AussieLedger', extensions: ['aussieledger'] }],
       defaultPath: '~/Documents/AussieLedger/My Books.aussieledger'
     })
   → Returns chosen save path
   → Return path (Rust db_open creates the file if it does not exist)

5. FileBackedAdapter.open(path):
   → Rust opens rusqlite connection at absolute path
   → Runs SQL migration ladder (001-initial.sql etc.)
   → Writes file_meta rows (file_created_at if new file, last_opened_at always)
   → Returns success (throws typed error on failure)

6. JS: invoke('db_get_schema_version')
   → Read _v stored in the entities table (or file_meta)
   → Run JS migrate() if _v < CURRENT_VERSION
   → If _v > CURRENT_VERSION: render <MigrationError /> (existing component), abort

7. FileBackedAdapter instance returned → stored in adapterPromise

8. React <App /> mounts — hooks call adapter.getEntities() etc., reads land, UI renders
```

### Where the Welcome Splash Lives

A new component `src/components/FileOpenSplash.tsx` — rendered by `src/main.tsx` (or a new `src/AppShell.tsx` wrapper) before `<App />` when `adapterKind === 'file'` has not yet been resolved. This component is only ever instantiated when `isTauri()` is true; the web SPA's boot path bypasses it entirely. Once a file is selected and `FileBackedAdapter.open()` resolves, the splash unmounts and `<App />` mounts normally.

---

## Q4 — Vite Dev-Server During Development

### `vite.config.ts` Changes

Add the Tauri-recommended block alongside existing config. The existing proxy, define, and alias blocks are unchanged:

```typescript
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';

  return {
    plugins: [react(), tailwindcss()],
    // Existing define/resolve blocks unchanged
    define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },

    // --- NEW: Tauri build targets ---
    build: {
      // Tauri webview engines: WebView2 (Chromium) on Windows, WKWebView (Safari) on macOS/Linux
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
      minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
    },

    // NEW: preserve Rust compile errors in terminal
    clearScreen: false,

    server: {
      // Existing proxy unchanged
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
      // NEW: Tauri mobile/remote dev host injection
      host: process.env.TAURI_DEV_HOST ?? 'localhost',
      port: 3000,
      strictPort: true,
      hmr: process.env.DISABLE_HMR === 'true'
        ? false
        : process.env.TAURI_DEV_HOST
          ? { protocol: 'ws', host: process.env.TAURI_DEV_HOST, port: 3000 }
          : { port: 3000 },
      watch: {
        // Do not watch Rust source — Tauri CLI handles that separately
        ignored: ['**/src-tauri/**'],
      },
    },
  };
});
```

### `package.json` Scripts

Add alongside existing scripts — do not replace or modify existing ones:

```json
{
  "scripts": {
    "dev":          "vite --port=3000 --host=0.0.0.0",
    "dev:server":   "tsx watch server/index.ts",
    "dev:full":     "concurrently -k -n vite,api -c blue,magenta \"npm:dev\" \"npm:dev:server\"",
    "tauri:dev":    "tauri dev",
    "tauri:build":  "tauri build",
    "build":        "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    "start:server": "node server/dist/server/index.js"
  }
}
```

`npm run dev` and `npm run dev:full` are unchanged. Web SPA developers use them exactly as before.

`npm run tauri:dev` triggers `tauri dev`, which reads `src-tauri/tauri.conf.json`. That config sets `beforeDevCommand: "npm run dev"` and `devUrl: "http://localhost:3000"`. Tauri starts the Vite server automatically, then opens the SPA in the native webview. The Rust backend is compiled by the Tauri CLI (not by npm).

### `src-tauri/tauri.conf.json` Key Fields

```json
{
  "productName": "AussieLedger",
  "version": "2.0.0",
  "identifier": "au.com.aussieledger.app",
  "app": {
    "withGlobalTauri": false,
    "windows": [{ "title": "AussieLedger", "width": 1280, "height": 900 }]
  },
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  }
}
```

`withGlobalTauri: false` means Tauri APIs are not injected into `window` globally — they are imported explicitly from `@tauri-apps/api/*`. This is the correct default for a typed TypeScript project.

---

## Q5 — Print from Tauri

### Verdict: No Code Change Required

`window.print()` is a standard Web API and **works in all three Tauri webview engines**:

- **Windows (WebView2 / Chromium):** `window.print()` triggers the Windows print dialog. CSS `@media print` is fully respected. Chromium's print pipeline is the same as Chrome.
- **macOS (WKWebView / WebKit):** `window.print()` triggers the macOS print dialog. CSS `@media print` is respected. There is a historical WKWebView issue (pre-macOS Monterey) where content scrolled off-screen was blank in print output, but modern WKWebView (macOS 12+) handles full-page printing correctly.
- **Linux (webkit2gtk):** `window.print()` triggers the GTK print dialog. CSS `@media print` respected.

The v1.0 print mechanism — `window.print()` called from a button click + `@media print` CSS scoped per form — requires zero changes for Tauri.

### What NOT to Use

There is no stable Tauri native print API in v2.0. Feature requests #4917 and #5330 (print API, silent printing) have been open since 2022 and no production-stable plugin has shipped as of 2025. AussieLedger does not need silent printing — the print dialog is the expected UX for a working paper.

### Affected Files

Zero. All print-related files in `src/components/` and `src/index.css` are untouched.

**macOS mitigation (low risk):** If testing reveals off-screen content is missing on any supported macOS version, the fix is a two-line defensive call before `window.print()`:
```typescript
window.scrollTo(0, 0);
await new Promise(r => setTimeout(r, 50));
window.print();
```
This would be the only change, isolated to the button's click handler in the relevant form component.

---

## Q6 — AI Proxy Migration

### Decision: Rust Command Proxy for Tauri Shape; `server/` AI Route Unchanged for VPS Shape

The `/api/ai/match-accounts` route in `server/index.ts` stays exactly as-is. In the Tauri shape, there is no Express server running. The AI proxy is handled by a Tauri Rust command.

**Tauri shape AI path:**
`src-tauri/src/commands.rs` adds an `ai_match_accounts` Rust command that makes the outbound HTTPS call to Google's Gemini API (`generativelanguage.googleapis.com`). The SPA's `ImportTB.tsx` calls `invoke('ai_match_accounts', { request })` when `getAdapterKind() === 'file'`.

The network capability in `src-tauri/capabilities/main.json` restricts outbound HTTP from the webview to `https://generativelanguage.googleapis.com/*` only when the AI feature is used. All other outbound network calls from the webview are blocked by default. The Rust command makes the HTTPS call from the native process, which is outside the webview sandbox — this is the clean architecture for a hard-sandbox requirement.

**Why not a sidecar running the Express server:** Running `server/index.ts` as a sidecar process inside Tauri would bundle Node.js as a dependency, adds ~50–100 MB to the binary, creates two processes to manage, and contradicts the "no Node, no terminal" goal. Not used.

**Why not disable AI entirely in Tauri:** AI is already gated behind `IS_AI_ENABLED`. The `AiGateNote` affordance renders gracefully when AI is disabled. However, the Tauri shape is the most controlled environment to enable AI safely (hard network sandbox, explicit capability entry) — this is a feature, not a reason to skip it.

### `src/lib/ai.ts` Change (additive only)

```typescript
// Current IS_AI_ENABLED logic (unchanged for server + local shapes):
// - server shape: getCachedHealth()?.aiEnabled
// - local shape: Boolean(import.meta.env.VITE_GEMINI_API_KEY)
//
// New branch for Tauri shape:
export async function isAiEnabledAsync(): Promise<boolean> {
  if (getAdapterKind() === 'file') {
    return invoke<boolean>('get_ai_enabled');  // Rust reads GEMINI_API_KEY from env/config
  }
  if (getAdapterKind() === 'server') {
    return getCachedHealth()?.aiEnabled ?? false;
  }
  return Boolean(import.meta.env.VITE_GEMINI_API_KEY);
}
```

The synchronous `IS_AI_ENABLED` constant can remain as the cached result after the async check resolves at boot — pattern matches the existing `cachedHealth` approach.

### `src/components/ImportTB.tsx` Change (additive only)

The existing AI call path gains one new branch:

```typescript
// Existing server-shape branch (unchanged):
if (getAdapterKind() === 'server') {
  result = await fetch('/api/ai/match-accounts', { method: 'POST', ... });
}
// New Tauri-shape branch:
else if (getAdapterKind() === 'file') {
  result = await invoke('ai_match_accounts', { request });
}
// Existing local-shape branch (unchanged):
else {
  result = await callGeminiDirectly(request);
}
```

This is the only change to `ImportTB.tsx` in v2.0.

---

## Q7 — Build Artifacts Coexistence

### Artifact Map

| Script | Output directory | Content | Used by |
|--------|-----------------|---------|---------|
| `npm run build` | `dist/` | Vite SPA bundle | Web SPA users; also consumed by `tauri:build` |
| `npm run build:server` | `server/dist/` | Compiled Express server | VPS users |
| `npm run tauri:build` | `src-tauri/target/release/bundle/` | OS installers (.msi / .dmg / .AppImage) | Desktop users |

These are non-overlapping output directories. All three can be produced from the same repo.

### CI Structure

**`.github/workflows/ci.yml`** (existing, unchanged) — SPA + server tests (`npm run lint`, `npm run test`, `npm run test:server`). Runs on every push. No Rust toolchain required.

**`.github/workflows/tauri-build.yml`** (new) — cross-platform binary builds. Triggers on version tags (`v2.*`). Uses `tauri-apps/tauri-action`:

```yaml
strategy:
  fail-fast: false
  matrix:
    include:
      - platform: ubuntu-22.04
        args: ''
      - platform: macos-latest
        args: '--target aarch64-apple-darwin'
      - platform: macos-latest
        args: '--target x86_64-apple-darwin'
      - platform: windows-latest
        args: ''

steps:
  - uses: actions/checkout@v4
  - name: Install Linux deps
    if: matrix.platform == 'ubuntu-22.04'
    run: sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
  - uses: actions/setup-node@v4
    with: { node-version: 'lts/*', cache: 'npm' }
  - uses: dtolnay/rust-toolchain@stable
    with:
      targets: ${{ matrix.platform == 'macos-latest' && 'aarch64-apple-darwin,x86_64-apple-darwin' || '' }}
  - run: npm ci
  - uses: tauri-apps/tauri-action@v0
    with:
      tagName: 'v__VERSION__'
      releaseName: 'AussieLedger v__VERSION__'
      args: ${{ matrix.args }}
    env:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`tauri-apps/tauri-action` internally runs `npm run build` (Vite) then `tauri build`, uploads installers to GitHub Releases.

### `.gitignore` Additions

```
src-tauri/target/
```

Cargo build cache is 200–500 MB and is fully reproducible.

---

## Q8 — Web SPA Continuity

### Recommendation: Ship Both; Deprecate Nothing

The web SPA build target is **not deprecated**. v2.0 ships:
1. Tauri installers for desktop users (normal install path)
2. Web SPA (`dist/`) + Express server (`server/dist/`) for "small-firm VPS" users

**Why `server/` must be retained:** The small-firm VPS shape (multiple tax agents accessing a shared server from their browsers) is architecturally incompatible with the Tauri file model. A firm where three tax agents share one instance cannot use a per-user desktop file. `ServerAdapter` + Express remains the correct shape for that deployment and must not be removed.

### Adapter Status Post-v2.0

| Adapter | Shape | Status |
|---------|-------|--------|
| `LocalAdapter` | Single-user web (IndexedDB) | Active, unchanged |
| `ServerAdapter` | Multi-user VPS (Express+SQLite) | Active, unchanged |
| `FileBackedAdapter` | Desktop (Tauri) | New in v2.0 |

`FileBackedAdapter` is Tauri-only. It requires `invoke()` from `@tauri-apps/api/core`, which is only available inside a Tauri webview. The `isTauri()` guard in `initAdapter()` ensures this adapter is never selected in a browser. Calling `FileBackedAdapter.open()` in a browser throws immediately (the dynamic import of `@tauri-apps/api/core` fails).

### Architecture Decisions That Must Remain Web-Shape-Compatible

These invariants hold across all three shapes and must not be broken in v2.0:

- `StorageAdapter` interface — FINAL; no Tauri-specific methods leak into it
- `PersistedRoot` format — must remain JSON-serialisable (web JSON export must continue to work)
- `src/lib/migrations/` JS runner — runs in both browser and Tauri contexts (pure JS, no Tauri APIs)
- `src/storage/index.ts` `initAdapter()` — Tauri branch is entirely behind `isTauri()` guard; browser boot path is unchanged
- `IS_AI_ENABLED` — three branches, each isolated; web shapes are unaffected by the Tauri branch

---

## Q9 — Suggested Phase Order

Dependencies drive ordering. Tauri scaffolding must exist before `FileBackedAdapter`; the adapter must exist before network-sandbox config; migration must follow a working adapter; file menu UX requires the adapter and migration; CI requires working build output.

### Phase Map

```
Phase 1: Tauri Scaffolding Spike
  Deliverables:
  - src-tauri/ created (cargo init, tauri.conf.json, minimal src/lib.rs + src/main.rs)
  - vite.config.ts additions (clearScreen, target, TAURI_DEV_HOST, watch.ignored)
  - package.json: tauri:dev + tauri:build scripts
  - .gitignore: src-tauri/target/
  - Smoke test: npm run tauri:dev opens existing v1.0 SPA in a native window
  - Smoke test: window.print() confirmed working in Tauri webview on dev machine
  - Smoke test: @media print CSS renders correctly
  Output: Tauri opens v1.0 SPA in native window — no domain logic changed yet

Phase 2: FileBackedAdapter
  Deliverables:
  - Rust commands layer (src-tauri/src/commands.rs):
      db_open, db_close, db_get_entities, db_save_entities, db_get_accounts,
      db_save_accounts, db_get_entries, db_save_entries, db_get_audit_logs,
      db_save_audit_logs, db_append_audit_log, db_export_all, db_import_all,
      db_get_schema_version, file_exists, get_last_opened_file, save_last_opened_file
  - SQL schema: src-tauri/src/db/001-initial.sql (entities, accounts, journal_entries,
      journal_lines, audit_logs, file_meta tables)
  - src/storage/file.ts: FileBackedAdapter implements StorageAdapter verbatim
  - AdapterKind widens to include 'file'
  - src-tauri/capabilities/main.json: permit only db_* commands (no HTTP yet)
  - Vitest tests for FileBackedAdapter (mock invoke() via vi.mock('@tauri-apps/api/core'))
  - Round-trip test: v5 PersistedRoot → importAll() → exportAll() → matches input
  Output: FileBackedAdapter satisfies StorageAdapter; round-trip test GREEN

Phase 3: Boot Sequence + File Menu UX
  Deliverables:
  - src/components/FileOpenSplash.tsx (Open / Create buttons)
  - isTauriContext() + resolveFilePath() added to src/storage/index.ts
  - Rust: get_last_opened_file, save_last_opened_file, file_exists commands
  - Tauri dialog plugin wired (tauri-plugin-dialog in Cargo.toml + capabilities)
  - File menu: File → New, File → Open, File → Save As (Save As = rusqlite VACUUM INTO)
  - Recent files submenu (stored in app-data dir by Rust)
  Output: Double-click binary → splash → pick file → App mounts; File menu works

Phase 4: Migration Chain + v1.0 Import Flow
  Deliverables:
  - src/lib/migrations/v5-to-v6.ts (additive _v bump; any new v2.0 domain fields)
  - Register in migrations/index.ts, bump CURRENT_VERSION to 6
  - v5→v6 round-trip test (same pattern as v0→v5 tests)
  - "Import v1.0 data" UI flow:
      read from current adapter (Local or Server) → migrate → write to new .aussieledger
  - MigrationError component used for _v > 6 guard
  Output: v1.0 JSON export imports cleanly into .aussieledger; migration test GREEN

Phase 5: Network Sandbox + AI Proxy
  Deliverables:
  - src-tauri/capabilities/main.json: deny-all HTTP from webview; add Tauri HTTP plugin
      capability scoped to https://generativelanguage.googleapis.com/* for Rust commands only
  - Rust: ai_match_accounts command + get_ai_enabled command
  - src/lib/ai.ts: add 'file' adapter branch for IS_AI_ENABLED
  - src/components/ImportTB.tsx: add invoke() branch (one else-if block)
  - Verify: fetch('https://any-other-host') from webview JS throws in Tauri build
  Output: AI works in Tauri shape; all other outbound network blocked in webview

Phase 6: CI Cross-Platform Builds + FND-02 CSV Export
  Deliverables:
  - .github/workflows/tauri-build.yml (matrix: win/mac-arm/mac-x64/linux)
  - Code signing placeholders (self-signed for v2.0; real certs documented for v2.1)
  - FND-02 CSV per-report export (TB CSV, BAS labels CSV, Form I CSV) — deferred from v1.0
  - App.tsx:114 dead 'US Big Law Firm' string cleanup
  - nyquist_compliant: false cleanup on Phases 1/2/6 frontmatter (cosmetic)
  Output: tauri:build produces .msi / .dmg / .AppImage; CI GREEN; FND-02 closed
```

### Dependency Chain

```
Phase 1 (scaffold) ──→ Phase 2 (adapter) ──→ Phase 3 (boot UX)
                              │                      │
                              └──→ Phase 4 (migration + import)
                                         │
                              Phase 5 (network sandbox + AI)
                                         │
                              Phase 6 (CI + FND-02)
```

Phases 3 and 4 share a dependency on Phase 2 but are independent of each other — they can be developed in parallel if resourcing allows, though Phase 4's import flow is easier to verify with Phase 3's file picker in place. Phase 6 is the only phase that is partially parallelisable with Phase 5 (CI build doesn't depend on the AI proxy).

---

## Component Boundaries Summary

| File | Status | Change |
|------|--------|--------|
| `src/storage/adapter.ts` | UNCHANGED | FINAL interface — never touch |
| `src/storage/local.ts` | UNCHANGED | LocalAdapter for web shape |
| `src/storage/server.ts` | UNCHANGED | ServerAdapter for VPS shape |
| `src/storage/file.ts` | NEW | FileBackedAdapter — Tauri only |
| `src/storage/index.ts` | MODIFIED | `isTauri()` branch + `resolveFilePath()` |
| `src/lib/migrations/index.ts` | MODIFIED | Register v5→v6, bump CURRENT_VERSION to 6 |
| `src/lib/migrations/v5-to-v6.ts` | NEW | Additive migration |
| `src/lib/ai.ts` | MODIFIED | Add `'file'` adapter branch to IS_AI_ENABLED |
| `src/components/ImportTB.tsx` | MODIFIED | Add `invoke()` branch for AI in Tauri shape |
| `src/components/FileOpenSplash.tsx` | NEW | Boot splash for file selection |
| `vite.config.ts` | MODIFIED | Tauri build targets + clearScreen + watch.ignored |
| `package.json` | MODIFIED | tauri:dev, tauri:build scripts |
| `src-tauri/` | NEW | Entire Rust project |
| `.github/workflows/tauri-build.yml` | NEW | Cross-platform CI |
| `server/` (all files) | UNCHANGED | VPS shape — kept as-is |
| All `src/components/` (except above) | UNCHANGED | Zero domain logic changes |
| All `src/lib/tax/` | UNCHANGED | Tax engine untouched |
| `src/lib/period.ts`, `src/lib/money.ts` | UNCHANGED | |

---

## Risks

### Risk 1: rusqlite bundled SQLite on Windows build toolchain
**Probability:** HIGH. **Severity:** LOW.
`rusqlite` with `features = ["bundled"]` compiles SQLite from C source, requiring MSVC. The dev machine is Windows 11. MSVC is already required for `better-sqlite3` on the server shape, so the prerequisite is documented in CONTRIBUTING.md. CI uses `windows-latest` which has MSVC. Mitigation: document `rustup` + Visual Studio Build Tools as prerequisites; use `features = ["bundled"]` in Cargo.toml to avoid system SQLite version fragmentation.

### Risk 2: WKWebView off-screen print content on older macOS
**Probability:** MEDIUM (macOS < 12). **Severity:** LOW.
Pre-Monterey WKWebView had a bug where scrolled content did not appear in print output. Modern macOS (12+) handles this correctly. v2.0 targets macOS 12+ as minimum (aligns with WebKit versions Tauri 2.x requires). If a user on macOS 11 reports blank print output, the two-line `scrollTo(0,0) + setTimeout` fix in the print button handler is the mitigation. Flag for testing in Phase 1 smoke test.

### Risk 3: `isTauri()` + tree-shaking of `@tauri-apps/api/core`
**Probability:** LOW. **Severity:** MEDIUM.
`@tauri-apps/api/core` must be added as a dependency. In the web SPA build (`npm run build`), Vite tree-shakes the dynamic `import()` path gated by `isTauri()`. However, if tree-shaking is incomplete, the `@tauri-apps/api` bundle may appear in the web SPA output. Mitigation: use dynamic `import()` (already shown in the code above) rather than a static import — Vite defers these. Test the web SPA bundle size before and after adding the dependency.

### Risk 4: FileBackedAdapter round-trip tests need invoke() mock
**Probability:** LOW. **Severity:** LOW.
`invoke()` calls Rust at runtime — not available in Vitest/jsdom. Mitigation: `vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn(() => false) }))` in the test file. Pattern is established by Phase 3's `fake-indexeddb` approach for LocalAdapter tests.

### Risk 5: CURRENT_VERSION = 6 triggers v5→v6 migration on web-shape users who haven't "upgraded"
**Probability:** LOW. **Severity:** LOW.
If a VPS user stays on v1.0 server shape but pulls the v2.0 frontend code, their `_v: 5` data is migrated to `_v: 6` on first load. The v5→v6 migration must be strictly additive (no field removal, no renames). The CONTRIBUTING.md rule already mandates this. Risk is contained by the migration rule.

### Risk 6: Phase 3 + Phase 4 dependency ordering
**Probability:** LOW if phasing is respected. **Severity:** MEDIUM.
The v1.0 import flow (Phase 4) requires a working FileBackedAdapter (Phase 2) and a working file picker (Phase 3). If Phase 4 is started before Phase 3, the import flow has no target adapter to write into during manual testing. Mitigation: enforce Phase 2 → Phase 3 → Phase 4 ordering in the roadmap.

---

## Sources

- [Tauri 2.0 Stable Release announcement](https://v2.tauri.app/blog/tauri-20/) — capability system, plugin architecture (HIGH confidence, official)
- [Tauri SQL Plugin docs](https://v2.tauri.app/plugin/sql/) — path restriction to AppConfig, migration API (HIGH confidence, official)
- [Tauri State Management docs](https://v2.tauri.app/develop/state-management/) — Mutex pattern, AppHandle, runtime state updates (HIGH confidence, official)
- [Tauri Calling Rust from Frontend docs](https://v2.tauri.app/develop/calling-rust/) — invoke() API, command registration, async commands (HIGH confidence, official)
- [Tauri Vite Integration docs](https://v2.tauri.app/start/frontend/vite/) — vite.config.ts changes, package.json scripts, tauri.conf.json structure (HIGH confidence, official)
- [Tauri Project Structure docs](https://v2.tauri.app/start/project-structure/) — src-tauri/ layout, capabilities/ directory (HIGH confidence, official)
- [Tauri GitHub Actions CI docs](https://v2.tauri.app/distribute/pipelines/github/) — build matrix, platform dependencies, tauri-apps/tauri-action (HIGH confidence, official)
- [Tauri print feature request #4917](https://github.com/tauri-apps/tauri/issues/4917) — no stable native print API; window.print() works via system webview (MEDIUM confidence — issue tracker)
- `src/storage/adapter.ts` — FINAL 12-method interface, AdapterKind union (HIGH confidence — direct codebase read)
- `src/storage/index.ts` — initAdapter(), probe logic, getAdapterKind() (HIGH confidence — direct codebase read)
- `src/storage/local.ts` — LocalAdapter pattern for FileBackedAdapter to mirror (HIGH confidence — direct codebase read)
- `src/lib/migrations/index.ts` — CURRENT_VERSION=5, migration ladder v0→v5 (HIGH confidence — direct codebase read)
- `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` — StorageAdapter FINAL invariant, server/ rationale, adapter selection design (HIGH confidence — authoritative planning document)
- `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-CONTEXT.md` — useSettings via localStorage PERS-03 invariant; Settings is local config, not entity data (HIGH confidence — authoritative planning document)

---

*Architecture research for: AussieLedger v2.0 — Tauri desktop integration onto v1.0 brownfield SPA*
*Researched: 2026-05-29*
