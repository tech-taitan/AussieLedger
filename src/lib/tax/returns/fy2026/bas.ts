/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BAS (Business Activity Statement) + IAS (Instalment Activity Statement) compute function.
 * Source: NAT 7392 (Simpler BAS) + NAT 4189 (full BAS worksheet) FY2025-26
 *
 * Phase 5 Plan 05-4: full implementation.
 *
 * Rounding modes per ATO worksheet method:
 *   G1          — final ROUND_HALF_UP after per-line accumulation
 *   1A / 1B     — per-line gst() (banker's rounding / ROUND_HALF_EVEN, 2dp) summed, then no further rounding
 *   W2          — final ROUND_DOWN
 *   All others  — toDecimalPlaces(2) default (banker's rounding from money.ts global config)
 *
 * Simpler BAS (Phase 5 ships Simpler BAS only):
 *   Lodgement labels:  G1, 1A, 1B, W1, W2, W3, W4, W5, T7
 *   Internal-only:     G2, G3, G10, G11 (computed but NOT lodged; flagged internalOnly: true)
 */

import { Decimal, gst } from '../../../money';
import { filterPostedEntries } from './_helpers';
import { isInPeriod, type Period, type FyLabel } from '../../../period';
import type { Account, Entity, JournalEntry } from '../../../../types';
import type { ComputedReturn, BasReturnLabels, ReturnLabel, Anomaly } from './types';
import { BAS_LABELS_FULL } from '../../labels/fy2026';

// ── Extended return types ─────────────────────────────────────────────────

export type BasReturn = ComputedReturn<BasReturnLabels> & {
  meta: ComputedReturn<BasReturnLabels>['meta'] & {
    /** 'BAS' for GST-registered entities; 'IAS' for PAYG-only entities. */
    shape: 'BAS' | 'IAS';
    /** Always true — Phase 5 ships Simpler BAS only. */
    simplerBasMode: boolean;
    /** The period this BAS/IAS covers. */
    period: Period;
  };
};

export interface ComputeBasInput {
  entity: Entity;
  accounts: Account[];
  entries: JournalEntry[];
  period: Period;
}

// ── Account heuristics ────────────────────────────────────────────────────

/** Export accounts: code in 4100-range or name matches /export/i. */
const isExportAccount = (acc: Account): boolean =>
  /export/i.test(acc.name) || (acc.code >= '4100' && acc.code < '4200');

/** Wage accounts: name matches /wages|salary|payroll/i. */
const isWageAccount = (acc: Account): boolean =>
  /wages|salary|payroll/i.test(acc.name);

/** PAYG Withholding liability accounts. */
const isPaygWithholding = (acc: Account): boolean =>
  /PAYG\s*Withholding/i.test(acc.name);

// ── ReturnLabel factory ───────────────────────────────────────────────────

const makeLabel = (code: string, value: Decimal, internalOnly = false): ReturnLabel => {
  const meta = BAS_LABELS_FULL[code as keyof typeof BAS_LABELS_FULL];
  return {
    code,
    value,
    internalOnly,
    plainEnglish: meta?.plainEnglish ?? code,
    natReference: meta?.natReference,
  };
};

// ── FY extraction helper ──────────────────────────────────────────────────

function fyFromPeriod(period: Period): FyLabel {
  if (period.type === 'fy') return period.fy;
  if (period.type === 'quarter') return period.fy;
  // Custom period — derive from the `from` date
  const fromDate = period.from;
  const month = fromDate.getMonth() + 1; // 1-indexed
  const year = fromDate.getFullYear();
  const endYear = month <= 6 ? year : year + 1;
  return `FY${endYear}`;
}

// ── Main compute function ─────────────────────────────────────────────────

/**
 * Compute Business Activity Statement (BAS) or Instalment Activity Statement (IAS).
 *
 * Dispatches based on entity.gstRegistered:
 *   - true  → full BAS (G1/G2/G3/G10/G11/1A/1B/W1/W2/W3/W4/W5/T7)
 *   - false → emits a not-gst-registered warn anomaly (caller should use computeIas)
 *
 * Phase 5 ships Simpler BAS only (simplerBasMode: true always).
 * G2, G3, G10, G11 are computed but flagged internalOnly: true — they appear in a
 * separate "working-paper only" section, NOT in the lodgement section.
 *
 * Per-label rounding:
 *   G1    — ROUND_HALF_UP (ATO worksheet)
 *   1A/1B — per-line gst() (banker's rounding 2dp) summed (Pitfall 4: per-line before aggregation)
 *   W2    — ROUND_DOWN (ATO worksheet)
 */
export function computeBas(input: ComputeBasInput): BasReturn {
  const { entity, accounts, entries, period } = input;

  // ── Step 1: filter posted entries ───────────────────────────────────────
  const posted = filterPostedEntries(entries);

  // ── Step 2: filter by period ─────────────────────────────────────────────
  const inPeriod = posted.filter((e) => isInPeriod(new Date(e.date), period));

  // ── Step 3: accumulate labels ────────────────────────────────────────────
  let g1  = new Decimal(0); // Total sales (GST-inclusive) — ROUND_HALF_UP on output
  let g2  = new Decimal(0); // Export sales (internal-only)
  let g3  = new Decimal(0); // Other GST-free sales (internal-only)
  let g10 = new Decimal(0); // Capital purchases (internal-only)
  let g11 = new Decimal(0); // Non-capital purchases (internal-only)
  let gst1A = new Decimal(0); // GST on sales — per-line gst() summed
  let gst1B = new Decimal(0); // GST on purchases — per-line gst() summed
  let w1  = new Decimal(0); // Total wages
  let w2  = new Decimal(0); // PAYG withheld — ROUND_DOWN on output
  const w3 = new Decimal(0); // Other withholding (out-of-scope v1 baseline)
  const w4 = new Decimal(0); // Other withholding (out-of-scope v1 baseline)

  for (const entry of inPeriod) {
    for (const line of entry.lines) {
      const acc = accounts.find((a) => a.id === line.accountId);
      if (!acc) continue;

      const credit = new Decimal(line.credit || 0);
      const debit  = new Decimal(line.debit  || 0);

      // ── Revenue lines ──────────────────────────────────────────────────
      if (acc.type === 'Revenue') {
        const amt = credit.minus(debit);
        if (amt.greaterThan(0)) {
          g1 = g1.plus(amt); // G1: total GST-inclusive sales (any gstCode)

          if (acc.gstCode === 'FRE') {
            if (isExportAccount(acc)) {
              g2 = g2.plus(amt); // G2: export sales (internal-only)
            } else {
              g3 = g3.plus(amt); // G3: other GST-free sales (internal-only)
            }
          }

          if (acc.gstCode === 'GST') {
            // 1A: per-line gst() — banker's rounding 2dp BEFORE aggregation (Pitfall 4)
            gst1A = gst1A.plus(gst(amt));
          }
        }
      }

      // ── Expense lines ──────────────────────────────────────────────────
      if (acc.type === 'Expense') {
        const amt = debit.minus(credit);
        if (isWageAccount(acc)) {
          // W1: wages flow — NOT added to G11
          w1 = w1.plus(amt);
        } else if (amt.greaterThan(0)) {
          g11 = g11.plus(amt); // G11: non-capital purchases (internal-only)
          if (acc.gstCode === 'GST') {
            // 1B: per-line gst() — same per-line rounding as 1A
            gst1B = gst1B.plus(gst(amt));
          }
        }
      }

      // ── Asset capital purchase lines ───────────────────────────────────
      if (acc.type === 'Asset' && acc.gstCode === 'CAP') {
        const amt = debit.minus(credit);
        if (amt.greaterThan(0)) {
          g10 = g10.plus(amt); // G10: capital purchases (internal-only)
          gst1B = gst1B.plus(gst(amt)); // 1B: per-line gst()
        }
      }

      // ── PAYG Withholding liability lines ────────────────────────────────
      if (acc.type === 'Liability' && isPaygWithholding(acc)) {
        const amt = credit.minus(debit); // liability credit = amount withheld
        if (amt.greaterThan(0)) {
          w2 = w2.plus(amt);
        }
      }
    }
  }

  // ── Step 4: derived labels ───────────────────────────────────────────────
  const t7 = new Decimal(entity.paygInstalmentAmount ?? '0');
  const w5 = w2.plus(w3).plus(w4);

  // ── Step 5: apply per-label rounding modes ───────────────────────────────
  // G1: ROUND_HALF_UP per ATO worksheet method
  const g1Final   = g1.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  // 1A / 1B: already per-line gst() banker's rounded; sum needs no additional rounding
  //           but apply toDecimalPlaces(2) as a final safety clamp
  const gst1AFinal = gst1A.toDecimalPlaces(2);
  const gst1BFinal = gst1B.toDecimalPlaces(2);
  // W2: ROUND_DOWN per ATO worksheet method
  const w2Final   = w2.toDecimalPlaces(2, Decimal.ROUND_DOWN);
  const netGst    = gst1AFinal.minus(gst1BFinal);

  // ── Step 6: anomalies ────────────────────────────────────────────────────
  const fy = fyFromPeriod(period);
  const anomalies: Anomaly[] = [];

  if (entity.gstRegistered === false) {
    anomalies.push({
      id: 'not-gst-registered',
      severity: 'warn',
      message: 'Entity is not GST-registered — render as IAS instead of BAS.',
    });
  }

  if ((!entity.paygInstalmentAmount || entity.paygInstalmentAmount === '') && w1.greaterThan(0)) {
    anomalies.push({
      id: 'payg-i-unset',
      severity: 'info',
      message: 'PAYG instalment amount not set on Entity — T7 will report $0. Enter the amount from your ATO portal in Entity settings.',
    });
  }

  const locked = (entity.lockedFys ?? []).includes(fy);
  if (locked) {
    anomalies.push({
      id: 'locked-fy',
      severity: 'info',
      message: 'Locked FY — read-only working paper.',
    });
  }

  // ── Step 7: build labels map ─────────────────────────────────────────────
  const entityType = (entity.type as string) as 'Individual' | 'Company' | 'Trust' | 'Partnership';

  return {
    labels: {
      G1:      makeLabel('G1',     g1Final),
      G2:      makeLabel('G2',     g2.toDecimalPlaces(2),  true),  // internal-only
      G3:      makeLabel('G3',     g3.toDecimalPlaces(2),  true),  // internal-only
      G10:     makeLabel('G10',    g10.toDecimalPlaces(2), true),  // internal-only
      G11:     makeLabel('G11',    g11.toDecimalPlaces(2), true),  // internal-only
      '1A':    makeLabel('1A',     gst1AFinal),
      '1B':    makeLabel('1B',     gst1BFinal),
      W1:      makeLabel('W1',     w1.toDecimalPlaces(2)),
      W2:      makeLabel('W2',     w2Final),
      W3:      makeLabel('W3',     w3),
      W4:      makeLabel('W4',     w4),
      W5:      makeLabel('W5',     w5.toDecimalPlaces(2)),
      T7:      makeLabel('T7',     t7.toDecimalPlaces(2)),
      netGst:  makeLabel('netGst', netGst),
    } as BasReturnLabels,
    meta: {
      fy,
      entityType,
      natReference: 'NAT 7392 (Simpler BAS)',
      locked,
      anomalies,
      shape: 'BAS',
      simplerBasMode: true,
      period,
    },
  };
}
