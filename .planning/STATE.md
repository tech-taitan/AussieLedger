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

**Current phase:** Phase 1 — Safety Net
**Current plan:** None started
**Phase status:** Not started
**Overall progress:** 0/6 phases complete

```
[Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
[  ----  ] [  ----  ] [  ----  ] [  ----  ] [  ----  ] [  ----  ]
```

---

## Phase Summary

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 1 | Safety Net | ATO theatre gone, Vitest + CI green, decimal.js, schema versioning | Not started |
| 2 | Decompose and Tax Engine | App.tsx ≤250 lines, lib/tax/ pure functions, AI key off client, period model | Not started |
| 3 | Durable Persistence | Data survives cache clear; StorageAdapter; export/import | Not started |
| 4 | Bookkeeping Core | 80–150 account CoA, journal CRUD + audit, TB import, entity registers | Not started |
| 5 | Tax Outputs | All four return types + BAS/IAS, print-ready with ATO field codes | Not started |
| 6 | Personas, Wizard, Deployment | Dual modes, year-end wizard, anomaly flags, open-source release | Not started |

---

## Performance Metrics

- Plans completed: 0
- Plans total: TBD (defined per phase when plan-phase runs)
- Phases complete: 0/6
- Requirements mapped: 70/70

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
