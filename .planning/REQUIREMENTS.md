# Requirements: AussieLedger v1.1

**Defined:** 2026-05-29
**Milestone:** v1.1 — Polish, Closure, and TB Import Rework
**Core Value (unchanged from v1.0):** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**v1.1 thesis:** Same shell, same stack. Close v1.0's known gaps; rebuild ImportTB to handle messy real-world TB exports; ship the family Medicare levy threshold engine that Phase 5 deferred. No architectural pivot, no new deployment shape — the standalone desktop app idea is preserved as a future v2.0 milestone (`.planning/future-milestones/v2.0-standalone-app/`).

## v1.1 Requirements

### TB Import Rework (IMP, continuing v1.0's IMP-01..06)

The deterministic CSV/XLSX parser shipped in Phase 4 handles cleanly-formatted exports. Real-world TBs from Xero/MYOB/QuickBooks/Excel come with title rows, currency symbols, parenthesised negatives, interleaved subtotals, and split account-code/name columns. v1.1 makes ImportTB robust to that.

- [x] **IMP-07**: ImportTB detects the header row in CSV/XLSX TB files even when it's not row 1 (trailing title/date/notes rows above the headers) and when headers span multiple rows. Auto-suggested header row(s) shown with a "this looks right" / "pick a different row" UI; user always has the final say
- [x] **IMP-08**: ImportTB tolerantly parses currency cells — strips `$`, `AUD`, `A$` prefixes; recognises `(1,234.56)` parentheses notation as negative; ignores thousands separators; ignores leading/trailing whitespace; preserves decimal.js precision (`"1,234.56"` parses to `Decimal("1234.56")`, never `1234.5600000000001`)
- [x] **IMP-09**: ImportTB detects subtotal-style rows ("Total Operating Expenses", "Net Income", "Grand Total", patterns where the value column is the sum of preceding rows in the same section) and excludes them from the import by default; user can review and re-include any row in a dedicated panel
- [x] **IMP-10**: ImportTB handles split account-code/name columns (e.g. column A = code "4100", column B = name "Sales — Domestic") by merging them on import; detects when account codes are absent entirely and offers "auto-assign codes sequentially" or "import name-only and map manually"
- [x] **IMP-11**: ImportReviewPane gains a "Rejected rows" panel listing every row dropped during parsing with a reason ("looks like a subtotal", "currency unparseable", "no code or name"); each rejected row supports inline edit + re-include; a "Apply this fix to similar rows" bulk action handles repeated patterns (e.g. all `$N,NNN` cells in one column)

### Family Medicare Levy Threshold Engine (MED)

Phase 5 shipped single-person Medicare levy correctly but punted on family thresholds (flat 2% with visible warning). v1.1 closes that.

- [x] **MED-01**: Entity (Individual type only) gains `dependants?: number` and `spouseIncome?: string` (decimal string) fields — additive v5→v6 schema migration with round-trip test
- [x] **MED-02**: `computeIndividualReturn` switches from the flat-2% fallback to the real family Medicare levy threshold engine when `dependants > 0` or `spouseIncome` is set. Family lower threshold + family upper threshold + per-dependant-child adjustment all applied per ATO instructions for FY2026
- [x] **MED-03**: Form I rendering (`TaxReturnAssistant`) displays the family-threshold variant of the M1/M2 calculation with a "Family threshold applied — based on N dependants + spouse income $X" assumption row, replacing the flat-2%-warning when applicable
- [x] **MED-04**: EntityForm exposes the two new fields (only when entity type = Individual) with inline help-text explaining how they affect Medicare calculation; defaults are `undefined` so existing v1.0 entities continue to use single-person thresholds without any user action

### FND-02 Closure — Per-Report CSV Exports (FND)

The JSON full-dataset export shipped Phase 3. The per-report CSV exports promised by FND-02 ship here.

- [ ] **FND-10**: User can export the Trial Balance for the selected period as a CSV — one row per account: `code, name, type, debit, credit, balance, period_start, period_end` — usable in Excel/Sheets without further transformation
- [ ] **FND-11**: User can export Simpler BAS labels for the selected quarter as a CSV — one row per label: `label_code, plain_english, value, source` (where `source` indicates whether the value is lodged or internal-only)
- [ ] **FND-12**: User can export Form I (Individual return) labels for the selected FY as a CSV — one row per label: `label_code, plain_english, value, source_account_codes` (the comma-separated list of accounts whose balances aggregated into the label)

### Polish + UX (UX, continuing v1.0's UX-01..05)

- [ ] **UX-06**: Clicking a Sidebar anomaly count badge (e.g. "Journals 3") deep-links to the relevant screen AND auto-scrolls to the first offending row (e.g. the first unbalanced journal); subsequent clicks cycle through the remaining offenders. Polishes v1.0's UX-02 in-context anomaly surfacing.

### Cleanup + Hygiene (CLEAN)

One-shot doc-and-cosmetic sweep, no user-facing impact beyond what's noted.

- [ ] **CLEAN-01**: Remove the `'US Big Law Firm'` dead string literal at `src/App.tsx:114` — never renders, leftover from the brownfield prototype, surfaced in v1.0 audit
- [ ] **CLEAN-02**: Retroactively flip `nyquist_compliant: true` on v1.0 Phases 1, 2, 6 `VALIDATION.md` frontmatter — all tests are GREEN; the frontmatter just never got updated. One-shot doc commit.

## Future Requirements (deferred from v1.1)

- **Standalone desktop app (Tauri) + file-backed SQLite + hard network sandbox** — full v2.0 research preserved at `.planning/future-milestones/v2.0-standalone-app/`. Reactivate as v2.0 once v1.1 ships.
- **Encrypted-at-rest persistence** — v2.x
- **Multi-FY catch-up wizard** (preparing two FYs at once) — v2.x
- **Per-user help-text overrides** — overengineered for now
- **Live-fetched ATO instruction text** — brittle; v3+ if a stable ATO API surface exists
- **Direct ATO / myGov lodgement via SBR** — v3+
- **Bank-feed / Open Banking integration** — v3+
- **CODE_OF_CONDUCT.md + SECURITY.md** — added when external contributors arrive

## Out of Scope (explicit non-goals)

- **AI enhancements in ImportTB** — v1.1 explicitly improves the deterministic path only; AI gating from v1.0 stays exactly as shipped (`isAiEnabled()` runtime check + `AiGateNote` inline affordance)
- **Schema migrations beyond v5→v6** — v1.1 is one additive migration only (MED-01)
- **New entity types** — AU-only Company / Trust / Individual / Partnership unchanged
- **New tax forms beyond Form I / C / T / P / BAS / IAS** — out of v1
- **Mobile-native app** — responsive web SPA continues to serve mobile users
- **Tax-year migration (FY2026 → FY2027)** — separate concern; not a v1.1 deliverable
- **Performance optimisation work** — v1.0 ships fast enough for the audience; defer until a real performance complaint surfaces

## Traceability

Filled by `/gsd:roadmapper` once phase assignment locks. Each REQ-ID maps to exactly one phase.

| Req | Phase | Status |
|-----|-------|--------|
| IMP-07 | Phase 7 | Complete (07-3) |
| IMP-08 | Phase 7 | Complete (07-3) |
| IMP-09 | Phase 7 | Complete (07-3) |
| IMP-10 | Phase 7 | Complete (07-3) |
| IMP-11 | Phase 7 | Complete (07-3) |
| MED-01 | Phase 8 | Complete (08-1 + UAT) |
| MED-02 | Phase 8 | Complete (08-1 + 08-2 + UAT) |
| MED-03 | Phase 8 | Complete (08-2 + UAT) |
| MED-04 | Phase 8 | Complete (08-2 + UAT) |
| FND-10 | Phase 9 | Pending |
| FND-11 | Phase 9 | Pending |
| FND-12 | Phase 9 | Pending |
| UX-06 | Phase 9 | Pending |
| CLEAN-01 | Phase 9 | Pending |
| CLEAN-02 | Phase 9 | Pending |

**Total v1.1 requirements: 15**
**Phase coverage: 7 through 9 (3 phases continuing from v1.0's 1–6)**
