---
phase: 14-release-polish
plan: 3
type: execute
wave: 2
depends_on: ["14-1"]
files_modified:
  - README.md                                       # MODIFIED — targeted restructure ~82 → ~120 lines
  - src/__tests__/readme.test.ts                    # MODIFIED — add ~6 new content-presence assertions; preserve existing 7
autonomous: true
requirements:
  - POL-04
must_haves:
  truths:
    - "README top-of-fold has a 1-line elevator pitch + live-demo URL + [Screenshot coming v1.3] placeholder note"
    - "README Quick Start has two clearly-numbered options: (1) Try the demo (link), (2) Clone and self-host (commands)"
    - "README Deployment Shapes section preserves the existing Single-user local + Small-firm VPS + Public hosting (Vercel) sub-sections with light touch-ups"
    - "README Optional AI section is annotated honestly with the v5-deferral note (hosted AI not yet available)"
    - "README has a Privacy footer link pointing at /privacy on the live deploy"
    - "README still contains the existing test-locked phrases: 'npm install && npm run build', 'Single-user local', 'Small-firm VPS', 'StorageAdapter', 'owner mode', 'agent mode', 'Apache 2.0'"
    - "CONTRIBUTING.md link is preserved (already exists)"
  artifacts:
    - path: "README.md"
      provides: "v1.2 release-ready README with audience-first top-of-fold + two-option Quick Start"
      contains: "https://aussieledger.techtaitan.com"
      min_lines: 100
    - path: "src/__tests__/readme.test.ts"
      provides: "Content-presence regression tests for v1.2 README structure"
      contains: "techtaitan"
  key_links:
    - from: "README.md"
      to: "https://aussieledger.techtaitan.com (live demo)"
      via: "top-of-fold + Quick Start Option 1 + Privacy footer"
      pattern: "aussieledger\\.techtaitan\\.com"
    - from: "README.md"
      to: "CONTRIBUTING.md"
      via: "Contributing section link (existing — preserved)"
      pattern: "CONTRIBUTING\\.md"
    - from: "README.md"
      to: "/privacy (on live deploy)"
      via: "Privacy footer link"
      pattern: "/privacy"
---

<objective>
Close POL-04 — the README rewrite. Restructure from the current 82-line README to ~120 lines: a new audience-first top-of-fold (1-line elevator pitch + live-demo CTA + [Screenshot coming v1.3] placeholder), a reordered Quick Start with two clearly-numbered options (try the demo / clone + self-host), preserved Deployment Shapes section with light annotations, an honest v5-deferral note in the Optional AI section, and a new Privacy footer link. NOT a full audience-segmented rewrite (deferred to v1.3 per CONTEXT). All existing test-locked phrases preserved (`readme.test.ts` already asserts 7 specific strings; this plan extends with ~6 new assertions for the v1.2-specific structure).

Purpose: The README is the front door for any visitor arriving at github.com/tech-taitan/AussieLedger. Currently it's a self-hoster-first document; v1.2 ships a public URL, so the README needs to surface the "click here, start using it" path FIRST and the "clone and self-host" path SECOND. The targeted restructure satisfies the POL-04 "rewrite" intent without throwing away the proven existing content (Deployment Shapes, How It Works, Optional AI, Contributing, License).

Output: 1 modified file (README.md) + 1 modified test file (readme.test.ts). NO new source files; NO SPDX-headers parametric impact. Expected test delta: ~6 new GREEN tests (additional readme.test.ts assertions). Lint EXIT 0, build EXIT 0 (README isn't bundled).

Why this plan is split from 14-2: README work is docs-only, has zero shared files with the UI/storage plans, and is independently parallelisable with Plan 14-2 (both depend only on Plan 14-1's foundation — though README has no functional dependency on 14-1; the depends_on:["14-1"] is a wave-ordering signal, not a strict file dependency). Keeping it separate also means a README-only revert is trivial if the plan-checker flags wording issues.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/phases/14-release-polish/14-CONTEXT.md
@README.md
@src/__tests__/readme.test.ts
@CONTRIBUTING.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: README restructure — new top-of-fold + reordered Quick Start + light annotations</name>
  <files>
    README.md (MODIFIED — ~82 → ~120 lines)
  </files>
  <action>
    1. Read the existing `README.md` (already loaded in context above). Identify the structural sections:
       - Line 1: `# AussieLedger` heading
       - Lines 2-4: existing 2-line tagline
       - Lines 6-11: "What This Is" (small-business + tax-agent paragraphs)
       - Lines 13-21: "Quick Start" (single-path: clone + dev)
       - Lines 23-61: "Deployment Shapes" (Single-user local + Small-firm VPS + Public hosting Vercel)
       - Lines 63-68: "How It Works"
       - Lines 70-72: "Optional: AI Account-Matching"
       - Lines 74-76: "Contributing"
       - Lines 78-82: "License" + final tagline
    2. REWRITE the README to the following ~120-line structure. Use the Write tool (NOT Edit) — this is a wholesale restructure of a small file, easier to rewrite than to patch piecewise.

    NEW README structure (target ~120 lines; preserves every test-locked phrase from readme.test.ts):

    ```markdown
    # AussieLedger

    Free Australian bookkeeping → tax return tool. Your data stays in your browser.

    **Try the live demo at https://aussieledger.techtaitan.com**

    > _Screenshot coming v1.3._

    AU only. All four entity types (Company, Trust, Sole Trader / Individual, Partnership).
    Open source under Apache 2.0. No accounts, no servers, no telemetry.

    ## What This Is

    **For small-business owners** — take your trial balance, record your year's adjustments and journals in plain English, and walk away with a print-ready working paper to hand to the ATO via myGov or to your tax agent. No subscription, no paid services in the critical path.

    **For tax agents** — a no-cost workspace for your smaller clients. Multi-client list, fast entity switching, print-ready Form I / Form C / Form T / Form P / BAS / IAS working papers with ATO field codes.

    ## Quick Start

    ### Option 1: Try the demo

    Visit **https://aussieledger.techtaitan.com/demo** to explore AussieLedger with a sample sole-trader entity pre-seeded across FY2025-26. The demo runs in your browser against an isolated `aussieledger-demo` IndexedDB namespace — your real data (if any) is untouched. Click "Exit demo" in the top banner to return to the production app.

    ### Option 2: Clone and self-host

    ```bash
    git clone <repo-url>
    cd AussieLedger
    npm install && npm run build
    npm run dev
    ```

    Visit http://localhost:3000. On first load, you'll be asked to pick **owner mode** (single business) or **agent mode** (multiple clients).

    ## Deployment Shapes

    AussieLedger ships in three shapes from the same codebase.

    ### Single-user local (no server)

    ```bash
    npm install
    npm run dev
    ```
    Data persists in your browser's IndexedDB. Survives cache clear unless you clear site data. Export your data periodically via the Data page.

    ### Small-firm VPS (Vite + Express + SQLite)

    ```bash
    npm install
    npm run build
    npm run build:server
    npm run start:server &
    # serve dist/ via your reverse proxy (Caddy / nginx)
    ```

    Set env vars: `PORT` (default 4000), `DB_PATH` (default ./data/ledger.db), `GEMINI_API_KEY` (optional — enables AI account-matching in TB import). For multi-user access, run behind your reverse proxy with basic auth or VPN.

    Windows dev note: `npm run dev:full` requires Visual Studio Build Tools for the native `better-sqlite3` compile.

    ### Public hosting (Vercel)

    The live demo at **https://aussieledger.techtaitan.com** runs on Vercel's free Hobby tier with a custom domain. To self-host your own public deploy:

    1. Fork this repo on GitHub.
    2. In the [Vercel dashboard](https://vercel.com/new), import your fork as a new project. Vercel auto-detects the Vite preset — no build-command override needed.
    3. (Optional) Set `VITE_HOSTED_MODE` to `true` in Project Settings → Environment Variables. This enables the hosted-mode UI paths (iOS ITP banner, etc.). Leave unset for the self-host paths described above.
    4. Push to `main` — Vercel auto-deploys. CSP + security headers ship via `vercel.json`; SPA deep-link fallback also configured there.
    5. (Optional) Add a custom domain in Project Settings → Domains.

    Never set a `VITE_GEMINI_API_KEY` build-time env var — the `npm run build` script greps the bundle for Gemini-key shapes (`scripts/scan-aiza.mjs`) and exits non-zero if any are found. AI features on the public hosted version are deferred to v5 — see the Optional AI section below.

    ## How It Works

    - **Persistence:** StorageAdapter abstracts the storage layer. LocalAdapter (IndexedDB) + ServerAdapter (HTTP → Express → SQLite). Same SPA bundle, runtime probe picks the shape.
    - **Tax engine:** Pure functions in `src/lib/tax/` consume Chart of Accounts + Journal Entries and produce ATO-label-tagged working papers. Decimal arithmetic throughout (decimal.js).
    - **Print working papers:** `window.print()` + `@media print` CSS. No PDF library. ATO field codes shown alongside plain-English labels.
    - **Year-end wizard:** Guided 7-step flow (confirm → unreconciled → GST codes → unmapped → preview → attest → finalise). Locks the FY when finalised; post-finalise corrections route through Reverse-and-Re-post.
    - **PWA:** Installable to your OS home screen via the browser's URL-bar install affordance. Service worker precaches the SPA shell; updates surface via a non-intrusive banner (never auto-reload mid-form).

    ## Optional: AI Account-Matching

    If `GEMINI_API_KEY` is set in `.env.local` (single-user) or as a server env var (small-firm), the TB import shows an "AI re-match accounts" button. Without a key, you'll see a one-line note saying AI suggestions are disabled — the rest of the app works exactly the same.

    **Hosted AI status:** AI features are not yet available on the public hosted version at `aussieledger.techtaitan.com`. Self-hosting with your own `GEMINI_API_KEY` is the supported path today. Hosted AI (with user-supplied keys, direct browser-to-Google calls, never via an AussieLedger server) is planned for v5 — the CSP allowlist for `generativelanguage.googleapis.com` is already in place.

    ## Privacy

    AussieLedger doesn't set cookies, doesn't load third-party scripts, doesn't ship analytics, and doesn't have a server for your data. The trust signals are documented on the **[/privacy page](https://aussieledger.techtaitan.com/privacy)** on the live deploy — every claim is verifiable in your browser's DevTools.

    ## Contributing

    See [CONTRIBUTING.md](./CONTRIBUTING.md) for dev setup, test patterns, the hard schema-migration rule, and how to add a new FY.

    ## License

    Apache 2.0. See [LICENSE](./LICENSE).

    AussieLedger produces working papers, not tax advice. The lodging entity retains all responsibility for the return.
    ```

    3. Use the Write tool to write the new README.md content over the existing file. The Write tool overwrites — this is intentional for a wholesale restructure.

    4. Verify all 7 existing test-locked phrases are present in the new content:
       - `npm install && npm run build` — YES (line ~26 in the Option 2 Quick Start)
       - `Single-user local` — YES (Deployment Shapes ### heading)
       - `Small-firm VPS` — YES (Deployment Shapes ### heading)
       - `StorageAdapter` — YES (How It Works first bullet)
       - `owner mode` — YES (Option 2 visit instruction)
       - `agent mode` — YES (Option 2 visit instruction)
       - `Apache 2.0` — YES (License section + intro)

    5. CRITICAL — the live-demo URL is `https://aussieledger.techtaitan.com` (the live custom-domain URL per Phase 10). The `/demo` deep-link is `https://aussieledger.techtaitan.com/demo`. The `/privacy` link is `https://aussieledger.techtaitan.com/privacy`. Verify the exact host string spelling.

    6. Length sanity check: target ~120 lines (current 82 + ~38 net = 120). Don't pad. Don't compress. The structure above hits ~115 lines naturally.

    7. NOT in scope per CONTEXT deferred:
       - Persona-segmented sections (For business owners / For tax agents / For developers) — defer to v1.3
       - Real screenshot — defer to v1.3 (use the `> _Screenshot coming v1.3._` italic placeholder note)
       - CODE_OF_CONDUCT / SECURITY.md links — defer to v1.3
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/readme.test.ts</automated>
  </verify>
  <done>
    - README.md is ~120 lines (verify: `wc -l README.md` returns ~110-125)
    - All 7 existing test-locked phrases preserved (readme.test.ts still GREEN)
    - Live-demo URL `https://aussieledger.techtaitan.com` appears at top-of-fold AND in Public hosting section AND in Privacy footer
    - `/demo` and `/privacy` deep-links present
    - Quick Start has two clearly-numbered options (### Option 1 + ### Option 2)
    - Optional AI section honestly annotated with v5-deferral language
    - `[Screenshot coming v1.3]`-style placeholder present (the `> _Screenshot coming v1.3._` blockquote OR a comment-style note — planner picks; either is acceptable per CONTEXT)
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend readme.test.ts with v1.2-specific structure assertions</name>
  <files>
    src/__tests__/readme.test.ts (MODIFIED — add ~6 new assertions; preserve existing 7)
  </files>
  <behavior>
    - Test (NEW 1): README contains the live-demo URL `https://aussieledger.techtaitan.com`
    - Test (NEW 2): README contains the `/demo` deep-link
    - Test (NEW 3): README contains the `/privacy` deep-link
    - Test (NEW 4): README contains a "Privacy" section heading (locks the new section against accidental removal)
    - Test (NEW 5): README contains the v5-deferral language ("planned for v5" appears somewhere)
    - Test (NEW 6): README contains "Try the demo" (locks the Quick Start Option 1 sub-heading text)
    - Test (NEW 7): README has at least 100 lines (CONTEXT spec: ~120 lines final; this is a lower-bound sanity check that catches over-compression to the original 82)
    - All 7 existing assertions remain unchanged
  </behavior>
  <action>
    1. Open `src/__tests__/readme.test.ts`.
    2. PRESERVE the existing 7 `it(...)` blocks byte-identically. The Phase 9 / FND-12 locked content (`npm install && npm run build`, `Single-user local`, `Small-firm VPS`, `StorageAdapter`, `owner mode`, `agent mode`, `Apache 2.0`) MUST continue to pass.
    3. ADD 7 new `it(...)` blocks at the END of the describe block. Pattern:
       ```ts
       it('contains the live-demo URL (POL-04)', () => {
         expect(content).toContain('https://aussieledger.techtaitan.com');
       });

       it('contains the /demo deep-link (POL-04)', () => {
         expect(content).toContain('/demo');
       });

       it('contains the /privacy deep-link (POL-04)', () => {
         expect(content).toContain('/privacy');
       });

       it('contains a Privacy section heading (POL-04)', () => {
         expect(content).toMatch(/^##\s+Privacy/m);
       });

       it('contains the v5-deferral language for AI (POL-04)', () => {
         expect(content).toContain('planned for v5');
       });

       it('contains "Try the demo" Quick Start sub-heading (POL-04)', () => {
         expect(content).toContain('Try the demo');
       });

       it('is at least 100 lines (POL-04 length sanity)', () => {
         const lineCount = content.split('\n').length;
         expect(lineCount).toBeGreaterThanOrEqual(100);
       });
       ```
    4. The "^##\\s+Privacy" multi-line regex ensures the Privacy heading is a standalone H2 section (not just an inline mention of the word "Privacy" in passing). The `m` flag enables `^` to match the start of any line.
    5. CRITICAL — do NOT modify the existing 7 tests. Plan-checker will scrutinise diff: any change to a pre-existing assertion is a regression vector.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/readme.test.ts</automated>
  </verify>
  <done>
    - readme.test.ts now has 14 tests (7 existing + 7 new)
    - All 14 GREEN against the Task-1 restructured README
    - No regression in the original 7 tests (their assertions byte-identical to pre-Phase-14)
  </done>
</task>

</tasks>

<verification>
After both tasks land, run the full plan-level verification:

```
npx vitest run src/__tests__/readme.test.ts       # 14 GREEN
npx vitest run                                     # ALL SPA tests GREEN (no regression from 14-2)
npm run lint                                       # EXIT 0
npm run build                                      # EXIT 0 incl. AIza scan
```

Plus targeted greps:

```
# All locked URLs present
grep -c "aussieledger\\.techtaitan\\.com" README.md     # ≥ 3 (top-of-fold + Public hosting section + Privacy footer; possibly more)
grep -c "/demo" README.md                                # ≥ 1
grep -c "/privacy" README.md                             # ≥ 1
grep -c "planned for v5" README.md                       # ≥ 1

# Length sanity
wc -l README.md                                          # 100-130 range

# Existing tests still locked
grep -F "npm install && npm run build" README.md         # ≥ 1
grep -F "Single-user local" README.md                    # ≥ 1
grep -F "Small-firm VPS" README.md                       # ≥ 1
grep -F "StorageAdapter" README.md                       # ≥ 1
grep -F "owner mode" README.md                           # ≥ 1
grep -F "agent mode" README.md                           # ≥ 1
grep -F "Apache 2.0" README.md                           # ≥ 1
```
</verification>

<success_criteria>
Plan 14-3 is complete when:
- README.md restructured to ~120 lines with the documented section layout
- Top-of-fold has 1-line pitch + live-demo URL + screenshot placeholder
- Quick Start has Option 1 (demo) + Option 2 (clone + self-host) — clearly numbered/labelled
- Deployment Shapes preserves Single-user local + Small-firm VPS + Public hosting Vercel
- Optional AI section honestly states v5-deferral for hosted AI
- Privacy section added with link to live `/privacy` page
- CONTRIBUTING.md link preserved
- All 7 existing readme.test.ts assertions pass byte-identically
- All 7 new POL-04 assertions pass
- Total test count for readme.test.ts: 14 GREEN
- Lint EXIT 0
- Build EXIT 0 incl. AIza scan (the README contains no AIza key shapes — only the regex-shape mention `Gemini-key shapes` which is prose, not a literal key)
- POL-04 closed
</success_criteria>

<output>
After completion, create `.planning/phases/14-release-polish/14-3-SUMMARY.md` documenting:
- 1-2 commits (one per Task; Task 2 may bundle with Task 1 if natural)
- Final README line count
- Confirmation that all 14 readme.test.ts assertions pass
- Notes: this plan closes POL-04, which is the last remaining v1.2 requirement. After Plan 14-3 ships, all of v1.2 is complete — `/gsd:verify-phase 14` + UAT can run next.

Commit message format:

```
docs(14-3): restructure README with audience-first top-of-fold for v1.2 release
test(14-3): add 7 POL-04 content-presence assertions to readme.test.ts

Co-Authored-By: Claude <noreply@anthropic.com>
```
</output>
