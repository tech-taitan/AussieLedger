---
phase: 6
slug: personas-wizard-and-deployment
type: context
status: ready-for-planning
created: 2026-05-28
discussed_areas: [wizard-flow, persona-modes, explain-ux, public-release]
---

# Phase 6: Personas, Wizard, and Deployment — Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 6 makes the prototype publicly usable by both audiences (small-business owner + tax agent), closes the loop with a finalisation wizard that walks a non-accountant from "year-end" to "print this and lodge it", surfaces anomalies and ATO label help in-context across every screen, and produces a clone-and-run open-source release (Apache 2.0 LICENSE, CONTRIBUTING.md, dual-shape README).

**In scope:**
- **Year-end wizard** (`src/components/YearEndWizard.tsx` + step components) covering: FY+entity confirmation → unreconciled review → CoA GST-code confirm → unmapped-accounts gate → preview (embedded Phase-5 renderer) → attestation (checkbox + typed entity-name) → finalise. Top-level sidebar entry "Year-End" + "Start year-end" CTA on the entity dashboard. Wizard state persists per-FY on the Entity so a session-spanning user can resume where they left off.
- **Finalise lifecycle**: `Entity.returnStatusByFy[fy] = 'draft' | 'finalised'` + finalised-FY data lock (post-finalise journal edits in that FY require "reverse and re-post" via the Phase-4 supersession workflow). Unfinalise button on the entity with the same typed-entity-name attestation friction; audit log captures both finalise and unfinalise events.
- **Persona modes** (`src/lib/persona.ts` + Settings page) — `Settings.mode: 'owner' | 'agent'`. First-run modal on initial load asks "Are you running your own business, or do you manage clients?" Owner mode hides the entity switcher and bulk-ops chrome entirely and lands on the primary entity dashboard (auto-selected when exactly one entity exists; settable via radio when there are multiple). Agent mode lands on a multi-client list with per-client wizard-status badges ("FY26: ready to finalise", "FY26: 3 unmapped accounts") and a recent-clients quick-switch. No bulk operations in v1.
- **In-context anomaly UI**: reuse existing `AnomalyBadge` (Phase 5) on `JournalForm`, `TrialBalance`, and `CoaTreeView`. App-level surfacing via number badges on relevant Sidebar items ("Journals 3", "Accounts 2"). Anomaly sources: unbalanced journal entries, unmapped accounts referenced in posted entries, GST code mismatches between linked accounts, accounts missing tax-label mappings.
- **ATO label help**: hover tooltip on screen ("?" icon next to each label) → 1–3 sentences of plain English. Print rendering expands the tooltip text inline under the label so a printed working paper is self-explanatory. Source: hard-coded `helpText` field added to each label entry in `src/lib/tax/labels/fy2026.ts` (widens the existing structure additively).
- **Mobile responsiveness** (UX-04): JournalForm, TrialBalance, return preview work at 375px. Wizard inherits responsive from these. Other screens (CoaTreeView, ImportTB, multi-entity grid) get a "use a wider screen" responsive fallback or read-only degraded view.
- **Open-source release**: root `LICENSE` (Apache 2.0 full text matching per-file SPDX headers), `CONTRIBUTING.md` (dev setup, test guidance, the hard schema-migration rule, how to add a new FY using the per-FY module pattern from Phase 5, PR template), README rewrite (audience-first: "what this is" → quick start → two deployment shapes → how it works → contributing), AI-feature gating that renders a visible "requires Gemini API key (optional)" affordance in the UI when `GEMINI_API_KEY` is absent (not silently hidden).

**Out of scope (deferred to v2 / later):**
- Direct ATO / myGov lodgement API
- CGT cost-base / depreciation engines
- FBT (Fringe Benefits Tax)
- Bulk cross-entity operations in agent mode (mass FY rollover, cross-client anomaly review)
- Family Medicare levy thresholds (dependant-child count, spouse income shading) — Phase 6 wizard surfaces the existing flat-2% warning; full family-threshold engine = v2
- Multi-FY catch-up wizard (preparing two FYs at once)
- Per-user help-text overrides
- Live-fetched ATO instruction text
- CODE_OF_CONDUCT.md + SECURITY.md (left to roadmap backlog; LICENSE + CONTRIBUTING satisfy DEP-04 strictly)
- Anomaly fix-it deep-links (clicking a Sidebar count badge jumps the user to the offending row) — planner may include this if cheap; not required for success
- Trust streaming UI (sharePerType editing)
- Non-portfolio dividend BRE exception explicit per-account flagging

</domain>

<decisions>
## Implementation Decisions

### Year-end wizard flow (8 sub-decisions)

- **Unmapped-accounts gate = hard block on Finalise only, not on step advancement.** The user can step freely through the wizard and preview the (incomplete) return without resolving every unmapped account; the "Finalise" button stays disabled until all are resolved. This lets a curious user see roughly what their return will look like before being forced into decisions. The unmapped-accounts step shows the count and lists each one with a "Map this account" inline action that opens the CoA mapper.
- **Finalise = lock the FY data + flag the entity for that FY as finalised.** Writes `Entity.returnStatusByFy[fy] = 'finalised'`. Post-finalise journal edits in that FY are blocked at the JournalForm level; the user is shown the "reverse and re-post" workflow (already shipped in Phase 4 via `useJournals.reversePosted`). This is the accountant-correct pattern and matches the success criterion's "until all unmapped accounts are resolved" intent.
- **Attestation = checkbox + typed entity legal name.** Two-part attestation: (1) checkbox "I confirm these are genuine business expenses and the figures match my records" + (2) text field where the user types the entity's legal name exactly (case-insensitive match). Friction is the point — finalisation is the lodgement-bound moment. Matches the Phase-3 export-replace-dialog friction pattern.
- **Preview step embeds the Phase-5 renderer inline.** The wizard "Preview" step renders the appropriate `TaxReturnAssistant` / `CompanyTaxReturn` / `TrustTaxReturn` / `PartnershipTaxReturn` / `BasIasAssistant` component inline (or `BasIasAssistant` for the BAS pre-finalise check). "Print working paper" button stays visible. Zero new render code; the wizard is a thin orchestrator around existing Phase-5 outputs.
- **Unfinalise allowed with the SAME attestation friction as finalise.** "Unfinalise FY 2026" button on the entity (only visible when the FY is finalised) requires typed-entity-name confirmation. Both finalise and unfinalise events are written to the audit log with timestamp + user. Pragmatic for non-accountant users who realise a mistake after stamping; symmetry of friction makes accidental unfinalise unlikely.
- **Wizard nav = top-level sidebar entry "Year-End" + CTA on entity dashboard.** Two entry points: persistent sidebar item (always findable, persona-mode-respecting — in owner mode shows "Year-End for [Entity Name]"; in agent mode shows the client picker first), plus a prominent "Start year-end" CTA on the entity dashboard for owner mode (satisfies PERS-01 "one click away").
- **Wizard state persists per-FY on the Entity.** `Entity.wizardState[fy] = { step: number, dismissedAnomalies: string[], completedAt?: string, ... }`. Non-accountant mental model: "I'll finish this Sunday." The user closes the tab and resumes at the same step with the same dismissed anomalies on next visit. Schema field is additive in v4→v5 migration (or part of the v5 widening that includes `returnStatusByFy`).
- **Step 1 framing = "Confirm FY + entity + bookkeeping completeness."** Plain-English question: "You're preparing FY 2025-26 for [Entity Name]. Have you finished entering all transactions for the year?" with single yes/no + a quick stats line ("Last journal entry: 14 days ago. 3 unreconciled items remain."). Sets the FY-scoped mental frame for first-time users.

### Persona modes (4 sub-decisions)

- **Toggle lives in Settings + first-run modal.** On initial app load (no `Settings.mode` set), show a modal: "Are you running your own business, or do you manage clients for others?" Two large buttons set `mode` to `'owner'` or `'agent'`. Later changes via Sidebar > Settings > Mode. PERS-03 "per-instance setting" satisfied by storing on the StorageAdapter root (alongside `entities[]`, `accounts[]`, etc.) — not per-entity.
- **Owner mode hides entity switcher + bulk-ops UI entirely.** Strong simplification. The Sidebar drops the "Entities" item; the Header drops the entity selector dropdown. User sees only "Dashboard / Journals / Accounts / Year-End / Data / Settings" pointing at their single primary entity. If the user later adds a second entity (via Settings > Entities), the app prompts a mode-switch suggestion (one-time non-blocking banner).
- **Agent mode = multi-client list + per-client wizard-status badges + recent-clients quick-switch.** Landing is a list view showing each entity as a card with: name, FY status badges ("FY26: ready to finalise" / "FY26: 3 unmapped" / "FY26: not started"), last-activity timestamp. Top-bar adds a "Recent" dropdown with the last 5 entities visited for fast switching. No bulk operations in v1 — keeps scope tight.
- **Primary entity selection = auto when one exists, radio in Settings when multiple.** If exactly one entity exists in storage and mode = owner, that entity is automatically primary. If multiple entities exist, Settings > Mode shows a radio list "Which entity is your primary?" Defaults to the first-created. The dashboard route resolves `primary entity` via this rule.

### In-context "explain" UX (4 sub-decisions)

- **Reuse Phase-5 `AnomalyBadge` component on non-tax screens.** Single visual language across the app — yellow pill, inline next to the affected field/row on JournalForm (unbalanced check), TrialBalance (unmapped-account row highlight), CoaTreeView (missing GST code / missing tax-label mapping). Severity stays `'info' | 'warn'` (no `'error'` variant in v1); blocking behaviour is enforced at the wizard finalise gate, not via badge colour. Consistency means the user who learned what yellow means on a tax return knows what it means on a journal entry.
- **App-level anomaly count = number badge on relevant Sidebar items.** "Journals 3" / "Accounts 2" appears next to the Sidebar item when that screen has open anomalies. Mirrors the Gmail-unread-count pattern. Each badge count is computed in real time from the same anomaly source (no separate persisted counter). No top-bar bell, no dashboard issues-card in v1.
- **ATO label help = hover tooltip on screen + always-expanded inline on print.** On screen: a small "?" next to each label reveals 1–3 sentences of plain English on hover (Radix/headless tooltip primitive; need to verify React 19 compat at planning time). On print: every label's help text is rendered inline (small subtitle below the label code/name) so the printed working paper is self-explanatory to a tax agent looking at it cold. Help text NEVER states whether an expense is deductible (UX-03 success criterion).
- **Help text source = hard-coded `helpText` field on label entries in `src/lib/tax/labels/fy2026.ts`.** Widens the existing structure additively — every label entry gains an optional `helpText: string` field. Help drafted by Claude during planning (against ATO instructions for the relevant NAT form) and reviewed by the user. Single source of truth, version-controlled, lives next to the label code it explains. Help drift = a code-review-able PR. No live ATO-instruction fetching in v1.

### Public release scope (4 sub-decisions)

- **Mobile responsiveness = JournalForm + TrialBalance + return preview at 375px** (verbatim from UX-04). Other screens (CoaTreeView, ImportTB, multi-entity grid) get a "use a wider screen" responsive fallback (read-only views where possible; a friendly placeholder otherwise). The wizard inherits responsive from the embedded renderers. Tailwind responsive classes; no separate mobile components.
- **LICENSE + CONTRIBUTING = Apache 2.0 full text + dev/test/migration guide + PR template.** Root `LICENSE` is the full Apache 2.0 text (matches per-file SPDX headers locked in Phase 1+). `CONTRIBUTING.md` covers: (1) how to run dev (single-user `npm run dev` vs full-stack `npm run dev:full`), (2) how to add tests (vitest patterns established in Phase 1), (3) the **hard schema-migration rule** ("every schema change must be additive + reversible round-trip; a v{N}→v{N+1} migration test is required"), (4) how to add a new FY using the per-FY module pattern from Phase 5 (`src/lib/tax/returns/fy{NNNN}/*` + `src/lib/tax/rates/fy{NNNN}/*`), (5) PR template in `.github/PULL_REQUEST_TEMPLATE.md`. No CODE_OF_CONDUCT.md or SECURITY.md in this phase (roadmap backlog).
- **README rewrite = audience-first.** Top: "What this is" (2 sentences each for owner audience + tax agent audience). Quick start (5-line clone+install+build sequence to satisfy DEP-01). Two deployment shapes (single-user local `npm run dev` and small-firm VPS `npm run dev:full` + `npm run build:server` with reverse-proxy notes) to satisfy DEP-03. "How it works" (data-flow summary: persistence layer, tax engine, print working paper). "Contributing" section pointing to CONTRIBUTING.md. Sells the project to both audiences before showing them the install command.
- **"Fully working with no paid services" = AI features visibly gated + clearly labelled.** When `GEMINI_API_KEY` is absent: the AI-assist surfaces in ImportTB show a non-intrusive "AI suggestions disabled — add a Gemini API key to enable (optional)" inline note rather than just hiding the affordance. The user can see what's possible. README documents how to add the key if wanted. All non-AI flows work exactly the same. Phase 3's `IS_AI_ENABLED` runtime check is the gating mechanism; Phase 6 only adds the UI affordance.

### Claude's Discretion

- Exact wizard step list (whether "preview" is one step or split into "preview + review anomalies"), exact micro-copy for tooltips and modal prompts, exact Sidebar layout under owner vs agent modes, exact mobile breakpoints (probably Tailwind's `sm:` / `md:` defaults), exact PR-template fields, exact CONTRIBUTING.md tone, exact step-1 "stats line" content.
- Tooltip mobile behaviour (tap-to-toggle on touch screens vs hover on desktop) — planner picks based on the headless tooltip primitive's defaults.
- Whether anomaly Sidebar badges are click-jumpable to the offending row ("fix me deep-links") — nice-to-have if cheap; not required.
- Whether the first-run modal can be re-triggered from Settings ("Show me the mode prompt again") — planner picks.
- Whether the "wizard CTA on entity dashboard" is a hero card or a banner — planner picks based on dashboard density after Phase 5.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 6 scope + prior decisions
- `.planning/PROJECT.md` — Vision (non-intimidating, guided wizards, smart defaults), audience definition (small-business owners + small-firm tax agents)
- `.planning/REQUIREMENTS.md` §UX, §Personas, §Deployment — UX-01..05, PERS-01..03, DEP-01/03/04 acceptance criteria
- `.planning/ROADMAP.md` — Phase 6 entry with goal + 5 success criteria
- `.planning/phases/05-tax-outputs/05-CONTEXT.md` — Phase 5 decisions that bound Phase 6 (no PDF library, AnomalyBadge interface, `returnStatusByFy` deferred-to-Phase-6, family Medicare levy deferred-to-wizard, multi-FY rate switching deferred)
- `.planning/phases/03-durable-persistence/03-CONTEXT.md` — StorageAdapter interface (Phase 6 reads `Settings.mode` through it), AI gating mechanism (`IS_AI_ENABLED`)
- `.planning/phases/04-bookkeeping-core/04-CONTEXT.md` — `useJournals.reversePosted` workflow (Phase 6 post-finalise edits route through this), CoA + GST code structure (anomaly sources)

### Existing code Phase 6 must consume / extend
- `src/components/AnomalyBadge.tsx` — Phase 5 component reused on non-tax screens
- `src/components/shell/{Sidebar,Header,BottomNav,MainLayout}.tsx` — persona mode toggles which items render; mobile responsiveness lives here
- `src/components/MasterDashboard.tsx` + `src/components/EntityCard.tsx` — agent-mode landing reuses; owner-mode bypasses
- `src/components/ViewRouter.tsx` — wizard becomes a new top-level route; persona mode gates landing
- `src/components/AssumptionsBlock.tsx` — wizard attestation pattern can reuse
- `src/components/{TaxReturnAssistant,CompanyTaxReturn,TrustTaxReturn,PartnershipTaxReturn,BasIasAssistant}.tsx` — embedded into wizard preview step
- `src/lib/tax/labels/fy2026.ts` — widen additively with `helpText` field per label
- `src/lib/tax/returns/fy2026/{individual,company,trust,partnership,bas,ias}.ts` — emit anomalies that surface in-context (already done in Phase 5)
- `src/components/{JournalForm,TrialBalance,CoaTreeView}.tsx` — add inline `AnomalyBadge` renders
- `src/types.ts` + `src/lib/schemas.ts` — v4→v5 additive widening: `Entity.returnStatusByFy?`, `Entity.wizardState?`, root `Settings.mode?`, `Settings.primaryEntityId?`
- `src/lib/migrations/v4-to-v5.ts` — new additive migration
- `src/lib/ai.ts` — already exports `IS_AI_ENABLED`; UI affordance reads this
- `src/components/ImportTB.tsx` — AI-disabled inline note added here
- `package.json` — Apache-2.0 SPDX header pattern (must match LICENSE file)
- `README.md` (current 161-line file) — rewrite target

### External documentation
- ATO Individual tax return instructions 2025-26 (NAT 2541) — source for Form I label help text drafts
- ATO Company tax return instructions 2025-26 (NAT 0656) — source for Form C label help text
- ATO Trust tax return instructions 2025-26 (NAT 0660) — source for Form T label help text
- ATO Partnership tax return instructions 2025-26 (NAT 0659) — source for Form P label help text
- ATO Simpler BAS instructions — source for BAS G1/1A/1B/W1/W2/T7 label help text
- Apache License 2.0 full text (https://www.apache.org/licenses/LICENSE-2.0.txt) — for root LICENSE file

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AnomalyBadge.tsx` (Phase 5) — yellow-pill component; reused inline on JournalForm, TrialBalance, CoaTreeView. Same `Anomaly` interface (`{ id, severity, label?, message }`).
- `AssumptionsBlock.tsx` (Phase 5) — pattern for attestation rendering; wizard attestation can mirror its structure.
- Shell components — `MainLayout` / `Sidebar` / `Header` / `BottomNav` are the right insertion points for persona-mode-aware nav and Sidebar anomaly count badges.
- `MasterDashboard` + `EntityCard` — agent-mode landing is essentially these with status badges added.
- `ViewRouter` — wizard becomes a new route; mode-gated landing redirect lives here.
- `useJournals.reversePosted` (Phase 4) — the workflow finalised-FY edits route through.
- `IS_AI_ENABLED` (Phase 3) — runtime check the AI-disabled inline note reads.

### Established Patterns
- **Additive schema migrations** with round-trip tests (Phase 3 STM, Phase 4 v2→v3, Phase 5 v3→v4) — Phase 6 v4→v5 follows the same shape.
- **Audit log emission** on user-finalisable actions (Phase 3 export, Phase 5 print) — finalise / unfinalise emit audit events.
- **Pure-function tax engine** (Phase 5) — wizard does NOT add tax logic; it orchestrates Phase-5 compute functions and renders Phase-5 components.
- **Per-FY label module** (Phase 5) — `helpText` widening is additive to existing `fy2026.ts`; future FY modules inherit the pattern.
- **Hard-block UI gates** with friction (Phase 3 export-replace, Phase 4 archive-vs-delete) — wizard finalise gate mirrors this.

### Integration Points
- New route: wizard mounted in `ViewRouter.tsx` (probably `/year-end/:entityId/:fy`).
- New settings page: `Settings.tsx` for mode + primary entity radio + first-run modal trigger.
- StorageAdapter widening: `Settings` becomes a new top-level collection (alongside `entities`, `accounts`, `entries`, `auditLogs`).
- Sidebar widening: persona-mode-aware item list + per-item anomaly count badges.
- Print rendering: existing print.css gets additive rules to expand `helpText` inline (was tooltip on screen, inline on print).

</code_context>

<specifics>
## Specific Ideas

- "Reverse and re-post" pattern from Phase 4 is the post-finalise correction workflow (no new mutation path needed).
- Phase-3 export-replace dialog is the friction template for finalise + unfinalise attestation.
- Sidebar item count badges follow the Gmail unread-count pattern (number-in-pill next to item label).
- README structure should sell to both owner and agent audiences in the first paragraph (matches PROJECT.md vision statement).
- Help text is drafted by Claude against the named ATO instructions PDFs at planning time and committed alongside the label entries — review by user before plan-execute.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk operations in agent mode** (mass FY rollover across clients, cross-entity anomaly review) — would be its own phase; agent firms managing 20+ clients are not the v1 audience.
- **Family Medicare levy threshold engine** (dependant-child count, spouse income, low-income family shading) — Phase 5 deferred this; Phase 6 surfaces the existing flat-2%-with-warning behaviour but does NOT add a wizard step for family thresholds (would require new Entity schema fields). v2.
- **Multi-FY catch-up wizard** (preparing two FYs at once for a user who fell behind) — out of scope; user runs the wizard twice.
- **Per-user help-text overrides** — over-engineered for v1.
- **Live-fetched ATO instruction text** (rather than hard-coded) — brittle; v2 if a stable ATO API surface exists.
- **CODE_OF_CONDUCT.md** + **SECURITY.md** — strict-DEP-04 satisfied by LICENSE + CONTRIBUTING only; community-process docs added when the project has external contributors.
- **Anomaly fix-it deep-links** (clicking a Sidebar count badge auto-scrolls to the offending row) — nice-to-have if cheap during planning; not a success criterion.
- **Anomaly severity 'error' variant** (red, blocks save) — blocking behaviour stays at the wizard finalise gate; in v1 no badge is itself a save-blocker.
- **First-run modal re-trigger from Settings** ("Show me the mode prompt again") — planner discretion.
- **Direct ATO / myGov lodgement** — explicitly v2+.
- **Top-bar anomaly bell + global dropdown** — Sidebar count badges cover the same need with less chrome.

</deferred>

---

*Phase: 06-personas-wizard-and-deployment*
*Context gathered: 2026-05-28*
