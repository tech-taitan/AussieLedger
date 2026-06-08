/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Trial Balance — period-filtered with parent-row subtotals (BOOK-07, BOOK-09).
 *
 * Status filter (BOOK-09): only entries that are `posted` or `reversed`
 * contribute to the rollup. Drafts, supersededs, and voideds are excluded.
 * A reversal entry's mirrored debits/credits cancel out the original — so
 * a posted + reversal pair correctly net to zero per account.
 *
 * Parent subtotals: each Account with `parentCode === code` is a child;
 * the parent row renders an aggregated subtotal across all its children.
 */
import React, { useMemo, useState } from 'react';
import type { Account, JournalEntry, TrialBalanceRow, AuditAction } from '../types';
import { isInPeriod, currentFy, today, type Period } from '../lib/period';
import { AlertCircle, ChevronRight, ChevronDown } from 'lucide-react';
import { AnomalyBadge } from './AnomalyBadge';
import { exportTrialBalanceCsv, fmtPeriodSlug } from '../lib/export/csv';
import { Toast } from './Toast';
import { formatAud } from '../lib/money';

interface TrialBalanceProps {
  accounts: Account[];
  entries: JournalEntry[];
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  // Phase 9 additions (FND-10):
  entityName?: string;
  entityId?: string;
  addLog?: (action: AuditAction, details: string, entityId?: string) => void;
  /**
   * Hard-delete every journal entry for the active entity (TB reset).
   * When provided, the TB header surfaces a "Delete all data" button
   * guarded by a window.confirm. The CoA and entity are not touched.
   */
  onClearAll?: () => void;
}

interface OrphanLineGroup {
  accountId: string;
  debit: number;
  credit: number;
  lineCount: number;
  sampleDescription?: string;
}

function triggerCsvDownload(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Tax-label completeness check — mirrors CoaTreeView. An account is "missing
 * labels" ONLY when it's a Revenue / Expense leaf with at least one of the
 * four entity-specific fields blank. Asset / Liability / Equity rows and
 * header rows never need labels and shouldn't show the warning.
 */
function isMissingTaxLabel(a: Account): boolean {
  const isHeader = a.parentCode === null || a.parentCode === undefined;
  if (isHeader) return false;
  if (a.type !== 'Revenue' && a.type !== 'Expense') return false;
  return (
    !a.taxLabel ||
    !a.companyTaxLabel ||
    !a.trustTaxLabel ||
    !a.partnershipTaxLabel
  );
}

/** BOOK-09 status filter — only posted + reversed entries roll into the TB.
 *  A reversal entry is itself `status: 'posted'` (per ledger.makeReversal),
 *  so the "reversed" status applies to the ORIGINAL whose mirror cancels it. */
function isLiveForTB(e: JournalEntry): boolean {
  if (e.status === 'voided' || e.status === 'superseded' || e.status === 'draft') {
    return false;
  }
  // Treat absent-status v2 entries as live iff isPosted; otherwise drop.
  if (!e.status) return e.isPosted === true;
  return e.status === 'posted' || e.status === 'reversed';
}

export const TrialBalance: React.FC<TrialBalanceProps> = ({
  accounts,
  entries,
  period: periodProp,
  onPeriodChange,
  entityName,
  entityId,
  addLog,
  onClearAll,
}) => {
  const [internalPeriod, setInternalPeriod] = useState<Period>(
    periodProp ?? { type: 'fy', fy: currentFy() },
  );
  const period = periodProp ?? internalPeriod;
  const [toast, setToast] = useState<string | null>(null);
  // When checked, accounts that net to zero (including no activity)
  // still render. Default off because most TBs have many nil-balance
  // rows that would noise the view; user can opt in for a complete CoA-
  // shaped TB.
  const [showZeroBalances, setShowZeroBalances] = useState(false);
  // Set of parent account codes whose children are currently hidden.
  // Default empty (all expanded) so the new collapsibility feature is
  // additive — first-time visitors see exactly the same layout as before.
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(
    () => new Set(),
  );

  const toggleParentCollapse = (code: string) => {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const setPeriod = (p: Period) => {
    if (onPeriodChange) onPeriodChange(p);
    else setInternalPeriod(p);
  };

  const handleExportCsv = () => {
    const { filename, csv, isEmpty } = exportTrialBalanceCsv(
      tbData.rows,
      period,
      entityName ?? 'unknown-entity',
      tbData.orphanList, // Task 4: orphan amounts now flow through to the CSV
    );
    triggerCsvDownload(csv, filename);
    addLog?.(
      'EXPORT_DATA',
      JSON.stringify({
        entityId: entityId ?? 'unknown',
        type: 'csv',
        report: 'tb',
        period: fmtPeriodSlug(period),
        filename,
        timestamp: today().toISOString(),
      }),
      entityId,
    );
    if (isEmpty) {
      setToast('No data in selected period for export');
    }
  };

  const tbData = useMemo(() => {
    const balances: Record<string, { debit: number; credit: number }> = {};
    accounts.forEach((acc) => {
      balances[acc.id] = { debit: 0, credit: 0 };
    });

    // Filter: live status + in-period
    const liveEntries = entries.filter((e) => {
      if (!isLiveForTB(e)) return false;
      const d = new Date(e.date); // date PARSE — allowed by structural-lint
      return isInPeriod(d, period);
    });

    // Track orphan lines — journal lines whose accountId doesn't resolve
    // to any account in the current CoA. Previously these were silently
    // skipped, hiding data the user posted (e.g. accounts deleted after
    // import, or pre-fix race-condition leftovers). Now we aggregate them
    // and surface as an explicit row + banner so totals can't lie.
    const orphans: Record<string, OrphanLineGroup> = {};

    liveEntries.forEach((entry) => {
      entry.lines.forEach((line) => {
        if (balances[line.accountId]) {
          balances[line.accountId].debit += Number(line.debit) || 0;
          balances[line.accountId].credit += Number(line.credit) || 0;
        } else {
          const g = orphans[line.accountId] ?? {
            accountId: line.accountId,
            debit: 0,
            credit: 0,
            lineCount: 0,
            sampleDescription: line.description,
          };
          g.debit += Number(line.debit) || 0;
          g.credit += Number(line.credit) || 0;
          g.lineCount += 1;
          if (!g.sampleDescription && line.description) {
            g.sampleDescription = line.description;
          }
          orphans[line.accountId] = g;
        }
      });
    });

    // Build base rows
    const baseRows: TrialBalanceRow[] = accounts.map((acc) => {
      const { debit, credit } = balances[acc.id];
      let balance = 0;
      if (['Asset', 'Expense'].includes(acc.type)) balance = debit - credit;
      else balance = credit - debit;
      return { account: acc, debit, credit, balance };
    });

    // Compute parent subtotals using parentCode
    const childrenOf: Record<string, TrialBalanceRow[]> = {};
    for (const r of baseRows) {
      const p = r.account.parentCode;
      if (p) {
        (childrenOf[p] ??= []).push(r);
      }
    }

    const enriched = baseRows.map((r): TrialBalanceRow => {
      const kids = childrenOf[r.account.code] ?? [];
      const isParent = kids.length > 0;
      if (!isParent) return r;
      // Additive parent rollup — parent total is the parent's OWN postings
      // PLUS the sum of its children. Pre-fix this discarded `r.debit` /
      // `r.credit` and replaced them with the children-sum, which silently
      // hid balances posted directly to a parent account (the depreciation
      // 6900 symptom, where a Company-overlay child accidentally promoted
      // the leaf account to a parent). Best-practice accounting never
      // posts to parents, so this addition is a no-op in clean data —
      // it only stops silent-drop when CoA classification is wrong.
      const childDebit = kids.reduce((s, k) => s + k.debit, 0);
      const childCredit = kids.reduce((s, k) => s + k.credit, 0);
      const debit = r.debit + childDebit;
      const credit = r.credit + childCredit;
      const isDr = ['Asset', 'Expense'].includes(r.account.type);
      const balance = isDr ? debit - credit : credit - debit;
      const childBalance = isDr
        ? childDebit - childCredit
        : childCredit - childDebit;
      return {
        account: r.account,
        debit,
        credit,
        balance,
        isParent: true,
        // childTotals reflects ONLY the children's contribution so a
        // consumer can compute the parent's own postings as parent - kids.
        childTotals: { debit: childDebit, credit: childCredit, balance: childBalance },
      };
    });

    const orphanList = Object.values(orphans);

    // Totals are computed from the RAW per-account balances (baseRows),
    // never from enriched. This is the only way to get correct totals
    // when a parent has BOTH its own postings AND children:
    //   - Pre-fix: filtered out parents → missed their own postings.
    //   - This fix: every raw posting counts once, regardless of role.
    const rawTotalDebits = baseRows.reduce((s, r) => s + r.debit, 0);
    const rawTotalCredits = baseRows.reduce((s, r) => s + r.credit, 0);

    // Filter the displayed rows: show parents always; leaves with activity
    // always; nil-balance leaves only when the user opts in via the toggle.
    const visibleRows = showZeroBalances
      ? enriched
      : enriched.filter((r) => r.debit !== 0 || r.credit !== 0 || r.isParent);

    return {
      rows: visibleRows,
      orphanList,
      rawTotalDebits,
      rawTotalCredits,
    };
  }, [accounts, entries, period, showZeroBalances]);

  const orphanTotalDebit = tbData.orphanList.reduce((s, o) => s + o.debit, 0);
  const orphanTotalCredit = tbData.orphanList.reduce((s, o) => s + o.credit, 0);

  // Compute IDs of accounts referenced in posted entries (for anomaly badge)
  const referencedAccountIds = useMemo(() => {
    const ids = new Set<string>();
    entries.forEach((e) => {
      const isPostedEntry = e.status === 'posted' || (e.status === undefined && e.isPosted);
      if (isPostedEntry) {
        e.lines.forEach((l) => ids.add(l.accountId));
      }
    });
    return ids;
  }, [entries]);

  // Totals are computed from the raw per-account balances inside tbData
  // (NOT from filtered rows). The filtered approach excluded parent rows
  // to avoid double-counting children, but with the additive parent
  // rollup that also dropped the parent's OWN postings — exact symptom:
  // an account that's both a parent (due to overlay children) and
  // carries imported balance was missed from the totals row, breaking
  // the "is balanced" indicator. Orphans (lines without a resolving
  // account) are still added on top so totals reflect every posted line.
  const totalDebits = tbData.rawTotalDebits + orphanTotalDebit;
  const totalCredits = tbData.rawTotalCredits + orphanTotalCredit;
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.005;

  // Codes of all parent rows currently in the visible TB — used to drive
  // "Collapse all" / "Expand all" header controls without rebuilding the
  // hierarchy on every render.
  const allParentCodes = useMemo(
    () =>
      tbData.rows
        .filter((r) => r.isParent)
        .map((r) => r.account.code),
    [tbData.rows],
  );

  // Visible rows after applying the per-parent collapse state. A leaf is
  // hidden when its direct parent code is in `collapsedParents`. Parent
  // rows are always rendered so the user can re-expand them.
  const renderRows = useMemo(
    () =>
      tbData.rows.filter((r) => {
        if (r.isParent) return true;
        const pc = r.account.parentCode;
        return !(pc && collapsedParents.has(pc));
      }),
    [tbData.rows, collapsedParents],
  );

  const collapseAll = () => setCollapsedParents(new Set(allParentCodes));
  const expandAll = () => setCollapsedParents(new Set());
  const allCollapsed =
    allParentCodes.length > 0 &&
    allParentCodes.every((c) => collapsedParents.has(c));

  return (
    <div className="relative bg-white p-4 lg:p-6 shadow-sm border border-[var(--line-strong)]">
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3 mb-4">
        <h2 className="text-xl font-medium">Trial Balance</h2>
        <div
          className="flex gap-2 items-center text-sm"
          data-testid="tb-period-controls"
        >
          <button
            onClick={handleExportCsv}
            className="no-print px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            data-testid="export-csv-button-tb"
          >
            Export CSV
          </button>
          {onClearAll && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    'Delete ALL journal entries for this entity? This wipes the Trial Balance and cannot be undone. Your Chart of Accounts and entity details are preserved.',
                  )
                ) {
                  onClearAll();
                }
              }}
              className="no-print px-3 py-1 bg-rose-600 text-white rounded text-sm hover:bg-rose-700"
              data-testid="clear-tb-button"
            >
              Delete all data
            </button>
          )}
          <label className="flex items-center gap-1 text-xs no-print">
            <input
              type="checkbox"
              checked={showZeroBalances}
              onChange={(e) => setShowZeroBalances(e.target.checked)}
              data-testid="show-zero-balances-toggle"
            />
            <span className="text-[10px] font-bold uppercase text-gray-500">
              Show nil balances
            </span>
          </label>
          {allParentCodes.length > 0 && (
            <button
              type="button"
              onClick={allCollapsed ? expandAll : collapseAll}
              data-testid="tb-toggle-all"
              className="no-print text-[10px] font-bold uppercase text-gray-500 border border-[var(--line)] rounded px-2 py-1 hover:bg-gray-50"
            >
              {allCollapsed ? 'Expand all' : 'Collapse all'}
            </button>
          )}
          <label className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-gray-500">
              Period
            </span>
            <select
              value={period.type}
              onChange={(e) => {
                const t = e.target.value as Period['type'];
                if (t === 'fy') setPeriod({ type: 'fy', fy: currentFy() });
                else if (t === 'quarter')
                  setPeriod({ type: 'quarter', fy: currentFy(), q: 1 });
                else
                  setPeriod({
                    type: 'custom',
                    from: new Date('2025-07-01'),
                    to: new Date('2026-06-30'),
                  });
              }}
              aria-label="period-type"
              className="border border-[var(--line)] rounded px-2 py-1"
            >
              <option value="fy">Financial Year</option>
              <option value="quarter">Quarter</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {period.type === 'quarter' && (
            <label className="flex items-center gap-1">
              <span className="text-[10px] font-bold uppercase text-gray-500">Q</span>
              <select
                value={period.q}
                onChange={(e) =>
                  setPeriod({ ...period, q: Number(e.target.value) as 1 | 2 | 3 | 4 })
                }
                aria-label="period-quarter"
                className="border border-[var(--line)] rounded px-1 py-1"
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
            </label>
          )}
          {/* Task 6: Custom range was previously selectable but had no UI
              controls — picking it silently locked the TB to hardcoded
              FY2026 dates. Now the user can move both endpoints. */}
          {period.type === 'custom' && (
            <>
              <label className="flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">From</span>
                <input
                  type="date"
                  value={period.from.toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setPeriod({ ...period, from: new Date(e.target.value) })
                  }
                  aria-label="period-custom-from"
                  data-testid="period-custom-from"
                  className="border border-[var(--line)] rounded px-1 py-1 text-xs"
                />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[10px] font-bold uppercase text-gray-500">To</span>
                <input
                  type="date"
                  value={period.to.toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setPeriod({ ...period, to: new Date(e.target.value) })
                  }
                  aria-label="period-custom-to"
                  data-testid="period-custom-to"
                  className="border border-[var(--line)] rounded px-1 py-1 text-xs"
                />
              </label>
            </>
          )}
        </div>
      </div>

      {tbData.orphanList.length > 0 && (
        <div
          data-testid="tb-orphan-banner"
          className="bg-rose-50 border border-rose-200 rounded p-3 mb-3 flex items-start gap-2 text-xs text-rose-900"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-700" />
          <div>
            <div className="font-semibold mb-1">
              {tbData.orphanList.length} unknown{' '}
              {tbData.orphanList.length === 1 ? 'account' : 'accounts'} —
              {' '}journal lines reference accountIds that aren't in the current
              Chart of Accounts.
            </div>
            <p className="text-[11px] leading-relaxed">
              Totals below include these so the TB doesn't lie. The most
              common cause is an account that was deleted after journal
              entries posted to it. Re-create the account with the same id
              or reverse the affected journals to clean up.
            </p>
          </div>
        </div>
      )}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line-strong)]">
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">Code</th>
                <th className="col-header text-left py-2 px-4 whitespace-nowrap">
                  Account Name
                </th>
                <th className="col-header text-left py-2 px-4 hidden md:table-cell whitespace-nowrap">
                  Type
                </th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Debit</th>
                <th className="col-header text-right py-2 px-4 whitespace-nowrap">Credit</th>
                <th className="col-header text-right py-2 px-4 hidden sm:table-cell whitespace-nowrap">
                  YTD Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {renderRows.map((row) => {
                const isCollapsed =
                  row.isParent && collapsedParents.has(row.account.code);
                return (
                <tr
                  key={row.account.id}
                  className={
                    row.isParent
                      ? 'bg-gray-50 font-semibold border-b border-[var(--line)]'
                      : 'data-row border-b border-[var(--line)]'
                  }
                  data-testid={
                    row.isParent
                      ? `tb-parent-${row.account.code}`
                      : `tb-row-${row.account.code}`
                  }
                >
                  <td className="py-3 px-4 data-value whitespace-nowrap">
                    {row.isParent ? (
                      <button
                        type="button"
                        onClick={() => toggleParentCollapse(row.account.code)}
                        aria-expanded={!isCollapsed}
                        aria-label={
                          isCollapsed
                            ? `Expand children of ${row.account.code}`
                            : `Collapse children of ${row.account.code}`
                        }
                        data-testid={`tb-collapse-${row.account.code}`}
                        className="inline-flex items-center gap-1 hover:bg-gray-100 rounded px-1 -mx-1"
                      >
                        {isCollapsed ? (
                          <ChevronRight size={14} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={14} className="text-gray-500" />
                        )}
                        <span>{row.account.code}</span>
                      </button>
                    ) : (
                      <span className="pl-5">{row.account.code}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span>{row.account.name}</span>
                    {row.isParent && <span> (subtotal)</span>}
                    {!row.isParent &&
                      referencedAccountIds.has(row.account.id) &&
                      isMissingTaxLabel(row.account) && (
                        <span className="ml-2 inline-block">
                          <AnomalyBadge
                            severity="warn"
                            message="No tax label mapping"
                            label={row.account.code}
                          />
                        </span>
                      )}
                  </td>
                  <td className="py-3 px-4 text-xs opacity-60 hidden md:table-cell whitespace-nowrap">
                    {row.account.type}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.debit > 0 ? formatAud(row.debit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap">
                    {row.credit > 0 ? formatAud(row.credit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value font-medium hidden sm:table-cell whitespace-nowrap">
                    {formatAud(row.balance)}
                  </td>
                </tr>
                );
              })}
              {tbData.orphanList.map((o) => (
                <tr
                  key={`orphan-${o.accountId}`}
                  className="bg-rose-50 border-b border-rose-100"
                  data-testid={`tb-orphan-${o.accountId}`}
                >
                  <td className="py-3 px-4 text-xs font-mono text-rose-700">?</td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap text-rose-900">
                    <span className="font-medium">Unknown account</span>
                    <span className="ml-2 text-[10px] opacity-70 font-mono">
                      ({o.accountId}; {o.lineCount} {o.lineCount === 1 ? 'line' : 'lines'})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs opacity-60 hidden md:table-cell whitespace-nowrap text-rose-700">
                    orphan
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap text-rose-900">
                    {o.debit > 0 ? formatAud(o.debit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value whitespace-nowrap text-rose-900">
                    {o.credit > 0 ? formatAud(o.credit) : '-'}
                  </td>
                  <td className="py-3 px-4 text-right data-value font-medium hidden sm:table-cell whitespace-nowrap text-rose-900">
                    {formatAud(o.debit - o.credit)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[var(--ink)] font-bold">
                <td colSpan={2} className="py-4 px-4 text-right pr-4">
                  Totals
                </td>
                <td className="hidden md:table-cell"></td>
                <td
                  className="py-4 px-4 text-right data-value whitespace-nowrap"
                  data-testid="tb-total-debits"
                >
                  {formatAud(totalDebits)}
                </td>
                <td
                  className="py-4 px-4 text-right data-value whitespace-nowrap"
                  data-testid="tb-total-credits"
                >
                  {formatAud(totalCredits)}
                </td>
                <td
                  className="py-4 px-4 text-right data-value hidden sm:table-cell whitespace-nowrap"
                  data-testid="tb-balance-flag"
                >
                  {isBalanced ? 'Balanced' : 'Out of Balance'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
};
