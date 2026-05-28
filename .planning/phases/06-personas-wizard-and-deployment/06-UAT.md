---
phase: "06-personas-wizard-and-deployment"
plan: 4
type: uat-log
status: pre-uat-complete
created: "2026-05-29T02:17:00Z"
---

# Phase 6 UAT Log

**Purpose:** Manual end-to-end verification of all 5 Phase 6 success criteria on a real browser with real fixture data. Signs off the v1 milestone.

**App under test:** AussieLedger @ http://localhost:3000 (`npm run dev`)
**Tester:** Human reviewer (orchestrated via GSD Phase 6 Plan 4)
**UAT date:** 2026-05-29

---

## Pre-UAT Automated Verification

Run at: 2026-05-28T16:15:47Z

| # | Command | Result | Detail |
|---|---------|--------|--------|
| 1 | `npm run lint` | **PASS** | EXIT 0 — tsc --noEmit + server tsc both clean |
| 2 | `npm test` | **PASS** | EXIT 0 — **763 GREEN**, 11 todo, **0 RED** (92 test files) |
| 3 | `npm run test:server` | **PASS** | EXIT 0 — **18 GREEN** (6 test files) |
| 4 | `npm run build` | **PASS** | EXIT 0 — 2842 modules, dist/index.html produced (pre-existing chunk-size warning only) |
| 5 | `npm run build:server` | **PASS** | EXIT 0 — server/dist/server/index.js produced |

All 5 automated pre-gates GREEN. Proceeding to manual UAT.

---

## Manual UAT — 12 Steps

**Prerequisite:** `npm run dev` running at http://localhost:3000. DevTools open. Site data cleared once (Application → Storage → Clear site data) to force first-run state.

---

### Step 1 — First-run mode prompt (UX-05)

| Field | Value |
|-------|-------|
| **Requirement** | UX-05 |
| **Action** | Reload http://localhost:3000 with cleared site data. Expect PersonaModeModal with "Welcome to AussieLedger" + owner/agent buttons. Click owner button. |
| **Expected** | Modal closes; app lands in owner mode with Sidebar showing owner-mode items. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 2 — Owner mode no-entity flow (PERS-01)

| Field | Value |
|-------|-------|
| **Requirement** | PERS-01 |
| **Action** | With no entities: confirm "Master Dashboard" does NOT appear in Sidebar. Create entity "Acme Pty Ltd" (Company, 11-digit ABN, GST registered). Save. |
| **Expected** | Master Dashboard absent in owner mode. After save, app routes to Entity Dashboard for Acme Pty Ltd automatically. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 3 — Year-end CTA one click away (PERS-01)

| Field | Value |
|-------|-------|
| **Requirement** | PERS-01 |
| **Action** | On the Entity Dashboard, find a "Start Year-End" or "Year-End" CTA visible without scrolling. Click it. |
| **Expected** | YearEndWizard opens at Step 1. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 4 — Inline anomaly on JournalForm (UX-02)

| Field | Value |
|-------|-------|
| **Requirement** | UX-02 |
| **Action** | Sidebar → "Journal Entries" → "+ New Journal". Add line: account "Sales", debit $100, credit $0. Add line: account "Cash", debit $0, credit $50. |
| **Expected** | Yellow inline AnomalyBadge appears showing out-of-balance message (debits 100.00 ≠ credits 50.00 or similar). Make balanced ($100/$100). Badge disappears. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 5 — Sidebar count badges (UX-02)

| Field | Value |
|-------|-------|
| **Requirement** | UX-02 |
| **Action** | Post an unbalanced journal entry (or force via storage edit). Navigate away from Journals. |
| **Expected** | "Journal Entries" Sidebar item shows a red "1" badge. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 6 — ATO label tooltip + print rendering (UX-03)

| Field | Value |
|-------|-------|
| **Requirement** | UX-03 |
| **Action** | Navigate to Tax Assistant (Form I). Find label "P1" or any labelled field. Hover "?" icon. Check tooltip text. Click "Print working paper" — verify help text renders inline in print preview. Repeat hover check on Form C, Form T, Form P, and BAS. |
| **Expected** | Tooltip appears with 1–3 sentences. Text does NOT mention "deductible" or "write off". In print preview, same help text renders inline (expanded, no tooltip). |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 7 — Wizard finalise gate (UX-01 + success criterion #2)

| Field | Value |
|-------|-------|
| **Requirement** | UX-01 |
| **Action** | Navigate to Year-End wizard. Step through 1→2→3→4 (unmapped accounts shown if any). At Step 6: check attestation box, type wrong entity name → Finalise disabled. Type correct name (case-insensitive) → Finalise still disabled IF unmapped accounts exist. Resolve unmapped accounts. Return to Step 6, recheck + retype. Finalise. Check audit log for LOCK_FY entry. |
| **Expected** | Finalise blocked until: attestation checkbox + correct name + zero unmapped accounts. After finalise: entity shows FY2026 = finalised. Audit log contains LOCK_FY action for Acme Pty Ltd. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 8 — Post-finalise journal edit guard (UX-01)

| Field | Value |
|-------|-------|
| **Requirement** | UX-01 |
| **Action** | Try to edit a posted journal entry whose date is in FY2026. Check for banner. Check Save disabled. Click Reverse (where applicable), confirm reversal entry created in audit log. |
| **Expected** | JournalForm shows "FY is finalised — use Reverse and Re-post" banner. Save button disabled. Reverse button still works. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 9 — Unfinalise (UX-01)

| Field | Value |
|-------|-------|
| **Requirement** | UX-01 |
| **Action** | On entity dashboard or wizard, find "Unfinalise FY2026" affordance. Click it to confirm. |
| **Expected** | Status changes back to draft. Audit log shows UNLOCK_FY. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 10 — Persona mode switch round-trip (UX-05 + PERS-02 + PERS-03)

| Field | Value |
|-------|-------|
| **Requirement** | UX-05, PERS-02, PERS-03 |
| **Action** | Sidebar → Settings. Switch from owner to agent. Check Sidebar. Navigate to Clients view. Check entity card for FY26 badge + recent-clients section. Switch back to owner. Verify all data intact. |
| **Expected** | Agent mode: "Clients"/"Master Dashboard" visible; "Year-End" hidden from top-level nav. FY26 badge visible on Acme Pty Ltd. Recent clients section visible. After switch back to owner: all entities/journals/audit logs still present (no data loss). |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 11 — Mobile responsive at 375px (UX-04)

| Field | Value |
|-------|-------|
| **Requirement** | UX-04 |
| **Action** | DevTools → device toolbar → 375px wide. Navigate to: (a) Journals → New Journal, (b) Trial Balance, (c) Tax Assistant (Form I). |
| **Expected** | (a) Debit/credit fields stack vertically, no horizontal scroll on body. (b) Table scrolls inside container, body has no horizontal scroll. (c) No horizontal scroll on body; "Print working paper" button is full width. |
| **Result** | ⬜ |
| **Notes** | |

---

### Step 12 — Clone-and-run check (DEP-01 + DEP-03)

| Field | Value |
|-------|-------|
| **Requirement** | DEP-01, DEP-03 |
| **Action** | In a fresh directory: `git clone <local repo>` (or `cp -r` to /tmp/test-clone). `npm install && npm run build` → expect EXIT 0. `npm run dev` → visit http://localhost:3000 → post one balanced journal entry. Navigate to Import TB — check AiGateNote message. Inspect README.md, LICENSE, CONTRIBUTING.md. |
| **Expected** | Build EXIT 0. App loads. Journal entry posts without error. No Gemini API key configured. AiGateNote: "AI suggestions disabled — add a Gemini API key to .env.local to enable (optional)" (or similar). README documents single-user local + small-firm VPS deployment shapes. LICENSE contains "Apache License Version 2.0". CONTRIBUTING.md contains "Schema Migrations" section with additive + round-trip rule. |
| **Result** | ⬜ |
| **Notes** | |

---

## UAT Summary

| Step | Requirement | Result |
|------|-------------|--------|
| 1 — First-run mode prompt | UX-05 | ⬜ |
| 2 — Owner no-entity flow | PERS-01 | ⬜ |
| 3 — Year-end CTA | PERS-01 | ⬜ |
| 4 — Inline anomaly JournalForm | UX-02 | ⬜ |
| 5 — Sidebar count badges | UX-02 | ⬜ |
| 6 — ATO label tooltip + print | UX-03 | ⬜ |
| 7 — Wizard finalise gate | UX-01 | ⬜ |
| 8 — Post-finalise edit guard | UX-01 | ⬜ |
| 9 — Unfinalise | UX-01 | ⬜ |
| 10 — Mode switch round-trip | UX-05 + PERS-02 + PERS-03 | ⬜ |
| 11 — Mobile 375px | UX-04 | ⬜ |
| 12 — Clone-and-run | DEP-01 + DEP-03 | ⬜ |

<!-- Tester: update each ⬜ to PASS or FAIL after completing the step. -->
<!-- If all 12 PASS, append: **UAT APPROVED YYYY-MM-DDTHH:MMZ** -->
<!-- If any FAIL: document the failure with observed behaviour; do NOT add the APPROVED line. -->
