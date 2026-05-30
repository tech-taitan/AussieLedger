# v1.2 Research — Synthesis

**Project:** AussieLedger v1.2 — Public Hosting + IndexedDB Hardening + PWA
**Synthesised:** 2026-05-31
**Underlying research:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md (all HIGH confidence on key claims; one MEDIUM area flagged)

---

## Recommended Stack

| Layer | Pin | Why |
|------|-----|-----|
| Static hosting | **Cloudflare Pages** (primary) · Netlify (fallback) | Unlimited bandwidth · no credit card · commercial use OK · native GitHub integration · zero `base` config needed · `_headers` file for CSP. **GitHub Pages eliminated** (requires `base: '/AussieLedger/'`, ToS commercial ambiguity, no custom headers). **Vercel eliminated** (non-commercial Hobby ToS) |
| CI deploy action | `cloudflare/wrangler-action@v3` with `command: pages deploy dist --project-name=aussieledger` | The `cloudflare/pages-action` is deprecated — use wrangler-action |
| PWA wrapper | **`vite-plugin-pwa@^1.3.0`** (devDependency) | Vite 6 in peer-dep range; React 19 compatible; zero impact on `npm run dev`; SW only activates in production builds |
| PWA strategy | `generateSW` (not `injectManifest`) with `registerType: 'prompt'` | No custom SW logic needed; `'prompt'` over `'autoUpdate'` to avoid force-reload mid-form |
| AI direct-browser proxy | `@google/genai@^1.29` already in `dependencies` | No new package; new `callGeminiMatchAccounts()` helper in `src/lib/ai.ts` |
| Other deps | **NONE** | All other v1.2 features use platform APIs already in scope |

**Stack additions = 1 new devDependency** (`vite-plugin-pwa`). Everything else is platform APIs or existing packages.

---

## Architecture Decision

### Five-phase build order (dependency-driven)

| # | Phase | Why it's gated by this position |
|---|-------|----------------------------------|
| 10 | **Public Build + CI/CD to Cloudflare Pages** | Produces the public URL; unlocks `VITE_HOSTED_MODE`-gated features; provides real test environment for everything downstream |
| 11 | **IndexedDB hardening** (`persist()` + quota disclosure + backup-nag) | Depends on Phase 10 — needs HTTPS + production build to test reliably |
| 12 | **User-supplied AI key** + direct-browser Gemini call | Independently executable after Phase 10; can run parallel to Phase 13 |
| 13 | **PWA wrapper** (manifest + service worker) | Independently executable after Phase 10; can run parallel to Phase 12 |
| 14 | **Release polish** (demo route + privacy page + README rewrite + first-visit UX) | Forced-last — README needs the real URL; demo route needs hosting verified |

### Integration invariants (LOCKED)

- **StorageAdapter FINAL** — all IDB hardening additions go INSIDE `LocalAdapter` only. Interface untouched. Duck-typing via `as unknown as { ... }` is the established pattern (DataPage already uses it for `getLastExportAt`).
- **`VITE_GEMINI_API_KEY` does NOT leak** — existing `vite.config.ts` already uses `process.env.GEMINI_API_KEY` via the `define` block (not `VITE_` auto-expose). Build-time key absent on CI runner. No change needed. **CI lint check still added** as defensive guard.
- **AI proxy routing belongs in `src/lib/ai.ts`** — new `callGeminiMatchAccounts()` handles server-vs-browser split. ImportTB replaces inline `fetch('/api/ai/match-accounts', ...)` with this single call.
- **Backup-nag = new `useBackupNag` hook** — reads existing `lastExportAt` from `LocalAdapter` meta IDB store via duck-typing. Snooze in `localStorage` under `aussieledger:backup-nag-snoozed-until`. Toast uses existing primitive with `tone='warn'`.
- **Demo route IDB isolation** — `/demo` MUST write to `'aussieledger-demo'` IDB database name. Writing to production `'aussieledger'` namespace would overwrite real user data (HARD-BLOCK).
- **`server/` continuity** — v1.2 does NOT deprecate the Express + SQLite shape. `npm run dev:full` keeps working for small-firm VPS users. Document in README.

---

## Feature Categories

### TABLE STAKES (must ship in v1.2)

- **Public URL hosting on Cloudflare Pages** with GitHub Actions auto-deploy from `main`
- **`navigator.storage.persist()` request** on first meaningful user action (engaged-trigger, not page load)
- **Quota disclosure** via `navigator.storage.estimate()` surfaced in DataPage
- **Backup-nag toast** (day-based threshold; 7 days desktop, 5 days iOS; snoozable; uses existing Toast primitive)
- **Pre-unload guard** (`beforeunload` + `visibilitychange` for iOS Safari) — fires only when `lastWriteAt > lastExportAt`
- **User-supplied Gemini API key UI** — Settings page with `<input type="password">` + live validation call + "stored only in this browser" disclosure
- **`AiGateNote` becomes nav link to Settings** (not inline credential form)
- **First-visit empty state** — inline trust banner ("data stays in your browser") + two CTAs ("Create entity" primary, "Try demo" secondary). No modal, no product tour.
- **README rewrite** — top-of-fold "try the live demo at [URL]" + "or clone + self-host" + privacy disclosure footer
- **`/demo` route** with isolated `'aussieledger-demo'` IDB namespace + pre-seeded sole-trader sample books
- **Privacy disclosure** — footer link + dedicated `/privacy` page; trust signals (no analytics · no cookies · no server-side storage · code is open-source)

### DIFFERENTIATORS

- **PWA wrapper** with `manifest.json` + service worker + "Add to Home Screen" support — addresses iOS Safari ITP 7-day wipe by giving users a path to install (which resets the ITP timer on each launch)
- **"Last backed up N days ago" indicator** in DataPage header
- **Live AI-key validation** — pre-validate via Gemini `/models` 401 check before saving; never save an invalid key
- **iOS-specific disclosure** — when user-agent detected as iOS Safari and not installed as PWA, show contextual banner explaining the 7-day ITP risk with "Add to Home Screen" instructions
- **CSP `connect-src` allowlist** in `_headers` file — limits browser fetch to `'self'` + `generativelanguage.googleapis.com` only (defense against XSS-exfiltration of user's API key)
- **Vite-bundle scan in CI** — post-build greps `dist/` for `AIza` patterns; fails build if any Gemini key shape detected (defensive against future contributors)

### DEFER (post-v1.2)

- Anonymous voluntary error reporting · WebCrypto encryption-at-rest for AI key · Active PWA install prompt · Custom domain · In-app product tour

### ANTI-FEATURES (explicit out-of-scope)

- ❌ Cookie banners · newsletter popups · aggressive PWA install nag · notification prompts · third-party tracking scripts · "Powered by" badges · backend AI proxy hosted by us · multi-user accounts / auth · telemetry of any shape (even opt-in)

---

## Critical Pitfalls (Hard-Block)

| # | Pitfall | Prevention | Phase |
|---|---------|------------|-------|
| 1 | **`VITE_GEMINI_API_KEY` CI leak** — `VITE_` prefix bakes env vars into production bundle. Real 2025-26 incidents (Truffle Security: 2,863 live keys exposed; one stolen key cost $82,314 in 48h). | Post-build grep of `dist/` for `AIza` patterns; CI fails if any match. Vite config uses `process.env.GEMINI_API_KEY` via `define` block — already in place; defensive CI lint added. | Phase 10 — CI/CD |
| 2 | **iOS Safari ITP 7-day wipe** — ITP deletes ALL IndexedDB / localStorage / SW registrations / Cache Storage after 7 days of no interaction. `persist()` does NOT reliably prevent this on iOS. | iOS-specific disclosure banner · 5-day backup-nag threshold (not 7) for iOS UA · guide iOS users to PWA install (resets timer on each launch) · honest UX about wipe risk. | Phase 11 — IDB Hardening |
| 3 | **PWA stale-cache trap** — without `skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true`, PWA users get cached old `index.html` indefinitely. Annual ATO rate changes never reach them. | All three Workbox flags set. `registerType: 'prompt'` (not `'autoUpdate'`) with explicit "new version available — reload?" banner. | Phase 13 — PWA |
| 4 | **Demo data leak** — `/demo` route writing sample books into production `'aussieledger'` IDB overwrites real user tax data. | Demo MUST use separate `'aussieledger-demo'` IDB database name. IDB origin-scoping makes namespace isolation the only correct mitigation. | Phase 14 — Release Polish |
| 5 | **SPA routing 404** — direct URL navigation on `/year-end` returns HTTP 404 without fallback. | Cloudflare Pages: `_redirects` file with `/* /index.html 200`. (GH Pages fallback would need `dist/404.html = dist/index.html` copy.) | Phase 10 — CI/CD |
| 6 | **User API key network leak via XSS** — if any XSS vulnerability + analytics script existed, key would exfiltrate. | Strict CSP `connect-src` allowlist (only `'self'` + `generativelanguage.googleapis.com`) in `_headers` file. No third-party scripts ever. | Phase 12 — AI key |
| 7 | **API key in React DevTools state** — putting the key in component state exposes it to anyone with DevTools open. | Use `useRef` for key in-memory; serialise to localStorage only on explicit save; never `console.log(key)`. Acceptance criterion: grep `src/components/Settings.tsx` for `console.log.*[Kk]ey` returns ZERO. | Phase 12 — AI key |

### Known-Risks (note + monitor)

- `navigator.storage.persist()` browser quirks (Chrome auto-grants engaged sites; Firefox prompts; Safari only via Home Screen PWA)
- `beforeunload` + Firefox bfcache exclusion (register/unregister conditionally)
- iOS Safari `beforeunload` unreliable (complement with `visibilitychange`)
- Origin-change IDB loss (documentation-only)
- iOS PWA specifics (Share-menu install, ITP still applies but home-screen launch resets timer, no push until 16.4+)
- `prefers-reduced-motion` respect for motion library (verify or surface as polish)

---

## Suggested Phase Order

| # | Phase | Dependencies |
|---|-------|--------------|
| 10 | **Public Build + CI/CD to Cloudflare Pages** | none |
| 11 | **IndexedDB Hardening** (persist + quota + backup-nag + iOS disclosure) | Phase 10 |
| 12 | **User AI Key + Direct-Browser Gemini** | Phase 10 (parallel with 13) |
| 13 | **PWA Wrapper** (manifest + SW + update banner) | Phase 10 (parallel with 12) |
| 14 | **Release Polish** (first-visit UX + /demo + /privacy + README) | Phases 10–13 |

Phases 12 + 13 parallelisable after Phase 10. Phase 14 forced-last. Expected total: ~2 weeks at v1.1 cadence.

---

## Open Questions (defer to per-phase discuss-phase)

1. CSP exact policy — draft at Phase 10 implementation once all asset origins known
2. Icon asset generation tooling (`@vite-pwa/assets-generator` vs user-provided PNGs) — Phase 13
3. Custom domain decision — default `aussieledger.pages.dev` works for v1.2; Phase 14 picks
4. `@google/genai` v1.29.0 `models.generateContent` exact signature — verify at Phase 12 implementation

---

## What NOT To Add

- ❌ Vercel (non-commercial Hobby ToS) · GitHub Pages (requires `base:`, no custom headers) · Netlify (acceptable fallback only)
- ❌ `cloudflare/pages-action` (deprecated — use `wrangler-action@v3`)
- ❌ `injectManifest` PWA strategy (use `generateSW`)
- ❌ `registerType: 'autoUpdate'` (use `'prompt'`)
- ❌ WebCrypto encryption-at-rest for API key (threat-model mismatch)
- ❌ Third-party error reporting (Sentry, Rollbar, Honeybadger)
- ❌ Telemetry libraries (PostHog, Plausible, Google Analytics)
- ❌ Cookie banner libraries (no cookies = no banner required)
- ❌ `@tauri-apps/*` (v2.0's territory)
