---
phase: 15-code-polish
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/PrivacyPage.tsx
  - src/storage/legacy-migration.ts
  - src/storage/__tests__/legacy-migration-demo-guard.test.ts
autonomous: false
requirements: [POL-CODE-01, POL-CODE-02]
user_setup:
  - service: github
    why: "Flip the repository visibility from private to public + set discoverability metadata (description, topics, website) so README + PrivacyPage repo links resolve for anonymous visitors."
    dashboard_config:
      - task: "Open https://github.com/tech-taitan/AussieLedger/settings → scroll to bottom 'Danger Zone' → click 'Change visibility' → choose 'Change to public' → confirm by typing the repo name."
        location: "GitHub repo Settings → Danger Zone"
      - task: "While in Settings → General, set Description to: 'Free Australian bookkeeping → tax return tool. Your data stays in your browser.'"
        location: "GitHub repo Settings → General → About"
      - task: "Set Topics to: australia, tax, accounting, bookkeeping, open-source, react, typescript"
        location: "GitHub repo Settings → General → About → Topics"
      - task: "Set Website to: https://aussieledger.techtaitan.com"
        location: "GitHub repo Settings → General → About → Website"

must_haves:
  truths:
    - "An anonymous browser visiting https://github.com/tech-taitan/AussieLedger receives a 200 response (not 404)."
    - "The GitHub repo About panel shows the AussieLedger description, the 7 topics, and the techtaitan.com website link."
    - "PrivacyPage AI bullet copy honestly reflects current CSP state: no claim that the connect-src allowlist for Gemini is in place today (it was removed during v1.2 close)."
    - "Constructing `new LocalAdapter(DB_NAME_DEMO)` when legacy localStorage keys are populated leaves the demo DB empty AND leaves all 4 legacy keys still present in localStorage."
    - "Constructing `new LocalAdapter(DB_NAME_PROD)` (or zero-arg default) when legacy localStorage keys are populated still migrates them INTO the prod DB and clears the 4 legacy keys — regression-free."
    - "All 5 existing legacy-migration.test.ts tests stay GREEN unchanged."
    - "All 8 existing PrivacyPage.test.tsx tests stay GREEN; the VERBATIM_AI_BULLET constant in PrivacyPage.test.tsx is updated in lockstep with the source-file edit if (and only if) the bullet text changes."
  artifacts:
    - path: "src/storage/legacy-migration.ts"
      provides: "Early-return guard: skips migration entirely when adapter.getDbName() === DB_NAME_DEMO."
      contains: "DB_NAME_DEMO"
    - path: "src/storage/__tests__/legacy-migration-demo-guard.test.ts"
      provides: "2-test suite covering POL-CODE-02 demo-skip + prod-still-migrates regression guard."
      contains: "DB_NAME_DEMO"
      min_lines: 60
    - path: "src/components/PrivacyPage.tsx"
      provides: "Honest AI bullet copy reflecting v5-deferral + current vercel.json CSP state (no claim CSP allowlist is in place today)."
      contains: "GEMINI_API_KEY"
  key_links:
    - from: "src/storage/legacy-migration.ts"
      to: "src/storage/local.ts DB_NAME_DEMO export"
      via: "import { DB_NAME_DEMO } from './local'"
      pattern: "DB_NAME_DEMO"
    - from: "src/storage/legacy-migration.ts"
      to: "LocalAdapter.getDbName() duck-typed accessor (Phase 14 Plan 14-1)"
      via: "adapter.getDbName() === DB_NAME_DEMO early return at top of migrateLegacyLocalStorage"
      pattern: "adapter\\.getDbName\\(\\)"
    - from: "src/storage/__tests__/legacy-migration-demo-guard.test.ts"
      to: "src/storage/local.ts (DB_NAME_PROD + DB_NAME_DEMO + LocalAdapter)"
      via: "constructs both adapters and asserts demo isolation + prod migration"
      pattern: "new LocalAdapter\\("
---

<objective>
Close 2 of the 5 Phase 15 requirements:

- **POL-CODE-01** — flip the GitHub repo public + set discoverability metadata (description, topics, website) via a `checkpoint:human-action` task, then have the orchestrator re-verify via anonymous GitHub REST API. Also folds the PrivacyPage AI bullet honesty check (read the current source — if it still claims "CSP allowlist is already in place" then surgically rewrite to "...will be added in v5 alongside the AI flows"; if it already reads honestly per the Phase 14 ship, leave the source byte-identical and document the no-op decision in the commit message).
- **POL-CODE-02** — `migrateLegacyLocalStorage(adapter)` widened with an early-return guard: when `adapter.getDbName() === DB_NAME_DEMO`, skip the migration entirely (no read, no write, no clear). Closes v1.2 audit AMBER #2.

Purpose: Closes the two v1.2-audit-RED + v1.2-audit-AMBER items that are smallest in surface area and includes the one human-action gate Phase 15 needs (repo visibility flip). Landing 15-1 first lets the larger UI work in 15-2 proceed without the orchestrator pausing mid-UI for a GitHub Settings round-trip.

Output:
- 3 file diffs (1 source modified, 1 source possibly modified, 1 test created)
- GitHub repo visibility flipped from private to public
- GitHub repo About panel populated with description + 7 topics + techtaitan.com website
- 2 new SPA tests GREEN (1185 SPA GREEN total — baseline 1183 + 2)
- 0 PrivacyPage tests regressed (8 stay GREEN)
- 0 legacy-migration tests regressed (5 stay GREEN)
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/15-code-polish/15-CONTEXT.md
@.planning/milestones/v1.2-MILESTONE-AUDIT.md
@.planning/milestones/v1.2-phases/14-release-polish/14-CONTEXT.md

# Source files this plan reads / modifies
@src/components/PrivacyPage.tsx
@src/components/__tests__/PrivacyPage.test.tsx
@src/storage/legacy-migration.ts
@src/storage/local.ts
@src/storage/__tests__/legacy-migration.test.ts

<interfaces>
<!-- Key contracts the executor needs. Embedded so no codebase scavenger-hunt is required. -->

From src/storage/local.ts (Phase 14 Plan 14-1 — already shipped):
```typescript
export const DB_NAME_PROD = 'aussieledger';
export const DB_NAME_DEMO = 'aussieledger-demo';

export class LocalAdapter implements StorageAdapter {
  constructor(dbName: string = DB_NAME_PROD);
  ready(): Promise<void>;
  // ... standard 12-method StorageAdapter interface omitted ...

  // Duck-typed accessor (NOT on StorageAdapter interface) — added in Phase 14 Plan 14-1:
  getDbName(): string;
}
```

From src/storage/legacy-migration.ts (current shipped shape — pre-Phase-15):
```typescript
import { migrate, type PersistedRoot } from '../lib/migrations';
import type { LocalAdapter } from './local';

const LEGACY_KEYS = [
  'ledger_entities_list',
  'ledger_all_entries',
  'ledger_chart_of_accounts',
  'ledger_audit_logs',
] as const;

export async function migrateLegacyLocalStorage(adapter: LocalAdapter): Promise<void> {
  // ... reads 4 legacy localStorage keys, parses, calls adapter.importAll({ silent: true }),
  //     then clears the 4 keys on success.
}
```

POL-CODE-02's guard is a 2-line addition at the TOP of this function:
```typescript
// Phase 15 POL-CODE-02 — demo DB never inherits legacy localStorage migration.
if (adapter.getDbName() === DB_NAME_DEMO) return;
```
Plus the `DB_NAME_DEMO` import line at the top of the file.

From src/components/PrivacyPage.tsx (current shipped shape — Phase 14 Plan 14-2):
```typescript
// Line 63-68 — the AI bullet as currently shipped:
<li data-testid="privacy-ai-bullet">
  AI features are not available on the public hosted version. Self-host
  with your own <code>GEMINI_API_KEY</code> on a local Express server
  to enable AI account-matching today. The public hosted build does not
  send data to Google.
</li>
```

IMPORTANT — current shipped wording does NOT contain "CSP allowlist is already in place".
Phase 14-2 EXECUTOR DIVERGED from the plan and shipped honest wording already.
README.md line 85 similarly reads honestly: "The public hosted build does not send data to Google."
So the POL-CODE-01 "wording fix" task may be a CHECK-AND-NO-OP — see Task 1 instructions.

From src/components/__tests__/PrivacyPage.test.tsx (current — locks the AI bullet verbatim):
```typescript
const VERBATIM_AI_BULLET =
  'AI features are not available on the public hosted version. Self-host with your own GEMINI_API_KEY on a local Express server to enable AI account-matching today. The public hosted build does not send data to Google.';
```
If the source bullet changes, this constant changes in lockstep — same commit.
</interfaces>

<repo_facts>
- Baseline tests: 1183 SPA GREEN + 11 todo + 0 RED; 18 server GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan + PWA contract tests)
- The PrivacyPage AI bullet in the SHIPPED code (Phase 14 Plan 14-2) does NOT contain "the CSP allowlist is already in place" — Plan 14-2 executor wrote a different sentence than the plan dictated. CONTEXT references the planned wording, not the shipped wording.
- README.md line 85 also reads honestly already ("The public hosted build does not send data to Google.") — no README change needed in POL-CODE-01.
- vercel.json `connect-src` was tightened by user during v1.2 close (removed `https://generativelanguage.googleapis.com`); current CSP is `connect-src 'self'`. No vercel.json edits in Phase 15.
- StorageAdapter interface is FINAL (12 methods). POL-CODE-02 only touches the legacy-migration function body — does NOT add methods to LocalAdapter or StorageAdapter.
- LocalAdapter.getDbName() already exists from Phase 14 Plan 14-1 (duck-typed accessor; not on StorageAdapter interface).
- Sidebar test file location: `src/components/__tests__/Sidebar.test.tsx` (NOT `src/components/shell/__tests__/Sidebar.test.tsx` as CONTEXT incorrectly states). Reference the correct path in Plan 15-2.
- SPDX header required on `src/storage/__tests__/legacy-migration-demo-guard.test.ts` (the only new source file in this plan). The spdx-headers.test.ts (`src/__tests__/spdx-headers.test.ts`) is a `describe.it.each(files)` parametric test that auto-discovers .ts/.tsx under `src/` excluding `__tests__/` directories — meaning TEST files are NOT covered by the SPDX parametric assertion. However, project convention has every test file ship with an SPDX header anyway (verified by reading existing test files). Include the header.
</repo_facts>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: POL-CODE-01 — flip GitHub repo to public + set metadata + verify PrivacyPage AI bullet honesty</name>
  <files>src/components/PrivacyPage.tsx, src/components/__tests__/PrivacyPage.test.tsx</files>
  <what-built>
    Phase 14 shipped a private GitHub repo. README.md:91-and-friends + src/components/PrivacyPage.tsx repo links all 404 to anonymous visitors. This is the v1.2 audit RED finding. POL-CODE-01 flips the repo public via the GitHub Settings UI (one click; ~10s of user time) and sets discoverability metadata in the same Settings round-trip so the open-source-promise + Apache-2.0-link resolves cleanly for anonymous browsers.

    Also folds the PrivacyPage AI bullet honesty check — CONTEXT references planned wording ("CSP allowlist will be added in v5 alongside the AI flows") but the SHIPPED Phase 14-2 source diverged from that plan and wrote a different honest sentence ("The public hosted build does not send data to Google."). The Phase 15 executor must READ the current `src/components/PrivacyPage.tsx` lines 63-68, READ `src/components/__tests__/PrivacyPage.test.tsx` VERBATIM_AI_BULLET constant, and CONFIRM the shipped wording is already honest about CSP state (no claim that allowlist is in place today). If honest → leave source byte-identical, commit with message documenting the no-op decision. If still contains "CSP allowlist is already in place" → rewrite to one of:
      (a) "...is planned for v5 — the CSP allowlist will be added alongside the AI flows when v5 ships."
      (b) "...The public hosted build does not send data to Google." (the shipped honest sentence)
    and update VERBATIM_AI_BULLET in PrivacyPage.test.tsx in the SAME commit (test stays GREEN). Choose (b) — it's already the shipped form, so the test constant already matches.
  </what-built>
  <how-to-verify>
    1. Open https://github.com/tech-taitan/AussieLedger/settings in a browser logged in as the repo owner.
    2. Scroll to the bottom "Danger Zone" section.
    3. Click "Change visibility" → "Change to public" → confirm by typing the repo name (`tech-taitan/AussieLedger`) and clicking the red confirm button.
    4. Scroll back to top → Settings → General → About panel (right side; click the gear icon if collapsed).
    5. Set **Description** to (paste verbatim, including the em-dash arrow):

       `Free Australian bookkeeping → tax return tool. Your data stays in your browser.`
    6. Set **Topics** to (comma-separated; type each then press Enter):

       `australia, tax, accounting, bookkeeping, open-source, react, typescript`
    7. Set **Website** to:

       `https://aussieledger.techtaitan.com`
    8. Click "Save changes" in the About panel.
    9. In a NEW INCOGNITO / PRIVATE browser window (no GitHub login), navigate to https://github.com/tech-taitan/AussieLedger. You should see the repo landing page (not a 404). The About panel on the right should show the description + topics + website URL.
    10. Reply `done` to the orchestrator so it can run the anonymous verify probe.

    AFTER user replies done, orchestrator runs the verify command:

    ```powershell
    # PowerShell — anonymous GitHub REST API probe
    $r = Invoke-WebRequest -Uri 'https://api.github.com/repos/tech-taitan/AussieLedger' -Method Get -UseBasicParsing
    $j = $r.Content | ConvertFrom-Json
    "private = $($j.private)"           # expects: False
    "visibility = $($j.visibility)"     # expects: public
    "description = $($j.description)"   # expects: starts with 'Free Australian bookkeeping'
    "topics = $($j.topics -join ',')"   # expects: contains australia + tax + bookkeeping
    "homepage = $($j.homepage)"         # expects: https://aussieledger.techtaitan.com
    ```

    Expected JSON shape: `{ "private": false, "visibility": "public", "description": "Free Australian...", "topics": ["australia","tax","accounting","bookkeeping","open-source","react","typescript"], "homepage": "https://aussieledger.techtaitan.com" }`.

    If any field is wrong, push the failure back to the user and re-pause for fixup. If all fields are right, proceed to the PrivacyPage honesty check (executor reads the file).
  </how-to-verify>
  <action>
    AFTER orchestrator confirms the anonymous GitHub probe passes:

    1. Read `src/components/PrivacyPage.tsx` lines 63-68.
    2. Read `src/components/__tests__/PrivacyPage.test.tsx` lines 22-24 (VERBATIM_AI_BULLET constant).
    3. Decision tree:
       - If the source bullet contains the string `"CSP allowlist is already in place"` → REWRITE the bullet to the verbatim shipped honest sentence: `AI features are not available on the public hosted version. Self-host with your own GEMINI_API_KEY on a local Express server to enable AI account-matching today. The public hosted build does not send data to Google.` (preserving the `<li data-testid="privacy-ai-bullet">` wrapper + the `<code>GEMINI_API_KEY</code>` markup). Update VERBATIM_AI_BULLET in PrivacyPage.test.tsx in lockstep. Commit message: `fix(15-1): correct PrivacyPage AI bullet to reflect current CSP state`.
       - If the source bullet does NOT contain `"CSP allowlist is already in place"` (the expected current state per repo_facts) → leave both files byte-identical. NO commit for this step; document the no-op in the eventual Plan 15-1 SUMMARY.
    4. Run `npm test -- src/components/__tests__/PrivacyPage.test.tsx` → all 8 tests GREEN regardless of branch.
    5. Run `git diff src/components/PrivacyPage.tsx src/components/__tests__/PrivacyPage.test.tsx` to confirm the change shape (either empty diff or the bullet edit + test constant update).

    Then commit ONLY the repo-visibility verification artefact (no source changes needed if no-op branch hit). The repo flip itself produces zero git diff — it's a GitHub Settings change, not a code change.
  </action>
  <verify>
    <automated>npm test -- src/components/__tests__/PrivacyPage.test.tsx</automated>
    Manual: `curl -s https://api.github.com/repos/tech-taitan/AussieLedger | grep -E '"private"|"visibility"|"description"|"homepage"'` returns `private: false`, `visibility: public`, description starts with `Free Australian`, homepage `https://aussieledger.techtaitan.com`.
  </verify>
  <done>
    - Anonymous probe of api.github.com/repos/tech-taitan/AussieLedger returns 200 with `private: false`, `visibility: "public"`, description set, topics array has all 7 entries, homepage set.
    - PrivacyPage.test.tsx 8 tests GREEN (either against unchanged source or against the corrected source + updated VERBATIM_AI_BULLET).
    - If source was changed: 1 commit `fix(15-1): correct PrivacyPage AI bullet to reflect current CSP state` with src/components/PrivacyPage.tsx + src/components/__tests__/PrivacyPage.test.tsx in the same commit.
    - If source was unchanged (expected per repo_facts): no commit; SUMMARY documents the no-op decision and cites that the Phase 14-2 executor had already shipped the honest wording.
  </done>
  <resume-signal>User replies "done" after flipping the repo + setting metadata. Orchestrator runs the anonymous probe; if all 5 fields match expected, proceeds to the PrivacyPage check. If any field is wrong, orchestrator pauses again with specific remediation instructions.</resume-signal>
</task>

<task type="auto" tdd="true">
  <name>Task 2: POL-CODE-02 — legacy-migration demo-DB guard + 2-test regression suite</name>
  <files>src/storage/legacy-migration.ts, src/storage/__tests__/legacy-migration-demo-guard.test.ts</files>
  <behavior>
    - Test 1 (demo skips migration): Pre-populate all 4 legacy localStorage keys with valid JSON. Construct `new LocalAdapter(DB_NAME_DEMO)` and await `ready()`. Assert `(await adapter.getEntities()).length === 0` (demo DB stayed empty — migration did NOT run). Assert all 4 legacy keys are STILL present in localStorage (NOT cleared — migration did not clear).
    - Test 2 (prod still migrates — regression guard): Pre-populate all 4 legacy localStorage keys with valid JSON containing 1 entity. Construct `new LocalAdapter(DB_NAME_PROD)` and await `ready()`. Assert `(await adapter.getEntities()).length >= 1` (entity migrated INTO prod DB). Assert all 4 legacy keys are NULL in localStorage (cleared after successful migration — Phase 11 contract preserved).

    Test setup notes:
    - Both tests must `beforeEach(() => localStorage.clear())` so they don't bleed.
    - Both tests must use `await indexedDB.deleteDatabase(DB_NAME_DEMO)` and `await indexedDB.deleteDatabase(DB_NAME_PROD)` in `beforeEach` to avoid cross-test IDB state leak (fake-indexeddb persists across tests within a file by default). Wrap in `await new Promise(r => { const req = indexedDB.deleteDatabase(name); req.onsuccess = () => r(undefined); req.onerror = () => r(undefined); req.onblocked = () => r(undefined); })` for safety.
    - Legacy key shape: `ledger_entities_list` = JSON.stringify of `[{ id, name, type, status }]`; `ledger_all_entries` = `{}`; `ledger_chart_of_accounts` = `[]`; `ledger_audit_logs` = `[]`. Match the shapes used in the existing `src/storage/__tests__/legacy-migration.test.ts` (read that file before writing tests so the data shapes match).
  </behavior>
  <action>
    1. RED step (test-first):
       a. Create `src/storage/__tests__/legacy-migration-demo-guard.test.ts` with SPDX Apache-2.0 header.
       b. Import `{ describe, it, expect, beforeEach } from 'vitest'`, `{ LocalAdapter, DB_NAME_PROD, DB_NAME_DEMO } from '../local'`.
       c. Write `beforeEach` that clears localStorage + deletes both IDB databases (see behavior notes above for the deleteDatabase Promise wrapper).
       d. Write Test 1 (demo skips migration) and Test 2 (prod still migrates). Match data shape conventions from the existing `legacy-migration.test.ts`.
       e. Run `npm test -- src/storage/__tests__/legacy-migration-demo-guard.test.ts` → Test 1 MUST FAIL (currently the guard doesn't exist; demo DB would get the migration). Test 2 should already PASS (current code migrates to whatever DB is constructed).
       f. Commit RED: `test(15-1): RED — legacy-migration demo-DB guard tests (POL-CODE-02)`.

    2. GREEN step (minimal implementation):
       a. Edit `src/storage/legacy-migration.ts`:
          - Add `import { DB_NAME_DEMO } from './local';` at the top alongside the existing imports.
          - At the TOP of `migrateLegacyLocalStorage(adapter)`, add the early-return guard BEFORE the `typeof localStorage === 'undefined'` check:
            ```typescript
            // Phase 15 POL-CODE-02 — demo DB never inherits legacy localStorage migration.
            // Guards against the v1.2-audit-AMBER scenario where a pre-Phase-11 user
            // who lands on /demo BEFORE / has their legacy localStorage migrated INTO
            // the demo DB and legacy keys cleared, leaving prod DB empty on subsequent /
            // visit. The guard is single source of truth — no caller-side check needed.
            if (adapter.getDbName() === DB_NAME_DEMO) return;
            ```
          - Update the file-level JSDoc block to mention the Phase 15 guard alongside the existing Phase 11 silent-import notes.
       b. Run `npm test -- src/storage/__tests__/legacy-migration-demo-guard.test.ts` → both tests MUST PASS.
       c. Run `npm test -- src/storage/__tests__/legacy-migration.test.ts` → all 5 existing tests MUST STILL PASS (regression).
       d. Run `npm test` → 1185 SPA GREEN + 11 todo + 0 RED (1183 baseline + 2 new tests).
       e. Run `npm run lint` → EXIT 0.
       f. Run `npm run build` → EXIT 0 (incl. AIza scan).
       g. Commit GREEN: `feat(15-1): guard legacy-migration against demo DB construction (POL-CODE-02)`.
  </action>
  <verify>
    <automated>npm test -- src/storage/__tests__/legacy-migration-demo-guard.test.ts src/storage/__tests__/legacy-migration.test.ts</automated>
    Additional regression-confidence commands:
    - `npm test` (full SPA suite) → 1185 SPA GREEN + 11 todo + 0 RED expected.
    - `npm run lint` → EXIT 0.
    - `npm run build` → EXIT 0 (PWA contract tests + AIza scan unchanged).
  </verify>
  <done>
    - `src/storage/legacy-migration.ts` has the 2-line guard at the top of `migrateLegacyLocalStorage` + the `DB_NAME_DEMO` import + updated JSDoc comment.
    - `src/storage/__tests__/legacy-migration-demo-guard.test.ts` exists with SPDX header + 2 GREEN tests.
    - Existing `src/storage/__tests__/legacy-migration.test.ts` 5 tests still GREEN (no regression).
    - Full SPA suite 1185 GREEN; lint EXIT 0; build EXIT 0.
    - 2 commits on origin: RED (test only) + GREEN (source + JSDoc) — both with Co-Authored-By Claude per project convention.
  </done>
</task>

</tasks>

<verification>
Plan-level verification (orchestrator runs after Task 2):

1. **POL-CODE-01 verified:**
   - `Invoke-WebRequest https://api.github.com/repos/tech-taitan/AussieLedger | ConvertFrom-Json` returns `private: false` + `visibility: 'public'` + description starts with `Free Australian` + topics array has 7 entries + homepage `https://aussieledger.techtaitan.com`.
   - `npm test -- src/components/__tests__/PrivacyPage.test.tsx` → 8 GREEN.

2. **POL-CODE-02 verified:**
   - `npm test -- src/storage/__tests__/legacy-migration-demo-guard.test.ts` → 2 GREEN.
   - `npm test -- src/storage/__tests__/legacy-migration.test.ts` → 5 GREEN (no regression).
   - `grep -n "DB_NAME_DEMO" src/storage/legacy-migration.ts` → 2 matches (the import + the guard).
   - `grep -n "getDbName" src/storage/legacy-migration.ts` → 1 match (the guard condition).

3. **Full suite:**
   - `npm test` → 1185 SPA GREEN + 11 todo + 0 RED.
   - `npm run lint` → EXIT 0.
   - `npm run build` → EXIT 0 (incl. AIza scan).
   - `git log --oneline origin/main..HEAD` → 2 commits (Task 2 RED + GREEN) IF Task 1 hit the no-op branch, else 3 commits (Task 1 source-fix + Task 2 RED + Task 2 GREEN).
</verification>

<success_criteria>
- POL-CODE-01 closed end-to-end: GitHub repo public + metadata set + anonymous probe passes + PrivacyPage wording verified honest.
- POL-CODE-02 closed end-to-end: legacy-migration guard in place; demo DB cannot inherit legacy keys; prod path still migrates as before.
- 1185 SPA GREEN (baseline 1183 + 2 new legacy-migration-demo-guard tests).
- 0 PrivacyPage / legacy-migration regressions.
- All commits on origin/main; ready for Plan 15-2 to start (Wave 2; no shared files with 15-2 → would parallelise, but sequencing 15-1 first lets the human-action checkpoint resolve before the larger UI work begins).
</success_criteria>

<output>
After completion, create `.planning/phases/15-code-polish/15-1-SUMMARY.md` covering:
- Repo flip outcome (link to the anonymous probe output captured at verify time)
- PrivacyPage wording decision (no-op vs surgical-fix branch chosen + why)
- Legacy-migration guard diff (~5 lines added to the function + 1 import)
- New test file shape (60-80 lines; 2 tests; SPDX header)
- Commit list (2-3 commits depending on branch)
- Test count delta (+2 SPA GREEN)
- Any deviations from plan documented (Rule-3 transparency)
</output>
