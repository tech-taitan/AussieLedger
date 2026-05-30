---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: public-hosting-and-indexeddb-hardening
current_phase: null
current_plan: null
status: defining-requirements
stopped_at: v1.2 milestone goals locked — research decision next
last_updated: "2026-05-30T19:45:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-05-29 (v1.1 roadmap created; v2.0 standalone-app idea preserved as future milestone)

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-30 with v1.1 evolution).

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**Current focus:** v1.2 — Public Hosting + IndexedDB Hardening. Ship the SPA on a public URL backed by the existing v1.0 IndexedDB persistence; harden the IDB-only path (persistent-storage permission, backup-nag UX, quota); polish open-source release for the new "go to URL, start using" audience. AI gating preserved (user supplies own Gemini key via in-app paste). v2.0 (sqlite-wasm + FSA + optional Tauri wrapper) pre-locked as the follow-on once v1.2 reaches real users.

---

## Current Position

**Current phase:** Phase 9 — Exports + Polish + Cleanup
**Current plan:** 09-1 (COMPLETE — UAT signed off 2026-05-30)
**Phase 7 status:** COMPLETE — all 4 plans shipped; all 5 IMP-07..11 requirements verified by user UAT on 2026-05-30. Final test counts: 848 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.
**Phase 8 status:** COMPLETE — all 3 plans shipped; all 4 MED-01..04 requirements verified by user UAT on 2026-05-30. Final test counts: 910 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.
**Phase 9 status:** COMPLETE — 1/1 plans shipped; all 6 FND-10/11/12 + UX-06 + CLEAN-01/02 requirements verified by user UAT on 2026-05-30. Final test counts: 983 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.
**Phase 9 Plan 1 status:** COMPLETE — FND-10/11/12 CSV exports + UX-06 anomaly deep-links + CLEAN-01/02 doc sweep. 983 SPA GREEN (910 baseline + 73 new), 0 RED, 11 todo. UAT signed off 2026-05-30.
**Phase 8 Plan 1 status:** COMPLETE — v5→v6 migration + stale-constants fix + 5 new family constants + medicareLevyFamily + medicareLevySurchargeFamily + isFamilyFiling. 884 SPA GREEN (848 + 36 new), 0 RED.
**Phase 8 Plan 2 status:** COMPLETE — computeIndividualReturn family branch + AssumptionsBlock dynamic prop + TaxReturnAssistant wiring + EntityForm 2 Individual-conditional fields. 910 SPA GREEN (884 + 26 new), 0 RED.
**Phase 8 Plan 3 status:** COMPLETE — 5-scenario manual UAT approved 2026-05-30; MED-01..04 signed off in REQUIREMENTS.md.
**Last session:** 2026-05-30T19:00:00.000Z
**Stopped at:** Completed 09-1 UAT sign-off — Phase 9 complete; v1.1 milestone fully implemented
**Overall progress:** v1.1: 3/3 phases COMPLETE (Phase 7 + Phase 8 + Phase 9 all done). v1.1 milestone fully implemented; next action: /gsd:audit-milestone v1.1 → /gsd:complete-milestone v1.1.

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v1.1:  [Phase 7] [Phase 8] [Phase 9]
       [ DONE  ] [ DONE  ] [ DONE  ]  <-- v1.1 MILESTONE FULLY IMPLEMENTED

v2.0:  preserved at .planning/future-milestones/v2.0-standalone-app/
```

---

## Phase Summary (v1.1)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 7 | ImportTB UX Rework | Header detection + tolerant currency parser + subtotal exclusion + split-column merging + rejected-rows review panel | COMPLETE (2026-05-30) |
| 8 | Family Medicare Levy Engine | v5→v6 additive schema (Entity gains `dependants` + `spouseIncome`) + real FY2025-26 family Medicare/MLS engine + EntityForm 2 conditional fields + Form I family assumption row + stale-constants correction | COMPLETE (2026-05-30) |
| 9 | Exports + Polish + Cleanup | FND-02 closure (TB/BAS/Form-I CSV) + anomaly fix-it deep-links + cosmetic + Nyquist frontmatter flip | COMPLETE (2026-05-30) |

---

## Performance Metrics

- Plans completed: 8 / Plans total: 8 (v1.1 complete)
- Phases complete: 3/3 (v1.1 phases) — Phase 7 + Phase 8 + Phase 9 all COMPLETE
- Requirements mapped: 15/15 v1.1 requirements — all phases 7–9 covered and signed off

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| 7 | 1 | ~20 min | 1 | 17 | 769 GREEN, 75 todo |
| 7 | 2 | ~16 min | 3 | 12 | 821 GREEN, 28 todo |
| 7 | 3 | ~45 min | 4 | 8 | 848 GREEN, 11 todo |
| 7 | 4 | ~10 min | 2/2 | 1 | 848 GREEN, 11 todo (UAT sign-off) |
| 8 | 1 | ~40 min | 3/3 | 11 | 884 GREEN, 11 todo, 0 RED |
| 8 | 2 | ~12 min | 3/3 | 8 | 910 GREEN, 11 todo, 0 RED |
| 8 | 3 | ~25 min | 3/3 | 4 | 910 GREEN, 11 todo, 0 RED (UAT sign-off) |
| 9 | 1 | ~3h | 4/4 | 22 | 983 GREEN, 11 todo, 0 RED (UAT signed off 2026-05-30) |

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

### Key Decisions Made (Phase 8 — Phase-Level Summary)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Two separate per-dependant increments (LOWER=$4,338 / UPPER=$5,422) for family Medicare levy shading | ATO intentionally widens shading band per dependant; single constant would compute wrong shade-in zone | Phase 8 Plan 1 |
| MLS per-dependant increment applies max(0, dependants-1) after-first rule to all 3 tier thresholds | After-first semantics: 1 child is already implicit in the $202k base; increment starts at 2nd child | Phase 8 Plan 1 |
| AssumptionsBlock widened additively with optional `assumptions?: string[]` prop; static ASSUMPTIONS kept | Backward compat preserved for all existing callers — 3 Phase 5 tests GREEN unchanged | Phase 8 Plan 2 |
| Family assumption row absorbs marital/medicare-exempt/dependants rows (replaces, not duplicates) | Single cohesive disclosure: user sees one family-context row, not 3 individual-context rows plus 1 family row | Phase 8 Plan 2 |
| 4 stale FY2024-25 constants corrected as bonus Wave 0 deliverable — Phase 5 latent bug closed | MEDICARE_LEVY_SINGLE_LOWER/UPPER + MLS_SINGLE/FAMILY_TIER_3 were FY2024-25 values; corrections bundled atomically with new family constants to avoid a partial-update commit | Phase 8 Plan 1 |

### Key Decisions Made (Phase 8 Plan 2)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| computeIndividualReturn uses isFamilyFiling(entity) gate before passing dependants+spouseIncome to medicareLevyFY2026 | Clean separation: eligibility predicate in _helpers.ts; orchestration in individual.ts; pure functions unchanged | Phase 8 Plan 2 |
| Family assumption row uses entity.spouseIncome (raw) for display; bad-data warn provides '$0 applied' context | Two-signal design: assumption row shows what user entered; warn anomaly explains what was applied | Phase 8 Plan 2 |
| AssumptionsBlock widened with optional prop; static ASSUMPTIONS export preserved | Backward compat preserved for all existing callers (3 Phase 5 tests GREEN unchanged) | Phase 8 Plan 2 |
| TaxReturnAssistant derives assumptionRows via useMemo(filter+map) on result.meta.anomalies | No new local state; memoised on result.meta.anomalies — consistent with existing inlineAnomaliesByLabel pattern | Phase 8 Plan 2 |
| EntityForm dependants uses Math.max(0, parseInt(v,10)||0) — note parseInt('-2')=-2, then max(0,-2)=0 | Negative clamping matches plan spec; blank string → parseInt('') = NaN → ||0 = 0 → but blank path handled separately (v==='' → undefined) | Phase 8 Plan 2 |

### Key Decisions Made (Phase 8 Plan 1)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| medicareLevySurchargeFamily uses max(0,dependants-1)×1500 | ATO "after first child" semantics — 1 child already implicit in $202k base threshold; increment starts at 2nd child | Phase 8 Plan 1 |
| medicareLevyFY2026 family branch fully rewritten in same plan as constants | Constants and functions must ship together to avoid a commit boundary with RED tests; stale-constant correction + real engine = single atomic update | Phase 8 Plan 1 |
| isFamilyFiling appended to existing _helpers.ts | Stateless predicate fits the existing helpers pattern; avoids a new file for a 5-line function | Phase 8 Plan 1 |
| Two distinct DEPENDANT_INCREMENT constants (LOWER=$4,338 / UPPER=$5,422) | ATO intentionally widens the shading band per dependant; single constant would compute wrong shade-in zone width | Phase 8 Plan 1 |
| runner.test.ts CURRENT_VERSION assertion auto-fixed in Task 2 | Pre-existing test stale assertion discovered on full suite run; corrected inline per Rule 1 | Phase 8 Plan 1 |

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
- v1.0 family Medicare levy threshold engine — SHIPPED Phase 8 (MED-01..04 complete 2026-05-30)
- v1.0 ImportTB "messy real-world TB" friction → planned for v1.1 Phase 7 (IMP-07..11)

---

## Open Blockers

None.

---

## Next Steps

1. v1.1 milestone is fully implemented (all 3 phases, 8 plans, 15 requirements COMPLETE).
2. Run `/gsd:audit-milestone v1.1` to verify all requirements and cross-check deliverables.
3. Run `/gsd:complete-milestone v1.1` to close the milestone and update ROADMAP.md.

### Key Decisions Made (Phase 9 Plan 1)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Papa.unparse object form `{fields:[...], data:[]}` for all 3 serialisers | Guarantees header row even when data is empty — `Papa.unparse([], opts)` returns empty string | Phase 9 Plan 1 |
| UTF-8 BOM (U+FEFF) prepended to all CSV blobs | Excel on Windows silently strips leading zeros and misinterprets encoding without BOM | Phase 9 Plan 1 |
| UX-06 scroll state lifted to App.tsx | Sidebar and ViewRouter are siblings under MainLayout; state must live in their common ancestor | Phase 9 Plan 1 |
| CSS-first @keyframes in index.css | Tailwind v4 has no tailwind.config.js; `safelist` approach unavailable | Phase 9 Plan 1 |
| CLEAN-01 documented as already-fixed-in-Phase-1 | Honest traceability — audit entry was stale; Phase 1 commit `4e8eb3c` already removed the dead string | Phase 9 Plan 1 |
