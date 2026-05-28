---
created: 2026-05-28T22:08:58.648Z
title: Package as standalone desktop app with local backend
area: general
files: []
---

## Problem

v1.0 ships as a Vite SPA with two install paths:

- **Single-user local** — `npm run dev` (IndexedDB, no server)
- **Small-firm VPS** — `npm install && npm run dev:full` (Express + `better-sqlite3`)

Both require Node, npm, git, and command-line literacy. That's a hard mismatch with the project audience defined in PROJECT.md: "small-business owners who can't afford Xero/MYOB" — the same audience that, by definition, won't run a Vite dev server.

For v2 the project should ship as a **standalone desktop application** that bundles the frontend, a local backend, and SQLite into a single double-click installer per OS (Windows `.exe` / macOS `.app` / Linux `.AppImage` or `.deb`). The user installs once, opens an icon, and their data lives in a local SQLite file at a known path — no terminal, no Node, no firewall config.

This is significant scope (v2.0 territory, not v1.1):

- Choice of packaging stack (Tauri vs Electron — see Solution)
- Bundling `better-sqlite3` as a sidecar process or porting persistence to Tauri's SQL plugin
- Auto-update channel (so users get bug fixes without re-installing)
- Code-signing on macOS (Apple Developer ID) and Windows (EV cert) — these are paid services, conflicting with v1's DEP-01 "no paid services in critical path" stance, so either the cert is a project-level optional thing or unsigned binaries are acceptable for the audience
- Where the data file lives by OS convention (e.g. `~/Library/Application Support/AussieLedger/` on macOS) and how that interacts with the Phase 3 StorageAdapter abstraction
- Backup/restore UX — desktop users expect "File → Export" / "File → Open" menu items, not a web-style download
- Distribution channel — GitHub Releases? Direct download from a static site? Homebrew / Chocolatey / winget?

## Solution

**TBD** — but initial leaning:

- **Stack: Tauri 2.x** (Rust-based, ~10MB bundles vs ~100MB Electron, native OS webview).
  - Phase 3 `ServerAdapter` is HTTP-shaped; Tauri's IPC could replace HTTP without touching the frontend (StorageAdapter abstraction was Phase 3's whole point — this is the call site that would prove its value)
  - Or: keep the Express server, run it as a sidecar process Tauri launches
- **Persistence:** keep `better-sqlite3` running as a sidecar (Tauri spawns the Node process) — preserves the migration chain shipped in v1.
- **Auto-update:** Tauri has a built-in updater; signing keys can be generated locally without paid certs (just no platform-level trust badge).
- **Distribution:** GitHub Releases for v2.0 launch; revisit Homebrew/winget once usage data exists.
- **Audit + planning:** treat this as a new milestone (v2.0 Standalone) — likely 4-6 phases:
  1. Packaging spike (verify Tauri + sidecar + SQLite works end-to-end)
  2. StorageAdapter swap (IPC instead of HTTP, or keep HTTP via sidecar)
  3. Native menus + file-system UX (Export/Open as menu items, OS data paths)
  4. Auto-update pipeline
  5. Cross-platform CI build (GitHub Actions matrix: macOS / Windows / Linux)
  6. Launch (README + landing page + release notes)

Related v1.0 artifacts to read when this comes up next:

- `.planning/PROJECT.md` (vision + audience constraint)
- `.planning/phases/03-durable-persistence/03-CONTEXT.md` (StorageAdapter FINAL invariant — the abstraction designed exactly for this)
- `.planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md` (DEP-01 zero-cost rationale)
- `server/` (existing Express + SQLite implementation that could become the sidecar)
- `package.json` scripts (`dev`, `dev:full`, `build`, `build:server` — Tauri build replaces or composes these)

Open question for next session: is "standalone desktop app" the right shape, or would a one-click installer that drops the existing Vite + Express + SQLite stack into a folder + Start-menu shortcut be enough? The latter is much cheaper and still solves the "no terminal" problem.
