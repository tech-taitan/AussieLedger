# Requirements: AussieLedger v2.0

**Defined:** 2026-05-29
**Milestone:** v2.0 — Standalone App + Local Data Sovereignty
**Core Value (unchanged from v1.0):** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**v2.0 thesis:** Same product, new shell. Ship as a Tauri desktop app backed by a single-file SQLite per instance, with a hard network sandbox so every byte of tax data is provably local. v1.0's domain layer (tax engine, wizard, persona shell) is preserved untouched; v2.0 swaps the delivery mechanism.

## v2 Requirements

### Packaging (PKG)

Desktop-app delivery + cross-platform distribution.

- [ ] **PKG-01**: A new user can download a single OS-native installer (`.msi` on Windows, `.dmg` on macOS, `.AppImage` on Linux) from GitHub Releases and install AussieLedger by double-clicking — no Node, no npm, no terminal
- [ ] **PKG-02**: The desktop app enforces single-instance-per-file — opening a `.aussieledger` file that's already open in another window switches focus to the existing window rather than corrupting the file
- [ ] **PKG-03**: The app ships with a generated updater key pair committed to the repo at scaffold time, so future v2.1+ auto-update flows can verify v2.0-issued binaries without forcing users to re-onboard (auto-update UX itself is deferred to v2.1)
- [ ] **PKG-04**: Windows installer is signed via SignPath Foundation (free OSS code-signing); macOS installer is unsigned developer-only for v2.0 with documented Gatekeeper override; Linux AppImage requires no signing

### File-backed persistence (FILE)

Single-file SQLite-per-instance with native OS file-management UX.

- [ ] **FILE-01**: User's tax data lives in a portable `*.aussieledger` SQLite file the user owns end-to-end — copy/encrypt/backup is a native OS file operation. The file is the source of truth; in-app state is a working cache
- [ ] **FILE-02**: The `.aussieledger` file is rusqlite-managed SQLite with all money columns TEXT-affinity (preserves decimal.js round-trip; `"1234.56"` survives store→load unchanged); a `file_meta` table holds creation date, app version, last-opened timestamp
- [ ] **FILE-03**: File menu provides File → New / Open / Save As / Close plus a Recent Files MRU list (stored in OS app-data, not in the file)
- [ ] **FILE-04**: Default file location for new files is `~/Documents/AussieLedger/` (Tauri `BaseDirectory.Document` on Windows/macOS/Linux) — not the hidden AppData path
- [ ] **FILE-05**: "Save As" uses SQLite `VACUUM INTO` for an atomic snapshot copy (preserves WAL state); falls back to checkpoint + file copy if `VACUUM INTO` unavailable
- [ ] **FILE-06**: The app watches the open `.aussieledger` file for external modifications (Dropbox sync, manual replace) and prompts "File changed externally. Reload?" — does not auto-reload. Watches the main file only, not the `-wal` / `-shm` sidecars
- [ ] **FILE-07**: The title bar shows the full file path; the status bar shows "Last saved: N minutes ago"; the File menu has "Show in Finder/Explorer" — non-accountant users never have to wonder where their data lives
- [ ] **FILE-08**: When the user opens a `.aussieledger` file whose path contains `OneDrive`, `iCloud`, or `Dropbox`, an advisory dialog explains the WAL-corruption risk and recommends a local-disk location (soft warning, not a hard block — user can dismiss and proceed)

### Network sandbox + AI removal (SAND)

Hard local-only guarantee. Outbound network calls are impossible without code changes.

- [ ] **SAND-01**: The desktop binary's Tauri capabilities allowlist omits `@tauri-apps/plugin-http` entirely — no Rust-side HTTP API is granted to any window
- [ ] **SAND-02**: The desktop binary's CSP includes `connect-src 'none'` in `tauri.conf.json` — webview-level `fetch()` and `XMLHttpRequest` are blocked at runtime, not just discouraged
- [ ] **SAND-03**: The app surfaces a visible "Local Only" badge confirming sandbox state — users see at a glance that no network capability is active
- [ ] **SAND-04**: The AI-assist (Gemini) code path is removed from the v2.0 Tauri build entirely. ImportTB falls back to the deterministic fuzzy-match path only. Web SPA (deprecated branch) retains AI for users who want it; the Tauri binary's narrative is "no network calls"

### Migration from v1.0 (MIG)

Existing v1.0 users get their data forward.

- [ ] **MIG-01**: v5→v6 additive SQL DDL migration creates the `file_meta` table on file initialisation; no existing entity/account/journal/audit fields are changed or removed
- [ ] **MIG-02**: On first launch with no recent files, the welcome screen offers "Import existing v1.0 data" which accepts a v1.0 JSON export and writes a fresh v6 `.aussieledger` file at a user-chosen location
- [ ] **MIG-03**: The JSON migration chain (`migrate(v0..v5)`) and the SQL DDL chain stay strictly separate — JSON chain runs on import only, SQL DDL runs on file-create only, no double-apply possible

### CSV per-report export (CSV) — closes v1.0 known gap FND-02

Per-report CSV exports the JSON full-data export does not cover.

- [ ] **CSV-01**: User can export a Trial Balance for a selected period as a CSV file (one row per account: code, name, debit, credit, balance, period)
- [ ] **CSV-02**: User can export BAS labels for a selected quarter as a CSV (one row per label: label code, plain English, value)
- [ ] **CSV-03**: User can export Form I (Individual return) labels for a selected FY as a CSV (one row per label: label code, plain English, value, source-account list)

### Quality + cleanup (QUAL)

Cross-cutting tests and one-line code cleanup.

- [ ] **QUAL-01**: A parity round-trip test asserts that the same JSON payload round-trips bit-identically through all three StorageAdapter implementations (LocalAdapter, ServerAdapter, FileBackedAdapter)
- [ ] **QUAL-02**: A CI lint check fails the build if any `CREATE TABLE` DDL in `src-tauri/src/` declares a money column with non-TEXT affinity
- [ ] **QUAL-03**: A CI grep check fails the build if `vite.config.ts` contains `envPrefix.*TAURI` (CVE-2023-46115 protection)
- [ ] **QUAL-04**: An integration test asserts the v2.0 Tauri binary's webview cannot `fetch('https://example.com')` — the network sandbox is provably enforced, not just configured
- [ ] **QUAL-05**: `src/App.tsx:114` dead `'US Big Law Firm'` string is removed (v1.0 cosmetic cleanup, sweep folded into another phase)
- [ ] **QUAL-06**: Retroactively flip `nyquist_compliant: true` on v1.0 Phases 1, 2, 6 VALIDATION.md frontmatter (v1.0 known gap; one-shot doc-only commit)

## Future Requirements (deferred from v2.0)

- **Auto-update full UX** — download + install + "an update is available" notification — v2.1
- **Multi-window / multi-file simultaneous editing** — v2.1+
- **Native mobile app** — v3+; responsive web SPA continues to serve mobile users
- **macOS code signing via Apple Developer Program** ($99/yr) — v2.1+ pending funding decision
- **Backup reminder on close** with configurable interval — v2.1
- **Encrypted-at-rest `.aussieledger` files** (passphrase or OS keychain) — v2.1+
- **Sync layer** (CRDT-based or otherwise) for "open same file from two machines" — explicit non-goal of v2.0; v3+
- **Direct ATO / myGov lodgement via SBR** — v3+ (carries forward from v1.0)
- **Bank-feed / Open Banking** — v3+ (carries forward from v1.0)
- **Family Medicare levy threshold engine** — v2.1+

## Out of Scope (explicit non-goals)

- **Background telemetry / version-check pings** — would violate the "local only" promise the milestone is selling. Cannot be enabled even behind a flag.
- **Online help requiring network** — all help text is bundled into the binary
- **Embedded browser frames pulling external content**
- **Implicit AI network calls** — AI is removed from the v2.0 Tauri build entirely; cannot accidentally re-enable
- **AppData / hidden file path as default** — Manager.io's most-complained-about decision; explicit non-goal
- **"Save" button when SQLite auto-commits** — misleading affordance; status bar shows "Last modified" timestamp instead
- **`tauri-plugin-http` installation** — installing it is how you grant HTTP access; the hard-sandbox design requires omitting it
- **Electron-based packaging** — 10× bundle size, weaker OS integration
- **better-sqlite3 as Node sidecar** — native-module bundling on macOS is a quarantine trap; replaced by Rust-side rusqlite
- **`@tauri-apps/plugin-sql`** — cannot open arbitrary user file paths AND has a sqlx NUMERIC affinity bug that would corrupt BAS gold tests
- **Cross-platform installer wrappers by hand** (NSIS, pkgbuild) — Tauri's bundler handles all three
- **A separate React-Tauri-Native fork** — single SPA codebase serves both Tauri and web shapes; only the adapter differs

## Traceability

Filled by `/gsd:roadmapper` once phase assignment locks. Each REQ-ID maps to exactly one phase.

| Req | Phase | Status |
|-----|-------|--------|
| PKG-01 | Phase 7 | Pending |
| PKG-02 | Phase 9 | Pending |
| PKG-03 | Phase 7 | Pending |
| PKG-04 | Phase 12 | Pending |
| FILE-01 | Phase 8 | Pending |
| FILE-02 | Phase 8 | Pending |
| FILE-03 | Phase 9 | Pending |
| FILE-04 | Phase 9 | Pending |
| FILE-05 | Phase 9 | Pending |
| FILE-06 | Phase 10 | Pending |
| FILE-07 | Phase 9 | Pending |
| FILE-08 | Phase 9 | Pending |
| SAND-01 | Phase 11 | Pending |
| SAND-02 | Phase 11 | Pending |
| SAND-03 | Phase 11 | Pending |
| SAND-04 | Phase 11 | Pending |
| MIG-01 | Phase 10 | Pending |
| MIG-02 | Phase 10 | Pending |
| MIG-03 | Phase 10 | Pending |
| CSV-01 | Phase 12 | Pending |
| CSV-02 | Phase 12 | Pending |
| CSV-03 | Phase 12 | Pending |
| QUAL-01 | Phase 8 | Pending |
| QUAL-02 | Phase 8 | Pending |
| QUAL-03 | Phase 7 | Pending |
| QUAL-04 | Phase 11 | Pending |
| QUAL-05 | Phase 12 | Pending |
| QUAL-06 | Phase 12 | Pending |

**Total v2 requirements: 28**
**Phase coverage: 7 through 12 (6 phases continuing from v1.0's 1-6)**
