# Domain Pitfalls — v1.2 Public Hosting + IndexedDB + PWA + User-Supplied Key

**Domain:** Static SPA on a free CDN host; browser-local IndexedDB; user-supplied Gemini key in localStorage; optional PWA wrapper
**Researched:** 2026-05-31
**Scope:** v1.2-specific pitfalls ONLY. Generic React/Vite pitfalls from v1.0 research are NOT repeated. Tauri/SQLite pitfalls from v2.0 research are NOT repeated unless they carry forward (the VITE_ env-leak pattern does carry forward and is covered here).
**Confidence:** HIGH for IDB storage behaviour (MDN official docs + Apple dev forums). HIGH for GH Pages SPA routing (confirmed by community and multiple workarounds). HIGH for vite-plugin-pwa Vite 6 compat (confirmed in package metadata). HIGH for VITE_ env-leak (Vite official docs + real 2025-2026 incidents). MEDIUM for iOS Safari PWA ITP nuance (Apple dev forums + community reports; official Apple documentation is sparse). MEDIUM for `@google/genai` direct-browser shape (package exists; API shape confirmed in ARCHITECTURE.md; exact v1.29.0 method signature should be verified at implementation time).

---

## Prioritised Pitfall Index

HARD-BLOCKs first — these must be resolved before the relevant phase can close.

| # | Pitfall | Phase | Classification |
|---|---------|-------|----------------|
| 1 | `VITE_GEMINI_API_KEY` accidentally set in CI ships to every user | Phase 1 (CI/CD) | HARD-BLOCK |
| 2 | GH Pages SPA-route 404 on direct URL / refresh | Phase 1 (CI/CD) | HARD-BLOCK if GH Pages chosen |
| 3 | PWA service worker stale-cache — user gets old `index.html` forever | Phase 4 (PWA) | HARD-BLOCK |
| 4 | iOS Safari ITP 7-day inactivity wipe of all IDB storage | Phase 2 (IDB Hardening) | HARD-BLOCK |
| 5 | User-supplied API key: `console.log` / Sentry capture / network leak | Phase 3 (AI Key) | HARD-BLOCK |
| 6 | Demo data leak — `/demo` route writes to production IDB namespace | Phase 5 (Release Polish) | HARD-BLOCK |
| 7 | GH Pages `<base href>` — `base: '/repo/'` in vite.config.ts required for repo-path deploys | Phase 1 (CI/CD) | HARD-BLOCK if GH Pages chosen |
| 8 | Private / Incognito IDB wipe on tab close — no warning shown | Phase 2 (IDB Hardening) | Known-Risk |
| 9 | Origin-change IDB loss — `localhost:5173` vs `aussieledger.app` are different IDB origins | Phase 5 (Release Polish) | Known-Risk |
| 10 | `navigator.storage.persist()` quirks across browsers | Phase 2 (IDB Hardening) | Known-Risk |
| 11 | User-supplied API key: XSS exfiltration from localStorage | Phase 3 (AI Key) | Known-Risk |
| 12 | PWA update prompt — force-reload vs user-prompt conflict on forms | Phase 4 (PWA) | Known-Risk |
| 13 | Backup-nag fatigue — too-frequent toasts dismissed unread | Phase 2 (IDB Hardening) | Known-Risk |
| 14 | `beforeunload` overuse trains users to dismiss | Phase 2 (IDB Hardening) | Known-Risk |
| 15 | iOS Safari PWA quirks — Add to Home Screen buried; no push notifications pre-iOS 16.4 | Phase 4 (PWA) | Known-Risk |
| 16 | README live-demo link rot | Phase 5 (Release Polish) | Known-Risk |
| 17 | `prefers-reduced-motion` not respected by motion animations | Phase 1 or polish pass | Known-Risk |
| 18 | `@google/genai` v1.29.0 direct-browser shape — verify at implementation time | Phase 3 (AI Key) | Research flag |
| 19 | Cloudflare Pages base URL handling with custom domain | Phase 1 (CI/CD) | Research flag |

---

## Critical Pitfalls (HARD-BLOCK)

---

### Pitfall 1: `VITE_GEMINI_API_KEY` Accidentally Set in CI Ships to Every User

**WHAT:**
Any environment variable whose name begins with `VITE_` is statically baked into the production JS bundle by Vite at build time via `import.meta.env`. If a developer or CI pipeline sets `VITE_GEMINI_API_KEY` as a GitHub Actions secret or repo variable and the Vite build runs, every user who downloads the bundle receives the key in plaintext inside the minified JavaScript.

This is the v1.2 analogue of CVE-2023-46115 (the Tauri `TAURI_PRIVATE_KEY` leaked via `envPrefix: ['TAURI_']`). The mechanism is identical: Vite env prefix rules cause any matching variable to land in the bundle.

**WHY:**
AussieLedger's `vite.config.ts` currently uses the `define` block to inject `process.env.GEMINI_API_KEY` (not `VITE_GEMINI_API_KEY`). This is intentional and safe for the server-assisted shape. The risk is future drift: a developer adding a `VITE_GEMINI_API_KEY` variable to CI secrets (thinking it matches the pattern used elsewhere for the user-supplied key flow) would silently bake the key into every user's bundle. Real-world incidents confirm this: in a November 2025 scan by Truffle Security, 2,863 live Google API keys were found exposed in public-facing JavaScript bundles. A February 2025 incident saw a stolen Gemini-capable key incur $82,314 in charges within 48 hours.

**PREVENTION:**
1. Never add `VITE_GEMINI_API_KEY` to CI secrets, repo variables, `.env.production`, or any environment that runs `npm run build`.
2. Keep the existing `process.env.GEMINI_API_KEY` via `define` (for server-assisted builds). The user-supplied key flows through `localStorage` under `aussieledger:gemini-key` and never touches `VITE_*` variables.
3. Add a CI lint step that exits non-zero if a `VITE_GEMINI_API_KEY` reference appears in any `.env*` file or CI workflow file:
   ```bash
   grep -r "VITE_GEMINI_API_KEY" .env* .github/workflows/ vite.config.ts && exit 1 || true
   ```
4. Add a post-build bundle scan step in CI: search `dist/assets/*.js` for known key-shaped strings (e.g., `AIza`). This is the same class of check as the Tauri CVE prevention.
5. Document in `CONTRIBUTING.md`: "Never prefix the Gemini API key with `VITE_`."

**PHASE:** Phase 1 (CI/CD pipeline setup) — bake the CI lint check into the deploy workflow before any key is ever used.
**ACCEPTANCE CRITERION:** CI deploy workflow includes a pre-deploy scan of `dist/assets/` for `AIza` patterns. Grep for `VITE_GEMINI_API_KEY` in `.env*` files and workflow YAML exits non-zero if found.
**HARD-BLOCK:** YES — leaking the Gemini key exposes users who paste a free-tier key to potential quota exhaustion or unexpected charges.

---

### Pitfall 2: GitHub Pages SPA-Route 404 on Direct URL or Refresh

**WHAT:**
GitHub Pages is a pure static file server. When a user navigates directly to `https://user.github.io/repo/journals` or presses refresh on any route other than `/`, GitHub Pages returns a real HTTP 404 response — the SPA's client-side router never has a chance to handle the path. The user sees a raw 404 page, not the app.

**WHY:**
React Router (and any SPA router) handles routes in the browser via the History API, not via real server paths. The server only serves `index.html`. GitHub Pages has no rewrite/redirect rules equivalent to Cloudflare Pages' `_redirects` file or Netlify's `_redirects`.

**PREVENTION (if GitHub Pages is the chosen host):**
1. Copy `dist/index.html` to `dist/404.html` as a post-build step in the deploy workflow. GitHub Pages serves `404.html` for any unmatched path; the SPA boots and the router handles the route.
   ```yaml
   - name: Copy index.html to 404.html for SPA routing
     run: cp dist/index.html dist/404.html
   ```
2. Alternatively, use the script-in-`404.html` + sessionStorage pattern (the "GitHub SPA redirect" technique by Rafael Pedicini): `404.html` encodes the path into sessionStorage; `index.html` reads it on load and calls `history.replaceState`. This avoids the flash-of-404-page on direct URL load.
3. Do NOT add a `<noscript>` redirect — it does not preserve the full URL path.

**PREVENTION (if Cloudflare Pages is chosen — recommended):**
Cloudflare Pages has native SPA fallback: if no `404.html` exists, all unmatched paths serve `index.html` with a 200. Add a `_redirects` file in `dist/` (or `public/`):
```
/* /index.html 200
```
This eliminates the problem entirely. The ARCHITECTURE.md recommendation is Cloudflare Pages; if followed, this pitfall reduces to a Known-Risk documentation item.

**PHASE:** Phase 1 (CI/CD).
**ACCEPTANCE CRITERION:** Navigating directly to `https://<deployed-url>/journals` serves the app (not a 404 page). Verified manually post-deploy.
**HARD-BLOCK:** YES if GitHub Pages is chosen. Known-Risk (document the `_redirects` file) if Cloudflare Pages is chosen.

---

### Pitfall 3: PWA Service Worker Stale-Cache — User Gets Old `index.html` Forever

**WHAT:**
Once a service worker is installed, it intercepts all navigation requests. If the cache strategy is "Cache First" for `index.html` and the service worker does not update itself, the user continues to receive the cached (old) `index.html` — potentially indefinitely — even after a new version is deployed.

The trigger: a user installs the PWA, uses it once, and the service worker caches `index.html`. On the next visit, the SW returns the cached file before checking the network. The new version (with bug fixes, new features) is never seen.

**WHY:**
`vite-plugin-pwa` with `registerType: 'autoUpdate'` and `workbox.skipWaiting: true` + `workbox.clientsClaim: true` mitigates this by force-claiming all clients when a new SW is activated. However:
- Without `skipWaiting`, the new SW waits in the "waiting" state. The user must close ALL tabs of the app and reopen.
- Without `clientsClaim`, a newly activated SW does not control existing open tabs.
- The default Workbox precache strategy re-fetches assets when their hashes change (Vite content-hashes all bundles), but only if the SW itself is reloaded.

The stale-cache trap is distinct from the update-prompt problem (Pitfall 12): the trap is when no update mechanism fires at all.

**PREVENTION:**
1. Configure `vite-plugin-pwa` with explicit `skipWaiting` + `clientsClaim`:
   ```ts
   VitePWA({
     registerType: 'autoUpdate',
     workbox: {
       skipWaiting: true,
       clientsClaim: true,
       cleanupOutdatedCaches: true,
       navigateFallback: 'index.html',
     },
   })
   ```
2. Set `cleanupOutdatedCaches: true` — removes outdated precache entries from previous SW versions on activation. Without this, the runtime cache from an old SW may persist even after the new SW installs.
3. Vite's content-hashing ensures JS/CSS assets have unique URLs per build. The issue is specifically `index.html` (not hashed). Workbox's `navigateFallback` with revision tracking handles this correctly when using `autoUpdate`.
4. Test the update flow explicitly: build v1, install in browser, build v2 (change a visible string), verify the app shows v2 content on next load without manual cache clearing.
5. Disable source maps in production (`build.sourcemap: false`) to avoid exposing the full unminified source to anyone inspecting assets.

**PHASE:** Phase 4 (PWA Wrapper).
**ACCEPTANCE CRITERION:** After deploying a new build, a user with the old SW installed receives the updated app within one navigation cycle (or after a page reload if `skipWaiting` is active). Verified via `npm run build && npm run preview` test sequence.
**HARD-BLOCK:** YES — if users with the PWA installed never receive updates, bug fixes and schema migrations never reach them. Tax rate updates (annual ATO refresh) would silently fail to deploy.

---

### Pitfall 4: iOS Safari ITP 7-Day Inactivity Wipe of All IDB Storage

**WHAT:**
Safari's Intelligent Tracking Prevention (ITP), introduced in Safari 13.4 / iOS 13.4 (2020) and still active as of iOS 17+ (2025-2026), deletes ALL script-writable storage for a given origin after 7 days of Safari use without any user interaction with that origin. Affected storage types include: IndexedDB, localStorage, sessionStorage, Service Worker registrations, and Cache Storage.

This means an AussieLedger user on iOS Safari who does not open the app for 7 days returns to find all their accounting data silently gone.

**WHY:**
ITP's 7-day timer applies to origins accessed in Safari's browsing context (not installed to Home Screen). The timer runs on "Safari use days" — days the user used Safari at all — not calendar days of inactivity. This makes it more aggressive than it appears: a user who uses Safari daily but hasn't visited AussieLedger in 7 days loses all data.

`navigator.storage.persist()` is ambiguous on iOS. Testing suggests the ITP 7-day wipe may still apply to Safari tabs even when `persist()` returns `true`. The Apple Developer Forums indicate the `persist()` result in Safari does not reliably override ITP; documentation is sparse and contradictory (MEDIUM confidence).

**KEY DISTINCTION:** A PWA installed to the iOS Home Screen via "Add to Home Screen" operates in a separate context. Its IDB timer is reset every time the PWA is launched from the icon, which effectively prevents the 7-day wipe as long as the user interacts with the app at least once per 7 days via the Home Screen icon. PWA-installed IDB is still subject to the 7-day rule, but the launch from Home Screen counts as interaction.

**PREVENTION:**
1. Show a persistent, iOS-specific disclosure in the app (detect iOS + Safari via `navigator.userAgent`): "On iOS Safari, your data may be cleared by the browser after 7 days of inactivity. Install to your Home Screen or export a backup regularly."
2. In the backup-nag logic (`useBackupNag`), use a shorter threshold for iOS Safari: nag at 5 days (not 7) so the user has time to export before the ITP wipe hits.
3. In the `navigator.storage.persist()` call (Phase 2), log whether `persist()` resolved to `true` or `false` and surface the result clearly in `DataPage`. Do NOT rely on `persist()` as a guarantee against ITP wipe on iOS.
4. In the first-run onboarding modal, surface the iOS Safari warning if iOS is detected.
5. Document in README under "iOS users": the 7-day wipe, the Home Screen workaround, and the export habit.

**PHASE:** Phase 2 (IDB Hardening) — the Safari-specific nag threshold and disclosure; Phase 4 (PWA) — "Add to Home Screen" is the practical mitigation.
**ACCEPTANCE CRITERION:** iOS Safari UA is detected; DataPage shows a Safari-specific storage warning. Backup-nag fires after 5 days on iOS (not 7). First-run modal includes iOS caveat. README documents the behaviour.
**HARD-BLOCK:** YES — silent loss of tax data is catastrophic for user trust. The app must communicate this risk before a user commits to it as their primary tool on iOS.

---

### Pitfall 5: User-Supplied API Key — `console.log`, Sentry Capture, and Network Leak

**WHAT:**
The user pastes their Gemini API key into the Settings UI. The key is stored in `localStorage` under `aussieledger:gemini-key` and read by `src/lib/ai.ts`. Three specific leak vectors exist:

**A. `console.log` / debugging:**
A developer adds `console.log('settings:', { key, ...})` during a Settings component debug session. The key appears in every user's browser console. If Sentry or any other error monitoring is wired (even by a future developer), it may capture console output or React component state trees containing the key.

**B. Network leak to own host:**
If any analytics, error reporting, or telemetry endpoint is added to the app (even well-intentioned, e.g., a Sentry DSN), and if the Settings component or `ai.ts` is in the call stack when an error fires, the key may be serialised into the error payload and sent to a third-party server.

**C. CSP `connect-src` gap:**
Without a strict `connect-src` CSP, a successful XSS attack can POST `localStorage.getItem('aussieledger:gemini-key')` to any external endpoint. AussieLedger currently has no analytics (explicit non-goal per PROJECT.md), which reduces attack surface, but the CSP is not currently locked.

**WHY:**
The AI key is a free-tier Gemini key but it is not low-stakes: a stolen free-tier Gemini API key can be used to generate API quota charges. In November 2025, Truffle Security found 2,863 live Google API keys exposed in public JS bundles. A single compromised key with billing enabled can cost thousands of dollars per day (confirmed $82,314 real-world incident, Feb 2025).

**PREVENTION:**
1. **Never `console.log` the key.** Add an ESLint rule or code comment in `Settings.tsx` and `ai.ts`: `// SECURITY: do not log, serialize, or include in error reports`.
2. **No Sentry / Datadog / Rollbar by default.** PROJECT.md already has "no telemetry" as an explicit non-goal. Any future developer who adds error reporting must be instructed to scrub `aussieledger:gemini-key` from captured state. Document this in `CONTRIBUTING.md`.
3. **CSP `connect-src` allowlist.** In the deployed app (Cloudflare Pages or GH Pages), set a `Content-Security-Policy` header that restricts `connect-src` to:
   - `'self'` (same origin — IDB reads)
   - `https://generativelanguage.googleapis.com` (Gemini API — for hosted direct-browser calls)
   - Remove: any analytics, CDN-injected scripts, or wildcard patterns
   Headers can be set via Cloudflare Pages `_headers` file or GH Pages response headers via a workaround. Note: CSP headers on static hosts have limitations (GH Pages does not support custom headers; Cloudflare Pages supports `_headers`).
4. **Mask the key in the Settings UI.** Render the stored key as `****` after entry; never display it in plaintext after initial save.
5. **Pre-validate the key via a cheap Gemini API call** (e.g., list models endpoint) before storing it. Reject and show an error if the key is invalid. This prevents storing garbage in localStorage and gives the user immediate feedback.
6. **UI disclosure.** Show near the key input: "Your key is stored only in this browser (localStorage). It is never sent to our servers. Anyone with access to this device can read it via browser DevTools."

**PHASE:** Phase 3 (User-Supplied AI Key) — all prevention items.
**ACCEPTANCE CRITERION:** `console.log` audit of Settings.tsx and ai.ts — no key value is logged. CSP header configured on deploy target. Key renders masked after save. Pre-validation implemented. UI disclosure rendered.
**HARD-BLOCK:** YES — exposing the user's API key violates the product's core data-sovereignty and trust claim. A user who loses their Gemini key to quota abuse will distrust the app entirely.

---

### Pitfall 6: Demo Data Leak — `/demo` Route Writes to Production IDB Namespace

**WHAT:**
The `/demo` route seeds a sample entity (anonymised sample books) into IndexedDB for onboarding new users. If the demo seeding writes to the same IDB database name (`aussieledger`) as the production data, a returning user who navigates to `/demo` will have their real accounting data overwritten or commingled with demo data.

**WHY:**
`LocalAdapter` opens IDB as `'aussieledger'` (the fixed DB name). If the demo-seed code calls `adapter.importAll(demoData)` it will overwrite ALL entities in that database — replacing any real user data with the demo fixtures. Even a "merge" approach risks polluting real books with fictitious sample accounts.

**PREVENTION:**
1. The `/demo` route must open a **separate IDB database** named `'aussieledger-demo'`. This requires a dedicated `LocalAdapter` instance initialised with a custom DB name, OR a guard in the route that:
   - Checks if real user data exists (via `adapter.getEntities().length > 0`)
   - If yes: shows a confirmation modal: "Loading demo data will replace your current data. Export a backup first?"
   - If confirmed: clears the DB and loads demo fixtures
2. The recommended architecture is a separate namespace. `LocalAdapter`'s constructor (or `openDB` call) should accept an optional `dbName` parameter. The `/demo` route passes `'aussieledger-demo'`. All other routes use `'aussieledger'`.
3. If a separate namespace is used, add a banner to the demo context: "You are viewing demo data. Your real data is untouched. [Exit Demo]."
4. The demo IDB should be ephemeral — cleared on exit or on app restart outside the `/demo` route.

**PHASE:** Phase 5 (Release Polish) — the `/demo` route is a Phase 5 feature.
**ACCEPTANCE CRITERION:** Navigating to `/demo` with pre-existing real user data does NOT modify the `'aussieledger'` IDB. Confirmed via test: seed real data, navigate to `/demo`, navigate away, confirm real data is intact. A `'aussieledger-demo'` IDB is created (verify in DevTools Application panel).
**HARD-BLOCK:** YES — overwriting a user's tax records with demo data is a data-loss event.

---

### Pitfall 7: GitHub Pages `<base href>` — `base: '/repo/'` Required for Repo-Path Deploys

**WHAT:**
If the app is deployed to `https://username.github.io/AussieLedger/` (the default GitHub Pages URL for a repository), ALL asset paths in the Vite build must include the `/AussieLedger/` prefix. Without `base: '/AussieLedger/'` in `vite.config.ts`, every `<script src="...">`, `<link href="...">`, and dynamic import will resolve relative to `https://username.github.io/`, returning 404 for all assets. The page will be a blank white screen.

**WHY:**
Vite generates asset paths relative to the `base` configuration. The default `base: '/'` works for Cloudflare Pages (deployed at the domain root) but breaks for GitHub Pages repo deployments (deployed at a subpath). This is a build-time decision that cannot be patched at runtime.

**PREVENTION (if GitHub Pages is chosen):**
1. Set `base` in `vite.config.ts` conditionally on the deploy target. One approach:
   ```ts
   // vite.config.ts
   base: process.env.GITHUB_PAGES ? '/AussieLedger/' : '/',
   ```
   Set `GITHUB_PAGES=true` in the GH Actions deploy step's environment block.
2. Alternatively, configure a custom domain (`aussieledger.app`) on GitHub Pages — a custom domain maps to the root, eliminating the subpath problem.
3. Test: run `npm run build` locally with the env var set, then `npm run preview` — confirm assets load correctly.

**PREVENTION (if Cloudflare Pages is chosen — recommended):**
Keep `base: '/'`. No change required. The subpath issue does not exist.

**PHASE:** Phase 1 (CI/CD).
**ACCEPTANCE CRITERION:** On the chosen deploy target, all JS/CSS assets load (no 404s in Network tab). App renders without a blank screen.
**HARD-BLOCK:** YES if GitHub Pages repo-path deploy is chosen without the `base` fix. Not applicable if Cloudflare Pages or a custom-domain GitHub Pages is used.

---

## Known Risks

---

### Pitfall 8: Private / Incognito Mode IDB Wipe on Tab Close — No Warning

**WHAT:**
All major browsers (Chrome, Firefox, Safari) wipe IndexedDB data when the last Private/Incognito window is closed. Chrome also enforces a strict per-DB quota in Incognito (approximately 32 MB per database). A user who opens AussieLedger in an Incognito window, enters their trial balance data, and then closes the window loses all that work with no warning.

Additionally, in some Firefox configurations `dom.indexedDB.privateBrowsing.enabled` may be `false`, causing IDB writes to silently fail — the app appears to work but nothing is persisted.

**DETECTION:**
There is no browser API to detect Private/Incognito mode reliably (browsers have closed the fingerprinting vectors). The best-effort approach: attempt a small IDB write on app load; if it fails, or if `navigator.storage.estimate()` returns an anomalously small quota (Incognito quota ceiling is typically 10% of normal), warn the user.

**PREVENTION:**
1. Show a warning if `navigator.storage.estimate()` returns `quota < 50_000_000` (50 MB) — this is below the Incognito ceiling threshold on Chrome and serves as a heuristic.
2. Show a warning if `navigator.storage.persist()` returns `false` immediately (not just on first call — see Pitfall 10) on a site that would normally be granted persistence. This is a weaker signal.
3. As a belt-and-suspenders measure: add a visible "Private browsing detected (heuristic)" banner when the quota estimate is anomalously small. Text: "Incognito data is deleted when the window closes. Export before closing."
4. Document in README: "Do not use AussieLedger in Private/Incognito mode for real data."

**PHASE:** Phase 2 (IDB Hardening).
**CLASSIFICATION:** Known-Risk — the IDB wipe is correct browser security behaviour; the risk is user confusion. A detection heuristic + warning is sufficient.

---

### Pitfall 9: Origin-Change IDB Loss — Different Hosts = Different IDB

**WHAT:**
IndexedDB is strictly origin-scoped. A user who has been running the app at `http://localhost:5173` has their data in the IDB for that origin. When they visit `https://aussieledger.app`, they are at a different origin with a completely empty IDB. The same applies if the app moves from `aussieledger.pages.dev` to `aussieledger.app` after a custom domain is added — users who bookmarked the old URL must migrate.

There is no browser API to copy data across origins. Migration is a manual export-import operation.

**PREVENTION:**
1. This is a documentation-only prevention. Add to README: "Moving your data: export JSON from your old location, import at the new URL."
2. In the first-run detection (empty IDB + `VITE_HOSTED_MODE === 'true'`), show a modal: "New to this URL? If you have data from a local install or a previous URL, import your JSON backup here."
3. When a custom domain is added, keep the old URL operational (redirect) for at least one release cycle so bookmarked users land on the redirect and see the migration notice.
4. For the `aussieledger.pages.dev` → `aussieledger.app` transition specifically: Cloudflare Pages supports custom domain with automatic HTTPS. The redirect from the old subdomain to the custom domain can be configured at the Pages level.

**PHASE:** Phase 5 (Release Polish) — README + first-run modal + redirect setup.
**CLASSIFICATION:** Known-Risk — unavoidable browser security architecture. Mitigation is documentation + a graceful first-run experience.

---

### Pitfall 10: `navigator.storage.persist()` Quirks Across Browsers

**WHAT:**
`navigator.storage.persist()` returns a Promise that resolves to `boolean`. The semantics differ per browser:

- **Chrome / Chromium:** Auto-grants persistence if the site is "bookmarked, installed, or frequently visited." Silently denies otherwise. No user prompt.
- **Firefox:** May show a user permission dialog (behaviour varies by version and site engagement). User can deny.
- **Safari (macOS Sonoma+ / iOS 17+):** Auto-approves or auto-denies based on user history. No prompt. As of macOS Sonoma / iOS 17, quota is based on total disk space.
- **Safari (iOS, all versions):** The ITP 7-day wipe may override persistence even when `persist()` returns `true` (see Pitfall 4). Treat `persist() === true` on iOS as a best-effort hint, not a guarantee.

A specific timing quirk: `isPersisted()` called immediately after `persist()` on the same page load may return `false` even if the grant was given — some browsers require a page reload before `persisted()` reflects the new state.

**PREVENTION:**
1. Call `persist()` inside `LocalAdapter.init()` (as specified in ARCHITECTURE.md). Store the result in `this.persistGranted`.
2. In `DataPage`, display the result honestly:
   - `true`: "Storage protected — browser will not clear your data automatically."
   - `false`: "Storage not protected — browser may clear data if disk space runs low. Export backups regularly."
   - `null` (not yet queried): "Checking storage status..."
3. Do NOT conflate `persist() === false` with "failure" in a user-visible error. It is a normal outcome (especially in Chrome for newly-visited sites). The backup-nag (Pitfall 13) handles the "not persistent" case by prompting exports.
4. On iOS Safari, always append the ITP-specific caveat to the `false` case (see Pitfall 4).

**PHASE:** Phase 2 (IDB Hardening).
**CLASSIFICATION:** Known-Risk — the API works as specified; the quirks are per-browser policy, not bugs in the implementation.

---

### Pitfall 11: User-Supplied API Key — XSS Exfiltration from localStorage

**WHAT:**
`localStorage` is readable by any JavaScript running on the same origin. If an XSS vulnerability exists in the app (e.g., a user-controlled string rendered unsafely), an attacker's injected script can read `localStorage.getItem('aussieledger:gemini-key')` and exfiltrate it. CSP `connect-src` restricts where the exfiltrated data can be sent, but `window.location` redirects can bypass `connect-src` (as noted by Curity's 2025 security research — `window.location` navigation is a reliable CSP bypass for exfiltration regardless of `connect-src` policy).

**WHY:**
React's JSX escaping prevents most reflected XSS. The risk surface is: (a) dangerouslySetInnerHTML usage (search the codebase before Phase 3), (b) user-controlled content rendered as HTML (e.g., imported CSV column headers or entity names that might be rendered in a tooltip), (c) third-party script injection (AussieLedger has no third-party scripts — explicit PROJECT.md non-goal — which greatly reduces this surface).

**PREVENTION:**
1. Audit `dangerouslySetInnerHTML` usage before Phase 3 ships: `grep -r "dangerouslySetInnerHTML" src/` must return zero results, or each hit must be justified.
2. Ensure all user-controlled strings (entity names, account labels, journal descriptions, CSV column headers) are rendered as text nodes, not innerHTML.
3. A strict CSP `script-src 'self'` (no `unsafe-inline`, no external script sources) is the strongest XSS mitigation. Verify that Tailwind v4's production build does not require `unsafe-inline` for any production script (it should not — `unsafe-inline` in `style-src` for CSS is separate from `script-src`).
4. Accept that `window.location`-based exfiltration bypasses `connect-src`. The primary defence is preventing XSS in the first place (items 1-3), not CSP alone.

**PHASE:** Phase 3 (User-Supplied AI Key) — before the key is stored in localStorage.
**CLASSIFICATION:** Known-Risk — the XSS surface is low given React's default escaping and no third-party scripts. The risk is not zero and must be acknowledged.

---

### Pitfall 12: PWA Update Prompt — Force-Reload Interrupts Open Forms

**WHAT:**
`registerType: 'autoUpdate'` with `skipWaiting: true` causes the new service worker to immediately claim all clients and trigger a page reload. If the user has an open journal entry form with unsaved edits when the update fires, the reload discards their work.

**WHY:**
The auto-update SW reload and the `beforeunload` pre-unload guard (Phase 2) conflict: the SW triggers a reload programmatically, which does NOT fire `beforeunload` (programmatic reloads bypass the `beforeunload` guard in most browsers). The user loses unsaved form data silently.

**PREVENTION:**
1. For an accounting app with form-heavy workflows, use `registerType: 'prompt'` instead of `autoUpdate`. The new SW waits in the "waiting" state until the user explicitly acknowledges the update.
2. Implement the prompt pattern: on `onNeedRefresh`, show a non-intrusive banner at the top of the app: "A new version of AussieLedger is available. [Reload to update]." The user chooses when to reload.
3. The `beforeunload` guard (Phase 2) fires when the user clicks "Reload to update" if there are unsaved changes — they will get the browser's native "leave page?" dialog, giving them a chance to export first.
4. Set a periodic check interval (e.g., every 60 minutes) so the update check is not just on SW install:
   ```ts
   registerSW({ onRegisteredSW(swUrl, r) {
     r && setInterval(() => r.update(), 60 * 60 * 1000)
   }})
   ```

**PHASE:** Phase 4 (PWA Wrapper).
**CLASSIFICATION:** Known-Risk — `autoUpdate` would work for most apps but is the wrong default for an accounting tool. The prompt pattern resolves this.

---

### Pitfall 13: Backup-Nag Fatigue — Too-Frequent Toasts Dismissed Unread

**WHAT:**
If the backup-nag fires on every app load (or more than once per day), users will dismiss it reflexively after the first few instances and stop reading it. By the time the nag fires on a genuinely critical occasion (7 days before ITP wipe on iOS), the user has trained themselves to ignore it.

**PREVENTION:**
1. Enforce at-most-once-per-day firing. Check a `localStorage` key `aussieledger:backup-nag-last-shown` before showing the toast. If `now - lastShown < 24h`, suppress.
2. Implement a "Snooze 7 days" action on the toast. Store snooze expiry in `aussieledger:backup-nag-snoozed-until`. If `now < snoozedUntil`, suppress.
3. Use a graduated threshold: first nag at 7 days since last export (or never exported), second nag at 14 days (different, more urgent wording), third nag at 21 days (strongly urgent). Each level has a shorter snooze.
4. On iOS Safari (detected UA), reduce all thresholds by 2 days (see Pitfall 4).
5. A permanent dismissal option ("I understand the risk, don't remind me") is intentionally NOT provided — this is data the user may come to rely on. The snooze is the compromise.

**PHASE:** Phase 2 (IDB Hardening).
**CLASSIFICATION:** Known-Risk — a UX failure mode, not a technical one. Solvable with the at-most-daily + snooze pattern.

---

### Pitfall 14: `beforeunload` Overuse Trains Users to Dismiss

**WHAT:**
If the `beforeunload` guard fires too eagerly (e.g., on every page close regardless of whether there are actual unsaved changes), users learn to click "Leave" without reading. When the guard fires on a genuinely critical occasion (unsaved journal with a week of entries), it is ignored.

**PREVENTION:**
1. The guard MUST fire ONLY when `lastWriteAt > lastExportAt` (as specified in ARCHITECTURE.md). Not on every close.
2. Never fire `beforeunload` for:
   - Open (but not yet submitted) modal forms — the form's `onCancel` handler should handle that case inline.
   - App settings changes — those are autosaved to localStorage.
   - Demo mode — demo data is not the user's real data.
3. Implement a test: open the app with no changes → navigate away → verify no `beforeunload` dialog fires.
4. Document the guard logic in `App.tsx` with a comment: "This guard fires ONLY on actual IDB writes since last JSON export."

**PHASE:** Phase 2 (IDB Hardening).
**CLASSIFICATION:** Known-Risk — correct scoping of the condition prevents the fatigue problem entirely.

---

### Pitfall 15: iOS Safari PWA Quirks

**WHAT:**
Three distinct iOS Safari PWA limitations are relevant to v1.2:

**A. "Add to Home Screen" is buried in the Share menu.**
iOS Safari does not show an install prompt (no `beforeinstallprompt` event). The user must manually tap Share → Add to Home Screen. This is an undiscoverable flow for first-time users.

**B. PWA-installed context still subject to ITP.**
Even when installed to the Home Screen, the PWA's IDB data is subject to the 7-day ITP wipe if the PWA is not launched for 7 days (see Pitfall 4). Launching from the Home Screen resets the timer, so regular use prevents the wipe, but infrequent users (e.g., a business owner who does quarterly bookkeeping) may still lose data.

**C. No push notifications before iOS 16.4.**
Push notifications for PWAs require iOS 16.4+. Users on older iOS cannot receive push-based export reminders. This is relevant if a future version adds push-based backup reminders.

**PREVENTION:**
1. Add an in-app "Install to Home Screen" prompt for iOS Safari: detect `navigator.standalone === false && /iPhone|iPad/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent)` (absence of `beforeinstallprompt` with iOS UA). Show a one-time banner with a GIF or illustration of the Share → Add to Home Screen flow.
2. Document the ITP interaction in the iOS warning (Pitfall 4 prevention handles this).
3. For push notifications: do not attempt to use the Push API below iOS 16.4. Feature-detect `('pushManager' in ServiceWorkerRegistration.prototype)` and gate any future push-based features accordingly.
4. Test the PWA install flow manually on a physical iOS device — the Simulator does not fully replicate the Share menu behaviour.

**PHASE:** Phase 4 (PWA Wrapper) for items A and C; Phase 2 (IDB Hardening) for item B.
**CLASSIFICATION:** Known-Risk — platform limitations outside the app's control. Mitigations are documentation and graceful guidance.

---

### Pitfall 16: README Live-Demo Link Rot

**WHAT:**
The README will include a "try the live demo at [URL]" link at the top of the fold. If the deploy target changes (e.g., from `aussieledger.pages.dev` to `aussieledger.app`), or if the deploy fails and the URL goes dead, every GitHub visitor and every web search result pointing to the README sees a broken link.

**PREVENTION:**
1. In the CI deploy workflow, add a post-deploy health check step: `curl -f https://<deployed-url>/` — if it fails (non-200), mark the CI job as failed so the failure is visible immediately.
2. Use a stable custom domain (`aussieledger.app`) from Phase 1 onwards. The Pages subdomain (`aussieledger.pages.dev`) changes if the project is renamed; a custom domain is stable.
3. Add a CI badge to the README showing the current deploy status (Cloudflare Pages and GitHub Pages both support deploy status badges).
4. Pin the live-demo URL in `package.json` as `"homepage": "https://aussieledger.app"` — this creates a single source of truth for the URL that can be referenced in CI checks.

**PHASE:** Phase 1 (CI/CD) for health check; Phase 5 (Release Polish) for README link stabilisation.
**CLASSIFICATION:** Known-Risk — an operational discipline issue, not a technical bug.

---

### Pitfall 17: `prefers-reduced-motion` Not Respected

**WHAT:**
The `motion` library (used for animations in the UI) will play animations regardless of the user's `prefers-reduced-motion` OS preference unless explicitly checked. For users with vestibular disorders or motion sensitivity, unexpected animations can cause discomfort or trigger symptoms.

**PREVENTION:**
1. In all `motion` component usages, wrap with a `useReducedMotion()` hook check (available in `motion/react`): `const shouldReduceMotion = useReducedMotion(); ... animate={shouldReduceMotion ? false : animationVariant}`.
2. Add a global CSS rule as a belt-and-suspenders:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, *::before, *::after {
       animation-duration: 0.01ms !important;
       transition-duration: 0.01ms !important;
     }
   }
   ```
3. Audit all `motion` usages: `grep -r "motion\." src/` — verify each has a `useReducedMotion` guard or is exempted with justification.

**PHASE:** Phase 1 polish pass (can be addressed when public build is being prepared) or a dedicated accessibility pass.
**CLASSIFICATION:** Known-Risk — accessibility compliance item; not a data integrity issue.

---

## Research Flags (Verify at Implementation Time)

---

### Pitfall 18: `@google/genai` v1.29.0 Direct-Browser Call Shape

**WHAT:**
`@google/genai` is already in `dependencies` at `^1.29.0`. ARCHITECTURE.md provides the recommended call shape. This should be verified against the actual installed package at implementation time.

**VERIFICATION NEEDED:**
1. Confirm `GoogleGenAI` is the named export (not `GenAI` or a default export) in `@google/genai` v1.29.x.
2. Confirm `genai.models.generateContent()` is the correct method path (not `genai.getGenerativeModel()` which is the older `@google/generative-ai` package API).
3. Confirm the `config: { responseSchema: ... }` parameter shape is supported for structured output in v1.29.x.
4. Confirm that calling `@google/genai` directly from a browser context (not Node.js) does not hit CORS restrictions on `https://generativelanguage.googleapis.com`. The Gemini REST API supports browser CORS for API key-authenticated calls.

**CONFIDENCE:** MEDIUM — ARCHITECTURE.md confirms the package is in `dependencies` and shows the call pattern. The exact v1.29.0 method signatures should be verified from the package docs at implementation time, not from research memory.

**PHASE:** Phase 3 (AI Key) — verify before writing `callGeminiMatchAccounts()`.

---

### Pitfall 19: Cloudflare Pages Base URL with Custom Domain

**WHAT:**
ARCHITECTURE.md recommends Cloudflare Pages. Cloudflare Pages with a custom domain (`aussieledger.app`) deploys at the root — `base: '/'` in `vite.config.ts` is correct. However: if the app is first deployed to `aussieledger.pages.dev` (the default subdomain before a custom domain is configured), the base is still `/` — no change needed.

The only scenario requiring a `base` change is GitHub Pages without a custom domain (covered in Pitfall 7). Confirm with Cloudflare Pages documentation at Phase 1 implementation time.

**VERIFICATION NEEDED:**
Confirm that `/* /index.html 200` in Cloudflare Pages `_redirects` handles SPA routing for ALL routes (including nested: `/journals/123`, `/reports/bas`). Verify via a test deploy.

**CONFIDENCE:** MEDIUM — Cloudflare Pages SPA routing is well-documented. The specific `_redirects` syntax should be verified against current CF Pages docs at implementation time.

**PHASE:** Phase 1 (CI/CD).

---

## Phase-Specific Warning Summary

| Phase | Pitfall | Mitigation |
|-------|---------|------------|
| Phase 1 (CI/CD) | VITE_ env leak (P1) | CI lint check + post-build bundle scan |
| Phase 1 (CI/CD) | GH Pages SPA 404 (P2) | `404.html` copy step or Cloudflare Pages `_redirects` |
| Phase 1 (CI/CD) | GH Pages base href (P7) | `base: '/repo/'` conditioned on deploy target env var |
| Phase 1 (CI/CD) | README link rot (P16) | Post-deploy health check + custom domain from day one |
| Phase 1 (CI/CD) | Reduced motion (P17) | `useReducedMotion()` audit before first public deploy |
| Phase 2 (IDB Hardening) | iOS Safari ITP 7-day wipe (P4) | iOS UA detection + shorter nag threshold + disclosure |
| Phase 2 (IDB Hardening) | Incognito IDB wipe (P8) | Quota heuristic + warning banner |
| Phase 2 (IDB Hardening) | persist() quirks (P10) | Honest `DataPage` display; don't treat false as failure |
| Phase 2 (IDB Hardening) | Backup-nag fatigue (P13) | At-most-daily + snooze + graduated urgency |
| Phase 2 (IDB Hardening) | beforeunload overuse (P14) | Gate strictly on `lastWriteAt > lastExportAt` |
| Phase 3 (AI Key) | Key log/capture/network leak (P5) | No console.log + CSP + masked UI + pre-validation |
| Phase 3 (AI Key) | XSS exfiltration from localStorage (P11) | dangerouslySetInnerHTML audit + strict script-src CSP |
| Phase 3 (AI Key) | @google/genai v1.29 shape (P18) | Verify package API at implementation |
| Phase 4 (PWA) | SW stale-cache (P3) | `skipWaiting` + `clientsClaim` + `cleanupOutdatedCaches` |
| Phase 4 (PWA) | Force-reload on forms (P12) | Use `registerType: 'prompt'`; banner not auto-reload |
| Phase 4 (PWA) | iOS PWA quirks (P15) | In-app "Add to Home Screen" guide; `useReducedMotion` check |
| Phase 5 (Release Polish) | Demo data leak (P6) | Separate `'aussieledger-demo'` IDB namespace |
| Phase 5 (Release Polish) | Origin-change IDB loss (P9) | README export/import guide + first-run modal |

---

## Acceptance Criteria Checklist for Downstream Planner

**Phase 1 (CI/CD):**
- [ ] CI deploy workflow includes grep for `VITE_GEMINI_API_KEY` in `.env*` and workflow YAML — exits non-zero if found
- [ ] Post-build step scans `dist/assets/*.js` for `AIza` key pattern — exits non-zero if found
- [ ] If GH Pages: `dist/404.html` is a copy of `dist/index.html`; direct URL navigation tested post-deploy
- [ ] If Cloudflare Pages: `public/_redirects` contains `/* /index.html 200`; SPA routing tested post-deploy
- [ ] If GH Pages repo-path: `base` in vite.config.ts is conditioned on deploy-target env var
- [ ] Post-deploy health check step (`curl -f https://<url>/`) in deploy workflow
- [ ] `prefers-reduced-motion` audit: all `motion` usages checked for `useReducedMotion()` guard

**Phase 2 (IDB Hardening):**
- [ ] iOS Safari UA detected; `DataPage` shows ITP-specific warning; backup-nag threshold is 5 days on iOS (not 7)
- [ ] `navigator.storage.persist()` result displayed honestly in `DataPage` (true/false/null)
- [ ] Incognito heuristic: if `estimate().quota < 50_000_000`, show incognito warning banner
- [ ] Backup-nag fires at most once per 24 hours; snooze stores `aussieledger:backup-nag-snoozed-until` in localStorage
- [ ] `beforeunload` guard fires ONLY when `lastWriteAt > lastExportAt`; test: no changes → navigate away → no dialog

**Phase 3 (AI Key):**
- [ ] `console.log` audit of Settings.tsx and ai.ts: no key value is logged; comment in code: "SECURITY: do not log"
- [ ] CSP `connect-src` header configured to allowlist: `'self' https://generativelanguage.googleapis.com`
- [ ] Key rendered as `****` after initial entry; never in plaintext
- [ ] Pre-validation: key tested against Gemini API before saving; invalid key shows error
- [ ] UI disclosure rendered near key input: "Stored in this browser only. Never sent to our servers."
- [ ] `dangerouslySetInnerHTML` audit: `grep -r "dangerouslySetInnerHTML" src/` — zero results or each justified
- [ ] `@google/genai` v1.29.0 `generateContent` call shape verified against package docs before merge

**Phase 4 (PWA):**
- [ ] `workbox.skipWaiting: true`, `workbox.clientsClaim: true`, `cleanupOutdatedCaches: true` in VitePWA config
- [ ] `registerType: 'prompt'` (not `autoUpdate`) — update banner implemented, not force-reload
- [ ] Stale-cache test: build v1 (install), build v2 (change visible string), verify v2 shown on next load
- [ ] iOS "Add to Home Screen" in-app guide renders for iOS Safari UA where `navigator.standalone === false`

**Phase 5 (Release Polish):**
- [ ] `/demo` route uses `'aussieledger-demo'` IDB; navigating to `/demo` with real data does not touch `'aussieledger'`; demo context shows "You are viewing demo data" banner
- [ ] README includes export/import migration guide for local → hosted URL transition
- [ ] First-run modal (empty IDB + `VITE_HOSTED_MODE`) includes import-from-backup prompt

---

## Sources

- MDN Web API: StorageManager.persist() — https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist
- MDN Web API: StorageManager.persisted() — https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persisted
- web.dev: Persistent Storage — https://web.dev/articles/persistent-storage
- Apple Developer Forums: Safari iOS PWA Data Persistence Beyond 7 Days — https://developer.apple.com/forums/thread/710157
- iTnews: Apple cops flak for deleting local browser storage after 7 days — https://www.itnews.com.au/news/apple-cops-flak-for-deleting-local-browser-storage-after-7-days-539833
- MagicBell: PWA iOS Limitations and Safari Support [2026] — https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide
- Vinova: Navigating Safari/iOS PWA Limitations — https://vinova.sg/navigating-safari-ios-pwa-limitations/
- Vite official docs: Env Variables and Modes — https://vite.dev/guide/env-and-mode
- Sprocket Security: Hunting Secrets in JavaScript — Vite Misconfiguration Leads to Full CI/CD Compromise — https://www.sprocketsecurity.com/blog/hunting-secrets-in-javascript-at-scale-how-a-vite-misconfiguration-lead-to-full-ci-cd-compromise
- Truffle Security: Google API Keys Weren't Secrets — But then Gemini Changed the Rules (Nov 2025) — https://trufflesecurity.com/blog/google-api-keys-werent-secrets-but-then-gemini-changed-the-rules
- Google AI for Developers: Using Gemini API keys — https://ai.google.dev/gemini-api/docs/interactions/api-key
- CVE-2023-46115 / GHSA-2rcp-jvr4-r259 (Tauri updater key via envPrefix — carry-forward pattern) — https://github.com/tauri-apps/tauri/security/advisories/GHSA-2rcp-jvr4-r259
- vite-plugin-pwa official docs: Auto Update — https://vite-pwa-org.netlify.app/guide/auto-update
- vite-plugin-pwa official docs: Prompt for Update — https://vite-pwa-org.netlify.app/guide/prompt-for-update
- vite-plugin-pwa GitHub issue #800: dependency error on Vite 6 (resolved) — https://github.com/vite-pwa/vite-plugin-pwa/issues/800
- Cloudflare Pages docs: Serving Pages / SPA routing — https://developers.cloudflare.com/pages/configuration/serving-pages/
- GitHub community discussion: GitHub Pages does not support routing for SPA — https://github.com/orgs/community/discussions/64096
- Curity: Mitigate XSS in OAuth Browser Apps (connect-src bypass via window.location) — https://curity.io/resources/learn/oauth-xss-prevention/
- AussieLedger PROJECT.md — v1.2 goal, non-goals, StorageAdapter FINAL invariant
- AussieLedger .planning/research/ARCHITECTURE.md — integration points, env-var security clarification, vite-plugin-pwa config, phase order
- AussieLedger .planning/future-milestones/v2.0-standalone-app/research/PITFALLS.md — Pitfall 8 (VITE_ env-leak / CVE-2023-46115 pattern) carried forward to v1.2 context

---

*v1.2 Pitfalls Research — AussieLedger Public Hosting + IndexedDB + PWA + User-Supplied Key*
*Researched: 2026-05-31*
*Confidence: HIGH (IDB storage APIs — official docs). HIGH (Vite env-leak — official docs + real 2025-2026 incidents). HIGH (GH Pages SPA routing — community-confirmed, multiple workarounds). HIGH (vite-plugin-pwa Vite 6 compat — package metadata confirmed). MEDIUM (iOS Safari ITP + persist() interaction — Apple dev forums + community; Apple official docs sparse). MEDIUM (@google/genai v1.29.0 direct-browser shape — verify at implementation time).*
