# Requirements: AussieLedger v1.2

**Defined:** 2026-05-31
**Milestone:** v1.2 — Public Hosting + IndexedDB Hardening
**Core Value (unchanged from v1.0):** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**v1.2 thesis:** Put AussieLedger on a public URL so anyone can use it in a browser, backed entirely by the existing v1.0 IndexedDB persistence. Zero third-party databases. Zero hosted user data. Zero ongoing service costs. Harden the IndexedDB-only path so users who arrive cold can trust it with tax data. Ship the open-source release surface for the new "go to URL, start using it" audience. v2.0 (sqlite-wasm + File System Access API + optional Tauri wrapper) follows once v1.2 reaches real users.

## v1.2 Requirements

### Public Hosting + CI/CD (HOST)

Deploy the SPA to a free static host with auto-deploy from `main`. CI defends against accidental secret leaks. Build flag gates hosted-vs-self-host divergence.

- [ ] **HOST-01**: AussieLedger SPA is hosted on Cloudflare Pages at a public URL with GitHub Actions auto-deploy on push to `main` (workflow file `.github/workflows/deploy.yml` using `cloudflare/wrangler-action@v3` with `command: pages deploy dist --project-name=aussieledger`). Includes `_redirects` file `/* /index.html 200` for SPA route fallback + `_headers` file with `Content-Security-Policy` setting `connect-src 'self' https://generativelanguage.googleapis.com` (defense against XSS-exfiltration of user-supplied API keys).
- [ ] **HOST-02**: Post-build CI step greps `dist/` for `AIza` patterns (Gemini API key shape); fails the build if any match. Defensive against the CVE-2023-46115 analog (a contributor accidentally setting `VITE_GEMINI_API_KEY` in the CI environment would otherwise ship the key to every user). Implemented as a step in the deploy workflow.
- [ ] **HOST-03**: Build-time `VITE_HOSTED_MODE` flag (boolean). When `true` (hosted Cloudflare build), the SPA renders the user-supplied AI key UI (AI-01) and shows iOS Safari ITP disclosure (IDB-04). When `false` (default; matches v1.0/v1.1 self-host build), the SPA behaves as today (env-var key only, no hosted-specific banners). Single source of truth; one `import.meta.env.VITE_HOSTED_MODE` check.
- [ ] **HOST-04**: A custom domain (e.g. `aussieledger.com.au` or `aussieledger.app`) routes to the Cloudflare Pages deployment. DNS configured via Cloudflare. Cert auto-renewed. README live-demo link points at the custom domain (not the `.pages.dev` default).

### IndexedDB Hardening (IDB)

Harden the existing v1.0 LocalAdapter so users who arrive at the hosted SPA cold can trust it. All additions go INSIDE LocalAdapter; the Phase 3 StorageAdapter FINAL interface is untouched (duck-typing via `as unknown as { ... }` matches the existing Phase 3 pattern for `getLastExportAt`).

- [ ] **IDB-01**: On first meaningful user action (e.g. creating an entity or posting a journal entry — NOT page load), the app calls `navigator.storage.persist()` to request persistent storage. Result is cached via `navigator.storage.persisted()`. Browsers that don't support the API (very old browsers) degrade silently. Chrome/Edge auto-grant for engaged sites; Firefox prompts; Safari only grants when installed as PWA.
- [ ] **IDB-02**: The Data page (Phase 3) shows quota disclosure derived from `navigator.storage.estimate()` — e.g. "Your browser has allocated approximately {N} GB for this site. Currently using {M} MB." Plain English. Friendly disclosure, not a warning.
- [ ] **IDB-03**: A backup-nag toast fires once on app load when `today - lastExportAt > threshold` (7 days desktop UA; 5 days iOS Safari UA). Reads `lastExportAt` from LocalAdapter meta IDB store via the existing duck-typing pattern. Uses the existing Toast primitive (`tone='warn'`). Includes "Export now" action button and "Snooze 7 days" button (snooze persisted in `localStorage` under `aussieledger:backup-nag-snoozed-until`).
- [ ] **IDB-04**: When user-agent is detected as iOS Safari AND the app is NOT installed as a PWA (`window.matchMedia('(display-mode: standalone)').matches` is false), a contextual banner appears in DataPage explaining the 7-day ITP wipe risk and recommending "Add to Home Screen" to mitigate. Banner is dismissible (per-session). Honest UX about the risk; does not block the app.
- [ ] **IDB-05**: `beforeunload` + `visibilitychange` guard fires a browser-native "are you sure you want to leave?" prompt when `lastWriteAt > lastExportAt`. Listener is registered/unregistered conditionally (NOT permanently) to avoid Firefox bfcache exclusion. `visibilitychange` complement is required because iOS Safari fires `beforeunload` unreliably.

### User-Supplied AI Key + Direct-Browser Gemini (AI)

Hosted SPA cannot ship with a Gemini API key (it would leak to every user). User provides their own key; never sent to the AussieLedger origin or any third party.

- [ ] **AI-01**: Settings page (Phase 6) gains a "Gemini API key" section with `<input type="password">` paste field, "Save" button, "Show/hide" toggle, and live-validation indicator. On Save, app calls Gemini `/models` endpoint with the key to confirm it's valid (401 → "key invalid" inline error); on success, key is persisted to `localStorage` under `aussieledger:gemini-api-key`. Key is held in `useRef` (NOT React state) to prevent React DevTools state inspection from leaking. Never `console.log`'d. One-line disclosure visible: "Stored only in this browser. Never sent to AussieLedger servers." `AiGateNote` (Phase 6) becomes a navigation link to this Settings section when `VITE_HOSTED_MODE=true`.
- [ ] **AI-02**: New `callGeminiMatchAccounts()` helper in `src/lib/ai.ts` handles server-vs-browser routing. When running in `VITE_HOSTED_MODE` and a user key is present in `localStorage`, the helper makes a direct browser fetch to `https://generativelanguage.googleapis.com/.../models/{model}:generateContent` (using the `@google/genai` package already in `dependencies`). When self-hosted with the Express server (`server/`) and no user key, the helper falls back to the existing `/api/ai/match-accounts` route. ImportTB.tsx replaces its inline `fetch('/api/ai/match-accounts', ...)` with a single call to this helper.

### PWA Wrapper (PWA)

Installable to OS home screen; offline-capable; addresses iOS Safari ITP via PWA-install path (resets 7-day timer on each launch).

- [ ] **PWA-01**: `vite-plugin-pwa@^1.3.0` integrated into `vite.config.ts` with `generateSW` strategy (NOT `injectManifest` — no custom SW logic needed) and `registerType: 'prompt'` (NOT `'autoUpdate'` — avoids force-reload mid-form). `skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true` all configured to prevent the stale-cache trap. `manifest.json` includes `name`, `short_name`, `description`, `icons` (192px + 512px PNG), `theme_color`, `background_color`, `display: 'standalone'`, `start_url: '/'`. Service worker only activates in production builds — zero impact on `npm run dev`. Update banner appears when SW detects a new version: "A new version is available — reload to update?" with explicit user click required.

### Release Polish (POL)

First-visit UX + demo data + privacy page + README rewrite — turns the deployed URL into an inviting onboarding surface.

- [ ] **POL-01**: First-visit empty state (no entities) shows an inline trust banner ("Your data stays in your browser — no servers, no accounts") + two CTAs: "Create your first entity" (primary, opens EntityForm) and "Try the demo" (secondary, navigates to `/demo`). Canvas-native style matching Excalidraw — no modal, no product tour. Banner disappears after the user creates their first entity.
- [ ] **POL-02**: `/demo` route loads a separate IndexedDB database named `'aussieledger-demo'` (NOT the production `'aussieledger'` namespace) pre-seeded with an anonymised sole-trader entity + sample chart of accounts + sample journal entries spanning one FY. User can explore freely; switching back to `/` returns them to their real data unchanged. CRITICAL: namespace isolation is the only safe mitigation for demo data overwriting real user data.
- [ ] **POL-03**: `/privacy` page lists the trust signals: no third-party scripts, no cookies, no analytics, no server-side storage, AI calls go direct from user's browser to Google with user's own key, Apache 2.0 license + link to repo. Footer link visible from every page. First-visit users should be able to verify the privacy claims without reading source code.
- [ ] **POL-04**: README rewritten: top-of-fold "Try the live demo at {URL}" + 1-line elevator pitch + screenshot. Quick-start section: (1) try the demo; (2) clone + self-host. Self-host section explains `npm install && npm run build && serve dist/` AND `npm run dev:full` for the Express+SQLite small-firm shape. Privacy footer points at `/privacy` page. Apache 2.0 + CONTRIBUTING link.

## Future Requirements (deferred from v1.2)

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
| HOST-01 | Phase 10 | Pending |
| HOST-02 | Phase 10 | Pending |
| HOST-03 | Phase 10 | Pending |
| HOST-04 | Phase 14 | Pending |
| IDB-01 | Phase 11 | Pending |
| IDB-02 | Phase 11 | Pending |
| IDB-03 | Phase 11 | Pending |
| IDB-04 | Phase 11 | Pending |
| IDB-05 | Phase 11 | Pending |
| AI-01 | Phase 12 | Pending |
| AI-02 | Phase 12 | Pending |
| PWA-01 | Phase 13 | Pending |
| POL-01 | Phase 14 | Pending |
| POL-02 | Phase 14 | Pending |
| POL-03 | Phase 14 | Pending |
| POL-04 | Phase 14 | Pending |

**Total v1.2 requirements: 16**
**Phase coverage: 10 through 14 (5 phases continuing from v1.1's 7–9)**

**Note on HOST-04:** Custom domain assigned to Phase 14 rather than Phase 10 because the README live-demo link (POL-04) needs to point at the custom domain. Phase 10 ships the default `.pages.dev` URL; Phase 14 swaps to the custom domain + updates the README.
