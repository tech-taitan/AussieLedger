---
phase: 06-personas-wizard-and-deployment
plan: 4
type: execute
wave: 3
depends_on: [06-2, 06-3]
files_modified:
  - .planning/phases/06-personas-wizard-and-deployment/06-UAT.md
autonomous: false
requirements: [UX-01, UX-02, UX-03, UX-04, UX-05, PERS-01, PERS-02, PERS-03, DEP-01, DEP-03, DEP-04]

must_haves:
  truths:
    - "All 5 Phase 6 success criteria pass end-to-end on a real fixture in a real browser"
    - "Clone-and-run produces a working instance with no paid services configured"
    - "Mode switch round-trip preserves all entity/journal/audit data"
    - "Wizard refuses to finalise when unmapped accounts exist; succeeds once they are resolved"
    - "ATO label tooltip visible on screen on at least one label per form; same text rendered inline on print"
    - "Core flows (JournalForm, TrialBalance, return preview) usable at 375px without horizontal body scroll"
  artifacts:
    - path: ".planning/phases/06-personas-wizard-and-deployment/06-UAT.md"
      provides: "Signed UAT log with per-step PASS/FAIL"
      contains: "UAT APPROVED"
  key_links:
    - from: ".planning/STATE.md"
      to: ".planning/phases/06-personas-wizard-and-deployment/06-UAT.md"
      via: "Phase 6 closure record"
      pattern: "Phase 6.*COMPLETE"
---

<objective>
Final manual UAT for Phase 6. Verify every success criterion from ROADMAP.md Phase 6 against the actual running app in a real browser. Sign the UAT log to close the phase.

Purpose: Convert "all unit/integration tests are GREEN" into "all 5 user-facing success criteria are demonstrably TRUE on a real machine with real data." This is the lodgement-bound moment for Phase 6.

Output: 06-UAT.md with timestamped pass/fail for each step + final approval signature.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md
@.planning/phases/06-personas-wizard-and-deployment/06-VALIDATION.md
@.planning/phases/06-personas-wizard-and-deployment/06-1-SUMMARY.md
@.planning/phases/06-personas-wizard-and-deployment/06-2-SUMMARY.md
@.planning/phases/06-personas-wizard-and-deployment/06-3-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Automated pre-UAT verification — full suite + build + lint must all pass</name>
  <files>
    .planning/phases/06-personas-wizard-and-deployment/06-UAT.md
  </files>

  <read_first>
    - .planning/phases/06-personas-wizard-and-deployment/06-1-SUMMARY.md
    - .planning/phases/06-personas-wizard-and-deployment/06-2-SUMMARY.md
    - .planning/phases/06-personas-wizard-and-deployment/06-3-SUMMARY.md
    - .planning/phases/06-personas-wizard-and-deployment/06-VALIDATION.md (the per-requirement test map — confirm every automated row passed)
  </read_first>

  <action>
    Step 1 — Run `npm run lint` from repo root. Expected EXIT 0.
    Step 2 — Run `npm test` (full Vitest SPA suite). Expected EXIT 0; record final GREEN count (expect ≥ 575).
    Step 3 — Run `npm run test:server`. Expected EXIT 0; expect 18 GREEN (no server changes in Phase 6).
    Step 4 — Run `npm run build`. Expected EXIT 0; dist/ produced.
    Step 5 — Run `npm run build:server`. Expected EXIT 0.
    Step 6 — Initialise `.planning/phases/06-personas-wizard-and-deployment/06-UAT.md` with frontmatter + header + a "Pre-UAT Automated Verification" section listing the 5 command outputs above (PASS/FAIL + counts).

    If any command fails: STOP, do not proceed to the manual UAT below, instead emit a failure report and return control to the orchestrator with the failing command + output.
  </action>

  <verify>
    <automated>npm run lint && npm test && npm run test:server && npm run build && npm run build:server</automated>
  </verify>

  <acceptance_criteria>
    - `npm run lint` exits 0
    - `npm test` exits 0 with ≥ 575 GREEN, 0 RED
    - `npm run test:server` exits 0 with 18 GREEN
    - `npm run build` exits 0; dist/index.html exists
    - `npm run build:server` exits 0; server/dist/server/index.js exists
    - `.planning/phases/06-personas-wizard-and-deployment/06-UAT.md` created with Pre-UAT section showing 5 PASS rows
  </acceptance_criteria>

  <done>All automated gates GREEN; 06-UAT.md initialised with Pre-UAT section; ready for manual UAT.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Manual UAT — 12 steps covering all 5 Phase 6 success criteria + DEP-01 fresh-clone check</name>
  <what-built>
    - v4→v5 additive migration (Entity.returnStatusByFy + wizardState)
    - useSettings hook (localStorage 'aussieledger:settings') + Settings page
    - useAnomalyCounts hook + Sidebar count badges
    - LabelTooltip wired into all 5 tax-return components; helpText on every label in all 6 catalogues
    - YearEndWizard (7 steps) + finalise/unfinalise lifecycle + LOCK_FY/UNLOCK_FY audit
    - JournalForm finalised-FY guard + banner
    - Inline AnomalyBadge on JournalForm + TrialBalance + CoaTreeView
    - Mobile-responsive JournalForm + TrialBalance + return preview at 375px
    - AiGateNote in ImportTB
    - Persona-mode-aware Sidebar + ViewRouter mode-gated landing
    - PersonaModeModal first-run gate
    - MasterDashboard agent-mode FY26 status badges + recent-clients quick-switch
    - LICENSE (Apache 2.0) + CONTRIBUTING.md + README rewrite
    - SPDX headers lint + package.json license field
    - @radix-ui/react-tooltip dependency
  </what-built>

  <how-to-verify>
    Run `npm run dev` in a fresh terminal. Visit http://localhost:3000 in Chrome or Firefox. Open DevTools first; clear site data once to force a first-run state (Application → Storage → Clear site data).

    **Step 1 — First-run mode prompt (UX-05).**
    1. Reload http://localhost:3000.
    2. EXPECT: PersonaModeModal appears with "Welcome to AussieLedger" + two buttons (owner / agent).
    3. Click "Manage my own business" (or whichever the owner button is).
    4. EXPECT: Modal closes; app lands somewhere (it's fine if no entity exists yet — Sidebar should show owner-mode items).
    5. RECORD: PASS / FAIL.

    **Step 2 — Owner mode no-entity flow.**
    1. With no entities, navigate to Sidebar → "Master Dashboard" item. EXPECT it does NOT exist in owner mode (PERS-01).
    2. Create one entity: Sidebar → Settings → return to a "+ Add entity" CTA (or use the existing EntityForm route). Create entity "Acme Pty Ltd" (Company), ABN any 11-digit, GST registered.
    3. Save. EXPECT: app routes to Entity Dashboard for Acme Pty Ltd automatically (PERS-01 auto-select).
    4. RECORD: PASS / FAIL.

    **Step 3 — Year-end CTA one click away (PERS-01).**
    1. On the Entity Dashboard, find a "Start Year-End" or "Year-End" CTA visible without scrolling.
    2. Click it. EXPECT: YearEndWizard opens at Step 1.
    3. RECORD: PASS / FAIL.

    **Step 4 — Inline anomaly on JournalForm (UX-02).**
    1. From Sidebar → "Journal Entries" → "+ New Journal".
    2. Add a line: account "Sales" (or any revenue), debit $100, credit $0.
    3. Add a second line: account "Cash", debit $0, credit $50.
    4. EXPECT: Yellow inline AnomalyBadge appears showing "Out of balance: debits 100.00 ≠ credits 50.00" (or similar).
    5. Make balanced ($100 / $100). EXPECT: Badge disappears.
    6. RECORD: PASS / FAIL.

    **Step 5 — Sidebar count badges (UX-02).**
    1. Post an unbalanced journal entry (force by editing storage if needed, OR post a balanced one then directly modify via journals search → edit one line to make unbalanced).
    2. Navigate away from Journals.
    3. EXPECT: "Journal Entries" Sidebar item shows a red "1" badge.
    4. RECORD: PASS / FAIL.

    **Step 6 — ATO label tooltip + print rendering (UX-03).**
    1. Navigate to Tax Assistant (Form I) for the entity.
    2. Find label "P1" or any labelled field. EXPECT: a "?" icon next to it.
    3. Hover the "?". EXPECT: tooltip appears with 1–3 sentences explaining what the label captures and where the data comes from. EXPECT: text does NOT mention "deductible" or "write off".
    4. Click "Print working paper". In the print preview, EXPECT: the same help text renders inline under the label (no tooltip — it's expanded). Cancel print.
    5. Repeat the hover check for one label each on Form C, Form T, Form P, and BAS — confirm tooltips present.
    6. RECORD: PASS / FAIL.

    **Step 7 — Wizard finalise gate (UX-01 + success criterion #2).**
    1. Navigate to Year-End wizard for Acme Pty Ltd.
    2. Step through 1 → 2 → 3 → 4 (Unmapped accounts). If any unmapped accounts referenced in posted entries, EXPECT: list of them shown.
    3. Continue stepping (the wizard allows stepping past 4 freely). At Step 6 (Attestation), check the box and type the wrong entity name. EXPECT: Finalise button disabled.
    4. Type the correct entity name (case-insensitive). EXPECT: Finalise button still disabled IF there are unmapped accounts.
    5. Resolve any unmapped accounts via "Map this account" inline action. Return to Step 6, recheck, retype.
    6. EXPECT: Finalise button NOW enabled.
    7. Click Finalise. EXPECT: status changes; entity now shows FY2026 = finalised on the dashboard.
    8. Check audit log (Sidebar → System Audit). EXPECT: an entry with action LOCK_FY for Acme Pty Ltd.
    9. RECORD: PASS / FAIL.

    **Step 8 — Post-finalise journal edit guard (UX-01).**
    1. Try to edit a posted journal entry whose date is in FY2026.
    2. EXPECT: JournalForm shows the "FY is finalised — use Reverse and Re-post" banner.
    3. EXPECT: Save button disabled.
    4. EXPECT: Reverse button (where applicable) still works — click it, confirm a reversal entry is created in the audit log.
    5. RECORD: PASS / FAIL.

    **Step 9 — Unfinalise (UX-01).**
    1. On entity dashboard or wizard, find "Unfinalise FY2026" affordance.
    2. Type the entity name to confirm. Click Unfinalise.
    3. EXPECT: status changes back to draft; audit log shows UNLOCK_FY.
    4. RECORD: PASS / FAIL.

    **Step 10 — Persona mode switch round-trip (UX-05 + PERS-02 + PERS-03).**
    1. Go to Sidebar → Settings. Switch from owner to agent.
    2. EXPECT: Sidebar reshuffles; "Clients" / "Master Dashboard" now visible. Top-level "Year-End" hidden.
    3. Navigate to the Clients view. EXPECT: Acme Pty Ltd card shows an FY26 status badge ("FY26: finalised" if you didn't unfinalise; otherwise "FY26: step N/7" or "FY26: not started" etc.).
    4. EXPECT: a "Recent clients" section is visible.
    5. Switch back to owner. EXPECT: all entity / journal / audit data still intact (no data lost).
    6. RECORD: PASS / FAIL.

    **Step 11 — Mobile responsive at 375px (UX-04).**
    1. Open DevTools → device toolbar → 375px wide (iPhone SE).
    2. Navigate to Sidebar → Journal Entries → New Journal. EXPECT: each line's debit/credit fields stack vertically (no horizontal scroll on body).
    3. Navigate to Trial Balance. EXPECT: table is scrollable horizontally inside its container, body has no horizontal scroll.
    4. Navigate to Tax Assistant (Form I). EXPECT: no horizontal scroll on body; "Print working paper" button is full width.
    5. RECORD: PASS / FAIL.

    **Step 12 — Clone-and-run check (DEP-01 + DEP-03).**
    1. In a fresh directory: `git clone <local repo>` (or `cp -r` into /tmp/test-clone).
    2. `cd /tmp/test-clone && npm install && npm run build`. EXPECT: EXIT 0.
    3. `npm run dev`. Visit http://localhost:3000. EXPECT: app loads.
    4. Post one balanced journal entry. EXPECT: works without errors. EXPECT: NO Gemini API key configured anywhere.
    5. Navigate to Import TB. EXPECT: AiGateNote visible saying "AI suggestions disabled — add a Gemini API key to .env.local to enable (optional)."
    6. Inspect README.md in the clone. EXPECT: clearly documents both single-user local and small-firm VPS deployment shapes.
    7. Inspect LICENSE in the clone. EXPECT: Apache License Version 2.0 full text.
    8. Inspect CONTRIBUTING.md in the clone. EXPECT: contains the "Schema Migrations" section with the additive + round-trip rule.
    9. RECORD: PASS / FAIL.

    **After completing all 12 steps:**
    - Update 06-UAT.md with each step's PASS/FAIL + timestamp + any notes.
    - If all 12 PASS, add a final line: `**UAT APPROVED YYYY-MM-DDTHH:MMZ**`.
    - If any FAIL, document the failure with screenshot/log + return control to orchestrator without the APPROVED line.
  </how-to-verify>

  <resume-signal>Type "approved" if all 12 steps pass. If any fail, describe the failure step + observed behaviour.</resume-signal>
</task>

<task type="auto">
  <name>Task 3: Close phase — STATE + ROADMAP + REQUIREMENTS updates</name>
  <files>
    .planning/STATE.md,
    .planning/ROADMAP.md,
    .planning/REQUIREMENTS.md
  </files>

  <read_first>
    - .planning/phases/06-personas-wizard-and-deployment/06-UAT.md (created by Task 2 — must contain "UAT APPROVED" line; if not, this task MUST NOT proceed)
    - .planning/STATE.md (existing structure — update current_phase, completed_phases, Phase Summary table, Performance Metrics row for Phase 6)
    - .planning/ROADMAP.md (Phase 6 section — mark [x], add the 4 plan entries with [x], record completion date)
    - .planning/REQUIREMENTS.md (Traceability table — mark UX-01..05, PERS-01..03, DEP-01,03,04 as Delivered with date + plan ID)
  </read_first>

  <action>
    Step 1 — Re-read 06-UAT.md. Confirm it contains the exact string `UAT APPROVED`. If absent, STOP and emit error.

    Step 2 — Update `.planning/STATE.md`:
    - frontmatter: `current_phase: "Phase 6 — Personas, Wizard, and Deployment (COMPLETE)"`; `completed_phases: 6`; bump `completed_plans` from 19 to 23.
    - "Current Position" section: change "Phase 6 not yet started" prose to a Phase 6 completion paragraph similar to Phase 5's (in `**Phase status:**` style): list Wave 0 (06-1) + Wave 2 (06-2 + 06-3) + Wave 3 (06-4) deliverables + final test count + UAT result.
    - "Phase Summary" table — flip Phase 6 status to COMPLETE with completion date.
    - "Performance Metrics" table — add rows 06-1 / 06-2 / 06-3 / 06-4 with task counts + files changed + GREEN count after each plan.
    - Update progress bar `[Phase 6] [ DONE ]`.
    - Add "Key Decisions Made" rows for Phase 6: e.g. "Settings via localStorage, not StorageAdapter widening (StorageAdapter FINAL invariant preserved per Phase 3)"; "Radix tooltip without asChild on Content (React 19 compat)"; "helpText never states deductibility (TPB compliance)".

    Step 3 — Update `.planning/ROADMAP.md`:
    - Phase 6 list-item: change `- [ ]` to `- [x]` and append `(completed YYYY-MM-DD; 11/11 requirements; X SPA + 18 server GREEN; UAT all 12 steps PASS)`.
    - Phase 6 Plans subsection: change `**Plans:** TBD` to `**Plans:** 4 plans (Wave 1 + 2 + 2 + 3) — planned 2026-05-29` and add the 4 entries marked `[x]` with brief descriptions.
    - Progress table: Phase 6 row → "4/4 Complete" + date.

    Step 4 — Update `.planning/REQUIREMENTS.md`:
    - Flip checkboxes for UX-01 / UX-02 / UX-03 / UX-04 / UX-05 / PERS-01 / PERS-02 / PERS-03 / DEP-01 / DEP-03 / DEP-04 from `[ ]` to `[x]`.
    - Traceability table at the bottom: update each row Status from "Pending" to "Delivered (Phase 6 Plan 06-X 2026-MM-DD; brief)".

    Step 5 — Final commit message: `docs(06): close Phase 6 — UAT APPROVED — 11/11 requirements delivered`.
  </action>

  <verify>
    <automated>node ".claude/get-shit-done/bin/gsd-tools.cjs" frontmatter validate ".planning/STATE.md" --schema state 2>&1 | head -20</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "UAT APPROVED" .planning/phases/06-personas-wizard-and-deployment/06-UAT.md` returns a match
    - `grep -nE "completed_phases:\\s*6" .planning/STATE.md` returns a match
    - `grep -n "Phase 6.*COMPLETE" .planning/STATE.md` returns ≥ 1 match
    - `grep -nE "^- \\[x\\] \\*\\*Phase 6:" .planning/ROADMAP.md` returns a match
    - `grep -nE "\\[x\\] \\*\\*UX-01\\*\\*\\|^- \\[x\\] \\*\\*UX-01\\*\\*" .planning/REQUIREMENTS.md` returns a match
    - Same `[x]` flip for UX-02, UX-03, UX-04, UX-05, PERS-01, PERS-02, PERS-03, DEP-01, DEP-03, DEP-04 (11 total)
    - `grep -n "Phase 6 | 4/4" .planning/ROADMAP.md` returns a match (Progress Table updated)
  </acceptance_criteria>

  <done>Phase 6 closed. STATE + ROADMAP + REQUIREMENTS updated. All 11 Phase 6 requirements marked Delivered. v1 milestone (Phases 1-6) complete.</done>
</task>

</tasks>

<verification>
- 06-UAT.md exists with all 12 steps marked PASS + "UAT APPROVED" line
- All 5 ROADMAP Phase 6 success criteria observably TRUE in the running app
- STATE / ROADMAP / REQUIREMENTS updated; 70/70 v1 requirements complete
- No regressions introduced (full suite + lint + build all EXIT 0)
</verification>

<success_criteria>
- 06-UAT.md created and signed
- STATE.md, ROADMAP.md, REQUIREMENTS.md updated to reflect Phase 6 completion
- All 11 Phase 6 requirements traced to delivered status
- Phase 6 closed; project at v1.0 milestone completion
</success_criteria>

<output>
After completion, create `.planning/phases/06-personas-wizard-and-deployment/06-4-SUMMARY.md` recording:
- Final test count (SPA + server)
- UAT step-by-step results
- Build / lint command outputs
- Any deferred items observed during UAT that should land in v2 RETROSPECTIVE
- Final v1 milestone closure summary: 6 phases, 23 plans, 70 requirements delivered
</output>
