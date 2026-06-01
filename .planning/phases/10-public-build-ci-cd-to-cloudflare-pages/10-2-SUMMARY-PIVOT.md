---
phase: 10-public-build-ci-cd-to-cloudflare-pages
plan: 2-pivot
subsystem: deployment + ci
tags: [vercel-pivot, csp, ci-cd, secret-leak-scan, custom-domain, dns-delegation]
dependency_graph:
  requires:
    - 10-1 (env.ts isHostedMode helper, AIza fixture, regex unit test)
  provides:
    - vercel-json-config (CSP + headers + SPA rewrites)
    - scan-aiza-mjs (post-build secret-leak guard)
    - vercel-github-integration (auto-deploy on push to main)
    - custom-domain-aussieledger-techtaitan-com
  affects:
    - .github/workflows/ci.yml (reverted to original)
    - README.md (Vercel section)
    - .planning/research/STACK.md (PIVOT note)
    - .planning/phases/10-.../10-CONTEXT.md (amendment block)
    - .planning/REQUIREMENTS.md (HOST-01..04 closed)
    - .planning/STATE.md
tech_stack:
  added: []
  removed:
    - cloudflare/wrangler-action@v3 (never landed; deploy job reverted)
    - actions/upload-artifact@v4 + download-artifact@v4 (reverted)
    - Cloudflare Pages as the public host
  patterns:
    - vercel-native-github-integration
    - secret-leak-scan-in-build-script
    - cname-dns-delegation
key_files:
  created:
    - vercel.json
    - scripts/scan-aiza.mjs
  modified:
    - package.json (build script + scan:aiza)
    - README.md (Vercel + live-demo section)
    - .planning/research/STACK.md (PIVOT note under "Why Vercel is not recommended")
    - .planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md (PIVOT amendment block at top)
    - .planning/REQUIREMENTS.md (HOST-01..04 rewritten + flipped to Complete)
    - .planning/STATE.md (current_plan null; status phase-shipped-pending-verify → done after this commit)
  deleted:
    - public/_headers
    - public/_redirects
decisions:
  - "Vercel Hobby tier (user accepts ToS commercial-use risk for open-source-but-tax-adjacent positioning)"
  - "Vercel's native GitHub integration over CLI-in-Actions — no GitHub Secrets needed, no deploy job in ci.yml"
  - "Single vercel.json at repo root replaces both _headers + _redirects (Cloudflare-only formats)"
  - "AIza secret-leak scan moved from CI-only step into npm run build script (scripts/scan-aiza.mjs) — runs on BOTH GitHub Actions AND Vercel build runner"
  - "Custom domain aussieledger.techtaitan.com configured early (was scheduled for Phase 14 HOST-04) via CNAME at Spaceship DNS pointing at c32ad747d67ef844.vercel-dns-017.com"
  - "Phase directory name 10-public-build-ci-cd-to-cloudflare-pages preserved as-is despite the pivot — renaming would explode commit/SUMMARY references for cosmetic gain"
metrics:
  duration: ~90min (including blocked time discovering the Cloudflare-secrets gap and pivoting)
  completed: 2026-06-01
  tasks: 4 effective (revert × 2 + create × 2 + modify × 4 + docs)
  files: 8 unique
  commits: 6 (in addition to the 4 from Plan 10-1)
  tests_green: 999 SPA + 18 server + lint EXIT 0 + build EXIT 0 + AIza scan EXIT 0
---

# Phase 10 Plan 2 (PIVOT): Cloudflare Pages → Vercel

Mid-Plan-10-2 execution, the user selected Vercel as the v1.2 public host instead of Cloudflare Pages. This summary documents what the pivot bundle changed and the verification that the live deploy at `https://aussieledger.techtaitan.com/` is real.

## Why pivot

The original Plan 10-2 shipped commits `9eba387` (extend ci.yml with Cloudflare deploy job) and `376a273` (Cloudflare README section). The deploy job consistently failed because `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` GitHub Secrets were not present at the repo (REST API confirmed `total_count: 0` across all 5 secret/variable scopes — Actions, Dependabot, Codespaces, environments, variables). Rather than spend further cycles on the secret-creation flow, the user pivoted to Vercel because (a) they were already familiar with it, (b) the Vercel project at `aussieledger` was already created and the custom domain `aussieledger.techtaitan.com` was already in mind, and (c) Vercel's native GitHub integration eliminates the GitHub-Secrets-for-deploy class of problems entirely.

## What changed (6 commits)

| Commit | Type | What |
|--------|------|------|
| `67157f7` | revert | Revert "docs(10-2): add 'Self-host your own deploy' section to README" (Cloudflare-specific) |
| `27c33a5` | revert | Revert "feat(10-2): extend ci.yml with AIza scan + upload-artifact + Cloudflare Pages deploy job" — ci.yml back to 32-line ci-job-only shape |
| `25320c4` | feat(10-pivot) | swap Cloudflare _headers/_redirects for vercel.json (rewrites + headers arrays) |
| `ff7d41c` | feat(10-pivot) | bake AIza secret-leak scan into npm build script (HOST-02) — new scripts/scan-aiza.mjs walks dist/ and exits 1 on any `/AIza[0-9A-Za-z_-]{35}/` match |
| `408e943` | docs(10-pivot) | add Vercel + custom-domain self-host section to README; live-demo link points at aussieledger.techtaitan.com |
| `1e016f4` | docs(10-pivot) | record Cloudflare→Vercel pivot across planning docs (STACK + 10-CONTEXT amendment + REQUIREMENTS HOST-01..04 → Complete + STATE update) |

## What stays from Plan 10-1 (unchanged)

- `src/lib/env.ts` + `isHostedMode()` helper (commit `7f5e3e0`)
- 7 unit tests for `isHostedMode()` strict-'true' equality
- `__fixtures__/aiza-secret-leak.txt` synthetic Gemini-key fixture (commit `311c574`)
- `__fixtures__/__tests__/aiza-regex.test.ts` regex shape verifier
- Plan 10-1's metadata commit (`55df4f4`)

## Live verification (2026-06-01)

**Domain:** `https://aussieledger.techtaitan.com/`

**DNS path:**
- `aussieledger.techtaitan.com` → CNAME → `c32ad747d67ef844.vercel-dns-017.com` (Vercel-specific endpoint) → A → `216.198.79.1`, `64.29.17.1` (Vercel)
- CNAME configured at Spaceship DNS (techtaitan.com's authoritative NS launch1/launch2.spaceship.net)

**HTTP probe** (Invoke-WebRequest HEAD):
- Status: `200 OK` · Server: `Vercel` · X-Vercel-Cache: HIT
- Content-Type: `text/html; charset=utf-8`

**Content-Security-Policy** (9/9 directives verbatim match the locked policy):
```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self';
connect-src 'self' https://generativelanguage.googleapis.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```

**Other security headers** (all 6 present):
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=()`
- `X-Frame-Options: DENY`

**SPA fallback** (HOST-01 acceptance criterion 1):
- `GET /journals` returns `200` with `text/html` body containing `<div id="root">` and the vite asset bundle link — proves vercel.json `rewrites` is doing its job

**Build-script secret-leak guard** (HOST-02):
- `npm run build` locally → `scan-aiza: OK — no Gemini key shapes in dist/`
- GitHub Actions run `26727759887` on commit `1e016f4`: GREEN (`ci` job: build + lint + 999 tests + AIza scan)
- Vercel's build runner runs the same `npm run build` so the scan also fires there

## Requirements satisfied

| Req | State | Evidence |
|-----|-------|----------|
| HOST-01 | Complete | vercel.json shipped (commit `25320c4`); CSP + 5 security headers + SPA rewrites all live at aussieledger.techtaitan.com |
| HOST-02 | Complete | scripts/scan-aiza.mjs in npm build script (commit `ff7d41c`); fires on CI + Vercel; clean against current bundle |
| HOST-03 | Complete | isHostedMode() helper from Plan 10-1 (commit `7f5e3e0`); user has set VITE_HOSTED_MODE=true in Vercel project env vars |
| HOST-04 | Complete (early) | Custom domain aussieledger.techtaitan.com live with TLS; was originally scheduled for Phase 14 |

## Test counts (final)

- SPA: **999 GREEN** + 11 todo + 0 RED (unchanged from Plan 10-1)
- Server: **18 GREEN** (unchanged)
- Lint: **EXIT 0**
- Build: **EXIT 0** (incl. AIza scan)
- GitHub Actions CI run `26727759887`: GREEN

## Deviations from original Plan 10-2

The original Plan 10-2 prescribed Cloudflare Pages with `cloudflare/wrangler-action@v3`, `actions/upload-artifact@v4` + `download-artifact@v4`, a separate `deploy` job in `ci.yml`, and a Cloudflare project at `aussieledger`. **None of those landed** — the pivot to Vercel made all six obsolete. Reverting commits `9eba387` and `376a273` is the formal mechanism that records this.

Plan 10-2's frontmatter still references Cloudflare-era artifacts. That plan file is preserved as decision provenance; this SUMMARY-PIVOT supersedes it.

## Open items for future phases

1. **Phase 14 (POL-04)** — the README "Self-host your own deploy" section landed concise as planned; the full audience-first README rewrite (live-demo CTA + screenshot + quick-start) still belongs to Phase 14.
2. **Phase 14 (HOST-04)** — already closed; one fewer requirement in Phase 14.
3. **Vercel Hobby ToS risk** — noted but accepted. If AussieLedger gains significant user traction and Vercel flags it as commercial, fallback options remain (Netlify, sqlite-wasm + Tauri standalone per v2.0 plan).
4. **Vercel-side cron/Edge functions** — explicit non-goal; the SPA stays purely static.

## Self-check: PASSED

- All 8 unique files confirmed present on disk
- All 6 pivot commits in git history
- Live deploy responds with Status 200 + CSP + 5 security headers + SPA fallback works
- All 4 HOST requirements flipped to Complete in REQUIREMENTS.md
- CI run GREEN on the head commit
- Build script + scan pass locally
- Test counts preserved: 999 SPA + 18 server + lint EXIT 0
