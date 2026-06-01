/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure pathname-dispatch helper — Phase 14 Plan 14-1 Task 1.
 *
 * Single source of truth for route classification, consumed by:
 *   1. src/storage/index.ts initAdapter() — picks DB_NAME_DEMO vs DB_NAME_PROD
 *      and conditionally calls seedDemoData() (Plan 14-1 Task 4)
 *   2. src/App.tsx — picks the initial view (Plan 14-2 Task 6)
 *
 * Centralising the dispatch in one tiny pure module avoids two-callsite
 * pathname-parsing drift. CONTEXT decision: "DIY pathname-based dispatch —
 * read window.location.pathname once on mount" + "extract to a tiny
 * src/lib/route.ts helper if there are >2 call sites" (planner picked the
 * helper because there are exactly 2 call sites).
 *
 * Behaviour:
 *   getRouteKind('/')          → 'default'
 *   getRouteKind('/demo')      → 'demo'
 *   getRouteKind('/demo/')     → 'demo'   (trailing slash tolerant)
 *   getRouteKind('/demo/sub')  → 'demo'   (prefix match — future-friendly)
 *   getRouteKind('/privacy')   → 'privacy'
 *   getRouteKind('/anything')  → 'default'
 *   getRouteKind()             → reads window.location.pathname
 *
 * The startsWith() shape (not strict equality) means query strings and
 * URL hashes are naturally tolerated — pathname excludes both.
 */

export type RouteKind = 'demo' | 'privacy' | 'default';

/**
 * Classify a pathname into one of three route kinds.
 *
 * @param pathname - Optional pathname. When omitted, reads
 *   `window.location.pathname` (or returns 'default' under non-browser envs).
 */
export function getRouteKind(pathname?: string): RouteKind {
  let p: string;
  if (pathname === undefined) {
    p = typeof window !== 'undefined' ? window.location.pathname : '/';
  } else {
    p = pathname;
  }
  // Normalise trailing slash for paths longer than '/'
  if (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1);
  }
  if (p.startsWith('/demo')) return 'demo';
  if (p.startsWith('/privacy')) return 'privacy';
  return 'default';
}
