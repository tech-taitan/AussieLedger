---
phase: 10-public-build-ci-cd-to-cloudflare-pages
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/env.ts
  - src/lib/__tests__/env.test.ts
  - public/_redirects
  - public/_headers
  - __fixtures__/aiza-secret-leak.txt
  - __fixtures__/__tests__/aiza-regex.test.ts
autonomous: true
requirements: [HOST-03]
tdd: true

must_haves:
  truths:
    - "isHostedMode() returns true when import.meta.env.VITE_HOSTED_MODE is the literal string 'true', false for anything else (unset, 'false', '1', undefined, true boolean)"
    - "Phase 12/13/14 code can import { isHostedMode } from 'src/lib/env' and call it without arguments"
    - "Vite copies public/_redirects to dist/_redirects unchanged at build time, so Cloudflare Pages serves /* /index.html 200 for SPA deep links"
    - "Vite copies public/_headers to dist/_headers unchanged at build time, so Cloudflare Pages applies the full security header set at the edge"
    - "Running `npm run build` followed by `npm run preview` and opening http://localhost:4173 in a browser shows the SPA with zero CSP-related console errors against the production CSP policy (manual smoke — verified by checkpoint Task 4)"
    - "__fixtures__/aiza-secret-leak.txt contains a synthetic AIza-shape string that matches the regex `AIza[0-9A-Za-z_-]{35}` — proving the Phase 10-2 CI scan would catch a real leak"
    - "__fixtures__/aiza-secret-leak.txt lives OUTSIDE dist/ so the Phase 10-2 CI scan never picks it up at scan-time (the fixture exists for unit-testing the regex, not for the CI scan itself)"
    - "Running `npm run build` against current main produces a dist/ directory whose contents contain ZERO matches for /AIza[0-9A-Za-z_-]{35}/ — proving the regex does not false-positive against the current secret-safe bundle"
  artifacts:
    - path: "src/lib/env.ts"
      provides: "isHostedMode() helper — single source of truth for the VITE_HOSTED_MODE build flag, consumed by Phase 12 (AiGateNote hosted link), Phase 13 (PWA registration gate), Phase 14 (iOS banner + /demo guard)"
      exports: ["isHostedMode"]
      contains: "import.meta.env.VITE_HOSTED_MODE"
    - path: "src/lib/__tests__/env.test.ts"
      provides: "Unit tests for isHostedMode() covering 'true' / 'false' / undefined / '' / true (boolean) / '1' / 'TRUE' cases"
      min_lines: 30
    - path: "public/_redirects"
      provides: "SPA route fallback for Cloudflare Pages — single line `/* /index.html 200` so deep links don't 404"
      contains: "/* /index.html 200"
    - path: "public/_headers"
      provides: "Cloudflare Pages edge headers — CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options applied to all paths"
      contains: "Content-Security-Policy"
    - path: "__fixtures__/aiza-secret-leak.txt"
      provides: "Synthetic Gemini-key-shape string for unit-testing the AIza regex pattern Phase 10-2 uses in CI — fixture exists OUTSIDE dist/ so CI scan never picks it up"
      min_lines: 1
    - path: "__fixtures__/__tests__/aiza-regex.test.ts"
      provides: "Unit test verifying the regex /AIza[0-9A-Za-z_-]{35}/ matches the synthetic fixture content AND does not match plausible non-key strings"
      min_lines: 20
  key_links:
    - from: "Phase 12/13/14 components"
      to: "src/lib/env.ts isHostedMode()"
      via: "named import: import { isHostedMode } from './lib/env'"
      pattern: "from ['\\\"].*lib/env['\\\"]"
    - from: "Vite build pipeline"
      to: "dist/_redirects + dist/_headers"
      via: "Vite auto-copies public/ contents into dist/ during `vite build`"
      pattern: "public/_(redirects|headers)"
    - from: "Phase 10-2 CI AIza scan step"
      to: "regex /AIza[0-9A-Za-z_-]{35}/"
      via: "shared regex shape verified by __fixtures__/__tests__/aiza-regex.test.ts unit test"
      pattern: "AIza\\[0-9A-Za-z_-\\]\\{35\\}"
---

<objective>
Land the four static config files Phase 10's CI/CD job needs to deploy a working SPA to Cloudflare Pages: (1) `src/lib/env.ts` with the `isHostedMode()` helper that downstream Phase 12/13/14 features depend on (HOST-03); (2) `public/_redirects` for SPA deep-link fallback (HOST-01 sub-requirement); (3) `public/_headers` with the full pragmatic-strict CSP + security header set (HOST-01 sub-requirement); (4) `__fixtures__/aiza-secret-leak.txt` synthetic Gemini-key fixture + regex unit test (HOST-02 sub-requirement — fixture lives outside dist/ so it exists for regex-shape verification only, not to be picked up by the CI scan).

Purpose: Self-contained config-only plan that lands all Wave-0 prerequisites the Phase 10-2 CI extension consumes. Runs in parallel with no other plan. Preserves v1.1 baseline of 983 SPA GREEN + 18 server GREEN + lint EXIT 0 + build EXIT 0.

Output: 4 new source files + 2 new test files. No existing source modified. The plan is gated by a manual `npm run build && npm run preview` smoke checkpoint that verifies the CSP policy doesn't break the app in a real browser.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

@vite.config.ts
@package.json
@src/lib/persona.ts
@src/lib/period.ts
@.github/workflows/ci.yml

<interfaces>
<!-- Key contracts the executor needs to use directly — no codebase exploration required. -->

From existing src/lib/persona.ts (SPDX header pattern — copy verbatim for src/lib/env.ts):
```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * {Module description}
 */
```

From vite.config.ts (current — DO NOT MODIFY in this plan):
```typescript
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```
The existing `define` block is correct and secret-safe. `VITE_HOSTED_MODE` does NOT need a `define` block — Vite auto-exposes any `VITE_`-prefixed env var via `import.meta.env.VITE_*` natively. This plan does not touch vite.config.ts.

From the v1.1 baseline (verified):
- 983 SPA GREEN + 11 todo + 0 RED
- 18 server GREEN
- `npm run lint` EXIT 0
- `npm run build` EXIT 0

CSP policy (locked in 10-CONTEXT.md — copy verbatim into public/_headers, INCLUDING the two-space indent under the `/*` rule):
```
/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
  X-Frame-Options: DENY
```

SPA fallback (locked in 10-CONTEXT.md — public/_redirects exact content, single line + trailing newline):
```
/* /index.html 200
```

AIza regex shape (locked in 10-CONTEXT.md):
```
AIza[0-9A-Za-z_-]{35}
```
- Total match length: 39 chars (4 + 35)
- Standard Gemini API key shape
- Used both by Phase 10-2 CI scan and by this plan's unit test fixture
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create src/lib/env.ts with isHostedMode() helper + unit tests (HOST-03)</name>
  <files>
    src/lib/env.ts (new),
    src/lib/__tests__/env.test.ts (new)
  </files>
  <read_first>
    - src/lib/persona.ts (SPDX header format + module-doc pattern — copy verbatim)
    - src/lib/period.ts (no `new Date()` invariant — env.ts has no time handling so naturally satisfied)
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (§ Decisions → "Single source of truth: `import.meta.env.VITE_HOSTED_MODE === 'true'` check; one helper function (e.g. `isHostedMode()`) in `src/lib/env.ts` consumed by Phase 12/13/14 code")
    - vite.config.ts (no modification needed — VITE_-prefixed vars auto-expose via import.meta.env)
  </read_first>
  <behavior>
    RED→GREEN test list (write these as `it()` blocks in src/lib/__tests__/env.test.ts, then implement to GREEN):

    **isHostedMode() — strict string-'true' check**
    - Test 1: When `import.meta.env.VITE_HOSTED_MODE === 'true'`, isHostedMode() returns `true`.
    - Test 2: When `import.meta.env.VITE_HOSTED_MODE === 'false'`, isHostedMode() returns `false`.
    - Test 3: When `import.meta.env.VITE_HOSTED_MODE === undefined`, isHostedMode() returns `false`.
    - Test 4: When `import.meta.env.VITE_HOSTED_MODE === ''` (empty string), isHostedMode() returns `false`.
    - Test 5: When `import.meta.env.VITE_HOSTED_MODE === '1'`, isHostedMode() returns `false` (only literal 'true' counts).
    - Test 6: When `import.meta.env.VITE_HOSTED_MODE === 'TRUE'` (uppercase), isHostedMode() returns `false` (case-sensitive — locked by CONTEXT's "string, since shell env vars are strings" decision).
    - Test 7: When `import.meta.env.VITE_HOSTED_MODE === true` (boolean literal, not string), isHostedMode() returns `false` (defensive — shell vars are always strings; a boolean indicates a misconfigured define block that shouldn't be tolerated).

    **Test implementation pattern** — Vitest supports `vi.stubEnv('VITE_HOSTED_MODE', value)`:
    ```typescript
    import { afterEach, describe, expect, it, vi } from 'vitest';
    import { isHostedMode } from '../env';

    describe('isHostedMode()', () => {
      afterEach(() => { vi.unstubAllEnvs(); });

      it("returns true when VITE_HOSTED_MODE === 'true'", () => {
        vi.stubEnv('VITE_HOSTED_MODE', 'true');
        expect(isHostedMode()).toBe(true);
      });
      // ... etc for tests 2-7
    });
    ```

    NOTE: `vi.stubEnv` works for any env var Vite exposes via import.meta.env. Confirmed working pattern in Vitest 2.x (the project pins ^2.1.9).
  </behavior>
  <action>
    Create `src/lib/env.ts` with this EXACT content:

    ```typescript
    /**
     * @license
     * SPDX-License-Identifier: Apache-2.0
     *
     * Build-flag helpers — single source of truth for VITE_HOSTED_MODE.
     *
     * VITE_HOSTED_MODE is a build-time STRING signal (shell env vars are strings):
     *   - 'true'  → app was built by the project CI pipeline (.github/workflows/ci.yml).
     *               This covers BOTH production deploys (push to main → aussieledger.pages.dev)
     *               AND PR preview deploys (pull_request → pr-{N}.aussieledger.pages.dev).
     *               Every CI-built artifact runs in hosted mode, by design — PR previews
     *               MUST exercise the hosted-mode code paths so reviewers can verify them
     *               before merge. Both deploys lack an Express server.
     *   - unset / 'false' / anything else → app is running self-hosted (`npm run dev`,
     *               `npm run dev:full`, or a local `npm run build && npm run preview` without
     *               VITE_HOSTED_MODE in the build env). Express server may or may not be
     *               present; the StorageAdapter probe decides at runtime.
     *
     * Consumed by Phase 12 (AiGateNote hosted-mode link), Phase 13 (PWA registration gate),
     * and Phase 14 (iOS Safari banner + /demo route guard). This module is the ONLY place
     * that reads `import.meta.env.VITE_HOSTED_MODE` — downstream code calls isHostedMode().
     *
     * VITE_HOSTED_MODE is the ONLY new VITE_-prefixed env var allowed in this project:
     * it is a mode flag, not a secret. Secrets MUST NEVER be VITE_-prefixed (see PITFALLS.md
     * §1 — VITE_ env-leak hard-block). The existing process.env.GEMINI_API_KEY pattern in
     * vite.config.ts is the secret-safe path for server-assisted builds.
     */

    /**
     * True when the app is running on the public hosted build (Cloudflare Pages).
     * Strict string-'true' check — defensive against boolean/non-string values.
     */
    export function isHostedMode(): boolean {
      return import.meta.env.VITE_HOSTED_MODE === 'true';
    }
    ```

    Create `src/lib/__tests__/env.test.ts` with all 7 tests above. Use `vi.stubEnv` + `vi.unstubAllEnvs` pattern as shown in behavior block.

    Do NOT modify vite.config.ts. Do NOT add VITE_HOSTED_MODE to any `define` block. Vite auto-exposes VITE_-prefixed env vars via `import.meta.env.*` without a define block. The existing vite.config.ts is correct as-is.

    Do NOT use `new Date()` anywhere in env.ts — this module has no time handling (structural lint invariant from Phase 2).

    Commit message: `feat(10-1): add isHostedMode() build-flag helper (HOST-03)`
  </action>
  <verify>
    <automated>npx vitest run src/lib/__tests__/env.test.ts --reporter=verbose</automated>
  </verify>
  <done>
    - File `src/lib/env.ts` exists with Apache 2.0 SPDX header and exports `isHostedMode()`
    - File contains the literal string `import.meta.env.VITE_HOSTED_MODE === 'true'`
    - File contains ZERO occurrences of `new Date()` (env.ts is time-free)
    - `npx vitest run src/lib/__tests__/env.test.ts` exits 0 with 7 GREEN tests
    - `npx vitest run` total SPA GREEN ≥ 990 (983 baseline + 7 new), ZERO RED
    - `npm run lint` exits 0 (`tsc --noEmit` clean)
    - `npm run build` exits 0 (no breakage)
  </done>
</task>

<task type="auto">
  <name>Task 2: Create public/_redirects and public/_headers static config files (HOST-01)</name>
  <files>
    public/_redirects (new — file plus parent directory),
    public/_headers (new)
  </files>
  <read_first>
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (§ In scope — exact CSP + full security header set; § Decisions → "_headers file as CSP delivery mechanism" + "Full security header set")
    - .planning/research/PITFALLS.md (§5 SPA routing 404 via _redirects; §6 XSS via CSP connect-src allowlist; §1 VITE_ env-leak HARD-BLOCK)
  </read_first>
  <action>
    **Step 1: Verify and create the `public/` directory.**

    The `public/` directory does NOT currently exist in the repo (verified at planning time). Create it first. On Windows PowerShell: `New-Item -ItemType Directory -Path public -Force`. On Unix-like shells: `mkdir -p public`.

    Vite handles a missing `public/` silently — creating it is required for this plan because Vite reads files from `public/` and copies them verbatim to `dist/` during `npm run build`.

    **Step 2: Create `public/_redirects` with this EXACT content (single line + trailing newline; no other content):**

    ```
    /* /index.html 200
    ```

    This is the locked content from 10-CONTEXT.md. Cloudflare Pages reads `dist/_redirects` after Vite copies it from `public/_redirects`. The `/*` pattern matches ALL unmatched paths (including nested SPA routes like `/journals/123` and `/reports/bas`); the `200` status code returns `index.html` with HTTP 200 so the SPA router can claim the route without the user seeing a 404 flash.

    **Step 3: Create `public/_headers` with this EXACT content (verbatim from CONTEXT — including the two-space indent under the `/*` rule, which is Cloudflare Pages syntax requirement):**

    ```
    /*
      Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
      Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
      X-Content-Type-Options: nosniff
      Referrer-Policy: strict-origin-when-cross-origin
      Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()
      X-Frame-Options: DENY
    ```

    DO NOT add a `Content-Security-Policy-Report-Only` variant (locked deferral in CONTEXT — no third-party report endpoint).

    DO NOT collapse the CSP into multiple lines — Cloudflare `_headers` syntax requires each header on a single line. The CSP policy MUST stay on ONE line (with `; ` between directives, NOT newlines).

    DO NOT change the `'unsafe-inline'` placement — it is `style-src` ONLY per CONTEXT (Tailwind v4 + motion library require inline `<style>` tags; `script-src 'self'` strict — no eval, no inline scripts; defense-in-depth against XSS-exfiltration of user-supplied API key per Phase 12 AI-01).

    DO NOT add `'unsafe-inline'` to `script-src` (would defeat the XSS defense and violate PITFALLS.md §6 HARD-BLOCK).

    **Step 4: Verify Vite copies the files to dist/.**

    Run `npm run build` from the repo root. Confirm `dist/_redirects` and `dist/_headers` exist after build with the same content as `public/_redirects` and `public/_headers`.

    Commit message: `feat(10-1): add Cloudflare Pages _redirects (SPA fallback) + _headers (CSP + security headers) (HOST-01)`
  </action>
  <verify>
    <automated>npm run build && test -f dist/_redirects && test -f dist/_headers && grep -q "/\* /index.html 200" dist/_redirects && grep -q "Content-Security-Policy: default-src 'none'" dist/_headers && grep -q "connect-src 'self' https://generativelanguage.googleapis.com" dist/_headers && grep -q "frame-ancestors 'none'" dist/_headers && grep -q "X-Frame-Options: DENY" dist/_headers && grep -q "Strict-Transport-Security: max-age=63072000" dist/_headers && echo OK</automated>
  </verify>
  <done>
    - Directory `public/` exists
    - File `public/_redirects` exists with EXACTLY the content `/* /index.html 200` (plus trailing newline)
    - File `public/_headers` exists with the full locked security header set (CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options)
    - `npm run build` exits 0
    - `dist/_redirects` and `dist/_headers` both exist post-build with identical content (verified by automated grep checks)
    - CSP `connect-src` allowlists ONLY `'self'` and `https://generativelanguage.googleapis.com` (no wildcards, no other origins)
    - CSP `script-src` is `'self'` ONLY (no `'unsafe-inline'`, no `'unsafe-eval'`, no external sources)
    - `'unsafe-inline'` appears ONLY in `style-src` (never in `script-src`)
    - `frame-ancestors 'none'` and `X-Frame-Options: DENY` both present (defense in depth — modern browsers honour CSP frame-ancestors; XFO is legacy fallback)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Create __fixtures__/aiza-secret-leak.txt synthetic fixture + regex unit test (HOST-02 prep)</name>
  <files>
    __fixtures__/aiza-secret-leak.txt (new — file plus parent directory),
    __fixtures__/__tests__/aiza-regex.test.ts (new)
  </files>
  <read_first>
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (§ Decisions → "AIza secret-leak scan placement" — exact command `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/`; § specifics → "AIza[0-9A-Za-z_-]{35} regex matches the standard Gemini API key shape (39 chars total starting AIza). Test fixture committed at __fixtures__/aiza-secret-leak.txt")
    - .planning/research/PITFALLS.md (§1 — VITE_ env-leak HARD-BLOCK with AIza regex; CVE-2023-46115 analog pattern; 2025-2026 real-world incidents — Truffle Security Nov 2025: 2,863 live Google API keys exposed in public JS bundles)
  </read_first>
  <behavior>
    RED→GREEN test list (write these in __fixtures__/__tests__/aiza-regex.test.ts, then create the fixture file to make tests GREEN):

    **Regex correctness — matches real Gemini key shape**
    - Test 1: Reading `__fixtures__/aiza-secret-leak.txt` and matching against `/AIza[0-9A-Za-z_-]{35}/` returns at least one match.
    - Test 2: The matched string is exactly 39 characters long.
    - Test 3: The matched string starts with the literal four characters `AIza`.

    **Regex false-positive avoidance — does not match plausible non-keys**
    - Test 4: Regex does NOT match the literal string `AIza` alone (too short).
    - Test 5: Regex does NOT match `AIza-12345` (too short — 10 chars total, needs 39).
    - Test 6: Regex does NOT match a 38-char string starting with AIza followed by 34 valid chars (off-by-one boundary check).
    - Test 7: Regex DOES match the synthetic fixture string (the canonical positive case).
    - Test 8: Regex does NOT match a 40-char string with one invalid character after position 39 (e.g. trailing `!` — verifies the regex is non-greedy at the boundary; note: bare regex without anchors would still match the valid 39-char prefix, which is the CORRECT behavior — assert that the match length is 39, not 40).

    **Test file pattern (read fixture from disk using Node's fs):**
    ```typescript
    import { readFileSync } from 'node:fs';
    import { join } from 'node:path';
    import { describe, expect, it } from 'vitest';

    const AIZA_REGEX = /AIza[0-9A-Za-z_-]{35}/;
    const FIXTURE_PATH = join(process.cwd(), '__fixtures__', 'aiza-secret-leak.txt');

    describe('AIza secret-leak regex (CI scan shape — used by Phase 10-2)', () => {
      const fixture = readFileSync(FIXTURE_PATH, 'utf8');

      it('matches the synthetic key shape in the fixture', () => {
        const match = fixture.match(AIZA_REGEX);
        expect(match).not.toBeNull();
      });
      // ... etc.
    });
    ```
  </behavior>
  <action>
    **Step 1: Verify and create the `__fixtures__/` directory.**

    The `__fixtures__/` directory does NOT currently exist (verified at planning time). Create it. PowerShell: `New-Item -ItemType Directory -Path __fixtures__/__tests__ -Force`. Unix: `mkdir -p __fixtures__/__tests__`.

    **Step 2: Create `__fixtures__/aiza-secret-leak.txt` with this EXACT content:**

    ```
    SYNTHETIC FIXTURE — NOT A REAL KEY. DO NOT USE.

    This file exists at the repo root (OUTSIDE dist/) so the Phase 10-2 CI
    AIza-scan step (`grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/`) never picks it
    up at scan-time. Its sole purpose is to give __fixtures__/__tests__/aiza-regex.test.ts
    a known-positive input so we can prove the regex shape would catch a real
    Gemini key leak. The string below is a randomly-generated AIza-shape
    sequence; it is NOT a valid Google API key and cannot authenticate against
    any Google service.

    Synthetic AIza-shape string (39 chars total, starts AIza, then 35 chars from [0-9A-Za-z_-]):
    AIzaSyDUMMY_SyntheticFixture_NotAReal-K
    ```

    **CRITICAL constraints:**
    - The synthetic key line MUST be exactly 39 characters: 4 chars `AIza` + 35 chars from the set `[0-9A-Za-z_-]`. Verify by counting: `AIzaSyDUMMY_SyntheticFixture_NotAReal-K` → `AIza` (4) + `SyDUMMY_SyntheticFixture_NotAReal-K` (35) = 39 chars total. Confirmed by node check: `AIzaSyDUMMY_SyntheticFixture_NotAReal-K`.length === 39 and matches /AIza[0-9A-Za-z_-]{35}/ with match length 39.
    - The synthetic string MUST NOT match any real Google API key shape pattern by accident. Using `DUMMY` + `Synthetic` + `NotAReal` markers in the middle ensures even a casual reader recognises it as a fixture.
    - The file MUST live at `__fixtures__/aiza-secret-leak.txt` at the REPO ROOT (NOT inside `src/`, NOT inside `dist/`, NOT inside `public/`). Verifiable: Phase 10-2's CI scan is `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/` — it walks `dist/` only. The fixture's location at `__fixtures__/` at repo root means it is never visited by that scan.

    **Step 3: Create `__fixtures__/__tests__/aiza-regex.test.ts` covering all 8 behaviour tests using the pattern shown in <behavior>.**

    **Step 4: Verify the regex does NOT false-positive against current `dist/`.**

    Run `npm run build` (already done in Task 2 verify). Then run:
    ```bash
    grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/
    ```
    Confirm exit code is 1 (no matches) — current `dist/` is clean because vite.config.ts is already secret-safe (uses `process.env.GEMINI_API_KEY` via `define` block, NOT a `VITE_`-prefixed variable, and the local `.env` typically has no `GEMINI_API_KEY` value during planning).

    This is the canonical no-false-positive proof. If the scan returns ANY matches against current `dist/`, STOP and investigate before proceeding — it would mean either (a) the regex pattern is too loose, (b) a real key has somehow already leaked into the bundle (unlikely given current vite.config.ts), or (c) the fixture has accidentally been included in the build (verify it lives in `__fixtures__/`, NOT `public/`).

    Commit message: `feat(10-1): add synthetic AIza fixture + regex unit test (HOST-02 prep)`
  </action>
  <verify>
    <automated>npx vitest run __fixtures__/__tests__/aiza-regex.test.ts --reporter=verbose && npm run build > /dev/null 2>&1 && ! grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && echo OK</automated>
  </verify>
  <done>
    - Directory `__fixtures__/__tests__/` exists at repo root
    - File `__fixtures__/aiza-secret-leak.txt` exists, contains a synthetic 39-char AIza-shape string, AND contains the markers `SYNTHETIC` / `DUMMY` / `NOT A REAL KEY` so it cannot be mistaken for a real leak by a human reviewer
    - File lives OUTSIDE `dist/`, `src/`, `public/`, and `server/` (verified by directory location)
    - `npx vitest run __fixtures__/__tests__/aiza-regex.test.ts` exits 0 with 8 GREEN tests
    - `npx vitest run` total SPA GREEN ≥ 998 (983 baseline + 7 from Task 1 + 8 from Task 3); ZERO RED
    - `npm run build` exits 0
    - Running `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/` against current main returns exit code 1 (NO MATCHES) — proving zero false-positives on the secret-safe baseline bundle
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Manual CSP smoke test — `npm run build && npm run preview` in a real browser</name>
  <what-built>
    Tasks 1-3 have created:
    - `src/lib/env.ts` with `isHostedMode()` helper + 7 unit tests
    - `public/_redirects` with `/* /index.html 200`
    - `public/_headers` with full pragmatic-strict CSP + security header set
    - `__fixtures__/aiza-secret-leak.txt` synthetic fixture + regex unit test

    What we cannot automate: confirming that the CSP policy in `public/_headers` does not break the SPA when actually served. CSP errors only surface in a real browser's DevTools console; Vitest cannot exercise the production-served HTML. This checkpoint catches obvious CSP breakage BEFORE Phase 10-2's CI deploys to the public Cloudflare Pages URL where it would be visible to users.

    NOTE: `vite preview` (Vite's static-file server) does NOT apply `_headers` natively — Cloudflare Pages is the only environment that honours that file. This smoke test verifies the APP runs cleanly against the CSP we WOULD send; it cannot verify Cloudflare actually applies the headers. That second verification is post-deploy and lives in Phase 10-2's checkpoint.
  </what-built>
  <how-to-verify>
    1. From the repo root, run `npm run build`. Confirm EXIT 0 and that `dist/_redirects` + `dist/_headers` were copied (Task 2's automated verify already proved this).

    2. Run `npm run preview`. Vite's preview server should start on `http://localhost:4173`.

    3. Open `http://localhost:4173` in Chrome or Firefox (NOT Safari — Safari's preview behaviour differs from production CSP handling enough that Safari smoke testing should happen post-deploy in Phase 10-2).

    4. Open the browser's DevTools (F12 or Cmd-Option-I). Click the **Console** tab.

    5. Reload the page once with DevTools open. Watch the console.

    6. **PASS condition:** Console shows ZERO red error messages mentioning `Content Security Policy`, `Refused to load`, `Refused to apply inline style`, `Refused to execute inline script`, or `violates the following Content Security Policy directive`.

    7. **PASS condition:** The AussieLedger UI renders fully (sidebar visible, content area visible, no blank-white-page). Tailwind styles are applied. The "Not tax advice" disclaimer is visible.

    8. **PASS condition:** Click around two or three navigation tabs (e.g. Journals, Trial Balance). Each route renders without console CSP errors.

    9. **FAIL condition — what to do:** If the console shows CSP-related errors, the most likely cause is the `style-src 'unsafe-inline'` rule not being applied (the `_headers` file is only honoured by Cloudflare Pages, not `vite preview`). In `vite preview`, the browser has NO CSP applied by default — so if you DO see CSP errors during preview, the source is more likely a `<meta http-equiv="Content-Security-Policy">` tag in `index.html` (which we should NOT have — verify with `grep -i "content-security-policy" index.html`; expected: zero matches).

       If there are no CSP errors but the UI is broken in some other way → that's a separate regression; investigate the specific failure.

       If CSP errors DO appear and you can't trace the source: do NOT approve. Type "issues" and describe the specific error messages; planner will revise the policy.

    10. After verification, stop the preview server (Ctrl-C).
  </how-to-verify>
  <resume-signal>Type "approved" (CSP smoke clean — app renders without console errors) or "issues: {specific console errors observed}"</resume-signal>
</task>

</tasks>

<verification>
After all 4 tasks complete and the checkpoint is approved:

- `npx vitest run` exits 0; total SPA GREEN ≥ 998 (983 baseline + 7 env tests + 8 fixture-regex tests); ZERO RED.
- `npx vitest run --config server/vitest.config.ts` exits 0; 18 server GREEN unchanged.
- `npm run lint` exits 0 (tsc --noEmit clean both SPA and server).
- `npm run build` exits 0; `dist/_redirects` and `dist/_headers` exist post-build with content matching `public/_redirects` and `public/_headers`.
- `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/` exits 1 (zero matches against current secret-safe build).
- Manual CSP smoke test in Task 4 passes — preview renders cleanly with no console CSP errors.
- `src/lib/env.ts` contains the literal `import.meta.env.VITE_HOSTED_MODE === 'true'` exactly once.
- `__fixtures__/aiza-secret-leak.txt` lives at repo root, NOT inside `dist/` or `public/`.
- StorageAdapter FINAL invariant preserved (this plan touches no adapter code).
- No `new Date()` calls anywhere in new code outside `src/lib/period.ts` (verified by inspection of new files — all four new source files are time-free).
</verification>

<success_criteria>
- HOST-03 partially satisfied: `isHostedMode()` helper exists and is consumable by Phase 12/13/14 code. (Full HOST-03 requires Phase 10-2 to set `VITE_HOSTED_MODE=true` in the CI deploy env; HOST-03 acceptance criterion "The deployed SPA responds correctly to VITE_HOSTED_MODE=true" cannot be fully verified until Phase 10-2 ships and the first deploy succeeds.)
- HOST-01 partially satisfied: the static-config-file half — `_redirects` and `_headers` exist in `public/` and are copied to `dist/` by Vite. (Full HOST-01 requires Phase 10-2 to actually deploy them; HOST-01 acceptance criteria 1, 3, and 4 from ROADMAP cannot be verified until then.)
- HOST-02 partially satisfied: regex shape verified by unit test + synthetic fixture committed. (Full HOST-02 requires Phase 10-2 to wire the scan into CI; HOST-02 acceptance criterion "Post-build CI step greps dist/ for AIza patterns" cannot be verified until Phase 10-2 ships.)
- This plan is INTENTIONALLY config-only and self-contained. Phase 10-2 will wire all four files into the CI deploy pipeline and complete the HOST-01/02/03 acceptance criteria end-to-end.
- v1.1 baseline preserved: 983 SPA GREEN baseline + 15 new tests → 998+ SPA GREEN total; 18 server GREEN unchanged; lint EXIT 0; build EXIT 0.

**Out of scope for this plan** (referenced from 10-CONTEXT.md `<deferred>` block):
- Custom domain (HOST-04 → Phase 14)
- Tag-based releases or `workflow_dispatch` triggers
- Automated CSP CI validation
- Lighthouse CI / performance budgets
- CSP `report-to` violation collection (would require a third-party endpoint, conflicts with no-third-party stance)
- Maximum-strict CSP with script nonces (incompatible with static host + Tailwind v4 inline styles)
- Wrangler as project devDependency
- Modifying vite.config.ts (the existing `process.env.GEMINI_API_KEY` define block is already secret-safe; VITE_-prefixed env vars auto-expose via `import.meta.env` without requiring a define block)
- Touching StorageAdapter (FINAL invariant — Phase 10 has zero adapter changes)
- Any time-handling code outside `src/lib/period.ts` (env.ts, _redirects, _headers, and the AIza fixture all are time-free by construction)
</success_criteria>

<output>
After completion, create `.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-1-SUMMARY.md`
</output>
