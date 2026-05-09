# Testing

**Analysis Date:** 2026-05-09

## Headline Finding

**The codebase has zero test infrastructure.** This is the single most important fact for planning purposes.

- No test runner installed (no Jest, no Vitest, no Mocha, no Playwright, no Cypress)
- No test files (`*.test.ts`, `*.spec.ts`, `__tests__/`, `tests/` — none exist)
- No test scripts in `package.json` (only `dev`, `build`, `preview`, `clean`, `lint`)
- The `lint` script is `tsc --noEmit` — type checking only, not testing
- No CI workflow files (`.github/workflows/`, `.gitlab-ci.yml`, etc.)
- No coverage tooling (`c8`, `nyc`, `istanbul`)
- No mocking libraries (`msw`, `nock`, `sinon`)

## What Currently Verifies Correctness

| Mechanism | What it catches | What it doesn't catch |
|---|---|---|
| TypeScript strict mode (`tsconfig.json`) | Type errors at compile time | Runtime logic bugs, calculation errors |
| `npm run lint` (`tsc --noEmit`) | Same as above | Same as above |
| Manual testing in Vite dev server | Whatever the developer thinks to try | Regressions, edge cases |

There is **no automated check** that catches bugs in:
- GST calculation correctness
- Journal entry balance enforcement (debits = credits)
- Trial balance arithmetic
- Tax label aggregation across entries
- localStorage round-trip integrity (saving and reloading state)
- CSV import parsing edge cases (`src/components/ImportTB.tsx`)
- Entity validation in `src/components/EntityForm.tsx`

## High-Risk Surfaces (Most Test-Worthy)

If/when a test framework is introduced, these are the highest-leverage areas to cover first:

1. **Journal entry balance validation** — `src/components/JournalForm.tsx` (458 lines)
   - Debits and credits must sum to equal totals
   - Empty/zero amounts must be rejected
   - Multi-line entries must aggregate correctly

2. **GST calculation** — currently inline in components, hard-coded `/11` divisor
   - Cap GST at correct rounding behavior
   - Handle GST-free, input-taxed, and export classifications
   - BAS aggregation in `src/components/BasIasAssistant.tsx`

3. **Trial balance computation** — `src/components/TrialBalance.tsx`
   - Aggregation of all entity journal lines per account
   - Debit/credit nature inference from `src/constants.ts` chart of accounts
   - Period filtering

4. **CSV import** — `src/components/ImportTB.tsx` (589 lines)
   - Malformed rows
   - Inconsistent date formats
   - Encoding issues
   - Account code matching against existing chart

5. **Entity CRUD** — `src/components/EntityForm.tsx` (312 lines)
   - Sole trader / company / trust / partnership type-specific fields
   - ABN / TFN format validation (currently absent)
   - localStorage persistence on save

6. **App-level state persistence** — `src/App.tsx` (1,126 lines)
   - localStorage save/load symmetry
   - State migration when shape changes (currently no versioning)
   - Active entity selection across reloads

## Recommended Approach (For Future Planning)

The stack (React 19 + Vite + TypeScript) maps cleanly to **Vitest + React Testing Library**:

- Vitest shares Vite's config — no separate build pipeline
- React Testing Library aligns with the user-centric component style
- For browser/E2E: Playwright is the modern default; Cypress is a viable alternative
- For tax math: pure unit tests on extracted helper functions (currently logic is inline in components — extracting it would be a prerequisite)

**Suggested package additions:**
```json
"devDependencies": {
  "vitest": "^2.0.0",
  "@testing-library/react": "^16.0.0",
  "@testing-library/jest-dom": "^6.0.0",
  "@testing-library/user-event": "^14.0.0",
  "jsdom": "^25.0.0"
}
```

**Suggested scripts:**
```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run",
  "test:coverage": "vitest run --coverage"
}
```

## Implications for Planning

- **No regression safety net.** Every change is implicitly a refactor with no automated check that prior behavior is preserved.
- **Refactor risk is high.** The 1,126-line `App.tsx` and 589-line `ImportTB.tsx` cannot be safely decomposed without first establishing characterization tests.
- **Tax math correctness is unverified.** The product's domain (Australian tax) has correctness as a hard requirement, but no automated test confirms a single calculation.
- **Adding tests is itself a phase.** A "set up testing" phase is a likely early roadmap item — it unblocks safe refactoring and gives downstream phases a way to prove correctness.
