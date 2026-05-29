# Domain Pitfalls — v2.0 Standalone Desktop (Tauri + SQLite + Cross-Platform)

**Domain:** Tauri 2.x desktop packaging of an existing React+Vite SPA with Express+better-sqlite3 backend
**Researched:** 2026-05-29
**Scope:** v2.0 stack additions only — Tauri shell, file-backed SQLite, cross-platform CI, code signing, network sandbox, v1.0-to-v2.0 migration. Generic React/Vite pitfalls from v1.0 research are NOT repeated here.
**Confidence:** HIGH for SQLite/WAL/cloud-sync (SQLite official docs). HIGH for code-signing SmartScreen (Tauri official + Microsoft Q&A). MEDIUM for Tauri-specific CI race conditions (community reports). MEDIUM for sqlx NUMERIC affinity (confirmed open issue, mechanism verified).

---

## Prioritised Pitfall Index (most-likely-to-bite first)

| # | Pitfall | Phase | Hard-Block? |
|---|---------|-------|-------------|
| 1 | Decimal strings coerced by sqlx NUMERIC affinity | Wave 2 / StorageAdapter swap | HARD-BLOCK |
| 2 | better-sqlite3 cannot be bundled in a Tauri binary — wrong architecture | Wave 0 scaffold | HARD-BLOCK |
| 3 | v1.0-to-v2.0 import: `_v: 5` JSON initialised at `_v: 6`, migration runs twice | Wave 2 / Migration | HARD-BLOCK |
| 4 | WAL + cloud sync: `.aussieledger-wal` synced without main file = corruption | Wave 2 / UAT | HARD-BLOCK |
| 5 | CSP collision between Tauri webview and Vite dev server | Wave 0 scaffold | HARD-BLOCK |
| 6 | Network sandbox: AI proxy silently re-enabled via allowlist wildcard | Wave 2 / Security review | HARD-BLOCK |
| 7 | SmartScreen warning on Windows even with a signed cert | CI phase | Known-Risk |
| 8 | macOS notarisation of sidecar binary hangs or fails | CI phase | HARD-BLOCK (if using sidecar) |
| 9 | Tauri updater private key leaked into Vite bundle via `envPrefix` | Wave 2 / CI | HARD-BLOCK |
| 10 | SQLite file on a network share — POSIX advisory locks fail, corruption | UAT / Docs | Known-Risk |
| 11 | `window.print()` broken or inconsistent across Tauri webview OSes | Wave 2 / UAT | HARD-BLOCK |
| 12 | v1.0 JSON export shape → v2.0 import crash: BigInt-like decimal strings | Wave 2 / Migration | HARD-BLOCK |
| 13 | Concurrent writes from two Tauri windows of the same file | Wave 2 | Known-Risk |
| 14 | CI matrix: Rust cache poisoning + Windows node-gyp failure | CI phase | Known-Risk |
| 15 | macOS runner disk exhaustion mid-bundle | CI phase | Known-Risk |
| 16 | `import.meta.env.VITE_` env vars baked at build time, unavailable at runtime | Wave 0 scaffold | Known-Risk |
| 17 | Auto-update: wrong public key pinned; first update silently fails | v2.1 (deferred, plant flag now) | Known-Risk |
| 18 | Cross-OS path separator + Documents folder location | Wave 2 / UAT | Known-Risk |
| 19 | Font + locale-aware number formatting differs per OS in webview | Wave 2 / UAT | Known-Risk |
| 20 | Linux AppImage flagged as untrusted by GNOME Files | CI / UAT | Known-Risk |

---

## Critical Pitfalls (Hard-Block — must fix before next phase can start)

---

### Pitfall 1: Decimal Strings Coerced by sqlx NUMERIC Affinity

**WHAT:**
`tauri-plugin-sql` uses sqlx under the hood. If columns are declared with `NUMERIC` affinity in SQLite (e.g. `NUMERIC`, `DECIMAL`, `NUMBER` in DDL), sqlx will attempt type coercion on read. A value stored as the TEXT `"1234.56"` can be read back as the float `1234.5600000000002` — breaking to-the-cent BAS gold tests.

**WHY:**
SQLite's type affinity rules: `NUMERIC` affinity causes TEXT that "looks like a number" to be coerced into INTEGER or REAL on storage. sqlx compounds this by mapping NUMERIC-affinity columns to Rust `f64` when no explicit type annotation is present. The `decimal.js` contract (TEXT strings, never floats) is preserved end-to-end in v1.0's `better-sqlite3` path because better-sqlite3 returns everything as JavaScript strings unless you use `.pluck()` with an explicit number column — but sqlx doesn't have that escape hatch for TEXT-affinity columns. Confirmed open issue: `tauri-apps/plugins-workspace#3158` ("unsupported datatype: NUMERIC").

**PREVENTION:**
1. Declare ALL money columns as `TEXT` affinity in every `.sql` migration file — never use `NUMERIC`, `DECIMAL`, `REAL`, `FLOAT`, or `NUMBER` for any column that holds a `decimal.js` value.
2. Write a migration test that asserts: insert `"1234.56"` as TEXT, read it back via the adapter, confirm it equals `new Decimal("1234.56")` with no floating-point residue.
3. Add a CI-level structural lint rule: `grep -r "NUMERIC\|DECIMAL\|REAL\|FLOAT" server/db/migrations/ src-tauri/migrations/` exits non-zero if any money column uses a numeric affinity.
4. If switching from better-sqlite3 to `tauri-plugin-sql`, write a before/after adapter parity test: same SQLite file, same queries, same decimal string output.

**PHASE:** Wave 2 — StorageAdapter swap / `FileBackedAdapter` implementation.
**ACCEPTANCE CRITERION:** BAS to-the-cent gold tests GREEN after the adapter swap. No new `.toNumber()` or `parseFloat()` calls on money values in the diff.
**HARD-BLOCK:** YES — incorrect decimal arithmetic propagates silently through every tax calculation.

---

### Pitfall 2: better-sqlite3 Cannot Be Bundled in a Tauri Binary — Architecture Mismatch

**WHAT:**
`better-sqlite3` is a native Node.js addon compiled against a specific Node ABI version and platform target triple. When you compile a Node.js sidecar binary with `pkg` or `@vercel/ncc`, native `.node` files are either excluded entirely (the binary crashes on `require('better-sqlite3')`) or included as files that need to be extracted to a temp directory at runtime. The extracted `.node` file must match the OS/arch of the user's machine AND the Node ABI embedded in the sidecar.

**WHY:**
`pkg` bundles pure JS but cannot meaningfully bundle native addons — it extracts them as snapshots to a temp directory. This temp directory path is non-deterministic and requires the sidecar to locate the `.node` file at runtime. On Windows, antivirus tools sometimes quarantine `.node` files extracted from a bundled executable. On macOS, the extracted `.node` file won't have a valid code signature, causing Gatekeeper to block it.

The 60 MB+ sidecar overhead for Node+Express+better-sqlite3 is also noted by the Tauri team as disproportionate for what is a database-only concern.

**PREVENTION:**
The preferred path for v2.0 is to abandon the Node+Express sidecar and use **`tauri-plugin-sql`** (sqlx-backed, pure Rust, no native Node addon). The `FileBackedAdapter` in v2.0 speaks to `tauri-plugin-sql` directly via Tauri IPC, not over HTTP. The `StorageAdapter` interface is preserved; the implementation changes. This avoids the entire native module bundling problem.

If preserving the Express+better-sqlite3 sidecar is a firm requirement:
1. Use `pkg --targets node18-win-x64,node18-mac-arm64,node18-mac-x64,node18-linux-x64` — each target produces a self-contained binary.
2. Use `node-pre-gyp` or `prebuild-install` to embed per-arch `.node` prebuilds inside the `pkg` snapshot.
3. Accept 60–90 MB sidecar overhead per platform.
4. Each sidecar binary must be codesigned separately (macOS: requires the `.node` extracted temp file to be excluded from Gatekeeper validation — set `hardened_runtime: true` plus a macOS entitlement).

**PHASE:** Wave 0 scaffold — architectural decision must be locked before any FileBackedAdapter code is written.
**ACCEPTANCE CRITERION:** A "hello SQLite" smoke test reads and writes a TEXT decimal value via the chosen path and produces the correct string on read-back, on all three platforms (matrix CI).
**HARD-BLOCK:** YES — picking the wrong path here causes a sidecar-rewrite mid-development.

---

### Pitfall 3: v1.0-to-v2.0 Import — Migration Runs Twice (`_v: 5` → `_v: 6` double-apply)

**WHAT:**
A v1.0 user exports a `_v: 5` JSON. In v2.0, `FileBackedAdapter.open()` initialises a brand-new `.aussieledger` SQLite file by running all SQL migrations to schema version 6. When `importAll(json)` is then called, the import path calls `migrate(json)` which tries to step from `_v: 5` to `_v: 6` — but the SQLite file already has `schema_migrations` row for migration `006`. The migration runner must detect "already applied" and skip. If it doesn't, it may try to re-run a migration that is no longer idempotent (e.g., one that renames a column).

**WHY:**
The existing v1.0 migration runner (`server/db/migrate.ts`) correctly checks `schema_migrations` before running. The v2.0 `FileBackedAdapter` will have two migration systems: the JSON/in-memory `migrate()` chain (for import round-trip) and the SQL migration runner (for the SQLite file). These are independent and must not conflict. The risk is that `importAll()` short-circuits to "the file is already at v6, nothing to do" while skipping the JSON-level `_v: 5 → _v: 6` transform that maps field names.

**PREVENTION:**
1. The import path is: (a) parse JSON, (b) run JSON `migrate()` to bring the payload to `CURRENT_JSON_VERSION`, (c) write the migrated payload to the SQLite file — do NOT re-run SQL DDL migrations on import.
2. The JSON migration chain and the SQL DDL migration chain are separate concerns. The JSON chain handles field-name / shape changes to the exported payload; the SQL chain handles SQLite schema DDL. They must not be conflated.
3. Write an explicit test: open a fresh `.aussieledger` file (empty, schema v6), import a `_v: 5` JSON fixture, assert: (a) data is present, (b) `schema_migrations` table still has exactly one row per migration (no duplicates), (c) no migration was run twice.
4. If the v2.0 JSON export format changes (e.g., adds a `_v: 6` with new fields), the import path must handle both `_v: 5` (v1.0 export) and `_v: 6` (v2.0 export) cleanly.

**PHASE:** Wave 2 — Migration / v1.0-to-v2.0 import flow.
**ACCEPTANCE CRITERION:** Import round-trip test passes with a hand-built `_v: 5` fixture; `schema_migrations` has no duplicate rows after import.
**HARD-BLOCK:** YES — data corruption in the migration chain is unrecoverable without the original JSON export.

---

### Pitfall 4: WAL Mode + Cloud Sync — `.aussieledger-wal` Synced Without Main File = Corruption

**WHAT:**
When SQLite WAL mode is enabled (`PRAGMA journal_mode=WAL`), it creates two companion files: `myfile.aussieledger-wal` and `myfile.aussieledger-shm` alongside the main database. If the user puts the `.aussieledger` file in their Dropbox or iCloud folder, the sync client will sync the three files at different times. If a user opens the database on a second machine when only the main file has synced (before the `-wal` file arrives), uncommitted transactions are lost or the database is flagged as corrupt.

Additionally: a user who copies "just the `.aussieledger` file" via Finder or Windows Explorer while the app is open gets a stale snapshot that may be corrupt if WAL transactions are pending.

**WHY:**
SQLite WAL mode is the recommended mode for desktop applications (better concurrency than journal mode), but it comes with the invariant that all three files must travel together as a unit. Cloud sync clients treat files independently. Dropbox explicitly does not work correctly with live SQLite WAL databases (confirmed in SQLite FAQ and community reports).

**PREVENTION:**
1. Force a WAL checkpoint and a database close before any "Save As" or "Export" operation — use `PRAGMA wal_checkpoint(TRUNCATE)` to fold the WAL back into the main file before the copy. Then copy only the main file.
2. Display a warning in the app UI: "If you store your AussieLedger file in Dropbox or iCloud, do NOT open it from two devices at the same time. Always use File → Export to make a portable backup."
3. When opening a file, detect if a stale `-wal` file exists without the app having written it (file modification time older than the main file) and warn the user before proceeding.
4. Consider using WAL2 (if SQLite version supports it) or falling back to `DELETE` journal mode for files the user places in known cloud-sync directories — but this is complex. The pragmatic solution is the checkpoint-before-copy flow and the documentation warning.
5. The "Save As" flow must use `sqlite3_backup_*` API (or equivalent in sqlx) rather than a raw file copy, because the backup API handles WAL state correctly.

**PHASE:** Wave 2 — FileBackedAdapter + File → Save As / Export flow; UAT.
**ACCEPTANCE CRITERION:** "Save As" test: write data, call Save As, close the app, open the saved file — data is intact and no corruption is detected. WAL warning documented in README.
**HARD-BLOCK:** YES — silent data loss on a user's tax file is catastrophic.

---

### Pitfall 5: CSP Collision Between Tauri Webview and Vite Dev-Server

**WHAT:**
Tauri 2.x injects its own `Content-Security-Policy` at compile time by scanning frontend assets and injecting nonces/hashes for scripts and styles. If `tauri.conf.json` also has a manual `csp` entry, the two can conflict — particularly around `style-src 'unsafe-inline'` (needed by Tailwind v4's runtime CSS and `@media print` style tags), `script-src` (needed by Vite HMR websocket in dev mode), and `connect-src` (needed by the Vite dev server's `/api` proxy and HMR).

In production builds, Tauri's injected CSP may block inline styles that Tailwind v4 emits, causing the entire UI to render unstyled with no console error in the webview — the CSP violation is silent unless DevTools is open.

**WHY:**
Tauri 2 auto-CSP injection is designed for security but does not know about the Tailwind v4 JIT runtime or the Vite HMR websocket (`ws://localhost:5173`). The `connect-src` directive must include `ws://localhost:5173` for HMR, `http://localhost:4000` for the Express proxy (if sidecar), and `ipc://localhost` for Tauri IPC. In dev, these are different from prod; `tauri.conf.json` supports `tauri dev` vs `tauri build` configurations but this requires explicit setup.

**PREVENTION:**
1. In `tauri.conf.json`, set CSP explicitly in the `security.csp` field. Do NOT rely on Tauri's auto-injection without testing in production build mode, not just dev.
2. For Tailwind v4, include `style-src 'self' 'unsafe-inline'` — Tailwind's CSS-in-JS / atomic class approach requires inline styles in some configurations.
3. For Vite HMR in dev mode, add `connect-src 'self' ws://localhost:5173 http://localhost:4000`.
4. Test the production build locally (`tauri build`) before the first CI run — CSP violations only appear in the actual webview, not in a browser devtools preview.
5. Add a startup smoke test that checks: the app renders its main nav without a blank screen after a production Tauri build.

**PHASE:** Wave 0 scaffold — verify CSP immediately after first `tauri init` + `tauri dev` integration.
**ACCEPTANCE CRITERION:** `tauri build` output renders identically to dev mode; no blank screens; `@media print` stylesheet applies in webview.
**HARD-BLOCK:** YES — a broken CSP in production renders the entire UI blank with no error message visible to the user.

---

### Pitfall 6: Network Sandbox — AI Proxy Silently Re-Enabled via Allowlist Wildcard

**WHAT:**
The v2.0 design intent is a hard network sandbox: no outbound HTTP by default. The AI proxy (`/api/ai/match-accounts`) must be unreachable unless the user explicitly enables it. If the Tauri `capabilities` allowlist uses an overly broad HTTP pattern (e.g., `"http://*"` or `"https://*"`), the AI proxy becomes reachable even when the user believes AI features are disabled — defeating the DEP-01 "AI must be strictly optional" invariant.

A related failure mode: in dev mode, `http://localhost:4000` must be in the allowlist for the sidecar API to work. A developer adds `"http://localhost:*"` as a catch-all, this gets committed, and the production build ships with localhost HTTP access enabled — which allows any local process on the user's machine to receive Tauri fetch calls.

**WHY:**
Tauri 2's `capabilities` system (replacing the v1 `allowlist`) uses a JSON file per capability. The `http` plugin's permission scope is specified as a list of allowed URL patterns. Patterns support wildcards. A developer who starts with `"http://*"` to "get things working" often forgets to tighten it. The `tauri.conf.json` CSP and the `capabilities/*.json` allowlist are independent — a permissive CSP header does not substitute for a tightened allowlist, and vice versa.

**PREVENTION:**
1. In `src-tauri/capabilities/default.json`, specify the exact minimal set of allowed outbound URLs. For v2.0: if the AI proxy is a future feature, add ZERO outbound HTTP URLs in the default capability. Add a separate `capabilities/ai-enabled.json` that is only included in the build when AI is explicitly configured.
2. Add a CI test: `grep -r '"http://\*"\|"https://\*"' src-tauri/capabilities/` exits non-zero.
3. The `IS_AI_ENABLED` check must gate the capability level, not just the UI toggle — if the capability is not granted, the `fetch()` call will fail at the Tauri layer regardless of UI state.
4. In dev mode, add the Vite dev server URL (`http://localhost:5173`) and Express sidecar URL (`http://localhost:4000`) as DEVELOPMENT-ONLY capabilities, not in the production capability set.
5. Review the capability file as part of every phase plan acceptance criteria.

**PHASE:** Wave 0 scaffold (initial capability setup) + Wave 2 (AI proxy integration point).
**ACCEPTANCE CRITERION:** A Tauri `tauri build` binary with AI disabled cannot make any outbound HTTP call — verify by attempting `fetch('https://example.com')` from the webview and confirming it is blocked.
**HARD-BLOCK:** YES — a permissive allowlist silently undermines the product's core data-sovereignty trust claim.

---

### Pitfall 7: macOS Notarisation of Sidecar Binary Hangs or Fails

**WHAT:**
If v2.0 uses the Express+better-sqlite3 sidecar approach (not `tauri-plugin-sql`), every binary in the bundle — including the sidecar `.node` addon and the Node.js runtime — must be individually codesigned AND notarised. Tauri's notarisation step (`notarytool`) submits the entire `.app` bundle but does not notarise sidecar binaries embedded in the bundle unless they are individually signed with `--deep` or handled explicitly. The notarisation can hang for 2–5 minutes normally, or for hours if Apple's notary service queue is backed up (documented cases: 4+ hours).

A specific confirmed bug: `tauri-apps/tauri#11992` — when using `externalBin` (sidecar), macOS notarisation fails because the sidecar binary is not part of the standard Tauri signing flow.

**WHY:**
Apple's notarisation requires every Mach-O binary in the bundle to be signed by the same Developer ID. Tauri handles its own binary but `externalBin` sidecars must be pre-signed before `tauri build`. The `notarytool` submission will be rejected if any binary in the bundle is unsigned or signed by a different identity.

**PREVENTION:**
1. If using the sidecar approach, add an explicit pre-sign step in the CI workflow: `codesign --deep --sign "Developer ID Application: ..." --options runtime src-tauri/binaries/sidecar-aarch64-apple-darwin` before `tauri build`.
2. Use the `tauri-action` GitHub Action's `tauriScript` option to inject the pre-sign step.
3. Set a notarisation timeout in CI of 30 minutes (`--wait` flag on `notarytool`). If it times out, mark the build as failed and retry — do NOT treat a timeout as success.
4. Switch to `tauri-plugin-sql` (eliminates the sidecar entirely and eliminates this pitfall).

**PHASE:** CI phase.
**ACCEPTANCE CRITERION:** macOS release build produces a notarised `.dmg` that passes `spctl --assess --verbose` on a clean macOS machine.
**HARD-BLOCK:** YES (if sidecar used). Known-Risk if `tauri-plugin-sql` path is chosen.

---

### Pitfall 8: Tauri Updater Private Key Leaked into Vite Bundle via `envPrefix`

**WHAT:**
CVE-2023-46115 / GHSA-2rcp-jvr4-r259 is a Tauri security advisory. The documented example configuration for Vite+Tauri uses `envPrefix: ['VITE_', 'TAURI_']` in `vite.config.ts`. This causes `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` (if set as environment variables) to be bundled into the Vite frontend output, exposing the auto-update signing private key to anyone who inspects the installer.

**WHY:**
Vite's `envPrefix` setting causes ALL environment variables matching the prefix to be embedded as `import.meta.env.*` in the bundled JS. The CI workflow that calls `tauri build` typically has `TAURI_PRIVATE_KEY` and `TAURI_KEY_PASSWORD` set as GitHub Actions secrets. If `envPrefix` includes `TAURI_`, those secrets are baked into the installer.

**PREVENTION:**
1. Set `envPrefix: ['VITE_']` ONLY — never `TAURI_` — in `vite.config.ts`.
2. Add a CI check: `grep -r "TAURI_" .env .env.production vite.config.ts` exits non-zero if any TAURI_ variable is referenced in the Vite config prefix.
3. If TAURI_ build-time constants are needed in the frontend (e.g., `TAURI_PLATFORM`), add them explicitly using Vite's `define` config, not via `envPrefix`.
4. Rotate the updater private key if this misconfiguration was ever present in a shipped build.

**PHASE:** Wave 0 scaffold (first `tauri init`) — bake the correct `envPrefix` from day one.
**ACCEPTANCE CRITERION:** CI produces `TAURI_PRIVATE_KEY` as a GitHub Actions secret; a post-build check confirms the key string does not appear in any `.js` file in the installer contents.
**HARD-BLOCK:** YES — leaking the updater signing key allows an attacker to ship malicious updates.

---

### Pitfall 9: `window.print()` Broken or Inconsistent Across Tauri Webview OSes

**WHAT:**
AussieLedger v1.0 relies on `window.print()` + `@media print` CSS for all tax-return output (working papers, BAS, Form I, Form C, Form T, Form P). In Tauri, the webview is not a browser — it is:
- **macOS:** WKWebView (WebKit/Safari)
- **Windows:** WebView2 (Chromium/Edge)
- **Linux:** WebKitGTK (WebKit)

`window.print()` is available in all three but its print dialog UX and CSS rendering differ. Confirmed Tauri issue `#4917` notes that there is no Tauri-level print API; `window.print()` triggers the native OS print dialog which bypasses Tauri's IPC. On macOS/WKWebView, `@page` CSS rules (page size, margins) are partially ignored. On WebKitGTK, `@media print` rules may not apply correctly to Tailwind utility classes if the stylesheet isn't loaded synchronously.

**WHY:**
The v1.0 test suite confirmed `window.print()` works in Chrome/Firefox (browser targets). Tauri's WebView2 on Windows and WKWebView on macOS are subtly different rendering engines with different CSS print behaviour. The existing `@media print` CSS was verified in browsers, not in Tauri webviews.

**PREVENTION:**
1. Add a manual cross-platform print UAT step to the CI phase acceptance criteria: open the app in a Tauri build on each OS, navigate to a tax return, trigger `window.print()`, verify the print preview shows working-paper layout without screen chrome.
2. Replace any `@page` margin rules that use `cm` units with unitless or `mm` equivalents — WebKit has historically been less reliable with `cm` in `@page`.
3. Add a Tauri-specific `tauri://localhost` URL scheme check: some `@media print` styles written to target `http://` origins may not apply when the page is served from `tauri://localhost`.
4. If `window.print()` proves unreliable, the fallback is a Tauri command that calls the OS print dialog via Rust — but this is significantly more work; confirm `window.print()` works on all three webviews before concluding it needs replacement.

**PHASE:** Wave 2 — after first Tauri integration; mandatory UAT step before the phase closes.
**ACCEPTANCE CRITERION:** Print-preview of a BAS working paper on all three OS targets (macOS, Windows, Linux) shows correct layout: no sidebar/nav chrome, ATO field codes visible, `DisclaimerFooter` present.
**HARD-BLOCK:** YES — `window.print()` is the entire v1.0 PDF/print story. If it breaks in Tauri, the feature doesn't exist until fixed.

---

### Pitfall 10: v1.0 JSON Export → v2.0 Import Crash — Decimal String Shape Mismatch

**WHAT:**
The v1.0 JSON export stores all monetary values as 2dp decimal strings via `src/lib/money.ts` serialization (e.g., `"1234.56"`). However, if a v1.0 Express+SQLite user has data that was serialized and deserialized via `better-sqlite3` with a non-TEXT column, the exported JSON may contain values like `1234.56` (a JSON number, not a string) or `"1234.5600000000001"` (a float-rounded string from an unguarded `JSON.stringify`). The v2.0 `importAll()` path passes values into `new Decimal(value)` — `new Decimal(1234.5600000000001)` produces a different value than `new Decimal("1234.56")`.

**WHY:**
The v1.0 `server/` routes use `better-sqlite3` which returns JavaScript types based on SQLite affinity. If any monetary column was ever declared with a numeric affinity (vs TEXT), `better-sqlite3` returns it as a JS `number`, and `JSON.stringify` produces `1234.56` (a JSON number). `new Decimal(1234.56)` is not the same as `new Decimal("1234.56")` — the former captures the float representation.

**PREVENTION:**
1. In the v2.0 `importAll()` JSON migration step, add a defensive coerce: for every field that represents money, apply `new Decimal(String(value).replace(/[^0-9.\-]/g, ''))` — this handles both string `"1234.56"` and number `1234.56` inputs safely.
2. Add an import test fixture that includes money values as JSON numbers (not strings) and asserts they are imported as correct 2dp Decimal values.
3. In the v2.0 import UI, display a checksum after import: "Imported X entities, Y accounts, Z journal entries. Total debit: $NNN. Total credit: $NNN." — gives the user a sanity check without needing to inspect raw data.
4. Document in the migration UX: "If your v1.0 data was stored in Express+SQLite mode, open a support issue if totals don't match after import."

**PHASE:** Wave 2 — import flow.
**ACCEPTANCE CRITERION:** Import test with a `_v: 5` fixture containing money values as JSON numbers passes; totals match a hand-calculated expected value.
**HARD-BLOCK:** YES — importing corrupted decimal values silently corrupts the user's tax records.

---

## Known Risks (Note in CONTEXT, Fix Opportunistically)

---

### Pitfall 11: SmartScreen Warning on Windows Even with a Signed Certificate

**WHAT:**
Even with an OV or EV code-signing certificate, Windows SmartScreen shows a "Windows protected your PC" warning for new or low-reputation executables. As of March 2024, EV certificates no longer grant instant SmartScreen bypass — reputation is accumulated organically over time and/or via Microsoft manual review submission.

**WHY:**
SmartScreen uses a reputation system (SmartScreen Application Reputation) that tracks download counts and reports from Windows Defender telemetry. A newly signed executable with zero download history shows the warning regardless of certificate type. An unsigned executable always shows the warning.

**PREVENTION:**
1. Sign the Windows installer with at minimum an OV certificate. The warning still appears for new releases but is dismissible (vs an unsigned installer which may be blocked outright).
2. Submit the installer to Microsoft's App Certification program or the Windows Defender "report a false positive" channel after release to begin building reputation.
3. Document in the README: "On first install, Windows may show a SmartScreen warning. Click 'More info' then 'Run anyway'. This is normal for a newly-released application."
4. For v2.1+ with higher download volume, reputation should accumulate and suppress the warning.

**PHASE:** CI phase / first Windows release.
**ACCEPTANCE CRITERION:** Installer is signed; README documents the SmartScreen flow; no unsigned binary shipped.
**HARD-BLOCK:** No — the app installs and runs; the warning is dismissible. However, unaddressed it causes significant user drop-off. Document and accept for v2.0.

---

### Pitfall 12: SQLite File on a Network Share — POSIX Advisory Locks Fail

**WHAT:**
SQLite uses POSIX `fcntl()` advisory locks for concurrency control. On NFS, SMB, and other network filesystems, these locks are either not implemented or return success without actually locking — meaning two processes can write simultaneously and corrupt the file. SQLite's own documentation explicitly states: "SQLite does not work correctly with network filesystems. Do not put SQLite database files on NFS."

**WHY:**
The v2.0 design deliberately allows users to put their `.aussieledger` file "on a USB stick, NAS, or encrypted drive." A NAS accessed via NFS or SMB is a network filesystem. The app will appear to work; corruption will be silent until a write conflict occurs.

**PREVENTION:**
1. Detect at file-open time whether the file is on a network filesystem. On macOS/Linux: check `statfs(path).f_type` for `NFS_SUPER_MAGIC` or similar; on Windows: check if the path starts with `\\` (UNC path). If detected, show a warning: "AussieLedger files on network drives may become corrupted. For best reliability, store your file on a local drive."
2. Do not block the open — the user may have a well-behaved NAS with proper POSIX locking. The warning is advisory.
3. Document in README: "Network drives (NAS, NFS, Samba) are not recommended for AussieLedger files. USB drives and locally-mounted encrypted volumes are safe."

**PHASE:** Wave 2 / UAT.
**ACCEPTANCE CRITERION:** The warning is displayed when a file on a UNC path is opened on Windows. README documents the limitation.
**HARD-BLOCK:** No — document and warn; block only if the detection is reliable.

---

### Pitfall 13: Concurrent Writes from Two Tauri Windows of the Same File

**WHAT:**
v2.0 is single-user-per-file by design (PROJECT.md: "multi-user concurrent edits not in scope"). However, a user can double-click the same `.aussieledger` file twice, opening two Tauri windows. Both windows will open the same SQLite file; both will attempt writes. SQLite's WAL mode handles concurrent readers well but concurrent writers serialize — the second writer will block. If both writers are the same process (two windows of the same Tauri app), SQLite handles this correctly. If they are different processes (user launched the app twice), the second process gets a `SQLITE_BUSY` error.

**WHY:**
Tauri's single-instance mode is opt-in, not default. Without `tauri-plugin-single-instance`, a user can open multiple app instances pointing at the same file.

**PREVENTION:**
1. Use `tauri-plugin-single-instance` (official Tauri plugin). When a second instance is launched, focus the existing window instead of opening a second instance.
2. As a belt-and-suspenders measure, open the SQLite file with `PRAGMA locking_mode=EXCLUSIVE` — this causes any attempt by a second process to open the same file to fail immediately with a clear error, rather than silently corrupting data.
3. If the file is already open (exclusive lock held), show: "This file is already open in another AussieLedger window."

**PHASE:** Wave 2.
**ACCEPTANCE CRITERION:** Opening the same `.aussieledger` file in a second app instance focuses the existing window (single-instance plugin) instead of opening a second connection.
**HARD-BLOCK:** No — WAL mode serialises writes; the race is unlikely to cause corruption. But it is an easy win with `tauri-plugin-single-instance`.

---

### Pitfall 14: CI Matrix — Rust Cache Poisoning + Windows node-gyp Failure

**WHAT:**
`swatinem/rust-cache@v2` caches the Rust compile artifacts. If a `Cargo.lock` change introduces a crate with a different feature set, the cached artifacts may be stale in ways that Rust's incremental compiler does not detect — causing mysterious linker errors or test failures that disappear after a `cargo clean`. On Windows, `node-gyp` (needed if the Express sidecar path is chosen) requires Visual Studio Build Tools; the GitHub Actions `windows-latest` runner includes these, but the `windows-2019` runner may not have the correct MSVC toolset version for a given `better-sqlite3` release.

**WHY:**
Windows GitHub Actions runners are the slowest in the Tauri CI matrix (Rust compile on Windows takes 2–4x longer than macOS). Teams often reduce Windows CI to "compile-only" and skip integration tests, missing platform-specific bugs.

**PREVENTION:**
1. Pin `swatinem/rust-cache@v2` and add `cache-on-failure: false` — this prevents a poisoned cache from persisting after a failed build.
2. Use `windows-latest` (not `windows-2019`) in the CI matrix; `windows-latest` tracks the current runner image which includes VS Build Tools.
3. If the sidecar path is chosen, add an explicit `node-gyp` rebuild step in the Windows CI job before `tauri build`.
4. Add a weekly scheduled CI run that does a full cache-busted build (`cache-on-failure: false`) to catch cache-masked failures.

**PHASE:** CI phase.
**ACCEPTANCE CRITERION:** CI matrix builds succeed on all three platforms (macOS, Windows, Linux) with a clean cache. A scheduled weekly run with cache busted stays green.
**HARD-BLOCK:** No — flaky CI is an ops cost, not a data correctness issue.

---

### Pitfall 15: macOS Runner Disk Space Exhaustion Mid-Bundle

**WHAT:**
GitHub Actions macOS runners (standard, not large) have ~14 GB of free disk after the runner image. A Tauri build that includes: Rust compile artifacts (~3–5 GB), frontend build (~500 MB), Node modules (~500 MB), universal macOS binary (two arch targets = ~2x Rust artifacts), and `.dmg` output can push the runner to its disk limit. Builds that fail at the `tauri build` or `codesign` step with "no space left on device" produce no artifact and waste ~20 minutes of CI time.

**WHY:**
Rust incremental compilation produces large artifact trees. The macOS universal binary target (`universal-apple-darwin`) compiles both `x86_64-apple-darwin` and `aarch64-apple-darwin` in series — doubling the artifact size.

**PREVENTION:**
1. Add a pre-build disk-space check in the macOS CI job: `df -h && du -sh ~/.cargo/registry/cache` — alert if less than 5 GB free.
2. Add a cache eviction step before the build: `cargo clean --package tauri-build` to remove the largest intermediate artifacts.
3. Use the `macos-latest-large` runner (paid) if disk space is consistently the bottleneck — this runner has ~60 GB free.
4. Alternatively, build `aarch64-apple-darwin` and `x86_64-apple-darwin` as separate CI jobs and combine with `lipo` as a post-step — reduces peak disk per job.

**PHASE:** CI phase.
**ACCEPTANCE CRITERION:** macOS CI job completes with disk to spare; no "no space left on device" errors in build logs.
**HARD-BLOCK:** No — intermittent CI failure, not a correctness issue.

---

### Pitfall 16: `import.meta.env.VITE_*` Variables Baked at Build Time, Unavailable at Runtime

**WHAT:**
`VITE_GEMINI_API_KEY` and any other `VITE_*` variables are statically replaced by Vite at compile time via `import.meta.env`. In a Tauri desktop app, there is no `.env` file at runtime — the user cannot set environment variables before launching the app from the system launcher. Any logic that reads `import.meta.env.VITE_SOMETHING` in production assumes the value was present at build time. This means the `IS_AI_ENABLED` check (`Boolean(import.meta.env.VITE_GEMINI_API_KEY)`) will always be `false` in the Tauri app unless the key was set during `tauri build`.

**WHY:**
In the web SPA / Express deployment shape, `.env` variables are set on the server. In the Tauri desktop shape, the "server" is the sidecar or Tauri IPC — neither is configurable by the user at runtime via environment variables. The AI feature toggle in v2.0 must move from a build-time env variable to a runtime settings value (e.g., stored in `tauri-plugin-store` or `localStorage` under `aussieledger:settings`).

**PREVENTION:**
1. In v2.0, move all runtime configuration (AI enabled/disabled, AI API key, any user preference) out of `import.meta.env` and into the Phase 3 `aussieledger:settings` pattern (localStorage or `tauri-plugin-store`).
2. The `IS_AI_ENABLED` flag in v2.0 must read from the settings store, not from `import.meta.env`.
3. Audit every `import.meta.env.VITE_*` reference at the start of Wave 2 — any that control runtime behaviour must be refactored. Any that control build-time branching (e.g., `VITE_APP_VERSION`) are fine to keep.
4. The `tauri.conf.json` `bundle.resources` or `bundle.icon` paths that reference `import.meta.env` will fail silently in production — verify all resource paths are literal.

**PHASE:** Wave 2 — FileBackedAdapter / settings migration.
**ACCEPTANCE CRITERION:** In the production Tauri build (no `.env` present), all user-configurable settings are accessible and persistent via the settings store. No `import.meta.env` reference controls a feature that the user can toggle at runtime.
**HARD-BLOCK:** No for v2.0 (AI is disabled by default anyway). Known-Risk for any future runtime config that accidentally uses env vars.

---

### Pitfall 17: Auto-Update — Wrong Public Key Pinned; First Update Silently Fails (v2.1 Plant Flag)

**WHAT:**
Tauri's updater plugin verifies binary signatures using a public key pinned in `tauri.conf.json` at build time. If the key pair used to sign v2.0 builds is different from the key pair used to sign v2.1 builds (e.g., a new key was generated because the old one was rotated), v2.0 clients will reject the v2.1 update with `InvalidSignature` — silently, if the error is not surfaced in the UI. Users stay on v2.0 indefinitely.

A second failure mode: the update JSON endpoint (`latest.json`) is served before the actual `.sig` files have finished uploading to GitHub Releases (a race condition in CI). Users download the update, verification fails, and the app falls back to the old version without telling the user why.

**WHY:**
The Tauri updater key pair is generated once with `tauri signer generate`. The public key is baked into the binary. If anyone runs `tauri signer generate` again (even with the same password), a different key pair is produced and the old binary's public key no longer validates new signatures.

**PREVENTION (plant now for v2.1):**
1. Generate the updater key pair ONCE. Store the private key as a GitHub Actions secret (`TAURI_PRIVATE_KEY`) and the public key in `tauri.conf.json`. Never regenerate.
2. Version the key — document in `.planning/` which key pair is in use for which release range. If rotation is needed, do it in a dedicated "key rotation release" that ships both old and new public keys (Tauri's updater config accepts an array of public keys since Tauri v2).
3. In CI, the upload of `latest.json` must be the LAST step after all artifact `.sig` files are confirmed uploaded — never before.
4. Add an explicit update integration test in v2.1: build v2.0, build v2.1, verify the v2.0 binary accepts and installs the v2.1 update.

**PHASE:** v2.1 deferred, but key generation and storage must happen in the v2.0 CI phase to set up the infrastructure correctly.
**ACCEPTANCE CRITERION (v2.1):** Update smoke test passes end-to-end.
**HARD-BLOCK:** No for v2.0 (auto-update is deferred). YES for v2.1 if key infrastructure is not established in v2.0.

---

### Pitfall 18: Cross-OS Path Separator + Documents Folder Location

**WHAT:**
The v2.0 design uses `~/Documents/AussieLedger/` (macOS) and `Documents\AussieLedger\` (Windows) as the default file location. On Linux, there is no standard `Documents` folder — `$XDG_DOCUMENTS_DIR` may or may not be set. On Windows, the Documents folder may be redirected to OneDrive (`C:\Users\<user>\OneDrive\Documents`) by Group Policy or OneDrive settings — placing SQLite files directly in OneDrive is the cloud-sync corruption scenario from Pitfall 4.

Code written on macOS using `/` path separators will fail on Windows (`path.join` vs `path.sep` vs hardcoded strings).

**WHY:**
Tauri's `path` plugin (`tauri-plugin-path`) and Rust's `dirs` crate both expose `dirs::document_dir()` which returns the correct OS-specific path. But any hand-rolled path construction in TypeScript/Rust that uses `/` separators, or any hardcoded `Documents` string, will fail cross-platform.

**PREVENTION:**
1. Use `tauri-plugin-path`'s `documentDir()` JavaScript function (or Rust `dirs::document_dir()`) exclusively for default file paths. Never construct paths with string concatenation or `/` separators.
2. On Linux, fall back to `$HOME/AussieLedger/` if `documentDir()` returns `null`.
3. Warn users at first launch if `documentDir()` resolves to an OneDrive or iCloud-synced path (check if the path contains "OneDrive" or "iCloud" on the respective OS) — display the WAL/sync corruption warning from Pitfall 4.
4. Add a Windows-specific path round-trip test in CI: open a file at a UNC path, read it back, confirm no path separator mangling.

**PHASE:** Wave 2 — file dialog + default path implementation.
**ACCEPTANCE CRITERION:** On all three OS targets, the default file dialog opens in the correct OS Documents folder (or correct fallback); no `path.join` calls use hardcoded separators.
**HARD-BLOCK:** No — wrong default path is annoying but not data-corrupting.

---

### Pitfall 19: Font + Locale-Aware Number Formatting Differs Per OS Webview

**WHAT:**
On macOS, WKWebView uses the system's locale for `Intl.NumberFormat`. On Windows, WebView2 uses the locale set in the WebView2 runtime (which may differ from the user's system locale). On Linux, WebKitGTK uses the C locale by default. This means `(1234.56).toLocaleString()` may render as `"1,234.56"` (en-AU), `"1.234,56"` (de-DE system locale), or `"1234.56"` (C locale) — silently different output on different machines.

Font rendering also differs: if `@font-face` is used or if a font is available on macOS but not on the Windows user's machine (e.g., `-apple-system` / `BlinkMacSystemFont` stack), the layout may reflow or overflow on Windows.

**WHY:**
AussieLedger v1.0 uses `decimal.js` for all money math (correctly) but the display layer may use `toLocaleString()` for currency formatting in certain components. In a browser, the locale is typically the browser's configured locale — on a Tauri desktop app, the webview locale is the OS locale, which varies.

**PREVENTION:**
1. Audit all `toLocaleString()`, `Intl.NumberFormat`, and `toFixed()` calls. Replace with `decimal.js`'s `.toFixed(2)` + a custom AU currency formatter that always uses `en-AU` locale (e.g., `new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })`), explicitly setting the locale rather than relying on the system default.
2. The structural rule "no `new Date()` outside `src/lib/period.ts`" already prevents date formatting drift. Add a parallel rule: no `toLocaleString()` on money values outside `src/lib/money.ts`.
3. Use Tailwind's font stack with generic fallbacks: `font-sans` (which maps to system UI fonts) is fine; do not rely on named fonts that may only exist on Apple platforms.
4. Add a Windows-specific UAT step: open the BAS summary and verify all currency values render as `$1,234.56` format.

**PHASE:** Wave 2 / UAT.
**ACCEPTANCE CRITERION:** BAS working paper on Windows renders currency values in en-AU format (`$NNN,NNN.NN`) regardless of the Windows system locale setting.
**HARD-BLOCK:** No — wrong locale renders as a display bug, not a calculation bug. But it is a trust issue for an accounting tool.

---

### Pitfall 20: Linux AppImage Flagged as Untrusted by GNOME Files

**WHAT:**
On Ubuntu and Fedora, AppImage files downloaded via a browser are quarantined with the POSIX `execute` bit unset and the `user.xdg.quarantine` extended attribute set. GNOME Files (Nautilus) shows them as "untrusted" and requires the user to right-click → "Allow launching" before they run. On some distributions, AppImages are not executable by default at all.

Additionally, AppImages are not code-signed in any Linux-native sense. The absence of a package-manager verification chain (apt/rpm signature) means users have no automatic security check beyond SHA-256 hash verification if the project provides it.

**WHY:**
Linux does not have a code-signing infrastructure equivalent to macOS or Windows. AppImage is a portable binary format that runs without installation, which is convenient but lacks the package-manager trust chain.

**PREVENTION:**
1. Publish SHA-256 checksums alongside every AppImage on GitHub Releases. Include verification instructions in the release notes.
2. Document in README: "On Ubuntu/Fedora, right-click the AppImage and select 'Allow launching' before running."
3. Consider providing `.deb` and `.rpm` packages (Tauri supports both) in addition to AppImage — packages installed via `apt` or `dnf` do not trigger the GNOME quarantine.
4. Add a `.desktop` file and application icon to the AppImage bundle so it integrates with GNOME/KDE app launchers rather than appearing as a raw executable.

**PHASE:** CI / first Linux release.
**ACCEPTANCE CRITERION:** AppImage launches on clean Ubuntu 22.04 and Fedora 38 without requiring terminal commands. `.deb` package installs without warnings on Ubuntu.
**HARD-BLOCK:** No — users can unquarantine manually. But it creates a poor first impression and support burden.

---

## Phase-Specific Warning Summary

| Phase | Pitfall | Mitigation |
|-------|---------|------------|
| Wave 0 scaffold | CSP collision (P5) | Verify `tauri dev` + `tauri build` CSP immediately; include `style-src 'unsafe-inline'` for Tailwind |
| Wave 0 scaffold | sidecar vs tauri-plugin-sql decision (P2) | Lock architecture decision before writing any FileBackedAdapter code |
| Wave 0 scaffold | `envPrefix: ['TAURI_']` key leak (P8) | Set `envPrefix: ['VITE_']` only; enforce via CI check |
| Wave 0 scaffold | `import.meta.env` baked at build (P16) | Audit all env var usages; plan settings-store refactor |
| Wave 2 integration | Decimal coercion by sqlx (P1) | TEXT affinity enforced in DDL; parity test vs better-sqlite3 |
| Wave 2 integration | Migration double-apply (P3) | JSON migration and SQL DDL migration paths are separate; explicit test |
| Wave 2 integration | Decimal JSON number vs string on import (P10) | Defensive `String(value)` coerce in importAll(); fixture test |
| Wave 2 integration | `window.print()` in Tauri webview (P9) | Manual print UAT on all three OS targets |
| Wave 2 integration | AI proxy silently enabled (P6) | Capabilities allowlist locked to exact URLs; no wildcard patterns |
| Wave 2 integration | Runtime config not in env vars (P16) | IS_AI_ENABLED reads from settings store, not import.meta.env |
| CI phase | macOS notarisation hang (P7) | 30 min timeout; `tauri-plugin-sql` eliminates sidecar notarisation issue |
| CI phase | Rust cache poisoning (P14) | `cache-on-failure: false`; weekly cache-busted build |
| CI phase | macOS disk exhaustion (P15) | Pre-build disk check; separate arch CI jobs |
| CI phase | SmartScreen warning (P11) | Sign with OV cert; document dismissal flow in README |
| CI phase | Updater key infrastructure (P17) | Generate key pair once; store correctly; document for v2.1 |
| UAT phase | WAL + cloud sync corruption (P4) | Checkpoint-before-copy; warning in UI and README |
| UAT phase | Network share locking failure (P12) | Detect UNC path on open; advisory warning |
| UAT phase | Cross-OS path separators (P18) | Use `tauri-plugin-path`; test on Windows |
| UAT phase | Locale number formatting (P19) | Explicit `en-AU` locale in money formatter; Windows UAT step |
| First Linux release | AppImage untrusted (P20) | Provide `.deb`; document launch flow |

---

## Acceptance Criteria Checklist for Downstream Planner

Each item below maps a pitfall to a concrete acceptance criterion that can be dropped into a phase plan.

**Wave 0 (scaffold):**
- [ ] `tauri dev` + `tauri build` both render the app without a blank screen; `@media print` stylesheet verified active in the Tauri webview
- [ ] `vite.config.ts` has `envPrefix: ['VITE_']` only; CI check confirms `TAURI_PRIVATE_KEY` is not in any bundled `.js` file
- [ ] Architecture decision (tauri-plugin-sql vs Node sidecar) documented in CONTEXT.md with rationale

**Wave 2 (integration):**
- [ ] BAS to-the-cent gold tests GREEN after StorageAdapter swap; no new `parseFloat()` / `.toNumber()` on money values
- [ ] Decimal TEXT affinity enforced: CI lint exits non-zero if any migration DDL uses NUMERIC/DECIMAL/REAL affinity on a money column
- [ ] Import round-trip test with `_v: 5` JSON fixture (including money values as JSON numbers) passes; `schema_migrations` has no duplicate rows
- [ ] `window.print()` print-preview verified on macOS, Windows, and Linux Tauri builds: correct layout, no UI chrome, disclaimer present
- [ ] Network capabilities audit: no `http://*` or `https://*` wildcards in production capability set; `fetch('https://example.com')` blocked in a production build without AI capability enabled
- [ ] `IS_AI_ENABLED` reads from settings store, not `import.meta.env`

**CI phase:**
- [ ] macOS release build produces a notarised `.dmg` that passes `spctl --assess --verbose` on a clean macOS machine
- [ ] Windows CI uses `windows-latest` runner; installer is OV/EV signed; README documents SmartScreen dismissal flow
- [ ] CI matrix (3 platforms) passes with a cache-busted weekly scheduled run
- [ ] Updater key pair generated once and documented; `TAURI_PRIVATE_KEY` stored as CI secret only

**UAT phase:**
- [ ] "Save As" test: data written, Save As called, file opened from new location — data intact, no WAL corruption
- [ ] WAL/cloud-sync warning displayed in app when file is opened from a path containing "OneDrive" or "iCloud"
- [ ] Opening same file from a second app instance focuses existing window (single-instance plugin)
- [ ] BAS working paper on Windows renders in en-AU currency format regardless of system locale

---

## Sources

- Tauri 2.x official docs — CSP, capabilities, allowlist, sidecar, updater: https://v2.tauri.app/security/csp/ and https://v2.tauri.app/security/capabilities/
- Tauri 2.x Vite integration: https://v2.tauri.app/start/frontend/vite/
- Tauri: Node.js as a sidecar: https://v2.tauri.app/learn/sidecar-nodejs/
- Tauri: Embedding External Binaries: https://v2.tauri.app/develop/sidecar/
- Tauri: macOS Code Signing: https://v2.tauri.app/distribute/sign/macos/
- Tauri: Windows Code Signing: https://v2.tauri.app/distribute/sign/windows/
- Tauri: Updater plugin: https://v2.tauri.app/plugin/updater/
- Tauri: SQL plugin: https://v2.tauri.app/plugin/sql/
- Tauri GitHub issue #11992 — sidecar notarisation failure: https://github.com/tauri-apps/tauri/issues/11992
- Tauri GitHub discussion #8630 — notarisation hang (4+ hours): https://github.com/orgs/tauri-apps/discussions/8630
- Tauri GitHub discussion #8046 — Windows SmartScreen prompt: https://github.com/orgs/tauri-apps/discussions/8046
- CVE-2023-46115 / GHSA-2rcp-jvr4-r259 — updater private key leaked via Vite envPrefix: https://github.com/tauri-apps/tauri/security/advisories/GHSA-2rcp-jvr4-r259
- tauri-apps/plugins-workspace issue #3158 — NUMERIC datatype unsupported in tauri-plugin-sql: https://github.com/tauri-apps/plugins-workspace/issues/3158
- sqlx issue #2887 — NUMERIC and DECIMAL support for SQLite: https://github.com/launchbadge/sqlx/issues/2887
- SQLite official: How To Corrupt An SQLite Database File: https://sqlite.org/howtocorrupt.html
- SQLite official: Write-Ahead Logging: https://sqlite.org/wal.html
- SQLite official: SQLite Over a Network, Caveats: https://sqlite.org/useovernet.html
- SQLite official: File Locking and Concurrency: https://sqlite.org/lockingv3.html
- SQLite forum: WAL corruption bug fixed in 3.51.3 (2026-03-03): https://sqlite.org/forum/info/47107ab818977549
- Exploring Binary: Fifteen Digits Don't Round-Trip Through SQLite Reals: https://www.exploringbinary.com/fifteen-digits-dont-round-trip-through-sqlite-reals/
- Microsoft Q&A: SmartScreen after OV cert signing: https://learn.microsoft.com/en-us/answers/questions/5584097/how-to-bypass-windows-defender-smartscreen-even-af
- Tauri GitHub issue #4917 — no print API in Tauri: https://github.com/tauri-apps/tauri/issues/4917
- GitHub Actions macOS disk space: https://github.com/nodejs/build/issues/3878
- AussieLedger PROJECT.md — v2.0 goal, DEP-01 stance, StorageAdapter FINAL invariant
- AussieLedger 03-CONTEXT.md — StorageAdapter FINAL (12 methods), migration chain rules

---

*v2.0 Pitfalls Research — AussieLedger Tauri + SQLite + Cross-Platform*
*Researched: 2026-05-29*
*Confidence: HIGH (SQLite WAL, code-signing, CSP mechanics — official sources). MEDIUM (CI race conditions, Tauri-specific webview print — community reports + confirmed issues). The v1.0 tax-domain pitfalls (GST rounding, BRE rate, trust streaming, ATO label staleness) are NOT repeated here — see `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` era research for those.*
