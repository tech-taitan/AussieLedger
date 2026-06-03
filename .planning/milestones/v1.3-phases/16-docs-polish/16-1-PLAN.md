---
phase: 16-docs-polish
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - README.md
  - src/__tests__/readme.test.ts
  - docs/screenshot.png
autonomous: false
requirements:
  - POL-DOCS-01
  - POL-DOCS-02
must_haves:
  truths:
    - "README top-of-fold shows the real captured /demo MasterDashboard screenshot (no Screenshot coming v1.3 placeholder remains)"
    - "README 'What This Is' section is segmented into 3 persona subsections in audience-priority order: business owners → tax agents → developers"
    - "New 'For developers' subsection covers StorageAdapter FINAL + tax-engine pure functions + window.print() print-papers + tech stack + Apache 2.0 + CONTRIBUTING.md CTA"
    - "5 new readme.test.ts assertions GREEN (3 persona heading+phrase + 1 screenshot path ref + 1 placeholder-removed) on top of the 14 existing tests staying GREEN"
    - "1203 SPA baseline grows to ~1208 GREEN; lint EXIT 0; build EXIT 0; AIza scan EXIT 0"
  artifacts:
    - path: "docs/screenshot.png"
      provides: "Real /demo MasterDashboard with seeded sole-trader entity; PNG 1280px wide @2x DPR target ≤200KB after pngquant"
      contains: "Binary PNG file ≥10KB ≤1MB"
    - path: "README.md"
      provides: "Top-of-fold image tag + persona-segmented What This Is + 14+5 readme.test.ts assertions all GREEN"
      contains: "![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png), ### For business owners, ### For tax agents, ### For developers"
    - path: "src/__tests__/readme.test.ts"
      provides: "5 new POL-DOCS-02 assertions (3 persona + 1 screenshot ref + 1 placeholder-removed) plus 14 existing GREEN"
      contains: "/^### For business owners/, /^### For tax agents/, /^### For developers/, docs/screenshot.png, not Screenshot coming"
  key_links:
    - from: "README.md top-of-fold (line 7)"
      to: "docs/screenshot.png"
      via: "Markdown image tag"
      pattern: "!\\[AussieLedger MasterDashboard.*\\]\\(docs/screenshot\\.png\\)"
    - from: "README.md ## What This Is section"
      to: "Three ### h3 persona subsections in business→agents→developers order"
      via: "Markdown h3 headings"
      pattern: "### For business owners.*### For tax agents.*### For developers"
    - from: "README.md ### For developers section"
      to: "CONTRIBUTING.md"
      via: "Markdown relative link CTA"
      pattern: "\\[CONTRIBUTING\\.md\\]\\(\\./CONTRIBUTING\\.md\\)"
    - from: "src/__tests__/readme.test.ts new 5 assertions"
      to: "README.md image tag + 3 persona subsections + placeholder removal"
      via: "regex / substring assertions"
      pattern: "expect\\(content\\)\\.(toMatch|toContain|not\\.toMatch)"
---

<objective>
Close out the v1.3 milestone (and Phase 16 — the final phase) by tidying the two POL-04 items that were deferred from Phase 14: (1) replace the `> _Screenshot coming v1.3._` placeholder at README.md line 7 with a real PNG screenshot of the live `/demo` MasterDashboard, and (2) restructure the `## What This Is` section into 3 persona-segmented `### h3` subsections (business owners → tax agents → developers) with the new developers section covering architecture-at-a-glance.

Purpose: Make the README an inviting onboarding surface (real screenshot + audience-priority persona segmentation) so that v1.3 ships with a polished public-facing surface. Final v1.3 polish — after this plan lands, the milestone is releaseable.

Output: docs/ directory created with screenshot.png committed (binary), README.md restructured (~125-130 lines), src/__tests__/readme.test.ts extended with 5 new assertions; 14 existing readme.test.ts tests stay GREEN; total ~1208 SPA GREEN; lint + build + AIza scan all EXIT 0; no source-code changes; no new dependencies; no CSP / vercel.json / vite-config diff.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/16-docs-polish/16-CONTEXT.md
@.planning/milestones/v1.2-phases/14-release-polish/14-CONTEXT.md
@README.md
@src/__tests__/readme.test.ts
@CONTRIBUTING.md

<interfaces>
<!-- Key facts and existing content the executor needs. Extracted from repo at planning time. -->
<!-- Executor should use these directly — no codebase exploration needed. -->

## README.md current state (101 lines, post-Phase-14)

Top-of-fold lines 1-12:
```markdown
# AussieLedger

Free Australian bookkeeping → tax return tool. Your data stays in your browser.

**Try the live demo at https://aussieledger.techtaitan.com**

> _Screenshot coming v1.3._

AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).
Open source under Apache 2.0. No accounts, no hosted data server, no telemetry.

## What This Is
```

`## What This Is` block lines 12-16 (current 2-persona shape; light-refresh target):
```markdown
## What This Is

**For small-business owners** — take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

**For tax agents** — a no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes.
```

Line 18 onwards: `## Quick Start` (untouched by Phase 16).
Line 99 onwards: `Apache 2.0` license (untouched).
Line 95: `See [CONTRIBUTING.md](./CONTRIBUTING.md) ...` (already exists in Contributing section).

## src/__tests__/readme.test.ts current state (69 lines, 14 tests)

Lines 13-39: 7 FND-12 byte-identical lock tests (Phase 9 era):
- `'npm install && npm run build'`
- `'Single-user local'`
- `'Small-firm VPS'`
- `'StorageAdapter'`
- `'owner mode'`
- `'agent mode'`
- `'Apache 2.0'`

Lines 41-67: 7 POL-04 content-presence tests (Phase 14-3):
- `'https://aussieledger.techtaitan.com'`
- `'/demo'`
- `'/privacy'`
- `/^##\s+Privacy/m`
- `'pins the public build to browser-only IndexedDB storage'`
- `'Try the demo'`
- `content.split('\n').length >= 100`

All 14 must stay GREEN after Phase 16 modifications. The light copy refresh of the existing 2 personas MUST NOT touch the FND-12 byte-identical-locked phrases (`StorageAdapter`, `owner mode`, `agent mode`, `Apache 2.0`, `Single-user local`, `Small-firm VPS`, `npm install && npm run build`). All 7 of those FND-12 phrases live OUTSIDE the `## What This Is` section in the current README, so the persona restructure does NOT touch them — but verify.

## CONTRIBUTING.md (78 lines)
Already exists at repo root. New `### For developers` section CTA links to it via `./CONTRIBUTING.md` relative path. README line 95 already references it from the Contributing section — that reference stays unchanged.

## docs/ directory
Does NOT exist yet. Task 1 creates it as a side-effect of the user dropping docs/screenshot.png at the checkpoint.
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: POL-DOCS-01 — Capture real /demo screenshot + wire into README + 2 new test assertions</name>
  <files>docs/screenshot.png, README.md, src/__tests__/readme.test.ts</files>

  <what-built>Nothing yet — this is a setup-then-checkpoint task. The screenshot is a manual user-side capture step (Chrome DevTools "Capture full size screenshot" → save to docs/screenshot.png). Same pattern as Phase 10 CF-token checkpoint and Phase 15 GitHub-visibility-flip checkpoint. Executor pauses at this gate, presents the step-by-step to the user verbatim, waits for `captured` reply, verifies file exists + size sanity, then proceeds to the auto-wire steps in this same task.</what-built>

  <how-to-verify>
    **STEP 1 — CAPTURE (user-only manual step):**

    > Capture the README screenshot:
    > 1. Open Chrome at a **1280px window width**. Either:
    >    - resize the browser window manually to ~1280px wide (most direct), OR
    >    - open DevTools → toggle Device Toolbar (Ctrl+Shift+M) → set custom dimensions to `1280 × 800` with DPR `2.0`
    > 2. Navigate to `https://aussieledger.techtaitan.com/demo`
    > 3. Wait for the demo to fully load. Confirm visible state:
    >    - **DemoModeBanner** pinned at the top (blue tinted, "Demo Mode — playing with sample data" copy + "Exit demo" button)
    >    - **MasterDashboard** showing the seeded sole-trader entity with widgets populated by the 15 seeded FY2025-26 journals + 10 accounts
    >    - Sidebar visible with the demo entity selected
    > 4. Open DevTools Command Menu: **Ctrl+Shift+P** (Windows/Linux) or **Cmd+Shift+P** (Mac). Type `screenshot` and select **"Capture full size screenshot"**.
    > 5. Save the resulting PNG to:
    >    ```
    >    A:/Projects/AussieLedger/docs/screenshot.png
    >    ```
    >    Create the `docs/` directory first if it doesn't exist.
    > 6. **(Optional)** If the resulting file is > 200KB, optimise it:
    >    ```bash
    >    pngquant --quality=80-95 docs/screenshot.png --output docs/screenshot.png --force
    >    ```
    >    pngquant is OPTIONAL. If you don't have pngquant installed and the file is reasonably small (< 500KB), skip this step.
    > 7. Reply `captured` when the file is at the path above. Reply `blocked: <reason>` if you can't capture (e.g. demo not loading, capture command unavailable, file too large to commit).

    **STEP 2 — VERIFY (executor runs after `captured` reply):**

    Run these PowerShell commands in order:
    ```powershell
    # 1. File exists at expected path
    Test-Path docs/screenshot.png  # expect: True

    # 2. File size sanity bounds (≥ 10KB so it's not a 0-byte placeholder; ≤ 1MB so it's not gigantic)
    $size = (Get-Item docs/screenshot.png).Length
    Write-Host "Screenshot size: $size bytes"
    if ($size -lt 10000) { throw "Screenshot too small ($size bytes < 10KB) — likely truncated or placeholder" }
    if ($size -gt 1048576) { Write-Host "WARNING: Screenshot $size bytes > 1MB; consider pngquant optimisation" }

    # 3. PNG magic bytes (89 50 4E 47) — confirms it's actually a PNG
    $bytes = [System.IO.File]::ReadAllBytes("docs/screenshot.png")[0..3]
    $magic = ($bytes | ForEach-Object { $_.ToString("X2") }) -join ' '
    if ($magic -ne "89 50 4E 47") { throw "Not a PNG file (magic bytes: $magic)" }
    Write-Host "PNG magic bytes confirmed: $magic"
    ```

    If any of the 3 verifications fail, surface the failure to the user and DO NOT proceed to STEP 3 — wait for a remediated `captured` reply.

    **STEP 3 — WIRE (executor auto-runs after STEP 2 passes):**

    A. Edit `README.md` line 7. Replace verbatim:
    ```
    > _Screenshot coming v1.3._
    ```
    with verbatim (descriptive alt-text for a11y per CONTEXT Claude's-Discretion item):
    ```
    ![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png)
    ```

    B. Append 2 new assertions to `src/__tests__/readme.test.ts` at the END of the existing `describe('README.md (DEP-03)')` block (before the closing `});` on line 69). Use the existing test shape:
    ```typescript
    it('contains the docs/screenshot.png reference (POL-DOCS-01)', () => {
      expect(content).toContain('docs/screenshot.png');
    });

    it('does NOT contain the "Screenshot coming" placeholder (POL-DOCS-01)', () => {
      expect(content).not.toMatch(/Screenshot coming/i);
    });
    ```

    C. Run focused tests to verify the 2 new assertions GREEN + the 14 existing assertions stay GREEN:
    ```bash
    npx vitest run src/__tests__/readme.test.ts
    ```
    Expect: 16 GREEN (14 existing + 2 new).

    D. Run the AIza scan against the post-restructure dist/ to confirm no key-shape false positives (README is text-only; expect OK):
    ```bash
    npm run build
    ```
    Expect: `scan-aiza: OK`.

    **STEP 4 — COMMIT:**

    Stage `docs/screenshot.png` + `README.md` + `src/__tests__/readme.test.ts`. Commit with Conventional Commits + co-author:
    ```
    docs(16-1): wire real /demo screenshot into README top-of-fold (POL-DOCS-01)

    - Replace > _Screenshot coming v1.3._ placeholder at README.md line 7
      with ![AussieLedger MasterDashboard ...](docs/screenshot.png) image tag.
    - Add docs/screenshot.png — 1280px wide @2x DPR capture of live /demo
      MasterDashboard with seeded sole-trader entity.
    - 2 new readme.test.ts assertions: screenshot path present + placeholder
      removed. 14 existing tests stay GREEN.

    Closes POL-DOCS-01.

    Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
    ```
  </how-to-verify>

  <action>
    This is a `checkpoint:human-action` task with a 3-step flow:

    1. **PAUSE** — present STEP 1 to the user verbatim. Wait for `captured` reply (or `blocked: <reason>`).
    2. **VERIFY** — run STEP 2 PowerShell probe (Test-Path + size bounds + PNG magic-byte check). If any check fails, surface the failure and re-prompt — do NOT proceed.
    3. **WIRE + TEST + COMMIT** — auto-run STEP 3 (Edit README + extend readme.test.ts + npx vitest + npm run build) then STEP 4 (Conventional Commit).

    **Critical invariants for the auto-wire step:**
    - Use the **Edit** tool (single-line replacement) for README line 7 — do NOT rewrite the file. Old: `> _Screenshot coming v1.3._`. New: `![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png)`.
    - Use the **Edit** tool on readme.test.ts to insert the 2 new `it(...)` blocks before the closing `});` of the `describe(...)` block (line 69 in current state).
    - Do NOT touch any other line in either file in this task. (POL-DOCS-02 restructure of `## What This Is` happens in Task 2.)
    - The new alt-text MUST be the descriptive 7-word form `AussieLedger MasterDashboard with seeded demo sole-trader entity` (Claude's-Discretion choice from CONTEXT, locked here for a11y).

    **If the screenshot file fails verification:**
    - File too small (< 10KB) → likely truncated; ask user to recapture
    - Not a PNG (magic bytes wrong) → ask user to re-export as PNG (e.g. via Chrome's native "Save as PNG" or pngquant conversion)
    - File too large (> 1MB) → WARN but accept; suggest pngquant optimisation; do NOT block. Hard upper-bound stays at 1MB sanity ceiling; reject if larger.

    **If the user replies `blocked: <reason>`:**
    - Surface the blockage to the orchestrator
    - Do NOT proceed to Task 2
    - The orchestrator will decide whether to pause Phase 16 or fall back (e.g. revisit screenshot in v1.4)
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/readme.test.ts</automated>
    Expect: 16 tests GREEN (14 existing + 2 new POL-DOCS-01).

    Additional manual sanity (auto-runs in Step 2):
    - `Test-Path docs/screenshot.png` → True
    - File size in [10KB, 1MB]
    - PNG magic bytes `89 50 4E 47` at offset 0
  </verify>

  <done>
    - `docs/screenshot.png` exists, is a valid PNG, size in [10KB, 1MB], shows /demo MasterDashboard with seeded sole-trader entity (visually confirmed by user at capture time)
    - `README.md` line 7 contains `![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png)` — `> _Screenshot coming v1.3._` removed
    - `src/__tests__/readme.test.ts` has 2 new `it(...)` blocks at the end: screenshot-ref-present + placeholder-removed
    - `npx vitest run src/__tests__/readme.test.ts` → 16/16 GREEN
    - `npm run build` → EXIT 0 incl. `scan-aiza: OK`
    - Conventional Commit pushed (or staged for push) with co-author trailer
    - POL-DOCS-01 closed end-to-end; Task 2 may proceed
  </done>

  <resume-signal>Reply `captured` after dropping the PNG at `A:/Projects/AussieLedger/docs/screenshot.png`. Reply `blocked: <reason>` if the capture step is impossible. Reply `skip-screenshot` if you want to defer to v1.4 (orchestrator will decide whether to skip Phase 16's POL-DOCS-01 leg or pause).</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 2: POL-DOCS-02 — README "What This Is" persona restructure + 3 new test assertions</name>
  <files>README.md, src/__tests__/readme.test.ts</files>

  <behavior>
    After this task, `npx vitest run src/__tests__/readme.test.ts` must produce 19 GREEN tests:
    - **14 existing** (7 FND-12 byte-identical locks + 7 POL-04 content-presence) stay GREEN unchanged
    - **2 from Task 1** (screenshot-ref + placeholder-removed) stay GREEN
    - **3 new POL-DOCS-02 persona assertions** GREEN:
      - **Test A — `### For business owners` heading + key phrase**
        ```typescript
        it('contains "### For business owners" subsection heading with a key phrase (POL-DOCS-02)', () => {
          expect(content).toMatch(/^###\s+For business owners\s*$/m);
          expect(content).toMatch(/plain English|walk away with/);
        });
        ```
      - **Test B — `### For tax agents` heading + key phrase**
        ```typescript
        it('contains "### For tax agents" subsection heading with a key phrase (POL-DOCS-02)', () => {
          expect(content).toMatch(/^###\s+For tax agents\s*$/m);
          expect(content).toMatch(/multi-client|fast entity switching/);
        });
        ```
      - **Test C — `### For developers` heading + key phrase**
        ```typescript
        it('contains "### For developers" subsection heading with a key phrase (POL-DOCS-02)', () => {
          expect(content).toMatch(/^###\s+For developers\s*$/m);
          expect(content).toMatch(/StorageAdapter|pure functions/);
        });
        ```

    Heading regex `^###\s+For X\s*$` is strict multiline anchored (the `/m` flag treats `^` and `$` as line boundaries), so trailing whitespace after the heading text is tolerated but other words on the same line would fail — this is the locked shape per CONTEXT Claude's-Discretion item (planner-picked strict-anchored over lenient substring for higher signal value).

    Phrase regex uses OR-clause per CONTEXT lock — robust to copy refresh; either phrase passes.

    **RED state proof before refactor:**
    - Before editing README.md: add the 3 new test blocks → run `npx vitest run src/__tests__/readme.test.ts` → MUST fail with all 3 new tests reporting heading not found.
    - After editing README.md: rerun → 19 GREEN.
  </behavior>

  <action>
    Two-step TDD cycle: RED then GREEN.

    **RED (commit 1):**

    1. Append 3 new `it(...)` blocks to `src/__tests__/readme.test.ts` BEFORE the closing `});` of the `describe(...)` block (which is now line ~75 post-Task-1). Use the exact shape shown in `<behavior>` above (Tests A, B, C).

    2. Run `npx vitest run src/__tests__/readme.test.ts`. Expect: 16 existing GREEN + 3 new FAIL (heading not found in README; phrase regex won't be reached). Tests fail because:
       - The current README has `**For small-business owners**` as a bold paragraph (NOT a `###` h3 heading)
       - The current README has `**For tax agents**` as a bold paragraph (NOT a `###` h3 heading)
       - The current README has no developers section at all

    3. Commit:
       ```
       test(16-1): add 3 RED persona-section assertions (POL-DOCS-02)

       - ### For business owners heading + plain English|walk away with phrase
       - ### For tax agents heading + multi-client|fast entity switching phrase
       - ### For developers heading + StorageAdapter|pure functions phrase

       RED before persona restructure lands in next commit.

       Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
       ```

    **GREEN (commit 2):**

    4. Restructure `## What This Is` block in `README.md` (currently lines 12-16; replace with the new 3-persona structure below). Use the **Edit** tool with the OLD text being the current 5-line `## What This Is` block (header + blank + 2 persona paragraphs separated by blank lines) and the NEW text being:

    ```markdown
    ## What This Is

    AussieLedger meets you where you sit in the bookkeeping → tax workflow. Pick the path that fits.

    ### For business owners

    Take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

    ### For tax agents

    A no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes. Owner mode and agent mode share the same engine — switch modes in Settings.

    ### For developers

    Architecture-at-a-glance for contributors:

    - **StorageAdapter** is FINAL — 12 methods locked at Phase 3; LocalAdapter (IndexedDB) and ServerAdapter (HTTP → Express → SQLite) implement the same contract. Widening is via duck-typing on the concrete adapter (e.g. `getDbName()`, `getPersistGranted()`), never on the interface. Same SPA, two backends.
    - **Tax engine is pure functions** in `src/lib/tax/` — per-FY label modules under `returns/`, `rates/`, `labels/`. Decimal arithmetic via `decimal.js` throughout; money never touches native floats.
    - **Print working papers** use `window.print()` + `@media print` CSS. No PDF library, no server-side rendering, ATO field codes shown alongside plain-English labels.
    - **Demo isolation** ships via a separate `aussieledger-demo` IndexedDB namespace, gated on `window.location.pathname.startsWith('/demo')`. Your real data lives in `aussieledger` and is never touched by the `/demo` route.
    - **Stack:** React 19 + Vite 6 + TypeScript 5.8 + IndexedDB via `idb` (LocalAdapter) + Express + `better-sqlite3` (ServerAdapter). PWA via `vite-plugin-pwa`. No telemetry, no analytics, no third-party scripts (CSP `script-src 'self'`).
    - **License:** Apache 2.0. See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.
    ```

    Key constraints:
    - Keep the `## What This Is` H2 heading byte-identical (test 14-3 doesn't pin this but the rest of the doc structure depends on it)
    - Add the 1-sentence bridge ("AussieLedger meets you where you sit ...") under the H2 before the first `### subsection` — planner-picked sentence per CONTEXT discretion
    - The 3 `### h3` subsections MUST be in this exact order: `### For business owners` → `### For tax agents` → `### For developers` (per CONTEXT lock — audience priority)
    - Existing "For business owners" copy lightly refreshed: keep `plain English` + `walk away with` phrases (locked by Test A); drop the bold-paragraph form; promote to its own `###` subsection. Reword only minimally.
    - Existing "For tax agents" copy lightly refreshed: keep `multi-client` + `fast entity switching` phrases (locked by Test B); promote to `###` subsection. Add the new "Owner mode and agent mode share the same engine — switch modes in Settings." sentence to bridge to developers (planner-picked light refresh per CONTEXT).
    - NEW "For developers" section: 6 bullets (StorageAdapter / tax engine / print / demo isolation / stack / license-CTA). The first bullet contains `StorageAdapter` (locked by Test C; OR-clause also matches `pure functions` from the second bullet). NO code snippets. ~14 lines including bullets and the lead-in sentence (within the ~12-line CONTEXT target — the extra demo-isolation bullet adds value given Phase 14's HARD-BLOCK ships in the same codebase).
    - The CONTRIBUTING.md CTA at the end is VERBATIM per CONTEXT: `See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.` — folded into the License bullet to keep the section tight.

    5. Verify the byte-identical FND-12 phrases (`StorageAdapter`, `owner mode`, `agent mode`, `Apache 2.0`, `Single-user local`, `Small-firm VPS`, `npm install && npm run build`) are still present in the README after the edit. Two of those phrases (`StorageAdapter`, `owner mode`, `agent mode`, `Apache 2.0`) now ALSO appear inside the new developers section — that's fine because the existing tests use `toContain` not `toMatch /once/`; multiple matches still satisfy the assertion.

       Quick grep guard (run before committing):
       ```bash
       grep -c "StorageAdapter\|owner mode\|agent mode\|Apache 2.0\|Single-user local\|Small-firm VPS\|npm install && npm run build" README.md
       ```
       Expect: at least 7 lines matched (one per FND-12 phrase; some may appear more than once).

    6. Verify the line-count floor (Phase 14-3 Test 7: `content.split('\n').length >= 100`) is still satisfied. After Phase 16 restructure, expect ~125-130 lines (was 101; we're adding ~25-30 lines for the developers section + bridge sentence + persona headings).

       ```bash
       wc -l README.md  # expect ≥ 100
       ```

    7. Run the focused test:
       ```bash
       npx vitest run src/__tests__/readme.test.ts
       ```
       Expect: 19 GREEN (16 from before Task 2 + 3 new persona tests). All FND-12 byte-identical locks + all POL-04 + Task-1 + Task-2 tests pass.

    8. Run the full SPA suite + lint + build:
       ```bash
       npx vitest run
       npm run lint
       npm run build
       ```
       Expect: ~1208 SPA GREEN (1203 baseline + 2 from Task 1 + 3 from Task 2); lint EXIT 0; build EXIT 0 incl. `scan-aiza: OK`.

    9. Commit:
       ```
       docs(16-1): restructure README "What This Is" into 3 persona subsections (POL-DOCS-02)

       - ## What This Is gains a 1-line bridge sentence
       - 3 new ### h3 subsections in business→agents→developers order:
         - ### For business owners (light refresh; plain English + walk away with preserved)
         - ### For tax agents (light refresh; multi-client + fast entity switching preserved + owner/agent mode bridge sentence)
         - ### For developers (NEW: StorageAdapter FINAL + pure-function tax engine + window.print() + demo isolation + stack + Apache 2.0 + CONTRIBUTING.md CTA)
       - 3 new readme.test.ts persona assertions GREEN (heading + key phrase per persona)
       - All 16 prior readme.test.ts tests stay GREEN (FND-12 byte-identical locks + POL-04 + Task 1)
       - README 101 → ~128 lines; line-count floor (≥100) preserved
       - No source-code changes; no new dependencies; no CSP / vercel.json diff

       Closes POL-DOCS-02. Phase 16 complete; v1.3 milestone ready for audit.

       Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
       ```

    **Out of scope** for this task (per CONTEXT `<deferred>`):
    - Real screenshot variants (Tax Assistant view, composite multi-page) — v1.4
    - WebP format — until GitHub support is universal
    - Code snippets in developers section — explicit non-goal
    - `docs/assets/` sub-foldering — single `docs/screenshot.png` for v1.3
    - GitHub Issues "good first issue" curation — premature
    - POL-CODE-06 PWA install desktop CTA — still deferred from v1.3 discuss-time
    - Verify-file-exists test for screenshot — text assertion catches path drift
    - Rich 3-5 phrase assertions per persona — 1 phrase per persona locked
    - Persona top-level `##` sections — nest under `## What This Is`
    - Alphabetical or developers-first ordering — locked to audience priority
    - `package.json` description field sync — Claude's discretion per CONTEXT; planner declines (orthogonal to POL-DOCS scope; out of zero-source-diff Phase 16 invariant)
  </action>

  <verify>
    <automated>npx vitest run src/__tests__/readme.test.ts && npx vitest run && npm run lint && npm run build</automated>

    Expected:
    - `npx vitest run src/__tests__/readme.test.ts` → 19/19 GREEN
    - `npx vitest run` (full SPA suite) → ~1208 GREEN + 11 todo + 0 RED
    - `npm run lint` → EXIT 0
    - `npm run build` → EXIT 0 incl. `scan-aiza: OK`

    Additional manual sanity:
    - `wc -l README.md` → ≥ 100 (target ~128)
    - `grep -c "^### For " README.md` → 3 (exactly the 3 persona headings)
    - `grep "Screenshot coming" README.md` → no match (Task 1 already removed it; regression guard)
    - `grep "docs/screenshot.png" README.md` → 1 match (Task 1 image tag)
  </verify>

  <done>
    - `README.md` `## What This Is` section restructured into 3 `### h3` persona subsections in business→agents→developers order
    - Bridge sentence ("AussieLedger meets you where you sit ...") under the H2
    - "For business owners" copy lightly refreshed; `plain English` + `walk away with` phrases preserved
    - "For tax agents" copy lightly refreshed; `multi-client` + `fast entity switching` phrases preserved; owner/agent-mode bridge sentence added
    - "For developers" NEW section: 6 bullets covering StorageAdapter FINAL, pure-function tax engine, window.print() + @media print CSS, demo isolation, tech stack (React 19 + Vite 6 + TS 5.8 + idb + Express + better-sqlite3), Apache 2.0 license + CONTRIBUTING.md CTA verbatim
    - 3 new readme.test.ts assertions (Tests A, B, C) GREEN
    - All 14 pre-Phase-16 readme.test.ts tests stay GREEN (FND-12 byte-identical locks + POL-04 content-presence)
    - 2 Task-1 readme.test.ts tests stay GREEN
    - Full SPA suite ~1208 GREEN + 11 todo + 0 RED
    - lint EXIT 0; build EXIT 0; scan-aiza: OK
    - README line count ≥ 100 (target ~128)
    - 2 commits pushed (RED test → GREEN refactor); Conventional Commits + co-author trailer
    - POL-DOCS-02 closed end-to-end; Phase 16 complete; v1.3 milestone ready for `/gsd:verify-phase 16` and milestone audit
  </done>
</task>

</tasks>

<verification>
After both tasks complete:

1. **Tests** — `npx vitest run` returns ~1208 GREEN + 11 todo + 0 RED (1203 baseline + 5 new readme.test.ts assertions). `npx vitest run src/__tests__/readme.test.ts` returns 19/19 GREEN (7 FND-12 + 7 POL-04 + 2 POL-DOCS-01 + 3 POL-DOCS-02).

2. **Build** — `npm run build` EXIT 0, `scan-aiza: OK`. README contains no `AIza` key shapes (it doesn't; the screenshot is binary and won't match the regex).

3. **Lint** — `npm run lint` EXIT 0. Phase 16 touches only `README.md` (not TS-linted), `src/__tests__/readme.test.ts` (linted; uses existing patterns), and `docs/screenshot.png` (binary; not linted).

4. **Server tests** — `cd server && npx vitest run` returns 18/18 GREEN (no changes; regression guard).

5. **File checks**:
   - `Test-Path docs/screenshot.png` → True; size ≥ 10KB and ≤ 1MB; PNG magic bytes correct
   - `wc -l README.md` → ≥ 100 (target ~128)
   - `grep -c "^### For " README.md` → 3
   - `grep "Screenshot coming" README.md` → no match
   - `grep "docs/screenshot.png" README.md` → 1 match

6. **Architecture invariants (all 13 from Phase 15 STATE preserved)**:
   - StorageAdapter FINAL — N/A (no `src/storage/*` files touched)
   - DisclaimerFooter verbatim — N/A (component file untouched)
   - PrivacyPage non-AI bullets byte-identical — N/A (untouched)
   - Sidebar visual byte-identical — N/A (untouched)
   - BAS/IAS universal — N/A (untouched)
   - ViewRouter:179 header button preserved — N/A (untouched)
   - No `new Date()` outside `src/lib/period.ts` — preserved (no JS code added)
   - No new dependencies — preserved (`package.json` untouched)
   - CSP / vercel.json unchanged — preserved (vercel.json untouched)
   - AIza scan still passes — verified in step 2
   - SPDX header invariant — N/A (no new `.ts`/`.tsx` source files; readme.test.ts already has SPDX header)
   - Conventional Commits + Co-Authored-By — verified in commit messages
   - App.tsx no-source-diff — preserved (App.tsx untouched)

7. **Requirements coverage**:
   - POL-DOCS-01 — closed by Task 1 (real screenshot wired + 2 assertions + placeholder removed)
   - POL-DOCS-02 — closed by Task 2 (3 persona subsections + 3 assertions)
</verification>

<success_criteria>
- [ ] `docs/screenshot.png` committed (binary; valid PNG; 10KB-1MB)
- [ ] `README.md` line 7 contains the `![AussieLedger MasterDashboard ...](docs/screenshot.png)` image tag (placeholder removed)
- [ ] `README.md` `## What This Is` section restructured with 3 `### h3` persona subsections in business→agents→developers order
- [ ] `### For developers` section covers StorageAdapter FINAL + pure-function tax engine + window.print() + demo isolation + tech stack + Apache 2.0 + CONTRIBUTING.md CTA verbatim
- [ ] 5 new `src/__tests__/readme.test.ts` assertions GREEN: heading+phrase per persona × 3 + screenshot path ref + placeholder removed
- [ ] All 14 pre-Phase-16 readme.test.ts tests stay GREEN (FND-12 byte-identical locks + POL-04 content-presence)
- [ ] Full SPA suite: ~1208 GREEN + 11 todo + 0 RED
- [ ] `npm run lint` EXIT 0
- [ ] `npm run build` EXIT 0 incl. `scan-aiza: OK`
- [ ] Server tests stay 18/18 GREEN (regression guard)
- [ ] `wc -l README.md` ≥ 100 (target ~128)
- [ ] 3 commits pushed (Task 1 screenshot+wire+tests; Task 2 RED tests; Task 2 GREEN restructure) — Conventional Commits + co-author
- [ ] POL-DOCS-01 + POL-DOCS-02 both closed end-to-end
- [ ] Phase 16 ready for `/gsd:verify-phase 16` and v1.3 milestone audit
</success_criteria>

<output>
After completion, create `.planning/phases/16-docs-polish/16-1-SUMMARY.md` documenting:

- Final test counts (SPA + server + readme.test.ts focused)
- README line count before/after (101 → ~128)
- Screenshot file size + PNG magic-byte verification
- All 13 architecture invariants from STATE confirmed preserved
- All locked CONTEXT decisions honored (16 sub-decisions across 4 areas)
- All deferred items NOT introduced (per CONTEXT `<deferred>`)
- Commit shas for the 3 Phase 16 commits
- CI run conclusions (if probable from sandbox)
- Phase 16 closes v1.3 milestone — ready for audit
</output>
