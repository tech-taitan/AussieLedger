# Technology Stack

**Analysis Date:** 2026-05-09

## Languages

**Primary:**
- TypeScript 5.8.2 - Full application codebase (src/*.ts, src/**/*.tsx)
- JavaScript/JSX - React components and utilities

**Secondary:**
- CSS - Tailwind CSS utility-based styling via `@tailwindcss/vite`

## Runtime

**Environment:**
- Node.js (version unspecified, compatible with npm)

**Package Manager:**
- npm (npm ci/npm install)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 19.0.0 - UI framework, used in `src/App.tsx`, `src/main.tsx`, and all component files
- Vite 6.2.0 - Build tool and dev server
- Express.js 4.21.2 - Backend HTTP framework (declared in dependencies but primarily frontend-focused app)

**UI & Animation:**
- motion 12.23.24 (Framer Motion fork) - Animations and transitions used in `src/App.tsx`, components like EntityCard, and view transitions
- Tailwind CSS 4.1.14 - Utility-first CSS framework with `@tailwindcss/vite` 4.1.14 integration
- Lucide React 0.546.0 - Icon library used extensively throughout UI (`src/App.tsx` imports 30+ icons)

**Data Visualization:**
- recharts 3.8.0 - Chart rendering for FinancialTrendChart component

**Utilities:**
- clsx 2.1.1 - Conditional CSS class composition
- tailwind-merge 3.5.0 - Merges Tailwind classes safely with `cn()` utility in `src/lib/utils.ts`
- dotenv 17.2.3 - Environment variable loading from .env files

**AI/ML:**
- @google/genai 1.29.0 - Google Gemini API client for AI features (structured response generation with JSON schema support)

## Key Dependencies

**Critical:**
- React 19.0.0 - Core rendering engine
- TypeScript 5.8.2 - Type safety and compilation to JavaScript
- Vite 6.2.0 - Near-instant HMR and optimized builds
- @google/genai 1.29.0 - Required for slide generation and account mapping via Gemini AI models
- Tailwind CSS 4.1.14 - Design system and styling

**Infrastructure:**
- @vitejs/plugin-react 5.0.4 - Vite plugin for React Fast Refresh
- autoprefixer 10.4.21 - PostCSS plugin for vendor prefixes
- tsx 4.21.0 - TypeScript execution runner for Node.js scripts
- @types/express 4.17.21 - Type definitions for Express
- @types/node 22.14.0 - Type definitions for Node.js APIs

## Configuration

**Environment:**
- Configuration via `.env.local` file (not committed; `.env.example` provides template)
- Required environment variables:
  - `GEMINI_API_KEY` - Google Gemini API authentication token (injected by AI Studio at runtime, or set in `.env.local`)
  - `APP_URL` - The deployed application URL (injected by AI Studio with Cloud Run service URL, used for self-referential links)

**Build:**
- `vite.config.ts` - Vite build configuration with:
  - React plugin for JSX/TSX compilation
  - Tailwind CSS Vite integration
  - Path alias: `@/` maps to project root
  - Environment variable injection for `GEMINI_API_KEY`
  - HMR disabled when `DISABLE_HMR=true` (used in AI Studio agent edits)
- `tsconfig.json` - TypeScript configuration:
  - Target: ES2022
  - Module: ESNext
  - Strict mode enabled
  - JSX: react-jsx
  - Path alias configuration for `@/*`

**Styling:**
- Tailwind CSS configuration via Vite plugin (no separate tailwind.config.js required with Vite integration)
- CSS variables defined for design tokens: `--bg`, `--ink`, `--line`, `--line-strong`
- Responsive utility classes used throughout (mobile-first with sm:, md:, lg: breakpoints)

## Platform Requirements

**Development:**
- Node.js with npm
- Git (project has .git directory)
- Modern browser for development server (localhost:3000 by default)

**Production:**
- Cloud Run container (as mentioned in .env.example: APP_URL injected with Cloud Run service URL)
- Node.js 18+ recommended for Express backend support
- Gemini API key from Google AI Studio

**Deployment:**
- Web-based: Runs on localhost:3000 in dev (`npm run dev` with `--port=3000 --host=0.0.0.0`)
- Build: `npm run build` produces optimized dist/ directory
- Preview: `npm run preview` serves built files locally

## Scripts

```bash
npm run dev                # Start Vite dev server on port 3000
npm run build              # Build optimized production bundle
npm run preview            # Preview production build locally
npm run clean              # Remove dist directory
npm run lint               # Run TypeScript type checking (tsc --noEmit)
```

## Development Tools

- **Type Checking:** TypeScript compiler with `tsc --noEmit` (no emit to allow Vite to handle output)
- **Code Format:** No explicit formatter configured; assumes Prettier integration via IDE or pre-commit hooks
- **Linting:** No ESLint configuration detected in provided files

---

*Stack analysis: 2026-05-09*
