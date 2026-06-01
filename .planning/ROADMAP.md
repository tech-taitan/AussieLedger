# Roadmap: AussieLedger

**Last updated:** 2026-06-01 (Phase 11 Plans 11-1 + 11-2 complete — full IndexedDB hardening; IDB-01..05 closed end-to-end; 1083 SPA GREEN; awaiting verification + UAT)

## Milestones

- ✅ **v1.0** — Phases 1–6 (shipped 2026-05-29) — see [.planning/milestones/v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md)
- ✅ **v1.1** — Phases 7–9 (shipped 2026-05-30) — Polish, Closure, and TB Import Rework
- 🔄 **v1.2** — Phases 10–14 (In Progress) — Public Hosting + IndexedDB Hardening
- 📋 **v2.0** — Standalone desktop app + file-backed SQLite + hard network sandbox — research at [.planning/future-milestones/v2.0-standalone-app/](./future-milestones/v2.0-standalone-app/) (deferred; reactivate after v1.2 ships)

## Phases

<details>
<summary>✅ v1.0 (Phases 1–6) — SHIPPED 2026-05-29</summary>

- [x] Phase 1: Safety Net (3/3 plans) — completed 2026-05-10
- [x] Phase 2: Decompose and Tax Engine (4/4 plans) — completed 2026-05-10
- [x] Phase 3: Durable Persistence (4/4 plans) — completed 2026-05-12
- [x] Phase 4: Bookkeeping Core (4/4 plans) — completed 2026-05-13
- [x] Phase 5: Tax Outputs (4/4 plans) — completed 2026-05-28
- [x] Phase 6: Personas, Wizard, and Deployment (4/4 plans) — completed 2026-05-29

</details>

<details>
<summary>✅ v1.1 (Phases 7–9) — SHIPPED 2026-05-30</summary>

- [x] Phase 7: ImportTB UX Rework (4/4 plans) — completed 2026-05-30
- [x] Phase 8: Family Medicare Levy Engine (3/3 plans) — completed 2026-05-30
- [x] Phase 9: Exports + Polish + Cleanup (1/1 plans) — completed 2026-05-30

</details>

### v1.2 (In Progress)

- [x] **Phase 10: Public Build + CI/CD (Cloudflare→Vercel pivot)** — SPA LIVE at https://aussieledger.techtaitan.com — completed 2026-06-01 (HOST-04 closed early)
- [x] **Phase 11: IndexedDB Hardening** — persist grant + quota disclosure + backup-nag + iOS ITP disclosure + pre-unload guard with settle-point flush — plans complete 2026-06-01 (awaiting verification + UAT)
- [ ] **Phase 12: User-Supplied AI Key + Direct-Browser Gemini** — Settings AI key UI + `callGeminiMatchAccounts` routing helper
- [ ] **Phase 13: PWA Wrapper** — service worker + manifest + stale-cache prevention + update banner
- [ ] **Phase 14: Release Polish** — first-visit UX + `/demo` route + `/privacy` page + README rewrite (HOST-04 already done in Phase 10)

## Phase Details

### Phase 7: ImportTB UX Rework

**Goal:** A user can upload a real-world unformatted TB CSV/XLSX from Xero/MYOB/QuickBooks/Excel and ImportTB correctly identifies headers, parses currency tolerantly, excludes subtotals, merges split account-code/name columns, and surfaces every dropped row with a fix-it path — without breaking the existing deterministic-clean-import flow.

**Depends on:** Nothing (first v1.1 phase; v1.0 phases complete). Phases 8 + 9 are independent of this phase.

**Requirements:** IMP-07, IMP-08, IMP-09, IMP-10, IMP-11

**Success Criteria** (what must be TRUE):
1. A messy fixture TB (title rows above headers, `$1,234.56` cells, parenthesised negatives, subtotal rows, split code/name columns) imports cleanly — zero rows lost to silent parse failure
2. ImportTB auto-suggests the header row with a confidence indicator; user can override by clicking any row; multi-row headers (e.g. "Account" / "Code | Name") merge correctly
3. Currency parser test suite covers `$1,234.56`, `(1,234.56)`, `AUD 1234.56`, `1,234.56 AUD`, `1234.56`, `  1234.56  `, ` $ -1,234.56 ` — every form round-trips as a `Decimal` with full precision preserved
4. Subtotal detector excludes "Total Operating Expenses" / "Net Income" / "Grand Total" / sum-of-preceding-rows-pattern rows by default; user-visible "Rejected rows" panel lets the user re-include any of them
5. ImportReviewPane "Rejected rows" panel shows reason per row; inline edit works; "Apply this fix to similar rows" bulk action handles repeated patterns
6. The existing clean-import flow (Phase 4 fixture) still works unchanged — 763 SPA + 18 server tests stay GREEN

**Plans:** 4 plans (complete)

### Phase 8: Family Medicare Levy Engine

**Goal:** An Individual entity with dependants or a spouse income calculates Medicare levy using the real family thresholds — not the flat-2%-with-warning fallback Phase 5 shipped. Form I prints the family-variant calculation with assumption disclosure.

**Depends on:** Nothing (v1.0 + Phase 7 don't touch Medicare; safe to start in parallel with Phase 7)

**Requirements:** MED-01, MED-02, MED-03, MED-04

**Success Criteria** (what must be TRUE):
1. v5→v6 additive migration writes `dependants?` and `spouseIncome?` on Individual entities only — round-trip test passes with existing v0→v5 fixture set
2. `computeIndividualReturn` for an Individual with `dependants: 2 + spouseIncome: "60000"` produces Medicare M1/M2 values matching the ATO family-threshold formula
3. Form I renders the family-threshold variant of M1/M2 with an "Assumption: family thresholds applied — N dependants, spouse income $X" row in the AssumptionsBlock
4. EntityForm shows `dependants` + `spouseIncome` only for Individual entities; both fields optional; defaults are `undefined`
5. Existing v1.0 individual entities (no `dependants` / no `spouseIncome`) continue to use single-person Medicare exactly as Phase 5 shipped — zero regression

**Plans:** 3 plans (complete)

### Phase 9: Exports + Polish + Cleanup

**Goal:** Close v1.0's known gaps in one polish-and-ship phase. FND-02 (CSV exports) is the headline; anomaly deep-links polish UX-02; the cosmetic + Nyquist sweep removes audit-flagged hygiene debt.

**Depends on:** Nothing (independent of Phases 7 + 8)

**Requirements:** FND-10, FND-11, FND-12, UX-06, CLEAN-01, CLEAN-02

**Success Criteria** (what must be TRUE):
1. From any tax-return view, "Export labels as CSV" produces a correctly-shaped CSV — TB CSV opens cleanly in Excel/Sheets; BAS labels CSV matches the lodgement vs internal-only split; Form I CSV includes the source-account list per label
2. Clicking a Sidebar count badge (e.g. "Journals 3") navigates to the Journals screen AND auto-scrolls to the first offending row — repeat clicks cycle through remaining offenders
3. `git grep "US Big Law Firm" src/` returns zero matches
4. `.planning/milestones/v1.0-phases/01-safety-net/01-VALIDATION.md`, `02-decompose-and-tax-engine/02-VALIDATION.md`, and `06-personas-wizard-and-deployment/06-VALIDATION.md` all have `nyquist_compliant: true`
5. Full SPA test suite GREEN; lint + build EXIT 0; UAT signs off all 6 v1.1 requirements end-to-end

**Plans:** 1 plan (complete)

---

### Phase 10: Public Build + CI/CD to Cloudflare Pages

**Goal:** AussieLedger is live on a public URL with automatic deploy from `main`, secret-leak protection baked into CI, and SPA routing working correctly for any deep link.

**Depends on:** Nothing (first v1.2 phase)

**Requirements:** HOST-01, HOST-02, HOST-03

**Success Criteria** (what must be TRUE):
1. Navigating directly to `https://<deploy-url>/journals` (or any deep-link path) from a fresh browser tab serves the SPA, not a 404 page — the `_redirects` `/* /index.html 200` fallback is confirmed working in production
2. Pushing a commit to `main` triggers `.github/workflows/deploy.yml`, which builds with `VITE_HOSTED_MODE=true` and deploys to Cloudflare Pages within the workflow run — no manual step required
3. The CI deploy workflow includes a post-build scan of `dist/assets/` for `AIza` key-shaped strings; if any match is found, the build fails before deployment — protecting against accidental key leak by any future contributor
4. The deployed SPA responds correctly to `VITE_HOSTED_MODE=true`: the `/api/health` probe is skipped on startup, and `AiGateNote` renders the hosted-mode copy (Settings navigation link, not the `.env.local` instruction)

**Plans:** 2 plans

Plans:
- [x] 10-1-build-flag-and-static-config-files.md — isHostedMode() helper + public/_redirects + public/_headers + AIza fixture+regex test (HOST-03 + HOST-01/02 prep) — completed 2026-05-31
- [ ] 10-2-ci-widening-and-cloudflare-deploy-job.md — extend ci.yml with AIza scan + artifact + Cloudflare deploy job + concise README self-host section (HOST-01, HOST-02, HOST-03)

---

### Phase 11: IndexedDB Hardening

**Goal:** A user who arrives at the hosted SPA cold can trust it with their tax data — the browser is asked to protect their storage, they can see how much space the app uses, and they receive timely reminders to export backups before data loss occurs.

**Depends on:** Phase 10 (HTTPS environment needed for `navigator.storage.persist()` to be meaningfully testable; production PWA install path needed for iOS Safari ITP mitigation testing)

**Requirements:** IDB-01, IDB-02, IDB-03, IDB-04, IDB-05

**Success Criteria** (what must be TRUE):
1. After a user's first meaningful write (entity created or journal posted), `navigator.storage.persist()` has been called; the result (`true`/`false`) is displayed in DataPage as "Storage protected" or "Storage not protected — back up regularly"; the call degrades silently on browsers that do not support the API
2. DataPage shows a plain-English quota disclosure derived from `navigator.storage.estimate()` — e.g. "Your browser has allocated approximately 2.4 GB for this site. Currently using 47 MB."
3. On app load, when `today − lastExportAt > 7 days` (or `> 5 days` on an iOS Safari user-agent that is not in standalone mode), a warn-tone Toast fires with "Export now" and "Snooze 7 days" action buttons; the snooze is persisted in `localStorage` under `aussieledger:backup-nag-snoozed-until` and the toast is suppressed for the snooze period
4. When user-agent is iOS Safari AND the app is NOT installed as a PWA (`display-mode: standalone` is false), a dismissible contextual banner appears in DataPage explaining the 7-day ITP wipe risk and linking to "Add to Home Screen" instructions
5. When `lastWriteAt > lastExportAt`, closing or navigating away from the tab triggers the browser-native "are you sure?" dialog; the listener is registered and unregistered conditionally (not permanently) to preserve Firefox bfcache eligibility; `visibilitychange` fires a complementary state-flush for iOS Safari where `beforeunload` is unreliable

**Plans:** 2 plans

Plans:
- [x] 11-1-local-adapter-hardening-and-period-helpers-and-structural-lint.md — LocalAdapter duck-typed accessors (getPersistGranted / getStorageEstimate / getLastWriteAt / setLastWriteAt) + bumpWriteAt wrapper + tryPersist once-in-init + opts.silent on importAll (Blocker 1 fix) + nowIso() in period.ts + structural-lint-period.test.ts (W1 fix) — completed 2026-06-01
- [x] 11-2-ui-wiring-databpage-rendering-backup-nag-itp-banner-beforeunload.md — useBackupNag hook + IosItpBanner + DataPage quota/persist-status render + App.tsx conditional beforeunload + visibilitychange settle-point (Blocker 2 fix) + Toast actions slot widening + REQUIREMENTS IDB-05 italic disclosure + addDaysIso(days) helper — completed 2026-06-01 (5 task commits; 56 new SPA tests GREEN; all CI runs GREEN; awaiting /gsd:verify-phase 11 + UAT)

---

### Phase 12: User-Supplied AI Key + Direct-Browser Gemini

**Goal:** A hosted-SPA user can paste their own Gemini API key into Settings, and AI account-matching in ImportTB routes through a direct browser-to-Google call — no AussieLedger server involved, no key ever logged or sent to the app's origin.

**Depends on:** Phase 10 (the `VITE_HOSTED_MODE` flag must exist for `AiGateNote` to render the hosted-mode navigation link; the CSP `connect-src` header landed in Phase 10 must allowlist `generativelanguage.googleapis.com`)

**Note:** Independently executable in parallel with Phase 13 after Phase 10 completes.

**Requirements:** AI-01, AI-02

**Success Criteria** (what must be TRUE):
1. The Settings page has an "AI (Optional)" section with a `type="password"` input field, a "Save" button, a "Show/hide" toggle, and a live-validation indicator; on Save, the app calls the Gemini `/models` endpoint with the key — a 401 response shows "key invalid" inline; a 200 response stores the key in `localStorage` under `aussieledger:gemini-api-key` and shows a green confirmation
2. The stored key is displayed masked (e.g. `AIza...•••••`) after save; it is never rendered in plaintext after initial entry; `grep src/components/Settings.tsx -n "console.log"` combined with `grep src/lib/ai.ts -n "console.log"` returns zero matches involving the key variable
3. When `VITE_HOSTED_MODE=true` and a valid user key is present, clicking "AI Match Accounts" in ImportTB successfully calls `https://generativelanguage.googleapis.com` directly from the browser using `@google/genai` — no fetch to `/api/ai/match-accounts` is made; the result is processed identically to the server-proxy path
4. When `VITE_HOSTED_MODE=true` and no user key is present, `AiGateNote` renders a clickable link "add your Gemini key in Settings" that navigates to the Settings AI section — not the old `.env.local` instruction
5. `server/` continuity: the self-hosted `npm run dev:full` path continues to route AI calls through `/api/ai/match-accounts` (Express proxy); the `callGeminiMatchAccounts()` helper selects the correct path based on adapter kind

**Plans:** TBD

---

### Phase 13: PWA Wrapper

**Goal:** AussieLedger is installable to the OS home screen and works offline; service workers update reliably without ever silently stranding users on a stale version of the app.

**Depends on:** Phase 10 (production build pipeline must exist; service workers require HTTPS which the Cloudflare Pages deploy provides)

**Note:** Independently executable in parallel with Phase 12 after Phase 10 completes.

**Requirements:** PWA-01

**Success Criteria** (what must be TRUE):
1. `npm run build && npm run preview` produces an installable PWA: Chrome's Lighthouse "installable" audit passes; `manifest.json` is present with `name`, `short_name`, `start_url: '/'`, `display: 'standalone'`, and 192px + 512px PNG icons
2. `vite-plugin-pwa` is configured with `skipWaiting: true`, `clientsClaim: true`, and `cleanupOutdatedCaches: true`; after deploying a new build over an installed PWA, the app presents a non-intrusive update banner ("A new version is available — reload to update?") and does NOT force-reload mid-form
3. `npm run dev` behaviour is unchanged — no service worker is registered in development mode; HMR continues to work normally
4. An iOS Safari user on the deployed URL sees an in-app contextual prompt explaining "Add to Home Screen" (Share menu path) when `navigator.standalone` is false; installing to the home screen launches the app in standalone mode

**Plans:** TBD

---

### Phase 14: Release Polish + Custom Domain

**Goal:** The deployed URL is an inviting onboarding surface for first-time visitors, the custom domain is live (so the README can link to a stable URL), and the open-source release surface is polished for the "go to the URL, start using it" audience.

**Depends on:** Phases 10, 11, 12, 13 (all must be complete — README needs the live custom domain; `/demo` route needs hosting verified; `/privacy` page belongs with a complete feature set; first-visit UX benefits from IDB hardening and PWA being in place)

**Requirements:** HOST-04, POL-01, POL-02, POL-03, POL-04

**Success Criteria** (what must be TRUE):
1. The custom domain (e.g. `aussieledger.app` or `aussieledger.com.au`) resolves to the Cloudflare Pages deployment over HTTPS with auto-renewing cert; the README top-of-fold "Try the live demo at {URL}" link points to this custom domain, not the `.pages.dev` default
2. A first-time visitor with no entities sees an inline trust banner ("Your data stays in your browser — no servers, no accounts") and two CTAs — "Create your first entity" (primary) and "Try the demo" (secondary, navigates to `/demo`); the banner disappears after the first entity is created and does not reappear
3. Navigating to `/demo` loads a pre-seeded anonymised sole-trader entity in a separate `'aussieledger-demo'` IndexedDB database; navigating back to `/` returns real user data completely intact; a "Demo Mode" banner is visible throughout the `/demo` experience
4. The `/privacy` page is accessible from every page footer and lists the trust signals: no third-party scripts, no cookies, no analytics, no server-side storage, AI calls go direct from user's browser to Google with the user's own key, Apache 2.0 license with repo link
5. The README is rewritten with top-of-fold "Try the live demo at {URL}" + 1-line elevator pitch + screenshot; quick-start covers both (1) try the demo and (2) clone + self-host; `npm run dev:full` for the Express+SQLite shape is documented; `server/` continuity is preserved and documented as the small-firm VPS path

**Plans:** TBD

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Safety Net | v1.0 | 3/3 | Complete | 2026-05-10 |
| 2. Decompose and Tax Engine | v1.0 | 4/4 | Complete | 2026-05-10 |
| 3. Durable Persistence | v1.0 | 4/4 | Complete | 2026-05-12 |
| 4. Bookkeeping Core | v1.0 | 4/4 | Complete | 2026-05-13 |
| 5. Tax Outputs | v1.0 | 4/4 | Complete | 2026-05-28 |
| 6. Personas, Wizard, and Deployment | v1.0 | 4/4 | Complete | 2026-05-29 |
| 7. ImportTB UX Rework | v1.1 | 4/4 | Complete | 2026-05-30 |
| 8. Family Medicare Levy Engine | v1.1 | 3/3 | Complete | 2026-05-30 |
| 9. Exports + Polish + Cleanup | v1.1 | 1/1 | Complete | 2026-05-30 |
| 10. Public Build + CI/CD (Cloudflare→Vercel pivot) | v1.2 | 2/2 | Complete | 2026-06-01 |
| 11. IndexedDB Hardening | v1.2 | 1/2 | In Progress (Plan 11-1 complete) | - |
| 12. User-Supplied AI Key + Direct-Browser Gemini | v1.2 | 0/TBD | Not started | - |
| 13. PWA Wrapper | v1.2 | 0/TBD | Not started | - |
| 14. Release Polish | v1.2 | 0/TBD | Not started (HOST-04 already done in Phase 10) | - |

## Research Flags

**Before Phase 10 begins:**
- Confirm `cloudflare/wrangler-action@v3` `pages deploy` syntax against current Cloudflare Pages documentation — `cloudflare/pages-action` is deprecated
- Verify `_redirects` file syntax for Cloudflare Pages SPA fallback (`/* /index.html 200`) against current CF Pages docs
- Confirm `VITE_HOSTED_MODE` define block syntax in `vite.config.ts` (`import.meta.env.VITE_HOSTED_MODE` vs `process.env.VITE_HOSTED_MODE`)

**Before Phase 12 begins:**
- Verify `@google/genai` v1.29.x `GoogleGenAI` named export and `models.generateContent` method signature — confirm against installed package, not research memory (MEDIUM confidence flag from PITFALLS.md)
- Confirm Gemini REST API supports browser CORS for API-key-authenticated calls to `generativelanguage.googleapis.com`

**Before Phase 13 begins:**
- Confirm `vite-plugin-pwa@^1.3.0` peer dep range includes Vite 6 (confirmed in STACK.md: `^3.1.0 || ... || ^8.0.0`)
- Decide icon asset generation approach: hand-made PNGs (v1.2 default) vs `@vite-pwa/assets-generator` from source SVG
