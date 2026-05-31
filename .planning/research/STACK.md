# Technology Stack — v1.2 Additions

**Project:** AussieLedger v1.2 — Public Hosting + IndexedDB Hardening + PWA
**Researched:** 2026-05-31
**Scope:** NEW additions only. Existing stack (React 19, TS 5.8, Vite 6, Tailwind v4, motion, lucide, recharts, decimal.js, Zod, papaparse, sheetjs-ce, idb, Radix tooltip, Vitest 2.1.9) is validated and not re-researched.

---

## 1. Static Hosting Platform

### Recommendation: Cloudflare Pages (primary) / Netlify (fallback)

#### Criteria-by-criteria comparison

| Criterion | Cloudflare Pages | Netlify | Vercel | GitHub Pages |
|---|---|---|---|---|
| Free indefinitely for static SPA | YES — unlimited bandwidth, no expiry | YES — 100 GB/month; suspended if over limit (reactivates on upgrade) | YES (Hobby) — 100 GB/month | YES — public repos only |
| Credit card on signup | NO — no card ever required | NO — no card required | NO — no card for Hobby | NO |
| GitHub-integrated CI deploy | YES — native GitHub integration | YES — native GitHub integration | YES — native GitHub integration | YES — built-in via Actions |
| Custom domain support | YES — unlimited custom domains | YES — unlimited custom domains | YES — limited on free Hobby | YES — one domain per repo via CNAME |
| Commercial use allowed | YES — no restriction | YES — explicitly commercial-allowed | NO — Hobby plan restricted to personal/non-commercial | CONTESTED — Pages ToS prohibits "commercial transactions or commercial SaaS"; open-source tool is a grey area |
| Global CDN / AU latency | Best — 300+ PoPs including Sydney | Good | Good | GitHub CDN (Fastly) — good |
| Build limits (free) | 500 builds/month | 300 build minutes/month | 6,000 build minutes/month | Unlimited (Actions minutes on public repos) |
| Sensible default headers | YES — HTTPS enforced, reasonable security headers | YES | YES | Minimal — no Content-Security-Policy by default |
| Vite `base` config change needed | NO — deploys to `projectname.pages.dev` at root path | NO | NO | YES — must set `base: '/repo-name/'` in `vite.config.ts` |
| `_headers` / `_redirects` file support | YES | YES | via `vercel.json` | NO |

#### Why Cloudflare Pages wins

1. **Unlimited bandwidth** — no monthly cap that could suspend the app. Netlify's 100 GB soft cap means a viral link could take the app offline mid-month.
2. **No Vite `base` config change** — GitHub Pages requires `base: '/AussieLedger/'` in `vite.config.ts`, which also affects all asset paths and the service worker scope. Cloudflare Pages serves from `/` with zero config change.
3. **Commercial use explicitly allowed** — relevant since AussieLedger is an open-source tool. Vercel Hobby explicitly prohibits commercial projects; GitHub Pages ToS prohibits SaaS/commercial transactions (open-source accounting tool is ambiguous).
4. **Best AU latency** — Cloudflare has a Sydney PoP; important for the Australian target audience.
5. **`_headers` file** — lets you define `Content-Security-Policy`, `X-Frame-Options`, `Permissions-Policy` etc. without a server. Netlify has the same (`_headers` file). GitHub Pages does not.
6. **No credit card, no expiry** — confirmed as of 2026.

#### Why Netlify is the right fallback

Netlify is the backup if Cloudflare Pages has a service issue or the project hits an operational problem. Same developer experience, same `_headers` file support, no credit card. The 100 GB bandwidth cap is acceptable for a fallback scenario. Commercial use explicitly permitted on the free plan.

#### Why Vercel is not recommended (superseded — see PIVOT note below)

Vercel Hobby explicitly prohibits commercial use in its ToS. AussieLedger is borderline (free open-source tool, but it assists with tax compliance which has a commercial context). Not worth the policy risk.

> **PIVOT 2026-06-01:** User selected **Vercel** as the v1.2 public host, on the **Hobby (free) tier**, with explicit ToS acknowledgement. Deploy uses Vercel's native GitHub integration (no GitHub Actions deploy job, no Cloudflare API token). Custom domain `aussieledger.techtaitan.com` already pointed at the Vercel project. Cloudflare-format `_headers` + `_redirects` replaced by single `vercel.json` containing equivalent CSP + security headers + SPA rewrites. AIza secret-leak scan moved from a Cloudflare-specific CI step into the `npm run build` script (`scripts/scan-aiza.mjs`) so it runs on both GitHub Actions AND Vercel's build runner. ToS risk noted; user accepts.

#### Why GitHub Pages is not the primary

- Requires `base: '/AussieLedger/'` in `vite.config.ts` (or a custom domain), which changes the service worker scope and all asset imports.
- ToS ambiguity around commercial use.
- No sensible default security headers.
- Limited to one site per user/org account on free tier (may conflict if other projects exist).
- GitHub Pages is a reasonable fallback-of-last-resort for a genuinely non-commercial pure-open-source project, but Cloudflare Pages and Netlify are strictly better.

**Confidence:** MEDIUM-HIGH. Free tier terms confirmed via official sources and 2026 community comparisons. The commercial-use distinction for Vercel/GitHub Pages is confirmed via official ToS docs.

---

## 2. GitHub Actions Deploy Workflow

### Key decisions

- `cloudflare/pages-action` is **deprecated** — use `cloudflare/wrangler-action@v3` with `pages deploy` command.
- Deploy workflow is a **separate file** from `.github/workflows/ci.yml`. CI validates every push; deploy is an explicit release action.
- Trigger: `push` to `main` (continuous deploy) + `workflow_dispatch` for manual hotfix.
- The CI workflow already runs `npm run build` and produces `dist/`. The deploy job re-runs the build (simpler than artifact handoff for a fast Vite build).

### Complete `.github/workflows/deploy.yml` skeleton

```yaml
# .github/workflows/deploy.yml
# Deploys the production SPA to Cloudflare Pages on every push to main.
# Requires repository secrets:
#   CLOUDFLARE_API_TOKEN  — scoped to "Cloudflare Pages: Edit"
#   CLOUDFLARE_ACCOUNT_ID — found in Cloudflare dashboard > right sidebar

name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch: {}

jobs:
  deploy:
    name: Build & Deploy to Cloudflare Pages
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build
        env:
          # No GEMINI_API_KEY on the public build — AiGateNote shows user-key UI.
          # VITE_HOSTED_MODE tells the SPA it is running without an Express server.
          VITE_HOSTED_MODE: 'true'

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=aussieledger
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

**Setup steps (one-time, in Cloudflare dashboard):**

1. Create a new Pages project named `aussieledger` (direct upload mode — not git-connected, since GH Actions handles the trigger).
2. Create an API token at `dash.cloudflare.com/profile/api-tokens` with permission `Cloudflare Pages: Edit` scoped to your account.
3. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as repository secrets in GitHub Settings → Secrets → Actions.

**`_headers` file for security headers** (place in `public/` so Vite copies it to `dist/`):

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

No `Content-Security-Policy` header included in the skeleton — add one after verifying all CDN sources used by the app (Cloudflare itself may inject scripts).

**GitHub Pages fallback workflow** (if switching to GitHub Pages):

1. Change `vite.config.ts`: add `base: '/AussieLedger/'` (or `/` if using a custom domain).
2. Replace the deploy step with:

```yaml
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Confidence:** HIGH. Cloudflare `wrangler-action@v3` with `pages deploy` is the documented current replacement for the deprecated `pages-action`. `actions/checkout@v4` and `actions/setup-node@v4` are the current standard versions as of 2026.

---

## 3. `navigator.storage.persist()` + `estimate()` Browser Support

### Support matrix

| Browser | `persist()` supported since | `estimate()` supported since | Prompts user? | Grant heuristics |
|---|---|---|---|---|
| Chrome / Chromium | v55 | v55 | NO — silent | Site engagement score, bookmarked, notifications granted |
| Edge | v79 | v79 | NO — silent | Same as Chrome |
| Firefox | v57 | v57 | YES — permission popup | User clicks "Allow" in popup |
| Safari (macOS) | v15.2 | v15.2 | NO — silent since Safari 17 (prior: rare system-level prompt) | Heuristic-based; "home screen web app" status is primary trigger |
| iOS Safari | v15.2 | v15.2 | NO — silent | Home Screen Web App installation is the strongest signal; otherwise frequently denied |

**Global coverage:** ~95% of browsers in use support both APIs (caniuse data, May 2026).

**Secure context required:** Both APIs are HTTPS-only. They will be unavailable on `http://localhost` — use `navigator.storage?.persist` optional-chain guard. On `localhost`, most browsers treat it as a secure context anyway, so `persist()` works in dev.

### Per-browser quirks

**Chrome/Edge:**
- `persist()` returns `true` immediately if the site has been "engaged with" (visited repeatedly, bookmarked, or granted notification permission). Returns `false` silently otherwise. No dialog.
- Calling `persist()` on first page load before any user interaction will usually return `false`. Call it after the user has done something (opened a journal, imported a TB) — this is the "engaged user" trigger.
- Re-calling `persist()` later when the engagement score has grown will return `true`. The architecture doc's pattern of calling it in `LocalAdapter.init()` is correct — by the time the user opens the app and the adapter initialises, any prior engagement is already recorded.

**Firefox:**
- Shows a browser-chrome permission popup asking the user to allow persistent storage.
- The popup is non-blocking (does not prevent JS from continuing). If the user dismisses it, `persist()` resolves to `false`.
- Firefox docs note that pages with active `beforeunload` handlers are excluded from bfcache — keep this in mind (relevant to Pitfall #3 in PITFALLS.md).

**Safari (macOS) and iOS Safari:**
- Safari 17+ no longer shows any user prompt. Entirely heuristic-based.
- The single strongest heuristic documented by WebKit: **the app is installed as a Home Screen Web App** (PWA installed). This is a direct argument for the PWA wrapper — users who install the PWA get persistent storage automatically on iOS.
- Without PWA install: Safari typically denies `persist()` on iOS. The app should handle `false` gracefully and show the backup-nag UI.
- Storage quotas (Safari 17+): origin quota = up to 60% of total disk space in browser; up to 15% in other apps. `estimate()` returns reliable figures post-Safari 17.

**iOS Safari specifically:**
- `beforeunload` is unreliably fired on iOS Safari — it does NOT fire when the user switches apps or closes the browser from the app manager. The architecture doc correctly notes this; the `visibilitychange` event is a better complement for mobile state-save. Do not rely solely on `beforeunload` for data protection on iOS.

### Recommended call pattern

Call `persist()` on the **first meaningful write** (not page load), or inside `LocalAdapter.init()` after the DB opens (as specified in ARCHITECTURE.md). The Architecture doc's approach (in `init()` after `openDB()`) is correct: by the time `init()` runs, a returning user has prior engagement recorded. For a brand-new first-visit user, `persist()` on `init()` is still harmless — it will silently return `false` on low-engagement browsers and `true` on Chrome where the user has the tab focused.

Do NOT call on the initial `import` of the module before any user action — Chrome's heuristic window has not had time to register engagement at that point.

**Confidence:** HIGH. Browser support numbers from caniuse (95% coverage), per-browser behaviour from MDN + web.dev + WebKit official blog.

---

## 4. `vite-plugin-pwa` — Version, Compat, Configuration

### Version to pin

**`vite-plugin-pwa@1.3.0`** — latest release as of May 2026.

Peer dependencies confirmed from `package.json` in the GitHub repo:
- `vite: "^3.1.0 || ^4.0.0 || ^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0"` — Vite 6 is explicitly in the peer dep range.
- `workbox-build: "^7.4.1"` and `workbox-window: "^7.4.1"` — both installed automatically as transitive peers.

**React 19 compat:** `vite-plugin-pwa` is framework-agnostic at the plugin level. It does not import React at all. React 19 compatibility is not a factor. HIGH confidence.

### Install

```bash
npm install -D vite-plugin-pwa
```

This is a devDependency only. The plugin runs at build time; nothing from it is imported at runtime. The Workbox service worker JS is emitted into `dist/` at build time.

### Impact on `npm run dev`

**Zero impact.** By default, `vite-plugin-pwa` does not register a service worker in development mode. `registerType: 'autoUpdate'` only activates in production builds (`vite build`). `npm run dev` runs Vite HMR as before; IDB works normally; no SW is registered; no dev-experience change.

To test the PWA shape during development: `npm run build && npm run preview`. The preview server serves `dist/` with the SW active. This is the correct PWA test path — not `npm run dev`.

### Workbox strategy: `generateSW` (recommended)

| Strategy | What it does | When to use |
|---|---|---|
| `generateSW` (default) | Workbox generates the entire service worker from config | Standard SPA with static assets — covers 95% of use cases |
| `injectManifest` | You write the SW file; Workbox injects the asset manifest | Needed for custom SW logic (push notifications, background sync, complex routing) |

**Use `generateSW`** for AussieLedger v1.2. Reasons:
- No custom SW logic needed (no push notifications, no background sync — both are explicit non-goals in PROJECT.md).
- `generateSW` is zero-maintenance — Workbox handles cache versioning, update detection, and cleanup automatically.
- `injectManifest` would require maintaining a hand-written `sw.ts` file. The added complexity has no payoff for this milestone.

### `vite.config.ts` addition

```typescript
import { VitePWA } from 'vite-plugin-pwa';

// Inside defineConfig plugins array:
VitePWA({
  registerType: 'autoUpdate',
  injectRegister: 'auto',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    navigateFallback: 'index.html',
    // Do NOT cache Express API routes — irrelevant in hosted mode,
    // but prevents accidental SW interception if someone runs dev:full
    // and then inspects a cached build.
    navigateFallbackDenylist: [/^\/api\//],
  },
  manifest: {
    name: 'AussieLedger',
    short_name: 'AussieLedger',
    description: 'Free Australian accounting — TB to tax return in your browser',
    theme_color: '#0f172a',
    background_color: '#ffffff',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-512-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
}),
```

**Required icon files** (add to `public/icons/`):
- `icon-192.png` — 192×192px, square, no rounded corners (browser applies mask)
- `icon-512.png` — 512×512px, same
- `icon-512-maskable.png` — 512×512px with "safe zone" padding (~80px each side) for Android adaptive icons

Optional helper: `@vite-pwa/assets-generator` (optional peer dep) can generate all sizes from a single source SVG.

### `manifest.json` minimum field set (PWA install criteria)

These fields are required by browser install heuristics (Chrome Lighthouse "installable" audit):

| Field | Required | Value |
|---|---|---|
| `name` | YES | `"AussieLedger"` |
| `short_name` | YES | `"AussieLedger"` |
| `start_url` | YES | `"/"` |
| `display` | YES | `"standalone"` (not `"browser"`) |
| `icons` | YES | At least one 192px AND one 512px PNG |
| `theme_color` | Recommended | Brand colour — used in browser chrome on mobile |
| `background_color` | Recommended | Shown during splash screen before CSS loads |
| `description` | Recommended | Shown in browser install UI |

**Confidence:** HIGH. vite-plugin-pwa peer deps confirmed from GitHub `package.json`. Dev-mode behaviour confirmed from official docs. `generateSW` vs `injectManifest` guidance from official vite-pwa-org documentation.

---

## 5. User-Supplied AI Key UX

### Recommended pattern: `<input type="password">` + `localStorage`

No library needed. The pattern specified in the question is correct:

```typescript
// Write
localStorage.setItem('aussieledger:gemini-key', key.trim());

// Read
const key = localStorage.getItem('aussieledger:gemini-key') ?? '';

// Clear
localStorage.removeItem('aussieledger:gemini-key');
```

This follows the existing Phase 6 pattern (`aussieledger:settings` in `localStorage`). The key is `'aussieledger:gemini-key'` (ARCHITECTURE.md uses this exact value — consistent).

### WebCrypto encryption-at-rest: skip for v1.2

The question asks whether to use WebCrypto to encrypt the key at rest with a passphrase. The answer is: **do not add WebCrypto encryption in v1.2**. Reasons:

1. **Threat model mismatch.** The relevant threat is "another JS script on the same origin reads localStorage." Same-origin isolation means only AussieLedger's own JS can read `aussieledger:gemini-key`. There is no XSS vector in an offline SPA that does not load third-party scripts. The key is no less safe than `aussieledger:settings`.
2. **UX cost.** Encrypting with a passphrase requires the user to remember and re-enter it on every session. For a Gemini key (which the user can rotate freely and which has per-call usage caps), this is disproportionate friction.
3. **False security signal.** Encryption-at-rest in `localStorage` protects against device-level storage inspection, not browser-level attacks. If the attacker has device storage access, they have the user's IndexedDB tax data which is far more sensitive. Encrypting the API key while leaving tax data unencrypted would be inconsistent.
4. **v2.0 scope.** If a passphrase-protected encrypted config is desired, it belongs in v2.0 alongside the File System Access API work — where the whole data layer gets a security review.

**UX copy to display in Settings:** "Your Gemini API key is stored only in this browser. It is never sent to our servers. You can revoke it at any time in your Google AI Studio account."

### `<input type="password">` UX pattern

```tsx
// Minimal pattern — enough for planner to spec the implementation
<input
  type="password"
  autoComplete="off"
  value={draftKey}
  onChange={e => setDraftKey(e.target.value)}
  placeholder="Paste your Gemini API key"
  data-testid="gemini-key-input"
/>
<button onClick={() => { saveGeminiKey(draftKey); setDraftKey(''); }}>
  Save key
</button>
<button onClick={() => { saveGeminiKey(''); setDraftKey(''); }}>
  Remove key
</button>
```

Show a masked "key saved" indicator (e.g., `AIza...•••••`) not the full key, after save. Never log the key.

**Confidence:** HIGH. Pattern is a direct application of the existing `localStorage` convention in the codebase.

---

## 6. `beforeunload` Guard — Browser Quirks

### Browser behaviour summary

| Browser | Shows dialog? | `event.preventDefault()` | `event.returnValue = ''` | Custom message | Notes |
|---|---|---|---|---|---|
| Chrome / Edge (v119+) | YES | Required | Also set as fallback | NOT shown — generic "Do you want to leave this site? Changes you made may not be saved." | `returnValue` alone still works in older Chromium for legacy compat |
| Firefox | YES | Works | Works | NOT shown — generic "This page is asking you to confirm that you want to leave — data you have entered may not be saved." | bfcache EXCLUDED for pages with a `beforeunload` listener — see below |
| Safari (macOS) | YES | Works | Works | NOT shown — generic message | After user clicks "Stay", programmatic redirect from JS is blocked (Safari-specific) |
| iOS Safari | NO | Ignored | Ignored | N/A | `beforeunload` is NOT reliably fired on iOS; use `visibilitychange` for mobile state-save |

### Recommended implementation

```typescript
// In App.tsx — useEffect
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    // Condition: there are unsaved writes since the last export
    if (!hasUnsavedChanges()) return;

    // Standard-compliant (Chrome 119+, Firefox, Safari)
    e.preventDefault();
    // Legacy fallback (Chrome < 119, some older Edge)
    e.returnValue = '';
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []);
```

**Do not** attempt to set a custom message string in `returnValue` — all modern browsers ignore it and show only their generic message. Setting a truthy non-empty string was the old pattern; setting `''` (empty string) plus `preventDefault()` is the 2025-2026 standard.

### Firefox bfcache exclusion warning

Any page that has a `beforeunload` listener registered (even if it never fires) is **excluded from Firefox's back/forward cache**. This means clicking Back/Forward in Firefox navigates with a full page reload instead of an instant cache restore.

**Mitigation:** Only add the listener conditionally — add it when `hasUnsavedChanges()` becomes true, remove it immediately when the user exports or when the condition clears. The architecture doc's pattern (always-registered handler with an early return) is slightly suboptimal for Firefox bfcache. The better pattern:

```typescript
useEffect(() => {
  if (!hasUnsavedChanges) return; // don't even register the listener

  const handler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };

  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [hasUnsavedChanges]); // re-run when condition changes
```

### iOS mobile: complement with `visibilitychange`

For iOS Safari where `beforeunload` does not fire, add a parallel `visibilitychange` handler for automatic state persistence:

```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
      // Trigger any pending IDB write synchronously
      // (IDB writes are already async so this is a best-effort nudge)
      flushPendingWrites();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, [hasUnsavedChanges]);
```

**Confidence:** HIGH. Behaviour confirmed via MDN, James Crisp 2025 post (tested across browsers), and the Chrome 119 change documentation.

---

## 7. What NOT to Add in v1.2

The following are explicitly out of scope. Do not create tasks for these. Do not add them to the phase plans.

| Category | Do not add | Reason |
|---|---|---|
| Telemetry | Google Analytics, Plausible, PostHog, Fathom, Mixpanel, Sentry (browser), Datadog RUM, LogRocket, FullStory | PROJECT.md explicit non-goal: "No telemetry by default." Privacy-first. Zero third-party scripts on the hosted origin. |
| Cookie/consent | CookieYes, Cookiebot, any GDPR banner library | No cookies used. No tracking. No third-party scripts. Banner would be misleading theatre. |
| Push notifications | web-push, firebase-messaging, OneSignal SDK | Explicit non-goal in PROJECT.md. SW strategy (`generateSW`) already excludes push handling. |
| Error reporting | Sentry, Bugsnag, Rollbar, Honeybadger | No third-party error exfiltration. Privacy-first. Self-hosters would be sending error data to a third-party service without consent. |
| Auth / user accounts | Auth0, Clerk, NextAuth, Supabase Auth | Explicit non-goal. Every browser is its own instance. |
| Backend AI proxy | Any hosted serverless function to proxy Gemini | Explicit non-goal. User supplies their own key; client-side only. |
| PDF generation library | jsPDF, Puppeteer, react-pdf | PROJECT.md decision: `window.print()` + `@media print` CSS; no new PDF library in v1.x. |
| CSS-in-JS / component library | MUI, Chakra, shadcn (full install), Mantine | Existing Tailwind v4 + lucide + Radix tooltip stack is sufficient. |
| Animation upgrade | GSAP, Lottie | `motion` (framer-motion) is already in dependencies. |
| State management | Redux, Zustand, Jotai | React 19 + Context is sufficient for this app's state shape. |

---

## New Dependencies Summary

| Package | Version | Type | Purpose |
|---|---|---|---|
| `vite-plugin-pwa` | `^1.3.0` | devDependency | PWA service worker + manifest generation at build time |

**No new runtime dependencies.** Every other v1.2 feature uses:
- Platform APIs (`navigator.storage`, `window.addEventListener`, `localStorage`)
- Existing packages already in `dependencies` (`idb`, `@google/genai`)
- GitHub Actions built-in steps + `cloudflare/wrangler-action@v3` (CI only, not a package.json dep)

---

## Sources

- [Cloudflare Pages free plan](https://www.cloudflare.com/plans/free/) — no credit card, unlimited bandwidth confirmed
- [Cloudflare Pages vs Netlify vs Vercel 2026 — DanubeData](https://danubedata.ro/blog/cloudflare-pages-vs-netlify-vs-vercel-static-hosting-2026)
- [GitHub Pages ToS — commercial use restriction](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features)
- [Vercel Hobby plan — non-commercial only](https://vercel.com/docs/plans/hobby)
- [Netlify free plan — commercial use allowed](https://answers.netlify.com/t/can-we-use-netlify-free-plan-for-commercial-purposes/41545)
- [cloudflare/pages-action deprecated — migrate to wrangler-action](https://github.com/cloudflare/pages-action)
- [Cloudflare Pages direct upload with CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)
- [MDN: StorageManager.persist()](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist) — Baseline Widely Available, since December 2021
- [caniuse: navigator.storage](https://caniuse.com/mdn-api_navigator_storage) — 95% global coverage; Chrome 55, Edge 79, Firefox 57, Safari 15.2, iOS Safari 15.2
- [web.dev: persistent storage](https://web.dev/articles/persistent-storage) — per-browser grant heuristics
- [WebKit: Updates to Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/) — Safari 17 quota changes, Home Screen Web App heuristic
- [MDN: beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event) — 2025-2026 recommended pattern
- [James Crisp: The window.beforeUnload event — a sad tale (2025)](https://jamescrisp.org/2025/11/12/the-window-beforeunload-event-a-sad-tale/) — Safari macOS / iOS Safari specific quirks
- [vite-plugin-pwa GitHub](https://github.com/vite-pwa/vite-plugin-pwa) — v1.3.0, Vite peer dep `^3.1.0 || ... || ^8.0.0`
- [vite-pwa-org documentation](https://vite-pwa-org.netlify.app/guide/) — dev mode SW behaviour, generateSW vs injectManifest
