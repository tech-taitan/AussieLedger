# Roadmap: AussieLedger

**Last updated:** 2026-05-29

## Milestones

- ✅ **v1.0** — Phases 1–6 (shipped 2026-05-29) — see [.planning/milestones/v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md)
- 🔄 **v2.0** — Phases 7–12 (in progress) — Standalone App + Local Data Sovereignty

## Phases

<details>
<summary>✅ v1.0 (Phases 1–6) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: Safety Net (3/3 plans) — completed 2026-05-10
- [x] Phase 2: Decompose and Tax Engine (4/4 plans) — completed 2026-05-10
- [x] Phase 3: Durable Persistence (4/4 plans) — completed 2026-05-12
- [x] Phase 4: Bookkeeping Core (4/4 plans) — completed 2026-05-13
- [x] Phase 5: Tax Outputs (4/4 plans) — completed 2026-05-28
- [x] Phase 6: Personas, Wizard, and Deployment (4/4 plans) — completed 2026-05-29

</details>

### v2.0 (In Progress)

- [ ] **Phase 7: Tauri Scaffolding + Smoke** — `src-tauri/` created, `tauri dev` runs v1.0 SPA in native window; all Wave-0 hard-block pitfalls locked at scaffold time
- [ ] **Phase 8: FileBackedAdapter** — Custom Rust commands (rusqlite), `FileBackedAdapter` implementing all 12 StorageAdapter methods, TEXT-affinity lint + parity round-trip test GREEN before implementation
- [ ] **Phase 9: Boot Sequence + File Menu UX** — `FileOpenSplash` welcome screen, File → New/Open/Save As/Close, Recent Files MRU, single-instance lock, "Where's my file?" disclosure
- [ ] **Phase 10: Migration + v1.0 Import + File Watcher** — v5→v6 additive SQL DDL migration, JSON import chain unchanged, "Import v1.0 data" guided flow, external-edit file watcher
- [ ] **Phase 11: Network Sandbox + AI Removal** — Capability allowlist + CSP `connect-src 'none'` (both layers), AI code path deleted from Tauri build, "Local Only" badge, integration test against built binary
- [ ] **Phase 12: CI Cross-Platform + CSV Cleanup + Cosmetic Sweep** — GitHub Actions matrix (win/mac/linux), updater key pair generated, code-signing config, FND-02 CSV exports, cosmetic cleanup

## Phase Details

### Phase 7: Tauri Scaffolding + Smoke
**Goal**: The v1.0 SPA runs inside a native Tauri desktop window and all Wave-0 hard-block pitfalls are permanently prevented at the scaffold boundary
**Depends on**: Nothing (first v2.0 phase; v1.0 phases complete)
**Requirements**: PKG-01, PKG-03, QUAL-03
**Success Criteria** (what must be TRUE):
  1. `npm run tauri:dev` opens the v1.0 SPA in a native OS window (not a browser) on the developer's machine — no Node or terminal required once built
  2. `window.print()` triggered inside the Tauri webview produces a print dialog with the correct `@media print` layout and no UI chrome — smoke-tested on dev machine
  3. `vite.config.ts` contains `envPrefix: ['VITE_']` only; a CI grep check (`QUAL-03`) fails the build if `envPrefix.*TAURI` is present — CVE-2023-46115 permanently blocked
  4. The Tauri updater key pair is generated and the public key is committed in `tauri.conf.json`; the private key is documented for GitHub Actions secrets — v2.1 auto-update infrastructure planted without the auto-update UX shipping now
  5. All existing v1.0 SPA tests (763+) remain GREEN and `tsc + vite build` exits 0 — scaffolding is additive only
**Plans**: TBD

### Phase 8: FileBackedAdapter
**Goal**: User data can be stored in and read from a `.aussieledger` SQLite file via the existing StorageAdapter interface, with provable decimal correctness before any implementation code is accepted
**Depends on**: Phase 7
**Requirements**: FILE-01, FILE-02, QUAL-01, QUAL-02
**Success Criteria** (what must be TRUE):
  1. The CI lint check (`QUAL-02`) fails the build if any `CREATE TABLE` DDL in `src-tauri/src/` declares a money column with non-TEXT affinity — the highest-impact pitfall is blocked structurally before any FileBackedAdapter code exists
  2. A parity round-trip test (`QUAL-01`) passes: the same JSON payload round-trips bit-identically through LocalAdapter, ServerAdapter, and FileBackedAdapter — decimal string `"1234.56"` survives store→load as `"1234.56"`, never as `1234.5600000000002`
  3. `FileBackedAdapter.open(path)` opens a `.aussieledger` SQLite file at any user-chosen absolute path (USB stick, NAS mount, `~/Documents/`) — not constrained to the hidden AppData directory
  4. All 12 StorageAdapter methods (`getEntities`, `saveEntities`, `getAccounts`, `saveAccounts`, `getEntries`, `saveEntries`, `getAuditLogs`, `saveAuditLogs`, `appendAuditLog`, `exportAll`, `importAll`, `close`) are implemented and pass the parity test against LocalAdapter output
  5. The `StorageAdapter` interface in `src/storage/adapter.ts` is untouched — `FileBackedAdapter` is additive only; `AdapterKind` gains `'file'` variant
**Plans**: TBD

### Phase 9: Boot Sequence + File Menu UX
**Goal**: A user who launches the desktop app can open or create a `.aussieledger` file using native OS dialogs, manage that file via a File menu, and always know where their data lives
**Depends on**: Phase 8
**Requirements**: PKG-02, FILE-03, FILE-04, FILE-05, FILE-07, FILE-08
**Success Criteria** (what must be TRUE):
  1. On first launch with no recent files, a `FileOpenSplash` welcome screen appears with "Open existing file" and "Create new file" buttons; after picking a file the full app mounts and is ready to use — the v1.0 SPA boot path is unchanged for browser users
  2. File → New / Open / Save As / Close all work: "Save As" uses SQLite `VACUUM INTO` for an atomic snapshot copy (falls back to checkpoint + file copy if unavailable); "New" defaults the save dialog to `~/Documents/AussieLedger/` via `BaseDirectory.Document`
  3. The title bar shows the full file path and the status bar shows "Last saved: N minutes ago" — a non-accountant user can always answer "where is my data?"
  4. Opening a `.aussieledger` file that is already open in another window switches focus to the existing window rather than opening a second connection to the same file
  5. When the user opens a file whose path contains `OneDrive`, `iCloud`, or `Dropbox`, an advisory dialog explains the WAL-corruption risk and recommends a local-disk location (soft warning; user can proceed)
**Plans**: TBD

### Phase 10: Migration + v1.0 Import + File Watcher
**Goal**: Existing v1.0 users can bring their data into a new `.aussieledger` file in a single guided flow, and the app detects when the open file is modified externally
**Depends on**: Phase 8 (FileBackedAdapter must exist before migration can write to it); Phase 9 recommended (file picker needed for choosing the import destination)
**Requirements**: FILE-06, MIG-01, MIG-02, MIG-03
**Success Criteria** (what must be TRUE):
  1. The v5→v6 additive SQL DDL migration (`MIG-01`) creates the `file_meta` table on a new `.aussieledger` file without touching any existing entity, account, journal, or audit field — the v5→v6 round-trip test passes with the existing v0→v5 fixture set
  2. "Import existing v1.0 data" accepts a v1.0 JSON export (at `_v: 5`) and writes a complete v6 `.aussieledger` file at a user-chosen path; all entities, accounts, journal entries, and audit logs are present after import
  3. The JSON migration chain and SQL DDL migration chain are strictly separate — importing a `_v: 5` JSON into an already-initialised v6 file does not double-apply any DDL migration; an explicit test confirms `schema_migrations` has no duplicate rows post-import
  4. When the open `.aussieledger` file is modified externally (simulated via file system write), the app prompts "File changed externally. Reload?" — it does not auto-reload and does not watch the `-wal` or `-shm` sidecars
**Plans**: TBD

### Phase 11: Network Sandbox + AI Removal
**Goal**: The Tauri binary is provably incapable of making any outbound network call — the hard network sandbox is enforced at two independent layers and verified against an actual built binary, not just unit-tested
**Depends on**: Phase 7 (CSP configuration established at scaffold); Phase 8 (Rust commands layer exists for AI removal)
**Requirements**: SAND-01, SAND-02, SAND-03, SAND-04, QUAL-04
**Success Criteria** (what must be TRUE):
  1. The Tauri capabilities allowlist (`src-tauri/capabilities/default.json`) omits `@tauri-apps/plugin-http` entirely — no Rust-side HTTP API is granted; verified by capabilities file review and the absence of the package in `Cargo.toml`
  2. `tauri.conf.json` CSP includes `connect-src 'none'` — webview-level `fetch()` and `XMLHttpRequest` are blocked at the webview engine layer independently of the capabilities system
  3. An integration test (`QUAL-04`) against an actual built Tauri binary (not jsdom or unit mocks) confirms the webview cannot `fetch('https://example.com')` — the sandbox is provably enforced, not just configured
  4. The Gemini AI code path is absent from the Tauri build entirely (`SAND-04`): ImportTB falls back to deterministic fuzzy-match; there is no `invoke('ai_match_accounts')` call in the binary's JS bundle; the AI removal is a deletion, not a feature flag
  5. The app surfaces a visible "Local Only" badge confirming sandbox state — a non-accountant user can see at a glance that no network capability is active
**Plans**: TBD

### Phase 12: CI Cross-Platform + CSV Cleanup + Cosmetic Sweep
**Goal**: Every push to a version tag produces signed (where certs are available) OS-native installers on GitHub Releases, FND-02 CSV exports are closed, and v1.0 cosmetic debts are cleared
**Depends on**: Phases 7–11 (all v2.0 features complete; CI needs a working build target)
**Requirements**: PKG-04, CSV-01, CSV-02, CSV-03, QUAL-05, QUAL-06
**Success Criteria** (what must be TRUE):
  1. The GitHub Actions matrix (`tauri-apps/tauri-action`) produces `.msi` (Windows), `.dmg` (macOS), and `.AppImage` (Linux) artifacts on a version-tag push — all three builds exit 0 in CI
  2. The Windows installer is signed via SignPath Foundation (free OSS cert); the macOS installer ships unsigned with documented Gatekeeper override instructions; the Linux AppImage ships with SHA-256 checksum — `PKG-04` signing posture is met at zero cost
  3. User can export Trial Balance, BAS labels, and Form I labels as CSV files (`CSV-01`, `CSV-02`, `CSV-03`) — FND-02, consciously deferred from v1.0, is closed; each CSV has a documented column convention
  4. `src/App.tsx:114` dead `'US Big Law Firm'` string is removed (`QUAL-05`) and Phases 1, 2, 6 VALIDATION.md frontmatter is flipped to `nyquist_compliant: true` (`QUAL-06`) — all v1.0 cosmetic debts cleared
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Safety Net | v1.0 | 3/3 | Complete | 2026-05-10 |
| 2. Decompose and Tax Engine | v1.0 | 4/4 | Complete | 2026-05-10 |
| 3. Durable Persistence | v1.0 | 4/4 | Complete | 2026-05-12 |
| 4. Bookkeeping Core | v1.0 | 4/4 | Complete | 2026-05-13 |
| 5. Tax Outputs | v1.0 | 4/4 | Complete | 2026-05-28 |
| 6. Personas, Wizard, and Deployment | v1.0 | 4/4 | Complete | 2026-05-29 |
| 7. Tauri Scaffolding + Smoke | v2.0 | 0/TBD | Not started | - |
| 8. FileBackedAdapter | v2.0 | 0/TBD | Not started | - |
| 9. Boot Sequence + File Menu UX | v2.0 | 0/TBD | Not started | - |
| 10. Migration + v1.0 Import + File Watcher | v2.0 | 0/TBD | Not started | - |
| 11. Network Sandbox + AI Removal | v2.0 | 0/TBD | Not started | - |
| 12. CI Cross-Platform + CSV Cleanup + Cosmetic Sweep | v2.0 | 0/TBD | Not started | - |
