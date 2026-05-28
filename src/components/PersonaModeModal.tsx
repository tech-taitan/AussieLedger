/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PersonaModeModal — first-run modal that asks the user to select their mode.
 * Renders a centred modal with backdrop.
 * Two modes: 'owner' (running your own business) or 'agent' (manage clients).
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Settings } from '../lib/persona';

interface PersonaModeModalProps {
  onComplete: (s: Settings) => void;
}

export function PersonaModeModal({
  onComplete,
}: PersonaModeModalProps): React.JSX.Element {
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden="true"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="persona-modal-heading"
      >
        <div className="bg-white border border-gray-200 shadow-xl rounded-lg max-w-md w-full p-8 space-y-6">
          <div className="space-y-2">
            <h1
              id="persona-modal-heading"
              className="text-2xl font-bold text-gray-900"
            >
              Welcome to AussieLedger
            </h1>
            <p className="text-gray-600">
              Are you running your own business, or do you manage clients for
              others?
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <button
              type="button"
              data-testid="persona-mode-owner"
              onClick={() => onComplete({ mode: 'owner' })}
              className="flex flex-col items-start gap-1 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="font-semibold text-gray-900 text-lg">
                Running my own business
              </span>
              <span className="text-sm text-gray-500">
                Single entity. Simplified view focused on your business.
              </span>
            </button>

            <button
              type="button"
              data-testid="persona-mode-agent"
              onClick={() => onComplete({ mode: 'agent' })}
              className="flex flex-col items-start gap-1 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <span className="font-semibold text-gray-900 text-lg">
                I manage clients
              </span>
              <span className="text-sm text-gray-500">
                Multi-client workspace. Manage multiple businesses from one place.
              </span>
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            You can change this later in Settings.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
