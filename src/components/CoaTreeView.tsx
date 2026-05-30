/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CoaTreeView — parent/child tree renderer for Chart-of-Accounts (BOOK-07).
 *
 * Uses Account.parentCode to build a depth-indented list. Default ordering is by
 * account code within each tree level. Archived accounts hidden by default;
 * surface via `showArchived` prop (toggled by AccountManager).
 */
import React, { useMemo, useRef, useEffect } from 'react';
import type { Account } from '../types';
import { cn } from '../lib/utils';
import { AnomalyBadge } from './AnomalyBadge';

interface CoaTreeViewProps {
  accounts: Account[];
  onSelect?: (id: string) => void;
  selectedId?: string;
  showArchived?: boolean;
  /** Phase 9 UX-06: when true, filter list to accounts missing gstCode or taxLabel */
  filterMissingMappings?: boolean;
  /** Phase 9 UX-06: incrementing index into the anomaly list to scroll to + flash */
  scrollToAccountIdx?: number;
  /** Phase 9 UX-06: callback when user dismisses the anomaly filter banner */
  onClearAnomalyFilter?: () => void;
}

interface TreeNode {
  account: Account;
  depth: number;
  children: TreeNode[];
}

function buildTree(accounts: Account[]): TreeNode[] {
  const byCode: Record<string, TreeNode> = {};
  for (const a of accounts) {
    byCode[a.code] = { account: a, depth: 0, children: [] };
  }
  const roots: TreeNode[] = [];
  for (const a of accounts) {
    const node = byCode[a.code];
    if (a.parentCode && byCode[a.parentCode]) {
      byCode[a.parentCode].children.push(node);
    } else {
      roots.push(node);
    }
  }
  const walk = (n: TreeNode, depth: number) => {
    n.depth = depth;
    for (const c of n.children) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  // Stable per-level ordering by account code.
  roots.sort((a, b) => a.account.code.localeCompare(b.account.code));
  const sortKids = (n: TreeNode) => {
    n.children.sort((a, b) => a.account.code.localeCompare(b.account.code));
    for (const c of n.children) sortKids(c);
  };
  for (const r of roots) sortKids(r);
  return roots;
}

function flatten(roots: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (n: TreeNode) => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}

export const CoaTreeView: React.FC<CoaTreeViewProps> = ({
  accounts,
  onSelect,
  selectedId,
  showArchived = false,
  filterMissingMappings = false,
  scrollToAccountIdx,
  onClearAnomalyFilter,
}) => {
  const flat = useMemo(() => {
    const visible = accounts.filter((a) => showArchived || !a.isArchived);
    const all = flatten(buildTree(visible));
    if (!filterMissingMappings) return all;
    return all.filter((n) => !n.account.gstCode || !n.account.taxLabel);
  }, [accounts, showArchived, filterMissingMappings]);

  const rowRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  useEffect(() => {
    if (scrollToAccountIdx === undefined) return;
    const target = flat[scrollToAccountIdx];
    if (!target) return;
    const el = rowRefs.current.get(target.account.id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Re-trigger flash via void-reflow trick (prevents animation skip on repeat clicks)
    el.classList.remove('anomaly-flash');
    void el.offsetWidth;  // synchronous reflow — restarts CSS animation
    el.classList.add('anomaly-flash');
    const t = setTimeout(() => el.classList.remove('anomaly-flash'), 300);
    return () => clearTimeout(t);
  }, [scrollToAccountIdx, flat]);

  return (
    <div>
      {filterMissingMappings && (
        <div
          className="flex items-center gap-2 text-xs bg-yellow-50 border border-yellow-200 px-3 py-1.5 mb-2"
          data-testid="anomaly-filter-banner"
        >
          <span>Filtered to anomalies</span>
          <button
            onClick={onClearAnomalyFilter}
            className="underline text-yellow-800 hover:text-yellow-900"
            data-testid="anomaly-filter-clear"
          >
            Clear filter
          </button>
        </div>
      )}
    <ul className="text-sm" data-testid="coa-tree">
      {flat.map((n) => {
        const a = n.account;
        const hasChildren = n.children.length > 0;
        return (
          <li
            key={a.id}
            ref={(el) => {
              if (el) rowRefs.current.set(a.id, el);
              else rowRefs.current.delete(a.id);
            }}
            className={cn(
              'flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-50 cursor-pointer border-b border-[var(--line)]',
              selectedId === a.id && 'bg-blue-50 font-medium',
              a.isArchived && 'opacity-50 line-through',
            )}
            style={{ paddingLeft: `${0.5 + n.depth * 1.5}rem` }}
            onClick={() => onSelect?.(a.id)}
            data-testid={`coa-row-${a.code}`}
            data-depth={n.depth}
          >
            <span className="font-mono text-xs w-12">{a.code}</span>
            <span className={cn(hasChildren && 'font-semibold')}>{a.name}</span>
            <span className="text-xs opacity-60">({a.type})</span>
            {(!a.gstCode || !a.taxLabel) && (
              <span className="ml-1">
                <AnomalyBadge
                  severity="warn"
                  message={!a.gstCode ? 'Missing GST code' : 'Missing tax label'}
                  label={a.code}
                />
              </span>
            )}
            {a.isDefault && (
              <span
                className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded uppercase tracking-wider"
                data-testid={`default-badge-${a.code}`}
              >
                default
              </span>
            )}
            {a.isArchived && (
              <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                archived
              </span>
            )}
          </li>
        );
      })}
    </ul>
    </div>
  );
};
