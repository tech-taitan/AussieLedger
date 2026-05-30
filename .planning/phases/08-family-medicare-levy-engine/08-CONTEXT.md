---
phase: 8
slug: family-medicare-levy-engine
type: context
status: ready-for-planning
created: 2026-05-30
discussed_areas: [eligibility-trigger, mls-family-scope, entityform-ux, form-i-display-assumption-disclosure]
---

# Phase 8: Family Medicare Levy Engine — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 8 replaces Phase 5's `family → flat 2% Medicare levy + "not yet supported" warning` fallback with the real Australian family Medicare levy threshold engine AND family MLS (Medicare Levy Surcharge) threshold engine. Entity (Individual only) gains `dependants?: number` + `spouseIncome?: string` via additive v5→v6 schema migration. `computeIndividualReturn` switches to family thresholds when applicable (per the eligibility trigger below). EntityForm exposes the two new fields conditionally (Individual entities only). Form I rendering replaces the Phase 5 flat-2% warning with a family-threshold assumption row showing inputs + thresholds. Existing v1.0 single-person Medicare levy behaviour is preserved exactly for entities with both fields undefined.

**In scope:**
- **v5→v6 additive schema migration** — Entity gains `dependants?: number` + `spouseIncome?: string` (decimal string); existing entities migrate cleanly with both fields undefined; round-trip test passes against the v0→v5 fixture set; same migration shape as v3→v4 / v4→v5
- **`src/lib/migrations/v5-to-v6.ts`** — additive-only migration with `CURRENT_VERSION` bumped to 6
- **`src/lib/tax/rates/fy2026/medicare.ts` widened** with real family-threshold engine for BOTH Medicare levy AND MLS:
  - `medicareLevyFamily(taxableIncome, spouseIncome, dependants)` — pure function applying ATO FY2026 family lower/upper thresholds + per-dependant-child adjustment + shading
  - `medicareLevySurchargeFamily(combinedIncome, hasPHC, dependants)` — pure function applying ATO FY2026 MLS family tier thresholds + per-dependant-child adjustment; returns $0 when `hasPHC = true` regardless
  - `medicareLevyFY2026` orchestrator widened — when `filingStatus === 'family'`, calls the new family functions; when single, unchanged Phase 5 behaviour
- **`src/lib/tax/rates/fy2026/constants.ts`** widened additively with FY2026 family thresholds: `MEDICARE_LEVY_FAMILY_LOWER`, `MEDICARE_LEVY_FAMILY_UPPER`, `MEDICARE_LEVY_FAMILY_DEPENDANT_INCREMENT`, `MLS_FAMILY_TIER_1`, `MLS_FAMILY_TIER_2`, `MLS_FAMILY_TIER_3`, `MLS_FAMILY_DEPENDANT_INCREMENT` (exact values sourced by research from current ATO Individual instructions NAT 2541 / NAT 2542)
- **Eligibility predicate** — pure function `isFamilyFiling(entity: Entity): boolean` returns true iff `dependants ?? 0 ≥ 1` OR `spouseIncome !== undefined`. The presence of EITHER field triggers family. Single-parent case (dependants > 0, spouseIncome undefined) → family with spouseIncome treated as `"0"`. DINK case (dependants undefined-or-0, spouseIncome > 0) → family with per-dependant increment of 0. Both undefined → single (Phase 5 behaviour preserved; zero regression for v1.0 entities).
- **`computeIndividualReturn` widened** — calls `isFamilyFiling(entity)` to derive `filingStatus`; passes `dependants` + `spouseIncome` through to the medicare engine when family
- **Anomaly emission for bad data** — if family is detected but `spouseIncome` fails decimal parse (garbage), engine applies family thresholds with `spouseIncome = "0"` AND emits an `Anomaly` ({severity: 'warn', label: 'M1', message: 'Spouse income data invalid; family thresholds applied with $0 — verify input'})
- **`src/components/EntityForm.tsx` widened** — adds two new fields inside the existing 'Tax & GST' section (next to `aggregatedTurnover`): `dependants` (integer ≥ 0; default blank/undefined; one-sentence inline help) + `spouseIncome` (decimal string ≥ 0; default blank/undefined; one-sentence inline help). Both fields entirely hidden when entity type ≠ Individual. Existing values preserved on type-switch (round-trip).
- **`src/components/TaxReturnAssistant.tsx` (Form I) widened** — when `result.meta.assumptions` contains a family-threshold row, the existing Phase 5 flat-2% warning row is REPLACED entirely (not duplicated). New assumption row format: `'Family Medicare levy applied — {N} dependants, spouse income ${X}. Family threshold $Y; per-dependant adjustment ${Z}.'` Reuses Phase 5 `AssumptionsBlock` component as-is — family row appears inline with other assumptions (marital status, age, PHC). Print rendering inherits Phase 5 print.css scoping; zero new print CSS.
- **`src/lib/schemas.ts`** widened additively with Zod refinements: `dependants: z.number().int().nonnegative().optional()`, `spouseIncome: z.string().refine(decimalStringNonNegative).optional()`

**Out of scope (deferred to later phases or out of v1.1 entirely):**
- Multi-year family-threshold support — v1.1 ships FY2026 only; future FY modules inherit the per-FY pattern
- Explicit `filingStatus` enum on Entity — eligibility is derived from presence-of-fields; user doesn't toggle a separate flag
- Spouse marriage / de facto status field — out of scope; ATO "had a spouse for any part of the year" trigger is approximated by `spouseIncome !== undefined`
- Children-aged-18+-in-tertiary-study dependant rules — out of scope; `dependants` field is a single number representing dependant-child count under ATO's standard definition
- Single Parent Family Tax Benefit / FTB Part B integration — out of scope; not a Medicare-levy concept
- Defined-benefit-income separate handling for MLS — out of scope; income is aggregate
- Senior and Pensioner Tax Offset (SAPTO) family thresholds — out of scope; entity has no age field
- Family Medicare Levy Surcharge "reportable fringe benefits" addition — out of scope; v1.1 uses taxable income only
- EntityForm dependant-list (names, DOBs, etc.) — v1.1 ships single integer count only
- Soft warning when dependants > 5 — research may surface real-world fixtures showing this is unnecessary; defer
- Strict hard caps (dependants 0–10) — defer; some users have legitimate large families
- Dedicated 'Family Medicare' print section — defer; AssumptionsBlock reuse is sufficient

</domain>

<decisions>
## Implementation Decisions

### Eligibility trigger (4 sub-decisions)

- **Family iff `dependants ≥ 1` OR `spouseIncome !== undefined`.** The presence of EITHER field signals 'family' filing status. Matches ATO's family-threshold trigger: 'had a spouse for any part of the year' (approximated by presence of `spouseIncome`) OR 'had a dependant child' (approximated by `dependants ≥ 1`). Single value of `spouseIncome: "0"` counts as 'present' — full-time-parent and spouse-without-income are real cases.
- **Single parent (dependants > 0, spouseIncome undefined) → family with spouseIncome treated as `"0"` for combined-income calculation.** Family thresholds apply. Combined income = taxpayer's own income (spouse contributes $0). Per-dependant-child increment applies.
- **DINK case (dependants undefined-or-0, spouseIncome > 0) → family with per-dependant increment of 0.** Spouse alone triggers family per ATO rule. Base family thresholds apply; per-dependant-child adjustment is $0 because no kids. Two-income-no-kids is the standard DINK case.
- **Both undefined → single thresholds (Phase 5 behaviour preserved).** Existing v1.0 Individual entities (no `dependants`, no `spouseIncome`) keep their current single-threshold Medicare calculation — zero regression. To get family thresholds, user must explicitly open EntityForm and set at least one of the two new fields. Matches MED-04: 'defaults are undefined so existing v1.0 entities continue to use single-person thresholds without any user action.'

### MLS (Medicare Levy Surcharge) family scope (4 sub-decisions)

- **Ship BOTH family Medicare levy AND family MLS in Phase 8.** Both depend on the same `dependants` + `spouseIncome` fields. Both use 'family income' = taxpayer + spouse income. The per-dependant-child increment differs slightly between the two but the structure is identical. Completing both in one phase avoids a v1.2 'oh we forgot MLS' loop. Estimated cost: ~+1 day vs Medicare levy alone — acceptable.
- **Per-dependant-child increment applies to BOTH Medicare levy AND MLS family thresholds.** Same formula shape: `effectiveThreshold = baseThreshold + (dependants × dependantIncrement)`. Constants live in `fy2026.ts`. Research sources exact FY2026 values from ATO NAT 2541 / NAT 2542. Without the increment, families with 2+ kids would see overstated levy/surcharge.
- **PHC + family: MLS family threshold check runs; if PHC = true → surcharge = $0 regardless of income.** Same logic as existing Phase 5 single-MLS behaviour, just with family thresholds plugged in. Family-vs-single only matters for the threshold-comparison side, not the PHC-override side. Basis text reflects this: `'Family MLS check passed; PHC held → surcharge $0'`.
- **Bad data (e.g. dependants = 3 + spouseIncome = "garbage") → best-effort family computation + Anomaly emission.** Engine treats invalid `spouseIncome` as `"0"`, applies family thresholds, AND emits an `Anomaly` ({severity: 'warn', label: 'M1', message: 'Spouse income data invalid; family thresholds applied with $0 — verify input'}). Form I AnomalyBadge surfaces inline next to M1. Matches Phase 5's anomaly-flag pattern; matches Phase 7's tolerant-parsing philosophy.

### EntityForm UX (4 sub-decisions)

- **Place new fields inside existing 'Tax & GST' section (next to `aggregatedTurnover`).** Existing v4/v5 additions (aggregatedTurnover, paygInstalmentAmount) live in this grouping. Adding `dependants` + `spouseIncome` to the same section keeps Individual-only fields together. Reuses existing visual pattern; zero new section chrome.
- **One short sentence of inline help per field, plain English, no jargon.** Dependants: `'Number of children under 18 you supported (used for Medicare levy family thresholds).'` SpouseIncome: `'Your spouse's taxable income for the financial year. Required if you had a spouse for any part of the year.'` Matches Phase 6 LabelTooltip helpText density. NO mention of 'deductible' (Phase 6 content lint).
- **Validation: Dependants integer ≥ 0 (no max cap); SpouseIncome decimal-string ≥ 0; both optional (blank = `undefined`).** Light validation matches existing EntityForm pattern for `aggregatedTurnover`. No max cap on dependants — some users have legitimate large families. Decimal-string validation for `spouseIncome` matches existing money-field validation; blank input → `undefined` (not `"0"`); preserves the eligibility-trigger semantic.
- **Fields entirely hidden when entity type ≠ Individual.** Matches MED-04 exactly. Type switcher (Individual → Company etc.) hides the fields in the UI; existing values remain in storage (round-trip preserved). No 'Individual entities only' disabled-with-message rendering; clean conditional hide via the existing entity-type conditional pattern.

### Form I display + assumption disclosure (4 sub-decisions)

- **Replace the existing Phase 5 flat-2% warning entirely with a family-threshold assumption row.** When family thresholds apply, the Phase 5 `'Medicare exemption: none (full 2% levy applied unless shading applies)'` assumption is REPLACED — not duplicated, not appended. The flat-2% warning was a 'not yet supported' apology; Phase 8 fixes the underlying issue, so the warning is no longer accurate. Clean ship; clear narrative.
- **Assumption row text:** `'Family Medicare levy applied — {N} dependants, spouse income ${X}. Family threshold ${Y}; per-dependant adjustment ${Z}.'` Plain-English + show the input data (N, X) + the actual threshold used (Y) + the per-dependant adjustment ($Z). User/agent can verify the computation against ATO instructions. Matches Phase 5 AssumptionsBlock density (other assumptions also show their inputs).
- **Zero-zero case (`dependants = 0`, `spouseIncome = "0"`):** Render the assumption row with explicit zeros: `'Family Medicare levy applied — 0 dependants, spouse income $0. Family threshold ${Y}; per-dependant adjustment $0.'` Honest: family thresholds applied because user set the spouseIncome field (any value triggers family per the eligibility decision), even though spouse earned $0. Consistent with the eligibility logic.
- **Print rendering: same `AssumptionsBlock` component pattern as Phase 5.** Family row appears inline with other assumptions (marital status, age, PHC). No new print.css scoping. Family info is just another assumption — consistent visual language across all 5 tax-return components. Zero new print primitives.

### Claude's Discretion

- **Exact FY2026 family threshold values** (lower / upper / per-dependant increment for both Medicare levy and MLS family tiers) — research sources from current ATO NAT 2541 / NAT 2542 PDFs.
- **Function signatures** for `medicareLevyFamily` and `medicareLevySurchargeFamily` — planner picks; pure-function pattern matches Phase 5 single equivalents.
- **Decimal-string validation regex for `spouseIncome`** — same pattern as existing `aggregatedTurnover` field; planner replicates.
- **Exact wording of EntityForm validation error messages** — planner picks based on the existing form-error pattern.
- **Whether `medicareLevyFamily` returns the same `MedicareLevyResult` shape as `medicareLevySingle`** — almost certainly yes (consistent API); planner confirms with a unit test that the orchestrator can call either with the same downstream code.
- **Form I label display formatting** for `${Y}` and `${Z}` (e.g. `$28,501` vs `$28501.00`) — planner picks based on existing AssumptionsBlock currency formatting.
- **Anomaly label code** for the bad-spouse-income case — planner picks (`'M1'` matches the affected ATO label; `'family-data'` is more semantic). Either works.
- **Whether legacy v1.0 entities get any visual indicator that family fields are available** — out of scope per MED-04 default-undefined preservation; planner ignores unless a specific UX requirement surfaces.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 8 scope + prior decisions
- `.planning/PROJECT.md` — Vision, audience, v1.1 milestone goal
- `.planning/REQUIREMENTS.md` §Family Medicare Levy Threshold Engine — MED-01 through MED-04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 8 entry with goal + 5 success criteria + research flags
- `.planning/milestones/v1.0-phases/05-tax-outputs/05-CONTEXT.md` — Phase 5 Medicare levy decisions (single shipped; family deferred to v2 with flat-2% warning); `Anomaly` interface; AssumptionsBlock usage pattern
- `.planning/milestones/v1.0-phases/05-tax-outputs/05-RESEARCH.md` — FY2026 ATO Medicare levy research (single threshold values + research methodology — replicate for family)
- `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` — StorageAdapter FINAL invariant (no adapter changes); schema-migration round-trip rule

### Existing code Phase 8 must consume / extend (NOT rewrite)
- `src/lib/tax/rates/fy2026/medicare.ts` (124 lines) — widen `medicareLevyFY2026` family branch with real engine; add 2 new pure functions (`medicareLevyFamily`, `medicareLevySurchargeFamily`)
- `src/lib/tax/rates/fy2026/constants.ts` — widen additively with FY2026 family threshold constants
- `src/lib/tax/returns/fy2026/individual.ts` — call `isFamilyFiling(entity)` to derive `filingStatus`; pass `dependants` + `spouseIncome` through to medicare engine; family-threshold assumption row replaces flat-2% warning in `result.meta.assumptions`
- `src/components/TaxReturnAssistant.tsx` (Form I) — no code change at component level; consumes the new assumption row from `result.meta.assumptions` via existing `AssumptionsBlock` pattern
- `src/components/EntityForm.tsx` — add 2 new fields inside 'Tax & GST' section (Individual-only conditional)
- `src/types.ts` Entity — additive v6 widening: `dependants?: number` + `spouseIncome?: string`
- `src/lib/schemas.ts` — Zod widening (additive)
- `src/lib/migrations/v5-to-v6.ts` — NEW migration file; same shape as `v4-to-v5.ts`
- `src/lib/migrations/index.ts` — register `v5-to-v6`; bump `CURRENT_VERSION` to 6
- `src/lib/migrations/__tests__/v5-to-v6.test.ts` + `round-trip.test.ts` extension — round-trip test mandatory

### New code Phase 8 creates
- `medicareLevyFamily(taxableIncome, spouseIncome, dependants): Decimal` — pure function in medicare.ts
- `medicareLevySurchargeFamily(combinedIncome, hasPHC, dependants): Decimal` — pure function in medicare.ts
- `isFamilyFiling(entity: Entity): boolean` — pure predicate, location TBD by planner (probably in `src/lib/tax/returns/fy2026/_helpers.ts` next to the existing aggregated-turnover helper)
- `src/lib/migrations/v5-to-v6.ts` — new migration
- 2 EntityForm form fields with help text + validation
- 1 assumption-row entry in `result.meta.assumptions` (replaces existing flat-2% entry when family applies)

### External documentation
- **ATO Individual tax return instructions 2025-26 (NAT 2541)** — Medicare levy section M1 + M2; family thresholds + per-dependant-child amount + MLS family tiers
- **ATO Medicare levy thresholds 2025-26** — current threshold values for family lower, family upper, per-dependant-child increment
- **ATO Medicare Levy Surcharge thresholds 2025-26** — current tier-1/tier-2/tier-3 family income thresholds + per-dependant adjustment
- ATO Individual tax return form 2026 — Form I label codes M1 and M2 (already shipped in fy2026.ts)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `medicareLevySingle` (Phase 5) — pure-function pattern; `medicareLevyFamily` mirrors its shape (`(...) => Decimal`)
- `medicareLevySurcharge` (Phase 5) — existing single-MLS logic; `medicareLevySurchargeFamily` mirrors its 4-tier structure
- `medicareLevyFY2026` orchestrator (Phase 5) — already accepts `filingStatus: 'single' | 'family'` and currently has a `family → flat 2% + warning` branch. Phase 8 swaps that branch's implementation; orchestrator surface unchanged.
- `MedicareLevyInput` / `MedicareLevyResult` types (Phase 5) — input gains optional `dependants?: number` + `spouseIncome?: string` (additive); result shape unchanged (levy, surcharge, basis, familyWarning?)
- `Anomaly` interface (Phase 5) — yellow pill rendering via `AnomalyBadge`; reused for bad-data emission
- `AssumptionsBlock` (Phase 5) — Form I assumption row rendering; reused as-is; family row is just a new entry in the `assumptions` array
- `EntityForm` 'Tax & GST' section (Phase 5/6) — existing visual pattern for Individual-conditional fields (aggregatedTurnover, paygInstalmentAmount); Phase 8 fields slot in next to these
- `Decimal` from `src/lib/money.ts` (Phase 1) — money never touches native floats
- Migration runner + round-trip test pattern (Phase 1/3/5) — `v4-to-v5.ts` is the most recent reference implementation

### Established Patterns
- **Additive schema migrations with round-trip tests** (Phase 3/4/5) — Phase 8 v5→v6 follows the exact same shape; one new file in `src/lib/migrations/`; round-trip test mandatory
- **Per-FY label module pattern** (Phase 5) — Family thresholds live in `fy2026.ts` (not a generic `medicare.ts`); future FY modules inherit
- **Eligibility-by-presence-of-data pattern** (Phase 6 PERS-01) — owner-mode auto-selects primary entity when one exists; Phase 8 family-eligibility-by-presence-of-field follows the same philosophy (derive state from data, no explicit flag)
- **Anomaly emission for data-quality issues** (Phase 5 + Phase 6) — engine computes best-effort + emits a `warn`-severity anomaly; user sees both value AND quality flag inline
- **AssumptionsBlock-as-output-channel** (Phase 5) — engine emits assumptions; component renders them. Phase 8 follows this exactly.

### Integration Points
- `medicareLevyFY2026` orchestrator: family branch is rewritten internally; orchestrator's external API unchanged
- `computeIndividualReturn` (`individual.ts`): adds 2 lines (`const filing = isFamilyFiling(entity); const familyParams = filing ? { dependants: entity.dependants, spouseIncome: entity.spouseIncome } : undefined;`) and passes through to medicare
- `TaxReturnAssistant.tsx`: NO component change — assumptions array drives rendering via `AssumptionsBlock`
- `EntityForm.tsx`: 2 new form-field blocks inserted inside the existing Individual-conditional 'Tax & GST' section; existing layout preserved
- `src/types.ts`: additive widening; no breaking changes to existing callers
- `src/lib/schemas.ts`: additive Zod refinements

</code_context>

<specifics>
## Specific Ideas

- **Single-parent case is a first-class scenario.** A parent with `dependants: 2 + spouseIncome: undefined` gets family thresholds with spouseIncome treated as $0 for the combined-income calculation. Tested explicitly.
- **DINK case is a first-class scenario.** A couple with `dependants: undefined + spouseIncome: "60000"` gets family thresholds with per-dependant-child increment = 0. Tested explicitly.
- **`spouseIncome: "0"` is meaningfully different from `spouseIncome: undefined`.** The former triggers family (spouse exists, earned zero); the latter triggers single (no spouse data). EntityForm validation must preserve this distinction (blank → undefined; explicit `"0"` → `"0"`).
- **Assumption row replaces the Phase 5 flat-2% warning entirely.** When family applies, the warning is gone from the assumptions list; when single (both fields undefined), the existing assumption row stays unchanged.
- **Reuse Phase 5 `AssumptionsBlock` as-is.** No new component; family info is just another assumption entry.
- **Bad-spouse-income anomaly** uses `severity: 'warn'` and `label: 'M1'` — same convention as Phase 5 anomalies.
- **Help text never mentions deductibility** (Phase 6 content lint). Dependants/SpouseIncome help text focuses on Medicare levy threshold application, not tax-benefit framing.

</specifics>

<deferred>
## Deferred Ideas

- **Explicit `filingStatus` enum on Entity** ('single' | 'family' as a user-toggle) — eligibility is derived from presence-of-fields; user doesn't need a separate flag. v2.x if real users find auto-detection confusing.
- **Spouse marriage/de-facto status field** — out of scope; ATO "had a spouse for any part of the year" is approximated by `spouseIncome !== undefined`.
- **Children-aged-18+-in-tertiary-study dependant rules** — out of scope; `dependants` is a single integer under ATO's standard under-18 definition.
- **Single Parent Family Tax Benefit / FTB Part B integration** — out of scope; not a Medicare-levy concept.
- **Defined-benefit-income separate handling for MLS** — out of scope; income is aggregate.
- **Senior and Pensioner Tax Offset (SAPTO) family thresholds** — out of scope; entity has no age field.
- **Family MLS reportable fringe benefits addition** — out of scope; v1.1 uses taxable income only.
- **EntityForm dependant-list with names/DOBs** — v1.1 ships single integer count only. Could be expanded in a future phase if compliance demands.
- **Soft warning when dependants > 5 (likely typo)** — defer; some users have legitimate large families. May add if research-discovered fixtures show typos are common.
- **Strict hard caps on dependants (0–10)** — defer; same reason.
- **Dedicated 'Family Medicare' print section** — defer; AssumptionsBlock reuse is sufficient.
- **Multi-year family-threshold support across FY modules** — v1.1 ships FY2026 only; future FY modules inherit the per-FY pattern from Phase 5.
- **Explicit `filingStatus` re-export from individual.ts for tax-agent override** — out of scope; engine derives from entity data.
- **Visual indicator on Form I that family-threshold fields are unset (nudge to set them)** — out of scope per MED-04 default-undefined preservation.

</deferred>

---

*Phase: 08-family-medicare-levy-engine*
*Context gathered: 2026-05-30*
