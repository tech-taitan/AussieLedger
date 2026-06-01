---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: public-hosting-and-indexeddb-hardening
current_phase: 13
current_plan: 13-2
status: in-progress
stopped_at: "Plan 13-1 COMPLETE 2026-06-01T12:38Z — icons + VitePWA config + manifest + 3 contract tests; 30 new GREEN tests; commits e5e60bd/c8abf69/2a59385 all CI GREEN. Ready for Plan 13-2 (UpdateBanner + useUpdateBanner hook + Lighthouse smoke — Wave 2)."
last_updated: "2026-06-01T12:38:00Z"
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-06-01T12:38Z (Plan 13-1 COMPLETE — PWA icons + vite-plugin-pwa config + manifest + 3 contract tests landed; 1114 SPA GREEN + 11 todo + 0 RED; commits e5e60bd/c8abf69/2a59385 all CI GREEN on origin/main; Plan 13-2 next)

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-30 with v1.2 milestone goal).

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**Current focus:** v1.2 — Public Hosting + IndexedDB Hardening. Ship the SPA on a public URL backed by the existing v1.0 IndexedDB persistence; harden the IDB-only path (persistent-storage permission, backup-nag UX, quota disclosure, pre-unload guard); add user-supplied Gemini key path for hosted mode; PWA wrapper; polish open-source release for the "go to URL, start using" audience. v2.0 (sqlite-wasm + File System Access API + optional Tauri wrapper) pre-locked as the follow-on once v1.2 reaches real users.

---

## Current Position

**Current phase:** Phase 13 — PWA Wrapper (Plan 13-1 COMPLETE; Plan 13-2 next)
**Current plan:** 13-2 (UpdateBanner + useUpdateBanner hook + App.tsx wiring + Lighthouse smoke)
**Phase 10 status:** COMPLETE 2026-06-01 — Cloudflare→Vercel pivot shipped + live-verified at `https://aussieledger.techtaitan.com`; HOST-01/02/03/04 closed; 10 commits total
**Phase 11 status:** COMPLETE 2026-06-01 — IDB hardening shipped + user smoke-verified; IDB-01..05 all closed; 10 commits total (4 from Plan 11-1 + 6 from Plan 11-2)
**Phase 12 status:** DEFERRED to v5 (2026-06-01) — AI-01/02 moved to Future Requirements; phase numbering preserved (no renumber) for commit-history stability; AiGateNote copy updated for honest hosted-mode messaging
**Phase 13 status:** IN PROGRESS — Plan 13-1 COMPLETE 2026-06-01T12:38Z (icons + VitePWA config + manifest + 3 contract tests; 30 new GREEN); Plan 13-2 NEXT (Wave 2 — UpdateBanner + useUpdateBanner + Lighthouse smoke)
**Phase 14 status:** Not started (HOST-04 closed early in Phase 10; remaining requirements: POL-01..04)
**Last session:** 2026-06-01T12:38:00Z
**Stopped at:** Plan 13-1 closed (3 tasks; commits e5e60bd/c8abf69/2a59385 — all CI GREEN). Ready for Plan 13-2 (Wave 2). PWA install path is unlocked: dist/sw.js + dist/workbox-*.js emitted, dist/manifest.webmanifest contains locked CONTEXT values, 5 icons committed in public/.
**Overall progress:** v1.2: 2/4 phases complete (Phase 10 + Phase 11 done; Phase 12 deferred); Phase 13 1/2 plans done. 9/15 active v1.2 requirements complete (HOST-01..04 + IDB-01..05); PWA-01 half-shipped (install path GREEN; UpdateBanner pending Plan 13-2). 5 remaining v1.2 requirements (PWA-01 full close, POL-01..04). Run `/gsd:execute-phase 13` to continue with Plan 13-2.

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v1.1:  [Phase 7] [Phase 8] [Phase 9]
       [ DONE  ] [ DONE  ] [ DONE  ]

v1.2:  [Phase 10] [Phase 11] [Phase 12]   [Phase 13   ] [Phase 14]
       [ DONE  ] [ DONE  ] [DEFERRED→v5] [13-1 DONE  ] [PENDING ]

v2.0:  preserved at .planning/future-milestones/v2.0-standalone-app/
```

---

## Phase Summary (v1.2)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 10 | Public Build + CI/CD (Cloudflare→Vercel pivot) | SPA LIVE at `https://aussieledger.techtaitan.com`; vercel.json CSP+headers+rewrites; AIza scan in npm build; `VITE_HOSTED_MODE` flag; custom domain configured (HOST-04 early) | DONE 2026-06-01 |
| 11 | IndexedDB Hardening | `persist()` grant; quota disclosure; backup-nag hook; iOS ITP banner; `beforeunload`+visibilitychange guard with settle-point flush | DONE 2026-06-01 |
| ~~12~~ | ~~User-Supplied AI Key + Direct-Browser Gemini~~ | Deferred — AI not available on hosted version until v5; self-host AI unchanged | DEFERRED → v5 (2026-06-01) |
| 13 | PWA Wrapper | `vite-plugin-pwa` + manifest + SW stale-cache prevention + update banner | IN PROGRESS — 13-1 DONE 2026-06-01 (install path); 13-2 next (UpdateBanner) |
| 14 | Release Polish + Custom Domain | First-visit trust banner; `/demo` isolated IDB; `/privacy` page; README rewrite; custom domain | Not started |

---

## Performance Metrics

- Plans completed: 5 / Plans total in v1.2: 2 (Phase 10) + 2 (Phase 11) + 2 (Phase 13) + TBD (Phase 14); Phase 12 deferred
- Phases complete: 2/5 (Phase 10 + Phase 11); Phase 13 in progress (1/2 plans done)
- Requirements mapped: 16/16 v1.2 requirements — all phases 10–14 covered
- Requirements complete: 9/14 active (HOST-01..04 — Phase 10; IDB-01..05 — Phase 11). PWA-01 install path landed in 13-1; full PWA-01 closure pending 13-2.
- All IDB-01..05 closed end-to-end via Plan 11-1 (helpers) + Plan 11-2 (UI/event wiring + REQUIREMENTS IDB-05 italic disclosure)

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| 10 | 10-1 | ~30min | 4 (3 auto + 1 checkpoint) | 8 (6 created, 2 modified) | 999 SPA (+16 from baseline) |
| 10 | 10-2-pivot | ~90min (incl. blocked time) | 4 effective (2 reverts + 2 creates + 4 modifies + docs) | 8 unique | 999 SPA (unchanged) |
| 11 | 11-1 | ~17min | 4 (4 auto, no checkpoints) | 6 (2 created, 4 modified) | 1027 SPA (+28 from baseline 999) |
| 11 | 11-2 | ~30min | 6 (5 auto + 1 verification) | 13 (5 created, 8 modified) | 1083 SPA (+56 from baseline 1027) |
| 13 | 13-1 | ~21min | 3 (3 auto, no checkpoints) | 14 (10 created, 4 modified) | 1114 SPA (+30 from baseline 1084 — 9 pwa-manifest + 4 pwa-index-html + 17 pwa-config) |

**v1.1 baseline (carried forward):** 983 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.

**Post Phase 10:** 999 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan). Live deploy verified at `https://aussieledger.techtaitan.com/` (9/9 CSP directives + 5/5 other security headers + SPA fallback all OK).

**Post Phase 11 Plan 11-1:** 1027 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan). LocalAdapter exposes 4 new duck-typed accessors (getPersistGranted, getStorageEstimate, getLastWriteAt, setLastWriteAt). period.ts adds nowIso() — single source of ISO timestamps. Legacy-migration now passes { silent: true } to importAll. Structural-lint test at src/lib/__tests__/structural-lint-period.test.ts locks the no-bare-new-Date invariant (additive to the existing src/__tests__/structural.test.ts:67 enforcement). CI runs 26733364938 / 26733475166 / 26733700927 all GREEN on origin/main.

**Post Phase 11 Plan 11-2:** 1083 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan). useBackupNag hook (once per App mount; 7d desktop / 5d iOS Safari; empty-adapter + snooze + threshold suppression) + IosItpBanner (4-gate matrix + verbatim CONTEXT-locked copy + sessionStorage per-session dismiss) wired through DataPage (Storage Budget + Storage Protection rows + IosItpBanner mount + handleImport explicit setLastWriteAt(nowIso()) bump + handleExport snooze-clear). App.tsx mounts useBackupNag + isDirty derivation via [entities, journals, auditLogs, accounts] dep-list re-poll + conditional [isDirty]-dep useEffect that registers beforeunload + visibilitychange listener PAIR only when dirty (Firefox bfcache preserved); beforeunload calls preventDefault+returnValue=''; visibilitychange performs Blocker 2 REAL settle-point fire-and-forget `await adapter.getLastWriteAt()` flush wrapped in try/catch. Toast widened with optional `actions?: ReactNode` slot (existing tone='info'|'warn' callers unchanged). period.ts adds addDaysIso(days) helper so snooze arithmetic stays inside the structural-lint invariant. REQUIREMENTS.md IDB-05 gains trailing italic note disclosing visibilitychange-vs-beforeunload capability division (settle-point IDB read vs are-you-sure dialog). CI runs 26734153604 / 26734203565 / 26734254976 / 26734354506 / 26734775190 all GREEN on origin/main. All 5 IDB-01..05 requirements closed end-to-end; all 5 ROADMAP Phase 11 success criteria met; all 13 plan-level verification greps PASS.

**Post Phase 13 Plan 13-1:** 1114 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan against the SW-expanded dist/). vite-plugin-pwa@^1.3.0 + @resvg/resvg-js@^2.6.2 added to devDependencies; scripts/build-pwa-icons.mjs renders 5 deterministic PNGs into public/ via the hardcoded lucide Calculator SVG + resvg WASM (idempotent SHA-256 verified). public/ directory recreated (was deleted in Phase 10 Vercel pivot). vite.config.ts imports pwaOptions from new vite.pwa-options.ts (extracted module — single source of truth; type-only `import type` for VitePWAOptions so the module loads cleanly in jsdom without triggering vite/esbuild's TextEncoder invariant). pwaOptions locks PITFALLS §3 HARDBLOCK (skipWaiting+clientsClaim+cleanupOutdatedCaches ALL true) + Pitfall #12 (registerType:'prompt') + npm run dev SW absence (devOptions.enabled:false) + injectRegister:false (Plan 13-2 useUpdateBanner controls registerSW) + navigateFallbackDenylist [/^\/api\//] + CONTEXT-locked manifest values verbatim (name/short_name=AussieLedger; description; theme_color=#141414; background_color=#E4E3E0; display=standalone; start_url=/; categories=[finance, productivity]; 4 icons 2-standard+2-maskable). index.html gains `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` and `<meta name="theme-color" content="#141414">`; no manual manifest link (vite-plugin-pwa auto-injects in dist/index.html). vite.config.ts define / resolve / server.proxy blocks UNCHANGED (Pitfall #1 HARDBLOCK preserved — `grep -c VITE_GEMINI vite.config.ts` returns 0). vercel.json CSP UNCHANGED. dist/ now contains sw.js + workbox-9c191d2f.js (14 precache entries / 1553 KiB) + manifest.webmanifest (locked values) + 5 icons. AIza scan still OK against expanded dist/. Three new contract tests: pwa-manifest.test.ts (9 GREEN — skipIf-gated on dist/manifest.webmanifest existence), pwa-index-html.test.ts (4 GREEN — source index.html shape lock + manual-manifest-absence proof), pwa-config.test.ts (17 GREEN — R-2 hardening: structural assert over pwaOptions runtime object; replaces three brittle grep guards that missed duplicate/commented-out drift). CI runs 26754601412 (e5e60bd) / 26754773456 (c8abf69) / 26755202643 (2a59385) all GREEN on origin/main. PWA install path (Lighthouse Installable) UNLOCKED; full PWA-01 closure pending Plan 13-2 (UpdateBanner + Lighthouse smoke). Three Rule-3 auto-fixes applied + documented (pwaOptions split into vite.pwa-options.ts for jsdom compatibility; pwa-config.test.ts narrows `manifest` to Partial<ManifestOptions> to satisfy `false | Partial<ManifestOptions>` TS union; npm install ran with --strict-ssl=false to work around local TLS interception).

---

## Accumulated Context

### Architecture Invariants (Locked — Must Not Be Violated)

| Invariant | Source | Carries into v1.2 |
|-----------|--------|-------------------|
| `StorageAdapter` interface FINAL — 12 methods; additive implementations only via duck-typing (`as unknown as { ... }`); never widen the interface itself | Phase 3 FINAL | Phase 11 (IDB hardening additions go INSIDE LocalAdapter only) |
| Settings via `localStorage` under `aussieledger:settings` — not an adapter method | Phase 6 PERS-03 | Phase 12 (AI key: `aussieledger:gemini-api-key`), Phase 11 (snooze: `aussieledger:backup-nag-snoozed-until`) |
| Schema migrations additive + reversible round-trip; migration test required per v{N}→v{N+1} | Phase 3 CONTRIBUTING rule | No schema changes in v1.2 (all v1.2 additions are non-entity config or LocalAdapter internals) |
| Per-FY label module pattern (`src/lib/tax/{returns,rates,labels}/fy{NNNN}/*`) | Phase 5 pattern | No tax-rate changes in v1.2 |
| No `new Date()` outside `src/lib/period.ts` — Phase 2 structural lint | Phase 2 invariant | All v1.2 phases |
| `AnomalyBadge` (severity `'info' \| 'warn'`) is the single visual language for anomaly surfaces | Phase 5 + Phase 6 | Phase 11 (backup-nag uses existing Toast primitive with `tone='warn'`, not a new severity) |
| Help text NEVER states deductibility — content lint enforced | Phase 6 invariant | Phase 14 (privacy page, first-visit UX copy — must not imply deductibility guidance) |
| Decimal arithmetic via decimal.js — money never touches native floats | Phase 1 invariant | No decimal changes in v1.2 |
| `IS_AI_ENABLED` constant deprecated; only `isAiEnabled()` function in new code | Phase 6 invariant | Phase 12 (`isAiEnabled()` extended with user-supplied key path; no new constant) |
| `server/` continuity — v1.2 does NOT deprecate the Express + SQLite shape | v1.2 ARCHITECTURE.md | Phase 10, Phase 12, Phase 14 (README must document both shapes) |
| Demo IDB isolation — `/demo` route MUST use `'aussieledger-demo'` namespace, never `'aussieledger'` | v1.2 PITFALLS.md HARD-BLOCK | Phase 14 (POL-02 demo route) |

### v1.2 Architecture Decisions (Pre-Locked by Research)

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Cloudflare Pages as primary host (not GitHub Pages, not Vercel) | Unlimited bandwidth; no credit card; commercial use OK; no `base:` config change needed; `_headers` file support for CSP; Sydney PoP | Phase 10 |
| `cloudflare/wrangler-action@v3` with `pages deploy` (not `cloudflare/pages-action` — deprecated) | Official current replacement; confirmed in STACK.md | Phase 10 |
| `VITE_HOSTED_MODE` as a build-time signal flag (safe — not a secret) | `VITE_` prefix safe for mode flags; secret keys must NOT use `VITE_` prefix | Phase 10 |
| Post-build CI grep for `AIza` in `dist/assets/` | Defense against VITE_ secret-leak CVE analog; land before any contributor adds a key | Phase 10 |
| `navigator.storage.persist()` called inside `LocalAdapter.init()` — not at page load | By init time, browser engagement score already set for returning users; new users get silent false which is correct | Phase 11 |
| `getPersistGranted()` added to LocalAdapter only, accessed via duck-typing | StorageAdapter FINAL invariant preserved; same pattern as existing `getLastExportAt` in DataPage | Phase 11 |
| `useBackupNag` as a dedicated hook (`src/hooks/useBackupNag.ts`) — not in App.tsx inline | Testable in isolation; reads `lastExportAt` via existing duck-typing pattern | Phase 11 |
| Backup-nag threshold: 7 days desktop / 5 days iOS Safari | iOS ITP fires at 7 days; 5-day threshold gives user time to export before wipe | Phase 11 |
| `beforeunload` guard fires ONLY when `lastWriteAt > lastExportAt`; registered conditionally | Prevents Firefox bfcache exclusion when guard is unnecessary; prevents user fatigue from false-positive dialogs | Phase 11 |
| AI key stored in `localStorage` under `aussieledger:gemini-api-key` — never in React state | `useRef` for in-memory access; never `console.log`'d; prevents React DevTools state inspection leak | Phase 12 |
| `callGeminiMatchAccounts()` in `src/lib/ai.ts` handles server-vs-browser routing | Single routing decision; ImportTB replaces inline `fetch('/api/ai/match-accounts', ...)` with single call | Phase 12 |
| `vite-plugin-pwa@^1.3.0` with `generateSW` strategy (not `injectManifest`) | No custom SW logic needed; Workbox handles cache versioning automatically | Phase 13 |
| `registerType: 'prompt'` (not `'autoUpdate'`) | Prevents force-reload mid-form; user explicitly acknowledges update; `beforeunload` guard can fire on reload | Phase 13 |
| `skipWaiting: true` + `clientsClaim: true` + `cleanupOutdatedCaches: true` ALL required | Three-part stale-cache trap prevention; annual ATO rate updates must reach PWA users | Phase 13 |
| HOST-04 (custom domain) in Phase 14, not Phase 10 | README live-demo link (POL-04) must point at the custom domain; Phase 10 ships the `.pages.dev` default URL | Phase 14 |
| `/demo` route uses separate `'aussieledger-demo'` IDB database name | HARD-BLOCK: writing demo data to `'aussieledger'` would overwrite real user tax data | Phase 14 |

### Research Flags for Downstream Planners

- **Phase 10 (plan-phase 10):** Confirm `wrangler-action@v3` `pages deploy` syntax. Verify `_redirects` `/* /index.html 200` handles nested SPA routes (e.g. `/journals/123`). Confirm `VITE_HOSTED_MODE` define block placement in `vite.config.ts`. Add `prefers-reduced-motion` audit of `motion` usages before first public deploy (PITFALLS.md Known-Risk P17).
- **Phase 11 (plan-phase 11):** iOS Safari ITP behaviour with `persist()` is MEDIUM confidence (Apple docs sparse; community-confirmed). Test on a real iOS device, not simulator. `beforeunload` + Firefox bfcache: register listener conditionally on `hasUnsavedChanges`, not always-registered with early-return.
- **Phase 12 (plan-phase 12):** Verify `@google/genai` v1.29.x `GoogleGenAI` named export and `models.generateContent` method signature before writing `callGeminiMatchAccounts()` (MEDIUM confidence flag). Confirm Gemini REST API supports browser CORS. Run `grep -r "dangerouslySetInnerHTML" src/` — must return zero before key is stored in localStorage.
- **Phase 13 (plan-phase 13):** Test PWA update flow: build v1 → install in browser → build v2 (change a visible string) → verify v2 appears on next load without manual cache clear. Test iOS "Add to Home Screen" flow on a physical iOS device. Confirm `npm run dev` behaviour is unchanged (no SW registered in dev mode).
- **Phase 14 (plan-phase 14):** Custom domain decision (e.g. `aussieledger.app` or `aussieledger.com.au`) — must be resolved at Phase 14 planning. Cloudflare Pages supports multiple custom domains; configure redirect from `.pages.dev` subdomain to custom domain for existing bookmarks. Origin-change IDB loss (PITFALLS.md Known-Risk P9): README must include export/import migration guide for users moving from `localhost:5173` or a previous URL.

---

## Resolved Blockers

**v1.0 + v1.1 (all closed):**
- v1.0 cosmetic `App.tsx:114` dead string → CLOSED Phase 9 CLEAN-01 (already fixed Phase 1, documented as such)
- v1.0 Nyquist `nyquist_compliant: false` on Phases 1/2/6 → CLOSED Phase 9 CLEAN-02
- v1.0 FND-02 CSV per-report export → CLOSED Phase 9 (FND-10/11/12)
- v1.0 family Medicare levy threshold engine → CLOSED Phase 8 (MED-01..04)
- v1.0 ImportTB messy real-world TB friction → CLOSED Phase 7 (IMP-07..11)

---

## Open Blockers

None.

---

## Next Steps

1. v1.2 roadmap is created (5 phases, 16 requirements, all coverage confirmed).
2. Run `/gsd:plan-phase 10` to create the Phase 10 execution plan (Public Build + CI/CD to Cloudflare Pages).
3. Phase 10 must land `HOST-02` (CI `AIza` grep) and `HOST-01` (`_headers` CSP + `_redirects` SPA fallback) as Wave-0 hard-block preventions before any key or hosted configuration is added.
4. After Phase 10: Phase 11 (IDB Hardening) and Phase 12+13 (AI Key + PWA, independently parallel) can begin.
5. Phase 14 (Release Polish + Custom Domain) is forced-last — requires the live URL and full feature set.
