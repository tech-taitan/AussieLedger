---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: importtb-ux-rework
current_phase: Phase 8 — Family Medicare Levy Engine (NOT STARTED)
current_plan: "08-1 (not yet planned)"
status: in-progress
stopped_at: "Completed 07-4-PLAN.md — Phase 7 fully complete; all 5 IMP-07..11 requirements signed off"
last_updated: "2026-05-30T12:00:00.000Z"
progress:
  total_phases: 3
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
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

**Current phase:** Phase 8 — Family Medicare Levy Engine (NOT STARTED)
**Current plan:** 08-1 (not yet planned)
**Phase 7 status:** COMPLETE — all 4 plans shipped; all 5 IMP-07..11 requirements verified by user UAT on 2026-05-30. Final test counts: 848 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.
**Last session:** 2026-05-30T12:00:00.000Z
**Stopped at:** Completed 07-4-PLAN.md — Phase 7 fully complete; ready for Phase 8 planning
**Overall progress:** v1.1: 1/3 phases complete (Phase 7 done, Phase 8 next).

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v1.1:  [Phase 7] [Phase 8] [Phase 9]
       [ DONE  ] [ NEXT  ] [      ]

v2.0:  preserved at .planning/future-milestones/v2.0-standalone-app/
```

---

## Phase Summary (v1.1)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 7 | ImportTB UX Rework | Header detection + tolerant currency parser + subtotal exclusion + split-column merging + rejected-rows review panel | COMPLETE (2026-05-30) |
| 8 | Family Medicare Levy Engine | v5→v6 additive schema (Entity gains `dependants` + `spouseIncome`) + real family threshold engine + EntityForm extension + Form I family-variant rendering | NOT STARTED |
| 9 | Exports + Polish + Cleanup | FND-02 closure (TB/BAS/Form-I CSV) + anomaly fix-it deep-links + cosmetic + Nyquist frontmatter flip | NOT STARTED |

---

## Performance Metrics

- Plans completed: 4 / Plans total: TBD (phases 8–9 not yet planned)
- Phases complete: 1/3 (v1.1 phases) — Phase 7 COMPLETE
- Requirements mapped: 15/15 v1.1 requirements — all phases 7–9 covered

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| 7 | 1 | ~20 min | 1 | 17 | 769 GREEN, 75 todo |
| 7 | 2 | ~16 min | 3 | 12 | 821 GREEN, 28 todo |
| 7 | 3 | ~45 min | 4 | 8 | 848 GREEN, 11 todo |
| 7 | 4 | ~10 min | 2/2 | 1 | 848 GREEN, 11 todo (UAT sign-off) |

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

### Key Decisions Made (Phase 7 Plan 3)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| AnomalyBadge uses 'message' prop (required), not 'label' | Plan interface spec and actual Phase 5 implementation differed; actual component definition is the ground truth; auto-fixed at lint time | Phase 7 Plan 3 |
| IMP-09 test fixture uses Xero synthetic code for Total Revenue row | Empty-code subtotal rows go to no-account-code group before subtotal detection; test must use a coded row to exercise the subtotal detection path | Phase 7 Plan 3 |
| proceedAfterHeaderPick handles both CSV and XLSX paths identically | Both paths use same split-column detection + missing-code-mode logic after parsing with headerRowIndex | Phase 7 Plan 3 |
| All new ImportReviewPane props optional | Backward-compatible with Phase 4 callers — no props = no new UI elements rendered | Phase 7 Plan 3 |

### Key Decisions Made (Phase 7 Plan 2)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| mergeHeaderRows carry-forward for Xero multi-row headers | When rowA[i] is empty but rowB[i] has content, prefix with last non-empty rowA value — required for Xero "Account / Code" / "Account / Name" composites where "Account" spans two sub-columns | Phase 7 Plan 2 |
| deriveRegexSignature uses (?<!\\) negative lookbehind in step 3 | Prevents step-3 letter generalisation from corrupting the 'd' in '\d+' inserted by step 2 — the RESEARCH.md skeleton was silently wrong on this ordering | Phase 7 Plan 2 |
| detectSplitColumns both-unmatched fallback added | When neither CODE_HEADER_RE nor NAME_HEADER_RE match any header, fall back to pure value-shape heuristic on non-numeric columns — required for fixtures with opaque column names | Phase 7 Plan 2 |
| new Uint8Array(nodeBuf).buffer for XLSX test ArrayBuffer | Node Buffer.buffer is a shared pool allocation in some environments; .slice() with byteOffset returns wrong data; Uint8Array copy is always safe | Phase 7 Plan 2 |

### Key Decisions Made (Phase 7 Plan 1)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Used stub modules instead of @ts-expect-error on imports | Vite resolves imports at bundle time; @ts-expect-error only suppresses TypeScript type errors, not Vite module-resolution failures. Stub modules with throw-not-implemented bodies let all it.todo() tests be collected without error | Phase 7 Plan 1 |
| xero-tb.csv uses name-before-code column order | Matches the research-documented Xero reversed-column shape (Account Name first, Account Code second) — critical for column-merge tests to exercise the correct fixture | Phase 7 Plan 1 |
| Known-sum amounts in all fixtures | xero: 50000+5000=55000, myob: 25000+500+5000=30500, excel: 25000+5000=30000 — gives subtotal sum-pattern tests concrete verifiable expectations | Phase 7 Plan 1 |

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

1. `/gsd:plan-phase 8` — plan Family Medicare Levy Engine (v5→v6 migration + family threshold engine + EntityForm extension + Form I variant)
2. (Alternatively) `/gsd:plan-phase 9` — plan Exports + Polish + Cleanup (independent of Phase 8)
3. Phases 8 + 9 are independent of each other and can be planned/executed in parallel if desired
