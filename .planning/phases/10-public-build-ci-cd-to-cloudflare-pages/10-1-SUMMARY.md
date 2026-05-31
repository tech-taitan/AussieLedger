---
phase: 10-public-build-ci-cd-to-cloudflare-pages
plan: 1
status: complete
subsystem: hosting,build-flags,csp,ci-prep
tags: [vite-hosted-mode, cloudflare-pages, csp, _redirects, _headers, aiza-scan, secret-leak-defense, host-03]
dependency_graph:
  requires: []
  provides: [HOST-03, HOST-01-static-files, HOST-02-regex-shape]
  affects: [src/lib/env.ts, src/lib/__tests__/env.test.ts, public/_redirects, public/_headers, __fixtures__/aiza-secret-leak.txt, __fixtures__/__tests__/aiza-regex.test.ts, tsconfig.json, vitest.config.ts]
tech_stack:
  added: []
  patterns: [import.meta.env strict-string equality, Vite public/ auto-copy to dist/, Cloudflare _headers + _redirects edge config, synthetic-fixture regex unit-testing, vi.stubEnv for VITE_-prefixed env vars]
key_files:
  created:
    - src/lib/env.ts
    - src/lib/__tests__/env.test.ts
    - public/_redirects
    - public/_headers
    - __fixtures__/aiza-secret-leak.txt
    - __fixtures__/__tests__/aiza-regex.test.ts
  modified:
    - tsconfig.json
    - vitest.config.ts
decisions:
  - "isHostedMode() uses strict === 'true' equality — defensive against trailing whitespace, 'TRUE', '1', empty string; only the literal string 'true' triggers hosted mode"
  - "env.ts module documentation explicitly covers BOTH production deploys (push-to-main → aussieledger.pages.dev) AND PR previews (pull_request → pr-{N}.aussieledger.pages.dev) — PR previews MUST run in hosted mode so reviewers can exercise the hosted-mode UI before merge"
  - "Build-flag (compile-time) vs StorageAdapter runtime probe explicitly separated in env.ts doc — VITE_HOSTED_MODE decides UI shape at build; adapter probe still decides Express vs Local at runtime regardless"
  - "vite/client added to tsconfig types[] — env.ts is the first import.meta.env consumer in the codebase; without the type ref, tsc --noEmit fails TS2339"
  - "vitest.config.ts include[] extended to also pick up __fixtures__/**/*.test.ts — fixture-adjacent regex tests are conceptually distinct from src/** code-under-test"
  - "public/_headers ships CSP with 'unsafe-inline' confined to style-src ONLY (Tailwind v4 + motion inline styles); script-src 'self' strict — no eval, no inline scripts; connect-src locked to self + generativelanguage.googleapis.com (Phase 12 AI-01 XSS-exfil defense)"
  - "X-Frame-Options: DENY intentionally redundant with CSP frame-ancestors 'none' — defense-in-depth for legacy browsers (per CONTEXT decision)"
  - "Synthetic AIza fixture string: AIzaSyDUMMY_SyntheticFixture_NotAReal-K (39 chars: 4 'AIza' + 35 matching [0-9A-Za-z_-]) with embedded SYNTHETIC/DUMMY/NOT-A-REAL-KEY markers; lives at repo root __fixtures__/ OUTSIDE dist/ so the Phase 10-2 CI grep never picks it up"
metrics:
  duration: "~30min (2026-05-31)"
  completed: "2026-05-31"
  tasks_completed: 4
  files_changed: 8
  tests_added: 15
  tests_total: 999
---

# Phase 10 Plan 1: Build Flag + Static Config Files Summary

**One-liner:** `isHostedMode()` build-flag helper with strict-string equality plus Cloudflare Pages `_redirects` SPA fallback + pragmatic-strict CSP `_headers` + synthetic AIza fixture proving the Phase 10-2 CI scan regex catches Gemini key leaks.

## What Was Built

### Task 1 — `src/lib/env.ts` with `isHostedMode()` helper + 7 unit tests (commit `7f5e3e0`)

Created `src/lib/env.ts` — the **single source of truth** for the `VITE_HOSTED_MODE` build flag. One exported function:

```typescript
export function isHostedMode(): boolean {
  return import.meta.env.VITE_HOSTED_MODE === 'true';
}
```

Apache 2.0 SPDX header verbatim from `src/lib/persona.ts`. Module-level doc explicitly covers:
- **Both** production deploys (push-to-main → `aussieledger.pages.dev`) **AND** PR previews (`pull_request` → `pr-{N}.aussieledger.pages.dev`) receive `VITE_HOSTED_MODE: 'true'` — every CI-built artifact runs in hosted mode by design (this reconciles the Round-1 blocker the checker flagged on the original CONTEXT decision)
- VITE_HOSTED_MODE is a build-time STRING signal (shell env vars are strings)
- Build-flag (compile-time) vs StorageAdapter runtime probe explicitly separated
- VITE_HOSTED_MODE is the ONLY new VITE_-prefixed env var allowed; secrets MUST NEVER be VITE_-prefixed (cites PITFALLS §1)
- Future consumers: Phase 12 (AiGateNote hosted-mode link), Phase 13 (PWA registration gate), Phase 14 (iOS Safari banner + /demo route guard)

7 unit tests in `src/lib/__tests__/env.test.ts` covering the strict-equality contract: `'true'` → true; `'false'` / `undefined` / `''` / `'1'` / `'TRUE'` / `'true '` (trailing whitespace) → false. Uses `vi.stubEnv` + `vi.unstubAllEnvs` (Vitest 2.1.9 pattern, confirmed working against `import.meta.env`).

### Task 2 — `public/_redirects` + `public/_headers` (commit `79b6668`)

Created the `public/` directory (Vite auto-copies its contents to `dist/` at build time).

**`public/_redirects`** — single line, locked content:
```
/* /index.html 200
```
Cloudflare Pages serves `index.html` (HTTP 200) for any unmatched path — SPA deep links like `/journals/123` and `/reports/bas` no longer 404 in production.

**`public/_headers`** — full pragmatic-strict security header set verbatim from CONTEXT:
- **CSP:** `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `'unsafe-inline'` confined to `style-src` ONLY (Tailwind v4 + motion library require inline `<style>` tags; low XSS risk)
  - `script-src 'self'` strict — no `eval`, no inline scripts (PITFALLS §6 HARD-BLOCK against XSS-exfiltration of user-supplied API key per Phase 12 AI-01)
  - `connect-src` allowlists ONLY `'self'` and `https://generativelanguage.googleapis.com` — no wildcards, no other origins
- **HSTS:** `max-age=63072000; includeSubDomains; preload` (preload-eligible)
- **`X-Content-Type-Options: nosniff`**
- **`Referrer-Policy: strict-origin-when-cross-origin`**
- **`Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`** (APIs the app never uses)
- **`X-Frame-Options: DENY`** (defense-in-depth with CSP `frame-ancestors 'none'`)

Build verification: `dist/_redirects` and `dist/_headers` both exist post-build with identical content to `public/`. Automated grep checks confirm all six required directives present in `dist/_headers`.

### Task 3 — `__fixtures__/aiza-secret-leak.txt` + regex unit test (commit `311c574`)

Created the `__fixtures__/__tests__/` directory tree at repo root (OUTSIDE `dist/`, `src/`, `public/`, `server/`) so the Phase 10-2 CI scan (`grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/`) never picks it up at scan-time.

**Fixture file** — synthetic Gemini-key-shape string with explicit SYNTHETIC/DUMMY/NOT-A-REAL-KEY markers and a documentary preamble explaining why it lives outside `dist/`. The match-eligible line:
```
AIzaSyDUMMY_SyntheticFixture_NotAReal-K
```
Exactly 39 chars: `AIza` (4) + `SyDUMMY_SyntheticFixture_NotAReal-K` (35 chars from `[0-9A-Za-z_-]`). Verified empirically via Node: `s.length === 39`, `s.match(/AIza[0-9A-Za-z_-]{35}/)[0] === s`.

**Regex test file** (`__fixtures__/__tests__/aiza-regex.test.ts`) — 8 tests:
- Positive matches (4): regex matches fixture; matched string is exactly 39 chars; starts with `AIza`; matches the canonical synthetic string verbatim
- Negative cases (4): bare `AIza` doesn't match; `AIza-12345` doesn't match (10 chars); 38-char string doesn't match (off-by-one boundary); 40-char string with trailing invalid char matches only its first 39-char valid prefix (non-greedy boundary behaviour)

**Production-side false-positive proof:** `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/` against the current secret-safe build returns exit code 1 (zero matches) — confirming the regex shape catches real leaks while never false-positiving on the current bundle.

### Task 4 — Manual CSP smoke test (checkpoint — user approved 2026-05-31)

Ran `npm run build` (EXIT 0) and `npm run preview` (background; bound `http://localhost:4173/`). User opened in browser, reloaded with DevTools open, clicked through nav tabs (Journals, Trial Balance), and confirmed:
- UI renders fully (sidebar, content area, "Not tax advice" disclaimer)
- Tailwind styles applied
- Zero `Content Security Policy` / `Refused to load` / `Refused to apply inline style` / `Refused to execute inline script` console errors

Reply: **`approved`**. Orchestrator killed the background preview process.

**Honest caveat documented in plan:** `vite preview` does NOT apply `_headers` natively — Cloudflare Pages is the only environment that honours that file. This smoke test verified the app renders cleanly; the **real** production CSP verification is Plan 10-2 Task 4 (curl `-sI https://aussieledger.pages.dev/` and grep for the CSP header against the live deploy).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `7f5e3e0` | feat(10-1): add isHostedMode() build-flag helper (HOST-03) |
| 2 | `79b6668` | feat(10-1): add Cloudflare Pages _redirects (SPA fallback) + _headers (CSP + security headers) (HOST-01) |
| 3 | `311c574` | feat(10-1): add synthetic AIza fixture + regex unit test (HOST-02 prep) |
| 4 | — | (checkpoint — manual smoke; no commit) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] `tsconfig.json` `types[]` missing `vite/client`**
- **Found during:** Task 1 lint
- **Issue:** `env.ts` is the first place in the codebase that touches `import.meta.env`. Without `"vite/client"` in `compilerOptions.types[]`, `tsc --noEmit` failed with `TS2339: Property 'env' does not exist on type 'ImportMeta'`.
- **Fix:** Added `"vite/client"` to the front of the types array in `tsconfig.json`. Lint now EXIT 0.
- **Files modified:** `tsconfig.json`
- **Commit:** `7f5e3e0` (folded into Task 1)

**2. [Rule 1 — Test premise invalid] env.test.ts Test 7 (boolean-literal case)**
- **Found during:** Task 1 GREEN run
- **Issue:** Plan's Test 7 asserted that passing a JS boolean `true` as `VITE_HOSTED_MODE` should yield `isHostedMode() === false`. Both `vi.stubEnv` AND direct mutation of `import.meta.env` coerce ALL non-string assignments to strings (verified empirically: `env.VITE_HOSTED_MODE = true` yields the string `'true'`; `= 42` yields `'42'`; `= null` yields `'null'`). A real boolean cannot reach the helper at runtime via any test-environment channel — Vite's `import.meta.env` proxy enforces this.
- **Fix:** Replaced Test 7 with a `'true '` (trailing-whitespace) defensive boundary test that still proves the strict `=== 'true'` equality rejects almost-true values. The runtime invariant (only the literal string `'true'` triggers hosted mode) is preserved; the failure mode being tested (stray whitespace from shell or YAML serialisation) is the realistic one.
- **Files modified:** `src/lib/__tests__/env.test.ts`
- **Commit:** `7f5e3e0` (folded into Task 1)

**3. [Rule 3 — Blocking] `vitest.config.ts` `test.include[]` excluded `__fixtures__/**`**
- **Found during:** Task 3 RED run
- **Issue:** Plan placed `aiza-regex.test.ts` at `__fixtures__/__tests__/` but the existing `vitest.config.ts` include pattern was `['src/**/*.{test,spec}.{ts,tsx}']` only. Running `npx vitest run __fixtures__/__tests__/aiza-regex.test.ts` returned `No test files found, exiting with code 1` — Vitest never discovered the file.
- **Fix:** Extended `test.include[]` to `['src/**/*.{test,spec}.{ts,tsx}', '__fixtures__/**/*.{test,spec}.{ts,tsx}']` so the fixture-adjacent regex test is picked up by `npm run test`. Now reports as `Test Files 103` (was 102).
- **Files modified:** `vitest.config.ts`
- **Commit:** `311c574` (folded into Task 3)

## Test Results

**Baseline (pre-Plan 10-1):** 983 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.

**Final (post-Plan 10-1):**
- **SPA: 999 GREEN** + 11 todo + 0 RED (+16 from baseline: 7 env.test.ts + 8 aiza-regex.test.ts + 1 unrelated drift)
- Server: 18 GREEN (unchanged — plan touches no server code)
- Lint: EXIT 0 (after `vite/client` types fix)
- Build: EXIT 0 (Vite, pre-existing chunk-size warning only)
- `dist/_redirects` + `dist/_headers` both exist post-build, content identical to `public/`
- `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/` → exit 1 (zero false-positives on current secret-safe bundle)

Plan `done` thresholds (≥ 990 after Task 1, ≥ 998 after Task 3) both satisfied with margin.

## Requirements Satisfied

| Req | Status | Notes |
|-----|--------|-------|
| **HOST-03** | **Complete** | `isHostedMode()` helper exists, strict-string-equality contract verified by 7 tests, build-flag handling entirely local — no CI/deploy infrastructure needed for the helper itself to function |
| HOST-01 | Pending (Plan 10-2) | `public/_redirects` + `public/_headers` files landed and verified copied to `dist/`, but require the Cloudflare Pages CI deploy job (Plan 10-2 Task 2) to actually ship them to a live URL. Acceptance criteria 1, 3, 4 (in-production behaviour) cannot be verified until Plan 10-2 ships |
| HOST-02 | Pending (Plan 10-2) | Regex shape proven by `aiza-regex.test.ts` + zero false-positives on current `dist/`; the actual CI scan step that runs at build time lives in Plan 10-2 Task 2 |

This split is the documented design: Plan 10-1 is config-only and self-contained (Wave 1); Plan 10-2 wires all four files into the CI deploy pipeline and completes HOST-01/02/03 acceptance criteria end-to-end (Wave 2, requires manual Cloudflare token prereq).

## Invariants Preserved

| Invariant | Status | Evidence |
|-----------|--------|----------|
| StorageAdapter FINAL | Preserved | Plan touches zero adapter code; `git diff` confirms only `src/lib/env.ts` added under `src/lib/` |
| No `VITE_`-prefixed secrets | Preserved | Only `VITE_HOSTED_MODE` added (mode flag, not a secret); env.ts module doc explicitly forbids VITE_-prefixed secrets and cites PITFALLS §1 |
| No `new Date()` outside `src/lib/period.ts` | Preserved | `env.ts` has no time handling by construction; `grep "new Date" src/lib/env.ts` returns zero matches |
| SPDX header on new source files | Preserved | `src/lib/env.ts` carries the verbatim Apache 2.0 SPDX header copied from `src/lib/persona.ts`; test file follows existing convention (4-line SPDX-only header) |

## Notes for Plan 10-2 (Wave 2)

Plan 10-2 should not need to revisit anything in Plan 10-1, but a few things are worth knowing:

1. **`tsconfig.json` now includes `"vite/client"`** in `types[]` — if 10-2 adds any TS code that touches `import.meta.env`, the types are already available. No further tsconfig changes needed.

2. **`vitest.config.ts` `test.include[]` now also covers `__fixtures__/**`** — if 10-2 adds more fixture-adjacent tests under `__fixtures__/`, they'll be auto-discovered.

3. **`public/_headers` is shipped to `dist/_headers` by Vite verbatim** — Plan 10-2's automated YAML-include check and Task 4 post-deploy curl smoke can rely on the CSP one-liner being byte-identical to what's in `public/_headers`.

4. **The AIza regex Plan 10-2 ships in `.github/workflows/ci.yml`** MUST be byte-identical to the regex in `__fixtures__/__tests__/aiza-regex.test.ts` line 19 (`/AIza[0-9A-Za-z_-]{35}/`). If 10-2 needs to widen or change the regex, update the test file in lockstep.

5. **`VITE_HOSTED_MODE` env-block placement** — Plan 10-2 must put `env: VITE_HOSTED_MODE: 'true'` on the **Build step** of `ci.yml`, NOT on the deploy job (which runs after the artifact is already built and serves only to ship `dist/`). The env.ts module doc and Plan 10-2's inline YAML comment both lock this contract.

6. **The Round-1 blocker the checker raised** (whether env.ts doc says "hosted" means only push-to-main or also PR previews) is resolved in this plan's `env.ts` module doc: **both** are hosted mode, by design. Plan 10-2's CI YAML comment should mirror this contract per the checker's recommendation (see CONTEXT-locked Option A from §13 of `10-VERIFICATION.md`).

## Open Questions / Follow-ups

None for Plan 10-1 itself.

For the broader Phase 10 wrap-up (after Plan 10-2 ships):
- ROADMAP.md line 109 references `.github/workflows/deploy.yml` but CONTEXT locks `extends ci.yml; does NOT create separate deploy.yml`. After Plan 10-2 lands, consider a housekeeping commit to update ROADMAP wording to `.github/workflows/ci.yml (deploy job)`. (Info-1 from `10-VERIFICATION.md` §7.)

---

## Self-Check: PASSED

Files verified to exist:
- `src/lib/env.ts`: FOUND
- `src/lib/__tests__/env.test.ts`: FOUND
- `public/_redirects`: FOUND
- `public/_headers`: FOUND
- `__fixtures__/aiza-secret-leak.txt`: FOUND (outside `dist/`, `src/`, `public/`, `server/`)
- `__fixtures__/__tests__/aiza-regex.test.ts`: FOUND
- `tsconfig.json`: FOUND (modified)
- `vitest.config.ts`: FOUND (modified)

Commits verified (git log):
- `7f5e3e0` feat(10-1): add isHostedMode() build-flag helper (HOST-03): FOUND
- `79b6668` feat(10-1): add Cloudflare Pages _redirects + _headers (HOST-01): FOUND
- `311c574` feat(10-1): add synthetic AIza fixture + regex unit test (HOST-02 prep): FOUND

Build artifacts verified:
- `dist/_redirects` content: `/* /index.html 200`: FOUND
- `dist/_headers` content: full security header set: FOUND
- `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/`: exit 1 (zero matches): FOUND

Test counts verified:
- `npx vitest run src/lib/__tests__/env.test.ts`: 7 GREEN: FOUND
- `npx vitest run __fixtures__/__tests__/aiza-regex.test.ts`: 8 GREEN: FOUND
- `npm run test -- --run`: 999 GREEN + 11 todo + 0 RED: FOUND
- `npm run lint`: EXIT 0: FOUND
- `npm run build`: EXIT 0: FOUND
