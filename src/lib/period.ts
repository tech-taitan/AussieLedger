/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Australian financial year and BAS period model.
 *
 * KNOWN CONSTRAINT: Time-of-day is ignored — all boundaries are at midnight local time.
 * No timezone handling. The app assumes the user's machine clock reflects AEST/AEDT.
 * This is a v1 limitation; do not add timezone logic without a test suite covering DST edge cases.
 *
 * FORBIDDEN: Do not use `new Date()` or `Date.now()` anywhere outside this module.
 * Use `today()` instead. The structural lint test enforces this.
 */

export type FyLabel = `FY${number}`;

export type Period =
  | { type: 'fy'; fy: FyLabel }
  | { type: 'quarter'; fy: FyLabel; q: 1 | 2 | 3 | 4 }
  | { type: 'custom'; from: Date; to: Date };

// ── Test seam ──────────────────────────────────────────────────────────────
// Tests use vi.spyOn(periodModule, 'today').mockReturnValue(new Date('2026-05-10'))
// App code always calls today() — never new Date()
let _nowProvider: () => Date = () => new Date();

export function today(): Date {
  return _nowProvider();
}

/** Only for tests. Do not call in production code. */
export function _setNowProvider(fn: () => Date): void {
  _nowProvider = fn;
}

/** Reset to real clock. Call in test afterEach. */
export function _resetNowProvider(): void {
  _nowProvider = () => new Date();
}

// ── FY label helpers ───────────────────────────────────────────────────────
/**
 * Return the FY label for the given date.
 * AU FY runs 1 July – 30 June; the label is the calendar year of the END date.
 * 1 Jul 2025 – 30 Jun 2026 → 'FY2026'
 */
export function currentFy(now?: Date): FyLabel {
  const d = now ?? _nowProvider();
  const year = d.getFullYear();
  const month = d.getMonth() + 1; // 1-indexed
  // If month is Jan–Jun, the FY end year is the current calendar year
  // If month is Jul–Dec, the FY end year is calendar year + 1
  const endYear = month <= 6 ? year : year + 1;
  return `FY${endYear}`;
}

/**
 * Parse FyLabel and return the start/end Date for the financial year.
 * 'FY2026' → { from: 2025-07-01, to: 2026-06-30 }
 */
export function fyBoundaries(fy: FyLabel): { from: Date; to: Date } {
  const endYear = Number(fy.replace('FY', ''));
  if (Number.isNaN(endYear)) throw new Error(`Invalid FyLabel: ${fy}`);
  // Start is 1 July of (endYear - 1); use UTC to avoid local timezone shifts
  const from = new Date(Date.UTC(endYear - 1, 6, 1));   // month 6 = July (0-indexed)
  // End is 30 June of endYear
  const to   = new Date(Date.UTC(endYear, 5, 30));       // month 5 = June
  return { from, to };
}

/**
 * Determine which FY and quarter a given date falls in.
 * Returns { fy: 'FY2026', q: 1 | 2 | 3 | 4 }
 */
export function quarterOf(date: Date): { fy: FyLabel; q: 1 | 2 | 3 | 4 } {
  const month = date.getMonth() + 1; // 1-indexed
  const year = date.getFullYear();

  if (month >= 7 && month <= 9) {
    return { fy: `FY${year + 1}`, q: 1 };  // Jul-Sep → Q1 of FY ending next year
  } else if (month >= 10 && month <= 12) {
    return { fy: `FY${year + 1}`, q: 2 };  // Oct-Dec → Q2
  } else if (month >= 1 && month <= 3) {
    return { fy: `FY${year}`, q: 3 };      // Jan-Mar → Q3
  } else {
    return { fy: `FY${year}`, q: 4 };      // Apr-Jun → Q4
  }
}

/**
 * Return the start/end Date for a given BAS quarter within a financial year.
 * Quarter boundaries (ATO-prescribed):
 *   Q1 = 1 Jul – 30 Sep
 *   Q2 = 1 Oct – 31 Dec
 *   Q3 = 1 Jan – 31 Mar
 *   Q4 = 1 Apr – 30 Jun
 */
export function quarterBoundaries(
  fy: FyLabel,
  q: 1 | 2 | 3 | 4
): { from: Date; to: Date } {
  const endYear = Number(fy.replace('FY', ''));
  const startYear = endYear - 1;

  const QUARTER_MAP: Record<1 | 2 | 3 | 4, { from: Date; to: Date }> = {
    1: { from: new Date(Date.UTC(startYear, 6, 1)),  to: new Date(Date.UTC(startYear, 8, 30)) },  // Jul–Sep
    2: { from: new Date(Date.UTC(startYear, 9, 1)),  to: new Date(Date.UTC(startYear, 11, 31)) }, // Oct–Dec
    3: { from: new Date(Date.UTC(endYear, 0, 1)),    to: new Date(Date.UTC(endYear, 2, 31)) },    // Jan–Mar
    4: { from: new Date(Date.UTC(endYear, 3, 1)),    to: new Date(Date.UTC(endYear, 5, 30)) },    // Apr–Jun
  };

  return QUARTER_MAP[q];
}

/**
 * Return true if the given date falls within the specified period (inclusive boundaries).
 * Date comparisons ignore time-of-day.
 */
export function isInPeriod(date: Date, period: Period): boolean {
  // Normalise the test date using local getters (the date represents a calendar day on the user's machine)
  const dMs = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());

  if (period.type === 'fy') {
    // fyBoundaries uses Date.UTC, so use UTC getters for from/to
    const { from, to } = fyBoundaries(period.fy);
    const fromMs = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const toMs   = Date.UTC(to.getUTCFullYear(),   to.getUTCMonth(),   to.getUTCDate());
    return dMs >= fromMs && dMs <= toMs;
  } else if (period.type === 'quarter') {
    // quarterBoundaries uses Date.UTC, so use UTC getters for from/to
    const { from, to } = quarterBoundaries(period.fy, period.q);
    const fromMs = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const toMs   = Date.UTC(to.getUTCFullYear(),   to.getUTCMonth(),   to.getUTCDate());
    return dMs >= fromMs && dMs <= toMs;
  } else {
    // Custom period boundaries are user-provided; use local getters for consistency
    const { from, to } = period;
    const fromMs = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
    const toMs   = Date.UTC(to.getFullYear(),   to.getMonth(),   to.getDate());
    return dMs >= fromMs && dMs <= toMs;
  }
}
