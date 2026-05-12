---
phase: 4
slug: bookkeeping-core
type: context
status: ready-for-planning
created: 2026-05-12
discussed_areas: [coa-shape, edit-vs-reversal, deletion-and-import, phase-5-anticipation]
---

# Phase 4: Bookkeeping Core — Context

**Gathered:** 2026-05-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 turns the existing brownfield bookkeeping surface (JournalForm 459L, AccountManager 322L, ImportTB 634L, TrialBalance 109L, EntityForm 334L) into a complete Australian SME GL: a full default 121-account CoA per entity type, double-entry journal CRUD with immutable supersession-based edits and reversals, CSV/XLSX trial-balance import with column-mapping + fuzzy-match + idempotent re-import, period-filtered TB with parent-row subtotals, AU entity registers (Trust beneficiaries + Partnership partners with Phase-5-ready streaming-override fields), and widened audit logging.

**In scope:**
- `src/lib/coa/` module hosting four 4-digit-prefixed default CoAs (Sole Trader / Company / Trust / Partnership), each ~121 rows, with pre-set GST codes (GST/FRE/INP/N-T/CAP) and per-entity-type ATO tax-label pre-mappings (Individual NAT 2541 + 2543 B&P, Company NAT 0656, Trust NAT 0660, Partnership NAT 0659) — FY-versioned as `src/lib/coa/fy2026.ts` so future FYs can re-version
- Default accounts ship as `isDefault: true` — UI blocks hard delete, offers archive instead; user-added accounts are fully deletable
- `Account.parentCode` field for parent/child hierarchy (BOOK-07); TB shows parent subtotals
- `src/lib/ledger.ts` posting engine: pure functions for `validateBalanced(lines)`, `postEntry(entry)`, `reverseEntry(entry)`, `superseded(originalId, newEntry)`; debits=credits enforced at the data layer using decimal.js (BOOK-01 requirement: not only at the UI)
- `JournalEntry` widened with `status: 'draft' | 'posted' | 'superseded' | 'reversed'`, `reversesEntryId?`, `replacesEntryId?`, `replacedByEntryId?`, `importFingerprint?`
- Edit/Reverse both surfaced on posted entries (supersession pattern); edit always enabled; edit form shows banner ("This will replace the original. The original stays in the audit trail.") + diff preview; original never mutates
- `useJournals` exposes `createDraft`, `postDraft`, `voidDraft` (drafts only), `editPosted` (supersedes), `reversePosted` (creates linked balancing entry)
- Audit log widened: action enum extended to `'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY' | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'ARCHIVE_ACCOUNT' | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'IMPORT_TB' | 'EXPORT_DATA' | 'LOCK_FY' | 'UNLOCK_FY'` (Phase 5/6 actions pre-included to avoid v3→v4 migration); audit details JSON includes full before-snapshot for EDIT/REVERSE plus human-readable diff hint
- TB filter UX uses `src/lib/period.ts` (FY / BAS quarter / custom range); per-account D / C / net columns; balanced/out-of-balance footer; parent-row subtotals from `Account.parentCode`
- `BOOK-12` journal search: by reference / description / account / date range / amount range; surface via expandable filter panel on the Journals view
- `Entity` widened with `gstRegistered: boolean`, `accountingMethod: 'cash' | 'accruals'`, `fyEndDate: string` (defaults to '06-30'), `lockedFys: string[]` (schema-only placeholder, no UI enforcement in Phase 4), `beneficiaries?: BeneficiaryRow[]` (Trust), `partners?: PartnerRow[]` (Partnership)
- `BeneficiaryRow` / `PartnerRow` shape: `{ id, name, sharePercent, sharePerType?: { interest, dividend, capitalGain, foreign, other } }` — `sharePerType` is the Phase-5-ready streaming-override hook; Phase 4 UI exposes only `sharePercent`, the typed field exists in storage
- Entity-form delete: cascade-or-block per ENT-06 — block if journals reference the entity, offer Archive instead (mirrors account-deletion policy)
- `ImportTB.tsx` refactor: deterministic CSV/XLSX parse first (PapaParse + xlsx CE), AI-assist remains optional and gated; multi-sheet XLSX picker UI (auto-select if exactly one sheet matches `/trial|TB|balance/i`); row-level "Review" pane shows skipped/uncertain rows; fuzzy-match retains the existing `src/lib/match.ts` Levenshtein implementation (research confirmed adequate); idempotent re-import via `sha256(canonicalised-rows + entityId + asAtDate)` fingerprint stored on the opening journal — second-attempt UX is a Skip/Replace/Add-additional dialog (not silent skip, not hard block)
- Schema migration v2 → v3 (additive only): widens `Account`, `JournalEntry`, `Entity`, `AuditLog.action` per above — no removed fields, no renames; `migrate(_v: 2 blob)` lifts to _v: 3 by setting defaults (`lockedFys: []`, `status: entry.isPosted ? 'posted' : 'draft'`, etc.)
- StorageAdapter stays FINAL from Phase 3 — all persistence uses existing `saveAccounts` / `saveEntries` / `saveEntities` / `saveAuditLogs` / `appendAuditLog`

**Out of scope (later phases):**
- All tax-output rendering (Forms I/C/T/P, BAS/IAS) — Phase 5 reads from the new CoA tax-label pre-mappings and writes the actual return PDFs
- Period-lock UI enforcement (Phase 6 year-end wizard writes to `Entity.lockedFys`; Phase 5 tax-engine reads it; Phase 4 only ships the field)
- Per-report CSV exports (P&L, BAS) — Phase 5
- Persona / agent-mode UI variations — Phase 6
- Multi-entity journal entries (cross-entity allocations) — out of v1
- Recurring journal templates — out of v1
- Bank-feed integration / OFX import — out of v1
- Foreign currency entries — out of v1; AUD-only
- AI-assisted journal categorisation beyond the existing ImportTB AI-assist — out of v1
- NAT numbering correction below DOES land in Phase 4 (the new fy2026 CoA module uses correct ATO numbering); the prior project docs / older comments referencing legacy NAT 0660 for Individual are flagged for cleanup but not blocking

</domain>

<decisions>
## Implementation Decisions

### CoA shape (4 sub-decisions)

- **121-row full SME default.** Matches the research-supplied spine (verified against Xero AU's published default and cross-checked with MYOB conventions). Coverage trade-off accepted: thicker default = less "I need an account that's not here" friction, at the cost of more user pruning. Each entity gets its own template at creation (see next).
- **Four separate per-type templates, picked at entity creation.** On "Create entity → Company", the user gets the Company CoA (e.g. with Shareholder Loans, Retained Earnings clearance accounts); on "Create entity → Sole Trader", they get the ST CoA (with Owner's Drawings, no Shareholder rows). Trust template includes Beneficiary Distribution clearing; Partnership includes Partner Capital subaccounts. The 121-row spine is shared across all four; each template overlays ~10–20 type-specific rows. Implementation: one shared base table + four per-type overlay tables in `src/lib/coa/fy2026/`.
- **Default accounts archive-only; custom accounts fully deletable.** `Account.isDefault: true` blocks hard delete with a dialog offering Archive instead. User-added accounts (`isDefault: false`) get the standard Block-or-Archive flow (see Deletion below). Rationale: protect the tax-label pre-mapping spine; users always have the archive escape hatch.
- **4-digit type-prefixed numbering.** 1xxx Assets / 2xxx Liabilities / 3xxx Equity / 4xxx Revenue / 5xxx Operating Expenses / 6xxx Other Income/Expense. Australian convention (used by Reckon AU, QuickBooks AU). Each section has 1000-number headroom. Account 1000 starts Cash at Bank; 4000 starts Sales; 5000 starts Cost of Sales. No "Xero-style 200/400" variant.

### Edit vs Reversal UX (4 sub-decisions)

- **Both Edit AND Reverse exposed on posted entries.** Side-by-side buttons. Edit = supersedes via `replacesEntryId`; Reverse = creates a balancing entry via `reversesEntryId`. The original never mutates in either case. Two distinct intents ("I made a mistake" vs "this transaction unwound in reality") get two distinct flows.
- **Edit always enabled; the supersession chain handles ordering.** No "after 7 days you can only reverse" guard, no "another entry references this one" block. Chain: A → B (edits A) → C (edits B); TB always reads the latest non-superseded leaf. The audit log preserves the lineage. Phase 6 wizard's period-lock is the only future blocker (and that reads `lockedFys`, see below).
- **Edit form shows a banner + diff preview.** Top of form: "This will replace the original. The original stays in the audit trail." Below the form, a side-by-side diff preview shows what changes ("line 2 debit 100 → 90; description 'Office supplies' → 'Office supplies (Officeworks)'"). Confirms before save. Reduces "where did my original go?" confusion for first-time users.
- **Audit log captures full before-snapshot JSON + diff hint.** `AuditLog.details` for EDIT_JOURNAL: `{ before: <full original entry JSON>, diff: "line 2 debit 100→90; ..." }`. For REVERSE_JOURNAL: `{ original: <entry id>, reversalEntry: <new entry id> }`. Cost: audit-log rows grow ~2× for edits. Acceptable; we already write whole-collection on every change via StorageAdapter.

### Deletion & Import (4 sub-decisions)

- **Account deletion: Block + offer archive.** If any journal references the account, hard delete is blocked. Dialog: "Cannot delete — 12 journals reference this account. Archive instead?" One-click Archive option. Archived accounts hide from new-journal pickers AND from the AccountManager default view (filterable to show). They still render in historical TB and the tax-label pre-mapping pipeline. Default accounts: same flow but Archive is the only option (no hard delete even when unreferenced).
- **Entity deletion: same Block + Archive pattern (ENT-06).** If any journal/account references the entity, block delete with "Archive instead?". Symmetric to account deletion. Soft-delete via existing `Entity.status: 'Archived'`.
- **CSV/XLSX parsing: Loose with row-level warnings.** PapaParse + xlsx CE parse as much as possible; surface bad/uncertain rows in a Review pane between Parse and Post. User can: include a row, exclude a row, edit a row inline, accept a fuzzy-match suggestion, create a new account, or reject the whole import. No silent skips. Aligns with the existing ImportTB "user reviews and posts" requirement (IMP-06).
- **Multi-sheet XLSX: Sheet picker UI.** Modal: "This workbook has N sheets. Which to import?". Auto-select if exactly one sheet name matches `/trial|TB|balance/i` (skip the modal in that case). Otherwise user picks. Matches Xero / QuickBooks Online behaviour.
- **Idempotent re-import: fingerprint + Skip/Replace dialog.** `importFingerprint = sha256(canonicalise(rows) + entityId + asAtDate)`. Stored on the opening-balances journal. On second-attempt import where fingerprint matches, dialog: "A trial-balance import already exists for this entity as-at 2026-06-30. [Skip] [Replace existing journal] [Import as additional]". User-aware idempotency, not silent skip.

### Phase 5 anticipation (4 sub-decisions)

- **`lockedFys: string[]` ships on Entity now, schema-only.** Default empty. Phase 4 code can read but does not write or enforce. Phase 6 wizard will populate; Phase 5 tax-engine will respect for "draft return for locked FY" UX. Forward-compat with zero UX cost in Phase 4. Migration v2→v3 sets `lockedFys: []` for every existing entity.
- **Trust register ships full Phase-5-ready shape: `{ id, name, sharePercent, sharePerType? }`.** Phase 4 UI exposes only `name` and `sharePercent` in the EntityForm Trust tab. `sharePerType?: Partial<Record<'interest' | 'dividend' | 'capitalGain' | 'foreign' | 'other', number>>` is typed and storable; Phase 5 Form T research will design the UI and validation for the streaming overrides. Avoids a v3→v4 schema migration for Trust form work.
- **Partnership register mirrors Trust shape.** `{ id, name, sharePercent, sharePerType? }`. Phase 4 ships `name + sharePercent` in the EntityForm Partnership tab. Phase 5 Form P streaming is less complex than Trust streaming — `sharePerType` may stay unused for Partnerships, but symmetry of shape + form-component reuse beats marginal field-count savings.
- **AuditLog.action widened to cover Phase 4 + 5 + 6 actions now.** Enum (string-literal union): `'CREATE_ENTITY' | 'UPDATE_ENTITY' | 'DELETE_ENTITY' | 'POST_JOURNAL' | 'EDIT_JOURNAL' | 'REVERSE_JOURNAL' | 'VOID_JOURNAL' | 'ARCHIVE_ACCOUNT' | 'CREATE_ACCOUNT' | 'UPDATE_ACCOUNT' | 'IMPORT_TB' | 'EXPORT_DATA' | 'LOCK_FY' | 'UNLOCK_FY'`. Phase 5/6 actions (`EXPORT_DATA`, `LOCK_FY`/`UNLOCK_FY`) included even though Phase 4 doesn't write them. Avoids a Phase-5 migration for an enum widening.

### Cross-cutting decisions

- **NAT numbering: use current ATO numbering in `src/lib/coa/fy2026/`.** Individual main return = NAT 2541. Individual Business & Professional schedule = NAT 2543 (this is where Sole Trader 5xxx expenses roll into Item 15 labels). Company = NAT 0656. Trust = NAT 0660. Partnership = NAT 0659. Legacy "Individual NAT 0660" references in existing `src/types.ts` comments and other docs are stale but non-blocking; planner will fix the typed comments in the v3 migration's type widening.
- **Library stack from research (locked).** PapaParse `^5.5.3` (CSV, MIT). xlsx (SheetJS CE) `^0.20.3` (Apache 2.0). Retain existing `src/lib/match.ts` Levenshtein matcher — research verified it meets IMP-03 thresholds; no Fuse.js swap. No new fuzzy-match library.
- **Decimal arithmetic stays decimal.js (Phase 1 decision).** All journal line debits/credits stored as strings serialised from `Decimal`; the ledger.ts posting engine validates `Decimal.sub(totalDebit, totalCredit).abs().lte('0.005')` for balance.
- **Period model stays `src/lib/period.ts` (Phase 2 decision).** All TB filter ranges, FY defaults, and the lockedFys parsing flow through period.ts; structural lint rule "no parameterless `new Date()` outside period.ts" continues to apply.
- **StorageAdapter stays FINAL (Phase 3 decision).** No interface widening. Phase 4 v2→v3 migration is the additive type widening only; persistence calls are the same 12 methods.
</decisions>

<code_context>
## Reusable Brownfield Assets (refactor, do not replace)

| File | Lines | Role in Phase 4 | Touch level |
|------|-------|-----------------|-------------|
| `src/components/AccountManager.tsx` | 322 | CoA browser/editor; will gain parent/child tree view + archive vs delete dialog + per-type template badge | medium refactor |
| `src/components/JournalForm.tsx` | 459 | Journal CRUD entry; will gain Edit (supersede) + Reverse buttons, banner + diff preview on edit, search panel for BOOK-12 | medium refactor |
| `src/components/ImportTB.tsx` | 634 | TB import flow; will gain XLSX sheet picker + Review pane + fingerprint Skip/Replace dialog. AI-assist stays as-is (Phase 3 already moved it server-side) | medium refactor |
| `src/components/TrialBalance.tsx` | 109 | TB renderer; will gain parent-row subtotal rendering + period-filter UX hookup | small refactor |
| `src/components/EntityForm.tsx` | 334 | Entity create/edit; will gain GST-registered + accounting-method + FY-end fields, Trust beneficiary tab, Partnership partner tab | medium refactor |
| `src/hooks/useAccounts.ts` | ~ | Account CRUD via StorageAdapter; will gain `archiveAccount`, `setIsDefault`, parent/child helpers | small extension |
| `src/hooks/useJournals.ts` | ~ | Journal CRUD via StorageAdapter; will gain `editPosted` (supersedes), `reversePosted`, `voidDraft`, `searchJournals(filters)` | medium extension |
| `src/hooks/useEntities.ts` | ~ | Entity CRUD; will gain `archiveEntity`, beneficiary/partner array writers | small extension |
| `src/hooks/useAuditLog.ts` | ~ | Audit log writer; widened action enum, `appendAuditLog` already supports JSON details | no functional change |
| `src/lib/match.ts` | ~ | Fuzzy-match Levenshtein matcher; retained for IMP-03 (research confirmed adequate) | no change |
| `src/lib/period.ts` | ~ | Period model; TB filter UX hooks in here | consumed only |
| `src/lib/money.ts` | ~ | decimal.js boundary; posting engine validates via this | consumed only |
| `src/lib/schemas.ts` | ~ | Zod shared schemas (SPA + server validation); widened to match v3 types | additive widening |
| `src/lib/tax/labels/fy2026.ts` | ~ | FY-versioned tax labels (Phase 2); the new CoA tax-label pre-mapping outputs land in `src/lib/coa/fy2026/` and reference these label constants | reference only |

## New Files (Phase 4 creates)

| File | Purpose |
|------|---------|
| `src/lib/coa/fy2026/base.ts` | Shared 121-row spine (account code, name, type, GST default, parent_code) |
| `src/lib/coa/fy2026/individual.ts` | Per-type overlay for Sole Trader; reads base + adds Owner's Drawings / Sole Trader-specific labels (NAT 2541 + 2543) |
| `src/lib/coa/fy2026/company.ts` | Per-type overlay for Company; Shareholder Loans, Director Loans, etc.; NAT 0656 labels |
| `src/lib/coa/fy2026/trust.ts` | Per-type overlay for Trust; Beneficiary Distribution clearing accounts; NAT 0660 labels |
| `src/lib/coa/fy2026/partnership.ts` | Per-type overlay for Partnership; Partner Capital subaccounts; NAT 0659 labels |
| `src/lib/coa/index.ts` | `getDefaultCoaFor(entityType, fy)` resolver — picks overlay + applies to base |
| `src/lib/ledger.ts` | Pure posting engine: `validateBalanced`, `postEntry`, `reverseEntry`, `superseded`, `searchJournals` |
| `src/lib/migrations/v2-to-v3.ts` | Additive migration for the type widening |
| `src/lib/migrations/__tests__/v2-to-v3.test.ts` | Round-trip + defaults-applied tests for v3 migration |
| `src/components/CoaTreeView.tsx` | Parent/child tree renderer for AccountManager |
| `src/components/JournalSearch.tsx` | Expandable filter panel for BOOK-12 |
| `src/components/EditJournalDiff.tsx` | Diff preview pane used by JournalForm's edit flow |
| `src/components/BeneficiaryRegister.tsx` | Trust tab in EntityForm; sharePercent UI only (sharePerType deferred to Phase 5 UI work) |
| `src/components/PartnerRegister.tsx` | Partnership tab in EntityForm |
| `src/components/ImportReviewPane.tsx` | Row-level "Review" UI between parse and post |
| `src/components/XlsxSheetPicker.tsx` | Modal for multi-sheet XLSX selection |
| `src/lib/import/fingerprint.ts` | `sha256(canonicalise(rows) + entityId + asAtDate)` helper |

## Integration Points

- v2→v3 migration must run during `migrate()` in `src/lib/migrations/index.ts` and must be wired into `useAccounts` / `useJournals` / `useEntities` init paths (already auto-runs because the migration runner is in place from Phase 1)
- Existing Zod schemas in `src/lib/schemas.ts` widen to match v3 types so both SPA `importAll()` AND server `POST /api/import` validate the v3 shape; defence-in-depth from Phase 3 is preserved
- `src/lib/coa/index.ts` is consumed by Phase 5 tax-engine modules (`src/lib/tax/{individual,company,trust,partnership}.ts`) — the contract is "each Account in the per-type CoA has an `ato.label` field that compute*() reads"
- `Entity.lockedFys` is read-only in Phase 4 codepaths but lives in the type so Phase 5 (`compute*()` skip locked) and Phase 6 (year-end wizard writes) can use it without migration
</code_context>

<deferred-ideas>
Captured but not in Phase 4 scope:

- **Recurring journal templates** — "save this journal as a template; post it again next month with one click". Phase 6 candidate (UX-flavoured).
- **Bank feed / OFX import** — bank-statement reconciliation. Out of v1 entirely; would warrant its own phase.
- **Foreign currency entries** — multi-currency GL with rate-table lookups. Out of v1; AUD-only is a v1 constraint.
- **Per-line attachments (receipt scans)** — attach a JPG/PDF to a journal line. Out of v1; consider for v2 alongside cloud-storage adapter.
- **Recurring-revenue / deferred-revenue automation** — Phase 5 tax-engine candidate if needed; otherwise v2.
- **Audit-log volume cap / archival** — at high journal volumes the audit log grows unbounded. Phase 6 deployment polish candidate (or earlier if `searchJournals` performance suffers).
- **Streaming-override UI for Trust / Partnership registers** — Phase 5 Form T / Form P research will design the UX; the `sharePerType` field is shipped in Phase 4 but stays UI-hidden.
- **Period-lock UI enforcement** — Phase 6 year-end wizard; the `lockedFys` field is shipped in Phase 4 but stays UI-hidden and unenforced.
- **Multi-entity / cross-entity journals** — intercompany allocations. Out of v1.
- **Inline AI-assisted journal categorisation beyond ImportTB** — the existing ImportTB AI-assist (Phase 3 server-side proxy) covers the only AI surface in v1.
</deferred-ideas>

<validation_targets>
## Phase 4 Success Criteria (verbatim, for /gsd:plan-phase to map tasks to)

1. **CoA browsable + parent subtotals on TB:** User can browse a default CoA of 80–150 Australian SME accounts grouped under parent headings (e.g. "Operating Expenses" → "Rent", "Utilities"); parent rows show subtotals on the trial balance.
2. **Journal CRUD + audit:** User can create a journal entry, post it, then edit or reverse it; the original and reversal both appear in the immutable audit trail with before/after values and timestamps.
3. **CSV/XLSX import + column-mapping + fuzzy-match + AI-optional:** User can upload a CSV or XLSX trial balance, use the column-mapping UI to confirm column choices, match unrecognised accounts to the internal CoA (or create new ones), and post an opening-balances journal — without needing an AI API key.
4. **Idempotent re-import:** Re-uploading the same CSV does not create duplicate opening-balance journals.
5. **AU entity registers:** A Trust entity carries a beneficiary register (name + share); a Partnership entity carries a partner register (name + percentage); these registers are used by Phase 5 return assembly.

## Validation Architecture (research-aligned + planner cues)

- **Deterministic posting (data-layer balance enforcement)** — `src/lib/ledger.ts` `validateBalanced(lines)` unit-tested with decimal-edge cases (33.33 / 33.33 / 33.34 = 100.00); integration-tested via `useJournals.postDraft` round-trip.
- **CoA seed integrity** — for each of the four per-type CoA modules: total row count, no duplicate codes, every Revenue / Expense row has a non-null tax label, all parent_code references resolve to a real account, all GST codes are in the AU set.
- **v2→v3 migration round-trip** — golden _v: 2 PersistedRoot → migrate() → assert defaults applied, no data loss; importAll() → exportAll() round-trips the v3 shape.
- **Idempotency fingerprint stability** — same CSV with reordered rows OR re-stringified whitespace produces the same `sha256`; different entityId or asAtDate produces a different fingerprint.
- **Search performance budget** — `searchJournals(filters)` over 1000 entries returns in <50ms in a Vitest perf assertion (cheap insurance, not a strict SLO).
- **Manual UAT (planner will design):** create an entity → import a TB → review pane → post → edit one journal → reverse another → trial balance shows correct net + parent subtotals; archive an account that's in use; try to delete a referenced entity; re-import same TB and verify Skip/Replace dialog.
</validation_targets>

<open-questions>
## Locked questions from research (resolved here)

| Question | Resolution |
|----------|------------|
| CoA size 121 vs 95 | 121 (full SME) |
| Per-type CoA templates | 4 separate templates (per-entity-type creation) |
| Default-account lock | Archive-only for defaults; full delete for user-added |
| Numbering scheme | 4-digit type-prefixed (1xxx..5xxx + 6xxx Other) |
| Edit on posted entries | Both Edit + Reverse exposed (supersession pattern) |
| Edit guard | Always enabled (chain handles ordering) |
| Edit UX (banner + diff) | Banner + diff preview before save |
| Audit-log shape for edits | Full before-snapshot JSON + diff hint |
| Account deletion policy | Block + offer Archive (mirrored for entity deletion) |
| CSV/XLSX strictness | Loose with row-level warnings + Review pane |
| XLSX multi-sheet | Sheet picker UI; auto-select if exactly one matches /trial|TB|balance/i |
| Idempotency check | sha256 fingerprint + Skip/Replace/Add-additional dialog |
| `lockedFys` field | Ship now, schema-only, no UI enforcement in Phase 4 |
| Trust register shape | Full Phase-5-ready shape (sharePercent + optional sharePerType) |
| Partnership register shape | Mirror Trust (same shape, simpler Phase-5 needs) |
| AuditLog action enum | Widen now to Phase 4 + 5 + 6 actions |
| NAT numbering | Use correct ATO numbering (NAT 2541/2543 Individual, NAT 0656 Company, NAT 0660 Trust, NAT 0659 Partnership) |
| Library stack | PapaParse + xlsx CE; retain existing match.ts |

## Remaining open for planner judgement

| Question | Note |
|----------|------|
| Exact library version pins | Planner runs `npm show papaparse@latest xlsx@latest version` and pins. |
| Wave structure | Planner decides plan count + Wave 0 scaffold (likely v2→v3 migration + CoA seed + ledger.ts + test scaffolds in Wave 0, then UI/UX in later waves). |
| Per-entity-type CoA overlay size | Planner sizes each overlay (likely ~10–20 rows per type) once it lays out the base 121 spine. |
| Phase 4 test count target | Phase 3 ended at 249 SPA + 18 server GREEN. Phase 4 likely adds 50–100 SPA tests (posting engine, CoA seed, v3 migration, import flow). |
| Whether to add a `BOOK-13` style "Recent edits" timeline view | Out of scope per ROADMAP requirements list (no BOOK-13). Confirmed via REQUIREMENTS.md. |
</open-questions>

---

*Context gathered through 4 gray-area deep-dives (16 sub-decisions) on 2026-05-12. Next step: `/gsd:plan-phase 4` will produce the executable plan (likely 3–4 plans across 3 waves given the surface area).*
