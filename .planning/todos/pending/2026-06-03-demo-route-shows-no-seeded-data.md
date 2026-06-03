---
title: /demo route shows no seeded data — investigate seedDemoData regression
created: 2026-06-03
area: storage
status: pending
related_files:
  - src/storage/demo-seed.ts
  - src/storage/index.ts
  - src/storage/local.ts
  - src/components/MasterDashboard.tsx
discovered_during: Phase 16 POL-DOCS-01 screenshot capture
---

# /demo route shows no seeded data — investigate seedDemoData regression

User observed at https://aussieledger.techtaitan.com/demo on 2026-06-03: **MasterDashboard appears empty** — no seeded sole-trader entity, no journals, no widgets populated. Reported during Phase 16 POL-DOCS-01 screenshot-capture checkpoint as the reason for `skip-screenshot` decision.

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

**HIGH** — `/demo` is a core POL-02 surface; if it shows nothing, first-visit users hit a wall and either leave or become confused. Same severity as a broken landing-page experience.

## Suggested v1.4 fix scope

Reproduce → identify failure mode → patch → add a "demo seed populated" assertion to `initAdapter-demo-routing.test.ts` that runs against the real browser IDB (Playwright or Cypress) since fake-indexeddb may not catch it.

## Out of scope for this todo

- Replacing the demo seed with different data shape (15 journals is fine if it actually renders)
- Adding a "reset demo" button (separate UX consideration)
- Multi-entity demo (single sole-trader is locked per Phase 14 CONTEXT)
