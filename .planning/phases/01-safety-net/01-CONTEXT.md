# Phase 1: Safety Net — Context

**Gathered:** 2026-05-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 clears the three blocking risks from `.planning/research/PITFALLS.md` and installs the foundational quality floor that every subsequent phase relies on. It is **demolition + plumbing**, not new product features.

**In scope:**
- Strip regulatory theatre and misleading UI strings
- Strip the off-mission slide generator
- Replace the hard-coded `'Tristan (Admin)'` audit-log user with an honest placeholder
- Replace hard-coded fake trend strings with honest placeholders
- Replace the existing demo seed entities (`'Pearson Specter Litt'`, `'US Big Law Firm'`) with 1–2 minimal AU samples
- Add a persistent compliance disclaimer site-wide and a tick-to-confirm gate at PDF generation
- Install Vitest + React Testing Library + jsdom and write the first golden-output tests for tax math
- Set up GitHub Actions CI (`build`, `lint`, `test`)
- Install `decimal.js` and migrate any monetary calculation in tax-relevant code paths off raw JS floats (full migration of all components is Phase 2's job — Phase 1 ensures the dependency exists and is used in the new test fixtures and any tax-engine extraction that begins now)
- Add a `_v: number` schema-version field to every persisted type and a migration runner stub (the runner is wired to real migrations in Phase 3)
- Add ABN modulus-89 + TFN-format-style validation to the entity form (TFN field itself is removed from the data model — see decisions)

**Out of scope (later phases):**
- Replacing `localStorage` with durable storage → Phase 3
- Decomposing `App.tsx`, extracting hooks, moving tax math into `src/lib/tax/` → Phase 2
- Removing the Gemini API key from the bundle / making AI optional → Phase 2
- Expanding the chart of accounts to 80–150 accounts with tax-label pre-mapping → Phase 4
- Building the period model that drives BAS/TB/return date defaults → Phase 2
- Real tax-correctness work (BRE test, individual marginal rates, trust streaming) → Phase 5
- Year-end wizard, anomaly flags, persona modes → Phase 6

</domain>

<decisions>
## Implementation Decisions

### Disclaimer

- **Placement:** Persistent footer on every page in the running app — thin, always visible, low visual weight.
- **Copy (verbatim):** *"This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO."*
- **Body naming:** Generic. The disclaimer mentions the ATO only as the destination of any lodgement (factual). It does **not** name the TPB, SBR, RAM, or other regulatory bodies — too inside-baseball for non-accountant users.
- **PDF generation gate:** A user-facing tick-to-confirm step before any tax-return PDF is produced: *"I confirm I have reviewed these figures and understand this is a working paper, not lodged advice."* Hard gate — generation is blocked until ticked. The same disclaimer copy is printed prominently on the PDF itself, but the click-through is non-negotiable.
- **Surfaces in Phase 1:** The footer disclaimer must appear on every page that exists today. The PDF tick-gate scaffolding lands in Phase 1; the actual PDF generator arrives in Phase 5 — the gate component must exist and be unit-tested even if it's not wired to a real PDF until then.

### Cleanup boundary

| Surface | Decision | Where |
|---|---|---|
| `"ATO Connected (Simulated)"` indicator | **Remove entirely** | `src/App.tsx:526` |
| `"Pearson Specter Litt"` / `"US Big Law Firm"` demo seed entity | **Remove and replace** with minimal AU samples | `src/App.tsx:55-60` |
| Slide generator | **Remove entirely** in Phase 1 | `src/components/SlideGenerator.tsx`, route in `src/App.tsx`, sidebar entry |
| Hard-coded `'Tristan (Admin)'` audit-log user | **Replace with `'Local user'`** as a placeholder until Phase 4's audit-log work | `src/App.tsx:351` |
| Hard-coded `'+12% vs last month'`, `'-5% vs last month'`, `'Healthy margin'` trend strings | **Replace with `'—'` or `'No comparison data yet'`** placeholder; preserve the visual slot | `src/App.tsx:771,783` and the StatCard `trend` prop |
| Demo seed entities (replacement) | **Two minimal AU samples**: one Pty Ltd ("Sample Pty Ltd"), one Family Trust ("Sample Family Trust"). Real-format-but-clearly-fake placeholder ABNs (e.g. `'11 111 111 111'`). **No TFN values seeded.** | `src/App.tsx:55-60` (DEFAULT_ENTITIES) |

### Test strategy

- **Framework:** Vitest + React Testing Library + jsdom. Locked.
- **Golden-test number sourcing:** Hand-calculated against a small but realistic fixture journal set per entity type. Tests assert the math we **want** in Phase 5, not the math the prototype currently produces. (If specific ATO worked examples in NAT 0656/0660/0659/0976 are easily extractable, prefer those — but don't block the phase waiting for them. Hand-calc is the default.)
- **Coverage gate:** Visible coverage report in CI logs; **no failing threshold** in Phase 1. The intent is to add tests organically through later phases without arguing about coverage gates.
- **Existing components:** **Smoke tests only** — assert each major component (`App`, `JournalForm`, `TrialBalance`, `BasIasAssistant`, `TaxReturnAssistant`, `CompanyTaxReturn`, `TrustTaxReturn`, `EntityForm`, `AccountManager`, `AuditTrail`, `ImportTB`, `FinancialTrendChart`) renders without crashing given minimum valid props. Do **not** characterise current behaviour — Phase 2 will rewrite most of these and Phase 5 will rewrite the tax math.
- **Structural lint test:** A custom Vitest test that fails CI if `src/lib/tax/**/*.ts` contains the patterns `* /` or `/ \d` applied to monetary values (i.e. catches raw float arithmetic in tax modules). Phase 1 establishes the directory and the lint test even if the directory is mostly empty when Phase 1 ships.

### ABN / TFN

- **ABN validation:** Modulus-89 checksum + format check. **Warn but allow save** on invalid ABN — display an inline warning at the field, but do not block submit. Rationale: real workflows include data entered before ABNs are issued / verified.
- **TFN: do not store.** Remove the TFN field from the data model and the entity form entirely. The print-ready working paper does not require a TFN — the user transcribes the working paper into myGov, where they enter their TFN directly to the ATO. Eliminating TFN storage eliminates the highest-risk leak scenario from a self-hosted-but-still-targetable instance.
- **Demo seeds:** Real-format-but-clearly-fake ABN strings (`'ABN 11 111 111 111'` and similar). Never seed a TFN regardless of future TFN policy changes.

### Decimal arithmetic (FND-08)

- **Library:** `decimal.js`. Locked by research.
- **Phase 1 scope:** Install the dependency, write a small wrapper module (e.g. `src/lib/money.ts`) exposing `add`, `sub`, `mul`, `div`, `gst` (divide by 11 for GST-inclusive), and the rounding policy (banker's rounding to 2 dp). Use the wrapper in any tax-engine code that begins extraction in this phase. Do **not** attempt a full sweep of every component in Phase 1 — Phase 2's tax-engine extraction will migrate components as they move into `src/lib/tax/`.
- **Rounding policy:** Banker's rounding to 2 decimal places for monetary outputs. Document explicitly in the wrapper's tests.

### Schema versioning (FND-09)

- **Where the version lives:** A single root-level `_v: number` field on the persisted root state object. **Not** per-type — the root carries the version, the migration runner reads it.
- **Initial version:** `_v: 1`. Any pre-existing user data without `_v` is treated as `_v: 0` and the runner upgrades it to `_v: 1` (which may be a no-op rename if the shape is already current).
- **Runner stub:** A migration runner module exists in `src/lib/migrations/` with a single `migrate(state) → state` function and an empty/identity migration registered for `0 → 1`. Phase 3 adds the real migrations as the storage layer changes.
- **Failure behaviour:** If migration throws, surface a non-dismissable error UI explaining the failure; do not auto-discard data. Phase 1 ships the error path even though no migrations exist yet to fail.

### CI (DEP-05)

- **Provider:** GitHub Actions.
- **Triggers:** every push to `main`, every PR targeting `main`.
- **Jobs (must all pass):** `npm ci` → `npm run build` → `npm run lint` (which is `tsc --noEmit`) → `npm run test` (Vitest, includes the structural lint test).
- **Coverage:** generated and printed in logs only — no gate.
- **Runner OS:** `ubuntu-latest`. Windows runner is **not** required (the repo author dev's on Windows but CI parity isn't worth the runner-time cost in v1).

### Claude's Discretion

- Exact directory layout for `src/lib/money.ts`, `src/lib/migrations/`, `src/lib/tax/` (placeholder) — wherever fits the existing `src/lib/` convention.
- File names and organisation of test fixtures (single shared `fixtures/` vs colocated with tests).
- Exact CSS / Tailwind classes for the disclaimer footer — match existing visual system.
- The wording of the placeholder seed entities' contact / address fields beyond what's specified.
- Whether to add `npm run typecheck` as an alias for the existing `npm run lint`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & requirements
- `.planning/PROJECT.md` — vision, constraints, out-of-scope items; "What This Is", "Core Value", "Out of Scope" sections especially relevant.
- `.planning/REQUIREMENTS.md` §FND, §ENT, §DEP — Phase 1 requirements (FND-05/06/07/08/09, ENT-02, DEP-05).
- `.planning/ROADMAP.md` Phase 1 — goal, success criteria, dependencies.

### Research outputs (this milestone)
- `.planning/research/SUMMARY.md` — synthesised stack/feature/architecture/pitfalls findings; the "Three pitfalls require Phase 1 / foundation work" section is directly load-bearing for this phase.
- `.planning/research/STACK.md` — Vitest + RTL choice, decimal.js choice, rationale for each.
- `.planning/research/PITFALLS.md` — the three Phase 1 blockers; GST decimal-arithmetic pitfall; schema-migration-without-runner pitfall; TPB regulatory framing.
- `.planning/research/ARCHITECTURE.md` — build-order rationale (why safety net is Phase 1); recommended `src/lib/tax/` placement.

### Codebase map (current state)
- `.planning/codebase/CONCERNS.md` — exhaustive list of issues to address (or explicitly defer); "Critical" tier for Phase 1 priorities.
- `.planning/codebase/ARCHITECTURE.md` — current SPA structure; informs where to attach the disclaimer footer.
- `.planning/codebase/STRUCTURE.md` — file/dir conventions; informs where new modules (`lib/money.ts`, `lib/migrations/`, `lib/tax/`, `tests/`) should live.
- `.planning/codebase/CONVENTIONS.md` — naming, import patterns; informs new code style.

### External (when relevant during implementation; not blocking for plan)
- `decimal.js` docs — for the `src/lib/money.ts` wrapper API and rounding policy.
- Vitest docs — for `vitest.config.ts` setup with Vite 6 / React 19 / jsdom.
- `@testing-library/react` docs — note React 19 compatibility (verify version pin).
- ATO ABN format spec — modulus-89 algorithm reference (Australian Business Register).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/lib/utils.ts` — already has `cn()` for class merging. Pattern is established for `src/lib/*.ts` modules with named exports.
- `src/types.ts` — single shared type module; `_v` field can be added uniformly to every persisted interface here.
- `src/index.css` — Tailwind v4 with custom `--ink`, `--bg`, `--line` variables. Disclaimer footer should use these tokens for consistency.
- `motion/react` (already imported) — available for any disclaimer animation if needed (probably overkill for v1; avoid).
- `lucide-react` icons — `AlertTriangle`, `Info`, `FileWarning` available for disclaimer iconography.

### Established patterns
- Components are flat under `src/components/` with PascalCase filenames matching the export.
- State is owned by `src/App.tsx`; persistence is via `useEffect` blocks reading/writing `localStorage` keys (`ledger_entities_list`, `ledger_all_entries`, `ledger_audit_logs`, `ledger_chart_of_accounts`).
- Form validation pattern in `src/components/EntityForm.tsx` and `src/components/JournalForm.tsx` — touched + errors + blur tracking. ABN inline-warn behaviour should match this pattern.
- No central error/notification component exists — disclaimer footer is the first cross-cutting UI affordance; design for reuse.

### Integration points
- **Disclaimer footer:** Mounts inside the `<main>` flex container in `src/App.tsx:532` after the existing content area, or as a sibling sticky element. Either works; planner's call.
- **Test bootstrap:** Add `vitest.config.ts` at repo root (or extend `vite.config.ts`); add `setup-tests.ts` for jsdom/RTL config.
- **CI workflow:** `.github/workflows/ci.yml` — repo currently has no `.github/` directory. New file.
- **Migration runner:** Called from the existing localStorage-load `useEffect` in `src/App.tsx:230` — the four `localStorage.getItem` blocks. Wrap each parsed value through the migrator before `setState`. Phase 3 will replace this entire section with the StorageAdapter; Phase 1's runner is wired into the current shape.
- **Schema version field:** Added to every persisted type in `src/types.ts` (`Entity`, `Account`, `JournalEntry`, `JournalLine`, `AuditLog`). The root state held in `App.tsx` should also carry a single root-level `_v` written alongside the data on save.
- **Slide generator removal:** Delete `src/components/SlideGenerator.tsx`; delete the import at `src/App.tsx:44`; delete the route case in the App view-switch (`src/App.tsx:1005-1011`); delete the sidebar `NavButton` for slide-generator (`src/App.tsx:506-511`); delete the `'slide-generator'` token from the `View` union (`src/App.tsx:53`).
- **Removing API keys from bundle:** Out of scope for Phase 1 (Phase 2's job). Phase 1's slide-generator removal eliminates one of the two call sites; the other (`src/components/ImportTB.tsx:79`) stays for now and is handled in Phase 2.

</code_context>

<specifics>
## Specific Ideas

- The disclaimer wording is exact and not for the planner to rewrite: *"This output is a draft working paper, not tax advice. Verify all figures against your source records before lodging. AussieLedger is not a tax agent and does not lodge returns with the ATO."*
- Replacement audit-log user string is exact: `'Local user'`.
- Trend-string replacement is `'—'` (em-dash, U+2014), not `'-'` or `'N/A'`.
- Demo seed entities should be `'Sample Pty Ltd'` and `'Sample Family Trust'` with placeholder ABNs in the `'11 111 111 111'` (eleven ones) and `'22 222 222 222'` style — clearly demo-flagged via repeated digits.
- TFN field deletion includes any references in `src/types.ts` (the `Entity` interface), `src/components/EntityForm.tsx`, demo seed data, and any audit-log details that mention TFN values.

</specifics>

<deferred>
## Deferred Ideas

- **Single-instance display name setting** for the audit log (more honest than `'Local user'`) — captured during cleanup discussion; deferred to Phase 4 when audit-trail depth work happens.
- **Real period-over-period trend computation** for the dashboard StatCards — deferred to Phase 4+ (requires period model from Phase 2).
- **Coverage threshold gate** in CI — deferred; revisit after Phase 5 when tax-engine code stabilises.
- **TFN-on-PDF policy** — N/A given TFN isn't stored, but if TFN is ever re-added, the locked-in answer is "edit-form only, never on dashboard / lists".

</deferred>

---

*Phase: 01-safety-net*
*Context gathered: 2026-05-10*
