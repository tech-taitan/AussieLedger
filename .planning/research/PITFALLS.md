# Pitfalls Research

**Domain:** AU accounting / bookkeeping / tax-return software — open-source, self-hosted
**Researched:** 2026-05-10
**Confidence:** MEDIUM–HIGH (AU tax domain knowledge from training; no live web search available; TPB/ATO regulatory detail flagged where verification recommended)

---

## Critical Pitfalls

### Pitfall 1: Stale ATO Label Specs Baked Into Code

**What goes wrong:**
Tax return labels (NAT numbers), field names, section headings, and the accounts they aggregate change every financial year. The ATO publishes updated specifications (NAT 0660 individual, NAT 0656 company, NAT 0659 trust, NAT 0976 partnership) for each income year. If label constants are embedded in TypeScript source with no versioning and no documented refresh path, the return produced for 2025–26 will use 2023–24 label names. Users who manually transcribe into myGov will be copying values into the wrong fields.

**Why it happens:**
The prototype already has this pattern — `src/constants.ts` and tax return components contain inline label strings with no financial-year tagging, no changelog, and no mechanism to pull updated specs. It is tempting to treat "the labels don't change that often" as justification for skipping the refresh process. They do change — small changes every year, occasionally large restructures (e.g. the 2023–24 individual return had material changes to the business schedule).

**How to avoid:**
1. Centralise all label strings in a single versioned file: `src/lib/tax/labels/{year}.ts` (e.g. `fy2026.ts`), exporting a typed constant that every tax component imports.
2. Each financial year, the release notes for that year's label file must document which labels changed vs the prior year, with ATO source (NAT number and URL).
3. The app must display the financial year for which the return was produced; the label file in use must be tagged to that year.
4. Never derive label files from memory alone — cross-check against ATO's current-year "TaxPack" or API taxonomy documentation before each FY update.

**Warning signs:**
- Tax return component imports a string constant whose origin is undocumented.
- A label like `"6S"` appears in multiple components without a shared source.
- No `// Source: NAT 0660 FY2025-26` comment near a label definition.

**Phase to address:** Tax math centralisation phase (early) + a documented annual label-refresh process defined before first FY-end release.

---

### Pitfall 2: Producing a "Tax Return" That Is Legally Advice, Not a Working Paper

**What goes wrong:**
In Australia, providing a tax return to another person for a fee — or holding yourself out as providing a tax (financial) advice service — is a regulated activity under the Tax Agent Services Act 2009 (TASA). The Tax Practitioners Board (TPB) enforces this. A free, open-source tool that users run themselves is not "providing a service" and therefore does not require TPB registration for the tool itself. However, the product's framing matters enormously:

- Saying "here is your tax return" implies the return is complete and correct → this could be interpreted as tax advice.
- The "ATO Connected (Simulated)" label in the current prototype is particularly dangerous — any vestige of ATO branding implies authoritative connection to the ATO.
- Marketing copy like "lodge your tax return" implies the output is lodgement-ready, which it is not (v1 is print-ready / working-paper only).

A tax agent using this tool to produce output for a client is using it as a tool — their own TPB registration covers the advice. A business owner using it for their own return is not receiving "advice" (you can't give yourself tax advice). The risk is in the grey middle: if the product appears to be providing an authoritative completed return rather than a working paper.

**Why it happens:**
Marketing instinct. "Tax return software" is cleaner copy than "tax return working paper software." The distinction seems pedantic until a TPB complaint or an ASIC marketing-standards issue arises.

**How to avoid:**
1. Always use the framing "working paper," "draft return," "print-ready summary for review," never "your tax return is ready to lodge."
2. The disclaimer must be persistent and prominent — not a click-through at setup, but visible on every tax output page: *"AussieLedger produces a working paper only. It is not tax advice. You are responsible for reviewing and lodging your return. If you are unsure, consult a registered tax agent."*
3. Remove every simulated ATO-connection indicator from the UI immediately (it is already flagged in CONCERNS.md; treat it as a compliance risk, not just a cosmetic cleanup).
4. Never use ATO logos, brand colours, or myGov UI chrome in output.
5. Document the TPB boundary explicitly in the project README: this tool is a working-paper generator, not a registered tax agent service.

**Warning signs:**
- Any UI copy that says "lodge," "submit to ATO," or "your return is complete."
- The phrase "ATO Connected" anywhere in the interface.
- A PDF export that looks identical to an ATO portal screen.

**Phase to address:** Foundation / demo-cleanup phase (immediately). Disclaimer infrastructure must land before any tax output feature ships.

---

### Pitfall 3: GST Rounding Produces Systematically Wrong BAS

**What goes wrong:**
GST in Australia is calculated as 1/11 of a GST-inclusive amount. When this is applied line-by-line across journal entries and then summed, floating-point arithmetic produces results that differ from the ATO's expected rounding convention. The ATO requires that each line be rounded to the nearest cent before aggregation — not that the total be rounded. Applied in the wrong order, a BAS with 200 transactions can be out by $1–$3, which triggers ATO reconciliation flags.

Additionally, GST-free (FRE), input-taxed, and not-reportable (N-T) transactions must be excluded from G1 and the GST calculation correctly. Mixing up "GST-free" (taxable but zero-rated — e.g. fresh food, exports) with "input-taxed" (e.g. financial supplies, residential rent — where the business cannot claim GST credits on related purchases) is a common source of silent errors. These are distinct GST classifications with distinct effects on G11 and 1B.

**Why it happens:**
The prototype uses `/11` inline without rounding per transaction. GST-free and input-taxed are both coded as "no GST" in the simplified prototype, collapsing a distinction that matters for G10/G11 and input-tax-credit clawback calculations.

**How to avoid:**
1. Centralise GST calculation in a single pure function: `calculateGST(amountIncGST: Decimal): Decimal` using a decimal arithmetic library (not native JS floats). `decimal.js` or `big.js` are the standard choices.
2. Distinguish GST codes with precision: `GST` (taxable standard), `FRE` (GST-free), `INP` (input-taxed), `N-T` (out-of-scope / not reportable). The current prototype only has `GST`, `FRE`, `N-T`.
3. BAS calculation must follow ATO's field-by-field logic: G1 = total sales including GST; G3 = GST-free sales; G4 = input-taxed sales; G10/G11 uses the same classification split on the purchases side.
4. Write unit tests that reproduce known correct BAS outputs for a set of fixture transactions.

**Warning signs:**
- GST calculated with `/11` inline anywhere outside a central function.
- No `decimal.js` or equivalent in dependencies.
- BAS test cases are absent or use round numbers that hide floating-point errors.
- `FRE` and `INP` treated identically in BAS aggregation.

**Phase to address:** Tax math centralisation phase. Must be resolved before BAS output is considered correct.

---

### Pitfall 4: Company Tax Rate Applied Wrong (Base Rate Entity)

**What goes wrong:**
Small Australian companies with aggregated turnover below $50 million that derive 80% or more of their assessable income from "base rate entity passive income" pay a higher tax rate (currently 30%) rather than the lower rate (currently 25%). This is counterintuitive — the "small business" company rate is only available if the company is NOT passive-income-dominated. Getting this wrong overstates refunds or underpays tax by 5 percentage points on the full taxable income.

The prototype has a company tax return component with a tax rate but the base-rate-entity (BRE) test logic is almost certainly absent — this is a classification that requires knowing the breakdown of income types in the current year.

**Why it happens:**
The BRE rules are non-obvious. Many developers (and many small-business owners) assume "small company = 25% rate" without knowing the passive-income threshold. The ATO publishes the BRE test criteria in the company return instructions but it is easy to miss when building the form.

**How to avoid:**
1. The company return wizard must ask: "What percentage of this company's income is from dividends, interest, rent, royalties, or net capital gains?" If the user enters ≥80%, the rate must default to 30% with an explanation.
2. The tax rate applied must be shown explicitly on the return summary with its basis: "25% rate applied (BRE test: passive income < 80%)."
3. Link to ATO guidance on the BRE test from the wizard help text.
4. Add a unit test: company with 90% dividend income → 30% rate applied.

**Warning signs:**
- Company tax rate is a hardcoded constant, not derived from income composition.
- The wizard does not ask about income source breakdown.
- No distinction between "small business entity" and "base rate entity" in the codebase.

**Phase to address:** Company tax return phase.

---

### Pitfall 5: Trust Distribution Without Streamed Characters

**What goes wrong:**
Australian trust tax returns require distributing net income to beneficiaries. Modern trust deeds and the ATO's trust streaming rules (post-2010 amendments) allow specific classes of income — franked dividends, capital gains — to be "streamed" to specific beneficiaries. If the software treats all trust distributions as undifferentiated shares of net income, it will produce an incorrect Form T for any trust that streams capital gains or franked dividends.

The penalty for getting trust streaming wrong is not just a wrong tax return — it can invalidate the tax-effectiveness of the distribution, triggering trustee tax at the top marginal rate (47%) on amounts that should have been taxed in beneficiaries' hands at lower rates.

**Why it happens:**
Streaming is complex and most introductory treatments of trust taxation omit it. A developer building a trust form will implement the simple "beneficiaries get % of net income" model because it works for simple trusts.

**How to avoid:**
1. v1 scope must explicitly document that streaming is NOT supported. The trust return wizard must display a warning: "This tool calculates non-streamed distributions only. If your trust deed provides for streaming of capital gains or franked dividends, consult a tax agent."
2. The data model must not make streaming impossible to add later: beneficiary distribution records should store income-type breakdowns, even if v1 always treats them as "ordinary income."
3. Capital gains and franked dividend income streams should be identifiable at the journal level (separate account categories) so they can be correctly attributed if streaming support is added.

**Warning signs:**
- Trust distribution is a single "net income ÷ beneficiary %" calculation with no income-type breakdown.
- No disclaimer on the trust return about streaming limitations.
- The data model has `beneficiaryShare: number` without an income-type field.

**Phase to address:** Trust tax return phase. Streaming is out of v1; the disclaimer and data-model placeholder must be in v1.

---

### Pitfall 6: Financial Year Cadence Mismatch Throughout the App

**What goes wrong:**
Australia's financial year runs 1 July – 30 June. This is not a configuration detail — it pervades every calculation: period filtering, comparative reports, BAS quarters (Oct, Feb, Apr, Jul lodgement dates), PAYG instalment cycles, and which label-year file applies to a given set of transactions. If the app uses calendar-year assumptions anywhere (January 1 defaults, December 31 year-end defaults, "last 12 months" rolling windows), it will silently produce wrong period summaries.

**Why it happens:**
React date pickers and utility libraries (date-fns, dayjs) default to calendar year. Most international accounting examples use Dec 31. Copy-paste from non-AU sources introduces calendar-year assumptions.

**How to avoid:**
1. Define `AU_FINANCIAL_YEAR_START_MONTH = 7` and `AU_FINANCIAL_YEAR_START_DAY = 1` as global constants. Every date-range default in the app must derive from these, not be hardcoded.
2. The entity form must capture the financial year end date (most AU entities use 30 June, but substituted-accounting-period entities use different dates — the form must at minimum default to 30 June and allow override).
3. Date range filters on TB, dashboard, and BAS must default to the current AU financial year, not the calendar year.
4. BAS quarters must use ATO-prescribed quarter boundaries: Q1 = Jul–Sep, Q2 = Oct–Dec, Q3 = Jan–Mar, Q4 = Apr–Jun.

**Warning signs:**
- Any `new Date(year, 0, 1)` (January 1) or `new Date(year, 11, 31)` (December 31) hardcoded anywhere in financial calculations.
- Dashboard "current period" defaulting to the calendar year.
- BAS periods not matching ATO quarter boundaries.

**Phase to address:** Period model phase (foundational — must be correct before any reporting ships).

---

### Pitfall 7: localStorage Persistence and Silent Data Loss

**What goes wrong:**
The current prototype stores all accounting data in `localStorage`. This is already flagged as CRITICAL in CONCERNS.md. The specific failure modes that matter for a *tax* tool are:
- A browser cache clear destroys all journals, permanently, with no warning.
- Chrome's storage eviction policy under disk pressure can silently remove localStorage data.
- `localStorage` has a ~5 MB limit; a business with several hundred journal entries and a full chart of accounts will approach or exceed this.
- No schema version means a code update that changes type shapes silently corrupts deserialized data.
- The user has no way to verify their data integrity without reading raw JSON from browser DevTools.

**Why it happens:**
localStorage is the path of least resistance for a React SPA prototype. It is fine for demos; it is not acceptable for bookkeeping records.

**How to avoid:**
1. Replace localStorage with a durable persistence layer before any real financial data can be entered. Options in priority order for this project: (a) File System Access API with a user-chosen `.json` or `.sqlite` file — fully local, survives cache clears, portable; (b) IndexedDB with mandatory on-mutation export — more reliable than localStorage but still browser-bound; (c) SQLite via `sql.js` (WASM) with a File System Access save target.
2. All data types must carry a `schemaVersion` field. On load, a migration function must transform old schemas to current before use, with the prior-version data preserved as a backup.
3. On every session start, check the schema version and warn the user if data was migrated.
4. Provide an explicit "Export data" action that produces a portable file, accessible from the main nav. Make it obvious, not buried.
5. Never delete the underlying data on an "archive" or "delete entity" action without a confirm + export-first prompt.

**Warning signs:**
- Any `localStorage.setItem` call in new code.
- State types in `src/types.ts` lack `schemaVersion`.
- No migration function in the persistence layer.

**Phase to address:** Persistence phase — must be the earliest foundational phase, before any meaningful user data can accumulate.

---

### Pitfall 8: No Tests on Tax Math = Unverifiable Correctness

**What goes wrong:**
Tax calculations are arithmetic applied to accounting data under rules that change annually. Without automated tests:
- A refactor that fixes one BAS label silently breaks another.
- A financial-year label update introduces a regression no one notices until a user lodges a wrong return.
- Two developers implement "GST on capital purchases" differently in different components and both pass code review because the reviewer cannot run a counterexample.

This is not a "nice to have" quality improvement — it is the core promise of the product. A free tool that produces the wrong numbers is actively harmful because users will trust it.

**Why it happens:**
Tests were never added to the prototype. Tax math tests require fixture data (a known chart of accounts + known journal entries + expected output) which takes time to construct. It is easy to defer.

**How to avoid:**
1. The test framework (Vitest + React Testing Library) must be installed and passing CI before any tax math feature is considered done.
2. For every tax output (BAS G fields, individual return labels, company return labels, trust distribution, partnership schedule), there must be at least one golden-path test: known inputs → verified expected output.
3. The golden outputs must be manually verified against ATO guidance (not against the code itself). Document the source.
4. Edge cases to cover: zero-income return, loss year, mixed GST codes, BRE vs non-BRE company rate, trust with undistributed income, partnership with unequal distributions.

**Warning signs:**
- No `*.test.ts` or `*.spec.ts` files adjacent to tax calculation modules.
- CI green without any test run step.
- Tax math "tested" only by manual inspection of the UI.

**Phase to address:** Foundation phase. Tests must be infra-ready before any tax math logic is written or refactored.

---

## Domain-Specific Pitfalls (Moderate Severity)

### Pitfall 9: ABN / TFN Validation by Format Only

**What goes wrong:**
ABNs have a weighted-digit checksum algorithm. TFNs have a separate checksum. The current prototype accepts any string in those fields (no validation at all). Accepting a malformed ABN/TFN means the printed return will contain an invalid identifier, which the ATO will reject. Worse, a user who miskeys their ABN by one digit gets no feedback until they lodge.

**How to avoid:**
Implement ABN checksum validation (the algorithm is publicly documented by the ATO — a 10-digit number, first subtracted by 1, then each digit multiplied by a published weight set, modulus 89 = 0). Implement TFN format validation (8 or 9 digits; checksum algorithm documented). Show inline validation on the entity form. These are pure functions with no external dependencies.

**Warning signs:**
- Entity form accepts any string for ABN/TFN.
- No test for ABN/TFN validation logic.

**Phase to address:** Entity model / foundation phase.

---

### Pitfall 10: "Print-Ready" Output That Is Not Actually Usable

**What goes wrong:**
The v1 value proposition is that a user prints the working paper and either transcribes it into myGov or hands it to a tax agent. If the print layout:
- uses screen UI chrome (sidebar, nav buttons, hover states),
- omits ATO label codes (the user needs to know "6S" means gross income to find the right myGov field),
- does not group fields in the same order as the ATO's published form,
- does not fit on A4 with readable font sizes,

...then the output is not usable for its stated purpose and the core value proposition fails.

**How to avoid:**
1. Print/export layouts must be separate from screen layouts — use CSS `@media print` or a dedicated PDF-renderer component, not `window.print()` on a screen-formatted page.
2. Every output field must show the ATO label code alongside the plain-English label name (e.g. "Gross business income (6S): $142,000").
3. The field order must follow the ATO's published form order for that return type.
4. Test on A4 paper before shipping the feature.

**Warning signs:**
- Print CSS is absent or applies screen styles.
- Tax output shows label names without ATO label codes.
- No A4 print test has been done.

**Phase to address:** Tax output / print phase.

---

### Pitfall 11: Wizard "Guidance" That Leads a Non-Accountant to the Wrong Answer

**What goes wrong:**
When a wizard asks "Is this a deductible expense?" and provides a yes/no button, a non-accountant will answer yes for things that are not deductible (personal expenses, entertainment, non-work-related travel) because the question sounds simpler than it is. The software will then include those amounts in the deductions schedule. The user lodges a return with inflated deductions.

This is the hardest pitfall to manage because the product's entire value proposition for the business-owner persona is "I don't need an accountant." But the more guidance the software provides on *what* to enter, the more it risks providing wrong guidance to someone who enters their personal holiday as a "travel expense."

**How to avoid:**
1. Wizard questions should ask "what did you record?" not "is this deductible?" — the software aggregates what the user's journals say; it does not decide deductibility.
2. For high-risk categories (meals, travel, motor vehicle, home office), add mandatory in-context warnings: "Motor vehicle expenses often have a personal-use component. Ensure only the business-use portion has been journalled."
3. The year-end wizard must include a step: "Review your expense accounts — have you removed any personal expenses?"
4. Never present a deduction total without a "I confirm these are genuine business expenses" checkpoint.

**Warning signs:**
- Wizard asks "is X deductible?" rather than "how much did you spend on X?"
- High-risk expense categories have no disclaimer.
- The return can be finalised without a user attestation step.

**Phase to address:** Year-end wizard phase.

---

### Pitfall 12: Open-Source Schema Migration Without a Migration Runner

**What goes wrong:**
When a contributor changes `src/types.ts` — adding a field to `JournalEntry`, renaming an entity property, changing a nested structure — every existing user's persisted data becomes incompatible on next load. Because there is no central server, there is no migration job. The user's data silently breaks (or worse: partially deserializes with `undefined` fields that propagate into tax calculations).

This is distinct from general schema migration challenges because:
- Self-hosted means no ability to run a migration on the user's data centrally.
- Open-source means contributors may not realise their type change is a breaking migration.

**How to avoid:**
1. Every data type that is persisted must carry a `_v: number` (version) field.
2. A migration registry (`src/lib/migrations/`) maps `v{N} → v{N+1}` with a pure transform function for each version.
3. On load, the app reads the stored version, runs all applicable migrations in order, and writes back the migrated data.
4. CONTRIBUTING.md must state: "Any change to a persisted type requires a migration entry."
5. Migrations are tested with the same fixture data used in tax math tests.

**Warning signs:**
- `src/types.ts` lacks version fields on any type that is serialized.
- No migration registry exists.
- A PR changes a `JournalEntry` field without a corresponding migration.

**Phase to address:** Persistence phase (same phase as replacing localStorage).

---

### Pitfall 13: Self-Hosted Instance Has No Error Visibility

**What goes wrong:**
When a self-hosted user encounters a bug in tax math — a calculation that silently returns `NaN`, a migration that partially fails, a GST code that produces the wrong BAS figure — the developer has no visibility. There is no Sentry, no crash report, no telemetry. The user either:
- Does not notice (worst case: lodges a wrong return).
- Files a GitHub issue with "it's broken" and no reproduction steps.

This is worse than typical SaaS because there is no central production environment to observe.

**How to avoid:**
1. Runtime assertions in tax math: if a calculation produces `NaN`, `Infinity`, or a negative value where none is expected, log a visible in-app error with the calculation context, not a silent `console.error`.
2. The year-end wizard must have an explicit "validate before finalising" step that runs all assertion checks and surfaces any anomalies.
3. Provide a "diagnostic export" that packages the current app state (anonymised where possible) into a JSON file the user can attach to a GitHub issue.
4. Document explicitly in README: "AussieLedger has no telemetry. If you encounter a bug, use the diagnostic export."

**Warning signs:**
- Tax calculations do not check for `isNaN()` or `isFinite()` on results.
- The app can reach a "finalised return" state with `NaN` values in output fields.
- There is no in-app mechanism to surface calculation anomalies.

**Phase to address:** Tax math phase + quality / CI phase.

---

### Pitfall 14: The "ATO Connected" Indicator and Regulatory Theatre

**What goes wrong:**
The existing prototype has an "ATO Connected (Simulated)" status indicator. Any indicator that suggests a live connection to the ATO — even labelled "simulated" — creates a misleading impression that:
- The software is submitting data to the ATO in real time.
- The return has been validated against ATO systems.
- The software has ATO endorsement or registration.

Neither is true. ATO software developer registration is a formal process; using ATO branding without it is prohibited. The "simulated" qualifier does not neutralise the impression created by the indicator — users who don't read carefully will take the green "ATO Connected" badge at face value.

**How to avoid:**
Remove the indicator entirely (it is already in the CONCERNS.md cleanup list; treat it as a compliance risk not a cosmetic one). Replace with a factual status: "Working paper — not submitted to ATO." Never use ATO brand assets, colour schemes, or logos.

**Warning signs:**
- Any badge, icon, or status text referencing ATO connection.
- ATO logos or brand colours in print output.
- The word "submitted" or "lodged" used to describe any app output.

**Phase to address:** Foundation / demo-cleanup phase — must be resolved in the first phase, before any users see the product.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Hardcode tax rates as numeric literals | Faster to type | Every rate change requires a code search; easy to miss one | Never — use named constants in a versioned rates file |
| Use native JS `number` for money | No extra dependency | Rounding errors accumulate across BAS, producing wrong totals | Never for tax math — use `decimal.js` or `big.js` |
| One tax return component per entity type with duplicated logic | Initially readable | A correctness fix must be applied 4 times; drift is certain | Never in production — share a `lib/tax/` engine |
| localStorage for all data | Zero infrastructure | Data loss on cache clear; no schema migration; ~5 MB limit | Prototype/demo only — must be replaced before any real user data |
| Skip BRE test, always apply 25% company rate | Simpler form | Wrong tax for passive-income companies; material error | Never |
| Single `FRE` GST code (no `INP` distinction) | Fewer codes to explain | GST credit clawback on input-taxed supplies produces wrong BAS | Never beyond MVP proof of concept |
| Display tax output without persistent disclaimer | Cleaner UI | TPB / ASIC risk; users may believe output is final lodgement-ready return | Never — disclaimer is not optional |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Gemini API key in Vite `define` bundle | Key extracted from `dist/` JS by any user who opens DevTools; quota theft | Move to server-side proxy or remove AI from critical path; never use `define` to inject secrets |
| No authentication on a shared self-hosted instance | Any URL visitor reads all clients' tax and financial data | Document clearly: default single-user with no auth; if sharing an instance, add a password gate (basic HTTP auth or simple session) |
| TFN / ABN stored in plaintext localStorage | Browser extension, XSS, or another tab can read `localStorage`; TFN is sensitive personal information under Privacy Act | If persisting to file, consider field-level encryption for TFN; at minimum, warn users in setup that localStorage is not encrypted |
| AI response parsed without type validation | Malformed or adversarially crafted AI JSON can inject data into ledger state | Use a runtime schema validator (Zod) on all AI responses before they touch app state |
| No Content Security Policy | XSS can exfiltrate tax data | Set a strict CSP header in the serving configuration; document in deployment guide |
| CSV import executes arbitrary column mapping | A crafted CSV with injected formula strings or unexpected column shapes can corrupt ledger | Sanitise all CSV values; reject files that exceed expected column counts or contain formula-injection patterns (`=`, `+`, `-` prefix) |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing accounting jargon ("debit," "credit," "contra account") without explanation | Non-accountants enter transactions backwards; balance errors accumulate silently | Use plain-English alternatives in business-owner mode: "money in / money out" with jargon shown as a secondary label |
| Allowing "finalise return" with unmapped accounts | User produces a return missing income or expenses because an account was not tagged to a label | Gate "finalise" behind a "verify mappings" step that lists all accounts with no tax label and requires a decision for each |
| Surfacing all four entity-type forms to a sole trader | Overwhelm; wrong form selected | Entity creation wizard must ask entity type first and hide irrelevant forms entirely |
| Displaying a return that looks like the ATO's myGov interface | User believes it is already lodged or validated | Use clearly distinct design language from ATO/myGov; label output explicitly as "Working Paper" |
| In-context help that tells user "this is deductible" for categories | User claims deductions they should not | Help text must describe what the label means and where to find the amount — never whether it is deductible |
| Period filter defaults to "all time" | TB includes prior-year balances; tax calculations include wrong period | Default all filters to current AU financial year on first use |
| No confirmation on irreversible actions (delete entity, delete journal) | Users delete their own books by accident, with no recovery | Require typed confirmation ("type the entity name to delete") for any action that destroys financial records |

---

## "Looks Done But Isn't" Checklist

- [ ] **BAS output:** Often missing correct G3/G4 split (GST-free vs input-taxed) — verify with a fixture that includes both GST-free and input-taxed transactions
- [ ] **Company tax return:** Often missing BRE test — verify that a passive-income company triggers 30% rate, not 25%
- [ ] **Trust return:** Often missing beneficiary distribution statements — verify that the Form T output includes a distribution statement for each named beneficiary
- [ ] **Individual return:** Often missing business schedule labels (Part B of the individual return) — verify that turnover, cost-of-sales, and each expense category map to the correct NAT 0660 labels
- [ ] **Period filtering:** Often defaults to calendar year — verify that all report defaults produce 1 July – 30 June windows
- [ ] **GST calculation:** Often uses JS native `number` — verify that 11-transaction BAS matches hand-calculated total to the cent
- [ ] **Print output:** Often includes screen UI chrome — verify with a physical or PDF print that navigation, buttons, and hover states are absent
- [ ] **Schema migration:** Often untested for round-trip — verify that loading data saved by v0.x schema correctly migrates to current schema
- [ ] **Disclaimer:** Often absent from print output — verify that the working-paper disclaimer appears on every printed/exported page, not just on screen
- [ ] **ABN validation:** Often absent — verify that a transposed ABN digit fails the checksum and shows a clear error

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Stale label specs found post-release | MEDIUM | Update label file for the affected year; re-run tests; release a patch; add changelog entry documenting which fields changed |
| localStorage data loss for a user | HIGH | No automated recovery possible; can only offer: re-import from CSV TB, re-enter journals from source documents |
| Schema migration corrupts data | HIGH | Ship a rollback migration; if data is corrupted in localStorage, provide a recovery tool that attempts to parse the old format; encourage users to export before updating |
| BAS rounding error discovered post-lodgement | HIGH | User must lodge an amended BAS (ABN-holder's responsibility); provide corrected calculation; document the fix prominently |
| Misleading UI copy triggers TPB complaint | VERY HIGH | Remove offending copy immediately; update disclaimer; publish public statement; consult AU legal counsel |
| API key leaked in bundle | HIGH | Revoke the key immediately; rotate; audit usage logs for abuse; deploy fixed build |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Stale ATO label specs | Tax math centralisation (early) + annual release process | Every tax output has a `fyYear` tag; label source is commented with NAT reference |
| TPB / regulatory framing | Foundation / demo-cleanup (Phase 1) | Audit of all UI copy; no "ATO Connected," "lodge," or "submit" language present |
| GST rounding / code misclassification | Tax math centralisation | BAS unit tests pass for fixtures including GST-free, input-taxed, and standard-rated transactions |
| BRE company tax rate | Company tax return phase | Unit test: passive-income company → 30% rate applied |
| Trust streaming omission | Trust tax return phase | Disclaimer visible; data model has income-type fields on beneficiary distributions |
| Financial year cadence | Period model phase (foundational) | No `new Date(year, 0, 1)` hardcodes; BAS quarters match ATO dates |
| localStorage data loss | Persistence phase (Phase 1) | Data survives browser cache clear; schema version field present on all types |
| No tests on tax math | Foundation / CI phase (Phase 1) | CI runs Vitest; at least one golden-output test per tax return type |
| ABN / TFN validation | Entity model / foundation phase | ABN checksum test passes for valid and invalid ABNs |
| "Print-ready" output unusable | Tax output / print phase | A4 print test passes; ATO label codes visible on output; no screen chrome in print |
| Wizard leads to wrong deduction | Year-end wizard phase | Wizard does not ask "is this deductible?"; high-risk categories show mandatory warnings |
| Schema migration breaks | Persistence phase | Migration round-trip test passes for v0 → current |
| No error visibility | Tax math + CI phase | NaN assertion in all tax calculations; year-end wizard runs validation before finalise |
| "ATO Connected" indicator | Foundation / demo-cleanup (Phase 1) | Zero instances of "ATO Connected," "simulated," or ATO brand assets in UI |
| Decimal arithmetic errors | Tax math centralisation | All money arithmetic uses `decimal.js`; no `number` type in financial calculations |

---

## Sources

- ATO: Tax Agent Services Act 2009 (TASA) and TPB registration requirements — *training data; verify current TPB guidance at tpb.gov.au*
- ATO: Individual tax return instructions NAT 0660; Company tax return instructions NAT 0656; Trust tax return instructions NAT 0659; Partnership tax return instructions NAT 0976 — *published annually; must be verified against current-year versions before each FY release*
- ATO: GST classification codes (FRE, INP, N-T, GST) — ATO Tax Invoice and BAS requirements
- ATO: Base Rate Entity rules — Tax Laws Amendment (Enterprise Tax Plan) Act 2017; current threshold $50M aggregated turnover
- ATO: Trust streaming rules — Tax Laws Amendment (2011 Measures No. 5) Act 2011, Subdivision 207-B ITAA 1997
- ATO: ABN checksum algorithm — abr.business.gov.au developer documentation
- ATO: BAS field definitions — BAS instructions and GST guide NAT 7392
- TPB: Code of Professional Conduct and registration requirements — tpb.gov.au *[confidence: MEDIUM — verify current requirements, particularly around software tools used by registered agents]*
- CONCERNS.md analysis — project-internal, HIGH confidence
- PROJECT.md scope and constraints — project-internal, HIGH confidence

---

*Pitfalls research for: AussieLedger — AU accounting / tax-return / open-source self-hosted*
*Researched: 2026-05-10*
*Confidence notes: AU tax domain (MEDIUM–HIGH from training); TPB/regulatory detail (MEDIUM — verify against current tpb.gov.au); inherited codebase issues (HIGH — sourced from CONCERNS.md direct analysis)*
