# Feature Landscape — v2.0 Desktop + File-Backed + Network-Sandbox

**Domain:** Desktop accounting app — portable single-file model, local-first, network-sandboxed
**Researched:** 2026-05-29
**Confidence:** HIGH (Tauri 2 docs direct; GnuCash/Manager.io/QuickBooks patterns verified from official docs/forums; Apple OS conventions from Apple Developer docs)
**Scope note:** This file covers ONLY new v2.0 capabilities. v1.0 domain features (wizard, persona modes, tax engine, BAS, CoA, journals) are covered in the archived v1.0 FEATURES.md and are not repeated here.

---

## Persona Key

| Symbol | Meaning |
|--------|---------|
| OWN | Business-owner / DIY only |
| AGT | Tax-agent only |
| BOTH | Relevant to both personas |

---

## Feature Groups

1. File Menu & File Lifecycle
2. Default File Location & First-Run UX
3. Backup / Autosave / Crash Recovery
4. Multi-Window / Multi-File
5. External-Edit Detection
6. Migration from v1.0
7. Network-Sandbox & AI Consent
8. Anti-Features (explicit exclusions)

---

## TABLE STAKES

Features that any credible desktop accounting tool with a file-based model MUST have. Absence makes the app feel broken or unsafe.

### Group 1 — File Menu & File Lifecycle

| Feature | Why Expected | Effort | Persona | Dependency | Pattern Reference |
|---------|--------------|--------|---------|------------|-------------------|
| **File → New** (creates a fresh `.aussieledger` file via OS Save dialog) | Every file-based desktop app opens with this. User expects to pick a location and filename on first create. | Small | BOTH | Tauri `save` dialog + FileBackedAdapter.createNew() | GnuCash, Manager.io, QuickBooks all open with a "New company file" dialog |
| **File → Open** (OS file picker, `.aussieledger` filter) | Standard file-open gesture. Double-click on file should also trigger this. | Small | BOTH | Tauri `open` dialog + FileBackedAdapter.open() | Universal desktop convention |
| **File → Open Recent** (last 5–10 files, stored in app config) | Accounting users work on the same file every session. Recent files list eliminates friction. | Small | BOTH | Tauri `BaseDirectory.AppData` for MRU list (not the .aussieledger file itself) | QuickBooks: "No Company Open" screen lists recent; GnuCash: File menu MRU; Manager.io: Businesses tab |
| **File → Save As** (copy current file to new path/name — the primary "backup" gesture) | Users want named point-in-time snapshots, especially before year-end. This IS the backup UX for SQLite-per-file. | Small | BOTH | SQLite `VACUUM INTO` or file copy + reopen | GnuCash: File → Save As converts format; QuickBooks: File → Back Up Company |
| **File → Close** (close current file, return to "no file open" state or welcome screen) | File-based apps must have a clean close path so the user can open a different file. | Small | BOTH | FileBackedAdapter.close() + WAL checkpoint | GnuCash, Manager.io |
| **Title bar shows current filename + full path (on hover/tooltip)** | "Where's my file?" is the #1 UX complaint in Manager.io forums. Users must always know what file is open. | Small | BOTH | None — Tauri window title API | Manager.io surfaces path in bottom-left of Businesses screen; QuickBooks shows file path in title bar |
| **Double-click `.aussieledger` file in OS to open AussieLedger** | OS file-association registration. Non-technical users expect this. | Small | BOTH | Tauri file association in `tauri.conf.json` + deep-link handler | Standard desktop app convention |
| **"No file open" welcome screen** with New / Open / Recent options | When no file is loaded the app must not show a blank or broken state. | Small | BOTH | None beyond v1.0 shell | QuickBooks "No Company Open" screen; GnuCash start screen |

**Save semantics note:** SQLite auto-commits every transaction. There is no "unsaved" state in the traditional sense — every journal entry, account change, or wizard step is immediately durable in the file. The correct model (confirmed by GnuCash SQLite backend behaviour) is: **no manual Save button for transactional data**. Instead, expose Save As for snapshots and a visible "Last saved" timestamp in the status bar. This matches Apple Pages autosave model, not Excel model. The Excel model (dot-modified indicator + Ctrl+S) is wrong for SQLite-backed apps and will confuse users into thinking data is at risk when it is not.

---

### Group 3 — Backup / Autosave / Crash Recovery

| Feature | Why Expected | Effort | Persona | Dependency | Pattern Reference |
|---------|--------------|--------|---------|------------|-------------------|
| **Autosave / no explicit Save button** (SQLite commits are the save) | Non-accountant owners are terrified of data loss. "Did my changes save?" anxiety is removed entirely when every change is transactionally committed. | Small | BOTH | FileBackedAdapter — transactions already auto-commit | GnuCash SQLite backend: "database formats save changes immediately" (GnuCash v5 docs) |
| **"Last modified" timestamp visible in status bar** | Reassures user that their most recent action is persisted. Replaces the save-dot indicator of manual-save apps. | Small | BOTH | Read file mtime via Tauri fs plugin | Apple Pages: "Saved" in title area; VS Code: status bar info |
| **File → Save As (snapshot / backup)** | Primary manual backup gesture. User wants to create a dated copy before year-end or before making risky bulk changes. Naming convention: `MyBusiness-2026-06-30.aussieledger` | Small | BOTH | SQLite `VACUUM INTO` target path (atomic copy; WAL folded in) | QuickBooks: "Back Up Company"; GnuCash: "Save As" |
| **Backup reminder on close** (configurable: "Remind me to save a backup every N days") | Accounting data loss is catastrophic. QuickBooks trains users to expect this. Non-accountant audience especially needs the nudge. | Medium | BOTH | App config in `BaseDirectory.AppData`; countdown tracked per file | QuickBooks: close-time backup prompt; configurable interval 1–99 days |
| **WAL checkpoint on clean close** | If the user copies the `.aussieledger` file while the app is open (via Dropbox, USB copy), the WAL file must be folded in. Tauri app must run `PRAGMA wal_checkpoint(FULL)` on File → Close and app quit. | Small | BOTH | FileBackedAdapter.close() — add checkpoint call | SQLite WAL docs: "checkpoint is run automatically" on clean close |

---

### Group 4 — Multi-Window / Multi-File

| Feature | Why Expected | Effort | Persona | Dependency | Pattern Reference |
|---------|--------------|--------|---------|------------|-------------------|
| **Single-instance, single-file-at-a-time** (File → Open switches context; second open of same file is blocked) | Both GnuCash and QuickBooks enforce exclusive file access. For a single-user accounting app this is correct: concurrent writes to the same SQLite file corrupt data. | Small | BOTH | SQLite exclusive lock (default journal mode); show error if file already locked | GnuCash: "could not obtain the lock" message; QuickBooks: "Company File in Use" error |
| **Warn before opening a second file without closing** | User may accidentally open a second file. Prompt: "Close [current file] and open [new file]?" | Small | BOTH | Detect open file state before open dialog | GnuCash, QuickBooks both prompt |

**Multi-window is DEFERRED:** Opening two `.aussieledger` files in separate windows requires two independent SQLite connections + separate React root states. This is a non-trivial Tauri multi-window architecture change. Single-instance single-file is the correct v2.0 model. Tax agents who work across multiple clients can use fast File → Recent switching. (See DEFER section.)

---

### Group 6 — Migration from v1.0

| Feature | Why Expected | Effort | Persona | Dependency | Pattern Reference |
|---------|--------------|--------|---------|------------|-------------------|
| **"Import from v1.0" guided flow** — reads v1.0 JSON export, writes a new `.aussieledger` file | v1.0 users have data in IndexedDB or Express+SQLite. They MUST have a migration path or they are stranded. This is table stakes for any major-version upgrade. | Medium | BOTH | v1.0 JSON export (already exists: DataPage); v5→v6 schema migration runner | Pattern: one-shot import wizard, not automatic detection. GnuCash: File → Import; similar patterns in Uptime Kuma v1→v2 migration |
| **v5→v6 schema migration in FileBackedAdapter** | The existing v0→v5 migration chain must be extended. v6 schema is the `.aussieledger` format. | Medium | BOTH | CONTRIBUTING.md additive-only migration rule; existing migration runner | v1.0 FND-09 (already shipped) |

---

### Group 7 — Network-Sandbox & AI Consent

| Feature | Why Expected | Effort | Persona | Dependency | Pattern Reference |
|---------|--------------|--------|---------|------------|-------------------|
| **All outbound HTTP blocked by default in Tauri capabilities config** | The Tauri HTTP plugin requires explicit URL allowlist — if no `http:allow-fetch` + URL scope is configured, the fetch call throws at runtime. This is the hard network sandbox the v2.0 milestone promises. | Small | BOTH | Tauri `src-tauri/capabilities/default.json` — omit http permissions entirely unless AI is enabled | Tauri v2 HTTP Client docs: "does not allow explicitly any origins to be fetched" until configured |
| **Explicit per-request consent dialog for AI calls** (e.g. "Suggest account mappings") | Before sending any GL data to an external API, a consent prompt is mandatory. Non-technical users do not expect their local accounting data to leave the machine. Missing consent = trust violation. | Medium | BOTH | Reuses Phase 3 export-replace dialog pattern; add network-destination details | AI UX Design patterns: "Transparency Before Action" — show data flow before processing. 1Password: telemetry is opt-in only. |
| **Consent dialog shows exactly what is sent** ("Your account names and 6 months of GL totals will be sent to [host]. No individual transaction details.") | Vague "Enable AI?" toggles are insufficient for tax data. Users need to know the scope of the data leaving the machine. | Medium | BOTH | None — new UI component; dialog content is static per AI feature | Privacy-first design pattern: "granular privacy controls with clear explanations of what data is used and why" |
| **Consent is per-session or per-request, not permanent** | For v2.0 with a non-technical audience who may regret enabling AI, per-session consent (resets on app restart) is the safer default. Permanent "always allow" can be added in v2.1. | Small | BOTH | Session state only (not persisted to app config in v2.0) | Signal: no silent network calls; each external action requires user intent |
| **AiGateNote (v1.0 component) surfaced when AI is disabled** | Already built in v1.0. Must be preserved and wired to the new network-sandbox state (Tauri capability check, not just `isAiEnabled()` env check). | Small | BOTH | Existing AiGateNote component; add Tauri capability query | v1.0 Phase 6 AiGateNote |

---

## DIFFERENTIATORS

Features that set AussieLedger v2.0 apart from GnuCash, Manager.io, and web-based tools. Not strictly expected, but valued.

| Feature | Value Proposition | Effort | Persona | Dependency | Notes |
|---------|-------------------|--------|---------|------------|-------|
| **"Where is my file?" disclosure in app** — Settings or status bar shows full path with "Reveal in Finder/Explorer" button | Manager.io forum: "Where is the accounting file?" is the top confusion post. Manager surfaces path at bottom of Businesses screen. AussieLedger should do the same in a visible, permanent location. | Small | BOTH | Tauri `shell:open` to reveal in OS file manager | Differentiates from Manager's buried path; beats GnuCash which shows nothing |
| **Drag-and-drop `.aussieledger` file onto window to open** | Power users expect this. Reduces friction of File → Open for USB-stick workflows. | Small | BOTH | Tauri drag-drop event handler | Not common in accounting tools; common in editors |
| **Backup reminder with "Save As" prefilled name** (e.g. `MyBusiness-2026-06-30-backup.aussieledger`) | QuickBooks backup reminder doesn't suggest a name. A prefilled timestamped name reduces friction and creates a sensible naming convention for the user's backup folder. | Small | BOTH | Date-format utility already in codebase | No direct competitor does this well |
| **File path shown in title bar** — `AussieLedger — MyBusiness.aussieledger` | Users asked "where's my file?" in every accounting forum we checked. Title bar is the most persistent UX real estate. | Small | BOTH | Tauri `setTitle()` API | QuickBooks does this; GnuCash does not consistently |
| **CSV per-report export from file** (FND-02 carry-over) — TB CSV, BAS labels CSV, Form I CSV downloadable alongside `.aussieledger` file | Natural fit for the v2.0 file-export work. Users who share data with accountants need CSV, not JSON. Resolves the v1.0 known gap. | Medium | BOTH | Existing export infrastructure + Tauri `save` dialog for each report | FND-02 consciously deferred from v1.0; v2.0 is the correct milestone |
| **Tauri native print dialog** (replaces `window.print()`) | Tauri 2 exposes `window.__TAURI__.webview.print()` which triggers the OS native print dialog. More reliable than `window.print()` in a WebView; allows saving to PDF via OS-level PDF printer without a PDF library. | Small | BOTH | Existing `window.print()` call → replace with Tauri print API | Resolves v1.0 open question about PDF library; free with Tauri |

---

## DEFER

Nice features, but not v2.0. Explicitly out of scope for this milestone.

| Feature | Why Valuable | Why Not v2.0 | When |
|---------|--------------|--------------|------|
| **Multi-window / two files simultaneously** | Tax agents want to view two clients side by side | Requires Tauri multi-window architecture, two independent SQLite handles, two React roots — significant architectural work | v2.1 or v3 |
| **Permanent "always allow AI" toggle** (per-session consent is v2.0) | Power users find per-session consent friction | v2.0 audiences are cautious; permanent opt-in is a lower-risk v2.1 addition after consent UX is validated | v2.1 |
| **Auto-update infrastructure** | User expects silent update like Chrome | Explicitly out of scope per PROJECT.md: "manual download for v2.0; auto-update v2.1" | v2.1 |
| **Scheduled timed backup** (GnuCash/QB style: save backup at 2am daily) | Reduces reliance on user remembering to Save As | Requires background process / system scheduler; adds OS-level complexity | v2.1 |
| **IndexedDB direct import** (detect v1.0 IDB data in same browser profile) | Reduces migration friction for users upgrading | Tauri WebView does not have access to browser's IndexedDB profile; IDB detection would require a separate browser-based export step anyway — the JSON export path is simpler and more reliable | Not feasible; JSON export path is correct |
| **iCloud / Dropbox integration** | Users want cloud backup without manual file management | Explicitly out of scope per PROJECT.md: "Cloud sync/file-sync layer — Dropbox/iCloud users can manage that themselves with the file" | v3+ |
| **File versioning / history** (undo beyond single transaction) | Power users want to revert to 3 days ago | Requires snapshot-chain management alongside primary file; complex storage design | v3+ |
| **`.aussieledger` file encryption** (password-protected file) | Tax data is sensitive; encrypted file at rest | Requires SQLite Encryption Extension (SEE, commercial) or SQLCipher (LGPL); significant dependency addition | v2.1 after evaluating SQLCipher |

---

## ANTI-FEATURES

Features to explicitly NOT build in v2.0. Each row becomes an explicit "out of scope" REQ-ID in REQUIREMENTS.md.

| Anti-Feature | Why It Gets Requested | Why Never Build It in v2.0 | What to Do Instead |
|---|---|---|---|
| **Background telemetry / analytics / crash reporting** | "We need to know if it crashes" | Breaks the "all data local" promise. Any background call — even a crash reporter — requires user consent in a network-sandboxed app. The Tauri HTTP plugin is blocked by default; adding telemetry would be an active choice to violate the model. | Ship with zero telemetry. If crash reporting is ever added, it must be explicit opt-in with a visible network-consent dialog. |
| **Silent "phone home" version check on launch** | "How will users know about updates?" | A version check pings a remote server on every launch without user action. This is a network call the user did not initiate. It also breaks the hard network sandbox. | Show version in Help → About. Publish GitHub Releases. Let users check manually. Auto-update is v2.1 after explicit user opt-in. |
| **Online help / documentation fetched at runtime** | "Link to the docs" is convenient | External link in app requires network; if docs are fetched silently, this is an undisclosed network call. Opens a browser tab which the user controls. | Bundle minimal inline help (existing LabelTooltip + AiGateNote pattern). External links open browser tab — user-initiated, not automatic. Do NOT fetch help content silently. |
| **Embedded browser frames pulling external content** (ads, status pages, news feeds) | Some accounting apps embed a dashboard pulling live data | Any iframe/webview pulling external content breaks the network sandbox and can exfiltrate file path or machine info via referrer headers. | No embedded external content. Zero. If an external page is needed, open it in the OS browser. |
| **Automatic "check for updates" network call** | Users want to stay current | Same as phone-home version check. Breaks sandbox. Explicit user action in Help menu is the correct model for v2.0. | Help → Check for Updates (user-initiated, one-off network call with consent). Not automatic. |
| **Storing `.aussieledger` file in hidden app-data path by default** (`~/Library/Application Support/` or `%APPDATA%`) | App config files (GnuCash preferences, Manager.io index) correctly live in AppData. But the USER'S accounting file is not app config — it is user-created data. Apple explicitly states: "user data belongs in user-controlled directories" (Apple BPFileSystem docs). Hiding the file in AppData would reproduce the "where's my data?" problem that v2.0 is designed to solve. | Default save location for new `.aussieledger` files must be `~/Documents/AussieLedger/` (macOS/Linux) / `Documents\AussieLedger\` (Windows). The MRU list and app preferences live in AppData — but not the user's file. | Default save dialog pre-navigates to `~/Documents/AussieLedger/`. User may choose any location. The choice is theirs and is visible. |
| **Locking the file to the app-data folder** (Manager.io's default model) | Manager.io's desktop edition probes only its app-data folder for `.manager` files by default; files outside this folder don't appear in the Businesses list unless "opened directly". | AussieLedger's portable-file promise requires that the file is fully moveable. A hidden app-data folder defeats USB-stick, NAS, and encrypted-drive use cases. | OS-native file picker everywhere. No hidden probe folder. |
| **Implicit network calls when AI is "enabled"** | "The user already turned on AI in settings" | Even with AI enabled, each batch of data sent externally must be an explicit user action ("Suggest mappings" button click), not a background inference on every journal entry save. The AiGateNote v1 pattern is correct: gated at the action, not at the toggle. | Per-action consent dialog (see Group 7 above). Setting enables the feature; each use requires confirmation of what is sent. |
| **"ATO Connected" or similar status theatre** | Looks professional | Explicitly removed in v1.0 as actively misleading. Must not reappear in v2.0 in any form — including network indicators that imply live ATO data. | Always-visible "not tax advice" disclaimer (v1.0 FND-06, retained). |

---

## Feature Dependencies

```
FileBackedAdapter (new, behind StorageAdapter interface — zero domain-layer changes)
    └──required by──> File → New / Open / Close / Save As
    └──required by──> WAL checkpoint on close
    └──required by──> External-edit detection (file watcher)
    └──required by──> v1.0→v2.0 migration (v5→v6 schema)

Tauri OS file picker (tauri-plugin-dialog)
    └──required by──> File → New, File → Open, File → Save As
    └──required by──> CSV per-report export (FND-02)

Tauri file watcher (tauri-plugin-fs, "watch" feature flag)
    └──required by──> External-edit detection ("File changed externally, reload?")

Tauri BaseDirectory.AppData
    └──required by──> MRU (recent files) list
    └──required by──> Backup reminder countdown
    └──NOT used for──> .aussieledger file itself (user Documents)

v5→v6 schema migration (extends existing v0→v5 chain)
    └──required by──> Import from v1.0
    └──required by──> Opening any file created by v1.0 express+SQLite shape

Network sandbox (Tauri HTTP plugin — no URL scope granted)
    └──enforced by──> Omitting http: permissions from capabilities/default.json
    └──overridden by──> Per-action AI consent dialog (adds URL scope for that session only)

Consent dialog (new component)
    └──reuses──> Phase 3 export-replace dialog pattern (existing modal shell)
    └──required by──> Any AI feature that calls external API
    └──required by──> Help → Check for Updates (user-initiated only)

AiGateNote (v1.0 component, retained)
    └──wired to──> Tauri capability check (not just env var)
    └──shown when──> AI feature attempted without network permission
```

---

## Pattern References

### File-based accounting apps surveyed

**GnuCash v5.x** — Single file (XML or SQLite). File menu: New, Open, Save, Save As, Recent (MRU). SQLite backend: changes committed immediately, no autosave needed. XML backend: configurable autosave interval. Creates `.YYYYMMDDHHMMSS.gnucash` backup alongside file on every save. Uses `.LCK` lock files for exclusive access. Does not implement external-modification detection (file watching). Closest model to AussieLedger for SQLite semantics.
Sources: GnuCash v5 guide (basics-files1, basics-backup1), GnuCash FAQ

**Manager.io Desktop** — Single `.manager` file per business. Default location is hidden app-data folder (surfaces path in bottom-left of Businesses screen). Supports "Open data file directly" via OS double-click. No explicit Save button (changes persist immediately). Backup via dedicated Backup function. The hidden app-data default is the primary UX pain point per Manager.io forum.
Sources: manager.io/guides/8394, manager.io/guides/12280, Manager.io forum

**QuickBooks Desktop** — `.qbw` company file. Default location: `C:\Users\Public\Public Documents\Intuit\QuickBooks\Company Files` (Windows). "No Company Open" screen with recent files + New/Open. Backup reminder on close (configurable N-day interval). Scheduled backups. File locking (exclusive access; "Company File in Use" error). Title bar shows filename. Multi-user mode exists but is an enterprise feature (v2.0 out of scope).
Sources: QuickBooks Community, Intuit documentation

**Apple Pages (autosave model)** — No Save button. Shows "Saved" in title area after each change. File → Duplicate creates a new copy. Time Machine integration for version history. This is the correct mental model for SQLite-backed apps: the file IS always saved; the UI just confirms it.

### OS file conventions

**macOS Apple Developer docs:** User-created documents belong in `~/Documents/`. App support files (preferences, MRU lists, config) belong in `~/Library/Application Support/YourApp/`. "Application should never install files into the user's Documents directory" — but this means the app should not auto-create files there without user consent via dialog. The first-run "New file" dialog should pre-navigate to `~/Documents/AussieLedger/` and let the user confirm.

**Windows:** `{FOLDERID_Documents}` = `C:\Users\<user>\Documents\`. App data: `%APPDATA%\AussieLedger\` (roaming) or `%LOCALAPPDATA%\AussieLedger\` (local). Same split: user file in Documents, MRU/prefs in AppData.

**Tauri 2 BaseDirectory:**
- `Document` → `~/Documents` (macOS), `{FOLDERID_Documents}` (Windows), `XDG_DOCUMENTS_DIR` (Linux)
- `AppData` → `~/Library/Application Support/<bundle-id>` (macOS), `%APPDATA%\<bundle-id>` (Windows), `$XDG_DATA_HOME/<bundle-id>` (Linux)
These are the two directories used: Document for the `.aussieledger` file default; AppData for MRU list and preferences.

### Tauri 2 capabilities confirmed

- **Network sandbox:** HTTP plugin requires explicit `http:allow-fetch` permission + URL scope in `capabilities/default.json`. Without it, all fetch calls throw at runtime. This is the hard sandbox. Confirmed in Tauri v2 HTTP Client documentation.
- **File watching:** `tauri-plugin-fs` with `features = ["watch"]` in Cargo.toml. APIs: `watch()` (debounced) and `watchImmediate()`. Returns unwatch cleanup function. Requires `fs:allow-watch` capability. Confirmed in Tauri v2 File System documentation.
- **File dialogs:** `tauri-plugin-dialog` provides `open()` and `save()` with filter support. Standard OS picker.
- **File associations:** `tauri.conf.json` supports registering file type handlers (double-click `.aussieledger` opens AussieLedger).

---

## External-Edit Detection (Group 5) — Separate Table

This warrants its own table because it spans multiple features and has a nuanced implementation path.

| Scenario | Recommended Behaviour | Effort | Notes |
|----------|-----------------------|--------|-------|
| Dropbox/OneDrive syncs a newer version of the open file | `watchImmediate` fires modify event → toast: "File changed externally. Reload to see latest version?" with Reload / Ignore buttons | Medium | Do NOT auto-reload: auto-reload could overwrite in-flight transactions. Let user decide. |
| User replaces file from another machine (USB copy) while open | Same as above — file watcher fires | Medium | Same toast pattern |
| App itself modifies the file (normal operation) | Watcher will fire on every transaction commit. Must debounce / filter self-originated events. Only surface toast for changes originating outside the process. | Medium | Filter by process ID or checksum; `watch()` debounced version preferred over `watchImmediate` for this reason |
| File deleted while open | `watchImmediate` fires delete event → modal: "The open file has been deleted or moved. Save a copy now?" with Save As / Continue Without File | Medium | Critical: user must not lose unsaved in-memory state |
| `.aussieledger-wal` file detected by watcher | WAL file changes on every write — do NOT watch the WAL file, only the main `.aussieledger` file | Small | Watcher path must be the main DB file only |

---

## Sources

| Source | Confidence | URL |
|--------|------------|-----|
| GnuCash v5 guide — file storage and backup | HIGH | https://www.gnucash.org/docs/v5/C/gnucash-guide/basics-files1.html |
| GnuCash v5 guide — backup and recovery | HIGH | https://www.gnucash.org/docs/v5/C/gnucash-guide/basics-backup1.html |
| GnuCash FAQ — file locking | HIGH | https://wiki.gnucash.org/wiki/FAQ |
| Manager.io guides — application data folder | HIGH | https://www2.manager.io/guides/8394 |
| Manager.io guides — open file directly | HIGH | https://www2.manager.io/guides/12280 |
| Manager.io forum — "where is the accounting file?" | MEDIUM | https://forum.manager.io/t/where-is-the-accounting-file/1559 |
| QuickBooks Desktop — company file location | HIGH | https://quickbooks.intuit.com/learn-support/en-us/help-article/back-data/locating-backups-company-data-files/L7hRh9jRa_US_en_US |
| QuickBooks — scheduled automatic backups | HIGH | https://ticket.summithosting.com/hc/en-us/articles/14302881516695-QuickBooks-Scheduling-Automatic-Backups |
| Tauri v2 HTTP Client plugin | HIGH | https://v2.tauri.app/plugin/http-client/ |
| Tauri v2 File System plugin (with watch) | HIGH | https://v2.tauri.app/plugin/file-system/ |
| Tauri v2 path namespace / BaseDirectory | HIGH | https://v2.tauri.app/reference/javascript/api/namespacepath/ |
| Apple BPFileSystem — where to put files | HIGH | https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPFileSystem/Articles/WhereToPutFiles.html |
| SQLite WAL mode docs | HIGH | https://sqlite.org/wal.html |
| AI UX Design patterns — privacy-first design | MEDIUM | https://www.aiuxdesign.guide/patterns/privacy-first-design |
| PROJECT.md — v2.0 milestone goals and constraints | HIGH | .planning/PROJECT.md (primary source) |

---

*Feature research for: AussieLedger v2.0 — Desktop + File-Backed + Network-Sandbox*
*Researched: 2026-05-29*
