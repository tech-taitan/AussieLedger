---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: public-hosting-and-indexeddb-hardening
current_phase: 10
current_plan: null
status: ready-to-plan
stopped_at: v1.2 roadmap created (5 phases, 16 requirements) — next action /gsd:plan-phase 10
last_updated: "2026-05-31T00:00:00.000Z"
progress:
  total_phases: 5
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
---

# Project State: AussieLedger

**Initialized:** 2026-05-10
**Last updated:** 2026-05-31 (v1.2 roadmap created — 5 phases 10–14, ready for planning)

---

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-05-30 with v1.2 milestone goal).

**Core value:** A non-accountant business owner can take their trial balance, record their year's adjustments and journals in plain English, and walk away with a print-ready tax return — without paying for software.

**Current focus:** v1.2 — Public Hosting + IndexedDB Hardening. Ship the SPA on a public URL backed by the existing v1.0 IndexedDB persistence; harden the IDB-only path (persistent-storage permission, backup-nag UX, quota disclosure, pre-unload guard); add user-supplied Gemini key path for hosted mode; PWA wrapper; polish open-source release for the "go to URL, start using" audience. v2.0 (sqlite-wasm + File System Access API + optional Tauri wrapper) pre-locked as the follow-on once v1.2 reaches real users.

---

## Current Position

**Current phase:** Phase 10 — Public Build + CI/CD to Cloudflare Pages (not yet started)
**Current plan:** None (roadmap just created; planning Phase 10 next)
**Phase 10 status:** Not started
**Phase 11 status:** Not started
**Phase 12 status:** Not started
**Phase 13 status:** Not started
**Phase 14 status:** Not started
**Last session:** 2026-05-31T00:00:00.000Z
**Stopped at:** v1.2 roadmap created — 5 phases (10–14), 16 requirements mapped, all phases pending planning
**Overall progress:** v1.2: 0/5 phases complete. Run `/gsd:plan-phase 10` to begin.

```
v1.0:  [Phase 1] [Phase 2] [Phase 3] [Phase 4] [Phase 5] [Phase 6]
       [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ] [ DONE  ]

v1.1:  [Phase 7] [Phase 8] [Phase 9]
       [ DONE  ] [ DONE  ] [ DONE  ]

v1.2:  [Phase 10] [Phase 11] [Phase 12] [Phase 13] [Phase 14]
       [PENDING ] [PENDING ] [PENDING ] [PENDING ] [PENDING ]

v2.0:  preserved at .planning/future-milestones/v2.0-standalone-app/
```

---

## Phase Summary (v1.2)

| Phase | Name | Key Outcome | Status |
|-------|------|-------------|--------|
| 10 | Public Build + CI/CD to Cloudflare Pages | SPA live on public URL; `VITE_HOSTED_MODE` flag; `AIza` CI scan; `_redirects` SPA fallback | Not started |
| 11 | IndexedDB Hardening | `persist()` grant; quota disclosure; backup-nag hook; iOS ITP banner; `beforeunload` guard | Not started |
| 12 | User-Supplied AI Key + Direct-Browser Gemini | Settings AI key UI; `callGeminiMatchAccounts` routing helper; `AiGateNote` hosted-mode link | Not started |
| 13 | PWA Wrapper | `vite-plugin-pwa` + manifest + SW stale-cache prevention + update banner | Not started |
| 14 | Release Polish + Custom Domain | First-visit trust banner; `/demo` isolated IDB; `/privacy` page; README rewrite; custom domain | Not started |

---

## Performance Metrics

- Plans completed: 0 / Plans total: TBD (v1.2 — not yet planned)
- Phases complete: 0/5 (v1.2 phases)
- Requirements mapped: 16/16 v1.2 requirements — all phases 10–14 covered

| Phase | Plan | Duration | Tasks | Files | Tests Green |
|-------|------|----------|-------|-------|-------------|
| (v1.2 plans not yet created) | — | — | — | — | — |

**v1.1 baseline (carried forward):** 983 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0.

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
