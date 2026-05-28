---
phase: 5
slug: tax-outputs
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-13
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Mirrors the shape of `04-VALIDATION.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (existing) + jsdom (existing) + fake-indexeddb (existing) — no new test deps |
| **New runtime deps** | NONE (Phase 5 is pure-function compute + React renderers + `@media print` CSS; CONTEXT decision) |
| **Config file** | `vitest.config.ts` (existing, no changes) + `src/test/setup.ts` (already wires fake-indexeddb, ResizeObserver, matchMedia, @google/genai mock) |
| **Quick run command** | `npx vitest run src/lib/tax src/lib/migrations` (≈ 6 s — pure libs only) |
| **Full suite command** | `npm run test` (full SPA) + `npm run test:server` (server suite — unchanged from Phase 4) |
| **Estimated runtime** | SPA ≈ 10 s (371 → ~440 GREEN), Server ≈ 4 s |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/tax src/lib/migrations src/components/__tests__/{TaxReturnAssistant,CompanyTaxReturn,TrustTaxReturn,PartnershipTaxReturn,BasIasAssistant,PrintBanner,AnomalyBadge,AssumptionsBlock,EntityForm}.test.tsx` (≈ 7 s)
- **After every plan wave:** `npm run lint && npm run test && npm run test:server && npm run build`
- **Before `/gsd:verify-work`:** Full SPA suite + server suite GREEN AND the Plan 05-4 human-verify UAT checklist signed off
- **Max feedback latency:** 10 seconds combined

---

## Per-Task Verification Map

> Behaviour → requirement → automated command → file owner. Wave 0 (05-1) creates every scaffold so downstream plans wire to bound `-t` names verbatim.

| Behaviour | Requirement | Test Type | Automated Command | Owning Plan |
|-----------|-------------|-----------|-------------------|-------------|
| `marginalTaxFY2026` returns $0 at $18,200 boundary | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/marginal.test.ts -t "zero at 18200"` | 05-1 (GREEN) |
| `marginalTaxFY2026` returns $4,288 at $45,000 boundary | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/marginal.test.ts -t "4288 at 45000"` | 05-1 |
| `marginalTaxFY2026` returns $31,288 at $135,000 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/marginal.test.ts -t "31288 at 135000"` | 05-1 |
| `marginalTaxFY2026` returns $51,638 at $190,000 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/marginal.test.ts -t "51638 at 190000"` | 05-1 |
| `marginalTaxFY2026` applies 45% above $190,000 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/marginal.test.ts -t "45 percent above 190000"` | 05-1 |
| `litoFY2026` returns $700 at $37,500 ceiling | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/lito.test.ts -t "700 at 37500"` | 05-1 |
| `litoFY2026` returns $325 at $45,000 (stage 1 → 2 transition) | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/lito.test.ts -t "325 at 45000"` | 05-1 |
| `litoFY2026` returns $0 at $66,667 cutout | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/lito.test.ts -t "zero at 66667"` | 05-1 |
| `litoFY2026` mid-range $50k computes 325 - 75 = 250 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/lito.test.ts -t "stage 2 mid range 50000"` | 05-1 |
| `medicareLevySingle` returns $0 below $27,222 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "single zero below 27222"` | 05-1 |
| `medicareLevySingle` full 2% above $34,028 | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "single full 2 percent above 34028"` | 05-1 |
| `medicareLevySingle` shades-in 10c/$1 in $27,222-$34,028 band | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "single shading 10c per dollar"` | 05-1 |
| `medicareLevySurcharge` applies MLS at tier 1/2/3 boundaries | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "MLS tier boundaries"` | 05-1 |
| `medicareLevySurcharge` returns $0 when hasPHC true | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "MLS zero with PHC"` | 05-1 |
| `medicareLevy` falls back to flat 2% for family with warning | IND-03 | unit | `npx vitest run src/lib/tax/rates/__tests__/medicare.test.ts -t "family flat 2 percent fallback"` | 05-1 |
| `breRate({ passive: 90%, turnover: < 50M }) → 0.30` | COY-02 | unit | `npx vitest run src/lib/tax/rates/__tests__/bre.test.ts -t "90 percent dividend triggers 30 percent"` | 05-1 (GREEN); referenced again in 05-2 |
| `breRate({ passive: 10%, turnover: < 50M }) → 0.25` | COY-02 | unit | `npx vitest run src/lib/tax/rates/__tests__/bre.test.ts -t "10 percent dividend stays at 25 percent"` | 05-1 |
| `breRate({ turnover: >= 50M }) → 0.30` regardless of passive | COY-02 | unit | `npx vitest run src/lib/tax/rates/__tests__/bre.test.ts -t "50M turnover forces 30 percent"` | 05-1 |
| `brePassiveIncomePct` returns anomaly when in 70-90% band | COY-02 | unit | `npx vitest run src/lib/tax/rates/__tests__/bre.test.ts -t "passive 70 to 90 band emits anomaly"` | 05-1 |
| `brePassiveIncomePct` aggregates dividend+interest+rent+royalty+capitalGain accounts | COY-02 | unit | `npx vitest run src/lib/tax/rates/__tests__/bre.test.ts -t "BREPI sums all passive labels"` | 05-1 |
| `smallBusinessIncomeOffset` caps at $1,000 | IND-04 | unit | `npx vitest run src/lib/tax/rates/__tests__/smallBizOffset.test.ts -t "caps at 1000"` | 05-1 |
| `smallBusinessIncomeOffset` formula = 16% × (tax payable × SB-share of income) | IND-04 | unit | `npx vitest run src/lib/tax/rates/__tests__/smallBizOffset.test.ts -t "16 percent of tax on SB income"` | 05-1 |
| `smallBusinessIncomeOffset` returns 0 when turnover >= $5M | IND-04 | unit | `npx vitest run src/lib/tax/rates/__tests__/smallBizOffset.test.ts -t "zero when turnover at or above 5M"` | 05-1 |
| `smallBusinessIncomeOffset` returns 0 when netSbIncome <= 0 | IND-04 | unit | `npx vitest run src/lib/tax/rates/__tests__/smallBizOffset.test.ts -t "zero when SB income non-positive"` | 05-1 |
| `computeIndividualReturn` populates P1/P2/P8 from GL | IND-01, IND-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "P1 P2 P8 from GL"` | 05-1 (RED scaffold) → 05-2 (GREEN) |
| `computeIndividualReturn` item 15 = P8 flow-through | IND-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "item 15 equals P8"` | 05-1 → 05-2 |
| `computeIndividualReturn` applies LITO + Medicare per assumptions | IND-03 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "LITO and Medicare applied"` | 05-1 → 05-2 |
| `computeIndividualReturn` applies small-biz offset when eligible | IND-04 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "small business offset eligible"` | 05-1 → 05-2 |
| `computeIndividualReturn` emits assumptions block in meta | IND-03 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/individual.test.ts -t "assumptions in meta"` | 05-1 → 05-2 |
| `computeCompanyReturn` rolls 6A/6F/6T/6S/7T from GL | COY-01 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "Form C labels from GL"` | 05-1 → 05-2 |
| `computeCompanyReturn` 90%-dividend triggers 30% with explicit basis | COY-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "90 percent dividend triggers 30 percent with basis"` | 05-1 → 05-2 |
| `computeCompanyReturn` standard $1M/10%-passive → 25% + basis text | COY-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "BRE pass shows 25 percent applied basis"` | 05-1 → 05-2 |
| `computeCompanyReturn` reports franking opening/movements/closing | COY-03 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "franking account opening movements closing"` | 05-1 → 05-2 |
| `computeCompanyReturn` flags FDT anomaly when closing balance negative | COY-03 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/company.test.ts -t "FDT warning on negative franking balance"` | 05-1 → 05-2 |
| `computeTrustReturn` rolls 5B/5T/5S/26 from GL | TRT-01 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "Form T labels from GL"` | 05-1 → 05-3 |
| `computeTrustReturn` per-beneficiary distribution reconciles to net income | TRT-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "distribution reconciles to net income"` | 05-1 → 05-3 |
| `computeTrustReturn` distributes per Entity.beneficiaries | TRT-03 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "distribution sources from entity beneficiaries"` | 05-1 → 05-3 |
| `computeTrustReturn` flags anomaly when shares != 100% | TRT-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "share total not 100 percent emits anomaly"` | 05-1 → 05-3 |
| `computeTrustReturn` emits streaming disclaimer in meta | TRT-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "streaming disclaimer in meta"` | 05-1 → 05-3 |
| `computeTrustReturn` warns when any beneficiary has sharePerType (unsupported) | TRT-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/trust.test.ts -t "sharePerType present emits anomaly"` | 05-1 → 05-3 |
| `computePartnershipReturn` rolls P1/P2/P8 from GL | PSP-01 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/partnership.test.ts -t "Form P labels from GL"` | 05-1 → 05-3 |
| `computePartnershipReturn` per-partner distribution reconciles | PSP-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/partnership.test.ts -t "distribution reconciles to net income"` | 05-1 → 05-3 |
| `computePartnershipReturn` handles partnership net loss (negative P8) | PSP-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/partnership.test.ts -t "net loss flows negative to partners"` | 05-1 → 05-3 |
| `computeBas` G1 + 1A + 1B match hand-calc to-the-cent on mixed GST/FRE/INP fixture | BAS-01, BAS-02 | golden | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "G1 1A 1B to the cent on mixed fixture"` | 05-1 → 05-4 |
| `computeBas` G2/G3/G10/G11 computed AND flagged internal-only under Simpler | BAS-01 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "G2 G3 G10 G11 marked internal-only under Simpler"` | 05-1 → 05-4 |
| `computeBas` W1 from wage expense accounts | BAS-03 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "W1 from wage accounts"` | 05-1 → 05-4 |
| `computeBas` W2 from PAYG Withholding liability | BAS-03 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "W2 from PAYG Withholding"` | 05-1 → 05-4 |
| `computeBas` T7 reads Entity.paygInstalmentAmount | BAS-04 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "T7 from Entity paygInstalmentAmount"` | 05-1 → 05-4 |
| `computeBas` respects period selector (quarter via period.ts) | BAS-01 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "period quarter filter"` | 05-1 → 05-4 |
| `computeBas` excludes superseded/voided/draft entries | BAS-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "excludes superseded voided draft"` | 05-1 → 05-4 |
| `computeBas` uses Decimal.ROUND_HALF_UP for 1A and ROUND_DOWN for W2 | BAS-02 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/bas.test.ts -t "explicit rounding modes per label"` | 05-1 → 05-4 |
| `computeIas` returns PAYG-only labels when gstRegistered=false | BAS-05 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/ias.test.ts -t "PAYG only when not GST registered"` | 05-1 → 05-4 |
| `computeIas` suppresses GST labels | BAS-05 | unit | `npx vitest run src/lib/tax/returns/fy2026/__tests__/ias.test.ts -t "GST labels suppressed"` | 05-1 → 05-4 |
| v3 → v4 migration adds Entity.aggregatedTurnover (undefined default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v3-to-v4.test.ts -t "aggregatedTurnover undefined default"` | 05-1 |
| v3 → v4 migration adds Entity.paygInstalmentAmount (undefined default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v3-to-v4.test.ts -t "paygInstalmentAmount undefined default"` | 05-1 |
| v3 → v4 migration preserves every existing field (round-trip) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v3-to-v4.test.ts -t "v3 to v4 round-trip non-destructive"` | 05-1 |
| v0 → v4 round-trip preserves all data | Migration | unit | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts -t "v0 to v4 round-trip"` | 05-1 |
| `CURRENT_VERSION === 4` | Migration | unit | `npx vitest run src/lib/migrations/__tests__/index.test.ts -t "CURRENT_VERSION is 4"` | 05-1 |
| `computeAggregatedTurnover` sums Revenue in FY period | Helper | unit | `npx vitest run src/lib/tax/__tests__/aggregatedTurnover.test.ts -t "sums Revenue in FY"` | 05-1 → 05-2 |
| `PrintBanner` renders title + page-1 banner + ATO codes inline by default | TAX-02 | component | `npx vitest run src/components/__tests__/PrintBanner.test.tsx -t "renders banner title and disclaimer"` | 05-1 (GREEN) |
| `AnomalyBadge` renders severity color + message | UX (helper) | component | `npx vitest run src/components/__tests__/AnomalyBadge.test.tsx -t "renders info and warn variants"` | 05-1 (GREEN) |
| `AssumptionsBlock` renders fixed 5-line assumption text | IND-03 | component | `npx vitest run src/components/__tests__/AssumptionsBlock.test.tsx -t "renders five assumption lines"` | 05-1 (GREEN) |
| Print CSS hides app shell (`.no-print` class), shows banner/footer | TAX-02 | unit | `npx vitest run src/styles/__tests__/print-css.test.ts -t "no-print rules present"` | 05-1 (GREEN) |
| `TaxReturnAssistant` renders Form I labels with ATO codes + plain English | IND-01, TAX-02 | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "renders Form I with ATO codes and labels"` | 05-1 → 05-2 |
| `TaxReturnAssistant` renders Print button + emits EXPORT_DATA audit | TAX-02, BAS-06 | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "print button emits audit"` | 05-1 → 05-2 |
| `TaxReturnAssistant` renders Assumptions block | IND-03 | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "renders assumptions block"` | 05-1 → 05-2 |
| `TaxReturnAssistant` renders B&P schedule (P1, P2, P8, item 15) | IND-02 | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "renders B and P schedule"` | 05-1 → 05-2 |
| `TaxReturnAssistant` shows small-business offset line when eligible | IND-04 | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "shows item 7D when eligible"` | 05-1 → 05-2 |
| `TaxReturnAssistant` renders inline AnomalyBadges + bottom anomalies section | IND-* | component | `npx vitest run src/components/__tests__/TaxReturnAssistant.test.tsx -t "anomalies inline and bottom section"` | 05-1 → 05-2 |
| `CompanyTaxReturn` renders Form C labels + Print button | COY-01, TAX-02 | component | `npx vitest run src/components/__tests__/CompanyTaxReturn.test.tsx -t "renders Form C with print button"` | 05-1 → 05-2 |
| `CompanyTaxReturn` shows explicit BRE basis text | COY-02 | component | `npx vitest run src/components/__tests__/CompanyTaxReturn.test.tsx -t "displays explicit BRE basis text"` | 05-1 → 05-2 |
| `CompanyTaxReturn` renders franking account section | COY-03 | component | `npx vitest run src/components/__tests__/CompanyTaxReturn.test.tsx -t "renders franking account section"` | 05-1 → 05-2 |
| `EntityForm` exposes aggregatedTurnover field with helper text + computed default | Schema | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "aggregatedTurnover field with computed default"` | 05-1 → 05-2 |
| `EntityForm` exposes paygInstalmentAmount field | BAS-04 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "paygInstalmentAmount field"` | 05-1 → 05-2 |
| `TrustTaxReturn` renders Form T labels + Print button | TRT-01, TAX-02 | component | `npx vitest run src/components/__tests__/TrustTaxReturn.test.tsx -t "renders Form T with print button"` | 05-1 → 05-3 |
| `TrustTaxReturn` renders per-beneficiary distribution table | TRT-02 | component | `npx vitest run src/components/__tests__/TrustTaxReturn.test.tsx -t "renders per-beneficiary distribution table"` | 05-1 → 05-3 |
| `TrustTaxReturn` always renders mandatory streaming disclaimer | TRT-02 | component | `npx vitest run src/components/__tests__/TrustTaxReturn.test.tsx -t "renders mandatory streaming disclaimer"` | 05-1 → 05-3 |
| `PartnershipTaxReturn` (NEW) renders Form P + per-partner distribution | PSP-01, PSP-02 | component | `npx vitest run src/components/__tests__/PartnershipTaxReturn.test.tsx -t "renders Form P with distribution"` | 05-1 → 05-3 |
| `PartnershipTaxReturn` Print button emits EXPORT_DATA audit | TAX-02 | component | `npx vitest run src/components/__tests__/PartnershipTaxReturn.test.tsx -t "print button emits audit"` | 05-1 → 05-3 |
| `BasIasAssistant` renders Simpler BAS lodgement labels (G1, 1A, 1B, W1, W2, T7) | BAS-01..04 | component | `npx vitest run src/components/__tests__/BasIasAssistant.test.tsx -t "renders Simpler BAS lodgement labels"` | 05-1 → 05-4 |
| `BasIasAssistant` shows internal-only G2/G3/G10/G11 marked separately | BAS-01 | component | `npx vitest run src/components/__tests__/BasIasAssistant.test.tsx -t "internal-only G2 G3 G10 G11 separately"` | 05-1 → 05-4 |
| `BasIasAssistant` renders IAS shape when gstRegistered=false | BAS-05 | component | `npx vitest run src/components/__tests__/BasIasAssistant.test.tsx -t "IAS shape when not GST registered"` | 05-1 → 05-4 |
| `BasIasAssistant` Print button + period selector via period.ts | BAS-06 | component | `npx vitest run src/components/__tests__/BasIasAssistant.test.tsx -t "print button and period selector"` | 05-1 → 05-4 |
| `ViewRouter` routes Partnership entity to PartnershipTaxReturn | PSP-01 | component | `npx vitest run src/components/__tests__/ViewRouter.test.tsx -t "routes partnership to PartnershipTaxReturn"` | 05-1 → 05-4 |
| Structural lint — no parameterless `new Date()` in any Phase 5 file | Hygiene | structural | `npx vitest run src/__tests__/structural-lint.test.ts -t "no parameterless new Date"` | 05-1 (extended) |
| Manual UAT — full Phase 5 end-to-end | All 5 success criteria | manual UAT | n/a — Plan 05-4 human-verify checkpoint | 05-4 |

*Status legend: 05-1 (RED) = Wave 0 scaffold; 05-2/05-3/05-4 (GREEN) = implementation flips it green; 05-1 (GREEN) = ships GREEN immediately (pure functions, pure UI primitives).*

---

## Wave 0 Requirements (Plan 05-1 must create these files)

All new test scaffolds — the implementation plans flip them GREEN:

### GREEN immediately (Wave 0)
- [ ] `src/lib/tax/rates/__tests__/marginal.test.ts` — IND-03 (FY2026 brackets, 5 boundary tests)
- [ ] `src/lib/tax/rates/__tests__/lito.test.ts` — IND-03 (max, stage-1 transition, stage-2 mid, cutout)
- [ ] `src/lib/tax/rates/__tests__/medicare.test.ts` — IND-03 (lower threshold, full 2%, shading, MLS tiers, family fallback)
- [ ] `src/lib/tax/rates/__tests__/bre.test.ts` — COY-02 (90%-dividend, 10%-dividend, 50M-turnover, 70-90% anomaly band)
- [ ] `src/lib/tax/rates/__tests__/smallBizOffset.test.ts` — IND-04 (cap, formula, turnover cutoff, non-positive guard)
- [ ] `src/lib/tax/__tests__/aggregatedTurnover.test.ts` — Schema helper (Revenue sum in FY period)
- [ ] `src/lib/migrations/__tests__/v3-to-v4.test.ts` — 3 additive-default cases + round-trip
- [ ] `src/lib/migrations/__tests__/round-trip.test.ts` — extend with v0→v4 case
- [ ] `src/lib/migrations/__tests__/index.test.ts` — verify CURRENT_VERSION === 4
- [ ] `src/components/__tests__/PrintBanner.test.tsx` — NEW (TAX-02)
- [ ] `src/components/__tests__/AnomalyBadge.test.tsx` — NEW (UX helper)
- [ ] `src/components/__tests__/AssumptionsBlock.test.tsx` — NEW (IND-03)
- [ ] `src/styles/__tests__/print-css.test.ts` — NEW (TAX-02 — sanity check that print.css contains `.no-print` and `@media print`)

### RED (flipped by 05-2)
- [ ] `src/lib/tax/returns/fy2026/__tests__/individual.test.ts` — 5 golden + meta tests (IND-01..04)
- [ ] `src/lib/tax/returns/fy2026/__tests__/company.test.ts` — 5 golden + franking tests (COY-01..03)
- [ ] `src/components/__tests__/TaxReturnAssistant.test.tsx` — 6 component tests (extend existing scaffold)
- [ ] `src/components/__tests__/CompanyTaxReturn.test.tsx` — 3 component tests (extend existing scaffold)
- [ ] `src/components/__tests__/EntityForm.test.tsx` — extend with aggregatedTurnover + paygInstalmentAmount

### RED (flipped by 05-3)
- [ ] `src/lib/tax/returns/fy2026/__tests__/trust.test.ts` — 6 golden + meta tests (TRT-01..03)
- [ ] `src/lib/tax/returns/fy2026/__tests__/partnership.test.ts` — 3 golden tests (PSP-01..02)
- [ ] `src/components/__tests__/TrustTaxReturn.test.tsx` — 3 component tests (extend existing scaffold)
- [ ] `src/components/__tests__/PartnershipTaxReturn.test.tsx` — NEW (2 component tests)

### RED (flipped by 05-4)
- [ ] `src/lib/tax/returns/fy2026/__tests__/bas.test.ts` — 8 golden tests (BAS-01..04)
- [ ] `src/lib/tax/returns/fy2026/__tests__/ias.test.ts` — 2 golden tests (BAS-05)
- [ ] `src/components/__tests__/BasIasAssistant.test.tsx` — 4 component tests (extend existing scaffold)
- [ ] `src/components/__tests__/ViewRouter.test.tsx` — extend with PartnershipTaxReturn routing

---

## Wave 0 Source Scaffolds (Plan 05-1 must also create these for tests to compile)

The Wave 0 RED-by-design relies on test files referencing types/exports that downstream plans will fill in. To keep `tsc --noEmit` GREEN throughout Phase 5, Wave 0 ships **interface-only modules + pure data** (no UI behaviour) for:

### Ship GREEN immediately (pure data/logic, no consumer dependency)
- [ ] `src/types.ts` — widen `Entity` with `aggregatedTurnover?: string` + `paygInstalmentAmount?: string`
- [ ] `src/lib/schemas.ts` — widen Zod entity schema to v4 (optional decimal-string fields)
- [ ] `src/lib/migrations/v3-to-v4.ts` — additive migration body (Wave 0 implements; pure data transform)
- [ ] `src/lib/migrations/index.ts` — bump `CURRENT_VERSION` to 4 and register migrateV3ToV4
- [ ] `src/lib/tax/labels/fy2026.ts` — fix 3 NAT typos + add full P8 / Form C / Form T / Form P label catalogues + LITO/Medicare/MLS constants + fix BRE legislative cite
- [ ] `src/lib/tax/returns/fy2026/types.ts` — `ReturnLabel`, `Anomaly`, `ComputedReturn<T>` shared types
- [ ] `src/lib/tax/returns/fy2026/_helpers.ts` — `rollupByLabel` shared helper (GREEN immediately)
- [ ] `src/lib/tax/rates/fy2026/marginal.ts` — pure function (GREEN)
- [ ] `src/lib/tax/rates/fy2026/lito.ts` — pure function (GREEN)
- [ ] `src/lib/tax/rates/fy2026/medicare.ts` — pure function (GREEN)
- [ ] `src/lib/tax/rates/fy2026/bre.ts` — pure function `brePassiveIncomePct` + `breRate` + 70-90% anomaly (GREEN)
- [ ] `src/lib/tax/rates/fy2026/smallBizOffset.ts` — pure function (GREEN)
- [ ] `src/lib/tax/aggregatedTurnover.ts` — `computeAggregatedTurnover(entity, accounts, entries, fy)` helper (GREEN)
- [ ] `src/components/PrintBanner.tsx` — pure presentation component (GREEN)
- [ ] `src/components/AnomalyBadge.tsx` — pure presentation component (GREEN)
- [ ] `src/components/AssumptionsBlock.tsx` — pure presentation component (GREEN)
- [ ] `src/styles/print.css` — pure CSS (GREEN; sanity-checked by print-css.test.ts)

### Ship as interface-only / scaffolded skeletons (compile-only; downstream plans fill them in)
- [ ] `src/lib/tax/returns/fy2026/individual.ts` — export signature `computeIndividualReturn(...)` returning a typed-but-empty `ComputedReturn<IndividualLabels>` so 05-2 fills it
- [ ] `src/lib/tax/returns/fy2026/company.ts` — export signature `computeCompanyReturn(...)` empty body
- [ ] `src/lib/tax/returns/fy2026/trust.ts` — export signature `computeTrustReturn(...)` empty body
- [ ] `src/lib/tax/returns/fy2026/partnership.ts` — export signature `computePartnershipReturn(...)` empty body
- [ ] `src/lib/tax/returns/fy2026/bas.ts` — export signature `computeBas(...)` empty body
- [ ] `src/lib/tax/returns/fy2026/ias.ts` — export signature `computeIas(...)` empty body
- [ ] `src/components/PartnershipTaxReturn.tsx` — skeleton (renders heading + "Pending Phase 5 Plan 05-3" placeholder; 05-3 fleshes it out)

**Rationale:** Rate helpers + types + shared helpers + presentation primitives are pure and have NO dependency on the compute*Return functions, so Wave 0 ships them GREEN. The 5 form compute functions and the 5 form renderers have heavier UI/business logic and live in Wave 2/3 — Wave 0 lands their signatures + empty bodies so consumers (and `tsc --noEmit`) compile.

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| End-to-end Phase 5 UAT: post realistic journals for each of 4 entity types → generate each return → verify ATO codes visible + plain English + disclaimer + assumptions + anomalies + Print works | All 5 success criteria + 20 reqs | Cross-component flow with visual + interactive + print-preview verification | Plan 05-4 human-verify checkpoint (≥25-step script) |
| Print preview shows ATO codes + plain-English labels + no UI chrome + disclaimer on every page (Form I, Form C, Form T, Form P, BAS) | TAX-02, BAS-06, all renderers | Cross-browser print rendering not testable headless | UAT steps: per form, click Print → preview window → confirm banner/footer/no-chrome/codes-visible |
| BRE basis text legible on Form C print | COY-02 | Visual layout | UAT: Print preview → "25% applied — passive income X% < 80% threshold" visible inline |
| Trust streaming disclaimer visible on Form T print | TRT-02 | Visual + mandatory copy | UAT: Print preview → mandatory disclaimer block visible above/below distribution table |
| Locked-FY working paper shows "LOCKED FY" banner tag | Locked FY | Visual | UAT: Set `entity.lockedFys = ['FY2026']` via Edit Entity → preview return → tag visible |
| EXPORT_DATA audit log entries appear after Print clicks | BAS-06, TAX-02 | Real audit log surface | UAT: Print each form → audit trail page shows EXPORT_DATA rows with `{ form, fy }` JSON |
| IND-04 small-business offset applied correctly on sole-trader fixture | IND-04 | Numeric verification by user | UAT: Create Individual entity with $30k net SB income + $4M turnover → confirm offset line shows correctly capped (not silently $0) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are flagged `checkpoint:human-verify`
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — every test scaffold listed above is created by Plan 05-1
- [x] No watch-mode flags in any command
- [x] Feedback latency < 10 s combined
- [x] StorageAdapter interface NOT widened (Phase 3 FINAL preserved)
- [x] v3 → v4 migration is additive only (no field removal or rename; both new fields optional with undefined defaults)
- [x] Zero new runtime dependencies
- [x] `nyquist_compliant: true` — every code-producing task has an automated check or is a structural type-check gate
- [x] All 5 success criteria mapped to ≥ 1 automated test + the Plan 05-4 UAT

**Approval:** planner-bound (initial — 2026-05-13)
