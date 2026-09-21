# Cross-PC Project Workflow

- Set up OpenCode independently on each PC and clone this same GitHub repository on both machines.
- GitHub is the single source of truth for source code, project data, documentation, configuration, and important AI instructions.
- Keep important project context in version-controlled files, including this `AGENTS.md`; do not rely on local OpenCode chat or session history.
- Before working on either PC, run `git pull` to get the latest shared state.
- When work is complete, commit the intended files and run `git push` so the other PC can pick up the changes.
- Do not overwrite, revert, or discard work that originated on the other PC without approval.

## Agent Self-Rule

At the end of every conversation (or at natural stopping points), the agent MUST:
1. Update the "Session Context" section of this file with key decisions, new rules, and current status
2. Commit this file so the other PC can pick up the context
3. Remind the user to `git push` if SSH is not configured

---

# Project: Little Kings Table Tennis

## Purpose

Static bilingual (Japanese/English) website for a table tennis club in Kanagawa, Japan. Provides club statistics, player profiles, training match results, session replay, and a player profile supplement survey.

## Architecture

```
GitHub Pages (static hosting)
├── index.html          → Main page (leaderboards, calendar, charts, sessions, players)
├── player.html?id=     → Individual player profile page
├── admin.html          → Admin CRUD tool (both branches)
├── data-client.js      → Public data API client
└── worker/             → Secure admin/API layer for Upstash Redis
```

**Data flow**: Upstash Redis → Worker API → static site reads approved data

**Admin flow**: admin.js → Worker validation → pending change → approver review → Upstash Redis

## Technology Stack

- **Frontend**: Vanilla JavaScript (no framework, no build tools)
- **Charts**: Chart.js 4.4.8 with custom `valueLabels` plugin
- **Fonts**: Barlow Condensed + Noto Sans JP (Google Fonts)
- **Hosting**: GitHub Pages (production from `main`, UAT from `uat`)
- **Backend**: Cloudflare Worker for API, authentication, validation, and approval
- **Data source**: Upstash Redis with `uat:*` and `prod:*` namespaces
- **CI/CD**: GitHub Actions pages deployment on push

## Branches

- `main` → Production (deployed to `/`)
- `uat` → UAT/Testing (deployed to `/uat/`) — contains admin tool + data/ source files

## Key Files

### Core (both branches)
| File | Purpose |
|------|---------|
| `app.js` (78KB) | Main page logic: leaderboards, session calendar, charts, player grid, match cards |
| `player.js` (88KB) | Player profile: stats, charts, opponent analysis, match archive |
| `styles.css` (107KB) | All styles for the entire site |
| `access-gate.js` | Password gate with 7-day localStorage TTL, bilingual (JA/EN) |
| `category-colors.js` | Color mapping for player categories (小学生/中学生/高校生/一般) |
| `Code.gs` | Google Apps Script backend: doGet (publicData), doPost (CRUD) |

### Admin/API
| File | Purpose |
|------|---------|
| `admin.js` | Admin CRUD and approval UI |
| `admin.html` | Admin tool page on both branches |
| `data-client.js` | Public and authenticated API client |
| `lookups.js` | Normalized bilingual lookup metadata |
| `worker/` | Secure Worker API implementation |

### Data files and records
| File | Content |
|------|---------|
| Upstash `*:players` | Approved player records |
| Upstash `*:matches` | Approved training match records |
| Upstash `*:clubs` | Approved club records |
| Upstash `*:pending-changes` | Pending and reviewed admin changes |

## Bilingual System

All user-visible text exists in `words.en` and `words.ja` objects inside `app.js` and `player.js`. The `language` variable (from localStorage `lk-language`, default `ja`) controls which set is used. The `t(key)` function returns the translated string.

**When adding new text**: ALWAYS add the key to BOTH `words.en` and `words.ja`.

## Player Profile Dossier Labels

The player profile page (`player.js`) uses bilingual labels for profile fields:
- `'性別 / Gender'` → maps to `['Gender','性別']`
- `'選手カテゴリ / Player Category'` → maps to `['Player Category','選手カテゴリ']`
- etc.

Values are also bilingual: `'女性 / Female'` → `['Female','女性']`, etc.

## Data Schema

### Player object (from Upstash API)
```json
{
  "playerId": "LK-0001",
  "displayName": "三田村",
  "englishName": "Mitamura",
  "gender": "Male|Female",
  "schoolLevel": "小学生|中学生|高校生|一般",
  "playingHand": "右|左",
  "grip": "シェークハンド / Shakehand|ペンホルダー / Penhold",
  "playingStyle": "ドライブ攻撃型 / Topspin attacker|...",
  "blade": "",
  "forehandRubber": "Butterfly ディグニクス09C / Dignics 09C",
  "backhandRubber": "Butterfly ディグニクス05 / Dignics 05",
  "forehandRubberType": "裏ソフト|表ソフト|粒高|アンチ",
  "backhandRubberType": "裏ソフト|表ソフト|粒高|アンチ",
  "rating": "",
  "status": "Active|Inactive"
}
```

### Match object (from Upstash API)
```json
{
  "matchId": "LKM-20260910-001",
  "matchDate": "2026-09-10",
  "event": "Little Kings Club Matches",
  "division": "Open",
  "format": "Singles",
  "player1Id": "LK-0064",
  "player1Name": "選手名",
  "player1Sets": 3,
  "player2Id": "LK-0081",
  "player2Name": "選手名",
  "player2Sets": 0,
  "winnerId": "LK-0064",
  "winnerName": "選手名",
  "score": "3-0",
  "resultStatus": "Completed|Incomplete|Void|Transcribed - review"
}
```

## Important Business Rules

- **Active players only**: public API filters `status === 'Active'`
- **Match completion**: `isComplete()` = `player1Sets >= 3 || player2Sets >= 3`
- **Training matches only**: filtered by `eventType()` checking for "club|training|練習" in event/division
- **Minimum matches for ranking**: `gameDays * matchesPerDay` (typically 2 per day)
- **Category precedence**: 小学生 → 中学生 → 高校生 → 一般 → 未設定
- **Image fallback**: `img/{playerId}.jpg` → on error → `img/NoProfilePic.jpg`
- **Password gate**: site/admin sessions issued by the Worker; no privileged token is exposed to browsers

## Git Safety

### Safe to auto-run
- `git status`, `git diff`, `git log`, `git branch`, `git show`, `git pull`

### Requires confirmation
- `git commit` — ask before committing
- `git push` — ask before pushing

### Never auto-run
- `git push --force`
- `git reset --hard`
- `git branch -D`
- Any destructive git operation

## Development Conventions

- No build step: edit files directly, commit, push
- All styles in single `styles.css` — no CSS preprocessor
- No TypeScript, no JSX — plain ES6+ JavaScript
- Chart instances stored in `charts[]` array, destroyed before re-render
- HTML generated via template literals (innerHTML) — be careful of XSS
- No unit tests — review is manual
- Profile images: `img/{playerId}.jpg` (150-280KB each), originals in `img/original/`

## Legacy Migration Files

- Google Apps Script, survey pages, repository JSON snapshots, and refresh workflows are temporary rollback/migration sources.
- Delete them only after Worker deployment, Upstash migration, and manual UAT verification succeed.

## Known Issues

- `Code.gs` `submitEquipmentSurvey_` validates rubber types as `['裏ソフト','表ソフト','粒高','アンチ']` but the survey form also offers `一枚 / OX pips` — OX submissions would be rejected server-side
- `admin.js` is client-side only — data must be manually exported and committed
- No error boundaries — a single JS error can break the entire page render

---

## Session Context

### Data Rules (CRITICAL)
- **Upstash Redis is the SOLE golden source of truth** for ALL data — never load from local files at runtime
- **ALL golden source data is in Upstash**: clubs, players, matches, externalOpponents, tournaments, tournamentMatches, tournamentProgress, **rubbers**
- `data-client.js` populates rubber globals (`window.RUBBERS`, `window.RUBBER_DB`, `window.RUBBER_NAME_TO_ID`) from the Upstash API response — no static `rubbers.js` script tag needed
- Local `backup/` files are **offline-only reference** — never used at runtime, never used as fallback
- Always push data changes to Upstash via Worker API (`/api/change`) after modifying data
- Always commit and push code changes to git so the other PC can pick them up
- When the agent modifies data, it should push to Upstash AND commit to git, then tell the user to push

### Rubber System (Implemented)
- 203 unique rubbers with IDs (`RB-0001` etc.), bilingual canonical names, type, brand
- **Golden source**: Upstash Redis (`*:rubbers` key) — served via Worker `/api/public-data`
- Player data stores rubber IDs (e.g., `RB-0002`), not free-text names
- Admin editor uses `<select>` dropdowns (not `<datalist>`) — works on iPad Safari
- `rubberIdByName()` helper resolves old text names from Upstash to IDs for backward compatibility
- `rubberName()` helper resolves IDs to display names in admin diffs and player profiles
- `data-client.js` builds rubber globals from API response — no script tag dependency
- `admin.js` and `player.js` reference `window.RUBBER_DB` and `window.RUBBERS` directly (not captured at load time)

### Rubber Data Flow
1. **Upstash Redis** (`*:rubbers`) — golden source
2. Worker `/api/public-data` → includes `rubbers` array in response
3. `data-client.js` `loadPublicData()` → builds `window.RUBBERS`, `window.RUBBER_DB`, `window.RUBBER_NAME_TO_ID` from API response
4. `admin.js` and `player.js` reference globals directly (after API load, not at script load time)

### Admin Data Loading
- Admin page loads ALL data from Upstash via `loadPublicData()` → Worker `/api/public-data`
- Worker supports entity types: `clubs`, `players`, `matches`, `externalOpponents`, `tournaments`, `tournamentMatches`, `tournamentProgress`, `rubbers`
- Training matches entity type (`trainingMatch`) is NOT supported by the Worker — cannot push via migration script
- Pending changes require approver login to accept; reject is public

### Migration Script
- `scripts/migrate-to-upstash.js` — pushes local `data/*.json` to Upstash via Worker API
- Supports: clubs, external opponents, tournaments, tournament progress, players, **rubbers**
- Does NOT support training matches (Worker entity type not registered)
- Each push creates a pending change that must be approved in the Data Maintenance page

### Backup Structure
- `backup/uat/` and `backup/prod/` — offline-only reference snapshots
- Files named `*.json.YYYY-MM-DD` (e.g., `players.json.2026-09-18`)
- Generated by `scripts/export-from-upstash.js` — exports current Upstash data
- These files are **NEVER used at runtime or as fallback**

### Cross-PC Setup (Other PC)
- After `git pull`, the other PC needs:
  1. `opencode auth login` → select aihubmix → enter API key (auth is local, not in git)
  2. OR set `GOOGLE_API_KEY` environment variable for Google Gemini free tier
  3. OpenCode config (`opencode.json`) is in the repo — will be picked up automatically

### SSH Not Configured
- `git push` hangs on credential prompt — user must set up SSH keys
- Run: `git remote set-url origin git@github.com:rickliky/table-tennis.git`
- Until then, user must push manually after agent commits

### Recent Changes (This Session)
- **Admin combo boxes now use IDs** with bilingual labels
  - `toOpts()` builds `{id, name}` objects from `static-data.js` instead of stripping IDs
  - `resolveFieldValue()` converts old text values to IDs for backward compat
  - `lookupName()` resolves IDs to bilingual display names for diffs/history
  - `displayValue()` shared function for all diff/create displays
  - All fields: gender, schoolLevel, playingHand, grip, playingStyle, status, grade, round, result, resultStatus, rubberType
  - All static/*.json source files now have both `nameJa` and `nameEn` fields
  - `bilingual()` detects pre-bilingual `name` fields (containing " / ")
  - Old Upstash data (text values) still works — resolved to IDs on load
- **Static data**: `static-data.js` is the single source for all lookup values (IDs + bilingual names)
- **Rubber system**: 203 rubbers with IDs, bilingual canonical names, type, brand
  - `data/rubbers.json` → generates `rubbers.js` via build script
  - Player data stores rubber IDs (e.g., `RB-0002`)
  - `rubberIdByName()` backward compat for old text names
  - `rubberName()` resolves IDs to display names
- **Admin UI fixes**: 
  - Fixed rubber type dropdown (was empty — `opt()` used `x.name` instead of `x.id` for option values)
  - `select()` now handles object options with `{id, name}` for bilingual labels
  - Entity editor rubber dropdown now falls back to all rubbers when type is empty
  - Approver role now only sees "PENDING CHANGES" and "HISTORY" tabs (not all tabs)
  - Approver login overlay redesigned: vertical layout, larger inputs, description text, backdrop blur
  - LK-0086 rubber reference fixed (RB-0156 → RB-0155 after merge)
- **Player/External player merge**: DONE — two tabs share the same editor: "OUR PLAYERS" (Little Kings, clubId=CLUB-0001) and "OTHER PLAYERS" (external opponents). Same entity types, same editor, filtered by tab.

### UAT Release Readiness (2026-09-20)
- Admin navigation is organized as five top-level tabs: Matches, Players, Tournaments, Clubs, and Manage; related views use sub-tabs.
- Match result statuses use lookup IDs (`RS-001` Completed and `RS-002` Incomplete) in the admin editor. `resultStatusId()` preserves compatibility with legacy Upstash text values such as `Verified`, `Complete`, and `Transcribed - review` for filters, badges, and statistics.
- Worker validation accepts both Little Kings players and external opponents for training and tournament matches. Tournament matches use `tournamentId`, `player1Id`, and `player2Id`; tournament progress uses `tournamentId` and `playerId`.
- Before promoting UAT to production: deploy the Worker with the validation update, manually verify the live UAT UI in a browser, and approve any pending Upstash changes.
- Processed UAT audit history can be cleared only through Worker `POST /api/clear-history`; it requires an approver/admin session and preserves all `pending` changes.

### Tournament Calendar Fix (2026-09-20)
- Tournament page calendar now starts on the first tournament's month instead of the current month.
- Fixes the issue where a May 2026 tournament showed a September 2026 calendar.
- `renderCalendar()` initializes `currentMonth` from the earliest tournament date, not `new Date()`.

### Bilingual Fixes (2026-09-20)
- **app.js**: `t('win')`/`t('loss')` → `phrase('win')`/`phrase('loss')` (tooltips were always blank)
- **app.js**: Session calendar weekdays now bilingual (日月火水木金土 vs SMTWTFS)
- **app.js**: Monthly category ranking eyebrow and aria-label now bilingual
- **player.js**: `localizeProfileDossier()` handles all three label formats (bilingual, English-only, Japanese-only)
- **player.js**: "HOW TO READ" dialog eyebrow now bilingual
- **tournament.js**: Rank suffix bilingual (1st/2nd/3rd vs 1位/2位/3位)
- **tournament.js**: Plural `s` only appended in English mode (was showing `参加者s`)
- **tournament.html**: Language toggle shows opposite language; loading text bilingual
- **admin.js**: Diff table headers bilingual (Field/項目, Before/変更前, After/変更後, Value/値)
- **admin.js**: Count labels bilingual (matches/試合, tournaments/大会, etc.)
- **admin.js**: Filter labels bilingual (FROM/開始, TO/終了, STATUS/ステータス)
- **admin.js**: Approver login overlay bilingual
- **admin.js**: History action/status labels bilingual (NEW/新規, ACCEPTED/承認済み, etc.)
- **admin.js**: Day-of-week abbreviations bilingual
- **admin.js**: Nav links, subtitle, editor headings all bilingual
- **admin.js**: Pending/processed summary text bilingual

### Public Lookup Display Rule (2026-09-20)
- Public pages must never render stored lookup IDs (for example `GD-001`, `SL-001`, `PS-001`, `GH-001`, or `INVERTED`) as user-facing text.
- Load `static-data.js` before public page scripts and resolve lookup values by ID, legacy name, `nameJa`, or `nameEn`.
- Display `nameJa` in Japanese and `nameEn` in English; this also merges legacy text records and new ID-based records into one statistics group.
- Applied to the index statistics/setup summaries, player-profile dossier fields, and tournament-progress result labels.
- Leaderboard, ranking, session-matchup, player-grid, and active-player category groupings must normalize `schoolLevel` through the same lookup before grouping; otherwise legacy text values and IDs create duplicate categories such as `小学生` and `SL-001`.

### Main Navigation Language Rule (2026-09-20)
- `access-gate.js` injects the Tournament and Data Maintenance links into the main-page navigation after the static HTML loads.
- These injected links must use the current `lk-language` at creation and be refreshed by `app.js` whenever the language toggle changes; never hardcode them in English.

### Training Match Transcription (2026-09-20)
- Transcribed 54 training matches for 2026-09-17 from handwritten notebook images.
- All player names resolved via `displayName` or overrides (ジェイス=LK-0080, ケイツ=LK-0002, etc.).
- 50 matches had `resultStatus: 'Complete'` pushed as pending updates; 4 are genuinely incomplete (no 3-set winner).
- LK-0002 notebookName updated from "ケイシ" to "ケイツ" (pending approval).
- LK-0153 (ケイツ) was a duplicate — user chose to merge into LK-0002 (李 紫妤 ケイシ) and inactivate LK-0153.
- **9/20 transcription**: 45 matches from 荻窪 session. 38 complete, 7 incomplete, 1 draw (福原 2-2 繁田). New players: LK-0154 (岸), LK-0155 (伊従). 長嶺=長嵐(LK-0152), 平田=岡田(LK-0093).

### Admin Match Filter Redesign (2026-09-20)
- Two-row filter layout: Row 1 = player name search (🔍 + text input, filters as you type); Row 2 = date range + status + tournament dropdown.
- Player search matches against player1Name, player2Name, player1Id, player2Id (case-insensitive substring).
- CSS: `.admin-match-filters` is now `flex-direction: column`; `.admin-match-filter-row` for each row.
- Tournament filter is dynamically read from DOM (`detailRow.querySelector('.player-combobox')`) since it's conditionally rendered.

### UAT→PROD Migration Completed (2026-09-20)
- **Full data replacement**: All UAT data pushed to PROD via `/api/bulk-write` endpoint (direct overwrite, no pending changes).
- **PROD data**: 84 players, 1,561 matches, 44 external opponents, 19 clubs, 1 tournament, 47 progress records, 171 rubbers.
- **Worker deployed** with new `/api/bulk-write` admin endpoint for direct collection overwrites.
- **Code merged**: `uat` → `main` (140 commits), GitHub Pages deployed.
- **All category values** normalized to IDs (SL-001–SL-004) in both UAT and PROD.
- 39 players remain unassigned a category — these are mostly inactive/external players.
- Legacy match statuses (Verified, Complete, Transcribed - review) mapped to canonical IDs via `legacyStatusMap` in admin filter.
- **Match completion rule enforced**: 60 matches with < 3 sets were incorrectly marked Verified/Complete → corrected to Incomplete. Rule: `isComplete()` = `player1Sets >= 3 || player2Sets >= 3` (best-of-5, 3 sets to win).
- **Head-to-head setup fix**: `player.js` head-to-head dialog now resolves lookup IDs (PS-001→ドライブ攻撃型, GH-001→横書きショートハンドル, etc.) via `lookupValue()`.

### Player Profile UAT Redesign (2026-09-21)
- Player profiles now lead with a compact three-column identity block: dossier, portrait, and key all-time/latest records.
- The latest match day remains immediately below the profile, followed by bilingual in-page navigation for latest session, statistics, trends, and archive.
- Existing charts, period statistics, tactical matchup analysis, head-to-head views, and full archive are retained; this is a presentation-only UAT change.

### Leaderboard Controls Fix (2026-09-21)
- Index leaderboard tabs and period arrows use delegated click handling rather than direct element handlers, so Month/Year switching and period navigation remain functional after redraws and on touch browsers.
