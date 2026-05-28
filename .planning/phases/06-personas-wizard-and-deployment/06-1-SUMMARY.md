---
phase: "06-personas-wizard-and-deployment"
plan: 1
subsystem: "schema-migration, persona-module, label-help-text, ui-scaffolds, release-artefacts"
tags: [migration, persona, wizard, labels, license, spdx, release]
dependency_graph:
  requires: [05-4-SUMMARY.md]
  provides: [v4-to-v5 migration, Settings/persona module, useAnomalyCounts hook, LabelTooltip, PersonaModeModal, AiGateNote, YearEndWizard scaffold, LICENSE, CONTRIBUTING.md, README]
  affects: [06-2-PLAN.md, 06-3-PLAN.md]
tech_stack:
  added: ["@radix-ui/react-tooltip@1.2.8"]
  patterns: [additive-migration, localStorage-settings, useMemo-anomaly-counting, radix-tooltip]
key_files:
  created:
    - src/lib/migrations/v4-to-v5.ts
    - src/lib/persona.ts
    - src/hooks/useAnomalyCounts.ts
    - src/components/LabelTooltip.tsx
    - src/components/PersonaModeModal.tsx
    - src/components/AiGateNote.tsx
    - src/components/YearEndWizard.tsx
    - src/lib/migrations/__tests__/v4-to-v5.test.ts
    - src/lib/__tests__/persona.test.ts
    - src/hooks/__tests__/useAnomalyCounts.test.ts
    - src/lib/tax/__tests__/label-help-text.test.ts
    - src/components/__tests__/LabelTooltip.test.tsx
    - src/components/__tests__/PersonaModeModal.test.tsx
    - src/components/__tests__/AiGateNote.test.tsx
    - src/components/__tests__/YearEndWizard.test.tsx
    - src/components/__tests__/Sidebar.test.tsx
    - src/__tests__/license.test.ts
    - src/__tests__/contributing.test.ts
    - src/__tests__/readme.test.ts
    - src/__tests__/spdx-headers.test.ts
    - LICENSE
    - CONTRIBUTING.md
  modified:
    - src/types.ts (WizardStateFy interface + Entity v5 fields)
    - src/lib/schemas.ts (EntitySchema v5 widening)
    - src/lib/migrations/index.ts (CURRENT_VERSION 4→5, register migrateV4ToV5)
    - src/lib/migrations/__tests__/round-trip.test.ts (extended for v5)
    - src/lib/migrations/__tests__/index.test.ts (updated CURRENT_VERSION assertion)
    - src/lib/migrations/__tests__/runner.test.ts (updated CURRENT_VERSION assertion)
    - src/lib/tax/labels/fy2026.ts (helpText on all 6 catalogues + IAS_LABELS_FULL)
    - src/styles/print.css (label-help-text print rule)
    - package.json (license field + @radix-ui/react-tooltip dep)
    - README.md (full audience-first rewrite)
    - src/lib/utils.ts (SPDX header added — Rule 2 fix)
    - src/test/setup.ts (SPDX header added — Rule 2 fix)
decisions:
  - "Settings stored in localStorage under 'aussieledger:settings' (StorageAdapter FINAL invariant preserved)"
  - "Radix tooltip Trigger uses asChild, Content does NOT (React 19 pitfall avoided)"
  - "IAS_LABELS_FULL created as new constant alongside existing IasLabel type"
  - "SPDX headers added to src/lib/utils.ts and src/test/setup.ts (pre-existing omissions fixed)"
  - "WizardStateFy exported from types.ts and re-exported from persona.ts"
  - "v4-to-v5 migration additive only: returnStatusByFy and wizardState both default to undefined"
metrics:
  duration: "~45 minutes"
  completed: "2026-05-29"
  tasks_completed: 3
  tasks_total: 3
  files_created: 22
  files_modified: 12
  tests_prior: 526
  tests_new_green: 166
  tests_total: 692
  tests_todo: 15
---

# Phase 06 Plan 1: Wave 0 Foundations — Summary

**One-liner:** v4→v5 additive migration with wizard state fields, localStorage-based Settings/persona module with pure lifecycle functions, useMemo anomaly counting hook, helpText widened across all 6 ATO label catalogues with content lint, Radix tooltip + UI scaffolds, Apache 2.0 release artefacts, and per-file SPDX lint enforcement.

## What Was Built

### Task 1: Schema + Hooks + Migration

**v4→v5 Migration (`src/lib/migrations/v4-to-v5.ts`):**
- Additive migration adding `returnStatusByFy` and `wizardState` to Entity
- Registered as `4: migrateV4ToV5` in migrations registry
- `CURRENT_VERSION` bumped from 4 to 5
- Round-trip test extended (v0→v5, refuse downgrade)

**Types (`src/types.ts`):**
- Added `Entity.returnStatusByFy?: Record<string, 'draft' | 'finalised'>`
- Added `Entity.wizardState?: Record<string, WizardStateFy>`
- New `WizardStateFy` interface exported

**Persona module (`src/lib/persona.ts`):**
- `Settings` interface + `SETTINGS_KEY = 'aussieledger:settings'`
- `getSettings()`, `saveSettings()`, `clearSettings()`, `useSettings()` hook
- `finaliseEntity()` — writes returnStatusByFy + lockedFys + completedAt (uses `today()`, never `new Date()`)
- `unfinaliseEntity()` — sets to draft, removes from lockedFys
- `advanceStep()` — creates initial wizardState or preserves dismissedAnomalies
- `getPrimaryEntityId()` — resolves primary entity from settings

**`useAnomalyCounts` hook (`src/hooks/useAnomalyCounts.ts`):**
- `useMemo` based, never persisted
- Counts unbalanced posted journals (tolerance 0.005)
- Counts accounts with missing taxLabel referenced in posted entries
- Respects `activeEntityId` filter or null for all entities

### Task 2: Label Help Text + UI Scaffolds

**helpText widened on all 6 catalogues (`src/lib/tax/labels/fy2026.ts`):**
- 24 Individual labels, 25 Company labels, 17 Trust labels, 9 Partnership labels, 13 BAS labels
- New `IAS_LABELS_FULL` constant with 6 entries (W1/W2/W3/W4/W5/T7)
- Total: 94 helpText entries, all >= 20 chars, none containing deductibility language

**LabelTooltip (`src/components/LabelTooltip.tsx`):**
- Radix `Tooltip.Provider + Root + Trigger(asChild) + Content` (no asChild on Content)
- Screen: `?` button with `no-print` class, `aria-label="Help for {labelCode}"`
- Print: `print-only label-help-text` span always visible

**`print.css` extended:** `@media print .label-help-text { display: block }` added

**UI Scaffolds:**
- `PersonaModeModal.tsx` — owner/agent first-run modal with `data-testid="persona-mode-owner/agent"`
- `AiGateNote.tsx` — inline note using `isAiEnabled()` (not deprecated `IS_AI_ENABLED`)
- `YearEndWizard.tsx` — scaffold with step indicator and Next button (full implementation: Plan 06-2)
- `Sidebar.test.tsx` — placeholder `it.todo()` for Plan 06-3 Sidebar widening

### Task 3: Release Artefacts

**LICENSE:** Full Apache 2.0 text (11,358 bytes) fetched from apache.org

**CONTRIBUTING.md:**
- Dev setup (single-user + full-stack)
- Schema Migrations hard rule (additive, round-trip, registered, named)
- Adding a New Financial Year guide
- Pull Request Template

**README.md (rewritten):**
- Audience-first: owner paragraph + agent paragraph
- Quick start: `npm install && npm run build`
- Two deployment shapes: Single-user local + Small-firm VPS
- How It Works, AI gate note, Contributing/License

**SPDX lint test (`src/__tests__/spdx-headers.test.ts`):** 84 source files asserted

## Test Count

| Before | After | Delta | Notes |
|--------|-------|-------|-------|
| 526 GREEN | 692 GREEN | +166 | +15 todo (4 new Sidebar + 11 pre-existing) |

## Verification Summary

| Check | Result |
|-------|--------|
| `npm ls @radix-ui/react-tooltip` | `@radix-ui/react-tooltip@1.2.8` |
| `tsc --noEmit` | EXIT 0 |
| `npm run build` | EXIT 0 (chunk size warning pre-existing) |
| `npx vitest run` | 692 GREEN, 15 todo, 0 RED |
| CURRENT_VERSION | 5 |
| SPDX lint | 84 files PASS |
| helpText deductibility lint | 0 matches |
| no `new Date()` in persona.ts | PASS |
| no `IS_AI_ENABLED` in AiGateNote.tsx | PASS (only in comment) |
| no `asChild` on `Tooltip.Content` | PASS |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated CURRENT_VERSION assertions in existing tests**
- **Found during:** Task 1 (bump CURRENT_VERSION 4→5)
- **Issue:** `index.test.ts` and `runner.test.ts` asserted `CURRENT_VERSION === 4`
- **Fix:** Updated both assertions to `toBe(5)` with descriptive test names
- **Files modified:** `src/lib/migrations/__tests__/index.test.ts`, `src/lib/migrations/__tests__/runner.test.ts`
- **Commit:** 9da476b

**2. [Rule 2 - Missing Critical Functionality] Added SPDX headers to pre-existing files**
- **Found during:** Task 3 (SPDX lint test discovered 2 missing headers)
- **Issue:** `src/lib/utils.ts` and `src/test/setup.ts` missing `SPDX-License-Identifier: Apache-2.0` header
- **Fix:** Added standard 4-line SPDX header block to both files
- **Files modified:** `src/lib/utils.ts`, `src/test/setup.ts`
- **Commit:** 4c000ce

## What Plans 06-2 and 06-3 Can Now Consume in Parallel

**Plan 06-2 (YearEndWizard implementation):**
- `advanceStep()`, `finaliseEntity()`, `unfinaliseEntity()` from `src/lib/persona.ts`
- `WizardStateFy` type from `src/types.ts`
- `YearEndWizard.tsx` scaffold with established prop interface
- `useAnomalyCounts` hook for Step 4 (unmapped accounts gate)

**Plan 06-3 (Sidebar + persona-mode wiring):**
- `Settings`, `useSettings`, `getSettings` from `src/lib/persona.ts`
- `useAnomalyCounts` hook for Sidebar badge counts
- `PersonaModeModal.tsx` for first-run flow
- `Sidebar.test.tsx` with `it.todo()` tests ready to flip GREEN

## helpText Content for User Review

All 94 helpText strings were drafted against ATO NAT instructions (NAT 2541/2543 for Individual, NAT 0656 for Company, NAT 0660 for Trust, NAT 0659 for Partnership, NAT 7392 for BAS/IAS). The content follows the structural "what this label captures + where the data comes from" framing. No deductibility language anywhere.

Key strings to review before public release (representative sample):
- Trust distribution streaming labels (57_B through 57_F): reference streaming clauses — confirm current ATO trust distribution rules apply
- Medicare levy M1/M2 strings: reference flat-2% and MLS tiers — verify thresholds match FY2026 values
- PAYG withholding W3/W4: describe no-TFN withholding obligations — confirm wording with a tax professional before publishing

## Self-Check

Files created/modified verified via `git status` and `git log --oneline -5`.
Commit hashes: 9da476b (Task 1), b48dfaa (Task 2), 4c000ce (Task 3).

## Self-Check: PASSED

All 3 commits exist. All specified files present. 692 tests GREEN. TypeScript clean. Build clean.
