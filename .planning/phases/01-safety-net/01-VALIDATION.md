---
phase: 1
slug: safety-net
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Derived from `01-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest ^2.x with `@testing-library/react@^16` and `jsdom` environment |
| **Config file** | `vitest.config.ts` (new — Wave 0 gap) |
| **Setup file** | `src/test/setup.ts` (new — Wave 0 gap) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text` |
| **Estimated runtime** | ~10–15 seconds (Phase 1 test count is small; smoke tests dominate) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run the full suite with coverage
- **Before `/gsd:verify-work`:** Full suite green + `npm run build` passes + `npm run lint` (`tsc --noEmit`) passes
- **Max feedback latency:** 15 seconds for the quick suite

---

## Per-Task Verification Map

> Plan task IDs (`{N}-{plan}-{task}`) populate after `gsd-planner` runs. Listed here are the verification commands keyed by requirement; planner must attach each to the corresponding task.

| Requirement | Behaviour to verify | Test type | Automated command | Wave 0 file |
|---|---|---|---|---|
| FND-05 | "ATO Connected (Simulated)" string absent from rendered App | unit (RTL) | `npx vitest run src/__tests__/App.test.tsx -t "no ATO Connected"` | ✅ created in W0 |
| FND-05 | "Pearson Specter Litt" / "US Big Law Firm" demo seeds removed | unit | `npx vitest run src/__tests__/App.test.tsx -t "no foreign demo seed"` | ✅ created in W0 |
| FND-05 | Hard-coded `+12% / -5% vs last month` trend strings replaced with em-dash placeholder | unit (RTL) | `npx vitest run src/__tests__/App.test.tsx -t "trend placeholder"` | ✅ created in W0 |
| FND-05 | SlideGenerator deleted; no imports / route / nav entries reference it | code audit | `npx vitest run src/__tests__/structural.test.ts -t "no slide-generator"` + `tsc --noEmit` | ✅ created in W0 |
| FND-06 | `<DisclaimerFooter>` renders the locked exact-text disclaimer | unit (RTL) | `npx vitest run src/components/__tests__/DisclaimerFooter.test.tsx` | ✅ created in W0 |
| FND-06 | Disclaimer footer mounts on every view in `App.tsx` (smoke through view union) | unit (RTL) | `npx vitest run src/__tests__/App.test.tsx -t "footer present on every view"` | ✅ created in W0 |
| FND-06 | `<PdfGate>` blocks `onConfirmed` callback until checkbox ticked | unit (RTL) | `npx vitest run src/components/__tests__/PdfGate.test.tsx` | ✅ created in W0 |
| FND-07 | Vitest installed; `npm run test` passes | unit | `npm run test` | ✅ created in W0 |
| FND-07 | Per-entity-type golden output tests for `lib/tax/*` (placeholders that fail loudly until Phase 5; structure must exist) | unit | `npx vitest run src/lib/tax/__tests__/golden.test.ts` | ✅ created in W0 |
| FND-07 | BAS per-label golden tests against the fixture journal set | unit | `npx vitest run src/lib/tax/__tests__/bas.test.ts` | ✅ created in W0 |
| FND-07 | Smoke tests on every existing major component (App, JournalForm, TrialBalance, BasIasAssistant, TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, EntityForm, AccountManager, AuditTrail, ImportTB, FinancialTrendChart) | unit (RTL smoke) | `npx vitest run src/components/__tests__/smoke.test.tsx` | ✅ created in W0 |
| FND-08 | `src/lib/money.ts` wrapper: `add`, `sub`, `mul`, `div`, `gst` return correct values; banker's rounding to 2 dp | unit | `npx vitest run src/lib/__tests__/money.test.ts` | ✅ created in W0 |
| FND-08 | Structural lint test fails CI on raw `* /` or `/ \d` patterns inside `src/lib/tax/**` | structural | `npx vitest run src/lib/tax/__tests__/structural-lint.test.ts` | ✅ created in W0 |
| FND-09 | Every persisted type in `src/types.ts` carries `_v: number` | code audit | `npx vitest run src/__tests__/types-schema-version.test.ts` | ✅ created in W0 |
| FND-09 | Migration runner: missing `_v` is treated as v0 and upgraded to v1 (no-op identity in Phase 1) | unit | `npx vitest run src/lib/migrations/__tests__/runner.test.ts` | ✅ created in W0 |
| FND-09 | Migration runner: throws on unknown future version; non-dismissable error UI mounts | unit (RTL) | `npx vitest run src/lib/migrations/__tests__/runner.test.ts` + `src/components/__tests__/MigrationError.test.tsx` | ✅ created in W0 |
| ENT-02 | `validateAbn('51 824 753 556')` returns `{ valid: true }` (official ATO test vector) | unit | `npx vitest run src/lib/__tests__/validation.test.ts -t "valid ABN"` | ✅ created in W0 |
| ENT-02 | `validateAbn('11 111 111 111')` returns `{ valid: false }` (placeholder demo seed) | unit | `npx vitest run src/lib/__tests__/validation.test.ts -t "invalid ABN"` | ✅ created in W0 |
| ENT-02 | EntityForm: invalid ABN shows inline warning text but submit still succeeds (warn-but-allow) | unit (RTL) | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "ABN warning"` | ✅ created in W0 |
| ENT-02 | EntityForm: no TFN field rendered; no "TFN" string appears in `EntityForm.tsx` source | unit (RTL) + grep | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "no TFN field"` | ✅ created in W0 |
| DEP-05 | `.github/workflows/ci.yml` exists with build + lint + test jobs | code audit | `node -e "require('fs').statSync('.github/workflows/ci.yml')"` | ✅ created in W0 |
| DEP-05 | CI workflow triggers on `push` to main and `pull_request` to main | code audit | `npx vitest run src/__tests__/ci-config.test.ts` | ✅ created in W0 |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

The following files / installs **must exist before any verification command above will pass**. The first plan in execution must be the Wave 0 plan that creates them.

- [ ] `package.json` — devDependencies added: `vitest@^2`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `@testing-library/user-event@^14`, `jsdom@^26` (avoid 27 until tailwind v4 issue closed), `@vitest/coverage-v8`. Runtime dependency: `decimal.js@^10`.
- [ ] `vitest.config.ts` — root config with `environment: 'jsdom'`, `css: false`, `setupFiles: ['./src/test/setup.ts']`. Must NOT include the `tailwindcss()` Vite plugin.
- [ ] `src/test/setup.ts` — `import '@testing-library/jest-dom/vitest'`, `afterEach(cleanup)`, `global.ResizeObserver` polyfill, `global.matchMedia` polyfill, `vi.mock('@google/genai', () => ({ GoogleGenAI: class {}, Type: {} }))`.
- [ ] `src/test/fixtures/accounts.ts` — minimum `Account[]` fixture covering Asset / Revenue / Expense for smoke tests.
- [ ] `src/test/fixtures/entities.ts` — minimum `Entity[]` fixture (one Pty Ltd, one Trust) for smoke tests.
- [ ] `src/test/fixtures/journals.ts` — small balanced journal set used by tax-engine golden tests.
- [ ] `src/lib/money.ts` — decimal.js wrapper with locked API (`add`, `sub`, `mul`, `div`, `gst`, `round`).
- [ ] `src/lib/validation.ts` — `validateAbn(input: string): { valid: boolean; reason?: string }` with the ABN modulus-89 algorithm.
- [ ] `src/lib/migrations/index.ts` — `migrate(state: unknown): KnownState` runner contract; identity migration registered for `0 → 1`.
- [ ] `src/lib/tax/` — directory with `.gitkeep` so the structural lint test runs vacuously without dropping files.
- [ ] `src/components/DisclaimerFooter.tsx` — locked exact-text disclaimer footer.
- [ ] `src/components/PdfGate.tsx` — tick-to-confirm gate component contract.
- [ ] `src/components/MigrationError.tsx` — full-viewport non-dismissable migration-error UI.
- [ ] `npm run test` script in `package.json` mapped to `vitest run`.
- [ ] `.github/workflows/ci.yml` — Node 20, `actions/checkout@v4`, `actions/setup-node@v4` with `cache: 'npm'`, jobs `npm ci → npm run build → npm run lint → npm run test`. Coverage printed; no failing threshold.

---

## Manual-Only Verifications

| Behaviour | Requirement | Why manual | Test instructions |
|---|---|---|---|
| Visually confirm "ATO Connected" indicator removed from sidebar in browser | FND-05 | Cross-checks the smoke-test assertion against the live rendered DOM | `npm run dev`, open `http://localhost:3000`, sidebar must show no green-dot status indicator |
| Visually confirm `'—'` em-dash appears in StatCard "Trend" slot | FND-05 | DOM character vs visual character may differ in browser fonts | `npm run dev`, open the entity dashboard, confirm em-dash displays |
| Disclaimer footer visible on every view at the bottom of the viewport | FND-06 | Multi-view visual check; confirms persistent footer placement | `npm run dev`, click through every sidebar entry, confirm footer present |
| GitHub Actions workflow triggers correctly on push to a real PR | DEP-05 | Requires actual GitHub event; CI cannot self-test | Push a trivial change in a feature branch; open PR; confirm CI workflow runs and passes |
| Slide generator surface unreachable | FND-05 cleanup | Confirms route + nav removal is complete | `npm run dev`, attempt to navigate to slide-generator (no nav button should exist; manual URL change should not render) |

---

## Validation Sign-Off

- [ ] All tasks have `<acceptance_criteria>` mapping to a command above OR a Wave 0 dependency
- [ ] Sampling continuity: no 3 consecutive tasks without an automated verification command
- [ ] Wave 0 covers all MISSING references in the table above
- [ ] No watch-mode flags in any command (use `vitest run`, not bare `vitest`)
- [ ] Feedback latency < 15 s for quick run
- [ ] `nyquist_compliant: true` set in frontmatter once planner attaches all task IDs

**Approval:** pending
