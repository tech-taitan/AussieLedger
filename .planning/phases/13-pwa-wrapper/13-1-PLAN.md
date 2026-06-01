---
phase: 13-pwa-wrapper
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - scripts/build-pwa-icons.mjs
  - public/icon-192.png
  - public/icon-512.png
  - public/icon-192-maskable.png
  - public/icon-512-maskable.png
  - public/apple-touch-icon.png
  - vite.config.ts
  - index.html
  - src/__tests__/pwa-manifest.test.ts
  - src/__tests__/pwa-index-html.test.ts
  - src/__tests__/pwa-config.test.ts
autonomous: true
requirements: [PWA-01]
tdd: false

must_haves:
  truths:
    - "package.json devDependencies contains vite-plugin-pwa@^1.3.0 (latest 1.3.x stable; verified Vite 6 peer-dep range ^3.1.0 || ... || ^8.0.0 in STACK.md) and @resvg/resvg-js@^2.6.x (pure WASM SVG→PNG rasterizer; zero native deps — Windows-cross-platform safe, avoiding sharp's better-sqlite3-style native-build complexity)"
    - "package.json scripts gain a NEW \"build:icons\": \"node scripts/build-pwa-icons.mjs\" entry — separate from the default \"build\" so icon regeneration is an explicit, infrequent operation (per CONTEXT 'commit PNGs; re-render only when icon design changes')"
    - "The default \"build\" script is UNCHANGED in shape: still vite build && node scripts/scan-aiza.mjs. vite-plugin-pwa hooks into vite build automatically; no script edit needed there. The build:icons script does NOT run on every CI build (PNGs are committed)."
    - "scripts/build-pwa-icons.mjs has an Apache 2.0 SPDX header at the top (project Phase 1 invariant on every new source file). It is a Node ESM module (.mjs) — uses import syntax, no CommonJS"
    - "scripts/build-pwa-icons.mjs renders 5 PNG files into public/: icon-192.png (192×192, transparent edges, Calculator centered), icon-512.png (512×512, same), icon-192-maskable.png (192×192, white-fill background with Calculator at 60% center — 20% safe-zone padding on each side per W3C maskable spec), icon-512-maskable.png (512×512, same), apple-touch-icon.png (180×180, white-fill background, Calculator centered — iOS requires opaque background; transparent apple-touch shows as black on Home Screen)"
    - "Visual: #3b82f6 (Tailwind blue-500) Calculator icon on the appropriate background (transparent for standard, white #ffffff for maskable + apple-touch). The Calculator SVG is hardcoded as a string constant in scripts/build-pwa-icons.mjs — derived from the lucide-react v0.546.0 Calculator icon node array (rect 4,2,16,20 rx=2 + horizontal line at y=6 + segment at right side + 9 dots at 8/12/16 × 10/14/18). Hardcoded (NOT runtime-imported from lucide-react) so the rendering script has zero runtime dependency on the React package — it's a build-script, not application code."
    - "The 5 PNG files are COMMITTED to git in public/ (not gitignored) — deterministic builds; CI never regenerates icons; users see exactly the icons reviewed in code review. public/ directory is RECREATED by this plan (it was deleted in the Phase 10 Vercel pivot when _redirects/_headers migrated to vercel.json; vite-plugin-pwa needs public/ for the Vite default static-copy behavior to include the icons in dist/)"
    - "vite.config.ts imports VitePWA from 'vite-plugin-pwa' and adds it to the existing plugins array AFTER react() and tailwindcss() — order matters for plugin ordering but in this case any position works; chosen tail position to keep the existing react()/tailwindcss() pair visually undisturbed for diff readability"
    - "vite.config.ts existing define block is UNCHANGED — still injects process.env.GEMINI_API_KEY only; NO new VITE_GEMINI_API_KEY (Pitfall #1 hardblock — never add a VITE_ prefix to the Gemini key). The existing resolve.alias and server.proxy blocks are also UNCHANGED."
    - "VitePWA configuration (locked from CONTEXT § decisions): registerType: 'prompt' (NOT 'autoUpdate' — Pitfall #12 force-reload-mid-form HARDBLOCK); strategies: 'generateSW' (NOT 'injectManifest' — no custom SW logic per CONTEXT); injectRegister: false (Plan 13-2 calls registerSW manually from useUpdateBanner hook — gives the banner control over the prompt lifecycle); devOptions: { enabled: false } (service worker MUST NOT register in npm run dev — verified by Plan 13-2 manual smoke); workbox: { skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'], navigateFallback: '/index.html', navigateFallbackDenylist: [/^\\/api\\//] } — ALL THREE skipWaiting+clientsClaim+cleanupOutdatedCaches are required by PITFALLS §3 HARDBLOCK; any missing causes the stale-cache user-stranded-on-old-version trap. navigateFallbackDenylist guards against SW intercepting /api/* (defensive — dev-only proxy concern, but harmless in production)"
    - "VitePWA manifest config has the VERBATIM values from CONTEXT (locked, do NOT word-smith): name: 'AussieLedger', short_name: 'AussieLedger', description: 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.', theme_color: '#141414' (--ink), background_color: '#E4E3E0' (--bg paper-warm), display: 'standalone', start_url: '/', categories: ['finance', 'productivity'], icons array with 4 entries: 192/512 standard (purpose default) + 192/512 maskable (purpose: 'maskable')"
    - "VitePWA includeAssets includes the apple-touch-icon.png explicitly: includeAssets: ['apple-touch-icon.png']. The 4 manifest icons are auto-emitted via the manifest.icons[].src paths (vite-plugin-pwa copies anything in public/ matched by globPatterns into the precache manifest)"
    - "index.html (currently 12 lines) gains TWO new <head> tags: <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\"> (iOS Safari ignores manifest icons for Add-to-Home-Screen; uses this tag) and <meta name=\"theme-color\" content=\"#141414\">. The <link rel=\"manifest\"> tag is NOT added manually — vite-plugin-pwa auto-injects it at build time via the includeManifestIcons + the manifest config. The existing <title>AussieLedger</title>, charset, viewport, root div, and main script tag are UNCHANGED."
    - "vercel.json is UNCHANGED. The existing CSP header (default-src 'none'; script-src 'self'; ...) already permits the SW: it is same-origin (auto-emitted to dist/sw.js by Workbox), so script-src 'self' covers it. No CSP edits needed; no connect-src widening needed (SW does NOT make external requests in v1.2's NetworkOnly /api/* + precache-only-other config)"
    - "scripts/scan-aiza.mjs is UNCHANGED. Its scope (dist/) now includes the SW + workbox-* runtime + precache manifest; the regex AIza[0-9A-Za-z_-]{35} doesn't false-match Workbox-generated strings (verified: Workbox emits revision hashes as plain hex/base64-shortened; no 35-char AIza-prefixed segments). The npm run build pipeline continues to exit 0 after vite-plugin-pwa is wired in."
    - "src/__tests__/pwa-manifest.test.ts is a NEW Vitest suite that reads dist/manifest.webmanifest (the file Workbox emits) and asserts: name === 'AussieLedger'; short_name === 'AussieLedger'; description matches the locked verbatim string; theme_color === '#141414'; background_color === '#E4E3E0'; display === 'standalone'; start_url === '/'; categories deep-equals ['finance', 'productivity']; icons array has 4 entries with purposes matching the 192/512 standard + 192/512 maskable shape; each icon entry has sizes + type: 'image/png' set"
    - "src/__tests__/pwa-manifest.test.ts uses describe.skipIf(!existsSync('dist/manifest.webmanifest'), ...) so that a developer running `npm test` WITHOUT a prior `npm run build` doesn't see a false-fail. CI runs `npm run build` before `npm test` (already; CI workflow unchanged), so the file exists and the assertions run. Documents the skip clearly: `console.warn('pwa-manifest tests skipped — run npm run build first')`"
    - "src/__tests__/pwa-index-html.test.ts is a NEW small Vitest suite that reads index.html (source, not dist) and asserts: contains exactly one <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\"> tag; contains exactly one <meta name=\"theme-color\" content=\"#141414\"> tag; does NOT contain a manually-added <link rel=\"manifest\"> tag (proves we rely on vite-plugin-pwa auto-injection). This locks the index.html shape against future drift."
    - "vite.config.ts factors the VitePWA option object into a top-level exported const: `export const pwaOptions = { registerType: 'prompt', strategies: 'generateSW', injectRegister: false, devOptions: { enabled: false }, includeAssets: [...], workbox: { skipWaiting: true, clientsClaim: true, cleanupOutdatedCaches: true, globPatterns: [...], navigateFallback: '/index.html', navigateFallbackDenylist: [/^\\/api\\//] }, manifest: { ...locked values... } } satisfies VitePWAOptions;` The plugins array calls VitePWA(pwaOptions). This refactor provides a single source of truth importable by tests — replaces the brittle grep-counts-lines guard with a hardened structural assertion (per plan-checker R-2: the original `grep -c` check counted matching LINES, so a duplicate skipWaiting on two lines plus a commented-out cleanupOutdatedCaches would still return 3 and silently break the PITFALLS §3 HARDBLOCK)."
    - "src/__tests__/pwa-config.test.ts is a NEW Vitest suite that imports { pwaOptions } from '../../vite.config' (TS module import works because vite.config.ts is a TS file already in the project and uses ESM). Asserts the EXACT object shape: pwaOptions.registerType === 'prompt' (Pitfall #12 lock); pwaOptions.strategies === 'generateSW'; pwaOptions.injectRegister === false; pwaOptions.devOptions.enabled === false (no SW in npm run dev — replaces the manual-smoke-only guard); pwaOptions.workbox.skipWaiting === true; pwaOptions.workbox.clientsClaim === true; pwaOptions.workbox.cleanupOutdatedCaches === true (ALL THREE — PITFALLS §3 HARDBLOCK; replaces the brittle grep-counts-lines guard); pwaOptions.workbox.navigateFallbackDenylist deep-equals [/^\\/api\\//]; pwaOptions.manifest.name === 'AussieLedger'; pwaOptions.manifest.theme_color === '#141414'; pwaOptions.manifest.background_color === '#E4E3E0'; pwaOptions.manifest.display === 'standalone'; pwaOptions.manifest.icons.length === 4 (2 standard + 2 maskable). This single test file covers planner-flagged items #2 (stale-cache HARDBLOCK), #3 (registerType lock), AND #4 (devOptions.enabled false lock) — the three softest guards in the original plan are all hardened in one place."
    - "Existing 1084 SPA GREEN + 11 todo + 0 RED + 18 server GREEN baseline preserved. ZERO existing test regresses. The two new test files add ~10-12 new green assertions (manifest validation suite + index.html validation suite)."
    - "npm run lint EXIT 0 (tsc --noEmit covers vite.config.ts and the new test files). npm run build EXIT 0 — Vite produces dist/ with sw.js, workbox-*.js, manifest.webmanifest, the 5 precached icons, and the SPA bundle; scan-aiza.mjs scans the expanded dist/ and exits 0."
  artifacts:
    - path: "package.json"
      provides: "Adds vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.x to devDependencies; adds build:icons script. Default build/scan-aiza/test/lint scripts UNCHANGED."
      contains: "vite-plugin-pwa"
    - path: "package-lock.json"
      provides: "Lockfile updated for vite-plugin-pwa + @resvg/resvg-js + their transitive deps (workbox-build, workbox-window via vite-plugin-pwa). Committed for deterministic CI installs."
      min_lines: 100
    - path: "scripts/build-pwa-icons.mjs"
      provides: "NEW — Node ESM build script + SPDX header. Hardcodes the lucide Calculator SVG paths as a string constant. Composes 3 source SVG variants (standard 24×24 viewBox transparent, maskable 24×24 viewBox with 60%-centered icon and 100% white background, apple-touch 24×24 viewBox with full-bleed white background). Rasterizes each at the required output dimensions via @resvg/resvg-js. Writes 5 PNGs to public/. Idempotent: re-running produces byte-identical outputs."
      exports: []
      min_lines: 80
      contains: "calculator"
    - path: "public/icon-192.png"
      provides: "192×192 PNG, transparent background, #3b82f6 Calculator centered. Committed."
      min_lines: 0
    - path: "public/icon-512.png"
      provides: "512×512 PNG, transparent background, #3b82f6 Calculator centered. Committed."
      min_lines: 0
    - path: "public/icon-192-maskable.png"
      provides: "192×192 PNG, white background, #3b82f6 Calculator at 60% center (20% safe-zone all sides per W3C maskable spec). Committed."
      min_lines: 0
    - path: "public/icon-512-maskable.png"
      provides: "512×512 PNG, white background, same 60% safe-zone shape as 192-maskable. Committed."
      min_lines: 0
    - path: "public/apple-touch-icon.png"
      provides: "180×180 PNG, white background (iOS requires opaque), #3b82f6 Calculator centered. Committed."
      min_lines: 0
    - path: "vite.config.ts"
      provides: "Adds import { VitePWA } from 'vite-plugin-pwa' + VitePWA(...) call appended to plugins array. Existing define / resolve / server.proxy blocks UNCHANGED."
      exports: ["default"]
      contains: "VitePWA"
    - path: "index.html"
      provides: "Adds <link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\"> and <meta name=\"theme-color\" content=\"#141414\"> in <head>. Existing tags UNCHANGED."
      min_lines: 14
      contains: "apple-touch-icon"
    - path: "src/__tests__/pwa-manifest.test.ts"
      provides: "NEW — validates dist/manifest.webmanifest against the locked CONTEXT values (name, short_name, description, theme_color, background_color, display, start_url, categories, icons array shape). Uses describe.skipIf to no-op when dist/ is absent."
      min_lines: 60
      contains: "manifest.webmanifest"
    - path: "src/__tests__/pwa-index-html.test.ts"
      provides: "NEW — validates index.html source contains the apple-touch-icon link + theme-color meta + does NOT contain a manual manifest link (proves auto-injection reliance)."
      min_lines: 30
      contains: "apple-touch-icon"
    - path: "src/__tests__/pwa-config.test.ts"
      provides: "NEW — imports { pwaOptions } from vite.config.ts and asserts the EXACT VitePWA options shape: registerType, strategies, injectRegister, devOptions.enabled, all three workbox stale-cache flags, navigateFallbackDenylist, and manifest locked values. Replaces three brittle grep-based guards (skipWaiting+clientsClaim+cleanupOutdatedCaches line-count / registerType / devOptions.enabled) with one hardened structural test per plan-checker R-2."
      min_lines: 50
      contains: "pwaOptions"
  key_links:
    - from: "scripts/build-pwa-icons.mjs"
      to: "@resvg/resvg-js"
      via: "import { Resvg } from '@resvg/resvg-js'"
      pattern: "from ['\"]@resvg\\/resvg-js['\"]"
    - from: "scripts/build-pwa-icons.mjs"
      to: "public/*.png (5 files)"
      via: "writeFileSync(join('public', '...'), pngBuffer)"
      pattern: "writeFileSync"
    - from: "vite.config.ts"
      to: "vite-plugin-pwa"
      via: "import { VitePWA } from 'vite-plugin-pwa' + VitePWA(...) in plugins array"
      pattern: "VitePWA\\("
    - from: "vite-plugin-pwa runtime"
      to: "public/icon-*.png + public/apple-touch-icon.png"
      via: "manifest.icons[].src + includeAssets — Vite copies public/ into dist/; Workbox precaches per globPatterns"
      pattern: "icon-(192|512)(-maskable)?\\.png|apple-touch-icon\\.png"
    - from: "index.html"
      to: "/apple-touch-icon.png"
      via: "<link rel=\"apple-touch-icon\" href=\"/apple-touch-icon.png\">"
      pattern: "rel=[\"']apple-touch-icon[\"']"
    - from: "src/__tests__/pwa-manifest.test.ts"
      to: "dist/manifest.webmanifest"
      via: "readFileSync + JSON.parse + structural assertions on locked CONTEXT values"
      pattern: "manifest\\.webmanifest"
    - from: "src/__tests__/pwa-config.test.ts"
      to: "vite.config.ts pwaOptions named export"
      via: "import { pwaOptions } from '../../vite.config' + deep structural asserts on the VitePWA options object (replaces 3 grep-based guards with one hardened test per plan-checker R-2)"
      pattern: "import \\{ pwaOptions \\}"
---

<objective>
Wire `vite-plugin-pwa@^1.3.0` into the Vite build with the locked stale-cache-prevention Workbox config (skipWaiting + clientsClaim + cleanupOutdatedCaches — all three required per PITFALLS §3 HARDBLOCK), build the 5 PNG icon assets via a deterministic Node script using `@resvg/resvg-js`, recreate the `public/` directory (deleted in the Phase 10 Vercel pivot), and add the iOS apple-touch-icon link + theme-color meta to `index.html`. Closes the "installable" half of PWA-01: Chrome's Lighthouse "Installable" audit will pass after this plan ships and is verified by the manifest contract test.

Purpose: Foundational PWA mechanics (manifest + icons + service worker config) that Plan 13-2's user-facing UpdateBanner consumes. Pure additive change — no UI surface, no app-behaviour change in `npm run dev` (devOptions.enabled=false), no schema impact.

Output: Committed icon PNGs in `public/`, extended `vite.config.ts`, extended `index.html`, build script + manifest contract tests, vite-plugin-pwa + @resvg/resvg-js in devDependencies.
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
@.planning/phases/13-pwa-wrapper/13-CONTEXT.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md
@.planning/phases/11-indexeddb-hardening/11-2-SUMMARY.md
@vite.config.ts
@index.html
@vercel.json
@package.json
@scripts/scan-aiza.mjs

<interfaces>
<!-- Key contracts/exports the executor uses directly — no codebase exploration needed. -->

From `vite.config.ts` (40 lines, current shape):
```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const apiTarget = env.API_PROXY_TARGET ?? 'http://localhost:4000';
  return {
    plugins: [react(), tailwindcss()],         // <-- VitePWA appended here
    define: {                                   // <-- UNCHANGED — do NOT touch
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },  // <-- UNCHANGED
    server: {                                                    // <-- UNCHANGED
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
  };
});
```

From `index.html` (12 lines, current shape):
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AussieLedger</title>
    <!-- INSERT: <link rel="apple-touch-icon" href="/apple-touch-icon.png"> -->
    <!-- INSERT: <meta name="theme-color" content="#141414"> -->
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

From `vercel.json` (CSP excerpt — UNCHANGED by this plan):
```
default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self';
connect-src 'self' https://generativelanguage.googleapis.com;
frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```
The Workbox-emitted `dist/sw.js` is same-origin → covered by `script-src 'self'`. No CSP edits needed.

From `lucide-react@0.546.0` Calculator icon node array (for hardcoding in build-pwa-icons.mjs):
```js
// Original 24×24 viewBox; stroke="currentColor"; stroke-width=2 default
[
  ["rect",  { width: 16, height: 20, x: 4, y: 2, rx: 2 }],
  ["line",  { x1: 8, x2: 16, y1: 6, y2: 6 }],
  ["line",  { x1: 16, x2: 16, y1: 14, y2: 18 }],
  ["path",  { d: "M16 10h.01" }],
  ["path",  { d: "M12 10h.01" }],
  ["path",  { d: "M8 10h.01" }],
  ["path",  { d: "M12 14h.01" }],
  ["path",  { d: "M8 14h.01" }],
  ["path",  { d: "M12 18h.01" }],
  ["path",  { d: "M8 18h.01" }],
]
```

From `vite-plugin-pwa@^1.3.0` (relevant config option types, per STACK.md):
```ts
VitePWA({
  registerType: 'prompt' | 'autoUpdate',
  strategies: 'generateSW' | 'injectManifest',
  injectRegister: 'auto' | 'inline' | 'script' | null | false,
  devOptions: { enabled: boolean },
  includeAssets: string[],
  workbox: {
    skipWaiting: boolean,
    clientsClaim: boolean,
    cleanupOutdatedCaches: boolean,
    globPatterns: string[],
    navigateFallback: string,
    navigateFallbackDenylist: RegExp[],
  },
  manifest: {
    name: string, short_name: string, description: string,
    theme_color: string, background_color: string,
    display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser',
    start_url: string, categories: string[],
    icons: Array<{ src: string; sizes: string; type: string; purpose?: 'any' | 'maskable' | 'monochrome' }>,
  },
})
```

From `@resvg/resvg-js@^2.6.x` (pure-WASM SVG→PNG, zero native deps):
```ts
import { Resvg } from '@resvg/resvg-js';
const resvg = new Resvg(svgString, { fitTo: { mode: 'width', value: 192 } });
const pngBuffer: Buffer = resvg.render().asPng();
```
</interfaces>

<facts>
**Repo state (verified at plan time):**
- `public/` directory does NOT exist (deleted in Phase 10 Vercel pivot; `_redirects` + `_headers` migrated to `vercel.json`).
- `vite.config.ts`: 40 lines, minimal, plugins array is `[react(), tailwindcss()]`.
- `index.html`: 12 lines, post-Phase-11 rename, `<title>AussieLedger</title>` already correct.
- `lucide-react@0.546.0` already in dependencies — Calculator icon node data above.
- `vite-plugin-pwa` NOT yet installed (verified `node_modules/vite-plugin-pwa` does not exist).
- `@resvg/resvg-js` NOT yet installed.
- `scripts/scan-aiza.mjs` (Phase 10): scans `dist/` for `AIza[0-9A-Za-z_-]{35}`; runs as part of `npm run build`.
- `vercel.json` CSP: `script-src 'self'` — same-origin SW covered.
- Baseline tests: 1084 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.

**Critical invariants (must NOT be violated):**
- PWA stale-cache HARDBLOCK: `skipWaiting + clientsClaim + cleanupOutdatedCaches` — ALL THREE required.
- `registerType: 'prompt'` (NOT `'autoUpdate'`) — Pitfall #12.
- `devOptions: { enabled: false }` — no SW in `npm run dev`.
- `vite.config.ts` `define` block UNCHANGED (no `VITE_GEMINI_API_KEY` ever — Pitfall #1 HARDBLOCK).
- Apache 2.0 SPDX header on every new source file (`scripts/build-pwa-icons.mjs`, the two new test files).
- File naming: `13-N-PLAN.md` exactly (NOT slug-suffixed — Phase 10 bug).
</facts>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install vite-plugin-pwa + @resvg/resvg-js; write the icon build script; generate and commit the 5 PNGs</name>
  <files>package.json, package-lock.json, scripts/build-pwa-icons.mjs, public/icon-192.png, public/icon-512.png, public/icon-192-maskable.png, public/icon-512-maskable.png, public/apple-touch-icon.png</files>
  <action>
    Install the two new devDependencies and create the deterministic icon-rendering pipeline. Concrete steps:

    1. **Install dependencies** (single npm command, NOT two separate ones — single lockfile write):
       ```
       npm install -D vite-plugin-pwa@^1.3.0 @resvg/resvg-js@^2.6.2
       ```
       Verify package.json devDependencies now contains both entries. Verify lockfile updated. Do NOT pin to exact patch (use ^).

    2. **Create the `public/` directory** at repo root. It does not currently exist (deleted Phase 10).
       Verify with `ls public/` after creation.

    3. **Write `scripts/build-pwa-icons.mjs`** — Node ESM module with SPDX header. Structure:
       - Apache 2.0 SPDX comment header (matches existing scripts/scan-aiza.mjs style — comment block at top)
       - `import { Resvg } from '@resvg/resvg-js';` + `import { writeFileSync, mkdirSync } from 'node:fs';` + `import { join } from 'node:path';`
       - Hardcoded constant `CALCULATOR_SVG_PATHS` — the 10 SVG primitive elements from the lucide-react Calculator icon node array (rect + 2 lines + 7 paths). Format: a single string template literal containing the inner-SVG-content (without the outer `<svg>` wrapper).
       - Helper `function buildSvg({ size, padding, bgColor, strokeColor }): string` — composes a complete SVG document:
         - `viewBox="0 0 24 24"` (matches lucide's coordinate space)
         - Optional `<rect width="24" height="24" fill="${bgColor}"/>` if `bgColor !== 'transparent'`
         - Wrap the icon primitives in a `<g transform="translate(...) scale(...)">` to apply the padding (for maskable variants: scale 0.6, translate to center → places the icon in the central 60% × 60% with 20% safe-zone padding all sides)
         - All primitives use `stroke="${strokeColor}"` `stroke-width="2"` `stroke-linecap="round"` `stroke-linejoin="round"` `fill="none"` (lucide's default rendering attributes)
       - Helper `function render({ svg, sizePx }): Buffer` — uses `new Resvg(svg, { fitTo: { mode: 'width', value: sizePx }, background: 'rgba(0,0,0,0)' }).render().asPng()`
       - Main flow (top-level, no main() wrapper needed in ESM):
         ```js
         mkdirSync('public', { recursive: true });
         const BLUE = '#3b82f6';
         const WHITE = '#ffffff';

         // Standard 192/512 — transparent bg, full-size icon
         const stdSvg = buildSvg({ size: 24, padding: 0, bgColor: 'transparent', strokeColor: BLUE });
         writeFileSync(join('public', 'icon-192.png'), render({ svg: stdSvg, sizePx: 192 }));
         writeFileSync(join('public', 'icon-512.png'), render({ svg: stdSvg, sizePx: 512 }));

         // Maskable 192/512 — white bg, icon scaled to 60% center
         const maskSvg = buildSvg({ size: 24, padding: 4.8 /* 20% of 24 */, bgColor: WHITE, strokeColor: BLUE });
         writeFileSync(join('public', 'icon-192-maskable.png'), render({ svg: maskSvg, sizePx: 192 }));
         writeFileSync(join('public', 'icon-512-maskable.png'), render({ svg: maskSvg, sizePx: 512 }));

         // Apple-touch 180×180 — white bg (iOS requires opaque), full-size icon
         const appleSvg = buildSvg({ size: 24, padding: 0, bgColor: WHITE, strokeColor: BLUE });
         writeFileSync(join('public', 'apple-touch-icon.png'), render({ svg: appleSvg, sizePx: 180 }));

         console.log('build-pwa-icons: OK — wrote 5 PNGs to public/');
         ```

    4. **Add the `build:icons` npm script** to package.json (under existing scripts block):
       ```
       "build:icons": "node scripts/build-pwa-icons.mjs"
       ```
       Place AFTER the existing `"build"` entry, BEFORE `"build:server"` (alphabetical-ish grouping). Do NOT modify the existing `"build"` script.

    5. **Run the build script ONCE** to generate the PNGs:
       ```
       npm run build:icons
       ```
       Expect output: `build-pwa-icons: OK — wrote 5 PNGs to public/`. Verify the 5 files exist with `ls public/` — sizes should be small (each well under 50 KB for a simple icon).

    6. **DO NOT manually inspect/touch the PNGs** — they are deterministic outputs of the script. If a future design change needs different colours/shapes, edit the script + re-run, do not edit the PNGs directly.

    Avoid:
    - Do NOT use `sharp` (native dep; Windows native-build complexity matches better-sqlite3 pain).
    - Do NOT use Node's built-in canvas (not in stdlib; would need `node-canvas` native dep).
    - Do NOT runtime-import from `lucide-react` in the script — the script is build-only and the React package is not designed for headless SVG generation. Hardcode the paths as a string constant.
  </action>
  <verify>
    <automated>npm install --dry-run 2>&1 | grep -E "(vite-plugin-pwa|@resvg/resvg-js)" && node -e "const p=require('./package.json'); console.log(p.devDependencies['vite-plugin-pwa'], p.devDependencies['@resvg/resvg-js'], p.scripts['build:icons'])" && test -f public/icon-192.png && test -f public/icon-512.png && test -f public/icon-192-maskable.png && test -f public/icon-512-maskable.png && test -f public/apple-touch-icon.png && echo OK_5_PNGS</automated>
  </verify>
  <done>
    package.json devDependencies contains vite-plugin-pwa@^1.3.0 and @resvg/resvg-js@^2.6.x. package.json scripts has build:icons. scripts/build-pwa-icons.mjs exists with SPDX header and renders 5 deterministic PNGs. public/ directory exists with 5 PNG files committed. Re-running `npm run build:icons` produces byte-identical outputs (idempotent).
  </done>
</task>

<task type="auto">
  <name>Task 2: Wire VitePWA into vite.config.ts; add apple-touch + theme-color tags to index.html</name>
  <files>vite.config.ts, index.html</files>
  <action>
    Extend the Vite config and HTML head with the locked PWA configuration. Concrete steps:

    1. **Edit `vite.config.ts`** — add VitePWA import + plugin call. The existing file is 40 lines; minimal touch:

       At the top of the imports block (after existing imports, before `defineConfig`):
       ```ts
       import { VitePWA, type VitePWAOptions } from 'vite-plugin-pwa';
       ```

       **R-2 hardening — extract options as a named export.** ABOVE the `export default defineConfig(...)` line, declare and export the PWA options as a separate const. This is the single source of truth that the new `src/__tests__/pwa-config.test.ts` (Task 3) imports and structurally asserts against. Inline-passing the object to `VitePWA(...)` would force the test to either parse vite.config.ts as text (brittle) or duplicate the config (drift risk). Extracted-named-const pattern matches the Phase 11 `addDaysIso` / `nowIso` precedent — one source of truth, multiple consumers.

       ```ts
       // Exported so src/__tests__/pwa-config.test.ts can structurally assert
       // the PITFALLS §3 HARDBLOCK + Pitfall #12 locks (per plan-checker R-2).
       export const pwaOptions: Partial<VitePWAOptions> = {
         registerType: 'prompt',
         strategies: 'generateSW',
         injectRegister: false,  // Plan 13-2 calls registerSW manually from useUpdateBanner
         devOptions: { enabled: false },  // SW MUST NOT register in `npm run dev`
         includeAssets: ['apple-touch-icon.png'],
         workbox: {
           // Phase 13 PITFALLS §3 HARDBLOCK: all three required
           skipWaiting: true,
           clientsClaim: true,
           cleanupOutdatedCaches: true,
           globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
           navigateFallback: '/index.html',
           // Defensive: never let SW intercept /api/* (dev-only proxy concern; harmless in production)
           navigateFallbackDenylist: [/^\/api\//],
         },
         manifest: {
           // CONTEXT-locked verbatim values; do NOT word-smith
           name: 'AussieLedger',
           short_name: 'AussieLedger',
           description: 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.',
           theme_color: '#141414',
           background_color: '#E4E3E0',
           display: 'standalone',
           start_url: '/',
           categories: ['finance', 'productivity'],
           icons: [
             { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
             { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
             { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
             { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
           ],
         },
       };
       ```

       Then in the `plugins` array, append `VitePWA(pwaOptions)` AFTER the existing two entries:
       ```ts
       plugins: [
         react(),
         tailwindcss(),
         VitePWA(pwaOptions),
       ],
       ```

       **CRITICAL: do NOT touch these existing blocks:**
       - `define: { 'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY) }` — Phase 10 invariant; adding ANY `VITE_GEMINI_API_KEY` is Pitfall #1 HARDBLOCK
       - `resolve: { alias: { '@': path.resolve(__dirname, '.') } }`
       - `server: { hmr: ..., proxy: { '/api': ... } }`

       The `defineConfig(({ mode }) => { ... })` wrapper shape stays identical.

    2. **Edit `index.html`** — add 2 new tags in `<head>`. Current head (lines 3-7):
       ```html
       <head>
         <meta charset="UTF-8" />
         <meta name="viewport" content="width=device-width, initial-scale=1.0" />
         <title>AussieLedger</title>
       </head>
       ```

       After the existing `<title>` line, BEFORE `</head>`, insert:
       ```html
         <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
         <meta name="theme-color" content="#141414" />
       ```

       **DO NOT manually add `<link rel="manifest">`** — vite-plugin-pwa auto-injects this at build time via the `injectRegister: false` path (the manifest link is separate from the script register; the plugin still emits the manifest link). The pwa-index-html.test.ts test in Task 3 verifies we have NOT added it manually.

       Result: index.html is 14 lines instead of 12. All existing tags (charset, viewport, title, root div, script) UNCHANGED.

    3. **Build to verify wiring** — run `npm run build`. Expect:
       - Vite emits `dist/index.html` (with the auto-injected manifest link + theme-color meta + apple-touch-icon link preserved from source)
       - Vite emits `dist/manifest.webmanifest` with the locked CONTEXT values
       - Vite emits `dist/sw.js` (Workbox service worker) + `dist/workbox-*.js` (runtime)
       - Vite copies the 5 icons from public/ into dist/ via Vite's built-in public-dir static copy
       - `scripts/scan-aiza.mjs` (post-build step) scans the expanded dist/ and exits 0 (no AIza false-positives from Workbox-generated strings)
       - Total build exit code: 0

    Avoid:
    - Do NOT add a `<link rel="manifest" href="...">` tag manually in index.html. The plugin handles it.
    - Do NOT add `injectRegister: 'auto'` — that would inject inline `<script>navigator.serviceWorker.register(...)</script>` which conflicts with Plan 13-2's `useUpdateBanner` hook taking control of `registerSW`.
    - Do NOT widen `globPatterns` to include `.json` or `.wasm` — keep the locked list. Adding `.wasm` could accidentally precache a hypothetical future sqlite-wasm payload (v2.0 territory).
    - Do NOT set `workbox.runtimeCaching` — leave it default-empty. CONTEXT explicitly says "No runtime caching for /api/*" (NetworkOnly default) and "No runtime caching for Google Fonts" (browser HTTP cache handles them after first fetch).
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -20 && test -f dist/manifest.webmanifest && test -f dist/sw.js && test -f dist/icon-192.png && test -f dist/apple-touch-icon.png && node -e "const m=JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8')); if(m.name!=='AussieLedger'||m.theme_color!=='#141414'||m.background_color!=='#E4E3E0'||m.display!=='standalone'||m.icons.length!==4){console.error('manifest values wrong',m);process.exit(1);} console.log('manifest OK')" && grep -q "apple-touch-icon" index.html && grep -q "theme-color" index.html && echo BUILD_AND_HTML_OK</automated>
  </verify>
  <done>
    vite.config.ts contains VitePWA(...) with all three workbox stale-cache flags + registerType:'prompt' + devOptions.enabled:false. index.html contains the apple-touch-icon link + theme-color meta. `npm run build` exits 0 and produces dist/manifest.webmanifest with the locked CONTEXT values, dist/sw.js (Workbox), and the 5 icons copied from public/. AIza scan still passes. Existing define/resolve/server blocks in vite.config.ts UNCHANGED.
  </done>
</task>

<task type="auto">
  <name>Task 3: Write the three contract tests (pwa-manifest + pwa-index-html + pwa-config); baseline all suites GREEN</name>
  <files>src/__tests__/pwa-manifest.test.ts, src/__tests__/pwa-index-html.test.ts, src/__tests__/pwa-config.test.ts</files>
  <action>
    Lock the locked-from-CONTEXT manifest shape, the index.html additions, AND (per plan-checker R-2) the vite.config.ts pwaOptions object shape against future drift. Three small Vitest files. The new pwa-config.test.ts replaces three brittle grep guards (lines #5, #6, #7 of the original verification block) with one hardened structural test that imports the actual pwaOptions named export from vite.config.ts.

    1. **Write `src/__tests__/pwa-manifest.test.ts`** with SPDX header. Structure:
       ```ts
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Phase 13 PWA-01 — locks the CONTEXT-locked manifest values against drift.
        * Reads dist/manifest.webmanifest after vite-plugin-pwa emission.
        *
        * Skip-mode: if dist/manifest.webmanifest does not exist (developer ran
        * `npm test` without `npm run build` first), the suite skips with a console
        * warning. CI runs `npm run build` before `npm test` so on CI the artifact
        * exists and assertions run.
        */
       import { describe, it, expect } from 'vitest';
       import { readFileSync, existsSync } from 'node:fs';

       const MANIFEST_PATH = 'dist/manifest.webmanifest';
       const hasManifest = existsSync(MANIFEST_PATH);

       describe.skipIf(!hasManifest)('PWA manifest contract (dist/manifest.webmanifest)', () => {
         const manifest = hasManifest
           ? JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))
           : {};

         it('name === "AussieLedger"', () => {
           expect(manifest.name).toBe('AussieLedger');
         });

         it('short_name === "AussieLedger"', () => {
           expect(manifest.short_name).toBe('AussieLedger');
         });

         it('description matches locked verbatim CONTEXT string', () => {
           expect(manifest.description).toBe(
             'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'
           );
         });

         it('theme_color === "#141414" (--ink)', () => {
           expect(manifest.theme_color).toBe('#141414');
         });

         it('background_color === "#E4E3E0" (--bg paper-warm)', () => {
           expect(manifest.background_color).toBe('#E4E3E0');
         });

         it('display === "standalone"', () => {
           expect(manifest.display).toBe('standalone');
         });

         it('start_url === "/"', () => {
           expect(manifest.start_url).toBe('/');
         });

         it('categories deep-equals ["finance", "productivity"]', () => {
           expect(manifest.categories).toEqual(['finance', 'productivity']);
         });

         it('icons has 4 entries: 192/512 standard + 192/512 maskable', () => {
           expect(manifest.icons).toHaveLength(4);
           const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
           expect(sizes.filter((s: string) => s === '192x192')).toHaveLength(2);
           expect(sizes.filter((s: string) => s === '512x512')).toHaveLength(2);
           const purposes = manifest.icons
             .map((i: { purpose?: string }) => i.purpose)
             .filter((p: string | undefined) => p === 'maskable');
           expect(purposes).toHaveLength(2);
           manifest.icons.forEach((icon: { type: string }) => {
             expect(icon.type).toBe('image/png');
           });
         });
       });

       if (!hasManifest) {
         // eslint-disable-next-line no-console
         console.warn(
           'pwa-manifest.test.ts: dist/manifest.webmanifest not found — skipping suite. Run `npm run build` first to validate the manifest contract.'
         );
       }
       ```

    2. **Write `src/__tests__/pwa-index-html.test.ts`** with SPDX header. Smaller — reads the source `index.html`:
       ```ts
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Phase 13 PWA-01 — locks index.html shape:
        *   - exactly one <link rel="apple-touch-icon" href="/apple-touch-icon.png">
        *   - exactly one <meta name="theme-color" content="#141414">
        *   - NO manual <link rel="manifest"> (we rely on vite-plugin-pwa auto-injection)
        */
       import { describe, it, expect } from 'vitest';
       import { readFileSync } from 'node:fs';

       describe('index.html PWA tags', () => {
         const html = readFileSync('index.html', 'utf8');

         it('contains exactly one apple-touch-icon link with the expected href', () => {
           const matches = html.match(/<link\s+rel=["']apple-touch-icon["']\s+href=["']\/apple-touch-icon\.png["']\s*\/?>/g);
           expect(matches).not.toBeNull();
           expect(matches).toHaveLength(1);
         });

         it('contains exactly one theme-color meta with value #141414', () => {
           const matches = html.match(/<meta\s+name=["']theme-color["']\s+content=["']#141414["']\s*\/?>/g);
           expect(matches).not.toBeNull();
           expect(matches).toHaveLength(1);
         });

         it('does NOT contain a manually-added <link rel="manifest"> tag', () => {
           // vite-plugin-pwa auto-injects this at build time; a manual entry would create a duplicate
           const matches = html.match(/<link\s+rel=["']manifest["']/g);
           expect(matches).toBeNull();
         });

         it('still has the existing <title>AussieLedger</title>', () => {
           expect(html).toContain('<title>AussieLedger</title>');
         });
       });
       ```

    3. **Write `src/__tests__/pwa-config.test.ts`** with SPDX header — the R-2 hardening test. Imports `pwaOptions` directly from `vite.config` (TS module, ESM, alias `@` not needed — relative import). Asserts the EXACT shape of every option that maps to a HARDBLOCK or Pitfall lock:

       ```ts
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Phase 13 PWA-01 — locks the vite.config.ts pwaOptions named-export shape.
        * Per plan-checker R-2: replaces three brittle grep-based guards in the original
        * verification block (skipWaiting/clientsClaim/cleanupOutdatedCaches LINE count,
        * registerType lookup, devOptions.enabled lookup) with one hardened structural
        * assertion that catches duplicate/commented-out drift the grep guards missed.
        *
        * Covers:
        *   - PITFALLS §3 HARDBLOCK (all three stale-cache flags must be true)
        *   - Pitfall #12 (registerType MUST be 'prompt', NOT 'autoUpdate')
        *   - Phase 13 invariant (devOptions.enabled MUST be false — no SW in npm run dev)
        *   - CONTEXT-locked manifest values
        */
       import { describe, it, expect } from 'vitest';
       import { pwaOptions } from '../../vite.config';

       describe('vite.config.ts pwaOptions named export', () => {
         describe('PITFALLS §3 HARDBLOCK — stale-cache prevention', () => {
           it('workbox.skipWaiting === true', () => {
             expect(pwaOptions.workbox?.skipWaiting).toBe(true);
           });
           it('workbox.clientsClaim === true', () => {
             expect(pwaOptions.workbox?.clientsClaim).toBe(true);
           });
           it('workbox.cleanupOutdatedCaches === true', () => {
             expect(pwaOptions.workbox?.cleanupOutdatedCaches).toBe(true);
           });
         });

         describe('Pitfall #12 — registerType lock', () => {
           it("registerType === 'prompt' (NOT 'autoUpdate' — never force-reload mid-form)", () => {
             expect(pwaOptions.registerType).toBe('prompt');
           });
         });

         describe('npm run dev SW absence lock', () => {
           it('devOptions.enabled === false (SW MUST NOT register in dev)', () => {
             expect(pwaOptions.devOptions?.enabled).toBe(false);
           });
         });

         describe('Workbox strategy + register-injection lock', () => {
           it("strategies === 'generateSW' (NOT 'injectManifest')", () => {
             expect(pwaOptions.strategies).toBe('generateSW');
           });
           it('injectRegister === false (Plan 13-2 useUpdateBanner controls registerSW)', () => {
             expect(pwaOptions.injectRegister).toBe(false);
           });
           it('navigateFallbackDenylist contains /^\\/api\\// regex', () => {
             const denylist = pwaOptions.workbox?.navigateFallbackDenylist as RegExp[];
             expect(denylist).toBeDefined();
             expect(denylist).toHaveLength(1);
             expect(denylist[0].source).toBe('^\\/api\\/');
           });
         });

         describe('CONTEXT-locked manifest values', () => {
           it("manifest.name === 'AussieLedger'", () => {
             expect(pwaOptions.manifest?.name).toBe('AussieLedger');
           });
           it("manifest.short_name === 'AussieLedger'", () => {
             expect(pwaOptions.manifest?.short_name).toBe('AussieLedger');
           });
           it("manifest.theme_color === '#141414' (--ink)", () => {
             expect(pwaOptions.manifest?.theme_color).toBe('#141414');
           });
           it("manifest.background_color === '#E4E3E0' (--bg paper-warm)", () => {
             expect(pwaOptions.manifest?.background_color).toBe('#E4E3E0');
           });
           it("manifest.display === 'standalone'", () => {
             expect(pwaOptions.manifest?.display).toBe('standalone');
           });
           it("manifest.start_url === '/'", () => {
             expect(pwaOptions.manifest?.start_url).toBe('/');
           });
           it('manifest.icons has 4 entries (2 standard + 2 maskable)', () => {
             expect(pwaOptions.manifest?.icons).toHaveLength(4);
             const maskable = pwaOptions.manifest!.icons!.filter(
               (i) => i.purpose === 'maskable'
             );
             expect(maskable).toHaveLength(2);
           });
         });
       });
       ```

       Why this test is stronger than the original grep guards:
       - The old `grep -c "skipWaiting: true\|clientsClaim: true\|cleanupOutdatedCaches: true" vite.config.ts == 3` counts matching LINES. A future regression that duplicates `skipWaiting: true` on two lines AND comments out `cleanupOutdatedCaches: true` returns the same `3` and silently breaks the HARDBLOCK. The structural test reads the actual runtime object — duplication is invisible, commented-out flags evaluate to `undefined`, which fails `.toBe(true)`.
       - The old `grep "registerType:"` and `grep "devOptions:"` only check for the presence of the KEY, not the VALUE. The test checks the value exactly.

    4. **Run the full test suite**:
       ```
       npm test
       ```
       Expect: previous 1084 SPA GREEN + 11 todo + 0 RED baseline + ~28 new GREEN (8 from pwa-manifest + 4 from pwa-index-html + ~16 from pwa-config). Total: ~1112 SPA GREEN. ZERO failures, ZERO new todos, ZERO new red. If pwa-manifest suite shows "skipped" (e.g. local run without prior build), that's expected for the local dev path; on CI it runs because CI does `npm run build` first. The pwa-config suite does NOT need a build artefact — it imports the source vite.config.ts directly.

    5. **Run lint to confirm tsc compiles**:
       ```
       npm run lint
       ```
       Expect: EXIT 0. The three new test files use Vitest types already in tsconfig include path. The pwa-config.test.ts import of `pwaOptions` from `../../vite.config` resolves correctly because vite.config.ts is included in the root tsconfig.

    Avoid:
    - Do NOT write regex tests against `dist/index.html` (the Workbox-injected version) — vite-plugin-pwa's injection order can vary across patch releases; locking the source index.html is the stable surface.
    - Do NOT assert on specific Workbox bundle paths (e.g. `dist/workbox-abc123.js`) — those have hashed filenames that change per build.
    - Do NOT pre-build in this task — the verify command in Task 2 already built, so dist/ should exist at this point in the wave. If a fresh execution starts at Task 3, the manifest suite simply skips.
  </action>
  <verify>
    <automated>npm test -- --run src/__tests__/pwa-config.test.ts 2>&1 | tail -10 && npm test -- --run --reporter=verbose 2>&1 | tail -30 && npm run lint 2>&1 | tail -3</automated>
  </verify>
  <done>
    src/__tests__/pwa-manifest.test.ts, src/__tests__/pwa-index-html.test.ts, AND src/__tests__/pwa-config.test.ts exist with SPDX headers. Full Vitest suite passes — at minimum 1084 baseline + 4 new from pwa-index-html.test + ~16 from pwa-config.test (pwa-manifest may skip locally; runs on CI). `npm run lint` EXIT 0. `npm run build` still EXIT 0 (incl. AIza scan). The locked CONTEXT manifest values, the two index.html tags, AND the vite.config.ts pwaOptions shape (including the PITFALLS §3 HARDBLOCK + Pitfall #12 registerType lock + devOptions.enabled false lock) are now all contract-tested against future drift — replacing three brittle grep guards per plan-checker R-2.
  </done>
</task>

</tasks>

<verification>
**Phase-level checks at end of Plan 13-1:**

1. **devDependencies present:**
   ```
   node -e "const p=require('./package.json'); console.log(p.devDependencies['vite-plugin-pwa'], p.devDependencies['@resvg/resvg-js'])"
   ```
   Expect: `^1.3.0 ^2.6.x`

2. **5 PNGs committed:**
   ```
   ls public/*.png | wc -l
   ```
   Expect: `5`

3. **Build produces SW + manifest + icons:**
   ```
   npm run build 2>&1 | tail -3 && ls dist/sw.js dist/manifest.webmanifest dist/icon-192.png dist/icon-512.png dist/icon-192-maskable.png dist/icon-512-maskable.png dist/apple-touch-icon.png
   ```
   Expect: build EXIT 0 + 7 files listed.

4. **Manifest has locked CONTEXT values:**
   ```
   node -e "const m=JSON.parse(require('fs').readFileSync('dist/manifest.webmanifest','utf8')); console.log(m.name, m.theme_color, m.background_color, m.display, m.icons.length)"
   ```
   Expect: `AussieLedger #141414 #E4E3E0 standalone 4`

5. **vite.config.ts pwaOptions shape locked (PITFALLS §3 HARDBLOCK + Pitfall #12 registerType + devOptions.enabled false) — hardened structural test (per plan-checker R-2, replaces three brittle grep guards):**
   ```
   npm test -- --run src/__tests__/pwa-config.test.ts
   ```
   Expect: all ~16 assertions GREEN. The test imports `pwaOptions` from vite.config.ts and asserts `workbox.skipWaiting === true`, `workbox.clientsClaim === true`, `workbox.cleanupOutdatedCaches === true` (PITFALLS §3 HARDBLOCK), `registerType === 'prompt'` (Pitfall #12), `devOptions.enabled === false` (npm run dev SW absence), plus strategies/injectRegister/navigateFallbackDenylist/manifest values. A future regression that duplicates a flag on two lines or comments-out a flag is invisible to the original `grep -c` (which counts matching LINES) — this structural test reads the actual runtime object so duplicates collapse and comments evaluate to undefined.

8. **vite.config.ts define block UNCHANGED (no VITE_GEMINI_API_KEY — Pitfall #1):**
   ```
   grep -c "VITE_GEMINI" vite.config.ts
   ```
   Expect: `0`

9. **index.html has apple-touch-icon + theme-color (and NO manual manifest link):**
   ```
   grep -c "apple-touch-icon\|theme-color" index.html && grep -c "rel=\"manifest\"" index.html
   ```
   Expect: `2` then `0`

10. **AIza scan still passes against the expanded dist/ (which now includes sw.js + workbox-*.js + precache manifest):**
    ```
    npm run scan:aiza
    ```
    Expect: `scan-aiza: OK — no Gemini key shapes in dist/`

11. **Full test suite GREEN; build EXIT 0; lint EXIT 0:**
    ```
    npm test 2>&1 | tail -5 && npm run lint 2>&1 | tail -3
    ```
    Expect: 1084 + ~12 GREEN; lint EXIT 0.
</verification>

<success_criteria>
- vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.x added to devDependencies; lockfile updated
- 5 PNG icons rendered deterministically and committed to public/
- scripts/build-pwa-icons.mjs exists (SPDX header, ~80-100 lines) and is idempotent
- vite.config.ts wires VitePWA with locked workbox + manifest config; existing define/resolve/server blocks UNCHANGED
- index.html gains apple-touch-icon link + theme-color meta; no manual manifest link
- src/__tests__/pwa-manifest.test.ts + src/__tests__/pwa-index-html.test.ts + src/__tests__/pwa-config.test.ts contract-test the locked shape (third test added per plan-checker R-2: replaces three brittle grep guards in the verify block with one hardened structural assertion that catches duplicate / commented-out drift the grep guards missed)
- vite.config.ts exports `pwaOptions` as a named const (single source of truth importable by pwa-config.test.ts; per R-2 refactor)
- npm run build EXIT 0 (incl. AIza scan against the SW-expanded dist/)
- npm run lint EXIT 0
- npm test: 1084 baseline GREEN + ~28 new GREEN (8 pwa-manifest + 4 pwa-index-html + ~16 pwa-config); ZERO regressions
- dist/manifest.webmanifest validates: name, short_name, theme_color, background_color, display, start_url, categories, 4 icons
- "Installable" half of PWA-01 is satisfied (Chrome Lighthouse will pass; Plan 13-2 verifies via manual smoke)

**Out of scope (deferred to Plan 13-2 or later, per CONTEXT § deferred):**
- UpdateBanner component + useUpdateBanner hook + App.tsx wiring (Plan 13-2)
- registerSW call from app code (Plan 13-2; injectRegister:false reserves the wire)
- Lighthouse audit smoke (Plan 13-2 checkpoint)
- @vite-pwa/assets-generator (overkill for 5 PNGs)
- Custom AussieLedger brand mark (future polish milestone)
- Runtime caching for /api/* (NetworkOnly default suffices)
- Desktop beforeinstallprompt button (rely on browser-native URL-bar affordance)
- iOS-specific install banner from Phase 13 (Phase 11's IosItpBanner is the iOS install affordance)
- Push notifications / background sync (explicit anti-features)
- Workbox advanced strategies / route-specific caching (precache + NetworkOnly covers v1.2)
- PWA shortcuts manifest entry (possible v1.3 polish)
</success_criteria>

<output>
After completion, create `.planning/phases/13-pwa-wrapper/13-1-SUMMARY.md` per the standard summary template. Include: artefacts created (5 PNGs + script + 2 tests), config additions (vite.config.ts + index.html + package.json), test count delta (baseline → post-13-1), verification commands run with their outputs, and any deviations from the plan (with rationale).
</output>
