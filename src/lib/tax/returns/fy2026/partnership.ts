/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Partnership tax return compute function (NAT 0659).
 * Plan 05-3: full implementation — Form P labels + per-partner distribution
 * + loss-share warning.
 */
import { Decimal } from '../../../money';
import type { Account, Entity, JournalEntry, PartnerRow } from '../../../../types';
import type { FyLabel } from '../../../period';
import { PARTNERSHIP_LABELS_FULL } from '../../labels/fy2026';
import { rollupByLabel } from './_helpers';
import type { Anomaly, ComputedReturn, ReturnLabel, PartnershipReturnLabels } from './types';
import type { DistributedShare } from './trust';

// ── Extended PartnershipReturn type ────────────────────────────────────────

export type PartnershipReturn = ComputedReturn<PartnershipReturnLabels> & {
  meta: ComputedReturn<PartnershipReturnLabels>['meta'] & {
    distribution: DistributedShare[];
    distributionTotal: Decimal;
  };
};

// ── Input type ─────────────────────────────────────────────────────────────

export interface ComputePartnershipInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  fy: FyLabel;
}

// ── distributePartnershipNetIncome helper ───────────────────────────────────

export interface DistributePartnershipInput {
  netIncome: Decimal;
  partners: PartnerRow[];
}

/**
 * Distribute partnership net income (or loss) across partners.
 *
 * Rules:
 *  1. Share totals must sum to 100% ± 0.005%; warn if not.
 *  2. Negative netIncome → each partner receives a negative share (loss).
 *     Emit loss-share warning.
 *  3. totalShare = netIncome × sharePercent / 100, rounded to 2dp.
 *  4. Defence-in-depth: warn if sum of totalShare differs from netIncome by > 0.01.
 */
export function distributePartnershipNetIncome(input: DistributePartnershipInput): {
  rows: DistributedShare[];
  anomalies: Anomaly[];
} {
  const { netIncome, partners } = input;
  const anomalies: Anomaly[] = [];
  const zero = new Decimal(0);

  // 1. Check share totals
  const sharesSum = partners.reduce(
    (s, p) => s.plus(new Decimal(p.sharePercent)),
    zero,
  );
  if (partners.length > 0 && sharesSum.minus(100).abs().greaterThan('0.005')) {
    anomalies.push({
      id: 'partner-shares-not-100',
      severity: 'warn',
      message: `Partner shares sum to ${sharesSum.toFixed(2)}%, not 100% — distribution will not reconcile`,
    });
  }

  // 2. Loss-share warning when P8 < 0
  if (netIncome.lessThan(0)) {
    anomalies.push({
      id: 'partnership-loss',
      severity: 'warn',
      message:
        'Partnership net loss detected — each partner claims their share of the loss on their individual return. AussieLedger does not propagate the loss across entities.',
    });
  }

  // 3. Compute per-partner share (sharePercent-only)
  const rows: DistributedShare[] = partners.map((p) => {
    const share = new Decimal(p.sharePercent).dividedBy(100);
    const total = netIncome.times(share).toDecimalPlaces(2);
    return {
      beneficiaryId: p.id,
      name: p.name,
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
  if (partners.length > 0 && distributed.minus(netIncome).abs().greaterThan('0.01')) {
    anomalies.push({
      id: 'distribution-not-reconciled',
      severity: 'warn',
      message: `Distribution total ${distributed.toFixed(2)} does not reconcile to net income ${netIncome.toFixed(2)}`,
    });
  }

  return { rows, anomalies };
}

// ── computePartnershipReturn ────────────────────────────────────────────────

function makeLabel(code: string, value: Decimal): ReturnLabel {
  const meta = PARTNERSHIP_LABELS_FULL[code as keyof typeof PARTNERSHIP_LABELS_FULL];
  return {
    code,
    value,
    plainEnglish: meta?.plainEnglish ?? code,
    natReference: meta?.natReference,
  };
}

/**
 * Compute Partnership tax return (NAT 0659).
 *
 * Rolls up Form P labels from GL via rollupByLabel using 'partnershipTaxLabel' account field.
 * P1 = gross income (5B + 5T aggregate), P2 = deductions (5E + 5N), P8 = P1 − P2.
 * Distributes P8 across entity.partners via distributePartnershipNetIncome.
 */
export function computePartnershipReturn(input: ComputePartnershipInput): PartnershipReturn {
  const { entity, accounts, entries, fy } = input;

  // Roll up GL by partnershipTaxLabel
  const raw = rollupByLabel<string>(entries, accounts, 'partnershipTaxLabel');

  const zero = new Decimal(0);

  // Income labels
  const rawP1 = raw['P1'] ?? zero;
  const raw5B = raw['5B'] ?? zero;
  const raw5T = raw['5T'] ?? zero;

  // P1 = explicit P1 label OR aggregate of 5B/5T gross income
  const incP1 = rawP1.isZero()
    ? raw5B.plus(raw5T)
    : rawP1.plus(raw5B).plus(raw5T);

  // Deduction labels
  const rawP2 = raw['P2'] ?? zero;
  const raw5E = raw['5E'] ?? zero;
  const raw5N = raw['5N'] ?? zero;

  // P2 = explicit P2 label OR aggregate of 5E/5N expense labels
  const dedP2 = rawP2.isZero()
    ? raw5E.plus(raw5N)
    : rawP2.plus(raw5E).plus(raw5N);

  // Net income or loss
  const netP8 = incP1.minus(dedP2);

  // Distribution
  const { rows, anomalies: distAnomalies } = distributePartnershipNetIncome({
    netIncome: netP8,
    partners: entity.partners ?? [],
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
      P1: makeLabel('P1', incP1),
      P2: makeLabel('P2', dedP2),
      P8: makeLabel('P8', netP8),
    } as PartnershipReturnLabels,
    meta: {
      fy,
      entityType: 'Partnership',
      natReference: 'NAT 0659',
      locked,
      anomalies,
      distribution: rows,
      distributionTotal,
    },
  };
}
