---
phase: 9
slug: exports-polish-cleanup
type: context
status: ready-for-planning
created: 2026-05-30
discussed_areas: [csv-format-conventions, csv-export-button-placement, anomaly-fix-it-deep-links, cleanup-scope]
---

# Phase 9: Exports + Polish + Cleanup — Context

**Gathered:** 2026-05-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 9 ships v1.1 by closing the last v1.0 known gap (FND-02 per-report CSV exports), polishing v1.0's UX-02 in-context anomaly UX with click-to-jump deep-links (UX-06), and sweeping the audit-flagged cosmetic + Nyquist debt (CLEAN-01, CLEAN-02). Single cohesive plan; lightweight UAT. After Phase 9, v1.1 is done.

**In scope:**
- **CSV per-report exports** — three new export actions: Trial Balance CSV (FND-10), Simpler BAS labels CSV (FND-11), Form I labels CSV (FND-12)
- **New module `src/lib/export/csv.ts`** — pure-function CSV serialiser using existing `papaparse.unparse()` with project-defined options (header row, raw decimal strings, quote-all, CRLF, UTF-8 BOM prefix, leading-zero-code quote-prefix, slug-based filename generator)
- **"Export CSV" buttons** in TrialBalance / BasIasAssistant / TaxReturnAssistant view headers — next to existing "Print working paper" button; `no-print` class so neither appears in print output; immediate download with auto-generated filename; period-aware (honours the same period selector as the view); empty-period → header-only CSV + inline toast
- **UX-06 anomaly fix-it deep-links** — Sidebar count badges become clickable navigation: Journals badge → JournalSearch screen filtered to unbalanced; Accounts badge → CoaTreeView filtered to missing-GST/missing-taxLabel rows. Cycling: single click advances to next anomaly; cycle wraps to first. Highlight: 300ms yellow background flash + scroll into view. Position feedback: transient toast "Showing anomaly 2 of 5 in Journal Entries" (3s auto-dismiss).
- **Lightweight toast primitive** (~30-line component, no new dependency) — reused for "No data in selected period" empty-export feedback AND "Showing anomaly N of M" cycling feedback. Single source of truth for transient feedback.
- **CLEAN-01 disposition (REQUIREMENTS.md update, no code change)** — Pre-flight discovered the `App.tsx:114` dead `'US Big Law Firm'` string was already removed in Phase 1 (`App.tsx` is only 94 lines; `grep` confirms only the test-file negative assertion at `App.test.tsx:28`). REQUIREMENTS.md row updated to mark CLEAN-01 Complete with note "already fixed in Phase 1 — stale audit entry"; committed alongside CLEAN-02.
- **CLEAN-02 Nyquist frontmatter flip** — Update `nyquist_compliant: false` → `nyquist_compliant: true` in:
  - `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md`
  - `.planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md`
  - `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md`
  - Single doc-only commit; no test changes
- **Lightweight UAT** (~10 manual checks): open each of 3 CSVs in Excel + verify header row + verify amounts preserve precision + verify leading-zero codes intact + click each Sidebar badge once + verify flash + toast + scroll behaviour + confirm Nyquist commit landed
- **Phase 9 closes v1.1 milestone** — successful UAT → `/gsd:complete-milestone v1.1`

**Out of scope (deferred):**
- Excel `.xlsx` export (only CSV) — v1.2+ if real users want native Excel formatting
- PDF export of any report — `window.print()` continues to be the print-to-PDF path (browser saves print dialog → PDF)
- Email-CSV-direct, share-link, or cloud-upload actions — out of v1.1
- "Export everything to a zip of CSVs" bulk action — defer to v2.x if real users want it
- Toast primitive expansion to other use cases (anomaly resolution, save confirmation, error messages, etc.) — v1.1 toast is single-purpose; widen in future phases
- Anomaly fix-it deep-links for tax-form view (e.g. Form I "M1 missing dependants" → jump to EntityForm) — UX-06 scope is Sidebar-badge-to-row only; in-form anomaly badges remain non-interactive
- Per-FY archive of CSV exports (audit trail of past exports) — defer; the `EXPORT_DATA` audit log entry already captures the action
- CSV import (round-trip of exported CSV back into AussieLedger) — out of v1.1; existing JSON import covers full-dataset round-trip
- "Re-export with this period preset" memory across sessions — defer; period selector resets per session
- Strict-scope cleanup expansion (TODO/FIXME/XXX audit across src/) — defer; risks turning Phase 9 into an unbounded "fix everything" phase
- Phase 5 `deferred-items.md` leftover audit — defer; Phase 5 was signed off as `tech_debt` and any remaining items are non-blocking

</domain>

<decisions>
## Implementation Decisions

### CSV format conventions (4 sub-decisions)

- **Header row included; money values as raw decimal strings (no `$`, no thousands separators).** Header: `code,name,type,debit,credit,balance,period_start,period_end` for TB; `label_code,plain_english,value,source` for BAS; `label_code,plain_english,value,source_account_codes` for Form I. Money cells = raw decimal strings (e.g. `1234.56`, not `$1,234.56`). Preserves full decimal.js precision; matches Phase 7 TEXT-affinity round-trip lesson; opens cleanly as numbers in Excel/Sheets without strip-formatting friction.
- **Quote all fields + CRLF line endings + UTF-8 BOM (`﻿`) prefix.** Most defensive serialisation. `Papa.unparse({ quotes: true, newline: '\r\n' })` with `﻿` prepended to the output string. Excel-on-Windows opens UTF-8 files reliably with the BOM; CRLF matches Excel-on-Windows expectations; quote-all eliminates ambiguity around commas/quotes in account names containing punctuation (e.g. `"Sales — Domestic, Online"`). Slightly larger file size; near-zero parse ambiguity in any consumer.
- **Leading-zero account codes prefixed with `'` (Excel text-marker).** When a code starts with `'0'` (e.g. `'0410'`), the CSV cell becomes `'0410` — Excel treats it as text and preserves the leading zero. Codes not starting with `'0'` are unchanged. Common Xero/MYOB export convention; preserves intent without invasive `=""` formula wrapping. Detection rule: `code.startsWith('0')`.
- **Filename convention: `{entity-slug}-{report}-{period}.csv`** (e.g. `acme-pty-ltd-tb-2026-Q2.csv`, `acme-pty-ltd-bas-2026-Q3.csv`, `acme-pty-ltd-form-i-2026.csv`). Slug derived from `entity.name` (lowercase; non-alphanumeric → `-`; collapse duplicate `-`). Period segment: FY (`2026`), BAS quarter (`2026-Q2`), or custom range (`2025-07-01_2026-06-30`). Easy to file in a tax-agent folder structure; human-scannable.

### CSV "Export" button placement + interaction (4 sub-decisions)

- **New button next to existing "Print working paper" button** in each view's header. Two siblings: `<button>Print working paper</button>` + `<button>Export CSV</button>`. Both inside the existing `no-print` header. Same visual treatment as the print button (primary blue per existing style). Consistent across TrialBalance / BasIasAssistant / TaxReturnAssistant. Simplest visual pattern; matches Phase 5's print-button convention.
- **Immediate download with auto-generated filename, no dialog.** Click → `Papa.unparse` → Blob → anchor click → download. Filename auto-generated per the slug convention above. User can rename in their OS file manager if desired. Matches Phase 3's JSON export DataPage pattern.
- **Period-aware: exports honour the currently-selected period (same as the view's Print).** The period selector on each view is the single source of truth. CSV export reads the same period state. "What you see is what you export." Matches Phase 5 Print working paper behaviour exactly.
- **Empty-period: download header-only CSV + show inline toast "No data in selected period for export".** Header row alone is a valid CSV (machine-readable; signals fields exist but no data). Toast confirms the why so user isn't surprised by an "empty" file. Uses the same lightweight toast primitive as UX-06's position feedback.

### Anomaly fix-it deep-link UX (UX-06) (4 sub-decisions)

- **Per-badge destination: Journals badge → JournalSearch (filtered to unbalanced); Accounts badge → CoaTreeView (filtered to missing GST or missing tax-label).** Each badge maps to the screen where the anomaly source lives, with a pre-filter applied on landing so user immediately sees what needs attention. Filter is sticky-on-navigation and can be cleared via the existing search/filter UI. Specific filter implementations: JournalSearch gains a `filterUnbalanced` flag; CoaTreeView gains a `filterMissingMappings` flag.
- **Highlight style: 300ms yellow background flash + scroll into view.** CSS animation on the row: `bg-yellow-100` → fade to transparent over 300ms. Uses existing Tailwind colour. Subtle attention-grabber; no visual debt (fades out). `scrollIntoView({ behavior: 'smooth', block: 'center' })` for the focus.
- **Cycling: single click advances to next anomaly; cycle wraps to first after last.** Click "Journals 3" → jumps to first unbalanced entry. Click again → second. Click again → third. Click again → wraps back to first. Cycle position tracked in component-local state (no URL state, no global state). Sidebar badge counter shows total count regardless of position. Predictable; no modifier-key shortcuts.
- **Position feedback: transient toast "Showing anomaly N of M in {Screen Name}" (3s auto-dismiss).** Toast appears top-center on each badge click. Uses the same lightweight toast primitive as empty-CSV-export feedback. 3-second auto-dismiss; user can dismiss earlier by clicking it. Single primitive, two callers.

### Cleanup scope (4 sub-decisions)

- **Strict scope — only the items in REQUIREMENTS.md (CLEAN-01 doc-only, CLEAN-02 frontmatter flips).** No expansion into a TODO/FIXME/XXX audit. No Phase 5 `deferred-items.md` re-audit. v1.1 ships cleanly; v1.2+ can do hygiene phases if real debt accumulates.
- **CLEAN-01 disposition: REQUIREMENTS.md update only, no code change.** Pre-flight verified `App.tsx` is 94 lines (audit said line 114 which is impossible) and `grep "US Big Law Firm" src/` returns only the test-file negative assertion. Update REQUIREMENTS.md CLEAN-01 row from `[ ]` to `[x]` with traceability note `"Complete — already fixed in Phase 1 (stale audit entry from v1.0 review)"`. Commit alongside CLEAN-02 in same doc commit.
- **Wave structure: single Plan 09-1.** Phase 9 has 6 small-to-medium requirements (FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02) that don't decompose into independent waves cleanly. Single plan with multiple tasks (1: CSV serialiser module + 3 button wires, 2: UX-06 deep-links + toast primitive, 3: cleanup sweep, 4: UAT) keeps phase scope tight. Estimated 2–3 days.
- **Lightweight UAT (~10 manual checks).** Open each of 3 CSVs in Excel — verify header row, money precision, leading-zero codes. Click each Sidebar badge once — verify scroll + flash + toast. Confirm Nyquist frontmatter flipped on all 3 v1.0 phases. Confirm REQUIREMENTS.md shows all 6 v1.1 requirements `[x]`. Heavier UAT (Phase 7's 42-step structure) isn't warranted for a polish phase.

### Claude's Discretion

- **Exact toast primitive shape** — small `<Toast message duration={3000} />` component using `useState` + `setTimeout`. Probably in `src/components/Toast.tsx`. Planner picks props (e.g. `tone: 'info' | 'warn'`).
- **Exact slug-generation regex** for entity names — `name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')`. Planner confirms or adjusts based on existing slug helpers (Phase 6 has `slugify` in `persona.ts`).
- **Exact CSV serialiser function signature** — `exportTrialBalanceCsv(accounts, entries, period, entity) → { filename, csv }`. Pure function returning data + filename; component triggers download. Same shape for BAS and Form I.
- **Pre-filter prop API on JournalSearch and CoaTreeView** — `filterUnbalanced?: boolean` + `filterMissingMappings?: boolean` props that, when true, default the existing filter UI to the relevant subset. Planner picks the exact state-management pattern.
- **Toast position** (top-center vs top-right vs bottom-center) — top-center is the project default for transient feedback; planner can adjust if visual review surfaces conflicts.
- **`fmtPeriod` helper for filename period segment** — FY → `"2026"`; quarter → `"2026-Q2"`; custom → `"2025-07-01_2026-06-30"`. Planner picks based on the existing `period.ts` formatters from Phase 2.
- **CSV row schema details** — exact field ordering and any auxiliary columns (e.g. include `account_type` in TB CSV? include `is_locked` flag in Form I CSV?). Planner picks based on what makes the CSV most usable for re-import into Excel/Xero/MYOB; defaults documented in REQUIREMENTS.md row text.
- **Whether empty-CSV toast also writes an `EXPORT_DATA` audit log entry** — probably yes for symmetry with non-empty exports; planner confirms.
- **Whether the JournalSearch and CoaTreeView pre-filter UI shows a visible "Filtered to anomalies — clear filter" banner** — yes; matches Phase 4's filter-clear pattern.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 9 scope + prior decisions
- `.planning/PROJECT.md` — Vision, audience, v1.1 milestone goal
- `.planning/REQUIREMENTS.md` §FND-10..12 + §UX-06 + §CLEAN-01..02 acceptance criteria
- `.planning/ROADMAP.md` — Phase 9 entry with goal + 5 success criteria + research flags
- `.planning/milestones/v1.0-phases/03-durable-persistence/03-CONTEXT.md` — DataPage JSON-export pattern (Blob+anchor download); StorageAdapter FINAL invariant
- `.planning/milestones/v1.0-phases/04-bookkeeping-core/04-CONTEXT.md` — `papaparse` usage in import path (Phase 4 shipped; Phase 9 reuses for unparse)
- `.planning/milestones/v1.0-phases/05-tax-outputs/05-CONTEXT.md` — Print working paper button placement pattern (Phase 5)
- `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-CONTEXT.md` — Sidebar count badges (Phase 6 UX-02); `useAnomalyCounts` hook shape

### Existing code Phase 9 must consume / extend
- `src/components/DataPage.tsx` — Blob+anchor download pattern (Phase 3); CSV export reuses
- `src/lib/import/csv.ts` (Phase 4) — already imports `papaparse`; CSV export uses `Papa.unparse()`
- `src/hooks/useAnomalyCounts.ts` (Phase 6) — returns `{ journals, accounts }`; UX-06 reads from here
- `src/components/shell/Sidebar.tsx` (Phase 6) — `<NavButton badge={...} />` renders count; UX-06 adds onClick navigation + cycle state
- `src/components/JournalSearch.tsx` (Phase 4) — gains `filterUnbalanced?: boolean` prop + UI affordance for it
- `src/components/CoaTreeView.tsx` (Phase 4) — gains `filterMissingMappings?: boolean` prop + UI affordance
- `src/components/TrialBalance.tsx` (Phase 4) — new "Export CSV" button next to existing Print
- `src/components/BasIasAssistant.tsx` (Phase 5) — same
- `src/components/TaxReturnAssistant.tsx` (Phase 5/6/8) — same
- `src/lib/period.ts` (Phase 2) — `fmtPeriod` helper for filename segments

### New code Phase 9 creates
- `src/lib/export/csv.ts` — pure-function CSV serialiser + filename generator
- `src/lib/export/__tests__/csv.test.ts` — unit tests
- `src/components/Toast.tsx` — lightweight transient-feedback primitive (~30 lines)
- `src/components/__tests__/Toast.test.tsx`
- 3 button-wire extensions in TB/BAS/Form-I components
- 1 hook extension in Sidebar.tsx for UX-06 cycling + onClick
- 2 filter-prop extensions on JournalSearch + CoaTreeView

### External documentation
- `papaparse` API docs (already in package.json) — `Papa.unparse()` signature + options
- Excel CSV import behaviour with UTF-8 BOM + CRLF — standard reference; no specific URL needed

### Docs to update (CLEAN-02)
- `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md` — flip `nyquist_compliant: true`
- `.planning/milestones/v1.0-phases/02-decompose-and-tax-engine/02-VALIDATION.md` — same
- `.planning/milestones/v1.0-phases/06-personas-wizard-and-deployment/06-VALIDATION.md` — same

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `papaparse` (Phase 4) — already in repo; `Papa.unparse()` for serialisation. Zero new dependency.
- `DataPage.tsx` Blob+anchor download pattern (Phase 3) — `new Blob([content], { type: 'text/csv;charset=utf-8' })` + anchor click. Phase 9 mirrors exactly.
- `useAnomalyCounts` hook (Phase 6) — returns count map; UX-06 reads `journals` + `accounts` counts.
- `Sidebar.tsx <NavButton badge={...} />` pattern (Phase 6) — already renders the badges; UX-06 adds onClick + cycle state.
- Existing period selectors on TrialBalance / BasIasAssistant / TaxReturnAssistant (Phase 4/5) — CSV export reads the same period state.
- `slugify` in `persona.ts` (Phase 6) — may be reusable for entity-slug filename generation.
- `EXPORT_DATA` audit-log action (Phase 5) — CSV export emits the same action with `{ type: 'csv', report, period }` details.

### Established Patterns
- **Pure-function serialisation in `src/lib/export/`** — new directory mirroring `src/lib/import/`. CSV serialiser is a pure function; UI orchestrates download.
- **Component-local cycle state** (Phase 6 pattern) — UX-06 cycle position lives in Sidebar component state, not global. No URL state. Resets on navigate-away.
- **Toast primitive as single-purpose** — empty-CSV-export + UX-06 position feedback are the only two callers in v1.1. Don't over-engineer for future use cases.
- **`no-print` class on header buttons** — existing convention (Phase 5); new Export CSV button inherits.
- **Audit-log emission on user-finalisable actions** — Phase 3 export + Phase 5 print + Phase 6 finalise all emit. CSV export joins the same channel.

### Integration Points
- New `src/lib/export/` directory: pure-function serialisers per report type.
- New `src/components/Toast.tsx`: ~30-line component; two call sites in v1.1.
- New button in three view headers: ~5 lines each.
- Sidebar.tsx: new onClick handler + cycle-state hook (~15 lines).
- JournalSearch.tsx + CoaTreeView.tsx: each gains a `filter*` prop + "Filtered to anomalies — clear filter" banner.
- REQUIREMENTS.md: 6 row updates (3 CSV rows → Complete; UX-06 → Complete; CLEAN-01 + CLEAN-02 → Complete).
- 3 v1.0 VALIDATION.md frontmatter flips.

</code_context>

<specifics>
## Specific Ideas

- **CLEAN-01 was already fixed.** Stale audit entry from v1.0 review. REQUIREMENTS.md row update only; no code change. Document the discovery in the row's traceability note so the audit trail is honest.
- **Excel-on-Windows is the worst case for CSV interop** — UTF-8 BOM + CRLF + quote-all + leading-zero quote-prefix targets this case directly. Other readers (Sheets, libre, macOS Excel) handle these defensively-defensive defaults without issue.
- **Reuse `papaparse`** for `unparse` — already in repo from Phase 4 import path. Zero new dependency. Avoids hand-rolled RFC 4180 quoting bugs.
- **300ms yellow flash + smooth scroll** matches GitHub PR-comment-scroll UX and Notion mention-scroll UX. Audience-familiar pattern.
- **Single toast primitive, two call sites** — empty-CSV-export + UX-06 position feedback. Don't expand to other use cases in v1.1 (save confirmations, error messages, etc.); v1.2+ can widen.
- **Filename slugging** can reuse Phase 6's `slugify` if signature matches; otherwise duplicate the 1-line regex. Don't refactor for sharing if it complicates the planning surface.

</specifics>

<deferred>
## Deferred Ideas

- **Excel `.xlsx` native export** — v1.2+ if real users need formatted Excel output beyond what CSV-in-Excel provides
- **PDF export of any report** — `window.print()` continues to be the print-to-PDF path (browser saves → PDF)
- **Email-CSV-direct, share-link, cloud-upload actions** — out of v1.1
- **"Export everything to a zip of CSVs" bulk action** — v2.x if real users want it
- **Toast primitive widening** to other use cases (save confirmations, error messages, AnomalyBadge expansion) — v1.1 toast is intentionally single-purpose
- **In-form anomaly badge fix-it deep-links** (e.g. Form I "M1 missing dependants" → jump to EntityForm) — UX-06 scope is Sidebar-badge-to-row only; in-form badges remain non-interactive in v1.1
- **Per-FY archive of past CSV exports** (audit trail of exports beyond the audit-log entry) — defer
- **CSV import (round-trip of exported CSV back into AussieLedger)** — out of v1.1; JSON import already covers full-dataset round-trip
- **Re-export with period preset memory across sessions** — defer; period selector resets per session
- **TODO/FIXME/XXX audit across src/** — defer; unbounded scope; better as a separate hygiene phase if real debt accumulates
- **Phase 5 `deferred-items.md` leftover re-audit** — Phase 5 was signed off `tech_debt`; non-blocking
- **Anomaly fix-it for tax-form labels** (e.g. clicking M1 anomaly → jump to relevant Entity field) — v2.x if user feedback requests
- **Cycle-state persistence across navigation** (e.g. open new browser tab, position remembered) — over-engineered; session-local is sufficient

</deferred>

---

*Phase: 09-exports-polish-cleanup*
*Context gathered: 2026-05-30*
