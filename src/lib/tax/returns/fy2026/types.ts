/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared types for Phase 5 tax-return compute functions.
 * These types are the FINAL contract for 05-2/05-3/05-4 compute functions.
 * DO NOT widen or change the shape without a plan-level decision.
 */

import type { Decimal } from '../../../money';
import type {
  IndividualLabel,
  CompanyLabel,
  TrustLabel,
  PartnershipLabel,
  BasLabel,
  IasLabel,
} from '../../labels/fy2026';

/**
 * A single labelled field on a tax return.
 * value is Decimal (pre-rounded per per-label rounding rule).
 * Serialise to string only at the JSX render boundary.
 */
export interface ReturnLabel {
  /** ATO field code, e.g. 'P1', '6A', 'G1', '1A'. */
  code: string;
  /** Human-readable title from the ATO instructions. */
  plainEnglish: string;
  /** Value (pre-rounded to 2dp). */
  value: Decimal;
  /** True for Simpler BAS internal calculation labels (G2/G3/G10/G11). */
  internalOnly?: boolean;
  /** NAT reference for the field, e.g. 'NAT 2541 item 15'. */
  natReference?: string;
}

/**
 * An anomaly flag surfaced by a compute*Return function.
 * Rendered as an AnomalyBadge inline and in the consolidated section.
 */
export interface Anomaly {
  /** Unique identifier for deduplication and testing. */
  id: string;
  severity: 'info' | 'warn';
  /** Optional ATO label code this anomaly attaches to. */
  label?: string;
  message: string;
}

/**
 * The generic container returned by every compute*Return function.
 * TLabels is a record type mapping label keys to ReturnLabel.
 */
export interface ComputedReturn<TLabels extends Record<string, ReturnLabel>> {
  labels: TLabels;
  meta: {
    /** FY label, e.g. 'FY2026'. */
    fy: string;
    entityType: 'Individual' | 'Company' | 'Trust' | 'Partnership';
    /** Primary NAT reference for the form. */
    natReference: string;
    /** True if entity.lockedFys includes this FY. */
    locked: boolean;
    anomalies: Anomaly[];
    /** Additional metadata (open-ended for future extensions). */
    [extra: string]: unknown;
  };
}

// ── Per-form label-set types ───────────────────────────────────────────────
// Each maps the form's label codes to ReturnLabel objects.

/** Individual return (NAT 2541 + NAT 2543 B&P schedule) label set. */
export type IndividualReturnLabels = Partial<Record<IndividualLabel, ReturnLabel>>;

/** Company return (NAT 0656) label set. */
export type CompanyReturnLabels = Partial<Record<CompanyLabel, ReturnLabel>>;

/** Trust return (NAT 0660) label set. */
export type TrustReturnLabels = Partial<Record<TrustLabel, ReturnLabel>>;

/** Partnership return (NAT 0659) label set. */
export type PartnershipReturnLabels = Partial<Record<PartnershipLabel, ReturnLabel>>;

/** BAS/IAS label set. */
export type BasReturnLabels = Partial<Record<BasLabel, ReturnLabel>>;

/** IAS label set (subset of BAS labels — PAYG only). */
export type IasReturnLabels = Partial<Record<IasLabel, ReturnLabel>>;
