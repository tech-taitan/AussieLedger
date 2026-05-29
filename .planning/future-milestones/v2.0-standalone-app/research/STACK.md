# Technology Stack

**Project:** AussieLedger v2.0 — Standalone Tauri Desktop App
**Researched:** 2026-05-29
**Scope:** v2.0 ADDITIONS ONLY — what gets added on top of the v1.0 stack for the Tauri desktop shape. The existing v1.0 stack (React 19, TypeScript 5.8, Vite 6, Tailwind v4, motion, lucide, recharts, decimal.js, idb, Express, better-sqlite3, Zod, Vitest 2.1.9) is unchanged and not re-evaluated here.

---

## Recommended Stack Additions for v2.0

### Tauri Core

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@tauri-apps/cli` | **2.11.2** | Build + dev toolchain | Current stable as of 2026-05-29; `npm run tauri dev` wires to existing Vite dev server |
| `@tauri-apps/api` | **2.11.0** | Frontend JS bindings (window, event, path APIs) | Peer to CLI; use same minor series |
| Rust toolchain | 1.77.2+ | Tauri core compilation | Minimum required by Tauri 2.x plugins |

**Vite 6 compatibility:** HIGH confidence. Tauri v2 officially documents and recommends Vite as the frontend bundler. The `tauri.conf.json` points `devUrl: "http://localhost:5173"` at the Vite dev server; `npm run tauri dev` starts the Vite HMR server then opens the webview. No Vite 6–specific breaking issues found. Required `vite.config.ts` additions are minimal (see Integration Notes).

**Tauri vs Electron: choose Tauri.** Binary size is 3–10 MB vs Electron's 120–180 MB (ships its own Chromium). RAM at idle is ~50 MB vs ~150–300 MB. The sandboxed Rust core means the network allowlist is enforced at the OS layer, not just a polyfillable JS promise rejection. Electron has no equivalent hard-sandbox for outbound HTTP from the renderer. Electron's advantage (Node.js native module ecosystem, better-sqlite3 runs without shims) is moot once we resolve the SQLite backend question below.

---

### SQLite Backend: tauri-plugin-sql (Rust/sqlx) — RECOMMENDED over Node sidecar

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@tauri-apps/plugin-sql` | **2.4.0** (npm) | Frontend JS bindings to SQLite | Official Tauri plugin; ships as part of the compiled binary |
| `tauri-plugin-sql` | **2.4.0** (Rust crate, Cargo.toml) | Rust sqlx wrapper exposed to frontend | Statically linked; no Node runtime bundled; no `.node` native binding |

**Why tauri-plugin-sql over keeping the Node sidecar:**

The v1.0 stack runs an Express + better-sqlite3 server (`server/`) that the SPA calls via HTTP. For the Tauri desktop shape there are two paths:

| Path | What ships | Bundle size delta | Transaction support | Maintenance |
|------|-----------|------------------|---------------------|-------------|
| **Node sidecar** (keep `server/`) | Entire Node.js runtime (~50 MB via `pkg`) + better-sqlite3 native `.node` binary | +50–70 MB per platform | Full (`db.transaction()` synchronous) | Must cross-compile 3 sidecar targets; `pkg` has known issues with native `.node` modules; CI complexity |
| **tauri-plugin-sql** (official) | Statically linked into Tauri Rust binary | ~0 MB delta (already have Rust binary) | `execute('BEGIN')` workaround; no official API (issue #886 open) | First-party plugin; maintained by Tauri team; single binary |

**Verdict: tauri-plugin-sql.** The sidecar approach adds 50–70 MB to the installer, requires cross-compiling a Node binary for Windows/macOS/Linux x64/arm64 (6 sidecar targets), and `pkg` has documented trouble with native `.node` addons like better-sqlite3 because they must be recompiled per platform — defeating the purpose of `pkg`. The v1.0 SQL is plain SQL strings (no ORM), so migrating from `better-sqlite3` to `@tauri-apps/plugin-sql` is a surface-area swap, not a query rewrite.

**Transaction gap:** tauri-plugin-sql does not have a first-class transaction API (GitHub issue #886, open as of 2026-05-29). The workaround `execute('BEGIN IMMEDIATE')` / `execute('COMMIT')` / `execute('ROLLBACK')` works for single-connection SQLite but has known edge-case failures if an IPC call throws before ROLLBACK executes. For the v2.0 migration runner and auto-save flow, the recommended pattern is: batch all DDL/DML for a logical operation into a single `execute()` call by concatenating the SQL with a separator — SQLite's `exec` (which underlies the plugin) supports multi-statement strings. This sidesteps the multi-round-trip race condition. The existing `server/db/migrate.ts` uses `db.transaction()` synchronously; the FileBackedAdapter equivalent will reconstruct that pattern as a single concatenated `exec` call.

**Alternative if transactions are unacceptable:** `tauri-plugin-rusqlite2` (community crate, `razein97/tauri-plugin-rusqlite2`) adds explicit `beginTransaction` / `commitTransaction` / `rollbackTransaction` APIs backed by rusqlite. Use only if the `BEGIN`/`COMMIT` concatenation approach proves insufficient in practice.

---

### File System Access

| Plugin | npm Version | Cargo Version | Purpose |
|--------|-------------|---------------|---------|
| `@tauri-apps/plugin-fs` | **2.4.5** | `tauri-plugin-fs = "2"` | Read/write the `.aussieledger` SQLite file; `watch()` for external change detection |
| `@tauri-apps/plugin-dialog` | **2.6.0** | `tauri-plugin-dialog = "2"` | Native OS file open/save dialogs with `.aussieledger` filter |

**File open/save dialog — confirmed working for custom extensions:**

```typescript
import { open, save } from '@tauri-apps/plugin-dialog';

// File -> Open
const filePath = await open({
  multiple: false,
  filters: [{ name: 'AussieLedger File', extensions: ['aussieledger'] }],
});

// File -> Save As
const destPath = await save({
  defaultPath: 'MyBusiness.aussieledger',
  filters: [{ name: 'AussieLedger File', extensions: ['aussieledger'] }],
});
```

**File watching (external change detection):** `@tauri-apps/plugin-fs` includes `watch()` / `watchImmediate()` built-in, enabled via Cargo feature flag `features = ["watch"]`. No separate watch plugin needed. The `watch()` variant is debounced (good for auto-save detection); `watchImmediate()` fires on every inotify/FSEvents/ReadDirectoryChangesW event.

**File association (double-click `.aussieledger` opens the app):** Configured in `tauri.conf.json` under `bundle.fileAssociations`:

```json
{
  "bundle": {
    "fileAssociations": [
      {
        "ext": "aussieledger",
        "name": "AussieLedger Ledger File",
        "role": "Editor",
        "mimeType": "application/x-aussieledger"
      }
    ]
  }
}
```

Works on Windows (registry) and macOS (UTType in Info.plist). Linux file association via `.desktop` file; works for installed packages but not AppImage run-in-place.

---

### Network Sandbox

**Mechanism in Tauri 2.x: two independent layers, both required.**

**Layer 1 — Capability / Permission system (Rust-enforced):**
The `@tauri-apps/plugin-http` exposes `fetch()` to the webview via IPC. Without adding this plugin and granting its permission, Tauri's `window.__TAURI_INTERNALS__` IPC cannot make outbound HTTP. However: the underlying WebView (Chromium on Windows/Linux, WebKit on macOS) can still make native `fetch()` calls unless blocked by CSP. The capability system alone does not block native webview fetch.

**Layer 2 — Content Security Policy (enforced by the WebView engine):**
To truly forbid outbound HTTP from React code, set CSP in `tauri.conf.json`:

```json
{
  "app": {
    "security": {
      "csp": {
        "default-src": ["'self'", "ipc:", "http://ipc.localhost"],
        "connect-src": ["'none'"]
      }
    }
  }
}
```

`"connect-src": ["'none'"]` blocks all `fetch()`, `XMLHttpRequest`, and WebSocket from the React SPA. `ipc:` and `http://ipc.localhost` are the Tauri IPC transports and must be allowed.

**Note:** CSP is only applied when explicitly configured; without it, React can `fetch()` any URL. Setting `connect-src: 'none'` is the correct implementation of the "hard network sandbox" requirement.

**Do NOT install `@tauri-apps/plugin-http`.** That plugin grants outbound HTTP capability to the IPC layer. Since we are forbidding all outbound HTTP in v2.0, do not add this dependency at all. Future AI features that require network (v3+) should add the plugin with a scoped allowlist at that point.

---

### Single-Instance Lock

| Plugin | Cargo | Purpose |
|--------|-------|---------|
| (Rust-only, no npm package) | `tauri-plugin-single-instance = "2"` | Prevent two windows opening the same `.aussieledger` file |

Version: Rust crate `2.4.0` (latest as of 2026-05-29; no npm counterpart — plugin has no JS API by design).

The plugin passes `args` (the CLI arguments of the second attempted launch, which includes the file path if the user double-clicks a second `.aussieledger` file) to a callback in the first running instance. The first instance can then open the file in a new tab or raise a "file already open" dialog. The plugin must be registered first in `lib.rs` before all other plugins.

**Linux caveat:** Requires DBus; does not work inside flatpak/snap sandboxes unless DBus access is explicitly declared in the packaging manifest.

---

### Auto-Update (DEFERRED to v2.1 — research only)

| Plugin | npm Version | Cargo |
|--------|-------------|-------|
| `@tauri-apps/plugin-updater` | **2.10.1** | `tauri-plugin-updater = "2"` |

**Do NOT install this for v2.0.** This entry exists only to document what v2.1 will add.

Requirements when the time comes: a `updater-latest.json` static file hosted on GitHub Releases (the `tauri-action` GitHub Action generates this automatically), a signing keypair (`tauri signer generate`; private key in GitHub Secrets, public key in `tauri.conf.json`). Update signatures cannot be disabled — this is enforced by the Tauri binary. The update JSON can be served from GitHub Releases directly, satisfying the DEP-01 "no paid services" constraint.

---

### CI Build Matrix

**Use `tauri-apps/tauri-action@v0` (the official GitHub Action).**

Standard matrix for Windows + macOS + Linux producing `.msi` / `.dmg` / `.AppImage`:

```yaml
jobs:
  publish-tauri:
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: 'macos-latest'      # macOS arm64 (M1+)
            args: '--target aarch64-apple-darwin'
          - platform: 'macos-13'          # macOS x64 (Intel)
            args: '--target x86_64-apple-darwin'
          - platform: 'ubuntu-22.04'      # Linux x64 → AppImage + deb
            args: ''
          - platform: 'windows-latest'    # Windows x64 → .msi + .nsis
            args: ''

    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - name: Install Linux deps
        if: matrix.platform == 'ubuntu-22.04'
        run: |
          sudo apt-get update
          sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev \
            librsvg2-dev patchelf
      - uses: actions/setup-node@v4
        with: { node-version: 'lts/*', cache: 'npm' }
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - name: Install frontend deps
        run: npm ci
      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # Code signing vars go here (see Code Signing section)
        with:
          tagName: v__VERSION__
          releaseName: 'AussieLedger v__VERSION__'
          args: ${{ matrix.args }}
```

macOS requires two separate matrix entries (arm64 + x64) because Apple Silicon and Intel have different target triples and the Rust toolchain must compile for each. The `tauri-action` handles `--target` correctly.

Note on Windows ARM64: Tauri 2.9+ ships ARM64 Windows binaries. Add `aarch64-pc-windows-msvc` to the matrix if targeting Surface/Copilot+ devices. Skip for v2.0.

---

### Code Signing

**This section explicitly surfaces the DEP-01 "no paid services" tension.**

#### Windows

| Approach | Cost | SmartScreen outcome | CI complexity |
|----------|------|---------------------|---------------|
| **Unsigned** | $0 | "Windows protected your PC" warning on every download; users must click "Run anyway" (three clicks). Still executable — not blocked. | None |
| **Azure Artifact Signing** (formerly Trusted Signing) | $9.99/month + Azure account | SmartScreen trust builds over time (OV-equivalent); near-immediate trust after enough downloads | Medium: Azure app registration + GitHub Secrets |
| **EV Certificate** (DigiCert / Sectigo) | ~$300–500/year; requires hardware HSM | Immediate SmartScreen trust; zero warning | High: must use Azure Key Vault or physical HSM; CI needs `relic` signing tool |
| **SignPath Foundation** | Free for qualifying OSS projects | OV-equivalent trust; SmartScreen warning possible until reputation builds | Medium: GitHub integration; requires OSI-approved license (Apache 2.0 qualifies) |

**Recommendation for v2.0:** Start unsigned for development and CI testing. Apply to SignPath Foundation (free, Apache 2.0 project qualifies at signpath.org) for the first public release. This satisfies DEP-01 at zero cost while providing real certificate trust. Azure Artifact Signing at $9.99/month is the fallback if SignPath Foundation approval takes too long.

**Do NOT buy an EV certificate.** EV certs require hardware HSM storage (physical device or Azure Key Vault — both paid). The cost ($300–500/year + HSM) conflicts with DEP-01.

#### macOS

| Approach | Cost | Gatekeeper outcome |
|----------|------|-------------------|
| **Unsigned + unnotarized** | $0 | macOS 15+ (Sequoia/Tahoe): "App is damaged and can't be opened" — users cannot run it at all without `xattr -d com.apple.quarantine`. **Effectively unshippable for non-technical users.** |
| **Apple Developer ID** (code signed + notarized) | $99 USD/year Apple Developer Program | Gatekeeper passes; installs silently |

**macOS is the harder problem.** Since macOS Sequoia 15.1 (2024), Apple removed the "Open Anyway" shortcut in Settings > Security. The quarantine attribute removal via `xattr` is a terminal command that non-technical users cannot be expected to run. Distributing an unsigned macOS app to the target audience (non-accountant business owners) is not viable.

**Recommendation:** The $99/year Apple Developer Program fee directly conflicts with DEP-01. Two options:

1. **Accept the friction:** Ship macOS as "experimental / developer-only" in v2.0, documented with `xattr` instructions. Non-macOS users are unblocked. Revisit before any public macOS release.
2. **Community sponsorship:** Accept donations via GitHub Sponsors for the Apple Developer Program fee. Apache 2.0 project receiving donations is standard; the fee is infrastructure, not a paid service in the product critical path.

**Linux:** No code signing required. AppImage runs as-is; `.deb` installs without warnings. No cost.

---

## Pinned Versions Table

| Package | Version | Where | Install |
|---------|---------|-------|---------|
| `@tauri-apps/cli` | 2.11.2 | npm devDep | `npm install -D @tauri-apps/cli@2.11.2` |
| `@tauri-apps/api` | 2.11.0 | npm dep | `npm install @tauri-apps/api@2.11.0` |
| `@tauri-apps/plugin-sql` | 2.4.0 | npm dep | `npm install @tauri-apps/plugin-sql@2.4.0` |
| `@tauri-apps/plugin-dialog` | 2.6.0 | npm dep | `npm install @tauri-apps/plugin-dialog@2.6.0` |
| `@tauri-apps/plugin-fs` | 2.4.5 | npm dep | `npm install @tauri-apps/plugin-fs@2.4.5` |
| `tauri-plugin-sql` | 2.4.0 | Cargo.toml | `tauri-plugin-sql = { version = "2", features = ["sqlite"] }` |
| `tauri-plugin-fs` | 2 | Cargo.toml | `tauri-plugin-fs = { version = "2", features = ["watch"] }` |
| `tauri-plugin-dialog` | 2 | Cargo.toml | `tauri-plugin-dialog = "2"` |
| `tauri-plugin-single-instance` | 2 | Cargo.toml | `tauri-plugin-single-instance = { version = "2", target... }` |
| `@tauri-apps/plugin-updater` | 2.10.1 | npm dep (v2.1 only) | `npm install @tauri-apps/plugin-updater@2.10.1` |
| `tauri-plugin-updater` | 2 | Cargo.toml (v2.1 only) | `tauri-plugin-updater = "2"` |

**Rust minimum:** 1.77.2  
**Node.js minimum:** LTS (20.x or 22.x)

---

## Integration Notes

### Vite Config Changes Required

Add to `vite.config.ts`:

```typescript
export default defineConfig({
  // Existing config preserved...
  clearScreen: false,       // Tauri captures stderr; don't clear
  server: {
    port: 5173,
    strictPort: true,       // Fail fast if 5173 is taken
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],  // Expose Tauri env vars to frontend
  build: {
    target: process.env.TAURI_ENV_PLATFORM === 'windows'
      ? 'chrome105'
      : 'safari13',         // Match Tauri's bundled webview version
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
});
```

### StorageAdapter Integration Point

The Phase 3 `StorageAdapter` interface is the correct seam. v2.0 adds a `FileBackedAdapter` that:
1. Opens the user-selected `.aussieledger` SQLite file via `@tauri-apps/plugin-sql`
2. Implements the same `StorageAdapter` interface (entities, accounts, entries, audit) as `ServerAdapter`
3. Replaces the `ServerAdapter`'s Express HTTP calls with direct `db.execute()` / `db.select()` IPC calls

The v1.0 SQL schema (DDL in `server/db/migrations/`) is directly reusable — no query rewrite. The migration runner logic from `server/db/migrate.ts` reconstructs as a `FileBackedAdapter.migrate()` that runs each SQL file as a multi-statement `execute()` call.

**Key difference from ServerAdapter:** `@tauri-apps/plugin-sql` is asynchronous (Promise-based IPC). The existing `ServerAdapter` is already async (fetch). No sync/async boundary change required.

### `window.print()` in Tauri Webview

`window.print()` **works** in Tauri's webview and invokes the OS native print dialog. This is confirmed by Tauri's use of WRY (the webview library) which exposes the browser print API. The v1.0 decision "no PDF library — `window.print()` + `@media print` CSS" remains valid for v2.0.

**Caveat:** There is no programmatic/silent PDF generation API in Tauri 2 (GitHub issues #4917, #12284 are open feature requests). This means print-to-PDF requires user interaction with the system print dialog. For v2.0 this is acceptable — the v1.0 UX pattern is preserved. Do not add a PDF library.

### File Watcher for "File Changed Externally"

When the user has their `.aussieledger` file on a NAS or USB drive, another process could write to it. The `watch()` function from `@tauri-apps/plugin-fs` (with `features = ["watch"]` in Cargo.toml) covers this:

```typescript
import { watch } from '@tauri-apps/plugin-fs';

const unwatch = await watch(currentFilePath, (event) => {
  if (event.type === 'modify') {
    // Show "File changed externally — reload?" dialog
  }
}, { recursive: false });
```

No separate plugin needed.

---

## Trade-offs Considered

### Why NOT keep the Express + better-sqlite3 server as a Tauri sidecar

The v1.0 `server/` directory is an Express HTTP server backed by better-sqlite3. It could theoretically be bundled as a Tauri sidecar binary. The reasons not to:

1. **Bundle size:** `pkg` (the Node-to-binary tool) bundles a full Node.js runtime (~50 MB compressed). The current Tauri binary without a sidecar is ~3–8 MB. Adding the sidecar triples the installer size.

2. **Cross-compilation:** A `better-sqlite3` sidecar requires a separately compiled `.node` native addon for each of 5 platforms (win-x64, win-arm64, mac-arm64, mac-x64, linux-x64). The CI matrix becomes a 5×5 matrix of platform × Node version. `pkg` has documented issues with native addons because they cannot be compiled into the JS bundle — they must be bundled separately as platform-specific `.node` files.

3. **IPC overhead:** The sidecar communicates with Tauri via `stdin`/`stdout` IPC (pipes). Every database query crosses two IPC boundaries: React → Tauri Rust core → sidecar stdin/stdout → Node → SQLite → back. `@tauri-apps/plugin-sql` crosses only one: React → Rust IPC → SQLite (via sqlx).

4. **Port conflicts and firewall:** The sidecar Express server would need a TCP port. On Windows this triggers firewall dialogs on first run. `@tauri-apps/plugin-sql` needs no port.

5. **Migration cost:** The v1.0 server SQL is plain strings. Migrating to `plugin-sql`'s `execute()` / `select()` API is a surface-area swap, not a rewrite. The query logic is identical.

### Why NOT Electron

Electron ships a full Chromium engine (~120 MB on disk, ~150–300 MB RAM at idle). Tauri uses the OS-native webview (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux). For AussieLedger v2.0 the meaningful differences are:

- Tauri binary: ~4–8 MB installer vs Electron: ~130–180 MB installer
- Tauri network sandbox is OS-enforced (CSP + no-http-plugin); Electron's network restrictions are renderer-process polyfills that can be bypassed from the main process
- Tauri requires the user to have WebView2 on Windows (auto-installed on Win10 21H2+; bundled in NSIS installer as fallback); Electron always ships its own Chromium
- Electron has better native module support (better-sqlite3 works natively); this advantage is not worth the 15–20× size increase given the sidecar trade-off analysis above

---

## What NOT to Add

| Do Not Add | Why | Alternative |
|------------|-----|-------------|
| `@tauri-apps/plugin-http` | Grants outbound HTTP to the IPC layer — directly undermines the network sandbox | Omit; the hard-sandbox is the point |
| Electron | 15–20× larger binary; no meaningful technical advantage over Tauri for this use case | Tauri 2.x |
| Node.js sidecar + `pkg` | +50–70 MB installer; cross-compilation complexity for native addons | `@tauri-apps/plugin-sql` |
| `node-notifier` | Desktop notifications require a separate npm package in Electron/Node world | Tauri has `tauri-plugin-notification` built-in (not needed for v2.0, but it exists for v2.1+) |
| `electron-store` | Electron config storage | Tauri has `tauri-plugin-store` built-in; not needed for v2.0 (settings stay in `localStorage` per Phase 6 pattern) |
| PDF library (`@react-pdf/renderer`, `jsPDF`, `puppeteer`) | `window.print()` continues to work inside Tauri webview; no regression from v1.0 | `window.print()` + `@media print` CSS (unchanged) |
| `tauri-plugin-updater` in v2.0 | Auto-update deferred to v2.1 per PROJECT.md scope | Add in v2.1 milestone |
| `tauri-plugin-rusqlite2` (community) | Only needed if `BEGIN`/`COMMIT` concatenation proves insufficient | Add only if official plugin transaction gap causes correctness issues |

---

## Sources

- Tauri 2 release versions (HIGH confidence): https://v2.tauri.app/release/ — verified 2026-05-29; @tauri-apps/cli 2.11.2, @tauri-apps/api 2.11.0
- @tauri-apps/plugin-sql npm version (MEDIUM confidence, from search result): `2.4.0` last published ~2 months before 2026-05-29; crate history at https://docs.rs/crate/tauri-plugin-sql/latest confirms 2.3.2 / 2.4.0 sequence
- @tauri-apps/plugin-dialog 2.6.0 (MEDIUM confidence): npm search result 2026-05-29
- @tauri-apps/plugin-fs 2.4.5 (MEDIUM confidence): npm search result 2026-05-29
- @tauri-apps/plugin-updater 2.10.1 (MEDIUM confidence): npm page confirmed 2026-05-29
- tauri-plugin-single-instance 2.4.0 Rust crate (MEDIUM): docs.rs link in search results 2026-05-29
- Tauri CSP documentation: https://v2.tauri.app/security/csp/ — confirmed `connect-src: 'none'` blocks fetch()
- Tauri capabilities documentation: https://v2.tauri.app/security/capabilities/
- Tauri HTTP plugin scope: https://v2.tauri.app/reference/javascript/http/
- Tauri plugin-sql transaction gap: https://github.com/tauri-apps/plugins-workspace/issues/886 (open, "help wanted")
- Tauri sidecar Node.js documentation: https://v2.tauri.app/learn/sidecar-nodejs/
- Tauri GitHub Actions pipeline: https://v2.tauri.app/distribute/pipelines/github/
- Tauri Windows code signing: https://v2.tauri.app/distribute/sign/windows/
- macOS Sequoia 15.1 unsigned app block: OSnews report + MacRumors forum, 2024
- SignPath Foundation (free OSS signing): https://signpath.org/ — Apache 2.0 license qualifies
- Azure Artifact Signing pricing ($9.99/month): https://azure.microsoft.com/en-us/products/artifact-signing
- window.print() in Tauri (no silent PDF API): https://github.com/tauri-apps/wry/issues/707, https://github.com/tauri-apps/tauri/issues/4917
- File association config: https://v2.tauri.app/reference/config/ — `bundle.fileAssociations` field
- Tauri Vite integration: https://v2.tauri.app/start/frontend/vite/
- Node sidecar bundle size reference: https://github.com/tauri-apps/tauri/issues/8614

---

*v2.0 stack additions research — AussieLedger Tauri desktop milestone*
*Researched: 2026-05-29*
