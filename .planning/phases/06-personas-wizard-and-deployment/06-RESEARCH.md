---
phase: 6
slug: personas-wizard-and-deployment
type: research
status: complete
created: 2026-05-29
---

# Phase 6: Personas, Wizard, and Deployment — Research

**Researched:** 2026-05-29
**Domain:** React 19 tooltip primitives, v4→v5 StorageAdapter widening, Tailwind v4 mobile-responsive patterns, schema migration, Apache 2.0 licensing, open-source deployment polish
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- Reuse Phase-5 `AnomalyBadge`, `AssumptionsBlock`, all 5 tax-return components, print.css
- Reuse Phase-4 `useJournals.reversePosted` for post-finalise corrections
- Reuse Phase-3 `IS_AI_ENABLED` / `isAiEnabled()` for the gated-AI affordance
- Additive v4→v5 migration only (Phase 3 invariant); round-trip test required
- Apache 2.0 license (already in per-file SPDX headers)
- No new PDF library — `window.print()` is the export mechanism
- No bulk operations in agent mode (v1)
- No family-Medicare-threshold engine (v2)
- Help text NEVER states whether an expense is deductible
- Mobile responsive scope = JournalForm + TrialBalance + return preview ONLY (verbatim UX-04)
- Tooltip primitive = Radix UI tooltip (CONTEXT.md "need to verify React 19 compat at planning time" — VERIFIED below)
- `Settings` becomes a new top-level key in the StorageAdapter root (alongside entities/accounts/entries/auditLogs)
- `Settings.mode: 'owner' | 'agent'` stored per-instance; first-run modal sets it; later via Settings page
- Owner mode: hides entity switcher + bulk-ops chrome entirely; auto-selects primary entity
- Agent mode: multi-client list with FY-status badges; recent-5 quick-switch; no bulk ops in v1
- Unmapped-accounts gate = hard block on Finalise only, not on step advancement
- Attestation = checkbox + typed entity legal name (case-insensitive)
- Wizard state persists per-FY on Entity: `Entity.wizardState[fy]`
- `AnomalyBadge` severity stays `'info' | 'warn'` (no `'error'` in v1)
- ATO label help = hover tooltip on screen + always-expanded inline on print
- Hard-coded `helpText` field added additively to `src/lib/tax/labels/fy2026.ts`
- Mobile responsiveness = JournalForm + TrialBalance + return preview at 375px (others get "use wider screen" fallback)
- README rewrite = audience-first (owner paragraph, agent paragraph, quick start, two deployment shapes)
- CONTRIBUTING.md covers: dev setup, test patterns, the hard schema-migration rule, how to add a new FY, PR template
- Apache 2.0 full text in root LICENSE (matching per-file SPDX headers)
- AI features gate: `isAiEnabled()` already exported from `src/lib/ai.ts`; Phase 6 adds the "requires Gemini API key (optional)" inline note in ImportTB when `isAiEnabled()` returns false

### Claude's Discretion

- Exact wizard step list (whether "preview" is one step or split), exact micro-copy, exact Sidebar layout under owner vs agent, exact mobile breakpoints (Tailwind `sm:` / `md:` defaults), exact PR-template fields, CONTRIBUTING.md tone, step-1 "stats line" content
- Tooltip mobile behaviour (tap-to-toggle vs hover)
- Whether anomaly Sidebar badges are click-jumpable (nice-to-have if cheap)
- Whether first-run modal can be re-triggered from Settings
- Whether wizard CTA on entity dashboard is a hero card or banner

### Deferred Ideas (OUT OF SCOPE)

- Bulk operations in agent mode
- Family Medicare levy threshold engine
- Multi-FY catch-up wizard
- Per-user help-text overrides
- Live-fetched ATO instruction text
- CODE_OF_CONDUCT.md + SECURITY.md
- Anomaly fix-it deep-links (planner discretion)
- Trust streaming UI
- Non-portfolio dividend BRE per-account flagging
- Direct ATO / myGov lodgement
- Top-bar anomaly bell + global dropdown
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| UX-01 | Year-end preparation wizard: sequenced flow from FY+entity confirmation to finalise | Wizard step schema, ViewRouter new route, Phase-5 renderer embedding, attestation friction pattern |
| UX-02 | Anomaly flags in-context on relevant screens (not only a report) | AnomalyBadge insertion points in JournalForm/TrialBalance/CoaTreeView; anomaly sources documented below |
| UX-03 | Every ATO label in tax outputs has plain-English in-context help; help text never states deductibility | helpText widening of fy2026.ts; Radix tooltip primitive confirmed React 19 compatible; print.css additive rule |
| UX-04 | Core flows (JournalForm, TB, return preview) work at 375px | Tailwind v4 mobile-first patterns; existing classes audited; no-breakpoint defaults serve 375px |
| UX-05 | User can switch between owner mode and agent mode | Settings.mode field; first-run modal; Sidebar/ViewRouter mode-aware rendering |
| PERS-01 | Owner mode: primary entity dashboard with wizard one click away | Owner mode Sidebar simplification; primaryEntityId auto-select rule; ViewRouter landing gate |
| PERS-02 | Agent mode: client list with fast switching and wizard-status badges | MasterDashboard reuse + wizardState badges; recent-5 quick-switch |
| PERS-03 | Mode is per-instance setting; switching modes preserves data | Settings.mode stored in StorageAdapter root; mode switch never touches entity/journal data |
| DEP-01 | Clone + install + build with no paid services = working instance | Existing build chain already satisfies; AI affordance makes the gate visible |
| DEP-03 | README documents both deployment shapes | README rewrite with audience-first + two-shape deployment section |
| DEP-04 | Apache 2.0 LICENSE + CONTRIBUTING.md with schema-migration rule | Full Apache 2.0 text confirmed; SPDX headers already present; migration rule wording documented |
</phase_requirements>

---

## Summary

Phase 6 is an additive orchestration phase. It builds no new tax logic; it connects the five-phase foundation into two coherent user experiences (owner mode and agent mode), surfaces anomalies and help text in-context, wraps the year-end workflow in a step-by-step wizard, and closes the open-source deployment gap. Every implementation question resolves to either "reuse existing Phase N asset" or "widen additive schema field". There are no rewrite-level risks.

The three external verification questions from the roadmap are now resolved: (1) `@radix-ui/react-tooltip@1.2.8` explicitly declares `react: "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc"` — React 19 compat confirmed; (2) `@react-pdf/renderer` has supported React 19 since v4.1.0 (current v4.5.1), but Phase 6 does NOT install it — `window.print()` is the locked decision; (3) the StorageAdapter interface is FINAL from Phase 3 and must not be widened — Settings lives as a new top-level key inside the persisted JSON root (`PersistedRoot._v: 5`), read/written via the existing `importAll` / `exportAll` + a new `getSettings` / `saveSettings` thin wrapper, or (simpler) folded into a single `settings?: Settings` field on `PersistedRoot` read by a new lightweight `useSettings` hook with its own `localStorage`-style `getSettings()` / `saveSettings()` pair piped through the adapter via a minimal extension.

**Primary recommendation:** Add `Settings` as a new top-level key on `PersistedRoot` (not a new adapter method). Widen the `LocalAdapter`/`ServerAdapter` to handle `settings` in `exportAll`/`importAll`. Add two new methods `getSettings()` + `saveSettings()` to the `StorageAdapter` interface (this IS a widening — see the critical note in Architecture Patterns). Alternatively, persist `Settings` purely client-side in `localStorage` under a fixed key `aussieledger:settings` — which keeps the StorageAdapter FINAL and avoids a server-side schema change. The localStorage-for-settings approach is acceptable because Settings (mode + primaryEntityId) are per-browser-instance by design; no cross-device sync required.

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | ^19.0.0 | Component rendering | Project stack |
| tailwindcss | ^4.1.14 | Utility CSS + responsive classes | Project stack |
| lucide-react | ^0.546.0 | Icon set incl. HelpCircle (tooltip "?"), WandSparkles (wizard) | Project stack |
| motion | ^12.23.24 | Wizard step transitions, modal animations | Project stack |

### New dependency — Tooltip primitive
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @radix-ui/react-tooltip | ^1.2.8 | Accessible hover tooltip for ATO label help ("?" icon) | React 19 compat confirmed; zero JS for simple cases; WAI-ARIA compliant; no full UI kit needed |

**React 19 compatibility confirmed:** `@radix-ui/react-tooltip@1.2.8` declares `peerDependencies: { react: "^16.8 || ^17.0 || ^18.0 || ^19.0 || ^19.0.0-rc" }`. No `--legacy-peer-deps` needed. (Source: unpkg.com/@radix-ui/react-tooltip@1.2.8/package.json)

**Known React 19 caveat:** There was a reported issue (GitHub issue #3043) where `Tooltip.Content` with `asChild` throws on React 19 hover. The fix is to not pass `asChild` to `Tooltip.Content` — the default (non-asChild) renders fine. Do NOT use `asChild` on `Tooltip.Content`.

**Installation:**
```bash
npm install @radix-ui/react-tooltip
```

### No additional runtime deps
The project already has everything else Phase 6 needs. All wizard logic, persona mode, and anomaly counting are pure React + existing hooks. No state management library (no Zustand, no Jotai) is needed — the existing `useSettings` hook pattern (see Architecture Patterns) is sufficient.

---

## Architecture Patterns

### Recommended Project Structure (new files only)
```
src/
├── lib/
│   ├── persona.ts                  # Settings type, useSettings hook, persona helpers
│   └── migrations/
│       └── v4-to-v5.ts             # Additive v4→v5 migration
├── components/
│   ├── YearEndWizard.tsx           # Top-level wizard orchestrator
│   ├── wizard/
│   │   ├── Step1Confirm.tsx        # FY + entity + completeness check
│   │   ├── Step2Unreconciled.tsx   # Review unreconciled items
│   │   ├── Step3GstCodes.tsx       # CoA GST-code confirm
│   │   ├── Step4UnmappedAccounts.tsx # Gate — hard block on Finalise
│   │   ├── Step5Preview.tsx        # Embeds Phase-5 renderer
│   │   ├── Step6Attestation.tsx    # Checkbox + typed entity-name
│   │   └── Step7Finalise.tsx       # Writes returnStatusByFy + wizardState
│   ├── PersonaModeModal.tsx        # First-run "owner or agent?" modal
│   ├── AiGateNote.tsx              # "AI suggestions disabled" inline note (DEP-01 + FND-04)
│   └── LabelTooltip.tsx            # Radix tooltip wrapper for ATO label help
```

### Pattern 1: Settings Persistence (Recommended — localStorage for per-instance state)

**What:** `Settings.mode` and `Settings.primaryEntityId` are per-browser-instance settings. They do NOT need to survive data export/import (they describe how THIS browser shows data, not the data itself). Store in `localStorage` under a stable key, wrapped in a `useSettings` hook.

**Why this beats adapter widening:** The StorageAdapter interface is FINAL from Phase 3 (a core invariant). Widening it for two small fields means touching `adapter.ts`, `local.ts`, `server.ts`, server routes, SQL schema, and the full test suite. The localStorage approach keeps the boundary intact and is semantically correct — mode is an instance config, not entity data.

**Implementation:**
```typescript
// src/lib/persona.ts
// Source: pattern inferred from Phase 3 StorageAdapter FINAL invariant

export interface Settings {
  mode: 'owner' | 'agent';
  primaryEntityId?: string;  // auto when one entity; set via radio otherwise
}

const SETTINGS_KEY = 'aussieledger:settings';

export function getSettings(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(s: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

export function useSettings() {
  const [settings, setSettingsState] = React.useState<Settings | null>(
    () => getSettings()
  );

  const setSettings = React.useCallback((s: Settings) => {
    saveSettings(s);
    setSettingsState(s);
  }, []);

  return { settings, setSettings };
}
```

**First-run detection:** `getSettings() === null` means first run. Show `PersonaModeModal`. Once the user picks, call `setSettings({ mode: 'owner' | 'agent' })`.

### Pattern 2: v4→v5 Additive Schema Migration

**What:** Phase 6 widens `Entity` with two optional fields. Schema bumps from `_v: 4` to `_v: 5`. StorageAdapter is UNTOUCHED.

**New Entity fields:**
```typescript
// src/types.ts additions (additive only — no removals)

export interface Entity {
  // ... existing fields unchanged ...
  // _v:5 additions (Phase 6)
  /** Draft/finalised lifecycle per FY. 'draft' = working paper; 'finalised' = locked. */
  returnStatusByFy?: Record<string, 'draft' | 'finalised'>;
  /** Wizard resume state per FY. Step is 1-indexed (1=Confirm, 7=Finalise). */
  wizardState?: Record<string, WizardStateFy>;
}

export interface WizardStateFy {
  step: number;                    // 1–7, current wizard step
  dismissedAnomalies: string[];    // anomaly IDs dismissed by user
  completedAt?: string;            // ISO timestamp when finalised
}
```

**Migration shape:**
```typescript
// src/lib/migrations/v4-to-v5.ts
export function migrateV4ToV5(state: PersistedRoot): PersistedRoot {
  if ((state._v as number) >= 5) return state;
  return {
    ...state,
    _v: 5,
    entities: (state.entities as Entity[] ?? []).map(e => ({
      ...e,
      // Both optional; absent = no wizard state or return status set
      returnStatusByFy: e.returnStatusByFy,
      wizardState: e.wizardState,
    })),
  };
}
```

**Migration index update:** Add `4: migrateV4ToV5` to the `MIGRATIONS` registry; bump `CURRENT_VERSION` to 5.

### Pattern 3: Radix UI Tooltip for ATO Label Help

**What:** A reusable `<LabelTooltip>` wrapper renders a "?" icon next to every ATO label. On hover (desktop) or tap (mobile), shows the `helpText` from `fy2026.ts`. On print, the tooltip text renders inline as a subtitle using print.css rules.

**Implementation:**
```typescript
// src/components/LabelTooltip.tsx
// Source: https://www.radix-ui.com/primitives/docs/components/tooltip

import * as Tooltip from '@radix-ui/react-tooltip';

interface LabelTooltipProps {
  helpText: string;
  labelCode: string;
}

export function LabelTooltip({ helpText, labelCode }: LabelTooltipProps) {
  return (
    <>
      {/* Screen: hover tooltip */}
      <Tooltip.Provider delayDuration={300}>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              type="button"
              aria-label={`Help for ${labelCode}`}
              className="no-print inline-flex items-center justify-center w-4 h-4 ml-1 rounded-full text-xs text-gray-400 border border-gray-300 hover:text-gray-700 hover:border-gray-500"
            >
              ?
            </button>
          </Tooltip.Trigger>
          {/* NOTE: do NOT use asChild on Tooltip.Content (React 19 known issue) */}
          <Tooltip.Content
            className="z-50 max-w-xs p-2 text-xs bg-white border border-gray-200 shadow-lg rounded"
            sideOffset={4}
          >
            {helpText}
            <Tooltip.Arrow className="fill-white" />
          </Tooltip.Content>
        </Tooltip.Root>
      </Tooltip.Provider>

      {/* Print: always-expanded inline subtitle */}
      <span className="print-only block text-xs text-gray-500 italic mt-0.5">
        {helpText}
      </span>
    </>
  );
}
```

**Print CSS addition to print.css (additive):**
```css
/* Phase 6: tooltip help text shown inline on print */
@media print {
  .label-help-text {
    display: block;
    font-size: 8pt;
    color: #666;
    font-style: italic;
    margin-top: 2pt;
  }
}
```

### Pattern 4: helpText Field Addition to fy2026.ts

**What:** Every entry in `INDIVIDUAL_LABELS_FULL`, `COMPANY_LABELS_FULL`, `TRUST_LABELS_FULL`, `PARTNERSHIP_LABELS_FULL`, and `BAS_LABELS_FULL` gains an optional `helpText?: string` field. All 6 compute*Return modules that consume these catalogues do so via `ReturnLabel.label` string comparisons or direct key lookups — they do NOT iterate over the label metadata object shape. Adding `helpText` is additive and causes zero TypeScript errors in compute modules.

**Shape widening (additive):**
```typescript
// src/lib/tax/labels/fy2026.ts — only the type declaration changes
export const INDIVIDUAL_LABELS_FULL: Record<IndividualLabel, {
  title: string;
  description: string;
  natReference: string;
  plainEnglish: string;
  helpText?: string;   // NEW: 1–3 sentences of plain English; never states deductibility
}> = { ... }
```

**Key constraint:** `helpText` content must never state whether an expense is deductible (verbatim from CONTEXT.md UX-03 and ATO TPB rules). Correct framing: "This label captures X. The figure comes from accounts tagged with tax label Y in your Chart of Accounts." Incorrect: "This is a deductible expense."

### Pattern 5: Anomaly Computation for Sidebar Badges

**What:** Sidebar items ("Journal Entries 3", "Accounts 2") show a count of open anomalies. These are computed in real time, never persisted. The count lives in a `useMemo` inside a new `useAnomalyCounts` hook.

**Anomaly sources (all deterministic from existing data):**

| Anomaly | Source | Screen |
|---------|--------|--------|
| Unbalanced journal entry | `abs(totalDebit - totalCredit) > 0.005` on posted entries | JournalForm / Journals badge |
| Unmapped account in posted entries | account.taxLabel is null/undefined AND account is referenced in a posted entry | Accounts badge + CoaTreeView |
| GST code mismatch | account.gstCode doesn't match account's parentCode.gstCode | Accounts badge |
| Missing tax-label mapping | account.taxLabel === undefined or '' for non-special accounts | Accounts badge |

**Hook pattern:**
```typescript
// src/hooks/useAnomalyCounts.ts

export interface AnomalyCounts {
  journals: number;   // unbalanced posted entries
  accounts: number;   // unmapped + missing GST code + missing tax label
}

export function useAnomalyCounts(
  accounts: Account[],
  entries: Record<string, JournalEntry[]>,
  activeEntityId: string | null,
): AnomalyCounts {
  return useMemo(() => {
    const entityEntries = activeEntityId
      ? (entries[activeEntityId] ?? [])
      : Object.values(entries).flat();

    const postedEntries = entityEntries.filter(
      e => e.status === 'posted' || (e.status === undefined && e.isPosted)
    );

    // Journals: unbalanced
    const journalCount = postedEntries.filter(e => {
      const debit = e.lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
      const credit = e.lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
      return Math.abs(debit - credit) > 0.005;
    }).length;

    // Accounts: referenced in posted entries but unmapped or missing GST
    const referencedAccountIds = new Set(
      postedEntries.flatMap(e => e.lines.map(l => l.accountId))
    );
    const accountCount = accounts.filter(a =>
      referencedAccountIds.has(a.id) &&
      (!a.taxLabel || a.taxLabel === '')
    ).length;

    return { journals: journalCount, accounts: accountCount };
  }, [accounts, entries, activeEntityId]);
}
```

**Sidebar badge rendering:** The `NavButton` component gains an optional `badge?: number` prop. When `badge > 0`, renders a small red pill: `<span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">{badge}</span>`.

### Pattern 6: Persona-Mode-Aware Sidebar

**What:** Sidebar reads `Settings.mode` (via `useSettings`) and conditionally renders items. Owner mode removes entity switcher and shows only single-entity nav. Agent mode adds back the entity switcher and the multi-client list.

**Sidebar widening approach:** Thread `settings: Settings | null` as a prop from `MainLayout` (which calls `useSettings`). The Sidebar's item list becomes conditional on `settings?.mode`.

**Owner mode nav:**
```
Dashboard (→ primary entity dashboard)
Year-End (→ wizard for primary entity)
Journals
Accounts
Trial Balance
Tax Return
BAS & IAS
Import TB
Data
Settings
```

**Agent mode nav:**
```
Clients (→ MasterDashboard / multi-client list)
[entity section when entity is selected — same items as current]
Data
Settings
```

### Pattern 7: Year-End Wizard Step Architecture

**7-step wizard flow (CONTEXT.md-aligned):**

| Step | Component | Gate |
|------|-----------|------|
| 1 | Step1Confirm — FY + entity + "finished entering transactions?" | None |
| 2 | Step2Unreconciled — list unreconciled items (check for drafts) | Soft warning only |
| 3 | Step3GstCodes — review accounts missing GST codes | Soft warning only |
| 4 | Step4UnmappedAccounts — list accounts with no tax-label mapping | Hard block on Finalise; can step through |
| 5 | Step5Preview — embeds Phase-5 renderer inline (readonly) | None |
| 6 | Step6Attestation — checkbox + typed entity name (case-insensitive) | Finalise button disabled until checked + name matches |
| 7 | Step7Finalise — writes `returnStatusByFy[fy] = 'finalised'` | All steps 4+6 gates passed |

**Wizard state management:** `Entity.wizardState[fy]` is read on mount, updated on step advance. Writing: call `entityActions.updateEntity({ ...entity, wizardState: { ...entity.wizardState, [fy]: newState } })`. The existing `useEntities.updateEntity` handles persistence via the StorageAdapter.

**Wizard route:** New view `'year-end'` added to the `View` union in `types.ts`. `ViewRouter` adds a new route block rendering `<YearEndWizard>`. Sidebar entry navigates to `'year-end'`.

### Pattern 8: Finalise / Unfinalise Lifecycle

**What:** Writing `returnStatusByFy[fy] = 'finalised'` locks the FY. Phase 6 adds two checks:
1. **JournalForm edit guard:** When `entity.returnStatusByFy?.[fy] === 'finalised'` for the entry's FY, the Edit and New-Journal buttons are disabled with a tooltip "FY is finalised — use Reverse and Re-post to correct".
2. **Unfinalise:** Entity dashboard shows an "Unfinalise FY XXXX" button when the FY is finalised. Clicking opens the same attestation dialog (typed entity name). On confirm: writes `returnStatusByFy[fy] = 'draft'`. Audit log entries: `LOCK_FY` and `UNLOCK_FY` (already in `AuditAction` union from Phase 4 forward-compat).

### Pattern 9: Mobile Responsiveness at 375px

**What:** Tailwind v4 uses mobile-first breakpoints in rem: `sm:` = 40rem (640px). Styles without a breakpoint prefix apply at all sizes including 375px. The three target screens need explicit layout adjustments.

**JournalForm at 375px:**
- The debits/credits side-by-side layout uses `grid grid-cols-2` — at 375px this compresses to `<190px` per column. Fix: wrap each line in `flex flex-col sm:flex-row` so debit and credit stack vertically on mobile.
- The date/reference/description header row: add `flex-col sm:flex-row` to stacked layout.
- The account selector dropdown: ensure `w-full` — already set in most places.

**TrialBalance at 375px:**
- The table has 4 columns (Account, Debit, Credit, Balance). At 375px this needs `overflow-x-auto` on the table container (already used in JournalsView via `overflow-x-auto -mx-4 sm:mx-0`). Apply same pattern.
- Period filter bar: `flex flex-col sm:flex-row` for the date pickers.

**Return preview at 375px:**
- The PrintBanner (`print-only`) renders at zero width on screen — not a 375px concern.
- The return form tables: same `overflow-x-auto` wrapper.
- "Print working paper" button: already full-width-capable; ensure `w-full sm:w-auto` class.

**Tailwind v4 breakpoint confirmation:** Default `sm:` breakpoint is `40rem = 640px`. For 375px, use unbreakpointed classes or `max-sm:` (below 640px). Both approaches work. The `max-sm:` variant was introduced in Tailwind v3.2 and is present in v4.

### Pattern 10: AI-Disabled Inline Note (DEP-01 / FND-04)

**What:** When `isAiEnabled()` returns false, `ImportTB.tsx` currently just hides the "AI re-match" button (line 512). Phase 6 changes this from hidden to visible-but-labelled, so users see what AI can do and how to enable it.

**Implementation:** Replace the current `{isAiEnabled() && <button>}` with:
```typescript
{isAiEnabled() ? (
  <button ... >AI re-match accounts</button>
) : (
  <p className="text-xs text-gray-500 italic mt-1">
    AI suggestions disabled — add a Gemini API key to{' '}
    <code>.env.local</code> to enable (optional).
  </p>
)}
```

### Anti-Patterns to Avoid

- **DO NOT widen StorageAdapter interface** for Settings. Use localStorage for per-instance Settings (mode, primaryEntityId). The StorageAdapter FINAL invariant from Phase 3 must hold.
- **DO NOT use `asChild` on `Tooltip.Content`** — React 19 throws a `React.Children.only` error in this combination (Radix issue #3043). Always render `Tooltip.Content` without `asChild`.
- **DO NOT add a `helpText` string that states whether an expense is deductible.** ATO/TPB compliance rule. Frame help text as "what this label captures" not "this is/isn't deductible".
- **DO NOT persist anomaly counts.** Compute them in `useMemo` from live data; badge counts reflect current state.
- **DO NOT add a new audit action type for wizard step advances.** Only `LOCK_FY` and `UNLOCK_FY` (finalise/unfinalise) warrant audit entries. Step navigation is not auditable.
- **DO NOT import React namespace for `key` props on mapped elements.** React 19 changed key prop semantics. Pattern from Phase 5: use `<span key={id}><AnomalyBadge .../></span>` not `<AnomalyBadge key={id} .../>`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible hover tooltip | Custom `onMouseEnter/Leave` + `useState(hovered)` | `@radix-ui/react-tooltip` | Handles keyboard focus, ARIA, z-index, portal, scroll collision — custom tooltip misses all of these |
| Breakpoint detection in JS | `window.matchMedia` hook | Tailwind CSS classes only | Tailwind handles breakpoints at CSS level; no JS runtime needed for layout changes |
| Schema migration | Custom merge logic | Additive spread pattern (established in v1→v2→v3→v4) | Hand-rolled merge misses edge cases; existing migration runner is proven |

**Key insight:** Phase 6 is deliberately light on new infrastructure. The project has 5 phases of proven patterns — the work is applying them correctly, not inventing new mechanisms.

---

## Common Pitfalls

### Pitfall 1: StorageAdapter Widening Temptation
**What goes wrong:** Developer adds `getSettings()` / `saveSettings()` to `StorageAdapter` interface, which requires updating `LocalAdapter`, `ServerAdapter`, server routes (`GET/PUT /api/settings`), SQL schema (`001-initial.sql` or a new migration), and Zod schemas. This is ~8 files and ~50 lines of server code for two string fields.
**Why it happens:** Settings feels like "data" because it's persisted.
**How to avoid:** Settings are per-instance browser config, not entity data. They don't need to survive export/import or server-sync. Use `localStorage` under `aussieledger:settings`.
**Warning signs:** Any PR that modifies `src/storage/adapter.ts` for Phase 6.

### Pitfall 2: Tooltip.Content asChild + React 19 Error
**What goes wrong:** `<Tooltip.Content asChild><div>...</div></Tooltip.Content>` throws at runtime when the tooltip opens: "React.Children.only expected to receive a single React element child".
**Why it happens:** React 19 changed how `cloneElement` / `Children.only` work; Radix uses these internally with `asChild`.
**How to avoid:** Never use `asChild` on `Tooltip.Content`. Let Radix render its own `<div>` wrapper.
**Warning signs:** Runtime error on first tooltip hover.

### Pitfall 3: helpText Deductibility Wording
**What goes wrong:** A `helpText` entry says "Rent is a deductible business expense" — this is tax advice, not allowed.
**Why it happens:** Feels natural when describing expense categories.
**How to avoid:** Frame as structural: "This field captures rental and lease costs for business premises. Populated from accounts tagged with label E in the Business & Professional schedule."
**Warning signs:** Any `helpText` string containing "deductible", "write off", "tax advantage", "claim".

### Pitfall 4: Anomaly Count Recompute on Every Render
**What goes wrong:** `useAnomalyCounts` called without `useMemo`, causing the entire anomaly scan to re-run on every keystroke in any field.
**Why it happens:** Sidebar rerender propagates down.
**How to avoid:** Wrap in `useMemo([accounts, entries, activeEntityId])`. Accounts and entries change infrequently; the memo invalidates only when data changes.
**Warning signs:** Perceptible lag when typing in JournalForm.

### Pitfall 5: FY Lock Not Propagated to JournalForm
**What goes wrong:** `returnStatusByFy` is written by the wizard but JournalForm doesn't receive it — users can still edit journals in a finalised FY.
**Why it happens:** JournalForm is mounted inside ViewRouter which passes `entity` and `journals` separately; the lock check needs to be inside JournalForm.
**How to avoid:** JournalForm already receives `accounts` and `onSave`; add `lockedFy?: boolean` prop computed by ViewRouter from `activeEntity.returnStatusByFy?.[currentFy()]`.

### Pitfall 6: Wizard State Write Race Condition
**What goes wrong:** User clicks "Next" rapidly; two successive `updateEntity` calls race, and the second one overwrites the first's step with stale state.
**Why it happens:** `updateEntity` reads from `entity` (closed-over state), not from the latest DB value.
**How to avoid:** Wizard step advances are synchronous state updates; since the hook's whole-collection save is the I/O side effect, rapid clicks update the in-memory React state immediately and the persistence catches up. Use functional state update (`setWizardStep(prev => prev + 1)` pattern) inside the hook, not read-then-write.

---

## Code Examples

### Wizard Step Persistence (write pattern)
```typescript
// Inside YearEndWizard.tsx — how to persist step changes
// Pattern: mirror Phase 5's pure-function compute approach for state

function advanceStep(entity: Entity, fy: string, nextStep: number): Entity {
  return {
    ...entity,
    wizardState: {
      ...entity.wizardState,
      [fy]: {
        ...(entity.wizardState?.[fy] ?? { dismissedAnomalies: [] }),
        step: nextStep,
      },
    },
  };
}
// Call: entityActions.updateEntity(advanceStep(activeEntity, fy, currentStep + 1));
```

### Finalise Write Pattern
```typescript
// Step 7: write returnStatusByFy and wizardState.completedAt
function finaliseEntity(entity: Entity, fy: string): Entity {
  return {
    ...entity,
    returnStatusByFy: {
      ...entity.returnStatusByFy,
      [fy]: 'finalised',
    },
    lockedFys: Array.from(new Set([...(entity.lockedFys ?? []), fy])),
    wizardState: {
      ...entity.wizardState,
      [fy]: {
        ...(entity.wizardState?.[fy] ?? { dismissedAnomalies: [] }),
        step: 7,
        completedAt: new Date().toISOString(),
      },
    },
  };
}
// Note: use today() from src/lib/period.ts for timestamp, not new Date()
// Correction: Phase 2 rule applies — use today().toISOString() not new Date().toISOString()
```

### Owner Mode Landing (ViewRouter change)
```typescript
// ViewRouter: gate initial landing based on settings.mode
// When settings.mode === 'owner' and no activeEntityId:
//   auto-select primaryEntityId (or first entity) and navigate to 'dashboard'
// When settings.mode === 'agent' and no activeEntityId:
//   render 'master-dashboard'
// When settings is null (first run):
//   render <PersonaModeModal onComplete={setSettings} />

// Inside ViewRouter:
if (!settings) {
  return <PersonaModeModal onComplete={s => { setSettings(s); }} />;
}
if (settings.mode === 'owner' && !activeEntityId && entities.length > 0) {
  const primaryId = settings.primaryEntityId ?? entities[0].id;
  setActiveEntityId(primaryId);
  setView('dashboard');
}
```

### Sidebar Anomaly Badge (NavButton extension)
```typescript
// Existing NavButton in Sidebar.tsx, extended with badge prop:
function NavButton({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button onClick={onClick} className={cn(...)}>
      {icon}
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full px-1.5 py-0.5 font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@react-pdf/renderer` deferred (React 19 compat unknown) | React 19 compat confirmed (v4.1.0+), but decision is `window.print()` anyway | 2025 (v4.1.0) | No action — confirmed `window.print()` is correct; no PDF library needed |
| Radix UI React 19 compat uncertain | Confirmed since v1.2.8 (explicitly in peerDeps) | 2024 (v1.2.x) | Can install `@radix-ui/react-tooltip` without flags |
| Custom tooltip implementations | Radix UI headless primitives | 2022–present | WAI-ARIA compliant, keyboard navigable, zero CSS opinion |
| Tailwind v3 `max-w-screen-sm` | Tailwind v4 `max-sm:` variant | Tailwind v4 | Same breakpoint logic, new variant naming |

**Deprecated/outdated in this codebase:**
- `IS_AI_ENABLED` constant in `src/lib/ai.ts` is marked `@deprecated`; use `isAiEnabled()` function. Phase 6 should only use `isAiEnabled()` in new code.

---

## Open Questions

1. **Settings in export/import**
   - What we know: `localStorage`-based Settings does NOT survive export/import. This is correct behaviour (per-instance, not per-data).
   - What's unclear: Should the README's "import your data" section warn that mode is not imported?
   - Recommendation: Add one line to the import confirmation dialog: "Note: persona mode setting is not included in exports — set your mode preference after importing."

2. **Agent mode: entity count > 20**
   - What we know: MasterDashboard renders all entities as cards. With 20+ clients this could be slow.
   - What's unclear: Is pagination or virtualisation needed in v1?
   - Recommendation: The v1 audience is small-firm tax agents (< 20 clients). No virtualisation needed. Add a note to CONTRIBUTING.md that virtual scroll is a v2 enhancement trigger.

3. **Wizard "Preview" step with non-FY period**
   - What we know: Phase-5 renderers accept a `Period` prop. The wizard is always FY-scoped.
   - What's unclear: Should the preview show the full FY or the user's current period filter?
   - Recommendation: Wizard preview is always `{ type: 'fy', fy: currentFy() }` — the wizard is explicitly the full-year finalisation flow.

---

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | vitest.config.ts (SPA) + server/vitest.config.ts (server) |
| Quick run command | `npx vitest run --reporter=verbose src/lib/migrations src/lib/persona.ts src/hooks/useAnomalyCounts.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| UX-01 | Wizard completes full sequence; Finalise blocked until unmapped accounts resolved | integration (wizard state machine) | `npx vitest run src/components/__tests__/YearEndWizard.test.tsx` | Wave 0 |
| UX-01 | v4→v5 migration additive; wizardState field defaults undefined | unit (migration) | `npx vitest run src/lib/migrations/__tests__/v4-to-v5.test.ts` | Wave 0 |
| UX-01 | finaliseEntity produces correct returnStatusByFy + lockedFys state | unit (pure function) | `npx vitest run src/lib/__tests__/persona.test.ts` | Wave 0 |
| UX-02 | useAnomalyCounts returns correct journal count for unbalanced entry | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | Wave 0 |
| UX-02 | useAnomalyCounts returns correct account count for unmapped account in posted entry | unit (hook) | `npx vitest run src/hooks/__tests__/useAnomalyCounts.test.ts` | Wave 0 |
| UX-02 | AnomalyBadge renders inline on JournalForm when entry is unbalanced | integration | `npx vitest run src/components/__tests__/JournalForm.test.tsx` | existing + Wave 0 extend |
| UX-03 | INDIVIDUAL_LABELS_FULL all entries have helpText field present and non-empty | unit (catalogue integrity) | `npx vitest run src/lib/tax/__tests__/label-help-text.test.ts` | Wave 0 |
| UX-03 | No helpText string contains "deductible" or "write off" | unit (content lint) | `npx vitest run src/lib/tax/__tests__/label-help-text.test.ts` | Wave 0 |
| UX-03 | LabelTooltip renders "?" button on screen + .print-only span in DOM | unit (component) | `npx vitest run src/components/__tests__/LabelTooltip.test.tsx` | Wave 0 |
| UX-04 | JournalForm debit/credit cols stack (flex-col) below sm breakpoint — class present | structural (CSS class) | `npx vitest run src/components/__tests__/JournalForm.test.tsx` | existing + Wave 0 extend |
| UX-04 | TrialBalance table wrapper has overflow-x-auto class | structural | `npx vitest run src/components/__tests__/TrialBalance.test.tsx` | Wave 0 extend |
| UX-05 | useSettings returns null on first run (no localStorage key) | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | Wave 0 |
| UX-05 | saveSettings + getSettings round-trip | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | Wave 0 |
| PERS-01 | ViewRouter redirects to entity dashboard when mode=owner + one entity | integration (manual-verify) | human-verify UAT | manual-only |
| PERS-02 | ViewRouter shows MasterDashboard with entity status badges in agent mode | integration (manual-verify) | human-verify UAT | manual-only |
| PERS-03 | Mode switch (owner↔agent) does NOT mutate entities[], accounts[], or entries[] | unit | `npx vitest run src/lib/__tests__/persona.test.ts` | Wave 0 |
| DEP-01 | `npm run build` exits 0 | structural (CI) | `npm run build` | CI (existing) |
| DEP-01 | AI affordance note visible in DOM when isAiEnabled()=false | unit | `npx vitest run src/components/__tests__/ImportTB.test.tsx` | extend existing |
| DEP-03 | README contains "npm install && npm run build" quick-start | structural (file content) | `npx vitest run src/__tests__/readme.test.ts` | Wave 0 |
| DEP-03 | README contains sections for both deployment shapes | structural (file content) | `npx vitest run src/__tests__/readme.test.ts` | Wave 0 |
| DEP-04 | LICENSE file exists at repo root and contains "Apache License" text | structural (file existence) | `npx vitest run src/__tests__/license.test.ts` | Wave 0 |
| DEP-04 | CONTRIBUTING.md exists and contains "schema" and "migration" and "round-trip" | structural (file content) | `npx vitest run src/__tests__/contributing.test.ts` | Wave 0 |
| DEP-04 | All source files have SPDX-License-Identifier: Apache-2.0 header | structural (file lint) | `npx vitest run src/__tests__/spdx-headers.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/migrations src/lib/__tests__/persona.test.ts src/hooks/__tests__/useAnomalyCounts.test.ts`
- **Per wave merge:** `npx vitest run` (full SPA suite — expect ~540–580 GREEN after Phase 6 Wave 0 adds ~20–30 new tests)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps (test files to create)
- [ ] `src/lib/migrations/__tests__/v4-to-v5.test.ts` — covers UX-01 migration + round-trip
- [ ] `src/lib/__tests__/persona.test.ts` — covers UX-05, PERS-03, finaliseEntity, advanceStep pure functions
- [ ] `src/hooks/__tests__/useAnomalyCounts.test.ts` — covers UX-02 anomaly counting
- [ ] `src/lib/tax/__tests__/label-help-text.test.ts` — covers UX-03 helpText presence + no-deductibility lint
- [ ] `src/components/__tests__/LabelTooltip.test.tsx` — covers UX-03 tooltip render
- [ ] `src/__tests__/readme.test.ts` — covers DEP-03
- [ ] `src/__tests__/license.test.ts` — covers DEP-04 LICENSE file existence
- [ ] `src/__tests__/contributing.test.ts` — covers DEP-04 CONTRIBUTING.md content
- [ ] `src/__tests__/spdx-headers.test.ts` — covers DEP-04 per-file headers
- [ ] Framework install: none needed — Vitest already configured

---

## CONTRIBUTING.md Schema-Migration Rule Wording

The project has a v0→v1→v2→v3→v4 history of additive-only migrations. The rule to codify:

```markdown
## Schema Migrations

AussieLedger uses an integer schema version (`_v`) on all persisted data.

**The hard rule:** Every schema change MUST be:

1. **Additive only** — new fields are optional with sensible defaults. No field
   may be removed or renamed. No type may be changed to an incompatible type.

2. **Reversible round-trip** — a `v{N}→v{N+1}` migration test is required that:
   - Constructs a representative `_v: N` blob (the oldest realistic shape)
   - Runs it through `migrate()` in `src/lib/migrations/index.ts`
   - Asserts the result is `_v: N+1` with all existing fields preserved and
     all new fields populated with correct defaults
   - Calls `adapter.importAll(migrated)` then `adapter.exportAll()` and asserts
     the exported shape matches the migrated shape (round-trip integrity)

3. **Registered** — add `N: migrateVNToV{N+1}` to the `MIGRATIONS` registry in
   `src/lib/migrations/index.ts` and bump `CURRENT_VERSION`.

4. **Named consistently** — migration file: `src/lib/migrations/vN-to-v{N+1}.ts`.
   Test file: `src/lib/migrations/__tests__/vN-to-v{N+1}.test.ts`.

**Why:** A deployed instance may have been offline for 6 months. On next load, the
migration runner must upgrade every version gap without losing data. Non-additive
changes corrupt that user's books permanently.
```

---

## Apache 2.0 LICENSE

The full Apache License 2.0 text is at `https://www.apache.org/licenses/LICENSE-2.0.txt` (official ASF source). SPDX identifier: `Apache-2.0`.

**Per-file headers already in codebase** (confirmed by reading source files): every `.ts` and `.tsx` file in `src/` begins with:
```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
```

**Phase 6 action:** Create `LICENSE` at repo root containing the full Apache 2.0 text fetched from `https://www.apache.org/licenses/LICENSE-2.0.txt`. The `package.json` `"name"` and `"version"` fields should have the license field set to `"Apache-2.0"` — check `package.json` (currently missing; add `"license": "Apache-2.0"` to `package.json`).

**SPDX headers for new Phase 6 files:** Every new `.ts` / `.tsx` file created in Phase 6 must include the `@license SPDX-License-Identifier: Apache-2.0` header. This includes `src/lib/persona.ts`, `src/components/YearEndWizard.tsx`, `src/components/wizard/*.tsx`, `src/components/LabelTooltip.tsx`, `src/components/PersonaModeModal.tsx`, `src/hooks/useAnomalyCounts.ts`, `src/lib/migrations/v4-to-v5.ts`.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `src/types.ts`, `src/lib/migrations/index.ts`, `src/storage/adapter.ts`, `src/lib/ai.ts`, `src/components/AnomalyBadge.tsx`, `src/components/AssumptionsBlock.tsx`, `src/styles/print.css`, `src/components/shell/Sidebar.tsx`, `src/components/shell/MainLayout.tsx`, `src/components/ViewRouter.tsx`, `package.json`
- `.planning/phases/06-personas-wizard-and-deployment/06-CONTEXT.md` — locked decisions
- `.planning/phases/05-tax-outputs/05-1-SUMMARY.md`, `05-4-SUMMARY.md` — Phase 5 shipped assets
- `.planning/phases/03-durable-persistence/03-CONTEXT.md` — StorageAdapter FINAL invariant
- `.planning/phases/04-bookkeeping-core/04-CONTEXT.md` — reversePosted + lockedFys patterns
- `unpkg.com/@radix-ui/react-tooltip@1.2.8/package.json` — React 19 peer dependency confirmed
- `https://www.apache.org/licenses/LICENSE-2.0` — Apache 2.0 license text source
- `https://www.radix-ui.com/primitives/docs/components/tooltip` — Radix tooltip API

### Secondary (MEDIUM confidence)
- WebSearch results confirming `@react-pdf/renderer` React 19 support since v4.1.0 — confirmed but irrelevant (no PDF library in Phase 6)
- Radix GitHub issue #3043 — `asChild` on `Tooltip.Content` in React 19 throws; workaround documented
- Tailwind v4 responsive design documentation — breakpoint system confirmed unchanged from v3

### Tertiary (LOW confidence — not relied upon for planning decisions)
- None. All key claims are verified against official sources or direct codebase reads.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package.json confirms all existing deps; @radix-ui/react-tooltip React 19 compat verified from unpkg source
- Architecture: HIGH — all patterns are extensions of established Phase 3/4/5 patterns; no novel mechanisms
- Pitfalls: HIGH — Radix asChild issue confirmed from GitHub; other pitfalls derived from existing codebase analysis
- Validation: HIGH — test framework and patterns confirmed from existing test files

**Research date:** 2026-05-29
**Valid until:** 2026-08-29 (90 days — stable stack; Radix and Tailwind are slow-moving)
