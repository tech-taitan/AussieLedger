---
phase: 6
slug: personas-wizard-and-deployment
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-29
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `06-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (SPA) + Vitest 2.1.9 (server) |
| **Config file** | `vitest.config.ts` (SPA) + `server/vitest.config.ts` (server) |
| **Quick run command** | `npx vitest run src/lib/migrations src/lib/__tests__/persona.test.ts src/hooks/__tests__/useAnomalyCounts.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~6s quick, ~15s full suite (526 GREEN + ~25 new = ~551 expected) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/migrations src/lib/__tests__/persona.test.ts src/hooks/__tests__/useAnomalyCounts.test.ts`
- **After every plan wave:** Run `npx vitest run` (full SPA suite)
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Requirement Verification Map

| Req ID | Behavior | Test Type | Automated Command | File | Status |
|--------|----------|-----------|-------------------|------|--------|
| UX-01 | v4→v5 migration additive; `wizardState` field defaults undefined; round-trip integrity | unit (migration) | `npx vitest run src/lib/migrations/__tests__/v4-to-v5.test.ts` | ❌ W0 | ⬜ pending |
| UX-01 | `finaliseEntity` produces correct `returnStatusByFy` state | unit (pure function) | `npx vitest run src/lib/__tests__/persona.test.ts` | ❌ W0 | ⬜ pending |
| UX-01 | Wizard completes full sequence; Finalise blocked until unmapped accounts resolved | integration (wizard state machine) | `npx vitest run src/components/__tests__/YearEndWizard.test.tsx` | ❌ W0 | ⬜ pending |
| UX-01 | Attestation requires checkbox + typed entity legal name (case-insensitive) | integration | `npx vitest run src/components/__tests__/YearEndWizard.test.tsx` | ❌ W0 | ⬜ pending |
| UX-01 | Post-finalise journal edits route through `reversePosted` workflow | integration | `npx vitest run src/components/__tests__/JournalForm.test.tsx` | extend | ⬜ pending |
| UX-02 | `useAnomalyCounts` returns correct journal count for unbalanced entry | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | ❌ W0 | ⬜ pending |
| UX-02 | `useAnomalyCounts` returns correct account count for unmapped account in posted entry | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | ❌ W0 | ⬜ pending |
| UX-02 | `useAnomalyCounts` returns count for missing GST codes on accounts referenced in posted entries | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | ❌ W0 | ⬜ pending |
| UX-02 | `useAnomalyCounts` returns count for accounts with missing tax-label mappings | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | ❌ W0 | ⬜ pending |
| UX-02 | `AnomalyBadge` renders inline on JournalForm when entry is unbalanced | integration | `npx vitest run src/components/__tests__/JournalForm.test.tsx` | extend | ⬜ pending |
| UX-02 | `AnomalyBadge` renders on TrialBalance row when account is unmapped | integration | `npx vitest run src/components/__tests__/TrialBalance.test.tsx` | extend | ⬜ pending |
| UX-02 | `AnomalyBadge` renders on CoaTreeView row when GST code missing | integration | `npx vitest run src/components/__tests__/CoaTreeView.test.tsx` | extend | ⬜ pending |
| UX-02 | Sidebar item count badge renders when anomaly count > 0 | integration | `npx vitest run src/components/__tests__/Sidebar.test.tsx` | ❌ W0 | ⬜ pending |
| UX-03 | All `INDIVIDUAL_LABELS_FULL` entries have `helpText` field present and non-empty | unit (catalogue integrity) | `npx vitest run src/lib/tax/__tests__/label-help-text.test.ts` | ❌ W0 | ⬜ pending |
| UX-03 | All `COMPANY_LABELS_FULL` / `TRUST_LABELS_FULL` / `PARTNERSHIP_LABELS_FULL` / `BAS_LABELS` / `IAS_LABELS` entries have `helpText` | unit (catalogue integrity) | `npx vitest run src/lib/tax/__tests__/label-help-text.test.ts` | ❌ W0 | ⬜ pending |
| UX-03 | No `helpText` string contains "deductible", "deductibility", or "write off" (case-insensitive) | unit (content lint) | `npx vitest run src/lib/tax/__tests__/label-help-text.test.ts` | ❌ W0 | ⬜ pending |
| UX-03 | `LabelTooltip` renders "?" button on screen + `.print-only` span in DOM | unit (component) | `npx vitest run src/components/__tests__/LabelTooltip.test.tsx` | ❌ W0 | ⬜ pending |
| UX-03 | All 5 tax-return form renderers use `LabelTooltip` for at least one label | structural | `npx vitest run src/__tests__/structural.test.ts` | extend | ⬜ pending |
| UX-04 | `JournalForm` debit/credit columns stack (flex-col) below `sm` breakpoint | structural (CSS class presence) | `npx vitest run src/components/__tests__/JournalForm.test.tsx` | extend | ⬜ pending |
| UX-04 | `TrialBalance` table wrapper has `overflow-x-auto` class | structural | `npx vitest run src/components/__tests__/TrialBalance.test.tsx` | extend | ⬜ pending |
| UX-04 | Return preview renders at 375px without horizontal scroll on body | manual-verify | UAT step 12 | manual-only | ⬜ pending |
| UX-05 | `useSettings` returns null on first run (no localStorage key) | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | ❌ W0 | ⬜ pending |
| UX-05 | `saveSettings` + `getSettings` round-trip preserves `mode` and `primaryEntityId` | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | ❌ W0 | ⬜ pending |
| UX-05 | `PersonaModeModal` triggers on first load when `Settings.mode` is undefined | integration | `npx vitest run src/components/__tests__/PersonaModeModal.test.tsx` | ❌ W0 | ⬜ pending |
| PERS-01 | `ViewRouter` redirects to entity dashboard when `mode=owner` + one entity | integration + manual-verify | `npx vitest run src/components/__tests__/ViewRouter.test.tsx` + UAT | extend + manual | ⬜ pending |
| PERS-01 | Owner-mode Sidebar omits entity switcher and bulk-ops items | structural | `npx vitest run src/components/__tests__/Sidebar.test.tsx` | ❌ W0 | ⬜ pending |
| PERS-02 | `ViewRouter` shows `MasterDashboard` with entity status badges in agent mode | integration | `npx vitest run src/components/__tests__/ViewRouter.test.tsx` + `__tests__/MasterDashboard.test.tsx` | extend | ⬜ pending |
| PERS-02 | Agent-mode landing shows recent-clients quick-switch | integration | `npx vitest run src/components/__tests__/MasterDashboard.test.tsx` | extend | ⬜ pending |
| PERS-03 | Mode switch (owner↔agent) does NOT mutate `entities[]`, `accounts[]`, or `entries[]` | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | ❌ W0 | ⬜ pending |
| DEP-01 | `npm run build` exits 0 (existing CI) | structural | `npm run build` | existing | ⬜ pending |
| DEP-01 | AI affordance note visible in DOM when `isAiEnabled()=false` (ImportTB) | unit | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | extend | ⬜ pending |
| DEP-03 | README contains `npm install && npm run build` quick-start | structural (file content) | `npx vitest run src/__tests__/readme.test.ts` | ❌ W0 | ⬜ pending |
| DEP-03 | README contains sections for both deployment shapes (single-user local + small-firm VPS) | structural | `npx vitest run src/__tests__/readme.test.ts` | ❌ W0 | ⬜ pending |
| DEP-04 | `LICENSE` file exists at repo root and contains "Apache License" + "Version 2.0" | structural (file existence) | `npx vitest run src/__tests__/license.test.ts` | ❌ W0 | ⬜ pending |
| DEP-04 | `CONTRIBUTING.md` exists and contains "schema" + "migration" + "round-trip" + "additive" | structural (file content) | `npx vitest run src/__tests__/contributing.test.ts` | ❌ W0 | ⬜ pending |
| DEP-04 | `package.json` `"license"` field is `"Apache-2.0"` | structural | `npx vitest run src/__tests__/license.test.ts` | ❌ W0 | ⬜ pending |
| DEP-04 | All source files have `SPDX-License-Identifier: Apache-2.0` header | structural (file lint) | `npx vitest run src/__tests__/spdx-headers.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/migrations/__tests__/v4-to-v5.test.ts` — covers UX-01 migration + round-trip
- [ ] `src/lib/__tests__/persona.test.ts` — covers UX-05, PERS-03, finaliseEntity, advanceStep pure functions
- [ ] `src/hooks/__tests__/useAnomalyCounts.test.ts` — covers UX-02 anomaly counting
- [ ] `src/lib/tax/__tests__/label-help-text.test.ts` — covers UX-03 helpText presence + no-deductibility lint
- [ ] `src/components/__tests__/LabelTooltip.test.tsx` — covers UX-03 tooltip render
- [ ] `src/components/__tests__/YearEndWizard.test.tsx` — covers UX-01 wizard sequence + finalise gate
- [ ] `src/components/__tests__/PersonaModeModal.test.tsx` — covers UX-05 first-run modal
- [ ] `src/components/__tests__/Sidebar.test.tsx` — covers PERS-01 (owner-mode omits items) + UX-02 (anomaly count badges)
- [ ] `src/__tests__/readme.test.ts` — covers DEP-03
- [ ] `src/__tests__/license.test.ts` — covers DEP-04 LICENSE file + package.json license field
- [ ] `src/__tests__/contributing.test.ts` — covers DEP-04 CONTRIBUTING.md content
- [ ] `src/__tests__/spdx-headers.test.ts` — covers DEP-04 per-file SPDX headers
- [ ] Framework install: none needed — Vitest already configured

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner-mode landing is the primary entity dashboard with year-end CTA "one click away" | PERS-01 | Visual verification of click-distance + dashboard density | UAT: in owner mode with one entity, observe landing → confirm CTA visible without scroll |
| Agent-mode landing shows multi-client list with fast switching | PERS-02 | Visual verification of list layout + per-client badge accuracy | UAT: create 3 entities, switch to agent mode, confirm all 3 visible with FY26 status badges |
| Mode switch via Settings preserves all data | PERS-03 / UX-05 | Round-trip data integrity check | UAT: enter data → switch mode → switch back → confirm all entries/accounts/audit logs intact |
| Return preview renders at 375px without horizontal scroll | UX-04 | Real-device or DevTools mobile emulation check | UAT: open Form I / Form C / Form T / Form P / BAS at 375px width, confirm no horizontal scroll on body |
| Mobile JournalForm allows posting a balanced journal entry at 375px | UX-04 | End-to-end interaction test on mobile | UAT: at 375px, post a 2-line balanced journal entry, confirm save succeeds |
| Year-end wizard full sequence end-to-end on real fixture | UX-01 | Workflow correctness across all 7 steps | UAT: run wizard from step 1 to finalise on a fully-mapped entity; attempt finalise with unmapped account → verify blocked |
| Unfinalise round-trip with audit log capture | UX-01 | Audit trail completeness | UAT: finalise → unfinalise → finalise again; check audit log shows all 3 events |
| New-user clone-and-run produces a working instance with no paid services | DEP-01 | Fresh-environment install test | UAT: in a clean clone, `npm install && npm run build && npm run dev`; confirm app loads + can post a journal entry + AI affordance shows "optional Gemini API key" inline |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (12 new test files identified above)
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
