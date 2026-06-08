/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';

/**
 * Full working-paper disclaimer for the print banner.
 * Locked verbatim — do not paraphrase.
 */
export const FULL_PRINT_DISCLAIMER =
  'AUSSIELEDGER WORKING PAPER. Not tax advice. Produced by self-hosted open-source software. Verify all figures against ATO instructions and your trust deed / company constitution before lodging. Consult a registered tax agent or qualified accountant before lodging or making business decisions based on this output. The lodging entity retains all responsibility.';

/**
 * Short footer disclaimer — printed on every page via .print-footer CSS class.
 */
export const FOOTER_DISCLAIMER =
  'AussieLedger working paper. Not tax advice. Verify before lodgement.';

const FORM_NAT_MAP: Record<string, string> = {
  I:   'Form I: Individual Tax Return (NAT 2541)',
  C:   'Form C: Company Tax Return (NAT 0656)',
  T:   'Form T: Trust Tax Return (NAT 0660)',
  P:   'Form P: Partnership Tax Return (NAT 0659)',
  BAS: 'Business Activity Statement (Simpler BAS)',
  IAS: 'Instalment Activity Statement',
};

interface PrintBannerProps {
  form: 'I' | 'C' | 'T' | 'P' | 'BAS' | 'IAS';
  entityName: string;
  fy: string;
  locked?: boolean;
}

/**
 * Top-of-page print banner — renders ONLY in print mode (.print-only class).
 * Shows the form's NAT reference, entity name, FY, LOCKED tag (if applicable),
 * and the full working-paper disclaimer.
 *
 * The per-page footer disclaimer is handled by `.print-footer` CSS class in print.css
 * (positioned with `position: fixed; bottom: 0` inside @media print), NOT by this component.
 */
export function PrintBanner({
  form,
  entityName,
  fy,
  locked = false,
}: PrintBannerProps): React.JSX.Element {
  return (
    <div className="print-only print-banner" data-testid="print-banner">
      <div className="print-banner-title">
        <strong>{FORM_NAT_MAP[form] ?? `Form ${form}`}</strong>
        {locked && (
          <span className="print-banner-locked-tag" style={{ color: 'red', marginLeft: '0.5em' }}>
            {' '}[LOCKED FY]
          </span>
        )}
      </div>
      <div className="print-banner-meta">
        <span>{entityName}</span>
        <span> · {fy}</span>
      </div>
      <p className="print-banner-disclaimer">{FULL_PRINT_DISCLAIMER}</p>
    </div>
  );
}
