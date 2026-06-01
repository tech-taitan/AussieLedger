/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 13 PWA-01 — useUpdateBanner hook.
 *
 * Wires registerSW({ onNeedRefresh, onOfflineReady }) from virtual:pwa-register
 * EXACTLY ONCE per App mount. registerType:'prompt' is locked in
 * vite.pwa-options.ts (Plan 13-1), so onNeedRefresh is the user-explicit
 * reload trigger — we never force-reload mid-form (PITFALLS Pitfall #12
 * HARDBLOCK).
 *
 * onOfflineReady is intentionally silent (per CONTEXT — match the v1.2
 * anti-nag stance; no positive-state banner).
 *
 * Snooze: sessionStorage key 'aussieledger:pwa-update-snoozed' = 'true'.
 * Per-session — re-fires on next browser session if SW still has a pending
 * update. DIFFERENT from Phase 11's IosItpBanner key — the two banners have
 * independent dismiss state.
 *
 * Test seam: __setRegisterSWForTests injects a mock registerSW BEFORE the
 * hook's useEffect runs. The dynamic import of 'virtual:pwa-register' is
 * wrapped in try/catch so the hook is safe to mount in environments where
 * the virtual module isn't available (Vitest jsdom, `npm run dev` with
 * devOptions.enabled:false, etc.) — updateSWRef stays null and
 * triggerUpdate() becomes a defensive no-op.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

export const PWA_UPDATE_SNOOZE_KEY = 'aussieledger:pwa-update-snoozed';

type RegisterSWFn = (opts: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
}) => (reloadPage?: boolean) => Promise<void>;

let injectedRegisterSW: RegisterSWFn | undefined;

/**
 * Test-only seam — injects a mock registerSW so unit tests don't need to
 * dance around the unavailability of 'virtual:pwa-register' in jsdom.
 * Pass `undefined` to reset back to the real-import path.
 */
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
  /** Banner is shown when needRefresh AND not snoozed. */
  visible: boolean;
  /** A waiting SW has been detected (registerSW onNeedRefresh fired). */
  needRefresh: boolean;
  /** Calls updateSW(true) → SKIP_WAITING postMessage + reload. */
  triggerUpdate: () => void;
  /** Sets sessionStorage snooze key + hides the banner for this session. */
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
        // Indirect the module specifier through a runtime variable so
        // vitest's import-analysis pass (which runs WITHOUT vite-plugin-pwa
        // loaded) does NOT try to statically resolve 'virtual:pwa-register'
        // at transform time. At production-build time vite-plugin-pwa
        // provides the module and the dynamic import resolves normally. In
        // jsdom the import throws and the catch below leaves updateSWRef
        // null (the documented test-env fallback path — tests rely on the
        // __setRegisterSWForTests seam instead).
        let register: RegisterSWFn | undefined = injectedRegisterSW;
        if (!register) {
          const pwaModuleId = 'virtual:pwa-register';
          const mod = (await import(/* @vite-ignore */ pwaModuleId)) as {
            registerSW?: RegisterSWFn;
          };
          register = mod.registerSW;
        }
        if (cancelled || !register) return;
        const updateSW = register({
          onNeedRefresh: () => setNeedRefresh(true),
          onOfflineReady: () => {
            /* silent — per CONTEXT (anti-nag) */
          },
        });
        updateSWRef.current = updateSW;
      } catch {
        // virtual:pwa-register not available (test env, `npm run dev` with
        // devOptions.enabled:false, etc.) — leave updateSWRef null;
        // triggerUpdate becomes a no-op.
      }
    })();
    return () => {
      cancelled = true;
    };
    // Empty deps — fires once per mount; registerSW has side effects (it
    // registers a service worker globally).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const triggerUpdate = useCallback(() => {
    // updateSW(true) returns a Promise that resolves AFTER the reload kicks
    // off; awaiting it is meaningless. `void` silences TS no-floating-promises.
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
