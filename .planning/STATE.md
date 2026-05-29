---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: polish-closure-and-tb-import-rework
current_phase: 7
current_plan: null
status: ready-to-plan
stopped_at: v1.1 roadmap created — ready to plan Phase 7 (ImportTB UX Rework)
last_updated: "2026-05-29T13:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-05-29 (v1.1 roadmap created; v2.0 standalone-app idea preserved as future milestone)

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-29 with v1.0 evolution + v1.1 milestone goal).

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**Current focus:** v1.1 — Polish, Closure, and TB Import Rework. 3 phases (7–9); 15 requirements. Standalone desktop app preserved at `.planning/future-milestones/v2.0-standalone-app/` for reactivation as v2.0 after v1.1 ships.

---

## Current Position

**Current phase:** Phase 7 — ImportTB UX Rework (READY TO PLAN)
**Current plan:** None — run `/gsd:plan-phase 7` to create the first v1.1 plan
**Phase 7 status:** Not started.
**Last session:** 2026-05-29T13:00:00Z
**Stopped at:** v1.1 roadmap written — 3 phases (7–9), 15 requirements mapped, all coverage validated. Next: `/gsd:plan-phase 7`
**Overall progress:** v1.1: 0/3 phases complete.

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v1.1:  [Phase 7] [Phase 8] [Phase 9]
       [ NEXT  ] [      ] [      ]

v2.0:  preserved at .planning/future-milestones/v2.0-standalone-app/
```

---

## Phase Summary (v1.1)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 7 | ImportTB UX Rework | Header detection + tolerant currency parser + subtotal exclusion + split-column merging + rejected-rows review panel | NOT STARTED |
| 8 | Family Medicare Levy Engine | v5→v6 additive schema (Entity gains `dependants` + `spouseIncome`) + real family threshold engine + EntityForm extension + Form I family-variant rendering | NOT STARTED |
| 9 | Exports + Polish + Cleanup | FND-02 closure (TB/BAS/Form-I CSV) + anomaly fix-it deep-links + cosmetic + Nyquist frontmatter flip | NOT STARTED |

---

## Performance Metrics

- Plans completed: 0 / Plans total: TBD (phases 7–9 not yet planned)
- Phases complete: 0/3 (v1.1 phases)
- Requirements mapped: 15/15 v1.1 requirements — all phases 7–9 covered

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| (v1.1 plans not yet created) | | | | | |

---

## Accumulated Context

### Architecture Invariants (Locked — Must Not Be Violated)

| Invariant | Source | Phase |
|-----------|--------|-------|
| `StorageAdapter` interface FINAL — 12 methods, additive implementations only, never widen | Phase 3 FINAL | All v1.1 |
| Settings via `localStorage` under `aussieledger:settings` — not an adapter method | Phase 6 PERS-03 | All v1.1 |
| Schema migrations additive + reversible round-trip; migration test required per v{N}→v{N+1} | Phase 3 CONTRIBUTING rule | Phase 8 |
| Per-FY label module pattern (`src/lib/tax/{returns,rates,labels}/fy{NNNN}/*`) | Phase 5 pattern | Phase 8 (medicare.ts widening) |
| No `new Date()` outside `src/lib/period.ts` — Phase 2 structural lint | Phase 2 invariant | All v1.1 |
| `AnomalyBadge` (severity `'info' \| 'warn'`) is the single visual language for anomaly surfaces; blocking enforced at gates, not via badge color | Phase 5 + Phase 6 CONTEXT | Phase 9 (UX-06 deep-links) |
| Help text NEVER states deductibility — content lint enforced | Phase 6 CONTEXT | Phase 8 (Medicare assumption row wording) |
| Decimal arithmetic via decimal.js — money never touches native floats | Phase 1 invariant | Phase 7 (currency parser) + Phase 9 (CSV exports) |
| `IS_AI_ENABLED` constant deprecated; only `isAiEnabled()` function in new code | Phase 6 invariant | Phase 7 (ImportTB changes preserve AI gating exactly as shipped) |

### Key Decisions Made (v1.1 Roadmap)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Pivot from v2.0 (Tauri standalone) to v1.1 (polish + TB rework) | v1.0 audit verdict was `tech_debt`; closing v1.0 gaps + the real TB-import friction users hit today should ship before any architectural pivot | Roadmap |
| v2.0 research preserved at `.planning/future-milestones/v2.0-standalone-app/` | The Tauri/rusqlite/sandbox research is valuable and should resume as v2.0 once v1.1 ships; not throwing it away | Roadmap |
| 3 phases (small bump) | 15 requirements split cleanly into 3 thematic groups: TB rework (5), Medicare engine (4), exports + polish + cleanup (6) | Roadmap |
| Phase 7 (ImportTB) is independent of Phases 8 + 9 | Different parts of the codebase; no shared schema changes; safe parallelisation if desired | Roadmap |
| Phase 8 ships v5→v6 additive migration (Entity gains `dependants` + `spouseIncome`) | Additive only; existing v1.0 entities unaffected; matches Phase 3 schema-migration rule | Roadmap |
| Phase 9 absorbs FND-02 + UX-06 + CLEAN-01 + CLEAN-02 together | Each is small individually; together they form a coherent "v1.1 polish + ship" close-out phase | Roadmap |
| AI features in ImportTB stay exactly as v1.0 shipped | v1.1 ImportTB rework improves the deterministic path only; AI gating (`isAiEnabled()` + `AiGateNote`) unchanged | Roadmap |

### Research Flags for Downstream Planners

- **Phase 7 (plan-phase 7):** Source recent real-world TB exports from Xero / MYOB / QuickBooks / Excel as fixtures for header-detection + subtotal-detection heuristics. Distinguish TB-shape vs GL-shape on import and reject (or adapt to) GL-shape. Currency parser must preserve decimal.js precision end-to-end; tolerant regex must not silently round.
- **Phase 8 (plan-phase 8):** Verify FY2026 family Medicare levy thresholds against current ATO NAT 2541 / NAT 2542 — lower threshold, upper threshold, per-dependant-child amount, family MLS thresholds. Confirm against existing `src/lib/tax/rates/fy2026/medicare.ts` (which currently ships single-person only). v5→v6 migration is additive-only on Entity; round-trip test mandatory.
- **Phase 9 (plan-phase 9):** Excel/Sheets CSV import quirks — leading zeros on account codes (Excel silently strips), UTF-8 BOM for non-ASCII account names, decimal separator (the AU default is `.` but Excel locale-aware). Anomaly fix-it deep-links: reuse existing `useAnomalyCounts` (Phase 6) plus new per-screen "scroll to first anomaly" helpers; cycle-through state can be component-local.

---

## Resolved Blockers

(carried from v1.0 — no new blockers in v1.1 setup)

- v1.0 cosmetic `App.tsx:114` dead string → planned for v1.1 Phase 9 (CLEAN-01)
- v1.0 Nyquist `nyquist_compliant: false` on Phases 1/2/6 → planned for v1.1 Phase 9 (CLEAN-02)
- v1.0 FND-02 CSV per-report export deferred → planned for v1.1 Phase 9 (FND-10/11/12)
- v1.0 family Medicare levy threshold engine deferred → planned for v1.1 Phase 8 (MED-01..04)
- v1.0 ImportTB "messy real-world TB" friction → planned for v1.1 Phase 7 (IMP-07..11)

---

## Open Blockers

None.

---

## Next Steps

1. `/gsd:discuss-phase 7` — gather context and clarify approach for ImportTB UX rework
2. (Alternatively) `/gsd:plan-phase 7` — skip discussion, plan directly
3. Phases 8 + 9 can be started in parallel with 7 if desired (independent codebases)
