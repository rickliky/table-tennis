# Private player notebook

## Daily-first match reflections — production code-only release (2026-10-16)

The user explicitly approved promoting the tested daily-first layout and the
Jacelyn/Kaitlyn match starters **without changing any data**. These features are
now live in production as well as UAT. Earlier UAT-only restrictions below are
historical for this release; future promotions still need fresh approval.

Production release **`459241a`**, Actions **`38836031628`**, passed all verification
suites, **65 browser tests**, deployment and **19 separate live production checks
without retry**. Four additional live WebKit checks covered both IDs in JA/EN at
390 px, including daily-first order, unsaved starters, formatted edit/save/reload,
Read/Admin and the fictional preview. All browser documents/saves were synthetic
and intercepted; no real journal was read/written.

**No notebook or ordinary data was copied, synchronized, imported, converted or
rewritten. No accounts, credentials or sessions were changed.** No Worker
deployment, security-secret change or database/promotion script was run. Existing
writing and intentionally cleared fields are preserved, and starters remain
display-only until edited. Refresh production to load the new code; UAT and
production notebooks remain independent.

## Daily-first match days + match starters — UAT update (2026-10-16)

Daily reflection always appears before the recorded-match reflections in player
Write/Read and the fictional preview. Admin reading also starts with daily
reflection; historical Activity remains readable after match notes. Nothing is
deleted or moved between stored fields.

For Jacelyn/LK-0080 and Kaitlyn/LK-0002, previously uninitialized English match
fields show this editable rich-text starter (bold headings and empty bullets):

```text
Match: Player A Score A - Score B Player B

What I Did Well:
-

Things to Improve:
-
```

Names and scores come from the recorded match, with the notebook owner first and
the owner's score first, consistent with the match card. Stored English names
are preferred in this English field, otherwise stored display names/IDs are
used; no transliteration or result is invented. Incomplete matches keep their
recorded score and do not acquire a winner claim. Missing names/scores cannot
generate a fabricated header.

The starter is Write-only and is **not saved until edited**. Opening, focusing,
changing language/mode/date or reading does not create notes/index entries.
Existing plain/rich writing and intentionally cleared fields stay unchanged.
Daily practice-day templates, Friday rest rules, manual Japanese/coach fields,
future Japanese-only accounts and save/conflict/session safeguards are unchanged.
The preview's second fictional match demonstrates the starter; it never uses
real identities or saves writing.

This was an **UAT-only** checkpoint before the explicit code-only production
approval recorded above. No Worker deployment, Redis/private data migration or
account/credential change was required. Verification uses synthetic/intercepted
documents only.

Release **`b28ea23`**, Actions **`38834383494`**, passed all verification suites,
**65 browser tests**, deployment and **19 live checks without retry**. Four new
targeted tests passed in Chromium and WebKit; four additional live WebKit cases
covered both IDs in JA/EN at 390 px. The live fictional iPhone preview was visually
reviewed with zero overflow/API requests. Production was then `30a22d8`; that
checkpoint is superseded by the code-only release above. No actual notebook or
account data was read or changed.

## Code-only production promotion — live (2026-10-14)

The user explicitly approved promoting the accumulated UAT **code**, while
excluding reflection-data promotion. This includes the limited rich editor,
simplified labels/removal of the Activity input, always-bilingual match cards
and player-specific dated practice templates described below. Earlier UAT-only
release restrictions are superseded for this rollout only.

Production Worker support must accept the same restricted rich documents and
return current opponent display/Romanized names. Existing production private
enablement and security secrets remain unchanged. Plain notes are not converted
on read, and schema/ownership/size/revision checks and Admin read-only access
remain enforced. Only an intentional player edit changes a stored field.

**No reflection data, accounts, credentials, indexes or sessions are copied or
synchronized. No migration or ordinary data-promotion script is run.** Existing
PROD notes remain the source for actual writing; UAT/PROD stay independent.
Verification uses in-memory Worker fixtures and intercepted synthetic browser
documents/writes only.

Release **`233294d`** passed UAT Actions **`38505702225`** (all verification suites,
**41 browser tests** and **13 live checks**) before the approved fast-forward
from `c1ea726` to production. Production Actions **`38506115215`** passed the
pre-deploy suites and deployment. Shared Worker version is
**`c90566ec-cca9-4821-9545-d706177e57a8`**; no security secrets changed.
Cache-busted production build confirms `233294d`. All **13 separate production
checks passed without retry**, using fully intercepted synthetic player/Admin
sessions/documents/saves in JA/EN at 320/390/1440 px. The fictional mobile
template was visually reviewed; overflow/page errors were zero. Anonymous
ordinary/private/Admin reads remain 401 in UAT and PROD. No actual notebook was
read/written, no account/password reset occurred and no data-promotion script
ran. Actual password login/save remains the players' acceptance check. Use
production for ongoing writing; this release does not synchronize notebooks.

## Player-specific dated practice templates — UAT update (2026-10-14)

This supersedes the shared three-part starter template below. Jacelyn/LK-0080
uses **Things to Improve**, **What I Practised Today**, and **What I Noticed or
Learned Today**. Kaitlyn/LK-0002 uses **What I Did Well** and **Things to Improve**.
Each heading remains bold with an empty bullet underneath. Both start with the
selected notebook date in English, e.g. **13 October 2026 (Tuesday)**; other dates
use their own date/weekday, independent of browser timezone/interface language.

The existing safeguards remain: only previously uninitialized English daily
fields on non-Friday dates with no recorded matches get an unsaved Write-mode
starter. Existing notes (including old templates intentionally saved/edited)
and deliberately cleared fields are never replaced. No template-only save or
date index is created. Japanese and coach fields are not auto-filled. The
fictional preview uses the three-part style with its own example date.
This is UAT-only, with no Worker deployment, real notebook read/write or
production migration. UAT release **`5d6a7df`**, Actions **`38504013810`**, passed
all verification suites, **41 browser tests** and **13 live smoke checks**.
The general gate smoke needed one retry in CI; a separate full live rerun passed
all 13 without retry. Both synthetic account IDs passed JA/EN at 320/390/1440 px;
fictional-only screenshots of both dated templates were visually reviewed.
Production remains `c1ea726` and requires fresh rollout approval.

## Always-bilingual match cards — UAT update (2026-10-14)

At the user's request, reflection match cards always show the recorded Japanese
display name followed by the stored Romanized name for **both players**, with
`勝ち / Win` and `負け / Loss` result labels. Switching the interface language
does not hide either name or result language. Incomplete status is bilingual and
never claims a winner. An unavailable Romanized name is explicitly marked
unrecorded, not guessed. Owner Write/Read, Admin evidence and the fictional
preview share this rendering. Existing current-name API fields are reused;
there is no Worker, profile, match, journal or credential change. This release
is UAT-only. Release **`9520c56`**, Actions **`38501911252`**, passed all
verification suites, **41 browser tests**, deployment and **seven live smoke
checks**. Live synthetic JA/EN checks passed at 320/390/1440 px; the fictional
mobile match card was visually reviewed. Production remains `c1ea726`;
no real notebook or other stored data was read or modified.

## Practice template and clearer match results — UAT update (2026-10-14)

The user requested these refinements to the UAT notebook; production is not approved for this release.

- Removed the Activity (optional) **input**. Existing saved activity is kept in storage, readable in historical Read/Admin views, and never erased during a reflection save.
- Language field labels no longer include `(manual)` / `（手入力）`; the coach heading is simply **Coach feedback / コーチのアドバイス**. Player, Admin and fictional preview use the same wording. Translation remains manually entered and coach writing is not a coach-authenticated evaluation.
- Jacelyn/LK-0080 and Kaitlyn/LK-0002 see the requested three-part template in previously uninitialized **English daily reflection** fields on non-Friday days with no recorded matches. Each bold heading (`Things to Improve`, `What I Practised Today`, `What I Noticed or Learned Today`) has one empty bullet. Japanese and coach fields are not auto-translated/filled. It is an editable starting document, not placeholder text and not a separate improvement box. It saves only after intentional editing; opening/focusing/changing language/Read/date does not create a saved note or date index. Existing strings/rich notes, intentionally cleared fields, Friday notes, match-day fields and future Japanese-only accounts are not overwritten or seeded.
- Both participants have explicit **Winner / Loser** (`勝者 / 敗者`) labels beside their names on completed match cards, with gold/red emphasis and the player's perspective score. Incomplete records explicitly say no winner is recorded, never labelling a leading player a winner. Player Write/Read, Admin evidence and the fictional preview share `notebook-match.js`.
- UAT Worker owner/Admin day reads resolve the opponent ID against the approved `players` and `external-opponents` collections and return current display/Romanized names only, falling back to the saved match name/ID if the identity is absent. No name is guessed and no approved match/profile is rewritten. Production remains on the prior snapshot-name API behavior until a separately approved rollout; only UAT uses the new lookup.
- UAT release **`f1ab47a`**, Actions **`38498892667`**, passed all Worker suites, syntax/JSON, migration validation, **40 browser tests** and all **seven live smoke checks**. Cache-busted UAT build confirms it; shared Worker version is `5c9d7c5d-19db-4b3a-b0f2-74926f8a1099`. Live JA/EN 320/390/1440 px player/Admin/preview checks use intercepted synthetic documents/writes only, with zero overflow/page errors and no template-only save. Both initial players' template editing/preservation/clear/reload passed locally. No actual notebook body/profile/match/account/credential or production data was read or changed. Production remains build `c1ea726` with its prior behavior, and anonymous protected reads remain 401 in both environments. Review UAT before any separately approved production promotion.

## Limited rich-text editor — UAT rollout (2026-10-14)

The user approved implementing limited formatting **in UAT only**. Production remains the verified plain-text release; no production rich-text rollout, translation, real-note import, account change or data migration is authorized.

- Player reflection/manual-language/coach fields use locally vendored **Quill 2.0.3** with bold, italic, bullet/numbered lists and undo/redo. Activity stays plain text. All entries remain expanded; the editor grows naturally to show full content on phones. Toolbar buttons have Japanese/English labels and 44 px touch targets.
- `notebook-rich-text.js` is the shared DOM-free schema/renderer; `notebook-editor.js` is the browser adapter. Formatted values are `{format: "lk-rich-v1", ops: [...]}` with insert-only text operations. Only `bold:true`, `italic:true` on text and `list:"bullet"|"ordered"` on standalone newline operations are allowed. Terminal newline is editor structure, not an extra saved paragraph. Limits: 8,000 text characters (excluding terminal newline), 2,048 operations, 60,000 serialized characters per rich field; existing request/day size limits remain. Worker rejects unknown keys/formats/attributes/embeds, excessive values, rich activity and rich writes to PROD.
- Existing strings stay strings until intentionally edited. Opening a note, changing language or switching modes never migrates it. Unformatted changes still save as strings; leading blank lines/paragraphs remain. No bulk conversion or data rewrite occurs. Rich Read/Admin/conflict displays construct only escaped text and fixed allowlisted tags, never saved user HTML. Existing owner/Admin-read-only isolation is unchanged.
- HTML paste is parsed in an inert template, then converted to allowlisted text operations. Supported bold/italic/lists are retained; headings/tables/fonts/colours/links are simplified, scripts/resource embeds/images/attachments discarded and drops blocked. Plain clipboard text, including Markdown, stays literal. Exact ChatGPT Windows app clipboard output is **not verified**: test select-and-copy and its Copy button on the user's device; neither path is promised to provide HTML. Undo/redo and formatting-only changes use the normal serialized revision-checked autosave. IME composition pauses saving/navigation; frozen/cross-tab invalidation retains partial text in memory without a local draft cache.
- `notebook-sample.html` uses the same editor and newly authored fictional formatted coach advice; demo changes remain in memory with no API/auth/session reads or writing persistence.
- Verification uses synthetic documents only: Worker schema/access/revision/PROD rejection, browser paste/formatting/undo/legacy/limits/IME/autosave/offline/conflict/Admin/preview coverage, and optional `node worker/test-private-redis.js --live` exercises structured values against UUID-scoped synthetic Redis keys removed afterward. `tests/smoke/notebook-rich.spec.js` tests deployed static assets in JA/EN at 320/390/1440 px with **all** notebook/Admin API responses and writes intercepted. No real diary is loaded or saved.
- Behavior release `386d6ee` is live in UAT; shared Worker version `ae394549-cd6f-460e-ad3b-eb47612ca675` enables rich writes only in UAT. All 35 local/pre-deploy browser tests, Worker suites/schema checks, migration validation and actual synthetic Redis rich round-trip passed. The initial CI smoke ran too early against the prior page, so the new smoke now waits for the exact commit before its assertions. Follow-up release **`4bf03a1` / Actions `38495264621` passed the full verification/deployment and all seven live smoke checks**; cache-busted UAT build confirms that release. JA/EN 320/390/1440 px player/Admin/preview checks use only intercepted synthetic documents and writes, with zero overflow/page errors; deployed vendor hashes match the official assets, and fictional phone/desktop screenshots were visually reviewed. Production site behavior remains `87edfcb` (docs-only build stamp `c1ea726`), anonymous protected reads remain 401, and no actual writing/accounts/security secrets were changed. Promoting site code or enabling rich writes in PROD requires fresh explicit approval; ordinary/private dataset synchronization is not part of that promotion.

## Production rollout — live (2026-10-13)

On 2026-10-13 the user approved promoting all code/data, explicitly selected **Migrate existing notebooks**, and confirmed **Proceed with PROD cutover** after UAT verification. Production is now enabled with both players' existing passwords and all eight saved day documents. UAT originals were retained, no browser sessions were copied, and no production notebook was overwritten. **Use production for future writing; UAT and PROD are separate and not continuously synchronized.** Players must sign in again with their existing passwords.

- Production: `https://rickliky.github.io/table-tennis/feedback.html`; Admin read-only viewer: `https://rickliky.github.io/table-tennis/admin.html?tab=notebooks`.
- Behavior release `87edfcb`: UAT Actions `38358882729` and production Actions `38359668424` passed syntax/JSON, both Worker suites, migration validation and all 28 browser tests. Cache-busted production build confirms the release. `PRIVATE_REFLECTION_PROD=true` is now enabled in the shared Worker; existing production security stays on.
- Migration verified exact credential/document bytes, revisions and date indexes. Recovery snapshot: `C:\Users\rick\AppData\Local\Temp\opencode\private-notebooks-before-prod-47c300d2-a1e7-4e46-a75e-390fae9b6de3.encrypted.json` (encrypted, outside git). No private data or credentials were committed to GitHub.
- Live anonymous security checks passed in both environments; production landing and intercepted-synthetic owner/Admin views passed JA/EN 320/390/1440 px with zero overflow/page errors. No actual journal was displayed or edited in browser checks. Operator plaintext passwords were unavailable, so actual production password login remains a player acceptance check; exact verifier preservation and synthetic enabled-production authentication/role tests passed.

- Ordinary approved collections were compared directly in Upstash without printing records: all ten are identical (89 players, 1,954 training matches); no ordinary collection rewrite is needed. Both environments have zero pending changes and zero legacy reflection bodies/audit records.
- `scripts/promote-private-notebooks.js` is a separate, tightly scoped operator migration, not part of ordinary data promotion. It accepts only the two approved initial accounts and validates their complete day/index/account snapshot. Preview is read-only; apply requires both `--apply --confirm-production-notebooks`. An atomic Lua guard refuses a changed UAT snapshot or any existing production private namespace, then copies exact credential/document/index bytes. UAT is never mutated and sessions/rate counters are never copied. Repeating after a successful migration deliberately refuses; it is not a continuing environment sync.
- Apply first creates an **AES-256-GCM encrypted local recovery snapshot** outside the repository, under `%LOCALAPPDATA%/Temp/opencode/private-notebooks-before-prod-<UUID>.encrypted.json`. Its random encryption key is wrapped with Windows DPAPI CurrentUser. Recovery requires this Windows user's DPAPI profile on the operator PC: unwrap `wrappedKey` with `ProtectedData.Unprotect(..., CurrentUser)`, decrypt `ciphertext` with AES-256-GCM using `iv` and `tag`, and validate the recovered snapshot. Do not print, commit, export plaintext, or restore over live production writing. A restore needs separate approval and a reviewed conflict-aware plan. Keep the operator's Windows profile protected; this is a rollout recovery snapshot, not an automated off-PC backup service.
- `node scripts/test-private-notebook-promotion.js` validates synthetic snapshots; `--live` additionally tests actual Lua against isolated UUID-scoped synthetic Redis keys and, on Windows, an encrypted-backup recovery round-trip. Synthetic keys/files are removed afterward. No actual journals are used by tests.
- Production Admin navigation is no longer UAT-gated; server authorization remains Admin-only/read-only. Production owner sessions remain separate from UAT and players must sign in again. The deployed Worker already supports this via the separately approved `PRIVATE_REFLECTION_PROD=true` switch; do not reset other security secrets.

## Historical UAT verification

UAT mobile/Admin-reading release `fb1c262` is live; deployment `38348611933` passed the complete verification suite (17 browser tests) and post-deploy smoke. Real authentication and read-only access checks passed. JA/EN phone/desktop usability checks used intercepted synthetic documents and writes, without modifying any real notebook entries or printing their content. Existing saved-day Admin reads were validated locally for document/owner/context shape without export. Production behavior/data is unchanged and requires separate approval.

Friday-rest/weekday update `f6d82a2` is live in UAT (Actions `38350379083`, all 19 browser tests and live smoke passed). Live player/Admin layouts passed JA/EN at 320/390/1440 px using only intercepted synthetic sessions/documents, including Friday-skipping navigation, rest state, historical-Friday access, and weekday labels. No real notebook content, credentials, Worker deployment, or Upstash data changed.

Write/Read + history release `cba4b43` is live in UAT (Actions `38352136243`, all 24 browser tests and live smoke passed). Live JA/EN Read/Admin layouts passed at 320/390/1440 px with intercepted synthetic sessions/documents/autosave: complete paragraphs, no editable Read fields, safe mode switching, month/latest navigation, expired-session hiding, and refresh preserving an older Admin date. No real notebook content was read or changed for this release. Production remains unchanged.

Landing cards + mock preview release `52032a7` is live in UAT (Actions `38355061345`, all 27 browser tests and live smoke passed). Live JA/EN landing/sample checks passed at 320/390/768/1440 px using 37 intercepted synthetic directory accounts: progressive cards/search, selected/direct sign-in, auto-height/full preview paragraphs, reset, Friday rest, no sample API/session reads or writing persistence, and zero overflow/page errors. Synthetic-only screenshots were visually reviewed. No real journals, accounts, Worker, or Upstash data changed; production remains unchanged.

The user chose to keep translation manual. No provider, API key, AI button, billing, or transmission of writing to a translator is enabled. Notebook examples are design references only, not imported data.

## Access and layout

- `feedback.html` uses a dedicated player login, not the seven-day club gate. The anonymous directory exposes only enabled player names/IDs and bilingual mode, never writing, dates, counts, hashes, or session details.
- Landing-page update: enabled players appear as standard portrait/name/ID cards (existing public profile-image manifest and fallback, no general-data request). Japanese/Romanized/ID search normalizes width, punctuation, and word order; 12 cards render initially, with Show more and empty/search states. Only the selected player's sign-in form is shown; direct `?player=` links select it near the top on phones. Password-manager username hints use the selected canonical ID. Selecting another card clears the previous form; typing a directory search does not erase the selected form. No real activity/note count or private body appears on a card.
- Invitation in JA/EN now says setup is easy and asks interested players to let Jacelyn and Kaitlyn's daddy know. No self-signup or automatic account provisioning was introduced.
- **`notebook-sample.html`** is a standalone, clearly labelled mock preview. `notebook-sample.js` contains only newly authored fictional player/opponent/reflection/coach examples, not notebook design samples or real journals. This explicit mock-preview exception is not runtime fallback data for real notebooks: it loads no API/auth/data client, reads no sessions, and sends no writing anywhere. Daily/match/Friday rest examples, manual bilingual fields, Read/Write toggles, auto-growing text boxes, reset, and return links work without a login. Changes live only in page memory and reset on reload; warnings say not to enter private information. Only `lk-language` preference persists.
- Initial accounts: Jacelyn (`LK-0080`) and Kaitlyn (`LK-0002`). Their separately supplied passwords must never be committed. Optional remember-login is checked by default and lasts an absolute 56 days; uncheck on shared devices, in which case the session remains in the current page only. Lock revokes the server token.
- Daily reflection comes first, followed by any recorded-match cards (training and tournament clearly separated), including Thu/Sun match days; daily and match writing remain optional. **Friday is always a rest day**: previous/next notebook-day arrows skip it; opening the page without an explicit date on a Tokyo Friday selects Thursday. Explicit Friday dates show a rest message without empty writing prompts. Previously saved Friday text remains accessible/editable through history or a direct date, never deleted or reassigned. No Worker date restriction or stored-data migration is introduced. Missing imports never generate invented results. Match cards use record-ID order, not a claimed play order.
- Dates include their weekday in the current language in the player's selected-date label and saved history, and in Admin saved-date options/day headings. ISO dates remain the request/storage values; weekdays are calculated as calendar dates, independent of browser timezone. Admin last-saved timestamps show weekday/time in Asia/Tokyo.
- One daily coach-feedback block, entered by the player. No ratings, approval/publishing, per-match coach inputs, or separate “Things to improve” field.
- Only the two initial IDs have English reflection originals and manual Japanese versions, plus Japanese coach originals and manual English versions. Other enabled players write Japanese only; enforced by the Worker.
- Mobile usability update: all daily/match/orphan writing blocks are always expanded, with section jump links. Text areas grow and shrink to show complete text on input, saved-page load, language change, font load, and viewport width changes. Leading blank lines and paragraph structure are retained. Privacy help opens by default; the redesigned directory shows one selected-player login rather than expanding a form per account.
- The sticky save-status bar stays below the measured site-header height. Jump links account for both sticky bars so section headings remain visible, including after phone orientation or status-message changes.
- Player **Write / Read** buttons keep every entry expanded. Write is the initial mode and uses the existing autosaving inputs. Read displays escaped, full-text activity/reflection/manual-translation/coach/orphan paragraphs with explicit “Not written” states and no editable fields. Modes persist in memory across date/language changes, not as journal text in storage. Changing mode first blocks further input and waits for all pending edits to save; failure/offline/expiry/conflict keeps Write and its unsynced text. Read keeps the same owner authentication, frozen-page, and cross-tab clearing safeguards.
- Player saved history has a month filter and **Latest saved note** shortcut. Filtering changes date options only, never the open date or unsaved writing. Opening a history date/latest note uses the normal save-before-navigation guard. The latest shortcut clears the month filter only after a successful load. Autosaving adds new saved dates/months to the selectors immediately. Friday history remains available.
- Admin history adds localized month filtering and a latest-note shortcut. Previous/next moves through saved dates in the chosen month. Refresh (including retry) preserves player/month/date when still available; missing dates/months fall back to the latest available date in that month or globally. Changing player clears old date metadata before loading. Empty-account controls are disabled, and only one selected day's private text is fetched. No journal export, body search, new permissions, or Admin edits are added.

## Privacy boundaries

The shared Worker's private notebook mode is enabled in both UAT and production following the explicitly approved 2026-10-13 rollout. The production switch is `PRIVATE_REFLECTION_PROD=true`. Removing the switch disables production private routes but does not delete stored notebooks; reverting UI/security behavior needs a separately reviewed rollback.

In both enabled environments, member/maintenance data returns empty legacy reflection collections and audit responses filter legacy reflection changes. Generic reflection submissions, reviews/batch reviews, and bulk writes are blocked. The private namespace is absent from normal API datasets and export/promotion scripts; those scripts also exclude legacy reflection bodies. Do not copy journals or provision accounts during ordinary dataset promotion. The one-time approved private migration above is a separate operator procedure, not standing permission for future copying.

The user's follow-up explicitly authorizes Admins to read all player notebooks, now released in both environments. The player-facing disclosure says the player and club administrators can read the notebook; other players, members, and Approvers cannot. The requested infrastructure/encryption sentence was removed from that UI. This does not change the technical architecture into end-to-end encryption. Sharing a player password or remembered device also shares access.

Site/Approver tokens cannot read notebook text. Admin tokens can read it only through the dedicated read-only `/api/reflections/admin/players`, `/admin/dates?playerId=…`, and `/admin/day?playerId=…&date=…` routes (all under `/api/reflections`). These validate Admin role on each request, explicit IDs/dates, and the environment rollout; every non-GET method is rejected. Player-session endpoints still derive ownership from the player token and do not accept Admin tokens. No Admin journal editing, deletion, publishing, exporting, or translation is implemented.

Data Maintenance → **Player Notebooks / 選手ノート** (`admin.html?tab=notebooks`) in both environments provides player and saved-date selectors, previous/next saved dates, refresh/retry, readable full-text language panels, recorded-match context, and orphan-note preservation. Disabled accounts remain readable to Admin without reenabling them. Only one selected day is loaded at a time; no whole-history dump or local text cache. Selecting another player/date clears previous text before loading; request failures never leave old text under new labels. Sign-out, role rejection, cross-tab session changes, and frozen-page returns clear/hide text and require fresh validation. Approver navigation excludes this page.

Private API CORS allows `https://rickliky.github.io`; optional `PRIVATE_REFLECTION_ORIGINS` is a comma-separated explicit local-test allowlist. Never use wildcard origins. Responses are `no-store`; writing is escaped, request bodies are size-bounded, and errors never echo request content or Redis credentials. Login is limited to 10 attempts per IP/player and 60 per IP over 15 minutes. Passwords use random 256-bit salts and PBKDF2-SHA256 (100,000 iterations, the Workers Web Crypto maximum). Tokens are opaque random 256-bit values, stored only as SHA-256 lookup hashes with server TTL and account-version validation. Reset/disable increments the version and invalidates every previous session; saving checks revocation atomically too.

## Storage and saving

Private keys start with `<environment>:private-reflection:`:

- `accounts`: Redis hash, one private salted verifier/version record per player.
- `session:<token SHA-256>`: environment-bound session with a 56-day TTL.
- `day:<playerId>:<YYYY-MM-DD>`: one versioned document with flat field keys (`activity`, `daily.en/ja`, `coach.en/ja`, `match.<source>:<matchId>.en/ja`).
- `dates:<playerId>`: sorted saved-date index.
- `rate:*`: short-lived login counters.

Autosave runs after one second of idle typing and on blur; requests serialize and only changed fields are patched. A single Lua operation checks account/session validity and document revision, patches fields, increments the revision, and updates the date index. No no-op repository lock or whole-collection autosave is used. Unknown fields, another player's match, wrong dates, and disallowed language fields are rejected. Existing own match notes are retained if a match is subsequently removed.

Stale revisions produce 409 with the owner's saved version. The UI retains unsynced text and shows saved versus local changed fields; choosing the local fields is an explicit overwrite, not an automatic retry. Failed/offline saves block date changes and sign-out until synced; retry and reconnection can resume. Expired/revoked login retains text in memory and offers same-player reauthentication.

Private notebook fields/date history stay hidden during reauthentication. A frozen browser Back/Forward return revalidates the player session before revealing the cached notebook; locking/resetting access must not be bypassed by browser page restoration.

**No plaintext local draft** is stored. Unsynced text exists only in the current page; the unload warning is a safeguard, not guaranteed mobile recovery. Keep the page open until Saved. Persistent protected recovery and historical revision snapshots are not included in this release. Journals remain the server's golden source.

## Restricted account management

`scripts/manage-reflection-account.js` defaults to UAT. Approved production operations additionally require `--prod --confirm-production`. Supply `ADMIN_PASSWORD` in the process environment. `--list` prints only player ID, enabled status, and credential version. For changes, set `REFLECTION_PLAYER_ID`, choose `--enable`, `--disable`, or `--reset`, and preview first. Add `--apply` to write. Set `REFLECTION_PASSWORD` only for initial enable or explicit reset; do not put passwords in script source or command-line arguments. Enabling an already-enabled account is a no-op, never an implicit password reset. Reenable/disable/reset preserves all journal text but revokes previous sessions.

The Worker `/api/reflections/accounts` GET/POST requires the Admin role. It is not a content-management endpoint. Data Maintenance has a separate read-only notebook viewer, never account passwords. Use the restricted script to manage feature access.

## Verification

- `npm run verify`: tracked JS/JSON checks, existing Worker security tests, private Worker isolation/ownership/rate-limit/revocation/revision tests, existing member/Admin browser tests, and private-notebook browser tests.
- `node worker/test-private-redis.js --live`: optional real Upstash Lua concurrency test using four UUID-scoped synthetic UAT-test keys, removed in `finally`; never uses a live player's account or diary. Credentials come from process variables or gitignored `upstash.env`, not source.
- Browser tests use synthetic text/passwords only and cover login/restoration/lock, wrong passwords, separate accounts, daily/match/weekend/Friday layouts, manual bilingual/Japanese-only fields, escaped content, failed autosave/blocked navigation/reauth, stale-tab conflict choices, and JA/EN at 320/390/1440 px.
- Live UAT smoke treats Reflection as a limited anonymous directory with protected private-day access, not a member-data route. Other routes keep their existing gates.
- Before deployment, recheck legacy collections/audit counts without printing bodies. If real legacy content appears, stop and plan a restricted archive/migration; do not delete it automatically.
- A production release requires explicit user approval, separate PROD account provisioning, and private backup/recovery planning. Never set the production switch merely because UAT passed.

## Usability roadmap

The user approved starting with Write/Read modes and better history navigation on 2026-10-13; those two items are now live in UAT as described above. The day-overview and reading-language/text-size controls below remain proposals, not authorized or implemented.

Prioritize writing/reading clarity over more statistics or mandatory fields:

1. **Player Write / Read modes — implemented**: keep all entries expanded and autosave in Write; Read presents the same paragraphs as clean text without editable boxes. Switch only after pending saves succeed, and retain the same access/session-clearing safeguards.
2. **Small day overview**: selected date/weekday, daily-versus-match layout, recorded-match count, and clear saved/unsynced state. Distinguish “not written” from “no recorded match”; do not treat writing coverage as a player grade or attendance.
3. **Reading-language controls**: original, manual translation, or both; default to both, remember only the preference (not text). This shortens mobile reading without automatic translation or collapsing entry sections. Optional readable-text size controls can follow.
4. **Better history browsing — implemented**: month filter, latest saved-date shortcut, and preserve the selected date on Admin refresh. Continue loading only one private day at a time; do not add whole-history downloads/search or exports implicitly.

Protected recovery for accidental mobile closure and revision history are a separate reliability/privacy design, not a reason to store plaintext drafts locally. Avoid mandatory ratings, extra goal boxes, automatic rewriting, public sharing, or streak pressure.
