---
phase: 13-pwa-wrapper
plan: 2
type: execute
wave: 2
depends_on: [13-1]
files_modified:
  - src/hooks/useUpdateBanner.ts
  - src/hooks/__tests__/useUpdateBanner.test.ts
  - src/components/UpdateBanner.tsx
  - src/components/__tests__/UpdateBanner.test.tsx
  - src/App.tsx
  - src/vite-env.d.ts
autonomous: false
requirements: [PWA-01]
tdd: true

must_haves:
  truths:
    - "src/vite-env.d.ts gains a /// <reference types=\"vite-plugin-pwa/client\" /> triple-slash directive at the top (alongside any existing /// <reference types=\"vite/client\" /> line) so the virtual:pwa-register module's TypeScript types resolve cleanly. The directive is the canonical pattern documented by vite-plugin-pwa README v1.3.x; the alternative (a per-file directive) clutters useUpdateBanner.ts."
    - "src/hooks/useUpdateBanner.ts is a NEW hook with SPDX header. Exports a single hook useUpdateBanner(): { needRefresh: boolean; triggerUpdate: () => void; snooze: () => void; visible: boolean }. Wires registerSW from 'virtual:pwa-register' EXACTLY ONCE per App mount (useEffect with empty dep list). Stores the updateSW callback in a useRef so triggerUpdate() can call updateSW(true) without re-renders."
    - "useUpdateBanner() implementation: useEffect-mount imports registerSW dynamically (so the hook is tree-shake-safe in tests where the virtual module isn't available — wraps in try/catch returning null updateSW; tests get an injectable seam via __setRegisterSWForTests). On onNeedRefresh callback, setNeedRefresh(true). On onOfflineReady callback, do nothing — silent success per CONTEXT (no positive-state banner)."
    - "useUpdateBanner sessionStorage snooze: snooze() writes sessionStorage.setItem('aussieledger:pwa-update-snoozed', 'true') + setNeedRefresh(false). visible is derived: needRefresh === true AND sessionStorage.getItem('aussieledger:pwa-update-snoozed') !== 'true'. Snooze key is per-session — re-fires on next browser session if SW still has a pending update. Differs from Phase 11's 'aussieledger:ios-itp-banner-dismissed' key (Phase 11 uses a different key so the two banners' dismiss state is independent)."
    - "useUpdateBanner triggerUpdate() calls updateSW(true) (which fires SKIP_WAITING postMessage + window.location.reload via vite-plugin-pwa internals) when updateSW ref is non-null. When updateSW ref is null (test environment OR pre-SW-load), triggerUpdate() is a no-op (defensive — never throws)."
    - "useUpdateBanner exposes a test seam: an exported __setRegisterSWForTests(fn: (opts: { onNeedRefresh, onOfflineReady }) => (force: boolean) => void): void function (named export, NOT default-export). Calling this BEFORE the hook mounts replaces the dynamic import of 'virtual:pwa-register' with the provided fn. Cleared between tests via beforeEach( () => __setRegisterSWForTests(undefined) ). This avoids needing vitest module-mocking infrastructure that virtual modules require."
    - "src/components/UpdateBanner.tsx is a NEW component with SPDX header. Visual: neutral-stone palette matching the post-Phase-11 AdapterFallbackBanner (bg-stone-50 border-b border-stone-300 text-stone-700 px-4 py-2 text-sm). Icon: lucide-react RefreshCw (semantically distinct from AdapterFallbackBanner's Database icon)."
    - "UpdateBanner copy is VERBATIM (CONTEXT-locked, do NOT word-smith): 'A new version of AussieLedger is available.' followed by two buttons: 'Update' (primary, blue-ish: bg-blue-600 text-white hover:bg-blue-700) and 'Later' (secondary, neutral: text-stone-700 hover:text-stone-900 underline)."
    - "UpdateBanner consumes useUpdateBanner() and renders ONLY when state.visible === true. When hidden, returns null (no DOM at all — does not occupy layout space, does not affect existing snapshot tests of App.tsx)."
    - "UpdateBanner role='status' (informational, not alert — matches AdapterFallbackBanner pattern). data-testid='update-banner'. The Update button has data-testid='update-banner-update'; the Later button has data-testid='update-banner-later'."
    - "src/App.tsx mounts <UpdateBanner /> at the SAME LEVEL as the existing <Toast> rendering for backup nag — INSIDE the React fragment, AFTER the </MainLayout> closing tag. Banner is a top-of-app sibling to the Toast layer. The existing useBackupNag hook + Toast block is UNTOUCHED. Order: <MainLayout>...</MainLayout> then {nag.visible && <Toast .../>} (existing) then <UpdateBanner /> (NEW)."
    - "Wait — placement correction: per CONTEXT 'top-of-app banner placement — sibling to AdapterFallbackBanner', the natural mount site is within MainLayout's banner row (where AdapterFallbackBanner already lives). HOWEVER changing MainLayout's shape is out of scope (risk of disturbing the existing layout-shell tests). Compromise: <UpdateBanner /> mounts at the TOP of App.tsx's returned JSX, BEFORE <MainLayout> — uses position:sticky top:0 z-50 (or fixed top-0 left-0 right-0 z-50) so it sits visually above MainLayout's chrome regardless of scroll position. App.tsx becomes <><UpdateBanner /><MainLayout>...</MainLayout>{nag.visible && <Toast .../>}</>."
    - "UpdateBanner uses className 'fixed top-0 left-0 right-0 z-50' so it floats above the MainLayout chrome (Header + Sidebar + content). The existing MainLayout content does not need padding adjustment — banner is only visible when needRefresh AND not-snoozed, which is rare; a brief 40px shift is acceptable. Alternative (relative position) would require modifying MainLayout to add top padding; we explicitly avoid that scope."
    - "src/App.tsx changes are SURGICALLY MINIMAL: one new import line (`import { UpdateBanner } from './components/UpdateBanner';`) + one new JSX line (`<UpdateBanner />` as first child of the returned fragment). The existing 230 lines of App.tsx (useBackupNag block, useEffect[isDirty] beforeunload+visibilitychange block, Toast render) are UNCHANGED — this preserves the Phase 11 IDB-05 settle-point flush + bfcache pattern verbatim."
    - "src/components/__tests__/UpdateBanner.test.tsx covers 6 test cases: (1) renders nothing when needRefresh=false; (2) renders banner DOM + verbatim copy when needRefresh=true and not-snoozed; (3) Update button click invokes the triggerUpdate function (via injected useUpdateBanner mock); (4) Later button click invokes snooze and hides the banner; (5) sessionStorage 'aussieledger:pwa-update-snoozed'='true' suppresses render even when needRefresh=true; (6) role='status' present and aria-label-friendly markup."
    - "src/hooks/__tests__/useUpdateBanner.test.ts covers 6 test cases: (1) onNeedRefresh callback flips needRefresh to true; (2) onOfflineReady callback does NOT flip needRefresh (silent); (3) snooze() sets sessionStorage key and flips visible to false; (4) sessionStorage pre-set suppresses initial visible state; (5) triggerUpdate() calls the updateSW returned by registerSW; (6) hook unmount + remount preserves sessionStorage snooze across React lifecycle."
    - "The 12 new tests (6 component + 6 hook) ALL pass with the injected __setRegisterSWForTests seam — no test imports 'virtual:pwa-register' directly (the virtual module is unavailable in Vitest's jsdom environment). beforeEach clears sessionStorage + resets the seam to undefined."
    - "Manual smoke checkpoint: build + preview, install via Chrome's URL-bar PWA install icon, then run Chrome DevTools → Lighthouse → PWA audit. Both 'Installable' AND 'PWA Optimized' categories must PASS. Plus a manual `npm run dev` smoke verifies NO service worker registers (DevTools → Application → Service Workers → empty list)."
    - "Existing 1084 SPA GREEN + ~12 from Plan 13-1 + ~12 new from Plan 13-2 = ~1108 SPA GREEN total target. 11 todo + 0 RED preserved. 18 server GREEN preserved. npm run lint EXIT 0. npm run build EXIT 0 (incl. AIza scan)."
    - "CONTEXT 'Phase 11's IosItpBanner auto-hides on standalone' is INHERENTLY satisfied — Phase 11's IosItpBanner has a gate `if (isStandalone()) return null;`. When a user installs the PWA (Plan 13-1's manifest enables this), display-mode=standalone becomes true, and IosItpBanner returns null on its next render. Plan 13-2 does NOT modify IosItpBanner — the auto-hide is a free side-effect of the PWA install path."
    - "DOC verification: src/__tests__/App.test.tsx (existing baseline App test) still passes — UpdateBanner returns null in the default state (no SW registered in jsdom test environment; needRefresh=false), so the App component's DOM output is unchanged from the test's perspective."
  artifacts:
    - path: "src/vite-env.d.ts"
      provides: "Adds /// <reference types=\"vite-plugin-pwa/client\" /> directive alongside existing vite/client reference — makes the virtual:pwa-register module's TS types resolve project-wide. CREATED if not exists; APPENDED if exists."
      contains: "vite-plugin-pwa/client"
    - path: "src/hooks/useUpdateBanner.ts"
      provides: "NEW hook + SPDX header. Wires registerSW from virtual:pwa-register; exposes needRefresh state + triggerUpdate + snooze + visible (derived from needRefresh AND !sessionStorage snooze). Exports __setRegisterSWForTests test seam."
      exports: ["useUpdateBanner", "__setRegisterSWForTests", "PWA_UPDATE_SNOOZE_KEY"]
      contains: "virtual:pwa-register"
      min_lines: 90
    - path: "src/hooks/__tests__/useUpdateBanner.test.ts"
      provides: "NEW Vitest suite — 6 hook behaviour tests using __setRegisterSWForTests injection. beforeEach clears sessionStorage."
      min_lines: 120
      contains: "useUpdateBanner"
    - path: "src/components/UpdateBanner.tsx"
      provides: "NEW component + SPDX header. Renders verbatim CONTEXT copy with Update+Later buttons; fixed top-0 z-50 positioning so it floats over MainLayout chrome without requiring MainLayout edits. role='status'."
      exports: ["UpdateBanner"]
      contains: "A new version of AussieLedger is available"
      min_lines: 60
    - path: "src/components/__tests__/UpdateBanner.test.tsx"
      provides: "NEW Vitest suite — 6 component tests (hidden default, visible-on-refresh, Update click, Later click + snooze, sessionStorage suppress, role/copy lock)."
      min_lines: 130
      contains: "update-banner"
    - path: "src/App.tsx"
      provides: "ONE-LINE import addition (import { UpdateBanner }) + ONE JSX line addition (<UpdateBanner /> as first fragment child). Existing 230 lines of useBackupNag + useEffect[isDirty] beforeunload + Toast render UNCHANGED."
      contains: "UpdateBanner"
  key_links:
    - from: "src/hooks/useUpdateBanner.ts"
      to: "virtual:pwa-register"
      via: "dynamic import wrapped in try/catch + __setRegisterSWForTests injectable seam"
      pattern: "virtual:pwa-register"
    - from: "src/hooks/useUpdateBanner.ts"
      to: "sessionStorage 'aussieledger:pwa-update-snoozed'"
      via: "PWA_UPDATE_SNOOZE_KEY constant + sessionStorage.getItem/setItem"
      pattern: "aussieledger:pwa-update-snoozed"
    - from: "src/components/UpdateBanner.tsx"
      to: "src/hooks/useUpdateBanner.ts"
      via: "named import: import { useUpdateBanner } from '../hooks/useUpdateBanner'"
      pattern: "useUpdateBanner"
    - from: "src/App.tsx"
      to: "src/components/UpdateBanner.tsx"
      via: "named import + <UpdateBanner /> first child of returned fragment"
      pattern: "UpdateBanner"
    - from: "src/components/UpdateBanner.tsx triggerUpdate"
      to: "vite-plugin-pwa updateSW(true) (SKIP_WAITING postMessage + reload)"
      via: "stored updateSW ref populated by useEffect on mount; ref.current?.(true) called by Update button"
      pattern: "updateSW"
    - from: "Plan 11-2 IosItpBanner standalone gate"
      to: "Plan 13-1 manifest enabling display-mode:standalone PWA install path"
      via: "isStandalone() === true → IosItpBanner returns null; free side-effect of PWA install"
      pattern: "isStandalone"
---

<objective>
Build the user-facing PWA update flow: a `useUpdateBanner` hook that wires `registerSW({ onNeedRefresh })` from `virtual:pwa-register` exactly once at App mount, and an `UpdateBanner` component that renders the locked CONTEXT copy (Update / Later) when a new SW is detected. Mount the banner as a fixed-positioned sibling at the top of `App.tsx` so MainLayout's shell shape stays untouched. End the wave with a manual checkpoint that smoke-tests the PWA install + Lighthouse PWA audit + verifies `npm run dev` registers NO service worker.

Purpose: Closes the "update flow" half of PWA-01. Users see a non-intrusive banner when a new version ships (registerType:'prompt' from Plan 13-1 — never force-reload mid-form). The Later button snoozes the banner per-session (re-fires next session if user still hasn't updated). The Update button triggers SKIP_WAITING + reload via the standard vite-plugin-pwa documented pattern.

Output: 2 new source files + 2 new test files + a 1-line touch to vite-env.d.ts + a 2-line touch to App.tsx. Plus a checkpoint task that records the manual Lighthouse + dev-mode-SW-absence smoke results.
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/execute-plan.md
@./.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/phases/13-pwa-wrapper/13-CONTEXT.md
@.planning/research/PITFALLS.md
@.planning/phases/13-pwa-wrapper/13-1-PLAN.md
@.planning/phases/11-indexeddb-hardening/11-2-SUMMARY.md
@src/App.tsx
@src/components/AdapterFallbackBanner.tsx
@src/components/IosItpBanner.tsx
@src/hooks/useBackupNag.ts
@src/components/Toast.tsx

<interfaces>
<!-- Contracts the executor uses directly — no codebase exploration needed. -->

From `vite-plugin-pwa@^1.3.0` `virtual:pwa-register` module:
```ts
// Stable public API per vite-plugin-pwa README v1.3.x
export function registerSW(options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (swScriptUrl: string, registration?: ServiceWorkerRegistration) => void;
  onRegisterError?: (error: any) => void;
}): (reloadPage?: boolean) => Promise<void>;
// Returned function: call updateSW(true) to skip-waiting + reload.
```

From `src/components/AdapterFallbackBanner.tsx` (visual template — Plan 13-2 mirrors the structure):
```tsx
// role="status", neutral-stone palette, dismiss-X, sits at top of MainLayout
<div role="status" className="flex items-start gap-3 bg-stone-50 border-b border-stone-300 text-stone-700 px-4 py-2 text-sm" data-testid="adapter-fallback-banner">
  <Database size={18} className="shrink-0 mt-0.5" />
  <div className="flex-1">
    <strong className="font-semibold">Running on Local Browser Storage</strong>
    &nbsp;— your data lives in this browser only. Export from the Data page to keep a backup.
  </div>
  <button onClick={() => setShow(false)} ...><X size={16} /></button>
</div>
```

From `src/App.tsx` (current return statement — touch points):
```tsx
return (
  <>                                          {/* NEW: insert <UpdateBanner /> here as first child */}
    <MainLayout ...>
      <ViewRouter ... />
    </MainLayout>
    {nag.visible && (                         {/* Existing Toast — UNCHANGED */}
      <Toast message={nag.message} ... />
    )}
  </>
);
```

From `src/hooks/useBackupNag.ts` (pattern to follow for useUpdateBanner shape):
```ts
// useEffect with empty dep list = fires once per App mount
// returns { visible, message, onDismiss, onExport, onSnooze }
// uses localStorage for snooze (Phase 11 IDB-03 pattern)
// useUpdateBanner uses sessionStorage instead (per-session re-fire is the locked CONTEXT behaviour)
```

From `src/components/IosItpBanner.tsx` (standalone gate — referenced for auto-hide):
```tsx
function isStandalone(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches === true
  );
}
// ...
if (isStandalone()) return null;  // <-- Phase 13 PWA install triggers this; IosItpBanner self-hides
```

From `lucide-react@0.546.0`:
```ts
// RefreshCw — circular-arrow-with-trailing-segment; semantic match for "update available"
import { RefreshCw } from 'lucide-react';
<RefreshCw size={18} className="..." />
```
</interfaces>

<facts>
**Plan 13-1 outputs (assumed present at Plan 13-2 start):**
- vite-plugin-pwa@^1.3.0 installed; `npm run build` produces dist/sw.js + dist/manifest.webmanifest
- 5 icon PNGs committed in public/
- vite.config.ts has VitePWA(...) with registerType:'prompt' + skipWaiting+clientsClaim+cleanupOutdatedCaches + devOptions.enabled:false + injectRegister:false
- index.html has apple-touch-icon link + theme-color meta
- 2 contract tests pass (pwa-manifest + pwa-index-html)

**Critical invariants (must NOT be violated):**
- PWA stale-cache HARDBLOCK preserved (already locked in 13-1 vite.config.ts)
- registerType:'prompt' — Update button is the user-explicit reload trigger
- devOptions.enabled:false — verified by manual `npm run dev` smoke in the checkpoint
- src/App.tsx CHANGE SURFACE IS MINIMAL — 1 import + 1 JSX line. The Phase 11 useBackupNag + useEffect[isDirty] beforeunload+visibilitychange settle-point block stays VERBATIM (it's load-bearing for IDB-05)
- IosItpBanner NOT modified — Plan 13-2 consumes its existing standalone-gate behaviour (auto-hide is a free side-effect of PWA install path)
- Apache 2.0 SPDX header on every new source file
- No new external script sources; CSP UNCHANGED (vercel.json untouched)
- File naming: `13-2-PLAN.md` exactly
</facts>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Type declarations + useUpdateBanner hook + hook tests (RED → GREEN)</name>
  <files>src/vite-env.d.ts, src/hooks/useUpdateBanner.ts, src/hooks/__tests__/useUpdateBanner.test.ts</files>
  <behavior>
    - Test 1: onNeedRefresh callback flips needRefresh state to true on next render
    - Test 2: onOfflineReady callback does NOT flip needRefresh (silent first-install behaviour per CONTEXT)
    - Test 3: snooze() writes sessionStorage 'aussieledger:pwa-update-snoozed'='true' AND sets visible to false
    - Test 4: when sessionStorage 'aussieledger:pwa-update-snoozed'='true' is pre-set, visible is false even when needRefresh=true
    - Test 5: triggerUpdate() calls the updateSW function returned by registerSW with arg true; no-op when updateSW ref is null (defensive — pre-mount, test env, etc.)
    - Test 6: hook unmount → remount preserves sessionStorage state (snooze survives React reconciliation)
  </behavior>
  <action>
    Apply RED → GREEN TDD. Order:

    1. **First, write the test file** `src/hooks/__tests__/useUpdateBanner.test.ts` (~120 lines). Structure:

       SPDX header. Imports: `import { describe, it, expect, beforeEach, vi } from 'vitest';` + `import { renderHook, act } from '@testing-library/react';` + `import { useUpdateBanner, __setRegisterSWForTests, PWA_UPDATE_SNOOZE_KEY } from '../useUpdateBanner';`.

       beforeEach:
       ```ts
       beforeEach(() => {
         sessionStorage.clear();
         __setRegisterSWForTests(undefined);  // reset to default (try-real-import path)
       });
       ```

       Helper to build a controllable registerSW mock:
       ```ts
       function buildMockRegisterSW() {
         const handlers: { onNeedRefresh?: () => void; onOfflineReady?: () => void } = {};
         const updateSW = vi.fn().mockResolvedValue(undefined);
         const mockRegisterSW = vi.fn((opts: { onNeedRefresh?: () => void; onOfflineReady?: () => void }) => {
           handlers.onNeedRefresh = opts.onNeedRefresh;
           handlers.onOfflineReady = opts.onOfflineReady;
           return updateSW;
         });
         return { handlers, updateSW, mockRegisterSW };
       }
       ```

       Six test cases as described in <behavior>. Test 1 example:
       ```ts
       it('flips visible to true when onNeedRefresh fires', () => {
         const { handlers, mockRegisterSW } = buildMockRegisterSW();
         __setRegisterSWForTests(mockRegisterSW);
         const { result } = renderHook(() => useUpdateBanner());
         expect(result.current.visible).toBe(false);
         act(() => { handlers.onNeedRefresh?.(); });
         expect(result.current.visible).toBe(true);
       });
       ```

       Test 6 example (unmount/remount):
       ```ts
       it('snooze persists across hook remount within same session', () => {
         const { handlers: h1, mockRegisterSW: m1 } = buildMockRegisterSW();
         __setRegisterSWForTests(m1);
         const { result: r1, unmount } = renderHook(() => useUpdateBanner());
         act(() => { h1.onNeedRefresh?.(); });
         act(() => { r1.current.snooze(); });
         expect(sessionStorage.getItem(PWA_UPDATE_SNOOZE_KEY)).toBe('true');
         unmount();

         const { handlers: h2, mockRegisterSW: m2 } = buildMockRegisterSW();
         __setRegisterSWForTests(m2);
         const { result: r2 } = renderHook(() => useUpdateBanner());
         act(() => { h2.onNeedRefresh?.(); });
         expect(r2.current.visible).toBe(false);  // suppressed by sessionStorage
       });
       ```

       Run `npm test src/hooks/__tests__/useUpdateBanner.test.ts` — expect RED (all 6 tests fail, module not found).

       Commit RED state: `test(13-2): add failing tests for useUpdateBanner hook` (use scripts/commit-utility per project convention; do NOT skip hooks).

    2. **Write `src/vite-env.d.ts`** — check if it exists. If yes, APPEND the new reference line. If no, CREATE with both references:
       ```ts
       /// <reference types="vite/client" />
       /// <reference types="vite-plugin-pwa/client" />
       ```

    3. **Write `src/hooks/useUpdateBanner.ts`** with SPDX header. Structure (~90-100 lines):

       ```ts
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Phase 13 PWA-01 — useUpdateBanner hook.
        *
        * Wires registerSW({ onNeedRefresh, onOfflineReady }) from virtual:pwa-register
        * EXACTLY ONCE per App mount. registerType:'prompt' is locked in vite.config.ts
        * (Plan 13-1), so onNeedRefresh is the user-explicit reload trigger — never
        * force-reload mid-form (Pitfall #12 HARDBLOCK).
        *
        * onOfflineReady is intentionally silent (per CONTEXT — match v1.2 anti-nag
        * stance; no positive-state banner).
        *
        * Snooze: sessionStorage key 'aussieledger:pwa-update-snoozed' = 'true'.
        * Per-session — re-fires next session if SW still has a pending update.
        * DIFFERENT from Phase 11's IosItpBanner key (independent dismiss state).
        *
        * Test seam: __setRegisterSWForTests injects a mock registerSW. Avoids needing
        * Vitest virtual-module mocking infrastructure that wouldn't have a real
        * virtual:pwa-register at test time anyway (Vitest's jsdom env has no SW).
        */
       import { useEffect, useRef, useState, useCallback } from 'react';

       export const PWA_UPDATE_SNOOZE_KEY = 'aussieledger:pwa-update-snoozed';

       type RegisterSWFn = (opts: {
         immediate?: boolean;
         onNeedRefresh?: () => void;
         onOfflineReady?: () => void;
       }) => (reloadPage?: boolean) => Promise<void>;

       let injectedRegisterSW: RegisterSWFn | undefined;
       export function __setRegisterSWForTests(fn: RegisterSWFn | undefined): void {
         injectedRegisterSW = fn;
       }

       function readSnoozed(): boolean {
         try {
           return sessionStorage.getItem(PWA_UPDATE_SNOOZE_KEY) === 'true';
         } catch {
           return false;
         }
       }

       export interface UpdateBannerState {
         visible: boolean;
         needRefresh: boolean;
         triggerUpdate: () => void;
         snooze: () => void;
       }

       export function useUpdateBanner(): UpdateBannerState {
         const [needRefresh, setNeedRefresh] = useState(false);
         const [snoozed, setSnoozed] = useState<boolean>(() => readSnoozed());
         const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);

         useEffect(() => {
           let cancelled = false;
           (async () => {
             try {
               const register = injectedRegisterSW
                 ?? (await import('virtual:pwa-register')).registerSW as unknown as RegisterSWFn;
               if (cancelled) return;
               const updateSW = register({
                 onNeedRefresh: () => setNeedRefresh(true),
                 onOfflineReady: () => { /* silent — per CONTEXT */ },
               });
               updateSWRef.current = updateSW;
             } catch {
               // virtual:pwa-register not available (test env, npm run dev with
               // devOptions.enabled:false, etc.) — leave updateSWRef null;
               // triggerUpdate becomes a no-op.
             }
           })();
           return () => { cancelled = true; };
         }, []);

         const triggerUpdate = useCallback(() => {
           void updateSWRef.current?.(true);
         }, []);

         const snooze = useCallback(() => {
           try {
             sessionStorage.setItem(PWA_UPDATE_SNOOZE_KEY, 'true');
           } catch {
             /* sessionStorage may be unavailable in embedded contexts */
           }
           setSnoozed(true);
         }, []);

         return {
           visible: needRefresh && !snoozed,
           needRefresh,
           triggerUpdate,
           snooze,
         };
       }
       ```

       Run `npm test src/hooks/__tests__/useUpdateBanner.test.ts` — expect GREEN (all 6 pass).

    4. **Run full test suite + lint:**
       ```
       npm test 2>&1 | tail -5
       npm run lint 2>&1 | tail -3
       ```
       Expect: ~1102 GREEN total (baseline 1084 + 12 from Plan 13-1 + 6 new); lint EXIT 0.

       Commit GREEN: `feat(13-2): implement useUpdateBanner hook`.

    Avoid:
    - Do NOT use a static `import { registerSW } from 'virtual:pwa-register'` at module top — the import would resolve at test-load time even in jsdom, and the virtual module isn't available there. Use dynamic import wrapped in try/catch + the injectable seam.
    - Do NOT import from `'workbox-window'` directly — vite-plugin-pwa wraps it in the virtual module; bypassing the wrapper risks version-skew.
    - Do NOT call updateSW(true) without `void` — the function returns a Promise that resolves AFTER the page reload kicks off; awaiting it is meaningless and TS will whine without explicit handling.
    - Do NOT call `registerSW` outside the useEffect — registerSW has side effects (registers a service worker globally); calling it from the module top would fire even on tests that don't render the hook.
  </action>
  <verify>
    <automated>npm test src/hooks/__tests__/useUpdateBanner.test.ts --run 2>&1 | tail -15 && npm run lint 2>&1 | tail -3</automated>
  </verify>
  <done>
    src/vite-env.d.ts has both /// <reference> directives. src/hooks/useUpdateBanner.ts exists with SPDX header + the documented test seam. All 6 hook tests pass. Full Vitest suite GREEN. Lint EXIT 0. Two commits landed: test(13-2): RED then feat(13-2): GREEN.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: UpdateBanner component + component tests + App.tsx wiring (RED → GREEN)</name>
  <files>src/components/UpdateBanner.tsx, src/components/__tests__/UpdateBanner.test.tsx, src/App.tsx</files>
  <behavior>
    - Test 1: renders nothing (no DOM) when useUpdateBanner returns visible=false
    - Test 2: renders the verbatim CONTEXT copy "A new version of AussieLedger is available." when visible=true
    - Test 3: clicking the Update button (data-testid='update-banner-update') invokes triggerUpdate from the hook
    - Test 4: clicking the Later button (data-testid='update-banner-later') invokes snooze from the hook
    - Test 5: role="status" attribute is present on the banner container
    - Test 6: container has fixed-position classes (fixed top-0 left-0 right-0 z-50) — locks the positioning decision against regression
  </behavior>
  <action>
    Apply RED → GREEN TDD. Order:

    1. **Write the test file first** `src/components/__tests__/UpdateBanner.test.tsx` (~130 lines). Structure:

       SPDX header. Imports: `import { describe, it, expect, vi, beforeEach } from 'vitest';` + `import { render, screen, fireEvent } from '@testing-library/react';` + `import { UpdateBanner } from '../UpdateBanner';` + `import * as hookModule from '../../hooks/useUpdateBanner';`.

       Pattern: mock the entire `useUpdateBanner` hook per-test via `vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({...})`. Different from Task 1's seam injection because the COMPONENT consumes the hook — testing the component means stubbing the hook output.

       beforeEach restores all mocks: `beforeEach(() => { vi.restoreAllMocks(); });`.

       Six test cases. Test 1 example:
       ```ts
       it('renders nothing when visible is false', () => {
         vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
           visible: false, needRefresh: false, triggerUpdate: vi.fn(), snooze: vi.fn(),
         });
         const { container } = render(<UpdateBanner />);
         expect(container.firstChild).toBeNull();
       });
       ```

       Test 3 example:
       ```ts
       it('clicking Update button invokes triggerUpdate', () => {
         const triggerUpdate = vi.fn();
         vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
           visible: true, needRefresh: true, triggerUpdate, snooze: vi.fn(),
         });
         render(<UpdateBanner />);
         fireEvent.click(screen.getByTestId('update-banner-update'));
         expect(triggerUpdate).toHaveBeenCalledTimes(1);
       });
       ```

       Test 6 (positioning lock):
       ```ts
       it('uses fixed top-0 positioning so it floats above MainLayout chrome', () => {
         vi.spyOn(hookModule, 'useUpdateBanner').mockReturnValue({
           visible: true, needRefresh: true, triggerUpdate: vi.fn(), snooze: vi.fn(),
         });
         render(<UpdateBanner />);
         const banner = screen.getByTestId('update-banner');
         expect(banner.className).toMatch(/\bfixed\b/);
         expect(banner.className).toMatch(/\btop-0\b/);
         expect(banner.className).toMatch(/\bleft-0\b/);
         expect(banner.className).toMatch(/\bright-0\b/);
         expect(banner.className).toMatch(/\bz-50\b/);
       });
       ```

       Run `npm test src/components/__tests__/UpdateBanner.test.tsx` — expect RED.

       Commit RED: `test(13-2): add failing tests for UpdateBanner component`.

    2. **Write `src/components/UpdateBanner.tsx`** with SPDX header (~60-80 lines):

       ```tsx
       /**
        * @license
        * SPDX-License-Identifier: Apache-2.0
        *
        * Phase 13 PWA-01 — UpdateBanner.
        *
        * Top-of-app banner that fires when vite-plugin-pwa's registerSW onNeedRefresh
        * callback signals a new service worker is waiting. Copy is VERBATIM-locked
        * from 13-CONTEXT.md; do NOT word-smith.
        *
        * Positioning: fixed top-0 z-50 floats above MainLayout chrome WITHOUT requiring
        * a MainLayout shape change (which would risk disturbing layout-shell tests).
        * Banner is rare (only visible after a new build deploys; user updates or
        * snoozes; per-session snooze key means re-fire next session at most).
        *
        * Update action: triggerUpdate() → vite-plugin-pwa updateSW(true) → SKIP_WAITING
        * postMessage to waiting SW → controllerchange event → window.location.reload.
        * If user has unsaved IDB writes, Phase 11's beforeunload guard fires the native
        * "are you sure?" dialog FIRST — giving them a chance to export before the reload.
        *
        * Later action: snooze() → sessionStorage 'aussieledger:pwa-update-snoozed'='true'.
        * Banner re-fires on next browser session if SW still has pending update.
        */
       import React from 'react';
       import { RefreshCw } from 'lucide-react';
       import { useUpdateBanner } from '../hooks/useUpdateBanner';

       export const UpdateBanner: React.FC = () => {
         const { visible, triggerUpdate, snooze } = useUpdateBanner();

         if (!visible) return null;

         return (
           <div
             role="status"
             className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 bg-stone-50 border-b border-stone-300 text-stone-700 px-4 py-2 text-sm shadow-sm"
             data-testid="update-banner"
           >
             <RefreshCw size={18} className="shrink-0" />
             <div className="flex-1">
               A new version of AussieLedger is available.
             </div>
             <button
               onClick={triggerUpdate}
               className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
               data-testid="update-banner-update"
             >
               Update
             </button>
             <button
               onClick={snooze}
               className="px-3 py-1 text-stone-700 text-xs font-medium underline hover:text-stone-900"
               data-testid="update-banner-later"
             >
               Later
             </button>
           </div>
         );
       };
       ```

       Run `npm test src/components/__tests__/UpdateBanner.test.tsx` — expect GREEN (all 6 pass).

       Commit GREEN: `feat(13-2): implement UpdateBanner component`.

    3. **Wire into `src/App.tsx`** — MINIMAL touch:

       Add import (alongside existing imports — alphabetically natural position is after Toast import or at end of the components/ block):
       ```ts
       import { UpdateBanner } from './components/UpdateBanner';
       ```

       Add `<UpdateBanner />` as the FIRST child of the returned fragment. Existing block:
       ```tsx
       return (
         <>
           <MainLayout ...>...</MainLayout>
           {nag.visible && (<Toast ... />)}
         </>
       );
       ```
       becomes:
       ```tsx
       return (
         <>
           <UpdateBanner />
           <MainLayout ...>...</MainLayout>
           {nag.visible && (<Toast ... />)}
         </>
       );
       ```

       **CRITICAL — do NOT modify:**
       - The `useBackupNag(() => setView('data'))` line
       - The `useState`/`useEffect` `isDirty` derivation block (lines 76-97 of current App.tsx) — Phase 11 IDB-05 load-bearing logic
       - The `useEffect([isDirty])` beforeunload + visibilitychange settle-point block (lines 103-147) — Phase 11 IDB-05 load-bearing
       - The Toast render block with `actions` slot — Phase 11 IDB-03 load-bearing
       - The MainLayout + ViewRouter props pass-through

       Run full suite + lint:
       ```
       npm test --run 2>&1 | tail -5
       npm run lint 2>&1 | tail -3
       ```
       Expect: ~1108 GREEN total (baseline 1084 + 12 from Plan 13-1 + 6 hook + 6 component); lint EXIT 0. Critically: existing App.test.tsx and App.beforeunload.test.tsx still pass (UpdateBanner returns null in default state — no DOM impact in the tests).

       Commit App wiring: `feat(13-2): wire UpdateBanner into App`.

    Avoid:
    - Do NOT mount UpdateBanner INSIDE MainLayout (would require MainLayout interface change — out of scope; risk of disturbing v1.0/v1.1 layout tests).
    - Do NOT use `position: sticky` — would scroll with the page on mobile; `fixed` keeps it stable while the user reads.
    - Do NOT add a dismiss-X (third action) — CONTEXT locks the two actions to Update + Later only.
    - Do NOT word-smith the copy — "A new version of AussieLedger is available." is verbatim from CONTEXT.
    - Do NOT change RefreshCw to a different icon — the semantic distinction from AdapterFallbackBanner's Database icon is the visual cue users will rely on if both banners ever fire simultaneously (unlikely but possible).
    - Do NOT add `aria-live="polite"` — `role="status"` implies polite live-region behaviour; doubling up triggers some screen readers twice.
  </action>
  <verify>
    <automated>npm test --run 2>&1 | tail -8 && npm run lint 2>&1 | tail -3 && grep -c "UpdateBanner" src/App.tsx && grep -q "A new version of AussieLedger is available" src/components/UpdateBanner.tsx && echo OK</automated>
  </verify>
  <done>
    src/components/UpdateBanner.tsx exists with SPDX + verbatim CONTEXT copy + 4-element classNames (fixed top-0 left-0 right-0 z-50). All 6 component tests pass. src/App.tsx has the UpdateBanner import + 1-line JSX addition; existing Phase 11 useBackupNag/isDirty/beforeunload/Toast blocks UNCHANGED. Full Vitest suite ~1108 GREEN. Lint EXIT 0. Three commits landed: test(13-2) RED, feat(13-2) component GREEN, feat(13-2) App wire.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Manual smoke — Lighthouse PWA audit + npm run dev SW-absence verification</name>
  <what-built>
    Plan 13-1 + 13-2 together: vite-plugin-pwa wired with locked stale-cache prevention (skipWaiting+clientsClaim+cleanupOutdatedCaches), 5 PNG icons committed, manifest emitted, UpdateBanner mounted in App.tsx behind useUpdateBanner hook with sessionStorage snooze, devOptions.enabled:false guards against SW registration in npm run dev.
  </what-built>
  <how-to-verify>
    **Smoke A — Production PWA install + Lighthouse audit (5 min):**

    1. Open a terminal in the repo root. Run:
       ```
       npm run build
       npm run preview
       ```
       Expect: build EXIT 0; preview prints `Local: http://localhost:4173/` (or similar port).

    2. Open Chrome (NOT Edge, NOT Firefox — Lighthouse PWA category is Chrome-specific). Navigate to the preview URL.

    3. Open Chrome DevTools (F12) → Application tab. Verify:
       - **Service Workers** section: shows `sw.js` registered, status "activated and is running"
       - **Manifest** section: name "AussieLedger", short_name "AussieLedger", theme_color #141414, background_color #E4E3E0, display "standalone", 4 icons listed (2 standard + 2 maskable)
       - **Cache Storage** section: a `workbox-precache-*` cache exists with the precached SPA shell

    4. Look at the Chrome URL bar — you should see a small "install" icon (computer-with-down-arrow) on the right side of the address bar. If present, the PWA passes the install criteria.

    5. Open DevTools → Lighthouse tab. Configure:
       - Mode: Navigation
       - Device: Desktop (Mobile also fine; both should pass)
       - Categories: ONLY check "Progressive Web App" (uncheck Performance/Accessibility/etc — Lighthouse PWA category was removed from default in Chrome 100+; use the explicit checkbox)
       - Click "Analyze page load"

    6. Wait for the audit (10-30 sec). Capture the result. Verify:
       - **Installable** check: PASS (manifest valid, icons valid, SW registered, served over HTTPS — preview server counts as secure context for this audit)
       - **PWA Optimized** checks: all PASS — registers a service worker, content sized correctly for viewport, has a `<meta name="viewport">`, themed splash screen, `theme-color` for address bar.

    **Smoke B — npm run dev SW absence (1 min):**

    7. Stop the preview server (Ctrl+C in its terminal).
    8. In the same terminal, run:
       ```
       npm run dev
       ```
    9. Open a NEW Chrome tab. Navigate to `http://localhost:3000/` (Vite dev port).
    10. Open DevTools → Application → Service Workers. Verify:
        - The list is **empty** for `localhost:3000` (NO service worker registered).
        - If the list shows a leftover SW from the preview test, that's a stale registration from a different port (4173 vs 3000); these are separate origins to the SW spec. The check is: did the dev server register a new SW? It should NOT.
    11. Also verify: in the Network tab, no request for `/sw.js` fires. The app loads normally; HMR is working (edit src/App.tsx, save, see the page reload via HMR not via SW).

    **Smoke C — UpdateBanner offline render (optional, 1 min):**

    12. Back in the preview window: with the SW registered, modify any source string in the app (e.g. change a heading in src/components/MasterDashboard.tsx) and run `npm run build` again. (Or stop preview, edit, npm run build, npm run preview, refresh.)
    13. Refresh the preview page. Within ~5-30 seconds, the UpdateBanner should appear at the top with "A new version of AussieLedger is available." + Update + Later buttons.
    14. Click "Later" — banner disappears. Reload the SAME tab — the banner STAYS HIDDEN (sessionStorage persists across reload within a single tab; this is the locked CONTEXT behaviour — see Hook Test #6, which asserts the snooze survives unmount+remount). To re-fire the banner, close the entire tab/window and open a new session (or open a private/incognito window with a fresh sessionStorage scope). To exercise the Update path directly without snoozing first: refresh the preview, wait for the banner, click "Update" — page reloads to the new build (the Phase 11 beforeunload guard fires the native "are you sure?" prompt FIRST if you have unsaved IDB writes).

    **Report:**
    Reply with:
    - Smoke A: "Lighthouse Installable: PASS/FAIL; PWA Optimized: PASS/FAIL" (paste the audit summary or a screenshot URL)
    - Smoke B: "npm run dev SW registration: ABSENT/PRESENT" (expect ABSENT)
    - Smoke C: (optional) "UpdateBanner render verified: YES/NO/skipped"
    - Any unexpected console errors during the smoke

    If Lighthouse Installable FAILS:
    - Check `dist/manifest.webmanifest` exists and has 4 icons with valid sizes
    - Check `dist/sw.js` exists
    - Check the manifest icons are emitted into dist/ (look for dist/icon-192.png etc)
    - Verify the URL is served over a secure context (http://localhost:* counts as secure for Lighthouse; https://*.vercel.app counts; raw IP addresses do not)
    - Common cause: icons in manifest reference paths not present in dist/ — verify with `ls dist/icon-*.png dist/apple-touch-icon.png`

    If SW registers in dev:
    - Check vite.config.ts has `devOptions: { enabled: false }` — Plan 13-1 set this; Plan 13-2 did NOT touch it
    - Hard-reload the dev tab (Ctrl+Shift+R) to clear any session SW from a prior preview test
    - Try Incognito to rule out leftover registration state
  </how-to-verify>
  <resume-signal>
    Reply with the three smoke results. Type "approved" to mark the PWA install + update flow as production-ready, or describe issues for follow-up.
  </resume-signal>
</task>

</tasks>

<verification>
**Phase-level checks at end of Plan 13-2 (before checkpoint):**

1. **New source files present with SPDX headers:**
   ```
   head -5 src/hooks/useUpdateBanner.ts src/components/UpdateBanner.tsx
   ```
   Each prints `SPDX-License-Identifier: Apache-2.0` in the first 5 lines.

2. **vite-env.d.ts has both reference directives:**
   ```
   grep -c "vite-plugin-pwa/client\|vite/client" src/vite-env.d.ts
   ```
   Expect: `2`

3. **PWA_UPDATE_SNOOZE_KEY constant matches CONTEXT lock:**
   ```
   grep "aussieledger:pwa-update-snoozed" src/hooks/useUpdateBanner.ts
   ```
   Expect: 1 hit (the constant declaration)

4. **Verbatim CONTEXT copy in UpdateBanner:**
   ```
   grep "A new version of AussieLedger is available\." src/components/UpdateBanner.tsx
   ```
   Expect: 1 hit

5. **App.tsx has UpdateBanner import + JSX (minimal-touch invariant):**
   ```
   grep -c "UpdateBanner" src/App.tsx
   ```
   Expect: `2` (one import + one JSX use)

6. **App.tsx Phase 11 blocks UNCHANGED — useBackupNag, isDirty derivation, beforeunload/visibilitychange:**
   ```
   grep -c "useBackupNag\|isDirty\|beforeHandler\|visHandler\|getLastWriteAt" src/App.tsx
   ```
   Expect: at least 8 hits (verifying the Phase 11 IDB-05 wiring is intact)

7. **Full test suite GREEN; build EXIT 0; lint EXIT 0:**
   ```
   npm test --run 2>&1 | tail -5
   npm run lint 2>&1 | tail -3
   npm run build 2>&1 | tail -5
   ```
   Expect: ~1108 GREEN; lint EXIT 0; build EXIT 0 (incl. AIza scan).

8. **No `import { registerSW } from` static imports (must use dynamic + injectable seam):**
   ```
   grep "import.*registerSW.*from.*virtual:pwa-register" src/
   ```
   Expect: 0 hits (the dynamic import is `await import(...)`)

9. **No new external script sources or CSP changes:**
   ```
   git diff vercel.json
   ```
   Expect: empty (no changes)

10. **IosItpBanner untouched:**
    ```
    git diff src/components/IosItpBanner.tsx
    ```
    Expect: empty (no changes — auto-hide is a free side-effect of Plan 13-1's manifest)

**After checkpoint:** record the Lighthouse Installable + PWA Optimized PASS results in 13-2-SUMMARY.md.
</verification>

<success_criteria>
- src/vite-env.d.ts has `/// <reference types="vite-plugin-pwa/client" />`
- src/hooks/useUpdateBanner.ts wires registerSW from virtual:pwa-register with injectable test seam; sessionStorage snooze via 'aussieledger:pwa-update-snoozed'
- src/components/UpdateBanner.tsx renders verbatim CONTEXT copy with Update/Later buttons; fixed top-0 z-50 positioning
- 12 new tests (6 hook + 6 component) all GREEN
- src/App.tsx changes are surgically minimal — 1 import + 1 JSX line; Phase 11 useBackupNag/isDirty/beforeunload/visibilitychange/Toast blocks UNCHANGED
- npm run build EXIT 0 (incl. AIza scan against SW-expanded dist/)
- npm run lint EXIT 0
- npm test: ~1108 SPA GREEN; ZERO regressions; ZERO new todos
- Manual smoke (checkpoint): Lighthouse PWA "Installable" + "PWA Optimized" both PASS; `npm run dev` registers NO service worker
- vercel.json + IosItpBanner UNCHANGED (free auto-hide side-effect when user installs the PWA)
- PWA-01 requirement fully closed: install + update flow + stale-cache prevention + form-safe registerType:'prompt' + dev-mode SW absence

**Out of scope (deferred per CONTEXT § deferred):**
- Lighthouse-CI in GitHub Actions (manual smoke sufficient for v1.2)
- Periodic SW update polling (`r.update()` every N minutes — not required by PWA-01 acceptance)
- `beforeinstallprompt` desktop install button (rely on Chrome URL-bar affordance)
- iOS-specific install banner from Phase 13 (Phase 11's IosItpBanner is the iOS install affordance)
- UpdateBanner mounted INSIDE MainLayout (would require layout-shell interface change)
- Custom UpdateBanner styling beyond neutral-stone palette + RefreshCw icon
- onOfflineReady surfacing (silent per CONTEXT — anti-nag)
- Update banner across-session persistence (per-session snooze is the locked behaviour)
- Push notifications / background sync (explicit anti-features)
</success_criteria>

<output>
After completion, create `.planning/phases/13-pwa-wrapper/13-2-SUMMARY.md` per the standard summary template. Include: 4 commits landed (3 TDD cycles + checkpoint smoke), test count delta (baseline → post-13-2), all 10 verification commands run with outputs, the Lighthouse PWA audit results from the checkpoint (with screenshot ref or paste), and confirmation that PWA-01 is closed end-to-end. Flag any deviations or unexpected findings.
</output>
