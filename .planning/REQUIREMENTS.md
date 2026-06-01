# Requirements: AussieLedger v1.2

**Defined:** 2026-05-31
**Milestone:** v1.2 — Public Hosting + IndexedDB Hardening
**Core Value (unchanged from v1.0):** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**v1.2 thesis:** Put AussieLedger on a public URL so anyone can use it in a browser, backed entirely by the existing v1.0 IndexedDB persistence. Zero third-party databases. Zero hosted user data. Zero ongoing service costs. Harden the IndexedDB-only path so users who arrive cold can trust it with tax data. Ship the open-source release surface for the new "go to URL, start using it" audience. v2.0 (sqlite-wasm + File System Access API + optional Tauri wrapper) follows once v1.2 reaches real users.

## v1.2 Requirements

### Public Hosting + CI/CD (HOST)

Deploy the SPA to a free static host with auto-deploy from `main`. CI defends against accidental secret leaks. Build flag gates hosted-vs-self-host divergence.

- [x] **HOST-01**: AussieLedger SPA is hosted on **Vercel** (Hobby tier, ToS-acknowledged) at a public URL with auto-deploy on push to `main` via Vercel's native GitHub integration (no GitHub Actions deploy job). Single `vercel.json` at repo root configures (a) `rewrites: [{ source: "/(.*)", destination: "/index.html" }]` for SPA route fallback, and (b) `headers[0]` with the full pragmatic-strict `Content-Security-Policy` setting `connect-src 'self' https://generativelanguage.googleapis.com` plus HSTS + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + X-Frame-Options. Defense against XSS-exfiltration of user-supplied API keys. **Complete 2026-06-01 (pivot from Cloudflare):** `vercel.json` shipped in commit `25320c4`; Vercel project + custom domain already live (see HOST-04). Originally planned for Cloudflare Pages; pivoted to Vercel per user choice with custom domain `aussieledger.techtaitan.com` configured.
- [x] **HOST-02**: `npm run build` script invokes `node scripts/scan-aiza.mjs` post-build, which greps `dist/` for `AIza[0-9A-Za-z_-]{35}` patterns (Gemini API key shape) and exits 1 on any match. Runs on BOTH GitHub Actions CI AND Vercel's build runner — defensive against the CVE-2023-46115 analog (a contributor accidentally setting `VITE_GEMINI_API_KEY` in any build environment would otherwise ship the key to every user). **Complete 2026-06-01 (Vercel pivot):** moved from Cloudflare-specific CI step into the build script itself in commit `ff7d41c`; same regex shape as Plan 10-1's fixture test; scan-against-clean-bundle smoke verified locally.
- [x] **HOST-03**: Build-time `VITE_HOSTED_MODE` flag (boolean). When `true` (hosted Cloudflare build), the SPA renders the user-supplied AI key UI (AI-01) and shows iOS Safari ITP disclosure (IDB-04). When `false` (default; matches v1.0/v1.1 self-host build), the SPA behaves as today (env-var key only, no hosted-specific banners). Single source of truth; one `import.meta.env.VITE_HOSTED_MODE` check. **Complete 2026-05-31 (Plan 10-1):** `isHostedMode()` helper landed in `src/lib/env.ts` with strict `=== 'true'` equality; 7 unit tests cover `'true'` / `'false'` / undefined / `''` / `'1'` / `'TRUE'` / `'true '` boundary cases; build-flag (compile-time) vs StorageAdapter runtime probe explicitly separated in module doc. Downstream Phase 12/13/14 code can `import { isHostedMode } from 'src/lib/env'` immediately. The CI build env that sets `VITE_HOSTED_MODE: 'true'` ships in Plan 10-2.
- [x] **HOST-04**: Custom domain **`aussieledger.techtaitan.com`** routes to the Vercel deployment. DNS + cert handled by Vercel (auto-renewed). README live-demo link points at the custom domain (commit `408e943`). **Complete 2026-06-01 (early — was scheduled for Phase 14):** user already configured the domain at Vercel project setup time; HOST-04 closes at Phase 10 instead of Phase 14, reducing Phase 14 scope by one requirement.

### IndexedDB Hardening (IDB)

Harden the existing v1.0 LocalAdapter so users who arrive at the hosted SPA cold can trust it. All additions go INSIDE LocalAdapter; the Phase 3 StorageAdapter FINAL interface is untouched (duck-typing via `as unknown as { ... }` matches the existing Phase 3 pattern for `getLastExportAt`).

- [x] **IDB-01**: On first meaningful user action (e.g. creating an entity or posting a journal entry — NOT page load), the app calls `navigator.storage.persist()` to request persistent storage. Result is cached via `navigator.storage.persisted()`. Browsers that don't support the API (very old browsers) degrade silently. Chrome/Edge auto-grant for engaged sites; Firefox prompts; Safari only grants when installed as PWA.
- [x] **IDB-02**: The Data page (Phase 3) shows quota disclosure derived from `navigator.storage.estimate()` — e.g. "Your browser has allocated approximately {N} GB for this site. Currently using {M} MB." Plain English. Friendly disclosure, not a warning.
- [x] **IDB-03**: A backup-nag toast fires once on app load when `today - lastExportAt > threshold` (7 days desktop UA; 5 days iOS Safari UA). Reads `lastExportAt` from LocalAdapter meta IDB store via the existing duck-typing pattern. Uses the existing Toast primitive (`tone='warn'`). Includes "Export now" action button and "Snooze 7 days" button (snooze persisted in `localStorage` under `aussieledger:backup-nag-snoozed-until`).
- [x] **IDB-04**: When user-agent is detected as iOS Safari AND the app is NOT installed as a PWA (`window.matchMedia('(display-mode: standalone)').matches` is false), a contextual banner appears in DataPage explaining the 7-day ITP wipe risk and recommending "Add to Home Screen" to mitigate. Banner is dismissible (per-session). Honest UX about the risk; does not block the app.
- [x] **IDB-05**: `beforeunload` + `visibilitychange` guard fires a browser-native "are you sure you want to leave?" prompt when `lastWriteAt > lastExportAt`. Listener is registered/unregistered conditionally (NOT permanently) to avoid Firefox bfcache exclusion. `visibilitychange` complement is required because iOS Safari fires `beforeunload` unreliably. *v1.2 implementation note: the visibilitychange handler performs a settle-point IDB read (forces pending write transactions to land before iOS Safari may suspend the tab) — it does NOT fire a confirmation dialog because browser APIs only permit that from beforeunload. The "are you sure?" prompt is beforeunload-exclusive.*

### ~~User-Supplied AI Key + Direct-Browser Gemini (AI)~~ — DEFERRED to v5 (2026-06-01)

> **Deferred from v1.2 to a future milestone (v5).** User decided AI features will not be enabled on the hosted version until v5. Self-host AI continues to work as today (Express + `GEMINI_API_KEY` env var). On the hosted Vercel deploy, AI surfaces (ImportTB AI re-match button) are naturally hidden because `isAiEnabled()` returns false; the `AiGateNote` copy was updated 2026-06-01 to say "not available on the hosted version" instead of misleadingly pointing at `.env.local`. Phase 12 cancelled; CSP `connect-src` allowlist for `generativelanguage.googleapis.com` (Phase 10 vercel.json) kept in place — harmless and ready to be consumed when v5 ships.

- [~] **AI-01** *(DEFERRED → v5)*: Settings page (Phase 6) gains a "Gemini API key" section with `<input type="password">` paste field, "Save" button, "Show/hide" toggle, and live-validation indicator. On Save, app calls Gemini `/models` endpoint with the key to confirm it's valid (401 → "key invalid" inline error); on success, key is persisted to `localStorage` under `aussieledger:gemini-api-key`. Key is held in `useRef` (NOT React state) to prevent React DevTools state inspection from leaking. Never `console.log`'d. One-line disclosure visible: "Stored only in this browser. Never sent to AussieLedger servers." `AiGateNote` (Phase 6) becomes a navigation link to this Settings section when `VITE_HOSTED_MODE=true`.
- [~] **AI-02** *(DEFERRED → v5)*: New `callGeminiMatchAccounts()` helper in `src/lib/ai.ts` handles server-vs-browser routing. When running in `VITE_HOSTED_MODE` and a user key is present in `localStorage`, the helper makes a direct browser fetch to `https://generativelanguage.googleapis.com/.../models/{model}:generateContent` (using the `@google/genai` package already in `dependencies`). When self-hosted with the Express server (`server/`) and no user key, the helper falls back to the existing `/api/ai/match-accounts` route. ImportTB.tsx replaces its inline `fetch('/api/ai/match-accounts', ...)` with a single call to this helper.

### PWA Wrapper (PWA)

Installable to OS home screen; offline-capable; addresses iOS Safari ITP via PWA-install path (resets 7-day timer on each launch).

- [ ] **PWA-01**: `vite-plugin-pwa@^1.3.0` integrated into `vite.config.ts` with `generateSW` strategy (NOT `injectManifest` — no custom SW logic needed) and `registerType: 'prompt'` (NOT `'autoUpdate'` — avoids force-reload mid-form). `skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true` all configured to prevent the stale-cache trap. `manifest.json` includes `name`, `short_name`, `description`, `icons` (192px + 512px PNG), `theme_color`, `background_color`, `display: 'standalone'`, `start_url: '/'`. Service worker only activates in production builds — zero impact on `npm run dev`. Update banner appears when SW detects a new version: "A new version is available — reload to update?" with explicit user click required. *Plan 13-1 progress (2026-06-01): install path landed — vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.2 in devDependencies; pwaOptions named export in vite.pwa-options.ts locks all three stale-cache flags + registerType:'prompt' + devOptions.enabled:false; 5 PNG icons committed in public/; index.html has apple-touch-icon + theme-color; dist/sw.js + workbox-*.js + manifest.webmanifest emit on every build; 3 contract tests (pwa-manifest 9 + pwa-index-html 4 + pwa-config 17 = 30 GREEN). UpdateBanner UI + Lighthouse smoke pending Plan 13-2.*

### Release Polish (POL)

First-visit UX + demo data + privacy page + README rewrite — turns the deployed URL into an inviting onboarding surface.

- [ ] **POL-01**: First-visit empty state (no entities) shows an inline trust banner ("Your data stays in your browser — no servers, no accounts") + two CTAs: "Create your first entity" (primary, opens EntityForm) and "Try the demo" (secondary, navigates to `/demo`). Canvas-native style matching Excalidraw — no modal, no product tour. Banner disappears after the user creates their first entity.
- [ ] **POL-02**: `/demo` route loads a separate IndexedDB database named `'aussieledger-demo'` (NOT the production `'aussieledger'` namespace) pre-seeded with an anonymised sole-trader entity + sample chart of accounts + sample journal entries spanning one FY. User can explore freely; switching back to `/` returns them to their real data unchanged. CRITICAL: namespace isolation is the only safe mitigation for demo data overwriting real user data.
- [ ] **POL-03**: `/privacy` page lists the trust signals: no third-party scripts, no cookies, no analytics, no server-side storage, AI calls go direct from user's browser to Google with user's own key, Apache 2.0 license + link to repo. Footer link visible from every page. First-visit users should be able to verify the privacy claims without reading source code.
- [ ] **POL-04**: README rewritten: top-of-fold "Try the live demo at {URL}" + 1-line elevator pitch + screenshot. Quick-start section: (1) try the demo; (2) clone + self-host. Self-host section explains `npm install && npm run build && serve dist/` AND `npm run dev:full` for the Express+SQLite small-firm shape. Privacy footer points at `/privacy` page. Apache 2.0 + CONTRIBUTING link.

## Future Requirements (deferred from v1.2)

- **AI-01 + AI-02 (User-Supplied Gemini Key + Direct-Browser Gemini)** — *deferred to v5 on 2026-06-01.* Self-host AI keeps working as today (server-side `GEMINI_API_KEY` env var); hosted Vercel deploy will not surface AI features until the v5 milestone. CSP `connect-src` allowlist for `generativelanguage.googleapis.com` already in `vercel.json` (Phase 10) — pre-positioned for v5.
- **sqlite-wasm + File System Access API** — v2.0's locked direction; user-owned `.aussieledger` SQLite files on disk
- **Tauri desktop wrapper** — v2.0 follow-on once `BrowserSqliteAdapter` is proven in production
- **Anonymous voluntary error reporting** — even opt-in telemetry contradicts the "nothing leaves your browser" message v1.2 establishes; defer to v2.x if it ever becomes warranted
- **WebCrypto encryption-at-rest for AI key** — threat-model mismatch (same-origin JS isolation already applies); v2.x if needed
- **Active PWA install prompt** — wait for native browser affordance; not-annoying principle
- **In-app product tour** — first-visit empty state is sufficient; tour is over-engineered for the audience
- **Backend AI proxy hosted by us** — explicit non-goal; user supplies own key
- **Multi-user accounts / auth on hosted URL** — every browser is its own instance; explicit non-goal
- **CODE_OF_CONDUCT.md + SECURITY.md** — defer to v1.3 or later when external contributors arrive
- **Multi-FY catch-up wizard** — carries over from v1.0/v1.1 deferred list
- **Sidebar `<button>`-in-`<button>` refactor** — v1.1 audit known issue; defer to v1.3 polish

## Out of Scope (explicit non-goals)

- **Cookie banners** — no cookies = no banner required (iubenda GDPR guidance verified). Adding one would violate the "nothing leaves your browser" promise.
- **Newsletter signup popups · aggressive PWA install nag · notification permission requests** — all anti-features for this audience.
- **Third-party tracking scripts** (Google Analytics, Plausible, PostHog, anything) — explicit non-goal; explicit anti-feature.
- **"Powered by Cloudflare" badges or hosting-provider branding in production builds**.
- **`@tauri-apps/*` dependencies** — that's v2.0's territory.
- **`@vite-pwa/assets-generator` icon auto-generation** — v1.2 ships hand-made PNG icons; auto-generation can be a v1.3 dev-ergonomics polish if needed.
- **Active service-worker update force-reload** — `registerType: 'prompt'` requires explicit user click; never reload mid-form.
- **Backend Gemini proxy** — direct browser-to-Google fetch with user's key.

## Traceability

Confirmed by `/gsd:roadmapper` on 2026-05-31. Each REQ-ID maps to exactly one phase. Coverage: 16/16 — no orphans, no duplicates.

| Req | Phase | Status |
|-----|-------|--------|
| HOST-01 | Phase 10 | Complete (10-pivot 2026-06-01) |
| HOST-02 | Phase 10 | Complete (10-pivot 2026-06-01) |
| HOST-03 | Phase 10 | Complete (10-1 2026-05-31) |
| HOST-04 | Phase 10 (was Phase 14) | Complete (10-pivot 2026-06-01) |
| IDB-01 | Phase 11 | Complete (11-2 2026-06-01: tryPersist helper landed 11-1; DataPage Storage Protection row + getPersistGranted consumer landed 11-2) |
| IDB-02 | Phase 11 | Complete (11-2 2026-06-01: getStorageEstimate helper landed 11-1; DataPage Storage Budget row + formatQuotaLine silent-fallback landed 11-2) |
| IDB-03 | Phase 11 | Complete (11-2 2026-06-01: useBackupNag hook + Toast actions slot + App-level mount + DataPage handleExport snooze-clear) |
| IDB-04 | Phase 11 | Complete (11-2 2026-06-01: IosItpBanner 4-gate matrix + verbatim CONTEXT-locked copy + sessionStorage per-session dismiss + DataPage mount) |
| IDB-05 | Phase 11 | Complete (11-2 2026-06-01: lastWriteAt machinery + bumpWriteAt + opts.silent landed 11-1; App-level conditional beforeunload+visibilitychange + Blocker 2 settle-point flush + REQUIREMENTS italic capability disclosure landed 11-2) |
| ~~AI-01~~ | ~~Phase 12~~ | DEFERRED → v5 (2026-06-01) |
| ~~AI-02~~ | ~~Phase 12~~ | DEFERRED → v5 (2026-06-01) |
| PWA-01 | Phase 13 | In Progress — Plan 13-1 done 2026-06-01 (install path); Plan 13-2 next (UpdateBanner) |
| POL-01 | Phase 14 | Pending |
| POL-02 | Phase 14 | Pending |
| POL-03 | Phase 14 | Pending |
| POL-04 | Phase 14 | Pending |

**Total v1.2 requirements: 14** (was 16; AI-01/AI-02 deferred to v5 on 2026-06-01)
**Phase coverage: 10, 11, 13, 14** — Phase 12 (AI) deferred. v1.2 effectively ships 4 phases continuing from v1.1's 7–9. Phase numbering preserved (no renumber) so commit history + downstream phase plans remain stable.

**Note on HOST-04 (superseded):** Originally assigned to Phase 14 so the README live-demo link (POL-04) could point at the custom domain after Phase 10 shipped the `.pages.dev` URL. The 2026-06-01 Vercel pivot dissolved this dependency — the user configured `aussieledger.techtaitan.com` at Vercel project setup time, so HOST-04 was satisfied during the Phase 10 pivot bundle and the README live-demo link was added to point at the custom domain directly (commit `408e943`). POL-04 (the full audience-first README rewrite) still belongs to Phase 14.
