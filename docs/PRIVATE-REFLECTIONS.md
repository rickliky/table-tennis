# Private player notebook — UAT implementation

UAT mobile/Admin-reading release `fb1c262` is live; deployment `38348611933` passed the complete verification suite (17 browser tests) and post-deploy smoke. Real authentication and read-only access checks passed. JA/EN phone/desktop usability checks used intercepted synthetic documents and writes, without modifying any real notebook entries or printing their content. Existing saved-day Admin reads were validated locally for document/owner/context shape without export. Production behavior/data is unchanged and requires separate approval.

Friday-rest/weekday update `f6d82a2` is live in UAT (Actions `38350379083`, all 19 browser tests and live smoke passed). Live player/Admin layouts passed JA/EN at 320/390/1440 px using only intercepted synthetic sessions/documents, including Friday-skipping navigation, rest state, historical-Friday access, and weekday labels. No real notebook content, credentials, Worker deployment, or Upstash data changed.

The user chose to keep translation manual. No provider, API key, AI button, billing, or transmission of writing to a translator is enabled. Notebook examples are design references only, not imported data.

## Access and layout

- `feedback.html` uses a dedicated player login, not the seven-day club gate. The anonymous directory exposes only enabled player names/IDs and bilingual mode, never writing, dates, counts, hashes, or session details.
- Initial accounts: Jacelyn (`LK-0080`) and Kaitlyn (`LK-0002`). Their separately supplied passwords must never be committed. Optional remember-login is checked by default and lasts an absolute 56 days; uncheck on shared devices, in which case the session remains in the current page only. Lock revokes the server token.
- Default Mon/Tue/Wed/Sat: one daily reflection. Thu/Sun: recorded-match cards (training and tournament clearly separated), plus an optional daily note. **Friday is always a rest day**: previous/next notebook-day arrows skip it; opening the page without an explicit date on a Tokyo Friday selects Thursday. Explicit Friday dates show a rest message without empty writing prompts. Previously saved Friday text remains accessible/editable through history or a direct date, never deleted or reassigned. No Worker date restriction or stored-data migration is introduced. Missing imports never generate invented results. Match cards use record-ID order, not a claimed play order.
- Dates include their weekday in the current language in the player's selected-date label and saved history, and in Admin saved-date options/day headings. ISO dates remain the request/storage values; weekdays are calculated as calendar dates, independent of browser timezone. Admin last-saved timestamps show weekday/time in Asia/Tokyo.
- One daily coach-feedback block, entered by the player. No ratings, approval/publishing, per-match coach inputs, or separate “Things to improve” field.
- Only the two initial IDs have English reflection originals and manual Japanese versions, plus Japanese coach originals and manual English versions. Other enabled players write Japanese only; enforced by the Worker.
- Mobile usability update: all daily/match/orphan writing blocks are always expanded, with section jump links. Text areas grow and shrink to show complete text on input, saved-page load, language change, font load, and viewport width changes. Leading blank lines and paragraph structure are retained. Directory login forms and privacy help open by default.
- The sticky save-status bar stays below the measured site-header height. Jump links account for both sticky bars so section headings remain visible, including after phone orientation or status-message changes.
- Player **Write / Read** buttons keep every entry expanded. Write is the initial mode and uses the existing autosaving inputs. Read displays escaped, full-text activity/reflection/manual-translation/coach/orphan paragraphs with explicit “Not written” states and no editable fields. Modes persist in memory across date/language changes, not as journal text in storage. Changing mode first blocks further input and waits for all pending edits to save; failure/offline/expiry/conflict keeps Write and its unsynced text. Read keeps the same owner authentication, frozen-page, and cross-tab clearing safeguards.
- Player saved history has a month filter and **Latest saved note** shortcut. Filtering changes date options only, never the open date or unsaved writing. Opening a history date/latest note uses the normal save-before-navigation guard. The latest shortcut clears the month filter only after a successful load. Autosaving adds new saved dates/months to the selectors immediately. Friday history remains available.
- Admin history adds localized month filtering and a latest-note shortcut. Previous/next moves through saved dates in the chosen month. Refresh (including retry) preserves player/month/date when still available; missing dates/months fall back to the latest available date in that month or globally. Changing player clears old date metadata before loading. Empty-account controls are disabled, and only one selected day's private text is fetched. No journal export, body search, new permissions, or Admin edits are added.

## Privacy boundaries

The shared Worker changes apply only to UAT. Production private endpoints return 404 unless `PRIVATE_REFLECTION_PROD=true` is separately enabled at an approved release. Production legacy behavior/data is retained during UAT review.

UAT member/maintenance data returns empty legacy reflection collections and audit responses filter legacy reflection changes. Generic reflection submissions, reviews/batch reviews, and bulk writes are blocked. The private namespace is absent from normal API datasets and export/promotion scripts; those scripts also exclude legacy reflection bodies. Do not copy UAT journals into PROD or provision PROD accounts during ordinary dataset promotion.

The user's follow-up explicitly authorizes Admins to read all player notebooks in UAT. The player-facing disclosure now says the player and club administrators can read the notebook; other players, members, and Approvers cannot. The requested infrastructure/encryption sentence was removed from that UI. This does not change the technical architecture into end-to-end encryption. Sharing a player password or remembered device also shares access.

Site/Approver tokens cannot read notebook text. Admin tokens can read it only through the dedicated read-only `/api/reflections/admin/players`, `/admin/dates?playerId=…`, and `/admin/day?playerId=…&date=…` routes (all under `/api/reflections`). These validate Admin role on each request, explicit IDs/dates, and the environment rollout; every non-GET method is rejected. Player-session endpoints still derive ownership from the player token and do not accept Admin tokens. No Admin journal editing, deletion, publishing, exporting, or translation is implemented.

UAT Data Maintenance → **Player Notebooks / 選手ノート** (`admin.html?tab=notebooks`) provides player and saved-date selectors, previous/next saved dates, refresh/retry, readable full-text language panels, recorded-match context, and orphan-note preservation. Disabled accounts remain readable to Admin without reenabling them. Only one selected day is loaded at a time; no whole-history dump or local text cache. Selecting another player/date clears previous text before loading; request failures never leave old text under new labels. Sign-out, role rejection, cross-tab session changes, and frozen-page returns clear/hide text and require fresh validation. Approver navigation excludes this page; PROD navigation is unchanged.

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

`scripts/manage-reflection-account.js` is intentionally UAT-only. Supply `ADMIN_PASSWORD` in the process environment. `--list` prints only player ID, enabled status, and credential version. For changes, set `REFLECTION_PLAYER_ID`, choose `--enable`, `--disable`, or `--reset`, and preview first. Add `--apply` to write. Set `REFLECTION_PASSWORD` only for initial enable or explicit reset; do not put passwords in script source or command-line arguments. Enabling an already-enabled account is a no-op, never an implicit password reset. Reenable/disable/reset preserves all journal text but revokes previous sessions.

The Worker `/api/reflections/accounts` GET/POST requires the Admin role. It is not a content-management endpoint. Data Maintenance has a separate read-only notebook viewer, never account passwords. Use the restricted script to manage feature access.

## Verification

- `npm run verify`: tracked JS/JSON checks, existing Worker security tests, private Worker isolation/ownership/rate-limit/revocation/revision tests, existing member/Admin browser tests, and private-notebook browser tests.
- `node worker/test-private-redis.js --live`: optional real Upstash Lua concurrency test using four UUID-scoped synthetic UAT-test keys, removed in `finally`; never uses a live player's account or diary. Credentials come from process variables or gitignored `upstash.env`, not source.
- Browser tests use synthetic text/passwords only and cover login/restoration/lock, wrong passwords, separate accounts, daily/match/weekend/Friday layouts, manual bilingual/Japanese-only fields, escaped content, failed autosave/blocked navigation/reauth, stale-tab conflict choices, and JA/EN at 320/390/1440 px.
- Live UAT smoke treats Reflection as a limited anonymous directory with protected private-day access, not a member-data route. Other routes keep their existing gates.
- Before deployment, recheck legacy collections/audit counts without printing bodies. If real legacy content appears, stop and plan a restricted archive/migration; do not delete it automatically.
- A production release requires explicit user approval, separate PROD account provisioning, and private backup/recovery planning. Never set the production switch merely because UAT passed.

## Usability roadmap

The user approved starting with Write/Read modes and better history navigation on 2026-10-13; those two items are now implemented in UAT source as described above. The day-overview and reading-language/text-size controls below remain proposals, not authorized or implemented.

Prioritize writing/reading clarity over more statistics or mandatory fields:

1. **Player Write / Read modes — implemented**: keep all entries expanded and autosave in Write; Read presents the same paragraphs as clean text without editable boxes. Switch only after pending saves succeed, and retain the same access/session-clearing safeguards.
2. **Small day overview**: selected date/weekday, daily-versus-match layout, recorded-match count, and clear saved/unsynced state. Distinguish “not written” from “no recorded match”; do not treat writing coverage as a player grade or attendance.
3. **Reading-language controls**: original, manual translation, or both; default to both, remember only the preference (not text). This shortens mobile reading without automatic translation or collapsing entry sections. Optional readable-text size controls can follow.
4. **Better history browsing — implemented**: month filter, latest saved-date shortcut, and preserve the selected date on Admin refresh. Continue loading only one private day at a time; do not add whole-history downloads/search or exports implicitly.

Protected recovery for accidental mobile closure and revision history are a separate reliability/privacy design, not a reason to store plaintext drafts locally. Avoid mandatory ratings, extra goal boxes, automatic rewriting, public sharing, or streak pressure.
