---
phase: 11
slug: indexeddb-hardening
type: context
status: ready-for-planning
created: 2026-06-01
discussed_areas: [backup-nag-firing, ios-itp-banner, quota-disclosure, lastwriteat-and-persist-visibility]
---

# Phase 11: IndexedDB Hardening — Context

**Gathered:** 2026-06-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 hardens the existing v1.0 LocalAdapter (IndexedDB) so users who arrive cold at the public hosted SPA (`https://aussieledger.techtaitan.com`, shipped Phase 10) can trust it with tax data. All additions live INSIDE LocalAdapter via the established duck-typing pattern (`as unknown as { ... }` per the existing `getLastExportAt` accessor in DataPage); the Phase 3 StorageAdapter FINAL interface remains untouched. Adds one new hook `useBackupNag`, one new banner component for iOS ITP disclosure (DataPage-scoped), and quota-disclosure rendering on DataPage's storage card.

**In scope (5 requirements: IDB-01..05):**
- **IDB-01 — `navigator.storage.persist()` request** called INSIDE `LocalAdapter.init()` (not on page load; engagement-score already accumulated by init time for returning users). Result cached via `navigator.storage.persisted()`. Browsers without API support degrade silently. New `getPersistGranted()` accessor on LocalAdapter (duck-typed; not added to StorageAdapter interface). User-denied state (Firefox prompt → deny) is **never** re-prompted within the session or across sessions.
- **IDB-02 — Quota disclosure** on DataPage via `navigator.storage.estimate()`. Rendered as text-only one-liner ("~2.4 GB allocated · 47 MB used") inline on the existing Storage card alongside the "Storage: IndexedDB" label. Fallback when `estimate()` returns null/undefined (some Safari): hide the quota line entirely (silent fallback). Fetched once on DataPage mount via the existing `useEffect` lifecycle.
- **IDB-03 — Backup-nag toast** uses existing `<Toast tone='warn'>` primitive. Threshold: `today - lastExportAt > 7 days` (desktop UA) OR `> 5 days` (iOS Safari UA). **Fires once per page load on App mount only** (no per-write re-checks; no tab-refocus re-checks). Suppressed when adapter is empty (no entities AND no entries). Snooze ("Snooze 7 days" button) persists in `localStorage` under `aussieledger:backup-nag-snoozed-until` (ISO timestamp; defence-in-depth on the locked key from research). Snooze cleared whenever the user exports successfully. No escalation — same toast every time it surfaces.
- **IDB-04 — iOS ITP banner** appears ONLY in DataPage (not app-wide), ONLY when `isHostedMode() === true` (Phase 12/13/14 don't ship for self-host so the banner doesn't belong there either), AND when `navigator.userAgent` matches iOS Safari AND `window.matchMedia('(display-mode: standalone)').matches === false`. Per-session dismissible via `sessionStorage` key `aussieledger:ios-itp-banner-dismissed`. Copy is **friendly + concrete**: "Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe." With a short inline "How?" expand showing the Share-menu instructions.
- **IDB-05 — `beforeunload` + `visibilitychange` guard** fires the browser's native "Changes you made may not be saved" dialog when `lastWriteAt > lastExportAt`. Listener registered/unregistered **conditionally** (only while dirty) to preserve Firefox bfcache eligibility. `visibilitychange` complements `beforeunload` for iOS Safari where `beforeunload` is unreliable — flushes any pending state on `document.hidden = true`. **New `getLastWriteAt()` + `setLastWriteAt()` accessors** on LocalAdapter (duck-typed; meta store key `lastWriteAt` mirroring the existing `lastExportAt` pattern at `src/storage/local.ts:27`). `lastWriteAt` is bumped from every data-changing `put()` (entities, accounts, entries, auditLogs) — bulk imports bump it, schema migrations do NOT (the latter prevents every app-version upgrade from firing backup-nag).

**Out of scope (deferred):**
- **Visibility-change re-check of backup-nag threshold** — page-load-only is sufficient; users typically refresh between sessions. If usage patterns show extended single-page-load sessions, revisit in v1.3.
- **Live-updating quota** (polling on a setInterval) — single fetch on mount is sufficient for the use case; quota numbers don't materially change session-to-session.
- **Progress-bar visual for quota** — text-only is cleaner; almost always <1% full so the bar would be uniformly empty.
- **"Never show again" button on backup-nag** — risks user permanently silencing critical reminders; not in v1.2.
- **Banner escalation after N snoozes** — same nag every time; trust the user's informed choice.
- **App-wide ITP banner placement** — DataPage-only is contextually right (where backup actions live); reduces banner-blindness.
- **Permanent `localStorage` dismiss for ITP banner** — per-session dismiss balances honesty with respect for user attention.
- **ITP banner in self-host mode** — gated on `isHostedMode()` because the PWA-install advice doesn't fit `npm run dev`/local self-host.
- **Re-prompting `persist()` after user deny** — respect the user; surface the "Storage not protected" status and let backup-nag carry the safety message.
- **Migration writes bumping `lastWriteAt`** — only user-content writes bump it; migrations are app-version changes.
- **`AnomalyBadge` (info/warn severity) for the persist() outcome** — existing Toast/text inline label is sufficient; no new visual primitive needed.
- **Custom-text beforeunload dialog** — browsers ignore custom strings for security reasons; we control WHEN it fires, not WHAT it says.

</domain>

<decisions>
## Implementation Decisions

### Backup-nag firing rules + suppression (4 sub-decisions)

- **Fires once per page load only** — `useBackupNag` hook runs on App mount inside a `useEffect(() => { ... }, [])`. Checks `today - lastExportAt > threshold`; fires `<Toast tone='warn'>` once or stays silent. No per-write re-check (would couple hook to adapter mutation paths), no `visibilitychange` re-check (out of scope for v1.2). Cleanest implementation matching existing one-shot Toast pattern.
- **Suppress when adapter is empty** — call `adapter.getEntities()` + `adapter.getEntries()` inside the hook; if BOTH are empty, return early (no nag). `lastExportAt === null` on a fresh install would already prevent the nag, but defence-in-depth handles edge cases (e.g. user imported then deleted all entities).
- **Snooze in `localStorage` under `aussieledger:backup-nag-snoozed-until`** — ISO timestamp = `now + 7 days`. Threshold check returns false until that timestamp passes. Survives browser restart. **Cleared on every successful export** (DataPage's `handleExport` removes the key after `setLastExportAt(now)` succeeds) — ensures the snooze doesn't outlive its motivation. Matches the locked key from v1.2 research.
- **No escalation** — same toast tone (`warn`) and copy every time it surfaces. Respect the user's informed choice. Avoids the snooze-counter tracking machinery; avoids the slippery slope of UX paternalism.

### iOS ITP banner placement + copy (4 sub-decisions)

- **DataPage only** — contextual placement where backup actions live; doesn't intrude on Journals / Entities / Tax Return / ImportTB flows; doesn't add app-wide chrome. Matches the locked research note ("contextual banner appears in DataPage").
- **Friendly + concrete copy** — verbatim text: "Heads up: iOS Safari may clear AussieLedger's stored data after 7 days of no use. Add this app to your Home Screen to keep your data safe." Plain English. Names the actual risk + the actual mitigation. No technical jargon (ITP / IndexedDB / PWA). With an inline `<details>` "How?" expand showing the iOS Share-menu Add-to-Home-Screen steps (no external link).
- **Per-session dismissible** — `sessionStorage` key `aussieledger:ios-itp-banner-dismissed = 'true'`. User dismisses → banner stays gone for current browser session. Re-fires next session. Catches forgetful users without permanent silencing. Auto-hides permanently once `display-mode: standalone` is detected (i.e. they've successfully installed) regardless of dismissal state.
- **Hosted mode only** — gated on `isHostedMode() === true`. Self-host users either run on localhost (ITP semantics differ) or on their own VPS (different concern entirely); the PWA install advice doesn't fit `npm run dev`. Keeps the banner relevant.

### Quota disclosure visual + edge cases (4 sub-decisions)

- **Text-only one-liner** — format "~{X} GB allocated · {Y} MB used" with units chosen by magnitude (`< 1024 MB` → MB; else GB to 1 decimal). Matches the calm aesthetic; no progress-bar chrome for a number that's almost always <1% full.
- **Inline on the existing Storage card** — appended to the existing "Storage: IndexedDB" line in DataPage's header card so it reads like "Storage: IndexedDB · ~2.4 GB allocated · 47 MB used · Last exported 3 days ago". Single scannable storage-facts row.
- **Silent fallback when estimate() returns null/undefined** — some Safari versions return null. Just don't render the "~X GB / Y MB" portion. The rest of the storage line ("Storage: IndexedDB · Last exported ...") still renders unchanged. Zero confusion; honest about what the browser can/can't measure.
- **Fetched once on DataPage mount** — added to the existing `useEffect(() => { ... }, [])` that already fetches `getLastExportAt`. No live polling. No refresh-on-export wiring (the change in quota after one export is negligible).

### `lastWriteAt` semantics + `persist()` visibility (4 sub-decisions)

- **`lastWriteAt` bumped on every data-changing put** — wrap every `this.db.put('entities'|'accounts'|'entries'|'auditLogs', ...)` and the bulk transaction path (`setAll` / `txAll`) to also `await this.db.put('meta', new Date().toISOString(), 'lastWriteAt')`. Meta writes themselves are NOT wrapped (would recurse infinitely). The existing `setLastExportAt` does NOT bump `lastWriteAt` (exporting clears the dirty state; it doesn't create new dirtiness).
- **Bulk imports bump `lastWriteAt`; schema migrations do NOT** — imports represent user-affecting content changes → SHOULD trigger backup-nag + beforeunload guard if user navigates away before re-exporting. Migrations are app-version upgrades — bumping on every migration would fire backup-nag on every Phase X release. The distinction lives in the call site (`importJSON` bumps; `migrations/runner.ts` skips bumping).
- **`persist()` outcome visible on DataPage** — new `getPersistGranted()` accessor on LocalAdapter (duck-typed) returns the cached `true`/`false`/`null`. DataPage renders one of: "Storage protected ✓" (true), "Storage not protected — back up regularly" (false), or hides the line entirely (null — API not supported). Tied visually to the Storage card line. On iOS Safari false + isHostedMode, this status backstops the ITP banner messaging.
- **Never re-prompt after user deny** — standard UX rule. Firefox shows the prompt once; if user denies, the cached `false` persists for the session and across sessions. We surface the status; we don't pester. User can re-grant via browser site settings if they change their mind.

### Claude's Discretion

- **Exact iOS Safari UA-string detection regex** — planner picks; common pattern is `/iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)`. Reject Chrome/Firefox/Edge variants on iOS (they're all Safari engine but ITP behaves differently).
- **Exact threshold day-math** — use `Date.now() - lastExportAtMs > THRESHOLD_MS` with `THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000` (desktop) / `5 * 24 * ...` (iOS); planner can extract to a constants module if cleaner.
- **`useBackupNag` hook signature** — likely `useBackupNag(): void` (self-contained; mounts Toast via existing useToast/setToast mechanism). Planner adjusts based on the existing Toast plumbing.
- **Backup-nag toast button labels** — "Export now" (navigates to /data) + "Snooze 7 days" (writes the localStorage key + dismisses). Planner can word-smith if the existing Toast button API constrains labels.
- **iOS ITP banner visual** — plain `<div class="rounded-md bg-amber-50 border border-amber-200 p-3 ...">` is fine; not a new design-system primitive. Planner picks the exact Tailwind classes matching the project's existing banner shape (e.g. compare to `AiGateNote` or `MigrationError`).
- **`getPersistGranted()` return type** — `Promise<boolean | null>` (null = API unsupported). Cached in a private LocalAdapter field; `init()` populates it once.
- **`navigator.storage.estimate()` return-type handling** — TypeScript types are `Promise<StorageEstimate>` where `quota`/`usage` are `number | undefined`. Planner handles undefined gracefully (hide the line).
- **Whether `lastWriteAt` bump is added inline at each `put()` call or via a private `bumpWriteAt()` helper** — planner picks; helper is cleaner if there are >3 call sites.
- **Whether `<details>` "How?" expand for ITP banner is inline JSX or a separate sub-component** — planner picks based on length; if more than ~10 lines, extract.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 11 scope + prior decisions
- `.planning/PROJECT.md` — v1.2 milestone goal; non-goals (no telemetry, no third-party scripts)
- `.planning/REQUIREMENTS.md` §IndexedDB Hardening — IDB-01..05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 11 entry with goal + 5 success criteria
- `.planning/STATE.md` — architecture invariants table (StorageAdapter FINAL preserved via duck-typing; no `new Date()` outside `src/lib/period.ts` — note: `new Date().toISOString()` for timestamps IS allowed inside `src/lib/period.ts` or as the explicit Storage-time helper; planner should route through `period.ts` if a helper already exists, else add one)
- `.planning/research/STACK.md` — `vite-plugin-pwa` (Phase 13, not Phase 11); `navigator.storage` is platform-native (no dependency)
- `.planning/research/ARCHITECTURE.md` — `useBackupNag` hook pattern; `persist()` in `LocalAdapter.init()`; duck-typing for new adapter methods
- `.planning/research/PITFALLS.md` §2 — iOS Safari ITP 7-day wipe HARD-BLOCK; §3 — beforeunload + Firefox bfcache exclusion (register listener conditionally on `hasUnsavedChanges`, not always-registered)
- `.planning/research/SUMMARY.md` — phase-order rationale; Phase 11 depends on Phase 10 (HTTPS environment for reliable `persist()` testing)
- `.planning/phases/10-public-build-ci-cd-to-cloudflare-pages/10-CONTEXT.md` — pivot history; `isHostedMode()` is now Vercel-mode-aware (env var set in Vercel project settings)

### Existing code Phase 11 must consume / extend
- `src/storage/local.ts` — LocalAdapter class at line 37; `init()` at line 49; `META_LAST_EXPORT = 'lastExportAt'` at line 27; `getLastExportAt()`/`setLastExportAt()` at lines 151/155; bulk-write path via `this.db.transaction(...)` at lines 107, 128. Phase 11 ADDS (does NOT modify the existing public surface): `getPersistGranted()`, `getStorageEstimate()`, `getLastWriteAt()`, `setLastWriteAt()`, and bump-on-write internal wrapping.
- `src/components/DataPage.tsx` — at line ~80, the `useEffect` that fetches `getLastExportAt` via duck-typing — Phase 11 EXTENDS to also fetch `getPersistGranted()` + `navigator.storage.estimate()`; same duck-typing pattern. Renders the new info inline on the Storage card.
- `src/components/Toast.tsx` — existing primitive with `tone: 'info' | 'warn'` at line 15 and `bg-amber-600` styling for warn. `useBackupNag` mounts a warn-tone Toast via this primitive (no new component).
- `src/lib/env.ts` — `isHostedMode()` (Phase 10-1; commit `7f5e3e0`); consumed by the iOS ITP banner mount-gate.
- `src/App.tsx` — App-level mount point for `useBackupNag` hook (around line 60 where existing `useEffect` plumbing lives).
- `src/hooks/` — existing pattern (`useAccounts`, `useAnomalyCounts`, `useAuditLog`, `useEntities`, `useJournals`); `useBackupNag.ts` slots in here.
- `src/lib/period.ts` — single source of `new Date()` per Phase 2 structural lint; `lastWriteAt` ISO string generation should route through here (planner adds a `nowIso()` helper if missing).

### New code Phase 11 creates
- `src/hooks/useBackupNag.ts` (new) — orchestrates threshold check + suppression + snooze read + toast surface
- `src/hooks/__tests__/useBackupNag.test.ts` (new) — unit tests for threshold/UA branching/snooze/empty-state
- `src/components/IosItpBanner.tsx` (new) — DataPage-mounted banner with friendly copy + `<details>` "How?" expand
- `src/components/__tests__/IosItpBanner.test.tsx` (new) — render tests for UA gating + standalone-detect + dismiss
- `src/storage/__tests__/local-hardening.test.ts` (new) — unit tests for `getPersistGranted` cache, `lastWriteAt` bump-on-write coverage, persist deny-respect
- DataPage integration tests (extend `src/components/__tests__/DataPage.test.tsx` if it exists; create if not) covering quota render + ITP banner mount + persist-status line

### External documentation
- MDN: `navigator.storage.persist()` / `persisted()` / `estimate()`
- WebKit blog: ITP 7-day wipe semantics (referenced in PITFALLS.md §2)
- whatwg HTML: `beforeunload` + `visibilitychange` event semantics; Firefox bfcache documentation
- React docs: `useEffect` cleanup for conditional listener registration

### Repo facts
- **Live deploy:** `https://aussieledger.techtaitan.com` (Vercel, custom domain)
- **Vercel env var `VITE_HOSTED_MODE=true`** controls `isHostedMode()` → true; user has set this in Vercel project settings
- **Phase 10 shipped:** vercel.json, scan-aiza.mjs, isHostedMode helper, AIza fixture, custom domain. HOST-01..04 all Complete.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/storage/local.ts` LocalAdapter (Phase 3) — extends with duck-typed accessors; bulk transaction at line 107+128 is the pattern to mirror for any new write paths.
- `src/components/Toast.tsx` (Phase 4 polish) — `tone='warn'` (amber-600 background) is the locked tone for backup-nag. No new tone needed.
- `src/components/DataPage.tsx` (Phase 3) — already uses duck-typing for `getLastExportAt`; Phase 11 extends the same `useEffect` to fetch persist-status + storage estimate; renders inline on the Storage card.
- `src/lib/env.ts` (Phase 10-1) — `isHostedMode()` is the gate for the iOS ITP banner.
- `src/hooks/use*.ts` — established hook pattern; `useBackupNag.ts` slots in cleanly.
- `src/lib/period.ts` — central `new Date()` arbiter; ISO timestamp generation goes through here per Phase 2 invariant.

### Established Patterns
- **Duck-typing for non-interface adapter methods** (Phase 3 FINAL invariant) — DataPage at line 83-86 demonstrates: `const maybe = adapter as unknown as { getLastExportAt?: () => Promise<string | null> }; if (typeof maybe.getLastExportAt === 'function') { ... }`. Apply identically for `getPersistGranted`, `getStorageEstimate`, `getLastWriteAt`.
- **Meta-store ISO timestamps** (Phase 3) — `META_LAST_EXPORT = 'lastExportAt'` constant + `db.get('meta', KEY)` + `db.put('meta', iso, KEY)`. `lastWriteAt` mirrors this verbatim.
- **One-shot `useEffect` for adapter probes** (DataPage) — `useEffect(() => { ... }, [])` + internal `cancelled` flag for unmount safety. Reuse shape for `useBackupNag`.
- **Apache 2.0 SPDX header** on every new source file (Phase 1 invariant) — `src/hooks/useBackupNag.ts`, `src/components/IosItpBanner.tsx`, both test files.
- **No `new Date()` outside `src/lib/period.ts`** (Phase 2 structural lint) — `lastWriteAt` timestamp generation routes through period.ts (or adds a `nowIso()` helper there).

### Integration Points
- `App.tsx` mounts `useBackupNag()` once at app root inside the existing `useEffect` plumbing region (line ~60).
- `DataPage.tsx` mounts `<IosItpBanner />` inline; renders new quota + persist-status info on the Storage card.
- `LocalAdapter.init()` (line 49) gains `await this.tryPersist()` and `await this.fetchEstimateCache()` (or equivalent); `getPersistGranted()` returns the cached value.
- Every `LocalAdapter.this.db.put('{entities|accounts|entries|auditLogs}', ...)` call gains a `await this.bumpWriteAt()` follow-up (or a private write-wrapper); meta writes themselves do not.
- `src/storage/index.ts` `importJSON` (if exists) bumps `lastWriteAt` post-import; `src/lib/migrations/runner.ts` does NOT.

</code_context>

<specifics>
## Specific Ideas

- **iOS Safari UA detection** — use `/iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)`. Reject Chrome iOS, Firefox iOS, Edge iOS variants (all wrap WebKit but ITP semantics differ enough that the PWA-install advice still applies but the banner triggers same).
- **Threshold constants** — `BACKUP_NAG_DAYS_DESKTOP = 7`, `BACKUP_NAG_DAYS_IOS = 5` exported from `src/hooks/useBackupNag.ts` (or `src/lib/constants.ts` if that's the existing pattern). Test fixtures use a smaller constant via vi.mock to avoid `vi.useFakeTimers` overhead in most tests.
- **Snooze key** — `aussieledger:backup-nag-snoozed-until` (locked from research); value is ISO timestamp string. Cleared by DataPage's `handleExport` on successful export.
- **ITP banner dismiss key** — `aussieledger:ios-itp-banner-dismissed` in `sessionStorage` (per-session); cleared by browser on session end.
- **`getPersistGranted()` caching** — `LocalAdapter.init()` calls `navigator.storage.persist().then(g => this._persistGranted = g)` and caches; subsequent `getPersistGranted()` returns cached value synchronously-via-Promise (no re-prompt). On API-unsupported browsers, `this._persistGranted = null`.
- **`bumpWriteAt()` internal helper** — `private async bumpWriteAt(): Promise<void> { await this.db.put('meta', new Date().toISOString(), 'lastWriteAt'); }` — but `new Date()` needs to route through `src/lib/period.ts` `nowIso()` helper if it exists, else planner adds one. Called from every data-changing `put()` and the bulk transaction.
- **`beforeunload` conditional registration** — `useEffect(() => { if (isDirty) { window.addEventListener('beforeunload', handler); return () => window.removeEventListener(...); } return undefined; }, [isDirty])`. The `isDirty` state polls `lastWriteAt > lastExportAt` on a slow cadence (every adapter mutation) or once on mount; planner picks based on existing reactivity wiring.
- **`visibilitychange` complement** — `document.addEventListener('visibilitychange', () => { if (document.hidden && isDirty) { /* flush state */ } })` — registered alongside beforeunload, also conditionally. Does NOT show a dialog (no API for that); just ensures any pending writes complete before iOS Safari kills the page.

</specifics>

<deferred>
## Deferred Ideas

- **Visibilitychange-triggered backup-nag re-check** — page-load-only is sufficient for v1.2. Revisit if usage patterns show long single-page sessions.
- **Live-polling quota** — fetch-on-mount is sufficient; quota changes are negligible session-to-session.
- **Progress-bar visual for quota** — text-only is calmer; quota almost always <1% full.
- **"Never show again" backup-nag button** — risks user permanently silencing a critical safety reminder.
- **Backup-nag escalation after N snoozes** — same nag every time; trust the user.
- **App-wide ITP banner placement** — DataPage-only is contextually correct; reduces banner-blindness.
- **Permanent `localStorage` dismiss for ITP banner** — per-session dismiss strikes the right balance.
- **ITP banner in self-host mode** — gated on `isHostedMode()` since PWA install advice doesn't fit local self-host.
- **Re-prompting `persist()` after user deny** — respect the deny; `persist-not-granted` status + ongoing backup-nag carry the safety message.
- **Migration writes bumping `lastWriteAt`** — migrations are app-version upgrades, not user content changes.
- **AnomalyBadge for `persist()` outcome** — existing Toast/text inline label is sufficient; no new visual primitive.
- **Custom-text beforeunload dialog** — browsers ignore custom strings for security; we control WHEN, not WHAT.
- **Anonymous opt-in telemetry of persist-grant rates / iOS ITP-banner-conversion** — explicit non-goal per v1.2 milestone (zero telemetry); revisit only if v2.x adds a telemetry framework.

</deferred>

---

*Phase: 11-indexeddb-hardening*
*Context gathered: 2026-06-01*
