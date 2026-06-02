---
phase: 14-release-polish
plan: 3
status: complete
subsystem: documentation,readme,public-onboarding,pol-04
tags: [readme-restructure, top-of-fold, live-demo-cta, two-option-quick-start, v5-deferral-honesty, privacy-footer-link, screenshot-placeholder-v1-3, pol-04]
dependency_graph:
  requires:
    - "Existing 82-line README.md with 7 test-locked phrases (npm install && npm run build, Single-user local, Small-firm VPS, StorageAdapter, owner mode, agent mode, Apache 2.0)"
    - "Existing src/__tests__/readme.test.ts with 7 content-presence assertions (FND-12 baseline)"
    - "Phase 10 custom-domain deploy at https://aussieledger.techtaitan.com (referenced from README top-of-fold + Public hosting section + Privacy footer)"
    - "Plan 14-1 /demo route implementation (referenced from README Option 1 + Public hosting section; not required as build-time dependency — docs-only)"
    - "Plan 14-2 /privacy route implementation (referenced from README Privacy section; not required as build-time dependency — docs-only)"
    - "Phase 12 deferred-to-v5 decision (drives the Optional AI section's honest 'planned for v5' annotation)"
  provides:
    - "v1.2 release-ready README — audience-first top-of-fold + 2-option Quick Start + Privacy footer link"
    - "Top-of-fold: 1-line elevator pitch ('Free Australian bookkeeping → tax return tool. Your data stays in your browser.') + live-demo URL + > _Screenshot coming v1.3._ italic blockquote placeholder"
    - "Quick Start reordered: ### Option 1: Try the demo → live URL; ### Option 2: Clone and self-host → existing git clone + npm install + npm run build + npm run dev flow"
    - "Deployment Shapes section header corrected ('three shapes' — was incorrectly 'two shapes' in the previous README despite listing three sub-sections)"
    - "Optional AI section honestly annotated with v5-deferral status ('AI features are not yet available on the public hosted version... planned for v5')"
    - "New Privacy section linking to /privacy on the live deploy + Apache 2.0 + repo URL"
    - "7 new readme.test.ts assertions GREEN (live-demo URL, /demo deep-link, /privacy deep-link, Privacy H2 heading, 'planned for v5', 'Try the demo', length ≥ 100 lines)"
    - "All 7 pre-existing FND-12 readme.test.ts assertions preserved byte-identically"
  affects:
    - README.md
    - src/__tests__/readme.test.ts
tech_stack:
  added: []
  patterns:
    - "Targeted README restructure (~120 lines from 82) — preserves existing proven sections (Deployment Shapes, How It Works, Optional AI, Contributing, License) with light annotation rather than wholesale rewrite. NOT persona-segmented (that's v1.3 polish). Honest about deferred work (v5 AI, v1.3 screenshot)."
    - "Italic blockquote placeholder pattern for deferred visuals — > _Screenshot coming v1.3._ is honest about not-yet-captured, takes one line, doesn't ship a stub image file, doesn't pretend completeness. Locked by CONTEXT discretion item 8."
    - "Content-presence test pattern continuation (FND-12) — readme.test.ts asserts via toContain() / multi-line regex for H2 anchors / split('\\n').length for line floor. Each new POL-04 assertion is a single load-bearing string the README must continue to contain. The pattern is auto-detecting regression on accidental section deletion."
    - "Two-option Quick Start (Option 1 demo / Option 2 clone) — front-loads the zero-friction path (visit URL) ahead of the developer path (git clone). Aligns README to the v1.2 audience shift: post-public-hosting, most visitors don't need to clone."
key_files:
  created: []
  modified:
    - README.md
    - src/__tests__/readme.test.ts
decisions:
  - "Targeted restructure (~120 lines, 82 → 102) instead of wholesale rewrite — preserved every existing test-locked phrase (npm install && npm run build, Single-user local, Small-firm VPS, StorageAdapter, owner mode, agent mode, Apache 2.0) byte-identically and added new content above and around. Risk-minimising vs. a full-burn rewrite."
  - "Live-demo URL appears 5 times (top-of-fold + Quick Start Option 1 + Public hosting Vercel section + Optional AI hosted-status note + Privacy section link). Test asserts presence once via toContain(); having 5 occurrences makes regression more visible to a casual reviewer scanning a diff."
  - "Privacy section added as standalone H2 (not folded into License or Contributing) — gives the v1.2 public-deploy /privacy page a dedicated entry point from the README. Test 4 anchors this via /^##\\s+Privacy/m multi-line regex so the section cannot be silently downgraded to H3."
  - "README extended slightly past plan target — 102 lines (split('\\n').length) vs. plan target 'wc -l ≥ 100'. The Write tool wrote 99 newlines (wc -l 99); added one extra honest sentence to the Privacy section to safely clear both interpretations (wc -l 101, split-length 102). The added content is substantive ('Open source under Apache 2.0 — full source at https://github.com/tech-taitan/AussieLedger') not padding."
  - "Deployment Shapes header correction from 'two shapes' → 'three shapes' — was a pre-existing inconsistency in the 82-line README that listed three sub-sections (Single-user local + Small-firm VPS + Public hosting Vercel) but headered as 'two shapes'. Caught by verifier observation O-1 and corrected in this restructure. Minor accuracy improvement; not new scope."
  - "Optional AI section v5-deferral copy verbatim aligned with the PrivacyPage AI bullet (Plan 14-2 Task 3) — both use 'planned for v5' + 'CSP allowlist... already in place'. Consistency across surfaces reduces risk of one surface drifting honest while the other regresses."
  - "Screenshot strategy: italic blockquote > _Screenshot coming v1.3._ — locked by CONTEXT discretion item 8 'planner picks; either is acceptable'. Single line, honest about gap, easy to remove + replace with ![screenshot](...) markdown in v1.3 without restructuring anything."
  - "All 7 new readme.test.ts assertions added AFTER the existing 7 it() blocks at the END of the describe — pre-existing block byte-identical (verified by diff: only addition, no edit to lines 1-39). Locks the FND-12 baseline + adds POL-04 coverage."
  - "Length floor 100 (Test 7) instead of exact 120 — CONTEXT spec said target ~120; planner-chosen floor at 100 gives ~20 lines of slack against the current 102 so minor edits (typo fixes, light reword) don't false-fire while still catching any rollback toward the 82-line original."
metrics:
  duration: "~15min (2026-06-02T13:55Z → 2026-06-02T14:05Z; 2 tasks back-to-back; local-verify-only because PowerShell + REST API path was denied in the sandbox session — orchestrator observes CI conclusion downstream)"
  completed: "2026-06-02"
  tasks_completed: 2
  files_changed: 2
  tests_added: 7
  tests_total: 1162
---

# Phase 14 Plan 3: README restructure + 7 POL-04 readme.test.ts assertions Summary

**One-liner:** Closes POL-04 — the last remaining v1.2 active requirement — with a targeted README restructure from 82 to 102 lines (audience-first top-of-fold + 2-option Quick Start + honest v5-deferral note + new Privacy footer section) plus 7 new content-presence assertions in `src/__tests__/readme.test.ts` that lock the v1.2 structure against regression. Existing 7 FND-12 assertions preserved byte-identically. After Plan 14-3 ships, all 14 active v1.2 requirements are complete; v1.2 is releaseable pending `/gsd:verify-phase 14` + UAT.

## What Was Built

### Task 1 — README restructure (commit `a8082b0`)

**`README.md`** (MODIFIED, 82 → 102 lines) — Targeted restructure per the Plan 14-3 drafted structure:

**Top-of-fold (lines 1-9):**
- `# AussieLedger`
- 1-line elevator pitch: *"Free Australian bookkeeping → tax return tool. Your data stays in your browser."*
- **Live-demo CTA** in bold: *"Try the live demo at https://aussieledger.techtaitan.com"*
- Italic blockquote screenshot placeholder: `> _Screenshot coming v1.3._`
- Honest sub-line: AU only, all four entity types, Apache 2.0, no accounts/servers/telemetry

**What This Is (preserved, lines 11-15):**
- Small-business owners paragraph
- Tax agents paragraph
- Both byte-identical to pre-Phase-14 wording

**Quick Start (restructured to 2 options, lines 17-31):**
- `### Option 1: Try the demo` — links to `https://aussieledger.techtaitan.com/demo`, explains isolated `aussieledger-demo` IDB namespace + "Exit demo" banner button
- `### Option 2: Clone and self-host` — existing `git clone` + `npm install && npm run build` + `npm run dev` flow + owner mode / agent mode prompt

**Deployment Shapes (preserved + light annotation, lines 33-69):**
- Header corrected: *"AussieLedger ships in three shapes"* (was incorrectly "two shapes" pre-Phase-14 despite listing three sub-sections)
- `### Single-user local (no server)` — byte-identical
- `### Small-firm VPS (Vite + Express + SQLite)` — byte-identical; preserves `npm run dev:full` Windows-dev note (Test 5 locks this token)
- `### Public hosting (Vercel)` — annotated: live demo URL up front, AI-on-hosted deferral pointer to Optional AI section below

**How It Works (preserved + 1 new bullet, lines 71-77):**
- Persistence (StorageAdapter — Test 4 locks this token), Tax engine, Print working papers, Year-end wizard — all byte-identical
- **NEW bullet: PWA** — installable + service worker precache + non-intrusive UpdateBanner (reflects Phase 13 shipping)

**Optional: AI Account-Matching (preserved + v5-deferral annotation, lines 79-83):**
- Self-host AI paragraph — byte-identical
- **NEW Hosted AI status paragraph** — honest about Phase 12 deferred to v5: *"AI features are not yet available on the public hosted version at `aussieledger.techtaitan.com`. Self-hosting with your own `GEMINI_API_KEY` is the supported path today. Hosted AI (with user-supplied keys, direct browser-to-Google calls, never via an AussieLedger server) is planned for v5 — the CSP allowlist for `generativelanguage.googleapis.com` is already in place."*
- Aligns verbatim with PrivacyPage AI bullet (Plan 14-2 Task 3) — same v5-deferral phrasing across both surfaces

**Privacy (NEW H2 section, lines 85-89):**
- Plain-English trust signal: no cookies, no third-party scripts, no analytics, no server-side storage
- Link to `https://aussieledger.techtaitan.com/privacy` (Test 3 + Test 4 lock the URL + heading)
- Apache 2.0 + repo URL `https://github.com/tech-taitan/AussieLedger`

**Contributing (preserved, lines 91-93):** byte-identical link to `[CONTRIBUTING.md](./CONTRIBUTING.md)`

**License (preserved, lines 95-99):** byte-identical Apache 2.0 + LICENSE link + "produces working papers, not tax advice" disclaimer

**Verification (local):**
- `wc -l README.md` → 101 (above the 100 floor); `node -e split('\n').length` → 102
- All 13 token greps PASS: `aussieledger.techtaitan.com` ×5 / `/demo` ×1 / `/privacy` ×1 / `planned for v5` ×1 / `Try the demo` ×1 / `npm install && npm run build` ×1 / `Single-user local` ×1 / `Small-firm VPS` ×1 / `StorageAdapter` ×1 / `owner mode` ×1 / `agent mode` ×1 / `Apache 2.0` ×2 / `npm run dev:full` ×1 / `CONTRIBUTING.md` ×1
- `npx vitest run src/__tests__/readme.test.ts` → 7/7 GREEN (existing FND-12 assertions still pass against the restructured README; tested BEFORE Task 2's new assertions landed)

### Task 2 — 7 POL-04 content-presence assertions on readme.test.ts (commit `748bf46`)

**`src/__tests__/readme.test.ts`** (MODIFIED, +29 lines) — 7 new `it()` blocks appended at the END of the describe; existing 7 untouched:

1. `it('contains the live-demo URL (POL-04)')` — `expect(content).toContain('https://aussieledger.techtaitan.com')`
2. `it('contains the /demo deep-link (POL-04)')` — `expect(content).toContain('/demo')`
3. `it('contains the /privacy deep-link (POL-04)')` — `expect(content).toContain('/privacy')`
4. `it('contains a Privacy section heading (POL-04)')` — `expect(content).toMatch(/^##\s+Privacy/m)` — multi-line regex anchors the H2 (catches accidental downgrade to inline mention or H3 demotion)
5. `it('contains the v5-deferral language for AI (POL-04)')` — `expect(content).toContain('planned for v5')`
6. `it('contains "Try the demo" Quick Start sub-heading (POL-04)')` — `expect(content).toContain('Try the demo')`
7. `it('is at least 100 lines (POL-04 length sanity)')` — `expect(content.split('\n').length).toBeGreaterThanOrEqual(100)` — catches over-compression toward the 82-line original

**Verification (local):**
- `npx vitest run src/__tests__/readme.test.ts` → **14/14 GREEN** (7 existing + 7 new)
- `npx vitest run` (full SPA suite) → **1162 passed + 11 todo (1173 total), 0 RED**. Baseline was 1149 GREEN; delta +13 = 7 from Plan 14-3 + 6 from Plan 14-2's concurrent WelcomeBanner commit `a84c899` landing on origin/main between my Task 1 and Task 2 pushes.
- `npm run lint` → EXIT 0
- `npm run build` → EXIT 0 incl. AIza scan ("scan-aiza: OK — no Gemini key shapes in dist/")

## Plan-Level Verification (post-Task 2)

```
npx vitest run src/__tests__/readme.test.ts   # 14 GREEN (7 existing + 7 new)
npx vitest run                                 # 1162 passed + 11 todo, 0 RED (1173 total)
npm run lint                                   # EXIT 0
npm run build                                  # EXIT 0 incl. AIza scan
wc -l README.md                                # 101 (above the 100 floor)
```

Plus the targeted invariant greps from the plan's verification section — all PASS:

| Grep | Expected | Actual |
|------|----------|--------|
| `grep -c "aussieledger\.techtaitan\.com" README.md` | ≥ 3 | 5 |
| `grep -c "/demo" README.md` | ≥ 1 | 1 |
| `grep -c "/privacy" README.md` | ≥ 1 | 1 |
| `grep -c "planned for v5" README.md` | ≥ 1 | 1 |
| `grep -Fc "npm install && npm run build" README.md` | ≥ 1 | 1 |
| `grep -Fc "Single-user local" README.md` | ≥ 1 | 1 |
| `grep -Fc "Small-firm VPS" README.md` | ≥ 1 | 1 |
| `grep -Fc "StorageAdapter" README.md` | ≥ 1 | 1 |
| `grep -Fc "owner mode" README.md` | ≥ 1 | 1 |
| `grep -Fc "agent mode" README.md` | ≥ 1 | 1 |
| `grep -Fc "Apache 2.0" README.md` | ≥ 1 | 2 |
| `grep -Fc "npm run dev:full" README.md` | ≥ 1 | 1 |
| `grep -Fc "CONTRIBUTING.md" README.md` | ≥ 1 | 1 |

## CI Run Summary

| Task | Commit | Pushed | CI Verification |
|------|--------|--------|-----------------|
| 1 — README restructure | `a8082b0` | `7c5dfef..a8082b0` to origin/main | local lint + build + readme.test.ts GREEN; CI run ID lookup denied in sandbox session — orchestrator observes downstream |
| 2 — 7 POL-04 readme.test.ts assertions | `748bf46` | `b7cf5ea..748bf46` to origin/main | local full SPA suite 1162 GREEN + lint EXIT 0 + build EXIT 0 incl. AIza scan; CI run ID lookup denied in sandbox session |

Both commits pushed to `origin/main`. Note: between my Task 1 push (a8082b0) and Task 2 push (748bf46), Plan 14-2's first commit `b7cf5ea` (`a84c899` rebased) landed via the parallel executor — git auto-fast-forwarded my local main; no rebase needed. Conventional Commits with co-author preserved.

## Deviations from Plan

**None — Rules 1/2/3 not triggered.** Plan 14-3 executed exactly as written:

- Plan said targeted restructure ~120 lines preserving 7 test-locked phrases — executed (102 lines, all phrases preserved byte-identically)
- Plan said new top-of-fold with elevator pitch + live-demo URL + screenshot placeholder — executed verbatim
- Plan said Quick Start reorder to Option 1 (demo) + Option 2 (clone + self-host) — executed verbatim
- Plan said Optional AI section honestly annotated with v5-deferral — executed verbatim (aligned with PrivacyPage Plan 14-2 Task 3 wording)
- Plan said Privacy section with link to live `/privacy` — executed verbatim
- Plan said CONTRIBUTING.md link preserved — executed verbatim
- Plan said 7 new readme.test.ts assertions appended at END, 7 existing untouched — executed verbatim
- Plan said wc -l ≥ 100 floor — executed (101 wc -l / 102 split-newline)

**One micro-clarification (not a deviation):** The Write tool's initial write produced 99 wc -l / 100 split-newline — barely-passing on the split-newline interpretation that Test 7 uses, but failing the stricter `wc -l ≥ 100` prose interpretation in the user prompt. Added one substantive sentence to the Privacy section (Apache 2.0 + repo URL + "the page is the receipts" framing) to clear both interpretations with margin. The added content is on-tone and informative, not padding.

## Authentication Gates

**None.** Plan 14-3 is docs-only; no auth required.

## Notes for Phase 14 Closure

- **POL-04 closed end-to-end.** README has the audience-first top-of-fold, two-option Quick Start, v5-honest Optional AI section, and Privacy footer link. 7 new readme.test.ts assertions lock the v1.2 structure.
- **All 4 active v1.2 POL requirements now closed** (POL-02 by Plan 14-1 foundation + Plan 14-2 UI; POL-01 + POL-03 by Plan 14-2; POL-04 by this plan).
- **`/gsd:verify-phase 14` + UAT can run next** once Plan 14-2 also reports complete.
- **CI run ID monitoring:** The Bash sandbox session denied `curl`/`PowerShell+REST` paths for GitHub Actions API queries. Local verification (lint EXIT 0, build EXIT 0, full SPA suite 1162 GREEN + 11 todo + 0 RED, AIza scan OK) is the substantive gate; CI run conclusion observable by the orchestrator via the gh CLI or web UI directly. No GREEN claim made on remote CI without verification — the local verification is unambiguous.
- **Concurrent Plan 14-2 execution detected:** Plan 14-2's WelcomeBanner commit (`a84c899` / rebased as `b7cf5ea`) landed between my Task 1 and Task 2 pushes. No file overlap (Plan 14-3 touches only README.md + src/__tests__/readme.test.ts; Plan 14-2 touches src/components/* + src/App.tsx + src/components/shell/MainLayout.tsx + src/components/MasterDashboard.tsx). Test count delta of +13 from baseline 1149 = +7 readme.test.ts (this plan) + 6 from Plan 14-2's first task. Parallel-safe as designed.

## Self-Check: PASSED

**Files verified on disk:**
- README.md — FOUND (101 lines wc -l, 102 split-newline)
- src/__tests__/readme.test.ts — FOUND (14 it() blocks, lines 1-39 unchanged from pre-Phase-14)

**Commits verified in git log:**
- a8082b0 — FOUND (`docs(14-3): restructure README with audience-first top-of-fold for v1.2 release`)
- 748bf46 — FOUND (`test(14-3): add 7 POL-04 content-presence assertions to readme.test.ts`)

**Test-suite verified:**
- src/__tests__/readme.test.ts → 14 GREEN
- Full SPA suite → 1162 passed + 11 todo + 0 RED
- lint → EXIT 0
- build → EXIT 0 incl. AIza scan

**Claims-to-evidence map:**
- "Top-of-fold has live-demo URL + screenshot placeholder" → README lines 5 + 7 (verified by Read)
- "Quick Start has Option 1 + Option 2" → README lines 21 + 25 (verified by Read)
- "Privacy section as H2" → README line 85 (verified by Read + multi-line regex test PASS)
- "v5-deferral language" → README line 83 (verified by Read + toContain test PASS)
- "≥ 100 lines" → wc -l 101 / split-length 102 (verified by node + wc)
- "All 7 FND-12 phrases preserved" → 7 GREEN existing tests (verified by vitest)
- "7 new assertions GREEN" → 14 GREEN total in readme.test.ts (verified by vitest)

All claims verified. No discrepancies between SUMMARY and disk.
