# Phase 2: Decompose and Tax Engine — Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 is an **architectural refactor** of the existing app. No new product features are added. After Phase 2, `App.tsx` is a thin orchestrator (≤ 250 lines), all tax math lives in pure testable functions in `src/lib/tax/`, the Gemini API key is no longer load-bearing on the client, and a single canonical AU period module replaces ad-hoc date defaults across the app.

**In scope:**
- Extract custom hooks from `App.tsx`: `useEntities`, `useJournals`, `useAccounts` — each owns its slice of state, persistence, and audit-log dispatch
- Extract shell components into `src/components/shell/`: `Sidebar`, `Header`, `BottomNav`, `MainLayout`. Visual output unchanged.
- Reduce `src/App.tsx` to ≤ 250 lines; the residue is high-level routing/state composition
- Create pure-function tax engine modules: `src/lib/tax/individual.ts`, `src/lib/tax/company.ts`, `src/lib/tax/trust.ts`, `src/lib/tax/partnership.ts`, `src/lib/tax/bas.ts`. None imports React.
- Centralise FY-versioned constants in `src/lib/tax/labels/fy2026.ts` — tax rates, thresholds, label sets per entity type. Components and tax-engine functions read from this module only.
- Migrate the 4 existing tax components (`TaxReturnAssistant`, `CompanyTaxReturn`, `TrustTaxReturn`, `BasIasAssistant`) to consume the new engine instead of inline rollup logic. Visual output unchanged.
- Build `src/lib/period.ts` with the minimum AU period surface; replace all `new Date(year, 0, 1)` and equivalent magic across the app
- Make AI features in `ImportTB` optional: hide the AI flow entirely when no `GEMINI_API_KEY` is configured; deterministic fuzzy match (Levenshtein on name + exact match on code) becomes the primary path
- Schema migration v1→v2: re-derive missing `partnershipTaxLabel` (and any missing per-entity-type labels) on existing Account records by name inference; pre-map all 16 default CoA accounts for all 4 entity types
- GST codes type union expanded to include `'INP'` and `'CAP'` alongside existing `'GST' | 'FRE' | 'N-T'`. Existing data is NOT auto-upgraded.

**Out of scope (later phases):**
- Replacing localStorage with durable storage → Phase 3
- Expanding the chart of accounts to 80–150 entries with full tax-label seeding → Phase 4
- Building the actual tax-return label numbers / BRE test / individual marginal-rate calc → Phase 5
- The year-end wizard, anomaly flags, persona modes → Phase 6
- A server-side proxy for Gemini calls → Phase 3 (when the server tier arrives)

</domain>

<decisions>
## Implementation Decisions

### AI-optional UX (FND-04)

- **Behaviour with no key:** When `GEMINI_API_KEY` is not configured at build time, the ImportTB AI flow is **hidden entirely**. The user sees a single deterministic flow: upload → column-map → fuzzy-match → manual review/override.
- **Key configuration mechanism:** `.env.local` (Vite reads at build via the existing `define` block in `vite.config.ts`). Documented in README. The key is bundled into the build artefact — acceptable for a fully-private self-hosted instance; unsafe for any shared/public deployment. The `.env.example` file should already document this; verify and tighten the warning.
- **Fuzzy match algorithm:** Levenshtein distance on lowercased+punctuation-stripped account names, with exact match on account code as a hard tie-break. Specifically:
  1. Normalise both sides: `name.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()`
  2. If imported `code` exact-matches any internal account `code`, that's the match (confidence 1.0).
  3. Otherwise, rank internal accounts by Levenshtein distance on normalised name; confidence = `1 - distance / maxLen`.
- **Confidence presentation:** When the best confidence is < 0.85, show top 3 candidates with their confidence percentages and a "Create new account from this row" option. ≥ 0.85 single best match auto-selected (with a "Change" affordance).
- **Detection at runtime:** A constant `IS_AI_ENABLED = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')` (the `.env.example` placeholder string is treated as "not configured"). Components that use AI gate behind this constant.
- **`SlideGenerator` is already deleted in Phase 1.** The remaining call site is `src/components/ImportTB.tsx:79`. After Phase 2, that call site is gated by `IS_AI_ENABLED`; the no-key code path is the entire user flow when AI is off.

### Tax engine API shape (TAX-05)

- **One `compute()` per entity type.** Modules export a single top-level `compute*` function:
  - `src/lib/tax/individual.ts` → `computeIndividual(input: TaxInput): IndividualReturn`
  - `src/lib/tax/company.ts` → `computeCompany(input: TaxInput): CompanyReturn`
  - `src/lib/tax/trust.ts` → `computeTrust(input: TrustInput): TrustReturn` (extends `TaxInput` with beneficiary register — Phase 4 adds the register; Phase 2 stubs it)
  - `src/lib/tax/partnership.ts` → `computePartnership(input: PartnershipInput): PartnershipReturn` (extends `TaxInput` with partner register)
  - `src/lib/tax/bas.ts` → `computeBas(input: BasInput): BasReturn`
- **Input type:**
  ```ts
  interface TaxInput {
    fy: FyLabel;             // e.g. 'FY2026' — explicit, no defaulting
    entries: JournalEntry[];
    accounts: Account[];
    period: Period;          // from src/lib/period.ts
  }
  ```
- **Return type per label:** Each label is a `{ value: Decimal; source: JournalLine[]; basis?: string }` triple. `value` is a `decimal.js` instance (NOT a `number`). `source` is the array of journal lines that contributed. `basis` is an optional human-readable string explaining the calculation (used by Phase 6's "click label → see why" drill-down).
- **Decimal in / serialised at the boundary:** Components call `.toFixed(2)` (or pass `value` to a render helper) at the JSX boundary. The engine never returns `number`. Tests assert `.eq()` not numeric equality.
- **FY parameter is explicit:** `compute*` functions take `fy` as a named field on the input object. Engine resolves constants by `fy`. No "current FY by default" magic — the caller is always explicit.
- **No React in tax engine modules.** A structural lint test (already in place from Phase 1 at `src/lib/tax/__tests__/structural-lint.test.ts`) extends to forbid any `import.*react` in `src/lib/tax/**`.
- **Phase 2 ships skeletons.** `compute*` functions return shaped-but-empty results in Phase 2 — enough to type-check and to migrate the 4 existing tax components onto. Phase 5 fills in the actual rollup logic. The `golden.test.ts` and `bas.test.ts` placeholder tests from Phase 1 stay as `.todo` until Phase 5.

### Schema migration v1→v2 (TAX-03, TAX-04)

- **New schema version:** `_v: 2` after Phase 2's migration runs. Migration `1 → 2` registered in `src/lib/migrations/index.ts`.
- **Migration behaviour: actively re-derive missing fields.** For each existing `Account` in the persisted state:
  1. Inspect existing `taxLabel`, `companyTaxLabel`, `trustTaxLabel`. Add `partnershipTaxLabel` (new field).
  2. Use a **name → label inference table** (a static mapping of normalised account names to per-entity-type labels) to populate any missing fields.
  3. If an account name doesn't match the inference table, leave that entity-type's label `undefined` and mark the account as `_needsReview: true` (transient flag; cleared once the user confirms in CoA editor).
- **Always succeeds:** Migration never throws on a regular Account. Unmapped accounts surface in a **"Review needed"** banner in the CoA editor (and on the master dashboard) listing the accounts that need attention. The banner persists until all accounts are reviewed or explicitly dismissed.
- **GST code expansion (BOOK-08):** The TypeScript union `Account['gstCode']` is widened from `'GST' | 'FRE' | 'N-T'` to `'GST' | 'FRE' | 'INP' | 'N-T' | 'CAP'`. Existing accounts retain whatever code they had. The CoA editor offers the new options. **No automatic re-categorisation** of existing accounts — user opts in per account.
- **Seed CoA mapping (TAX-03):** All 16 default accounts in `src/constants.ts` get full per-entity-type tax labels (Individual via `taxLabel`, Company via `companyTaxLabel`, Trust via `trustTaxLabel`, Partnership via the new `partnershipTaxLabel`). Phase 4 expands the seed to 80–150 accounts; Phase 2's job is to populate the existing 16 completely.
- **Override mechanism (TAX-04):** The existing `AccountManager.tsx` editor already exposes `taxLabel`, `companyTaxLabel`, `trustTaxLabel`. Phase 2 adds the `partnershipTaxLabel` field (4th column). Editing any of these is the override mechanism.

### Period model surface (BOOK-10)

- **File:** `src/lib/period.ts` — pure functions, no React, no external date library (use native `Date`).
- **Exports:**
  ```ts
  export type FyLabel = `FY${number}`;     // e.g. 'FY2026'

  export type Period =
    | { type: 'fy'; fy: FyLabel }
    | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
    | { type: 'custom'; from: Date; to: Date };

  export const today: () => Date;          // injectable for tests
  export const currentFy: (now?: Date) => FyLabel;
  export const fyBoundaries: (fy: FyLabel) => { from: Date; to: Date };
  export const quarterOf: (date: Date) => { fy: FyLabel; q: 1 | 2 | 3 | 4 };
  export const quarterBoundaries: (fy: FyLabel, q: 1 | 2 | 3 | 4) => { from: Date; to: Date };
  export const isInPeriod: (date: Date, period: Period) => boolean;
  ```
- **`today()` is the test seam.** All app code calls `today()` instead of `new Date()`. Tests do `vi.spyOn(periodModule, 'today').mockReturnValue(new Date('2026-05-10'))`. **Forbidden patterns** (enforced by a structural lint test extending the existing one): `new Date()` outside `period.ts`, `Date.now()` outside `period.ts`. Components that need "now" import `today` from `period.ts`.
- **FY label convention:** `'FY{end-year}'`. AU FY runs 1 July to 30 June; the FY label is the calendar year of the END date.
  - Example: 1 Jul 2025 – 30 Jun 2026 = `'FY2026'`.
  - Matches ATO usage in NAT publications.
- **BAS quarter boundaries:**
  - Q1 = 1 Jul – 30 Sep
  - Q2 = 1 Oct – 31 Dec
  - Q3 = 1 Jan – 31 Mar
  - Q4 = 1 Apr – 30 Jun
- **No calendar-month / week / custom-recurrence helpers in v1.** If a future feature needs them, add them then. This keeps the period surface small and auditable.
- **Edge cases:** Time-of-day is ignored — boundaries are at midnight local time. No timezone handling; the app assumes the user's machine is on AEST/AEDT-equivalent local time. Documented in `period.ts` as a known constraint.

### Decomposition target (TAX-05 + roadmap success criterion 1)

- **`src/App.tsx` ≤ 250 lines after Phase 2.** Currently ~1,100 lines after Phase 1 cleanup.
- **Hooks extracted to `src/hooks/` (or `src/state/` — Claude's discretion):**
  - `useEntities()` — owns `entities`, `selectedEntityIds`, `activeEntityId`; exposes `createEntity`, `updateEntity`, `archiveEntity`, `deactivateEntity`, `deleteEntity`. Owns the `localStorage` `ledger_entities_list` key.
  - `useJournals()` — owns `allEntries: Record<string, JournalEntry[]>`; exposes `addEntry`, `updateEntry`, `reverseEntry`, `voidEntry`, plus the entity-scoped `entries` selector and the filtered/searched derivation. Owns the `ledger_all_entries` and legacy `ledger_entries` keys.
  - `useAccounts()` — owns `accounts: Account[]`; exposes `updateAccount`, `saveAll`. Owns the `ledger_chart_of_accounts` key.
  - `useAuditLog()` — owns `auditLogs: AuditLog[]`; exposes `addLog`. Owns the `ledger_audit_logs` key. Other hooks call `addLog` for their state changes.
  - All hooks invoke the migration runner from `src/lib/migrations` on initial load (continues the Phase 1 wiring; the runner now has a real `1 → 2` migration registered).
- **Shell components in `src/components/shell/`:**
  - `Sidebar.tsx` — props: `view`, `setView`, `activeEntity`, `entities`, `isOpen`, `setIsOpen`. No state of its own.
  - `Header.tsx` — props: `view`, `entities`, `activeEntityId`, `setActiveEntityId`, `setView`, `setIsSidebarOpen`, `setShowNewJournal`.
  - `BottomNav.tsx` — props: `view`, `setView`, `setActiveEntityId`, `setIsSidebarOpen`, `activeEntityId`.
  - `MainLayout.tsx` (optional; Claude's discretion) — composes the above plus the children content slot. Could equally live in `App.tsx`.
- **What stays in `App.tsx`:** the `View` union type, the top-level layout JSX, hook composition, view-routing switch (which is already a sequence of `view === 'X' && <Component />` blocks — those move out cleanly into a small `ViewRouter` if needed).

### Existing components migrated to the new tax engine

- `TaxReturnAssistant.tsx` → consumes `computeIndividual()` instead of inline rollup
- `CompanyTaxReturn.tsx` → consumes `computeCompany()`
- `TrustTaxReturn.tsx` → consumes `computeTrust()`
- `BasIasAssistant.tsx` → consumes `computeBas()`

Each component becomes a thin presentation layer reading the engine's typed output. The engine's Phase-2 skeleton returns the same numeric outputs the inline code currently produces (i.e. the existing demo-grade math is preserved temporarily); Phase 5 rewrites the engine internals to be ATO-correct without further component changes.

### Claude's Discretion

- Hook directory: `src/hooks/` vs `src/state/` vs `src/lib/state/` — pick what fits the existing conventions.
- Whether `MainLayout.tsx` is its own component or stays inline in `App.tsx`.
- The exact name → label inference table for the v1→v2 migration. Sensible mappings only (e.g. "Wages" / "Salaries" / "Director Fees" → company `6X`, trust `5M`, individual `6L`, partnership equivalent). Document the table in a comment in `migrations/v1-to-v2.ts`.
- Internal structure of `src/lib/tax/labels/fy2026.ts` — flat exports vs nested object — pick what reads cleanly.
- The exact `IS_AI_ENABLED` constant location (`src/lib/ai.ts`?) and the runtime check shape.
- Whether to keep the existing `vi.mock('@google/genai')` setup-time mock or refine it now that ImportTB gates by `IS_AI_ENABLED`.
- Internal structure of the fuzzy-match function (`src/lib/import/match.ts`?) — Claude's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — vision, constraints, "Out of Scope".
- `.planning/REQUIREMENTS.md` §FND-04, §TAX-01, §TAX-03, §TAX-04, §TAX-05, §BOOK-08, §BOOK-10 — Phase 2 requirements.
- `.planning/ROADMAP.md` — Phase 2 goal and 6 success criteria.

### Phase 1 (carries forward)
- `.planning/phases/01-safety-net/01-CONTEXT.md` — locked decisions on disclaimer, decimal.js wrapper, schema versioning at root, AI optional principle.
- `.planning/phases/01-safety-net/01-RESEARCH.md` — `decimal.js` API, jsdom workaround, structural lint pattern, ABN algorithm. The migration runner contract documented here is what Phase 2 extends.
- `.planning/phases/01-safety-net/01-1-SUMMARY.md` — what Phase 1 delivered (lib/money, lib/validation, lib/migrations, 3 components, schema-v1 stamping).

### Research outputs (this milestone)
- `.planning/research/SUMMARY.md` — phase-ordering rationale; specifically the "decompose and tax engine" phase intent.
- `.planning/research/STACK.md` — Vitest/RTL choice, `@types/jest-dom` setup. No new libraries needed for Phase 2 unless we add date-fns/Day.js (decision: do not).
- `.planning/research/ARCHITECTURE.md` — § "Decompose and centralise" rationale; pure-function tax engine pattern; period-model placement.
- `.planning/research/PITFALLS.md` — § GST decimal arithmetic, § magic-number tax rates, § stale ATO label specs — all Phase 2 mitigations.

### Codebase map (current state)
- `.planning/codebase/ARCHITECTURE.md` — current SPA structure; informs hook extraction boundaries.
- `.planning/codebase/STRUCTURE.md` — file/dir conventions; informs `src/hooks/`, `src/components/shell/`, `src/lib/tax/labels/` placement.
- `.planning/codebase/CONCERNS.md` — § "Monolithic 1,126-line App.tsx" and § "Duplicated business logic across components" — Phase 2 fixes both.
- `.planning/codebase/CONVENTIONS.md` — naming/import patterns; new modules follow these.

### External (during implementation; not blocking for plan)
- `decimal.js` docs — `Decimal.set({ rounding: 6 })` for ROUND_HALF_EVEN already configured in `src/lib/money.ts`.
- ATO NAT 0660 (Individual), NAT 0656 (Company), NAT 0659 (Trust), NAT 0976 (Partnership) — for the seed-CoA tax-label mapping. Phase 4 verifies against current-year publications; Phase 2 uses the existing labels in `src/constants.ts` extended for completeness.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets (Phase 1)
- `src/lib/money.ts` — already provides `add/sub/mul/div/gst/round/serialize/deserialize`. Tax engine uses these exclusively.
- `src/lib/validation.ts` — ABN validator. Independent of Phase 2 work.
- `src/lib/migrations/index.ts` — migration runner with `migrate(raw): KnownState` contract. Phase 2 registers `1 → 2` here.
- `src/lib/tax/.gitkeep` + `structural-lint.test.ts` — directory ready; structural test will extend to also forbid React imports in tax modules.
- `src/test/setup.ts` — already mocks `@google/genai` and polyfills `ResizeObserver`/`matchMedia`. Phase 2's smoke tests inherit this setup.
- `vitest.config.ts` — `css: false`, jsdom env, no Tailwind plugin. Don't change.
- All Phase 1 smoke tests (12 components) — must remain GREEN after the refactor.

### Established patterns
- Components under `src/components/` are flat PascalCase. New `shell/` subdirectory is the first nested folder; precedent for future grouping.
- Custom hooks: none yet. `src/hooks/` is new — establish the convention with `useX.ts` named exports.
- State persistence pattern in current `App.tsx`: a `useEffect` block reads `localStorage` on mount; per-slice `useEffect` blocks write on change. Hooks should preserve this shape (Phase 3 replaces it with `StorageAdapter`).
- Audit-log dispatch: every state mutation calls `addAuditLog(action, details, entityId)`. Hooks expose mutators that call `addLog` internally; consumers don't pass action strings around.

### Integration points
- **App.tsx hook insertion site:** lines 209–294 (the giant block of `useState`s, load `useEffect`, save `useEffect`s, and the local `addAuditLog`/handler functions). All of this moves into hooks.
- **Sidebar extraction:** `src/App.tsx` lines 429–528. Pure JSX with prop-derivable state. Move verbatim.
- **Header extraction:** `src/App.tsx` lines 533–580.
- **BottomNav extraction:** `src/App.tsx` lines 1034–1071.
- **Tax component migration:**
  - `src/components/TaxReturnAssistant.tsx` — current rollup at lines 30–58.
  - `src/components/CompanyTaxReturn.tsx` — similar inline rollup.
  - `src/components/TrustTaxReturn.tsx` — similar inline rollup.
  - `src/components/BasIasAssistant.tsx` — current rollup at lines 11–86.
  - Each gets refactored to call its respective `compute*` function and render the result.
- **`ImportTB.tsx` AI gating:** line 79 (`new GoogleGenAI(...)`). Wrap in `if (IS_AI_ENABLED)` plus a top-level conditional to hide the AI section.
- **Date-default audit:** grep for `new Date(`, `Date.now(`, `getFullYear(` across `src/` to find every place that needs to switch to `period.ts` helpers.

### Things that don't change
- Visual design system (Tailwind v4, CSS variables) — preserved.
- Test infrastructure (Vitest + RTL + jsdom@26) — preserved.
- DisclaimerFooter, PdfGate, MigrationError components — preserved unchanged.
- ABN validator — preserved unchanged.
- decimal.js wrapper API — preserved unchanged.

</code_context>

<specifics>
## Specific Ideas

- **`IS_AI_ENABLED` constant value:** `Boolean(import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')` — note: Vite's runtime env vars are `import.meta.env.VITE_*`, but the existing `vite.config.ts` defines `process.env.GEMINI_API_KEY` via the `define` block. Confirm the existing access pattern in `ImportTB.tsx:79` (`process.env.GEMINI_API_KEY`) and align the gate.
- **Confidence threshold for fuzzy match:** 0.85 (single-best auto-pick) / < 0.85 (top-3 picker). Tunable, but lock these as the v1 defaults.
- **FY label format:** `'FY2026'` exactly (capital F, capital Y, 4-digit year, no spaces).
- **Period 'custom' type fields:** `{ type: 'custom'; from: Date; to: Date }` — `from` is the inclusive start date at 00:00 local; `to` is the inclusive end date (boundaries are at end-of-day local).
- **Migration `1 → 2` is non-destructive:** never deletes any field; only adds. Old fields like `taxLabel` keep their values.
- **`compute*` Phase-2 stubs RELOCATE the existing inline math** from the 4 tax components into the corresponding lib/tax module, converting any monetary arithmetic to `Decimal` via `src/lib/money.ts`. Visual output of the existing tax components stays the same after migration to consume `compute*()`. Only `partnership.ts` stubs to zeros (no existing component to relocate from). Phase 5 rewrites all internals with ATO-correct logic without changing the API.

</specifics>

<deferred>
## Deferred Ideas

- **Server-side proxy for Gemini calls** — Phase 3 (when the optional Express + better-sqlite3 server arrives, the AI proxy is a natural addition).
- **Calendar-month / week / arbitrary-recurrence period helpers** — add when a feature needs them. Phase 4's anomaly flagging may want monthly buckets.
- **A date-library swap (date-fns / Day.js)** — `period.ts` is intentionally native-Date for v1; revisit if surface grows past ~10 functions.
- **Real CoA inference table for v1→v2 migration** — Phase 2 ships a small one for the existing 16 accounts plus common synonyms. Phase 4 extends it to cover the 80–150-account expansion.
- **AI-improved fuzzy match** — Phase 2 uses Levenshtein + exact-code as the deterministic path. A Phase-X enhancement could tune ranking on observed user corrections.
- **Settings page for runtime API key** — Phase 6 (deployment polish) could revisit; v1 keeps `.env`.

</deferred>

---

*Phase: 02-decompose-and-tax-engine*
*Context gathered: 2026-05-10*
