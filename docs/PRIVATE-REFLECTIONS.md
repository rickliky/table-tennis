# Private player notebook — UAT implementation

External translation is on hold. No provider, API key, AI button, billing, or transmission of writing to a translator is enabled. Notebook examples are design references only, not imported data.

## Access and layout

- `feedback.html` uses a dedicated player login, not the seven-day club gate. The anonymous directory exposes only enabled player names/IDs and bilingual mode, never writing, dates, counts, hashes, or session details.
- Initial accounts: Jacelyn (`LK-0080`) and Kaitlyn (`LK-0002`). Their separately supplied passwords must never be committed. Optional remember-login is checked by default and lasts an absolute 56 days; uncheck on shared devices, in which case the session remains in the current page only. Lock revokes the server token.
- Default Mon/Tue/Wed/Fri/Sat: one daily reflection. Thu/Sun: recorded-match cards (training and tournament clearly separated), plus an optional daily note. Actual matches remain available on any weekday; missing imports never generate invented results. Match cards use record-ID order, not a claimed play order.
- One daily coach-feedback block, entered by the player. No ratings, approval/publishing, per-match coach inputs, or separate “Things to improve” field.
- Only the two initial IDs have English reflection originals and manual Japanese versions, plus Japanese coach originals and manual English versions. Other enabled players write Japanese only; enforced by the Worker.

## Privacy boundaries

The shared Worker changes apply only to UAT. Production private endpoints return 404 unless `PRIVATE_REFLECTION_PROD=true` is separately enabled at an approved release. Production legacy behavior/data is retained during UAT review.

UAT member/maintenance data returns empty legacy reflection collections and audit responses filter legacy reflection changes. Generic reflection submissions, reviews/batch reviews, and bulk writes are blocked. The private namespace is absent from normal API datasets and export/promotion scripts; those scripts also exclude legacy reflection bodies. Do not copy UAT journals into PROD or provision PROD accounts during ordinary dataset promotion.

This is application-level privacy, not end-to-end encryption. General Site/Admin/Approver tokens cannot read/write notebook text. Administrators can manage account enable/reset/disable but cannot read notebook bodies through the application. Infrastructure operators with Redis access can technically read writing. Sharing a player password or remembered device also shares access.

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

The Worker `/api/reflections/accounts` GET/POST requires the Admin role. It is not a content-management endpoint. The current Admin page does not expose notebook content or account passwords; use the restricted script to manage feature access.

## Verification

- `npm run verify`: tracked JS/JSON checks, existing Worker security tests, private Worker isolation/ownership/rate-limit/revocation/revision tests, existing member/Admin browser tests, and private-notebook browser tests.
- `node worker/test-private-redis.js --live`: optional real Upstash Lua concurrency test using four UUID-scoped synthetic UAT-test keys, removed in `finally`; never uses a live player's account or diary. Credentials come from process variables or gitignored `upstash.env`, not source.
- Browser tests use synthetic text/passwords only and cover login/restoration/lock, wrong passwords, separate accounts, daily/match/weekend/Friday layouts, manual bilingual/Japanese-only fields, escaped content, failed autosave/blocked navigation/reauth, stale-tab conflict choices, and JA/EN at 320/390/1440 px.
- Live UAT smoke treats Reflection as a limited anonymous directory with protected private-day access, not a member-data route. Other routes keep their existing gates.
- Before deployment, recheck legacy collections/audit counts without printing bodies. If real legacy content appears, stop and plan a restricted archive/migration; do not delete it automatically.
- A production release requires explicit user approval, separate PROD account provisioning, and private backup/recovery planning. Never set the production switch merely because UAT passed.
