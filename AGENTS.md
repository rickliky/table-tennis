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
- **Major rubber database redesign** — 200 → 171 rubbers
  - Removed 28 entries: 5 blades (Acoustic, Stratus Power Wood, Strato, Hurricane Long 3, Defplay), 4 fakes (Gray Fondarga, Quantix Speed, friendship 729, Acoustic Anti), 19 OX entries
  - Merged 1 duplicate: RB-0156 → RB-0155 (Tibhar Grass D.TecS)
  - Reclassified 6 rubbers: Impartial XB/XS/Bugller → SHORT_PIPS, VO>102 → SHORT_PIPS, C-8 → LONG_PIPS, 802-40 → SHORT_PIPS
  - Converted all types to English enums: INVERTED, SHORT_PIPS, LONG_PIPS, ANTI (removed 一枚/OU type)
  - Normalized brand names (STIGA→Stiga, TIBHAR→Tibhar, XIOM→Xiom, etc.)
  - Fixed typo: Tibhar Genuis → Genius
  - Created `scripts/rebuild-rubbers.js` for direct Upstash rebuild
  - Created `scripts/convert-player-types.js` for player type migration
- **Worker updates**: Added `/api/bulk-rubbers` endpoint, fixed rubber validation in `validation.js`
- **Frontend fixes**: Added `rubberName()` to `app.js` (was showing raw RB-xxxx IDs), updated `lookups.js` and `static/rubber-types.json` to new 4-type model
- **Player data**: Converted 28 players' rubber types from Japanese to English enums
- **Upstash secrets**: Stored as env vars now available via `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (extracted via temp Worker endpoint)
- All data pushed to both UAT and Prod
- 4 rubbers flagged for REVIEW: RB-0001 (Zyre 03), RB-0114 (Flexair), RB-0131 (Xiom H3), RB-0163 (Palio Hexer)
