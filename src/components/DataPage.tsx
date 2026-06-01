/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DataPage — Phase 3 Plan 03-4 — FND-02 (Export) + FND-03 (Import) UI.
 *
 * Status panel:
 *   - Adapter kind ("Local (IndexedDB)" / "Server (SQLite)")
 *   - Current schema version (CURRENT_VERSION)
 *   - Last export timestamp (LocalAdapter only; "Never" otherwise)
 *
 * Export:
 *   - Calls adapter.exportAll(), serialises to JSON, downloads as
 *     aussieledger-YYYY-MM-DD-HHmm.json (local time).
 *   - On LocalAdapter, also stamps `getLastExportAt()`.
 *
 * Import:
 *   - File picker -> JSON.parse -> migrate() -> confirmation dialog.
 *   - If `_v > CURRENT_VERSION` -> MigrationError-style inline alert (refuses).
 *   - If the current instance has data -> require user to type literal `REPLACE`
 *     (uppercase, case-sensitive) before Confirm enables.
 *   - If the current instance is empty -> single-tap Confirm.
 *   - On confirm: adapter.importAll(migrated). Refresh the status line.
 */
import React, { useEffect, useState, useRef } from 'react';
import {
  Download,
  Upload,
  AlertTriangle,
  HardDriveDownload,
  CheckCircle2,
} from 'lucide-react';
import { getAdapter, getAdapterKind } from '../storage';
import { CURRENT_VERSION, migrate, type PersistedRoot } from '../lib/migrations';
import { today, nowIso } from '../lib/period';
import { IosItpBanner } from './IosItpBanner';

function fmtFilename(d?: Date): string {
  const dt = d ?? today();
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = dt.getFullYear();
  const mo = pad(dt.getMonth() + 1);
  const da = pad(dt.getDate());
  const h = pad(dt.getHours());
  const mi = pad(dt.getMinutes());
  return `aussieledger-${y}-${mo}-${da}-${h}${mi}.json`;
}

function fmtTimestamp(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function adapterLabel(kind: 'local' | 'server' | null): string {
  if (kind === 'server') return 'Server (SQLite)';
  if (kind === 'local') return 'Local (IndexedDB)';
  return 'Unknown';
}

/**
 * Phase 11 IDB-02 — text-only quota disclosure helper.
 * Returns null when estimate is null OR either field is non-numeric
 * (silent fallback per 11-CONTEXT decision — some Safari versions return
 * partial estimates and the DataPage hides the entire line in those cases).
 */
function formatQuotaLine(est: StorageEstimate | null): string | null {
  if (!est) return null;
  if (typeof est.quota !== 'number' || typeof est.usage !== 'number') return null;
  const quotaGB = (est.quota / 1e9).toFixed(1);
  const usageMB = Math.round(est.usage / 1e6);
  return `~${quotaGB} GB allocated · ${usageMB} MB used`;
}

/**
 * Phase 11 IDB-01 — persist-status text helper.
 *   true  → 'Storage protected'
 *   false → 'Storage not protected — back up regularly'
 *   null  → null (API not supported; hide the line entirely)
 */
function formatPersistStatus(g: boolean | null): string | null {
  if (g === true) return 'Storage protected';
  if (g === false) return 'Storage not protected — back up regularly';
  return null;
}

export const DataPage: React.FC = () => {
  const [kind, setKind] = useState<'local' | 'server' | null>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [pendingImport, setPendingImport] = useState<PersistedRoot | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [hasExistingData, setHasExistingData] = useState(false);
  // Phase 11 IDB-01 / IDB-02 — hardening status slots (Plan 11-2)
  const [persistGranted, setPersistGranted] = useState<boolean | null>(null);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const k = getAdapterKind();
      if (cancelled) return;
      setKind(k);
      const adapter = await getAdapter();
      // Only LocalAdapter has getLastExportAt; ServerAdapter does not in v1.
      const maybe = adapter as unknown as {
        getLastExportAt?: () => Promise<string | null>;
      };
      if (typeof maybe.getLastExportAt === 'function') {
        const ts = await maybe.getLastExportAt();
        if (!cancelled) setLastExport(ts);
      }
      // Phase 11 — duck-typed hardening accessors (LocalAdapter only).
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
      // Detect non-empty state for confirmation gating.
      const [ents, accs, ents2, logs] = await Promise.all([
        adapter.getEntities(),
        adapter.getAccounts(),
        adapter.getEntries(),
        adapter.getAuditLogs(),
      ]);
      if (!cancelled) {
        const nonEmpty =
          ents.length > 0 ||
          accs.length > 0 ||
          Object.keys(ents2).length > 0 ||
          logs.length > 0;
        setHasExistingData(nonEmpty);
      }
    })().catch((err) => console.error('DataPage init failed', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const handleExport = async () => {
    try {
      const adapter = await getAdapter();
      const snapshot = await adapter.exportAll();
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fmtFilename();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const iso = today().toISOString();
      const maybeLocal = adapter as unknown as {
        setLastExportAt?: (iso: string) => Promise<void>;
      };
      if (typeof maybeLocal.setLastExportAt === 'function') {
        await maybeLocal.setLastExportAt(iso);
        setLastExport(iso);
        // Phase 11 IDB-03 — clear backup-nag snooze; snooze does not outlive
        // its motivation. A fresh export resets the "back up" deadline so
        // any active snooze should be discarded.
        try {
          localStorage.removeItem('aussieledger:backup-nag-snoozed-until');
        } catch {
          /* ignore — localStorage may be unavailable */
        }
      }
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMigrationError(null);
    setImportMessage(null);
    // Use FileReader (universally supported, works under jsdom; File.text() is
    // not implemented in jsdom).
    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
      reader.readAsText(file);
    }).catch((err: unknown) => {
      setMigrationError(
        `Cannot import: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    });
    if (text === null) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    try {
      const raw = JSON.parse(text) as Record<string, unknown>;
      const migrated = migrate(raw);
      setPendingImport(migrated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('newer than the application version')) {
        setMigrationError(
          `Cannot import: file is from a newer version (${msg})`,
        );
      } else {
        setMigrationError(`Cannot import: ${msg}`);
      }
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;
    if (hasExistingData && confirmText !== 'REPLACE') return;
    try {
      const adapter = await getAdapter();
      await adapter.importAll(pendingImport);
      // Phase 11 IDB-05 — explicit defence-in-depth lastWriteAt bump at the
      // DataPage call site. importAll already bumps internally when called
      // without { silent: true } (Plan 11-1), but the user-affecting bulk
      // import path also bumps explicitly here so any future refactor of
      // importAll's internal bump can't accidentally make bulk imports look
      // clean (which would suppress the backup-nag for legitimately dirty
      // post-import state).
      const maybeBump = adapter as unknown as {
        setLastWriteAt?: (iso: string) => Promise<void>;
      };
      if (typeof maybeBump.setLastWriteAt === 'function') {
        await maybeBump.setLastWriteAt(nowIso());
      }
      setImportMessage(
        'Import succeeded. Refresh the page to see imported data.',
      );
      setPendingImport(null);
      setConfirmText('');
      setHasExistingData(true);
    } catch (err) {
      setMigrationError(
        `Import failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const cancelImport = () => {
    setPendingImport(null);
    setConfirmText('');
  };

  const quotaLine = formatQuotaLine(storageEstimate);
  const persistLine = formatPersistStatus(persistGranted);

  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto space-y-6">
      <IosItpBanner />
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
          <HardDriveDownload className="text-blue-600" />
          Data Management
        </h1>
        <p className="text-sm text-gray-500">
          Export your full dataset as JSON or import a previously-exported file.
          Exports include all entities, accounts, journals, and audit logs.
        </p>
      </header>

      <section className="bg-white border border-[var(--line)] p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Status
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-gray-500">Adapter</dt>
            <dd className="font-medium" data-testid="adapter-kind">
              {adapterLabel(kind)}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Schema Version</dt>
            <dd className="font-medium" data-testid="schema-version">
              v{CURRENT_VERSION}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-gray-500">Last Export</dt>
            <dd className="font-medium" data-testid="last-export">
              {lastExport ? fmtTimestamp(lastExport) : 'Never'}
            </dd>
          </div>
          {quotaLine !== null && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Storage Budget</dt>
              <dd className="font-medium" data-testid="storage-quota">
                {quotaLine}
              </dd>
            </div>
          )}
          {persistLine !== null && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Storage Protection</dt>
              <dd className="font-medium" data-testid="persist-status">
                {persistLine}
              </dd>
            </div>
          )}
        </dl>
      </section>

      <section className="bg-white border border-[var(--line)] p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Export
        </h2>
        <p className="text-sm text-gray-500">
          Downloads a JSON file containing the complete dataset.
        </p>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 bg-[var(--ink)] text-white px-4 py-2 font-medium hover:opacity-90 transition-opacity"
          data-testid="export-button"
        >
          <Download size={18} />
          Export data
        </button>
      </section>

      <section className="bg-white border border-[var(--line)] p-5 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Import
        </h2>
        {hasExistingData ? (
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
            <span>
              This instance currently contains data. Importing will REPLACE all
              current data. You will be asked to type &quot;REPLACE&quot; to
              confirm.
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No existing data on this instance. Import will proceed with a single
            confirmation.
          </p>
        )}
        <input
          type="file"
          accept=".json,application/json"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          data-testid="import-file-input"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 bg-white border border-[var(--line-strong)] text-[var(--ink)] px-4 py-2 font-medium hover:bg-gray-50 transition-colors"
          data-testid="import-button"
        >
          <Upload size={18} />
          Choose file...
        </button>

        {migrationError && (
          <div
            className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2"
            data-testid="migration-error"
          >
            {migrationError}
          </div>
        )}

        {importMessage && (
          <div
            className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-3 py-2"
            data-testid="import-success"
          >
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
            <span>{importMessage}</span>
          </div>
        )}
      </section>

      {pendingImport && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          data-testid="confirm-dialog"
        >
          <div className="bg-white p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">Confirm import</h3>
            {hasExistingData ? (
              <>
                <p className="text-sm text-gray-700">
                  This will <strong>REPLACE</strong> all current data in this
                  instance with the contents of the imported file.
                </p>
                <p className="text-sm text-gray-700">
                  Type the literal word{' '}
                  <code className="px-1 bg-gray-100 font-mono">REPLACE</code>{' '}
                  (uppercase) to confirm:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full border border-[var(--line-strong)] px-3 py-2 font-mono text-sm"
                  placeholder="Type REPLACE"
                  data-testid="confirm-text"
                  autoFocus
                />
              </>
            ) : (
              <p className="text-sm text-gray-700">
                Proceed with import? No existing data will be overwritten.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={cancelImport}
                className="px-4 py-2 text-sm font-medium border border-[var(--line-strong)] hover:bg-gray-50"
                data-testid="cancel-import"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                disabled={hasExistingData && confirmText !== 'REPLACE'}
                className="px-4 py-2 text-sm font-medium bg-[var(--ink)] text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="confirm-import"
              >
                Confirm import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
