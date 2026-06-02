---
phase: 10-public-build-ci-cd-to-cloudflare-pages
type: verification
verdict: PASS
verified_on: 2026-05-31
verifier: gsd-plan-checker
plans_reviewed:
  - 10-1-PLAN.md
  - 10-2-PLAN.md
blocker_count: 0
warning_count: 4
info_count: 5
---

# Phase 10 Plan Verification â€” public-build-ci-cd-to-cloudflare-pages

## Verdict: PASS (revision round 2)

**Both Round-1 blockers verified resolved by re-read of revised plans (2026-05-31). See Section 13 at the end of this document for the delta-only re-verification record.** All prior PASS findings (Sections 1-12) stand unchanged.

---

## Verdict (Round 1, superseded): REVISION-REQUIRED

Two correctable blockers prevent a PASS verdict. Neither requires architectural change â€” both are localised factual/wording fixes in Plan 10-1 Task 3 and an unsafe-by-default reading of the deploy if: gate in Plan 10-2 Task 2. Five additional improvements (warnings / info) are recommended but not blocking.

The plans' goal-backward derivation is otherwise sound: every locked CONTEXT decision has implementing task(s), no deferred ideas leak in, the dependency chain (10-1 â†’ 10-2) is correct, scope budget is well within thresholds (3 auto-tasks + 1 checkpoint per plan), and the static-vs-runtime split (config-only Wave-1, CI wiring Wave-2) matches the manual-prerequisite reality of Cloudflare account+token setup.

---

## 1. ROADMAP Success Criteria â€” Coverage

The 4 success criteria from ROADMAP.md Phase 10 (lines 107â€“111):

| # | Success Criterion (verbatim ROADMAP) | Status | Mapped To | Evidence |
|---|--------------------------------------|--------|-----------|----------|
| 1 | Navigating directly to https://<deploy-url>/journals from a fresh browser tab serves the SPA, not a 404 page â€” the _redirects /* /index.html 200 fallback is confirmed working in production | GREEN | Plan 10-1 Task 2 (creates public/_redirects) â†’ Plan 10-2 Task 2 (ships dist/ via upload-artifact + wrangler-action) â†’ Plan 10-2 Task 4 step 2 (manual deep-link smoke against aussieledger.pages.dev/journals) | Plan 10-2 must_haves.truth #6 verbatim; Task 4 step 2 'Open https://aussieledger.pages.dev/journals directly in a fresh browser tab' |
| 2 | Pushing a commit to main triggers .github/workflows/deploy.yml, which builds with VITE_HOSTED_MODE=true and deploys to Cloudflare Pages within the workflow run â€” no manual step required | AMBER | Plan 10-2 Task 2 (extends ci.yml, NOT a new deploy.yml) â€” CONTEXT decision (line 58) supersedes ROADMAP filename | The workflow file path differs from ROADMAP literal (deploy.yml vs ci.yml), but the BEHAVIOUR (push-to-main â†’ build with VITE_HOSTED_MODE=true â†’ deploy) is fully delivered by Plan 10-2 Task 2 production-deploy step (lines 296â€“303 in plan). See Discretion-Call Adjudication #1 below â€” accept the CONTEXT-driven choice; reconcile ROADMAP wording as a follow-up info item |
| 3 | The CI deploy workflow includes a post-build scan of dist/assets/ for AIza key-shaped strings; if any match is found, the build fails before deployment | GREEN | Plan 10-1 Task 3 (regex + fixture + unit test) â†’ Plan 10-2 Task 2 AIza scan step (lines 256â€“268 in plan) | Scan is grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ placed AFTER build, BEFORE upload-artifact â†’ needs: ci blocks deploy on scan failure. NOTE the plan widens scope from ROADMAP's dist/assets/ to all of dist/ â€” strictly better |
| 4 | The deployed SPA responds correctly to VITE_HOSTED_MODE=true: the /api/health probe is skipped on startup, and AiGateNote renders the hosted-mode copy (Settings navigation link, not the .env.local instruction) | AMBER | Plan 10-1 Task 1 (isHostedMode() helper) + Plan 10-2 Task 2 (VITE_HOSTED_MODE: 'true' in build env) = infrastructure delivered; /api/health skip + AiGateNote rewiring = Phase 12 (AI-01) work | The env-var pipeline is fully delivered: build env sets VITE_HOSTED_MODE: 'true', Vite bakes into bundle, isHostedMode() returns true at runtime. But 'the /api/health probe is skipped on startup' requires modifying the existing adapter-probe code (Phase 6 PERS-* surface) and AiGateNote (Phase 6 AI-gate component) â€” both belong to Phase 12 AI-01 per ROADMAP line 154. Plan 10-2 success_criteria block correctly flags this as 'partially satisfied' (lines 481â€“483) |

Coverage summary: 4/4 ROADMAP success criteria addressed; 2 GREEN, 2 AMBER (deferred-by-design with explicit acknowledgement in plan success_criteria block).


---

## 2. REQUIREMENTS.md â€” HOST-01 / HOST-02 / HOST-03 Clause-by-Clause

### HOST-01 (REQUIREMENTS.md line 15)

| Clause | Status | Mapped To |
|--------|--------|-----------|
| SPA hosted on Cloudflare Pages at a public URL | GREEN | Plan 10-2 Task 2 wrangler-action steps + Task 4 production verification |
| GitHub Actions auto-deploy on push to main | GREEN | Plan 10-2 Task 2 if: github.ref == 'refs/heads/main' && github.event_name == 'push' |
| Workflow file .github/workflows/deploy.yml | AMBER (filename divergence â€” CONTEXT supersedes) | Plan 10-2 extends ci.yml. CONTEXT line 21 locks 'extends ci.yml; does NOT create separate deploy.yml'. Behaviourally equivalent. ROADMAP wording is stale relative to CONTEXT |
| Using cloudflare/wrangler-action@v3 with command: pages deploy dist --project-name=aussieledger | GREEN | Plan 10-2 Task 2 lines 298â€“302 verbatim |
| _redirects file /* /index.html 200 for SPA route fallback | GREEN | Plan 10-1 Task 2 (locked content) + Plan 10-2 deploy ships dist/_redirects |
| _headers file with Content-Security-Policy setting connect-src 'self' https://generativelanguage.googleapis.com (defense against XSS-exfiltration of user-supplied API keys) | GREEN | Plan 10-1 Task 2 public/_headers content includes the exact connect-src directive; verified by Task 4 step 3 curl assertion |

### HOST-02 (REQUIREMENTS.md line 16)

| Clause | Status | Mapped To |
|--------|--------|-----------|
| Post-build CI step greps dist/ for AIza patterns (Gemini API key shape) | GREEN | Plan 10-2 Task 2 AIza scan step (after build, before upload-artifact). Plan WIDENS the scan from ROADMAP's dist/assets/ to all of dist/ â€” strictly safer |
| Fails the build if any match | GREEN | Shell logic 'if grep ...; then exit 1' (Plan 10-2 lines 263â€“268); failed CI step â†’ needs: ci blocks deploy |
| Defensive against the CVE-2023-46115 analog | GREEN | Plan 10-1 Task 1 explicitly documents the VITE_-prefix-secrets HARD-BLOCK in the env.ts module doc (lines 207â€“210 of Plan 10-1); regex pattern verified by __fixtures__/__tests__/aiza-regex.test.ts (8 REDâ†’GREEN tests) |
| Implemented as a step in the deploy workflow | GREEN | Plan 10-2 Task 2 â€” note: implemented as a step in the ci job (which BLOCKS the deploy job via needs:), not as a step inside the deploy job. Behaviourally equivalent and arguably better (CI fails fast before artifact upload) |

### HOST-03 (REQUIREMENTS.md line 17)

| Clause | Status | Mapped To |
|--------|--------|-----------|
| Build-time VITE_HOSTED_MODE flag (boolean) | GREEN | Plan 10-1 Task 1 isHostedMode() returns boolean; Plan 10-2 Task 2 sets VITE_HOSTED_MODE: 'true' (string) in build env; the helper's strict string-'true' check coerces correctly. NOTE: REQUIREMENTS says '(boolean)' but CONTEXT explicitly locks 'string, since shell env vars are strings' â€” the helper bridges the two correctly |
| Single source of truth; one import.meta.env.VITE_HOSTED_MODE check | GREEN | Plan 10-1 Task 1 places the ONLY import.meta.env.VITE_HOSTED_MODE read inside src/lib/env.ts isHostedMode(). Module doc explicitly states 'This module is the ONLY place that reads import.meta.env.VITE_HOSTED_MODE' |
| When true (hosted Cloudflare build), the SPA renders the user-supplied AI key UI (AI-01) and shows iOS Safari ITP disclosure (IDB-04) | AMBER (Phase 12 + Phase 11 consumes; out of scope here) | The isHostedMode() helper is consumable by Phase 11/12/14. Actual AI-key-UI render and ITP disclosure are Phase 12 (AI-01) and Phase 11 (IDB-04) respectively. Plan correctly defers |
| When false, SPA behaves as today | GREEN | The helper returns false for unset/'false'/empty/'1'/'TRUE'/boolean-true â€” verified by 7 REDâ†’GREEN unit tests in Plan 10-1 Task 1 |

Requirement coverage summary:
- HOST-01: 5/6 GREEN, 1 AMBER (filename â€” CONTEXT-supersedes-ROADMAP, see Discretion #1)
- HOST-02: 4/4 GREEN
- HOST-03: 3/4 GREEN, 1 AMBER (downstream-phase consumption, by-design deferral)

---

## 3. Invariant Audit (STATE.md Architecture Invariants)

| Invariant | Status | Notes |
|-----------|--------|-------|
| (a) No VITE_-prefixed env var for a secret | GREEN | Plan 10-2 Task 2 sets ONLY VITE_HOSTED_MODE (mode flag, not secret). Plan 10-1 env.ts module doc explicitly forbids VITE_-prefixed secrets and references PITFALLS Â§1. Plan 10-2 inline comment lines 246â€“247 reinforces 'NEVER add a VITE_-prefixed SECRET here'. Task 2 done block requires 'VITE_HOSTED_MODE is the only VITE_-prefixed env var in the CI environment' (Plan 10-2 line 475) |
| (b) StorageAdapter FINAL preserved | GREEN | Phase 10 touches ZERO adapter code. Plan 10-1 verification block (line 465) explicitly asserts 'StorageAdapter FINAL invariant preserved (this plan touches no adapter code)'. Plan 10-2 verification block (line 473) repeats the same assertion. files_modified lists contain only src/lib/env.ts, public/_*, __fixtures__/*, .github/workflows/ci.yml, README.md â€” none touch src/adapters/* |
| (c) No new Date() outside src/lib/period.ts | GREEN | Plan 10-1 Task 1 done block explicitly checks 'File contains ZERO occurrences of new Date() (env.ts is time-free)' (Plan 10-1 line 236). env.ts body has no time handling by construction. _redirects, _headers, YAML, Markdown, and the AIza fixture cannot contain new Date() |
| (d) SPDX header on new source files | GREEN | Plan 10-1 Task 1 action prescribes the EXACT SPDX header verbatim (@license / SPDX-License-Identifier: Apache-2.0) for src/lib/env.ts, copied from src/lib/persona.ts. Test files (*.test.ts) and fixture files (.txt) follow existing project convention of no SPDX header â€” verified consistent with existing src/lib/__tests__/* patterns |

Invariant audit: 4/4 GREEN, no violations.

---

## 4. HARD-BLOCK Pitfall Coverage (PITFALLS.md Â§1, Â§5, Â§6)

| Pitfall | Status | Mapped To |
|---------|--------|-----------|
| Â§1 â€” VITE_GEMINI_API_KEY accidentally set in CI ships to every user | GREEN | Defense-in-depth: (a) env.ts module doc documents the rule + cites PITFALLS Â§1; (b) Plan 10-2 ci.yml build-step env block contains ONLY VITE_HOSTED_MODE with a 'NEVER add a VITE_-prefixed SECRET here' comment; (c) post-build grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ blocks any leaked Gemini-shaped key; (d) regex shape verified by __fixtures__/__tests__/aiza-regex.test.ts (8 tests); (e) Plan 10-1 Task 3 verify step confirms ZERO false-positives against current secret-safe dist/ |
| Â§5 â€” SPA routing 404 via _redirects | GREEN | Plan 10-1 Task 2 creates public/_redirects with locked content /* /index.html 200. Plan 10-2 Task 4 step 2 verifies in production by navigating to aussieledger.pages.dev/journals directly. The /* pattern matches nested routes (PITFALLS Â§19 verification flag â€” locked by CONTEXT) |
| Â§6 â€” XSS exfil via CSP connect-src allowlist | GREEN | public/_headers Content-Security-Policy restricts connect-src to 'self' https://generativelanguage.googleapis.com (Plan 10-1 Task 2 done block line 304 explicitly asserts 'CSP connect-src allowlists ONLY self and https://generativelanguage.googleapis.com (no wildcards, no other origins)'). script-src 'self' ONLY (no unsafe-inline, no unsafe-eval); 'unsafe-inline' confined to style-src per Tailwind v4 requirement. Plan 10-2 Task 4 step 3 verifies in production via curl -sI | grep -i content-security-policy |

HARD-BLOCK pitfalls: 3/3 GREEN.


---

## 5. Blockers (Must Fix Before Execution)

### Blocker 1: Plan 10-1 Task 3 fixture string is 41 chars, not 39 â€” contradicts its own self-documentation

File: .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-1-PLAN.md
Lines: 363â€“376 (the Task 3 prescribed fixture content) and line 379 (the arithmetic verification claim)
Severity: blocker
Dimension: task_completeness (factual error in prescribed file content)

The defect:

The plan prescribes this synthetic-key line for __fixtures__/aiza-secret-leak.txt:

    AIzaSyDUMMY_SyntheticFixture_NotAReal-K3Y

Plan Task 3 action Step 2 (line 379) claims:
> 'MUST be exactly 39 characters: 4 chars AIza + 35 chars from the set [0-9A-Za-z_-]. Verify by counting: AIzaSyDUMMY_SyntheticFixture_NotAReal-K3Y â†’ AIza (4) + SyDUMMY_SyntheticFixture_NotAReal-K3Y (35) = 39 chars total. Confirmed.'

Empirical reality (verified with Node string.length):
- Total string length: 41 characters
- After AIza (4 chars), tail SyDUMMY_SyntheticFixture_NotAReal-K3Y is 37 characters, not 35
- [...fixture.matchAll(/AIza[0-9A-Za-z_-]{35}/g)] returns a single match of length 39: AIzaSyDUMMY_SyntheticFixture_NotAReal-K (truncated before 3Y)

Why this is a blocker (not a warning):
1. The fixture file's own embedded prose says '39 chars' â€” an executor following instructions literally will create a file whose self-description is factually wrong, which a future reader (or auditor) will flag as either a typo or evidence the fixture was hand-edited after creation.
2. Test 2 ('matched string is exactly 39 characters long') will PASS because the regex truncates correctly at 35 chars after AIza. But Test 7 ('DOES match the synthetic fixture string â€” the canonical positive case') has ambiguous semantics: .match() returns the 39-char match, NOT the full 41-char line.
3. More importantly: the discrepancy reveals the planner did not actually count the synthetic string before committing it to the plan. That increases the risk that other prescribed exact-content (CSP one-liner, _redirects content, YAML workflow file) has similar uncaught arithmetic.

Fix (one of):

Option A (recommended â€” keep prose 39-char claim, shorten the string by 2 chars):
Replace the synthetic line with a 39-char version, e.g.:

    AIzaSyDUMMY_SyntheticFixture_NotARealK

(verify: AIza 4 + SyDUMMY_SyntheticFixture_NotARealK = 4 + 35 = 39 â€” count letter-by-letter before commit)

Option B (acknowledge the line is 41 chars but only the first 39 form the matchable shape):
Update the prose to read 'Synthetic AIza-shape sequence (line is 41 chars; first 39 form the matchable key shape)' AND update Step 2 arithmetic accordingly AND update Test 2 to assert match[0].length === 39 explicitly (not fixture.length === 39).

Option A is cleaner â€” the fixture is human-readable and the documentation matches reality without explanatory caveats.

---

### Blocker 2: Plan 10-2 Task 2 â€” VITE_HOSTED_MODE unconditionally 'true' on every CI build contradicts env.ts module doc which describes 'true' as exclusively the production hosted build

File: .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-2-PLAN.md
Lines: 239â€“248 (Build step env block) AND 305â€“312 (PR preview deploy step)
Severity: blocker (semantic contradiction â€” silent wrong-mode rendering on every PR preview)
Dimension: context_compliance + key_links_planned

The defect:

Plan 10-2 sets VITE_HOSTED_MODE: 'true' unconditionally on the Build step (line 248). There is NO conditional gating.

Effect: every CI run â€” including PR builds against feature branches â€” produces a dist/ bundle where import.meta.env.VITE_HOSTED_MODE === 'true', so isHostedMode() returns true at runtime in the PR preview deploy.

This contradicts:
1. Plan 10-1 Task 1's env.ts module documentation (lines 199â€“202): 'VITE_HOSTED_MODE is a build-time STRING signal... true â†’ app is running on the public Cloudflare Pages deploy (no Express server); unset / false / anything else â†’ app is running self-hosted'. PR preview deploys at pr-{N}.aussieledger.pages.dev ARE Cloudflare Pages deploys, so arguably true IS correct there â€” BUT then the documentation language 'the public hosted build' needs to either widen to include PR previews OR the if: must gate VITE_HOSTED_MODE to push-to-main only.
2. Plan 10-2 Task 2 inline comment (lines 243â€“246): 'Safe to set on PR builds too (the artifact only gets DEPLOYED on push-to-main via the deploy job's if: guard); the PR preview deploy ships the same flag'. This comment is internally inconsistent: it claims 'the artifact only gets DEPLOYED on push-to-main' (FALSE â€” the plan EXPLICITLY adds a PR preview deploy step at lines 305â€“312 that runs wrangler pages deploy ... --branch=pr-{N}), and then immediately admits 'the PR preview deploy ships the same flag'. The comment hand-waves a contradiction rather than resolving it.
3. Phase 12 / 13 / 14 downstream consumption: when Phase 12 ships AiGateNote rendering different copy under isHostedMode(), and when Phase 13 ships PWA registration gated by isHostedMode(), and when Phase 14 ships iOS banner + /demo route guard gated by isHostedMode() â€” every PR preview will render those features as if it were the production hosted build. This is probably what we want for end-to-end PR review, but the helper's documentation needs to say so explicitly.

Why this is a blocker (not a warning):

The contradiction between env.ts's module doc ('the public Cloudflare Pages deploy') and the workflow's 'set on all builds' is the kind of subtle mismatch that produces 'works correctly but for wrong reasons' â€” a future contributor who reads the helper doc will be misled about when the helper returns true. Worse, if a maintainer later decides to gate VITE_HOSTED_MODE to push-to-main per the doc's literal wording, every PR preview's isHostedMode() flips to false, silently changing Phase 12/13/14 behaviour in preview without changing source code. That is a footgun.

Fix (one of):

Option A (recommended â€” make the always-on behaviour explicit and intentional):
1. Amend Plan 10-1 Task 1's env.ts module doc to read: 'true â†’ app is running on a Cloudflare Pages deploy (production at aussieledger.pages.dev OR a PR preview at pr-{N}.aussieledger.pages.dev)'
2. Amend Plan 10-2 Task 2's inline comment (lines 243â€“246) to read: 'Set on every CI build because every CI build's dist/ artifact gets DEPLOYED to Cloudflare Pages â€” production on push-to-main, PR preview on pull_request. Both contexts are hosted mode from the SPA perspective (no Express server, user-supplied AI key path, IDB ITP banner, etc.)'.
3. Optionally remove the misleading 'the artifact only gets DEPLOYED on push-to-main' sentence.

Option B (gate the env var to push-to-main only):
Change the Build step env block so VITE_HOSTED_MODE evaluates to 'true' only on push-to-main and 'false' otherwise. Tradeoff: PR previews render in self-host mode, which means PR reviewers cannot exercise the hosted-mode UI (Phase 12 AI key UI, Phase 14 iOS banner, etc.) in preview. This is the wrong tradeoff for a hosted-mode-first product.

Recommendation: Option A. Reconciles the doc with the (correct) workflow behaviour without changing either's runtime semantics.


---

## 6. Warnings (Should Fix)

### Warning 1: Plan 10-1 Task 1 unit-test pattern vi.stubEnv for import.meta.env.VITE_HOSTED_MODE â€” needs runtime validation

File: 10-1-PLAN.md
Lines: 171â€“187 (test implementation pattern in <behavior>)
Dimension: verification_derivation

vi.stubEnv() is the documented Vitest 2.x API for stubbing process.env.* AND import.meta.env.*. The plan says 'Confirmed working pattern in Vitest 2.x (the project pins ^2.1.9)'. This is a confident assertion but is not verified â€” Vitest's stubEnv writes to process.env and ALSO patches import.meta.env IFF Vite/Vitest are configured to share env state. With Vitest 2.1.9 + Vite 6.2.x in this project, it should work, but the failure mode if it doesn't is silent test passes (the stub mutates a different object than the helper reads).

Recommended fix: Add to Task 1 done block: 'Verify Test 1 (VITE_HOSTED_MODE === true â†’ returns true) by running ALONE first and observing GREEN â€” if RED, the stubEnv plumbing is broken and a different test pattern (e.g. dependency-injection helper that takes the env value as an argument) is required.'

### Warning 2: Plan 10-1 Task 2/3 <automated> verify uses test -f and grep -q (POSIX, not PowerShell)

File: 10-1-PLAN.md
Lines: 296 (Task 2 <automated>), 398 (Task 3 <automated>)
Dimension: task_completeness

The verify commands use POSIX shell utilities. The repository is on Windows 11 (per environment context) â€” test -f and grep -q are not available in default PowerShell, only in Bash via WSL/Git-Bash or by an explicit bash -c wrapper. Execute-plan will likely use the Bash tool which has these utilities, but if the executor runs it in PowerShell directly it fails.

Recommended fix: Either (a) prefix the verify with bash -c '...' to force POSIX shell, or (b) provide a PowerShell-equivalent alternative in a note. The executor can resolve, but flagging here so the planner is aware. Not a blocker because the gsd-tools Bash tool is POSIX.

### Warning 3: Plan 10-2 Task 2 <automated> verify uses Node string.includes â€” no YAML parse step

File: 10-2-PLAN.md
Lines: 338 (Task 2 <automated>)
Dimension: task_completeness

The verify is a Node string.includes() check for 11 required substrings. It does NOT parse the YAML â€” a malformed indent or stray colon that breaks YAML validity will pass this check. GitHub Actions will then reject the workflow at push time, which Task 4's prerequisite ('the most recent workflow run on main shows BOTH ci AND deploy jobs with green checkmarks') will catch â€” but only after a failed push.

Recommended fix: Add a YAML-parse step to the verify (python -c 'import yaml; yaml.safe_load(open(...))' is typically available in CI; alternatively js-yaml or yaml as a dev-only check). Or accept the current verify and rely on Task 4 to catch parse failures â€” planner's discretion. Flagging as warning, not blocker, because GitHub's own YAML rejection at push time IS effectively the canonical check.

### Warning 4: Plan 10-1 Task 4 checkpoint smoke is incomplete by design â€” clearly acknowledged but the AMBER acceptance bar is wide

File: 10-1-PLAN.md
Lines: 422 (the 'vite preview does NOT apply _headers natively' caveat)
Dimension: verification_derivation

The plan correctly acknowledges that vite preview does NOT serve _headers, so the smoke can only verify 'the APP runs cleanly against the CSP we WOULD send' â€” but with the CSP NOT actually applied by vite preview, the test reduces to 'the app renders in a browser at port 4173 without console errors'. That is a weak test (the production CSP could be entirely broken and the preview smoke would pass). This is unavoidable given the chosen stack â€” Cloudflare Pages is the only environment that honours _headers.

The plan handles this correctly by deferring the REAL CSP test to Plan 10-2 Task 4 step 3 (curl -sI ... | grep -i content-security-policy against the live production URL). The two-stage verification is sound: 10-1 catches trivial breakage; 10-2 catches the production CSP reality.

Flagging as warning, not blocker: The two-stage approach is correct but readers should not infer that a clean 10-1 Task 4 means the CSP works. The plan's <what-built> block (lines 422â€“423) is clear about this; consider adding to the resume-signal hint: 'approved means app renders, no broken JS â€” NOT CSP is verified; CSP verification is Plan 10-2 Task 4.'

---

## 7. Info / Suggestions (Non-Blocking)

### Info 1: Reconcile ROADMAP.md line 109 with CONTEXT-locked filename

ROADMAP says '.github/workflows/deploy.yml'; CONTEXT locks 'extends ci.yml; does NOT create separate deploy.yml'. After execution, ROADMAP wording should be updated to '.github/workflows/ci.yml (deploy job)' for accuracy. Not blocking; can be a post-execution housekeeping commit.

### Info 2: Plan 10-2 Task 2 PR-preview deploy slug uses pr-{github.event.number} â€” verify CF auto-cleanup

The naming produces pr-42 etc. Cloudflare Pages preview-branch behaviour is documented but the cleanup-on-PR-close semantics are not asserted by the plan. If CF doesn't auto-clean on PR close, stale preview branches accumulate. Verify post-deploy by closing the first PR and confirming the preview URL 404s.

### Info 3: Plan 10-2 Task 3 README section assumes the GitHub URL is tech-taitan/AussieLedger

Verified by inspection of the prescribed README text (Plan 10-2 line 187 references that URL in the Secrets path). Existing README.md does not currently include a GitHub URL, so this is the first introduction. If the repository ever moves orgs, this becomes stale. Acceptable for v1.2; flag for POL-04 (Phase 14) review.

### Info 4: X-Frame-Options: DENY + frame-ancestors 'none' are intentionally redundant

CONTEXT explicitly allows this (defense-in-depth, lines 32 + 70). securityheaders.com accepts both. Modern browsers honour frame-ancestors; legacy IE/Edge-Legacy honours XFO. The redundancy is correct.

### Info 5: Plan 10-2 has zero new unit tests â€” appropriate for this plan shape

The plan is workflow YAML + Markdown docs only. Unit tests for shell grep and YAML if: semantics would be high-cost / low-value. The 'tests' for Plan 10-2 are the live CI run (Task 4 step 1 verification) and the production smoke (Task 4 steps 2â€“5). This is the correct shape.


---

## 8. Discretion-Call Adjudication

The planner made 10 Claude-Discretion choices per CONTEXT lines 80-91. Adjudication:

| # | Discretion Choice | Plan Decision | Verdict |
|---|-------------------|---------------|---------|
| 1 | wrangler-action version pin | @v3 (major-pinned, latest minor floats) | OK - matches CONTEXT line 82 and STACK.md recommendation. Trade-off accepted: minor-version drift could break, but supply-chain risk of SHA-pinning is higher and unrelated to v1.2 scope |
| 2 | Exact AIza regex | AIza[0-9A-Za-z_-]{35} (39 chars total) | OK - matches the documented Google Gemini API key shape. Verified to (a) match the synthetic fixture, (b) NOT false-positive against current dist/, (c) reject 38-char prefixes |
| 3 | upload-artifact retention | Default 90 days | OK - explicitly allowed by CONTEXT. Acceptable for v1.2 cadence |
| 4 | Node version pin in deploy | Implicit - deploy job runs wrangler-action@v3 which provides its own Node; deploy job has NO setup-node step | OK - wrangler-action@v3 ships its own Node runtime; explicit setup-node would be redundant |
| 5 | workflow_run vs needs: | needs: ci (in-workflow) | OK - CONTEXT line 86 explicitly locks this |
| 6 | PR preview URL format | pr-{N}.aussieledger.pages.dev via --branch=pr-{github.event.number} | OK - matches CF default per CONTEXT line 87 |
| 7 | _headers placement | public/_headers (Vite auto-copy) | OK - CONTEXT line 88 allowed either; planner picked simpler. Vite v6 confirmed to copy _* files |
| 8 | isHostedMode() location | src/lib/env.ts (new file) | OK - Plan 10-1 places single read-site in one helper module, satisfying HOST-03 single source of truth clause |
| 9 | README section length | Concise (~ 25 lines) | OK - CONTEXT line 90 explicitly allowed concise vs detailed; planner correctly defers full rewrite to POL-04 (Phase 14) |
| 10 | Lint _headers syntax | No - relies on Cloudflare deploy-time validation + manual smoke | OK - CONTEXT line 91 explicitly allowed. Cloudflare validates at deploy; broken _headers would surface in Task 4 step 3 curl |

Two discretion calls the planner made that were NOT in the CONTEXT list but should be flagged:

| Extra # | Choice | Verdict |
|---------|--------|---------|
| E1 | Whether to add if-no-files-found: error on upload-artifact | GREEN - Plan 10-2 line 276 adds it. Defensive against future vite.config.ts regressions; cost-free; correct choice |
| E2 | Whether to add explicit permissions: block on the deploy job | GREEN - Plan 10-2 lines 285-288 add contents: read, deployments: write, pull-requests: write. Required for least-privilege GITHUB_TOKEN scope under modern GH Actions default-restrictive policy; correct choice |

No silently-incorrect discretion calls identified.

---

## 9. Dependency Chain Verification

Plan 10-1 frontmatter: wave: 1, depends_on: []
Plan 10-2 frontmatter: wave: 2, depends_on: [10-1]

Files produced by 10-1, consumed by 10-2:

| 10-1 produces | 10-2 consumes via |
|---------------|-------------------|
| src/lib/env.ts (isHostedMode()) | Setting VITE_HOSTED_MODE: true in ci.yml build env - helper read at SPA runtime; workflow does not import the file, but the helper MUST exist in source so the production build includes it |
| public/_redirects | Vite copies to dist/_redirects at build (step in ci job) -> uploaded to artifact -> deployed to Cloudflare |
| public/_headers | Same path as _redirects |
| __fixtures__/aiza-secret-leak.txt | NOT directly consumed by 10-2 CI scan (lives OUTSIDE dist/); but the regex shape proven by __fixtures__/__tests__/aiza-regex.test.ts IS the same regex 10-2 scan step uses - link is shape-verification, not file-consumption |
| __fixtures__/__tests__/aiza-regex.test.ts | Indirectly - proves the regex 10-2 uses is correct |

Dependency graph: VALID. No cycles, no forward references, wave numbers consistent with depends_on.

If Plan 10-2 runs without Plan 10-1 having shipped:
- src/lib/env.ts missing -> isHostedMode() symbol does not exist -> only matters when Phase 12 consumes it (Phase 10 itself does not import the helper anywhere - it just sets the env var)
- public/_redirects and public/_headers missing -> Vite produces a dist/ without those files -> Cloudflare deploys without SPA fallback or CSP -> HOST-01 fails at production smoke
- AIza fixture+test missing -> no regression in the CI scan (which scans dist/, not the fixture), but the regex shape is unproven

The depends_on: [10-1] correctly captures the SPA-functional dependency. The fixture dependency is shape-only and also correctly captured by ordering.

---

## 10. Scope Sanity

| Plan | Tasks | Files Modified | Wave | Notes |
|------|-------|----------------|------|-------|
| 10-1 | 4 (3 auto + 1 checkpoint) | 6 (3 source, 2 test, 1 fixture) | 1 | Within target. 4 tasks is borderline-warning per spec, but Task 4 is a checkpoint not a code task, so effective auto-task count is 3. GREEN |
| 10-2 | 4 (1 checkpoint + 2 auto + 1 checkpoint) | 2 (1 workflow YAML, 1 docs) | 2 | Within target. Effective auto-task count is 2. GREEN |

Total Phase 10 surface: ~8 distinct files. Well within scope budget.

---

## 11. Out-of-Scope Hygiene

| Phase | Feature | Plan 10 leakage? |
|-------|---------|------------------|
| Phase 11 | IDB-01..05 (persist, quota, backup-nag, ITP banner, beforeunload) | NO - Plan files contain no IDB-related task |
| Phase 12 | AI-01 (Settings AI key UI), AI-02 (callGeminiMatchAccounts) | NO - Plan files explicitly defer (Plan 10-2 lines 481-483: the actual /api/health skip + AiGateNote hosted-mode link are wired in Phase 12) |
| Phase 13 | PWA-01 (vite-plugin-pwa, manifest, SW) | NO - Plan 10-2 explicitly excludes Lighthouse step (Plan 10-2 line 329 - DO NOT add a Lighthouse CI step ... lives in Phase 13) |
| Phase 14 | HOST-04 (custom domain), POL-01..04 (first-visit UX, /demo route, /privacy, README rewrite) | NO - Plan 10-2 README section is explicitly concise; Try the live demo top-of-fold deferred; custom domain deferred (Plan 10-2 line 486) |

Out-of-scope hygiene: GREEN. No silent scope creep.

---

## 12. Final Summary

Overall verdict: REVISION-REQUIRED

Two correctable blockers; four warnings; five info items.

### What is right (90% of the plans)
- ROADMAP success criteria 1, 3 fully GREEN; criteria 2, 4 AMBER by design (CONTEXT-supersedes-ROADMAP filename; downstream-phase consumption respectively) with explicit acknowledgement
- HOST-01 (6 clauses), HOST-02 (4 clauses), HOST-03 (4 clauses) all addressed; only HOST-01 filename clause AMBER and HOST-03 downstream-render clause AMBER, both correctly so
- All 4 architecture invariants preserved (StorageAdapter FINAL, no VITE_ secret prefix, no new Date() outside period.ts, SPDX header on env.ts)
- All 3 HARD-BLOCK pitfalls (sec1 VITE_ leak, sec5 SPA 404, sec6 XSS CSP) covered defense-in-depth
- Dependency chain valid (10-1 -> 10-2); scope well within budget; no out-of-scope leakage
- Discretion calls all defensible; two extra defensive choices (if-no-files-found: error, explicit permissions: block) flagged GREEN

### What must be fixed
1. Blocker 1 - Plan 10-1 Task 3 prescribed fixture string is 41 chars but documented as 39. Fix: shorten the string by 2 chars OR amend the prose to say first 39 chars form the matchable shape; line is 41 chars. Recommended: shorten the string. File 10-1-PLAN.md lines 363-376, 379.
2. Blocker 2 - Plan 10-2 Task 2 sets VITE_HOSTED_MODE: true unconditionally on every CI build, but Plan 10-1 Task 1 env.ts module documentation describes the true value as exclusively the public Cloudflare Pages deploy. PR preview deploys also receive true (correct behaviour) but the helper doc misleads about when. Fix: amend env.ts module doc + Plan 10-2 inline comment to explicitly include PR previews as hosted mode. Files: 10-1-PLAN.md lines 196-211; 10-2-PLAN.md lines 243-246. Recommended Option A in sec5 Blocker 2.

### Recommendation to orchestrator

Return to planner with the two blockers above. After revision (which will be small - string shortening + a paragraph of documentation rewording), the verifier should re-check those specific deltas and PASS. The plans are otherwise execution-ready and the goal-backward derivation is sound.

Time to revise: estimated 5-10 minutes (no architectural change, no task restructure).

---

*Verified: 2026-05-31 by gsd-plan-checker*

---

## 13. Revision Round 2 â€” Delta Re-Verification (2026-05-31)

**Verdict: PASS.** Both Round-1 blockers verified resolved by inspection of the revised plan files. The four warnings and five info items from Round 1 stand as-is (none were in the revision scope and they remain non-blocking).

### Delta 1 â€” Blocker 1 (AIza fixture string) â€” RESOLVED

**File:** .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-1-PLAN.md
**Lines re-read:** 369-389
| Check | Result |
|-------|--------|
| (a) String exactly 39 chars | PASS â€” AIzaSyDUMMY_SyntheticFixture_NotAReal-K measured via Node returns length 39 |
| (b) Tail after AIza exactly 35 chars | PASS â€” tail SyDUMMY_SyntheticFixture_NotAReal-K measured 35 chars |
| (c) All tail chars match [0-9A-Za-z_-] | PASS â€” /^[0-9A-Za-z_-]+$/.test(tail) returns true |
| (d) Old 41-char string no longer appears in 10-1 | PASS â€” Grep tool returned No matches found for AIzaSyDUMMY_SyntheticFixture_NotAReal-K3Y |
| (e) Regex AIza[0-9A-Za-z_-]{35} matches the new string | PASS â€” match returns 39-char string identical to input |

The arithmetic claim at line 387 (AIza (4) + SyDUMMY_SyntheticFixture_NotAReal-K (35) = 39 chars total) is now factually correct. The line ends with an appended node-check confirmation, which removes any doubt for future readers.
### Delta 2 â€” Blocker 2 (env.ts doc + CI YAML comment reconciliation) â€” RESOLVED

**File 1:** 10-1-PLAN.md, lines re-read: 199-209
**File 2:** 10-2-PLAN.md, lines re-read: 242-254
| Check | Result |
|-------|--------|
| (a) env.ts doc explicitly mentions BOTH production deploys AND PR previews receive VITE_HOSTED_MODE=true | PASS â€” lines 200-205 read: true â†’ app was built by the project CI pipeline... This covers BOTH production deploys (push to main â†’ aussieledger.pages.dev) AND PR preview deploys (pull_request â†’ pr-{N}.aussieledger.pages.dev). Every CI-built artifact runs in hosted mode, by design â€” PR previews MUST exercise the hosted-mode code paths so reviewers can verify them before merge |
| (b) 10-2 YAML comment no longer claims the artifact only gets DEPLOYED on push-to-main | PASS â€” Round-1 misleading claim removed. New comment lines 244-251 explicitly state set unconditionally for ALL events (push AND pull_request) â€” both production deploys (push to main) AND PR preview deploys (pull_request â†’ pr-{N}.aussieledger.pages.dev) ship the SAME hosted-mode artifact. This is INTENTIONAL: PR previews must exercise the hosted-mode code paths |
| (c) Two files cross-reference each other so they do not drift | PASS â€” Plan 10-2 line 254 reads src/lib/env.ts module doc mirrors this contract â€” keep them in sync. Plan 10-1 env.ts module doc lines 211-213 lists Phase 12/13/14 consumers, establishing the helper as authoritative. The bidirectional pointer makes silent future drift detectable |
| (d) StorageAdapter runtime probe correctly described as separate from this build flag | PASS â€” env.ts doc lines 206-209 explicitly say unset / false / anything else â†’ app is running self-hosted (npm run dev, npm run dev:full, or a local npm run build && npm run preview without VITE_HOSTED_MODE in the build env). Express server may or may not be present; the StorageAdapter probe decides at runtime. The build-flag (compile-time) vs adapter-probe (runtime) separation is now explicit |
**Additional defensive line in 10-2 YAML comment (line 250-251):** If you ever need a self-host-shape PR preview, run npm run build locally without VITE_HOSTED_MODE in the env â€” do NOT branch this CI step. This pre-empts the Option-B temptation a future maintainer might have, locking the design decision in code-comment form.

### Final Summary

Both blockers resolved cleanly. No new issues introduced by the revision. The plans are now execution-ready.

**Recommendation to orchestrator:** Proceed to /gsd:execute-phase 10. Wave 1 (Plan 10-1) is parallel-safe with no other phase-10 work; Wave 2 (Plan 10-2) waits for 10-1 per the documented dependency.

---

*Re-verified (revision round 2): 2026-05-31 by gsd-plan-checker*
