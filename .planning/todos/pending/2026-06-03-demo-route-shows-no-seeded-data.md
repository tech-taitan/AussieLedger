---
title: /demo PWA stale-cache symptom — UX hardening to prevent stale-bundle confusion
created: 2026-06-03
diagnosed: 2026-06-03
area: pwa
status: pending
severity: medium (was: HIGH on initial report)
root_cause: PWA service worker serving pre-Phase-14 cached bundle
not_a_regression: seedDemoData wiring is correct + shipped + verified in CBEsXSYP bundle
related_files:
  - src/components/UpdateBanner.tsx
  - src/hooks/useUpdateBanner.ts
  - vite.pwa-options.ts
  - src/storage/demo-seed.ts
discovered_during: Phase 16 POL-DOCS-01 screenshot capture
resolved_immediately_by: hard reload (Ctrl+Shift+R) bypassing PWA cache
---

# /demo PWA stale-cache symptom — UX hardening to prevent stale-bundle confusion

**Initial report (2026-06-03):** User observed at https://aussieledger.techtaitan.com/demo: MasterDashboard appears empty — no seeded sole-trader entity, no journals, no widgets populated. Reported during Phase 16 POL-DOCS-01 screenshot-capture checkpoint as the reason for `skip-screenshot` decision.

**Diagnosis (2026-06-03):** NOT a `seedDemoData` regression. Bundle inspection (CBEsXSYP) confirms `aussieledger-demo`, `seedDemoData`, `Demo Sole Trader`, `getRouteKind` all present in shipped JS. The user's browser was serving a pre-Phase-14 cached bundle via the Phase 13 PWA service worker. **Hard reload (Ctrl+Shift+R) bypassed the cache → demo seed fired → seeded entity + journals + dashboard widgets appeared as expected.**

The root cause is the well-known PWA stale-cache UX risk: Phase 13's `registerType: 'prompt'` + UpdateBanner pattern is supposed to surface new versions to users, but if a user dismisses/snoozes the banner OR closes the tab before the SW detects the new version, they keep seeing the cached old bundle indefinitely.

## Expected behaviour (per Phase 14-1)

`src/storage/index.ts` `initAdapter()` reads `getRouteKind()`:
- `/demo` → constructs `new LocalAdapter(DB_NAME_DEMO)` (i.e. `'aussieledger-demo'`)
- Calls `seedDemoData(adapter)` if demo DB has zero entities (idempotent guard)
- `seedDemoData()` populates: 1 sole-trader entity ("Demo Sole Trader (Sample Data)") + 10-account small-biz Chart of Accounts + 15 balanced FY2025-26 journal entries (capital, equipment, sales+GST, rent, utilities, supplies, BAS, drawings)
- MasterDashboard for that entity should render: dashboard widgets populated; sidebar showing the demo entity; tax-section nav showing Tax Assistant (sole trader → Individual mapping per Phase 15 POL-CODE-04)

## Possible failure modes to investigate

1. **`getRouteKind()` not returning 'demo'** on the hosted Vercel deploy — pathname dispatch broken? Check `window.location.pathname` value at /demo
2. **`seedDemoData()` not firing** — early-return guard tripping incorrectly? Check `adapter.getEntities().length === 0` evaluation
3. **`seedDemoData()` firing but silently throwing** — IDB write failure swallowed? Check browser DevTools → Application → IndexedDB → `aussieledger-demo` database; should contain 1 entity + 10 accounts + 15 entries
4. **Seed succeeded but MasterDashboard isn't rendering** — entity exists but component doesn't pick it up? Check whether `activeEntity` is being set on demo load
5. **Cached SW serving an old build** — Phase 13 PWA precaches; if the cached build pre-dates Phase 14-1 demo seed, user gets stale code. Cache-bust by hard reload (Ctrl+Shift+R) or clear site data
6. **`'aussieledger-demo'` DB already exists with prior state** — user previously visited /demo and accumulated content + deleted entities, leaving empty DB; seed sees 0 entities BUT idempotent-skip-already-seeded check might be wrong direction. Check if seedDemoData has a "has seeded once" flag or just checks entity count
7. **Phase 14-1 `demo-isolation.test.ts` HARD-BLOCK guard passes in test but real-browser IDB differs** — fake-indexeddb behaviour differs from real Chrome IDB on origin+dbname tuple isolation
8. **Vercel build excluded `demo-seed.ts` from the bundle** — tree-shaking issue?

## How to investigate

1. Open https://aussieledger.techtaitan.com/demo in fresh Chrome (incognito to avoid cached state)
2. DevTools → Application → IndexedDB → expand `aussieledger-demo` database
3. Inspect `entities` + `accounts` + `entries` object stores — populated or empty?
4. DevTools → Console → log `window.location.pathname` and check it's `/demo`
5. Network tab → reload → confirm the JS bundle is current (hash matches latest CI build `B1VBpqhR` or later from Phase 15)
6. Clear all site data + reload → see if seed fires on first-ever load
7. Run `npx vitest run src/storage/__tests__/initAdapter-demo-routing.test.ts src/storage/__tests__/demo-seed.test.ts src/storage/__tests__/demo-isolation.test.ts` locally — confirm Phase 14 tests still GREEN against shipped source

## Severity

**MEDIUM** (downgraded from HIGH after diagnosis). The seed code works; the issue is PWA stale-cache. Users who never had cached state see correct behaviour. Users with cached pre-Phase-14 bundles see the empty state until they hard-reload OR clear site data OR let the UpdateBanner surface + click Update.

## Suggested v1.4 fix scope (PWA stale-cache UX hardening)

Pick one (or layer):

1. **Force update-check on `/demo` visit** — when `getRouteKind() === 'demo'`, call `registration.update()` to nudge SW to check for new version. Faster than waiting for the periodic check.
2. **More aggressive UpdateBanner** — surface as a modal on the first /demo visit if a new SW is detected (instead of the current low-key banner).
3. **Periodic auto-check** — schedule `registration.update()` every N minutes in active tabs. Workbox supports this.
4. **Cache-bust on bundle hash mismatch** — embed bundle hash in HTML `<meta>`; on JS load, compare embedded hash to the running bundle's hash; force reload on mismatch. Heavy-handed but reliable.
5. **Re-seed guard widening** — in addition to "0 entities" check, also check a `demoSeededAt` meta key in IDB. If absent OR > 90 days old, re-seed. Mitigates the "user wiped demo data manually then re-visited" scenario (orthogonal but useful).

Recommended starting point: option 1 (force update-check on /demo navigation) is the smallest patch with the highest leverage. Add a Playwright/Cypress E2E test in v1.4 to assert that a stale bundle gets the seed once the new bundle loads.

## Out of scope for this todo

- Replacing the demo seed with different data shape
- Adding a "reset demo" button (separate UX consideration)
- Multi-entity demo (single sole-trader is locked per Phase 14 CONTEXT)

## Out of scope for this todo

- Replacing the demo seed with different data shape (15 journals is fine if it actually renders)
- Adding a "reset demo" button (separate UX consideration)
- Multi-entity demo (single sole-trader is locked per Phase 14 CONTEXT)
