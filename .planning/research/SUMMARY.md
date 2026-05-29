# v2.0 Research — Synthesis

**Project:** AussieLedger v2.0 — Standalone Desktop App + Local Data Sovereignty
**Synthesised:** 2026-05-29
**Underlying research:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md (all HIGH confidence on key claims)

> Note: this file replaces the project-init v1.0 SUMMARY.md. The v1.0 ecosystem research is archived under `.planning/milestones/v1.0-phases/` per-phase RESEARCH files.

---

## Recommended Stack

| Layer | Pin | Why |
|------|-----|-----|
| Desktop shell | **Tauri 2.11.2** (`@tauri-apps/cli@2.11.2` + `@tauri-apps/api@2.11.0`) | Vite 6 compat verified; ~10MB bundles vs ~100MB Electron; native OS webview; Rust core |
| File dialogs | `@tauri-apps/plugin-dialog@2.6.0` | Native open/save with `.aussieledger` extension filter |
| File watcher | `@tauri-apps/plugin-fs@2.4.5` with `features = ["watch"]` | External-edit detection on the main file (NOT the WAL sidecar) |
| Single-instance lock | `tauri-plugin-single-instance@2` (Rust-only) | Passes file path of second launch via `args` callback → first instance can offer "switch to that window" |
| SQLite | **Custom Rust commands using `rusqlite`** (NOT `tauri-plugin-sql`) | See architecture decision below — plugin-sql cannot open arbitrary user-chosen file paths AND has a sqlx NUMERIC affinity bug that would corrupt BAS gold tests |
| AI proxy (kept opt-in) | New Rust command `ai_match_accounts` | Replaces `/api/ai/match-accounts` in Tauri shape; outbound call from native process; webview never touches Gemini directly |
| CI | `tauri-apps/tauri-action` on GitHub Actions matrix (Win/macOS/Linux) | Standard recipe; produces `.msi` / `.dmg` / `.AppImage` |
| Auto-update | `@tauri-apps/plugin-updater@2.10.1` (deferred to v2.1) | Note: signing keys MUST be generated in v2.0's CI phase; rotating them post-ship breaks every client's update path |

**Stack additions only.** The entire v1.0 SPA stack (React 19, TypeScript 5.8, Vite 6, Tailwind v4, motion, lucide, recharts, decimal.js, idb, Zod, papaparse, sheetjs-ce, Radix tooltip, Vitest) is preserved end-to-end.

---

## Architecture Decision

### `FileBackedAdapter` via custom Rust commands (rusqlite)

**Decision locked.** Custom Rust commands in `src-tauri/src/commands.rs` using `rusqlite`, exposed via `@tauri-apps/api/core` `invoke()`. Wrapped in `Mutex<Option<Connection>>` Tauri state.

**Why not `tauri-plugin-sql`** (despite STACK.md initially recommending it):
1. The plugin can only open databases under `AppConfig` base directory. v2.0 requires opening files at user-chosen absolute paths (USB stick, NAS, `~/Documents/AussieLedger/foo.aussieledger`). Plugin-sql cannot do this. **This alone disqualifies it.**
2. The plugin uses sqlx, which has a NUMERIC affinity coercion bug (`tauri-apps/plugins-workspace#3158`). Money columns declared with non-TEXT affinity would silently round-trip `"1234.56"` → `1234.5600000000002`, breaking BAS to-the-cent gold tests. rusqlite gives us full DDL control; we enforce TEXT-only for all money columns + a CI lint to keep it that way.
3. The Phase 3 better-sqlite3 SQL in `server/` is plain strings (no ORM); migrating to `rusqlite` is mechanical (rewrite SQL strings into Rust `db.execute(...)` calls).

### Three coexisting StorageAdapter implementations

| Adapter | Shape | Status in v2.0 |
|---------|-------|----------------|
| `LocalAdapter` (IndexedDB) | Web SPA `npm run dev` | **Kept** — web users who don't want desktop install |
| `ServerAdapter` (HTTP → Express + better-sqlite3) | VPS `npm run dev:full` | **Kept** — small-firm multi-browser-client shape; architecturally incompatible with per-user files |
| `FileBackedAdapter` (rusqlite via Tauri invoke) | Desktop `*.aussieledger` file | **New in v2.0** — primary user path |

Phase 3 StorageAdapter FINAL invariant respected — only ADD a third implementation, never widen the 12-method interface. `AdapterKind` gains a `'file'` variant (additive type widening). The `isTauri()` guard in `src/storage/index.ts` routes to FileBackedAdapter when running inside Tauri webview, transparent to web users.

### Network sandbox = TWO layers (both mandatory)

1. **Tauri capability allowlist** (`src-tauri/capabilities/default.json`): omit `@tauri-apps/plugin-http` entirely. Without it, `tauri::api::http` cannot be invoked. Outbound HTTP from Rust = blocked at runtime.
2. **CSP `connect-src 'none'`** in `tauri.conf.json`: blocks webview-level `fetch()` / `XMLHttpRequest`. Without this, the React app could still call any URL even with no Tauri plugin — Tauri capability system doesn't gate webview-level network calls.

Both layers required. Omitting either re-enables network calls through the other.

When AI is enabled (user opt-in per session), the architecture switches: Rust `ai_match_accounts` command makes the call from the native process (not the webview); CSP can stay `'none'` because the webview never touches Gemini; the capability allowlist gets one host entry (`generativelanguage.googleapis.com`) scoped to the session.

### v5 → v6 migration

Additive only. Run as part of the existing JSON migration chain. v6 adds:
- File-format metadata (creation date, app version, last-opened timestamp) — stored in a SEPARATE `file_meta` SQLite table managed by Rust, deliberately excluded from `PersistedRoot` so JSON exports remain shape-agnostic and importable into web shapes.
- Possibly: a `lastSavedAs` path hint (not the canonical store; just for the "Recent Files" list).

**Migration from v1.0 to v2.0** = guided JSON-import flow. v1.0 IndexedDB is inaccessible from a Tauri webview (different browser profile). User exports JSON from v1.0 web app, opens v2.0 desktop, picks "Import existing v1.0 data", the file is converted to a fresh v6 `.aussieledger`.

### Print continuity

`window.print()` + `@media print` CSS confirmed working in Tauri webview (WebView2 / WKWebView / webkit2gtk). Zero code change to v1.0's print primitives. Tauri has no native print API; window.print() is the right mechanism.

---

## Feature Categories

### TABLE STAKES (must ship in v2.0)

- **File → New / Open / Save As / Close** (Save is auto via SQLite commits — no manual Save button)
- **Default file location** = `~/Documents/AussieLedger/` (Apple BPFileSystem + Tauri `BaseDirectory.Document`; matches user mental model; do NOT default to AppData)
- **Recent Files MRU list** stored in OS app-data (not in the file)
- **Single-instance lock** with "file already open in another window" detection
- **Welcome screen** when no file open (matches QuickBooks "Open existing / Create new")
- **Tauri capability allowlist + CSP `connect-src 'none'`** as the hard network sandbox
- **`FileBackedAdapter`** behind Phase 3 StorageAdapter
- **v5 → v6 additive migration**
- **v1.0 JSON import flow** (one-time guided)
- **Cross-platform installers** (`.msi` Windows, `.dmg` macOS, `.AppImage` Linux) via GitHub Actions matrix

### DIFFERENTIATORS (sets v2.0 apart)

- **Hard network sandbox** — outbound HTTP is impossible without explicit capability + CSP edit. Surfaceable as a "Local Only" badge in the UI. This is the trust story.
- **File-backed sovereignty** — user owns the `.aussieledger` file end-to-end. Copy to USB, encrypt, NAS-backup — all native OS operations.
- **AI as explicit "send batch" action**, not background call. Per-session capability grant (not permanent toggle). Reuses Phase 3 export-replace dialog friction pattern.
- **External-edit detection** — file watcher prompts "File changed externally, reload?" if Dropbox/manual-edit modifies the file behind the app's back.
- **"Where is my file?" disclosure** — title bar shows full path; status bar shows "Last saved: 2 mins ago"; File menu has "Show in Finder/Explorer".
- **WAL-aware "Save As"** — uses `VACUUM INTO` (SQLite 3.27+) for atomic snapshot; falls back to checkpoint + file copy.

### DEFER (post-v2.0 — v2.1 or later)

- **Auto-update infrastructure** (manually downloaded installers in v2.0; auto-update v2.1) — but updater key pair MUST be generated in v2.0's CI phase
- **Multi-window / multi-file** (single-file-at-a-time in v2.0; matches GnuCash + QuickBooks Desktop)
- **Cloud-sync layer** (users can manage Dropbox/iCloud themselves with the file; warn against it for WAL reasons)
- **Native mobile app** (responsive web SPA continues to serve mobile)
- **"Backup reminder on close"** UX (defer — too aggressive for non-accountant audience; add in v2.1 with a configurable interval)
- **Notarisation infrastructure for macOS** (developer-only ship in v2.0; pursue $99/yr Apple Developer Program for v2.1)

### ANTI-FEATURES (explicit out-of-scope; must NOT ship)

- ❌ Background telemetry / "phone home" version checks — would violate the "local only" promise the milestone is selling
- ❌ Online help that requires network — bundle all help text into the app
- ❌ Embedded browser frames pulling external content
- ❌ Implicit AI network calls — always explicit per-batch consent
- ❌ AppData / hidden file path as default — Manager.io's most-complained-about decision; we must not repeat it
- ❌ "Save" button when SQLite auto-commits — misleading affordance; show "Last modified" timestamp instead
- ❌ `tauri-plugin-http` — installing it is how you grant HTTP access; we must omit it

---

## Critical Pitfalls (Hard-Block)

These MUST be prevented before the relevant phase ships — each maps to a specific acceptance criterion the planner needs to bake in.

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | **Money TEXT affinity coercion** — if any money column has non-TEXT affinity in DDL, `"1234.56"` round-trips as `1234.5600000000002`, silently breaking BAS gold tests | rusqlite DDL: ALL money columns `TEXT NOT NULL`; CI lint regex enforcing it; parity test (LocalAdapter ↔ FileBackedAdapter ↔ ServerAdapter round-trip same JSON unchanged) | Wave 2 — FileBackedAdapter |
| 2 | **CVE-2023-46115** — `envPrefix: ['TAURI_']` in vite.config.ts leaks updater private key to client bundle | CI grep check: `grep -nE "envPrefix.*TAURI" vite.config.ts` must return zero | Wave 0 — Tauri scaffold |
| 3 | **WAL + cloud sync corruption** — Dropbox/iCloud sync `.wal` and `.shm` files independently of the main `.aussieledger` file → corrupt on another machine | Checkpoint-before-copy in Save As; advisory dialog when file path contains "OneDrive"/"iCloud"/"Dropbox"; README documents this | Wave 2 + Wave 3 — File menu UX |
| 4 | **Network sandbox single-layer** — Tauri capability allowlist alone doesn't block webview-level fetch; CSP alone doesn't block Rust HTTP | BOTH layers mandatory: capability omits `plugin-http`, CSP `connect-src 'none'`. Integration test: bundled app's React layer cannot `fetch('https://example.com')` | Wave 0 + Wave 2 |
| 5 | **Migration double-apply** — v1.0 `_v: 5` JSON imports cleanly, but if the migration runner re-applies SQL DDL on a file already at `_v: 6`, schema breaks | JSON migration chain and SQL DDL chain stay STRICTLY SEPARATE. JSON chain runs on import only; SQL DDL runs on file-create only | Wave 2 — Migration |
| 6 | **`window.print()` regression on macOS pre-Monterey** — WKWebView print dialog can drop scroll state | `scrollTo(0,0)` before `window.print()`; UAT step on all 3 OS targets | Wave 0 smoke test |
| 7 | **GitHub Actions CI flakes** — Rust cache poisoning + macOS runner disk-space + Windows node-gyp without VS Build Tools | `cache-on-failure: false`; pre-check disk space on macOS runner; install VS Build Tools step on Windows runner; notarisation timeout = 30 min | CI phase |

### Known-Risks (note + monitor, opportunistically fix)

- File watcher reliability on Windows network drives (NAS) — `ReadDirectoryChangesW` behaviour varies
- `VACUUM INTO` availability — confirm SQLite version bundled with rusqlite is ≥ 3.27 (almost certainly is in 2026 toolchains)
- Tauri 2.x rapid version churn — pin exact versions, plan a refresh check during the CI phase

---

## Suggested Phase Order

Six phases, hard dependency chain (per ARCHITECTURE.md + PITFALLS.md reconciled):

| # | Phase | Dependencies | Notes |
|---|-------|--------------|-------|
| 7 | **Tauri scaffolding + smoke** | none | `src-tauri/` added, `tauri dev` runs, `window.print()` smoke-tested on all 3 OSes. ALL Wave-0 hard-blocks (envPrefix, CSP, capability allowlist) locked at scaffold time. v1.0 SPA + server still build green. |
| 8 | **FileBackedAdapter (rusqlite)** | Phase 7 | New Rust commands, `src/storage/file.ts` implementing all 12 StorageAdapter methods. Money TEXT-affinity lint live. Parity round-trip test green. |
| 9 | **Boot sequence + file menu UX** | Phase 8 | `FileOpenSplash` welcome screen, File→New/Open/Save As/Close, recent files MRU, single-instance lock, "Where's my file?" disclosure. Default location `~/Documents/AussieLedger/`. |
| 10 | **Migration + v1.0 import** | Phase 8 | v5→v6 additive SQL DDL chain. JSON migration chain unchanged. "Import v1.0 data" guided flow. File watcher for external-edit detection. |
| 11 | **Network sandbox + AI opt-in** | Phase 7 (CSP) + Phase 8 (Rust) | Capability allowlist locked, CSP locked, Rust `ai_match_accounts` command, ImportTB.tsx branch to native-AI path when running in Tauri. Per-session AI consent dialog (reuses Phase 3 friction pattern). |
| 12 | **CI cross-platform builds + FND-02 CSV cleanup** | Phases 7-11 | GitHub Actions matrix (`tauri-apps/tauri-action`), updater key generation (deferred use), code-signing config (Windows SignPath Foundation; macOS deferred), FND-02 CSV per-report export absorbed here, cosmetic cleanup (`App.tsx:114` dead string). |

Phases 9 + 10 + 11 are partially parallelisable once Phase 8 is done.

Expected total: ~5-8 weeks based on v1.0 cadence.

---

## Open Questions Requiring User Decision

Should be resolved during `/gsd:discuss-phase` of the relevant phase, not now — but flagging so they don't surprise the planner:

1. **macOS code-signing strategy** — pay $99/year for Apple Developer Program OR ship developer-only (users override Gatekeeper) OR pursue GitHub Sponsors funding? PROJECT.md DEP-01 stance suggests developer-only for v2.0; Apple cert as a v2.1 question. → Decide at Phase 12.
2. **Backup reminder frequency** — every 7 days with first-run prompt recommended. → Decide at Phase 9.
3. **AI consent granularity** — per-session (recommended) vs per-request (more conservative). → Decide at Phase 11.
4. **v5 → v6 schema specifics** — what new fields beyond file metadata? `lastSavedAs` hint? Encrypted-file marker for future v2.1? → Decide at Phase 10.
5. **WAL-sidecar visibility in file picker** — hide (recommended) vs show. → Decide at Phase 9.
6. **v1.0 SPA continuity** — does v2.0 deprecate the web build entirely OR continue shipping both? → Decide before Phase 7 (affects scope framing).
7. **Windows SignPath Foundation application timing** — apply at Phase 7 (non-blocking background task; approval takes weeks). Apache-2.0 LICENSE qualifies.

---

## What NOT To Add

- ❌ **Electron** — 10× bundle size; weaker OS integration
- ❌ **`better-sqlite3` as Node sidecar** — native module + Tauri bundling = macOS Gatekeeper quarantine + Windows Defender flags; replaced by rusqlite
- ❌ **`@tauri-apps/plugin-sql`** — cannot open arbitrary file paths + sqlx NUMERIC affinity bug
- ❌ **`@tauri-apps/plugin-http`** — installing it is how you grant HTTP access; the hard-sandbox design requires omitting it
- ❌ **`envPrefix: ['TAURI_']`** in `vite.config.ts` — CVE-2023-46115; use `envPrefix: ['VITE_']` only
- ❌ **Cross-platform installer wrappers by hand** (NSIS, pkgbuild) — Tauri's bundler handles all three
- ❌ **A separate React-Tauri-Native fork** — single SPA codebase served to both Tauri and web; the only difference is the adapter and the AI proxy path

---

## Sources

- Tauri 2.x release page (`v2.tauri.app/release/`) — 2026-05-29
- Tauri 2.x official docs (security/csp, distribute/pipelines/github, plugin/sql, plugin/dialog, plugin/fs)
- GitHub issue tracker: `tauri-apps/plugins-workspace#3158` (sqlx NUMERIC affinity), `tauri-apps/tauri#11992` (notarisation), `tauri-apps/wry#4917` (no native print API)
- GHSA-2rcp-jvr4-r259 / CVE-2023-46115 (envPrefix leak)
- Apple BPFileSystem developer documentation (default file location convention)
- SQLite official documentation (WAL mode + checkpoint semantics)
- Manager.io community forums (UX complaint about AppData default — anti-pattern reference)
- GnuCash v5 + QuickBooks Desktop documentation (file-lifecycle pattern reference)
- SignPath Foundation OSS program documentation (free Windows code-signing for Apache 2.0 projects)
- v1.0 codebase: `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` (StorageAdapter FINAL); `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-CONTEXT.md` (useSettings pattern)
