/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ProfessionalAdviceBanner — visible top-of-view banner mounted on every
 * tax-return assistant (I/C/T/P), the BAS/IAS assistant, and the final
 * Year-End Wizard step. Reinforces the message already in DisclaimerFooter
 * (which is small and easily missed) at the moment the user is about to
 * read or act on a tax output.
 *
 * Copy is LOCKED — do not paraphrase. Any change requires updating every
 * mounting site's assertion.
 */
import React from 'react';
import { AlertCircle } from 'lucide-react';

export const PROFESSIONAL_ADVICE_COPY =
  'AussieLedger is a working-paper tool. It does not provide tax or accounting advice. ' +
  'Have a registered tax agent or qualified accountant review every figure before lodging ' +
  'with the ATO or making business decisions based on these outputs.';

interface ProfessionalAdviceBannerProps {
  /** Optional extra Tailwind classes to override default spacing. */
  className?: string;
}

export function ProfessionalAdviceBanner({
  className,
}: ProfessionalAdviceBannerProps = {}): React.JSX.Element {
  return (
    <div
      role="note"
      aria-label="Professional advice disclaimer"
      data-testid="professional-advice-banner"
      className={
        'flex items-start gap-2 text-xs bg-amber-50 border border-amber-300 ' +
        'text-amber-900 rounded p-3 mb-3 leading-snug ' +
        (className ?? '')
      }
    >
      <AlertCircle
        size={16}
        className="flex-shrink-0 mt-0.5 text-amber-700"
        aria-hidden="true"
      />
      <span>{PROFESSIONAL_ADVICE_COPY}</span>
    </div>
  );
}
