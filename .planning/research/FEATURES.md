# Feature Research

**Domain:** Australian small-business bookkeeping → tax-return tool (self-hosted, open-source)
**Researched:** 2026-05-10
**Confidence:** HIGH (AU tax domain well-understood; ATO form structures stable year-on-year; confirmed against PROJECT.md and existing codebase)

---

## Persona Key

| Symbol | Meaning |
|--------|---------|
| OWN | Business-owner / DIY only |
| AGT | Tax-agent only |
| BOTH | Relevant to both personas |

---

## Table Stakes

Features users expect from any credible accounting → tax-return product. Absent = product feels broken or untrustworthy.

### Bookkeeping Core

| Feature | Why Expected | Complexity | Persona | Notes |
|---------|--------------|------------|---------|-------|
| Double-entry journal entry (debit = credit enforced) | Fundamental bookkeeping invariant; users expect software to stop mistakes | Low | BOTH | Prototype has this — enforce at data layer, not just UI |
| Chart of Accounts (CRUD) with AU account categories | Every bookkeeping tool has a CoA; users arrive with one | Med | BOTH | Current 16 entries is insufficient; 80–150 credible AU SME accounts needed |
| Account hierarchy (parent / child groupings) | Users want to see "Total Operating Expenses" not 40 flat lines | Med | BOTH | E.g. "Operating Expenses" header → individual expense lines |
| GST code assignment per account (GST, FRE, INP, N-T) | AU-mandatory; every purchase/sale has a GST treatment | Low | BOTH | Prototype has 3 codes; INP (input-taxed) should also be supported |
| Opening trial balance import (CSV / Excel) | Most users arrive with existing books in a spreadsheet or prior software | High | BOTH | Deterministic parser + column-mapping UI; current AI-only path is fragile |
| Manual journal entry creation | Core workflow for adjustments, accruals, year-end entries | Low | BOTH | Prototype exists; needs edit/reverse/void capability |
| Edit and reverse posted journal entries | Users make mistakes; no accounting product forces delete-and-re-enter | Med | BOTH | Must leave an immutable audit record of the reversal |
| Trial balance report (date-range filtered) | Standard output from any GL; shows the state of the books | Low | BOTH | Prototype has this; needs period model applied consistently |
| Financial year period model (1 Jul – 30 Jun) | AU businesses run on the ATO financial year, not calendar year | Med | BOTH | Periods: FY, Q1–Q4, custom range — applied to TB, BAS, tax outputs |
| Durable persistence (survives browser cache clear) | Data loss for accounting records is catastrophic | High | BOTH | localStorage-only is a critical failure; File System API / SQLite-WASM / IndexedDB with mandatory export |
| Data export (JSON + CSV) | Users want portability; self-hosted ethos requires it | Med | BOTH | At minimum: entity data, journal entries, TB export |
| Audit trail (immutable, tamper-evident) | Accounting records must be traceable; agents need to show "who changed what" | Med | BOTH | Current AuditTrail.tsx is shallow; needs real immutability |
| Compliance disclaimer (always visible) | Legal/ethical obligation — software is not tax advice | Low | BOTH | Prototype has none; mandatory before any real use |

### Entity Management

| Feature | Why Expected | Complexity | Persona | Notes |
|---------|--------------|------------|---------|-------|
| All four AU entity types: Company (Pty Ltd), Trust, Sole Trader / Individual, Partnership | Core scope; missing any one excludes large audience segments | Med | BOTH | Each has distinct tax form, labels, and distribution rules |
| ABN / TFN fields on entity | Required on every ATO form; users need a place to record them | Low | BOTH | With AU-format validation (ABN = 11 digits, TFN = 9 digits) |
| GST registration flag on entity | Determines whether BAS is required; drives GST code defaults | Low | BOTH | GST-registered vs not-registered changes form output |
| Accounting method flag: cash vs accruals | ATO requires the method to be declared; drives how transactions are reported for BAS and tax | Low | BOTH | Affects G1/G3 GST reporting and income recognition |
| Financial year end (defaults to 30 June, allows 31 Dec or custom for special approval entities) | Not all entities are on standard FY | Low | BOTH | Rare but correct |

### Tax Outputs — BAS / IAS

| Feature | Why Expected | Complexity | Persona | Notes |
|---------|--------------|------------|---------|-------|
| BAS calculation: G1 (total sales), G2 (export sales), G3 (other GST-free sales), G10 (capital purchases), G11 (non-capital purchases), 1A (GST on sales), 1B (GST on purchases) | ATO-mandated labels for every GST-registered entity | Med | BOTH | Prototype has these; correctness needs testing against ATO worksheet method |
| BAS: PAYG withholding section (W1 total wages, W2 tax withheld) | Any entity with employees must report PAYG | Med | BOTH | Even sole traders may have employees |
| BAS: PAYG instalment section (T7 for quarterly instalment) | Most small companies/trusts pay PAYG instalments | Med | BOTH | T7 varies by instalment method (income × rate or pre-calculated ATO amount) |
| IAS: PAYG-only periods for non-GST entities | Entities not registered for GST still lodge IAS for PAYG | Low | BOTH | Separate from BAS |
| BAS period selection: monthly / quarterly | ATO assigns lodgement frequency; users need to select which period they're preparing | Low | BOTH | Default quarterly for most small businesses |
| Print-ready BAS summary (for manual transcription to myGov) | Users need to transcribe into the portal or hand to agent | Low | BOTH | Formatted output matching ATO field labels exactly |

### Tax Outputs — Income Tax Returns

| Feature | Why Expected | Complexity | Persona | Notes |
|---------|--------------|------------|---------|-------|
| Individual tax return (Form I) — business schedule: item 15 (net income or loss from business), item P1 (business income), P2 (deductions), P8 (net small business income) | Sole traders lodge via Form I with Supplementary sections | High | BOTH | Must cover all business schedule labels, not just 5–10 |
| Company tax return (Form C) key labels: gross sales (item 6), total expenses (item 7), taxable income (item 7S), tax offset for base rate entity (item 7D), franking account balance | Core labels for a small Pty Ltd | High | BOTH | NAT 0656; base rate entity threshold is $50M aggregated turnover — important default |
| Trust tax return (Form T): trust income, deductions, beneficiary distribution schedule | Trusts must distribute income; each beneficiary's share drives their individual return | Very High | BOTH | Distribution schedules are the complex part; amounts must reconcile to trust's net income |
| Partnership tax return (Form P): partnership income/loss, individual partner distribution statements | Partnerships pass income to partners; Form P + each partner's Form I | High | BOTH | Partner share percentages must be maintained |
| Tax rate / threshold accuracy: 25% base rate company tax (base rate entity), 30% otherwise; individual marginal rates | Correctness of tax-payable calculation | Med | BOTH | Current prototype has inline magic numbers; needs centralized constants with FY versioning |
| Print-ready tax return summary per entity type | Users need to hand this to ATO via myGov or give to their agent | Med | BOTH | Labelled fields, ATO field codes, calculated amounts — formatted for human transcription |

### Guidance & UX

| Feature | Why Expected | Complexity | Persona | Notes |
|---------|--------------|------------|---------|-------|
| In-context field help (plain-English label descriptions) | Non-accountant users don't know what "G10" or "item 7S" means | Med | OWN | Tooltip / panel per ATO label; key differentiator but also table stakes for non-accountant tool |
| Anomaly / warning flags (unbalanced TB, unmapped accounts, GST mismatches) | Users need the software to catch their mistakes before they print a return | Med | BOTH | Surfaced in-context at the point of the problem, not buried in a report |
| Account → tax-label pre-mapping (smart defaults on default CoA) | Without this, every user must manually map 80+ accounts before the return works | High | BOTH | The most labour-intensive setup task; good defaults eliminate 90% of it |

---

## Differentiators

Features that give AussieLedger competitive advantage over Xero/MYOB/QuickBooks and free alternatives (GnuCash, Manager.io).

| Feature | Value Proposition | Complexity | Persona | Notes |
|---------|-------------------|------------|---------|-------|
| Completely free, no subscription, no seat limits | Xero is $35–$85/month per entity; MYOB $29–$99/month; QuickBooks $20–$65/month. Zero cost is a genuine category-level differentiator for SMEs whose subscription has lapsed | Low (policy) | BOTH | Reinforced by open-source: no vendor lock-in, no feature gating |
| Self-hosted: data stays on user's machine | Cloud tools hold accounting data on vendor servers. Accountants and privacy-conscious owners value local control | Med (infra/docs) | BOTH | Requires clear setup docs and durable local persistence |
| Guided year-end wizard (non-accountant path) | Xero/MYOB assume accountant literacy; GnuCash has no guidance at all. A sequenced wizard (review unmapped accounts → confirm GST → preview return → finalise) lowers the bar | High | OWN | Wizard-first for owner mode; skippable for agent mode |
| Both personas in one tool with mode switching | Commercial tools charge differently for agent vs client access; free tools don't address agents at all. One tool, mode switch, no paywall | Med | BOTH | Mode is a local instance setting, not a cloud account tier |
| All four AU entity types without upsell | MYOB and Xero gatekeep trust/partnership support behind higher plans or separate products | Med (taxonomy) | BOTH | Company + Trust + Sole Trader + Partnership all in v1 |
| ATO-labelled print-ready outputs matching actual form fields | Most spreadsheet templates don't use ATO field codes. GnuCash/Manager produce generic P&L, not ATO-structured summaries. Agents can drop these directly into their lodgement software | High | BOTH | NAT 0656 (Form C), 0660 (Form I), 0659 (Form T), 0976 (Form P) field alignment |
| Hybrid workflow: import opening TB + ongoing journals | Xero requires ongoing transactional data entry; pure-TB tools don't handle year-round adjustments. Hybrid meets users where they are | Med | BOTH | Most compelling for the "lapsed subscription" segment arriving with a prior year's TB |
| Tax-year versioning of rates/thresholds | Commercial tools auto-update; most free tools hardcode stale values. Documented FY constants with a refresh path is a meaningful trust signal for agents | Med | AGT | Constants file with FY tag; changelogs; documented manual update process |
| Open-source: tax logic is inspectable and auditable | Agents and technically-literate owners can verify the math. No other free AU tax tool is fully open-source with visible tax computation | Low (posture) | AGT | "Show your working" builds trust for an accounting product |
| Multi-client workspace for agents (fast entity switching, no per-client upsell) | Agent-focused tools (HandiTax, LodgeiT) are expensive. A free agent workspace for smaller/simpler clients has no direct competitor | Med | AGT | Agent mode: entity list, fast switch, no wizard overhead |

---

## Anti-Features

Features to deliberately not build. Explicitly excluded from scope with reasoning, so they don't sneak back in.

| Anti-Feature | Why It Gets Requested | Why Not Build It | What to Do Instead |
|---|---|---|---|
| SBR / direct ATO lodgement | "Why can't I lodge directly from the app?" | ATO software developer registration, RAM/myID credential handling, ATO conformance testing, ongoing certification maintenance — months of compliance work before any user value | Print-ready output with ATO field codes; users transcribe to myGov or hand to agent |
| Bank feeds / Open Banking | "Just connect my bank" | Paid APIs (Basiq, Yodlee, CDR accreditation), commercial data-holder agreements, PCI-adjacent security scope, conflicts with open-source self-hosted ethos | TB import from CSV/Excel covers the same data; no API costs, no credential risk |
| Bank statement CSV parsing + transaction reconciliation | "I want to import my bank statement" | Pulls in a second product surface: transaction categorisation, rules engine, splits, transfers, reconciliation UX — doubles scope without being on the TB→tax critical path | Opening TB import covers the year-end use case; transaction reconciliation is a v2+ milestone |
| AI chatbot / conversational assistant | "Ask your accountant" UX is appealing | API key in client bundle (security), hallucination risk on tax advice, requires paid API, breaks offline/self-hosted instances, chosen explicitly against by the user | Guided wizards + smart defaults + in-context help tooltips achieve the same guidance goal deterministically |
| Invoicing / AR / AP / inventory / payroll | Xero competitors have all of this | None of these features sit on the TB → tax return critical path; each is a significant product surface; building them dilutes the core value proposition | Document as explicit v2+ gap; TB import absorbs the output of any external invoicing tool |
| FBT, LCT, fuel-tax credits, R&D tax incentive, Division 7A loans, CGT events, rental schedules | "What about my rental property?" | Each is a specialist tax surface requiring dedicated schedules, ATO label sets, and domain-specific rules — collectively a multi-month project | Surface as known gaps with disclaimer; treat as v2+ modules after core forms are solid |
| Multi-tenant hosted SaaS / cloud offering | "Can I access from anywhere?" | Central hosting, multi-user auth, billing, data isolation, uptime obligations — turns a free tool into a service business | Self-hosted; user can deploy on VPS if remote access is needed; provide clear deployment docs |
| Foreign entity support (US LLC, UK Ltd, etc.) | Prototype had a "US Big Law Firm" seed entity | AU-only is a deliberate constraint; multi-jurisdiction tax rules multiply complexity non-linearly | Remove foreign seed data; document AU-only scope clearly in UI and README |
| Slide / presentation generator | Prototype had Gemini-powered slide generator | Off-mission decorative feature; pulls in AI API dependency | Remove entirely |
| "ATO Connected" status indicator (simulated or real) | Looks professional, users might expect real-time ATO connection | Simulated version is actively misleading; real version requires SBR (out of scope) | Remove; replace with honest disclaimer about print-ready / manual transcription workflow |
| Real-time collaborative editing | "Multiple users editing simultaneously" | Complex CRDT / locking problem; conflicts with local-file persistence model; unnecessary for small-entity use | Mode-level access control (owner vs agent view) is sufficient; single-writer model is fine for v1 |

---

## Feature Dependencies

```
Durable persistence
    └──required by──> All features (data loss makes every other feature worthless)

Chart of Accounts (with GST codes + tax-label mapping)
    └──required by──> Journal entry
    └──required by──> Opening TB import (account matching)
    └──required by──> BAS calculation (G1/G10/G11 depend on GST codes)
    └──required by──> All tax return outputs (label rollups depend on CoA → ATO label mapping)

Journal entries (posted, balanced)
    └──required by──> Trial balance
    └──required by──> BAS calculation
    └──required by──> All income tax return outputs

Trial balance
    └──required by──> Year-end review wizard
    └──required by──> Print-ready tax return outputs

GST code on account
    └──required by──> BAS G1, G10, G11 calculation
    └──required by──> GST auto-calc on journal lines

Account → ATO tax-label mapping (smart defaults)
    └──required by──> Individual tax return (item 15 / P1 / P2 rollups)
    └──required by──> Company tax return (item 6 / 7 rollups)
    └──required by──> Trust tax return (income / deduction rollups)
    └──required by──> Partnership tax return (income / loss rollups)

Entity type (Company / Trust / Sole Trader / Partnership)
    └──required by──> Correct tax return form selection
    └──required by──> Account → tax-label mapping (label sets differ per entity type)
    └──required by──> Distribution schedule (Trust: beneficiaries; Partnership: partners)

Beneficiary / partner register
    └──required by──> Trust distribution schedule (Form T)
    └──required by──> Partnership distribution statement (Form P)

Period model (financial year / quarters)
    └──required by──> BAS period selection
    └──required by──> Trial balance date filtering
    └──required by──> Tax return year selection

Tax rate / threshold constants (FY-versioned)
    └──required by──> Company tax payable calculation
    └──required by──> Individual marginal rate calculation
    └──required by──> BAS PAYG instalment (T7)

Print-ready output (PDF / print CSS)
    └──required by──> BAS summary
    └──required by──> All income tax return summaries
    └──enhances──> Tax-agent workflow (agent hands summary to lodgement software)

Year-end wizard
    └──requires──> Trial balance
    └──requires──> Account → tax-label mapping
    └──enhances──> Owner mode (guided non-accountant path)
    └──not required by──> Agent mode (agent skips wizard)

Agent mode (multi-client workspace)
    └──requires──> Durable persistence
    └──requires──> Entity management (multi-entity)
    └──enhances──> Fast entity switching
```

### Dependency Notes

- **BAS requires GST codes on accounts:** Without GST codes, the G1/G10/G11 bucketing is impossible. CoA must be built with GST codes before BAS is useful.
- **Tax returns require CoA → ATO label mapping:** Smart defaults on the default CoA unlock tax return outputs without manual setup. This is the highest-leverage single feature.
- **Trust and partnership returns require distribution registers:** Beneficiary / partner records must exist before Form T or Form P can produce their schedules. These are simple data entities but must be modelled before the return components are built.
- **Durable persistence is a foundation prerequisite:** Nothing else is trustworthy until data survives a browser cache clear. This must be the first major feature delivered.
- **Period model must be consistent:** TB date filtering, BAS period, and tax return year must all use the same period abstraction. Building them independently (as the prototype did) creates subtle inconsistencies.

---

## MVP Definition

### Launch With (v1)

- [ ] Durable persistence (not localStorage-only) — foundational; everything else fails without it
- [ ] Chart of Accounts (80–150 accounts, AU SME defaults, GST codes, tax-label pre-mapping for all 4 entity types)
- [ ] Journal entry (create, edit, reverse, void) with hard data-layer balance enforcement
- [ ] Opening TB import (deterministic CSV parser + column-mapping UI)
- [ ] Trial balance (date-range filtered, consistent period model)
- [ ] BAS calculation (G1, G2, G3, G10, G11, 1A, 1B, W1, W2, T7) — print-ready
- [ ] IAS (PAYG-only) — print-ready
- [ ] Individual income tax return — business schedule (items 1, 6, 15, P1, P2, P8) — print-ready
- [ ] Company tax return (Form C) — core labels for small Pty Ltd — print-ready
- [ ] Trust tax return (Form T) including beneficiary distribution schedule — print-ready
- [ ] Partnership tax return (Form P) including partner distribution statements — print-ready
- [ ] FY-versioned tax rate / threshold constants (centralised, not magic numbers)
- [ ] Entity management (all 4 types, ABN/TFN, GST registration, accounting method)
- [ ] Compliance disclaimer (always visible)
- [ ] Data export (JSON + CSV)
- [ ] Audit trail (immutable per-entry log of create / edit / reverse actions)
- [ ] Anomaly flags (unmapped accounts, unbalanced TB, GST mismatches)
- [ ] Account → ATO tax-label pre-mapping (smart defaults on default CoA)
- [ ] Owner mode: simplified nav + year-end preparation wizard
- [ ] Agent mode: multi-client list, fast entity switching, no wizard overhead
- [ ] In-context plain-English help on ATO labels

### Add After Validation (v1.x)

- [ ] Beneficiary / partner registers with history tracking — required for Trust/Partnership returns but may be simplified for v1 launch
- [ ] PDF export (vs print-CSS in v1) — nice to have; print-to-PDF via browser covers v1
- [ ] Tax-year constants update workflow / tooling — manual edit is OK for v1; documented process is sufficient
- [ ] Multi-user access on shared self-hosted instance (optional password gate)

### Future Consideration (v2+)

- [ ] Bank statement CSV parsing + transaction reconciliation — separate product surface; defer until core is proven
- [ ] FBT, Division 7A, CGT, rental schedule modules — specialist surfaces; defer after core forms stable
- [ ] SBR / direct ATO lodgement — compliance project requiring ATO developer registration
- [ ] Mobile-native experience — current responsive web shell is adequate for v1
- [ ] Plugin / extension system for third-party integrations

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Durable persistence | HIGH | High | P1 |
| Default CoA (80–150 accounts, pre-mapped) | HIGH | Med | P1 |
| Journal entry (create + edit + reverse) | HIGH | Low–Med | P1 |
| Opening TB import (deterministic) | HIGH | High | P1 |
| Account → tax-label smart defaults | HIGH | Med | P1 |
| BAS calculation (all labels) | HIGH | Med | P1 |
| Company tax return (Form C) | HIGH | High | P1 |
| Individual tax return (Form I) business schedule | HIGH | High | P1 |
| Trust tax return (Form T) + distributions | HIGH | Very High | P1 |
| Partnership tax return (Form P) + distributions | HIGH | High | P1 |
| FY-versioned rate constants | HIGH | Low | P1 |
| Compliance disclaimer | HIGH | Low | P1 |
| Anomaly flags | HIGH | Med | P1 |
| Print-ready output (print CSS) | HIGH | Low–Med | P1 |
| Year-end wizard (owner mode) | HIGH | High | P1 |
| Agent mode (multi-client, fast switch) | HIGH | Med | P1 |
| In-context label help | Med | Med | P2 |
| Audit trail (deep, immutable) | Med | Med | P2 |
| Data export (JSON + CSV) | Med | Low | P2 |
| PDF export (library-generated) | Med | Med | P2 |
| Tax-year update tooling | Med | Low | P2 |
| Beneficiary / partner register history | Low | Med | P3 |
| Multi-user auth (optional password gate) | Low | High | P3 |

---

## Competitor Feature Analysis

| Feature | Xero / MYOB / QuickBooks | GnuCash / Manager.io | AussieLedger v1 Target |
|---------|--------------------------|----------------------|------------------------|
| Cost | $30–$99/month per entity | Free (GnuCash), free tier limited (Manager.io) | Free, unlimited entities |
| Self-hosted | No | GnuCash yes (desktop), Manager.io no | Yes (primary distribution) |
| AU entity types | Company + Sole Trader (Pty Ltd trust/partnership behind higher plans) | Generic (not AU-specific) | All 4 AU types in v1 |
| ATO-labelled tax form outputs | Yes (Form C/I via accounting reports, not ATO field codes) | No — generic P&L only | ATO field-code aligned outputs |
| BAS calculation | Yes | GnuCash: manual; Manager.io: basic GST report | Full BAS + IAS labels |
| Opening TB import | Yes | Yes (GnuCash: QIF/OFX; Manager.io: CSV) | CSV/Excel with column-mapping UI |
| Ongoing journal entry | Yes | Yes | Yes |
| Guided wizard for non-accountants | No — assumes literacy | No | Year-end wizard (owner mode) |
| Tax-agent workspace | Separate agent portal (Xero Practice Manager, billed) | Not supported | Agent mode (free, same tool) |
| Direct ATO lodgement | Xero Tax (separate, expensive) | No | Out of scope v1 |
| Open-source / auditable | No | GnuCash: yes | Yes |
| Bank feeds | Yes | No | Out of scope v1 |

---

## AU-Specific Domain Notes

These notes capture AU tax domain details that affect feature implementation directly.

**GST Codes (relevant for CoA and BAS)**
- `GST` — taxable supply / taxable purchase (10%)
- `FRE` — GST-free supply or purchase
- `INP` — input-taxed supply (financial services, residential rent) — not claimable
- `N-T` — not reportable / out of scope for GST (wages, ATO payments, owner drawings)
- `CAP` — capital purchase (goes to G10, not G11)

**BAS Worksheet Method (ATO option 3 — simplest for small businesses)**
- G1: Total sales (all sales including GST)
- G2: Export sales
- G3: Other GST-free sales
- G10: Capital purchases (10% claimable)
- G11: Non-capital purchases (10% claimable)
- 1A = (G1 − G2 − G3) ÷ 11
- 1B = (G10 + G11) ÷ 11

**Company tax rates (FY2025–26)**
- Base rate entity (aggregated turnover < $50M, ≤ 80% passive income): 25%
- All other companies: 30%
- Imputation rate follows the applicable tax rate (25% or 30%)

**Individual marginal rates (FY2025–26 — verify against ATO each year)**
- $0 – $18,200: Nil
- $18,201 – $45,000: 19%
- $45,001 – $135,000: 32.5%
- $135,001 – $190,000: 37%
- $190,001+: 45%
- Plus 2% Medicare levy (with low-income thresholds)
- Low Income Tax Offset (LITO) up to $700 phases out between $37,500 and $66,667

**Trust distribution rules**
- Trust must distribute all net income to avoid top-rate tax on undistributed income
- Each beneficiary includes their share in their own return (Form I, item 13)
- Trustee resolution required by 30 June; distribution schedule is the critical document

**Partnership**
- Partnership itself pays no income tax; files Form P
- Each partner includes their share in Form I (item 13, partnership income)
- Partner loss shares may be restricted (non-commercial loss rules apply)

**Lodgement deadlines (print-ready workflow context)**
- Individual / sole trader returns: 31 October (self-lodgement); 15 May via tax agent
- Company / Trust / Partnership returns: 28 February (standard); 15 May via agent
- BAS (quarterly): 28 October, 28 February, 28 April, 28 July
- BAS (monthly): 21st of following month

---

## Sources

- ATO website: tax return form specifications (NAT 0656 Form C, NAT 0660 Form I, NAT 0659 Form T, NAT 0976 Form P) — confidence HIGH (stable AU tax domain)
- ATO BAS worksheet method — confidence HIGH
- ATO company tax rates FY2025–26 — confidence HIGH (base rate entity 25%, standard 30%)
- ATO individual marginal rates FY2025–26 — confidence MEDIUM (rates confirmed from training data; flag for annual verification against ATO tax tables)
- Competitor feature analysis (Xero, MYOB, QuickBooks, GnuCash, Manager.io) — confidence MEDIUM (based on training data; pricing may have changed; verify current plans before publishing)
- PROJECT.md and existing codebase analysis — confidence HIGH (primary source of truth for scope)

---

*Feature research for: AussieLedger — AU small-business bookkeeping → tax-return tool*
*Researched: 2026-05-10*
