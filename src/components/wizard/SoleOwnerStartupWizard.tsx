/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sole-owner startup wizard — a 4-step guided onboarding for new sole
 * traders. Replaces the bare "Create your first entity" CTA on the empty
 * Welcome screen with a friendly walk-through that captures the same
 * fields EntityForm would, but in conversational chunks.
 *
 * Steps:
 *   1. Welcome      — what we're about to do, what they'll get out of it
 *   2. Business     — legal name + ABN (optional)
 *   3. Tax setup    — GST registered? + cash vs accruals
 *   4. Confirm      — show summary, click Finish, entity created
 *
 * On finish:
 *   - Invokes `onCreate(entity)` with a full Entity of type 'Individual'.
 *   - App.tsx wires this to `createEntity` which seeds the FY2026
 *     Individual CoA overlay and reloads useAccounts so the
 *     AccountManager picks up the 197-row default.
 */
import React, { useState } from 'react';
import type { Entity } from '../../types';

interface SoleOwnerStartupWizardProps {
  onCreate: (entity: Entity) => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3 | 4;

export function SoleOwnerStartupWizard({
  onCreate,
  onCancel,
}: SoleOwnerStartupWizardProps): React.JSX.Element {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState('');
  const [abn, setAbn] = useState('');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [accountingMethod, setAccountingMethod] = useState<'cash' | 'accruals'>('cash');

  const canAdvance =
    step === 1 ||
    (step === 2 && name.trim().length > 0) ||
    step === 3 ||
    step === 4;

  const next = () => setStep((s) => Math.min(4, (s + 1) as Step));
  const back = () => setStep((s) => Math.max(1, (s - 1) as Step));

  const handleFinish = () => {
    const entity: Entity = {
      _v: 6,
      id: `ent-st-${Date.now()}`,
      name: name.trim(),
      type: 'Individual',
      status: 'Active',
      registrationNumber: abn.trim() || undefined,
      gstRegistered,
      accountingMethod,
      fyEndDate: '06-30',
    };
    onCreate(entity);
  };

  return (
    <section
      role="region"
      aria-label="Sole owner startup wizard"
      data-testid="sole-owner-startup-wizard"
      className="bg-white border border-[var(--line-strong)] p-8 max-w-2xl mx-auto space-y-6"
    >
      <div
        data-testid="startup-wizard-step-indicator"
        className="text-xs font-bold uppercase tracking-wider text-gray-500"
      >
        Sole Owner Setup — Step {step} of 4
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">
            Welcome — let's set up your business
          </h2>
          <p className="text-sm text-gray-600">
            A quick four-step setup. We'll capture your business name, ABN, GST
            status, and accounting method. After that you'll get a full
            FY2025-26 Australian chart of accounts pre-mapped to the sole-trader
            tax return labels (NAT 2541 + NAT 2543 schedule).
          </p>
          <p className="text-xs text-gray-500">
            Your data stays in your browser. No accounts, no servers.
          </p>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">Your business</h2>
          <div className="space-y-1">
            <label
              htmlFor="startup-name"
              className="block text-xs font-bold uppercase tracking-wider text-gray-600"
            >
              Business / trading name
            </label>
            <input
              id="startup-name"
              data-testid="startup-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe Plumbing"
              className="w-full border border-[var(--line)] p-2 text-sm focus:outline-none focus:border-[var(--ink)]"
            />
          </div>
          <div className="space-y-1">
            <label
              htmlFor="startup-abn"
              className="block text-xs font-bold uppercase tracking-wider text-gray-600"
            >
              ABN <span className="text-gray-400 normal-case">(optional)</span>
            </label>
            <input
              id="startup-abn"
              data-testid="startup-abn-input"
              type="text"
              value={abn}
              onChange={(e) => setAbn(e.target.value)}
              placeholder="11 222 333 444"
              className="w-full border border-[var(--line)] p-2 text-sm font-mono focus:outline-none focus:border-[var(--ink)]"
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">Tax setup</h2>
          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              GST status
            </legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="gst"
                checked={gstRegistered}
                onChange={() => setGstRegistered(true)}
                data-testid="startup-gst-yes"
                className="mt-1 accent-[var(--ink)]"
              />
              <span className="text-sm">
                <span className="font-medium">Registered for GST</span>
                <span className="text-gray-500"> — turnover &ge; $75,000 or by choice</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="gst"
                checked={!gstRegistered}
                onChange={() => setGstRegistered(false)}
                data-testid="startup-gst-no"
                className="mt-1 accent-[var(--ink)]"
              />
              <span className="text-sm">
                <span className="font-medium">Not registered for GST</span>
                <span className="text-gray-500"> — turnover &lt; $75,000</span>
              </span>
            </label>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-bold uppercase tracking-wider text-gray-600 mb-1">
              Accounting method
            </legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="method"
                checked={accountingMethod === 'cash'}
                onChange={() => setAccountingMethod('cash')}
                data-testid="startup-method-cash"
                className="mt-1 accent-[var(--ink)]"
              />
              <span className="text-sm">
                <span className="font-medium">Cash</span>
                <span className="text-gray-500"> — record when money moves (most sole traders)</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="method"
                checked={accountingMethod === 'accruals'}
                onChange={() => setAccountingMethod('accruals')}
                data-testid="startup-method-accruals"
                className="mt-1 accent-[var(--ink)]"
              />
              <span className="text-sm">
                <span className="font-medium">Accruals</span>
                <span className="text-gray-500"> — record when the invoice is raised</span>
              </span>
            </label>
          </fieldset>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">Confirm</h2>
          <dl className="bg-gray-50 border border-[var(--line)] p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-500">Business name</dt>
              <dd className="font-medium">{name || <em className="text-gray-400">not set</em>}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">ABN</dt>
              <dd className="font-mono">{abn || <em className="text-gray-400">none</em>}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">GST</dt>
              <dd>{gstRegistered ? 'Registered' : 'Not registered'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Method</dt>
              <dd className="capitalize">{accountingMethod}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">FY end</dt>
              <dd>30 June</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500">
            After you click Finish, the FY2026 sole-trader chart of accounts (197 rows) will be
            available under <span className="font-medium">Configure Accounts</span>.
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={step === 1 ? onCancel : back}
          data-testid="startup-back"
          className="px-4 py-2 border border-[var(--line)] text-sm font-medium hover:bg-gray-50"
        >
          {step === 1 ? 'Cancel' : 'Back'}
        </button>
        <div className="flex-1" />
        {step < 4 ? (
          <button
            type="button"
            onClick={next}
            disabled={!canAdvance}
            data-testid="startup-next"
            className="px-6 py-2 bg-[var(--ink)] text-white text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            data-testid="startup-finish"
            className="px-6 py-2 bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors"
          >
            Finish &amp; create entity
          </button>
        )}
      </div>
    </section>
  );
}
