---
phase: 16-docs-polish
type: uat
status: pending-signoff
created: 2026-06-03
requirements: [POL-DOCS-02]
deferred: [POL-DOCS-01]
approver: user
---

# Phase 16 — Manual UAT Walkthrough

**Purpose:** Validate POL-DOCS-02 (persona-segmented README) end-to-end on the public GitHub surface. Plan 16-1 shipped the README restructure + 3 new readme.test.ts assertions; this walkthrough signs off the user-facing presentation.

POL-DOCS-01 (real `/demo` screenshot) is DEFERRED to v1.4 — see "Deferred" section below.

---

## Pre-UAT Automated Verification

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Full SPA suite | `npx vitest run` | 1206+ GREEN / 0 RED / 11 todo | _to be filled at UAT time_ |
| README focused tests | `npx vitest run src/__tests__/readme.test.ts` | 17 GREEN (7 FND-12 + 7 POL-04 + 3 POL-DOCS-02 persona) | _to be filled_ |
| Server suite | `npm run test:server` | 18 GREEN | _to be filled_ |
| Lint | `npm run lint` | EXIT 0 | _to be filled_ |
| Build (incl. AIza scan) | `npm run build` | EXIT 0 + `scan-aiza: OK` | _to be filled_ |
| README line count floor | `wc -l README.md` | ≥ 100 (current 118) | _to be filled_ |
| FND-12 byte-identical phrases | `grep -c "StorageAdapter\|owner mode\|agent mode\|Apache 2.0\|Single-user local\|Small-firm VPS\|npm install && npm run build" README.md` | ≥ 7 (current 11) | _to be filled_ |

**Baseline reference:** Post-Plan-16-1 is 1206 SPA GREEN + 17 readme.test.ts GREEN + 118 README lines.

---

## UAT Scenarios

### Scenario 1 — POL-DOCS-02: Persona-segmented README on GitHub

**Goal:** Visiting the public README at `github.com/tech-taitan/AussieLedger` shows the new persona-segmented `## What This Is` section rendered correctly with the 3 audience-priority subsections + the new `### For developers` architecture-at-a-glance bullets + a working CONTRIBUTING.md link.

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1.1 | Open `https://github.com/tech-taitan/AussieLedger` in a desktop browser (incognito OK; same as Phase 15 Scenario 1). | Repository landing page loads with README rendered in the right-hand panel. | _PASS / FAIL_ |
| 1.2 | Scroll down to the `## What This Is` H2 section. Confirm the H2 heading text reads exactly `What This Is`. | H2 visible as a rendered heading (not bold text). | _PASS / FAIL_ |
| 1.3 | Confirm the **1-line bridge sentence** appears under the H2 (before the first H3): "AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits." | Bridge sentence renders as a paragraph between H2 and the first H3. | _PASS / FAIL_ |
| 1.4 | Confirm 3 `### h3` subsections appear in this **exact order**: (1) `For business owners` → (2) `For tax agents` → (3) `For developers`. | All 3 H3 headings present + correctly ordered (business → agents → developers per audience priority). | _PASS / FAIL_ |
| 1.5 | In the **For business owners** body, confirm the phrase "plain English" AND the phrase "walk away with" are both present (FND-12-style copy locks). | Both phrases visible in the body paragraph. | _PASS / FAIL_ |
| 1.6 | In the **For tax agents** body, confirm the phrases "multi-client" + "fast entity switching" + the new bridge sentence "Owner mode and agent mode share the same engine — switch modes in Settings." are all present. | All 3 strings visible. | _PASS / FAIL_ |
| 1.7 | In the **For developers** body, confirm the lead-in `Architecture-at-a-glance for contributors:` then a 6-bullet list covering: (1) **StorageAdapter** FINAL + 12 methods + duck-typing + LocalAdapter+ServerAdapter "Same SPA, two backends"; (2) **Tax engine** pure functions in `src/lib/tax/` + `decimal.js`; (3) **Print working papers** via `window.print()` + `@media print` CSS + no PDF library; (4) **Demo isolation** via `aussieledger-demo` IDB namespace gated on `/demo` pathname; (5) **Stack:** React 19 + Vite 6 + TS 5.8 + idb + Express + better-sqlite3 + PWA via vite-plugin-pwa; (6) **License:** Apache 2.0 + `[CONTRIBUTING.md](./CONTRIBUTING.md)` CTA verbatim. | All 6 bullets present + correctly ordered + no code snippets. | _PASS / FAIL_ |
| 1.8 | Click the **`CONTRIBUTING.md`** link inside the License bullet. | GitHub navigates to the CONTRIBUTING.md file in the same repo (loads cleanly, not 404). | _PASS / FAIL_ |
| 1.9 | Return to the README. Confirm the FND-12 byte-identical-locked phrases are still present elsewhere in the README (existing readme.test.ts test coverage; phrases live OUTSIDE `## What This Is` in their original Quick Start / How It Works / License locations): `npm install && npm run build` + `Single-user local` + `Small-firm VPS` + `StorageAdapter` (now also in developers bullet) + `owner mode` (now also in tax-agents bridge) + `agent mode` (now also in tax-agents bridge) + `Apache 2.0` (now also in developers License bullet). | All 7 lock phrases visible at their original locations + new locations in developers section. | _PASS / FAIL_ |
| 1.10 | (Visual sanity) Confirm the README still reads well top-to-bottom — top-of-fold elevator pitch + live demo link + `> _Screenshot coming v1.3._` placeholder (still there per POL-DOCS-01 deferral) + the new persona-segmented `## What This Is` + the rest of the doc unchanged. | README structure intact; no orphan headings; no broken links. | _PASS / FAIL_ |

**Closes:** POL-DOCS-02.

---

### Scenario 2 — POL-DOCS-02 test-coverage spot-check

**Goal:** Confirm the 3 new readme.test.ts persona assertions GREEN + 14 existing assertions still GREEN.

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.1 | Run `npx vitest run src/__tests__/readme.test.ts` from the repo root. | 17 tests GREEN (7 FND-12 byte-identical locks + 7 POL-04 content-presence + 3 new POL-DOCS-02 persona assertions Test A.5–A.7). | _PASS / FAIL_ |
| 2.2 | Visually confirm the 3 new test names in the runner output: `Test A.5 README has ### For business owners persona section (POL-DOCS-02)`, `Test A.6 README has ### For tax agents persona section (POL-DOCS-02)`, `Test A.7 README has ### For developers persona section (POL-DOCS-02)`. | All 3 named tests present + GREEN. | _PASS / FAIL_ |

**Closes:** POL-DOCS-02 test-coverage signoff.

---

## Deferred

### POL-DOCS-01 — Real `/demo` README screenshot

**Status:** DEFERRED to v1.4.

**Reason:** User replied `skip-screenshot` at the Plan 16-1 Task 1 `checkpoint:human-action` gate on 2026-06-03. The live `/demo` MasterDashboard rendered empty due to PWA stale-cache (diagnosed post-skip; not a `seedDemoData()` regression). User pivoted to defer in-milestone, then re-pivoted again to skip the followup capture entirely; PWA stale-cache hardening is a separate v1.4 investigation. The `> _Screenshot coming v1.3._` placeholder STAYS at README.md line 7 for v1.4 closure.

**v1.4 reactivation references:**
- Plan 16-1 Task 1 full capture brief preserved verbatim at `.planning/phases/16-docs-polish/16-1-PLAN.md` Task 1 STEP 1 (7-step Chrome DevTools capture flow + optional pngquant + `docs/screenshot.png` save path)
- PWA stale-cache investigation todo at `.planning/todos/pending/2026-06-03-demo-route-shows-no-seeded-data.md`
- 2 readme.test.ts assertions also deferred (screenshot path ref + placeholder-removed) — both will be added alongside the v1.4 screenshot capture

**Out of UAT scope:** No POL-DOCS-01 walkthrough steps in this document. v1.4 will own that walkthrough.

---

## Per-Requirement Sign-Off

| Requirement | Description | Result | Evidence |
|-------------|-------------|--------|----------|
| POL-DOCS-02 | README `## What This Is` restructured with 1-line bridge + 3 `### h3` persona subsections (business owners → tax agents → developers) including NEW developers section + verbatim CONTRIBUTING.md CTA + 3 new readme.test.ts persona assertions | _PASS / FAIL_ | Scenario 1 steps 1.1–1.10 + Scenario 2 steps 2.1–2.2 |
| ~~POL-DOCS-01~~ | ~~Real `/demo` MasterDashboard screenshot replacing `> _Screenshot coming v1.3._` placeholder~~ | DEFERRED → v1.4 | User skip-screenshot decision 2026-06-03 + PWA stale-cache investigation todo |

---

## UAT Sign-Off

Phase 16 active requirement (POL-DOCS-02) walkthrough complete. POL-DOCS-01 deferred to v1.4 per user skip-screenshot decision.

**Total steps:** 12 (Scenario 1: 10 + Scenario 2: 2).

Signed off: _YYYY-MM-DD_ by user (reply `approved` inline below to close out).

**Approval:**
- **Approved by:** _name_
- **Approval date:** _date_
- **All scenarios:** _PASS / FAIL summary_

After signoff, Phase 16 is fully verified; combined with Phase 15 UAT signoff (`.planning/phases/15-code-polish/15-UAT.md`), v1.3 milestone is ready for `/gsd:audit-milestone v1.3`. 6 of 7 active requirements closed end-to-end (POL-CODE-01..05 + POL-DOCS-02); POL-DOCS-01 deferred to v1.4 with explicit user decision attached.
