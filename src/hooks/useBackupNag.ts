/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useBackupNag — Phase 11 IDB-03 backup-nag hook.
 *
 * Fires AT MOST ONCE per App mount (useEffect with empty deps — no per-write
 * re-checks, no visibilitychange re-checks; CONTEXT.md locked decision).
 *
 * Suppression rules (any one returns early — no nag):
 *   - Empty adapter (entities.length === 0 AND Object.keys(entries).length === 0)
 *   - Snooze key in localStorage parses to ISO > today()
 *   - lastExportAt is NOT null AND today() - lastExportAt <= threshold
 *
 * Threshold:
 *   - 7 days on desktop / non-iOS UA
 *   - 5 days on iOS Safari UA (more aggressive because iOS ITP clears IDB after
 *     7 days of no use; nagging at 5d gives the user a 2d buffer)
 *
 * iOS Safari detection (locked CONTEXT regex):
 *   /iPad|iPhone|iPod/ && /Safari/ && !/CriOS|FxiOS|EdgiOS/
 *
 * Nag UX (rendered by App.tsx using the returned state slice):
 *   - Toast tone='warn'
 *   - "Export now" button → invokes navigateToData callback (App routes to /data)
 *   - "Snooze 7 days" button → writes addDaysIso(7) to localStorage snooze key,
 *     dismisses; subsequent App mounts before the snooze expires return early.
 */
import { useState, useEffect } from 'react';
import { getAdapter } from '../storage';
import { today, addDaysIso } from '../lib/period';

const BACKUP_NAG_SNOOZE_KEY = 'aussieledger:backup-nag-snoozed-until';
const BACKUP_NAG_DAYS_DESKTOP = 7;
const BACKUP_NAG_DAYS_IOS = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface BackupNagState {
  visible: boolean;
  message: string;
  onExport: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}

/**
 * iOS Safari UA detection — locked regex from 11-CONTEXT.md.
 * Rejects Chrome-on-iOS (CriOS), Firefox-on-iOS (FxiOS), Edge-on-iOS (EdgiOS).
 * Exported for direct test coverage.
 */
export function isIosSafariUA(ua: string): boolean {
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

const NOOP = () => {};

export function useBackupNag(navigateToData?: () => void): BackupNagState {
  const [state, setState] = useState<BackupNagState>({
    visible: false,
    message: '',
    onExport: NOOP,
    onSnooze: NOOP,
    onDismiss: NOOP,
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
        maybe.getLastExportAt ? maybe.getLastExportAt() : Promise.resolve(null),
      ]);
      if (cancelled) return;
      if (entities.length === 0 && Object.keys(entries).length === 0) return;

      // Threshold check
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const isIos = isIosSafariUA(ua);
      const thresholdDays = isIos ? BACKUP_NAG_DAYS_IOS : BACKUP_NAG_DAYS_DESKTOP;
      const thresholdMs = thresholdDays * MS_PER_DAY;
      const nowMs = today().getTime();

      let shouldNag = false;
      if (lastExportAt === null) {
        shouldNag = true; // never exported but adapter has data → nag
      } else {
        const lastExportMs = new Date(lastExportAt).getTime();
        if (Number.isFinite(lastExportMs) && nowMs - lastExportMs > thresholdMs) {
          shouldNag = true;
        }
      }

      if (!shouldNag) return;

      const dismissOnly = () => setState((s) => ({ ...s, visible: false }));
      const snoozeAction = () => {
        try {
          localStorage.setItem(BACKUP_NAG_SNOOZE_KEY, addDaysIso(7));
        } catch {
          /* ignore — localStorage may be unavailable in some embedded contexts */
        }
        dismissOnly();
      };
      const exportAction = () => {
        if (navigateToData) navigateToData();
        dismissOnly();
      };

      setState({
        visible: true,
        message:
          lastExportAt === null
            ? 'You have unexported data. Export now to back up your tax data.'
            : `Last export was over ${thresholdDays} days ago. Back up now to avoid data loss.`,
        onExport: exportAction,
        onSnooze: snoozeAction,
        onDismiss: dismissOnly,
      });
    })().catch(() => {
      /* never throw from a fire-and-forget effect */
    });

    return () => {
      cancelled = true;
    };
    // Empty deps — fires once per mount, no per-write re-checks (CONTEXT locked).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
