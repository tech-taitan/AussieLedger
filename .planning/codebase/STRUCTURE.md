# Directory Structure

**Analysis Date:** 2026-05-09

## Top-Level Layout

```
A:\Projects\AussieLedger\
├── .env.example          # Environment variable template (GEMINI_API_KEY)
├── .gitignore            # Excludes node_modules, dist, .env*
├── index.html            # Vite HTML entry point — mounts React app
├── metadata.json         # AI Studio app metadata (name, description, prompt)
├── package.json          # Dependencies and scripts (dev, build, preview, lint)
├── package-lock.json     # npm lockfile
├── README.md             # Project intro and run instructions
├── tsconfig.json         # TypeScript compiler config (strict, target ES2022)
├── vite.config.ts        # Vite build config — exposes GEMINI_API_KEY via define
└── src/                  # All application source
```

**Convention:** Flat top-level. Build/config files live at root; all source under `src/`.

## src/ Layout

```
src/
├── main.tsx              # React entry — renders <App /> into #root
├── App.tsx               # Root component — owns global state, view routing, sidebar
├── index.css             # Global Tailwind imports
├── types.ts              # All shared TypeScript domain types
├── constants.ts          # Static data (chart of accounts, tax labels, GST codes)
├── components/           # All UI components (flat, no subfolders)
└── lib/
    └── utils.ts          # cn() classname merger (clsx + tailwind-merge)
```

## components/ Layout

All components live flat under `src/components/`. There are no feature folders, no `containers/` vs `presentational/` split, and no nested directories.

```
src/components/
├── AccountManager.tsx        # CRUD for entity-specific chart of accounts
├── AuditTrail.tsx            # Read-only audit log viewer
├── BasIasAssistant.tsx       # BAS / IAS lodgement assistant (GST, PAYG)
├── CompanyTaxReturn.tsx      # Company income tax return preparation
├── EntityForm.tsx            # Create/edit entity (sole trader, company, trust, partnership)
├── FinancialTrendChart.tsx   # Recharts wrapper for trend visualization
├── ImportTB.tsx              # Import opening trial balance from external source
├── JournalForm.tsx           # Create/edit a journal entry (multi-line, balanced)
├── SlideGenerator.tsx        # Gemini-powered slide deck generator
├── TaxReturnAssistant.tsx    # Individual income tax return preparation
├── TrialBalance.tsx          # Display trial balance for active entity
└── TrustTaxReturn.tsx        # Trust income tax return preparation
```

**Naming:** PascalCase filenames matching the exported component (`JournalForm.tsx` exports `JournalForm`).

## Key Locations

| Concern | Where to look |
|---|---|
| Add a new view/page | Create component in `src/components/`, import in `src/App.tsx`, add view key + render branch |
| Add a new domain type | `src/types.ts` |
| Change chart of accounts or tax labels | `src/constants.ts` |
| Adjust state shape or persistence | `src/App.tsx` — state hooks + `localStorage` reads/writes |
| Tweak global styles | `src/index.css` (Tailwind v4 directives) |
| Adjust build/env wiring | `vite.config.ts` |
| Add an icon | `lucide-react` import in the consuming component |
| Add an animation | `motion/react` (the `motion` package, post-Framer rename) |

## Naming Conventions

- **Files:** PascalCase for components (`JournalForm.tsx`), camelCase for utilities (`utils.ts`), lowercase for config/types (`types.ts`, `constants.ts`).
- **Component exports:** Named exports matching the filename (`export function JournalForm(...)` or `export const JournalForm = ...`).
- **Types:** PascalCase interfaces in `src/types.ts` (`Entity`, `Account`, `JournalEntry`, `JournalLine`, `AuditLog`, `TrialBalanceRow`).
- **Constants:** UPPER_SNAKE_CASE for top-level static data, PascalCase for object groupings.

## Routing Convention

There is **no router library** (no `react-router`, no `next/router`). View navigation is a single `view` state variable in `App.tsx` driving a switch/conditional render. Each component receives props for navigation rather than reading a URL.

**Implication for new views:** Add a new view by extending the `view` state's union type, adding a sidebar entry, and adding a render branch in `App.tsx`.

## Persistence Convention

State is persisted to `window.localStorage` via `useEffect` hooks in `App.tsx`. There is no server-side persistence, no IndexedDB, no Service Worker, no sync layer.

**Implication:** Adding a new persisted slice means adding a state hook plus a localStorage save/load effect in `App.tsx`.

## Module Boundaries

| Layer | Imports allowed from |
|---|---|
| `src/main.tsx` | React, App.tsx |
| `src/App.tsx` | components/, types, lib/utils, react, motion, lucide-react |
| `src/components/*.tsx` | types, constants, lib/utils, react, motion, lucide-react, recharts, @google/genai |
| `src/lib/utils.ts` | clsx, tailwind-merge (no app code) |
| `src/types.ts` | nothing (pure type module) |
| `src/constants.ts` | types only |

No circular imports observed. Components do not import from each other (App.tsx is the orchestrator).

## What is NOT Present

These are absences worth noting for planning:

- **No `tests/` or `__tests__/` directory** — no test infrastructure
- **No `api/` directory** — backend calls (Gemini) happen inline inside components
- **No `hooks/` directory** — custom hooks would currently land in components or App.tsx
- **No `services/` directory** — no service abstraction over `@google/genai` or localStorage
- **No `pages/` directory** — view-as-state pattern means components are pages
- **No `public/` directory** — no static assets shipped beyond what Vite generates
- **No `.eslintrc`, `.prettierrc`, or `.editorconfig`** — only `tsc --noEmit` enforces anything
- **No CI config** — no `.github/workflows/`, no Husky hooks
