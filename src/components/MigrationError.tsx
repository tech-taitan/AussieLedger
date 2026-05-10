/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AlertTriangle } from 'lucide-react';

interface MigrationErrorProps {
  /** Raw error message from the migration runner. Rendered verbatim inside a <pre>. */
  message: string;
}

/**
 * Full-viewport non-dismissable error UI surfaced when the schema migration runner throws.
 * Per CONTEXT.md "Failure behaviour: surface a non-dismissable error UI explaining the
 * failure; do not auto-discard data."
 *
 * Deliberately accepts no `onDismiss` / `onClose` prop — there is no recovery path
 * the user can take from inside the app. They must inspect their localStorage data.
 */
export function MigrationError({ message }: MigrationErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-red-50 p-8"
    >
      <div className="max-w-md w-full border border-red-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2">
          <AlertTriangle size={20} aria-hidden="true" /> Data Migration Failed
        </h1>
        <p className="text-sm text-gray-700 mb-4">
          AussieLedger could not upgrade your saved data to the current version. Your data has
          not been modified.
        </p>
        <pre className="text-xs bg-red-50 p-3 rounded border border-red-100 overflow-auto mb-4">
          {message}
        </pre>
        <p className="text-xs text-gray-500">
          Please inspect your browser&apos;s localStorage data
          (DevTools → Application → Local Storage) and report this error so it can be triaged.
        </p>
      </div>
    </div>
  );
}
