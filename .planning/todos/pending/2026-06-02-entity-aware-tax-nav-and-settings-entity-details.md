---
title: Entity-aware tax nav + Edit Entity Details in Settings
created: 2026-06-02
area: ui
status: pending
related_files:
  - src/components/shell/Sidebar.tsx
  - src/components/ViewRouter.tsx
  - src/components/Settings.tsx
---

# Entity-aware tax nav + Edit Entity Details in Settings

Two related Sidebar/Settings UX polish items captured during v1.2 close.

## Part 1 — Filter tax-section nav by active entity type

The Sidebar nav currently shows ALL four tax-section entries regardless of the active entity:

- `setView('tax-return')` → `TaxReturnAssistant` — Form I (Individual)
- `setView('company-tax')` → `CompanyTaxReturn` — Form C (Company)
- `setView('trust-tax')` → `TrustTaxReturn` — Form T (Trust)
- `setView('bas-ias')` → Partnership / BAS+IAS

(See `src/components/shell/Sidebar.tsx:271-289`.)

Users with an Individual entity see three irrelevant Company/Trust/Partnership tax-section links. Same for the other types.

**Desired behaviour:** Sidebar shows ONLY the tax section relevant to `activeEntity.type`:

| Entity type | Shown tax sections |
|---|---|
| Individual / Sole Trader | Tax Assist (Form I) |
| Company | Company Tax (Form C) |
| Trust | Trust Tax (Form T) |
| Partnership | Partnership Tax (Form P) |

Open questions for implementation:
- BAS/IAS — is this universal across all entity types? (Likely yes — keep visible regardless.)
- What about Master Dashboard / no active entity selected — show all 4 or none? (Probably none; the entity-aware filtering only kicks in when an entity IS active.)
- Year-End wizard, Audit Trail, Data, Settings, Journals, Trial Balance, COA, Import — all stay visible regardless (not entity-type-specific).
- Implementation: switch on `activeEntity?.type` in Sidebar; default-all when no entity selected.

## Part 2 — Move/duplicate "Edit Entity Details" into Settings

Currently the **"Edit Entity Details"** button lives in `ViewRouter.tsx:179` as part of the entity header banner (visible from any entity-scoped view). User wants this also reachable from the **Settings** page (`src/components/Settings.tsx`).

Open questions for implementation:
- Move OR duplicate? "Also be in the settings" wording suggests duplicate; the existing entity-header button stays AND Settings gets a new section. Confirm before implementing.
- Where in Settings? Probably a new section after "Mode" / "Primary Entity" — e.g. "Active Entity" section with the entity name + an "Edit Entity Details" button that opens `EntityForm` for the active entity.
- What if no active entity is selected? Either hide the section OR show a "select an entity first" prompt.

## Suggested phase placement

Both items are UX polish, post-v1.2. Could be:
- A small v1.3 polish phase
- Folded into a broader v1.3 "Sidebar + Settings refinement" phase
- Or quick atomic commits between milestones

Cosmetic priority — does NOT block any user task today (the irrelevant nav items just send the user to an empty/wrong-shape tax return page).

## Test count impact (rough)

- Sidebar: ~6-8 tests (each entity type renders the correct subset; no entity falls back)
- Settings: ~4 tests (Edit Entity Details button present, opens EntityForm, no-active-entity state)
- ~10-12 new tests total

## Out of scope for this todo
- Tax engine logic changes
- Entity type / form mapping changes
- Sidebar redesign beyond the conditional nav filtering
- Settings page redesign beyond adding the entity-details section
