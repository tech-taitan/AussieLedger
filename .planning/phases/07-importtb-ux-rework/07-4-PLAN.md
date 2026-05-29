---
phase: 07-importtb-ux-rework
plan: 4
type: execute
wave: 4
depends_on: [1, 2, 3]
files_modified: []
autonomous: false
requirements:
  - IMP-07
  - IMP-08
  - IMP-09
  - IMP-10
  - IMP-11
must_haves:
  truths:
    - "User can import all 4 messy fixtures (Xero, MYOB, QBO, hand-edited Excel) end-to-end via npm run dev with zero silent parse failures"
    - "User can import the Phase 4 clean fixture and observe identical behavior to Phase 4 (no header picker shown, single onImport call, zero rejectedRows) — regression confirmed visually"
    - "Every rejected row shows a reason; user can edit-in-place, click Re-parse and include, or click Apply to similar with a diff preview"
    - "All 5 IMP-07..11 requirements signed off by the user"
    - "Full SPA + server test suite GREEN; lint EXIT 0; build EXIT 0"
  artifacts:
    - path: ".planning/phases/07-importtb-ux-rework/07-UAT.md"
      provides: "UAT record with checklist outcomes per fixture; user sign-off note"
  key_links: []
---

<objective>
Manual UAT against all four messy fixtures (Xero, MYOB, QBO, hand-edited Excel) + Phase 4 clean-flow regression check. Confirm the end-to-end behavior of every Phase 7 requirement by running `npm run dev` and importing each fixture. Sign off all 5 IMP-07..11 requirements OR file diagnosed gaps to drive a `/gsd:plan-phase 7 --gaps` cycle.

Purpose: Pure-function tests + component tests catch algorithmic + structural correctness. They cannot validate the experience — does the auto-pick banner feel obvious? Does the rejected-rows panel scroll naturally? Does Apply-to-similar surface enough context before bulk-mutating? UAT closes that gap.

Output:
- `.planning/phases/07-importtb-ux-rework/07-UAT.md` documenting per-fixture outcomes
- Either user sign-off message `approved` → phase closes, or diagnosed gaps → `/gsd:plan-phase 7 --gaps`
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/07-importtb-ux-rework/07-CONTEXT.md
@.planning/phases/07-importtb-ux-rework/07-VALIDATION.md
@.planning/phases/07-importtb-ux-rework/07-1-PLAN.md
@.planning/phases/07-importtb-ux-rework/07-2-PLAN.md
@.planning/phases/07-importtb-ux-rework/07-3-PLAN.md
@src/lib/import/__fixtures__/messy-tbs/xero-tb.csv
@src/lib/import/__fixtures__/messy-tbs/myob-tb.csv
@src/lib/import/__fixtures__/messy-tbs/excel-hand-edited.csv
</context>

<tasks>

<task type="auto">
  <name>Task 1: Pre-UAT sanity — automated checks before handing to user</name>
  <read_first>
    - .planning/phases/07-importtb-ux-rework/07-VALIDATION.md (test counts + sampling rate)
    - .planning/phases/07-importtb-ux-rework/07-1-PLAN.md (Wave 0 fixture paths)
  </read_first>
  <action>
    Run the full automated verification suite before the human UAT:

    1. `npx vitest run` — verify full SPA suite GREEN ≥ 813 + 0 failures
    2. `npm run test:server` — verify server suite still 18 GREEN
    3. `npm run lint` — exit 0
    4. `npm run build` — exit 0
    5. `git diff src/storage/adapter.ts src/storage/local.ts src/storage/server.ts src/types.ts` — return empty (architecture invariants from Phases 3/4 preserved)
    6. `git diff src/lib/match.ts src/lib/import/match.ts src/lib/import/fingerprint.ts` — return empty (Phase 4 reusables preserved)
    7. `ls src/lib/import/__fixtures__/messy-tbs/` — confirm all 4 fixtures present (xero-tb.csv, myob-tb.csv, quickbooks-tb.xlsx, excel-hand-edited.csv)

    If any check fails, do NOT proceed to UAT — fix the failure first (this may require returning to Plan 07-3 or filing a /gsd:plan-phase 7 --gaps).
  </action>
  <verify>
    <automated>npx vitest run --reporter=default 2>&1 | tail -5 && npm run lint 2>&1 | tail -3 && npm run build 2>&1 | tail -3</automated>
  </verify>
  <acceptance_criteria>
    - `npx vitest run` exit 0; "Tests" line shows ≥ 813 passed + 0 failed
    - `npm run test:server` exit 0; 18 passed
    - `npm run lint` exit 0
    - `npm run build` exit 0
    - `git diff src/storage/adapter.ts` returns empty
    - `git diff src/types.ts` returns empty
    - `git diff src/lib/import/fingerprint.ts src/lib/import/match.ts` returns empty
    - All 4 fixture files present on disk
  </acceptance_criteria>
  <done>
    All automated gates GREEN. UAT can proceed.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual UAT — 4 messy fixtures + Phase 4 clean regression</name>
  <what-built>
    Phase 7 complete. ImportTB now:
    1. Auto-detects header rows in CSV/XLSX TB files with title rows above the headers; user can override by clicking any row
    2. Tolerantly parses currency cells — $, AUD, A$, parentheses-negatives, thousands separators, whitespace; preserves decimal.js precision
    3. Detects subtotal rows (keyword + sum-pattern) and excludes them by default; user can re-include any in the Rejected Rows panel
    4. Detects split account-code/name columns and merges them; detects missing codes (>50% empty) and offers auto-assign vs name-only
    5. Surfaces every dropped row with a reason in the Rejected Rows panel; supports edit-in-place + Re-parse-and-include + Apply-to-similar with diff preview

    The Phase 4 clean-import flow is UNCHANGED — running with a clean CSV (no $, row 0 header, no subtotals) shows zero new UI elements and behaves identically.
  </what-built>
  <how-to-verify>
    Prerequisites: `npm run dev` running. Browser open at the ImportTB view. Have an entity created so `activeEntityId` is set (otherwise fingerprint dedup won't fire).

    Record outcomes in `.planning/phases/07-importtb-ux-rework/07-UAT.md` as you go — one section per fixture, P (pass) or F (fail) per checklist item, brief note if F.

    ---

    **FIXTURE 1: Xero TB (src/lib/import/__fixtures__/messy-tbs/xero-tb.csv)**

    1. Upload xero-tb.csv via the file picker
    2. Verify HeaderRowPicker does NOT show (auto-pick at row 5 should be high-confidence) OR shows with row 5 highlighted
    3. If HeaderRowPicker shows: click row 5 ("Account,Account Code,Debit,Credit,YTD Debit,YTD Credit") — verify advances to column-mapping
    4. In column mapping: verify auto-seeded mapping picks "Account Code" → Code, "Account" → Name, "Debit" → Debit, "Credit" → Credit (or close — user may need to tweak)
    5. Click "Continue to review"
    6. In the review pane:
       - Verify "Tolerantly parsed currency in N cells" banner does NOT show (Xero has plain numeric, no $) OR shows N=0
       - Verify rejected-rows-banner shows at least 2 rejected rows (Total Revenue + Total + Total Operating Expenses)
       - Click banner to expand; verify "Detected as subtotal" section contains "Total Revenue", "Total Operating Expenses", and bottom "Total" row
       - Verify the actual data rows (Sales, Other Revenue, Rent, Utilities) appear in the ACCEPTED section
    7. Click "Include all subtotals" — verify the 3 subtotal rows move to accepted (visual: bottom counter rises)
    8. Click "Reject all" — return to upload screen

    **FIXTURE 2: MYOB TB (myob-tb.csv)**

    9. Upload myob-tb.csv
    10. Verify HeaderRowPicker behavior: auto-pick at row 5, or click row 5 manually
    11. Column mapping seeded: "Account Number" → Code, "Account Name" → Name, "Debit"/"Credit" map
    12. Verify hyphenated codes (1-1100, etc.) appear in the review pane unchanged
    13. Verify "Total Assets" row is in rejected — reason: "Detected as subtotal"
    14. Verify code-prefix change from "1-" to "4-" did NOT trigger false sum-pattern (4-1000 Sales not in rejected unless its value coincidentally equals sum of preceding)
    15. Click Reject all

    **FIXTURE 3: QuickBooks TB (quickbooks-tb.xlsx)**

    16. Upload quickbooks-tb.xlsx
    17. Single sheet — XlsxSheetPicker should NOT show (auto-select for single sheet)
    18. HeaderRowPicker may show with row 5 ("Account,Debit,Credit") highlighted, or auto-advance
    19. Click row 5 if shown
    20. Column mapping: only "Account" available for both code AND name (it's name-only export). Verify missing-code-picker renders with auto-assign + name-only buttons
    21. Click "Import name-only and map manually"
    22. In column mapping, set Code → (empty), Name → Account, Debit → Debit, Credit → Credit
    23. Verify advance to review pane works
    24. Verify "Total ASSETS", "Total REVENUE", "TOTAL" rows appear in rejected with reason "Detected as subtotal"
    25. Click Reject all

    **FIXTURE 4: Hand-edited Excel TB (excel-hand-edited.csv)**

    26. Upload excel-hand-edited.csv
    27. HeaderRowPicker shows (or auto-advances) — confirm row 5 ("Code,Account Name,Debit ($),Credit ($)")
    28. In column mapping: verify "Debit ($)" matches Debit, "Credit ($)" matches Credit (regex must handle the "($)" suffix)
    29. Continue to review
    30. CRITICAL CHECKS:
        - "Tolerantly parsed currency in N cells" banner SHOWS with N ≥ 4 (the $25,000.00 cells)
        - Negative-parens cells ($(50,000.00)) parsed as negative — appears as -50000 in Credit column
        - "Total Current Assets" row appears in rejected-rows with reason "subtotal" (sum-pattern flagged it even with blank code)
        - "Total Revenue" row appears in rejected-rows
    31. Edit one $(...) cell in the rejected-rows panel — for example, change a debit cell to "1234.56", click Re-parse and include — verify row moves to accepted
    32. If multiple cells share the same failing pattern, click "Apply to similar (N rows)" — verify diff preview renders, click Cancel → verify rows unchanged; click Apply confirm → verify rows move to accepted
    33. Click Reject all

    **REGRESSION: Phase 4 clean fixture**

    34. Create or open a clean CSV with columns: Code, Name, Debit, Credit. Three data rows. No $. Header on row 1.
    35. Upload
    36. Verify HeaderRowPicker does NOT show (clean row-0 header should be auto-picked at high confidence)
    37. Verify column mapping auto-fills correctly (regex matches plain Code/Name/Debit/Credit)
    38. Continue to review
    39. Verify NO tolerant-parse banner, NO low-confidence badge, NO rejected-rows banner — clean fixture should produce zero noise
    40. Click Accept import — verify single opening JournalEntry posted with correct totals
    41. Re-upload the same CSV → verify fingerprint-collision-dialog renders (Phase 4 regression — IMP-05 preserved)
    42. Click Skip — verify dialog dismisses without posting duplicate

    **WRITE THE UAT RECORD**

    Create `.planning/phases/07-importtb-ux-rework/07-UAT.md` with a markdown table:

    ```
    | Fixture | Steps | P/F | Notes |
    |---------|-------|-----|-------|
    | Xero | 1-8 | P | ... |
    | MYOB | 9-15 | P | ... |
    | QBO | 16-25 | P | ... |
    | Excel | 26-33 | P | ... |
    | Phase 4 regression | 34-42 | P | Critical |
    ```

    Plus a per-requirement sign-off section listing IMP-07 / IMP-08 / IMP-09 / IMP-10 / IMP-11 with PASS or describe the gap that's blocking PASS.

    Resume signal: type `approved` (all PASS) OR describe issues for /gsd:plan-phase 7 --gaps to consume.
  </how-to-verify>
  <resume-signal>Type `approved` if all 42 steps + all 5 IMP requirements PASS, otherwise describe failures and run `/gsd:plan-phase 7 --gaps` to generate gap-closure plans.</resume-signal>
</task>

</tasks>

<verification>
- All 42 UAT steps PASS
- All 5 IMP-07..11 requirements signed off
- `.planning/phases/07-importtb-ux-rework/07-UAT.md` exists with detailed per-step outcomes
- User replies `approved`
</verification>

<success_criteria>
1. Pre-UAT automated checks pass (full suite GREEN, lint, build, invariants preserved)
2. All 4 messy-fixture imports work end-to-end with the expected UX
3. Phase 4 clean-flow regression confirmed visually — no Phase 7 UI noise on clean files
4. UAT record committed at .planning/phases/07-importtb-ux-rework/07-UAT.md
5. User explicitly approves all 5 IMP-07..11 requirements
</success_criteria>

<output>
After approval, create `.planning/phases/07-importtb-ux-rework/07-4-SUMMARY.md` with the UAT outcomes summary. Phase 7 is then ready for `/gsd:verify-work 7`.
</output>
