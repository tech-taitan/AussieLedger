---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: Phase 3 — Durable Persistence
current_plan: 03-4 (all tasks complete; phase ready for /gsd:verify-work)
status: phase-ready-for-verification
last_updated: "2026-05-12T00:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 11
  completed_plans: 11
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-05-10

---

## Project Reference

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**One-line description:** Free, self-hosted, open-source Australian bookkeeping-to-tax-return tool for all four AU entity types (Company, Trust, Sole Trader, Partnership).

**Stack:** React 19 + TypeScript 5.8 + Vite 6 + Tailwind v4 + motion + lucide + recharts. Adding: Vitest, decimal.js, idb (IndexedDB), Express + better-sqlite3.

**Distribution:** Open-source, self-hosted. No paid services in the critical path.

---

## Current Position

**Current phase:** Phase 3 — Durable Persistence
**Current plan:** 03-4 (all tasks complete; phase ready for /gsd:verify-work)
**Phase status:** All four plans complete. 03-1 (Wave 0 scaffolds + StorageAdapter interface), 03-2 (LocalAdapter + hook refactor), 03-3 (ServerAdapter + Express + better-sqlite3), 03-4 (Data page + W5 banner + Vite /api proxy + README dual-shape). Task 3 human-verify checkpoint APPROVED 2026-05-12 — all 8 manual UAT checks passed (W5 banner correct in scenarios 1, 3, 5). 249 SPA tests + 18 server tests GREEN; lint, build, build:server, and `node scripts/test-dev-full.mjs` all EXIT 0. Phase 3 ready for goal-backward verification.
**Last session:** 2026-05-12 (Task 3 UAT approved; STATE/ROADMAP/SUMMARY updated)
**Overall progress:** Phases 1 + 2 complete; Phase 3 plans 03-1 through 03-4 complete and awaiting /gsd:verify-work

```
[Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
[ DONE  ] [ DONE  ] [VERIFY ] [  ----  ] [  ----  ] [  ----  ]
```

---

## Phase Summary

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 1 | Safety Net | ATO theatre gone, Vitest + CI green, decimal.js, schema versioning | COMPLETE |
| 2 | Decompose and Tax Engine | App.tsx ≤250 lines, lib/tax/ pure functions, AI key off client, period model | COMPLETE |
| 3 | Durable Persistence | Data survives cache clear; StorageAdapter; export/import | Ready for verify (4/4 plans done) |
| 4 | Bookkeeping Core | 80–150 account CoA, journal CRUD + audit, TB import, entity registers | Not started |
| 5 | Tax Outputs | All four return types + BAS/IAS, print-ready with ATO field codes | Not started |
| 6 | Personas, Wizard, Deployment | Dual modes, year-end wizard, anomaly flags, open-source release | Not started |

---

## Performance Metrics

- Plans completed: 11 (Phase 1: 3 plans; Phase 2: 4 plans; Phase 3: 4 plans)
- Plans total: 11 (Phase 1: 3, Phase 2: 4, Phase 3: 4)
- Phases complete: 2/6 (Phase 1 + Phase 2 done); Phase 3 awaiting /gsd:verify-work
- Requirements mapped: 70/70

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| 01 | 01-1 | ~40 min | 12 | +29 ~3 | 36 |
| 01 | 01-2 | — | — | — | — |
| 01 | 01-3 | — | — | — | — |
| 02 | 02-1 | ~3 hr | 3 | +25 ~6 | 166 |
| 02 | 02-2 | ~30 min | 2 | ~4 | 189 |
| 02 | 02-3 | — | — | — | — |
| 02 | 02-4 | — | — | — | 200 |
| 03 | 03-1 | ~5 min | 3 | +19 ~5 | 201 |
| 03 | 03-2 | ~6 min | 3 | +3 ~19 | 238 |
| 03 | 03-3 | — | — | — | 238 (+18 server) |
| 03 | 03-4 | ~8 min | 3/3 | +2 ~7 | 249 (+18 server) |

---

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Phase |
|----------|-----------|-------|
| 6 phases (not the research's suggested 6 — same count, same delivery boundaries) | Requirements cluster naturally into 6 coherent delivery boundaries; standard granularity target is 5-8 | Roadmap |
| Phase 1 must clear all 3 blockers before any other work | localStorage, ATO theatre, and no-tests are all critical-path risks that corrupt user trust and data | Roadmap |
| Persona/wizard deferred to Phase 6 | Phases 1-5 deliver a complete correct single-mode tool; Phase 6 is additive, can be cut if scope pressure requires | Roadmap |
| Print-CSS first, @react-pdf/renderer upgrade in Phase 6 | Browser print is sufficient for v1; PDF library pulls in a separate layout model; verify React 19 compat before committing | Roadmap |
| TAX-03 (CoA pre-mapping) and TAX-05 (shared tax engine) assigned to Phase 2 | These are architectural prerequisites for Phase 5 tax output, but the engine must exist and be testable before the full CoA is built | Roadmap |
| DEP-02 (Express server) assigned to Phase 3 | Server is the SQLite persistence vehicle; belongs with the StorageAdapter work, not deployment polish | Roadmap |
| period.ts uses Date.UTC() for all boundary construction | Timezone-independent ISO dates: local midnight shows as prior day in UTC+ environments | 02-1 |
| currentFy() calls _nowProvider() directly, not today() | vi.spyOn intercepts only the export; internal calls bypass it; _setNowProvider works for both | 02-1 |
| normaliseName() collapses multi-spaces with /\s+/g | Stripping '&' leaves double spaces that break INFERENCE_TABLE lookups | 02-1 |
| Tax compute* functions RELOCATE existing math, not return zeros | Phase 2 preserves visual output; Phase 5 rewrites internals with complete business rules | 02-1 |
| Hook stubs throw at runtime, compile cleanly | Unblocks Plan 02-1 TypeScript without implementing Plan 02-2 work | 02-1 |
| AddLog type exported from useAccounts.ts as canonical location | Single re-export avoids duplicate declarations across useJournals and useEntities | 02-2 |
| useEntities exposes activeEntityId + setEntities + clearSelection beyond test contract | Plan 02-4 App.tsx wiring requires these; forward-compatible interface design | 02-2 |
| StorageAdapter interface FINAL at Wave 0 (12 methods incl. saveAuditLogs) | Plans 03-2 (Local) and 03-3 (Server) implement against an immutable contract — neither widens it; saveAuditLogs included because useAuditLog saves whole collection on every state change | 03-1 |
| Zod schemas live in src/lib/schemas.ts (single source of truth) | Same module imported by SPA importAll() validation AND server POST /api/import — defence-in-depth without duplication | 03-1 |
| better-sqlite3 in optionalDependencies, not dependencies | Native build can fail on Windows without VS Build Tools; SPA-only `dev` script never touches it, so npm install must continue | 03-1 |
| fake-indexeddb wired via beforeEach manual assignment (not /auto) | Vitest setup-file load order can leave /auto incomplete; explicit `new IDBFactory()` per test gives full isolation | 03-1 |
| IDB-* constructor globals hoisted from fake-indexeddb in setup.ts | `idb` wrapper does `instanceof IDBRequest` at runtime; under jsdom only `indexedDB` is provided by default, so the eight other IDB-* classes must be explicitly assigned to globalThis | 03-2 |
| Test setup pre-inits adapter with storageMode='local' override to bypass probe | Without override, every test's beforeEach would burn ~3s waiting for 6×500ms probe-timeout retries; probe-selection tests opt out by re-resetting in their own beforeEach | 03-2 |
| Hook tests' persistence asserts rewritten from localStorage to adapter.getX() | Phase-2 hook tests had leaky-abstraction asserts on storage internals; preserving the public-contract asserts while swapping the persistence-side asserts is the minimal correct change after the I/O target swap | 03-2 |
| useAuditLog calls saveAuditLogs directly — no fallback, no cast | Interface is FINAL from Plan 03-1 and includes saveAuditLogs; one canonical save body | 03-2 |
| DataPage uses FileReader, not File.text() | jsdom does not implement File.text(); ImportTB.tsx already uses FileReader for the same reason | 03-4 |
| DataPage uses today() from src/lib/period.ts (not parameterless `new Date()`) | Phase-2 structural lint rule forbids `new Date()` outside period.ts; today() is the canonical test-seamable now-provider | 03-4 |
| AdapterFallbackBanner reads getFellBackToLocal() once at mount + one useEffect retry | Flag only mutates via _resetAdapter() + initAdapter() (page reload); no polling needed | 03-4 |
| Banner dismissal is React state, not localStorage | Next page reload re-evaluates fallback because next probe attempt resets the flag — correct semantic | 03-4 |
| Vite proxy ws NOT enabled | Vite HMR uses its own websocket on the same dev server; proxying /api with ws=true would intercept it incorrectly | 03-4 |

### Research Flags Pending

- **Before Phase 4:** CoA default account list and ATO tax-label pre-mappings (NAT 0660/0656/0659/0976). Run `/gsd:research-phase 4` before planning Phase 4.
- **Before Phase 5:** Trust streaming boundaries; BRE passive-income test; current-year individual marginal rates + LITO + Medicare levy. Run `/gsd:research-phase 5` before planning Phase 5.
- **Before Phase 6:** Verify `@react-pdf/renderer` React 19 compatibility before committing.

### Known Risks

| Risk | Mitigation | Phase |
|------|------------|-------|
| GST decimal rounding accumulates to wrong BAS totals | decimal.js installed Phase 1; enforced in BAS rollup Phase 5; golden tests | 1, 5 |
| Base Rate Entity company tax applied wrong (always 25%, ignoring passive income) | BRE test wizard + unit test (90% dividend income → 30%) | 5 |
| Trust streaming omitted silently | Streaming-not-supported disclaimer + income-type breakdown fields in data model | 5 |
| localStorage data loss on cache clear | StorageAdapter + IndexedDB/SQLite replaces localStorage entirely | 3 |
| Stale ATO label specs baked in | FY-versioned label files; source commented with NAT reference; annual refresh process documented | 2, 5 |
| App.tsx becoming 2000-line god component | Hook extraction Phase 2 reduces to ≤250 lines | 2 |

### Brownfield Preservation Rules

- The visual shell (collapsible sidebar, bottom-nav, Tailwind design system) is kept and built upon
- JournalForm.tsx and master dashboard are working assets — refactor, do not replace
- Each phase must leave the app visually working; no phase is a rewrite
- New dependencies must be open-source and run locally (no paid services in critical path)

### Open Questions

| Question | Impact | When to Resolve |
|----------|--------|-----------------|
| Auth on shared VPS instance — none, PIN, or full user roles? | Affects Phase 3 server build | Before Phase 3 planning |
| Persistence mechanism confirmed (IndexedDB + SQLite server) — any VPS-specific concerns? | Low risk; architecture research rates this HIGH confidence | Before Phase 3 planning |
| CoA default account list — exact 80-150 accounts and ATO label pre-mappings | Highest-risk design decision in Phase 4 | Run research-phase before Phase 4 |
| Trust streaming v1 scope — data model placeholder field spec | Required for Phase 5 Form T | Before Phase 5 planning |

---

## Session Continuity

**To resume work:** Read this file, then read `.planning/ROADMAP.md` for phase goals and success criteria. Run `/gsd:plan-phase 1` to create the first phase plan.

**Files that define the project:**
- `.planning/PROJECT.md` — scope, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 70 v1 requirements with traceability
- `.planning/ROADMAP.md` — 6 phases with goals and success criteria
- `.planning/STATE.md` — this file (project memory)

**Codebase context:**
- `.planning/codebase/ARCHITECTURE.md` — existing patterns (App.tsx is 1,126 lines, all state via props)
- `.planning/codebase/CONCERNS.md` — known weaknesses ranked by severity
- `.planning/research/SUMMARY.md` — research findings and phase-ordering rationale
- `.planning/research/ARCHITECTURE.md` — StorageAdapter pattern, migration path
- `.planning/research/PITFALLS.md` — 14 pitfalls with prevention strategies

---

*State initialized: 2026-05-10 after roadmap creation*
