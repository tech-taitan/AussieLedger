# Feature Landscape: v1.2 UX Patterns

**Domain:** Publicly-hosted IndexedDB SPA — Australian accounting tool
**Researched:** 2026-05-31
**Milestone:** v1.2 — Public Hosting + IndexedDB Hardening + Open-Source Release Polish

---

## Classification Key

- **TABLE STAKES** — Missing = product feels broken or untrustworthy for a public URL
- **DIFFERENTIATOR** — Adds real value; not universally expected; worth shipping if time permits
- **DEFER** — Good idea; belongs in a later milestone; v1.2 ships without it
- **ANTI-FEATURE** — Explicitly do NOT build; causes harm or contradicts project values

---

## 1. First-Visit UX for a Hosted IndexedDB SPA

**Classification: TABLE STAKES (welcome/trust message) + DIFFERENTIATOR (demo CTA)**

### What real tools do

**Excalidraw** ships a `WelcomeScreen` component that renders when the canvas is empty. It shows: logo, heading, a short menu of quick actions (load file, start collaborating, open help), and UI hints (toolbar hint, menu hint, help hint). Once the user draws anything, the welcome screen disappears — it is not a modal, does not block the canvas, and is canvas-native rather than overlaid HTML. Crucially, Excalidraw does NOT show a "create an account" wall; the canvas is immediately live.

**tldraw** takes the same zero-friction stance: the infinite canvas is immediately interactive; no account required; no modal. Their demo server is documented but is not pushed on first visit.

**Obsidian** (desktop, not web but instructive): first launch presents "Create new vault" — one decision, then a blank canvas. No pre-loaded sample notes. Users who wanted examples searched third-party guides; Obsidian judged the blank-slate as correct for power users. The tradeoff: "handed keys to a spaceship without the instruction manual" (real user quote from community).

**Standard Notes** (web SPA): requires account creation before use — the opposite model. The trust message ("end-to-end encrypted, no one can read your notes") appears on the sign-in page as a left-panel trust block. The privacy story leads.

### Implication for AussieLedger v1.2

AussieLedger's first-visit has two problems Excalidraw/tldraw do not: (a) the app is worthless with zero entities — unlike a drawing canvas, a blank ledger does nothing; (b) a new visitor has no reason to trust tax data to IndexedDB on a URL they just found.

The correct first-visit pattern is therefore:

1. **Inline trust banner** (not modal) at the top of the empty-state screen: "Your data lives entirely in this browser — nothing is sent to a server. Export a JSON backup at any time." This is TABLE STAKES — without it, users will not enter real financial data.

2. **Two-CTA empty state** (Excalidraw-style, not a blocking modal):
   - Primary: "Create your first entity" — direct entry into the product
   - Secondary: "Try with sample data" — links to `/demo`
   This is DIFFERENTIATOR but pushes toward TABLE STAKES because without some path to value, cold-start bounce rate is high.

3. **No inline product tour / step-by-step wizard on first visit** — DEFER. The year-end wizard already serves as guided flow once inside. An onboarding overlay before the user has even seen the UI is friction, not help.

### v1.2 default

Ship the inline trust banner + two-CTA empty state. Do not ship a step-by-step tour.

---

## 2. Backup-Nag Patterns

**Classification: TABLE STAKES (some backup-nag) — the least-annoying variant only**

### Patterns in the wild

| Pattern | Example tool | Characteristic |
|---|---|---|
| Per-session nag | Many password managers | Shows every session if no backup today; high annoyance |
| Day-based threshold | iCloud backup reminder | Fires after N days since last backup; predictable |
| Volume-based | Git — "you have N unpushed commits" | Fires after meaningful data accumulation |
| Pre-close interrupt | Browser "are you sure?" | `beforeunload` dialog; reserved for unsaved work, not backup |

**Day-based is the correct default for tax data.** Tax data changes infrequently (unlike a diary app); a user who posted journals yesterday may not post for a week. A per-session nag would fire every day even with no data change, which is the annoyance pattern that makes users dismiss-and-ignore nags.

**The pre-close interrupt** (`beforeunload`) is already planned for v1.2 as a "unsaved writes since last export" guard (see ARCHITECTURE.md §6). That is the correct use of the pre-close pattern. A separate backup-nag on `beforeunload` would be a second dialog competing with the first — do not do this.

**Carbon Design System / LogRocket UX research:** Toast-based nags should be used for low-priority, non-blocking alerts. Duration > 6–10 seconds. Must be dismissible. Must not stack with other toasts. One backup-nag per session, never per action.

### Recommended pattern for v1.2

- **Trigger:** App load, after adapter resolves
- **Condition:** `lastExportAt` is null (never exported) OR `now - lastExportAt > 7 days`
- **Suppressed if:** snooze timestamp in `localStorage` (`aussieledger:backup-nag-snoozed-until`) is in the future
- **Delivery:** existing `Toast` primitive with `tone='warn'`, duration 12 000 ms, with "Snooze 7 days" as a secondary action inside the toast
- **Snooze duration:** 7 days
- **Volume limit:** never fire more than once per app load; never stack with other toasts

The ARCHITECTURE.md already specifies this implementation (`useBackupNag` hook). This section confirms the UX classification: it is TABLE STAKES because IndexedDB data is at real risk of browser eviction, and the user must be informed.

### Anti-pattern to avoid

Do NOT fire the backup nag after every journal post, after every save, or on every page navigation. Tools that do this (some note apps) train users to dismiss without reading.

---

## 3. User-Supplied AI Key UX

**Classification: TABLE STAKES (some affordance must exist) — Settings-page location is the right call**

### Where real tools put credential configuration

**Linear:** API keys live in Settings > Security > API Keys. The flow is: navigate to settings, click "Create key", give it a name, copy. Keys are never shown after creation. Validation is implicit (if the key is wrong, API calls fail with a 401 and the UI shows the error in context).

**OpenAI-based tools (community patterns, 2023–2025):** The dominant pattern for "bring your own key" tools is a Settings page with a password-type input (`type="password"` to obscure the key), a "Save" button, and a "Test" button that makes a minimal live API call (e.g. list models) and shows a green checkmark or red error inline. The key is stored in `localStorage`. Multiple third-party tools (ChatPDF, tldraw AI integrations) follow this pattern. The key is documented as "stored only in this browser, never sent to our servers."

**1Password / browser password managers:** The "paste into a password field" affordance is well-understood by users. Using `type="password"` is the correct input type; it signals "this is a secret" and triggers password manager auto-fill in some contexts.

### What NOT to do

Do not put the key-paste UI inline in `AiGateNote.tsx` itself. `AiGateNote` is rendered in `ImportTB` which is a feature-specific screen. A user who configures their key there would reasonably believe the key only applies to that import screen. The key is global. Settings is the correct home.

Do not render a "configure AI" modal on first visit for hosted users. AI is optional; the core accounting workflow works without it. Surfacing AI configuration before the user has even created an entity is premature.

### v1.2 default

- **Location:** Settings page, new "AI (Optional)" section
- **Input:** `type="password"` field, placeholder `AIza…`
- **Validation:** live test call on save — call `generativelanguage.googleapis.com/v1beta/models?key=KEY`; show inline green/red result; do not block save on failure
- **`AiGateNote` on hosted mode:** replace the `.env.local` instruction with a link: "Add your Gemini key in Settings to enable (optional, free tier available)." — button navigates to Settings scrolled to the AI section
- **Security disclosure:** one-line note below the input: "Your key is stored only in this browser. It is never sent to our servers."
- **Clear key:** "Remove key" link next to the saved key indicator

This matches the ARCHITECTURE.md §7 recommendation; this section adds the UX classification and the validation pattern.

---

## 4. Demo Mode / Sample Data

**Classification: DIFFERENTIATOR — ship `/demo` route with separate IDB namespace**

### Precedents

**Excalidraw:** No `/demo` route. The empty canvas is effectively the demo. But Excalidraw's value is immediately visible with any scribble; AussieLedger's value requires accounts, journals, and tax data to be present.

**Notion:** "Duplicate to my workspace" pattern on public template pages. Separate namespace by design (your workspace vs. the template workspace).

**tldraw examples site** (`examples.tldraw.com`): a separate domain/route with pre-populated canvases. Clean isolation from user data.

**Standard Notes:** No public demo — account required. Not a useful precedent here.

**Anytype:** Ships with a "Getting Started" set of objects pre-loaded in the first vault. These are in the same namespace as user data but are deletable. Disadvantage: users accidentally overwrite or confuse demo data with real data.

### The IDB namespace isolation argument

`/demo` must use a separate IDB database name (e.g. `aussieledger-demo` vs `aussieledger`). Reasons:
1. A user visiting `/demo` after already having real data at the root URL must not risk overwriting their books.
2. Demo data should be resettable — a "Reset demo" button can simply delete and recreate the `aussieledger-demo` database. Real data is untouched.
3. The existing `LocalAdapter` accepts a database name parameter — this is a configuration-level change, not an architectural one.

### What demo data should contain

One anonymised sample entity: a sole trader (individual) with a plausible FY2025-26 trial balance, a handful of adjustment journals, and a completed tax return. This makes every major feature demonstrable in one entity. Avoid a trust, company, and partnership in demo — too much surface area; harder to maintain.

### v1.2 default

Ship `/demo` with an isolated IDB namespace and a pre-seeded sole-trader entity. Add a visible "Demo Mode — your changes here won't affect your real data" banner in the demo route. Include a "Back to real app" link.

### What to defer

Multi-entity demo data (DEFER — adds maintenance burden). Auto-reset demo data on every visit (DEFER — disorienting if user makes meaningful changes during exploration).

---

## 5. Self-Host vs Hosted-URL Signposting in README

**Classification: TABLE STAKES for v1.2 README rewrite**

### How analogous tools frame it

**Joplin README (GitHub):** Opens with the product description, then immediately lists download options for every platform. "Offline first" is the lead value proposition — data lives on the device. Self-hosting the sync server is documented under a separate "Self-Hosting" section, clearly secondary to "use the app."

**Standard Notes README / website:** Two-tier framing: "Use Standard Notes free at app.standardnotes.com" (hosted, account required) vs "Self-host the server" (for organisations/power users). The hosted URL is the primary CTA; self-hosting is explicitly advanced.

**Plausible Analytics README:** Top of fold: "Try the cloud version at plausible.io" — one prominent hosted CTA. "Self-hosted community edition" is a secondary section further down. Both are first-class but the hosted path is the easier path and is led.

**Anytype:** "Download the app" as primary CTA; no web-hosted version. Not a useful precedent for a web SPA.

### Pattern that fits AussieLedger v1.2

AussieLedger's v1.2 README should follow the Plausible/Standard Notes pattern, adapted:

1. **Top fold (first 8 lines):** Product tagline + "Try it at [URL]" as primary CTA. This is the "zero friction" path for the target audience (small business owner who Googled "free Australian tax return software").

2. **Second section:** "Or clone and self-host in 5 minutes" with the existing `npm install && npm run dev` steps. This serves the developer/accountant-firm audience.

3. **Privacy assurance in the README intro:** One sentence: "All data lives in your browser — nothing is stored on our servers." This is a trust signal for the hosted-URL user before they even open the app.

4. **`npm run dev:full` section:** Keep unchanged for the SQLite/Express shape. Frame it as "team/VPS use case."

Do NOT bury the hosted URL. Do NOT make self-hosting the primary path. The milestone goal is "anyone can use it in a browser."

---

## 6. Privacy Disclosure on Hosted SPA

**Classification: TABLE STAKES — must exist before real user data is entered**

### Legal context (Australia + GDPR-adjacent)

AussieLedger stores no personal data on a server, sets no cookies, uses no third-party analytics. The Australian Privacy Act 1988 requires a privacy policy if the organisation collects personal information — but since no personal information is collected server-side, the obligation is minimal. However, the user does not know that on first visit.

**The cookie-banner question has a clean answer:** no cookies = no banner required under GDPR/PECR/Australian ePrivacy. Verifying: `navigator.storage.persist()` uses browser storage APIs, not cookies. `localStorage` is not a cookie. IndexedDB is not a cookie. No cookie consent banner is needed or appropriate. (Source: iubenda GDPR guidance — cookies that are "strictly necessary" are exempt; all other cookies require consent. Here there are no cookies at all.)

### Trust signal patterns

**Excalidraw:** No privacy modal on first visit. Privacy policy linked in footer. The "local-first" story is implicit — there is no server receiving your drawings by default.

**Standard Notes:** Privacy story is front-and-centre on the homepage but delivered via marketing copy, not a modal. The trust message is: "Your notes are end-to-end encrypted. No one can read them but you."

**tldraw:** No first-visit privacy modal. Privacy policy in footer. The "no account needed" implicit trust signal.

**Plausible:** Privacy page at `plausible.io/privacy` linked from footer. Homepage marketing leads with "no cookies, no personal data."

### v1.2 default

- **No on-load privacy modal.** Modals on first visit are high-friction and signal "we need to cover ourselves legally" which paradoxically reduces trust. This is a tool with no server-side data; the privacy story is actually good.
- **Footer privacy link:** Simple one-page `/privacy` route (or anchor) that explains: "Your data never leaves your browser. AussieLedger collects no personal information. No cookies are used. See how your data is stored."
- **Inline trust sentence on the first-visit empty state:** "All data stays in your browser — export a JSON backup any time." One sentence, not a modal. This is the highest-value trust signal placement (where users make the decision to enter real data).
- **No "Powered by [host]" badge:** ANTI-FEATURE (see section 9).

---

## 7. Browser Compatibility Messaging — `navigator.storage.persist()` on Safari iOS

**Classification: TABLE STAKES — must degrade gracefully, not silently**

### Current browser support (2025–2026)

Per the WebKit blog post "Updates to Storage Policy" (webkit.org/blog/14403, Safari 17.0):

- Safari iOS 17+ supports `navigator.storage.persist()` and `navigator.storage.estimate()`
- The persist grant heuristic on Safari iOS is: the site must be **added to the Home Screen** as a PWA, or be a frequently visited site. A cold-visit user at a new URL will likely be denied the persist grant.
- Chrome/Chromium: grants persist more liberally, often on first visit for sites with user engagement signals
- Firefox: grants persist if the user has bookmarked the site or set it to "always allow"

### Implication

`navigator.storage.persist()` returning `false` on Safari iOS is expected and common for new visitors. It does not mean IDB is unavailable — it means the browser may evict the IDB data under storage pressure.

### The three options

| Option | Consequence |
|---|---|
| Silent degradation | User on Safari iOS enters months of tax data; Safari evicts it under storage pressure; data lost; user furious |
| Hard refuse / block Safari iOS | Shuts out ~27% of Australian mobile browser share (StatCounter AU 2025: Safari iOS ~27%); unacceptable |
| Graceful warn | Tell the user the risk; recommend action (install as PWA or use desktop Chrome); do not block |

**Graceful warn is the only acceptable choice.**

### v1.2 default

In `DataPage.tsx`, where quota and persist status are already displayed (ARCHITECTURE.md §4):

- If `persistGranted === false` AND `userAgent` suggests iOS Safari: show an inline warning:
  "Storage is not protected on this browser. Add AussieLedger to your Home Screen (iOS: Share > Add to Home Screen) for persistent storage, or use Chrome/Firefox on desktop. **Back up regularly using the Export button.**"

- If `persistGranted === false` but not iOS (e.g. desktop Firefox, new visit): show a softer note:
  "Storage persistence not granted. Bookmark this site and revisit to improve the likelihood of persistence. Back up regularly."

- If `persistGranted === true`: show green confirmation: "Storage is protected."

Do NOT show this warning on every page — only on DataPage where it is contextually relevant. Do not block the app for unsupported conditions.

---

## 8. PWA "Install" Prompt

**Classification: DIFFERENTIATOR — passive affordance, never active nag**

### Web standard behaviour

`beforeinstallprompt` fires when the browser determines the PWA is installable. The event should be captured with `event.preventDefault()` to prevent the default browser mini-infobar (the mini-infobar on Chrome Android is not dismissible by the app; capturing it removes it). The captured event should be held and triggered only by an explicit user action.

**MDN / web.dev recommendation (2025):** Do not show the install prompt on first visit or after a fixed time. Show it after a user has demonstrated engagement (completed a meaningful action). The `beforeinstallprompt` prompt method can only be called once per browser session, so timing matters.

**Real tool precedents:**
- Excalidraw: no active PWA install prompt in the UI; relies on the browser's native address bar install button
- Twitter/X PWA: shows "Install" option in the account menu — discoverable but never intrusive
- Starbucks PWA: shows install prompt after order completion — contextually earned

### Why cookie-banner analogy applies

The user explicitly named "aggressive PWA install nag" as an anti-feature. The reason it feels like a cookie banner: it is shown before the user has gotten any value from the app, it blocks or overlays the UI, and it repeats if dismissed. All three are avoidable.

### v1.2 default

- Capture `beforeinstallprompt` silently
- Add an "Install App" button in the Settings page footer (or DataPage footer) — visible only when the event is captured (i.e. installable)
- Do NOT show a toast, banner, or modal prompting installation
- Do NOT show it on first visit
- The native browser address-bar install affordance (Chrome desktop "Install" icon) remains available as the passive fallback

This is DIFFERENTIATOR (not TABLE STAKES) because the app is fully usable without installation. It is worth shipping in Phase 4 because it improves the offline and mobile experience, especially on iOS (where PWA install gives persist-storage grant).

---

## 9. Anti-Features — Explicitly Do Not Build

These are explicit non-goals with rationale. Each should appear as a named non-goal in v1.2 REQUIREMENTS to prevent scope creep.

### ANTI-FEATURE: Cookie Consent Banner

**Why not needed:** AussieLedger uses no cookies (IndexedDB and localStorage are not cookies). GDPR/PECR consent banners are triggered by cookies and certain tracking technologies. None are present. A cookie banner on a cookieless app is compliance theatre that reduces trust and adds friction.

**Precedent:** Plausible Analytics explicitly documents "no cookies = no consent banner required." Same applies here.

### ANTI-FEATURE: Newsletter Signup Popup

**Why harmful:** AussieLedger's audience is visiting to do their taxes, not to subscribe to product updates. A newsletter popup before the user has seen the product is the canonical dark pattern. It signals that the operator's interests (list growth) come before the user's (doing their taxes).

**Precedent:** None of Excalidraw, tldraw, Obsidian, Standard Notes, or Linear show newsletter popups on first visit.

### ANTI-FEATURE: Aggressive PWA Install Prompt (modal or banner)

**Why harmful:** See section 8. The pattern "show install prompt before user has gotten value" is equivalent to "ask for push notification permission immediately" — the most widely cited example of a bad PWA first impression. Google's own web.dev guidelines call this out explicitly.

### ANTI-FEATURE: Notification Permission Request

**Why not needed:** AussieLedger has no server-push use case. No background jobs, no collaboration, no reminders originating from a server. Browser notifications would only be useful for backup reminders — and the backup-nag Toast achieves this without requiring a permission grant. Requesting notification permission on a tax tool would be baffling to users and would likely be denied, wasting the one-time grant opportunity.

### ANTI-FEATURE: Third-Party Tracking Scripts (Google Analytics, Hotjar, Mixpanel, Meta Pixel, etc.)

**Why explicitly excluded:** PROJECT.md lists "Telemetry / analytics on the hosted SPA — explicit non-goal" and the core ethos is "no third-party database, no hosted user data." Loading a third-party script would: (a) send page-visit data to a third party, contradicting the privacy story; (b) add a cookie banner requirement if the script sets cookies; (c) violate user trust for a tool handling sensitive financial data; (d) create a GDPR obligation.

**Precedent:** Standard Notes, Plausible's own product, and Obsidian all avoid third-party analytics. If aggregate usage data is desired, self-hosted Plausible CE (cookie-free, no personal data) is the only acceptable option — and that belongs in a later milestone, not v1.2.

### ANTI-FEATURE: "Powered by [Host]" Badge

**Why harmful:** "Powered by Cloudflare Pages" or "Hosted by GitHub Pages" adds no user value, signals the user's data leaves their browser (even though it doesn't, the badge creates this impression), and clutters the UI. Cloudflare and GitHub do not require this attribution on free tier.

### ANTI-FEATURE: Server-Side Session / Auth

Explicitly out of scope (already documented in PROJECT.md). Every browser is its own instance. Adding auth would require a backend, contradicting the zero-cost, zero-server-data architecture.

---

## 10. Voluntary Anonymous Error Reporting (Opt-In)

**Classification: DEFER — out of v1.2**

### Privacy-respecting tools' patterns

**Files (Windows app, GitHub):** Community filed issue #16759 requesting opt-out of Sentry reporting. The maintainers had shipped opt-in telemetry; the community still pushed back. Outcome: telemetry settings page added.

**VS Code:** Error reporting is opt-in with clear disclosure: "Crash data is sent to Microsoft." The opt-in is presented during first launch, not buried.

**Standard Notes:** No telemetry at all in the privacy-focused offering.

**Plausible CE self-hosted:** No telemetry by default; the cloud version has its own analytics on the plausible.io marketing site (using Plausible itself, which is ironic and appropriate).

### Assessment for v1.2

**Why DEFER:**

1. **Trust is the primary v1.2 value.** The entire milestone story is "your data never leaves your browser." Shipping any telemetry — even opt-in, even cookieless — contradicts that story during the period when trust is being established.

2. **No real user feedback yet.** There are no production users. Error data from zero real users has zero signal value.

3. **The overhead is non-trivial.** Even opt-in telemetry requires: a settings toggle, a privacy disclosure update, a client-side SDK (Sentry or equivalent), and a backend to receive events (or a paid Sentry plan). That is meaningful scope for v1.2.

4. **Alternative exists.** GitHub Issues is the error reporting mechanism for an open-source tool at this stage. Users who hit bugs can file issues.

**If shipping in v1.3+:** Use Sentry with `beforeSend` hook to scrub all user-data fields; present opt-in consent during first launch (not buried in settings); default is off; never include any data from the IndexedDB entities.

---

## Feature Priority Summary

| Feature | Classification | v1.2 Default |
|---|---|---|
| Inline trust banner (first-visit empty state) | TABLE STAKES | Ship |
| Two-CTA empty state ("Create entity" + "Try demo") | TABLE STAKES / DIFFERENTIATOR | Ship |
| Product tour / step-by-step onboarding overlay | — | DEFER to v2 |
| Backup-nag toast (7-day threshold, snooze) | TABLE STAKES | Ship |
| Pre-close `beforeunload` guard | TABLE STAKES | Ship |
| User-supplied Gemini key in Settings page | TABLE STAKES | Ship |
| AI key validation (live test call on save) | DIFFERENTIATOR | Ship (small lift) |
| `/demo` route with isolated IDB namespace | DIFFERENTIATOR | Ship |
| Self-host vs hosted README rewrite | TABLE STAKES | Ship |
| Privacy page (`/privacy` route or anchor) | TABLE STAKES | Ship |
| No on-load privacy modal | TABLE STAKES (avoid) | Confirm absent |
| `navigator.storage.persist()` with Safari iOS warn | TABLE STAKES | Ship |
| PWA — passive install button in Settings/DataPage | DIFFERENTIATOR | Ship Phase 4 |
| PWA — active install prompt/banner | ANTI-FEATURE | Do not ship |
| Cookie consent banner | ANTI-FEATURE | Do not ship |
| Newsletter signup popup | ANTI-FEATURE | Do not ship |
| Notification permission request | ANTI-FEATURE | Do not ship |
| Third-party tracking scripts | ANTI-FEATURE | Do not ship |
| "Powered by [host]" badge | ANTI-FEATURE | Do not ship |
| Opt-in anonymous error reporting | DEFER | v1.3+ |

---

## Confidence Assessment

| Area | Level | Basis |
|---|---|---|
| Excalidraw WelcomeScreen pattern | HIGH | Official docs confirmed at docs.excalidraw.com |
| PWA install prompt best practices | HIGH | MDN + web.dev official guidance |
| Safari iOS `persist()` behaviour | HIGH | WebKit official blog, Safari 17+ confirmed |
| Cookie banner exemption for cookieless sites | HIGH | iubenda GDPR guidance, multiple sources agree |
| User-supplied AI key localStorage pattern | MEDIUM | Community pattern verified across multiple tools; no single official spec |
| Backup-nag threshold (7 days) | MEDIUM | No industry standard; reasoning from toast UX best practices + analogous tools |
| Demo route IDB namespace isolation | HIGH | Follows directly from IDB origin-scoping (Web spec) |
| Error reporting defer recommendation | HIGH | Consistent with project values + no production users yet |

---

## Sources

- Excalidraw WelcomeScreen docs: https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/children-components/welcome-screen
- WebKit Storage Policy update (Safari 17): https://webkit.org/blog/14403/updates-to-storage-policy/
- MDN PWA installation prompt: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- web.dev PWA installation prompt: https://web.dev/learn/pwa/installation-prompt
- iubenda cookies + GDPR requirements: https://www.iubenda.com/en/help/5525-cookies-gdpr-requirements/
- LogRocket toast UX: https://blog.logrocket.com/ux-design/toast-notifications/
- Standard Notes self-hosting: https://standardnotes.com/help/47/can-i-self-host-standard-notes
- Plausible Analytics privacy-first: https://plausible.io/privacy-focused-web-analytics
- Joplin GitHub (offline-first framing): https://github.com/laurent22/joplin
- Files app Sentry opt-out issue: https://github.com/files-community/Files/issues/16759
