# Architecture

**Analysis Date:** 2026-05-09

## Pattern Overview

**Overall:** Component-based Single Page Application (SPA) with view-based state management

**Key Characteristics:**
- React 19 with TypeScript for type-safe component development
- Multi-entity ledger system with localStorage persistence
- View-driven routing (no traditional router) managed by a single `view` state variable
- Composition over nested routing - each view is a standalone component
- Centralized state management in App.tsx with local state hooks (useState)
- Data-driven UI with memoization for performance optimization

## Layers

**Presentation Layer:**
- Purpose: Render UI components and handle user interactions
- Location: `src/components/`, `src/App.tsx`
- Contains: React functional components with Tailwind CSS styling, form components, data display components
- Depends on: Type definitions, utility functions, Recharts for charting
- Used by: Main App component for view rendering

**Data & State Layer:**
- Purpose: Manage application state, persistence, and data transformations
- Location: `src/App.tsx` (state hooks), localStorage (persistence)
- Contains: Entity management, journal entries, account definitions, audit logs
- Depends on: Type definitions, browser localStorage API
- Used by: All components for reading/updating data

**Type/Domain Layer:**
- Purpose: Define data structures and domain models
- Location: `src/types.ts`
- Contains: TypeScript interfaces for Entity, Account, JournalEntry, JournalLine, AuditLog, etc.
- Depends on: None
- Used by: All other layers for type safety

**Constants & Configuration:**
- Purpose: Define static data and configuration mappings
- Location: `src/constants.ts`
- Contains: Chart of Accounts, tax labels mappings (individual income, company tax, trust tax), GST codes
- Depends on: Types
- Used by: Components and App for account lookups and tax classifications

**Utility Layer:**
- Purpose: Provide helper functions
- Location: `src/lib/utils.ts`
- Contains: `cn()` function for classname merging (Tailwind + clsx + tailwind-merge)
- Depends on: External libraries (clsx, tailwind-merge)
- Used by: All components for styling

## Data Flow

**Entity Selection & Navigation:**
1. User selects entity from Master Dashboard or header dropdown
2. `setActiveEntityId(entity.id)` updates state
3. View changes to entity-specific dashboard
4. Sidebar dynamically shows entity-specific navigation options
5. `entries = activeEntityId ? allEntries[activeEntityId] || [] : []` filters entries by active entity

**Journal Entry Creation:**
1. User clicks "New Entry" button
2. `setShowNewJournal(true)` reveals JournalForm component
3. Form validates double-entry bookkeeping (debits = credits)
4. On save: `handleSaveEntry(entry)` 
5. Entry prepended to `allEntries[activeEntityId]` array
6. `addAuditLog()` records the action to audit trail
7. localStorage automatically persists via useEffect dependency on `allEntries`

**Filtering & Memoization:**
1. User sets search query or date range in dashboard/journals view
2. `filteredEntries` useMemo recalculates based on `searchQuery`, `dateFrom`, `dateTo`
3. Components subscribe to filtered entries for display
4. Financial metrics (revenue, expenses, net profit) recalculate from filtered set

**Persistence Pipeline:**
1. Any state change (entities, accounts, entries, auditLogs) triggers matching useEffect
2. useEffect serializes state to JSON and saves to localStorage
3. On app mount, initial useEffect reads localStorage and hydrates state
4. Fallback: if no data found, uses DEFAULT_ENTITIES

**State Management:**
- `entities: Entity[]` - All organization entities (companies, trusts)
- `accounts: Account[]` - Chart of accounts with tax mappings
- `allEntries: Record<string, JournalEntry[]>` - Entries per entity (entity ID → entries)
- `auditLogs: AuditLog[]` - System action history
- `selectedEntityIds: string[]` - For bulk operations on master dashboard
- `activeEntityId: string | null` - Currently selected entity
- `view: View` - Current page/component to display
- Filter state: `searchQuery`, `dateFrom`, `dateTo`

## Key Abstractions

**Entity:**
- Purpose: Represents a business entity (company, trust, sole trader)
- Examples: `src/types.ts`, used in `src/App.tsx` (DEFAULT_ENTITIES), passed to EntityCard and EntityForm
- Pattern: Immutable data structure with optional tax agent and internal notes

**Account:**
- Purpose: Chart of accounts entry with GST and tax return mappings
- Examples: `src/constants.ts` defines CHART_OF_ACCOUNTS
- Pattern: Accounts prefixed by type code (1-=Asset, 2-=Liability, 3-=Equity, 4-=Revenue, 6-=Expense)
- Contains dual tax classifications: individual income, company tax return, trust tax return labels

**JournalEntry:**
- Purpose: Double-entry bookkeeping transaction
- Examples: Created by JournalForm, stored in `allEntries` state
- Pattern: Contains array of JournalLines that must balance (sum(debits) = sum(credits))
- Includes metadata: date, reference, description, isPosted flag

**JournalLine:**
- Purpose: Individual debit/credit for a single account within an entry
- Examples: Lines within JournalEntry
- Pattern: Includes auto-calculated GST amount based on account's gstCode
- Three GST options: 'GST' (taxable), 'FRE' (free), 'N-T' (non-taxable)

**TrialBalanceRow:**
- Purpose: Aggregated account balance for reporting
- Examples: Computed in TrialBalance component
- Pattern: Debit/credit totals calculated from JournalLines, net balance depends on account type

## Entry Points

**Application Entry:**
- Location: `src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Mount React app to DOM, wrap with StrictMode

**Main App Component:**
- Location: `src/App.tsx` (default export)
- Triggers: Rendered by main.tsx
- Responsibilities: 
  - Manage all application state
  - Load/persist data from localStorage
  - Render header, sidebar, and view-specific content
  - Handle view navigation
  - Coordinate data changes across features

**Component Views:**
- Each view is a top-level conditional render in App.tsx
- Examples: `view === 'master-dashboard'` renders EntityCard grid, `view === 'journals'` renders JournalForm or journal table
- Components: TrialBalance, TaxReturnAssistant, CompanyTaxReturn, TrustTaxReturn, BasIasAssistant, ImportTB, SlideGenerator, EntityForm, AuditTrail, AccountManager

## Error Handling

**Strategy:** Form-level validation with user feedback; try-catch on localStorage operations

**Patterns:**
- Form validation in components (JournalForm, EntityForm): Real-time error state updates
- Double-entry verification: `isBalanced = Math.abs(totalDebits - totalCredits) < 0.001`
- Account balance reconciliation: Trial Balance shows "Balanced" or "Out of Balance" status
- localStorage fallback: `try { JSON.parse() } catch (e) { console.error() }` with defaults to prevent crashes

## Cross-Cutting Concerns

**Logging:** 
- Audit trail via `addAuditLog()` function - records CREATE_ENTITY, UPDATE_ENTITY, POST_JOURNAL, IMPORT_DATA actions
- Stores in auditLogs state and persists to localStorage
- User hardcoded as 'Tristan (Admin)' - could be parameterized

**Validation:**
- Form-level: JournalForm, EntityForm validate before submission
- Domain-level: Double-entry bookkeeping validation (debits = credits)
- Account-level: Account exists check when posting entries

**Authentication:**
- Not implemented; system assumes single user ("Tristan (Admin)")
- Sidebar shows "Connected to ATO (Simulated)" as placeholder for future integration

**Styling:**
- Global CSS in `src/index.css` defines design tokens: --bg, --ink, --line, --line-strong
- Tailwind CSS with @tailwindcss/vite plugin for Just-In-Time compilation
- Custom classes: `.col-header` (italic serif labels), `.data-value` (monospace figures), `.data-row` (table rows with hover)
- Mobile-first responsive design using `lg:` breakpoints for desktop layout shifts

---

*Architecture analysis: 2026-05-09*
