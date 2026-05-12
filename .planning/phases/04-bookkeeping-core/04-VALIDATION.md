---
phase: 4
slug: bookkeeping-core
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-12
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Mirrors the shape of `03-VALIDATION.md`.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 2.1.9 (existing) + jsdom (existing) + fake-indexeddb (existing) — no new test deps |
| **New runtime deps** | `papaparse@^5.5.3`, `@types/papaparse@^5.3.16` (dev), `xlsx@^0.20.3` (SheetJS Community Edition) |
| **Config file** | `vitest.config.ts` (existing, no changes) + `src/test/setup.ts` (already wires fake-indexeddb, ResizeObserver, matchMedia, @google/genai mock) |
| **Quick run command** | `npx vitest run src/lib/ledger src/lib/coa src/lib/migrations src/lib/import` (~5 s — pure libs only) |
| **Full suite command** | `npm run test` (full SPA) + `npm run test:server` (server suite — unchanged from Phase 3) |
| **Estimated runtime** | SPA ≈ 8 s, Server ≈ 4 s |

---

## Sampling Rate

- **After every task commit:** `npx vitest run src/lib/ledger src/lib/coa src/lib/migrations src/lib/import src/hooks` (≈ 5 s)
- **After every plan wave:** `npm run lint && npm run test && npm run test:server`
- **Before `/gsd:verify-work`:** Full SPA suite + server suite GREEN AND the Plan 04-4 human-verify UAT checklist signed off
- **Max feedback latency:** 10 seconds combined

---

## Per-Task Verification Map

> Behaviour → requirement → automated command → file owner. Wave 0 (04-1) creates every scaffold so downstream plans wire to bound `-t` names verbatim.

| Behaviour | Requirement | Test Type | Automated Command | Owning Plan |
|-----------|-------------|-----------|-------------------|-------------|
| `validateBalanced` accepts decimal-edge 33.33 + 33.33 + 33.34 = 100.00 | BOOK-01 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "validates balance to 2dp"` | 04-1 (RED) → 04-1 (GREEN, pure fn) |
| `validateBalanced` rejects D ≠ C | BOOK-01 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "throws JournalNotBalancedError"` | 04-1 |
| `validateBalanced` rejects single-line entries | BOOK-01 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "rejects fewer than 2 lines"` | 04-1 |
| `postDraft` rejects unbalanced before persist | BOOK-01 | integration | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "postDraft enforces balance at data layer"` | 04-1 (RED scaffold) → 04-2 (GREEN) |
| `useJournals.editPosted` writes supersession chain | BOOK-02 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "editPosted supersedes original"` | 04-1 (RED) → 04-2 (GREEN) |
| Audit log captures EDIT_JOURNAL with full before-snapshot JSON | BOOK-02, BOOK-11 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "EDIT_JOURNAL audit has before snapshot"` | 04-1 → 04-2 |
| `JournalForm` shows banner + diff preview when editing posted entry | BOOK-02 | component | `npx vitest run src/components/__tests__/JournalForm.test.tsx -t "edit banner and diff preview"` | 04-1 → 04-2 |
| `useJournals.reversePosted` creates mirrored balancing entry | BOOK-03 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "reversePosted mirrors lines"` | 04-1 → 04-2 |
| Reversal references original via `reversesEntryId` | BOOK-03 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "reversesEntryId link"` | 04-1 → 04-2 |
| `useJournals.voidDraft` removes only draft entries | BOOK-04 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "voidDraft only on drafts"` | 04-1 → 04-2 |
| `voidDraft` refuses posted entries | BOOK-04 | unit | `npx vitest run src/hooks/__tests__/useJournals.test.ts -t "voidDraft refuses posted"` | 04-1 → 04-2 |
| Default CoA for Company has ≥ 80 and ≤ 150 rows | BOOK-05 | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "Company default CoA size"` | 04-1 (RED) → 04-1 (GREEN — seed is data, not behaviour) |
| Default CoA for Individual / Trust / Partnership likewise sized | BOOK-05 | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "per-type CoA sizes"` | 04-1 |
| Every Revenue + Expense account in each CoA has at least one tax label | TAX-03 (pre-mapping) | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "tax label coverage"` | 04-1 |
| Every `parentCode` resolves to an existing code in the same CoA | BOOK-07 | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "parent codes resolve"` | 04-1 |
| No duplicate codes within any per-type CoA | BOOK-05 | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "no duplicate codes"` | 04-1 |
| Every GST code in seed is in {GST, FRE, INP, N-T, CAP} | BOOK-08 (verify) | unit | `npx vitest run src/lib/coa/__tests__/seed.test.ts -t "GST codes in AU set"` | 04-1 |
| `AccountManager` archive-vs-delete dialog (default account locked) | BOOK-06 | component | `npx vitest run src/components/__tests__/AccountManager.test.tsx -t "archive only for default"` | 04-1 → 04-3 |
| `AccountManager` tree-view renders parent rows above children | BOOK-07 | component | `npx vitest run src/components/__tests__/AccountManager.test.tsx -t "tree view parents first"` | 04-1 → 04-3 |
| `AccountManager` GST_CODES dropdown contains exactly the AU 5 (fixes `'ITS'` typo) | BOOK-06 | component | `npx vitest run src/components/__tests__/AccountManager.test.tsx -t "GST dropdown is AU set"` | 04-1 → 04-3 |
| Creating an entity seeds the per-type default CoA via `getDefaultCoaFor` | BOOK-05 | unit | `npx vitest run src/hooks/__tests__/useEntities.test.ts -t "creates default CoA per type"` | 04-1 → 04-3 |
| `TrialBalance` includes period filter (FY / quarter / custom) hookup | BOOK-09 | component | `npx vitest run src/components/__tests__/TrialBalance.test.tsx -t "period filter"` | 04-1 → 04-2 |
| `TrialBalance` shows parent-row subtotals from `Account.parentCode` | BOOK-07 | component | `npx vitest run src/components/__tests__/TrialBalance.test.tsx -t "parent subtotals"` | 04-1 → 04-2 |
| `TrialBalance` excludes voided / superseded / draft entries | BOOK-09 | component | `npx vitest run src/components/__tests__/TrialBalance.test.tsx -t "excludes voided superseded draft"` | 04-1 → 04-2 |
| `TrialBalance` footer shows Balanced / Out-of-Balance | BOOK-09 | component | `npx vitest run src/components/__tests__/TrialBalance.test.tsx -t "balanced footer"` | 04-1 → 04-2 |
| `searchJournals` filters by reference / description | BOOK-12 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "searchJournals reference and description"` | 04-1 → 04-2 |
| `searchJournals` filters by accountId | BOOK-12 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "searchJournals by account"` | 04-1 → 04-2 |
| `searchJournals` filters by amount range | BOOK-12 | unit | `npx vitest run src/lib/__tests__/ledger.test.ts -t "searchJournals by amount range"` | 04-1 → 04-2 |
| `searchJournals` over 1000 entries < 50 ms | BOOK-12 | perf | `npx vitest run src/lib/__tests__/ledger.test.ts -t "searchJournals perf 1000 entries"` | 04-1 → 04-2 |
| `JournalSearch.tsx` panel exposes all 5 filters | BOOK-12 | component | `npx vitest run src/components/__tests__/JournalSearch.test.tsx -t "renders all five filters"` | 04-1 → 04-2 |
| Audit log action enum widened to Phase-4+5+6 actions | BOOK-11 | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "AuditLog action enum widened"` | 04-1 |
| v2 → v3 migration adds Account.parentCode (null default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Account parentCode default null"` | 04-1 |
| v2 → v3 migration adds Account.isDefault (false default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Account isDefault default false"` | 04-1 |
| v2 → v3 migration adds JournalEntry.status (posted/draft from isPosted) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "JournalEntry status from isPosted"` | 04-1 |
| v2 → v3 migration adds Entity.lockedFys (empty default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Entity lockedFys default empty"` | 04-1 |
| v2 → v3 migration adds Entity.gstRegistered (false default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Entity gstRegistered default false"` | 04-1 |
| v2 → v3 migration adds Entity.accountingMethod ('accruals' default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Entity accountingMethod default accruals"` | 04-1 |
| v2 → v3 migration adds Entity.fyEndDate ('06-30' default) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/v2-to-v3.test.ts -t "Entity fyEndDate default 06-30"` | 04-1 |
| v0 → v3 round-trip preserves all data (no loss) | Migration | unit | `npx vitest run src/lib/migrations/__tests__/round-trip.test.ts -t "v0 to v3 round-trip"` | 04-1 |
| `EntityForm` renders GST-registered toggle | ENT-03 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "gstRegistered toggle"` | 04-1 → 04-3 |
| `EntityForm` renders accounting-method radio | ENT-04 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "accountingMethod radio"` | 04-1 → 04-3 |
| `EntityForm` renders FY-end-date field with 06-30 default | ENT-05 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "fyEndDate default 06-30"` | 04-1 → 04-3 |
| Entity delete blocks when journals reference it; offers Archive | ENT-06 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "delete blocked with journals offers Archive"` | 04-1 → 04-3 |
| Trust entity exposes BeneficiaryRegister tab | ENT-07 | component | `npx vitest run src/components/__tests__/BeneficiaryRegister.test.tsx -t "renders for Trust entity"` | 04-1 → 04-3 |
| Beneficiary register stores sharePercent (sharePerType field exists but UI-hidden) | ENT-07 | component | `npx vitest run src/components/__tests__/BeneficiaryRegister.test.tsx -t "stores sharePercent only in UI"` | 04-1 → 04-3 |
| Partnership entity exposes PartnerRegister tab | ENT-08 | component | `npx vitest run src/components/__tests__/PartnerRegister.test.tsx -t "renders for Partnership entity"` | 04-1 → 04-3 |
| Entity type select restricted to {Company, Trust, Individual, Partnership} | ENT-01 | component | `npx vitest run src/components/__tests__/EntityForm.test.tsx -t "AU four entity types only"` | 04-1 → 04-3 |
| ImportTB parses CSV via PapaParse (BOM-safe) | IMP-01 | unit | `npx vitest run src/lib/import/__tests__/csv.test.ts -t "handles UTF-8 BOM"` | 04-1 → 04-4 |
| ImportTB parses XLSX via SheetJS | IMP-01 | unit | `npx vitest run src/lib/import/__tests__/xlsx.test.ts -t "parses xlsx first sheet"` | 04-1 → 04-4 |
| XLSX sheet picker auto-selects when exactly one sheet matches `/trial\|TB\|balance/i` | IMP-01 | component | `npx vitest run src/components/__tests__/XlsxSheetPicker.test.tsx -t "auto-selects single matching sheet"` | 04-1 → 04-4 |
| XLSX sheet picker shows modal otherwise | IMP-01 | component | `npx vitest run src/components/__tests__/XlsxSheetPicker.test.tsx -t "modal shown when multiple sheets"` | 04-1 → 04-4 |
| ImportTB column-mapping UI confirms code/name/debit/credit columns | IMP-02 | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx -t "column mapping UI confirmation"` | 04-1 → 04-4 |
| Fuzzy match auto-applies at confidence ≥ 0.85; below shows top-3 candidates | IMP-03 | component | `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx -t "auto-applies high confidence"` | 04-1 → 04-4 |
| ImportReviewPane offers "create new account" per unmatched row | IMP-03 | component | `npx vitest run src/components/__tests__/ImportReviewPane.test.tsx -t "create new account option"` | 04-1 → 04-4 |
| ImportTB import works fully without GEMINI_API_KEY (AI hidden) | IMP-04 | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx -t "deterministic path works without AI"` | 04-1 → 04-4 |
| Fingerprint stable across row reorder | IMP-05 | unit | `npx vitest run src/lib/import/__tests__/fingerprint.test.ts -t "stable across row reorder"` | 04-1 → 04-1 (pure) |
| Fingerprint changes for different entityId | IMP-05 | unit | `npx vitest run src/lib/import/__tests__/fingerprint.test.ts -t "differs by entityId"` | 04-1 |
| Fingerprint changes for different asAtDate | IMP-05 | unit | `npx vitest run src/lib/import/__tests__/fingerprint.test.ts -t "differs by asAtDate"` | 04-1 |
| Re-import with matching fingerprint shows Skip/Replace/Add-additional dialog | IMP-05 | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx -t "fingerprint Skip Replace dialog"` | 04-1 → 04-4 |
| Import produces a single dated opening-balances JournalEntry | IMP-06 | component | `npx vitest run src/components/__tests__/ImportTB.test.tsx -t "single opening journal posted"` | 04-1 → 04-4 |
| Manual UAT — full Phase 4 end-to-end | All 5 success criteria | manual UAT | n/a — Plan 04-4 human-verify checkpoint | 04-4 |

*Status legend: 04-1 (RED) = Wave 0 scaffold; 04-2/04-3/04-4 (GREEN) = implementation flips it green*

---

## Wave 0 Requirements (Plan 04-1 must create these files)

All new test scaffolds — the implementation plans flip them GREEN:

- [ ] `src/lib/__tests__/ledger.test.ts` — BOOK-01, BOOK-12 (`validateBalanced`, `searchJournals`)
- [ ] `src/lib/coa/__tests__/seed.test.ts` — BOOK-05, BOOK-07, BOOK-08, TAX-03 (CoA structural integrity)
- [ ] `src/lib/migrations/__tests__/v2-to-v3.test.ts` — additive migration (8 default-assignment cases)
- [ ] `src/lib/migrations/__tests__/round-trip.test.ts` — extend with `v0 to v3 round-trip` case
- [ ] `src/lib/import/__tests__/csv.test.ts` — IMP-01 (PapaParse BOM-safe parsing)
- [ ] `src/lib/import/__tests__/xlsx.test.ts` — IMP-01 (SheetJS first-sheet read)
- [ ] `src/lib/import/__tests__/fingerprint.test.ts` — IMP-05 (sha256 idempotency)
- [ ] `src/hooks/__tests__/useJournals.test.ts` — extend with editPosted / reversePosted / voidDraft scaffolds (BOOK-02, BOOK-03, BOOK-04, BOOK-11)
- [ ] `src/hooks/__tests__/useEntities.test.ts` — extend with default-CoA seeding scaffold (BOOK-05)
- [ ] `src/components/__tests__/AccountManager.test.tsx` — extend with tree-view + archive-vs-delete + GST_CODES fix (BOOK-06, BOOK-07)
- [ ] `src/components/__tests__/JournalForm.test.tsx` — NEW (BOOK-02 banner + diff)
- [ ] `src/components/__tests__/JournalSearch.test.tsx` — NEW (BOOK-12 filters)
- [ ] `src/components/__tests__/TrialBalance.test.tsx` — NEW (BOOK-07 subtotals, BOOK-09 period filter)
- [ ] `src/components/__tests__/EntityForm.test.tsx` — extend with ENT-01/03/04/05/06 scaffolds
- [ ] `src/components/__tests__/BeneficiaryRegister.test.tsx` — NEW (ENT-07)
- [ ] `src/components/__tests__/PartnerRegister.test.tsx` — NEW (ENT-08)
- [ ] `src/components/__tests__/XlsxSheetPicker.test.tsx` — NEW (IMP-01)
- [ ] `src/components/__tests__/ImportReviewPane.test.tsx` — NEW (IMP-03)
- [ ] `src/components/__tests__/ImportTB.test.tsx` — extend with column-mapping confirm + fingerprint dialog + single-opening-journal cases (IMP-01..06)

---

## Wave 0 Source Scaffolds (Plan 04-1 must also create these for tests to compile)

The Wave 0 RED-by-design relies on test files referencing types/exports that downstream plans will fill in. To keep `tsc --noEmit` GREEN throughout Phase 4, Wave 0 ships **interface-only modules** (no behaviour) for:

- [ ] `src/types.ts` — widen `Account`, `JournalEntry`, `Entity`, `AuditLog.action` per v3
- [ ] `src/lib/schemas.ts` — widen Zod schemas to v3
- [ ] `src/lib/migrations/v2-to-v3.ts` — actual additive migration body (this is pure data; Wave 0 implements it)
- [ ] `src/lib/migrations/index.ts` — bump `CURRENT_VERSION` to 3 and register v2-to-v3
- [ ] `src/lib/coa/types.ts` — `DefaultAccountSeed` shape
- [ ] `src/lib/coa/fy2026/base.ts` — shared 121-row spine seed (Wave 0 ships the data)
- [ ] `src/lib/coa/fy2026/individual.ts` — overlay (Wave 0 ships)
- [ ] `src/lib/coa/fy2026/company.ts` — overlay (Wave 0 ships)
- [ ] `src/lib/coa/fy2026/trust.ts` — overlay (Wave 0 ships)
- [ ] `src/lib/coa/fy2026/partnership.ts` — overlay (Wave 0 ships)
- [ ] `src/lib/coa/index.ts` — `getDefaultCoaFor(entityType, fy)` resolver (Wave 0 ships)
- [ ] `src/lib/ledger.ts` — `validateBalanced`, `makeReversal`, `searchJournals` (Wave 0 ships pure functions — they don't depend on hook state)
- [ ] `src/lib/import/fingerprint.ts` — `computeImportFingerprint` (Wave 0 ships)
- [ ] `src/lib/import/csv.ts` — `parseCsvFile` thin PapaParse wrapper (Wave 0 ships)
- [ ] `src/lib/import/xlsx.ts` — `parseXlsxFile` thin SheetJS wrapper (Wave 0 ships)

**Rationale:** Each of these is either pure data (CoA seeds), pure logic (ledger fns, fingerprint), or a thin library wrapper (csv/xlsx parsers). None of them depend on React hook state or UI, so shipping them in Wave 0 keeps Wave 2/3 plans focused on UI wiring. The component tests (and their `.todo`/`.skip` scaffolds) still flip RED→GREEN across waves.

---

## Manual-Only Verifications

| Behaviour | Requirement | Why Manual | Test Instructions |
|-----------|-------------|------------|-------------------|
| Full end-to-end UAT: create entity → import TB → review → post → edit one journal → reverse another → TB shows correct net + parent subtotals → archive an in-use account → try to delete a referenced entity → re-import same TB | All 5 success criteria | Cross-component flow with visual / interactive verification | Plan 04-4 human-verify checkpoint (10-step script) |
| AI-assist hidden when no `GEMINI_API_KEY` set | IMP-04 | Boot-time UI assertion in real browser | 1) Unset env var 2) `npm run dev` 3) Go to TB Import 4) Confirm no AI section, deterministic match works |
| Re-uploading same XLSX produces Skip/Replace/Add-additional dialog | IMP-05 | Real File I/O via input element | 1) Import a TB 2) Same instance — re-import same file 3) Dialog appears 4) Choose Skip — no new journal; choose Replace — replaces existing |
| AccountManager archive-vs-delete on default account | BOOK-06 | Confirmation-dialog UX | 1) Open AccountManager 2) Try to delete a default account 3) Dialog blocks hard delete, offers Archive |
| TrialBalance parent-row subtotals visually correct | BOOK-07, BOOK-09 | Visual hierarchy assertion | 1) Post journals against several accounts under "Operating Expenses" 2) View TB 3) Confirm "Operating Expenses" row shows summed totals |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or are flagged `checkpoint:human-verify`
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — every test scaffold listed above is created by Plan 04-1
- [x] No watch-mode flags in any command
- [x] Feedback latency < 10 s combined
- [x] StorageAdapter interface NOT widened (Phase 3 FINAL preserved)
- [x] v2 → v3 migration is additive only (no field removal or rename)
- [x] `nyquist_compliant: true` — every code-producing task has an automated check or is a structural type-check gate

**Approval:** planner-bound (initial — 2026-05-12)
