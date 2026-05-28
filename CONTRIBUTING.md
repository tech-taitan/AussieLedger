# Contributing to AussieLedger

Thanks for your interest in contributing.

## Dev Setup

### Single-user local (no server)
```bash
npm install
npm run dev
```
Visit http://localhost:3000. Data persists in IndexedDB.

### Full-stack (small-firm VPS shape)
```bash
npm install
npm run dev:full
```
Vite on :3000 + Express on :4000. Data persists in SQLite at `./data/ledger.db`.
(Windows: requires Visual Studio Build Tools for better-sqlite3 native compile.)

## Tests

```bash
npm test              # full Vitest suite (SPA)
npm run test:server   # server-side suite
npm run lint          # TypeScript noEmit (SPA + server)
npm run build         # production build (catches type errors not in dev)
```

All PRs must keep the suite GREEN and `npm run build` exiting 0.

## Schema Migrations

AussieLedger uses an integer schema version (`_v`) on all persisted data.

**The hard rule:** Every schema change MUST be:

1. **Additive only** — new fields are optional with sensible defaults. No field may be removed or renamed. No type may be changed to an incompatible type.

2. **Reversible round-trip** — a `v{N}→v{N+1}` migration test is required that:
   - Constructs a representative `_v: N` blob (the oldest realistic shape)
   - Runs it through `migrate()` in `src/lib/migrations/index.ts`
   - Asserts the result is `_v: N+1` with all existing fields preserved and all new fields populated with correct defaults
   - Calls `adapter.importAll(migrated)` then `adapter.exportAll()` and asserts the exported shape matches the migrated shape (round-trip integrity)

3. **Registered** — add `N: migrateVNToV{N+1}` to the `MIGRATIONS` registry in `src/lib/migrations/index.ts` and bump `CURRENT_VERSION`.

4. **Named consistently** — migration file: `src/lib/migrations/vN-to-v{N+1}.ts`. Test file: `src/lib/migrations/__tests__/vN-to-v{N+1}.test.ts`.

**Why:** A deployed instance may have been offline for 6 months. On next load, the migration runner must upgrade every version gap without losing data. Non-additive changes corrupt that user's books permanently.

## Adding a New Financial Year

AussieLedger uses a per-FY module pattern. To add FY2027:

1. Create `src/lib/tax/labels/fy2027.ts` — copy fy2026.ts and update constants (marginal brackets, LITO, Medicare, MLS, NAT references).
2. Create `src/lib/tax/returns/fy2027/{individual,company,trust,partnership,bas,ias}.ts` — copy fy2026 modules and adjust label mappings if ATO forms changed.
3. Create `src/lib/tax/rates/fy2027/{marginal,lito,medicare,bre,smallBizOffset}.ts`.
4. Wire dispatch in `currentFy()` / period.ts as required.
5. Add golden tests in `src/lib/tax/returns/fy2027/__tests__/` matching the fy2026 test layout.

Existing FY modules MUST NOT be modified — the per-FY pattern is the rule.

## Pull Request Template

Include in your PR description:
- **What:** one-line summary
- **Why:** reference to issue / requirement ID
- **How tested:** `npm test` output + manual verification steps
- **Schema impact:** none / additive (provide migration file path)
- **AI feature impact:** none / requires Gemini API key

A `.github/PULL_REQUEST_TEMPLATE.md` will surface these prompts automatically.

## License

Apache 2.0. See `LICENSE` at the repo root and per-file SPDX headers.
