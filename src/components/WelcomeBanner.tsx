/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * POL-01 — first-visit empty-state inline trust banner.
 *
 * Mounted by MasterDashboard when entities.length === 0 (Plan 14-2 Task 5).
 * Copy is CONTEXT-locked verbatim — do NOT word-smith. The em-dash is the
 * canonical character; hyphen substitutions will fail the lock test.
 *
 * No icons, no animations, no progress steppers, no illustrations — CONTEXT-
 * locked simplicity. Matches the calm-modernist palette already used by the
 * EntityCard + MasterDashboard chrome.
 */

interface WelcomeBannerProps {
  onCreateEntity: () => void;
  /** Optional — when provided, surfaces a friendlier 4-step sole-owner setup affordance. */
  onSoleOwnerSetup?: () => void;
}

export function WelcomeBanner({ onCreateEntity, onSoleOwnerSetup }: WelcomeBannerProps) {
  return (
    <section
      role="region"
      aria-label="Welcome — get started"
      data-testid="welcome-banner"
      className="bg-white border border-[var(--line-strong)] p-8 text-center space-y-6"
    >
      <p
        className="text-base text-[var(--ink)]"
        data-testid="welcome-trust-copy"
      >
        Your data stays in your browser — no servers, no accounts.
      </p>
      <div className="flex flex-col sm:flex-row justify-center gap-3">
        {onSoleOwnerSetup && (
          <button
            onClick={onSoleOwnerSetup}
            className="bg-[var(--ink)] text-white px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            data-testid="welcome-sole-owner-setup"
          >
            Sole owner setup
          </button>
        )}
        <button
          onClick={onCreateEntity}
          className={
            onSoleOwnerSetup
              ? 'border border-[var(--line-strong)] bg-white text-[var(--ink)] px-6 py-2 text-sm font-medium hover:bg-gray-50 transition-colors'
              : 'bg-[var(--ink)] text-white px-6 py-2 text-sm font-medium hover:opacity-90 transition-opacity'
          }
          data-testid="welcome-create-entity"
        >
          Create your first entity
        </button>
        <button
          onClick={() => {
            window.location.href = '/demo';
          }}
          className="border border-[var(--line-strong)] bg-white text-[var(--ink)] px-6 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          data-testid="welcome-try-demo"
        >
          Try the demo
        </button>
      </div>
    </section>
  );
}
