---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: standalone-app-and-local-data-sovereignty
current_phase: 7
current_plan: null
status: ready-to-plan
stopped_at: v2.0 roadmap created — ready to plan Phase 7
last_updated: "2026-05-29T12:00:00.000Z"
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-05-29 (v2.0 roadmap created)

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-29 with v1.0 evolution).

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**Current focus:** v2.0 — Standalone Tauri desktop app + single-file SQLite-per-instance backing + hard network sandbox. Roadmap locked 2026-05-29; ready to plan Phase 7.

---

## Current Position

**Current phase:** Phase 7 — Tauri Scaffolding + Smoke (READY TO PLAN)
**Current plan:** None — run `/gsd:plan-phase 7` to create the first v2.0 plan
**Phase 7 status:** Not started.
**Last session:** 2026-05-29T12:00:00Z
**Stopped at:** v2.0 roadmap written — 6 phases (7-12), 28 requirements mapped, all coverage validated. Next: `/gsd:plan-phase 7`
**Overall progress:** v2.0: 0/6 phases complete.

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v2.0:  [Phase 7] [Phase 8] [Phase 9] [Phase 10] [Phase 11] [Phase 12]
       [ NEXT  ] [      ] [      ] [       ] [        ] [        ]
```

---

## Phase Summary (v2.0)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 7 | Tauri Scaffolding + Smoke | `tauri dev` opens SPA in native window; envPrefix/CSP/capability/updater-key hard-blocks locked | NOT STARTED |
| 8 | FileBackedAdapter | Custom Rust commands (rusqlite), TEXT-affinity lint + parity round-trip test before implementation code | NOT STARTED |
| 9 | Boot Sequence + File Menu UX | FileOpenSplash, File menu (New/Open/Save As/Close), Recent Files MRU, single-instance, path disclosure | NOT STARTED |
| 10 | Migration + v1.0 Import + File Watcher | v5→v6 additive DDL, JSON import chain, "Import v1.0 data" flow, external-edit watcher | NOT STARTED |
| 11 | Network Sandbox + AI Removal | Capability allowlist + CSP `connect-src 'none'`, AI deletion, "Local Only" badge, integration test against built binary | NOT STARTED |
| 12 | CI Cross-Platform + CSV Cleanup + Cosmetic Sweep | GitHub Actions matrix, code signing, FND-02 CSV exports closed, cosmetic cleanup | NOT STARTED |

---

## Performance Metrics

- Plans completed: 0 / Plans total: TBD (phases 7-12 not yet planned)
- Phases complete: 0/6 (v2.0 phases)
- Requirements mapped: 28/28 v2.0 requirements — all phases 7-12 covered

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| (v2.0 plans not yet created) | | | | | |

---

## Accumulated Context

### Architecture Invariants (Locked — Must Not Be Violated)

| Invariant | Source | Phase |
|-----------|--------|-------|
| `StorageAdapter` interface FINAL — 12 methods, additive implementations only, never widen | Phase 3 FINAL | All v2.0 |
| Settings via `localStorage` under `aussieledger:settings` — not an adapter method | Phase 6 PERS-03 | All v2.0 |
| Custom Rust commands via `rusqlite` (NOT `tauri-plugin-sql`) for FileBackedAdapter | SUMMARY.md architecture decision | Phase 8 |
| Network sandbox = TWO independent layers (capability allowlist + CSP `connect-src 'none'`) — both mandatory | SUMMARY.md + PITFALLS.md | Phase 7 + 11 |
| v5→v6 migration is additive only — JSON migration chain and SQL DDL chain strictly separate | SUMMARY.md + MIG-03 | Phase 10 |
| AI is REMOVED (not gated) from v2.0 Tauri build — SAND-04 is a deletion | REQUIREMENTS.md SAND-04 | Phase 11 |
| No `new Date()` outside `src/lib/period.ts` — Phase 2 structural lint preserved | Phase 2 invariant | All v2.0 |
| All money columns TEXT-affinity in rusqlite DDL — enforced by QUAL-02 lint before any FileBackedAdapter code | PITFALLS.md Pitfall 1 | Phase 8 |
| `envPrefix: ['VITE_']` only in vite.config.ts — CVE-2023-46115; enforced by QUAL-03 CI check | PITFALLS.md Pitfall 8 | Phase 7 |
| QUAL-04 integration test runs against an actual built Tauri binary, not unit tests against React layer | REQUIREMENTS.md QUAL-04 | Phase 11 |

### Key Decisions Made (v2.0 Roadmap)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Phase numbering continues from v1.0 (7-12) | Single continuous sequence across milestones; avoids confusion with v1.0 phase references | Roadmap |
| 6 phases (standard granularity, config.json = "standard") | 28 requirements cluster naturally into 6 coherent delivery boundaries; standard granularity target is 5-8 phases | Roadmap |
| Phase 7 locks ALL Wave-0 hard-block pitfall preventions | envPrefix check, CSP, capability allowlist, updater key pair — all must be in place before any implementation; cannot be retrofitted | Roadmap |
| Phase 8 lands TEXT-affinity lint (QUAL-02) + parity test (QUAL-01) BEFORE FileBackedAdapter implementation | If lint lands after implementation, money-column regressions are already baked in; test-first prevents silent decimal corruption | Roadmap |
| Phase 10 depends on Phase 8 (not Phase 9) strictly; Phase 9 recommended but not hard-blocked | Migration logic only requires FileBackedAdapter to exist; file picker (Phase 9) is helpful for manual testing but the import can be invoked programmatically in tests | Roadmap |
| Phase 11 QUAL-04 integration test must run against an actual Tauri binary | CSP and capabilities are not tested by Vitest/jsdom; only the built binary exercises both sandbox layers simultaneously; test-against-binary is a hard requirement | Roadmap |
| Phase 12 absorbs FND-02 (CSV exports) alongside CI + cosmetic cleanup | Natural fit: file-export work is already done in earlier phases; CSV exports are a small surface that benefits from the Tauri file-dialog infrastructure; keeps phase count at 6 | Roadmap |
| SAND-04 is an AI deletion, not a feature flag | v2.0 narrative is "no network calls"; a feature flag implies the code path exists; deletion is the correct architectural expression of the sandbox promise | Roadmap |

### Research Flags for Downstream Planners

- **Phase 7 (plan-phase 7):** Verify `tauri dev` CSP config immediately after first `tauri init`; test `window.print()` on dev machine before any other work. PITFALLS.md Pitfall 5 (CSP collision) and Pitfall 9 (window.print()) must be smoke-tested at Phase 7 close.
- **Phase 8 (plan-phase 8):** TEXT-affinity lint (QUAL-02) must be a task that precedes all FileBackedAdapter DDL writing. Parity round-trip test (QUAL-01) must pass before the phase closes. Reference ARCHITECTURE.md Q1 for exact Rust command list (17 commands).
- **Phase 9 (plan-phase 9):** Boot sequence from ARCHITECTURE.md Q3 (`resolveFilePath()` 8-step sequence) is the implementation spec. `tauri-plugin-single-instance` (Rust-only) handles PKG-02. `VACUUM INTO` fallback for FILE-05. Default path via `BaseDirectory.Document` for FILE-04.
- **Phase 10 (plan-phase 10):** Pitfall 3 (double-apply prevention) and Pitfall 10 (decimal string shape mismatch on import) must both be acceptance criteria. File watcher via `@tauri-apps/plugin-fs` `watch()` with `features = ["watch"]` in Cargo.toml; watch main file only, not `-wal`/`-shm`.
- **Phase 11 (plan-phase 11):** QUAL-04 integration test requires a built binary — plan must include a `tauri build` step before the test can run. Reference SUMMARY.md "Network sandbox = TWO layers" section for exact CSP + capabilities config.
- **Phase 12 (plan-phase 12):** Tauri-action matrix from STACK.md (4 matrix entries: macos-latest arm64, macos-13 x64, ubuntu-22.04, windows-latest). `cache-on-failure: false` on Swatinem/rust-cache. macOS disk pre-check. PKG-04 SignPath Foundation application is a background task that can start at Phase 7. CSV column conventions for CSV-01/02/03 to be decided during plan-phase 12 discussion.

### Known Risks (v2.0)

| Risk | Mitigation | Phase |
|------|------------|-------|
| Money TEXT-affinity coercion (Pitfall 1) | QUAL-02 CI lint + QUAL-01 parity test land before FileBackedAdapter DDL | 8 |
| CVE-2023-46115 envPrefix key leak (Pitfall 8) | QUAL-03 CI check at scaffold time; `envPrefix: ['VITE_']` only | 7 |
| WAL + cloud sync corruption (Pitfall 4) | FILE-05 VACUUM INTO; FILE-08 OneDrive/iCloud/Dropbox warning; FILE-06 external-edit prompt | 9, 10 |
| Network sandbox single-layer gap (Pitfall 6) | Both layers (capability + CSP) mandatory; QUAL-04 integration test proves both layers | 7, 11 |
| Migration double-apply (Pitfall 3) | MIG-03 strict separation; explicit test for no duplicate rows post-import | 10 |
| QUAL-04 test needs built binary | Plan must include `tauri build` step; not runnable in Vitest/jsdom | 11 |
| macOS code signing ($99/yr Apple cert) | PKG-04 ships unsigned with documented Gatekeeper override for v2.0; v2.1 revisits | 12 |
| Rust cache poisoning in CI (Pitfall 14) | `cache-on-failure: false`; weekly scheduled cache-busted run | 12 |
| macOS runner disk exhaustion (Pitfall 15) | Pre-build `df -h` check; separate arm64/x64 matrix jobs | 12 |
| `window.print()` regression in Tauri webview (Pitfall 9) | Smoke-tested at Phase 7; UAT step at Phase 11/12 on all 3 OS targets | 7, 12 |

### Open Questions (to resolve during plan-phase discussion)

| Question | Impact | When to Resolve |
|----------|--------|-----------------|
| macOS code-signing strategy — accept unsigned v2.0 OR pursue GitHub Sponsors for $99/yr Apple cert? | PKG-04 scope | Before Phase 12 planning |
| AI consent granularity — SAND-04 removes AI entirely from Tauri build; future v2.1 opt-in granularity TBD | SAND-04 scope confirmation | Before Phase 11 planning |
| v5→v6 schema specifics — any new domain fields beyond file_meta? `lastSavedAs` hint? Encrypted-file marker for v2.1? | MIG-01 scope | Before Phase 10 planning |
| CSV column conventions for CSV-01/02/03 — TB CSV (code/name/debit/credit/balance/period), BAS labels (label/english/value), Form I labels (label/english/value/sources) | CSV-01..03 exact output shape | Before Phase 12 planning |
| v1.0 SPA continuity — ship both Tauri + web builds in v2.0? ARCHITECTURE.md Q8 recommends yes | Phase 12 artifact scope | Before Phase 12 planning |
| Windows SignPath Foundation application timing — apply at Phase 7 as background task? Approval takes weeks | PKG-04 timeline | Before or during Phase 7 |

---

## Session Continuity

**To resume work:** Read this file, then read `.planning/ROADMAP.md` for phase goals and success criteria. Run `/gsd:plan-phase 7` to create the first v2.0 plan.

**Files that define the project:**
- `.planning/PROJECT.md` — scope, constraints, key decisions (updated post-v1.0)
- `.planning/REQUIREMENTS.md` — 28 v2.0 requirements with traceability (phases 7-12)
- `.planning/ROADMAP.md` — phases 7-12 with goals and success criteria
- `.planning/STATE.md` — this file (project memory)

**v2.0 research context:**
- `.planning/research/SUMMARY.md` — synthesis: recommended stack, architecture decisions, suggested phase order, open questions
- `.planning/research/STACK.md` — pinned Tauri 2.11.2 + rusqlite + plugin versions
- `.planning/research/ARCHITECTURE.md` — FileBackedAdapter design, three-adapter coexistence, boot sequence (Q1-Q9)
- `.planning/research/FEATURES.md` — TABLE STAKES / DIFFERENTIATORS / ANTI-FEATURES
- `.planning/research/PITFALLS.md` — 20 pitfalls with phase assignment hints and acceptance criteria

---

*State updated: 2026-05-29 — v2.0 roadmap created (phases 7-12, 28 requirements mapped)*
