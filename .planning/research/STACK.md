# Stack Research

**Domain:** Australian accounting / bookkeeping / tax-return web application
**Researched:** 2026-05-10
**Overall Confidence:** MEDIUM (external network access unavailable; versions sourced from training data through August 2025 + npm registry knowledge; flag for version pin verification before each phase begins)

---

## Existing Stack (Keep — Do Not Replace)

| Technology | Version in Repo | Keep? | Note |
|------------|-----------------|-------|------|
| React | 19.0.0 | YES | Concurrent rendering; no upgrade needed |
| TypeScript | ~5.8.2 | YES | Strict mode already on |
| Vite | 6.2.0 | YES | Fast HMR; used as build tool |
| Tailwind CSS | 4.1.14 | YES | Vite-integrated; no config file needed |
| motion (Framer fork) | 12.x | YES | Animations already in use |
| lucide-react | 0.546.0 | YES | Icon system |
| recharts | 3.8.0 | YES | Charts for dashboard |
| clsx + tailwind-merge | 2.x / 3.x | YES | `cn()` utility |
| express | 4.21.2 | REPURPOSE | Currently unused; needed for AI proxy + optional server tier |
| @google/genai | 1.29.0 | REMOVE from critical path | Must be moved server-side or stripped; never in client bundle |

---

## Recommended Additions

### Persistence

**Recommendation: sql.js (SQLite compiled to WASM) + mandatory JSON export**

Rationale: The project is self-hosted, single-page-app-first. A full server-side database is optional (see Server Tier below). For the SPA-only path the options are:

| Option | Self-hosted? | Durable? | Export? | Complexity | Verdict |
|--------|-------------|---------|---------|------------|---------|
| localStorage | YES | NO | Manual | Trivial | REJECT — loses data on cache clear |
| IndexedDB raw | YES | YES | Manual | High API surface | REJECT — raw API is painful; still lost on cache clear in private mode |
| Dexie.js (IndexedDB wrapper) | YES | YES | Via custom code | Low | VIABLE for single-user; IndexedDB still lost on cache clear |
| sql.js (SQLite WASM) + File System Access API | YES | YES (explicit save) | SQL dump / JSON | Medium | RECOMMENDED for SPA path |
| PGlite (Postgres WASM) | YES | YES | pg_dump | Medium | Heavier; Postgres semantics not needed |
| SQLite + Node/Express server | YES | YES | SQL dump | Medium | RECOMMENDED for server-tier path |

**For single-user SPA (no server):** Use `sql.js` with the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) to persist an `.sqlite` file to the user's local disk. On startup, prompt "Open existing ledger file or create new." The user controls the file; cache clears don't affect it.

**For multi-client / tax-agent server tier:** Use `better-sqlite3` (Node) with an Express API layer. The same schema runs in both modes; server mode is opt-in.

| Library | Version | Purpose | Self-hosted? | Confidence |
|---------|---------|---------|--------------|------------|
| `sql.js` | ^1.12.0 | SQLite compiled to WASM; runs entirely in browser with no server | YES | MEDIUM — version from training data; verify before install |
| `better-sqlite3` | ^9.x | Synchronous SQLite bindings for Node.js; used in server tier | YES | MEDIUM |
| `@electric-sql/pglite` | ^0.2.x | Postgres WASM alternative; heavier but richer SQL | YES | LOW — project is newer; verify stability |

**What NOT to use for persistence:**

| Avoid | Why |
|-------|-----|
| Firebase / Firestore | Hosted-only; violates self-host + free constraint |
| Supabase (hosted) | Same issue; self-hosted Supabase is possible but massively complex for this scope |
| MongoDB Atlas | Hosted-only |
| PlanetScale / Neon / Turso hosted tiers | All managed-cloud; not acceptable in critical path |
| Prisma ORM | Adds migration complexity; overkill for a single-user SQLite app; also requires a server |

---

### Test Framework

**Recommendation: Vitest + @testing-library/react + @testing-library/user-event + jsdom**

Rationale: Vitest is the natural pairing for a Vite project. It reuses the Vite config, supports TypeScript natively with zero extra tooling, and runs in Node with jsdom for component tests. React Testing Library enforces testing from the user's perspective (label text, roles) which is correct for form-heavy tax UI.

| Library | Version | Purpose | Confidence |
|---------|---------|---------|------------|
| `vitest` | ^2.x | Test runner; Vite-native; supports ESM | HIGH |
| `@testing-library/react` | ^16.x | Component testing; user-centric queries | HIGH |
| `@testing-library/user-event` | ^14.x | Realistic browser event simulation | HIGH |
| `@testing-library/jest-dom` | ^6.x | DOM assertion matchers (`toBeInTheDocument` etc.) | HIGH |
| `jsdom` | ^24.x | DOM environment for Node; used by Vitest | HIGH |
| `@vitest/coverage-v8` | ^2.x | V8-native coverage; zero extra deps | MEDIUM |

Priority test surfaces (from CONCERNS.md):
1. Tax math: BAS aggregation (G1/G10/1A/1B), GST `/11` divisor, company/trust/individual label rollups
2. Trial balance balance enforcement
3. CSV import parsing (deterministic path, not AI path)
4. Schema migration / state deserialisation

**What NOT to use:**

| Avoid | Why |
|-------|-----|
| Jest | Requires babel transform or extra config for ESM + Vite; Vitest is the same API without the friction |
| Playwright / Cypress alone | End-to-end only; too slow for unit-testing tax math; add as a secondary layer later |
| Testing with real browser storage | IndexedDB / localStorage in jsdom is unreliable; mock at the persistence layer boundary |

---

### PDF Generation

**Recommendation: @react-pdf/renderer**

Rationale: Tax returns are structured, label-driven documents. `@react-pdf/renderer` lets you define the PDF layout using React components — a natural fit given the stack. It runs client-side (no server required), produces print-ready A4 PDFs, and handles Unicode/UTF-8 for AU content. It does NOT depend on a headless browser.

Alternatives evaluated:

| Library | Approach | Self-hostable? | Pros | Cons | Verdict |
|---------|----------|---------------|------|------|---------|
| `@react-pdf/renderer` | React → PDF (pdfmake under the hood) | YES | React-native API; A4 layouts; client-side | Layout model is separate from DOM (no Tailwind classes) | RECOMMENDED |
| `jsPDF` | Imperative canvas-to-PDF | YES | Mature; widely used | Imperative API; pixel-level positioning is painful for forms | VIABLE fallback |
| `pdf-lib` | Low-level PDF manipulation | YES | Precise control; good for filling existing PDF templates | Not a layout engine; too low-level for building from scratch | Use only if ATO provides fillable PDFs |
| Puppeteer / headless Chrome | HTML → PDF | YES (self-hosted) | Can reuse existing HTML layout | Requires Node server + Chrome binary; heavy; overkill for static output | REJECT for v1 |
| PDFMake | JSON → PDF | YES | No browser dependency | Non-React API; harder to maintain alongside components | VIABLE fallback |

**Specific AU consideration:** ATO return forms (NAT 0660 etc.) are label-driven summaries, not exact ATO form replicas. `@react-pdf/renderer` is sufficient to produce a clearly labelled, print-ready working-paper PDF the user can transcribe into myGov. Exact ATO form replication is out of scope (SBR lodgement is also out of scope).

| Library | Version | Confidence |
|---------|---------|------------|
| `@react-pdf/renderer` | ^3.x or ^4.x | MEDIUM — verify latest stable; v3 was stable as of training cutoff |

---

### Server Tier (Optional — for AI proxy and tax-agent multi-client mode)

**Recommendation: Keep Express 4 (already installed); add a thin `server/` directory**

Rationale: Express is already a declared dependency. The missing piece is a `server/index.ts` that:
1. Proxies Gemini API calls (removing the key from the client bundle — CRITICAL security fix)
2. Optionally serves a `better-sqlite3`-backed REST API for multi-client data
3. Is started separately (`node server/index.ts`) — the SPA continues to work standalone without it

An entire new framework (Fastify, Hono, tRPC) is not justified. Express 4 with TypeScript (`tsx` is already installed for running TS in Node) is sufficient.

| Technology | Version | Purpose | Confidence |
|------------|---------|---------|------------|
| `express` | 4.21.2 (already installed) | HTTP server; AI proxy; optional data API | HIGH |
| `tsx` | 4.21.0 (already installed) | Run `server/index.ts` without separate compile step | HIGH |
| `cors` | ^2.x | CORS middleware for SPA ↔ server requests | HIGH |
| `better-sqlite3` | ^9.x | SQLite on the server side for multi-client persistence | MEDIUM |
| `@types/better-sqlite3` | ^7.x | TypeScript definitions | MEDIUM |

**What NOT to add:**

| Avoid | Why |
|-------|-----|
| Next.js / Remix | Full-stack rewrite; conflicts with "build on existing stack" constraint |
| Fastify / Hono | No problem Express doesn't solve here; unnecessary migration |
| tRPC | Good DX but adds surface area; overkill for a thin proxy |
| Prisma | ORM abstraction over SQLite adds complexity with no benefit at this scale |
| Docker (required) | Acceptable as an optional deployment artifact, but must not be REQUIRED for self-hosting |

---

### AU-Specific Date / Currency / Number Formatting

**Recommendation: Native `Intl` APIs (zero dependency)**

Rationale: Node.js 18+ and all modern browsers fully support the ECMA Internationalization API (`Intl.NumberFormat`, `Intl.DateTimeFormat`). For Australian locale this is sufficient and has no dependency cost.

```typescript
// Currency
new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(1234.56)
// → "A$1,234.56"

// Date (AU short format)
new Intl.DateTimeFormat('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date('2025-06-30'))
// → "30/06/2025"

// Financial year helper (not in Intl — write once in src/lib/date.ts)
// AU FY: 1 July – 30 June
// FY2025 = 1 July 2024 – 30 June 2025
```

A `src/lib/date.ts` module should centralise:
- AU financial year boundaries (`fyStart(year)`, `fyEnd(year)`)
- Quarter-to-date ranges (Q1 = Jul–Sep, Q2 = Oct–Dec, Q3 = Jan–Mar, Q4 = Apr–Jun)
- BAS period helpers

| Option | Dependency cost | Covers AUD | AU dates | Verdict |
|--------|----------------|------------|----------|---------|
| Native `Intl` | None | YES | YES | RECOMMENDED |
| `date-fns` + `date-fns-tz` | ~80 KB | No (need Intl for currency) | YES (locale helpers) | Add only if FY/quarter logic gets complex |
| `dayjs` | ~7 KB | No | YES | Lighter than date-fns; still add only if needed |
| `luxon` | ~70 KB | No | YES | Verbose API; not worth adding |
| `numeral` | ~15 KB | Partial | No | Unmaintained; AVOID |

**Confidence:** HIGH (Intl APIs are ECMA standard; no version uncertainty)

---

### Code Quality (Linting / Formatting)

**Recommendation: ESLint 9 (flat config) + eslint-plugin-react-hooks + Prettier**

Rationale: CONCERNS.md flags "no ESLint/Prettier" as a LOW risk. It's a quick fix with high maintainability payoff, especially for catching React hooks mistakes (missing dep arrays) that break tax-state logic.

| Tool | Version | Purpose | Confidence |
|------|---------|---------|------------|
| `eslint` | ^9.x | Linting with flat config | HIGH |
| `@eslint/js` | ^9.x | Built-in recommended rules | HIGH |
| `eslint-plugin-react-hooks` | ^5.x | Hooks lint rules | HIGH |
| `typescript-eslint` | ^8.x | TypeScript-aware lint rules | HIGH |
| `prettier` | ^3.x | Opinionated formatter | HIGH |
| `eslint-config-prettier` | ^9.x | Disables ESLint rules that conflict with Prettier | HIGH |

---

## Complete Recommended Additions (Install Commands)

```bash
# Test framework
npm install -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom @vitest/coverage-v8

# PDF generation
npm install @react-pdf/renderer

# Persistence — SPA path (SQLite WASM)
npm install sql.js
npm install -D @types/sql.js

# Persistence — server tier (if/when built)
npm install better-sqlite3
npm install -D @types/better-sqlite3

# Server tier additions
npm install cors
npm install -D @types/cors

# Code quality
npm install -D eslint @eslint/js eslint-plugin-react-hooks typescript-eslint prettier eslint-config-prettier
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Test runner | Vitest | Jest | ESM/Vite config friction; Vitest is a drop-in with zero extra config |
| Component testing | @testing-library/react | Enzyme | Enzyme is effectively deprecated for React 18+; RTL is the community standard |
| PDF | @react-pdf/renderer | jsPDF | Imperative API is painful for structured form layouts |
| PDF | @react-pdf/renderer | Puppeteer | Requires headless Chrome + server; too heavy for a self-hosted SPA |
| Persistence (SPA) | sql.js | Dexie.js (IndexedDB) | IndexedDB still lost on cache clear in some scenarios; sql.js + File System Access API gives user-controlled files |
| Persistence (SPA) | sql.js | PGlite | Heavier; Postgres semantics unnecessary; sql.js is more mature |
| Locale / dates | Native Intl | date-fns | date-fns adds 80KB for capabilities Intl already provides; add only if FY logic warrants it |
| Server | Express (existing) | Fastify / Hono | No problem Express doesn't solve; not worth a migration |
| Server | Express (existing) | Next.js | Full-stack rewrite; violates "build on existing stack" constraint |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@google/genai` in client bundle | API key embedded at build time; extracted trivially from dist JS | Move Gemini calls to `server/` proxy; never expose key to browser |
| Firebase / Firestore / Supabase (hosted) | Managed cloud; violates self-hosted + free constraint | sql.js (SPA) or better-sqlite3 (server) |
| Basiq / Yodlee (bank feeds) | Paid APIs; commercial agreements; incompatible with open-source ethos | Out of scope for v1 |
| `numeral.js` | Unmaintained since 2019; AU locale support is incomplete | Native `Intl.NumberFormat('en-AU', ...)` |
| Prisma ORM | Adds migration toolchain complexity over SQLite; not worth the overhead at this scale | Direct `sql.js` or `better-sqlite3` queries |
| Jest | ESM support requires extra babel config in a Vite project | Vitest |
| Playwright / Cypress (as primary test layer) | Too slow for unit-testing tax math; fine as a secondary E2E layer after unit tests exist | Vitest for unit/integration; add E2E later |
| Direct ATO SBR lodgement libraries | No mature open-source AU SBR TypeScript library exists; ATO certification is a multi-month compliance project | Print-ready PDF output only in v1 |

---

## Stack Patterns by Deployment Variant

**Single-user SPA (no server, simplest self-hosting):**
- Persistence: sql.js + File System Access API (user's own `.sqlite` file)
- No server process; `npm run build` → serve `dist/` statically
- AI features: disabled or require user to enter their own API key in settings (never baked into build)

**Single-user with optional server:**
- Start with SPA path; add Express server tier when AI proxy is needed
- `npm run dev:server` starts `server/index.ts` via tsx
- SPA detects `VITE_API_URL` env var; falls back to standalone mode if absent

**Tax-agent multi-client:**
- Express server with better-sqlite3
- Server holds entity isolation; client sends auth token (simple password or JWT)
- Same React frontend; persona mode = "tax-agent" in settings

---

## AU-Specific Considerations

| Concern | Approach | Confidence |
|---------|----------|------------|
| Financial year boundary (1 Jul – 30 Jun) | `src/lib/date.ts` — never use calendar year as a default | HIGH |
| Currency display (AUD, A$) | `Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' })` | HIGH |
| Date format (DD/MM/YYYY) | `Intl.DateTimeFormat('en-AU')` | HIGH |
| GST rate (10%) and divisor (÷11 for inclusive) | Centralise in `src/lib/tax/gst.ts`; do not inline | HIGH |
| Tax year currency (ATO label changes annually) | Centralise constants in `src/lib/tax/constants/fy{YYYY}.ts`; document refresh process | MEDIUM |
| ATO form numbers (NAT 0660, 0656, 0659, 0976) | Reference in PDF output headers; do not claim to produce ATO-accepted forms | HIGH |
| ABN / TFN validation | ABN: modulus-89 algorithm (well documented); TFN: modulus-11; implement in `src/lib/validation.ts` | MEDIUM |
| BAS periods (monthly/quarterly) | Period model should support Q1=Jul–Sep, Q2=Oct–Dec, Q3=Jan–Mar, Q4=Apr–Jun | HIGH |

---

## Version Compatibility Notes

| Package | Compatible With | Note |
|---------|-----------------|------|
| vitest ^2.x | Vite ^6.x, TypeScript ^5.x | Native Vite integration; no extra config |
| @testing-library/react ^16.x | React 19.x | RTL 16 added React 19 act() compatibility |
| @react-pdf/renderer ^3.x | React 19.x | Verify React 19 compatibility before install; v3 was tested against React 18 |
| sql.js ^1.x | Browser + Node | WASM binary must be served statically; Vite requires `assetsInclude: ['**/*.wasm']` config |
| better-sqlite3 ^9.x | Node 18+ | Native Node addon; requires `npm rebuild` after Node version change |
| eslint ^9.x | TypeScript 5.x | Flat config (`eslint.config.ts`) replaces legacy `.eslintrc`; typescript-eslint ^8 required |

---

## Sources

- Project context read from `.planning/PROJECT.md`, `.planning/codebase/STACK.md`, `.planning/codebase/CONCERNS.md`, `package.json` — HIGH confidence (primary source)
- sql.js documentation: https://sql.js.org — MEDIUM confidence (training data; WebFetch unavailable during research)
- Vitest documentation: https://vitest.dev — MEDIUM confidence (training data)
- React Testing Library: https://testing-library.com/docs/react-testing-library/intro — MEDIUM confidence (training data)
- @react-pdf/renderer: https://react-pdf.org — MEDIUM confidence (training data; React 19 compat should be verified)
- MDN Intl API: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl — HIGH confidence (ECMA standard)
- ATO form references: https://www.ato.gov.au/forms-and-instructions — HIGH confidence (domain knowledge)
- ESLint v9 flat config: https://eslint.org/docs/latest/use/configure/configuration-files — MEDIUM confidence (training data)

**IMPORTANT — Version Verification Required:** External network access (WebSearch, WebFetch, npm registry) was unavailable during this research session. All version numbers above are sourced from training data (cutoff August 2025) and the existing `package.json`. Before each phase begins, run `npm show <package> version` to confirm the latest stable release and update accordingly.

---

*Stack research for: AussieLedger — AU accounting / tax-return web application*
*Researched: 2026-05-10*
