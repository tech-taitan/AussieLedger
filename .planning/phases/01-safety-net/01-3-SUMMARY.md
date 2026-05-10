---
phase: 01-safety-net
plan: 3
subsystem: entity-form-validation
tags: [abn-validation, entity-form, warn-but-allow, partnership]
dependency_graph:
  requires: [validation-lib]
  provides: [abn-warning-ui, partnership-entity-type]
  affects: [src/components/EntityForm.tsx]
tech_stack:
  added: []
  patterns: [warn-but-allow-validation, inline-amber-warning]
key_files:
  modified:
    - src/components/EntityForm.tsx
decisions:
  - "Warning state stored in a separate `warnings: Record<string, string>` hook (not merged into `errors`) so the existing error-blocks-submit logic doesn't catch ABN warnings"
  - "ABN validation triggered when input length reaches 11 digits (after stripping spaces/hyphens) — matches the digit count of an ABN"
  - "Field id changed to `entity-abn` and `htmlFor` updated to match, so getByLabelText(/abn/i) finds the input reliably"
metrics:
  duration: "~10 minutes (with sandbox bash interruption)"
  completed: "2026-05-10"
  tasks: 1
  files_modified: 1
  commits: 1
  tests_green: 2 (both EntityForm RED-by-design tests now pass)
  tests_todo: 0
  tests_red: 0
---

# Phase 1 Plan 3: EntityForm ABN Wiring — Summary

**One-liner:** EntityForm now invokes `validateAbn()` from `src/lib/validation` and displays an inline amber warning on bad checksums while keeping submit enabled (warn-but-allow); the `US Big Law Firm` foreign entity type is replaced with `Partnership`; no TFN field is present anywhere.

## What Was Built

### EntityForm.tsx changes
- `validateAbn` imported from `../lib/validation`
- `AlertTriangle` icon added to lucide-react import
- `warnings: Record<string, string>` state hook added (separate from `errors`)
- Blocking length check on `registrationNumber` removed from the `validate()` function
- `handleChange('registrationNumber', value)` calls `validateAbn(value)` when 11 digits reached; result stored in `warnings.registrationNumber` (never in `errors`)
- Field label renamed: `Registration Number (ABN/EIN)` → `ABN`
- Field placeholder updated to use the official ATO test vector `51 824 753 556`
- `aria-label="ABN"` and `id="entity-abn"` / `htmlFor="entity-abn"` added for accessibility and `getByLabelText` test compatibility
- Inline amber warning (with `<AlertTriangle>` icon) rendered when `warnings.registrationNumber` is set
- Entity type select option `'US Big Law Firm'` replaced with `'Partnership'`

### Final entity type set
The select now offers exactly four AU entity types: Company, Trust, Individual, Partnership.

### Forbidden strings absent
Source verified to contain zero occurrences of: `TFN`, `tfn`, `Tax File Number`, `EIN`, `US Big Law Firm`.

## Test Status

- 2 GREEN (both `EntityForm.test.tsx` RED-by-design tests now pass: `'ABN warning'` and `'no TFN field'`)
- Full suite remains 72 GREEN, 11 TODO, 0 RED
- `npm run lint` (tsc --noEmit): PASS

## Deviations

1. **Bash sandbox denial.** The executor agent couldn't run lint/test/commit and asked for permission. The orchestrator ran the verification commands and committed.

## Self-Check

- `validateAbn` imported and called on registrationNumber input ✓
- Warning shown for invalid ABN (`'11 111 111 111'`); no warning for valid ABN (`'51 824 753 556'`) ✓
- Submit button NOT disabled by ABN warning (warn-but-allow) ✓
- Label renamed to "ABN"; placeholder no longer mentions "EIN" ✓
- Entity type select offers Company, Trust, Individual, Partnership; no foreign options ✓
- No TFN/tfn/Tax File Number/EIN strings in source ✓
- EntityForm tests pass ✓
- Full suite passes ✓
