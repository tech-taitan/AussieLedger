# Concerns

**Analysis Date:** 2026-05-09

A catalog of technical debt, risks, and fragile areas that should inform planning. Listed roughly in order of severity within each category.

## Security

### CRITICAL — Gemini API key exposed in client bundle
- **Where:** `src/components/SlideGenerator.tsx:59`, `src/components/ImportTB.tsx:79`
- **Pattern:** `new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })`
- **How it leaks:** `vite.config.ts:11` substitutes `process.env.GEMINI_API_KEY` into the bundle at build time via `define`. The compiled `dist/` JavaScript contains the raw key string.
- **Impact:** Anyone who loads the deployed app can extract the key from the bundle. The key can be exfiltrated and abused on the attacker's quota.
- **Note:** The `.env.example` comment claims AI Studio injects the key at runtime — this does not change the fact that for any non-AI-Studio deployment (or production hosting), the key ends up in the client bundle.
- **Fix direction:** Move Gemini calls to a server-side proxy (the `express` dependency is already installed but unused in the frontend tree). Never expose AI provider keys to the browser.

### HIGH — No authentication or authorization
- **Where:** Application-wide
- **Issue:** There is no login flow, session management, or RBAC. The header references "Tristan (Admin)" as hard-coded text. Any user with the URL has full access to all entities and journal data.
- **Impact:** Multi-tenant accounting data is undefended. Any deployment beyond a single user is unsafe.

### MEDIUM — No input validation at trust boundaries
- **Where:** `src/components/EntityForm.tsx`, `src/components/JournalForm.tsx`, `src/components/ImportTB.tsx`
- **Issue:** No format validation on ABN, TFN, account codes, or GST codes. CSV import accepts any shape. JSON parsed from the AI response (`ImportTB.tsx`) is consumed without runtime type validation.
- **Impact:** Bad data corrupts the trial balance silently. A malicious CSV or AI response could break state.

## Reliability

### CRITICAL — No tests
- **Where:** Codebase-wide (see `TESTING.md`)
- **Impact:** No regression safety. Refactors are blind. Tax math correctness is asserted only by manual inspection.

### HIGH — Sole persistence is unsynced browser localStorage
- **Where:** `src/App.tsx` (state hooks + persistence effects)
- **Issue:** All journals, entities, accounts, and audit logs live in `window.localStorage`. No backup, no sync, no export. Clearing browser data destroys all accounting records.
- **Impact:** Catastrophic data loss is one accidental browser-cache-clear away. Storage is also single-device — same user on a different machine sees no data.
- **Compounding risk:** No state schema versioning. Any change to type shapes (`src/types.ts`) silently breaks deserialization for existing users.

### HIGH — Unbalanced journals are theoretically possible
- **Where:** `src/components/JournalForm.tsx`
- **Issue:** Balance validation is a UI hint, not a hard invariant at the data layer. A bug in the form (or future programmatic entry creation) could persist an unbalanced entry.
- **Impact:** Trial balance silently incorrect. Tax returns derived from it would be wrong.

### MEDIUM — CSV import parsing is fragile
- **Where:** `src/components/ImportTB.tsx` (589 lines)
- **Issue:** Parsing relies on Gemini AI to interpret CSV structure rather than a deterministic parser. No fallback when the AI returns malformed JSON, hits a rate limit, or rephrases column meanings.
- **Impact:** Imports fail unpredictably. The parsing path also bypasses validation present elsewhere.

### MEDIUM — No undo/redo or versioning
- **Where:** All mutations in `src/App.tsx`
- **Issue:** Once an entity is deleted or a journal is altered, the prior state is gone. The audit log records actions but does not enable rollback.
- **Impact:** User mistakes are unrecoverable.

## Maintainability

### HIGH — Monolithic `App.tsx` (1,126 lines)
- **Where:** `src/App.tsx`
- **Issue:** Owns global state, view routing, sidebar navigation, persistence effects, entity CRUD orchestration, and most cross-cutting glue. No custom hooks extracted.
- **Impact:** Any change risks unrelated regressions. Hard to reason about state transitions. Hard to add features without further bloat.

### HIGH — Duplicated tax/business logic across components
- **Where:** `src/components/TaxReturnAssistant.tsx` (224), `src/components/CompanyTaxReturn.tsx` (220), `src/components/TrustTaxReturn.tsx` (220), `src/components/BasIasAssistant.tsx` (154)
- **Issue:** Each tax return component reimplements label-aggregation logic against journal entries and constants. No shared `lib/tax/` module.
- **Impact:** A correctness fix has to be applied in 3-4 places. Easy to drift.

### MEDIUM — `ImportTB.tsx` and `JournalForm.tsx` are oversized
- **Where:** `src/components/ImportTB.tsx` (589 lines), `src/components/JournalForm.tsx` (458 lines)
- **Issue:** Mix UI, parsing, validation, AI interaction, and persistence in single files.
- **Impact:** Modular reuse is difficult. Testing (when introduced) will be harder than necessary.

### MEDIUM — Magic numbers in tax math
- **Where:** GST calculation (`/11` for the GST-inclusive divisor), tax bracket numbers in tax return components
- **Issue:** Constants are inline rather than centralized in `src/constants.ts`. Year-on-year tax changes require code edits scattered across components.
- **Impact:** Tax law updates are error-prone.

### LOW — No ESLint/Prettier configuration
- **Where:** Repo root
- **Issue:** Only `tsc --noEmit` runs. No style enforcement, no unused-import detection, no React hooks lint rules.
- **Impact:** Style drift over time. Common React mistakes (missing dep arrays, conditional hooks) won't be caught.

## Performance

### MEDIUM — No pagination or virtualization
- **Where:** `src/components/AuditTrail.tsx`, `src/components/TrialBalance.tsx`, journal lists
- **Issue:** All rows render at once.
- **Impact:** Likely fine in early use; will degrade once an entity has thousands of journal lines or audit entries.

### LOW — Memoization is partial
- **Where:** `src/App.tsx` uses `useMemo` for some derived data, not all
- **Impact:** Re-renders are larger than necessary as state grows. Not a current bottleneck.

## Operational

### HIGH — No deployment/CI configuration
- **Where:** Repo root
- **Issue:** No `.github/workflows/`, no Dockerfile, no deployment manifests. Build is manual (`npm run build`).
- **Impact:** No automated checks gate merges. No reproducible deploy path.

### MEDIUM — `express` dependency is unused
- **Where:** `package.json` lists `express` and `@types/express`, but no server file exists
- **Issue:** Suggests an abandoned/intended backend that was never built — likely the missing piece for proxying Gemini calls.
- **Impact:** Dead dependency weight; or, more usefully, a hint that the original architecture intended a server tier.

### LOW — `.gitignore` minimal
- **Where:** `.gitignore`
- **Issue:** Excludes `node_modules`, `dist`, `.env*`. No `.planning/`, `coverage/`, OS junk (`.DS_Store`, `Thumbs.db`), or editor files.
- **Impact:** Minor — current scope is small. Will grow with team size.

## Domain Correctness

### HIGH — No verification of Australian tax rules
- **Where:** Throughout tax-return components and `src/constants.ts`
- **Issue:** Tax labels, GST treatments, and tax brackets are encoded but their correctness against current ATO guidance is undocumented and untested. Currency / freshness of the rules is unknown.
- **Impact:** This is the product's core promise. Correctness here matters more than for most apps. Needs an explicit verification mechanism.

## Quick Risk Summary

| Severity | Count | Examples |
|---|---|---|
| Critical | 2 | API key in bundle; no tests |
| High | 6 | No auth; localStorage-only persistence; monolithic App.tsx; duplicated tax logic; no CI; tax-rule correctness unverified |
| Medium | 6 | CSV parsing fragility; no validation; oversized components; magic numbers; no pagination; unused express dep |
| Low | 3 | No ESLint/Prettier; partial memoization; minimal `.gitignore` |

The two critical items (API key exposure, no tests) are the highest-leverage targets for an early phase, both because they unblock safer development and because shipping the product with either unresolved is unacceptable for an accounting tool.
