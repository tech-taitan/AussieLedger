---
phase: 3
slug: durable-persistence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-11
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (existing) + `fake-indexeddb@^6` (new devDep) + `better-sqlite3@^11` in-memory (server suite, new devDep) |
| **Config file** | `vitest.config.ts` (existing; no changes) + `src/test/setup.ts` (extend with IDB shim) + `server/vitest.config.ts` (new — node env, not jsdom) |
| **Quick run command** | `npx vitest run src/storage src/lib/migrations` (≈ 4s — adapter + migration tests only) |
| **Full suite command** | `npm run test` (full SPA suite) + `npm run test:server` (new script, server suite) |
| **Estimated runtime** | SPA ≈ 6s, Server ≈ 4s (combined ≈ 10s) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/storage src/lib/migrations`
- **After every plan wave:** Run `npm run test` + `npm run test:server`
- **Before `/gsd:verify-work`:** Full SPA suite + server suite green AND manual UAT checklist complete for FND-01 cache-clear + DEP-02 both-shapes-boot
- **Max feedback latency:** 10 seconds combined

---

## Per-Task Verification Map

> Concrete task-IDs are assigned by the planner. Map below pre-binds each phase requirement / success criterion to its test type and exact command so the planner can attach `<automated>` blocks to the matching task.

| Behaviour | Requirement | Test Type | Automated Command | File Exists |
|-----------|-------------|-----------|-------------------|-------------|
| IndexedDB persistence across reopen (fake-indexeddb in test) | FND-01 | unit | `npx vitest run src/storage/__tests__/local.test.ts -t "data survives reopen"` | ❌ W0 |
| Real Chrome "Clear cookies & cache" does NOT wipe IDB | FND-01 | manual UAT | n/a — verification checklist | ❌ doc |
| `npm run start:server` stop / restart preserves SQLite data | FND-01 | integration | `npx vitest run server/__tests__/persistence.test.ts -t "survives restart"` | ❌ W0 |
| Export produces `{_v:2, entities, accounts, allEntries, auditLogs}` | FND-02 | unit | `npx vitest run src/storage/__tests__/export.test.ts` | ❌ W0 |
| CSV export NOT delivered (partial-FND-02 doc note) | FND-02 | doc only | n/a — verification report flags partial delivery | ❌ doc |
| Round-trip: export → fresh adapter → importAll → exportAll equal | FND-03 | unit (both adapters) | `npx vitest run src/storage/__tests__/import.test.ts -t "round-trip"` | ❌ W0 |
| Import on empty instance proceeds with single confirm | FND-03 | unit (component) | `npx vitest run src/components/__tests__/DataPage.test.tsx -t "import on empty"` | ❌ W0 |
| Import on populated instance requires typing `REPLACE` | FND-03 | unit (component) | `npx vitest run src/components/__tests__/DataPage.test.tsx -t "REPLACE confirmation"` | ❌ W0 |
| Refuse import where `_v > CURRENT_VERSION` via MigrationError | FND-03 | unit | `npx vitest run src/lib/migrations/__tests__/refuse-newer.test.ts` | ❌ W0 |
| `npm run dev` boots SPA, IndexedDB mode visible | DEP-02 | manual UAT | n/a — verification checklist | ❌ doc |
| `npm run dev:full` boots both, `/api/health` responds | DEP-02 | integration script | `node scripts/test-dev-full.mjs` | ❌ W0 |
| `001-initial.sql` produces expected schema | DEP-02 | unit | `npx vitest run server/db/__tests__/migrate.test.ts -t "001-initial"` | ❌ W0 |
| Transactional whole-collection replace rolls back on error | DEP-02 | unit | `npx vitest run server/__tests__/atomicity.test.ts` | ❌ W0 |
| Express binds 127.0.0.1 by default | DEP-02 | unit | `npx vitest run server/__tests__/bind.test.ts` | ❌ W0 |
| Round-trip `_v:0` blob → migrate → adapter → export equal | Success #5 | unit | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts` | ❌ W0 |
| Adapter selection: probe 200 → ServerAdapter | Probe | unit (mock fetch) | `npx vitest run src/storage/__tests__/index.test.ts -t "selects server on health 200"` | ❌ W0 |
| Adapter selection: probe exhausts → LocalAdapter with banner | Probe | unit (mock fetch + timeout) | `npx vitest run src/storage/__tests__/index.test.ts -t "falls back to local"` | ❌ W0 |
| `storageMode=local` override bypasses probe | Probe | unit | `npx vitest run src/storage/__tests__/index.test.ts -t "honors storageMode override"` | ❌ W0 |
| localStorage → IndexedDB one-time legacy migration | LS Migration | unit | `npx vitest run src/storage/__tests__/legacy-migration.test.ts` | ❌ W0 |
| Legacy migration failure leaves localStorage untouched | LS Migration | unit (inject parse error) | `npx vitest run src/storage/__tests__/legacy-migration.test.ts -t "preserves on failure"` | ❌ W0 |
| `IS_AI_ENABLED` server-mode derives from `/api/health.aiEnabled` | AI proxy | unit | `npx vitest run src/lib/__tests__/ai.test.ts -t "server-mode flag"` | ❌ W0 |
| `POST /api/import` rejects malformed body with 400 (Zod) | Server | unit | `npx vitest run server/__tests__/import-validation.test.ts` | ❌ W0 |

*Status legend: ❌ W0 = Wave 0 must create file; ❌ doc = documented only, no automation*

---

## Wave 0 Requirements

All Phase 3 test files are new — neither `src/storage/` nor `server/` exists. Wave 0 must scaffold:

- [ ] `src/test/setup.ts` — extend with `fake-indexeddb` global assignment (manual setup, NOT `/auto` — see research §7)
- [ ] `src/storage/adapter.ts` — TypeScript interface skeleton (so test files compile)
- [ ] `src/storage/__tests__/local.test.ts` — FND-01 IDB persistence
- [ ] `src/storage/__tests__/server.test.ts` — ServerAdapter HTTP shim (mock fetch)
- [ ] `src/storage/__tests__/index.test.ts` — probe + selection + override
- [ ] `src/storage/__tests__/legacy-migration.test.ts` — four-key localStorage upgrade
- [ ] `src/storage/__tests__/export.test.ts` — FND-02 shape correctness
- [ ] `src/storage/__tests__/import.test.ts` — FND-03 round-trip
- [ ] `src/lib/migrations/__tests__/round-trip.test.ts` — success criterion #5
- [ ] `src/lib/migrations/__tests__/refuse-newer.test.ts` — `_v > CURRENT_VERSION` refusal
- [ ] `src/components/__tests__/DataPage.test.tsx` — Export / Import / REPLACE confirmation
- [ ] `src/lib/__tests__/ai.test.ts` — `IS_AI_ENABLED` widened
- [ ] `server/vitest.config.ts` — separate config (node env)
- [ ] `server/__tests__/persistence.test.ts` — SQLite survives restart (close+reopen connection)
- [ ] `server/__tests__/atomicity.test.ts` — transactional rollback
- [ ] `server/__tests__/import-validation.test.ts` — Zod 400 reject
- [ ] `server/__tests__/bind.test.ts` — 127.0.0.1 default
- [ ] `server/db/__tests__/migrate.test.ts` — runner idempotency
- [ ] `server/routes/__tests__/*.test.ts` — per-route smoke tests
- [ ] `scripts/test-dev-full.mjs` — spawn `dev:full` + curl `/api/health` + kill
- [ ] `package.json` script: `"test:server": "vitest run --config server/vitest.config.ts"`
- [ ] Add devDeps: `fake-indexeddb@^6`, `better-sqlite3@^11`, `concurrently@^9`, `idb@^8`, `zod@^3.23`

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| Real Chrome "Clear cookies and cached images" preserves IDB | FND-01 | fake-indexeddb cannot simulate Chrome's storage-UI selective clears | 1) `npm run dev` 2) Create entity + journal entries 3) DevTools → Application → Clear Storage → tick "Cookies and other site data" + "Cached images and files" (NOT "IndexedDB") → Clear 4) Reload → data still present |
| SQLite path survives `Ctrl-C` and restart of `npm run start:server` | FND-01 | Process-restart not unit-testable in fake-indexeddb env | 1) `npm run dev:full` 2) Create data 3) Kill server 4) Re-run `npm run start:server` 5) Reload SPA → data restored |
| Windows `npm install` with VS Build Tools 2022 (C++ workload) | DEP-02 | Native compile environment | 1) Fresh Windows machine 2) Install Node 20+ 3) Install Python 4) Install VS Build Tools 2022 (Desktop C++ workload) 5) `npm install` succeeds |
| `npm run dev` (no server) — SPA loads, Data page shows "Local (IndexedDB)" | DEP-02 | Boot-time UI assertion | Visual: SPA opens; Data nav entry; status reads "Local" |
| `npm run dev:full` — both processes alive, Data page shows "Server (SQLite)" | DEP-02 | Boot-time UI assertion | Visual: both ports up; Data status reads "Server (SQLite)" |
| Adapter probe banner appears when server is killed mid-session and SPA reloads | Probe | Cross-process timing | 1) `npm run dev:full` 2) Kill the server process only 3) Reload SPA tab → "Server unreachable — running in local mode" banner shown |
| AI: Server mode + `GEMINI_API_KEY` set → ImportTB shows AI flow | AI proxy | Real Gemini call (or stubbed via `MY_GEMINI_API_KEY` sentinel) | 1) Set `GEMINI_API_KEY` in server env 2) `npm run dev:full` 3) Go to ImportTB → AI section visible |
| AI: Server mode without key → ImportTB AI flow hidden | AI proxy | Same | 1) Unset key 2) Boot 3) ImportTB → no AI section |
| CSV export gap: verification report flags FND-02 as partially delivered | FND-02 | Documentation requirement, not behaviour | Phase verifier confirms VERIFICATION.md mentions "CSV export deferred to Phase 4/5 per-report" |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (21+ test files identified above)
- [ ] No watch-mode flags in any command
- [ ] Feedback latency < 10s combined
- [ ] `nyquist_compliant: true` set in frontmatter once planner has bound tests to tasks

**Approval:** pending
