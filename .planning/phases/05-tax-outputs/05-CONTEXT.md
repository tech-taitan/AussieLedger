---
phase: 5
slug: tax-outputs
type: context
status: ready-for-planning
created: 2026-05-13
discussed_areas: [requirement-scope, schema-fields, print-ux, conservative-vs-full]
---

# Phase 5: Tax Outputs — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 5 turns the Phase 1+2 tax-engine placeholders + the Phase 4 GL + tax-label-pre-mapped CoA into complete, print-ready working papers for all four Australian entity types plus a Simpler BAS / IAS. Every label is computed from a deterministic CoA rollup using decimal.js arithmetic. The user gets a print-CSS-rendered working paper they hand to their tax agent or transcribe into myGov. No PDF library; no direct ATO lodgement.

**In scope:**
- `src/lib/tax/returns/fy2026/` directory with one module per form: `individual.ts` (Form I + B&P schedule), `company.ts` (Form C), `trust.ts` (Form T), `partnership.ts` (Form P), `bas.ts` (Simpler BAS), `ias.ts` (IAS for non-GST entities)
- `src/lib/tax/rates/fy2026/` directory with pure functions: `marginalTax(taxableIncome)`, `lito(taxableIncome)`, `medicareLevySingle(taxableIncome)`, `medicareLevySurcharge(taxableIncome, hasPrivateHealthCover)`, `bre.brePassiveIncomePct(entity, accounts, entries, fy)`, `breRate(passivePct, turnover) → 25 | 30`, `smallBusinessIncomeOffset(netSmallBusinessIncome, aggregatedTurnover, taxPayable)` — pure-function rate helpers, FY-versioned
- v3→v4 additive schema migration: `Entity.aggregatedTurnover?: string` (decimal string), `Entity.paygInstalmentAmount?: string`. Migration sets both to `undefined` for existing entities; `migrate(v3)` lifts to v4 by spread + no default assignment.
- Auto-compute helper: `computeAggregatedTurnover(entity, accounts, entries, fy)` = sum of Revenue-type accounts in FY period; EntityForm shows the computed value as the default and allows override via the new `aggregatedTurnover` field
- Refactor Phase-2 placeholders to consume the new compute*Return() functions:
  - `src/components/TaxReturnAssistant.tsx` — Form I + B&P schedule rendering
  - `src/components/CompanyTaxReturn.tsx` — Form C with BRE-derived rate (25%/30%) + explicit basis-of-rate text
  - `src/components/TrustTaxReturn.tsx` — Form T with per-beneficiary distribution from `Entity.beneficiaries`
  - `src/components/BasIasAssistant.tsx` — Simpler BAS + IAS rendering with working-paper-only G2/G3/G10/G11 labels and lodgement-visible G1/1A/1B/W1/W2/T7
- **NEW component:** `src/components/PartnershipTaxReturn.tsx` — Form P with per-partner distribution from `Entity.partners` (no Phase-2 placeholder exists)
- Per-form **"Print working paper" button** on each tax-return view; clicks `window.print()`. `@media print` CSS rules scope rendering to the active form: hide sidebar / header / nav, show top banner + footer disclaimer on every page, render ATO field codes alongside plain-English labels
- **Top-of-page banner + footer disclaimer** on every printed page: full disclaimer text in banner (page 1) + 1-line footer ("AussieLedger working paper — not tax advice — verify before lodgement") on every page via `@media print` + `position: running()` CSS
- **Anomaly-flag inline rendering**: each compute*Return() returns `{ labels, anomalies: Anomaly[] }`; Anomaly objects render as yellow badges inline next to the affected label AND in a dedicated "Anomalies" section at the bottom; printed working paper includes all anomalies
- **BRE conservative-passive calculation**: `brePassiveIncomePct` sums ALL Revenue accounts flagged with passive-income tax labels (dividends, interest, rent, royalties, capital gain, franking-credit-grossed-up). Emits an Anomaly when result is in 70–90% band ("BRE check: passive income borderline; if non-portfolio dividends present (≥10% voting), result may differ — review s.23AB exception")
- **Individual print "Assumptions used" boxed section**: lists assumed marital status (single), age (under 65 — no seniors offset), Medicare exemption (none — full 2%), private-health cover (assumed had — no MLS), dependants (zero). User/agent verifies before lodging.
- **Form T mandatory streaming disclaimer** on print: "Distribution made under default Division 6 proportion. Streaming of capital gains (Subdiv 115-C) and franked distributions (Subdiv 207-B) not supported in this version — if your trust deed authorises streaming and you wish to stream, manual adjustment required."
- **Three doc/data corrections to existing files (Wave 0 cleanup):**
  1. `src/lib/tax/labels/fy2026.ts` — fix NAT comments: Individual = `NAT 2541` + B&P schedule `NAT 2543`; Trust = `NAT 0660`; Partnership = `NAT 0659`. Phase 4 CONTEXT got it right; the Phase 2 labels file did not.
  2. `BRE_PASSIVE_THRESHOLD` comment — fix legislative cite: `Income Tax Rates Act 1986 s.23AA + s.23AB` (not "ITAA 1997 s.23AA").
  3. REQUIREMENTS.md — flip `COY-04` to **obsolete** with note "mis-scoped; see IND-04"; add new `IND-04`: "User can apply the small business income tax offset (16% × net SB income, capped $1,000, agg. turnover < $5M, individuals only — item 7D on Form I)".
- Audit emission: each "Print working paper" click writes an `EXPORT_DATA` audit log with `{ entityId, form, fy, timestamp }` so the user can see history of working-paper exports
- `src/lib/tax/labels/fy2026.ts` widened to include the FY2026 marginal-bracket table, LITO formula constants, Medicare levy thresholds, MLS bands — all confirmed by 05-RESEARCH from current ATO publications

**Out of scope (deferred to later phases or out of v1 entirely):**
- `@react-pdf/renderer` integration — Phase 6 (verify React 19 compat first)
- Year-end wizard / persona modes — Phase 6
- Direct myGov / ATO API lodgement — out of v1 (likely v2)
- CGT cost-base / capital-allowances depreciation engines — out of v1; user supplies via journals
- FBT (Fringe Benefits Tax) — out of v1
- Full BAS (G2/G3/G10/G11 lodgement) — out of v1; we ship Simpler BAS only (which the ATO defaults SMEs to since 2017). G2/G3/G10/G11 are still computed internally and shown in the working paper for verification, just marked "internal only — not lodged under Simpler BAS"
- Family Medicare levy thresholds (dependant-child count, spouse income, low-income family shading) — Phase 6 wizard or v2; Phase 5 ships single thresholds correctly + applies a flat 2% for families + visible warning "Medicare levy family thresholds not yet supported — manual review required"
- Trust streaming UI (sharePerType editing) — v2; Phase 5 keeps Phase 4's sharePercent-only UI and prints the mandatory "streaming not supported" disclaimer when Form T is generated for a Trust with `sharePerType` set on any beneficiary
- Non-portfolio dividend BRE exception (s.23AB explicit per-account flagging) — v2; Phase 5 ships conservative all-dividends-as-BREPI with an Anomaly flag
- `Entity.returnStatusByFy` (draft/finalised lifecycle) — Phase 6 year-end wizard
- Multi-FY rate switching UI — Phase 6 (Phase 5 ships fy2026 only; the per-FY module pattern supports future FYs without refactoring)
- Recurring-revenue / deferred-revenue automation — v2
- Form Z (small-self-managed-super-fund) — out of v1 entirely
- PAYG instalment Method 2 (income × rate) — v2; Phase 5 ships only Method 1 (pre-calculated ATO amount stored on Entity.paygInstalmentAmount)

</domain>

<decisions>
## Implementation Decisions

### Requirement scope reconciliation (3 sub-decisions)

- **COY-04 re-scoped to IND-04.** The original COY-04 ("User can apply the small business tax offset where eligible (item 7D)") is mis-scoped — Item 7D is on the Individual Form I, not Form C. Companies get the BRE 25%/30% derived rate with no separate offset. Phase 5 marks COY-04 obsolete in REQUIREMENTS.md (with a "mis-scoped → see IND-04" note) and adds a new IND-04: "User can apply the small business income tax offset (16% × net SB income, capped $1,000, agg. turnover < $5M, individuals only — item 7D on Form I)". The mathematical work lives on the Individual side. Verification target: a sole-trader with $30k net SB income + $4M turnover gets a $480 offset applied (16% × 30,000 = 4,800 → capped at 1,000 — wait, that's wrong: the offset is 16% × tax payable on small business income, NOT 16% × net SB income. Confirmed in research; planner will codify the exact formula). The 90%-dividend BRE test for companies stands as success criterion #2.
- **Simpler BAS only.** Phase 5 ships the Simpler BAS form (turnover < $10M — the ATO default since 2017). Lodgement labels: G1 (total sales), 1A (GST on sales), 1B (GST on purchases), W1 (wages), W2 (PAYG withheld), T7 (PAYG instalment). G2 (export sales), G3 (other GST-free sales), G10 (capital purchases), G11 (non-capital purchases) are still **computed and shown in the working-paper view** for verification (matching success criterion #1's "shows correct values for G1..G11"), but are flagged "internal only — not lodged under Simpler BAS". Full BAS election is out of v1. Auto-switch by turnover is out of v1. If a user grows past $10M, a v2 setting will be needed.
- **Single Medicare levy thresholds only + flat 2% for families with warning.** Single-person Medicare levy is computed exactly: full 2% above $34,028 (or the ATO-published upper shading threshold — Wave 0 reconciles between $34,028 and $36,509), shading-in linearly from $27,222 to that upper bound. For families (Entity tagged with non-trivial dependant or spouse fields — none of which exist in v3, so this falls back to "always assume single"), Phase 5 prints flat 2% Medicare with a visible warning. Family thresholds defer to Phase 6 wizard.

### New schema fields (v3 → v4 additive migration; 3 sub-decisions)

- **`Entity.aggregatedTurnover?: string`** (optional decimal string). Auto-compute default from Revenue accounts (4xxx) in the FY period — `computeAggregatedTurnover(entity, accounts, entries, fy)` returns the GL-derived sum. The user can override via a new EntityForm field "Aggregated turnover" with helper text: "Includes connected entities + affiliates per s.328-115. Default shown is this entity's own GL revenue only — override if you have connected entities outside AussieLedger." When the field is blank, the computed default is used; when set, the override wins. Both BRE (for Company) and small-business-offset (for Individual) read this value.
- **`Entity.paygInstalmentAmount?: string`** (optional decimal string). PAYG instalment Method 1 only — the pre-calculated ATO instalment amount the user sees in their ATO portal each quarter. User enters as a $ amount on EntityForm. BAS T7 label reads this value. Method 2 (income × rate) is deferred to v2 because Method 1 covers ~95% of SMEs (the ATO defaults to Method 1 for SMEs anyway).
- **No `returnStatusByFy` field in v4** — defer to Phase 6 year-end wizard. Phase 5 always prints a "Working paper — not finalised" banner because every render is potentially a draft. Phase 6 will introduce the draft/finalised lifecycle and write the field. Saves a v3→v4 surface widening that nothing in Phase 5 actually uses.

**Migration shape (additive only):**
```typescript
// src/lib/migrations/v3-to-v4.ts
export function migrateV3ToV4(v3: PersistedRoot_v3): PersistedRoot_v4 {
  return {
    ...v3,
    _v: 4,
    entities: v3.entities.map(e => ({
      ...e,
      // Both fields are optional + default-undefined; presence opts a value into the field
      aggregatedTurnover: e.aggregatedTurnover,
      paygInstalmentAmount: e.paygInstalmentAmount,
    })),
  };
}
```
v4 bump is **trivial-additive** — every existing field preserved, two new optional fields added, no removals, no renames. Round-trip test must pass.

### Print-mode UX (3 sub-decisions)

- **Per-form Print button on each return view.** `BasIasAssistant`, `TaxReturnAssistant` (Form I), `CompanyTaxReturn`, `TrustTaxReturn`, and the new `PartnershipTaxReturn` each render a "Print working paper" button at the top. The handler is `() => window.print()` (no third-party PDF). Each view has its own `@media print` CSS scope that hides app shell (sidebar, header, bottom-nav), shows the top banner + footer disclaimer, and renders form fields with ATO codes inline. Matches Phase 3's Export-button-pattern from the Data page.
- **All anomaly flags included in print** with a visible yellow `[Anomaly]` badge inline at the affected label AND a consolidated "Anomalies" section at the bottom of the form. Transparency matches working-paper convention (the recipient — tax agent or user re-reviewing — wants to see what the engine wasn't sure about). The Anomaly interface: `{ id, severity: 'info' | 'warn', label?: string, message: string }`. Print uses the same rendering; v2 may add a "review before print" gate but v1 trusts the user to read.
- **Top banner + footer disclaimer on every printed page.** Banner (page 1 only): "AUSSIELEDGER WORKING PAPER. Not tax advice. Produced by self-hosted open-source software. Verify all figures against ATO instructions and your trust deed / company constitution before lodging. The lodging entity retains all responsibility." Footer (every page via `@media print` + `position: running()`): "AussieLedger working paper — not tax advice — verify before lodgement." Maximum visibility on the lodgement-bound document.

### Conservative vs full implementations (3 sub-decisions)

- **BRE: treat ALL dividends as BREPI + anomaly flag** (s.23AB conservative interpretation). The `brePassiveIncomePct` engine sums all Revenue-type accounts whose tax-label mapping indicates passive income (interest, dividend, rent, royalty, capital gain, franking-credit gross-up). The result is then checked against the 80% bright-line: > 80% → 30% rate; ≤ 80% → 25% rate (provided aggregated turnover < $50M). When the calculated passive % lands in a 70–90% band, an Anomaly flag fires: "BRE check: passive income at X%, borderline 80% threshold. If non-portfolio dividends (≥10% voting interest in payer) are present, those are excluded under s.23AB exception; result may shift — review." Phase 5 does NOT ship a per-account `isNonPortfolioDividend` flag (v2). The Form C print explicitly states the BRE basis ("25% applied — passive income X% of total revenue, below 80% threshold"). 90%-dividend unit test from success criterion #2: stays correct because everything is treated as BREPI.
- **Individual print: explicit "Assumptions used" boxed section.** Form I print includes a boxed block listing the implicit assumptions the engine made: "Marital status: single (no spouse income captured); Age: under 65 (no Seniors and Pensioners Tax Offset applied); Medicare exemption: none (full 2% levy applied); Private health cover: assumed (no Medicare Levy Surcharge applied); Dependants: zero." This makes Phase 5's working-paper boundary explicit and protects users who don't realise the engine made assumptions. Phase 6 wizard captures the real values and removes the assumption block.
- **Trust streaming: keep sharePercent-only UI + print "streaming not supported" disclaimer.** Phase 4 shipped `BeneficiaryRow.sharePerType?: Partial<Record<IncomeClass, number>>` typed but UI-hidden. Phase 5 KEEPS that — `BeneficiaryRegister.tsx` still shows only `name + sharePercent`. Form T distributes net trust income proportionally per `sharePercent` (default Division 6 proportion). Form T print includes the mandatory streaming disclaimer (see Domain). v2 may add per-class share editors + render streaming-compliant statements. Critical: if any beneficiary has `sharePerType` set in storage (e.g. from a future Phase-6 wizard), Form T renders an Anomaly: "Beneficiary {name} has per-class shares defined that are not used by this version. Manual adjustment required."

### Cross-cutting decisions

- **Zero new runtime dependencies.** Phase 5 is pure-function compute + React-component renderers + `@media print` CSS. No PDF library (Phase 6 considers `@react-pdf/renderer` pending React 19 compat). No XBRL library. No new test deps either.
- **Pattern: one module per FY × form.** `src/lib/tax/returns/fy2026/{individual,company,trust,partnership,bas,ias}.ts` for compute functions. `src/lib/tax/rates/fy2026/{marginal,lito,medicare,bre,smallBizOffset}.ts` for rate helpers. Future FYs add `src/lib/tax/{returns,rates}/fy2027/` without touching FY2026 code. The `currentFy()` helper from period.ts dispatches.
- **Print CSS organisation:** `src/styles/print.css` contains shared `@media print` rules (hide app shell, banner/footer rules, page-break helpers). Each return view imports it; per-view scoping uses CSS classes (`.print-form-i`, `.print-form-c`, etc.) rather than DOM trees so the test setup can stub `window.matchMedia('print')` predictably.
- **NAT numbering correction:** Phase 5 lands the three doc/data corrections (NAT comments in `src/lib/tax/labels/fy2026.ts`, BRE legislative cite, REQUIREMENTS.md COY-04 → IND-04) as a Wave-0 documentation-hygiene task. These are non-functional but unblock correctness of working-paper output.
- **Audit emission on print:** the per-form Print button writes an `EXPORT_DATA` audit log entry with `{ entityId, form: 'I'|'C'|'T'|'P'|'BAS'|'IAS', fy: 'FY2026', timestamp }`. AuditAction enum already includes `EXPORT_DATA` (widened in Phase 4 to anticipate this).
- **Decimal arithmetic discipline:** all label rollups use decimal.js with explicit `ROUNDING_MODE` per-label (researcher confirmed: G1/1A use `ROUND_HALF_UP`, W2 uses `ROUND_DOWN` per ATO worksheet method). The compute*Return() pure functions are testable with golden fixtures.
- **`Entity.lockedFys` is READ in Phase 5.** When the active FY is in the entity's `lockedFys` array, compute*Return() functions still produce output (the user can review historical), but the Print button changes to "Print finalised return" and adds a tag "LOCKED FY" to the print banner. Write access is Phase 6's job. This honours the Phase 4 forward-compat hook.
- **StorageAdapter stays FINAL (Phase 3 decision).** No interface widening. Phase 5 v3→v4 migration is additive type widening only; persistence calls are the same 12 methods.
</decisions>

<code_context>
## Reusable Brownfield Assets (refactor, do not replace)

| File | Role in Phase 5 | Touch level |
|------|-----------------|-------------|
| `src/components/TaxReturnAssistant.tsx` | Form I (Individual) — Phase 2 placeholder; Phase 5 wires to `computeIndividualReturn()` + LITO + Medicare; adds Print button + B&P schedule + Assumptions block + IND-04 small-business offset | medium refactor |
| `src/components/CompanyTaxReturn.tsx` | Form C — Phase 2 placeholder; Phase 5 wires to `computeCompanyReturn()` + BRE rate selection + franking-account section + explicit BRE basis text + Print button | medium refactor |
| `src/components/TrustTaxReturn.tsx` | Form T — Phase 2 placeholder; Phase 5 wires to `computeTrustReturn()` + per-beneficiary distribution from `Entity.beneficiaries` + streaming disclaimer + Print button | medium refactor |
| `src/components/BasIasAssistant.tsx` | Simpler BAS + IAS — Phase 2 placeholder; Phase 5 wires to `computeBas()` / `computeIas()` + period selector (BAS quarter via period.ts) + lodgement-vs-internal label split (G1/1A/1B/W1/W2/T7 lodgement; G2/G3/G10/G11 internal-only) + Print button | medium refactor |
| `src/components/EntityForm.tsx` | Adds `aggregatedTurnover` + `paygInstalmentAmount` fields with the auto-compute helper text | small extension |
| `src/components/DisclaimerFooter.tsx` | Phase 1 working-paper disclaimer; Phase 5 print top-banner pulls the same text constant | reference only |
| `src/lib/tax/individual.ts` | Phase 2 RELOCATED skeleton; Phase 5 fleshes out into `computeIndividualReturn()` + Form I label rollups | full implementation |
| `src/lib/tax/company.ts` | Phase 2 skeleton; Phase 5 fleshes out into `computeCompanyReturn()` + BRE + Form C labels | full implementation |
| `src/lib/tax/trust.ts` | Phase 2 skeleton; Phase 5 fleshes out into `computeTrustReturn()` + per-beneficiary distribution | full implementation |
| `src/lib/tax/partnership.ts` | Phase 2 skeleton; Phase 5 fleshes out into `computePartnershipReturn()` + per-partner distribution | full implementation |
| `src/lib/tax/bas.ts` | Phase 2 skeleton; Phase 5 splits into BAS Simpler + internal-only G2/G3/G10/G11 helpers | full implementation |
| `src/lib/tax/labels/fy2026.ts` | Phase 2 FY-versioned labels; Phase 5 widens with marginal-bracket table, LITO formula constants, Medicare thresholds, MLS bands; fix the three NAT comment typos | additive widening + 3 typo fixes |
| `src/lib/coa/fy2026/` | Phase 4 127-row CoA; Phase 5 reads tax-label pre-mappings; does NOT modify | consumed only |
| `src/hooks/useJournals.ts` | Phase 4 lifecycle; Phase 5 reads via the TB-rollup pattern (status-aware exclusion already lives there) | consumed only |
| `src/lib/period.ts` | Phase 2 period model; Phase 5 BAS quarter + FY parsing | consumed only |
| `src/lib/money.ts` | Phase 1 decimal.js boundary; Phase 5 all label arithmetic via this | consumed only |

## New Files (Phase 5 creates)

| File | Purpose |
|------|---------|
| `src/lib/tax/returns/fy2026/individual.ts` | `computeIndividualReturn(entity, accounts, entries, fy)` → Form I + B&P labels |
| `src/lib/tax/returns/fy2026/company.ts` | `computeCompanyReturn(entity, accounts, entries, fy)` → Form C labels |
| `src/lib/tax/returns/fy2026/trust.ts` | `computeTrustReturn(entity, accounts, entries, fy)` → Form T + distribution |
| `src/lib/tax/returns/fy2026/partnership.ts` | `computePartnershipReturn(entity, accounts, entries, fy)` → Form P + distribution |
| `src/lib/tax/returns/fy2026/bas.ts` | `computeBas(entity, accounts, entries, period)` → BAS labels (lodgement + internal-only) |
| `src/lib/tax/returns/fy2026/ias.ts` | `computeIas(entity, accounts, entries, period)` → IAS labels (PAYG only) |
| `src/lib/tax/returns/fy2026/types.ts` | Shared types: `ReturnLabel`, `Anomaly`, `ComputedReturn<T>` |
| `src/lib/tax/rates/fy2026/marginal.ts` | `marginalTax(taxableIncome: Decimal) → Decimal` (FY2026 post-Stage-3 brackets) |
| `src/lib/tax/rates/fy2026/lito.ts` | `lito(taxableIncome) → Decimal` (LITO formula with two-stage taper) |
| `src/lib/tax/rates/fy2026/medicare.ts` | `medicareLevySingle(taxableIncome)`, `medicareLevySurcharge(taxableIncome, hasPHC)` |
| `src/lib/tax/rates/fy2026/bre.ts` | `brePassiveIncomePct(entity, accounts, entries, fy)`, `breRate(passivePct, aggTurnover)` |
| `src/lib/tax/rates/fy2026/smallBizOffset.ts` | `smallBusinessIncomeOffset(netSbIncome, aggTurnover, taxPayable)` |
| `src/lib/tax/__tests__/individual.test.ts` | Golden Form I + LITO + Medicare + IND-04 offset tests |
| `src/lib/tax/__tests__/company.test.ts` | Golden Form C + BRE 25%/30% + 90%-dividend test (success criterion #2) |
| `src/lib/tax/__tests__/trust.test.ts` | Golden Form T + distribution-reconciles-to-net-income (success criterion #3) |
| `src/lib/tax/__tests__/partnership.test.ts` | Golden Form P + per-partner distribution |
| `src/lib/tax/__tests__/bas.test.ts` | BAS G1/1A/1B/W1/W2/T7 to-the-cent vs hand-calculated (success criterion #1) |
| `src/lib/tax/__tests__/ias.test.ts` | IAS W1/W2/T7 happy path |
| `src/lib/tax/rates/__tests__/marginal.test.ts` | FY2026 bracket boundaries |
| `src/lib/tax/rates/__tests__/lito.test.ts` | LITO max + two-stage taper boundaries + at-cutout |
| `src/lib/tax/rates/__tests__/medicare.test.ts` | Single threshold + shading + MLS bands |
| `src/lib/tax/rates/__tests__/bre.test.ts` | BREPI calculation + threshold + 90%-dividend → 30% |
| `src/lib/tax/rates/__tests__/smallBizOffset.test.ts` | Cap-at-$1,000 + turnover-cutoff |
| `src/lib/migrations/v3-to-v4.ts` | Additive aggregatedTurnover + paygInstalmentAmount migration |
| `src/lib/migrations/__tests__/v3-to-v4.test.ts` | Round-trip + non-destructive |
| `src/components/PartnershipTaxReturn.tsx` (NEW) | Form P renderer (no Phase-2 placeholder existed) |
| `src/components/__tests__/PartnershipTaxReturn.test.tsx` | Renderer tests |
| `src/components/PrintBanner.tsx` (NEW) | Top-of-page print banner + per-form variant |
| `src/components/AnomalyBadge.tsx` (NEW) | Inline yellow Anomaly badge reused across all 5 form renderers |
| `src/components/AssumptionsBlock.tsx` (NEW) | Form I "Assumptions used" boxed section |
| `src/styles/print.css` (NEW) | Shared `@media print` rules + per-form CSS classes |

## Integration Points

- v3→v4 migration runs during `migrate()` in `src/lib/migrations/index.ts`. Two new optional Entity fields. CURRENT_VERSION bumps 3→4.
- `src/lib/schemas.ts` (Zod) widens for v4 (`aggregatedTurnover?: z.string().optional()`, `paygInstalmentAmount?: z.string().optional()`).
- `src/lib/coa/index.ts` `getDefaultCoaFor()` unchanged. Phase 5 reads existing CoA tax-label mappings.
- Each compute*Return() function takes the same signature: `(entity: Entity, accounts: Account[], entries: JournalEntry[], periodOrFy: Period | FyYear) → ComputedReturn<FormLabels>`. Pure; no React; no I/O.
- Each return-renderer component takes the same shape props: `{ entity, accounts, entries, period }` and internally calls the compute*() function with `useMemo` for re-render efficiency.
- `Entity.lockedFys` is READ-ONLY in Phase 5 — compute*() functions still produce output for locked FYs; the Print button shows "Print finalised return" with a "LOCKED FY" banner tag.
</code_context>

<deferred-ideas>
Captured but not in Phase 5 scope:

- **`@react-pdf/renderer` PDF generation** — Phase 6 (verify React 19 compat first); current v1 ships browser print only
- **Full BAS** (G2/G3/G10/G11 lodgement) — v2; Phase 5 ships Simpler BAS only with G2/G3/G10/G11 as internal-only working-paper labels
- **Family Medicare levy thresholds** — Phase 6 wizard or v2; Phase 5 ships single-only + family-flat-2% + warning
- **Trust streaming sharePerType UI editing + Subdiv 115-C/207-B render** — v2; Phase 5 ships sharePercent-only UI + mandatory "streaming not supported" disclaimer
- **Non-portfolio dividend BRE exception (s.23AB per-account)** — v2; Phase 5 conservative all-dividends-as-BREPI + Anomaly flag
- **`Entity.returnStatusByFy` draft/finalised lifecycle** — Phase 6 year-end wizard
- **Multi-FY rate switching UI** — Phase 6 (Phase 5 ships fy2026 only; module pattern accommodates)
- **PAYG instalment Method 2 (income × rate)** — v2; Phase 5 ships Method 1 only
- **Auto-switch Simpler ↔ Full BAS by turnover** — v2; Phase 5 is Simpler-only
- **CGT cost-base / capital-allowances depreciation engines** — out of v1; user supplies depreciation via journals
- **FBT (Fringe Benefits Tax)** — out of v1 entirely
- **Direct myGov / ATO lodgement** — out of v1 (likely v2)
- **Spouse income / dependant fields on Entity** — v2 (drives proper Medicare + tax-offset calculations)
- **Form Z (SMSF)** — out of v1
</deferred-ideas>

<validation_targets>
## Phase 5 Success Criteria (verbatim, for /gsd:plan-phase to map tasks to)

1. **BAS labels to the cent vs hand-calculated:** A BAS produced for a period with a mix of GST-taxable, GST-free (FRE), and input-taxed (INP) transactions shows correct values for G1, G2, G3, G10, G11, 1A, 1B, W1, W2, and T7; the totals match a hand-calculated reference to the cent. **Scope-note:** under Simpler BAS, G2/G3/G10/G11 are shown in the working paper as "internal only — not lodged"; the values must still be CORRECT for the working paper to be useful.
2. **Company BRE-derived rate + 90%-dividend test:** A Company return shows the tax rate (25% or 30%) derived from the Base Rate Entity test with its basis stated explicitly ("25% applied — passive income X% of total revenue, below 80% threshold"); a unit test confirms a 90%-dividend-income company triggers 30%.
3. **Trust per-beneficiary distribution + streaming disclaimer:** A Trust return includes a per-beneficiary distribution statement that reconciles to the trust's net income; a mandatory streaming disclaimer is visible on the output.
4. **Individual: B&P schedule + marginal-rate tax + LITO + Medicare:** An Individual return populates all business-schedule labels (P1, P2, P8, item 15) from the entity's GL and calculates marginal-rate tax payable using FY-versioned brackets including LITO and Medicare levy.
5. **Print output structure:** The print output (via browser print or `@media print` CSS) for any return type shows ATO field codes alongside plain-English labels (e.g. "Gross business income (P1): $142,000"), contains the working-paper disclaimer, and contains no screen UI chrome (sidebar, nav buttons, hover states).

## Validation Architecture (research-aligned + planner cues)

- **Pure compute*Return() functions** unit-tested with golden fixtures. Per-form test file. Tests use the existing Phase-2 fixtures pattern from `src/lib/tax/__tests__/`.
- **Rate-helper unit tests** at boundaries: bracket transitions ($45k, $135k, $190k); LITO tapering crossover ($37,500 then $45,000); LITO cutout ($66,667); Medicare shading-in ($27,222 → upper bound); MLS tiers ($101k / $118k / $144k); BRE 80% bright-line; small-business-offset $1,000 cap + $5M turnover cutoff.
- **Golden Form-level tests**:
  - Individual: sole trader with $50k revenue + $20k expenses + $30k net SB income → P1=50000, P2=20000, P8=30000, item 15=30000; tax payable computed via marginal + LITO + Medicare with the assumption block printed.
  - Company: $1M revenue (10% passive) + $700k expenses → Form C item 6=1000000, item 7=700000, item 7S=300000; BRE pass (passive < 80%, turnover < $50M) → 25% applied; tax = $75,000.
  - Company 90%-dividend test: $1M revenue (90% dividend income) → BRE fail (passive > 80%) → 30% applied → success criterion #2 verifies this case.
  - Trust: $200k net income + 2 beneficiaries (Alice 60%, Bob 40%) → distribution Alice $120,000, Bob $80,000, reconciles to $200,000.
  - Partnership: $300k net income + 2 partners (each 50%) → distribution $150k each.
  - BAS: mixed GSTABLE + FRE + INP scenario from a fixture (provided by Wave 0); G1, 1A, 1B match hand-calculated to-the-cent.
- **Print test (smoke):** render each form, call `window.print()` via test-injected stub, assert `@media print` CSS applies. (Full visual snapshot deferred — testing print rendering across browsers is Phase 6's concern.)
- **Migration test:** v3 → v4 round-trip; defaults applied correctly; no field removals.
- **Manual UAT (planner designs):** create one of each entity type, post realistic journals, generate each return, verify ATO codes visible + disclaimer + assumptions block + anomaly flags; print + visually inspect; confirm Form T streaming disclaimer when applicable; confirm Form C BRE-rate basis text when applicable; verify the IND-04 small-business offset applies/doesn't apply correctly.
</validation_targets>

<open-questions>
## Locked questions from research (resolved here)

| Question | Resolution |
|----------|------------|
| COY-04 mis-scope | Re-scope to IND-04 (small business income tax offset, individuals only, item 7D on Form I) |
| BAS scope | Simpler BAS only; G2/G3/G10/G11 still computed as working-paper internal-only |
| Family Medicare levy | Single thresholds + flat 2% for families + visible warning |
| Entity.aggregatedTurnover | Auto-compute from Revenue + user override field |
| PAYG T7 | Method 1 only (stored amount on Entity) |
| returnStatusByFy | Deferred to Phase 6 |
| Print button | Per-form button on each return view |
| Anomaly flag visibility | All flags included in print + inline badges |
| Disclaimer placement | Top banner page 1 + footer every page |
| BRE non-portfolio exception | Conservative all-dividends-as-BREPI + Anomaly when borderline |
| LITO/Medicare assumption disclosures | Explicit "Assumptions used" boxed section on Form I print |
| Trust streaming UI | Keep sharePercent-only; print mandatory streaming disclaimer |
| New library deps | Zero — pure-function compute + React + `@media print` CSS |
| NAT numbering correction | Wave 0 fix in `src/lib/tax/labels/fy2026.ts` (Individual 2541/2543, Trust 0660, Partnership 0659) |
| BRE legislative cite | Wave 0 fix: `Income Tax Rates Act 1986 s.23AA + s.23AB` (not ITAA 1997) |

## Remaining open for planner judgement

| Question | Note |
|----------|------|
| Family-shading upper Medicare threshold | Wave 0 reconciles between $34,028 and $36,509 per current ATO publications. Research flagged MEDIUM confidence. |
| Form C exact reconciliation labels | Research flagged MEDIUM confidence (full 2025 ATO PDF not retrievable via web search). Wave 0 must cross-check item 6 / 7 / 7S exact wording against current ATO publication. |
| Wave structure | Planner decides plan count + Wave 0 scope (likely Wave 0 = rate helpers + v3→v4 migration + types + golden fixtures + NAT corrections; Wave 2 = form compute functions in parallel groups; Wave 3 = renderers + print CSS + UAT). |
| Phase 5 test count target | Phase 4 ended at 371 SPA + 18 server GREEN. Phase 5 likely adds 60–100 SPA tests (rate helpers, compute functions, renderers, migration). |
| Order of form ship: alphabetic vs by-dependency | Plans 02-3/02-4 historically did all four forms in parallel after the foundation lands; planner likely follows same pattern. |
</open-questions>

---

*Context gathered through 4 gray-area deep-dives (12 sub-decisions) on 2026-05-13. Three additional in-repo corrections surfaced by research land as Wave 0 hygiene. Next step: `/gsd:plan-phase 5` produces the executable plan(s) (likely 4 plans across 3 waves given the surface area — comparable to Phase 4's 4-plan / 3-wave structure).*
