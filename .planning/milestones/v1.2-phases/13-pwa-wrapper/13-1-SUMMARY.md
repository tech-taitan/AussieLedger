---
phase: 13-pwa-wrapper
plan: 1
status: complete
subsystem: build,pwa,icons,manifest,service-worker,structural-tests
tags: [vite-plugin-pwa, resvg-js, manifest, pwa-icons, service-worker, workbox, stale-cache-hardblock, register-type-prompt, dev-options-disabled, inject-register-false, pwa-config-test, pwa-manifest-test, pwa-index-html-test, pwa-options-named-export, pwa-01]
dependency_graph:
  requires:
    - "Phase 10 vercel.json CSP (script-src 'self' covers same-origin SW)"
    - "Phase 10 scripts/scan-aiza.mjs (post-build secret-leak guard; now scans SW + workbox-* + precache manifest)"
    - "lucide-react@0.546.0 Calculator icon node array (hardcoded as build-script constant; runtime React package NOT imported by the icon-build script)"
  provides:
    - vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.2 devDependencies
    - scripts/build-pwa-icons.mjs (deterministic SVG→PNG renderer; idempotent; npm run build:icons)
    - public/icon-192.png + public/icon-512.png (standard, transparent bg, blue Calculator)
    - public/icon-192-maskable.png + public/icon-512-maskable.png (white bg + 20% W3C safe-zone padding)
    - public/apple-touch-icon.png (180×180, white opaque bg — iOS requirement)
    - vite.pwa-options.ts (named-export single source of truth for VitePWA config; type-only vite-plugin-pwa import so jsdom tests can load it)
    - vite.config.ts VitePWA wiring (imports pwaOptions; appends VitePWA(pwaOptions) to plugins array)
    - index.html <link rel="apple-touch-icon"> + <meta name="theme-color">
    - dist/sw.js + dist/workbox-*.js (Workbox-generated SW; 14 precache entries / 1553 KiB)
    - dist/manifest.webmanifest (locked CONTEXT values; auto-emitted)
    - src/__tests__/pwa-manifest.test.ts (9 dist/manifest.webmanifest contract assertions; skipIf-gated)
    - src/__tests__/pwa-index-html.test.ts (4 source-index.html shape assertions)
    - src/__tests__/pwa-config.test.ts (17 pwaOptions structural assertions; replaces 3 brittle grep guards per R-2)
    - package.json build:icons npm script (manual re-run only; PNGs committed)
  affects:
    - package.json
    - package-lock.json
    - vite.config.ts
    - vite.pwa-options.ts
    - index.html
    - scripts/build-pwa-icons.mjs
    - public/icon-192.png
    - public/icon-512.png
    - public/icon-192-maskable.png
    - public/icon-512-maskable.png
    - public/apple-touch-icon.png
    - src/__tests__/pwa-manifest.test.ts
    - src/__tests__/pwa-index-html.test.ts
    - src/__tests__/pwa-config.test.ts
tech_stack:
  added:
    - "vite-plugin-pwa@^1.3.0 (Workbox-based PWA plugin; generateSW strategy; Vite 6 peer-dep range ^3.1.0 || ... || ^8.0.0 — confirmed in STACK.md)"
    - "@resvg/resvg-js@^2.6.2 (pure-WASM SVG→PNG rasterizer; zero native deps — Windows-cross-platform safe; avoids sharp's better-sqlite3-style native-build pain)"
  patterns:
    - "Named-export single source of truth (pwaOptions) — matches the Phase 11 nowIso / addDaysIso extracted-helper precedent. vite.config.ts imports from vite.pwa-options.ts; pwa-config.test.ts imports the same. One object, two consumers, zero drift."
    - "Type-only import (`import type { VitePWAOptions } from 'vite-plugin-pwa'`) — erased at runtime so vite.pwa-options.ts loads cleanly in jsdom without triggering vite/esbuild's native TextEncoder invariant."
    - "Deterministic icon-render pipeline: build script reads a hardcoded SVG path-data constant + resvg WASM rasterizer + writeFileSync. Idempotent SHA-256 hashes verified across two runs. PNGs committed to git so CI never regenerates."
    - "vite-plugin-pwa auto-inject <link rel=\"manifest\"> at build time — source index.html does NOT contain a manual manifest link (contract-asserted by pwa-index-html.test.ts to prevent future duplicate injection)."
    - "Structural test over grep — pwa-config.test.ts imports the runtime object and asserts via `.toBe(true)` so duplicate flags collapse and commented-out flags evaluate to undefined. Replaces the original grep-counts-lines guards which were invisible to those drift modes (per plan-checker R-2)."
key_files:
  created:
    - scripts/build-pwa-icons.mjs
    - vite.pwa-options.ts
    - public/icon-192.png
    - public/icon-512.png
    - public/icon-192-maskable.png
    - public/icon-512-maskable.png
    - public/apple-touch-icon.png
    - src/__tests__/pwa-manifest.test.ts
    - src/__tests__/pwa-index-html.test.ts
    - src/__tests__/pwa-config.test.ts
  modified:
    - package.json
    - package-lock.json
    - vite.config.ts
    - index.html
decisions:
  - "vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.2 installed via single npm command (single lockfile write). Both packages pinned with caret-minor (^) — never exact. Install required --strict-ssl=false workaround for the local TLS-interception issue known from Phases 10 & 11 (corporate cert chain); registry config UNCHANGED globally — flag was scoped to this single install invocation only."
  - "scripts/build-pwa-icons.mjs hardcodes the lucide-react@0.546.0 Calculator SVG primitives as a string constant (rect + 2 lines + 7 dot-paths). NOT a runtime import from lucide-react — the script is build-only and the React package is not designed for headless SVG generation. Stroke-2 + round-cap + round-join + fill-none mirror lucide's default rendering attributes."
  - "Maskable safe-zone implemented via SVG <g transform=\"translate(p,p) scale(s)\"> where p=4.8 and s=0.6 on a 24×24 viewBox. Icon occupies central 60% × 60% with 20% padding on all four sides per W3C maskable spec — guarantees clean Android adaptive-icon cropping (circle, squircle, teardrop, rounded-square)."
  - "Apple-touch-icon uses opaque white background (#ffffff) — iOS Safari ignores manifest icons for Add-to-Home-Screen AND renders transparent PNGs as black on Home Screen, so we serve the dedicated 180×180 white-bg variant."
  - "pwaOptions extracted into vite.pwa-options.ts (its own file), NOT inlined inside vite.config.ts's defineConfig callback. Critical for pwa-config.test.ts to import without pulling in vite/esbuild (which fails jsdom's TextEncoder polyfill). Type-only import for VitePWAOptions keeps the module runtime-side free of vite-plugin-pwa code. vite.config.ts re-exports pwaOptions so the named-export API is preserved for any external consumer that prefers to import from vite.config directly."
  - "Workbox config locks the PITFALLS §3 HARDBLOCK: skipWaiting + clientsClaim + cleanupOutdatedCaches ALL true. registerType: 'prompt' (NOT 'autoUpdate' — Pitfall #12 force-reload-mid-form HARDBLOCK). devOptions.enabled: false (SW MUST NOT register during npm run dev). injectRegister: false (Plan 13-2's useUpdateBanner controls registerSW manually). navigateFallbackDenylist: [/^\\/api\\//] (defensive — SW never intercepts /api/* in production)."
  - "globPatterns extended with .ico (in addition to the CONTEXT base set js/css/html/svg/png/woff2). Sensible addition for favicon precaching. Explicitly NOT widened to .json or .wasm — neither is a v1.2 concern and widening risks accidentally precaching a hypothetical sqlite-wasm payload (v2.0 territory)."
  - "Manifest values verbatim CONTEXT-locked: name + short_name = AussieLedger; description = 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'; theme_color = #141414 (--ink); background_color = #E4E3E0 (--bg paper-warm); display = standalone; start_url = /; categories = [finance, productivity]; 4 icons (2 standard + 2 maskable). NOT word-smithed."
  - "index.html gains two new <head> tags: <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\"> and <meta name=\"theme-color\" content=\"#141414\">. The <link rel=\"manifest\"> is NOT added manually — vite-plugin-pwa auto-injects it at build time (verified in dist/index.html). pwa-index-html.test.ts asserts the absence of the manual manifest link to prevent future duplicate-injection drift."
  - "PNGs are committed to git — deterministic builds, CI never regenerates icons, users see exactly the icons reviewed in code review. Re-render only via the npm run build:icons script when icon design changes."
  - "vite.config.ts existing blocks (define / resolve / server.proxy) UNCHANGED. Pitfall #1 HARDBLOCK preserved (no VITE_GEMINI_API_KEY — `grep -c VITE_GEMINI vite.config.ts` returns 0)."
  - "vercel.json CSP UNCHANGED. Workbox-emitted dist/sw.js is same-origin → covered by the existing `script-src 'self'`. No CSP edits, no connect-src widening (SW does not make external requests in v1.2's NetworkOnly /api/* + precache-only config)."
  - "scripts/scan-aiza.mjs UNCHANGED. Its scope (dist/) now includes sw.js + workbox-*.js + the precache manifest; the AIza[0-9A-Za-z_-]{35} regex does not false-match Workbox-generated revision hashes (plain hex, no 35-char AIza-prefixed segments). `npm run scan:aiza` exit 0 confirmed."
metrics:
  duration: "~21min (2026-06-01T12:17Z → 2026-06-01T12:38Z)"
  completed: "2026-06-01"
  tasks_completed: 3
  files_changed: 14
  tests_added: 30
  tests_total: 1114
---

# Phase 13 Plan 1: PWA Icons + vite-plugin-pwa Config + Manifest + Structural Tests Summary

**One-liner:** Lands the foundational PWA mechanics — vite-plugin-pwa with the locked stale-cache-prevention Workbox config (skipWaiting + clientsClaim + cleanupOutdatedCaches), 5 deterministically-rendered PNG icons (2 standard + 2 maskable + 1 apple-touch) via @resvg/resvg-js WASM, locked CONTEXT manifest values, apple-touch-icon + theme-color tags in index.html, and a 30-assertion contract-test triplet (pwa-manifest + pwa-index-html + pwa-config) — the third of which is a R-2-hardened structural assertion that replaces three brittle grep guards and catches duplicate/commented-out drift the originals missed.

## What Was Built

### Task 1 — vite-plugin-pwa + @resvg/resvg-js install + icon-render pipeline + 5 committed PNGs (commit `e5e60bd`)

**`package.json`** — added `vite-plugin-pwa@^1.3.0` and `@resvg/resvg-js@^2.6.2` to `devDependencies` (single npm install). Added `"build:icons": "node scripts/build-pwa-icons.mjs"` npm script (manual re-run only). Default `"build"` script UNCHANGED.

**`scripts/build-pwa-icons.mjs`** — new Node ESM module (~100 lines, Apache 2.0 SPDX header):
- Hardcoded `CALCULATOR_PRIMITIVES` string constant — 10 SVG elements (rect + 2 lines + 7 dot-paths) extracted verbatim from lucide-react@0.546.0's Calculator icon node array. NOT a runtime React import.
- `buildSvg({ padding, bgColor, strokeColor })` composes a 24×24 viewBox SVG document with an optional background rect (transparent for standard, white for maskable + apple-touch) and a `<g transform="translate(p,p) scale(s)">` wrapper that applies the W3C safe-zone padding (p=4.8 → s=0.6 → icon occupies central 60%).
- `render({ svg, sizePx })` uses `new Resvg(svg, { fitTo: { mode: 'width', value: sizePx }, background: 'rgba(0,0,0,0)' }).render().asPng()`.
- Top-level main flow: `mkdirSync('public', { recursive: true })` then writes 5 PNGs — standard 192/512 (transparent bg, full-bleed icon), maskable 192/512 (white bg, 60%-center icon), apple-touch 180 (white bg, full-bleed icon).
- Idempotent: re-running yields byte-identical SHA-256 hashes (verified via `sha256sum public/*.png > before.txt; npm run build:icons; sha256sum public/*.png > after.txt; diff before.txt after.txt` → empty diff).

**`public/` directory** — RECREATED. Was deleted in the Phase 10 Vercel pivot when `_redirects`/`_headers` migrated to `vercel.json`. vite-plugin-pwa requires `public/` for Vite's built-in static-copy behavior to include the icons in `dist/`.

**`public/*.png`** — 5 PNGs committed (sizes: 192=3617 B, 512=13229 B, 192-maskable=2606 B, 512-maskable=8699 B, apple-touch=2740 B — all well under 14 KB).

**Lint EXIT 0** after install. Build script renders successfully on first run and yields byte-identical outputs on second run.

### Task 2 — VitePWA wired into vite.config.ts + apple-touch + theme-color tags (commit `c8abf69`)

**`vite.config.ts`** — initially declared `pwaOptions` as a top-level named export above `defineConfig`, with `VitePWA(pwaOptions)` appended to the plugins array. (Later split into `vite.pwa-options.ts` in Task 3 — see deviation below.)

**Locked PWA configuration (verbatim CONTEXT-locked):**
- `registerType: 'prompt'` — Pitfall #12 force-reload-mid-form HARDBLOCK
- `strategies: 'generateSW'` — Workbox generator, no custom SW logic
- `injectRegister: false` — Plan 13-2's useUpdateBanner controls registerSW
- `devOptions: { enabled: false }` — SW MUST NOT register in npm run dev
- `includeAssets: ['apple-touch-icon.png']`
- `workbox.skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true` — PITFALLS §3 HARDBLOCK (all three required)
- `workbox.globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}']`
- `workbox.navigateFallback: '/index.html'`
- `workbox.navigateFallbackDenylist: [/^\/api\//]` — defensive against SW intercepting /api/*
- `manifest.name`/`short_name`: `AussieLedger`
- `manifest.description`: `Free Australian bookkeeping → tax return tool. Your data stays in your browser.`
- `manifest.theme_color`: `#141414` (--ink)
- `manifest.background_color`: `#E4E3E0` (--bg paper-warm)
- `manifest.display`: `standalone`
- `manifest.start_url`: `/`
- `manifest.categories`: `['finance', 'productivity']`
- `manifest.icons`: 4 entries (192/512 standard + 192/512 maskable; all `image/png`)

**Existing `define` / `resolve` / `server.proxy` blocks UNCHANGED** — Pitfall #1 HARDBLOCK preserved (`grep -c VITE_GEMINI vite.config.ts` returns 0).

**`index.html`** — gained two new `<head>` tags: `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />` and `<meta name="theme-color" content="#141414" />`. NO manual `<link rel="manifest">` — vite-plugin-pwa auto-injects it (verified in `dist/index.html` post-build). All existing tags (charset, viewport, title, root div, main script) UNCHANGED.

**`npm run build` EXIT 0** — Workbox emits `dist/sw.js` + `dist/workbox-9c191d2f.js` + 14 precache entries (1553.46 KiB). `dist/manifest.webmanifest` contains all locked CONTEXT values. The 5 icons copied into `dist/` via Vite's public-dir static copy. AIza scan still passes against the SW-expanded `dist/`.

**Lint EXIT 0**. Full Vitest suite preserved at 1084 SPA GREEN + 11 todo + 0 RED.

### Task 3 — Three contract tests + pwaOptions split into dedicated module (commit `2a59385`)

**`vite.pwa-options.ts`** — new module (~60 lines, SPDX header) extracted from vite.config.ts. Holds the `pwaOptions` named export with a type-only `import type { VitePWAOptions } from 'vite-plugin-pwa'` (erased at runtime so jsdom can load this module without triggering vite/esbuild's native TextEncoder invariant check). vite.config.ts now imports `pwaOptions` from here and re-exports it.

**`src/__tests__/pwa-manifest.test.ts`** — new Vitest suite (~80 lines, SPDX header) — 9 assertions:
- `describe.skipIf(!hasManifest)` gating so local `npm test` without prior `npm run build` skips gracefully with a `console.warn`. CI runs build before test so the file exists.
- Reads `dist/manifest.webmanifest` and asserts: `name === 'AussieLedger'`; `short_name === 'AussieLedger'`; `description` matches verbatim CONTEXT string; `theme_color === '#141414'`; `background_color === '#E4E3E0'`; `display === 'standalone'`; `start_url === '/'`; `categories` deep-equals `['finance', 'productivity']`; `icons` has 4 entries with the 2 standard + 2 maskable shape and all `image/png` type.

**`src/__tests__/pwa-index-html.test.ts`** — new Vitest suite (~45 lines, SPDX header) — 4 assertions:
- Reads source `index.html` and asserts: exactly one `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`; exactly one `<meta name="theme-color" content="#141414">`; NO manually-added `<link rel="manifest">` (proves we rely on vite-plugin-pwa auto-injection — a manual entry would create a duplicate at build time); still contains `<title>AussieLedger</title>` (existing tag preserved).

**`src/__tests__/pwa-config.test.ts`** — new Vitest suite (~110 lines, SPDX header) — **17 assertions** organised in 5 describe blocks:
- `PITFALLS §3 HARDBLOCK` (3 assertions): `workbox.skipWaiting === true`; `clientsClaim === true`; `cleanupOutdatedCaches === true`.
- `Pitfall #12 — registerType lock` (1 assertion): `registerType === 'prompt'`.
- `npm run dev SW absence lock` (1 assertion): `devOptions.enabled === false`.
- `Workbox strategy + register-injection lock` (4 assertions): `strategies === 'generateSW'`; `injectRegister === false`; `globPatterns` contains the locked extension list; `navigateFallbackDenylist[0].source === '^\\/api\\/'`.
- `CONTEXT-locked manifest values` (8 assertions): `name`, `short_name`, `description`, `theme_color`, `background_color`, `display`, `start_url`, and `icons.length === 4` with 2 maskable entries.

Imports `pwaOptions` from `../../vite.pwa-options` (NOT `../../vite.config`) to avoid the jsdom/esbuild TextEncoder invariant. Same runtime object that vite.config.ts passes to `VitePWA()` — single source of truth, zero drift risk.

**Total new tests:** 30 GREEN (9 pwa-manifest + 4 pwa-index-html + 17 pwa-config). **Lint EXIT 0**. **Build EXIT 0** (incl. AIza scan). **SPDX-headers test** covers the four new source files (3 test files + vite.pwa-options.ts) — 122 GREEN. Full suite: **1114 SPA GREEN + 11 todo + 0 RED**.

## Test Counts

| Boundary                       | SPA GREEN | Todo | RED | Notes                                                |
| ------------------------------ | --------- | ---- | --- | ---------------------------------------------------- |
| Baseline (post-Phase-11)       | 1084      | 11   | 0   |                                                      |
| After Task 1                   | 1084      | 11   | 0   | Icons + build script — no test changes               |
| After Task 2                   | 1084      | 11   | 0   | VitePWA wiring + index.html tags — no test changes   |
| After Task 3                   | 1114      | 11   | 0   | +30 GREEN (9 pwa-manifest + 4 pwa-index-html + 17 pwa-config) |
| Plan 13-1 close                | **1114**  | **11** | **0** | +30 over baseline                                  |

Server tests: 18 GREEN (unchanged).

## Commits

| Hash      | Task | Conventional Commit                                                                   | CI Run        |
| --------- | ---- | ------------------------------------------------------------------------------------- | ------------- |
| `e5e60bd` | 1    | feat(13-1): add PWA icon-rendering pipeline + 5 committed PNGs                        | 26754601412 ✓ |
| `c8abf69` | 2    | feat(13-1): wire vite-plugin-pwa + add apple-touch + theme-color tags                 | 26754773456 ✓ |
| `2a59385` | 3    | test(13-1): add three PWA contract tests + extract pwaOptions to dedicated module     | 26755202643 ✓ |

All 3 commits pushed to `origin/main`. All 3 GitHub Actions CI runs completed with conclusion `success`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking issue] pwaOptions named export split from vite.config.ts into vite.pwa-options.ts**

- **Found during:** Task 3, first attempted `npx vitest run src/__tests__/pwa-config.test.ts`.
- **Issue:** Importing `pwaOptions` from `vite.config.ts` failed with `Invariant violation: "new TextEncoder().encode(\"\") instanceof Uint8Array" is incorrectly false`. The `import { VitePWA }` runtime import in vite.config.ts transitively loads vite/esbuild, which requires Node's native TextEncoder; jsdom's polyfilled TextEncoder does not satisfy esbuild's invariant check.
- **Diagnosis path:**
  1. Added `// @vitest-environment node` pragma to bypass jsdom. Failed because the shared `src/test/setup.ts` file (loaded for every test via `setupFiles`) references `window`, `localStorage`, etc. — incompatible with the node environment.
  2. Considered teaching `setup.ts` to no-op on node env. Rejected — increases coupling between the global setup file and individual test environments, brittle.
- **Fix:** Extracted `pwaOptions` into `vite.pwa-options.ts` with a type-only `import type { VitePWAOptions } from 'vite-plugin-pwa'` (erased at runtime so the module loads cleanly in jsdom). `vite.config.ts` now imports `pwaOptions` from there and re-exports it for any consumer that prefers `import { pwaOptions } from './vite.config'`. The test imports from `vite.pwa-options` directly.
- **Why this preserves the R-2 single-source-of-truth guarantee:** vite.config.ts and the test reference the EXACT same `pwaOptions` object (vite.config.ts has zero shadow / copy / wrapper of the value). Any drift in vite.pwa-options.ts is reflected in both consumers simultaneously. The structural test still catches duplicate/commented-out drift.
- **Files modified:** `vite.config.ts` (slimmed; imports + re-exports `pwaOptions`); `vite.pwa-options.ts` (new — single source of truth).
- **Commit:** `2a59385` (folded into Task 3).
- **Authority:** The plan's Task 2 step 1 specifies "extracted-named-const pattern matches the Phase 11 `addDaysIso` / `nowIso` precedent — one source of truth, multiple consumers." Splitting that const into its own file (rather than living inside vite.config.ts) is a no-functional-change refinement of the same pattern — vite.config.ts still has a `pwaOptions` named export, the test still imports from a stable path, and a single runtime object continues to serve both consumers.

**2. [Rule 3 — Blocking issue] TypeScript error: `Property 'name' does not exist on type 'false'` in pwa-config.test.ts**

- **Found during:** Task 3, `npm run lint` after first pwa-config.test.ts draft.
- **Issue:** `pwaOptions.manifest` is typed as `false | Partial<ManifestOptions>` (the vite-plugin-pwa API allows `manifest: false` to disable manifest emission entirely). Optional-chain `pwaOptions.manifest?.name` doesn't narrow the `false` branch — TypeScript correctly objects with "Property 'name' does not exist on type 'false'".
- **Fix:** Added a local `const manifest = pwaOptions.manifest as Partial<ManifestOptions>` narrowing at the top of the test file, and rewrote all manifest assertions to use `manifest.<key>` instead of `pwaOptions.manifest?.<key>`. The cast is justified by the comment-documented invariant that we never set `manifest: false`; if a future regression introduced that value, the `manifest.icons.toHaveLength(4)` assertion (4 expected, 0 received) would catch it.
- **Files modified:** `src/__tests__/pwa-config.test.ts`.
- **Commit:** `2a59385` (folded into Task 3).

**3. [Rule 3 — Blocking issue] npm install failed with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`**

- **Found during:** Task 1, first `npm install -D vite-plugin-pwa@^1.3.0 @resvg/resvg-js@^2.6.2`.
- **Issue:** Corporate TLS interception breaks npm's cert chain validation for the npmjs.org registry. Same issue documented in the prompt and previously hit during Phases 10 & 11.
- **Fix:** Re-ran the install with `--strict-ssl=false` as a one-shot flag (NOT a config write). Scoped to the single npm invocation; global `npm config` UNCHANGED (verified `npm config get strict-ssl` still returns `true`).
- **Outcome:** 251 packages added, lockfile updated, both packages verified present in `node_modules/`.

### Auth Gates

None. No external auth, no API keys, no manual user steps.

## Verification Commands & Outputs

```
$ node -e "const p=require('./package.json'); console.log(p.devDependencies['vite-plugin-pwa'], p.devDependencies['@resvg/resvg-js']);"
^1.3.0 ^2.6.2

$ ls public/*.png | wc -l
5

$ npm run build 2>&1 | tail -10
✓ built in 6.43s
PWA v1.3.0
mode      generateSW
precache  14 entries (1553.46 KiB)
files generated
  dist/sw.js
  dist/workbox-9c191d2f.js
scan-aiza: OK — no Gemini key shapes in dist/

$ node -e "const m=JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8')); console.log(m.name, m.theme_color, m.background_color, m.display, m.icons.length);"
AussieLedger #141414 #E4E3E0 standalone 4

$ npx vitest run src/__tests__/pwa-config.test.ts 2>&1 | tail -5
Test Files  1 passed (1)
     Tests  17 passed (17)

$ grep -c "VITE_GEMINI" vite.config.ts
0

$ grep -c "apple-touch-icon" index.html; grep -c "theme-color" index.html; grep -c 'rel="manifest"' index.html
1
1
0

$ npm run scan:aiza 2>&1 | tail -1
scan-aiza: OK — no Gemini key shapes in dist/

$ npm test 2>&1 | tail -3
Test Files  111 passed (111)
     Tests  1114 passed | 11 todo (1125)

$ npm run lint 2>&1 | tail -3
> aussieledger@0.0.0 lint
> tsc --noEmit && tsc -p server/tsconfig.json --noEmit
```

## Plan-Level Success Criteria — Status

- [x] vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.2 in devDependencies; lockfile updated
- [x] 5 PNG icons rendered deterministically and committed to public/
- [x] scripts/build-pwa-icons.mjs exists (SPDX header, ~100 lines, idempotent)
- [x] vite.config.ts wires VitePWA with the locked workbox + manifest config; existing define/resolve/server blocks UNCHANGED
- [x] index.html gains apple-touch-icon link + theme-color meta; no manual manifest link
- [x] src/__tests__/pwa-manifest.test.ts + pwa-index-html.test.ts + pwa-config.test.ts contract-test the locked shape (R-2 hardening: replaces three brittle grep guards with one structural assertion)
- [x] `pwaOptions` exported as a named const importable by tests (via vite.pwa-options.ts; vite.config.ts re-exports it)
- [x] `npm run build` EXIT 0 (incl. AIza scan against the SW-expanded dist/)
- [x] `npm run lint` EXIT 0
- [x] `npm test`: 1084 baseline GREEN + 30 new GREEN (9 pwa-manifest + 4 pwa-index-html + 17 pwa-config); ZERO regressions
- [x] `dist/manifest.webmanifest` validates: name, short_name, theme_color, background_color, display, start_url, categories, 4 icons
- [x] "Installable" half of PWA-01 satisfied (Plan 13-2 verifies via Lighthouse smoke)

All ROADMAP Phase 13 success criteria items 1 & 3 are now GREEN (item 2 unlocks after 13-2 UpdateBanner; item 4 is delegated to Phase 11's IosItpBanner which already auto-hides on standalone — Plan 13-1's manifest provides the install path).

## Self-Check: PASSED

**Files claimed created — all verified present:**
- FOUND: scripts/build-pwa-icons.mjs
- FOUND: vite.pwa-options.ts
- FOUND: public/icon-192.png
- FOUND: public/icon-512.png
- FOUND: public/icon-192-maskable.png
- FOUND: public/icon-512-maskable.png
- FOUND: public/apple-touch-icon.png
- FOUND: src/__tests__/pwa-manifest.test.ts
- FOUND: src/__tests__/pwa-index-html.test.ts
- FOUND: src/__tests__/pwa-config.test.ts

**Commits claimed — all verified in git log:**
- FOUND: e5e60bd (Task 1)
- FOUND: c8abf69 (Task 2)
- FOUND: 2a59385 (Task 3)
