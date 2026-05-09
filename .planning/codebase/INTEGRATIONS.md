# External Integrations

**Analysis Date:** 2026-05-09

## APIs & External Services

**Google Gemini AI:**
- Gemini 3.5 Flash (Preview) - LLM for intelligent account mapping and financial slide generation
  - SDK/Client: `@google/genai` 1.29.0
  - Auth: `GEMINI_API_KEY` environment variable (injected by AI Studio at runtime)
  - Usage locations:
    - `src/components/SlideGenerator.tsx` - Generates 5-7 slide presentations from trial balance data
    - `src/components/ImportTB.tsx` - Maps external trial balance accounts to internal Chart of Accounts using structured JSON schema responses
  - Model: `gemini-3-flash-preview` (configured in ImportTB line 99)
  - Features:
    - Structured JSON response generation with Type.OBJECT and Type.ARRAY schemas (lines 103-115 in ImportTB)
    - Financial analysis and presentation generation
    - Account mapping with confidence scores

**ATO (Australian Taxation Office):**
- Status: Simulated/placeholder integration (see App.tsx line 526)
- Referenced as "Connected to ATO (Simulated)" in accountant mode status indicator
- Tax return data mappings defined but no actual ATO API integration implemented

## Data Storage

**Databases:**
- Not detected - Application uses browser localStorage only

**Local Storage:**
- `localStorage` browser API for persistent data storage:
  - `ledger_entities_list` - Entity master data (App.tsx lines 231-237)
  - `ledger_entries` / `ledger_all_entries` - Journal entries by entity (App.tsx lines 240-256)
  - `ledger_audit_logs` - System audit trail (App.tsx lines 258-265)
  - `ledger_chart_of_accounts` - Chart of Accounts configuration (App.tsx lines 267-274)
  - Data saved on state changes (App.tsx lines 277-294)

**File Storage:**
- Not applicable - Application is web-based with no file upload persistence beyond session
- File upload supported for trial balance import (ImportTB.tsx) but processed in-memory

**Caching:**
- useMemo hooks for computed financial calculations (App.tsx line 302, ImportTB derived from entries)
- No external caching service (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Custom/None - Application uses hardcoded user ("Tristan (Admin)") in audit logs (App.tsx line 351)
- No authentication system implemented
- No OAuth, JWT, or session management

**User Context:**
- Single hardcoded user identifier: "Tristan (Admin)" used in all audit log entries

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Rollbar, or similar service integrated

**Logging:**
- Browser console.error() for error logging (App.tsx lines 235, 244, 253, 262, 271; ImportTB line 134)
- Audit trail via in-app AuditLog tracking:
  - Actions tracked: CREATE_ENTITY, UPDATE_ENTITY, POST_JOURNAL, DELETE_JOURNAL, IMPORT_DATA
  - Stored in localStorage as `ledger_audit_logs`
  - Displayed in AuditTrail component (view 'audit-trail' in App.tsx)

**Analytics:**
- Not detected

## CI/CD & Deployment

**Hosting:**
- Cloud Run (Google Cloud Platform) - referenced in .env.example as target for APP_URL injection
- Vite development server: localhost:3000 (App.tsx and vite.config.ts line 6)

**CI Pipeline:**
- Not detected in repository files

**Build Process:**
- Vite build: `npm run build` generates dist/ directory for production
- No build configuration detected for Cloud Run container

## Environment Configuration

**Required Environment Variables:**
- `GEMINI_API_KEY` - Google Gemini API authentication token
  - Required for: SlideGenerator.tsx, ImportTB.tsx AI mapping
  - Injected at runtime by AI Studio user secrets, or set in `.env.local` for local development
  - Never committed (see .env.example line 4)
  
- `APP_URL` - Application deployment URL
  - Injected by AI Studio at runtime with Cloud Run service URL
  - Used for self-referential links, OAuth callbacks, API endpoints (though no actual OAuth implemented)
  - See .env.example line 9

**Optional/Inferred:**
- `DISABLE_HMR` - When set to 'true', disables Hot Module Replacement in dev server (vite.config.ts line 21)
  - Used in AI Studio to prevent flickering during agent edits

**Secrets Location:**
- `.env.local` file (development, not committed)
- AI Studio Secrets panel (production, injected at runtime)

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints implemented

**Outgoing:**
- Not detected - No outbound webhooks triggered

## File Upload/Processing

**Trial Balance Import:**
- Location: `src/components/ImportTB.tsx`
- Format: CSV files (parsed with regex split at line 51: `/,(?=(?:(?:[^"]*"){2})*[^"]*$)/`)
- Processing:
  1. File read via FileReader API (line 47)
  2. Column mapping configuration (lines 33-38, 60-74)
  3. CSV parsing and header skip (line 62)
  4. AI-powered account mapping via Gemini (lines 76-139)
  5. Conversion to JournalEntry objects (lines 141-150+)
- Output: JournalEntry[] passed to App.tsx onImport handler

## Data Export

**Slide Generation:**
- Location: `src/components/SlideGenerator.tsx`
- Format: Slide object array with title, content, speaker notes, key metrics
- Export: Download functionality UI element present (Download icon imported line 5)
- Process:
  1. Trial balance data aggregation (lines 29-51)
  2. Gemini AI prompt for 5-7 slide generation (lines 65-74+)
  3. JSON response parsing into Slide[] (parsed response at line unknown, typical pattern)

## Chart of Accounts Standards

**ATO Tax Return Integration:**
- Mapping to Australian Tax Office income tax return labels:
  - `taxLabel` field: '6S' (Business Income), '6K' (Interest), '6L' (Wages), '6N' (Other Expenses), etc.
  - Referenced in TaxReturnAssistant.tsx (line 38)
  
- Company tax return labels (companyTaxLabel):
  - '6A' (Sales), '6F' (Interest), '6C' (Superannuation), '6G' (Rent), '6X' (Other), '6S' (Total)
  - Used in CompanyTaxReturn component
  
- Trust tax return labels (trustTaxLabel):
  - '5B' (Sales), '11J' (Interest), '5F' (Rent), '5L' (Superannuation), '5M' (Wages), '5N' (Other), etc.
  - Used in TrustTaxReturn component

**GST/BAS Integration:**
- GST code mapping on accounts: 'GST', 'FRE' (Free), 'N-T' (Not taxable)
- BAS (Business Activity Statement) calculation in BasIasAssistant.tsx:
  - G1: Total sales
  - G3: GST-free sales
  - G10: Capital purchases
  - G11: Non-capital purchases
  - W1: Salary/wages
  - W2: PAYG withholding amounts

---

*Integration audit: 2026-05-09*
