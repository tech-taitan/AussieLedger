/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trust tax return compute function (NAT 0660).
 * Plan 05-3: full implementation — Form T labels + per-beneficiary distribution
 * + mandatory streaming disclaimer.
 */
import { Decimal } from '../../../money';
import type { Account, BeneficiaryRow, Entity, JournalEntry } from '../../../../types';
import type { FyLabel } from '../../../period';
import { TRUST_LABELS_FULL } from '../../labels/fy2026';
import { rollupByLabel } from './_helpers';
import type { Anomaly, ComputedReturn, ReturnLabel, TrustReturnLabels } from './types';

// ── Mandatory streaming disclaimer (locked verbatim — sourced from RESEARCH Pitfall 2) ────────
export const STREAMING_DISCLAIMER =
  "Trust capital gains and franked distributions can only be streamed to specific beneficiaries if the trust deed expressly permits streaming AND the trustee has made beneficiaries 'specifically entitled' to those amounts by the relevant ATO recording deadline (60 days for capital gains; end of income year for franked distributions). This working paper applies the per-income-class shares you have entered on the beneficiary register without verifying your trust deed. Consult your tax agent if you stream income.";

// ── DistributedShare ────────────────────────────────────────────────────────

export interface DistributedShare {
  beneficiaryId: string;
  name: string;
  totalShare: Decimal;
  components: {
    ordinary: Decimal;
    interest: Decimal;
    dividend: Decimal;
    capitalGain: Decimal;
    foreign: Decimal;
    other: Decimal;
  };
}

// ── Extended TrustReturn type ───────────────────────────────────────────────

export type TrustReturn = ComputedReturn<TrustReturnLabels> & {
  meta: ComputedReturn<TrustReturnLabels>['meta'] & {
    streamingDisclaimer: string;
    distribution: DistributedShare[];
    distributionTotal: Decimal;
  };
};

// ── Input type ─────────────────────────────────────────────────────────────

export interface ComputeTrustInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

// ── distributeTrustIncome helper ───────────────────────────────────────────

export interface DistributeTrustInput {
  netIncome: Decimal;
  beneficiaries: BeneficiaryRow[];
  breakdown?: {
    interest: Decimal;
    dividend: Decimal;
    capitalGain: Decimal;
    foreign: Decimal;
    other: Decimal;
  };
}

/**
 * Distribute trust net income across beneficiaries.
 *
 * Rules (from Plan 05-3 CONTEXT decision):
 *  1. Share totals must sum to 100% ± 0.005%; warn if not.
 *  2. If any beneficiary has sharePerType set, emit warn anomaly and proceed with
 *     sharePercent-only distribution (streaming not supported in this version).
 *  3. totalShare = netIncome × sharePercent / 100, rounded to 2dp.
 *  4. Defence-in-depth: warn if sum of totalShare differs from netIncome by > 0.01.
 */
export function distributeTrustIncome(input: DistributeTrustInput): {
  rows: DistributedShare[];
  anomalies: Anomaly[];
} {
  const { netIncome, beneficiaries } = input;
  const anomalies: Anomaly[] = [];
  const zero = new Decimal(0);

  // 1. Check share totals
  const sharesSum = beneficiaries.reduce(
    (s, b) => s.plus(new Decimal(b.sharePercent)),
    zero,
  );
  if (beneficiaries.length > 0 && sharesSum.minus(100).abs().greaterThan('0.005')) {
    anomalies.push({
      id: 'shares-not-100',
      severity: 'warn',
      message: `Beneficiary shares sum to ${sharesSum.toFixed(2)}%, not 100% — distribution will not reconcile`,
    });
  }

  // 2. Warn on sharePerType (streaming not supported)
  for (const b of beneficiaries) {
    if (b.sharePerType && Object.keys(b.sharePerType).length > 0) {
      anomalies.push({
        id: `sharePerType-unsupported-${b.id}`,
        severity: 'warn',
        message: `Beneficiary "${b.name}" has per-class shares defined that are not used by this version. Manual adjustment required.`,
      });
    }
  }

  // 3. Compute per-beneficiary share (sharePercent-only)
  const rows: DistributedShare[] = beneficiaries.map((b) => {
    const share = new Decimal(b.sharePercent).dividedBy(100);
    const total = netIncome.times(share).toDecimalPlaces(2);
    return {
      beneficiaryId: b.id,
      name: b.name,
      totalShare: total,
      components: {
        ordinary: total,
        interest: zero,
        dividend: zero,
        capitalGain: zero,
        foreign: zero,
        other: zero,
      },
    };
  });

  // 4. Defence-in-depth reconciliation
  const distributed = rows.reduce((s, r) => s.plus(r.totalShare), zero);
  if (beneficiaries.length > 0 && distributed.minus(netIncome).abs().greaterThan('0.01')) {
    anomalies.push({
      id: 'distribution-not-reconciled',
      severity: 'warn',
      message: `Distribution total ${distributed.toFixed(2)} does not reconcile to net income ${netIncome.toFixed(2)}`,
    });
  }

  return { rows, anomalies };
}

// ── computeTrustReturn ─────────────────────────────────────────────────────

function makeLabel(code: string, value: Decimal): ReturnLabel {
  const meta = TRUST_LABELS_FULL[code as keyof typeof TRUST_LABELS_FULL];
  return {
    code,
    value,
    plainEnglish: meta?.plainEnglish ?? code,
    natReference: meta?.natReference,
  };
}

/**
 * Compute Trust tax return (NAT 0660).
 *
 * Rolls up Form T labels from GL via rollupByLabel using 'trustTaxLabel' account field.
 * Derives net income (item 26) and distributes to beneficiaries via distributeTrustIncome.
 * Emits mandatory streaming disclaimer in meta.streamingDisclaimer (TRT-02).
 */
export function computeTrustReturn(input: ComputeTrustInput): TrustReturn {
  const { entity, accounts, entries, fy } = input;

  // Roll up GL by trustTaxLabel
  const raw = rollupByLabel<string>(entries, accounts, 'trustTaxLabel');

  const zero = new Decimal(0);

  // Income labels
  const inc5B = raw['5B'] ?? zero;
  const interest11J = raw['11J'] ?? zero;

  // Expense labels
  const exp5E = raw['5E'] ?? zero;
  const exp5F = raw['5F'] ?? zero;
  const exp5L = raw['5L'] ?? zero;
  const exp5M = raw['5M'] ?? zero;
  const exp5N = raw['5N'] ?? zero;

  // Derived totals
  const total5S = exp5E.plus(exp5F).plus(exp5L).plus(exp5M).plus(exp5N);
  const net5T = inc5B.minus(total5S);
  const item26 = net5T.plus(interest11J);
  const item56 = item26; // s.97 distributable trust income

  // Distribution
  const { rows, anomalies: distAnomalies } = distributeTrustIncome({
    netIncome: item26,
    beneficiaries: entity.beneficiaries ?? [],
  });
  const distributionTotal = rows.reduce((s, r) => s.plus(r.totalShare), zero);

  // Anomalies
  const anomalies: Anomaly[] = [...distAnomalies];
  const locked = (entity.lockedFys ?? []).includes(fy);
  if (locked) {
    anomalies.push({
      id: 'locked-fy',
      severity: 'info',
      message: 'Locked FY — read-only working paper.',
    });
  }

  return {
    labels: {
      '5B': makeLabel('5B', inc5B),
      '5E': makeLabel('5E', exp5E),
      '5F': makeLabel('5F', exp5F),
      '5L': makeLabel('5L', exp5L),
      '5M': makeLabel('5M', exp5M),
      '5N': makeLabel('5N', exp5N),
      '5S': makeLabel('5S', total5S),
      '5T': makeLabel('5T', net5T),
      '11J': makeLabel('11J', interest11J),
      '26': makeLabel('26', item26),
      '56': makeLabel('56', item56),
    } as TrustReturnLabels,
    meta: {
      fy,
      entityType: 'Trust',
      natReference: 'NAT 0660',
      locked,
      anomalies,
      streamingDisclaimer: STREAMING_DISCLAIMER,
      distribution: rows,
      distributionTotal,
    },
  };
}
