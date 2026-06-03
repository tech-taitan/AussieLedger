---
phase: 16
slug: docs-polish
type: context
status: ready-for-planning
created: 2026-06-03
discussed_areas: [screenshot-capture, persona-structure, for-developers-content, test-assertions]
---

# Phase 16: Docs Polish — Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

**Phase scope:** POL-DOCS-01 (real README screenshot replacing the `> _Screenshot coming v1.3._` placeholder) + POL-DOCS-02 (README "What This Is" expanded with 3 persona-segmented subsections: For business owners, For tax agents, For developers). Final phase of v1.3 milestone. No source-code changes; docs only.

<domain>
## Phase Boundary

Phase 16 closes the v1.3 milestone by tidying the two POL-04 items that were deferred from Phase 14 (real screenshot + persona-segmented README sections). After Phase 16 ships, v1.3 is releaseable — 7/7 active requirements complete (POL-CODE-01..05 + POL-DOCS-01..02); POL-CODE-06 PWA install CTA stays deferred from discuss-time on 2026-06-02.

**In scope (2 requirements: POL-DOCS-01 + POL-DOCS-02):**

- **POL-DOCS-01 — Real README screenshot.** User captures `/demo` route MasterDashboard with the seeded sole-trader entity visible (DemoModeBanner pinned at top + populated dashboard widgets from the 15 seeded journals). PNG, 1280px wide at 2x DPR (so 2560px actual), optimised via `pngquant` to target ≤ 200KB. Saved to `docs/screenshot.png`. README top-of-fold replaces the `> _Screenshot coming v1.3._` italic blockquote with `![AussieLedger](docs/screenshot.png)` markdown image tag. POL-DOCS-01 is a `checkpoint:human-action` task — user runs the captured screenshot via Chrome DevTools "Capture full size screenshot" or device-emulation at 1280px; orchestrator gives explicit step-by-step; user drops file at `docs/screenshot.png`; planner wires + tests.
- **POL-DOCS-02 — Persona-segmented README sections.** README "What This Is" section restructured: keep existing `## What This Is` header + 1-2 line summary sentence; add 3 `### subsections` underneath in this order:
  - **`### For business owners`** — light touch-up of existing copy. Keep proven voice; refresh any dated phrasing (e.g. v1.0 references).
  - **`### For tax agents`** — light touch-up of existing copy. Same treatment.
  - **`### For developers`** — NEW subsection. Tight bullet list (~6-8 bullets, ~12 lines total) covering:
    - StorageAdapter FINAL (12 methods; widening via duck-typing; LocalAdapter IndexedDB + ServerAdapter SQLite — same SPA, two backends)
    - Tax engine pure functions in `src/lib/tax/` + decimal.js (never floats)
    - Print working papers via `window.print()` + `@media print` CSS (no PDF library)
    - Tech stack: React 19, Vite 6, TypeScript 5.8, IndexedDB via `idb`, Express + `better-sqlite3`
    - Apache 2.0 license + link to CONTRIBUTING.md (`See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.`)
  - No code snippets; prose + bullets only.

**Out of scope (deferred):**

- **Real screenshot variants** (Tax Assistant view, composite multi-page) — v1.4 polish if user wants multiple screenshots
- **WebP format** — PNG chosen for GitHub README compatibility; revisit when GitHub supports WebP universally
- **Code snippets in developers section** — explicit non-goal per discuss-time decision (keep README tight)
- **`docs/assets/` sub-foldering** — single `docs/screenshot.png` for v1.3; revisit if more images accrue
- **"PRs welcome" / "good first issue" CTA expansion** — single CTA link to CONTRIBUTING.md; no GitHub Issues curated list yet
- **POL-CODE-06 PWA install desktop CTA** — still deferred from v1.3 discuss-time on 2026-06-02
- **Persona top-level `##` sections (instead of nested `###`)** — explicit non-goal; nest under `## What This Is` to minimize restructure churn
- **Alphabetical or developers-first persona ordering** — locked to business owners → tax agents → developers per PROJECT.md audience priority
- **Verify-file-exists test for screenshot** — explicit non-goal; relying on CI build + manual review; README text assertion catches path drift
- **Rich 3-5 phrase assertions per persona** — locked to 1 key phrase per persona to balance lock vs maintenance

</domain>

<decisions>
## Implementation Decisions

### Screenshot capture specifics (4 sub-decisions)

- **Subject: `/demo` MasterDashboard with seeded sole-trader entity visible.** Communicates "real working app" immediately. Shows: DemoModeBanner pinned at top (blue), sidebar with the demo entity selected (sole trader), MasterDashboard with widgets populated by the 15 seeded journals + 10 accounts. Most representative first-visit experience.
- **Format: PNG, 1280px logical width × 2x DPR (2560×1600 actual).** PNG handles UI text crisply (no JPEG compression artifacts). 1280 logical fits most readers; 2x DPR for retina sharpness. Target file size: ≤ 200KB after `pngquant` optimisation (user runs optimisation manually OR planner can suggest a one-line command).
- **File location: `docs/screenshot.png`.** Standard convention for repo-asset images. Keeps repo root tidy. Markdown link: `![AussieLedger](docs/screenshot.png)`.
- **Capture flow: `checkpoint:human-action`.** User captures using either: (a) Chrome DevTools → Toggle Device Toolbar → set to 1280px width + 2x DPR → Command Menu (Cmd/Ctrl+Shift+P) → "Capture full size screenshot", OR (b) browser at 1280px window width + Cmd/Ctrl+Shift+P "Capture full size screenshot" without DevTools toolbar. Save to `A:/Projects/AussieLedger/docs/screenshot.png`. Run `pngquant --quality=80-95 docs/screenshot.png --output docs/screenshot.png --force` if file > 200KB. Reply "captured" to the orchestrator. Planner re-verifies file exists + dimensions reasonable + wires into README.

### Persona section structure (4 sub-decisions)

- **Restructure approach: Keep existing `## What This Is` header + add 3 `### subsections` beneath.** Minimum-disruption refactor. Adds 1-2 line summary sentence under the `## What This Is` heading, then the 3 personas as `### h3` subsections. Existing 'For business owners' + 'For tax agents' copy stays mostly-intact with light refresh.
- **Order: Business owners → Tax agents → Developers.** Matches PROJECT.md audience priority (primary → secondary → tertiary).
- **Sub-heading style: `### (h3)` under existing `## What This Is`.** Hierarchical TOC-correct nesting. GitHub renders these correctly in the TOC sidebar.
- **Existing copy: Light touch-up.** Preserve proven voice; tweak phrasing for cohesion with the new developers section. Refresh any dated v1.0/v1.1 references. Don't rewrite from scratch.

### "For developers" section content (4 sub-decisions)

- **Length: tight bullet list (~6-8 bullets, ~12 lines total).** Matches the calm-modernist README tone. Architecture-at-a-glance, fast scan for devs.
- **Architecture items to mention (all 4 selected):**
  - **StorageAdapter FINAL** — 12 methods; widening via duck-typing; LocalAdapter IndexedDB + ServerAdapter SQLite; "same SPA, two backends"
  - **Tax engine: pure functions in `src/lib/tax/`** + decimal.js (never floats); per-FY label module pattern
  - **Print working papers via `window.print()` + `@media print` CSS** (no PDF library)
  - **Tech stack: React 19 + Vite 6 + TypeScript 5.8 + IndexedDB via `idb` + Express + `better-sqlite3`**
- **No code snippets.** Prose + bullets only. Keeps README tight; avoids staleness risk from snippet drift.
- **CTA: single link to CONTRIBUTING.md.** Verbatim sentence at section end: `See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup, test patterns, and how to add a new FY.`

### Test assertions for POL-DOCS-02 (4 sub-decisions)

- **Per-persona assertion shape: heading present + 1 key phrase per persona.** 3 assertions, one per persona:
  - Business owners: `### For business owners` heading present + phrase `plain English` OR `walk away with` matched
  - Tax agents: `### For tax agents` heading present + phrase `multi-client` OR `fast entity switching` matched
  - Developers: `### For developers` heading present + phrase `StorageAdapter` OR `pure functions` matched
- **Screenshot reference test: assert README contains `docs/screenshot.png`.** 1 new readme.test.ts assertion. Catches accidental deletion or path change. Doesn't verify the file exists (explicit non-goal per discuss-time).
- **Placeholder-removal test: assert README does NOT contain `Screenshot coming`.** 1 new assertion: `expect(readme).not.toMatch(/Screenshot coming/i)`. Locks the placeholder replacement; prevents accidental rollback.
- **Total new tests: 5** (3 persona + 1 screenshot path + 1 placeholder-removed).

### Claude's Discretion

- **Exact heading-detection regex** for persona section tests — planner picks the cleanest form (e.g. `/^### For business owners$/m` strict OR `/### For business owners/` lenient). Recommend lenient since the heading might have trailing newline variants.
- **Exact pngquant invocation** — planner suggests in the checkpoint copy if image > 200KB. User's discretion whether to optimise.
- **Touched-up copy for existing personas** — planner picks the light-refresh edits to existing "For business owners" + "For tax agents" copy. Goal: cohesion with new developers section without losing proven voice.
- **Order of bullets within developers section** — planner picks; ordering shown above is suggestive not mandatory.
- **Specific phrase choices** for the developers section bullets — planner picks within the locked content boundaries.
- **Whether to update `package.json` description field** to match the latest README opener — orthogonal; planner can fold in or leave.
- **Markdown image alt-text** — `![AussieLedger](docs/screenshot.png)` recommended; planner can pick a richer alt-text like `![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png)` for a11y.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 16 scope + prior decisions
- `.planning/PROJECT.md` — v1.3 milestone goal (Polish + Cleanup); audience priority for persona ordering
- `.planning/REQUIREMENTS.md` §Docs Polish — POL-DOCS-01 + POL-DOCS-02 acceptance text
- `.planning/ROADMAP.md` Phase 16 entry
- `.planning/STATE.md` — architecture invariants
- `.planning/milestones/v1.2-phases/14-release-polish/14-CONTEXT.md` — POL-04 deferred items context

### Existing code Phase 16 must consume / modify
- `README.md` (102 lines post-Phase-14) — primary modification target
  - Top-of-fold blockquote `> _Screenshot coming v1.3._` at line ~7 — REPLACED by `![...](docs/screenshot.png)`
  - `## What This Is` section at line ~12 — RESTRUCTURED with 3 `###` subsections
- `src/__tests__/readme.test.ts` (existing 14 tests post-Phase-14) — EXTENDED with 5 new assertions
- `docs/` directory — does NOT exist yet; Phase 16 creates it as part of POL-DOCS-01

### New code Phase 16 creates
- `docs/screenshot.png` — created via user-side checkpoint; ~200KB target
- 5 new test assertions in `src/__tests__/readme.test.ts`

### External documentation
- GitHub README rendering: PNG support (universal), WebP support (incomplete in mid-2026 — PNG locked)
- Chrome DevTools: "Capture full size screenshot" command

### Repo facts
- **Live deploy:** `https://aussieledger.techtaitan.com` — `/demo` is the URL to capture from
- **Current test count (post-Phase-15):** 1203 SPA GREEN + 11 todo + 0 RED
- **Phase 16 target:** ~1208 SPA GREEN (+5 new readme.test.ts assertions)
- **CONTRIBUTING.md** already exists in repo (referenced by the new developers section CTA)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`/demo` route** (Phase 14-1) — seeded sole-trader entity + 10-account COA + 15 balanced FY2025-26 journals. POL-DOCS-01 captures this state.
- **`docs/` directory** — does NOT exist yet; Phase 16 creates it. Convention used for repo-asset images.
- **Existing `src/__tests__/readme.test.ts`** — 14 tests including 7 FND-12 byte-identical lock tests (Phase 9) and 7 POL-04 content-presence tests (Phase 14-3). POL-DOCS-02 adds 5 more.
- **CONTRIBUTING.md** at repo root — referenced by the new developers section CTA.

### Established Patterns
- **Apache 2.0 SPDX header** on every new source file (Phase 1 invariant) — NOT applicable to images or markdown
- **Conventional Commits** with co-author (every prior phase)
- **`checkpoint:human-action` task** — Phase 10 CF token, Phase 15 GitHub flip are the precedents. POL-DOCS-01 follows the same pattern: orchestrator pauses with explicit step-by-step; user does the manual step; orchestrator verifies + proceeds.

### Integration Points
- `README.md` modifications wired into existing `src/__tests__/readme.test.ts` assertion shape
- No changes to source code, vercel.json, vite config, package.json (except possibly description sync — Claude's discretion)
- No new dependencies; pngquant is optional user-side tool

</code_context>

<specifics>
## Specific Ideas

- **Checkpoint copy for POL-DOCS-01** (suggested):
  > "Capture the README screenshot:
  > 1. Open Chrome at a 1280px window width (resize the window OR use DevTools → Toggle Device Toolbar → custom 1280 × 800)
  > 2. Navigate to `https://aussieledger.techtaitan.com/demo`
  > 3. Wait for the demo to load — confirm DemoModeBanner is at the top + MasterDashboard shows the seeded sole-trader entity
  > 4. Open DevTools Command Menu (Cmd+Shift+P / Ctrl+Shift+P) → type "screenshot" → select **"Capture full size screenshot"**
  > 5. Save the resulting PNG to `A:/Projects/AussieLedger/docs/screenshot.png`
  > 6. Optional: optimise with `pngquant --quality=80-95 docs/screenshot.png --output docs/screenshot.png --force` if file exceeds 200KB
  > 7. Reply `captured` when the file is at the path above."
- **Verification probe** after the user replies `captured`:
  - `Test-Path docs/screenshot.png` → True
  - File size < 1MB (sanity bound)
  - Optionally read PNG header bytes to confirm dimensions ≥ 1280 × 800
- **README top-of-fold restructure** — exact diff: replace `> _Screenshot coming v1.3._` with `![AussieLedger MasterDashboard with seeded demo sole-trader entity](docs/screenshot.png)`. Alt-text descriptive for a11y.
- **Persona heading lock test pattern** — `expect(readme).toMatch(/^### For business owners$/m)` — `/m` for multiline; `$` anchors to end-of-line.
- **Phrase lock pattern** — `expect(readme).toMatch(/plain English|walk away with/)` — OR-clause keeps the assertion robust to copy refresh.

</specifics>

<deferred>
## Deferred Ideas

- **Tax Assistant view screenshot** — second image; v1.4
- **Composite stitched screenshot** — too much work for v1.3
- **WebP format** — when GitHub support is universal
- **Code snippets in developers section** — keep README tight
- **`docs/assets/` sub-foldering** — when more images accrue
- **GitHub Issues "good first issue" curation + CTA** — premature
- **POL-CODE-06 PWA install desktop CTA** — still deferred from v1.3 discuss-time
- **Verify-file-exists test for screenshot** — text assertion catches path drift; file-existence is implicit
- **Rich 3-5 phrase assertions per persona** — 1 phrase per persona is enough
- **Persona top-level `##` sections** — nest under `## What This Is`
- **Alphabetical or developers-first ordering** — locked to audience priority order

</deferred>

---

*Phase: 16-docs-polish*
*Context gathered: 2026-06-03*
