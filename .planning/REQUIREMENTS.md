# Requirements: AussieLedger

**Defined:** 2026-05-10
**Core Value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

## v1 Requirements

### Foundation (FND)

Quality-floor and credibility prerequisites — must clear these before any user data is trustworthy.

- [ ] **FND-01**: User's bookkeeping data survives a browser cache clear (durable persistence; not `localStorage`-only)
- [ ] **FND-02**: User can export their entire dataset (entities, journals, accounts, audit log) as JSON and CSV
- [ ] **FND-03**: User can import a previously-exported JSON dataset to restore on the same or a different instance
- [x] **FND-04**: A self-hosted instance works without any third-party API keys configured (AI features must be optional)
- [x] **FND-05**: No user-facing surface displays misleading "ATO Connected", simulated agency status, or fabricated trend metrics
- [x] **FND-06**: An always-visible disclaimer states the product produces working papers / draft returns, not tax advice; the user/agent retains responsibility for the lodged return
- [x] **FND-07**: A test suite (Vitest) exists with at least one golden-output test per tax return type (Individual, Company, Trust, Partnership) and per-label tests for BAS arithmetic
- [x] **FND-08**: All monetary calculations use a decimal arithmetic library (not native JS floats) to avoid GST rounding errors
- [x] **FND-09**: Application data has a schema version stored alongside it; on load, a migration runner upgrades older schemas in place

### Bookkeeping core (BOOK)

- [x] **BOOK-01**: User can create a journal entry with two or more lines that must balance (debits = credits) before posting; balance is enforced at the data layer, not only at the UI
- [x] **BOOK-02**: User can edit a posted journal entry; the original version is preserved in the audit log
- [x] **BOOK-03**: User can reverse a posted journal entry (creating a balancing reversal entry referencing the original)
- [x] **BOOK-04**: User can void / delete a draft (unposted) journal entry
- [x] **BOOK-05**: User can browse a default Australian SME chart of accounts containing 80–150 accounts grouped by account type (Asset, Liability, Equity, Revenue, Expense)
- [x] **BOOK-06**: User can create, edit, and delete chart-of-accounts entries with code, name, type, GST code, and tax-label mapping per entity type
- [x] **BOOK-07**: User can group accounts into a parent / child hierarchy (e.g. "Operating Expenses" → "Rent", "Utilities", "Wages")
- [x] **BOOK-08**: Each account carries a GST code from the AU set: GST, FRE (GST-free), INP (input-taxed), N-T (not reportable), CAP (capital)
- [x] **BOOK-09**: User can view a trial balance for a selected period showing per-account debit, credit, and net balance, with a balanced/out-of-balance footer
- [x] **BOOK-10**: User can filter and report on any period: a financial year (1 Jul – 30 Jun), a BAS quarter, or a custom date range — the same period model applies to TB, BAS, and tax returns
- [x] **BOOK-11**: User can view an immutable audit trail of every create / edit / reverse / void action with timestamp, actor, before/after values, and entity-id scoping
- [x] **BOOK-12**: User can search journal entries by reference, description, account, date range, and amount range

### Entity management (ENT)

- [x] **ENT-01**: User can create entities of all four AU types: Company (Pty Ltd), Trust, Sole Trader / Individual, Partnership
- [x] **ENT-02**: User can record ABN (with format validation: 11-digit modulus-89 check) and TFN (with format-only check; never validated network-side)
- [x] **ENT-03**: User can flag an entity as GST-registered, with effect on whether BAS is required and on default GST codes for new accounts
- [x] **ENT-04**: User can declare the accounting method (cash or accruals) per entity, applied to BAS reporting and income recognition
- [x] **ENT-05**: User can set the financial-year-end per entity (defaults to 30 June)
- [x] **ENT-06**: User can edit, archive, deactivate, or delete entities; deletion either cascades or is blocked when journal entries reference the entity
- [x] **ENT-07**: User can record a register of beneficiaries on a Trust entity (name, percentage or fixed share)
- [x] **ENT-08**: User can record a register of partners on a Partnership entity (name, percentage share)

### Trial balance import (IMP)

- [x] **IMP-01**: User can upload a CSV or Excel (XLSX) file containing an opening trial balance
- [x] **IMP-02**: A deterministic parser handles standard CSV / XLSX rows; user is shown a column-mapping UI to confirm or override the parser's column choices (code, name, debit, credit)
- [x] **IMP-03**: User can match imported account codes against the internal CoA via fuzzy text matching, with an explicit "create new account" option per unmatched row
- [x] **IMP-04**: AI-assisted account matching is an optional enhancement, not the only path; the import works fully with no API key configured
- [x] **IMP-05**: Re-importing the same trial balance is idempotent (does not produce duplicate opening journals)
- [x] **IMP-06**: Import produces a single dated opening-balances journal entry that the user reviews and posts (or rejects)

### BAS / IAS (BAS)

- [ ] **BAS-01**: User can produce a BAS for a selected period (monthly or quarterly) with all GST labels: G1 (total sales), G2 (export sales), G3 (other GST-free sales), G10 (capital purchases), G11 (non-capital purchases), 1A (GST on sales), 1B (GST on purchases)
- [ ] **BAS-02**: BAS GST calculation follows the ATO worksheet method using GST codes on accounts and decimal arithmetic (not float)
- [ ] **BAS-03**: User can produce the PAYG withholding section: W1 (total wages and salaries), W2 (amounts withheld from W1)
- [ ] **BAS-04**: User can produce the PAYG instalment section (T7) using either the income × rate method or a pre-calculated ATO instalment amount
- [ ] **BAS-05**: User can produce an IAS (instalment activity statement) for entities not registered for GST, covering PAYG only
- [ ] **BAS-06**: User can export a print-ready BAS / IAS summary with ATO field codes for transcription into myGov

### Income tax returns — shared (TAX)

- [x] **TAX-01**: Tax-rate and threshold constants are centralised in a single FY-versioned module (no magic numbers in components)
- [ ] **TAX-02**: User can produce a print-ready tax return PDF (or print-CSS browser print) for any entity type
- [x] **TAX-03**: Each account in the default CoA is pre-mapped to the correct ATO labels for every relevant entity type (individual, company, trust, partnership) on first install
- [ ] **TAX-04**: User can override the auto-mapping for any account in the CoA editor
- [x] **TAX-05**: All tax-output components consume a single shared "tax engine" library of pure functions (no duplicated rollup logic across components)

### Individual tax return (IND)

- [ ] **IND-01**: User can produce a Form I (individual) return with the Business and Professional Items schedule populated from the entity's GL
- [ ] **IND-02**: Return covers the business-schedule labels: item P1 (business income), P2 (deductions), P8 (net small business income), and item 15 (net business income flow-through)
- [ ] **IND-03**: Return calculates net taxable income from business and shows individual marginal-rate tax payable using FY-versioned brackets (including LITO and Medicare levy)
- [ ] **IND-04**: User can apply the small business income tax offset where eligible — 16% × tax payable on net small business income, capped at $1,000, for individuals with aggregated turnover < $5M; item 7D on Form I (re-scoped from the original COY-04 which was mis-attributed to companies — see 05-CONTEXT.md decisions)

### Company tax return (COY)

- [ ] **COY-01**: User can produce a Form C (company) return covering core labels for a small Pty Ltd: gross sales (item 6), total expenses (item 7), taxable income (item 7S)
- [ ] **COY-02**: Tax payable is calculated using the Base Rate Entity test: 25% if aggregated turnover < $50M and ≤ 80% passive income, otherwise 30%
- [ ] **COY-03**: Return records franking-account opening balance and movements (credits / debits) so the year-end balance can be carried forward
- [~] **COY-04**: ~~User can apply the small business tax offset where eligible (item 7D)~~ — **OBSOLETE / re-scoped to IND-04** in 05-CONTEXT. Item 7D is on Form I (Individual sole-traders), not Form C (Company). Companies get the BRE 25%/30% derived rate via COY-02 with no separate small-business offset.

### Trust tax return (TRT)

- [x] **TRT-01**: User can produce a Form T (trust) return showing trust net income, deductions, and taxable income
- [x] **TRT-02**: User can produce per-beneficiary distribution statements that aggregate to the trust's net income
- [x] **TRT-03**: Distribution percentages or fixed amounts come from the entity's beneficiary register (ENT-07)

### Partnership tax return (PSP)

- [x] **PSP-01**: User can produce a Form P (partnership) return showing partnership income, deductions, and net income or loss
- [x] **PSP-02**: User can produce per-partner distribution statements based on the entity's partner register (ENT-08)

### Guidance / UX (UX)

- [ ] **UX-01**: A "Year-End Preparation" wizard walks the user through a sequenced flow: review unreconciled accounts → confirm CoA → check unmapped accounts → preview tax output → finalise
- [ ] **UX-02**: Anomaly flags surface in-context (not in a separate report) for: unbalanced journal entries, unmapped accounts referenced in posted entries, GST code mismatches, accounts missing tax-label mappings
- [ ] **UX-03**: Every ATO label and field in tax outputs has plain-English in-context help (tooltip or panel) explaining what it means and what data populates it
- [ ] **UX-04**: User can navigate the app on mobile (responsive layout); core flows (journal entry, TB review, return preview) work on a 375px-wide viewport
- [ ] **UX-05**: User can switch between consumer / owner mode (simplified nav, wizard-first) and tax-agent mode (multi-entity workspace, no wizards) via a setting

### Personas (PERS)

- [ ] **PERS-01**: In owner mode, the default landing surface is the user's single primary entity dashboard with the year-end wizard one click away
- [ ] **PERS-02**: In agent mode, the default landing surface is a client list with fast switching between entities and bulk operations on entities
- [ ] **PERS-03**: Mode is a per-instance setting; switching modes does not require re-creating data

### Deployment / open-source (DEP)

- [ ] **DEP-01**: A new user can clone the repository, run `npm install && npm run build`, and serve a working instance with no paid services configured
- [ ] **DEP-02**: An optional Express + better-sqlite3 server can be started for shared/firm instances, with documented deployment steps
- [ ] **DEP-03**: README documents both deployment shapes (single-user local, small-firm VPS), with step-by-step instructions
- [ ] **DEP-04**: Repository has a permissive open-source licence (e.g. Apache 2.0, matching existing per-file SPDX headers) and a CONTRIBUTING.md with a hard rule about schema migrations
- [x] **DEP-05**: CI (e.g. GitHub Actions) runs `npm run build`, `npm run lint`, and the test suite on every push

## v2 Requirements

Acknowledged but deferred. Will be reconsidered after v1 is shipped and in use.

### Bank reconciliation

- **REC-01**: User can upload a bank statement CSV
- **REC-02**: User can categorise bank transactions into accounts via rules and manual coding
- **REC-03**: User can reconcile bank account balance to GL balance per period

### Specialist tax surfaces

- **SPEC-01**: FBT (Fringe Benefits Tax) calculation and return
- **SPEC-02**: CGT event tracking and small business CGT concessions
- **SPEC-03**: Division 7A loan tracking
- **SPEC-04**: Rental property schedule
- **SPEC-05**: R&D Tax Incentive
- **SPEC-06**: Fuel Tax Credits
- **SPEC-07**: Luxury Car Tax (LCT)

### Direct lodgement

- **LOD-01**: SBR / direct ATO lodgement (Form C, Form I, BAS) — requires ATO software developer registration
- **LOD-02**: Pre-fill from ATO services (income, payment summaries, interest)

### Operations

- **OPS-01**: Multi-user access on a shared self-hosted instance with simple-password gate
- **OPS-02**: Native PDF export (vs print-CSS) with finer typography control
- **OPS-03**: FY constants update workflow / tooling

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| SBR / direct ATO lodgement (in v1) | Months of compliance work (registration, certification, AUSkey/RAM) before any user value. v1 print-ready output gets the user from A to B. |
| Bank feeds / Open Banking | Paid APIs (Basiq, Yodlee), CDR accreditation, ongoing commercial agreements. Conflicts with self-hosted free-in-critical-path constraint. |
| Bank statement CSV parsing in v1 | Adjacent product surface (categorisation, rules engine, splits, transfers). Doubles scope; off the TB → tax return critical path. Deferred to v2. |
| AI chatbot / conversational assistant | API-key-in-bundle problem, hallucination risk on tax advice, breaks offline self-host. User explicitly chose wizards + smart defaults instead. |
| Multi-tenant hosted SaaS / managed cloud | Distribution is open-source self-hosted. Hosting, billing, and uptime obligations turn a free tool into a service business. Anyone can fork and host commercially. |
| Invoicing / AR / AP / inventory / payroll | Adjacent GL features that don't sit on the TB → tax return path. v1 stays focused. |
| Foreign-entity support (US LLC, UK Ltd, etc.) | AU-only is a deliberate constraint; multi-jurisdiction tax rules multiply complexity non-linearly. The current `"Pearson Specter Litt"` seed is removed. |
| Slide / presentation generator | Off-mission decorative feature in the prototype; pulls in AI dependency. Removed entirely. |
| "ATO Connected" indicator (simulated or real) | Simulated version is misleading (TPB regulatory risk); real version requires SBR. Removed. |
| Real-time collaborative editing | Single-writer model is fine for v1. Mode-level access control is sufficient for owner / agent separation. |
| Hard-coded `+12% / -5% vs last month` trend strings | Currently displayed without underlying data; misleading. Removed unless backed by real comparisons. |
| Conditional / specialist tax forms (FBT, CGT, Div 7A, rental, R&D, fuel-tax, LCT) | Each is a specialist tax surface requiring dedicated schedules and label sets. Documented as known gaps; tracked in v2. |

## Traceability

Each requirement maps to exactly one phase. Updated by the gsd-roadmapper 2026-05-10.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 3 | Pending |
| FND-02 | Phase 3 | Pending |
| FND-03 | Phase 3 | Pending |
| FND-04 | Phase 2 | Complete |
| FND-05 | Phase 1 | Complete |
| FND-06 | Phase 1 | Complete |
| FND-07 | Phase 1 | Complete |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Complete |
| BOOK-01 | Phase 4 | Pending |
| BOOK-02 | Phase 4 | Pending |
| BOOK-03 | Phase 4 | Pending |
| BOOK-04 | Phase 4 | Pending |
| BOOK-05 | Phase 4 | Pending |
| BOOK-06 | Phase 4 | Pending |
| BOOK-07 | Phase 4 | Pending |
| BOOK-08 | Phase 2 | Complete |
| BOOK-09 | Phase 4 | Pending |
| BOOK-10 | Phase 2 | Complete |
| BOOK-11 | Phase 4 | Pending |
| BOOK-12 | Phase 4 | Pending |
| ENT-01 | Phase 4 | Pending |
| ENT-02 | Phase 1 | Complete |
| ENT-03 | Phase 4 | Pending |
| ENT-04 | Phase 4 | Pending |
| ENT-05 | Phase 4 | Pending |
| ENT-06 | Phase 4 | Pending |
| ENT-07 | Phase 4 | Pending |
| ENT-08 | Phase 4 | Pending |
| IMP-01 | Phase 4 | Pending |
| IMP-02 | Phase 4 | Pending |
| IMP-03 | Phase 4 | Pending |
| IMP-04 | Phase 4 | Pending |
| IMP-05 | Phase 4 | Pending |
| IMP-06 | Phase 4 | Pending |
| BAS-01 | Phase 5 | Pending |
| BAS-02 | Phase 5 | Pending |
| BAS-03 | Phase 5 | Pending |
| BAS-04 | Phase 5 | Pending |
| BAS-05 | Phase 5 | Pending |
| BAS-06 | Phase 5 | Pending |
| TAX-01 | Phase 2 | Complete |
| TAX-02 | Phase 5 | Pending |
| TAX-03 | Phase 2 | Complete |
| TAX-04 | Phase 2 | Pending |
| TAX-05 | Phase 2 | Complete |
| IND-01 | Phase 5 | Pending |
| IND-02 | Phase 5 | Pending |
| IND-03 | Phase 5 | Pending |
| IND-04 | Phase 5 | Pending (re-scoped from COY-04 in 05-CONTEXT) |
| COY-01 | Phase 5 | Pending |
| COY-02 | Phase 5 | Pending |
| COY-03 | Phase 5 | Pending |
| COY-04 | Phase 5 | Obsolete (mis-scoped; see IND-04) |
| TRT-01 | Phase 5 Plan 05-3 | Delivered (computeTrustReturn Form T labels 5B/5E/5F/5L/5M/5N/5S/5T/11J/26/56 + TrustTaxReturn renderer) |
| TRT-02 | Phase 5 Plan 05-3 | Delivered (distributeTrustIncome + Item 57 distribution table + mandatory streaming disclaimer always visible) |
| TRT-03 | Phase 5 Plan 05-3 | Delivered (distributeTrustIncome reads entity.beneficiaries; 60/40 split → $120k/$80k reconciles to-the-cent) |
| PSP-01 | Phase 5 Plan 05-3 | Delivered (computePartnershipReturn Form P labels P1/P2/P8 + PartnershipTaxReturn renderer) |
| PSP-02 | Phase 5 Plan 05-3 | Delivered (distributePartnershipNetIncome reads entity.partners; Item 54 per-partner distribution table) |
| UX-01 | Phase 6 | Pending |
| UX-02 | Phase 6 | Pending |
| UX-03 | Phase 6 | Pending |
| UX-04 | Phase 6 | Pending |
| UX-05 | Phase 6 | Pending |
| PERS-01 | Phase 6 | Pending |
| PERS-02 | Phase 6 | Pending |
| PERS-03 | Phase 6 | Pending |
| DEP-01 | Phase 6 | Pending |
| DEP-02 | Phase 3 | Pending |
| DEP-03 | Phase 6 | Pending |
| DEP-04 | Phase 6 | Pending |
| DEP-05 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 70
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-10 — traceability completed by gsd-roadmapper (6 phases)*
