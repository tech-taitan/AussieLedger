# Architecture: v1.2 Integration Points

**Project:** AussieLedger v1.2 — Public Hosting + IndexedDB Hardening + PWA
**Researched:** 2026-05-30
**Milestone context:** Additive layer on top of shipped v1.0/v1.1 Vite SPA

---

## Overview

v1.2 is a surface-area extension of an already-solid foundation. The StorageAdapter FINAL invariant is not violated by any item in this milestone. The Express server continues in parallel. Every integration point is additive — no existing interfaces are broken.

The twelve questions below are answered in the order asked, each with a specific file path recommendation and rationale.

---

## 1. Public Build Configuration

### Current state

`vite.config.ts` injects `process.env.GEMINI_API_KEY` into the build bundle via the `define` block. The current define block is:

```ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
},
```

This reads from the `loadEnv` call which scans `.env`, `.env.local`, `.env.production`, etc.

### Security clarification: the CVE surface

The v2.0 Tauri research flagged `TAURI_*` as a problematic prefix because Tauri reads env vars at build time and silently passes all variables with that prefix into the binary. That is a Tauri-specific issue.

For Vite, the `VITE_` prefix is the conventional public-facing prefix — variables with that prefix are automatically exposed in the browser bundle. The current config does NOT use `VITE_GEMINI_API_KEY`; it uses the raw `GEMINI_API_KEY` read by `loadEnv` and manually injected into `process.env.GEMINI_API_KEY` via the `define` block. This is intentional: if the key is absent (empty or missing), the injected string is `""` and `buildTimeKeyConfigured()` in `src/lib/ai.ts` returns false.

For the public hosted build, there is no `GEMINI_API_KEY` set at build time on the CI runner. The define block produces `process.env.GEMINI_API_KEY = ""`. `buildTimeKeyConfigured()` returns false. `isAiEnabled()` returns false. The `AiGateNote` renders. This is already correct — no change needed to prevent key leakage.

**The new env var needed is `VITE_HOSTED_MODE`:**

```ts
// vite.config.ts — additive change
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'import.meta.env.VITE_HOSTED_MODE': JSON.stringify(env.VITE_HOSTED_MODE ?? ''),
},
```

Set `VITE_HOSTED_MODE=true` in the CI deploy environment (GitHub Actions secret or Pages env var). Consumers:

- `AiGateNote.tsx` — when `VITE_HOSTED_MODE === 'true'`, render the inline key-paste UI instead of the `.env.local` instruction
- `src/storage/index.ts` — when `VITE_HOSTED_MODE === 'true'`, skip the `/api/health` probe entirely (saves ~3s startup time on the public URL where there is never a server)

Note: `VITE_` prefix is safe here because `VITE_HOSTED_MODE` is a mode signal, not a secret.

### Why not `VITE_GEMINI_API_KEY`?

Do not rename or add `VITE_GEMINI_API_KEY`. The existing mechanism (`process.env.GEMINI_API_KEY` via `define`) correctly handles the local-dev-with-key use case. Adding a second variable of the same semantic would create two code paths for the same thing. The user-supplied key (v1.2) flows through `localStorage`, not through the build at all.

---

## 2. GitHub Actions Deploy Pipeline

### Current CI shape

`.github/workflows/ci.yml` runs on push to `main` and on PRs targeting `main`. Steps: checkout → Node 20 → `npm ci` → `npm run build` → `npm run lint` → `vitest run --coverage`.

The existing CI job already runs `npm run build` which produces `dist/`. The missing pieces are: (a) deploy trigger, (b) deploy target upload step.

### Recommendation: separate deploy workflow, tag-triggered

Add `.github/workflows/deploy.yml` as a separate file. Do not extend the existing CI workflow. Reasons:

1. Separation of concerns: CI validates every push; deploy is an explicit release action.
2. Failed deploy should not invalidate a green CI run (different concerns).
3. Tag-based releases give a stable release history and let the README link to versioned artifacts.

Recommended trigger pattern:

```yaml
# .github/workflows/deploy.yml
on:
  push:
    tags: ['v*.*.*']
  workflow_dispatch: {}   # manual trigger for hotfixes
```

The deploy job should depend on CI passing via a `needs:` reference to a reusable job, or by requiring the CI workflow status as a branch protection rule. A simple approach that avoids tight coupling: use `workflow_run` with `workflows: ["CI"]` + `types: [completed]` + a condition `if: github.event.workflow_run.conclusion == 'success'`, triggered only on the tag.

Simpler alternative if that is too complex: require CI to pass as a branch protection rule on `main`, then deploy on push to `main` after CI passes. This means every commit to `main` deploys. This is acceptable for a public tool with no critical downtime risk, but tag-based is preferred.

### Recommended deploy target

Cloudflare Pages is recommended over GitHub Pages. Reasons:
- GitHub Pages on a free plan serves from `username.github.io/repo-name/` by default; a custom subdomain requires a `CNAME` and works, but base URL handling in Vite requires a `base` config set to the repo name.
- Cloudflare Pages deploys directly to a `projectname.pages.dev` subdomain with a root-relative base URL by default; custom domain (`aussieledger.app`) plugs in with no Vite config change.
- Cloudflare Pages has better global CDN distribution for Australian users (Sydney PoP).

For GitHub Pages, `vite.config.ts` would need `base: '/AussieLedger/'` (or the repo name) set when building for that target. For Cloudflare Pages the base stays at `'/'`.

The deploy workflow step (Cloudflare Pages example):

```yaml
- name: Deploy to Cloudflare Pages
  uses: cloudflare/pages-action@v1
  with:
    apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
    projectName: aussieledger
    directory: dist
    gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

The `dist/` directory is already produced by the `npm run build` step in CI. The deploy job reuses that artifact via `actions/upload-artifact` / `actions/download-artifact` or simply re-runs the build step in the deploy job.

---

## 3. `navigator.storage.persist()` Integration with `LocalAdapter`

### Where it goes

**`LocalAdapter.init()` in `src/storage/local.ts`** — specifically at the end of the `init()` method, after `openDB()` completes and the legacy migration finishes.

Reasoning: `init()` is the canonical "this adapter is starting up for the first time" moment. It already runs the legacy migration under a Web Lock. Requesting persistent storage here is the same semantics: "I am now the owner of this IDB database; ask the browser to protect it."

### Why not `App.tsx` or first-write?

- `App.tsx` is component-layer; it should not know about storage internals. The StorageAdapter FINAL invariant requires that hooks and components never know which backend is active. The persist request belongs inside the adapter.
- First-write is too late: a user who opens the app, sees their data loaded, and never writes would not get the persist grant. The risk is the data they *already have* is not protected.
- The "at first user interaction" model (requestPermission-style) is not required here; `navigator.storage.persist()` does not require a user gesture in modern browsers. It resolves to a boolean (granted/denied) based on browser heuristics, not a permission dialog.

### Implementation

```ts
// src/storage/local.ts — inside init(), after the legacy migration block
private async init(): Promise<void> {
  this.db = await openDB<AussieLedgerDB>(...);
  this.db.onversionchange = () => this.db.close();

  // Legacy migration (existing)
  await this.runLegacyMigration();

  // Request persistent storage — silently succeeds or fails;
  // the boolean result is available for the quota-check UI.
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    this.persistGranted = await navigator.storage.persist().catch(() => false);
  }
}

private persistGranted: boolean | null = null;

/** True if the browser granted persistent-storage; null if not queried yet; false if denied. */
getPersistGranted(): boolean | null {
  return this.persistGranted;
}
```

`getPersistGranted()` is NOT added to the `StorageAdapter` interface (that is FINAL). It is accessed via the same duck-typed pattern DataPage already uses for `getLastExportAt`:

```ts
const maybe = adapter as unknown as { getPersistGranted?: () => boolean | null };
const persistGranted = maybe.getPersistGranted?.() ?? null;
```

This preserves the FINAL invariant: the interface is untouched; the LocalAdapter-specific method is discoverable but not contractual.

---

## 4. `navigator.storage.estimate()` Quota Disclosure

### Recommended location: DataPage (`src/components/DataPage.tsx`)

DataPage (`src/components/DataPage.tsx`) is already the canonical "storage status" UI. It already shows:
- Adapter type (Local / Server)
- Last export timestamp (from `getLastExportAt()`)
- Schema version

Add a third status line here:

```
Storage Budget   Persistent: Yes · 47 MB used of ~2.4 GB estimated
```

Or if the persist request was denied:

```
Storage Budget   Not persistent — data may be cleared if disk space runs low. Back up regularly.
```

DataPage already fetches the adapter asynchronously in a `useEffect`. Add `navigator.storage.estimate()` to that same effect:

```ts
useEffect(() => {
  let cancelled = false;
  (async () => {
    const adapter = await getAdapter();
    // ... existing getLastExportAt logic ...
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate().catch(() => null);
      if (!cancelled && est) setStorageEstimate(est);
    }
  })();
  return () => { cancelled = true; };
}, []);
```

### Why not Settings page?

Settings (Phase 6) stores persona mode and primary entity — user preferences. Storage quota is a technical status, not a preference. DataPage is the right conceptual home. A secondary mention in a Settings "About / Storage" section is fine but not the primary location.

### Why not sidebar status line?

A sidebar status line would add noise to every page. The quota disclosure is a one-time awareness item best surfaced in the dedicated data-management page.

---

## 5. Backup-Nag UX Integration

### Architecture

A new hook: `src/hooks/useBackupNag.ts`

Keep this logic out of `App.tsx`. A dedicated hook is testable in isolation and does not add conditionals to the already-complex App component.

```ts
// src/hooks/useBackupNag.ts
export function useBackupNag(adapter: StorageAdapter | null): {
  nagMessage: string | null;
  snooze: () => void;
} {
  // Returns a nag message if lastExportAt is > NAG_THRESHOLD_DAYS ago
  // or if lastExportAt is null (never exported).
  // Snooze stores an ISO timestamp in localStorage under
  // 'aussieledger:backup-nag-snoozed-until'.
}
```

### Deriving "last export date"

`LocalAdapter` already stores `lastExportAt` in the IDB `meta` store (set by DataPage when a JSON export is triggered). The hook reads this via the duck-typed `getLastExportAt()` call. No new storage is needed.

### When it fires

Fire on **app load** — specifically in the hook's initial `useEffect` after the adapter resolves. This is the moment the user opens the app and is ready to receive information. Other options and why they are rejected:

- **Every Nth journal post:** Too intrusive. Post is a frequent action; nagging there would be annoying.
- **On tab close (`beforeunload`):** `beforeunload` is already reserved for the pre-unload guard (question 6). Two separate `beforeunload` handlers is messy. Also `beforeunload` handlers are unreliable on mobile.
- **On every load:** Correct. If the user snoozed, the snooze timestamp check suppresses it.

### Snooze mechanism

Store the snooze expiry in `localStorage` under `aussieledger:backup-nag-snoozed-until` (ISO timestamp). Reading this on load: if `now < snoozedUntil`, suppress the nag. This is a UI preference (not business data), so `localStorage` is the right home per the Phase 6 pattern (`aussieledger:settings` lives in `localStorage`).

Snooze duration: 7 days. The nag threshold (when to start nagging): 7 days since last export, or never exported.

### Toast integration

Use the existing `Toast.tsx` primitive with `tone='warn'`. The nag message fires as a `warn`-tone Toast. Because `Toast.tsx` has an `onDismiss` callback, the snooze button can be implemented as a second action or simply as clicking the toast (which already calls `onDismiss`).

The Toast component has a comment: "Do NOT widen to other use cases in v1.1." That was the v1.1 constraint. v1.2 is the next milestone; the backup nag is an appropriate widening. A `actions?: ReactNode` prop addition to Toast keeps it from becoming a sprawling notification system while supporting a "Snooze 7 days" link inside the toast.

### Integration in App.tsx

```tsx
// App.tsx — additive
const { nagMessage, snooze } = useBackupNag(adapter);

// Render alongside the existing toast state:
{nagMessage && (
  <Toast
    message={nagMessage}
    tone="warn"
    duration={10000}
    onDismiss={snooze}
  />
)}
```

---

## 6. Pre-Unload Guard

### Placement

`App.tsx` in a `useEffect` — the natural home for global browser event listeners in a React SPA.

### Condition

The guard should fire ONLY when `lastWriteTimestamp > lastExportTimestamp`. Not on every page close. This avoids false-positive interruptions for users who are just browsing.

```ts
// App.tsx — additive useEffect
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    const lastWrite = lastWriteRef.current;  // ISO from adapter meta
    const lastExport = lastExportRef.current; // ISO from adapter meta

    if (!lastWrite) return; // no data ever written
    if (lastExport && lastWrite <= lastExport) return; // already exported after last write

    // There are unsaved writes since the last export
    e.preventDefault();
    e.returnValue = ''; // required for Chrome
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, []); // deps: refs don't need to be in deps array
```

### Tracking `lastWriteTimestamp`

`LocalAdapter` currently stores `lastExportAt` in the `meta` IDB store. A parallel `lastWriteAt` should be added to the same `meta` store and updated on every `saveEntities`, `saveAccounts`, `saveEntries`, and `saveAuditLogs` call. This is an additive change to `LocalAdapter` only — no interface change.

The `App.tsx` handler reads both timestamps via refs that are populated by a `useEffect` polling `getAdapter()`. Using refs avoids the handler recreating on every timestamp change.

### Risk: modal / dialog state

The condition `lastWriteTimestamp > lastExportTimestamp` is the correct scope. The risk of "any unsaved modal triggers it" is avoided because the condition is specifically about data write vs data export — not about UI state. A user who has an open form but has not submitted it has not yet called `saveEntities`/etc., so `lastWriteTimestamp` has not advanced.

---

## 7. User-Supplied Gemini Key UI

### Integration point: Settings page, not ImportTB inline

The key-paste UI belongs in **Settings** (`src/components/Settings.tsx` or the Settings view), not inline in `ImportTB.tsx`/`AiGateNote.tsx`. Reasons:

1. A key is a global credential that affects all AI features in the app. Pasting it in a specific import screen suggests it applies only to that screen.
2. The Settings page is already the home for instance-level configuration (persona mode, primary entity). An AI section in Settings is the natural home.
3. `AiGateNote.tsx` should remain a passive affordance component — it tells the user AI is disabled and points them to Settings to configure it. This is better than embedding a credential form in the gating note itself.

### What changes in `AiGateNote.tsx`

When `VITE_HOSTED_MODE === 'true'`, the note changes its wording:

```tsx
// AiGateNote.tsx — additive branch
if (import.meta.env.VITE_HOSTED_MODE === 'true') {
  return (
    <p className="text-xs text-gray-500 italic mt-1" data-testid="ai-gate-note">
      AI suggestions disabled —{' '}
      <button onClick={onOpenSettings} className="underline">
        add your Gemini API key in Settings
      </button>{' '}
      to enable (optional, free tier available).
    </p>
  );
}
// existing .env.local instruction for non-hosted mode
```

The `onOpenSettings` prop is a callback passed down from the ImportTB parent. This is better than `AiGateNote` directly manipulating navigation state.

### How the key gets into `isAiEnabled()` and the Gemini fetch

`src/lib/ai.ts` needs a second source for the API key: `localStorage` under `aussieledger:gemini-key`.

```ts
// src/lib/ai.ts — additive

/** Read a user-supplied Gemini key from localStorage (hosted mode). */
function getUserSuppliedKey(): string {
  try {
    return localStorage.getItem('aussieledger:gemini-key') ?? '';
  } catch {
    return '';
  }
}

export function isAiEnabled(): boolean {
  if (getAdapterKind() === 'server') {
    return Boolean(getCachedHealth()?.aiEnabled);
  }
  // Local / hosted mode: build-time key OR user-supplied key
  return buildTimeKeyConfigured() || Boolean(getUserSuppliedKey());
}

/** Returns the active Gemini API key: build-time first, then user-supplied. */
export function getActiveGeminiKey(): string {
  if (buildTimeKeyConfigured()) return process.env.GEMINI_API_KEY as string;
  return getUserSuppliedKey();
}
```

### How the Settings UI stores the key

```ts
// New Settings section: AI Key
// Stores/reads from localStorage directly (not through StorageAdapter —
// follows the Phase 6 pattern: non-entity config goes via localStorage)
const GEMINI_KEY_STORAGE = 'aussieledger:gemini-key';

function saveGeminiKey(key: string): void {
  if (key) localStorage.setItem(GEMINI_KEY_STORAGE, key);
  else localStorage.removeItem(GEMINI_KEY_STORAGE);
}
```

Security note: The key stored in `localStorage` is readable by any JS on the same origin, same as `aussieledger:settings`. For the `aussieledger.app` origin this is acceptable — the user is pasting their own key for their own browser session. Document in the UI: "Your key is stored only in this browser. It is never sent to our servers."

---

## 8. PWA Wrapper Integration

### vite-plugin-pwa addition to `vite.config.ts`

```ts
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  tailwindcss(),
  VitePWA({
    registerType: 'autoUpdate',
    injectRegister: 'auto',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      // Do NOT cache /api/* — service worker should not intercept Express proxy routes
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api\//],
    },
    manifest: {
      name: 'AussieLedger',
      short_name: 'AussieLedger',
      description: 'Free Australian accounting — TB to tax return in your browser',
      theme_color: '#0f172a',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    },
  }),
],
```

### Impact on `npm run dev`

`vite-plugin-pwa` does NOT register a service worker in development mode by default. The `registerType: 'autoUpdate'` only activates in the production build. The developer experience is unchanged: `npm run dev` runs Vite HMR as before, no SW is registered, IDB works normally.

To also test the PWA shape during development, the developer can run `npm run build && npm run preview` — the preview server serves the `dist/` with the SW active. This is the correct testing path; not `npm run dev`.

### Impact on `index.html`

`vite-plugin-pwa` injects the manifest link and service worker registration script into `index.html` at build time automatically (via `injectRegister: 'auto'`). No manual `index.html` edit is required.

### Impact on `package.json`

Add one devDependency: `vite-plugin-pwa`. No new scripts needed. The existing `build` script produces the PWA-enabled `dist/`. A `preview` script is already present.

### Non-PWA browser compatibility

The SPA works identically in browsers that do not support service workers (all non-trivial browsers in 2026 support SW, but the case is handled anyway). The service worker registration is wrapped in a try/catch by vite-plugin-pwa. If SW is not supported, the app functions as a regular SPA served over HTTP — all data in IDB, all features intact. No degradation.

### `workbox` SW cache strategy

Use Workbox's default "Cache First" for static assets (JS/CSS/fonts). For navigation (HTML), use NetworkFirst with offline fallback to `index.html`. This enables the app to load from cache when offline — particularly useful in Australia where connectivity can be patchy in rural areas.

Do NOT cache `/api/*` routes — the `navigateFallbackDenylist` pattern above handles this. The dev-mode proxy (`/api` → `localhost:4000`) is irrelevant in production.

---

## 9. AI Proxy Continuity (Hosted Mode: Direct Gemini Call)

### Current state

`ImportTB.tsx` calls `fetch('/api/ai/match-accounts', ...)` at line 498. This route is handled by `server/routes/ai.ts` (Express), which forwards to Gemini using the server's `GEMINI_API_KEY`.

In hosted mode, there is no Express server. The fetch to `/api/ai/match-accounts` will 404.

### Recommended change

Add a routing branch in `ImportTB.tsx`'s `runAIMapping` function (or better, extract into `src/lib/ai.ts`) that calls Gemini directly from the browser when in hosted mode or when no server is present.

**In `src/lib/ai.ts`, add a new export:**

```ts
/**
 * Call Gemini for account matching.
 *
 * - Server mode: delegates to /api/ai/match-accounts (Express proxy holds the key)
 * - Local/hosted mode with user key: calls Gemini REST API directly from the browser
 */
export async function callGeminiMatchAccounts(request: {
  prompt: string;
  model: string;
  responseSchema: unknown;
}): Promise<Response> {
  if (getAdapterKind() === 'server') {
    // Existing path: Express proxy
    return fetch('/api/ai/match-accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
  }

  // Hosted / local mode: direct browser call using @google/genai
  const apiKey = getActiveGeminiKey();
  if (!apiKey) throw new Error('No Gemini API key configured');

  const { GoogleGenAI } = await import('@google/genai');
  const genai = new GoogleGenAI({ apiKey });
  const result = await genai.models.generateContent({
    model: request.model,
    contents: request.prompt,
    config: { responseSchema: request.responseSchema as object },
  });

  // Return a Response-compatible object so ImportTB's existing error-handling works
  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return new Response(JSON.stringify({ candidates: result.candidates }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**In `ImportTB.tsx`**, replace the inline `fetch('/api/ai/match-accounts', ...)` call with `callGeminiMatchAccounts(...)`. The response parsing code below it stays unchanged because the function returns the same Response shape.

### Why a central `ai.ts` function rather than branching in ImportTB?

- Single routing decision in one file
- `ImportTB.tsx` already imports from `ai.ts` (`isAiEnabled`, `GEMINI_MODEL`)
- If more AI features are added in future phases, they use the same routing logic

### Package dependency note

`@google/genai` is already in `dependencies` (`^1.29.0`). The dynamic `import()` above lazy-loads it only in the code path that actually needs it (browser direct call). No new dependency.

---

## 10. Migration for Existing v1.1 IndexedDB Users

### The problem

IndexedDB is origin-scoped. A user who has been using the app at `http://localhost:5173` has their data in the IndexedDB for origin `http://localhost:5173`. When they visit `https://aussieledger.app`, they are at a different origin with an empty IndexedDB.

This is not a code problem. It is a documentation and onboarding problem.

### The path (no code required)

1. User opens their local install (`npm run dev` at `localhost:5173`).
2. User navigates to Data page.
3. User clicks Export — downloads `aussieledger-YYYY-MM-DD-HHmm.json`.
4. User opens `https://aussieledger.app`.
5. On first load, the app is empty (new entity wizard or "No entities yet" state).
6. User navigates to Data page.
7. User clicks Import, selects their downloaded JSON.
8. The existing migration runner (`migrate()`) upgrades the file to the current schema version.
9. Data is now at the public URL.

### Why no automatic migration

Cross-origin data transfer is not possible via browser APIs without the user explicitly exporting from one origin and importing to another. There is no way to read another origin's IndexedDB. This is by design (security boundary).

### Documentation locations

1. **README.md** — "Moving your data to the hosted version" section with the 4-step export/import guide.
2. **DataPage.tsx** — Add a help text blurb under the Export button: "If you've been using a local install, export here and import at aussieledger.app to move your data."
3. **App.tsx first-run modal** — When the app detects empty IDB on the public URL (`VITE_HOSTED_MODE === 'true'`), the first-run modal should include: "Already have data from a local install? Import your JSON backup to restore it."

---

## 11. `server/` Continuity

The `npm run dev:full` deployment shape is not deprecated in v1.2. It is the recommended path for small-firm VPS users who want SQLite persistence across team members.

The v1.2 changes do not touch `server/`. The public hosting additions (GH Actions deploy, PWA, IDB hardening, user-supplied AI key) are all SPA-side. The adapter selection logic in `src/storage/index.ts` continues to probe `/api/health` on non-hosted-mode instances and correctly routes to `ServerAdapter` when the Express server is present.

The VITE_HOSTED_MODE env var (question 1) is the toggle that skips the probe on the public URL. An unset `VITE_HOSTED_MODE` (the default for `npm run dev` and `npm run dev:full`) means the probe runs as before.

README updates needed:
- Add a new top-of-fold section: "Try the live demo at [URL]"
- Keep the existing "Clone and self-host" section unchanged
- Add a "Moving your data" section as above
- Confirm `npm run dev:full` docs are still accurate

---

## 12. Suggested Phase Order for v1.2

### Dependency graph

```
Phase A: Public Build + CI/CD infra
    |
    +--> Phase B: IDB Hardening (persist, quota, backup-nag, pre-unload guard)
    |       (can run in parallel with A after A's env-var changes land)
    |
    +--> Phase C: User-supplied AI key (Settings UI + ai.ts routing)
    |       (requires A's VITE_HOSTED_MODE for conditional AiGateNote rendering)
    |
Phase D: PWA wrapper
    |     (requires A's build pipeline to exist; independent of B and C)
    |
Phase E: Release polish (README rewrite, demo-data route, /demo seed)
          (requires A deployed to get the real URL for README)
```

### Recommended sequential order

**Phase 1 — Public Build + CI/CD** (`vite.config.ts` env-var changes + deploy workflow + Cloudflare Pages setup)
- VITE_HOSTED_MODE flag added
- Deploy workflow `.github/workflows/deploy.yml` created
- Probe skip for hosted mode in `src/storage/index.ts`
- Vite base URL confirmed for Cloudflare Pages (stays `'/'`)
- Produces: a working public URL at `aussieledger.pages.dev`

**Phase 2 — IDB Hardening** (`navigator.storage.persist` + quota estimate + backup-nag + pre-unload guard)
- `LocalAdapter.init()` extended with persist request
- `DataPage.tsx` extended with quota estimate display
- `useBackupNag.ts` new hook
- `App.tsx` wired for backup-nag toast and beforeunload guard
- `LocalAdapter` extended with `lastWriteAt` meta key
- Requires: Phase 1 complete (so hardening is tested at the public URL)

**Phase 3 — User-Supplied AI Key** (Settings UI + `ai.ts` routing + `AiGateNote.tsx` update)
- `src/lib/ai.ts` extended with `getUserSuppliedKey()` and `callGeminiMatchAccounts()`
- `src/components/Settings.tsx` extended with AI key section
- `AiGateNote.tsx` updated with hosted-mode branch
- `ImportTB.tsx` updated to use `callGeminiMatchAccounts()`
- Requires: Phase 1 complete (VITE_HOSTED_MODE must exist for AiGateNote branch)

**Phase 4 — PWA Wrapper** (`vite-plugin-pwa` + icons + manifest + offline test)
- `vite-plugin-pwa` installed
- `vite.config.ts` extended with VitePWA plugin
- Icons generated (192px, 512px PNG)
- Offline behaviour tested via `npm run build && npm run preview`
- Can run in parallel with Phase 3 (no shared files except `vite.config.ts`)

**Phase 5 — Release Polish** (README rewrite + demo route + `/demo` seed data + v1.1 migration docs)
- README rewritten with "Try the live demo" top-of-fold, migration guide, self-host guide
- Demo data seed (`/demo` route) with anonymised sample entity
- `DataPage.tsx` export help text for local-to-hosted migration
- First-run modal update for hosted mode
- Requires: Phase 1 deployed (to know the real URL for README)

### Phase ordering rationale

Phase 1 first because every other phase benefits from being testable at the public URL. The deploy pipeline produces the URL that the README will link to; release polish requires a working URL.

Phase 2 second because IndexedDB hardening is the core trust story of the milestone. Users who arrive at the hosted URL cold need this protection before AI features (Phase 3) or PWA installation (Phase 4) are relevant.

Phase 3 and Phase 4 are independently parallel after Phase 1. They touch different files (`vite.config.ts` is the only overlap; the PWA plugin config and the env-var define block are in different sections of the return object).

Phase 5 last because release polish requires the URL from Phase 1 and benefits from the completed feature set of Phases 2-4.

---

## Component Boundaries (v1.2 Additions)

| Component / Module | Responsibility | Connects To |
|---|---|---|
| `src/storage/local.ts` | Adds `persist()` request + `lastWriteAt` meta + `getPersistGranted()` | Called by `LocalAdapter.init()`; read by `DataPage`, `App.tsx` |
| `src/hooks/useBackupNag.ts` | Computes nag message from lastExportAt vs now; snooze via localStorage | Read by `App.tsx`; reads IDB meta via duck-typed adapter |
| `src/lib/ai.ts` | Adds `getUserSuppliedKey()`, `getActiveGeminiKey()`, `callGeminiMatchAccounts()` | Called by `ImportTB.tsx`; reads localStorage |
| `src/components/AiGateNote.tsx` | Branch on `VITE_HOSTED_MODE` for hosted wording; adds `onOpenSettings` prop | Used by `ImportTB.tsx` |
| `src/components/Settings.tsx` | New AI key section; reads/writes `aussieledger:gemini-key` localStorage | Calls `saveGeminiKey()`; triggers `isAiEnabled()` re-evaluation |
| `src/components/DataPage.tsx` | Adds quota estimate display; adds migration help text | Reads `navigator.storage.estimate()`; reads `getPersistGranted()` |
| `App.tsx` | Wires `useBackupNag`; adds `beforeunload` guard | Reads `lastWriteAt` + `lastExportAt` from adapter meta |
| `vite.config.ts` | Adds `VITE_HOSTED_MODE` define; adds `VitePWA` plugin | Build time only |
| `.github/workflows/deploy.yml` | Tag-triggered deploy to Cloudflare Pages | Depends on CI workflow passing |

---

## Phase 3 StorageAdapter FINAL Invariant — Compliance Check

Every v1.2 addition respects the FINAL invariant:

- `navigator.storage.persist()` → added to `LocalAdapter` internals only, not the interface
- `getPersistGranted()` → LocalAdapter-only method, accessed via duck-typing (same pattern as `getLastExportAt`)
- `lastWriteAt` → new `meta` IDB key inside LocalAdapter, not exposed on the interface
- Backup-nag → reads via existing `getLastExportAt()` duck-type pattern
- User AI key → `localStorage` only, never touches the adapter
- Quota estimate → `navigator.storage.estimate()` called directly in DataPage, not through the adapter

The interface in `src/storage/adapter.ts` is not modified in v1.2.

---

## Confidence Assessment

| Area | Level | Basis |
|---|---|---|
| Vite env-var injection mechanism | HIGH | Code read directly from `vite.config.ts` |
| LocalAdapter.init() insertion point | HIGH | Code read; pattern established by existing legacy migration placement |
| `navigator.storage.persist/estimate` API shape | HIGH | Well-established Web Storage API; widely supported |
| `vite-plugin-pwa` dev/prod behaviour | HIGH | Documented default; `registerType: 'autoUpdate'` well-known pattern |
| Cloudflare Pages base URL | MEDIUM | General knowledge; verify with CF Pages documentation at implementation time |
| `@google/genai` direct-browser call shape | MEDIUM | Package is in `dependencies`; API shape confirmed from `ImportTB.tsx` usage; exact `generateContent` signature should be verified against `@google/genai` v1.29.0 docs at implementation time |
| GH Actions `workflow_run` trigger for deploy-after-CI | MEDIUM | Pattern is documented; exact syntax should be verified at implementation time |
