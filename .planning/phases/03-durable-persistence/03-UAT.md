---
phase: 3
slug: durable-persistence
type: verification
verdict: PASS-with-documented-partial
goal_backward_complete: true
verified_on: 2026-05-12
verifier: claude (gsd:verify-work)
human_uat_signoff: approved 2026-05-12
---

# Phase 3 — Verification (UAT) Report

## Phase Goal (verbatim from ROADMAP.md)

> User data survives a browser cache clear in both deployment shapes; the StorageAdapter interface hides the underlying store from all components and hooks; JSON export/import works end-to-end.

**Verdict: PASS** — goal achieved with one documented partial (FND-02 CSV per-report exports deferred to Phase 4/5, as flagged in 03-CONTEXT.md).

---

## Success Criteria — Goal-Backward Check

| # | Criterion | Verified By | Result |
|---|-----------|-------------|--------|
| 1 | After entering journals and clearing the browser cache, data is still present on next load — IDB (no-server) or SQLite (server) | Manual UAT step 2 (Chrome DevTools "Clear cookies and cached images" with IndexedDB **un**ticked → data survives reload) + UAT step 4 (`Ctrl+C` `dev:full`, restart, reload SPA → data still present, `data/ledger.db` size > 0) + `server/__tests__/persistence.test.ts` GREEN (close/reopen connection preserves data) | **PASS** |
| 2 | A prominent "Export data" action in the main navigation produces a complete JSON file (entities + journals + accounts + audit logs) | Manual UAT step 1 (Data sidebar entry → Export button → `aussieledger-YYYY-MM-DD-HHmm.json` downloads with `_v: 2`, `entities`, `accounts`, `allEntries`, `auditLogs` keys) + `src/storage/__tests__/export.test.ts` GREEN (shape correctness) | **PASS (JSON)** / **PARTIAL (CSV deferred)** |
| 3 | Import a previously-exported JSON file on a fresh instance and restore all data exactly | Manual UAT step 6 (Export, then Import on empty instance = one-tap; Import on populated instance = `REPLACE` literal required; `replace` lowercase keeps Confirm disabled) + `src/storage/__tests__/import.test.ts` GREEN (round-trip) + `src/lib/migrations/__tests__/refuse-newer.test.ts` GREEN (refuses `_v > CURRENT_VERSION`) | **PASS** |
| 4 | `npm run dev` (no server) starts with IndexedDB; `npm run dev:full` (Vite + Express) starts with SQLite; both produce working apps | Manual UAT step 1 (dev no-server → "Local (IndexedDB)" status visible) + step 3 (dev:full fresh incognito → "Server (SQLite)" status visible, no fallback banner) + `node scripts/test-dev-full.mjs` exits 0 (verified during Plan 03-4 Task 2 — `/api/health` returned `{ok:true,version:2,aiEnabled:false}` in ~3s) | **PASS** |
| 5 | Schema migration round-trip: `_v:0` data is correctly upgraded to current schema without data loss | `src/lib/migrations/__tests__/round-trip.test.ts` GREEN (1 test) + `src/lib/migrations/__tests__/v1-to-v2.test.ts` (auto-applied during legacy migration). Confirmed: `migrate(_v:0 blob)` produces `_v: 2` PersistedRoot preserving all fields | **PASS** |

---

## Goal Element 2: "StorageAdapter Hides the Underlying Store"

Phase 3's goal includes an architectural claim. Verified by code inspection.

**Method:** `grep -r "localStorage" src/` then exclude tests, setup files, and `src/storage/` (the abstraction's own implementation).

**Result:** Zero `localStorage` references in production hooks (`src/hooks/use*.ts`) or production components. The only matches are:

| File | Why it's allowed |
|------|------------------|
| `src/storage/index.ts` | The probe layer itself — reads `localStorage.storageMode` override (a developer escape hatch) and writes the legacy-migration sentinel |
| `src/storage/legacy-migration.ts` | The one-time legacy upgrade reading old four-key localStorage data and writing it to IDB |
| `src/test/setup.ts` | Test environment shim |
| `src/storage/__tests__/*` | Storage layer's own tests |
| `src/hooks/__tests__/*` | Test setup/teardown clears prior localStorage to keep test isolation; production hooks call `getAdapter()` exclusively |
| `src/components/__tests__/DataPage.test.tsx` | Test setup |

All four hooks (`useAccounts`, `useAuditLog`, `useEntities`, `useJournals`) read/write via `getAdapter()` (verified: each contains `getAdapter|importAll|exportAll|saveEntities|saveAccounts|saveEntries|saveAuditLogs`). **The abstraction holds.**

---

## Automated Test Roll-Up (run 2026-05-12)

| Suite | Files | Passing | Todo | Failed |
| ----- | -----:| -------:| ----:| ------:|
| `npm run test` (SPA) | 34 | **249** | 11 | 0 |
| `npm run test:server` | 6 | **18** | 0 | 0 |
| `npm run lint` | — | EXIT 0 | — | — |
| `npm run build` | — | EXIT 0 | — | — |
| `npm run build:server` | — | EXIT 0 | — | — |
| `node scripts/test-dev-full.mjs` | — | EXIT 0 | — | — |

Phase 3 test files (all GREEN):
- `src/storage/__tests__/local.test.ts` — IDB persistence (FND-01)
- `src/storage/__tests__/server.test.ts` — ServerAdapter HTTP shim
- `src/storage/__tests__/index.test.ts` — probe + selection + override
- `src/storage/__tests__/legacy-migration.test.ts` — four-key localStorage upgrade
- `src/storage/__tests__/export.test.ts` — FND-02 shape correctness
- `src/storage/__tests__/import.test.ts` — FND-03 round-trip
- `src/lib/migrations/__tests__/round-trip.test.ts` — success criterion #5
- `src/lib/migrations/__tests__/refuse-newer.test.ts` — `_v > CURRENT_VERSION` refusal
- `src/lib/migrations/__tests__/runner.test.ts` — runner mechanics
- `src/lib/migrations/__tests__/v1-to-v2.test.ts` — actual migration body
- `src/components/__tests__/DataPage.test.tsx` — Export / Import / REPLACE / banner (11 GREEN incl. 3 banner)
- `server/__tests__/persistence.test.ts` — SQLite survives restart
- `server/__tests__/atomicity.test.ts` — transactional rollback
- `server/__tests__/import-validation.test.ts` — Zod 400 reject
- `server/__tests__/bind.test.ts` — 127.0.0.1 default
- `server/routes/__tests__/health.test.ts` — `/api/health`

---

## Manual UAT Sign-Off (from Plan 03-4 Task 3)

User replied `approved` on 2026-05-12. All 8 checks passed:

| # | Check | Outcome |
|---|-------|---------|
| 1 | `npm run dev` no-server: banner, Local (IndexedDB), Export downloads with full PersistedRoot | PASS |
| 2 | FND-01a: Chrome DevTools "Clear site data" with IndexedDB unticked → survives | PASS |
| 3 | `npm run dev:full` fresh incognito: no banner, Server (SQLite), decimals as strings | PASS |
| 4 | FND-01b: Ctrl+C server, restart, reload → data present; `data/ledger.db` size > 0 | PASS |
| 5 | W5 mid-session kill: banner appears after reload, dismissible | PASS |
| 6 | FND-03: REPLACE literal required on populated, one-tap on empty | PASS |
| 7 | AI proxy (optional) | PASS / N/A |
| 8 | Visual sweep all views | PASS — no console errors, disclaimer footer present |

W5 banner three-scenario behaviour confirmed: appeared in scenarios 1 + 5, silent in scenario 3.

---

## Requirements Coverage

| Requirement | Plan(s) | Status |
|-------------|---------|--------|
| **FND-01** Data survives cache clear (both shapes) | 03-2 (Local), 03-3 (Server) | **DELIVERED** — verified by manual UAT 2 + 4, server persistence.test.ts |
| **FND-02** Export complete dataset | 03-4 (Data page) | **DELIVERED (JSON)** / **PARTIAL (CSV)** — JSON full export works; CSV per-report exports deferred to Phase 4/5 per 03-CONTEXT.md (P&L/BAS reports don't exist yet to export) |
| **FND-03** Import + REPLACE + refuse-newer | 03-4 (Data page) | **DELIVERED** — REPLACE confirmation, MigrationError on newer-than-current, round-trip equality |
| **DEP-02** Express + SQLite + dual deployment | 03-1 (deps), 03-3 (server), 03-4 (Vite proxy + README) | **DELIVERED** — both shapes boot, `/api/health` integration smoke green |

70/70 v1 requirements mapped, with Phase 3 closing FND-01, FND-02 (JSON half), FND-03, DEP-02.

---

## Documented Partial Delivery

**FND-02 CSV exports:** The acceptance criterion for FND-02 reads "export complete dataset". JSON export of the full PersistedRoot is delivered. CSV exports of specific reports (P&L, BAS, journal listing) are out of scope for Phase 3 because the reports themselves don't exist yet — they land in Phase 4 (journal/TB) and Phase 5 (tax outputs). At that point CSV will be added per-report, not as a Phase 3 omission to backfill.

03-CONTEXT.md flagged this explicitly; this verification report formalises it. **No fix-plan required.**

---

## Known Risks Carried Forward

| Risk | From | Notes |
|------|------|-------|
| Windows `better-sqlite3` native build | 03-RESEARCH | Mitigated via `optionalDependencies` (npm install survives without VS Build Tools); `dev:full` path requires the toolchain. Documented in README. |
| GST decimal rounding | Roadmap | decimal.js + money.ts boundary in place from Phase 1; ServerAdapter de/serialises decimals as strings (verified UAT step 3); enforced in BAS rollup Phase 5 |
| CSV per-report exports | This phase | Will be implemented alongside the report it's exporting (Phases 4 + 5) |

---

## Verdict & Routing

**Phase 3 verdict: PASS-with-documented-partial.**

The phase goal is achieved end-to-end. All five success criteria are met by a combination of GREEN automated tests + signed-off manual UAT. The StorageAdapter abstraction is intact (zero `localStorage` references in production hooks/components). The FND-02 CSV gap is a planned cross-phase deferral, not a verification failure.

**No fix plan required. No issues raised by user during UAT.**

**Routing:**
- Update STATE.md to `phase-complete` for Phase 3 (was `phase-ready-for-verification`).
- Update ROADMAP.md Phase 3 checkbox `[ ]` → `[x]`.
- Capture Phase 3 metrics in STATE.md summary table.
- Run `/gsd:research-phase 4` before `/gsd:discuss-phase 4` — Phase 4 (Bookkeeping Core) needs CoA + ATO label research per ROADMAP "Research Flags Pending".

---

*Verification generated by /gsd:verify-work on 2026-05-12.*
