---
phase: 10
slug: public-build-ci-cd-to-cloudflare-pages
type: context
status: ready-for-planning
created: 2026-05-31
discussed_areas: [cloudflare-project-wiring, custom-domain-timing, csp-policy, deploy-triggers]
---

# Phase 10: Public Build + CI/CD to Cloudflare Pages — Context

**Gathered:** 2026-05-31
**Status:** Ready for planning

> ## ⚠ PIVOT — 2026-06-01: Cloudflare Pages → Vercel
>
> Mid-execution of Plan 10-2, the user selected **Vercel** as the v1.2 public host instead of Cloudflare Pages. The Cloudflare-specific sections below (CF project + token, `wrangler-action@v3` deploy job, `_headers`/`_redirects` file formats) are **superseded**. The remaining sections (CSP exact policy content, SPA-fallback intent, AIza scan intent, `VITE_HOSTED_MODE` flag, every-push deploy semantics) carry forward unchanged. The Cloudflare history is preserved here as decision provenance.
>
> ### New locked decisions (Vercel pivot)
>
> **Host + deploy mechanism**
> - **Vercel Hobby tier**, ToS-acknowledged by user (Hobby's "non-commercial" clause; user accepts the risk for AussieLedger's open-source-but-tax-adjacent positioning)
> - **Vercel's native GitHub integration** — no GitHub Actions deploy job; Vercel auto-deploys on every push to `main` + PR previews
> - **NO GitHub Secrets needed** (`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` not created)
> - **Vercel project already created** and connected to `tech-taitan/AussieLedger`
> - **Custom domain `aussieledger.techtaitan.com`** already pointed at the Vercel project (HOST-04 satisfied early — was scheduled for Phase 14)
>
> **Config delivery**
> - **Single `vercel.json` at repo root** replaces both `public/_headers` and `public/_redirects`
> - `vercel.json` `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` is the SPA deep-link fallback
> - `vercel.json` `headers[0]` carries the **identical** CSP + HSTS + nosniff + Referrer-Policy + Permissions-Policy + X-Frame-Options set previously in `_headers` — same CSP string verbatim, different shape
> - `public/_redirects` + `public/_headers` **deleted** (Cloudflare-only formats; Vercel ignores them)
>
> **AIza scan**
> - **Moved into `npm run build` script** via `node scripts/scan-aiza.mjs` — runs on BOTH GitHub Actions CI AND Vercel's build runner; neither can ship a bundle containing a Gemini-key-shape string without exiting non-zero
> - New file: `scripts/scan-aiza.mjs` (Node ES module, SPDX header, same regex `AIza[0-9A-Za-z_-]{35}`)
> - `__fixtures__/aiza-secret-leak.txt` synthetic fixture + `__fixtures__/__tests__/aiza-regex.test.ts` unit test **unchanged** (still verifies regex shape)
> - `.github/workflows/ci.yml` reverted to original 32-line `ci`-job-only shape (no `deploy` job, no `upload-artifact`)
>
> **What stays unchanged from the original Cloudflare-era plan**
> - `src/lib/env.ts` + `isHostedMode()` helper (Plan 10-1 / commit `7f5e3e0`)
> - `__fixtures__/aiza-secret-leak.txt` + regex unit test (Plan 10-1 / commit `311c574`)
> - `VITE_HOSTED_MODE` semantics (strict `'true'` equality; set via Vercel project env-var dashboard instead of CI workflow env)
> - CSP policy content (`default-src 'none'; script-src 'self'; ...` — verbatim same string)
> - Every-push-to-main auto-deploy + PR previews semantics
>
> **Files affected by the pivot (post-pivot state)**
> - Reverted: commits `9eba387`, `376a273`
> - Deleted: `public/_redirects`, `public/_headers`
> - Created: `vercel.json`, `scripts/scan-aiza.mjs`
> - Modified: `package.json` (build script + new `scan:aiza` script), `README.md` (Vercel section), `.planning/research/STACK.md` (pivot note)
>
> ---
>
> The original Cloudflare-era decisions below are PRESERVED for traceability; treat as superseded.

<domain>
## Phase Boundary

Phase 10 ships the AussieLedger SPA on the public URL `https://aussieledger.pages.dev` via GitHub Actions auto-deploy to Cloudflare Pages on every push to `main`. Lands all Wave-0 hard-block pitfall preventions at scaffold time: post-build `AIza` secret-leak scan (CVE-2023-46115 analog defense), `_redirects` SPA-route fallback, `_headers` Content-Security-Policy + full security headers, `VITE_HOSTED_MODE` build flag. PR preview deploys enabled. Custom domain deferred to Phase 14 per roadmap.

**In scope:**
- **GitHub Actions deploy job** added to existing `.github/workflows/ci.yml` (extends `ci.yml`; does NOT create separate `deploy.yml`). New `deploy` job: `needs: ci`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`, downloads `dist/` artifact uploaded by the `ci` job, deploys via `cloudflare/wrangler-action@v3` with `command: pages deploy dist --project-name=aussieledger`.
- **CI job widening** — adds two steps after build: (1) `AIza` secret-leak scan (`grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && exit 1 || true`) — fails CI on any match; (2) `actions/upload-artifact@v4` for `dist/` so the deploy job can consume it. Both steps run BEFORE the deploy gate so failed scan blocks both CI AND deploy.
- **GitHub repo secrets** — `CLOUDFLARE_API_TOKEN` (fine-grained Pages-only token scoped to the `aussieledger` project) + `CLOUDFLARE_ACCOUNT_ID` (account UUID). Standard wrangler-action names; documented in README "self-hosting your own deploy" section.
- **PR preview deploys** — every PR triggers a separate deploy via `wrangler pages deploy --branch=pr-{N}` producing `pr-{N}.aussieledger.pages.dev` URL. Auto-cleanup when PR closes via Cloudflare's native preview lifecycle.
- **`_redirects`** at `public/_redirects` (Vite copies to `dist/_redirects`) containing `/* /index.html 200` — SPA route fallback so deep links don't 404.
- **`_headers`** at `public/_headers` (Vite copies to `dist/_headers`) with the full security header set:
  - `Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
  - `X-Frame-Options: DENY`
- **`VITE_HOSTED_MODE` build flag** — set to `'true'` (string, since shell env vars are strings) in the deploy job's env: `env: VITE_HOSTED_MODE: 'true'` BEFORE the `npm run build` in CI job. Self-host builds (`npm run build` locally) default to unset/false. Single source of truth: `import.meta.env.VITE_HOSTED_MODE === 'true'` check; one helper function (e.g. `isHostedMode()`) in `src/lib/env.ts` consumed by Phase 12/13/14 code.
- **README addition** — "Self-host your own deploy" section documenting the Cloudflare Pages prerequisite, secret names, and the workflow file location. Not the full hosting-mode README rewrite (that's POL-04 in Phase 14); just the deploy infra reference.
- **Manual CSP smoke test** — Phase 10 UAT step: run `npm run build && npm run preview` locally → open `http://localhost:4173` → verify no console errors → after first prod deploy, run `securityheaders.com` against `aussieledger.pages.dev` aiming for grade A or A+. Catches obvious CSP breakage before users hit it.

**Out of scope (deferred):**
- Custom domain — deferred to Phase 14 (HOST-04). v1.2 ships on `aussieledger.pages.dev` for the first 1–2 weeks; Phase 14 swaps to a user-owned custom domain AND updates README live-demo link in one phase. Reduces Phase 10 surface; tradeoff is README points at `.pages.dev` URL for the v1.0/v1.1 → v1.2 transition window.
- Custom domain choice — user already owns a domain; specific domain name TBD at Phase 14 planning.
- Tag-based releases — every push to main auto-deploys (acceptable risk given CI gate of 983 tests + lint + build EXIT 0).
- Manual `workflow_dispatch` triggers — auto-deploy is sufficient; can add later if release cadence demands.
- CSP `report-to` violation collection — would require a third-party report-collection service (conflicts with no-third-party stance) or self-hosted endpoint (Phase 10 scope creep). Defer to v1.3+ if CSP regressions become a real issue.
- Automated CSP CI validation — manual smoke + securityheaders.com after first deploy is sufficient for v1.2 release cadence.
- Wrangler CLI installed as a project devDependency — `wrangler-action@v3` brings its own; no need to add to package.json.
- Lighthouse CI in the deploy job — PWA Lighthouse audit lives in Phase 13 (PWA-01); Phase 10 doesn't need it.
- Performance budgets — defer to v1.3+ if needed.
- Maximum-strict CSP (nonces, no `unsafe-inline` anywhere) — incompatible with static-host (no per-request nonce generation) + Tailwind v4 inline styles. Pragmatic-strict (style-src `'unsafe-inline'`) is the v1.2 default; revisit in v1.3 if XSS risk materialises.

</domain>

<decisions>
## Implementation Decisions

### Cloudflare project + GitHub repo wiring (4 sub-decisions)

- **Cloudflare account exists; project pre-created with name `aussieledger`.** Default URL: `aussieledger.pages.dev`. No manual project-creation task in the plan; user has the project ready. Plan documents the `--project-name=aussieledger` flag value.
- **Fine-grained Cloudflare API token, Pages-only, scoped to the `aussieledger` project.** Least-privilege. If leaked, blast radius is one project. Cloudflare's token-create UI: "Create Custom Token" → permissions `Account > Cloudflare Pages > Edit` + `Account > Account Settings > Read` + zone resources restricted to `aussieledger`. User generates manually; pastes into GitHub Secrets. Documented in plan + README.
- **Extend existing `.github/workflows/ci.yml` with a `deploy` job (gated on the existing `ci` job passing).** Single workflow file. `deploy` job: `needs: ci`, `if: github.ref == 'refs/heads/main' && github.event_name == 'push'`. Build artifact passed via `actions/upload-artifact@v4` (in `ci` job after build) and `actions/download-artifact@v4` (in `deploy` job first step). Avoids rebuilding; guarantees deploy uses tested artifact.
- **GitHub Secrets named `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`** — standard `wrangler-action@v3` recognised names; matches 90%+ of public examples; future contributors recognise immediately.

### Custom domain timing (2 sub-decisions)

- **Defer custom domain entirely to Phase 14 per roadmap.** Phase 10 ships only `aussieledger.pages.dev`. README live-demo link points at `.pages.dev` URL temporarily during v1.0/v1.1 → v1.2 transition. Phase 14 swaps to user-owned custom domain AND updates README in one phase. Tradeoff: 1–2 weeks of `.pages.dev` URL; benefit: tight Phase 10 scope + no Phase 10 DNS task.
- **User already owns a domain.** Specific domain name surfaced during Phase 14 planning (not in Phase 10 CONTEXT). Phase 10 plan does NOT include any DNS / CNAME / cert task.

### CSP exact policy + security headers (4 sub-decisions)

- **Pragmatic-strict CSP.** Full policy: `default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. `'unsafe-inline'` for `style-src` ONLY — Tailwind v4 + motion library inject inline styles; this is the industry-default tradeoff (low XSS risk for CSS vs blocked rendering). `script-src 'self'` strict — no eval, no inline scripts. `connect-src` limited to self + Gemini (defense against XSS-exfiltration of user-supplied API key per Phase 12 requirement AI-01).
- **Full security header set in `_headers`.** Defense in depth: HSTS preload-eligible (`max-age=63072000; includeSubDomains; preload`) · `X-Content-Type-Options: nosniff` · `Referrer-Policy: strict-origin-when-cross-origin` · `Permissions-Policy` denying geolocation/microphone/camera/payment (APIs we never use) · `X-Frame-Options: DENY` (no embedding). Aim for securityheaders.com grade A or A+.
- **Manual CSP smoke test as Phase 10 UAT step.** Three sub-checks: (1) `npm run build && npm run preview` local smoke (`http://localhost:4173`) — no console CSP errors; (2) post-deploy curl `https://aussieledger.pages.dev` → verify `Content-Security-Policy` header in response; (3) run `securityheaders.com/?q=aussieledger.pages.dev` → grade ≥ A. Catches obvious breakage cheaply; no automated CSP test in CI (overkill for the change cadence).
- **`_headers` file as CSP delivery mechanism.** Cloudflare Pages native pattern. File at `public/_headers` (Vite copies to `dist/_headers` at build). Single line per directive; applied at the edge with zero runtime overhead. NOT `<meta http-equiv="Content-Security-Policy">` (weaker — doesn't apply to all resource types; redundant when `_headers` works).

### Deploy triggers + PR previews (4 sub-decisions)

- **Every push to `main` auto-deploys production** (after `ci` job passes the existing 983-test gate + lint + build + new `AIza` scan). Standard pattern for single-developer / small-team OSS SPA. Risk mitigated by CI gate. Tag-based releases and `workflow_dispatch` skipped for v1.2 — can add later if release cadence demands.
- **PR preview deploys enabled.** Every PR triggers a separate deploy via `wrangler pages deploy --branch=pr-{N}` producing `pr-{N}.aussieledger.pages.dev` URL. Auto-cleanup when PR closes (Cloudflare native lifecycle). Cloudflare free tier: 500 build-minutes/month — plenty headroom even with PR previews. Adds the deploy job to PR events: `if: github.event_name == 'pull_request'` runs with branch-name = `pr-${{ github.event.number }}`.
- **Build artifact passed via `actions/upload-artifact@v4` + `download-artifact@v4`.** `ci` job uploads `dist/` after build + AIza scan; `deploy` job downloads `dist/` as first step. Avoids rebuilding (saves ~30s + free-tier minutes); guarantees deploy ships the same bytes CI tested. v4 retention is 90 days default; fine for our cadence.
- **`AIza` secret-leak scan placement: in `ci` job, after build, before `upload-artifact`.** Exact command: `grep -rE 'AIza[0-9A-Za-z_-]{35}' dist/ && exit 1 || true`. Single source of truth. Failed scan → CI fails → `deploy` job doesn't run (because `needs: ci`). The pattern `AIza[0-9A-Za-z_-]{35}` matches the standard Gemini API key shape (39 chars total, starting `AIza`). Documented + tested with a synthetic-key fixture committed in a Phase 10 task.

### Claude's Discretion

- **Exact wrangler-action version pin** (`v3` minor) — planner picks the latest v3.x stable at planning time.
- **Exact regex for `AIza` scan** — provided default `AIza[0-9A-Za-z_-]{35}` may need adjustment based on real Gemini key shape verification; planner verifies during research / task writing.
- **`actions/upload-artifact` retention period** — default 90 days fine; planner can set explicit retention if needed.
- **Node version pin in deploy job** — match existing `ci.yml` (Node 20); planner replicates.
- **`workflow_run` vs in-workflow `needs:`** — locked to `needs:` in this CONTEXT (single workflow file); planner doesn't need to re-decide.
- **PR preview URL format / branch-name slugging** — Cloudflare default works (`pr-42.aussieledger.pages.dev`); planner uses default unless deviating.
- **Whether the `_headers` file lives at `public/_headers` (Vite-served) vs `dist/_headers` (post-build script)** — planner picks `public/_headers` as the simpler option since Vite auto-copies; verifies that Vite v6 does copy `_headers` (no extension to confuse it).
- **`isHostedMode()` helper exact location** — probably `src/lib/env.ts` (new file) but planner can fold into existing helper module if cleaner.
- **README "self-host your own deploy" section length** — planner picks concise vs detailed based on overall README revamp scope (POL-04 in Phase 14 is the bigger rewrite).
- **Whether to lint the `_headers` file syntax** — Cloudflare validates at deploy time; manual smoke after first deploy is sufficient.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 10 scope + prior decisions
- `.planning/PROJECT.md` — v1.2 milestone goal ("Current Milestone" section); non-goals (no telemetry, no third-party scripts)
- `.planning/REQUIREMENTS.md` §Public Hosting + CI/CD — HOST-01, HOST-02, HOST-03 acceptance criteria
- `.planning/ROADMAP.md` — Phase 10 entry with goal + 4 success criteria
- `.planning/STATE.md` — architecture invariants table (StorageAdapter FINAL preserved; `VITE_HOSTED_MODE` is safe-flag; secrets never `VITE_`-prefixed)
- `.planning/research/STACK.md` — Cloudflare Pages over GitHub Pages/Vercel rationale; wrangler-action@v3 vs deprecated pages-action; full security header recommendations
- `.planning/research/ARCHITECTURE.md` — `VITE_HOSTED_MODE` integration via `isHostedMode()` helper; `_headers` file pattern; CI artifact passing
- `.planning/research/PITFALLS.md` §1 — VITE_ env-leak HARD-BLOCK with `AIza` regex; §5 — SPA routing 404 via `_redirects`; §6 — XSS via CSP `connect-src` allowlist
- `.planning/research/SUMMARY.md` — phase-order rationale; hosting-platform decision

### Existing code Phase 10 must consume / extend
- `.github/workflows/ci.yml` — 31 lines; widen with AIza scan step + upload-artifact step + new `deploy` job
- `vite.config.ts` — `defineConfig(({ mode }) => { define: ... })` already correctly handles env vars (uses `process.env.GEMINI_API_KEY` via `define` block; NOT `VITE_` auto-expose)
- `package.json` scripts — `build`, `lint`, `test` reused as-is; no new `deploy` script needed (workflow invokes wrangler-action directly)
- `public/` directory — Vite auto-copies contents to `dist/` at build; `_redirects` + `_headers` files placed here

### New code Phase 10 creates
- `public/_redirects` (1 line: `/* /index.html 200`)
- `public/_headers` (multi-line; full security header set per CONTEXT decision)
- `src/lib/env.ts` (new file or addition to existing helper module) — `isHostedMode()` reads `import.meta.env.VITE_HOSTED_MODE === 'true'`
- `.github/workflows/ci.yml` — `deploy` job added; `ci` job widened with AIza scan + artifact upload
- Possibly: `__fixtures__/aiza-secret-leak.txt` — synthetic Gemini-key-shape fixture to test the AIza scan regex matches without committing a real key
- README section: "Self-host your own deploy" (concise; full rewrite is POL-04 in Phase 14)

### External documentation
- Cloudflare Pages official docs: `_headers` syntax, `_redirects` syntax, project setup
- Cloudflare wrangler-action GitHub repo: `actions/cloudflare/wrangler-action@v3` with `command: pages deploy ...`
- securityheaders.com — manual CSP grading service
- Vite docs: `public/` directory behaviour (auto-copy to dist)
- GitHub Actions docs: `actions/upload-artifact@v4` + `download-artifact@v4`

### Repo facts
- **GitHub repo:** `tech-taitan/AussieLedger`
- **Cloudflare project name:** `aussieledger` (account exists; project pre-created)
- **Cloudflare default URL:** `https://aussieledger.pages.dev` (custom domain deferred to Phase 14)
- **Node version in CI:** 20 (per existing `ci.yml`)
- **License:** Apache 2.0

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.github/workflows/ci.yml` (Phase 1 DEP-05) — 31 lines; existing CI job. Phase 10 EXTENDS (does not replace). Adds 3 things: AIza scan step · upload-artifact step · new `deploy` job.
- `vite.config.ts` — `define` block already correctly handles `process.env.GEMINI_API_KEY` (NOT `VITE_` auto-expose). Phase 10 does NOT modify vite.config.ts; `VITE_HOSTED_MODE` is consumed via `import.meta.env.VITE_HOSTED_MODE` directly.
- `public/` directory — Vite auto-copies contents to `dist/` at build. `_redirects` and `_headers` placed here ship cleanly.
- `package.json` `build` script — `vite build` produces `dist/`; consumed by both CI test step (existing) and deploy job (new).

### Established Patterns
- **CI on push + PR to main** (Phase 1 DEP-05) — Phase 10 deploy job adds: `if: github.ref == 'refs/heads/main' && github.event_name == 'push'` for prod; PR preview job runs on `pull_request`.
- **Apache 2.0 SPDX headers on every source file** (Phase 1) — `src/lib/env.ts` gets the standard SPDX header on creation.
- **No `new Date()` outside `src/lib/period.ts`** (Phase 2 structural lint) — `env.ts` does no time-handling.
- **Defensive grep checks in CI** (Phase 1 SPDX-headers structural test; Phase 8 stale-constants test; Phase 9 SUMMARY-extract) — the `AIza` scan follows the same pattern: regex grep, fail build on match.

### Integration Points
- `ci.yml` adds: (a) AIza scan step after `npm run build`; (b) `actions/upload-artifact@v4` for `dist/` after scan passes; (c) new `deploy` job with `needs: ci` + conditional triggers.
- `public/_redirects` and `public/_headers` are new files Vite copies to `dist/` at build.
- `src/lib/env.ts` is a new (or existing) module; `isHostedMode()` is consumed by Phase 12 (`AiGateNote` link), Phase 13 (PWA registration), and Phase 14 (iOS banner, /demo route guard).
- Cloudflare Pages dashboard already has the project; planner does NOT include a "create project" task — only "verify project exists" smoke.

</code_context>

<specifics>
## Specific Ideas

- **Single-workflow pattern** (extend `ci.yml`) matches v1.0/v1.1 convention of "one workflow file at a time." Avoids `workflow_run` cascading complexity.
- **Fine-grained Cloudflare token** scoped to the `aussieledger` project specifically — Cloudflare's recommended pattern; if the token leaks, blast radius is one project.
- **`AIza[0-9A-Za-z_-]{35}` regex** matches the standard Gemini API key shape (39 chars total starting `AIza`). Test fixture committed at `__fixtures__/aiza-secret-leak.txt` to verify the scan would catch a real leak.
- **`'unsafe-inline'` for `style-src` ONLY** — Tailwind v4 + motion library require inline `<style>` tags. Allowing inline styles is low XSS risk (CSS can't execute code). Inline scripts are the actual attack vector; `script-src 'self'` blocks those.
- **PR preview branch naming** — Cloudflare default `pr-{N}.aussieledger.pages.dev` works. No custom branch-name slugging needed.
- **README "self-host your own deploy"** — concise section in Phase 10; full README rewrite is POL-04 (Phase 14) covering the audience-first restructure.

</specifics>

<deferred>
## Deferred Ideas

- **Custom domain** — Phase 14 (HOST-04). User owns a domain; specific name surfaced at Phase 14 planning.
- **Maximum-strict CSP** with nonces (no `'unsafe-inline'` anywhere) — incompatible with static host (no per-request nonces) + Tailwind v4 inline styles. Revisit in v1.3+ if XSS risk materialises.
- **CSP `report-to` violation collection** — needs a report-collection endpoint; conflicts with no-third-party stance unless self-hosted. v1.3+ if regressions become an issue.
- **Tag-based releases** — every push to main is the v1.2 default. Can add `workflow_dispatch` or tag-based prod-only triggers in v1.3 if release cadence demands batching.
- **Automated CSP CI validation** — manual smoke + securityheaders.com after first deploy is sufficient for v1.2 release cadence.
- **Lighthouse CI in deploy job** — PWA Lighthouse audit lives in Phase 13. Phase 10 doesn't need general perf budgets.
- **Wrangler as project devDependency** — `wrangler-action@v3` brings its own; no need to add.
- **Performance budgets / size-limit checks** — v1.3+ if needed.
- **Separate `deploy.yml` vs extended `ci.yml`** — locked to extended `ci.yml`.

</deferred>

---

*Phase: 10-public-build-ci-cd-to-cloudflare-pages*
*Context gathered: 2026-05-31*
