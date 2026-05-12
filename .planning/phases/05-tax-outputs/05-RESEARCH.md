---
phase: 5
slug: tax-outputs
type: research
mode: ecosystem
status: complete
created: 2026-05-13
researcher: claude (gsd-phase-researcher)
---

# Phase 5: Tax Outputs — Research

**Researched:** 2026-05-13
**Domain:** Australian tax-return working-paper generation (Forms I + B&P, C, T, P, BAS/IAS) from a posted GL for FY2025-26
**Confidence:** HIGH for rate tables, label codes, BRE test, trust streaming framework. MEDIUM for exact Form C reconciliation labels (full instructions PDF not retrievable via web search). MEDIUM for COY-04 mapping (small-business income tax offset is INDIVIDUAL/sole-trader scoped, not Company — flag for `/gsd:discuss-phase`).

## Summary

Phase 5 ships the working-paper layer on top of a fully functional FY2026 GL. The build is **almost entirely additive logic + render components** — no new runtime dependencies are required. The high-risk pillar is **tax-rule accuracy**, not architecture: the marginal-rate / LITO / Medicare-levy / BRE / trust-streaming rules each have non-obvious edges that an unaided developer routinely gets wrong. Web-verified ATO publications for FY2025-26 (income year 1 Jul 2025 – 30 Jun 2026) supply the canonical rate tables; this RESEARCH.md transcribes them with explicit confidence ratings and source URLs so the planner can pin exact constants in `src/lib/tax/labels/fy2026.ts` and the new `src/lib/tax/returns/fy2026/*` modules.

Three corrections to in-repo assumptions surface during research and should propagate cleanly into Phase 5:

1. **NAT-number map** in `src/lib/tax/labels/fy2026.ts` comments is stale (says Individual = NAT 0660). Phase 4 04-CONTEXT.md fixed this in the CoA module but the Phase-2 labels file still carries the wrong comments. **Correct mapping: Individual main = NAT 2541; B&P schedule = NAT 2543; Company = NAT 0656; Trust = NAT 0660; Partnership = NAT 0659.**
2. **BRE legislative cite** is *Income Tax Rates Act 1986* s. 23AA (BRE definition) and s. 23AB (BREPI definition) — **NOT** ITAA 1997. The existing comment on `BRE_PASSIVE_THRESHOLD` says "ITAA 1997 s 23AA" which is wrong; ITAA 1997 doesn't have those sections.
3. **Small business income tax offset (COY-04 in REQUIREMENTS.md)** is for **INDIVIDUALS / sole traders** — 16% × net small-business income, capped at $1,000, aggregated turnover < $5M. Companies do NOT get this offset; they get the 25% BRE rate (or 30%) only. The requirement text "User can apply the small business tax offset where eligible (item 7D)" is mis-scoped to Company; the offset belongs in the Individual return, not Form C. Flag for `/gsd:discuss-phase 5` to confirm: either move COY-04 to IND-04 or treat it as out-of-scope for Phase 5.

**Primary recommendation:** Adopt a one-module-per-FY-per-form structure in `src/lib/tax/returns/fy2026/{individual,company,trust,partnership,bas}.ts`. Each module exposes a pure `compute*Return(input)` function that returns a label-keyed `Map<LabelCode, LabelResult>` plus a typed `meta` block (rate basis, applied offsets, streaming disclaimers, anomaly flags). The thin Phase-2 stubs in `src/lib/tax/{individual,company,trust,partnership,bas}.ts` become re-exports / wrappers that dispatch to the FY-versioned module by `input.fy`. Browser print + `@media print` CSS (no PDF lib) covers TAX-02. Zero new npm dependencies.

<user_constraints>
## User Constraints (from CONTEXT.md)

> **Note:** No `05-CONTEXT.md` exists yet. CONTEXT below is reconstructed from the prompt's `<additional_context>`, `<key_insight>`, ROADMAP.md, STATE.md, and Phase 4's CONTEXT.md / UAT.md. The planner should run `/gsd:discuss-phase 5` to surface anything the user wants to lock or defer that the orchestrator's reconstruction missed.

### Locked Decisions (carried forward from prior phases)

- **All money math via decimal.js** (Phase 1). Serialised as 2dp strings; the boundary is `src/lib/money.ts`. Banker's rounding (ROUND_HALF_EVEN) is the global default. Phase 5 must NEVER use raw JS arithmetic on tax figures.
- **All dates flow through `src/lib/period.ts`** (Phase 2). Structural lint forbids parameterless `new Date()` outside period.ts. Phase 5 quarter / FY math reuses `fyBoundaries()`, `quarterBoundaries()`, `isInPeriod()`.
- **Tax labels FY-versioned**; current is `src/lib/tax/labels/fy2026.ts`. Phase 5 ships `src/lib/tax/returns/fy2026/{individual,company,trust,partnership,bas}.ts` — one file per form per FY.
- **StorageAdapter is FINAL** from Phase 3 (12 methods, including `saveAuditLogs`). Phase 5 **MUST NOT** widen the adapter interface. Phase 5 reads existing collections (accounts, journals, entities) and writes via `appendAuditLog` only.
- **AI features remain optional** (FND-04 / Phase 1+2+3). Phase 5 introduces zero AI dependencies. Compute functions are deterministic.
- **Brownfield preservation.** Tax-component UI surfaces already exist as Phase-2 thin renderers consuming the stubs: `src/components/TaxReturnAssistant.tsx` (Individual), `src/components/CompanyTaxReturn.tsx`, `src/components/TrustTaxReturn.tsx`, `src/components/BasIasAssistant.tsx`. Phase 5 **refactors these to call the new compute*Return() functions; it does NOT replace them.** Add a new `src/components/PartnershipTaxReturn.tsx` (no prior placeholder).
- **Print-CSS first, `@react-pdf/renderer` deferred to Phase 6** pending React-19 compatibility verification. TAX-02 satisfied via `@media print` CSS + a print-only working-paper layout component.
- **Working-paper disclaimer must persist** on every tax-output surface AND on print. `DisclaimerFooter.tsx` already exists; Phase 5 adds a print-only equivalent block (the screen footer is `position: relative` and will not render correctly on print; a separate `PrintDisclaimer` component with `@media print` rules is required).
- **`Entity.lockedFys: string[]`** shipped in Phase 4 (schema-only); Phase 5 compute functions **MUST** respect it: if the FY is locked, render a "Locked FY — read-only" badge and surface in returned `meta`. Phase 6 wizard writes the field; Phase 5 only reads.
- **`BeneficiaryRow.sharePerType?` + `PartnerRow.sharePerType?`** shipped in Phase 4 as the streaming-override hook. Phase 5 Trust UI exposes these (income classes: `interest | dividend | capitalGain | foreign | other`).
- **AuditAction enum is wide enough** (`EXPORT_DATA`, `LOCK_FY`, `UNLOCK_FY` already present from Phase 4). Phase 5 emits `EXPORT_DATA` when the user prints / exports a return. No further enum widening.

### Claude's Discretion (Phase 5 design freedom)

- **Module shape inside `src/lib/tax/returns/fy2026/`** — single-export pure function vs. multiple exports per form. Recommendation in this RESEARCH: single `compute{Form}Return(input): {Form}ReturnResult` per file.
- **Print layout** — single shared `<WorkingPaperLayout>` wrapping all five form renderers, or per-form layouts. Recommendation: single shared layout with form-specific slots; Tailwind v4 `print:` variants in addition to `@media print` CSS in `index.css`.
- **BRE wizard UX** — fully automated (compute passive-income % from journals) vs. user-confirmed (compute auto, ask user to confirm before applying rate). Recommendation: compute auto from journals, show the breakdown, require an explicit "Apply 25%" / "Apply 30%" button on the Company return surface; rate is derived from journals but the explicit-application step gives the user a paper trail.
- **Per-beneficiary distribution UI** — inline editor on the Trust return surface vs. read-only "imported from beneficiary register" display. Recommendation: read-only display sourced from `Entity.beneficiaries` + new `sharePerType` UI added on the Entity register (Phase 5 UI work spans both surfaces).
- **CSV export of BAS / each return** (the FND-02 carry-forward from Phase 3) — Phase 5 covers BAS CSV export at minimum; per-return CSV is nice-to-have. Recommendation: ship BAS CSV (small format, deterministic); defer per-return CSV to Phase 6 if scope tightens.
- **Anomaly flags** — Phase 6 lands UX-02 but Phase 5 compute functions are the right surface to *detect* anomalies. Recommendation: compute functions return a `meta.anomalies: AnomalyFlag[]` array; Phase 5 surfaces them as warning chips; Phase 6 hangs the dedicated UX-02 anomaly panel off the same data.

### Deferred Ideas (OUT OF SCOPE — explicit deferrals per ROADMAP + STATE)

- **`@react-pdf/renderer` integration** — Phase 6 (pending React-19 compat verification per ROADMAP research flag).
- **Year-end wizard / persona modes** — Phase 6 (UX-01, PERS-01..03).
- **Multi-FY rate switching UI** — Phase 6. Phase 5 ships FY2026 only; the FY-versioned module pattern accommodates future FYs without breaking change.
- **Direct myGov / ATO API lodgement** — out of v1 entirely (and likely v2; this is a tax-agent path, not a working-paper path).
- **ABN-lookup / GST-registration validation against external APIs** — Phase 1 locked: format checks only.
- **CGT calculation engine** — Subdiv 115-C streaming is in scope (per-class income breakdown for trust beneficiaries), but **CGT events themselves** (acquisition/disposal cost-base computation, indexation, discount, small-business CGT concessions) are OUT OF v1. User must supply CGT figures via journal entries to an account mapped to the "Net capital gain" label.
- **Capital-allowances depreciation engine** — out of v1. User supplies depreciation via journals; Phase 5 reads them; Phase 5 does NOT compute Div 40 / Div 43 schedules.
- **Fringe Benefits Tax (FBT)** — out of v1 entirely.
- **Franking deficit tax (FDT) return** — separate ATO form (Franking account tax return). Phase 5 computes franking-account year-end balance and surfaces "FDT may apply if balance is in deficit at year-end" warning, but does NOT generate the FDT return itself.
- **Trust streaming for foreign income** — `BeneficiaryRow.sharePerType.foreign` is shipped as a hook, but Phase 5 implementation can leave the UI input present-but-validated only; full foreign-tax-offset attribution is a v2 surface.
- **Personal Services Income (PSI) determination** — Part B item P1 of the B&P schedule (PSI yes/no, results test, etc.) is out of v1; if the user has PSI they should engage a tax agent. Surface as a one-line note.
- **Loss carry-back / loss carry-forward** — Phase 5 computes a taxable-income figure; carry-back election (Coy) and loss-carry-forward bookkeeping are out of v1. User adjusts via journal.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| **BAS-01** | BAS labels G1, G2, G3, G10, G11, 1A, 1B (full method, GST turnover ≥ $10M OR user-elected) | "ATO Field Codes & Label Catalogue" § BAS; "Code Examples" § BAS G1/1A; cite ATO BAS instructions + Simpler-BAS guidance |
| **BAS-02** | ATO worksheet method with GST codes + decimal arithmetic | "Don't Hand-Roll" § GST rounding; `src/lib/money.ts` provides `gst()` helper with `ROUND_HALF_EVEN`; per-line rounding before aggregation |
| **BAS-03** | PAYG withholding labels W1, W2 (and W3 / W4 / W5 if needed — see "ATO Field Codes" § BAS) | "ATO Field Codes" § BAS; W5 = W2 + W3 + W4; Phase 4 CoA has Wage/PAYG-Withholding accounts pre-mapped |
| **BAS-04** | PAYG instalment label T7 (option-1 method = ATO-calculated instalment amount) — and optionally T1/T2 (option-2 rate method) | "ATO Field Codes" § BAS; T7 default; T1/T2 deferred to Phase 6 (most SMEs use option 1) |
| **BAS-05** | IAS for entities not GST-registered (PAYG-only) | "Architecture Patterns" § IAS dispatch; same compute path, GST labels suppressed |
| **BAS-06** | Print-ready BAS/IAS export with ATO field codes | "Architecture Patterns" § Print-CSS persistent disclaimer; `<PrintWorkingPaper>` shared layout |
| **TAX-02** | Print-ready tax return (browser print acceptable per ROADMAP) | "Standard Stack" § Zero new deps; "Code Examples" § Print-CSS; `@media print` rules + Tailwind `print:` variants |
| **IND-01** | Form I + B&P schedule populated from GL | "ATO Field Codes" § Individual (NAT 2541 + 2543); "Code Examples" § compute label rollup |
| **IND-02** | B&P schedule labels P1, P2, P8 + item 15 flow-through | "ATO Field Codes" § Individual P1/P2/P8; item 15 = NIBI flow into main return |
| **IND-03** | Marginal-rate calc + LITO + Medicare levy | "Current FY2026 Rate Tables" § Individual brackets, LITO, Medicare; "Code Examples" § marginal-rate / LITO / Medicare helpers |
| **COY-01** | Form C core labels (gross sales item 6, total expenses item 7, taxable income calc) | "ATO Field Codes" § Company (NAT 0656); confidence MEDIUM on exact reconciliation labels — verify against the 2025 PDF before final pin |
| **COY-02** | BRE-derived rate (25%/30%) with explicit basis | "BRE Test" § passive-income definition; "Code Examples" § BRE pure function; 90%-dividend → 30% golden test |
| **COY-03** | Franking-account opening / movements / year-end balance | "ATO Field Codes" § Company franking-account; Phase 4 CoA account 3090 "Franking Account Balance" pre-shipped |
| **COY-04** | Small-business tax offset (item 7D) | **RESEARCH FINDING: this offset is for individuals/sole traders, not companies.** Flag for `/gsd:discuss-phase 5`. Recommendation: re-scope as IND-04, OR carve out for "Personal Services Entity"-style company offsets (which don't apply at SME scale). See "Confidence & Open Questions" § COY-04. |
| **TRT-01** | Form T net income / deductions / taxable income | "ATO Field Codes" § Trust (NAT 0660); current Phase-2 stub computes this shape; Phase 5 hardens with full label set |
| **TRT-02** | Per-beneficiary distribution statement reconciling to trust net income | "Trust Streaming & Division 6 Boundaries"; "Code Examples" § per-beneficiary distribution helper |
| **TRT-03** | Distribution sourced from `Entity.beneficiaries` (ENT-07) | `BeneficiaryRow.sharePercent` + `sharePerType?` (Phase 4 hook); Phase 5 reads both |
| **PSP-01** | Form P income / deductions / net income or loss | "ATO Field Codes" § Partnership (NAT 0659) |
| **PSP-02** | Per-partner distribution statement | `Entity.partners` (Phase 4); same pattern as TRT-02 but simpler (no streaming) |
</phase_requirements>

## Standard Stack

### Core (no new runtime dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| decimal.js | already pinned (Phase 1) | All money math; ROUND_HALF_EVEN global | Avoids GST-rounding drift; pure-function-friendly |
| React 19 | already pinned | Render layer for compute*() outputs | Phase 1+2 brownfield asset |
| Tailwind v4 | already pinned | `print:` variants + `@media print` block in `index.css` | Print-CSS layout system already in place |
| Vitest | already pinned | Golden-output tests per form | Phase 1 infra |

### Supporting (already in repo — verify usage)

| Library | Purpose | When to Use |
|---------|---------|-------------|
| `src/lib/period.ts` | FY / quarter / custom-range filtering | Every compute*() function takes `input.period` and filters journals via `isInPeriod()` |
| `src/lib/money.ts` | Decimal boundary + `gst()` helper | All label values are `Decimal`; serialise to 2dp strings only at the JSX boundary |
| `src/lib/tax/labels/fy2026.ts` | FY-versioned label metadata + rate constants | Phase 5 widens this file with the new labels listed under "ATO Field Codes" below |
| `src/lib/coa/fy2026/*` | Account → label pre-mappings | Phase 5 compute*() reads `account.taxLabel / companyTaxLabel / trustTaxLabel / partnershipTaxLabel` |
| `src/components/DisclaimerFooter.tsx` | Persistent screen-mode disclaimer | Continues to mount on every view; **NEW**: `<PrintDisclaimer>` print-only twin added in Phase 5 |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Browser print + `@media print` CSS | `@react-pdf/renderer` | PDF lib provides finer typography control + page-break determinism, but requires a separate layout model (no Tailwind classes) and React-19 compat verification. Deferred to Phase 6 per ROADMAP. |
| Browser print + `@media print` CSS | `react-to-print` library | Adds 0 new value over `window.print()` + CSS for our use case; an extra dependency for a button-click trigger we can do in 3 lines. Not worth it. |
| Hand-rolled marginal-rate / LITO / Medicare math | A tax-calc npm library (e.g. various AU-tax-calculator packages on npm) | None of the existing libraries are reputable, maintained, or test-covered to the standard we need. The math is small enough (5 brackets + 2-stage LITO taper + 1-stage Medicare-levy shade-in) that hand-rolling with golden tests is safer and avoids supply-chain risk. |

**Installation:**
```bash
# No new dependencies required. Phase 5 is additive logic + UI.
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── lib/
│   └── tax/
│       ├── labels/
│       │   └── fy2026.ts                   # WIDEN: add full label catalogues per "ATO Field Codes" §
│       ├── returns/
│       │   └── fy2026/                     # NEW Phase 5 directory
│       │       ├── individual.ts           # computeIndividualReturn(input) — full NAT 2541 + 2543 logic
│       │       ├── company.ts              # computeCompanyReturn(input) — NAT 0656 + BRE rate derivation
│       │       ├── trust.ts                # computeTrustReturn(input) — NAT 0660 + per-beneficiary distribution
│       │       ├── partnership.ts          # computePartnershipReturn(input) — NAT 0659 + per-partner distribution
│       │       └── bas.ts                  # computeBasReturn(input) — NAT 4189 family (BAS + IAS dispatch)
│       ├── rates/
│       │   └── fy2026/                     # NEW — pure-function helpers reusable across return types
│       │       ├── marginal.ts             # marginalTaxFY2026(taxableIncome): Decimal
│       │       ├── lito.ts                 # litoFY2026(taxableIncome): Decimal
│       │       ├── medicareLevy.ts         # medicareLevyFY2026(taxableIncome, mlsTier): { levy, surcharge }
│       │       └── bre.ts                  # breTestFY2026(assessableIncome, brepiTotal, aggregatedTurnover): { rate, basis }
│       ├── individual.ts                   # KEEP (Phase 2 stub) — refactor to re-export FY-versioned module
│       ├── company.ts                      # KEEP — re-export
│       ├── trust.ts                        # KEEP — re-export
│       ├── partnership.ts                  # KEEP — re-export
│       └── bas.ts                          # KEEP — re-export
└── components/
    ├── DisclaimerFooter.tsx                # KEEP (screen)
    ├── PrintDisclaimer.tsx                 # NEW — print-only twin with @media print rules
    ├── WorkingPaperLayout.tsx              # NEW — shared <main> wrapper for all 5 print forms
    ├── TaxReturnAssistant.tsx              # REFACTOR — consume computeIndividualReturn() + add print mode
    ├── CompanyTaxReturn.tsx                # REFACTOR — consume computeCompanyReturn() + BRE wizard inline
    ├── TrustTaxReturn.tsx                  # REFACTOR — consume computeTrustReturn() + beneficiary distribution table
    ├── PartnershipTaxReturn.tsx            # NEW — no prior placeholder
    ├── BasIasAssistant.tsx                 # REFACTOR — consume computeBasReturn() + IAS dispatch
    └── BreWizard.tsx                       # NEW — inline form inside CompanyTaxReturn, NOT a separate route
```

### Pattern 1: Label-driven DSL — one pure function per form per FY

**What:** Each `computeXReturn(input)` is a pure function. Input is `{ fy, entries, accounts, period, entity? }`. Output is `{ labels: Record<LabelCode, LabelResult>, meta: ReturnMeta }`. The function:

1. Filters journals to `input.period` via `isInPeriod()`.
2. Excludes journals with `status === 'superseded' | 'voided' | 'draft'` (Phase 4 invariant — UAT step 18 carried risk).
3. Excludes journals where `entry.replacedByEntryId` is set (defence-in-depth).
4. For each posted journal line, looks up `account.{taxLabel|companyTaxLabel|trustTaxLabel|partnershipTaxLabel}` per the form.
5. Applies polarity per `account.type` (Revenue → credit-debit; Expense → debit-credit).
6. Aggregates into `Map<LabelCode, Decimal>`; computes derived labels (totals, taxable income).
7. Returns the label map + meta (rate basis, applied offsets, anomaly flags, streaming notes).

**When to use:** Every Phase 5 form computation.

**Why this scales:** Identical input contract across all 5 forms means a single golden-test fixture pattern (fixture journals + accounts + expected label map) works for all of them.

### Pattern 2: FY-versioned module — copy-and-edit migration each FY

**What:** When FY2027 lands (1 Jul 2026 – 30 Jun 2027), the team copies `src/lib/tax/returns/fy2026/` → `src/lib/tax/returns/fy2027/` and edits the rate tables. The form code itself rarely changes year-to-year; the brackets, LITO thresholds, Medicare levy thresholds, BRE turnover threshold, and any new/removed label IDs are the points of churn. A new `src/lib/coa/fy2027/` may or may not be needed (only if the CoA's pre-mappings change).

**When to use:** Each ATO FY release. **Documented as the annual-refresh process** for Pitfall 6 (stale labels) — Phase 5 ships the documentation.

### Pattern 3: Print-CSS persistent disclaimer

**What:** Mount `<PrintDisclaimer>` once inside `<WorkingPaperLayout>`. The component uses `@media print` rules (set in `src/index.css`) to position itself `position: fixed; bottom: 0` on every printed page, with `display: none` on screen (the screen-mode `<DisclaimerFooter>` handles that surface).

```css
/* src/index.css — additions for Phase 5 */
@media print {
  @page { size: A4 portrait; margin: 15mm 12mm 25mm 12mm; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .print-disclaimer {
    position: fixed; bottom: 0; left: 0; right: 0;
    border-top: 1pt solid #999; padding: 4pt 8pt;
    font-size: 8pt; color: #555; background: white;
  }
  .working-paper { page-break-inside: avoid; }
  h1, h2, h3 { page-break-after: avoid; }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
}
@media screen { .print-only { display: none; } }
```

**When to use:** Every printed working paper.

### Pattern 4: BRE wizard — derive-but-confirm

**What:** `breTestFY2026(input)` is a pure function that takes (aggregatedTurnover, totalAssessableIncome, brepiTotal) and returns `{ rate: '0.25' | '0.30', basis: string, isBre: boolean }`. The Company return surface auto-computes the values from journals (BREPI from accounts mapped to `companyTaxLabel === '6F'` or to specific "passive" CoA codes like 4200/4210/4220), shows the breakdown to the user, and offers a single "Apply 25%" or "Apply 30%" button. **Rate is never silently applied** — the user click is the audit-trail event. Audit log records `EXPORT_DATA` with details JSON: `{ form: 'NAT 0656', fy: 'FY2026', breRate: '0.25', breBasis: 'passive income 12.3% < 80% threshold' }`.

**When to use:** Company return only.

### Pattern 5: Per-beneficiary / per-partner distribution table

**What:** A pure helper `distributeNetIncome(netIncome, beneficiaries, incomeBreakdown?)` returns `Array<{ beneficiaryId, name, share, components: { ordinary, interest, dividend, franked, capitalGain, foreign, other } }>`. For "no streaming" mode (Phase 5 baseline), `components` is all in `ordinary` and equals `netIncome × beneficiary.sharePercent`. For streaming mode (Phase 5 if user fills `sharePerType`), each income class is distributed per its own share-per-type and `ordinary` is the residual. **The function asserts** that the sum of beneficiary shares is 100.00 ± 0.005% (decimal-tolerant) and that for each streamed class, the per-class shares sum to 100.00 ± 0.005%. Anomaly flags are added to `meta.anomalies` if either check fails.

**When to use:** Trust + Partnership returns.

### Pattern 6: IAS dispatch within BAS module

**What:** `computeBasReturn({ entity, ... })` dispatches at the top: if `entity.gstRegistered === false`, return only the PAYG labels (W1/W2/W3/W4/W5/T7) and mark `meta.shape: 'IAS'`. If `gstRegistered === true`, return the full BAS shape (G1/G2/G3/G10/G11/1A/1B/W1/W2/T7) and `meta.shape: 'BAS'`. Same compute function; the entity's GST flag drives which labels are populated.

**When to use:** BAS-05 (IAS) lives inside the same module as BAS-01..04, not a separate file.

### Anti-Patterns to Avoid

- **Inlining marginal-rate math inside the Individual compute function.** It's a separate concern; put it in `src/lib/tax/rates/fy2026/marginal.ts` so the Company return (which may need it for some imputation paths in v2) and any future Trustee-Assessment surface can reuse it.
- **Returning `number` from compute functions.** Every label value is `Decimal` (per Phase 1 invariant); convert with `.toFixed(2)` at the JSX boundary only.
- **Applying a 25% BRE rate without showing the basis.** Per Success Criterion #2, the basis ("25% applied — passive income 12.3% < 80% threshold") MUST appear on the return summary.
- **Silently distributing trust net income equally without checking `sharePercent` totals.** Anomaly flag required.
- **Computing GST as `amount / 11` without rounding.** Per-line round to 2dp BEFORE aggregation; use `src/lib/money.ts` `gst()` helper.
- **Reading `localStorage` or calling `fetch` inside compute*() functions.** Compute is pure; data is passed in.
- **Hardcoding the FY year inside compute functions.** `input.fy` is always passed; the compute*() module is FY-stamped at the file level (`returns/fy2026/`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation in Phase 5 | A custom PDF renderer | Browser print + `@media print` CSS (Phase 5); `@react-pdf/renderer` in Phase 6 | PDF layout is its own design model; v1 print-CSS gets the user from A → B for free |
| LITO tapering math | Approximate "if income > $45k then $700/2" | Exact ATO two-stage formula in `src/lib/tax/rates/fy2026/lito.ts` | Approximations drift; users transcribe wrong numbers into myGov |
| Medicare levy shade-in | Hardcoded "2% always" | Exact threshold + 10c/$1 shading-in formula in `medicareLevy.ts` | Low-income earners get wrong levy → audit-flag risk |
| GST 1A computation | `amount * 0.1` JS native math | `gst(amountInclGST)` from `src/lib/money.ts` (Decimal `/11`, banker's rounding, 2dp) | Float rounding accumulates to wrong BAS totals (Pitfall 3, Phase 1 mitigation) |
| BRE passive-income classification | Best-guess "Revenue & Asset accounts only" | An explicit BREPI-tagged subset of the CoA — Phase 5 adds `Account.isBrepi?: boolean` to the seed for dividend/interest/rent/royalty/capital-gain accounts | The rule is bright-line; misclassification flips the rate 5pp |
| Trust streaming attribution | Treat all distributions as ordinary income | Subdiv 115-C (CGT) + Subdiv 207-B (franked) "specifically entitled" logic | Wrong streaming triggers s.99B trustee-tax-at-top-rate (47%) on misallocated amounts; v1 ships disclaimer + per-class breakdown, NOT silent omission |
| Print disclaimer positioning | `position: absolute` with screen-mode coordinates | `position: fixed; bottom: 0` inside `@media print` block | Absolute positioning shifts across pages; fixed-bottom in print context anchors per-page |
| ATO PDF generation | A myGov-compatible XBRL builder | Plain HTML + print-CSS for **working paper only** | Phase ships a working paper; myGov submission is out of v1 |
| Account-set filtering | New filter logic per compute*() function | A shared `accountsForLabel(accounts, labelKey, labelField)` helper | Avoids drift across the 5 form modules |
| BAS quarterly period math | Custom date arithmetic | `quarterBoundaries(fy, q)` from `src/lib/period.ts` | Existing test-seamable infrastructure |

**Key insight:** AU tax rules are arithmetic over a defined input set with well-publicised constants. The risk is in getting the **rule** right, not the **code** right. Phase 5 is 80% transcription of ATO documents into typed constants + golden tests, 20% UI and print-CSS. Library shopping is the wrong instinct.

## Common Pitfalls

### Pitfall 1: BRE rate applied as 25% unconditionally
**What goes wrong:** Company with passive-income majority (rental / dividend / interest) gets 25% applied → underpays tax by 5pp on full taxable income.
**Mitigation:** `breTestFY2026()` pure function; BREPI is computed from a specific CoA-account subset (dividend income, interest income, rent income, royalties, net capital gain accounts). Golden test: 90% dividend → 30% rate; 10% dividend → 25% rate. Basis displayed explicitly on Company return.

### Pitfall 2: Trust streaming omitted silently
**What goes wrong:** All trust income treated as undifferentiated → franked dividends streamed to high-income beneficiary lose their imputation effectiveness; capital gains lose CGT-discount streaming.
**Mitigation:** Mandatory "Streaming disclaimer" on every Form T print (text below). Per-class breakdown table in the distribution statement (`interest / dividend / franked / capitalGain / foreign / other`). `sharePerType` UI input on beneficiary register. Anomaly flag if `sharePerType` sums per-class don't reach 100%.

Streaming disclaimer copy (lock verbatim, source ATO trust-streaming guidance):
> *Trust capital gains and franked distributions can only be streamed to specific beneficiaries if the trust deed expressly permits streaming AND the trustee has made beneficiaries 'specifically entitled' to those amounts by the relevant ATO recording deadline (60 days for capital gains; end of income year for franked distributions). This working paper applies the per-income-class shares you have entered on the beneficiary register without verifying your trust deed. Consult your tax agent if you stream income.*

### Pitfall 3: Stale ATO label specs
**What goes wrong:** Code uses FY2024 label codes/wording on a FY2026 return → user transcribes into wrong myGov field.
**Mitigation:** All labels live in `src/lib/tax/labels/fy2026.ts` with `// Source: NAT XXXX FY2025-26 + URL` comments per label. Annual refresh process documented in Phase 5 SUMMARY (each June: copy `fy2026/` → `fy2027/`, edit, run golden tests, manual diff against ATO PDFs). **NAT-number reconciliation already needed in Phase 5:** the Phase-2 labels file mis-stamps Individual as NAT 0660 — must fix.

### Pitfall 4: GST decimal rounding accumulates wrong totals
**What goes wrong:** `amount / 11` in JS float math; 200-transaction BAS off by $1-$3; ATO reconciliation flag.
**Mitigation:** All GST math via `src/lib/money.ts` `gst()` helper (Decimal `/11`, `toDecimalPlaces(2)`, ROUND_HALF_EVEN). Per-line round to 2dp BEFORE aggregation. Golden test: 11-transaction BAS matches hand-calculated total to the cent.

### Pitfall 5: LITO tapering wrong
**What goes wrong:** Single-stage taper (5c/$1 across the whole $37,500–$66,667 range) → overstated offset for $45k–$66k earners.
**Mitigation:** Two-stage taper in `litoFY2026()`:
- `taxableIncome <= 37,500` → $700 max
- `37,500 < taxableIncome <= 45,000` → $700 - (taxableIncome - 37,500) × 0.05
- `45,000 < taxableIncome <= 66,667` → $325 - (taxableIncome - 45,000) × 0.015
- `taxableIncome > 66,667` → $0
Golden tests at each breakpoint + at $50,000 mid-range.

### Pitfall 6: Medicare levy surcharge ignored
**What goes wrong:** High-income earner without private hospital cover → MLS not applied → tax payable understated by 1–1.5%.
**Mitigation:** `medicareLevyFY2026({taxableIncome, hasPrivateHospitalCover, dependants})` returns `{ levy, surcharge }`. Surcharge tiers per the rate-table section below. If `hasPrivateHospitalCover === undefined`, surface anomaly flag "MLS depends on private hospital cover — please confirm".

### Pitfall 7: Franking-account drift across years
**What goes wrong:** Year-end franking-account balance computed from journals only, not carried-forward from prior year → balance drifts wrong.
**Mitigation:** `Account 3090 Franking Account Balance` (Phase 4 CoA) carries prior-year opening; Phase 5 computes net movements (franking credits received on dividends + tax paid that creates credits + dividends paid debits) and reports `{ opening, movements, closing }`. Surface "FDT may apply" warning if `closing < 0`.

### Pitfall 8: Beneficiary / partner share doesn't sum to 100%
**What goes wrong:** User registers 5 beneficiaries at 25% each (sums 125%) or 3 at 30% each (sums 90%) → distribution table double-counts or under-distributes.
**Mitigation:** Anomaly flag if `|sum(sharePercent) - 100| > 0.005`. Render warning on Trust / Partnership return; refuse to print until resolved (or print with red banner — chosen at planner discretion).

### Pitfall 9: Partnership loss not flowed through
**What goes wrong:** Partnership net loss → user expects loss flows to partners' individual returns; the working paper shows P8 = negative but distribution statement still says "Partner share = $X" with no loss-portion column.
**Mitigation:** `distributePartnershipNetIncome()` handles negative net income; statement explicitly labels "Loss share — to be claimed on each partner's individual return". Phase 5 prints the warning even if the user's partners aren't separate Entities in AussieLedger.

### Pitfall 10: Print output includes screen chrome
**What goes wrong:** Sidebar, action buttons, hover states bleed into print → ugly, unusable working paper.
**Mitigation:** `.no-print` class on every Phase 1–4 shell component (Sidebar, Header, BottomNav, action buttons, action toolbars). Phase 5 print mode enables `body.print-mode` class on a "Print" button click; layout collapses to `<WorkingPaperLayout>` only.

### Pitfall 11: Working-paper disclaimer absent on print
**What goes wrong:** Screen disclaimer is `position: relative` in the screen layout; print loses it (the screen layout isn't rendered in print mode).
**Mitigation:** Separate `<PrintDisclaimer>` print-only component with `position: fixed; bottom: 0` inside `@media print`. Disclaimer copy locked from Phase 1 `DisclaimerFooter.tsx`; do not paraphrase.

### Pitfall 12: Locked-FY return regenerated
**What goes wrong:** User locks FY2026; later they regenerate the Company return and the rate calc / journal data has shifted → mismatched working paper vs. lodged return.
**Mitigation:** Compute functions read `entity.lockedFys`; if `input.fy ∈ entity.lockedFys`, set `meta.locked = true` and surface "Locked FY — read-only working paper" banner. Phase 6 wizard writes the lock; Phase 5 only respects it.

### Pitfall 13: Sole-trader business loss claimed without non-commercial-losses test
**What goes wrong:** Sole trader runs an unprofitable business → claims the loss against PAYG salary income → ATO denies under Div 35 (non-commercial losses) if conditions not met.
**Mitigation:** **Out of scope for Phase 5 compute** — but surface a warning when P8 < 0: "Business loss detected. Non-commercial losses (Div 35) may restrict offset against other income. Consult your tax agent."

### Pitfall 14: Small business income tax offset mis-scoped to Company (REQUIREMENT BUG)
**What goes wrong:** COY-04 says "User can apply the small business tax offset where eligible (item 7D)" — but this offset is for **individuals/sole traders** (NAT 2541), not companies. Companies get the BRE rate (25%) only; there is no "item 7D small business offset" on Form C.
**Mitigation:** Flag during `/gsd:discuss-phase 5` to either (a) re-scope COY-04 → IND-04 and implement on Form I, OR (b) defer entirely if user agrees the requirement is mis-scoped. Recommendation: **re-scope to Individual** and implement properly there (max $1,000, 16% × net SB income, aggregated turnover < $5M).

## Code Examples

Verified patterns from ATO instructions + project conventions:

### Marginal-rate calc (Individual, FY2026 brackets)

```typescript
// src/lib/tax/rates/fy2026/marginal.ts
// Source: ATO "Tax rates – Australian resident" 2025-26
// https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents
import { Decimal } from '../../../money';

interface Bracket { upTo: Decimal; rate: Decimal; baseAt: Decimal; }
// Format: tax = baseAt + rate * (income - lowerBound)
const FY2026_BRACKETS: Bracket[] = [
  { upTo: new Decimal('18200'),  rate: new Decimal('0.00'), baseAt: new Decimal('0') },
  { upTo: new Decimal('45000'),  rate: new Decimal('0.16'), baseAt: new Decimal('0') },         // 16% from $18,201
  { upTo: new Decimal('135000'), rate: new Decimal('0.30'), baseAt: new Decimal('4288') },      // 4288 = 16% × (45000 - 18200)
  { upTo: new Decimal('190000'), rate: new Decimal('0.37'), baseAt: new Decimal('31288') },     // 31288 = 4288 + 30% × (135000 - 45000)
  { upTo: new Decimal('Infinity'), rate: new Decimal('0.45'), baseAt: new Decimal('51638') },   // 51638 = 31288 + 37% × (190000 - 135000)
];

export function marginalTaxFY2026(taxableIncome: Decimal): Decimal {
  if (taxableIncome.lessThanOrEqualTo(18200)) return new Decimal(0);
  const lowerBounds = [new Decimal(0), new Decimal('18200'), new Decimal('45000'), new Decimal('135000'), new Decimal('190000')];
  for (let i = 1; i < FY2026_BRACKETS.length; i++) {
    if (taxableIncome.lessThanOrEqualTo(FY2026_BRACKETS[i].upTo)) {
      const bracket = FY2026_BRACKETS[i];
      const lower = lowerBounds[i];
      return bracket.baseAt.plus(bracket.rate.times(taxableIncome.minus(lower))).toDecimalPlaces(2);
    }
  }
  // Above $190k
  const top = FY2026_BRACKETS[FY2026_BRACKETS.length - 1];
  return top.baseAt.plus(top.rate.times(taxableIncome.minus(190000))).toDecimalPlaces(2);
}
```

### LITO two-stage taper (Individual, FY2026)

```typescript
// src/lib/tax/rates/fy2026/lito.ts
// Source: ATO "Low income tax offset"
// https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset
import { Decimal } from '../../../money';

export function litoFY2026(taxableIncome: Decimal): Decimal {
  if (taxableIncome.lessThanOrEqualTo(37500)) return new Decimal('700');
  if (taxableIncome.lessThanOrEqualTo(45000)) {
    // Stage 1: $700 minus 5c per $1 above $37,500
    return new Decimal('700').minus(taxableIncome.minus(37500).times('0.05')).toDecimalPlaces(2);
  }
  if (taxableIncome.lessThanOrEqualTo(new Decimal('66667'))) {
    // Stage 2: $325 minus 1.5c per $1 above $45,000 (325 = 700 - 7500*0.05)
    return Decimal.max(0, new Decimal('325').minus(taxableIncome.minus(45000).times('0.015'))).toDecimalPlaces(2);
  }
  return new Decimal(0);
}
```

### Medicare levy + surcharge (Individual, FY2026)

```typescript
// src/lib/tax/rates/fy2026/medicareLevy.ts
// Source: ATO "Medicare levy reduction for low-income earners" + "Medicare levy surcharge income, thresholds and rates"
// https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners
// https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates
import { Decimal } from '../../../money';

interface MedicareLevyInput {
  taxableIncome: Decimal;
  hasPrivateHospitalCover: boolean;
  filingStatus: 'single' | 'family';
  // Family-specific: number of dependants beyond first child (each adds $1,500 to family threshold)
  dependants?: number;
}

// Single-taxpayer FY2026 thresholds (per ATO 2025-26 — confirmed shade-in formula 10c/$1)
const SINGLE_LOWER = new Decimal('27222');        // Below this → no levy (confidence MEDIUM — see Confidence section)
const SINGLE_UPPER = new Decimal('34028');        // Above this → full 2% levy
// MLS thresholds (singles): tier 1 / 2 / 3
const MLS_SINGLE_TIER_1 = new Decimal('101000');  // 1.0% from here
const MLS_SINGLE_TIER_2 = new Decimal('118000');  // 1.25% from here
const MLS_SINGLE_TIER_3 = new Decimal('144000');  // 1.50% from here
const MLS_FAMILY_TIER_1 = new Decimal('202000');
const MLS_FAMILY_TIER_2 = new Decimal('236000');
const MLS_FAMILY_TIER_3 = new Decimal('288000');

export function medicareLevyFY2026(input: MedicareLevyInput): { levy: Decimal; surcharge: Decimal; basis: string } {
  const { taxableIncome, hasPrivateHospitalCover, filingStatus } = input;

  // ── Levy ──
  let levy: Decimal;
  if (filingStatus === 'single') {
    if (taxableIncome.lessThanOrEqualTo(SINGLE_LOWER)) {
      levy = new Decimal(0);
    } else if (taxableIncome.lessThan(SINGLE_UPPER)) {
      // Shade-in at 10c per $1 above SINGLE_LOWER, capped at 2% × taxableIncome
      levy = Decimal.min(
        taxableIncome.minus(SINGLE_LOWER).times('0.10'),
        taxableIncome.times('0.02'),
      ).toDecimalPlaces(2);
    } else {
      levy = taxableIncome.times('0.02').toDecimalPlaces(2);
    }
  } else {
    // Family thresholds — confidence MEDIUM, planner to verify against ATO family-threshold table
    levy = taxableIncome.times('0.02').toDecimalPlaces(2);
  }

  // ── Surcharge ──
  let surcharge = new Decimal(0);
  let basis = `Levy 2% applied`;
  if (!hasPrivateHospitalCover) {
    const tier1 = filingStatus === 'single' ? MLS_SINGLE_TIER_1 : MLS_FAMILY_TIER_1;
    const tier2 = filingStatus === 'single' ? MLS_SINGLE_TIER_2 : MLS_FAMILY_TIER_2;
    const tier3 = filingStatus === 'single' ? MLS_SINGLE_TIER_3 : MLS_FAMILY_TIER_3;
    let surchargeRate = new Decimal(0);
    if (taxableIncome.greaterThan(tier3)) { surchargeRate = new Decimal('0.015'); }
    else if (taxableIncome.greaterThan(tier2)) { surchargeRate = new Decimal('0.0125'); }
    else if (taxableIncome.greaterThan(tier1)) { surchargeRate = new Decimal('0.01'); }
    surcharge = taxableIncome.times(surchargeRate).toDecimalPlaces(2);
    if (surchargeRate.greaterThan(0)) basis += ` + MLS ${surchargeRate.times(100).toFixed(2)}% (no private hospital cover)`;
  }

  return { levy, surcharge, basis };
}
```

### BRE test (Company, FY2026) — 90%-dividend assertion

```typescript
// src/lib/tax/rates/fy2026/bre.ts
// Source: Income Tax Rates Act 1986 s.23AA (BRE) + s.23AB (BREPI)
// https://www.austlii.edu.au/cgi-bin/viewdoc/au/legis/cth/consol_act/itra1986174/s23aa.html
// https://www5.austlii.edu.au/au/legis/cth/consol_act/itra1986174/s23ab.html
import { Decimal } from '../../../money';

const BRE_TURNOVER_THRESHOLD = new Decimal('50000000');     // $50M
const BRE_PASSIVE_THRESHOLD  = new Decimal('0.80');         // 80% of assessable income
const RATE_BRE  = new Decimal('0.25');
const RATE_FULL = new Decimal('0.30');

export interface BreTestInput {
  aggregatedTurnover: Decimal;     // From Company.aggregatedTurnover or computed from journals
  totalAssessableIncome: Decimal;  // Sum of income labels — Form C item 6
  brepiTotal: Decimal;             // Sum of BREPI-tagged accounts (dividend, interest, rent, royalty, net capital gain)
}

export function breTestFY2026(input: BreTestInput): { rate: Decimal; isBre: boolean; basis: string } {
  const { aggregatedTurnover, totalAssessableIncome, brepiTotal } = input;
  if (totalAssessableIncome.lessThanOrEqualTo(0)) {
    // No income → BRE rate technically applies, but show explanation
    return { rate: RATE_BRE, isBre: true, basis: `25% applied — no assessable income (BRE default)` };
  }
  if (aggregatedTurnover.greaterThanOrEqualTo(BRE_TURNOVER_THRESHOLD)) {
    return { rate: RATE_FULL, isBre: false, basis: `30% applied — aggregated turnover ≥ $50M` };
  }
  const passiveRatio = brepiTotal.dividedBy(totalAssessableIncome).toDecimalPlaces(4);
  if (passiveRatio.greaterThan(BRE_PASSIVE_THRESHOLD)) {
    return {
      rate: RATE_FULL,
      isBre: false,
      basis: `30% applied — passive income ${passiveRatio.times(100).toFixed(2)}% exceeds 80% BREPI threshold (s.23AB)`,
    };
  }
  return {
    rate: RATE_BRE,
    isBre: true,
    basis: `25% applied — passive income ${passiveRatio.times(100).toFixed(2)}% ≤ 80% BREPI threshold; aggregated turnover < $50M`,
  };
}

// Golden test fixture (per Success Criterion #2):
//   breTestFY2026({
//     aggregatedTurnover: new Decimal('1000000'),
//     totalAssessableIncome: new Decimal('500000'),
//     brepiTotal: new Decimal('450000'),  // 90% dividend
//   })
// → { rate: '0.30', isBre: false, basis: '30% applied — passive income 90.00% exceeds 80% BREPI threshold (s.23AB)' }
```

### Per-beneficiary distribution (Trust, with optional streaming)

```typescript
// src/lib/tax/returns/fy2026/trust.ts — distribution helper
// Source: ITAA 1997 Subdiv 115-C (CGT streaming) + Subdiv 207-B (franked dividend streaming)
// + ITAA 1936 Div 6E (anti-double-tax integration)
// https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/streaming-trust-capital-gains-and-franked-distributions
import { Decimal } from '../../../money';
import type { BeneficiaryRow } from '../../../types';

export interface DistributedShare {
  beneficiaryId: string;
  name: string;
  totalShare: Decimal;
  components: { ordinary: Decimal; interest: Decimal; dividend: Decimal; capitalGain: Decimal; foreign: Decimal; other: Decimal };
}

export interface DistributeTrustInput {
  netIncome: Decimal;
  breakdown: { interest: Decimal; dividend: Decimal; capitalGain: Decimal; foreign: Decimal; other: Decimal };
  beneficiaries: BeneficiaryRow[];
}

export function distributeTrustIncome(input: DistributeTrustInput): { rows: DistributedShare[]; anomalies: string[] } {
  const { netIncome, breakdown, beneficiaries } = input;
  const anomalies: string[] = [];
  const totalShare = beneficiaries.reduce((s, b) => s.plus(b.sharePercent), new Decimal(0));
  if (totalShare.minus(100).abs().greaterThan('0.005')) {
    anomalies.push(`Beneficiary shares sum to ${totalShare.toFixed(2)}%, not 100% — distribution will not reconcile`);
  }
  const ordinaryResidual = netIncome.minus(
    breakdown.interest.plus(breakdown.dividend).plus(breakdown.capitalGain).plus(breakdown.foreign).plus(breakdown.other)
  );

  const rows: DistributedShare[] = beneficiaries.map((b) => {
    const generalShare = new Decimal(b.sharePercent).dividedBy(100);
    const stream = b.sharePerType ?? {};
    const cls = (k: keyof typeof breakdown, classTotal: Decimal): Decimal => {
      const streamPct = stream[k];
      const pct = streamPct !== undefined ? new Decimal(streamPct).dividedBy(100) : generalShare;
      return classTotal.times(pct).toDecimalPlaces(2);
    };
    return {
      beneficiaryId: b.id, name: b.name,
      totalShare: ordinaryResidual.times(generalShare)
        .plus(cls('interest', breakdown.interest))
        .plus(cls('dividend', breakdown.dividend))
        .plus(cls('capitalGain', breakdown.capitalGain))
        .plus(cls('foreign', breakdown.foreign))
        .plus(cls('other', breakdown.other))
        .toDecimalPlaces(2),
      components: {
        ordinary:    ordinaryResidual.times(generalShare).toDecimalPlaces(2),
        interest:    cls('interest', breakdown.interest),
        dividend:    cls('dividend', breakdown.dividend),
        capitalGain: cls('capitalGain', breakdown.capitalGain),
        foreign:     cls('foreign', breakdown.foreign),
        other:       cls('other', breakdown.other),
      },
    };
  });

  // Verify streamed-class sums to 100% per class (if any beneficiary specifies sharePerType for that class)
  (['interest', 'dividend', 'capitalGain', 'foreign', 'other'] as const).forEach((cls) => {
    const someStream = beneficiaries.some((b) => b.sharePerType?.[cls] !== undefined);
    if (!someStream) return;
    const sum = beneficiaries.reduce(
      (s, b) => s.plus(b.sharePerType?.[cls] ?? b.sharePercent),
      new Decimal(0),
    );
    if (sum.minus(100).abs().greaterThan('0.005')) {
      anomalies.push(`Streamed class '${cls}' shares sum to ${sum.toFixed(2)}%, not 100%`);
    }
  });

  // Verify total distributed equals netIncome (defence-in-depth)
  const distributed = rows.reduce((s, r) => s.plus(r.totalShare), new Decimal(0));
  if (distributed.minus(netIncome).abs().greaterThan('0.01')) {
    anomalies.push(`Distribution total ${distributed.toFixed(2)} does not reconcile to net income ${netIncome.toFixed(2)}`);
  }

  return { rows, anomalies };
}
```

### BAS G1 / 1A computation (decimal ROUNDING_MODE explicit)

```typescript
// src/lib/tax/returns/fy2026/bas.ts — G1 / 1A computation excerpt
// Source: ATO BAS instructions; "GST on sales (1A) = GST component of G1"
// https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas
// Decimal global config (Phase 1): rounding ROUND_HALF_EVEN (banker's). Per ATO BAS instructions,
// individual amounts are rounded to nearest dollar at the worksheet level; this implementation
// keeps cent precision through aggregation and rounds DOWN at the field write (ATO permits
// either round-to-nearest-dollar OR cent-precision depending on method — we keep cents).
import { Decimal, gst } from '../../../money';
import type { Account, JournalEntry } from '../../../types';

export function computeG1AndGstOnSales(
  entries: JournalEntry[],
  accounts: Account[],
): { G1: Decimal; gstOnSales1A: Decimal } {
  let g1 = new Decimal(0);
  let gst1A = new Decimal(0);
  for (const entry of entries) {
    if (entry.status === 'superseded' || entry.status === 'voided' || entry.status === 'draft') continue;
    for (const line of entry.lines) {
      const account = accounts.find((a) => a.id === line.accountId);
      if (!account || account.type !== 'Revenue') continue;
      // Revenue is credit-positive; debit subtracts
      const lineAmount = new Decimal(line.credit || 0).minus(line.debit || 0);
      if (lineAmount.lessThanOrEqualTo(0)) continue;
      // G1 is GST-INCLUSIVE total of all sales (taxable + GST-free + input-taxed all roll up to G1)
      g1 = g1.plus(lineAmount).toDecimalPlaces(2);  // banker's rounding per-line
      // 1A is the GST component on TAXABLE sales only
      if (account.gstCode === 'GST') {
        // gst() = amount / 11, banker's rounding, 2dp — per-line round BEFORE aggregation
        gst1A = gst1A.plus(gst(lineAmount));
      }
    }
  }
  return { G1: g1, gstOnSales1A: gst1A.toDecimalPlaces(2) };
}
```

### Compute label rollup (generic pattern)

```typescript
// src/lib/tax/returns/fy2026/_helpers.ts
// Shared rollup pattern reused by all 5 compute*Return modules
import { Decimal } from '../../../money';
import type { Account, JournalEntry } from '../../../types';

export function rollupByLabel<LabelKey extends string>(
  entries: JournalEntry[],
  accounts: Account[],
  labelField: 'taxLabel' | 'companyTaxLabel' | 'trustTaxLabel' | 'partnershipTaxLabel',
): Record<LabelKey, Decimal> {
  const totals: Record<string, Decimal> = {};
  for (const entry of entries) {
    if (entry.status === 'superseded' || entry.status === 'voided' || entry.status === 'draft') continue;
    if (entry.replacedByEntryId) continue;
    for (const line of entry.lines) {
      const account = accounts.find((a) => a.id === line.accountId);
      if (!account) continue;
      const label = account[labelField] as LabelKey | undefined;
      if (!label) continue;
      const credit = new Decimal(line.credit || 0);
      const debit = new Decimal(line.debit || 0);
      const amount = account.type === 'Expense' ? debit.minus(credit) : credit.minus(debit);
      totals[label] = (totals[label] ?? new Decimal(0)).plus(amount);
    }
  }
  return totals as Record<LabelKey, Decimal>;
}
```

## ATO Field Codes & Label Catalogue (FY2026)

> **Notation conventions:**
> - **HIGH** = code/wording verified from current ATO publication URL.
> - **MED** = inferred from prior-year forms + 2025 publication confirmed to exist but full PDF not fully extracted via web search.
> - All "Item N" references use the ATO's own form numbering; "label N" / "1A" / "G1" use the ATO's own label codes.

### Individual return (NAT 2541) + Business & Professional Items schedule (NAT 2543)

**Source:** ATO "Individuals tax return and instructions 2025" (NAT 2541) + "Business and professional items schedule instructions 2025" (NAT 2543).
URLs: https://www.ato.gov.au/forms-and-instructions/individual-tax-return-2025-instructions and https://www.ato.gov.au/api/public/content/5861f7f47efa45d5b76332ef12919ace?v=a0a2f777
Confidence: HIGH for label codes; MED for exact field-by-field reconciliation labels (full PDF not retrievable via web search — verify against the FY2025-26 PDF during Wave 0).

| ATO Code | Description | Source CoA rollup | Units |
|----------|-------------|-------------------|-------|
| **Item 1** | Salary or wages (main return) | Phase 5 reads from payroll journals if present; usually 0 for self-employed sole trader | AUD whole dollars |
| **Item 15 — Net income/loss from business** | Flow-through from B&P schedule P8 | = P8 from schedule below | AUD whole dollars |
| **Schedule item P1 — Description of main business activity** | Free text (entity.name + entity.notes) | Not computed | Text |
| **Schedule item P2 — Trade name** | Free text | Not computed | Text |
| **Schedule item P3 — Business address** | `entity.businessAddress` | Not computed | Text |
| **Schedule item P4 — Sub status** | "Small business entity" if aggregated turnover < $10M | Computed from journals if available | Enum |
| **Schedule item P8 — Business income & expenses** | Composite section containing the per-label income & expense breakdown — see sub-labels below | Multiple | AUD cents (round at field write) |
| **P8 / label B — Gross payments where ABN not quoted** | (Revenue × GstCode='N-T' + no-ABN flag, v1: 0 unless user posts) | Sum of qualifying journals | AUD |
| **P8 / label C — Other business income** | Revenue accounts with `taxLabel='6S'` (or P8-equivalent) | Phase 4 CoA accounts 4010/4020/4030/4040/4100/4110 | AUD |
| **P8 / label E — Trading stock — opening** | Asset account "Inventory" opening balance | CoA 1200 opening | AUD |
| **P8 / label F — Purchases & other costs** | Expense accounts with `taxLabel='6Q'` (COGS) | Phase 4 CoA 5xxx range | AUD |
| **P8 / label G — Trading stock — closing** | Asset account "Inventory" closing balance | CoA 1200 closing | AUD |
| **P8 / label H — Cost of sales** | E + F − G (derived) | Derived | AUD |
| **P8 / label I — Foreign income** | (Out of v1 unless user posts to foreign-income label) | n/a | AUD |
| **P8 / label J — Gross interest** | Revenue with `taxLabel='6K'` | CoA 4200 Interest Income | AUD |
| **P8 / label K — Salary & wage expenses** | Expense with `taxLabel='6L'` | CoA 6xxx wages | AUD |
| **P8 / label L — All other expenses** | Expense with `taxLabel='6N'` | CoA 6xxx all-other | AUD |
| **P8 / label N — Net income or loss from business** | Total income − total expenses (derived = Item 15 value) | Derived | AUD |
| **Item M1 — Medicare levy reduction or exemption** | Auto-set from medicareLevyFY2026() result | Derived | AUD |
| **Item M2 — Medicare levy surcharge** | Auto-set from medicareLevyFY2026() result | Derived | AUD |
| **Item T1 — Low income tax offset** | Auto-set from litoFY2026() — ATO computes on user's behalf; Phase 5 shows for transparency | Derived | AUD |

**Phase-2 fy2026.ts current labels (5 of 12+ needed):**
> The Phase-2 file ships only `'6S' | '6K' | '6L' | '6N' | '6Q'`. Phase 5 widens to the full P8 schedule label set above. **NAT-comment correction:** change `// Source: NAT 0660` → `// Source: NAT 2541 main return + NAT 2543 B&P schedule FY2025-26`.

### Company return (NAT 0656)

**Source:** ATO "Company tax return 2025 instructions" (NAT 0656).
URL: https://www.ato.gov.au/forms-and-instructions/company-tax-return-2025-instructions
Confidence: MED (labels inferred from prior-year structure + 2025 publication confirmed; full label-by-label PDF not retrievable). Verify against PDF in Wave 0.

| ATO Code | Description | Source CoA rollup | Units |
|----------|-------------|-------------------|-------|
| **Item 6 — Calculation of total profit or loss** | Composite item with income + expenses + reconciliation | Multiple | AUD |
| **6 / label A — Gross sales** | `companyTaxLabel='6A'` | CoA 4010/4020/4030/4040/4100/4110 | AUD |
| **6 / label B — Excise & customs** | Out of v1 unless user posts | n/a | AUD |
| **6 / label C — Forex gains** | Out of v1 | n/a | AUD |
| **6 / label D — Gross interest** | `companyTaxLabel='6F'` | CoA 4200 Interest Income | AUD |
| **6 / label E — Gross rent & other leasing** | Revenue rental accounts | CoA 4300 Residential Rental | AUD |
| **6 / label F — Gross distribution from partnerships** | (Out of v1) | n/a | AUD |
| **6 / label G — Gross distribution from trusts** | (Out of v1) | n/a | AUD |
| **6 / label H — Dividends** | Revenue with dividend mapping | CoA 4210/4220 | AUD |
| **6 / label R — Other gross income** | Catch-all | Misc | AUD |
| **6 / label S — Total income** | A + … + R derived | Derived | AUD |
| **6 / label T — Cost of sales** | Expense with `companyTaxLabel='6Q'`-equivalent | CoA 5xxx | AUD |
| **6 / label U — Wages & salaries** | `companyTaxLabel='6L'`-equivalent | CoA 6xxx wages | AUD |
| **6 / label V — Superannuation** | `companyTaxLabel='6C'` | CoA Super expense accounts | AUD |
| **6 / label W — Rent expenses** | `companyTaxLabel='6G'` | CoA Rent accounts | AUD |
| **6 / label X — Other expenses** | `companyTaxLabel='6X'` | CoA all other expense | AUD |
| **6 / label Q — Total expenses** | T + … + X derived | Derived | AUD |
| **6 / label T (total profit or loss)** | S − Q derived | Derived | AUD |
| **Item 7 — Reconciliation to taxable income** | Add-backs (e.g. depreciation differences) + subtractions | v1: same as item 6's S − Q | AUD |
| **7 / label T — Taxable income or loss** | item 6 / T (after recon) | Derived | AUD |
| **Calculation statement (CS) — label A** | Taxable income | Same as item 7T | AUD |
| **CS / label B — Tax on taxable income** | A × BRE rate (25% or 30%) | Derived | AUD |
| **CS / label J — Tax payable** | After offsets / credits | Derived | AUD |
| **CS / label S — Amount due or refundable** | After PAYG instalments | Derived | AUD |
| **Franking account — opening balance** | CoA 3090 opening at FY start | Stored | AUD |
| **Franking account — movements** | Credits: tax paid, franking credits received; Debits: dividends paid (× franking %) | Computed from journals | AUD |
| **Franking account — closing balance** | opening + movements | Derived | AUD |

> **"Item 7S" / "Item 7D" interpretation:** The REQUIREMENTS.md text "taxable income (item 7S)" and "item 7D" doesn't match a direct ATO Form C label code. **MED-confidence interpretation:** treat 7S = item 7 label T (taxable income or loss); 7D as the (mis-scoped) small-business offset that does not exist on Form C. Flag in `/gsd:discuss-phase 5`.

### Trust return (NAT 0660)

**Source:** ATO "Trust tax return 2025 instructions".
URL: https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2025-instructions
Confidence: MED on exact 2025 label numbering (the 2024 form used items 56/57 for income / present-entitlement; 2025 structure is broadly the same per ATO publishing patterns).

| ATO Code | Description | Source CoA rollup | Units |
|----------|-------------|-------------------|-------|
| **Item 5 — Business income & expenses** | Composite | Multiple | AUD |
| **5 / label B — Gross payments (sales)** | `trustTaxLabel='5B'` | CoA 4010/4020/4030 | AUD |
| **5 / label E — Cost of sales** | `trustTaxLabel='5E'` | CoA 5xxx | AUD |
| **5 / label F — Rent expenses** | `trustTaxLabel='5F'` | CoA Rent | AUD |
| **5 / label L — Superannuation** | `trustTaxLabel='5L'` | CoA Super | AUD |
| **5 / label M — Salary & wage expenses** | `trustTaxLabel='5M'` | CoA Wages | AUD |
| **5 / label N — All other expenses** | `trustTaxLabel='5N'` | CoA other expense | AUD |
| **5 / label T — Net business income** | B − (E+F+L+M+N) derived | Derived | AUD |
| **Item 11 — Other Australian income** | Composite | | AUD |
| **11 / label J — Gross interest** | `trustTaxLabel='11J'` | CoA 4200 | AUD |
| **Item 26 — Total net income or loss** | All income − all deductions derived (Phase-2 stub labels this) | Derived | AUD |
| **Item 56 — Income of the trust estate** | Distributable trust income (s.97 base) | Derived | AUD |
| **Item 57 — Statement of distribution per beneficiary** | One row per beneficiary | From `Entity.beneficiaries` × distribute helper | AUD |
| **57 / per row / col A — Beneficiary name & TFN** | From beneficiary register | Text | n/a |
| **57 / per row / col B — Share of income** | `netIncome × sharePercent / 100` (or streamed) | Computed | AUD |
| **57 / per row / col C — Share of franked distributions** | Streamed per `sharePerType.dividend` | Computed | AUD |
| **57 / per row / col D — Share of franking credit** | franked × franking-credit rate | Computed | AUD |
| **57 / per row / col E — Share of net capital gain** | Streamed per `sharePerType.capitalGain` | Computed | AUD |
| **57 / per row / col F — Share of foreign income** | Streamed per `sharePerType.foreign` | Computed | AUD |

> **Phase-2 fy2026.ts `// Source: NAT 0659` for trust is WRONG.** Trust is NAT 0660. Partnership is NAT 0659. The labels file needs reconciliation in Phase 5 Wave 0.

### Partnership return (NAT 0659)

**Source:** ATO "Partnership tax return and instructions 2025" (NAT 2297-06.2025 instructions; form file NAT 0659).
URLs: https://www.ato.gov.au/forms-and-instructions/partnership-tax-return-2025-instructions and https://www.ato.gov.au/api/public/content/1453e44ff39e4eb789ea83eeb6eac10b?v=5c58b86f
Confidence: MED (instructions confirmed for 2025; exact label IDs inferred from project labels file).

| ATO Code | Description | Source CoA rollup | Units |
|----------|-------------|-------------------|-------|
| **Item 5 — Business income & expenses** | Composite | | AUD |
| **5 / B — Gross payments** | `partnershipTaxLabel='P1'` | CoA Revenue | AUD |
| **5 / E — Cost of sales** | `partnershipTaxLabel='P2'`-COGS | CoA 5xxx | AUD |
| **5 / N — All other expenses** | `partnershipTaxLabel='P2'`-other | CoA 6xxx | AUD |
| **Item 5 / T — Net Australian business income (P8)** | Income − expenses derived | Derived | AUD |
| **Item 54 — Statement of distribution per partner** | One row per partner | From `Entity.partners` × distribute helper | AUD |
| **54 / col A — Partner name & TFN** | From partner register | Text | n/a |
| **54 / col B — Share of net income or loss** | `netIncome × sharePercent / 100` | Computed | AUD |

> Partnership streaming exists (franked + capital gains can be streamed) but is less commonly used than Trust streaming. Phase 5 ships the `sharePerType` hook for parity; UI exposure can defer to Phase 6 unless the user requests.

### BAS (NAT 4189 family) + IAS

**Source:** ATO BAS instructions + "Reporting financial supplies on your BAS" + "Pay as you go (PAYG) withholding".
URLs: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas and https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/pay-as-you-go-payg-withholding
Confidence: HIGH for label codes (these are stable BAS labels since the 2000 GST introduction).

| ATO Code | Description | Source CoA rollup | Units |
|----------|-------------|-------------------|-------|
| **G1** | Total sales (GST-inclusive) | Sum of Revenue line amounts (any gstCode) | AUD cents → rounded to whole $ at field write |
| **G2** | Export sales | Revenue with gstCode='FRE' AND account flagged export (Phase 4 has CoA 4100 "Export Sales (GST-Free)") | AUD |
| **G3** | Other GST-free sales (non-export) | Revenue with gstCode='FRE' AND NOT export | AUD |
| **G10** | Capital purchases (GST-inclusive) | Asset acquisition lines with gstCode='CAP' (Phase 4 CoA 1510/1520/1530/1540) | AUD |
| **G11** | Non-capital purchases (GST-inclusive) | Expense lines (excluding wages) + Asset lines NOT in G10 | AUD |
| **1A** | GST on sales (= GST component of G1) | `gst(salesLineAmount)` per-line, summed | AUD cents → rounded at field write |
| **1B** | GST on purchases (= GST credits) | `gst(purchaseLineAmount)` per-line for gstCode='GST' OR 'CAP' purchases, summed | AUD |
| **W1** | Total salary, wages & other payments | Sum of wage/salary expense lines + PAYG-pre-tax | AUD |
| **W2** | Amounts withheld from W1 | Credit on CoA 2120 "PAYG Withholding Payable" | AUD |
| **W3** | Other amounts withheld (incl. no-TFN) | Phase 5 baseline: 0 unless user posts | AUD |
| **W4** | Amounts withheld (no-ABN supplier 47%) | Phase 5 baseline: 0 unless user posts | AUD |
| **W5** | Total withheld = W2 + W3 + W4 | Derived | AUD |
| **T7** | PAYG instalment (option 1, ATO-calculated amount) | Stored on `Entity` (user enters from ATO notice) — or computed from prior-year tax × GDP factor 4% | AUD |
| **T1** | PAYG instalment income (option 2 rate method) | Optional — Phase 6 candidate | AUD |
| **T2** | PAYG instalment rate (option 2) | Optional — Phase 6 candidate | % |

**Simpler BAS dispatch (GST turnover < $10M):** Phase 5 computes the full label set but the **Simpler BAS render mode** displays only `G1`, `1A`, `1B` (per ATO Simpler BAS rules). Driver: `entity.aggregatedTurnover < $10M` → simpler mode; otherwise full mode. Add `entity.basReportingMode?: 'simpler' | 'full'` as a v1 manual override (default = 'simpler' if turnover unknown).

**IAS dispatch (GST not registered):** When `entity.gstRegistered === false`, render only W1/W2/W3/W4/W5/T7. Use the same `computeBasReturn()` function; the `meta.shape` field distinguishes BAS vs IAS.

## Current FY2026 Rate Tables

**FY2026** = 1 July 2025 – 30 June 2026 (Australian financial year).

### Individual marginal-rate brackets (resident, post-Stage-3, FY2025-26)
Source: ATO "Tax rates – Australian resident" (https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents)
Confidence: **HIGH** (multiple sources concur; legislated; same as FY2024-25 — Stage 3 took effect 1 Jul 2024)

| Bracket | Threshold | Marginal rate | Base tax at lower edge |
|---------|-----------|---------------|-----------------------|
| 1 | $0 – $18,200 | 0% | $0 |
| 2 | $18,201 – $45,000 | **16%** | $0 |
| 3 | $45,001 – $135,000 | **30%** | $4,288 |
| 4 | $135,001 – $190,000 | **37%** | $31,288 |
| 5 | $190,001 and over | **45%** | $51,638 |

> **NOTE:** From 1 Jul 2026 (FY2027), the 16% rate drops to 15%; from 1 Jul 2027 (FY2028) it drops to 14%. **These are NOT in force for FY2026.** The labels file should anchor only FY2026 values; new FY directories handle the change.

> Common-mistake watch: prior-year tables show $180,001 as the top-bracket threshold. **FY2026 top-bracket threshold is $190,000.**

### Low Income Tax Offset (LITO)
Source: ATO "Low income tax offset" (https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset)
Confidence: **HIGH**

| Taxable income | LITO amount |
|----------------|-------------|
| $0 – $37,500 | $700 (max) |
| $37,501 – $45,000 | $700 − ((income − 37,500) × 0.05) |
| $45,001 – $66,667 | $325 − ((income − 45,000) × 0.015) |
| $66,668 and over | $0 |

Effective tax-free threshold after LITO + tax-free threshold: ~$22,575 (LITO offsets the first $700 of tax).

### Medicare Levy
Source: ATO "Medicare levy reduction for low-income earners" (https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners)
Confidence: **MEDIUM** — single $27,222 lower threshold cited; upper threshold to full 2% rate cited as $34,028 in some sources and $36,509 in others; verify ATO MR for FY2025-26 indexed thresholds in Wave 0.

| Single taxable income | Levy |
|-----------------------|------|
| Below ~$27,222 | $0 (no levy) |
| ~$27,222 – ~$34,028 | Shading-in: levy = min((income − 27,222) × 0.10, income × 0.02) |
| Above ~$34,028 | 2% of taxable income (full rate) |

> **Family thresholds** are indexed annually and depend on dependants count. Phase 5 v1 ships **single** thresholds accurately; family thresholds use the 2% flat (above-shade-in) as a baseline and surface "verify family levy threshold with tax agent" anomaly flag.

### Medicare Levy Surcharge (MLS)
Source: ATO "Medicare levy surcharge income, thresholds and rates" (https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates)
Confidence: **HIGH**

| Singles (no dep) | Families (≤1 child) | Rate |
|------------------|---------------------|------|
| ≤ $101,000 | ≤ $202,000 | 0.0% |
| $101,001 – $118,000 | $202,001 – $236,000 | **1.0%** |
| $118,001 – $144,000 | $236,001 – $288,000 | **1.25%** |
| $144,001 and over | $288,001 and over | **1.50%** |

Family threshold increases by **$1,500** per dependent child after the first.
MLS only applies if the taxpayer (and family) lack qualifying private hospital cover for the full income year.

### BAS quarter boundaries (ATO-prescribed)
Source: `src/lib/period.ts` `quarterBoundaries()` (already implemented in Phase 2, confirmed against ATO BAS instructions)
Confidence: **HIGH** (stable)

| Quarter | FY2026 dates |
|---------|--------------|
| Q1 | 1 Jul 2025 – 30 Sep 2025 |
| Q2 | 1 Oct 2025 – 31 Dec 2025 |
| Q3 | 1 Jan 2026 – 31 Mar 2026 |
| Q4 | 1 Apr 2026 – 30 Jun 2026 |

### Company tax rates
Source: Income Tax Rates Act 1986 s.23 + ATO "Company tax rates"; current rates per ATO publishing.
Confidence: **HIGH** (stable since FY2022)

| Entity | Rate |
|--------|------|
| Base Rate Entity (per s.23AA) | **25%** |
| Non-BRE company | **30%** |

### Small business income tax offset (SBITO) — INDIVIDUALS only
Source: ATO "myTax 2025 Small business income tax offset" (https://www.ato.gov.au/individuals-and-families/your-tax-return/instructions-to-complete-your-tax-return/mytax-instructions/2025/tax-offsets/small-business-income-tax-offset)
Confidence: **HIGH**

- Rate: **16%** of net small business income
- Cap: **$1,000** per year
- Eligibility: sole trader OR individual receiving share of net SB income from a partnership/trust; aggregated turnover **< $5 million**
- **Applies to: Form I (individuals only). NOT Form C.**

### Simpler BAS turnover threshold
Source: ATO "GST reporting methods" / "Simpler BAS"
Confidence: **HIGH**

- GST turnover **< $10M** → Simpler BAS (G1, 1A, 1B only required on the BAS form; G2/G3/G10/G11 not lodged but may be tracked)
- GST turnover **≥ $10M** → Full method (all G* labels)
- Default in Phase 5: Simpler mode if turnover unknown; manual override available.

### PAYG instalment GDP adjustment factor (FY2025-26)
Source: ATO "PAYG instalments" + activity-statement instructions
Confidence: **MED** (4% figure cited from web result; verify in Wave 0)

- FY2025-26 GDP adjustment factor: **4%** (T7 = prior-year instalment × 1.04, or as advised by ATO notice)

## Trust Streaming & Division 6 Boundaries

**Source:** ATO "Streaming trust capital gains and franked distributions" (https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/streaming-trust-capital-gains-and-franked-distributions)
**Legislation:** ITAA 1997 Subdiv 115-C (CGT streaming) + Subdiv 207-B (franked-distribution streaming) + ITAA 1936 Div 6 (general) + Div 6E (anti-double-tax integration).

### What is streamable

| Income class | Streamable? | Mechanism | Phase 5 hook |
|--------------|-------------|-----------|--------------|
| **Net capital gains** | YES | Subdiv 115-C "specifically entitled" + 60-day recording window after FY-end | `BeneficiaryRow.sharePerType.capitalGain` |
| **Franked dividends** (incl. franking credits) | YES | Subdiv 207-B "specifically entitled" + recording by end of FY | `BeneficiaryRow.sharePerType.dividend` |
| **Foreign income** | NO (not under Subdiv 115-C / 207-B; can be effectively streamed only via trust-deed-permitted proportional rules under Div 6) | Reflected as "share of foreign income" on distribution statement | `BeneficiaryRow.sharePerType.foreign` (ships as data field; UI labels "share of foreign income" not "stream") |
| **Interest income** | NO (must be distributed proportionally under Div 6) | `sharePerType.interest` shipped but functions as "share-override" not streaming | `BeneficiaryRow.sharePerType.interest` |
| **Other / ordinary income** | NO (Div 6 proportional rules apply) | Residual ordinary share = beneficiary's `sharePercent` of net residual income | `BeneficiaryRow.sharePerType.other` (override hook) |

> **Phase 4 already shipped the 5-class enumeration on `BeneficiaryRow.sharePerType?`.** Research confirms `{ interest, dividend, capitalGain, foreign, other }` is the right set — the strict streaming-eligible subset is `{ dividend, capitalGain }`; the others are share-overrides for Div 6 proportional distribution.

### Specifically entitled — the streaming gate

A beneficiary is "specifically entitled" to a CGT amount or franked-distribution amount when:
1. The trust deed permits streaming (or the trustee has a power consistent with streaming).
2. The beneficiary has received OR can reasonably be expected to receive an amount referable to the gain/distribution.
3. The recording conditions are met (recorded in the accounts/records of the trust within the deadline — 60 days for CGT, end of FY for franked).

**v1 disclaimer:** AussieLedger does NOT verify the trust deed. The streaming-disclaimer copy (lock verbatim — see Pitfall 2 above) tells the user to consult their tax agent.

### Per-beneficiary reconciliation formula

For each income class C ∈ `{ ordinary, interest, dividend, capitalGain, foreign, other }`:

```
share_b_C = class_total × (sharePerType[b][C] ?? sharePercent[b]) / 100
```

Total per beneficiary:
```
total_b = Σ_C share_b_C
```

Reconciliation invariant (golden test):
```
Σ_b total_b == netIncome   (tolerance ±$0.01)
```

If reconciliation fails OR per-class shares don't sum to 100%, anomaly flag in `meta.anomalies`.

### Phase 5 scope decision

- **Phase 5 ships:** Distribution table with per-class breakdown + `sharePerType` UI inputs on the beneficiary register + mandatory streaming disclaimer + anomaly flags for misreconciliation.
- **Phase 5 does NOT ship:** Trust-deed verification, recording-deadline tracking, automatic capital-gain calculation (user supplies via journals), foreign-tax-offset attribution beyond a simple share-out.
- **Phase 5 is NOT a substitute for a tax agent on a streaming trust.** The disclaimer is non-dismissable.

## BRE Test (Base Rate Entity)

**Source:** Income Tax Rates Act 1986 (NOT ITAA 1997) s.23AA + s.23AB.
**Citations:** AustLII https://classic.austlii.edu.au/au/legis/cth/consol_act/itra1986174/s23aa.html and https://www5.austlii.edu.au/au/legis/cth/consol_act/itra1986174/s23ab.html
**ATO ruling:** LCR 2019/5 (https://www.ato.gov.au/law/view/document?docid=COD/LCR2018D7/NAT/ATO/00001) — guidance on BRE classification.

### Definition (s.23AA)

A company is a Base Rate Entity for an income year if BOTH:

1. **Aggregated turnover** for the year < **$50,000,000**, AND
2. **No more than 80%** of the entity's assessable income is "base rate entity passive income" (BREPI) per s.23AB.

If either condition fails, the company is **NOT** a BRE; the **30%** rate applies. The Commissioner has **NO discretion** to grant exception — the 80% test is bright-line.

### BREPI definition (s.23AB)

BREPI includes:

1. A distribution by a corporate tax entity (dividend), other than a non-portfolio dividend.
2. The franking credit on such a distribution.
3. A non-share dividend by a company.
4. Interest (or a payment in the nature of interest), royalties, and rent.
5. A gain on a qualifying security.
6. A net capital gain.
7. Amounts in the assessable income of a partner / beneficiary, to the extent referable to BREPI of the partnership / trust.

> **Critical note on "rent":** Rent is BREPI. A company that's effectively a rental-property holding company will have BREPI > 80% and pays 30%.

> **"Non-portfolio dividend" exception:** Dividends from a company in which the receiving company holds ≥10% (voting) are **non-portfolio** and are **excluded** from BREPI. Phase 5 v1 treats all received dividends as BREPI (conservative — flags 30% more often than strictly required) and surfaces "non-portfolio dividend exception may apply — consult tax agent" anomaly.

### Algorithm

```
INPUTS: aggregatedTurnover, totalAssessableIncome, brepiTotal
1. If aggregatedTurnover >= 50_000_000: return 30% (basis: turnover)
2. If totalAssessableIncome <= 0: return 25% (basis: no income, BRE default)
3. passiveRatio = brepiTotal / totalAssessableIncome
4. If passiveRatio > 0.80: return 30% (basis: BREPI > 80%)
5. Else: return 25% (basis: BREPI <= 80%, turnover < $50M)
```

### Phase 5 implementation notes

- **BREPI classification at the CoA level:** Add a new `Account.isBrepi?: boolean` field (additive — no v3→v4 migration needed; Phase 4 AuditAction enum already covers any new audit needs). Pre-populate `true` for Phase 4 CoA accounts 4200 (interest), 4210/4220 (dividends — flagged with non-portfolio exception note), 4300 (rental), and any "net capital gain" account the user creates.
- **Aggregated turnover:** Phase 5 reads `entity.aggregatedTurnover` if set (new optional field on Entity — additive); otherwise computes from journals = sum of all Revenue accounts (not just GST sales). Per ATO definition, "aggregated turnover" includes connected entities' turnover; v1 ships single-entity calc + a warning if multiple-entity group is detected.
- **Golden test:** 90% dividend, $1M turnover, $500k assessable → 30%. 10% dividend, $1M turnover, $500k assessable → 25%. Edge cases at exactly 80% (≤80% means BRE; > 80% means non-BRE).

## Validation Architecture

> nyquist_validation is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (already installed Phase 1) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm run test -- --run src/lib/tax/returns/fy2026/` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| **BAS-01** | G1/G2/G3/G10/G11/1A/1B values match hand-calculated reference | unit (golden) | `npm run test -- --run src/lib/tax/returns/fy2026/bas.test.ts` | ❌ Wave 0 (new file) |
| **BAS-02** | Decimal arithmetic; 11-tx BAS to-the-cent | unit | `npm run test -- --run src/lib/tax/returns/fy2026/bas.test.ts -t 'decimal'` | ❌ Wave 0 |
| **BAS-03** | W1/W2/W3/W4/W5 from wage + PAYG-Withholding accounts | unit | same | ❌ Wave 0 |
| **BAS-04** | T7 from stored entity instalment value or computed | unit | same | ❌ Wave 0 |
| **BAS-05** | IAS dispatch when `entity.gstRegistered === false` | unit | same | ❌ Wave 0 |
| **BAS-06** | Print export contains ATO codes + disclaimer; no UI chrome | component (RTL) | `npm run test -- --run src/components/__tests__/BasIasAssistant.print.test.tsx` | ❌ Wave 0 |
| **TAX-02** | Print mode renders WorkingPaperLayout; no-print class hides chrome | component (RTL + jsdom) | `npm run test -- --run src/components/__tests__/WorkingPaperLayout.test.tsx` | ❌ Wave 0 |
| **IND-01** | Form I + B&P labels from GL | unit (golden) | `npm run test -- --run src/lib/tax/returns/fy2026/individual.test.ts` | ❌ Wave 0 |
| **IND-02** | P1/P2/P8/item-15 populated | unit | same | ❌ Wave 0 |
| **IND-03** | marginalTax + LITO + Medicare levy applied | unit | `npm run test -- --run src/lib/tax/rates/fy2026/*.test.ts` | ❌ Wave 0 |
| **COY-01** | Form C labels item 6/7 from GL | unit (golden) | `npm run test -- --run src/lib/tax/returns/fy2026/company.test.ts` | ❌ Wave 0 |
| **COY-02** | BRE 90%-dividend → 30%; 10%-dividend → 25% | unit | `npm run test -- --run src/lib/tax/rates/fy2026/bre.test.ts` | ❌ Wave 0 |
| **COY-03** | Franking-account opening + movements + closing | unit | `npm run test -- --run src/lib/tax/returns/fy2026/company.test.ts -t 'franking'` | ❌ Wave 0 |
| **COY-04** | (Re-scoped — see Confidence section) | n/a | n/a | n/a |
| **TRT-01** | Form T net income reconciles | unit (golden) | `npm run test -- --run src/lib/tax/returns/fy2026/trust.test.ts` | ❌ Wave 0 |
| **TRT-02** | Per-beneficiary distribution sums to net income | unit | same | ❌ Wave 0 |
| **TRT-03** | Distribution from `Entity.beneficiaries` | unit | same | ❌ Wave 0 |
| **PSP-01** | Form P P1/P2/P8 from GL | unit (golden) | `npm run test -- --run src/lib/tax/returns/fy2026/partnership.test.ts` | ❌ Wave 0 |
| **PSP-02** | Per-partner distribution | unit | same | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test -- --run src/lib/tax/`
- **Per wave merge:** `npm run test && npm run lint && npm run build`
- **Phase gate:** Full suite green + manual UAT covering all 5 success criteria + print-output A4 visual check + `/gsd:verify-work` PASS

### Wave 0 Gaps

- [ ] `src/lib/tax/returns/fy2026/individual.ts` — implements computeIndividualReturn() covering IND-01/02/03
- [ ] `src/lib/tax/returns/fy2026/company.ts` — covers COY-01/02/03
- [ ] `src/lib/tax/returns/fy2026/trust.ts` — covers TRT-01/02/03
- [ ] `src/lib/tax/returns/fy2026/partnership.ts` — covers PSP-01/02
- [ ] `src/lib/tax/returns/fy2026/bas.ts` — covers BAS-01..05
- [ ] `src/lib/tax/rates/fy2026/{marginal,lito,medicareLevy,bre}.ts` — pure-function rate helpers
- [ ] `src/lib/tax/returns/fy2026/_helpers.ts` — `rollupByLabel`, `accountsForLabel`, status-filter helpers
- [ ] Test scaffold files alongside each compute*Return — golden-fixture pattern
- [ ] `src/components/WorkingPaperLayout.tsx` + `PrintDisclaimer.tsx` + `BreWizard.tsx` + `PartnershipTaxReturn.tsx` (new)
- [ ] `src/index.css` — add `@media print` ruleset (page-size, no-print, print-only, print-disclaimer)
- [ ] `src/lib/tax/labels/fy2026.ts` — widen with full label catalogue (currently 5 IND labels — needs ~12+; full P8 schedule + Form C all-labels + Trust + Partnership)
- [ ] **Label-file NAT-comment corrections:** Individual comment NAT 0660 → NAT 2541/2543; Trust comment NAT 0659 → NAT 0660; Partnership comment NAT 0976 → NAT 0659
- [ ] **BRE legislative-cite correction:** `BRE_PASSIVE_THRESHOLD` comment "ITAA 1997 s 23AA" → "Income Tax Rates Act 1986 s.23AB"
- [ ] `Account.isBrepi?: boolean` field added to types (additive — no migration). Pre-populated `true` on CoA accounts 4200/4210/4220/4300.
- [ ] `Entity.aggregatedTurnover?: string` and `Entity.basReportingMode?: 'simpler' | 'full'` added to types (additive)
- [ ] `tests/golden/` — hand-calculated reference fixtures (CSV or TS) for each form

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 19% / 32.5% / 37% / 45% brackets (pre-Stage-3) | 16% / 30% / 37% / 45% brackets | 1 Jul 2024 (FY2025) | Marginal-rate code from FY2024 returns is wrong by FY2025-26 |
| Top bracket starts $180k | Top bracket starts $190k | 1 Jul 2024 | $10k of income at 45% vs 37% mis-classified |
| `Math.max(0, x)` clamp on BAS labels | `Decimal.max(0, x)` clamp | Phase 1 | Float drift eliminated; Phase 2 fy2026.ts uses Decimal already |
| Hardcoded magic numbers in components | FY-versioned constants in `labels/fy2026.ts` | Phase 2 | Refresh process documented for annual changes |
| Single tax-component file with mixed math+UI | Pure compute*() + thin React renderer | Phase 2 | Testable; single fix propagates |
| localStorage-only persistence | StorageAdapter + IndexedDB/SQLite | Phase 3 | Survives cache clear |
| Phase-2 stubs returning placeholder zeros | Full ATO-rule implementations | Phase 5 (this phase) | Working papers become correct, not just structurally complete |

**Deprecated / outdated to remove:**

- Comment "Source: NAT 0660 (Individual tax return instructions) FY2025-26" in `src/lib/tax/labels/fy2026.ts` — incorrect (NAT 0660 is Trust). **Replace with: "Source: NAT 2541 (Individual tax return) + NAT 2543 (B&P schedule) FY2025-26".**
- Comment "Source: ITAA 1997 s 23AA" on `BRE_PASSIVE_THRESHOLD` — incorrect (it's Income Tax Rates Act 1986, NOT ITAA 1997). **Replace with: "Source: Income Tax Rates Act 1986 s.23AB."**
- Trust labels file comment "NAT 0659" — incorrect (NAT 0659 is Partnership). **Replace with: "Source: NAT 0660 (Trust tax return) FY2025-26".**
- Partnership labels file comment "NAT 0976" — incorrect (NAT 0659 is Partnership). **Replace with: "Source: NAT 0659 (Partnership tax return) FY2025-26".**
- "Item 15 individual NAT 0660" references in PROJECT.md / older research docs — flag as stale; Phase 5 SUMMARY notes the correction.
- Any code that uses raw `*0.1` or `/11` JS math for GST — must route through `src/lib/money.ts` `gst()` helper.

## Sources

### Primary (HIGH confidence)

- **ATO Tax rates — Australian resident**: https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents (FY2025-26 brackets)
- **ATO Low income tax offset**: https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/tax-offsets/low-income-tax-offset (LITO two-stage taper)
- **ATO Medicare levy reduction for low-income earners**: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy/medicare-levy-reduction/medicare-levy-reduction-for-low-income-earners
- **ATO Medicare levy surcharge income, thresholds and rates**: https://www.ato.gov.au/individuals-and-families/medicare-and-private-health-insurance/medicare-levy-surcharge/medicare-levy-surcharge-income-thresholds-and-rates
- **ATO Streaming trust capital gains and franked distributions**: https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/streaming-trust-capital-gains-and-franked-distributions
- **ATO Avoiding double taxation – Division 6E**: https://www.ato.gov.au/businesses-and-organisations/trusts/trust-income-losses-and-capital-gains/streaming-trust-capital-gains-and-franked-distributions/avoiding-double-taxation-division-6e
- **AustLII Income Tax Rates Act 1986 s.23AA (BRE definition)**: https://classic.austlii.edu.au/au/legis/cth/consol_act/itra1986174/s23aa.html
- **AustLII Income Tax Rates Act 1986 s.23AB (BREPI definition)**: https://www5.austlii.edu.au/au/legis/cth/consol_act/itra1986174/s23ab.html
- **ATO LCR 2019/5 (Base Rate Entity)**: https://www.ato.gov.au/law/view/document?docid=COD/LCR2018D7/NAT/ATO/00001
- **ATO myTax 2025 Small business income tax offset**: https://www.ato.gov.au/individuals-and-families/your-tax-return/instructions-to-complete-your-tax-return/mytax-instructions/2025/tax-offsets/small-business-income-tax-offset
- **ATO Business activity statements (BAS)**: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas
- **ATO Pay as you go (PAYG) withholding**: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/pay-as-you-go-payg-withholding
- **ATO GST reporting methods (Simpler vs Full)**: https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/business-activity-statements-bas/goods-and-services-tax-gst/gst-reporting-methods
- **ATO Franking account tax return 2025 instructions**: https://www.ato.gov.au/forms-and-instructions/franking-account-tax-return-2025-instructions

### Secondary (MEDIUM confidence)

- **ATO Tax tables for 2025-26**: https://www.ato.gov.au/tax-rates-and-codes/previous-years-tax-tables/tax-tables-for-2025-26 (general)
- **ATO Trust tax return 2025 instructions**: https://www.ato.gov.au/forms-and-instructions/trust-tax-return-2025-instructions (NAT 0660 confirmed; specific 2025 label numbering verified for items 53–57 in prior-year structure)
- **ATO Partnership tax return and instructions 2025**: https://www.ato.gov.au/forms-and-instructions/partnership-tax-return-2025-instructions (NAT 2297-06.2025 instructions + NAT 0659 form)
- **ATO Company tax return 2025 instructions**: https://www.ato.gov.au/forms-and-instructions/company-tax-return-2025-instructions (NAT 0656 confirmed; exact reconciliation labels need PDF cross-check)
- **ATO Individuals tax return and instructions 2025**: https://www.ato.gov.au/forms-and-instructions/individual-tax-return-2025-instructions (NAT 2541 confirmed)
- **ATO Business and professional items schedule instructions 2025 (NAT 2543)**: https://www.ato.gov.au/api/public/content/5861f7f47efa45d5b76332ef12919ace?v=a0a2f777
- **Wolters Kluwer — Demystifying base rate entities**: https://www.wolterskluwer.com/en-au/expert-insights/demystifying-base-rate-entities (BRE practical guidance)

### Tertiary (LOW confidence — used for cross-verification only)

- AusTax.tools (third-party calculator) — used as a cross-check for FY2025-26 brackets; not as primary source.
- Etax, SuperGuide, WageCalc — third-party tax guides; consistent with ATO numbers.
- Insight Perth / Trinity Group / Aintree — accounting-firm summaries; corroborate primary sources.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — zero new dependencies; existing stack confirmed via direct file inspection.
- Architecture (one-module-per-FY-per-form pattern): **HIGH** — extends Phase 2 / 4 conventions cleanly.
- Print-CSS approach: **HIGH** — well-documented React/Tailwind v4 + `@media print` pattern.
- FY2026 marginal-rate brackets: **HIGH** — multiple ATO + third-party sources concur.
- LITO formula: **HIGH** — ATO source directly.
- Medicare levy lower thresholds (single): **MEDIUM** — $27,222 confirmed; upper threshold cited as both $34,028 and $36,509 across sources, requires ATO MR PDF cross-check.
- Medicare levy family thresholds: **MEDIUM** — family thresholds are indexed; v1 ships single accurately, surfaces a "verify family threshold" anomaly.
- BRE test definition: **HIGH** — direct legislative cite (Income Tax Rates Act s.23AA / s.23AB).
- Trust streaming (Subdiv 115-C / 207-B / Div 6E): **HIGH** — direct ATO source for what's streamable.
- ATO label codes per form: **HIGH** for BAS labels (stable since 2000) and Individual P-schedule items (NAT 2543 PDF retrievable); **MEDIUM** for Form C reconciliation labels (the full label-by-label PDF was not retrievable via web search — Wave 0 should cross-check against the downloaded NAT 0656-06.2025 PDF).
- NAT-number map: **HIGH** — confirmed: Individual = 2541 main + 2543 schedule; Company = 0656; Trust = 0660; Partnership = 0659. The Phase-2 labels file comments need correction; Phase 4 CONTEXT got this right.
- Small business income tax offset scope (individuals, not companies): **HIGH** — ATO myTax 2025 source directly.
- Simpler BAS turnover threshold ($10M): **HIGH** — ATO source.

**Research date:** 2026-05-13
**Valid until:** 2026-06-30 (current FY); thresholds and brackets for FY2027 must be re-verified after 1 Jul 2026.

## Confidence & Open Questions

### Survived STATE.md "Research Flags Pending" status

| Original flag | Status after research |
|---------------|----------------------|
| Trust streaming boundaries | **RESOLVED** — Subdiv 115-C (CGT) + Subdiv 207-B (franked) are the strict streamable classes; other income classes go via Div 6 proportional. Phase 4's `BeneficiaryRow.sharePerType?` 5-class enumeration is correct as a data shape (capitalGain + dividend are streaming; interest + foreign + other are share-overrides). |
| BRE passive-income test | **RESOLVED** — definition is s.23AB Income Tax Rates Act 1986 (NOT ITAA 1997). BREPI enumeration: dividends ex non-portfolio + franking credits + non-share dividends + interest + royalties + rent + qualifying-security gain + net capital gain + flow-through from partnership/trust. 80% bright-line; no Commissioner discretion. |
| Current-year individual marginal rates | **RESOLVED** — FY2026: 0% / 16% / 30% / 37% / 45% at thresholds $18,200 / $45,000 / $135,000 / $190,000. Stage 3 in force since 1 Jul 2024. |
| LITO phase-out thresholds | **RESOLVED** — $700 max ≤ $37,500; 5c/$1 taper to $45,000; 1.5c/$1 taper to $66,667; $0 above. |
| Medicare levy threshold | **MOSTLY RESOLVED** — 2% rate confirmed; single lower threshold $27,222 confirmed; single shading-in upper threshold cited as both $34,028 and $36,509 by different sources. **Action:** Wave 0 must cross-check against the ATO "Medicare levy reduction" page or the FY2025-26 ATO MR PDF. **Confidence: MEDIUM, conservative implementation: shade-in caps at min(formula, 2% × income).** |

### New open questions for `/gsd:discuss-phase 5`

| Question | Why it matters | Recommendation |
|----------|----------------|----------------|
| **COY-04 mis-scope:** the small business income tax offset is for individuals/sole traders, not companies. Should it be (a) re-scoped to IND-04 and implemented on Form I, OR (b) deleted from v1 entirely? | Phase 5 plan needs to know whether to ship a 5th Individual rule or skip it. | **Recommendation:** re-scope to Individual return. Add the 16% × net SB income capped $1,000 logic to `computeIndividualReturn()`; surface as "Item T9 — Small business income tax offset" on Form I. Update REQUIREMENTS.md traceability table. |
| **Aggregated turnover field on Entity:** new field, additive — but does the user enter manually, or should Phase 5 compute from journals? | BRE rate computation needs this; computed value is approximate without "connected entities" data. | **Recommendation:** add `Entity.aggregatedTurnover?: string` as a manual override (user inputs from ATO records); auto-compute as a fallback from current-FY Revenue total; surface "computed from current-FY revenue — may differ from ATO-defined aggregated turnover if connected entities exist" disclaimer. |
| **Family Medicare levy thresholds for FY2025-26:** sources disagree on the upper shade-in figure. Should Phase 5 (a) ship single-only accurately + family-flat-2% + warning, OR (b) defer family thresholds entirely until ATO MR PDF is cross-checked? | Family-filing-status Individuals get wrong Medicare levy if family threshold is mis-coded. | **Recommendation:** (a) ship single accurately; family uses flat 2% + warning. Document the threshold-source discrepancy in Phase 5 SUMMARY. Re-verify on next FY refresh. |
| **PAYG instalment T7 calculation method:** option-1 (entity stores ATO-notice amount) vs option-2 (compute from rate × income). | BAS-04 says "income × rate OR pre-calculated amount". | **Recommendation:** ship option-1 default (user enters T7 from ATO notice via a manual field `entity.paygInstalmentT7?: string`); option-2 surface as Phase 6 enhancement. GDP factor 4% for FY2025-26 documented for future automation. |
| **Simpler BAS vs Full BAS rendering:** auto-switch on `entity.aggregatedTurnover < $10M`, or always render Full and let user choose? | UX clarity vs information completeness. | **Recommendation:** add `entity.basReportingMode?: 'simpler' \| 'full'` field (Phase 4-style additive). Default 'simpler' for new entities. Setting forces the appropriate render. |
| **Non-portfolio dividend exception for BRE:** v1 conservative (all dividends → BREPI) vs full implementation. | A holding company receiving dividends from a 100%-subsidiary is wrongly classed as non-BRE under v1 conservative model. | **Recommendation:** v1 conservative (all dividends BREPI). Surface anomaly: "Non-portfolio dividend exception may apply if this company holds ≥10% of the paying entity — consult tax agent". Full implementation v2. |
| **Print-mode trigger:** single global "Print" button vs per-form Print buttons? | UX consistency. | **Recommendation:** per-form Print button on each return surface; clicking applies `body.print-mode` class + invokes `window.print()`. After print dialog closes (`afterprint` event), remove the class. |
| **Anomaly-flag rendering in print mode:** suppress (cleaner working paper) vs include (transparency)? | Print is meant to be the deliverable, but hiding anomalies risks user shipping a flawed working paper. | **Recommendation:** include in print, in a clearly-marked "Notes & Warnings" section at the end of each form; render with a `⚠` glyph; do not omit. |

### Items where I had to pick a single recommendation despite weak signal

- **Family Medicare levy thresholds**: split source signal; recommendation = ship single accurately + family-flat + warning.
- **Form C exact label codes (Item 6 sub-labels A–R, Item 7 sub-labels)**: web search returned form-listing but not the full PDF text; recommendation = transcribe from the prior-year structure (FY2024/FY2025 PDFs which are retrievable on iorder.com.au) during Wave 0 and cross-check against the FY2025-26 PDF download.
- **PAYG GDP adjustment factor (4%)**: cited from a third-party calculator; recommendation = treat as MED confidence; Wave 0 cross-check the ATO PAYG instalments page directly.
- **Aggregated turnover field shape**: no existing precedent in the repo; recommendation = additive `string` field on Entity (matches money serialisation convention), no migration needed beyond v3 (Phase 4 already includes the AuditAction enum we'd need; new Entity fields are additive).
- **Print disclaimer copy in print mode**: identical to screen disclaimer per Phase 1 "lock verbatim — do not paraphrase" rule.

---

*Research completed: 2026-05-13. Next step: `/gsd:discuss-phase 5` to resolve COY-04 mis-scope + 7 other open questions, then `/gsd:plan-phase 5`.*
