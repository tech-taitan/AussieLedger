---
phase: 11-indexeddb-hardening
plan: 2
type: execute
wave: 2
depends_on: [11-1]
files_modified:
  - src/components/DataPage.tsx
  - src/components/__tests__/DataPage.test.tsx
  - src/components/IosItpBanner.tsx
  - src/components/__tests__/IosItpBanner.test.tsx
  - src/components/Toast.tsx
  - src/components/__tests__/Toast.test.tsx
  - src/hooks/useBackupNag.ts
  - src/hooks/__tests__/useBackupNag.test.ts
  - src/App.tsx
  - src/__tests__/App.beforeunload.test.tsx
  - src/lib/period.ts
  - src/lib/__tests__/period.test.ts
  - .planning/REQUIREMENTS.md
autonomous: true
requirements: [IDB-01, IDB-02, IDB-03, IDB-04, IDB-05]
tdd: true

must_haves:
  truths:
    - "DataPage's Status section renders quota when getStorageEstimate() returns { quota, usage } — format: '~X GB allocated · Y MB used' (units chosen by magnitude: usage < 1024 MB shown in MB; quota >= 1 GB shown in GB to 1 decimal)"
    - "DataPage hides the quota line entirely when getStorageEstimate() returns null (silent fallback) — Adapter / Schema / Last Export rows still render unchanged"
    - "DataPage renders persist-status line: 'Storage protected ✓' (granted=true), 'Storage not protected — back up regularly' (granted=false), hidden entirely (granted=null) — line lives in the Status section alongside Adapter/Schema/Last Export"
    - "DataPage mounts <IosItpBanner /> ONCE at the top of the page content (above the Status section), no other component renders it"
    - "DataPage's handleImport adds `await setLastWriteAt(nowIso())` after `await adapter.importAll(pendingImport)` succeeds — bulk imports register as dirty per CONTEXT decision"
    - "DataPage's handleExport calls `localStorage.removeItem('aussieledger:backup-nag-snoozed-until')` after `await setLastExportAt(iso)` succeeds — snooze does not outlive its motivation"
    - "useBackupNag hook fires at most once per App-mount in a useEffect with empty deps — no per-write re-checks, no visibilitychange re-checks"
    - "useBackupNag returns early (no nag) when both getEntities().length === 0 AND Object.keys(getEntries()).length === 0 — empty adapter suppression (defence-in-depth on lastExportAt === null)"
    - "useBackupNag returns early (no nag) when localStorage 'aussieledger:backup-nag-snoozed-until' parses to an ISO timestamp > today() — snoozed"
    - "useBackupNag returns early (no nag) when lastExportAt is null AND the adapter is non-empty (data exists but never exported — fires the nag; this is the CORE backup-nag scenario, NOT a suppression)"
    - "useBackupNag threshold = 7 days for non-iOS UA, 5 days for iOS Safari UA (detection: /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent))"
    - "useBackupNag fires by calling a setToast-like callback (or returning the nagMessage + actions via the existing App-level Toast state pattern — match what App.tsx already does for other toasts); Toast tone='warn'; buttons: 'Export now' (navigates to /data via setView('data') if View routing supports it, else window.location.hash = '#data') + 'Snooze 7 days' (writes ISO of today() + 7 days to localStorage 'aussieledger:backup-nag-snoozed-until' then dismisses)"
    - "IosItpBanner returns null unless ALL of: isHostedMode() === true AND iOS Safari UA AND !window.matchMedia('(display-mode: standalone)').matches AND sessionStorage 'aussieledger:ios-itp-banner-dismissed' !== 'true'"
    - "IosItpBanner copy is VERBATIM the locked text: 'Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe.'"
    - "IosItpBanner includes a <details><summary>How?</summary> expand showing iOS Share-menu Add-to-Home-Screen steps inline (no external link)"
    - "IosItpBanner dismiss button writes 'true' to sessionStorage 'aussieledger:ios-itp-banner-dismissed' — survives page navigation within the session; cleared by browser at session end"
    - "App.tsx mounts useBackupNag() once at root inside its useEffect plumbing region (~line 60)"
    - "App.tsx registers a beforeunload + visibilitychange handler PAIR CONDITIONALLY on isDirty (lastWriteAt > lastExportAt) — useEffect with [isDirty] dep + early return when !isDirty so the listener is genuinely unregistered (Firefox bfcache preserved per PITFALLS.md §3)"
    - "App.tsx's beforeunload handler calls e.preventDefault() AND sets e.returnValue = '' (Chrome 119+ + legacy fallback, per STACK.md §6) — browsers ignore custom strings"
    - "App.tsx's visibilitychange handler fires on document.hidden === true AND isDirty — real settle-point flush via fire-and-forget await getLastWriteAt() (forces pending IDB write transactions to land before iOS Safari may suspend the tab); HONESTLY documented that no dialog API exists on visibilitychange (the are-you-sure prompt is beforeunload-exclusive); REQUIREMENTS.md IDB-05 gains a one-line trailing note disclosing this division of responsibility (Blocker 2 fix)"
    - "Existing 1029 SPA GREEN (post Plan 11-1) + 11 todo + 18 server GREEN baseline preserved; new total ~1050-1075 SPA GREEN; npm run lint EXIT 0; npm run build EXIT 0 (incl. AIza scan)"
    - "All 5 phase success criteria from ROADMAP Phase 11 entry satisfied end-to-end: (1) persist + display, (2) quota disclosure, (3) backup-nag with snooze, (4) iOS ITP banner, (5) beforeunload+visibilitychange with conditional registration"
  artifacts:
    - path: "src/components/DataPage.tsx"
      provides: "Extended Status section with quota disclosure + persist-status line; mounts IosItpBanner; handleImport bumps lastWriteAt post-import; handleExport clears backup-nag snooze key"
      contains: "IosItpBanner"
    - path: "src/components/__tests__/DataPage.test.tsx"
      provides: "Extended DataPage tests covering: quota render (estimate=null → hidden; estimate present → '~X GB allocated · Y MB used'); persist-status render (true/false/null branches); IosItpBanner mount; handleImport bumps lastWriteAt; handleExport clears snooze key"
      min_lines: 60
    - path: "src/components/IosItpBanner.tsx"
      provides: "DataPage-scoped banner — gates on isHostedMode + iOS Safari UA + !standalone + !sessionStorage-dismissed; renders verbatim copy + inline <details> How? expand + Dismiss button (per-session)"
      exports: ["IosItpBanner"]
      min_lines: 40
    - path: "src/components/__tests__/IosItpBanner.test.tsx"
      provides: "IosItpBanner gate-matrix tests: returns null when each of {isHostedMode false, non-iOS UA, Chrome-iOS UA via CriOS, standalone=true, sessionStorage dismissed=true} is the only failing condition; renders banner when ALL conditions pass; dismiss button writes sessionStorage and hides banner"
      min_lines: 80
    - path: "src/hooks/useBackupNag.ts"
      provides: "Hook fires once per App mount; reads getLastExportAt + getLastWriteAt + getEntities + getEntries via duck-typing; threshold 7d/5d (iOS); suppresses on empty adapter / snoozed / threshold-not-crossed; surfaces warn-tone Toast with Export-now + Snooze-7-days actions"
      exports: ["useBackupNag"]
      min_lines: 80
    - path: "src/hooks/__tests__/useBackupNag.test.ts"
      provides: "Hook tests: no-render on empty adapter; no-render when snoozed (snooze key in future); no-render when threshold not crossed; renders Toast when lastExportAt is null + adapter non-empty; renders Toast when today() - lastExportAt > 7 days; 5-day threshold under iOS Safari UA; snooze button writes the localStorage key with today()+7d ISO"
      min_lines: 100
    - path: "src/App.tsx"
      provides: "Mounts useBackupNag() once; registers conditional beforeunload + visibilitychange listener pair gated on isDirty (lastWriteAt > lastExportAt)"
      contains: "useBackupNag"
    - path: "src/__tests__/App.beforeunload.test.tsx"
      provides: "App-level integration tests: no beforeunload listener registered when isDirty=false; listener registered when isDirty=true; handler calls preventDefault + sets returnValue=''; visibilitychange handler fires flush on document.hidden + isDirty; listener cleanup on isDirty going false (Firefox bfcache preserved)"
      min_lines: 80
  key_links:
    - from: "src/components/DataPage.tsx"
      to: "LocalAdapter.getPersistGranted / getStorageEstimate / setLastWriteAt"
      via: "duck-typing: (adapter as unknown as { getPersistGranted?: () => Promise<boolean | null>; getStorageEstimate?: () => Promise<StorageEstimate | null>; setLastWriteAt?: (iso: string) => Promise<void> })"
      pattern: "as unknown as \\{ get(PersistGranted|StorageEstimate)"
    - from: "src/components/DataPage.tsx handleImport"
      to: "src/lib/period.ts nowIso() + LocalAdapter.setLastWriteAt"
      via: "await setLastWriteAt(nowIso()) AFTER await adapter.importAll(pendingImport) succeeds"
      pattern: "setLastWriteAt\\(nowIso\\(\\)\\)"
    - from: "src/components/DataPage.tsx handleExport"
      to: "localStorage 'aussieledger:backup-nag-snoozed-until'"
      via: "localStorage.removeItem('aussieledger:backup-nag-snoozed-until') after setLastExportAt succeeds"
      pattern: "removeItem\\(['\"]aussieledger:backup-nag-snoozed-until"
    - from: "src/hooks/useBackupNag.ts"
      to: "LocalAdapter.getLastExportAt / getLastWriteAt / getEntities / getEntries"
      via: "duck-typing the adapter; getEntities + getEntries used for empty-adapter suppression"
      pattern: "as unknown as \\{ get(LastExportAt|LastWriteAt)"
    - from: "src/hooks/useBackupNag.ts"
      to: "Toast (existing primitive) via App-level setToast plumbing OR hook-returned nagMessage"
      via: "match existing Toast mounting pattern in App.tsx — return {nagMessage, onExport, onSnooze} from hook OR call a setToast callback passed in"
      pattern: "tone=['\"]warn"
    - from: "src/components/IosItpBanner.tsx"
      to: "src/lib/env.ts isHostedMode()"
      via: "named import: import { isHostedMode } from '../lib/env'"
      pattern: "from ['\"].*lib/env['\"]"
    - from: "src/components/IosItpBanner.tsx"
      to: "sessionStorage 'aussieledger:ios-itp-banner-dismissed'"
      via: "sessionStorage.getItem / setItem with literal key string"
      pattern: "aussieledger:ios-itp-banner-dismissed"
    - from: "src/App.tsx"
      to: "LocalAdapter.getLastWriteAt / getLastExportAt for isDirty derivation"
      via: "useEffect polling on mount + after each write event; or re-derives via a useState updated by useBackupNag/DataPage cross-talk"
      pattern: "getLastWriteAt"
    - from: "src/App.tsx beforeunload handler"
      to: "window.addEventListener('beforeunload', ...) CONDITIONAL on isDirty"
      via: "useEffect with [isDirty] dep + early return when !isDirty so listener is genuinely unregistered (NOT always-registered with internal early-return)"
      pattern: "addEventListener\\(['\"]beforeunload"
---

<objective>
Wire Plan 11-1's LocalAdapter primitives into the UI: extend DataPage to render quota + persist-status + mount the iOS ITP banner; add `useBackupNag` hook surfacing the warn-tone Toast on App mount; add the `IosItpBanner` component with the locked verbatim copy + per-session sessionStorage dismiss; wire App.tsx for `useBackupNag()` + conditional `beforeunload` + `visibilitychange` listener pair (registered ONLY while `lastWriteAt > lastExportAt` so Firefox bfcache stays eligible). DataPage's `handleImport` adds the `setLastWriteAt(nowIso())` bump post-import (bulk imports are user-affecting content changes per CONTEXT decision). DataPage's `handleExport` clears the snooze key so the snooze doesn't outlive its motivation. Closes IDB-01..05 fully end-to-end.

Purpose: Wave-2 integration plan that consumes Plan 11-1's duck-typed accessors. Honours every locked decision from `11-CONTEXT.md`: backup-nag fires once per App mount (no per-write re-checks); ITP banner is DataPage-only and `isHostedMode()`-gated; quota text-only with silent null fallback; `beforeunload` registered conditionally; verbatim copy for ITP banner; `setLastExportAt` clears snooze. Preserves the baseline of 999 SPA + 18 server GREEN through Plan 11-1's additions (~1029) and adds ~30-50 new tests bringing the final v1.2 Phase 11 count to ~1050-1075 GREEN.

Output: 1 file extended (DataPage.tsx), 2 new component/hook files (IosItpBanner.tsx, useBackupNag.ts), 1 file extended (App.tsx), 4 test files (DataPage extended, IosItpBanner new, useBackupNag new, App.beforeunload new). All 5 IDB-01..05 requirements close.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/REQUIREMENTS.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/11-indexeddb-hardening/11-CONTEXT.md
@.planning/phases/11-indexeddb-hardening/11-1-PLAN.md
@.planning/research/STACK.md
@.planning/research/ARCHITECTURE.md
@.planning/research/PITFALLS.md

@src/components/DataPage.tsx
@src/components/Toast.tsx
@src/components/__tests__/DataPage.test.tsx
@src/components/__tests__/Toast.test.tsx
@src/storage/local.ts
@src/lib/env.ts
@src/lib/period.ts
@src/App.tsx
@src/hooks/useEntities.ts
@src/hooks/useAccounts.ts
@src/types.ts

<interfaces>
<!-- Key contracts extracted from the codebase + Plan 11-1's deliverables. -->

From src/storage/local.ts (Plan 11-1 deliverables — duck-typed; NOT in StorageAdapter interface):
```typescript
async getPersistGranted(): Promise<boolean | null>;     // true|false|null
async getStorageEstimate(): Promise<StorageEstimate | null>;
async getLastWriteAt(): Promise<string | null>;          // ISO or null
async setLastWriteAt(iso: string): Promise<void>;        // direct setter (used by handleImport)
// Existing (Phase 3):
async getLastExportAt(): Promise<string | null>;
async setLastExportAt(iso: string): Promise<void>;       // does NOT bump lastWriteAt (Plan 11-1)
async getEntities(): Promise<Entity[]>;                  // used for empty-adapter suppression
async getEntries(): Promise<Record<string, JournalEntry[]>>;  // same
```

From src/lib/period.ts (Plan 11-1 deliverable):
```typescript
export function nowIso(): string;   // _nowProvider().toISOString()
export function today(): Date;       // _nowProvider()
```

From src/lib/env.ts (Phase 10-1):
```typescript
export function isHostedMode(): boolean;   // strict === 'true' equality
```

From src/components/Toast.tsx (Phase 9 — existing, locked tone):
```typescript
export interface ToastProps {
  message: string;
  duration?: number;          // default 3000ms
  onDismiss: () => void;
  tone?: 'info' | 'warn';     // 'warn' = bg-amber-600
}
export const Toast: React.FC<ToastProps>;
```
**NOTE:** Toast does NOT currently accept action buttons inline. The hook implementation choices:
- Option A: Have `useBackupNag` return `{nagMessage, onExport, onSnooze}` and let App.tsx render TWO separate buttons OUTSIDE the Toast (one in the message body using inline JSX, one as a separate Toast-replacement banner). Cleanest: extend the Toast primitive in this plan with an optional `actions?: ReactNode` slot.
- Option B (RECOMMENDED): For Phase 11 ship, render a Toast with `message` containing the body text and ALSO render two action buttons immediately below the Toast (positioned by absolute/fixed CSS at the same top-of-viewport zone). The hook returns `{visible, message, onExport, onSnooze}`; App.tsx renders Toast + buttons together.
- Option C: Extend `ToastProps` with `actions?: ReactNode`. Cleanest API but widens the v1.1 "single-purpose" contract. CONTEXT decision allows this widening: "v1.2 is the next milestone; the backup nag is an appropriate widening" (per ARCHITECTURE.md §5).

**Planner decision (per CONTEXT "Claude's Discretion"):** Use Option C — extend Toast with `actions?: ReactNode`. Cleanest API; matches ARCHITECTURE.md's explicit recommendation. Update Toast.tsx in this plan (add 1 prop + 1 render slot below the message). The widening is justified by Phase 11's explicit need and documented in the SUMMARY.

iOS Safari UA detection (locked in CONTEXT.md `<specifics>`):
```typescript
function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) &&
    /Safari/.test(ua) &&
    !/CriOS|FxiOS|EdgiOS/.test(ua)
  );
}
```

Snooze + dismiss keys (locked from CONTEXT.md `<specifics>`):
```typescript
const BACKUP_NAG_SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';  // localStorage; ISO timestamp value
const ITP_BANNER_DISMISS_KEY = 'aussieledger:ios-itp-banner-dismissed';  // sessionStorage; 'true' string
```

Threshold constants (locked):
```typescript
const BACKUP_NAG_DAYS_DESKTOP = 7;
const BACKUP_NAG_DAYS_IOS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
```

Standalone-mode detection (locked):
```typescript
function isStandalone(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(display-mode: standalone)').matches === true;
}
```

Quota format helper (planner-implemented per CONTEXT.md `<decisions>` "Text-only one-liner"):
```typescript
function formatQuotaLine(est: StorageEstimate): string {
  const quota = est.quota ?? 0;
  const usage = est.usage ?? 0;
  // Quota usually GB-scale; usage usually MB-scale
  const quotaGB = (quota / 1e9).toFixed(1);    // "2.4"
  const usageMB = Math.round(usage / 1e6);     // 47
  return `~${quotaGB} GB allocated · ${usageMB} MB used`;
}
```
Note: if `est.quota` or `est.usage` is undefined (some Safari), formatQuotaLine returns a degraded string OR DataPage hides the entire line. Per CONTEXT.md decision: "silent fallback when estimate() returns null/undefined" — the safer route is the caller hides the line when either field is missing. Planner picks: check `if (est && typeof est.quota === 'number' && typeof est.usage === 'number')` before invoking formatQuotaLine; otherwise hide.

From src/components/__tests__/DataPage.test.tsx (existing patterns — match the React Testing Library + fake-indexeddb setup; mock navigator.storage same way as Plan 11-1's local-hardening.test.ts):
```typescript
// Read this file before extending so the new tests slot into the existing setUp/tearDown.
```

From src/App.tsx current shape (line 60 area — where `useBackupNag()` and the conditional listener useEffect mount):
```typescript
// Existing line ~60:
useEffect(() => { setIsSidebarOpen(false); }, [view]);

// NEW additions (after the existing useEffect):
// (1) useBackupNag() — mounts the hook; planner picks Option A/B/C from above for plumbing
const backupNag = useBackupNag();  // returns {visible, message, onExport, onSnooze} or fires via setToast callback

// (2) Derive isDirty for the beforeunload guard
const [isDirty, setIsDirty] = useState(false);
useEffect(() => {
  let cancelled = false;
  (async () => {
    const adapter = await getAdapter();
    const maybe = adapter as unknown as {
      getLastWriteAt?: () => Promise<string | null>;
      getLastExportAt?: () => Promise<string | null>;
    };
    const [lw, le] = await Promise.all([
      maybe.getLastWriteAt?.() ?? Promise.resolve(null),
      maybe.getLastExportAt?.() ?? Promise.resolve(null),
    ]);
    if (cancelled) return;
    // Dirty when lastWriteAt is set AND (lastExportAt is null OR lastWriteAt > lastExportAt)
    setIsDirty(!!lw && (!le || lw > le));
  })();
  return () => { cancelled = true; };
}, [/* re-run on save/export events — see action below */]);

// (3) Conditional beforeunload + visibilitychange registration
useEffect(() => {
  if (!isDirty) return;   // don't register at all when clean — Firefox bfcache preserved
  const beforeHandler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';   // legacy fallback for Chrome <119
  };
  // Blocker 2 fix — visibilitychange settle-point flush.
  // Honest about what each handler does: beforeunload OWNS the "are you sure?" prompt
  // (browser API restriction). visibilitychange CANNOT fire that prompt; what it CAN
  // do is force pending IDB writes to settle before iOS Safari may suspend the tab.
  // We do this by awaiting an IDB read on document.hidden + isDirty — the read won't
  // resolve until all in-flight write transactions land. Fire-and-forget pattern
  // because visibilitychange handlers cannot block. See REQUIREMENTS.md IDB-05
  // trailing note for the explicit handler-capability disclosure.
  const visHandler = () => {
    if (document.visibilityState !== 'hidden') return;
    if (!isDirty) return;
    void (async () => {
      try {
        const adapter = await getAdapter();
        const maybe = adapter as unknown as { getLastWriteAt?: () => Promise<string | null> };
        if (typeof maybe.getLastWriteAt === 'function') {
          await maybe.getLastWriteAt();
        }
      } catch { /* visibilitychange must never throw */ }
    })();
  };
  window.addEventListener('beforeunload', beforeHandler);
  document.addEventListener('visibilitychange', visHandler);
  return () => {
    window.removeEventListener('beforeunload', beforeHandler);
    document.removeEventListener('visibilitychange', visHandler);
  };
}, [isDirty]);
```
**isDirty re-derivation strategy (planner's discretion area):** The simplest re-derivation is to add a counter that increments on each successful save (hooks like `useEntities` already expose `createEntity`/`updateEntity` etc.; or App could just re-poll on a useEffect dep list including the relevant hook state). For Phase 11, the simplest correct path: re-poll `getLastWriteAt` + `getLastExportAt` on every render whose dep list includes `[entities, journalsHook.allEntries, auditLogs, accounts]` — these all change after a save, triggering a re-poll. The cost is one IDB read per save (cheap). Alternative: add a `useEffect` that polls every 5 seconds while the tab is visible. Planner picks: dep-list re-poll (no polling).

SPDX header pattern (copy verbatim onto new source files):
```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create useBackupNag hook + tests</name>
  <files>src/hooks/useBackupNag.ts, src/hooks/__tests__/useBackupNag.test.ts</files>
  <behavior>
    The hook signature (planner choice — Option C from `<interfaces>` block; extends Toast with `actions?: ReactNode` in Task 4, which lets the Toast itself carry the buttons):

    ```typescript
    export interface BackupNagState {
      visible: boolean;
      message: string;
      onExport: () => void;     // navigates to /data view
      onSnooze: () => void;     // writes localStorage key + dismisses
      onDismiss: () => void;    // dismisses without snoozing (clicking Toast body)
    }
    export function useBackupNag(navigateToData?: () => void): BackupNagState;
    ```

    Tests:
    - Test 1 (empty adapter suppression): when getEntities() returns [] AND getEntries() returns {}, hook returns `{visible: false, ...}` and never calls setToast — verified by mounting the hook in a test component and checking the rendered DOM has no Toast.
    - Test 2 (snoozed): localStorage 'aussieledger:backup-nag-snoozed-until' set to ISO of today() + 1 day → hook returns `visible: false`.
    - Test 3 (snooze expired): localStorage key set to ISO of today() - 1 day, adapter has data, lastExportAt is null → hook returns `visible: true` (snooze passed, threshold crossed via null-export).
    - Test 4 (never exported + non-empty adapter): lastExportAt = null, adapter has 1 entity → returns `visible: true`, message includes "back up" or "export" phrasing.
    - Test 5 (threshold not crossed — desktop UA): lastExportAt = today() - 5 days, non-iOS UA, adapter has data → returns `visible: false` (5d < 7d threshold).
    - Test 6 (threshold crossed — desktop UA): lastExportAt = today() - 8 days, non-iOS UA, adapter has data → returns `visible: true`.
    - Test 7 (threshold not crossed — iOS UA): lastExportAt = today() - 4 days, iOS Safari UA mocked, adapter has data → returns `visible: false` (4d < 5d threshold).
    - Test 8 (threshold crossed — iOS UA): lastExportAt = today() - 6 days, iOS Safari UA mocked, adapter has data → returns `visible: true` (6d > 5d threshold).
    - Test 9 (iOS UA detection rejects Chrome-iOS): UA mocked as iPhone + CriOS → uses desktop threshold (7d), not iOS threshold.
    - Test 10 (snooze button): calling `state.onSnooze()` writes localStorage 'aussieledger:backup-nag-snoozed-until' with ISO of today() + 7 days; subsequent re-mount of the hook returns `visible: false`.
    - Test 11 (export button): calling `state.onExport()` invokes the `navigateToData` callback passed in.
    - Test 12 (fires once per mount): mounting twice in a row with the same conditions still re-fires (it's per-mount, not per-session); but within a single mount, the visible flag does not toggle off → on → off based on adapter polling — the hook's useEffect has empty deps and runs exactly once.
  </behavior>
  <action>
    1. Create `src/hooks/useBackupNag.ts` with the SPDX header (verbatim from `<interfaces>`).

    2. Module-level constants:
       ```typescript
       const BACKUP_NAG_SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';
       const BACKUP_NAG_DAYS_DESKTOP = 7;
       const BACKUP_NAG_DAYS_IOS = 5;
       const MS_PER_DAY = 24 * 60 * 60 * 1000;
       ```

    3. Private helpers (module-level — exportable as named exports if useful for testing):
       ```typescript
       function isIosSafariUA(ua: string): boolean {
         return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
       }

       function readSnoozeUntil(): Date | null {
         try {
           const v = localStorage.getItem(BACKUP_NAG_SNOOZE_KEY);
           if (!v) return null;
           const d = new Date(v);
           return Number.isNaN(d.getTime()) ? null : d;
         } catch {
           return null;
         }
       }
       ```
       Export `isIosSafariUA` so tests can verify the regex directly.

    4. Implement the hook:
       ```typescript
       export function useBackupNag(navigateToData?: () => void): BackupNagState {
         const [state, setState] = useState<BackupNagState>({
           visible: false,
           message: '',
           onExport: () => {},
           onSnooze: () => {},
           onDismiss: () => {},
         });

         useEffect(() => {
           let cancelled = false;
           (async () => {
             // Snooze check (cheap; do first)
             const snoozeUntil = readSnoozeUntil();
             if (snoozeUntil && snoozeUntil.getTime() > today().getTime()) return;

             // Adapter probe + empty-adapter suppression
             const adapter = await getAdapter();
             const maybe = adapter as unknown as {
               getLastExportAt?: () => Promise<string | null>;
             };
             const [entities, entries, lastExportAt] = await Promise.all([
               adapter.getEntities(),
               adapter.getEntries(),
               maybe.getLastExportAt?.() ?? Promise.resolve(null),
             ]);
             if (cancelled) return;
             if (entities.length === 0 && Object.keys(entries).length === 0) return;

             // Threshold check
             const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
             const thresholdDays = isIosSafariUA(ua) ? BACKUP_NAG_DAYS_IOS : BACKUP_NAG_DAYS_DESKTOP;
             const thresholdMs = thresholdDays * MS_PER_DAY;
             const nowMs = today().getTime();

             let shouldNag = false;
             if (lastExportAt === null) {
               shouldNag = true;   // never exported but has data → nag
             } else {
               const lastExportMs = new Date(lastExportAt).getTime();
               if (Number.isFinite(lastExportMs) && (nowMs - lastExportMs) > thresholdMs) {
                 shouldNag = true;
               }
             }

             if (!shouldNag) return;

             const dismissOnly = () => setState(s => ({ ...s, visible: false }));
             const snoozeAction = () => {
               try {
                 const snoozeIso = new Date(today().getTime() + 7 * MS_PER_DAY).toISOString();
                 localStorage.setItem(BACKUP_NAG_SNOOZE_KEY, snoozeIso);
               } catch { /* ignore */ }
               dismissOnly();
             };
             const exportAction = () => {
               navigateToData?.();
               dismissOnly();
             };

             setState({
               visible: true,
               message: lastExportAt === null
                 ? 'You have unexported data. Export now to back up your tax data.'
                 : `Last export was over ${thresholdDays} days ago. Back up now to avoid data loss.`,
               onExport: exportAction,
               onSnooze: snoozeAction,
               onDismiss: dismissOnly,
             });
           })().catch((err) => { void err; /* never throw from a fire-and-forget effect */ });

           return () => { cancelled = true; };
         }, []);   // empty deps — fires once per mount, no per-write re-checks (CONTEXT locked decision)

         return state;
       }
       ```
       NOTE: the line `new Date(today().getTime() + 7 * MS_PER_DAY).toISOString()` introduces `new Date()` outside `src/lib/period.ts` which violates the Phase 2 structural lint. **FIX:** replace with `nowIso()` arithmetic via a helper. Cleanest: use Plan 11-1's `nowIso()` for "now" and compute snooze as `new Date(today().getTime() + 7 * MS_PER_DAY).toISOString()` — but the `new Date(...)` here is constructing from a timestamp, not creating a wall-clock instance. The Phase 2 lint targets `new Date()` (no-arg) specifically — verify this against the lint rule in `src/__tests__/structural-lint.test.ts` (or wherever the rule lives) before assuming a violation. If the lint flags ANY `new Date`, route the +7-day math through a tiny helper in `src/lib/period.ts` like:
       ```typescript
       // Add to period.ts in Task 1 of THIS plan (small extension to Plan 11-1's nowIso):
       export function addDaysIso(days: number): string {
         return new Date(_nowProvider().getTime() + days * 24 * 60 * 60 * 1000).toISOString();
       }
       ```
       Then `useBackupNag` calls `addDaysIso(7)`. **Planner decision: add `addDaysIso(days)` to `src/lib/period.ts`** so this plan stays inside the structural-lint invariant unambiguously. Update `src/lib/__tests__/period.test.ts` with 2 tests for `addDaysIso` (positive days, zero days). This is a small extension to Plan 11-1's `period.ts` work and lives in this plan because the call site is here.

    5. Create `src/hooks/__tests__/useBackupNag.test.ts` with SPDX header. Implement all 12 tests above using:
       - `@testing-library/react` `renderHook` for direct hook invocation OR a tiny test component wrapper
       - Adapter mocking pattern: install a fake `getAdapter()` via `vi.mock('../../storage', () => ({ getAdapter: vi.fn() }))`; return a stub adapter with controllable `getEntities` / `getEntries` / `getLastExportAt` returns
       - UA mocking: `Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'iPhone iOS Safari ...' })`; restore in afterEach
       - Clock injection: `_setNowProvider(() => new Date('2026-06-15T10:00:00.000Z'))`; `_resetNowProvider()` in afterEach
       - localStorage cleanup: `localStorage.clear()` in beforeEach
       - For Test 10 (snooze button), call `result.current.onSnooze()`, then assert `localStorage.getItem(BACKUP_NAG_SNOOZE_KEY)` equals the expected ISO (today + 7 days) and remount to verify `visible: false`.

    6. Why this matters: this is the ONLY surface for IDB-03. The hook's correctness is gated entirely by Plan 11-1's `getLastWriteAt` / `getLastExportAt` semantics being correct. Tests in this file lock the threshold/UA/snooze contract for the lifetime of v1.2+.

    Pitfalls to avoid:
    - Do NOT re-poll the adapter on visibilitychange — explicit CONTEXT deferral
    - Do NOT add a graduated escalation (same toast every time per CONTEXT)
    - Do NOT add a "Never show again" button per CONTEXT
    - Do NOT call `new Date()` directly — route through `today()` / `nowIso()` / `addDaysIso()`
  </action>
  <verify>
    <automated>npx vitest run src/hooks/__tests__/useBackupNag.test.ts src/lib/__tests__/period.test.ts</automated>
  </verify>
  <done>All 12 useBackupNag tests GREEN; 2 new addDaysIso tests GREEN; existing period tests still GREEN; hook fires exactly once per mount with correct threshold/UA/snooze branching; SPDX header present.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create IosItpBanner component + tests</name>
  <files>src/components/IosItpBanner.tsx, src/components/__tests__/IosItpBanner.test.tsx</files>
  <behavior>
    Tests for the gate matrix (returns null unless ALL 4 conditions pass; renders banner when ALL pass; dismiss button persists):

    - Test 1 (isHostedMode false): isHostedMode returns false; iOS Safari UA; not standalone; not dismissed → returns null
    - Test 2 (non-iOS UA): isHostedMode true; UA is desktop Chrome; not standalone; not dismissed → returns null
    - Test 3 (Chrome on iOS via CriOS): isHostedMode true; UA contains 'iPhone' and 'CriOS'; not standalone; not dismissed → returns null (CriOS rejected per locked regex)
    - Test 4 (Firefox on iOS via FxiOS): similar → returns null
    - Test 5 (Edge on iOS via EdgiOS): similar → returns null
    - Test 6 (standalone): isHostedMode true; iOS Safari UA; window.matchMedia('(display-mode: standalone)').matches=true; not dismissed → returns null (user has installed, banner unneeded)
    - Test 7 (sessionStorage dismissed): isHostedMode true; iOS Safari UA; not standalone; sessionStorage 'aussieledger:ios-itp-banner-dismissed' === 'true' → returns null
    - Test 8 (all gates pass): isHostedMode true; iOS Safari UA; not standalone; sessionStorage empty → renders the banner DOM containing the verbatim copy text
    - Test 9 (verbatim copy): rendered banner contains "Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe." (exact match)
    - Test 10 (How? expand): rendered banner contains a `<details>` element with a `<summary>` containing "How?" and the inner content mentions "Share" (the iOS Share menu)
    - Test 11 (dismiss button click): clicking the dismiss button sets sessionStorage 'aussieledger:ios-itp-banner-dismissed' to 'true' AND removes the banner from the DOM (re-render returns null)
    - Test 12 (dismiss persists across mounts within session): after clicking dismiss, unmount + remount the component → returns null on the second mount (reads sessionStorage)
  </behavior>
  <action>
    1. Create `src/components/IosItpBanner.tsx` with SPDX header.

    2. Module-level constant:
       ```typescript
       const ITP_BANNER_DISMISS_KEY = 'aussieledger:ios-itp-banner-dismissed';
       ```

    3. Component implementation:
       ```typescript
       import React, { useState, useEffect } from 'react';
       import { isHostedMode } from '../lib/env';

       function isIosSafari(): boolean {
         if (typeof navigator === 'undefined') return false;
         const ua = navigator.userAgent;
         return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
       }

       function isStandalone(): boolean {
         return typeof window !== 'undefined' &&
           typeof window.matchMedia === 'function' &&
           window.matchMedia('(display-mode: standalone)').matches === true;
       }

       function readDismissed(): boolean {
         try {
           return sessionStorage.getItem(ITP_BANNER_DISMISS_KEY) === 'true';
         } catch {
           return false;
         }
       }

       export const IosItpBanner: React.FC = () => {
         // Compute initial visibility synchronously so SSR/initial paint doesn't flash
         const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());

         // Gate matrix — ALL four conditions must pass
         if (!isHostedMode()) return null;
         if (!isIosSafari()) return null;
         if (isStandalone()) return null;
         if (dismissed) return null;

         const handleDismiss = () => {
           try { sessionStorage.setItem(ITP_BANNER_DISMISS_KEY, 'true'); } catch { /* ignore */ }
           setDismissed(true);
         };

         return (
           <div
             className="rounded-md bg-amber-50 border border-amber-200 p-3 my-3 text-sm text-amber-900"
             role="alert"
             data-testid="ios-itp-banner"
           >
             <div className="flex items-start gap-2">
               <div className="flex-1">
                 <p>
                   Heads up: iOS Safari may clear AussieLedger&apos;s stored data after 7 days of
                   no use. Add this app to your Home Screen to keep your data safe.
                 </p>
                 <details className="mt-2">
                   <summary className="cursor-pointer underline">How?</summary>
                   <ol className="list-decimal ml-5 mt-2 space-y-1">
                     <li>Tap the Share button at the bottom of Safari (square with an up arrow).</li>
                     <li>Scroll down and tap &quot;Add to Home Screen&quot;.</li>
                     <li>Tap &quot;Add&quot; in the top-right corner.</li>
                     <li>Launch AussieLedger from your Home Screen icon — your data will be preserved.</li>
                   </ol>
                 </details>
               </div>
               <button
                 onClick={handleDismiss}
                 className="text-amber-700 hover:text-amber-900 text-sm font-medium px-2"
                 aria-label="Dismiss iOS storage banner"
                 data-testid="ios-itp-banner-dismiss"
               >
                 Dismiss
               </button>
             </div>
           </div>
         );
       };
       ```

    4. **VERBATIM COPY ENFORCEMENT** — the user-locked text in step 3 is non-negotiable per CONTEXT.md `<decisions>` "iOS ITP banner placement + copy". Test 9 below asserts it exactly. Do NOT rewrite or shorten this text.

    5. Create `src/components/__tests__/IosItpBanner.test.tsx` with SPDX header. Implement all 12 tests:
       - Use `@testing-library/react` `render` + `screen` + `fireEvent`
       - Mock `isHostedMode`: `vi.mock('../../lib/env', () => ({ isHostedMode: vi.fn() }))`; in each test set `(isHostedMode as Mock).mockReturnValue(true|false)` as needed
       - Mock `navigator.userAgent`: `Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })` for iOS Safari; restore in afterEach
       - Mock `window.matchMedia`: `window.matchMedia = vi.fn().mockReturnValue({ matches: false })` for non-standalone; `matches: true` for standalone test
       - Mock `sessionStorage`: `sessionStorage.clear()` in beforeEach; `sessionStorage.setItem(...)` to set up dismissed-state tests
       - For Test 9 (verbatim copy): use `screen.getByText(/Heads up: iOS Safari may clear AussieLedger/)` to find the paragraph then assert its textContent against the full string
       - For Test 11 (dismiss click): `fireEvent.click(screen.getByTestId('ios-itp-banner-dismiss'))`; assert `sessionStorage.getItem('aussieledger:ios-itp-banner-dismissed')` === 'true' AND `screen.queryByTestId('ios-itp-banner')` is null

    Pitfalls to avoid:
    - The `apos` HTML-entity for "AussieLedger's" → React JSX uses `&apos;` inside JSX text; the rendered text is `'`. Test 9 should match the rendered text (`AussieLedger's`), not the source code.
    - `window.matchMedia` is not present in jsdom by default — `vi.fn().mockReturnValue({matches: false, ...})` stub is required.
    - Reading `sessionStorage` from the useState initialiser is correct — React calls the initialiser once per mount, so unmount/remount re-reads.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/IosItpBanner.test.tsx</automated>
  </verify>
  <done>12 IosItpBanner tests GREEN; banner returns null under each of the 4 single-failing-gate conditions + 3 UA-variant rejections; banner renders verbatim copy + How? expand when all gates pass; dismiss button persists in sessionStorage and hides the banner across remount within session.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Extend DataPage — quota render + persist-status + IosItpBanner mount + handleImport bump + handleExport snooze-clear</name>
  <files>src/components/DataPage.tsx, src/components/__tests__/DataPage.test.tsx</files>
  <behavior>
    Extend the existing DataPage tests with these new cases:

    - Test 1 (quota render — full estimate): mock adapter `getStorageEstimate` to return `{ quota: 2_400_000_000, usage: 47_000_000 }` → DataPage renders text "~2.4 GB allocated · 47 MB used"
    - Test 2 (quota hide — null estimate): mock to return null → quota line not in DOM; Adapter / Schema / Last Export rows unchanged
    - Test 3 (quota hide — partial estimate): mock to return `{ quota: undefined, usage: 47_000_000 }` → quota line not rendered (silent fallback)
    - Test 4 (persist-status — granted): mock `getPersistGranted` returns true → renders "Storage protected" (with check or similar)
    - Test 5 (persist-status — denied): mock returns false → renders "Storage not protected — back up regularly"
    - Test 6 (persist-status — null): mock returns null → status line not rendered at all
    - Test 7 (IosItpBanner mount): DataPage renders an `<IosItpBanner />` component reference (assert by checking `data-testid="ios-itp-banner"` presence under correct gate conditions — set up the gates as in Task 2; OR shallow-assert that the IosItpBanner component is present in the rendered tree via a vi.mock that replaces it with a sentinel)
    - Test 8 (handleImport bumps lastWriteAt): set up the import flow (existing pattern in DataPage.test.tsx for confirmImport); after `await adapter.importAll(...)` resolves, assert that `adapter.setLastWriteAt` was called with an ISO string equal to `nowIso()` at that moment
    - Test 9 (handleExport clears snooze): pre-populate localStorage `aussieledger:backup-nag-snoozed-until` = 'future-ISO'; trigger the export flow; assert localStorage key is REMOVED after export succeeds
    - Test 10 (handleExport does NOT bump lastWriteAt): pre-bump lastWriteAt; trigger export; assert lastWriteAt unchanged (sanity — this is Plan 11-1's invariant but defence-in-depth at the DataPage level too)
  </behavior>
  <action>
    1. Read existing `src/components/__tests__/DataPage.test.tsx` to understand the adapter-mocking + render-setup pattern. Match it for the new tests.

    2. Open `src/components/DataPage.tsx`. Add imports:
       ```typescript
       import { IosItpBanner } from './IosItpBanner';
       import { nowIso } from '../lib/period';   // already imports today from period — extend to include nowIso
       ```

    3. Add new state slots near the existing useState block (line ~65 area):
       ```typescript
       const [persistGranted, setPersistGranted] = useState<boolean | null>(null);
       const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
       ```

    4. Extend the existing `useEffect` (line ~74) — after the `setLastExport(ts)` call:
       ```typescript
       const maybeHardening = adapter as unknown as {
         getPersistGranted?: () => Promise<boolean | null>;
         getStorageEstimate?: () => Promise<StorageEstimate | null>;
       };
       if (typeof maybeHardening.getPersistGranted === 'function') {
         const g = await maybeHardening.getPersistGranted();
         if (!cancelled) setPersistGranted(g);
       }
       if (typeof maybeHardening.getStorageEstimate === 'function') {
         const est = await maybeHardening.getStorageEstimate();
         if (!cancelled) setStorageEstimate(est);
       }
       ```
       Same duck-typing pattern as the existing `getLastExportAt` block.

    5. Add the quota-format helper above the component:
       ```typescript
       function formatQuotaLine(est: StorageEstimate | null): string | null {
         if (!est) return null;
         if (typeof est.quota !== 'number' || typeof est.usage !== 'number') return null;
         const quotaGB = (est.quota / 1e9).toFixed(1);
         const usageMB = Math.round(est.usage / 1e6);
         return `~${quotaGB} GB allocated · ${usageMB} MB used`;
       }

       function formatPersistStatus(g: boolean | null): string | null {
         if (g === true) return 'Storage protected';
         if (g === false) return 'Storage not protected — back up regularly';
         return null;   // null → API not supported → hide
       }
       ```

    6. Mount `<IosItpBanner />` at the top of the return JSX, above the header (or directly after the header before the first `<section>`):
       ```typescript
       return (
         <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
           <IosItpBanner />
           <header>...</header>
           ...
         </div>
       );
       ```

    7. Extend the Status `<dl>` (line ~219) with two new rows — quota AND persist-status — wrapped in conditional rendering so they hide cleanly when null:
       ```typescript
       {formatQuotaLine(storageEstimate) !== null && (
         <div className="sm:col-span-2">
           <dt className="text-gray-500">Storage Budget</dt>
           <dd className="font-medium" data-testid="storage-quota">
             {formatQuotaLine(storageEstimate)}
           </dd>
         </div>
       )}
       {formatPersistStatus(persistGranted) !== null && (
         <div className="sm:col-span-2">
           <dt className="text-gray-500">Storage Protection</dt>
           <dd className="font-medium" data-testid="persist-status">
             {formatPersistStatus(persistGranted)}
           </dd>
         </div>
       )}
       ```

    8. Extend `handleExport` (line ~110): after the `await maybeLocal.setLastExportAt(iso)` block, add:
       ```typescript
       try { localStorage.removeItem('aussieledger:backup-nag-snoozed-until'); } catch { /* ignore */ }
       ```

    9. Extend `confirmImport` (line ~178): after `await adapter.importAll(pendingImport)` succeeds, add:
       ```typescript
       const maybeBump = adapter as unknown as { setLastWriteAt?: (iso: string) => Promise<void> };
       if (typeof maybeBump.setLastWriteAt === 'function') {
         await maybeBump.setLastWriteAt(nowIso());
       }
       ```
       This is the CONTEXT-decision-locked behaviour: bulk imports bump `lastWriteAt` (since `importAll` may go through a raw transaction that bypasses `bumpWriteAt` — defence-in-depth even though Plan 11-1's `importAll` already bumps internally).

    10. Extend the existing DataPage test file with the 10 new tests. Pattern:
        - Mock adapter via existing fixture; add the new methods as duck-typed mocks via Object.assign or extend the mock builder
        - For Test 1: render → assert `screen.getByTestId('storage-quota')` textContent matches `/~2\.4 GB allocated · 47 MB used/`
        - For Test 2/3/6: render → assert `screen.queryByTestId('storage-quota')` or `'persist-status'` is null
        - For Test 8: extend the existing `confirmImport` test (or add a parallel test) — after `fireEvent.click(screen.getByTestId('confirm-import'))` resolves, assert `mockAdapter.setLastWriteAt` was called once with a string matching the ISO regex
        - For Test 9: `localStorage.setItem('aussieledger:backup-nag-snoozed-until', '2030-01-01T00:00:00.000Z')`; click export button; await; assert `localStorage.getItem('aussieledger:backup-nag-snoozed-until')` === null

    Pitfalls to avoid:
    - `IosItpBanner` mocking in DataPage tests: shallow-replace via `vi.mock('../IosItpBanner', () => ({ IosItpBanner: () => null }))` so DataPage tests don't need to set up all 4 ITP gates. Add ONE dedicated DataPage test that DOES set up the gates and asserts the banner mount (Test 7).
    - `StorageEstimate` is a TS DOM lib type; import as `type StorageEstimate` if linting demands explicit type imports.
    - DataPage's `handleExport` uses `today().toISOString()` already (line ~125); leave that as-is — that's how `setLastExportAt` gets its ISO. The new snooze-clear is a separate operation after.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/DataPage.test.tsx src/components/__tests__/IosItpBanner.test.tsx</automated>
  </verify>
  <done>10 new DataPage tests GREEN; all existing DataPage tests still GREEN (existing Status section rendering, export/import flows still work); quota line renders correctly under full estimate, hides under null/partial; persist-status renders under granted/denied, hides under null; IosItpBanner mounts; handleImport bumps lastWriteAt; handleExport clears snooze key.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: Extend Toast with actions slot + extend Toast tests</name>
  <files>src/components/Toast.tsx, src/components/__tests__/Toast.test.tsx</files>
  <behavior>
    - Test 1 (no actions — default behaviour preserved): render `<Toast message="hello" onDismiss={fn} />` → no action area in DOM; existing v1.1 contract intact
    - Test 2 (actions slot renders): render `<Toast message="hello" onDismiss={fn} actions={<><button>A</button><button>B</button></>} />` → both buttons present in DOM; clicking does not auto-dismiss the toast (only the toast body click dismisses)
    - Test 3 (action click does not dismiss): clicking an action button does NOT call onDismiss (actions own their own behaviour)
    - Test 4 (existing tone='warn' still works alongside actions): combined render with `tone='warn'` + actions → amber-600 background still applied
  </behavior>
  <action>
    1. Open `src/components/Toast.tsx`. Extend the existing comment block to note the v1.2 widening:
       ```typescript
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Toast — lightweight transient-feedback primitive (Phase 9 UX-06 + FND-10/11/12 + Phase 11 IDB-03).
        * Phase 11 v1.2 widening: optional `actions` ReactNode slot to support the backup-nag's
        * "Export now" + "Snooze 7 days" buttons. Justified by ARCHITECTURE.md §5 explicit
        * recommendation. Do not widen further without a CONTEXT.md decision.
        */
       ```

    2. Update `ToastProps`:
       ```typescript
       export interface ToastProps {
         message: string;
         duration?: number;
         onDismiss: () => void;
         tone?: 'info' | 'warn';
         actions?: React.ReactNode;   // Phase 11 — optional action buttons rendered below the message
       }
       ```

    3. Update the JSX. Click-to-dismiss is currently on the outer wrapper — split so the message body dismisses but the actions don't:
       ```typescript
       return (
         <div
           className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 ${toneClass} text-white px-4 py-2 text-sm font-medium shadow-lg`}
           role="status"
           data-testid="toast"
         >
           <div onClick={onDismiss} className="cursor-pointer" data-testid="toast-message">
             {message}
           </div>
           {actions && (
             <div className="mt-2 flex gap-2" data-testid="toast-actions" onClick={(e) => e.stopPropagation()}>
               {actions}
             </div>
           )}
         </div>
       );
       ```

    4. Add the 4 tests to `src/components/__tests__/Toast.test.tsx`. Confirm existing Toast tests still pass (single-source-of-truth-message behaviour intact).

    Why: this widening is essential for the backup-nag UX. Per CONTEXT decision and ARCHITECTURE.md §5 explicit guidance, this is the cleanest API for v1.2.
  </action>
  <verify>
    <automated>npx vitest run src/components/__tests__/Toast.test.tsx</automated>
  </verify>
  <done>4 new Toast tests GREEN; existing Toast tests still GREEN; actions slot renders below message; action clicks don't dismiss; tone='warn' still applies amber-600.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Wire App.tsx — mount useBackupNag + conditional beforeunload/visibilitychange + render the Toast for the nag</name>
  <files>src/App.tsx, src/__tests__/App.beforeunload.test.tsx, .planning/REQUIREMENTS.md</files>
  <behavior>
    Tests for the App-level integration (`src/__tests__/App.beforeunload.test.tsx` — NEW file):

    - Test 1 (no listener when clean): mount App with adapter returning `lastWriteAt=null` (or `lastWriteAt <= lastExportAt`); spy on `window.addEventListener`; assert `addEventListener('beforeunload', ...)` was NEVER called for this mount
    - Test 2 (listener registered when dirty): mount App with adapter returning `lastWriteAt='2026-06-15T10:00:00.000Z'` AND `lastExportAt=null`; assert `addEventListener('beforeunload', ...)` was called at least once after the isDirty-deriving useEffect resolves
    - Test 3 (visibilitychange paired with beforeunload): when isDirty=true, both `window.addEventListener('beforeunload', ...)` AND `document.addEventListener('visibilitychange', ...)` are registered together
    - Test 4 (handler invokes preventDefault + returnValue): capture the registered handler; simulate the event; assert `e.preventDefault()` was called AND `e.returnValue` was set to `''`
    - Test 5 (cleanup on isDirty going false): mount with isDirty=true (listener registered); simulate export (mock adapter `getLastExportAt` to now return ISO > lastWriteAt); force re-render; assert `removeEventListener('beforeunload', ...)` was called (cleanup ran)
    - Test 6 (useBackupNag mounted): App renders Toast with tone='warn' when adapter conditions trigger the nag (use the same conditions as useBackupNag Test 4: empty snooze + non-empty adapter + lastExportAt=null → toast appears)
    - Test 7 (Toast actions include Export + Snooze): the nag Toast renders both "Export now" and "Snooze 7 days" buttons (via the actions slot from Task 4)
    - Test 8 (visibilitychange handler settle-point flush — Blocker 2 fix): when isDirty=true AND the registered visibilitychange handler fires with document.visibilityState='hidden', the handler invokes adapter.getLastWriteAt() (spy on the mock; assert called); when isDirty=false the handler does NOT call getLastWriteAt (early return)
    - Test 9 (visibilitychange handler does NOT throw): force adapter.getLastWriteAt to reject; fire visibilitychange with hidden=true; assert no unhandled error reaches the test (caught silently per the implementation)
  </behavior>
  <action>
    1. Open `src/App.tsx`. Add imports:
       ```typescript
       import { useBackupNag } from './hooks/useBackupNag';
       import { Toast } from './components/Toast';
       import { getAdapter } from './storage';
       ```

    2. In the App function body, before the return JSX, add the hook + isDirty derivation + listener useEffect (per the `<interfaces>` block):
       ```typescript
       // Phase 11 IDB-03 — backup-nag hook
       const nag = useBackupNag(() => setView('data'));

       // Phase 11 IDB-05 — isDirty derivation for beforeunload+visibilitychange guard
       const [isDirty, setIsDirty] = useState(false);
       useEffect(() => {
         let cancelled = false;
         (async () => {
           try {
             const adapter = await getAdapter();
             const maybe = adapter as unknown as {
               getLastWriteAt?: () => Promise<string | null>;
               getLastExportAt?: () => Promise<string | null>;
             };
             const lw = (await maybe.getLastWriteAt?.()) ?? null;
             const le = (await maybe.getLastExportAt?.()) ?? null;
             if (cancelled) return;
             setIsDirty(!!lw && (!le || lw > le));
           } catch { /* ignore — defaults to not dirty */ }
         })();
         return () => { cancelled = true; };
         // Re-poll after each save by including the hook state slices that change post-save:
       }, [entities, journalsHook.allEntries, auditLogs, accounts]);

       // Phase 11 IDB-05 — conditional beforeunload + visibilitychange registration
       useEffect(() => {
         if (!isDirty) return;   // CRITICAL: do NOT register when clean — Firefox bfcache preserved
         const beforeHandler = (e: BeforeUnloadEvent) => {
           e.preventDefault();
           e.returnValue = '';
         };
         // Phase 11 IDB-05 (Blocker 2 fix) — visibilitychange settle-point flush.
         // visibilitychange CANNOT fire a confirmation dialog (browser API only permits
         // that from beforeunload). What it CAN do: when the tab is becoming hidden AND
         // we are dirty, await an IDB read against the meta store. Awaiting a read on
         // IndexedDB forces any in-flight write transaction (e.g. a sub-second-prior
         // bumpWriteAt from a save that just completed) to settle before the event loop
         // yields. This is a real architectural "flush settle point" pattern — it
         // doesn't push pending data; it ensures the IDB pipeline is empty before
         // iOS Safari may suspend the tab. Per REQUIREMENTS.md IDB-05 trailing note,
         // this is HONESTLY all visibilitychange can do; the "are you sure?" prompt
         // remains a beforeunload-exclusive capability.
         const visHandler = () => {
           if (document.visibilityState !== 'hidden') return;
           if (!isDirty) return;
           // Fire-and-forget — visibilitychange handlers cannot block, so we kick off
           // a settle-point read without awaiting from inside the handler. The read
           // itself awaits all pending IDB writes per IDB transaction semantics.
           void (async () => {
             try {
               const adapter = await getAdapter();
               const maybe = adapter as unknown as { getLastWriteAt?: () => Promise<string | null> };
               if (typeof maybe.getLastWriteAt === 'function') {
                 await maybe.getLastWriteAt();   // settle-point — forces in-flight writes to land
               }
             } catch {
               // visibilitychange must NEVER throw — silent on error
             }
           })();
         };
         window.addEventListener('beforeunload', beforeHandler);
         document.addEventListener('visibilitychange', visHandler);
         return () => {
           window.removeEventListener('beforeunload', beforeHandler);
           document.removeEventListener('visibilitychange', visHandler);
         };
       }, [isDirty]);
       ```

    3. In the return JSX (at the top, alongside or above the MainLayout), conditionally render the nag Toast:
       ```typescript
       {nag.visible && (
         <Toast
           message={nag.message}
           tone="warn"
           duration={10000}
           onDismiss={nag.onDismiss}
           actions={
             <>
               <button
                 onClick={nag.onExport}
                 className="px-3 py-1 bg-white text-amber-700 text-xs font-medium rounded"
                 data-testid="backup-nag-export"
               >
                 Export now
               </button>
               <button
                 onClick={nag.onSnooze}
                 className="px-3 py-1 bg-amber-700 text-white text-xs font-medium rounded"
                 data-testid="backup-nag-snooze"
               >
                 Snooze 7 days
               </button>
             </>
           }
         />
       )}
       ```

    4. Create `src/__tests__/App.beforeunload.test.tsx` with SPDX header. Implement the 9 tests:
       - Use `@testing-library/react` `render` + `act`
       - Mock `getAdapter()` via `vi.mock('../storage', () => ({ getAdapter: vi.fn(...), initAdapter: vi.fn(...), getAdapterKind: vi.fn(...) }))`
       - For listener spy: `const addSpy = vi.spyOn(window, 'addEventListener');` and `const docSpy = vi.spyOn(document, 'addEventListener');` — assert called with the right event names
       - For Test 4 (handler behaviour): capture handler from spy's args, invoke with a fake event object `{ preventDefault: vi.fn(), returnValue: 'initial' }`, assert preventDefault was called AND returnValue === ''
       - For Test 5 (cleanup): start with dirty state, then mutate the mock adapter so subsequent re-renders compute isDirty=false; assert `removeEventListener` spy was called with 'beforeunload' AND 'visibilitychange'
       - For Test 6/7 (nag Toast): use the same useBackupNag-triggering conditions; assert `screen.getByTestId('toast')` is present AND `screen.getByTestId('backup-nag-export')` + `screen.getByTestId('backup-nag-snooze')` are present
       - For Test 8 (Blocker 2 — settle-point flush): capture the visibilitychange handler from `docSpy.mock.calls`; set `Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })`; invoke the handler; with `await new Promise(r => setTimeout(r, 0))` to let the fire-and-forget microtask run; assert `mockAdapter.getLastWriteAt` was called (spy)
       - For Test 9 (Blocker 2 — handler swallows errors): set `mockAdapter.getLastWriteAt.mockRejectedValueOnce(new Error('boom'))`; invoke the visibilitychange handler with hidden=true; await microtask; assert no error reached the test (use `process.on('unhandledRejection')` listener with a flag, or wrap the await in try/catch and assert no throw)

    5. **Blocker 2 fix companion — add the REQUIREMENTS.md trailing note for IDB-05:**
       Open `.planning/REQUIREMENTS.md`. Find the IDB-05 requirement bullet (line near 28). At the end of the requirement description, append a one-sentence italicised note documenting the honest division of handler responsibility:
       ```markdown
       - [ ] **IDB-05**: `beforeunload` + `visibilitychange` guard fires a browser-native "are you sure you want to leave?" prompt when `lastWriteAt > lastExportAt`. Listener is registered/unregistered conditionally (NOT permanently) to avoid Firefox bfcache exclusion. `visibilitychange` complement is required because iOS Safari fires `beforeunload` unreliably. *v1.2 implementation note: the visibilitychange handler performs a settle-point IDB read (forces pending write transactions to land before iOS Safari may suspend the tab) — it does NOT fire a confirmation dialog because browser APIs only permit that from beforeunload. The "are you sure?" prompt is beforeunload-exclusive.*
       ```
       This is a 1-sentence append at the end of the existing IDB-05 bullet. Do NOT modify other parts of REQUIREMENTS.md. Verify with `npx grep -nF "visibilitychange handler performs a settle-point" .planning/REQUIREMENTS.md` (1 match expected).

    Pitfalls to avoid:
    - The isDirty-deriving useEffect's dep list must include slices that change on save. The current App dep candidates are `entities, journalsHook.allEntries, auditLogs, accounts`. Verify these are the actual react state references in App.tsx (they are — see lines 41–57). DO NOT add a polling setInterval — CONTEXT explicit deferral.
    - Do NOT register `beforeunload` always-on with internal `if (!isDirty) return` — Firefox bfcache eligibility is the entire reason for the conditional registration pattern. Test 1 explicitly checks this.
    - When mocking `getAdapter`, ensure the duck-typed `getLastWriteAt` / `getLastExportAt` methods return Promises (not raw values) — the production code uses `await`.
    - App.tsx renders BOTH MainLayout AND the conditional Toast. Position the Toast OUTSIDE MainLayout (sibling) so the fixed-positioning Toast styles work correctly.
  </action>
  <verify>
    <automated>npx vitest run src/__tests__/App.beforeunload.test.tsx src/components/__tests__/DataPage.test.tsx src/hooks/__tests__/useBackupNag.test.ts</automated>
  </verify>
  <done>9 App-level integration tests GREEN; listener registered ONLY when isDirty=true; visibilitychange paired with beforeunload; beforeunload handler calls preventDefault + sets returnValue=''; visibilitychange handler awaits getLastWriteAt() on hidden+dirty (Blocker 2 settle-point flush); visibilitychange handler swallows adapter errors; cleanup runs on isDirty going false; nag Toast renders with both Export-now + Snooze-7-days buttons when conditions met; REQUIREMENTS.md IDB-05 carries the honest visibilitychange-vs-beforeunload capability disclosure.</done>
</task>

<task type="auto">
  <name>Task 6: Full baseline verification — lint + build + full SPA suite GREEN + Phase 11 acceptance walkthrough</name>
  <files>(no source changes — verification only)</files>
  <action>
    1. Run `npm run lint` — must EXIT 0. Common Phase 11 lint pitfalls:
       - Unused imports in App.tsx after edits → remove
       - React hook dep-list warnings on the isDirty useEffect → ensure deps match the captured state slices
       - Implicit any on the duck-typed adapter shapes → tighten with `as unknown as { ... }` explicit shape

    2. Run `npm run build` — must EXIT 0 (includes `scripts/scan-aiza.mjs`). Build success proves the Phase 2 structural lint passes (no rogue `new Date()` outside `period.ts`).

    3. Verify the structural lint specifically: `grep -n "new Date" src/storage/local.ts src/components/DataPage.tsx src/components/IosItpBanner.tsx src/hooks/useBackupNag.ts src/App.tsx`
       - Acceptable matches: zero in `local.ts`, `IosItpBanner.tsx`. `DataPage.tsx` may have `new Date(iso)` for parsing the lastExport string (line 51 — pre-existing, allowed). `App.tsx` may have NONE. `useBackupNag.ts` may have `new Date(lastExportAt)` for parsing (allowed; not generating a wall-clock instance).
       - If any wall-clock `new Date()` (no-arg) appears outside `period.ts`, route through `today()` or `nowIso()` or `addDaysIso(...)`.

    4. Run the FULL test suite: `npx vitest run`. Confirm:
       - SPA tests: ~1029 (after Plan 11-1) + ~50 new (Tasks 1-5: 12 useBackupNag + 12 IosItpBanner + 10 DataPage + 4 Toast + 7 App + 2 addDaysIso = ~47) = ~1076 GREEN; 11 todo; 0 RED
       - Server tests: 18 GREEN (unchanged)
       - No flakes; no skipped tests beyond the existing 11 todos

    5. **Phase 11 acceptance walkthrough** — manually verify all 5 ROADMAP Phase 11 success criteria are met end-to-end by checking the wired pieces:
       - SC-1 (persist + display): `LocalAdapter.init()` calls `tryPersist()` (Plan 11-1); `DataPage` renders persist-status line under getPersistGranted (Task 3) — ✓
       - SC-2 (quota disclosure): `getStorageEstimate()` returns estimate (Plan 11-1); DataPage renders text-only line (Task 3) — ✓
       - SC-3 (backup-nag with snooze): `useBackupNag` hook (Task 1); mounted in App.tsx (Task 5); Toast renders with both buttons (Task 4 + 5); snooze key in localStorage; cleared by DataPage export (Task 3) — ✓
       - SC-4 (iOS ITP banner): `IosItpBanner` (Task 2); mounted in DataPage (Task 3); sessionStorage dismiss; isHostedMode + iOS Safari UA + !standalone gates — ✓
       - SC-5 (beforeunload+visibilitychange conditional): App.tsx useEffect with [isDirty] dep (Task 5); listener PAIR registered ONLY when dirty; cleanup on dirty going false; visibilitychange handler performs settle-point flush via await getLastWriteAt() on hidden+dirty (Blocker 2 fix); REQUIREMENTS.md IDB-05 carries the visibilitychange-vs-beforeunload capability disclosure — ✓

    6. **No regression check** — confirm Plan 11-1's local-hardening.test.ts is still GREEN; confirm existing v1.0/v1.1 tests still GREEN (especially DataPage's existing export/import flow tests — they should still pass with the new lastWriteAt-bumping + snooze-clearing logic).

    7. If any Phase 11-1 baseline assumption broke (e.g. a v1.0 test that counted IDB puts now sees 2x as many puts because of the bumpWriteAt) — diagnose, fix the test assertion with a comment explaining the Phase 11 IDB-05 widening.
  </action>
  <verify>
    <automated>npm run lint && npm run build && npx vitest run</automated>
  </verify>
  <done>Lint EXIT 0; build EXIT 0 (incl. AIza scan); ~1078 SPA GREEN + 11 todo + 18 server GREEN; zero unintended `new Date()` matches; structural-lint test (Plan 11-1 Task 3) still GREEN; all 5 ROADMAP Phase 11 success criteria verifiable by inspection of the wired pieces (SC-5 visibilitychange has a real settle-point body — Blocker 2 fix); REQUIREMENTS.md IDB-05 carries the honest capability disclosure.</done>
</task>

</tasks>

<verification>
**Plan-level verification (after all 6 tasks complete):**

1. `useBackupNag` exists and exports correctly — verify with `npx grep -n "export function useBackupNag" src/hooks/useBackupNag.ts`
2. `IosItpBanner` exists and renders verbatim copy — verify with `npx grep -nF "Heads up: iOS Safari may clear AussieLedger" src/components/IosItpBanner.tsx`
3. DataPage mounts IosItpBanner — verify with `npx grep -n "<IosItpBanner" src/components/DataPage.tsx`
4. DataPage's handleImport bumps lastWriteAt — verify with `npx grep -n "setLastWriteAt(nowIso" src/components/DataPage.tsx`
5. DataPage's handleExport clears snooze — verify with `npx grep -nF "removeItem('aussieledger:backup-nag-snoozed-until')" src/components/DataPage.tsx`
6. App.tsx mounts useBackupNag — verify with `npx grep -n "useBackupNag(" src/App.tsx`
7. App.tsx beforeunload listener is conditional — verify with `npx grep -n "addEventListener('beforeunload'" src/App.tsx` AND inspect the surrounding useEffect for `[isDirty]` dep + `if (!isDirty) return;` early return BEFORE the addEventListener call
8. Toast widening preserved — verify `ToastProps` includes `actions?: ReactNode` field
9. Snooze key matches CONTEXT verbatim — `grep -rn "aussieledger:backup-nag-snoozed-until" src/` should appear in useBackupNag.ts + DataPage.tsx only
10. ITP dismiss key matches — `grep -rn "aussieledger:ios-itp-banner-dismissed" src/` should appear in IosItpBanner.tsx only
11. iOS UA regex matches CONTEXT — `grep -rn "CriOS|FxiOS|EdgiOS" src/` should appear in useBackupNag.ts AND IosItpBanner.tsx
12. Blocker 2 — App.tsx visHandler has a real body — verify with `npx grep -nF "await maybe.getLastWriteAt()" src/App.tsx` (1 match inside the visibilitychange handler)
13. Blocker 2 — REQUIREMENTS.md IDB-05 trailing note present — verify with `npx grep -nF "visibilitychange handler performs a settle-point" .planning/REQUIREMENTS.md` (1 match)
</verification>

<success_criteria>
- [ ] `useBackupNag` hook fires once per App mount, suppresses on empty adapter / snoozed / threshold-not-crossed, surfaces warn-tone Toast with Export-now + Snooze-7-days actions
- [ ] iOS Safari UA detection uses the locked regex: `/iPad|iPhone|iPod/ && /Safari/ && !/CriOS|FxiOS|EdgiOS/`
- [ ] Backup-nag thresholds: 7 days desktop, 5 days iOS Safari
- [ ] Snooze key: `aussieledger:backup-nag-snoozed-until` in localStorage; ISO timestamp value; cleared by DataPage's handleExport
- [ ] `IosItpBanner` component renders ONLY when isHostedMode + iOS Safari + !standalone + !dismissed — all 4 gates required
- [ ] IosItpBanner verbatim copy: "Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe."
- [ ] IosItpBanner includes inline `<details>` "How?" expand with Share-menu Add-to-Home-Screen steps
- [ ] IosItpBanner dismiss key: `aussieledger:ios-itp-banner-dismissed` in sessionStorage; per-session; cleared at session end
- [ ] DataPage renders quota line "~X GB allocated · Y MB used" when estimate present; hides entirely when estimate null/partial (silent fallback)
- [ ] DataPage renders persist-status: "Storage protected" (granted=true), "Storage not protected — back up regularly" (granted=false), hidden (granted=null)
- [ ] DataPage mounts `<IosItpBanner />` ONCE
- [ ] DataPage's handleImport calls `setLastWriteAt(nowIso())` after successful importAll
- [ ] DataPage's handleExport calls `localStorage.removeItem('aussieledger:backup-nag-snoozed-until')` after successful setLastExportAt
- [ ] Toast extended with optional `actions?: ReactNode` slot (justified Phase 11 widening); existing single-purpose contract preserved when actions omitted
- [ ] App.tsx mounts `useBackupNag()` once at root
- [ ] App.tsx registers `beforeunload` + `visibilitychange` listener PAIR CONDITIONALLY on isDirty — Firefox bfcache preserved
- [ ] `beforeunload` handler calls `e.preventDefault()` AND sets `e.returnValue = ''` (Chrome 119+ + legacy fallback)
- [ ] `visibilitychange` handler (Blocker 2 fix) — on document.hidden + isDirty performs fire-and-forget `await adapter.getLastWriteAt()` settle-point flush; swallows errors; HONESTLY documented as not capable of firing the are-you-sure dialog (beforeunload-only)
- [ ] `.planning/REQUIREMENTS.md` IDB-05 gains a one-sentence trailing note disclosing the visibilitychange-vs-beforeunload capability division
- [ ] isDirty re-derives on every save (dep list includes entities/journals/auditLogs/accounts state slices)
- [ ] `addDaysIso(days: number): string` added to `src/lib/period.ts` so useBackupNag's snooze-arithmetic stays inside the structural-lint invariant
- [ ] Zero unintended `new Date()` calls in `src/storage/local.ts`, `src/components/IosItpBanner.tsx`, `src/App.tsx` (parsing `new Date(iso)` from a string IS allowed; wall-clock `new Date()` is NOT)
- [ ] All 5 ROADMAP Phase 11 success criteria verifiable by walking the wired pieces
- [ ] All 5 IDB-01..05 requirements closed
- [ ] ~52 new tests across the 5 files (Tasks 1-5: 12 useBackupNag + 12 IosItpBanner + 10 DataPage + 4 Toast + 9 App + 5 addDaysIso = ~52, of which 2 are Blocker 2 settle-point/swallow-errors tests) all GREEN; existing v1.0/v1.1 + Plan 11-1 tests still GREEN
- [ ] `npm run lint` EXIT 0; `npm run build` EXIT 0 (incl. AIza scan)
- [ ] SPDX header on all new source/test files (useBackupNag, IosItpBanner, App.beforeunload.test, DataPage extensions match existing pattern)

**Out of scope (from CONTEXT.md `<deferred>` — explicitly NOT in this plan):**
- Visibility-change re-check of backup-nag threshold
- Live-polling quota (e.g. setInterval)
- Progress-bar visual for quota
- "Never show again" button on backup-nag
- Backup-nag escalation after N snoozes
- App-wide ITP banner placement
- Permanent localStorage dismiss for ITP banner
- ITP banner in self-host mode (gated on isHostedMode())
- Re-prompting persist() after user deny
- Migration writes bumping lastWriteAt
- AnomalyBadge for persist outcome (existing Toast/text inline label is sufficient)
- Custom-text beforeunload dialog (browsers ignore custom strings)
- Anonymous telemetry of persist-grant / banner-conversion rates
</success_criteria>

<output>
After completion, create `.planning/phases/11-indexeddb-hardening/11-2-SUMMARY.md` covering:
- Tasks completed (6 tasks)
- Files created (3: IosItpBanner.tsx, useBackupNag.ts, App.beforeunload.test.tsx + 3 sibling test files)
- Files modified (4: DataPage.tsx, App.tsx, Toast.tsx, period.ts/period.test.ts for addDaysIso)
- Test counts (~1029 → ~1076 SPA GREEN; 18 server unchanged)
- Decisions made within "Claude's Discretion" scope (Toast actions slot widening; addDaysIso added to period.ts; isDirty re-derivation via dep list not polling)
- Any baseline regressions found + their fix (especially around DataPage test fixtures + Toast click-handler split)
- Phase 11 acceptance verification: all 5 ROADMAP success criteria walked through
- Handoff for Phase 11 close: IDB-01..05 all closed; ready for `/gsd:verify-phase 11` then UAT
</output>
