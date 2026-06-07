/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Fuzzy account matching for TB import.
 * Implements Levenshtein distance on normalised names plus exact code match.
 * Used by ImportTB deterministic flow (AI-optional path).
 */

import type { ImportedAccount, Account } from '../../types';

/**
 * Standard Levenshtein distance (edit distance) between two strings.
 * O(m*n) time, O(m*n) space. Acceptable for short account name strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Normalise a string: lowercase, strip non-alphanumeric (except space), trim. */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export interface MatchResult {
  mappedAccountId?: string;
  confidence: number;
  candidates: Array<{ accountId: string; confidence: number; name: string }>;
  /**
   * True when an exact-code match was found but the imported name diverges
   * significantly from the existing CoA account's name (similarity below
   * NAME_DIVERGENCE_THRESHOLD on normalised strings). The match is still
   * the best candidate by code, but confidence is demoted so the row routes
   * to "Review" — the user must explicitly confirm the rename or click
   * "Create new account" to preserve the imported name. Without this, the
   * silent rename hid balances under the existing account's name (e.g.
   * imported "Cash at Bank 1020" silently mapping to "Business Bank Account
   * 1020"). Set ONLY when divergence is detected; absent otherwise.
   */
  nameDivergence?: {
    importedName: string;
    existingName: string;
    similarity: number;
  };
}

/**
 * Confidence threshold: ≥ 0.85 → auto-select single best match.
 * < 0.85 → show top-3 candidates for manual selection.
 * Source: CONTEXT.md § AI-optional UX (FND-04)
 */
export const HIGH_CONFIDENCE_THRESHOLD = 0.85;

/**
 * Below this similarity, an exact-code match is treated as a divergent rename.
 * Confidence is demoted below HIGH_CONFIDENCE_THRESHOLD so the row enters
 * the "Review" state instead of silently auto-mapping. 0.60 catches the
 * "Cash at Bank" vs "Business Bank Account" case (sim ≈ 0.55) while still
 * allowing minor variations like trailing punctuation (sim ≥ 0.85).
 */
export const NAME_DIVERGENCE_THRESHOLD = 0.60;

/** Demoted confidence assigned when nameDivergence fires (must be < threshold). */
export const DEMOTED_NAME_DIVERGENCE_CONFIDENCE = 0.65;

/** Maximum number of candidates to return when confidence is below threshold. */
export const TOP_N_CANDIDATES = 3;

/**
 * Match an imported account row against the internal chart of accounts.
 *
 * Algorithm:
 * 1. Exact code match → normally confidence 1.0 (hard tie-break).
 *    Exception: if the imported NAME diverges from the matched account's
 *    name (similarity < NAME_DIVERGENCE_THRESHOLD), confidence is demoted
 *    to DEMOTED_NAME_DIVERGENCE_CONFIDENCE and nameDivergence is set so
 *    the review pane can surface the rename for user confirmation.
 * 2. Levenshtein distance on normalised names → confidence = 1 - distance / maxLen.
 * 3. If best confidence ≥ HIGH_CONFIDENCE_THRESHOLD → mappedAccountId set.
 * 4. Otherwise → mappedAccountId undefined; candidates = top TOP_N_CANDIDATES.
 */
export function fuzzyMatch(
  imported: Pick<ImportedAccount, 'externalCode' | 'externalName'>,
  accounts: Account[]
): MatchResult {
  if (accounts.length === 0) {
    return { confidence: 0, candidates: [] };
  }

  // Step 1: Exact code match — gated by name-similarity check.
  if (imported.externalCode) {
    const exactCode = accounts.find(a => a.code === imported.externalCode.trim());
    if (exactCode) {
      // Compute name similarity to detect divergent renames. If the
      // imported row has no name (label-only), skip the divergence check
      // and accept the code match at full confidence — there's nothing to
      // diverge from.
      const normImported = normalise(imported.externalName ?? '');
      const normExisting = normalise(exactCode.name);
      const hasName = normImported.length > 0 && normExisting.length > 0;
      const distance = hasName ? levenshtein(normImported, normExisting) : 0;
      const maxLen = Math.max(normImported.length, normExisting.length);
      const similarity = hasName && maxLen > 0 ? 1 - distance / maxLen : 1;

      if (hasName && similarity < NAME_DIVERGENCE_THRESHOLD) {
        // Divergent rename — demote so the user must confirm.
        return {
          mappedAccountId: exactCode.id,
          confidence: DEMOTED_NAME_DIVERGENCE_CONFIDENCE,
          candidates: [
            { accountId: exactCode.id, confidence: DEMOTED_NAME_DIVERGENCE_CONFIDENCE, name: exactCode.name },
          ],
          nameDivergence: {
            importedName: imported.externalName ?? '',
            existingName: exactCode.name,
            similarity,
          },
        };
      }

      return {
        mappedAccountId: exactCode.id,
        confidence: 1.0,
        candidates: [{ accountId: exactCode.id, confidence: 1.0, name: exactCode.name }],
      };
    }
  }

  // Step 2: Levenshtein on normalised name
  const normImported = normalise(imported.externalName);
  const ranked = accounts
    .map(account => {
      const normAccount = normalise(account.name);
      const distance = levenshtein(normImported, normAccount);
      const maxLen = Math.max(normImported.length, normAccount.length);
      const confidence = maxLen === 0 ? 0 : 1 - distance / maxLen;
      return { accountId: account.id, confidence, name: account.name };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = ranked[0];
  const candidates = ranked.slice(0, TOP_N_CANDIDATES);

  if (!best || best.confidence < 0) {
    return { confidence: 0, candidates: [] };
  }

  if (best.confidence >= HIGH_CONFIDENCE_THRESHOLD) {
    return { mappedAccountId: best.accountId, confidence: best.confidence, candidates };
  }

  return { confidence: best.confidence, candidates };
}
