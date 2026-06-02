---
phase: 15-code-polish
plan: 1
status: complete
subsystem: github-repo-visibility,legacy-migration,demo-isolation,pol-code-01,pol-code-02
tags: [github-public-flip, repo-metadata, anonymous-readme-link-fix, privacy-page-no-op, demo-db-guard, legacy-migration-early-return, v1-2-audit-red-closed, v1-2-audit-amber-closed]
dependency_graph:
  requires:
    - "GitHub repo owner credentials (manual UI round-trip — checkpoint:human-action)"
    - "Phase 14 Plan 14-1 LocalAdapter widening — DB_NAME_PROD + DB_NAME_DEMO constants (src/storage/local.ts:62,65) + LocalAdapter.getDbName() duck-typed accessor (src/storage/local.ts:328)"
    - "Phase 14 Plan 14-2 PrivacyPage shipped honest AI bullet wording (src/components/PrivacyPage.tsx:63-68 already says 'The public hosted build does not send data to Google.' — no edit needed in Phase 15)"
    - "fake-indexeddb (devDependency, used by existing legacy-migration.test.ts)"
  provides:
    - "Anonymous-public GitHub repo at https://github.com/tech-taitan/AussieLedger — README + PrivacyPage repo links now resolve (200) for logged-out visitors"
    - "GitHub repo metadata: SPDX license tag Apache-2.0 visible to anonymous users (open-source promise verifiable from REST API); description set; homepage set (Vercel default, not custom domain — minor follow-up todo)"
    - "Phase 15 POL-CODE-02 — 2-line early-return guard at top of migrateLegacyLocalStorage() that fires when adapter.getDbName() === DB_NAME_DEMO; no caller-side check"
    - "src/storage/__tests__/legacy-migration-demo-guard.test.ts — 2-test suite (demo skips migration + prod still migrates regression guard)"
    - "v1.2 audit RED #1 (private-repo-URL → broken anonymous README link) CLOSED"
    - "v1.2 audit AMBER #2 (legacy-migration coupling to /demo) CLOSED"
  affects:
    - src/storage/legacy-migration.ts
    - src/storage/__tests__/legacy-migration-demo-guard.test.ts
    - github.com/tech-taitan/AussieLedger (repository settings; no commit artefact)
tech_stack:
  added: []
  patterns:
    - "Duck-typed-accessor consumption pattern — guard reads adapter.getDbName() (not on the StorageAdapter interface; Phase 14 deliverable) so the StorageAdapter contract stays FINAL while the demo-vs-prod branch lands inside the function body (single source of truth)."
    - "Early-return guard at the top of side-effecting migration function — no read, no write, no clear on the demo branch. Mirrors the existing typeof-localStorage-undefined guard one line below it; conceptually consistent."
    - "fake-indexeddb cross-test isolation pattern — beforeEach() awaits deleteDatabase() for both DB_NAME_PROD + DB_NAME_DEMO via a Promise wrapper that resolves on success/error/blocked uniformly. Prevents wedged blocked-state from stalling the suite."
    - "checkpoint:human-action with anonymous-REST-API re-verification — same gate pattern Phase 10 (Cloudflare token) + Phase 13 (Lighthouse smoke) used; orchestrator pauses, user does the UI work, anonymous probe asserts the outcome from outside any authenticated session."
key_files:
  created:
    - src/storage/__tests__/legacy-migration-demo-guard.test.ts
  modified:
    - src/storage/legacy-migration.ts
decisions:
  - "POL-CODE-01 Task 1 PrivacyPage branch executed as a NO-SOURCE-DIFF outcome — VERIFICATION round 1 and direct file read both confirmed the shipped src/components/PrivacyPage.tsx:63-68 AI bullet already reads honestly ('The public hosted build does not send data to Google.') from the Phase 14-2 ship. The phrase 'CSP allowlist is already in place' was never in the committed shipped source. VERBATIM_AI_BULLET in PrivacyPage.test.tsx already matches byte-for-byte. No PrivacyPage.tsx edit, no PrivacyPage.test.tsx edit, no commit for this branch. The substantive POL-CODE-01 work was the GitHub repo visibility flip + metadata."
  - "GitHub repo flip succeeded with 3 metadata deltas vs. plan spec — accepted as informational (not blocking POL-CODE-01 closure): (1) Description user-chose 'Ledger to do your Aussie Accounting and Tax' instead of plan's 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.' — matter of taste, doesn't affect open-source-promise verifiability. (2) Topics array empty (plan asked for 7 — australia/tax/accounting/bookkeeping/open-source/react/typescript); discoverability polish only; suggest folding into v1.4 polish. (3) Homepage set to https://aussie-ledger-theta.vercel.app (Vercel default) instead of plan's https://aussieledger.techtaitan.com (custom domain — what README + PrivacyPage point at). Minor inconsistency with README + PrivacyPage; flagged as v1.4 polish candidate. **The v1.2 audit RED finding (private repo → broken anonymous link) is fully resolved** — anonymous browsers clicking README + PrivacyPage repo links now land on a real public repo page with verifiable Apache-2.0 SPDX license tag."
  - "POL-CODE-02 guard placement at the TOP of migrateLegacyLocalStorage(adapter) — BEFORE the existing typeof-localStorage-undefined check. Reasoning: the guard is a hard architectural boundary (demo DB is byte-isolated from prod by design; never inherit prod legacy data), conceptually superior to the localStorage-availability check (which is a graceful-degradation environmental guard). Putting the architectural boundary first reads top-to-bottom as 'is this even applicable? → is the environment capable? → do the work.'"
  - "DB_NAME_DEMO imported alongside the existing LocalAdapter type import on a single line — `import { DB_NAME_DEMO, type LocalAdapter } from './local';` — preserves the file's existing 2-line import block (no new line added). Minimal-diff surface."
  - "File-level JSDoc extended with a 6-line Phase 15 POL-CODE-02 paragraph immediately after the existing Failure-path paragraph — documents the v1.2-audit-AMBER #2 fix in the SAME comment-block readers consult to understand the function's responsibility. Names the test file for forward-reference (legacy-migration-demo-guard.test.ts)."
  - "Test data shapes match existing src/storage/__tests__/legacy-migration.test.ts conventions byte-for-byte: ledger_entities_list = JSON.stringify([{ _v, id, name, type, status }]); ledger_all_entries = '{}'; ledger_chart_of_accounts = '[]'; ledger_audit_logs = '[]'. Per the plan instruction to mirror existing test shapes — the new file is a peer to the existing suite, not a competing convention."
  - "fake-indexeddb cross-test deletion wrapped in a custom deleteDb() helper inside the test file (not extracted to a shared util) — single-purpose, 7-line helper; extracting to shared util would be premature abstraction for one consumer."
  - "Task 1 / Task 2 sequencing followed the plan-stated order (Task 1 first) per the orchestrator's explicit instruction. Task 1's no-source-diff outcome let the orchestrator hit the human-action gate immediately on resume, with Task 2 executing fully autonomously after the gate cleared. Total executor wall-clock outside the human gate was ~12 minutes."
metrics:
  duration: "~12min executor wall-clock (excludes human-action gate duration); 2026-06-02T17:00Z plan-loaded → 2026-06-02T~21:38Z final-push including the user GitHub Settings round-trip"
  completed: "2026-06-02"
  tasks_completed: 2
  files_changed: 2
  tests_added: 2
  tests_total: 1187
---

# Phase 15 Plan 1: GitHub Repo Visibility Flip + Legacy-Migration Demo-DB Guard Summary

**One-liner:** Closes 2 of 5 Phase 15 requirements end-to-end — POL-CODE-01 (v1.2-audit RED) by flipping the GitHub repo to public via a `checkpoint:human-action` gate (PrivacyPage AI bullet wording confirmed already-honest in shipped source — no source edit), and POL-CODE-02 (v1.2-audit AMBER) by adding a 2-line early-return guard at the top of `migrateLegacyLocalStorage(adapter)` that skips the migration when the adapter was constructed against `DB_NAME_DEMO`. +2 SPA GREEN (1185 → 1187); StorageAdapter FINAL preserved; no new dependencies; CSP / vercel.json untouched; AIza scan still passes.

## What Was Built

### Task 1 — POL-CODE-01: GitHub repo visibility flip + PrivacyPage AI bullet honesty verification (no source commit; checkpoint:human-action)

**GitHub repository visibility:** flipped from private to public via GitHub Settings → Danger Zone → Change visibility. User completed the UI round-trip; orchestrator re-verified via anonymous REST API probe (no auth). Anonymous `Invoke-WebRequest https://api.github.com/repos/tech-taitan/AussieLedger` now returns 200 with:
- `private = False`
- `visibility = public`
- `license.spdx_id = Apache-2.0` (visible to anonymous users — open-source promise verifiable)
- `description = "Ledger to do your Aussie Accounting and Tax"` (user-chosen variant; differs from plan spec but functionally equivalent for open-source-promise visibility)
- `topics = (empty)` (user opted to skip the 7 topics; minor discoverability polish only)
- `homepage = https://aussie-ledger-theta.vercel.app` (Vercel default; differs from custom-domain `https://aussieledger.techtaitan.com` that README + PrivacyPage point at)

**The substantive v1.2-audit-RED finding is CLOSED:** the README link `https://github.com/tech-taitan/AussieLedger` and the PrivacyPage repo link no longer 404 for anonymous visitors. Apache 2.0 license tag is visible from the REST API to anonymous users, making the open-source promise verifiable from outside any authenticated session.

**PrivacyPage AI bullet honesty check:** **NO-OP** decision branch fired, exactly as VERIFICATION round 1 anticipated.

- Read of `src/components/PrivacyPage.tsx` lines 63-68 confirmed the shipped AI bullet reads:

  ```tsx
  <li data-testid="privacy-ai-bullet">
    AI features are not available on the public hosted version. Self-host
    with your own <code>GEMINI_API_KEY</code> on a local Express server
    to enable AI account-matching today. The public hosted build does not
    send data to Google.
  </li>
  ```

  The string `"CSP allowlist is already in place"` is NOT present. Wording is the already-honest variant Phase 14-2 shipped.

- Read of `src/components/__tests__/PrivacyPage.test.tsx` `VERBATIM_AI_BULLET` constant confirmed byte-for-byte alignment with the shipped source.
- `npm test -- src/components/__tests__/PrivacyPage.test.tsx` → 8 GREEN against unchanged source.
- `git diff src/components/PrivacyPage.tsx src/components/__tests__/PrivacyPage.test.tsx` (Plan-15-1-scope) — empty (no source-tree mutations attributable to Plan 15-1 Task 1).

**No commit produced for Task 1's code branch.** The repo flip itself is a GitHub Settings change, not a code change; the PrivacyPage branch is no-op-by-design (already-shipped honest). Plan 15-1 commit log starts at Task 2.

### Task 2 — POL-CODE-02: legacy-migration demo-DB guard (TDD RED + GREEN)

**RED commit `1e2a91b`** — `test(15-1): RED — legacy-migration demo-DB guard tests (POL-CODE-02)`

Created `src/storage/__tests__/legacy-migration-demo-guard.test.ts` (98 lines) — Apache 2.0 SPDX header + 2-test describe block:

- **Test 1 — `demo adapter skips legacy migration: demo DB stays empty AND legacy keys preserved`** (the FAIL-pre-guard test):
  Pre-populates all 4 legacy localStorage keys with valid JSON (1 entity in `ledger_entities_list`). Constructs `new LocalAdapter(DB_NAME_DEMO)`, awaits `ready()`. Asserts `(await demo.getEntities()).length === 0` and all 4 legacy keys still present byte-identical in localStorage.

- **Test 2 — `prod adapter still migrates (regression guard): entity migrated AND legacy keys cleared`** (the PASS-both-pre-and-post-guard regression test):
  Pre-populates all 4 legacy localStorage keys with 1 entity. Constructs `new LocalAdapter(DB_NAME_PROD)`, awaits `ready()`. Asserts `(await prod.getEntities()).length >= 1` and the entity's `name === 'Prod Co'` and all 4 legacy keys are null after migration.

- **fake-indexeddb cross-test isolation:** `beforeEach()` clears localStorage AND awaits `deleteDb(DB_NAME_PROD)` + `deleteDb(DB_NAME_DEMO)` via an inline Promise wrapper that resolves uniformly on `onsuccess` / `onerror` / `onblocked` so a stuck blocked state never wedges the suite.

**RED-state verified** before commit: Test 1 failed with `expected [ { _v: 1, id: 'e-legacy', …(13) } ] to have a length of +0 but got 1` (demo DB inherited the migration — guard not yet in place); Test 2 passed (prod path always migrated correctly). This is the expected RED shape — Test 1 locks the unimplemented contract; Test 2 is the regression guard locking the existing behaviour the guard MUST NOT regress.

**GREEN commit `f15cdae`** — `feat(15-1): guard legacy-migration against demo DB construction (POL-CODE-02)`

Modified `src/storage/legacy-migration.ts` (+12 / −1):

1. Import line widened — `import type { LocalAdapter } from './local';` → `import { DB_NAME_DEMO, type LocalAdapter } from './local';` (single import line; minimal diff).
2. File-level JSDoc extended with 6 new lines documenting the Phase 15 POL-CODE-02 guard alongside the existing Phase-11 silent-import notes. Names the test file for forward-reference.
3. 2-line early-return guard at the TOP of `migrateLegacyLocalStorage(adapter)`, BEFORE the existing `typeof localStorage === 'undefined'` check:

   ```typescript
   // Phase 15 POL-CODE-02 — demo DB never inherits legacy localStorage migration.
   if (adapter.getDbName() === DB_NAME_DEMO) return;
   ```

**GREEN-state verified** before commit:
- `npm test -- src/storage/__tests__/legacy-migration-demo-guard.test.ts` → 2 GREEN
- `npm test -- src/storage/__tests__/legacy-migration.test.ts` → 5 GREEN (regression — no Phase 11 contract broken)
- `npm test -- --run` (full SPA suite) → **1187 GREEN + 11 todo + 0 RED** (124 test files; +2 vs. pre-Plan-15-1 baseline of 1185)
- `npm run lint` → EXIT 0
- `npm run build` → EXIT 0 with `scan-aiza: OK — no Gemini key shapes in dist/`

## Test Count Delta

| Boundary                               | SPA GREEN | Todo | RED | Test files |
| -------------------------------------- | --------- | ---- | --- | ---------- |
| Pre-Plan-15-1 baseline (working tree)  | 1185      | 11   | 0   | 123        |
| Post Task 2 RED commit `1e2a91b`       | (1 RED expected — gate not asserted at full-suite scope) | — | 1 | 124 |
| Post Task 2 GREEN commit `f15cdae`     | **1187**  | 11   | 0   | 124        |

**Net delta this plan: +2 SPA GREEN** (1185 → 1187), matching the plan's success target of "1185 SPA GREEN baseline + 2 new legacy-migration-demo-guard tests."

**Baseline reconciliation note:** The original Phase 14 close-out reported 1183 SPA GREEN. The working tree at Plan 15-1 start showed 1185 — explained by `src/__tests__/privacy-boundary.test.ts` (3 tests) being untracked at plan-load time plus other in-flight v1.2-close-tail edits in the working tree. The +2 delta from Plan 15-1's own commits is correct relative to the working-tree baseline.

## Commits

| # | Hash      | Type     | Files                                                      | Co-Author |
| - | --------- | -------- | ---------------------------------------------------------- | --------- |
| 1 | `1e2a91b` | test     | src/storage/__tests__/legacy-migration-demo-guard.test.ts (NEW, +98 lines) | Claude Opus 4.7 |
| 2 | `f15cdae` | feat     | src/storage/legacy-migration.ts (MODIFIED, +12 / −1)       | Claude Opus 4.7 |
| 3 | (this commit) | docs | .planning/phases/15-code-polish/15-1-SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md | Claude Opus 4.7 |

Total: **2 source commits + 1 metadata commit = 3 commits** on `origin/main` from Plan 15-1.

## CI Verification

GitHub Actions run for `f15cdae` (the GREEN commit; HEAD of the push that combined RED + GREEN):

- **Run ID:** 26849440759
- **Status:** completed
- **Conclusion:** success
- **HTML URL:** https://github.com/tech-taitan/AussieLedger/actions/runs/26849440759
- **Created:** 2026-06-02T21:35:24Z
- **Updated:** 2026-06-02T21:37:14Z (~2-minute run)

Probed anonymously (no token) — possible because POL-CODE-01's repo-flip made the repo's Actions runs publicly readable. Previous v1.2 phases used the `git credential fill` + REST API pattern with auth; Plan 15-1 onward can use the simpler anonymous probe now that the repo is public.

## Architecture Invariants Verified

| # | Invariant                                                                  | Status | Evidence |
| - | -------------------------------------------------------------------------- | ------ | -------- |
| a | StorageAdapter interface FINAL (12 methods unchanged)                      | GREEN  | src/storage/adapter.ts untouched (not in files_modified); guard relies on Phase 14's duck-typed getDbName() accessor which is NOT on the interface |
| b | DisclaimerFooter Phase 01 verbatim copy preserved                          | GREEN  | src/components/shell/DisclaimerFooter.tsx untouched (not in files_modified) |
| c | PrivacyPage non-AI bullets byte-identical                                  | GREEN  | No PrivacyPage source change in Plan 15-1 (no-op branch fired) — VERBATIM_AI_BULLET constant matches shipped source byte-for-byte |
| d | No `new Date()` outside src/lib/period.ts (Phase 2 + Phase 11 lint)        | GREEN  | Neither modified file introduces timestamp logic; tests use fake-indexeddb existence checks, not timestamps |
| e | No new dependencies (no `npm install`)                                     | GREEN  | package.json untouched (not in files_modified); fake-indexeddb already in devDependencies |
| f | CSP / vercel.json unchanged                                                | GREEN  | vercel.json untouched (not in files_modified); CSP `connect-src 'self'` carried from v1.2-close |
| g | AIza scan still passes (build EXIT 0)                                      | GREEN  | `scan-aiza: OK — no Gemini key shapes in dist/` in build log |
| h | SPDX Apache-2.0 header on the one new source file                          | GREEN  | First 3 lines of legacy-migration-demo-guard.test.ts read `/**\n * @license\n * SPDX-License-Identifier: Apache-2.0` |
| i | Conventional Commits + Co-Authored-By                                      | GREEN  | Both source commits + this metadata commit follow `type(scope): subject` + Co-Authored-By footer |
| j | All Phase 15-VERIFICATION-flagged invariants preserved                     | GREEN  | All 10 invariants verified GREEN at checker round 1; Plan 15-1 executed against those locks |

**All 10 invariants: GREEN.**

## Deviations from Plan

### Auto-fixed Issues
None.

### Authentication Gates
- **GitHub Actions CI run probe via authenticated `git credential fill`**: blocked at the sandbox layer (`git credential fill` returned "User cancelled dialog" because no GUI credential helper available in this session; subsequent `gh` CLI probe also sandbox-denied). **Worked around without escalation** by using the anonymous public-repo Actions API path — possible because POL-CODE-01's repo-flip in this very plan made the repo's Actions runs publicly readable from REST. Captured the run ID, status, conclusion, and HTML URL via the anonymous probe. **Not a Rule-3 fix** (no source change); a Rule-3-equivalent procedural pivot enabled by the plan's own POL-CODE-01 outcome.

### Plan-Spec Acceptable-Variance Outcomes (logged for transparency; not deviations)

- **GitHub repo Description differs from plan spec.** User chose `"Ledger to do your Aussie Accounting and Tax"` instead of plan's `"Free Australian bookkeeping → tax return tool. Your data stays in your browser."`. Matter of taste; both honestly describe the project. Doesn't affect the v1.2-audit-RED closure (the audit RED was about the URL 404, not the description content). Accepted by orchestrator as Task 1 closure.
- **GitHub repo Topics empty.** Plan specified 7 topics (australia, tax, accounting, bookkeeping, open-source, react, typescript). User opted to skip. Discoverability polish only; doesn't gate POL-CODE-01 closure. Surface as v1.4 polish todo.
- **GitHub repo Homepage URL inconsistent with README/PrivacyPage.** Plan specified `https://aussieledger.techtaitan.com` (custom domain — what README + PrivacyPage point at). User kept `https://aussie-ledger-theta.vercel.app` (Vercel default). Minor inconsistency; surface as v1.4 polish todo. Doesn't gate POL-CODE-01 closure.

## Suggested v1.4 Polish Todo

**Align GitHub repo `homepage` URL with the custom domain.** Repo currently advertises `https://aussie-ledger-theta.vercel.app` (Vercel default) while README + PrivacyPage point users at `https://aussieledger.techtaitan.com` (custom domain). Both URLs serve the same SPA, but the inconsistency is visible to anyone browsing the GitHub repo. One-click fix in GitHub Settings → About → Website. Optional companion polish: backfill the 7 plan-spec Topics (australia, tax, accounting, bookkeeping, open-source, react, typescript) for discoverability. **Not a blocker for v1.3 close**; surface in v1.4 alongside any other repo-hygiene polish.

## Self-Check: PASSED

- File `src/storage/__tests__/legacy-migration-demo-guard.test.ts` — FOUND
- File `src/storage/legacy-migration.ts` — FOUND (guard line + import line + JSDoc extension present)
- Commit `1e2a91b` — FOUND on origin/main
- Commit `f15cdae` — FOUND on origin/main
- CI run `26849440759` — FOUND on github.com/tech-taitan/AussieLedger/actions, conclusion `success`
- Anonymous probe of `https://api.github.com/repos/tech-taitan/AussieLedger` returns 200 with `private: false`, `visibility: public`, license SPDX `Apache-2.0` — FOUND
- All 5 plan success criteria GREEN (POL-CODE-01 closed end-to-end + POL-CODE-02 closed end-to-end + 1187 SPA GREEN + zero PrivacyPage/legacy-migration regressions + all commits on origin/main)

Plan 15-1 closed; ready for Wave 2 (Plan 15-2 POL-CODE-03 + POL-CODE-04 + POL-CODE-05).
