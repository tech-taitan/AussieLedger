---
phase: 10-public-build-ci-cd-to-cloudflare-pages
plan: 2
type: execute
wave: 2
depends_on: [10-1]
files_modified:
  - .github/workflows/ci.yml
  - README.md
autonomous: false
requirements: [HOST-01, HOST-02, HOST-03]
tdd: false

must_haves:
  truths:
    - "Pushing a commit to main triggers .github/workflows/ci.yml; the existing `ci` job builds + lints + tests; a new `deploy` job (gated on `needs: ci` + `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`) runs after CI passes and deploys dist/ to Cloudflare Pages within the workflow run — no manual step required (HOST-01 acceptance criterion 2)"
    - "The CI job widens to include a post-build AIza scan step (`grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && exit 1 || true`) placed AFTER `npm run build` and BEFORE the artifact upload — failing scan fails CI and blocks deploy (HOST-02 acceptance criterion)"
    - "The CI job uploads dist/ via actions/upload-artifact@v4 after the scan passes; the deploy job downloads dist/ via actions/download-artifact@v4 as its first step — the deploy ships the exact bytes CI tested (no rebuild in deploy)"
    - "Deploy job sets `env: VITE_HOSTED_MODE: 'true'` BEFORE the build step of the CI job (since the artifact passed to deploy is the build output) — this means the build step in `ci` job has `VITE_HOSTED_MODE: 'true'` set when running on push-to-main, so the bundled SPA reads `import.meta.env.VITE_HOSTED_MODE === 'true'` and isHostedMode() returns true at runtime (HOST-03 acceptance criterion 4)"
    - "On every PR (`pull_request` event), a separate preview deploy runs via `wrangler pages deploy --branch=pr-{N}` producing `pr-{N}.aussieledger.pages.dev` URL; Cloudflare auto-cleans up when PR closes"
    - "Navigating directly to `https://aussieledger.pages.dev/journals` from a fresh browser tab serves the SPA, not a 404 page — the `_redirects` `/* /index.html 200` fallback (created by 10-1) is confirmed working in production (HOST-01 acceptance criterion 1)"
    - "Running `curl -sI https://aussieledger.pages.dev` returns a 200 response containing the `Content-Security-Policy` header with `connect-src 'self' https://generativelanguage.googleapis.com` — confirms Cloudflare is applying `_headers` at the edge (HOST-01 acceptance criterion 3)"
    - "README.md gains a concise 'Self-host your own deploy' section documenting the Cloudflare Pages prerequisite, the two GitHub Secrets names (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID), and a one-line pointer to .github/workflows/ci.yml. Not a full README rewrite (that's POL-04 in Phase 14)"
  artifacts:
    - path: ".github/workflows/ci.yml"
      provides: "Single workflow file with existing `ci` job widened (AIza scan + upload-artifact + VITE_HOSTED_MODE in build env on push-to-main) AND a new `deploy` job that downloads the artifact and deploys via cloudflare/wrangler-action@v3"
      contains: "cloudflare/wrangler-action"
    - path: "README.md"
      provides: "New 'Self-host your own deploy' section after the existing self-host docs — concise (≤ 30 lines), documents Cloudflare Pages prerequisite, secret names, workflow file path. Not the full README rewrite (POL-04, Phase 14)"
      contains: "Self-host your own deploy"
  key_links:
    - from: ".github/workflows/ci.yml ci job — AIza scan step"
      to: "regex /AIza[0-9A-Za-z_-]{35}/ (verified by Plan 10-1's __fixtures__/__tests__/aiza-regex.test.ts)"
      via: "bash step: `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && exit 1 || true`"
      pattern: "AIza\\[0-9A-Za-z_-\\]\\{35\\}"
    - from: ".github/workflows/ci.yml ci job — upload-artifact step"
      to: ".github/workflows/ci.yml deploy job — download-artifact step"
      via: "actions/upload-artifact@v4 with `name: dist` (in ci) + actions/download-artifact@v4 with `name: dist` + `path: dist` (in deploy)"
      pattern: "actions/(upload|download)-artifact@v4"
    - from: ".github/workflows/ci.yml deploy job — wrangler-action step"
      to: "Cloudflare Pages project `aussieledger`"
      via: "cloudflare/wrangler-action@v3 with `command: pages deploy dist --project-name=aussieledger` + apiToken=secrets.CLOUDFLARE_API_TOKEN + accountId=secrets.CLOUDFLARE_ACCOUNT_ID"
      pattern: "wrangler-action@v3"
    - from: ".github/workflows/ci.yml ci job — build step env"
      to: "src/lib/env.ts isHostedMode() returning true at runtime"
      via: "VITE_HOSTED_MODE: 'true' set in env block of build step (so Vite bakes the value into import.meta.env at compile time)"
      pattern: "VITE_HOSTED_MODE"
    - from: "public/_redirects + public/_headers (Plan 10-1 outputs)"
      to: "Cloudflare Pages edge applying SPA fallback + CSP headers"
      via: "Vite copies public/ → dist/ at build; deploy job ships dist/ verbatim; Cloudflare reads _redirects + _headers at edge"
      pattern: "_(redirects|headers)"
---

<objective>
Wire Plan 10-1's static config files into the CI deploy pipeline and ship the first public production deploy to `https://aussieledger.pages.dev`. Extends the existing `.github/workflows/ci.yml` (does NOT create a separate workflow file — locked in CONTEXT) with: (a) post-build AIza secret-leak scan (HOST-02), (b) `actions/upload-artifact@v4` for `dist/`, (c) `VITE_HOSTED_MODE: 'true'` env on the build step when running on push-to-main, (d) new `deploy` job using `cloudflare/wrangler-action@v3` that downloads the artifact and runs `pages deploy dist --project-name=aussieledger` (HOST-01). Also adds PR preview deploys (`wrangler pages deploy --branch=pr-{N}`). Concise "Self-host your own deploy" README section follows.

Purpose: Land the deploy pipeline that delivers v1.2's first user-visible artifact — the live SPA at `aussieledger.pages.dev`. Closes HOST-01 / HOST-02 / HOST-03 end-to-end (subject to the post-deploy checkpoint passing).

Output: One file modified (`.github/workflows/ci.yml`) + one section added to `README.md`. After this plan, every push to main auto-deploys; every PR gets a preview URL; any future contributor who accidentally sets `VITE_GEMINI_API_KEY` in CI gets blocked by the AIza scan.

**Manual prerequisites the USER must complete BEFORE running this plan (NOT planner tasks — flagged here for visibility):**
1. User generates a fine-grained Cloudflare API token at `dash.cloudflare.com/profile/api-tokens` → "Create Custom Token" → permissions `Account > Cloudflare Pages > Edit` + `Account > Account Settings > Read` + Zone Resources restricted to the `aussieledger` project.
2. User adds two secrets to GitHub repo Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_API_TOKEN` (the token from step 1)
   - `CLOUDFLARE_ACCOUNT_ID` (from Cloudflare dashboard right sidebar)
3. User confirms the Cloudflare Pages project named `aussieledger` exists in the dashboard (per CONTEXT, project is pre-created — no Cloudflare-side creation task).

The plan's Task 3 checkpoint will pause and confirm all three are done before allowing the first deploy to fire.
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
@.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-1-build-flag-and-static-config-files.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

@.github/workflows/ci.yml
@vite.config.ts
@package.json
@README.md

<interfaces>
<!-- Concrete contracts for the executor — no codebase exploration needed. -->

Existing `.github/workflows/ci.yml` (32 lines — verified at planning time, this is what we EXTEND, not replace):
```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Type check (lint)
        run: npm run lint

      - name: Test (with coverage in logs)
        run: npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text
```

Cloudflare wrangler-action@v3 invocation shape (locked in 10-CONTEXT.md + STACK.md research):
```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/wrangler-action@v3
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    command: pages deploy dist --project-name=aussieledger
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

Files Plan 10-1 created that this plan consumes (DO NOT MODIFY — they are already shipped by Wave 1):
- `src/lib/env.ts` — isHostedMode() helper. Phase 10-2 needs `VITE_HOSTED_MODE=true` in build env so the bundled value reads as 'true' at runtime.
- `public/_redirects` — Vite copies to dist/_redirects; Cloudflare applies SPA fallback.
- `public/_headers` — Vite copies to dist/_headers; Cloudflare applies CSP + security headers.
- `__fixtures__/aiza-secret-leak.txt` — lives OUTSIDE dist/, never scanned. Exists for unit-test verification only.
- `__fixtures__/__tests__/aiza-regex.test.ts` — verifies the regex shape this plan's CI scan uses.

AIza scan command (locked in 10-CONTEXT.md — placement: in `ci` job, AFTER `npm run build`, BEFORE `upload-artifact`):
```bash
grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && exit 1 || true
```
The shell logic: `grep ... && exit 1` runs `exit 1` ONLY if grep found a match (exit 0). `|| true` makes the step exit 0 if grep found NO match (grep returns exit 1 for no-match — which we want to mean "scan clean"). The result: step fails iff a real AIza-shape string is in dist/.

PR preview deploy job condition + branch-name pattern (per CONTEXT decisions):
```yaml
if: github.event_name == 'pull_request'
# wrangler command for PR:
command: pages deploy dist --project-name=aussieledger --branch=pr-${{ github.event.number }}
```

actions/upload-artifact@v4 + download-artifact@v4 contracts:
- Upload uses `name: dist` + `path: dist` + default 90-day retention (per CONTEXT Claude's Discretion: default is fine).
- Download uses `name: dist` + `path: dist` (extracts back into dist/ at the deploy job's working directory).
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: User confirms Cloudflare prerequisites are in place</name>
  <what-needed>
    Three setup items only the user can do (Cloudflare dashboard + GitHub repo settings — no CLI/API available to Claude for these without already having the token we are creating):

    1. **Fine-grained Cloudflare API token created.**
       - Visit `https://dash.cloudflare.com/profile/api-tokens`
       - Click "Create Token" → "Create Custom Token"
       - Token name: `aussieledger-pages-deploy` (or any descriptive name)
       - Permissions:
         - `Account` > `Cloudflare Pages` > `Edit`
         - `Account` > `Account Settings` > `Read`
       - Account Resources: Include → `<your account>` (the one that owns the `aussieledger` Pages project)
       - Zone Resources: leave as default (Pages doesn't need zone access)
       - TTL: leave as default (no expiry) OR set if your security policy requires rotation
       - Click "Continue to summary" → "Create Token"
       - Copy the token value (shown ONCE — if you navigate away, you must regenerate)

    2. **Two GitHub Secrets added** at `https://github.com/tech-taitan/AussieLedger/settings/secrets/actions`:
       - `CLOUDFLARE_API_TOKEN` — value from step 1
       - `CLOUDFLARE_ACCOUNT_ID` — visible in the right sidebar of any page in your Cloudflare dashboard (a 32-char hex string)

    3. **Cloudflare Pages project `aussieledger` exists.**
       - Per 10-CONTEXT.md, the project is pre-created. Verify at `https://dash.cloudflare.com/<account-id>/pages` — you should see a project named exactly `aussieledger` (lowercase, no spaces). Default URL: `https://aussieledger.pages.dev`.
       - If the project does NOT exist: in the Pages dashboard, click "Create application" → "Pages" → "Upload assets" → name it exactly `aussieledger` → upload a placeholder (a single `index.html` containing "hello" is fine — the first real deploy from CI will overwrite it). Direct-upload mode (not git-connected) is correct since GitHub Actions handles the trigger.

    Why this checkpoint exists: the deploy will fail with an authentication error if any of the three are missing. Pausing here saves a failed CI run + investigation cycle.
  </what-needed>
  <resume-signal>Type "ready" (token created + both secrets added + project confirmed) or "skip" (defer the actual deploy — proceed with workflow file changes but expect the first deploy attempt to fail until secrets are added)</resume-signal>
</task>

<task type="auto">
  <name>Task 2: Extend .github/workflows/ci.yml — widen ci job + add deploy job (HOST-01, HOST-02, HOST-03)</name>
  <files>
    .github/workflows/ci.yml
  </files>
  <read_first>
    - .github/workflows/ci.yml (current 32-line file — full content shown in <interfaces> above)
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (§ In scope — full deploy job specification; § Decisions → all four sub-decision groups; § Claude's Discretion → Node 20 pin, wrangler-action v3 minor)
    - .planning/research/STACK.md §2 (Complete `.github/workflows/deploy.yml` skeleton — NOTE: that skeleton is for a SEPARATE deploy file; CONTEXT supersedes it with the locked decision to EXTEND ci.yml)
    - .planning/research/PITFALLS.md §1 (VITE_ env-leak HARD-BLOCK) + §5 (SPA routing 404) + §6 (CSP connect-src XSS defense) + §19 (Cloudflare base URL — `/` is correct for `aussieledger.pages.dev`, no Vite base config change)
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-1-build-flag-and-static-config-files.md (Plan 10-1 — confirms `public/_redirects` + `public/_headers` + `src/lib/env.ts` already exist by Wave 1)
  </read_first>
  <action>
    **Replace `.github/workflows/ci.yml` with this EXACT content** (preserves the existing `ci` job structure verbatim plus the four locked additions: VITE_HOSTED_MODE env on build, AIza scan step, upload-artifact step, and the new `deploy` job):

    ```yaml
    name: CI

    on:
      push:
        branches: [main]
      pull_request:
        branches: [main]

    jobs:
      ci:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4

          - name: Setup Node.js
            uses: actions/setup-node@v4
            with:
              node-version: '20'
              cache: 'npm'

          - name: Install dependencies
            run: npm ci

          - name: Build
            run: npm run build
            env:
              # VITE_HOSTED_MODE=true on every CI build so the artifact uploaded here
              # AND consumed by the deploy job has isHostedMode() === true at runtime.
              # IMPORTANT: this flag is set unconditionally for ALL events (push AND
              # pull_request) — both production deploys (push to main) AND PR preview
              # deploys (pull_request → pr-{N}.aussieledger.pages.dev) ship the SAME
              # hosted-mode artifact. This is INTENTIONAL: PR previews must exercise the
              # hosted-mode code paths (AiGateNote hosted link, /api/health probe skip,
              # iOS banner, /demo guard) so reviewers can verify hosted behaviour before
              # merge. If you ever need a self-host-shape PR preview, run `npm run build`
              # locally without VITE_HOSTED_MODE in the env — do NOT branch this CI step.
              # NEVER add a VITE_-prefixed SECRET here — only VITE_HOSTED_MODE (mode flag, not secret).
              # See .planning/research/PITFALLS.md §1 — VITE_ env-leak HARD-BLOCK.
              # src/lib/env.ts module doc mirrors this contract — keep them in sync.
              VITE_HOSTED_MODE: 'true'

          - name: Type check (lint)
            run: npm run lint

          - name: Test (with coverage in logs)
            run: npx vitest run --reporter=verbose --coverage.enabled --coverage.provider=v8 --coverage.reporter=text

          - name: Scan dist/ for accidentally-leaked Gemini API keys (HOST-02)
            # Defensive: any contributor who accidentally sets VITE_GEMINI_API_KEY would have
            # the key baked into dist/. This scan blocks the artifact upload + deploy if so.
            # Pattern: standard Gemini key shape — 'AIza' + 35 chars from [0-9A-Za-z_-] = 39 chars.
            # Regex verified by __fixtures__/__tests__/aiza-regex.test.ts (Plan 10-1).
            # See .planning/research/PITFALLS.md §1 + 10-CONTEXT.md "AIza secret-leak scan placement".
            run: |
              if grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/; then
                echo "::error::AIza-shape string found in dist/ — possible Gemini API key leak. Build blocked."
                exit 1
              else
                echo "AIza scan clean — no Gemini-key-shape strings in dist/."
              fi

          - name: Upload dist/ artifact for deploy job
            uses: actions/upload-artifact@v4
            with:
              name: dist
              path: dist
              # Default 90-day retention is fine for our cadence (CONTEXT Claude's Discretion).
              if-no-files-found: error

      deploy:
        name: Deploy to Cloudflare Pages
        needs: ci
        runs-on: ubuntu-latest
        # Run on every PR (preview) and on push-to-main (production).
        # PR previews use --branch=pr-{N}; main deploys use the project's production branch.
        if: github.event_name == 'push' || github.event_name == 'pull_request'
        permissions:
          contents: read
          deployments: write
          pull-requests: write   # so wrangler can comment the preview URL on the PR
        steps:
          - name: Download dist/ artifact from ci job
            uses: actions/download-artifact@v4
            with:
              name: dist
              path: dist

          - name: Deploy to Cloudflare Pages (production)
            if: github.ref == 'refs/heads/main' && github.event_name == 'push'
            uses: cloudflare/wrangler-action@v3
            with:
              apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
              accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
              command: pages deploy dist --project-name=aussieledger
              gitHubToken: ${{ secrets.GITHUB_TOKEN }}

          - name: Deploy to Cloudflare Pages (PR preview)
            if: github.event_name == 'pull_request'
            uses: cloudflare/wrangler-action@v3
            with:
              apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
              accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
              command: pages deploy dist --project-name=aussieledger --branch=pr-${{ github.event.number }}
              gitHubToken: ${{ secrets.GITHUB_TOKEN }}
    ```

    **Critical structural notes the executor must NOT change:**

    1. **AIza scan placement.** The scan step lives in the `ci` job, AFTER `Build`/`Test`, BEFORE `Upload dist/ artifact`. This ordering guarantees: (a) the scan runs against the same `dist/` that gets uploaded, and (b) a failed scan blocks both the artifact upload AND the deploy job (because `deploy` has `needs: ci` — any CI step failure causes the whole `ci` job to fail, which prevents `deploy` from starting).

    2. **`VITE_HOSTED_MODE: 'true'` in build env.** Set ONLY on the `Build` step, as a string `'true'` (NOT bare `true` — YAML would parse that as boolean and Vite would expose `true` not `'true'`, breaking isHostedMode()'s strict string check). Setting it at the build step makes it visible to `vite build`; the value is then baked into the bundle via `import.meta.env.VITE_HOSTED_MODE`.

    3. **`needs: ci` on the deploy job.** A single-line directive but it is the entire gating mechanism. Without it, the deploy job would run in parallel with ci and could ship an unbuilt/untested artifact. With it, deploy can only run after ci's last step succeeds.

    4. **Two separate `wrangler-action` steps for production vs PR preview.** This is the simplest readable pattern given the `--branch` flag differs. An alternative would be a single step with conditional command construction — readability wins.

    5. **`if-no-files-found: error` on upload-artifact.** Defensive: if the build silently produces zero artifacts (e.g. a future vite.config.ts regression that misnames the output dir), upload would silently succeed with nothing and deploy would fail mysteriously. `error` makes the failure explicit at upload time.

    6. **DO NOT add `workflow_dispatch:` triggers.** Locked in CONTEXT — every push to main auto-deploys; no manual hotfix path needed for v1.2 (acceptable risk given the 983-test CI gate).

    7. **DO NOT add a `Lighthouse CI` step.** Locked in CONTEXT — PWA Lighthouse audit lives in Phase 13 (PWA-01); Phase 10 doesn't need it.

    8. **DO NOT add a post-deploy `curl` health check step in the workflow itself.** CONTEXT defers automated post-deploy validation to the manual securityheaders.com smoke (Task 3 checkpoint). A `curl -f` health check that runs in the same workflow would race against Cloudflare's edge propagation (typically 5-30 sec for first deploy); the manual smoke gives time to propagate.

    9. **DO NOT use `pin-by-sha` or `pin-action` for the third-party actions.** Standard `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `cloudflare/wrangler-action@v3` is the pattern matching the existing ci.yml style. Pinning to SHAs is a supply-chain-attack mitigation worth considering separately; CONTEXT does not require it for v1.2.

    Commit message: `feat(10-2): extend ci.yml with AIza scan + artifact + Cloudflare Pages deploy (HOST-01, HOST-02, HOST-03)`
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const y=fs.readFileSync('.github/workflows/ci.yml','utf8');const must=['VITE_HOSTED_MODE',\"'true'\",'cloudflare/wrangler-action@v3','pages deploy dist --project-name=aussieledger','needs: ci',\"AIza[0-9A-Za-z_-]{35}\",'actions/upload-artifact@v4','actions/download-artifact@v4',\"refs/heads/main\",'pull_request','--branch=pr-'];const missing=must.filter(s=>!y.includes(s));if(missing.length){console.error('MISSING:',missing);process.exit(1)}console.log('All required strings present')"</automated>
  </verify>
  <done>
    - `.github/workflows/ci.yml` contains all required substrings (verified by automated check above): `VITE_HOSTED_MODE`, literal `'true'`, `cloudflare/wrangler-action@v3`, `pages deploy dist --project-name=aussieledger`, `needs: ci`, the AIza regex `AIza[0-9A-Za-z_-]{35}`, `actions/upload-artifact@v4`, `actions/download-artifact@v4`, `refs/heads/main`, `pull_request`, `--branch=pr-`
    - YAML parses cleanly (verifiable by viewing the file in a YAML linter or by GitHub showing the workflow in the Actions tab after push)
    - AIza scan step is positioned AFTER the build step AND AFTER the test step but BEFORE the upload-artifact step (so failed scan blocks both upload and downstream deploy)
    - `VITE_HOSTED_MODE: 'true'` (string literal, quoted) is set ONLY on the Build step's env block (NOT job-level, NOT on other steps)
    - Two separate `wrangler-action@v3` steps exist — one gated by `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, the other by `if: github.event_name == 'pull_request'`
    - The `deploy` job has `needs: ci` and the `permissions:` block includes `deployments: write` and `pull-requests: write`
    - No `workflow_dispatch:` trigger added (locked deferral)
    - No Lighthouse step added (Phase 13)
  </done>
</task>

<task type="auto">
  <name>Task 3: Add concise "Self-host your own deploy" section to README.md</name>
  <files>
    README.md
  </files>
  <read_first>
    - README.md (existing content — find a logical insertion point near the existing self-host / clone-and-run docs)
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (§ In scope — "README addition: 'Self-host your own deploy' section documenting the Cloudflare Pages prerequisite, secret names, and the workflow file location. Not the full hosting-mode README rewrite (that's POL-04 in Phase 14); just the deploy infra reference")
    - .planning/REQUIREMENTS.md POL-04 (the FULL README rewrite — explicitly DEFERRED to Phase 14; do NOT do that work here)
  </read_first>
  <action>
    **Step 1: Read README.md and identify a logical insertion point.**

    Look for an existing section near where self-hosting / clone-and-run is documented (likely under a "## Self-host" or "## Development" or similar heading). Insert the new section AFTER the existing self-host content but BEFORE the "License" / footer area.

    If no obvious section exists (README is currently minimal), append a new section at the end (BEFORE the license footer).

    **Step 2: Insert this EXACT content as a new section** (concise — ≤ 30 lines per CONTEXT decision; full audience-first README rewrite is POL-04 in Phase 14):

    ```markdown
    ## Self-host your own deploy

    The repo's CI/CD pipeline auto-deploys every push to `main` to Cloudflare Pages at `https://aussieledger.pages.dev`. If you want to fork the repo and deploy your own instance to your own Cloudflare account, you need three things:

    1. **A Cloudflare Pages project** named `aussieledger` (or rename it and update `--project-name=` in `.github/workflows/ci.yml`). Create it in the [Cloudflare Pages dashboard](https://dash.cloudflare.com) → "Create application" → "Pages" → "Upload assets" (direct-upload mode; not git-connected — GitHub Actions handles the trigger).

    2. **A fine-grained Cloudflare API token** scoped to the Pages project. Create at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → "Create Custom Token" with permissions `Account > Cloudflare Pages > Edit` + `Account > Account Settings > Read`.

    3. **Two GitHub Secrets** on your fork (Settings → Secrets and variables → Actions):
       - `CLOUDFLARE_API_TOKEN` — the token from step 2
       - `CLOUDFLARE_ACCOUNT_ID` — visible in the Cloudflare dashboard's right sidebar

    After that, push to `main` and watch the `deploy` job in `.github/workflows/ci.yml` ship to your `<your-project>.pages.dev` URL. Pull requests get separate preview deploys at `pr-{N}.<your-project>.pages.dev`.

    The pipeline includes a defensive `AIza` scan that blocks any build where a Gemini API key shape ends up in `dist/` — see [PITFALLS.md §1](./.planning/research/PITFALLS.md) for the security rationale. Never set `VITE_GEMINI_API_KEY` (or any `VITE_`-prefixed secret) in your CI environment.
    ```

    **Step 3: Verify line count.**

    The new section should be ≤ 30 lines (excluding blank lines around the heading). Per CONTEXT, this is a concise reference, not the full README rewrite (POL-04 in Phase 14 does the audience-first restructure).

    **DO NOT:**
    - Rewrite existing README sections (out of scope; POL-04)
    - Add a `## Try the live demo` top-of-fold section (out of scope; POL-04 ships that after Phase 14's custom domain decision)
    - Add screenshots or marketing copy (out of scope; POL-04)
    - Add a `.env.local` instructions update (the existing GEMINI_API_KEY self-host instructions are correct as-is; user-supplied AI key path is Phase 12's AI-01 work)

    Commit message: `docs(10-2): add concise Self-host your own deploy section to README`
  </action>
  <verify>
    <automated>grep -q "Self-host your own deploy" README.md && grep -q "CLOUDFLARE_API_TOKEN" README.md && grep -q "CLOUDFLARE_ACCOUNT_ID" README.md && grep -q "aussieledger.pages.dev" README.md && grep -q "AIza" README.md && grep -q "VITE_GEMINI_API_KEY" README.md && echo OK</automated>
  </verify>
  <done>
    - README.md contains a new `## Self-host your own deploy` heading
    - Section mentions: Cloudflare Pages project name (`aussieledger`), token creation URL, both secret names (CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID), workflow file path (`.github/workflows/ci.yml`), the AIza scan defense, and the `VITE_GEMINI_API_KEY` anti-pattern warning
    - Section is ≤ 30 content lines (concise reference, not full rewrite)
    - No other README sections modified (POL-04 scope preserved)
    - No `## Try the live demo` top-of-fold section added (Phase 14 scope)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 4: Post-deploy verification — confirm production deploy + CSP + SPA routing + security grade</name>
  <what-built>
    Tasks 1-3 have:
    - Confirmed user prerequisites are in place (Cloudflare token + GH Secrets + project)
    - Extended `.github/workflows/ci.yml` with the AIza scan + artifact upload + Cloudflare deploy job (production push-to-main + PR preview)
    - Added a concise "Self-host your own deploy" README section

    What we cannot fully automate:
    - Whether the deploy actually succeeds end-to-end (depends on real CI run)
    - Whether Cloudflare actually applies the `_headers` file at the edge (only verifiable post-deploy against the live URL)
    - Whether SPA routing works for deep links (only verifiable post-deploy against the live URL)
    - The securityheaders.com grade (only verifiable post-deploy)

    This checkpoint runs AFTER the first successful CI deploy to `aussieledger.pages.dev` to confirm everything actually works in production.
  </what-built>
  <how-to-verify>
    **Prerequisite:** A push to `main` has occurred AFTER Task 2 + Task 3 commits, and the `ci` + `deploy` jobs in `.github/workflows/ci.yml` BOTH show green checks in the GitHub Actions tab. If they have not run yet — push a commit (or trigger via `git commit --allow-empty -m "chore: trigger first deploy"` if needed). If they ran and failed — investigate the failure log before proceeding (see "If deploy failed" below).

    **Verification steps (run all five — pass all or report which failed):**

    1. **CI deploy job succeeded.** Visit `https://github.com/tech-taitan/AussieLedger/actions`. The most recent workflow run on `main` shows BOTH `ci` AND `deploy` jobs with green checkmarks. Click into the `deploy` job and confirm the "Deploy to Cloudflare Pages (production)" step shows the URL `https://aussieledger.pages.dev` (or `https://<commit-sha>.aussieledger.pages.dev` — Cloudflare assigns per-commit URLs but the alias resolves).

    2. **SPA routing works (HOST-01 acceptance criterion 1).** Open `https://aussieledger.pages.dev/journals` directly in a fresh browser tab (NOT by clicking through from the root). Expected: the AussieLedger app loads with the Journals view visible. NOT a 404 page. If a 404 appears: `public/_redirects` was not picked up by Cloudflare — investigate by visiting `https://aussieledger.pages.dev/_redirects` directly (should serve the `/* /index.html 200` content; if 404, the file is missing from the deployed bundle).

    3. **CSP headers applied at edge (HOST-01 acceptance criterion 3).** Run from your terminal:
       ```bash
       curl -sI https://aussieledger.pages.dev/ | grep -i "content-security-policy"
       ```
       Expected output: a `content-security-policy:` line containing `default-src 'none'`, `script-src 'self'`, and `connect-src 'self' https://generativelanguage.googleapis.com`. If empty: `public/_headers` was not picked up — investigate.

    4. **Security headers grade.** Visit `https://securityheaders.com/?q=https%3A%2F%2Faussieledger.pages.dev&followRedirects=on`. Expected grade: **A** or **A+**. Report the grade and the exact headers panel. Acceptable failures: a `B` is acceptable on first pass if the only docked item is the `Permissions-Policy` (some scanners disagree on the modern syntax). A `C` or below should be reported as "issues" — the policy needs revision.

    5. **Browser console clean on production.** Open `https://aussieledger.pages.dev/` in Chrome or Firefox with DevTools open (F12). Reload once. Console shows ZERO red error messages mentioning `Content Security Policy`, `Refused to load`, `Refused to apply inline style`, or `violates the following Content Security Policy directive`. The app renders fully. Navigate to two other routes (e.g. `/journals`, `/trial-balance` if those are the actual paths) — each renders cleanly.

    **PASS condition:** All five steps pass (with the noted exception that securityheaders.com grade B is acceptable if only Permissions-Policy is docked).

    **If deploy FAILED at CI:**
    - "AIza scan blocked" → a real Gemini key shape was found in `dist/`. STOP — do not bypass. Investigate which build output contains it (likely a contributor accidentally set `VITE_GEMINI_API_KEY` in some env). Fix the source, then push again. This is the intended HARD-BLOCK behavior of HOST-02.
    - "Cloudflare authentication failed" → the API token is invalid or missing. Re-verify Task 1 prerequisites (token still valid, both secrets set with correct names spelled `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`).
    - "Project not found" → the Cloudflare Pages project name doesn't match `aussieledger`. Either rename the project to `aussieledger` in the Cloudflare dashboard OR edit `.github/workflows/ci.yml` to match your actual project name and push the fix.

    **If verification step 2, 3, 4, or 5 fails:**
    - Type "issues: {which steps failed + what you observed}". Planner will revise either the `_headers` policy (Plan 10-1 surface) OR the workflow file (Plan 10-2 surface) accordingly.
  </how-to-verify>
  <resume-signal>Type "approved" (all 5 verification steps pass; report securityheaders.com grade) or "issues: {specifics}"</resume-signal>
</task>

</tasks>

<verification>
After all 4 tasks complete and Task 4 checkpoint is approved:

- `.github/workflows/ci.yml` parses as valid YAML and contains both `ci` and `deploy` jobs with all locked configuration (verified by Task 2 automated check).
- The CI run on the commit that landed Tasks 2-3 shows both `ci` and `deploy` jobs green in the GitHub Actions tab.
- `https://aussieledger.pages.dev` returns 200 with a full SPA bundle and the locked CSP header (verified by Task 4 step 3 curl).
- `https://aussieledger.pages.dev/journals` returns the SPA (not 404) — proving `_redirects` works end-to-end (Task 4 step 2).
- securityheaders.com shows grade A or A+ (Task 4 step 4).
- README.md contains the new "Self-host your own deploy" section (Task 3 automated grep).
- v1.1 baseline preserved: 983 SPA GREEN + 15 new tests from Plan 10-1 → 998+ SPA GREEN; 18 server GREEN; lint EXIT 0; build EXIT 0. Plan 10-2 adds zero new tests (it is a workflow + docs plan, no new source code).
- StorageAdapter FINAL invariant preserved (no adapter changes in Phase 10).
- No `new Date()` introduced outside `src/lib/period.ts` (workflow YAML + Markdown have no source code).
- `VITE_HOSTED_MODE` is the only `VITE_`-prefixed env var in the CI environment — verified by inspection of the workflow file; no `VITE_GEMINI_API_KEY` or similar secret-shaped var exists anywhere.
</verification>

<success_criteria>
- HOST-01 fully satisfied: SPA hosted on Cloudflare Pages at a public URL with GitHub Actions auto-deploy on push to `main` (acceptance criterion 2); `_redirects` SPA fallback confirmed in production (criterion 1); `_headers` CSP applied at the edge with `connect-src 'self' https://generativelanguage.googleapis.com` (criterion 3 + criterion's "defense against XSS-exfiltration of user-supplied API keys" intent).
- HOST-02 fully satisfied: post-build CI step greps `dist/` for `AIza` patterns and fails the build on match (acceptance criterion verbatim). Synthetic-fixture regex shape proven correct by Plan 10-1's unit test.
- HOST-03 fully satisfied: `VITE_HOSTED_MODE` flag set to `'true'` on the public Cloudflare build (criterion 1); single source of truth via `isHostedMode()` helper in `src/lib/env.ts` (criterion 2 — already shipped by Plan 10-1); ready for Phase 12 (`AiGateNote` consumption) and Phase 13 (PWA registration gate). The acceptance criterion 4 ("`/api/health` probe is skipped on startup, and `AiGateNote` renders the hosted-mode copy") is partially satisfied — the env-var pipeline works, but the actual `/api/health` skip + `AiGateNote` hosted-mode link are wired in Phase 12.
- Cloudflare project name `aussieledger` confirmed pre-created per CONTEXT (Task 1 user-action checkpoint).
- README has a concise self-host-deploy reference; full audience-first rewrite is correctly deferred to Phase 14 POL-04.

**Out of scope for this plan** (referenced from 10-CONTEXT.md `<deferred>` block):
- Custom domain (HOST-04 → Phase 14; v1.2 ships on `aussieledger.pages.dev` for the first 1-2 weeks)
- Tag-based releases (every push to main auto-deploys; CI gate of 998+ tests + lint + build + AIza scan is the safety net)
- `workflow_dispatch` manual triggers
- CSP `report-to` violation collection (no third-party endpoint; conflicts with no-third-party stance)
- Automated CSP CI validation (manual smoke + securityheaders.com is sufficient for v1.2 cadence)
- Wrangler as project devDependency (`wrangler-action@v3` brings its own)
- Lighthouse CI in deploy job (Phase 13 PWA-01)
- Performance budgets / size-limit checks (v1.3+ if needed)
- Maximum-strict CSP with script nonces (incompatible with static host + Tailwind v4 inline styles)
- Full README rewrite with top-of-fold "Try the live demo" + screenshot + privacy footer (Phase 14 POL-04)
- Touching `vite.config.ts` (existing `process.env.GEMINI_API_KEY` define is already secret-safe; VITE_HOSTED_MODE auto-exposes without a define block)
- Touching StorageAdapter (FINAL invariant — Phase 10 has zero adapter changes)
- PR-preview comment customisation beyond Cloudflare/wrangler-action defaults
</success_criteria>

<output>
After completion, create `.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-2-SUMMARY.md`
</output>
