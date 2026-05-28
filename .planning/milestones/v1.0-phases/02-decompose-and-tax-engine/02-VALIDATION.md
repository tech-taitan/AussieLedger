---
phase: 2
slug: decompose-and-tax-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 + React Testing Library 16 + jsdom 26 (installed Phase 1) |
| **Config file** | `vitest.config.ts` (exists) |
| **Setup file** | `src/test/setup.ts` (exists; mocks `@google/genai`, polyfills `ResizeObserver`/`matchMedia`) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npm run test` |
| **Estimated runtime** | ~10–20 seconds (full suite grows to ~120 tests by end of Phase 2) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts src/components/__tests__/smoke.test.tsx` — fast structural lint + smoke combo (typically < 5 s)
- **After every plan wave:** Run `npm run test` (full suite)
- **Before `/gsd:verify-work`:** Full suite green + `npm run build` passes + `npm run lint` (`tsc --noEmit`) passes
- **Max feedback latency:** 20 s for the quick suite

---

## Per-Task Verification Map

> Plan task IDs (`{N}-{plan}-{task}`) populate after `gsd-planner` runs. The table below maps requirements → verification commands; the planner attaches each to the right task.

| Requirement | Behaviour to verify | Test type | Automated command | File status |
|---|---|---|---|---|
| FND-04 | `IS_AI_ENABLED` is `false` when key absent and when key equals `'MY_GEMINI_API_KEY'` placeholder | unit | `npx vitest run src/lib/__tests__/ai.test.ts` | ❌ Wave 0 |
| FND-04 | ImportTB renders without AI section when `IS_AI_ENABLED` is `false`; renders manual fuzzy-match flow | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | ❌ Wave 0 |
| FND-04 | Deterministic `fuzzyMatch(rows, accounts)` returns top-3 candidates with confidence scores; exact-code wins | unit | `npx vitest run src/lib/import/__tests__/match.test.ts` | ❌ Wave 0 |
| TAX-01 | `src/lib/tax/labels/fy2026.ts` exports `INDIVIDUAL_LABELS`, `COMPANY_LABELS`, `TRUST_LABELS`, `PARTNERSHIP_LABELS`, `BAS_LABELS`, plus rates/thresholds | unit | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts -t "fy2026 exports"` | ✅ extend Wave 0 |
| TAX-01 | No magic numbers in any tax component (structural scan) | structural | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts -t "no magic numbers"` | ✅ extend Wave 0 |
| TAX-03 | Every account in `src/constants.ts` CoA has `taxLabel` + `companyTaxLabel` + `trustTaxLabel` + `partnershipTaxLabel` populated for Revenue/Expense accounts | unit | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts -t "seed CoA fully mapped"` | ✅ extend Wave 0 |
| TAX-03 | Migration 1→2 populates `partnershipTaxLabel` on accounts known to the inference table | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts -t "partnership label inferred"` | ❌ Wave 0 |
| TAX-03 | Migration marks unmapped Revenue/Expense accounts as `_needsReview: true` | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts -t "needsReview flagged"` | ❌ Wave 0 |
| TAX-04 | AccountManager renders the new `partnershipTaxLabel` column; user can edit it | component | `npx vitest run src/components/__tests__/AccountManager.test.tsx` | ❌ Wave 0 |
| TAX-05 | `computeIndividual` returns `IndividualReturn` with all labels populated as `Decimal` | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts -t "individual shape"` | ✅ extend Wave 0 |
| TAX-05 | `computeCompany` returns typed `CompanyReturn` with `Decimal` values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts -t "company shape"` | ✅ extend Wave 0 |
| TAX-05 | `computeTrust` returns typed `TrustReturn` with `Decimal` values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts -t "trust shape"` | ✅ extend Wave 0 |
| TAX-05 | `computePartnership` returns typed `PartnershipReturn` with `Decimal` values | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts -t "partnership shape"` | ✅ extend Wave 0 |
| TAX-05 | `computeBas` returns typed `BasReturn` with `Decimal` values | unit | `npx vitest run src/lib/tax/__tests__/bas.test.ts -t "bas shape"` | ✅ extend Wave 0 |
| TAX-05 | No file in `src/lib/tax/**/*.ts` imports from `react`, `react-dom`, or any `*.tsx` | structural | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts -t "no react import"` | ✅ extend Wave 0 |
| TAX-05 | Each migrated tax component (TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, BasIasAssistant) calls its respective `compute*` and renders the result | component | `npx vitest run src/components/__tests__/smoke.test.tsx` (smoke must remain green) | ✅ existing |
| BOOK-08 | `Account['gstCode']` accepts `'INP'` and `'CAP'` (TypeScript) | type check | `npm run lint` (tsc --noEmit) | ✅ existing |
| BOOK-08 | Existing accounts retain pre-Phase-2 GST codes (no auto-upgrade) | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts -t "gst codes preserved"` | ❌ Wave 0 |
| BOOK-10 | `currentFy(date)` returns the correct `'FY{end-year}'` for dates spanning the FY boundary (30 Jun, 1 Jul, 31 Dec, 1 Jan) | unit | `npx vitest run src/lib/__tests__/period.test.ts -t "currentFy"` | ❌ Wave 0 |
| BOOK-10 | `quarterBoundaries(fy, q)` returns ATO-correct Jul–Sep / Oct–Dec / Jan–Mar / Apr–Jun ranges | unit | `npx vitest run src/lib/__tests__/period.test.ts -t "quarterBoundaries"` | ❌ Wave 0 |
| BOOK-10 | `isInPeriod(date, period)` includes start, includes end (inclusive boundaries) | unit | `npx vitest run src/lib/__tests__/period.test.ts -t "isInPeriod boundaries"` | ❌ Wave 0 |
| BOOK-10 | `today()` is mockable via `vi.spyOn(period, 'today')` | unit | `npx vitest run src/lib/__tests__/period.test.ts -t "today injectable"` | ❌ Wave 0 |
| BOOK-10 | No file outside `src/lib/period.ts` contains `new Date(` or `Date.now(` (excluding `*.test.ts`/`*.test.tsx`) | structural | `npx vitest run src/__tests__/structural.test.ts -t "no raw new Date"` | ✅ extend Wave 0 |
| (App≤250) | `src/App.tsx` is ≤ 250 non-blank lines | structural | `npx vitest run src/__tests__/structural.test.ts -t "App.tsx ≤ 250 lines"` | ✅ extend Wave 0 |
| (hooks) | `useAuditLog` persists logs to `ledger_audit_logs`; reloads on mount | unit | `npx vitest run src/hooks/__tests__/useAuditLog.test.ts` | ❌ Wave 0 |
| (hooks) | `useAccounts(addLog)` exposes `updateAccount` that calls `addLog` | unit | `npx vitest run src/hooks/__tests__/useAccounts.test.ts` | ❌ Wave 0 |
| (hooks) | `useJournals(addLog, activeEntityId)` exposes `addEntry`, persisted under `ledger_all_entries` | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts` | ❌ Wave 0 |
| (hooks) | `useEntities(addLog)` exposes create/update/archive/deactivate/delete; calls `addLog` for each | unit | `npx vitest run src/hooks/__tests__/useEntities.test.ts` | ❌ Wave 0 |
| (smoke) | All 12 existing component smoke tests remain green at every commit during the refactor | component | `npx vitest run src/components/__tests__/smoke.test.tsx` | ✅ existing |
| (migration) | Migration 1→2 round-trip preserves all existing fields; idempotent | unit | `npx vitest run src/lib/migrations/__tests__/v1-to-v2.test.ts -t "round-trip"` and `-t "idempotent"` | ❌ Wave 0 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

The following must exist before the implementation tasks' verification commands above can pass. The first plan in execution must be the Wave 0 plan that creates them.

### New test files (10)
- [ ] `src/lib/__tests__/ai.test.ts` — FND-04 (`IS_AI_ENABLED` logic with present/absent/placeholder key)
- [ ] `src/lib/__tests__/period.test.ts` — BOOK-10 (FY boundaries, quarter boundaries, leap-year edges, `today()` injection)
- [ ] `src/lib/import/__tests__/match.test.ts` — FND-04 (Levenshtein + exact-code; confidence ranking; top-3 contract)
- [ ] `src/lib/migrations/__tests__/v1-to-v2.test.ts` — TAX-03 (`partnershipTaxLabel` inference; `_needsReview` flagging; round-trip; idempotency; GST codes preserved)
- [ ] `src/hooks/__tests__/useAuditLog.test.ts` — hook persistence contract
- [ ] `src/hooks/__tests__/useAccounts.test.ts` — hook + `addLog` integration
- [ ] `src/hooks/__tests__/useJournals.test.ts` — hook + `addLog` + entity-scoped state
- [ ] `src/hooks/__tests__/useEntities.test.ts` — hook + `addLog` + bulk operations
- [ ] `src/components/__tests__/AccountManager.test.tsx` — TAX-04 (partnershipTaxLabel column render + edit)
- [ ] `src/components/__tests__/ImportTB.test.tsx` — FND-04 (AI gated render in both modes)

### Extensions to existing test files (4)
- [ ] `src/lib/tax/__tests__/structural-lint.test.ts` — add: no React imports in `src/lib/tax/**`; fy2026.ts has all expected exports; seed CoA fully mapped; no magic numbers in tax components
- [ ] `src/lib/tax/__tests__/golden.test.ts` — add Phase 2 structural shape tests for `IndividualReturn`/`CompanyReturn`/`TrustReturn`/`PartnershipReturn` (tests are NOT `.todo` once stubs exist)
- [ ] `src/lib/tax/__tests__/bas.test.ts` — add Phase 2 structural shape tests for `BasReturn`
- [ ] `src/__tests__/structural.test.ts` — add: App.tsx ≤ 250 non-blank lines; no raw `new Date(` outside `src/lib/period.ts`

### New source files (skeletons + first content)
- [ ] `src/lib/period.ts` — exports per CONTEXT.md
- [ ] `src/lib/ai.ts` — `IS_AI_ENABLED` constant
- [ ] `src/lib/import/match.ts` — `fuzzyMatch(rows, accounts) → MatchResult[]`
- [ ] `src/lib/tax/individual.ts` — `computeIndividual(input) → IndividualReturn` stub with relocated math (NOT zeros)
- [ ] `src/lib/tax/company.ts` — `computeCompany(input) → CompanyReturn` stub with relocated math
- [ ] `src/lib/tax/trust.ts` — `computeTrust(input) → TrustReturn` stub with relocated math
- [ ] `src/lib/tax/partnership.ts` — `computePartnership(input) → PartnershipReturn` stub (no existing component yet; stub returns shape with zeros)
- [ ] `src/lib/tax/bas.ts` — `computeBas(input) → BasReturn` stub with relocated math
- [ ] `src/lib/tax/labels/fy2026.ts` — full per-entity-type label sets, rates, thresholds, all NAT-referenced
- [ ] `src/lib/tax/types.ts` — shared types (`TaxInput`, `LabelResult`, `IndividualReturn`, etc.)
- [ ] `src/lib/migrations/v1-to-v2.ts` — migration body with name-inference table
- [ ] `src/hooks/useAuditLog.ts`, `useAccounts.ts`, `useJournals.ts`, `useEntities.ts` — hook implementations
- [ ] `src/components/shell/Sidebar.tsx`, `Header.tsx`, `BottomNav.tsx` — extracted shell components
- [ ] `src/components/MasterDashboard.tsx` — extracted from App.tsx (per RESEARCH.md open question 2)
- [ ] `src/components/EntityCard.tsx` — extracted from App.tsx (per RESEARCH.md open question 3)

### `src/types.ts` updates
- [ ] Widen `Account['gstCode']` from `'GST' | 'FRE' | 'N-T'` to `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'`
- [ ] Add `partnershipTaxLabel?: string` to `Account`
- [ ] Add `_needsReview?: boolean` to `Account` (transient-feeling but persisted at `_v: 2`)

### `src/constants.ts` updates
- [ ] All 16 default accounts have `taxLabel`/`companyTaxLabel`/`trustTaxLabel`/`partnershipTaxLabel` populated for Revenue/Expense rows (Asset/Liability/Equity may have `undefined` for these — they don't appear on tax returns)

### `src/lib/migrations/index.ts` update
- [ ] Register `1 → 2` migration; bump `CURRENT_VERSION` to `2`

---

## Manual-Only Verifications

| Behaviour | Requirement | Why manual | Test instructions |
|---|---|---|---|
| Visual regression: dashboard / sidebar / journal form / tax assistants render identically pre and post refactor | (smoke baseline) | DOM is identical but visual perception is the truth | `npm run dev`, click through every view; compare against pre-refactor screenshots if available |
| AI gating in the running app: with no `.env.local`, ImportTB shows manual-only flow | FND-04 | Confirms the build-time inject path | Delete `.env.local` (or rename), `npm run dev`, navigate to ImportTB, confirm no AI section visible |
| AI enabled mode: with `GEMINI_API_KEY` set, AI section visible and operates | FND-04 | Confirms the gate flips correctly | Set a test key in `.env.local`, restart dev server, confirm AI controls appear |
| "Review needed" banner appears for users who upgrade | TAX-03 | Migration UX confirmation | Open the app in a browser tab with `_v: 1` data already in localStorage; confirm post-load banner lists unmapped accounts |
| Add Entity → select Partnership type, verify `partnershipTaxLabel` column appears in Configure Accounts | TAX-04 | UI confirmation | `npm run dev`, Configure Accounts, scroll table, verify Partnership column |

---

## Validation Sign-Off

- [ ] All tasks have `<acceptance_criteria>` mapping to a command above OR a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verification command
- [ ] Wave 0 covers all MISSING references in the table above
- [ ] No watch-mode flags in any command (`vitest run`, not bare `vitest`)
- [ ] Feedback latency < 20 s for quick run
- [ ] `nyquist_compliant: true` set in frontmatter once planner attaches all task IDs

**Approval:** pending
