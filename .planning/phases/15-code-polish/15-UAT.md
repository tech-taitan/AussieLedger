---
phase: 15-code-polish
type: uat
status: pending-signoff
created: 2026-06-03
requirements: [POL-CODE-01, POL-CODE-02, POL-CODE-03, POL-CODE-04, POL-CODE-05]
approver: user
---

# Phase 15 — Manual UAT Walkthrough

**Purpose:** Validate the 5 active POL-CODE requirements end-to-end in the running app + on the public GitHub surface. Plans 15-1 + 15-2 shipped the code + automated tests; this walkthrough signs off the user experience.

POL-CODE-06 (PWA install desktop CTA) was deferred at v1.3 discuss-time on 2026-06-02; not in UAT scope.

---

## Pre-UAT Automated Verification

| Check | Command | Expected | Actual |
|-------|---------|----------|--------|
| Full SPA suite | `npx vitest run` | 1206+ GREEN / 0 RED / 11 todo | _to be filled at UAT time_ |
| Server suite | `npm run test:server` | 18 GREEN / 0 RED | _to be filled_ |
| Lint | `npm run lint` | EXIT 0 | _to be filled_ |
| Build (incl. AIza scan) | `npm run build` | EXIT 0 + `scan-aiza: OK` | _to be filled_ |

**Baseline reference:** Post-Plan-15-2 was 1203 SPA GREEN; Post-Plan-16-1 is 1206 SPA GREEN. Running the suite at UAT time should match or exceed these counts.

---

## UAT Scenarios

### Scenario 1 — POL-CODE-01: GitHub repo public

**Goal:** v1.2-audit-RED #1 closed — anonymous visitor can reach the repo and verify the Apache 2.0 license.

| # | Step | Expected | Result |
|---|------|----------|--------|
| 1.1 | Open a **private / incognito browser window** (so no GitHub session cookie applies). | New incognito tab. | _PASS / FAIL_ |
| 1.2 | Navigate to `https://github.com/tech-taitan/AussieLedger`. | Repository landing page loads — NOT a 404 "This page is unavailable" screen. README rendered in the right-hand panel. | _PASS / FAIL_ |
| 1.3 | Confirm the **"Apache-2.0 license"** label is visible in the right sidebar (under "About"). | Apache 2.0 license badge visible; clicking it shows the LICENSE file. | _PASS / FAIL_ |
| 1.4 | In the rendered README, click the **`https://github.com/tech-taitan/AussieLedger`** link in the Privacy section (line ~91 of the README). | Same-page anchor or no-op (link resolves; not broken). | _PASS / FAIL_ |
| 1.5 | (Bonus) From the same incognito window, visit `https://aussieledger.techtaitan.com/privacy`. Confirm the **"full source"** link near the bottom (the PrivacyPage "trust signals" list) resolves to the same public repo URL — not a 404. | Privacy page loads; clicking the GitHub link opens the public repo. | _PASS / FAIL_ |

**Closes:** POL-CODE-01 + v1.2 audit RED #1 (private-repo broken anonymous README link).

---

### Scenario 2 — POL-CODE-02: legacy-migration demo-DB guard

**Goal:** v1.2-audit-AMBER #2 closed — visiting `/demo` does NOT migrate legacy localStorage data into the demo IDB.

This is an architecture-level guard; the manual surface is invisible by design. Coverage is via the unit test file at `src/storage/__tests__/legacy-migration-demo-guard.test.ts` (2 tests GREEN).

| # | Step | Expected | Result |
|---|------|----------|--------|
| 2.1 | Run `npx vitest run src/storage/__tests__/legacy-migration-demo-guard.test.ts` from the repo root. | 2 tests GREEN: (1) demo-skips-migration — demo DB stays empty + 4 legacy keys preserved; (2) prod-still-migrates regression guard — entity lands in prod DB + 4 legacy keys cleared. | _PASS / FAIL_ |
| 2.2 | Visually inspect the guard at `src/storage/legacy-migration.ts` (TOP of `migrateLegacyLocalStorage(adapter)`). Confirm the 2-line early-return guard reads `adapter.getDbName() === DB_NAME_DEMO`. | Guard present at the top of the function, BEFORE the existing `typeof localStorage === 'undefined'` check. | _PASS / FAIL_ |

**Closes:** POL-CODE-02 + v1.2 audit AMBER #2 (legacy-migration coupling to /demo).

---

### Scenario 3 — POL-CODE-03: Sidebar badge `<button>`-in-`<button>` refactor

**Goal:** React's nested-interactive-elements console warning silenced; anomaly badge is keyboard-accessible via Enter + Space.

| # | Step | Expected | Result |
|---|------|----------|--------|
| 3.1 | Open `https://aussieledger.techtaitan.com` (production deploy) in a desktop browser. Open DevTools → Console tab. Hard-reload the page (Ctrl+Shift+R / Cmd+Shift+R). | App loads; **NO React warning** in the console about nested `<button>` elements or "validateDOMNesting". | _PASS / FAIL_ |
| 3.2 | If no entity has anomalies yet: create or open an Individual entity, then post an unbalanced journal entry (debit ≠ credit) so the Sidebar Journals badge shows a count. | Sidebar "Journal Entries" nav row shows a red badge with the anomaly count. | _PASS / FAIL_ |
| 3.3 | Use **Tab** to move keyboard focus through the page until the Sidebar Journals badge receives focus (a visible focus ring appears around the red badge). | Badge is reachable via Tab (it has `tabIndex={0}`). Focus ring visible. | _PASS / FAIL_ |
| 3.4 | With the badge focused, press **Enter**. | App navigates to Journals view AND scrolls to the first unbalanced entry (UX-06 anomaly cycle). | _PASS / FAIL_ |
| 3.5 | Return to Master Dashboard. Tab back to the badge. Press **Space**. | Same navigation behaviour as Enter — does NOT scroll the document (e.preventDefault() on Space is in place). | _PASS / FAIL_ |
| 3.6 | (Visual regression check) Confirm the badge LOOKS identical to v1.2 — red pill, white text, top-right anchored, cursor-pointer on hover. | Visual byte-identical to v1.2 (only added: `cursor-pointer` Tailwind class). | _PASS / FAIL_ |

**Closes:** POL-CODE-03 + v1.2 audit AMBER #3 (React nested-interactive console warning).

---

### Scenario 4 — POL-CODE-04: entity-aware tax-section nav

**Goal:** Sidebar tax-section nav entries filter by `activeEntity.type`. BAS/IAS stays universal. 5 sub-cases.

| # | Step | Expected | Result |
|---|------|----------|--------|
| 4.1 | At `https://aussieledger.techtaitan.com`, create or select an **Individual** entity (or use the demo's SoleTrader at `/demo`). | Sidebar entity-scoped block shows: Entity Dashboard, Journal Entries, Trial Balance, Accounts, Import TB, **Tax Assistant** (Form I), **BAS & IAS**. Company Tax + Trust Tax NOT shown. | _PASS / FAIL_ |
| 4.2 | Create or select a **Company** entity (type: Company). | Sidebar shows: Entity Dashboard + standard nav + **Company Tax** (Form C) + **BAS & IAS**. Tax Assistant + Trust Tax NOT shown. | _PASS / FAIL_ |
| 4.3 | Create or select a **Trust** entity (type: Trust). | Sidebar shows: Entity Dashboard + standard nav + **Trust Tax** (Form T) + **BAS & IAS**. Tax Assistant + Company Tax NOT shown. | _PASS / FAIL_ |
| 4.4 | Create or select a **Partnership** entity (type: Partnership). | Sidebar shows: Entity Dashboard + standard nav + **BAS & IAS** only. NONE of Tax Assistant / Company Tax / Trust Tax shown (Partnership has no Form P view today; BAS still universal). | _PASS / FAIL_ |
| 4.5 | Return to Master Dashboard (deselect any active entity). | Sidebar entity-scoped block is HIDDEN entirely. NONE of the 4 tax-section entries shown (existing Phase 6 behaviour preserved). | _PASS / FAIL_ |
| 4.6 | (Demo regression) Visit `/demo` and confirm the seeded SoleTrader entity surfaces **Tax Assistant** + **BAS & IAS** only (matches Individual mapping — `SoleTrader = Individual` for Form-I purposes per CONTEXT lock). NOTE: If demo shows empty data, hard-reload to bypass PWA stale cache. | Tax Assistant visible (Form I path); Company Tax + Trust Tax hidden. | _PASS / FAIL_ |

**Closes:** POL-CODE-04.

---

### Scenario 5 — POL-CODE-05: Settings Active Entity section

**Goal:** Settings gains a 4th "Active Entity" section between Primary Entity and First-Run Prompt with name + Edit Entity Details button; entity-absent branch shows an empty-state prompt. ViewRouter:179 header button stays UNCHANGED (duplicate access point, not move).

| # | Step | Expected | Result |
|---|------|----------|--------|
| 5.1 | At `https://aussieledger.techtaitan.com`, with an active entity selected, click **Settings** in the Sidebar. | Settings page loads. Confirm the section order top-to-bottom: Mode → Primary Entity → **Active Entity** (new) → First-Run Prompt → Clear Settings. | _PASS / FAIL_ |
| 5.2 | Inside the Active Entity section, confirm the entity name renders + a small chip showing `(Type)` in `text-xs text-gray-400` styling + an **Edit Entity Details** button (blue link-style). | Entity name + `(type)` chip + "Edit Entity Details" button all visible. | _PASS / FAIL_ |
| 5.3 | Click the **Edit Entity Details** button in the Active Entity section. | App navigates to EntityForm for the active entity (same view that ViewRouter:179 header button opens). | _PASS / FAIL_ |
| 5.4 | Return to Settings. Note that the **header "Edit Entity Details"** button (top-right of the EntityForm view's parent shell, ViewRouter:179) is STILL PRESENT — both buttons coexist as duplicate access points per CONTEXT lock. | Header button preserved; Settings section button is a DUPLICATE, not a move. | _PASS / FAIL_ |
| 5.5 | Return to Master Dashboard. Deselect the active entity (so no entity is active). Click **Settings**. | Active Entity section STILL renders (always-on). Body shows empty-state: **"No active entity selected"** + hint **"Select an entity from the Master Dashboard to edit"**. NO Edit Entity Details button. | _PASS / FAIL_ |
| 5.6 | (Test seam check) Run `npx vitest run src/components/__tests__/Settings.test.tsx` from the repo root. | 7 Settings tests GREEN: 4 pre-existing (SET.1–4) + 3 new (SET.5 entity-present renders + SET.6 empty-state renders + SET.7 button click invokes callback). | _PASS / FAIL_ |

**Closes:** POL-CODE-05.

---

## Per-Requirement Sign-Off

| Requirement | Description | Result | Evidence |
|-------------|-------------|--------|----------|
| POL-CODE-01 | GitHub repo public + Apache 2.0 license visible to anonymous | _PASS / FAIL_ | Scenario 1 steps 1.1–1.5 |
| POL-CODE-02 | legacy-migration demo-DB guard (architecture invariant) | _PASS / FAIL_ | Scenario 2 steps 2.1–2.2 (unit-test-covered; manual surface invisible) |
| POL-CODE-03 | Sidebar badge `<span role="button">` with Enter+Space keyboard handler; no nested-interactive console warning | _PASS / FAIL_ | Scenario 3 steps 3.1–3.6 |
| POL-CODE-04 | Sidebar tax-nav entries filter by activeEntity.type; BAS/IAS universal | _PASS / FAIL_ | Scenario 4 steps 4.1–4.6 (all 5 entity-type sub-cases + demo regression) |
| POL-CODE-05 | Settings 4th "Active Entity" section + ViewRouter:179 header button preserved | _PASS / FAIL_ | Scenario 5 steps 5.1–5.6 |
| ~~POL-CODE-06~~ | ~~PWA install desktop CTA~~ | DEFERRED (out of UAT scope) | Discuss-time decision 2026-06-02 |

---

## UAT Sign-Off

All 5 active Phase 15 requirements (POL-CODE-01..05) walkthrough complete. POL-CODE-06 deferred per v1.3 discuss-time decision.

**Total steps:** 24 (1.1–1.5: 5 + 2.1–2.2: 2 + 3.1–3.6: 6 + 4.1–4.6: 6 + 5.1–5.6: 6 minus 1 double-count = 25 steps; signoff structure: 5 scenarios × ~5 steps each + 1 bonus = ~24-25 manual checks).

Signed off: _YYYY-MM-DD_ by user (reply `approved` inline below to close out).

**Approval:**
- **Approved by:** _name_
- **Approval date:** _date_
- **All scenarios:** _PASS / FAIL summary_

After signoff, Phase 15 is fully verified; v1.3 acceptance hinges on Phase 16 UAT signoff (`.planning/phases/16-docs-polish/16-UAT.md`).
