---
phase: 7
slug: importtb-ux-rework
type: context
status: ready-for-planning
created: 2026-05-30
discussed_areas: [header-detection-ux, currency-parser-strictness, subtotal-detection-strategy, rejected-rows-panel-ux]
---

# Phase 7: ImportTB UX Rework — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 7 makes ImportTB robust to real-world unformatted TB exports from Xero, MYOB, QuickBooks, and Excel — header rows that aren't row 1, currency cells with `$` / `AUD` / parentheses-negatives / thousands separators, subtotal rows interleaved with accounts, split account-code/name columns, and a review UX that surfaces every dropped row with a fix-it path. The Phase-4 deterministic-clean-import flow MUST keep working unchanged for files that already parse cleanly.

**In scope:**
- `src/lib/import/csv.ts` + `src/lib/import/xlsx.ts` widened — accept an optional `headerRowIndex` param (auto-detected or user-supplied); support multi-row header merge (e.g. Xero's "Account" / "Code | Name" split); return rich row-shape data including row-number, raw cell values, and parse confidence
- **NEW** `src/lib/import/headerDetect.ts` — pure-function header-row detector: scores rows by string-density + match against known TB-header patterns ("Account", "Code", "Name", "Debit", "Credit", "Balance"); returns top-3 candidates with confidence scores; threshold below which "auto-pick" falls back to "user picks manually"
- **NEW** `src/lib/import/currencyParse.ts` — pure-function tolerant currency parser: handles `$1,234.56`, `(1,234.56)`, `AUD 1234.56`, `1,234.56 AUD`, `-1234.56`, `  $1,234.56  `, etc; preserves full decimal.js precision; AU-locale-first with ambiguity-flag output (low-confidence parses surface in review pane); empty/whitespace → `Decimal(0)`, non-empty unparseable → reject row with reason
- **NEW** `src/lib/import/subtotalDetect.ts` — pure-function subtotal detector: keyword whitelist (`Total`, `Sum`, `Net`, `Grand`, `Subtotal`, case-insensitive) PLUS sum-pattern detection (row value ≈ sum of preceding rows in section, ±0.01 tolerance). Section boundary = blank row OR account-code-prefix change. A row matched by EITHER signal is flagged; sum-pattern wins on rows that have a code (catches Xero's auto-generated "Total Revenue" with a synthetic code)
- **NEW** `src/lib/import/columnMerge.ts` — pure-function column merger: detects when account code and account name are in separate columns and merges them on import; detects entirely missing codes and surfaces a "no code" rejection reason; preserves the code/name split when columns are explicitly mapped
- `src/components/ImportTB.tsx` widened (637 → ~750 lines estimated) — new "header row preview" step shows top ~15 rows with the auto-picked header highlighted; user can click any row to designate it as the header; low-confidence auto-pick falls back to a "Pick the header row" prompt; existing column-mapping flow runs AFTER header selection
- `src/components/ImportReviewPane.tsx` widened (210 → ~330 lines estimated) — Rejected Rows panel as an **inline collapsible section below accepted rows** with "N rows rejected — review" banner; rejected rows grouped by reason, sorted by original row position within each group; edit-in-place with "Re-parse and include" button per row; "Apply this fix to similar rows" identifies similar by **same reason + same regex signature** on the failing cell, with a visible preview-diff of affected rows before applying
- Existing clean-import flow regression-tested via the Phase 4 fixture — zero regression tolerance on the 12 existing JournalForm + ImportTB tests
- **NEW** real-world fixtures (anonymised): one each from Xero, MYOB, QuickBooks Online, and a hand-edited Excel TB; committed under `src/lib/import/__fixtures__/messy-tbs/`. These drive the header-detection + subtotal-detection + currency-parser unit tests

**Out of scope (deferred to later phases or out of v1.1 entirely):**
- AI-assist enhancements to ImportTB — explicit non-goal of v1.1; deterministic-path improvements only; AI gating (`isAiEnabled()` + `AiGateNote`) unchanged
- GL-shape (general ledger) vs TB-shape detection and adaptation — flagged in roadmap as a research-time question; v2.x if real users provide GL exports expecting them to work
- Per-Entity whitelist/blacklist patterns for subtotal detection — power-user feature; defer
- Locale auto-detection per file (AU vs EU number formats) — v2.x; v1.1 assumes AU and flags ambiguous cells in review pane
- Single-Amount-column-with-signed-value shape (non-AU exports with one column instead of D/C) — defer; ImportTB v1.1 still requires explicit Debit + Credit columns mapped separately
- Modal-based row editing — v1.1 uses edit-in-place inline; modal could be added in v2.x if real-row complexity demands it
- Cents-only formats like `12.5c` — defer; not seen in real AU TBs
- XLSX outline-level / indentation-based section detection — defer; blank-row + code-prefix heuristic covers ~80% of real exports
- "Always reject rows containing X" power-user patterns persisted per-Entity — defer
- Fix-in-source-file-and-re-upload workflow improvements — out of scope; user can always re-upload but the panel covers the common cases inline

</domain>

<decisions>
## Implementation Decisions

### Header-row detection UX (4 sub-decisions)

- **Auto-pick the most-likely row + show alternatives.** Heuristic scores every row in the first ~15 by string-density + match against known TB-header pattern list (`Account`, `Code`, `Name`, `Description`, `Debit`, `Credit`, `Balance`, case-insensitive, partial-match OK). Top scorer is auto-picked. UI shows "We think row N is the header" with a small "pick a different row" link revealing the top-3 candidates with confidence scores. Confidence is the relative score gap to the next-best candidate.
- **Click any row in the preview to designate it as the header.** Preview shows the first ~15 rows in a scrollable table. The auto-picked row is highlighted (subtle background tint). Clicking any other row re-designates it as the header. Spreadsheet-style direct manipulation; matches Xero/QuickBooks import wizard patterns the audience already knows. No dropdown, no number input.
- **Auto-merge multi-row headers into one composite + show the merge in preview.** When the detected header is 2-3 rows tall (common Xero pattern — e.g. row 1 = `Account` / row 2 = `Code | Name`), auto-merge into one composite row label (`Account / Code`, `Account / Name`). Preview shows the merged result so the user can see and override by clicking a different row. Handles ~80% of real cases; the remaining 20% (4+ row headers, weird group-by-merged-cells) fall to user manual override.
- **Low-confidence fallback: don't auto-pick at all.** If the top-candidate's confidence score is below a threshold (TBD by research, plausibly < 60%), don't auto-pick. Show all top-3 candidates with their scores and a "Pick the header row" prompt. Avoids silently-wrong defaults on files where the heuristic is genuinely unsure. Threshold tunable via research-flag.

### Currency parser strictness (4 sub-decisions)

- **Silent-tolerate unambiguous transformations.** `$1,234.56` → `Decimal("1234.56")` parsed without per-cell UI noise. A one-line summary at the top of ImportReviewPane reports "Tolerantly parsed currency in N cells" with a link to expand a list if the user wants to audit. Match the audience's mental model — they don't want a confirmation for every `$` they've ever seen.
- **AU-locale first; flag ambiguous parses in the review pane.** Default to AU conventions (`,` = thousands separator, `.` = decimal). When a cell could plausibly be either AU or EU format (e.g. `1,234` could be `1234` AU or `1.234` EU), parse as AU AND tag the cell with a "low confidence parse" flag. Low-confidence cells surface in a small review-pane sub-section ("N cells parsed with low confidence — verify") for opt-in review. Matches the project's AU-only stance without producing wrong values silently for the rare EU-export case.
- **Empty cells → 0; non-empty unparseable → rejected row.** Empty / whitespace-only cells default to `Decimal(0)` — common Xero/Excel behavior and matches user expectation. `N/A`, `pending`, text strings, formulas-as-text, etc. fail the cell and reject the row with reason "currency unparseable: [raw value]". User can inline-edit in the Rejected Rows panel to fix.
- **Detect both `-1234.56` and `(1234.56)`; CR/DR columns stay separate.** Currency parser handles leading-minus AND parentheses notation transparently — both produce a negative `Decimal`. The AU TB convention of separate Debit / Credit columns stays unchanged at the column-mapping layer; negative debit becomes a positive credit at parse time (with a low-confidence flag because it's unusual). Single-Amount-column-with-signed-value shape is deferred — v1.1 still requires explicit D + C columns.

### Subtotal detection strategy (4 sub-decisions)

- **Keyword + sum-pattern, EITHER signal flags the row.** Keyword whitelist (`Total`, `Sum`, `Net`, `Grand`, `Subtotal`, case-insensitive, partial-name-match) flags candidate rows on the name column. Sum-pattern (row's debit/credit value ≈ sum of preceding rows' values in the same section, ±0.01 tolerance to accommodate rounding) confirms or independently flags. A row matched by EITHER signal is flagged as a subtotal and excluded from import by default.
- **Section boundary: blank row OR account-code-prefix change.** Sum-pattern needs a "section" to sum. Sections start at a blank row (CSV blank line / XLSX empty row) OR at a change in account-code prefix (e.g. all `4xxx` rows form one section; first `5xxx` row starts a new section). Handles ~80% of real exports cleanly. XLSX outline-level detection is deferred to v2.x.
- **Per-row include checkbox in Rejected Rows panel + bulk include-all.** Detected subtotals land in the Rejected Rows panel with reason "Detected as subtotal". User can tick a per-row "Include" checkbox to bring it back into the accepted set; a "Include all subtotals" button bulk-includes the entire subtotal group. Same panel UI as other rejection reasons — consistent mental model.
- **Sum-pattern wins on coded rows.** Some exports give subtotals a synthetic account code (e.g. Xero's `4999` for "Total Revenue"). The sum-pattern detector catches these regardless of code presence — it doesn't care whether the row has a code. User can still re-include via the Rejected Rows panel if the heuristic mis-flags a real account whose value coincidentally matches the sum of preceding rows.

### Rejected Rows panel + bulk-apply UX (4 sub-decisions)

- **Inline collapsible section below accepted rows + "N rejected" summary banner.** ImportReviewPane's existing single-column flow gets an inline section beneath the accepted-rows table: a banner "N rows rejected — review" with a chevron expander. Expanded view shows rejected rows grouped by reason. Single scroll context; user can see accepted and rejected side-by-side without tab-switching. Matches the existing Phase 4 ImportReviewPane vertical-stack pattern.
- **Grouped by reason, sorted by original row position within group.** Reason categories — "Detected as subtotal", "Currency unparseable", "No account code", "Low confidence parse", "Other" — each rendered as a sub-section. Within each group, rows in original file order. Makes the "Apply this fix to similar rows" bulk-action natural ("apply to all 6 currency-unparseable rows in this group").
- **Edit-in-place with "Re-parse and include" button.** Each rejected row displays its cells as editable inputs (same field shape as accepted-row mapping). User edits any cell; clicks a per-row "Re-parse and include" button to re-run parse + validation + move the row to the accepted set. Direct manipulation, no modal. If re-parse fails again, the row stays rejected with the new reason.
- **"Apply this fix to similar rows" = same reason + same regex signature on failing cell, with diff preview.** Similarity = (a) same rejection reason AND (b) same regex signature on the originally-failing cell. Example: row rejected because its debit cell was `$1,234.56 X` (unparseable trailing text). User edits debit to `1234.56`. The system identifies the regex shape of the original failure (`/^\$[\d,]+\.\d{2} \w+$/`); finds 7 other rejected rows whose debit cells match the same shape; presents a preview diff showing the proposed fix applied to all 7; user confirms or rejects. Visible-before-apply pattern; no silent bulk mutations.

### Claude's Discretion

- **Exact heuristic algorithm for header-row scoring** — string-density formula, weight assigned to each known-header keyword, confidence-score normalisation. Will be informed by the research fixtures.
- **Confidence threshold for auto-pick vs manual fallback** — research must establish this empirically against the fixtures (probably 50-70%; pick the lowest value that doesn't false-pick a wrong row on any of the 4 real fixtures).
- **Exact keyword list and partial-match rules for subtotal detection** — full list including AU-specific phrases ("GST collected", "Trial Balance Total") may be added during research.
- **Sum-pattern tolerance value** — ±0.01 is a starting point; research may discover that real exports have larger rounding errors and need ±1.00 instead.
- **Confidence-score visual treatment in the header-row preview** — percentage badge, bar, or "high / medium / low" text. Planner picks based on density of the preview UI.
- **"Apply to similar" preview-diff layout** — table with "before / after" columns OR inline strikethrough. Planner picks.
- **Whether the "N cells parsed with low confidence" review sub-section is collapsed-by-default or expanded** — UX call; planner picks based on how often low-confidence parses happen on the fixtures.
- **Fixture anonymisation approach** — synthetic vs anonymised real exports. Planner picks based on what real exports the research phase can source. Synthetic is fine if structurally faithful.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 7 scope + prior decisions
- `.planning/PROJECT.md` — Vision, audience (non-accountant business owner), v1.1 milestone goal
- `.planning/REQUIREMENTS.md` §TB Import Rework — IMP-07 through IMP-11 acceptance criteria
- `.planning/ROADMAP.md` — Phase 7 entry with goal + 6 success criteria + research flags
- `.planning/milestones/v1.0-phases/04-bookkeeping-core/04-CONTEXT.md` — Phase 4 ImportTB design (deterministic-first philosophy, fingerprint dedup, ImportReviewPane shape, fuzzy-match details)
- `.planning/milestones/v1.0-phases/04-bookkeeping-core/04-4-SUMMARY.md` — Phase 4 Wave-3 ImportTB refactor that shipped (XlsxSheetPicker + ImportReviewPane + onReplace prop + supersedeImport)
- `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` — StorageAdapter FINAL invariant (no changes from v1.0)

### Existing code Phase 7 must extend (NOT rewrite)
- `src/components/ImportTB.tsx` (637 lines) — orchestrator; gains header-row preview step before column-mapping
- `src/components/ImportReviewPane.tsx` (210 lines) — gains inline Rejected Rows panel section
- `src/components/XlsxSheetPicker.tsx` — unchanged; multi-sheet picking flow preserved
- `src/lib/import/csv.ts` (41 lines) — widen `parseCsvFile` + `parseCsvText` with optional `headerRowIndex` param
- `src/lib/import/xlsx.ts` (38 lines) — widen `parseXlsxBuffer` + `pickSheetByName` with optional `headerRowIndex` param
- `src/lib/import/match.ts` (107 lines) — unchanged; fuzzy match runs after rows are parsed and accepted
- `src/lib/import/fingerprint.ts` — unchanged; fingerprint dedup runs after row parsing

### New modules to create
- `src/lib/import/headerDetect.ts` — pure-function header-row detector + confidence scorer + top-3 candidates extractor
- `src/lib/import/currencyParse.ts` — pure-function tolerant currency parser with AU-locale flag + decimal.js return value
- `src/lib/import/subtotalDetect.ts` — pure-function subtotal detector (keyword + sum-pattern)
- `src/lib/import/columnMerge.ts` — pure-function code/name column merger + missing-code detector
- `src/lib/import/__fixtures__/messy-tbs/` — real-world (anonymised) fixtures: Xero / MYOB / QuickBooks / Excel TB exports

### External documentation
- ATO definition of "Trial Balance" vs "General Ledger" (TB-shape vs GL-shape detection — research flag in ROADMAP; v1.1 assumes TB-shape and may add a defensive check)
- Xero TB export documentation (sample export shape) — for fixture sourcing
- MYOB AccountRight TB export shape — for fixture sourcing
- QuickBooks Online TB export shape — for fixture sourcing
- decimal.js API documentation — for currency parser implementation

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ImportTB.tsx` (Phase 4) — orchestrator pattern; gains a new "header row" step between sheet-picker (XLSX only) and column-mapping. Existing state-machine flow (`parsedRows` / `parsedHeaders` / `columnMappingByName` / `importedRows`) extends naturally.
- `ImportReviewPane.tsx` (Phase 4) — single-column vertical-stack pattern; gains an inline Rejected Rows section below accepted-rows table. No tab/drawer chrome.
- `AnomalyBadge` (Phase 5) — yellow pill component reused for "low confidence parse" tagging in the review pane. Same severity model as v1.0.
- `decimal.js` (Phase 1) — currency parser end-state is always a `Decimal`. No native floats anywhere.
- `parseCsvFile` / `parseCsvText` / `parseXlsxBuffer` (Phase 4) — already returns `{ rows, headers }`; widening to accept `headerRowIndex` is backward-compatible (default = 0, current behavior).

### Established Patterns
- **Pure functions for parsing + heuristics** (Phase 1-5) — header detection, currency parsing, subtotal detection, column merging all live in `src/lib/import/*.ts` as pure functions. UI orchestration in components. Same pattern as Phase 5 tax engine.
- **Test fixtures for messy real-world data** — Phase 5 BAS gold tests established the fixture-driven test pattern; Phase 7 extends with real-export-shape fixtures under `__fixtures__/messy-tbs/`.
- **Additive widening of existing APIs** — `parseCsvFile(file, { headerRowIndex? })` is additive on the existing signature; default behavior unchanged so the Phase 4 clean-import flow keeps working.
- **Inline anomaly surfacing** (Phase 5 + 6 AnomalyBadge pattern) — low-confidence parses surface inline next to the affected row, not in a separate report.

### Integration Points
- New step in ImportTB.tsx flow: `parsed → headerRowChosen → columnMapping → reviewing → committed`. The `headerRowChosen` step is new; everything downstream of it is unchanged.
- ImportReviewPane.tsx gains a new prop `rejectedRows: RejectedRow[]` and renders the inline panel when non-empty. Existing accepted-row table renders unchanged.
- `parseCsvFile` / `parseXlsxBuffer` signatures widen with `{ headerRowIndex?: number }`. When omitted, behavior matches current Phase 4 (use row 0 as header).

</code_context>

<specifics>
## Specific Ideas

- **Xero auto-generated "Total Revenue" pattern** — Xero exports TBs with synthetic account codes for subtotal rows (e.g. `4999 — Total Revenue`). The sum-pattern detector should catch these via the value-equals-sum-of-preceding-rows-in-section rule, regardless of the code presence. This is the canonical example of "sum-pattern wins on coded rows".
- **Spreadsheet-style row click for header pick** — matches the QuickBooks and Xero import-wizard pattern the target audience already knows. The clickable-row preview is the right metaphor.
- **Single-line summary "Tolerantly parsed currency in N cells"** — match the existing Phase 4 "skipped N rows" reporting pattern at the top of ImportReviewPane. Same tone, same density.
- **Reuse `AnomalyBadge` for "low confidence parse" tagging** — single visual language for anomalies across the app, established Phase 5 + Phase 6.
- **Real-fixture sourcing is the biggest unknown.** Research must source at least one anonymised real TB export from each of Xero / MYOB / QuickBooks / Excel. If real exports aren't available, synthesise structurally-faithful approximations.

</specifics>

<deferred>
## Deferred Ideas

- **AI-assist for ImportTB** (e.g. AI suggests header row, AI flags subtotals) — v1.1 explicitly limits to deterministic improvements; AI gating from v1.0 stays unchanged. v2.x candidate if real-world fixtures show heuristics struggling on a meaningful percentage of files.
- **GL-shape (General Ledger) vs TB-shape format detection** — flagged in roadmap research flag; v2.x if real users export GL expecting it to work.
- **Per-Entity persisted whitelist/blacklist patterns for subtotal detection** — power-user feature; defer to v2.x.
- **Locale auto-detection per file** (detecting EU-shape `1.234,56` files and using EU conventions) — v2.x; v1.1 assumes AU and flags ambiguous cells.
- **Single-Amount-column-with-signed-value support** (non-AU exports with one Amount column instead of Debit/Credit) — v2.x.
- **XLSX outline-level / indentation-based section detection** for sum-pattern — defer; blank-row + code-prefix heuristic covers ~80% of real exports.
- **Modal-based row editing UX** — inline edit-in-place suffices for v1.1; modal could be added if real row complexity demands it.
- **Cents-only formats** like `12.5c` — not seen in real AU TBs; defer.
- **"Cumulative running total" row detection** (running balance columns) — not a subtotal pattern per se; defer.
- **"Always reject rows containing X" / "never reject rows containing Y"** power-user patterns — v2.x.
- **Fix-in-source-file-and-re-upload workflow improvements** — out of scope; user can always re-upload but the inline panel covers the common cases.
- **Confidence-threshold tuning UI** for power users — internal constant in v1.1; could be settings-exposed in v2.x.

</deferred>

---

*Phase: 07-importtb-ux-rework*
*Context gathered: 2026-05-30*
