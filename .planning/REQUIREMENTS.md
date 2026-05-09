# Requirements: AussieLedger

**Defined:** 2026-05-10
**Core Value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

## v1 Requirements

### Foundation (FND)

Quality-floor and credibility prerequisites — must clear these before any user data is trustworthy.

- [ ] **FND-01**: User's bookkeeping data survives a browser cache clear (durable persistence; not `localStorage`-only)
- [ ] **FND-02**: User can export their entire dataset (entities, journals, accounts, audit log) as JSON and CSV
- [ ] **FND-03**: User can import a previously-exported JSON dataset to restore on the same or a different instance
- [ ] **FND-04**: A self-hosted instance works without any third-party API keys configured (AI features must be optional)
- [ ] **FND-05**: No user-facing surface displays misleading "ATO Connected", simulated agency status, or fabricated trend metrics
- [ ] **FND-06**: An always-visible disclaimer states the product produces working papers / draft returns, not tax advice; the user/agent retains responsibility for the lodged return
- [ ] **FND-07**: A test suite (Vitest) exists with at least one golden-output test per tax return type (Individual, Company, Trust, Partnership) and per-label tests for BAS arithmetic
- [ ] **FND-08**: All monetary calculations use a decimal arithmetic library (not native JS floats) to avoid GST rounding errors
- [ ] **FND-09**: Application data has a schema version stored alongside it; on load, a migration runner upgrades older schemas in place

### Bookkeeping core (BOOK)

- [ ] **BOOK-01**: User can create a journal entry with two or more lines that must balance (debits = credits) before posting; balance is enforced at the data layer, not only at the UI
- [ ] **BOOK-02**: User can edit a posted journal entry; the original version is preserved in the audit log
- [ ] **BOOK-03**: User can reverse a posted journal entry (creating a balancing reversal entry referencing the original)
- [ ] **BOOK-04**: User can void / delete a draft (unposted) journal entry
- [ ] **BOOK-05**: User can browse a default Australian SME chart of accounts containing 80–150 accounts grouped by account type (Asset, Liability, Equity, Revenue, Expense)
- [ ] **BOOK-06**: User can create, edit, and delete chart-of-accounts entries with code, name, type, GST code, and tax-label mapping per entity type
- [ ] **BOOK-07**: User can group accounts into a parent / child hierarchy (e.g. "Operating Expenses" → "Rent", "Utilities", "Wages")
- [ ] **BOOK-08**: Each account carries a GST code from the AU set: GST, FRE (GST-free), INP (input-taxed), N-T (not reportable), CAP (capital)
- [ ] **BOOK-09**: User can view a trial balance for a selected period showing per-account debit, credit, and net balance, with a balanced/out-of-balance footer
- [ ] **BOOK-10**: User can filter and report on any period: a financial year (1 Jul – 30 Jun), a BAS quarter, or a custom date range — the same period model applies to TB, BAS, and tax returns
- [ ] **BOOK-11**: User can view an immutable audit trail of every create / edit / reverse / void action with timestamp, actor, before/after values, and entity-id scoping
- [ ] **BOOK-12**: User can search journal entries by reference, description, account, date range, and amount range

### Entity management (ENT)

- [ ] **ENT-01**: User can create entities of all four AU types: Company (Pty Ltd), Trust, Sole Trader / Individual, Partnership
- [ ] **ENT-02**: User can record ABN (with format validation: 11-digit modulus-89 check) and TFN (with format-only check; never validated network-side)
- [ ] **ENT-03**: User can flag an entity as GST-registered, with effect on whether BAS is required and on default GST codes for new accounts
- [ ] **ENT-04**: User can declare the accounting method (cash or accruals) per entity, applied to BAS reporting and income recognition
- [ ] **ENT-05**: User can set the financial-year-end per entity (defaults to 30 June)
- [ ] **ENT-06**: User can edit, archive, deactivate, or delete entities; deletion either cascades or is blocked when journal entries reference the entity
- [ ] **ENT-07**: User can record a register of beneficiaries on a Trust entity (name, percentage or fixed share)
- [ ] **ENT-08**: User can record a register of partners on a Partnership entity (name, percentage share)

### Trial balance import (IMP)

- [ ] **IMP-01**: User can upload a CSV or Excel (XLSX) file containing an opening trial balance
- [ ] **IMP-02**: A deterministic parser handles standard CSV / XLSX rows; user is shown a column-mapping UI to confirm or override the parser's column choices (code, name, debit, credit)
- [ ] **IMP-03**: User can match imported account codes against the internal CoA via fuzzy text matching, with an explicit "create new account" option per unmatched row
- [ ] **IMP-04**: AI-assisted account matching is an optional enhancement, not the only path; the import works fully with no API key configured
- [ ] **IMP-05**: Re-importing the same trial balance is idempotent (does not produce duplicate opening journals)
- [ ] **IMP-06**: Import produces a single dated opening-balances journal entry that the user reviews and posts (or rejects)

### BAS / IAS (BAS)

- [ ] **BAS-01**: User can produce a BAS for a selected period (monthly or quarterly) with all GST labels: G1 (total sales), G2 (export sales), G3 (other GST-free sales), G10 (capital purchases), G11 (non-capital purchases), 1A (GST on sales), 1B (GST on purchases)
- [ ] **BAS-02**: BAS GST calculation follows the ATO worksheet method using GST codes on accounts and decimal arithmetic (not float)
- [ ] **BAS-03**: User can produce the PAYG withholding section: W1 (total wages and salaries), W2 (amounts withheld from W1)
- [ ] **BAS-04**: User can produce the PAYG instalment section (T7) using either the income × rate method or a pre-calculated ATO instalment amount
- [ ] **BAS-05**: User can produce an IAS (instalment activity statement) for entities not registered for GST, covering PAYG only
- [ ] **BAS-06**: User can export a print-ready BAS / IAS summary with ATO field codes for transcription into myGov

### Income tax returns — shared (TAX)

- [ ] **TAX-01**: Tax-rate and threshold constants are centralised in a single FY-versioned module (no magic numbers in components)
- [ ] **TAX-02**: User can produce a print-ready tax return PDF (or print-CSS browser print) for any entity type
- [ ] **TAX-03**: Each account in the default CoA is pre-mapped to the correct ATO labels for every relevant entity type (individual, company, trust, partnership) on first install
- [ ] **TAX-04**: User can override the auto-mapping for any account in the CoA editor
- [ ] **TAX-05**: All tax-output components consume a single shared "tax engine" library of pure functions (no duplicated rollup logic across components)

### Individual tax return (IND)

- [ ] **IND-01**: User can produce a Form I (individual) return with the Business and Professional Items schedule populated from the entity's GL
- [ ] **IND-02**: Return covers the business-schedule labels: item P1 (business income), P2 (deductions), P8 (net small business income), and item 15 (net business income flow-through)
- [ ] **IND-03**: Return calculates net taxable income from business and shows individual marginal-rate tax payable using FY-versioned brackets (including LITO and Medicare levy)

### Company tax return (COY)

- [ ] **COY-01**: User can produce a Form C (company) return covering core labels for a small Pty Ltd: gross sales (item 6), total expenses (item 7), taxable income (item 7S)
- [ ] **COY-02**: Tax payable is calculated using the Base Rate Entity test: 25% if aggregated turnover < $50M and ≤ 80% passive income, otherwise 30%
- [ ] **COY-03**: Return records franking-account opening balance and movements (credits / debits) so the year-end balance can be carried forward
- [ ] **COY-04**: User can apply the small business tax offset where eligible (item 7D)

### Trust tax return (TRT)

- [ ] **TRT-01**: User can produce a Form T (trust) return showing trust net income, deductions, and taxable income
- [ ] **TRT-02**: User can produce per-beneficiary distribution statements that aggregate to the trust's net income
- [ ] **TRT-03**: Distribution percentages or fixed amounts come from the entity's beneficiary register (ENT-07)

### Partnership tax return (PSP)

- [ ] **PSP-01**: User can produce a Form P (partnership) return showing partnership income, deductions, and net income or loss
- [ ] **PSP-02**: User can produce per-partner distribution statements based on the entity's partner register (ENT-08)

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
- [ ] **DEP-05**: CI (e.g. GitHub Actions) runs `npm run build`, `npm run lint`, and the test suite on every push

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

Empty until roadmap creation. Each requirement maps to exactly one phase. Updated by the gsd-roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | TBD | Pending |
| FND-02 | TBD | Pending |
| FND-03 | TBD | Pending |
| FND-04 | TBD | Pending |
| FND-05 | TBD | Pending |
| FND-06 | TBD | Pending |
| FND-07 | TBD | Pending |
| FND-08 | TBD | Pending |
| FND-09 | TBD | Pending |
| BOOK-01 | TBD | Pending |
| BOOK-02 | TBD | Pending |
| BOOK-03 | TBD | Pending |
| BOOK-04 | TBD | Pending |
| BOOK-05 | TBD | Pending |
| BOOK-06 | TBD | Pending |
| BOOK-07 | TBD | Pending |
| BOOK-08 | TBD | Pending |
| BOOK-09 | TBD | Pending |
| BOOK-10 | TBD | Pending |
| BOOK-11 | TBD | Pending |
| BOOK-12 | TBD | Pending |
| ENT-01 | TBD | Pending |
| ENT-02 | TBD | Pending |
| ENT-03 | TBD | Pending |
| ENT-04 | TBD | Pending |
| ENT-05 | TBD | Pending |
| ENT-06 | TBD | Pending |
| ENT-07 | TBD | Pending |
| ENT-08 | TBD | Pending |
| IMP-01 | TBD | Pending |
| IMP-02 | TBD | Pending |
| IMP-03 | TBD | Pending |
| IMP-04 | TBD | Pending |
| IMP-05 | TBD | Pending |
| IMP-06 | TBD | Pending |
| BAS-01 | TBD | Pending |
| BAS-02 | TBD | Pending |
| BAS-03 | TBD | Pending |
| BAS-04 | TBD | Pending |
| BAS-05 | TBD | Pending |
| BAS-06 | TBD | Pending |
| TAX-01 | TBD | Pending |
| TAX-02 | TBD | Pending |
| TAX-03 | TBD | Pending |
| TAX-04 | TBD | Pending |
| TAX-05 | TBD | Pending |
| IND-01 | TBD | Pending |
| IND-02 | TBD | Pending |
| IND-03 | TBD | Pending |
| COY-01 | TBD | Pending |
| COY-02 | TBD | Pending |
| COY-03 | TBD | Pending |
| COY-04 | TBD | Pending |
| TRT-01 | TBD | Pending |
| TRT-02 | TBD | Pending |
| TRT-03 | TBD | Pending |
| PSP-01 | TBD | Pending |
| PSP-02 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| UX-03 | TBD | Pending |
| UX-04 | TBD | Pending |
| UX-05 | TBD | Pending |
| PERS-01 | TBD | Pending |
| PERS-02 | TBD | Pending |
| PERS-03 | TBD | Pending |
| DEP-01 | TBD | Pending |
| DEP-02 | TBD | Pending |
| DEP-03 | TBD | Pending |
| DEP-04 | TBD | Pending |
| DEP-05 | TBD | Pending |

**Coverage:**
- v1 requirements: 70 total
- Mapped to phases: 0
- Unmapped: 70 ⚠️ (will be resolved by roadmap)

---
*Requirements defined: 2026-05-10*
*Last updated: 2026-05-10 after initial definition*
