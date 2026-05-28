---
phase: 02-decompose-and-tax-engine
plan: 3
subsystem: tax-component-migration + ai-gating + partnership-column
tags: [tax-engine-consumers, AI-gating, fuzzy-match, partnership-label, review-banner]
dependency_graph:
  requires: [tax-engine-modules-02-1, IS_AI_ENABLED-02-1, fuzzyMatch-02-1, partnershipTaxLabel-02-1, _needsReview-02-1]
  provides: [pure-presentation-tax-components, AI-optional-import, partnership-column-editor, review-needed-banner]
  affects:
    - src/components/TaxReturnAssistant.tsx
    - src/components/CompanyTaxReturn.tsx
    - src/components/TrustTaxReturn.tsx
    - src/components/BasIasAssistant.tsx
    - src/components/ImportTB.tsx
    - src/components/AccountManager.tsx
key_files:
  modified:
    - src/components/TaxReturnAssistant.tsx
    - src/components/CompanyTaxReturn.tsx
    - src/components/TrustTaxReturn.tsx
    - src/components/BasIasAssistant.tsx
    - src/components/ImportTB.tsx
    - src/components/AccountManager.tsx
    - src/components/__tests__/AccountManager.test.tsx
    - src/components/__tests__/ImportTB.test.tsx
decisions:
  - "Tax components pass `period: { type: 'fy', fy: 'FY2026' }` and `fy: 'FY2026'` for now — Phase 6 will wire these to the period filter UI"
  - "AccountManager Review-needed banner persists at the top of the component while any account has `_needsReview === true`; clicking 'Review' on a row scrolls to it (or expands inline)"
  - "When the user saves any tax-label edit on a `_needsReview` account, the editor sets `_needsReview: undefined` (not `false`) so the field disappears from the persisted shape"
  - "ImportTB keeps the existing AI-driven flow under the `if (IS_AI_ENABLED)` branch — code preserved, just gated; deterministic flow becomes the default visible UX"
metrics:
  completed: "2026-05-10"
  tasks: 2
  files_modified: 8
  commits: 2 (8816b0d for Task 1; 9b87615 for Task 2 — committed by orchestrator after sandbox bash denial)
  tests_green: 198 (up from 166 after 02-1)
---

# Phase 2 Plan 3: Tax Component Migration + AI Gating + AccountManager — Summary

**One-liner:** All 4 tax components now consume `compute*` from `src/lib/tax/` instead of inline rollup math (visual output preserved); `ImportTB` hides its AI flow when no Gemini key is configured and uses deterministic Levenshtein-based `fuzzyMatch` as the primary path; `AccountManager` gains a `partnershipTaxLabel` column and a Review-needed banner that surfaces accounts whose tax labels were inferred during the v1→v2 migration.

## What Was Built

### Tax-component migration (Task 1, commit `8816b0d`)
- `TaxReturnAssistant.tsx` — calls `computeIndividual({ fy: 'FY2026', entries, accounts, period: { type: 'fy', fy: 'FY2026' } })`; reads `result.labels[id].value.toFixed(2)` at the JSX boundary; zero inline rollup math remains.
- `CompanyTaxReturn.tsx` — same pattern with `computeCompany`.
- `TrustTaxReturn.tsx` — same pattern with `computeTrust`.
- `BasIasAssistant.tsx` — same pattern with `computeBas`; the existing G1/G2/G3/G10/G11/1A/1B/W1/W2 labels render from the engine's structured output.
- All 4 components remain pure presentation; no new dependencies introduced.

### ImportTB AI gating (Task 2, commit `9b87615`)
- `import { IS_AI_ENABLED } from '../lib/ai'` at the top of the file.
- The AI-driven mapping section (the original Gemini call) is wrapped in `{IS_AI_ENABLED && (...)}`. Code preserved verbatim under the gate.
- The deterministic flow always renders: upload → column-map → `fuzzyMatch(rows, accounts)` → confidence-tiered review.
- Rows with confidence ≥ 0.85 auto-select the matched account; rows below show top-3 candidates with confidence percentages plus a "Create new account" option.

### AccountManager partnership column + Review-needed banner (Task 2)
- A 4th tax-label column for `partnershipTaxLabel` next to the existing `taxLabel` (Individual), `companyTaxLabel`, `trustTaxLabel` columns. Same dropdown pattern.
- Top-of-component banner renders when any account has `_needsReview === true`. Banner reads "**N accounts need review** — labels were inferred from name during your last upgrade. Click any flagged account to confirm or edit its tax-label mapping."
- Each row with `_needsReview === true` shows an amber border and a "Needs review" badge.
- Saving a tax-label edit on a flagged account sets `_needsReview: undefined` on the persisted Account, dismissing the visual marker (and decrementing the banner count).

## Test Status

- **198 GREEN, 2 skipped, 11 todo, 0 RED**
- The 2 skipped are the structural lint tests for App.tsx ≤ 250 lines and "no raw `new Date(`" — RED-by-design, will turn GREEN after Plan 02-4 demolishes App.tsx.
- The 11 todo are the Phase 5 golden-output placeholders.
- All hook tests (from Plan 02-2) plus tax-component / AI-gating / partnership tests (from this plan) pass.
- `npm run lint` (tsc --noEmit) passes.

## Deviations

1. **Bash sandbox denial on the final commit.** The executor agent reached the end of Task 2 with all source edits in place and tests passing, but couldn't run `git commit`. The orchestrator finished the commit (`9b87615`) and wrote this SUMMARY. No code differences — all the work is the agent's; only the commit invocation moved.

## Self-Check

- All 4 tax components consume `compute*()` ✓
- No inline rollup math in the 4 tax components (visual output preserved) ✓
- `ImportTB` hides AI section when `IS_AI_ENABLED === false`; renders deterministic flow ✓
- `fuzzyMatch` powers the manual flow with 0.85 confidence threshold and top-3 candidates ✓
- `AccountManager` has the 4th `partnershipTaxLabel` column ✓
- Review-needed banner appears when any account has `_needsReview === true` ✓
- Editing a `_needsReview` account clears the flag ✓
- All 12 component smoke tests pass; AccountManager + ImportTB tests now GREEN ✓
- `npm run lint` passes ✓
- `npm run build` (verified before commit) ✓
