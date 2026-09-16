# Cross-PC Project Workflow

- Set up OpenCode independently on each PC and clone this same GitHub repository on both machines.
- GitHub is the single source of truth for source code, project data, documentation, configuration, and important AI instructions.
- Keep important project context in version-controlled files, including this `AGENTS.md`; do not rely on local OpenCode chat or session history.
- Before working on either PC, run `git pull` to get the latest shared state.
- When work is complete, commit the intended files and run `git push` so the other PC can pick up the changes.
- Do not overwrite, revert, or discard work that originated on the other PC without approval.

---

# Project: Little Kings Table Tennis

## Purpose

Static bilingual (Japanese/English) website for a table tennis club in Kanagawa, Japan. Provides club statistics, player profiles, training match results, session replay, and a player profile supplement survey.

## Architecture

```
GitHub Pages (static hosting)
├── index.html          → Main page (leaderboards, calendar, charts, sessions, players)
├── player.html?id=     → Individual player profile page
├── player-profile-supplement.html → Equipment/survey form
├── player-profile-supplements.html → Survey entries list
├── admin.html          → Admin CRUD tool (UAT branch only)
└── data/
    ├── public-data.json       → Live data snapshot (players + matches)
    └── player-profile-supplements.json → Survey entries snapshot
```

**Data flow**: Google Sheet → Apps Script API (Code.gs) → GitHub Actions workflow (refresh-data.yml) → JSON files committed to repo → static site reads JSON

**Admin flow (uat)**: admin.js → client-side editing → manual JSON export → replace data/ files → git commit/push

## Technology Stack

- **Frontend**: Vanilla JavaScript (no framework, no build tools)
- **Charts**: Chart.js 4.4.8 with custom `valueLabels` plugin
- **Fonts**: Barlow Condensed + Noto Sans JP (Google Fonts)
- **Hosting**: GitHub Pages (production from `main`, UAT from `uat`)
- **Backend**: Google Apps Script (Code.gs) for data API + password verification
- **Data source**: Google Sheets (Players, Match Results, Sessions, Player Profile Supplement)
- **CI/CD**: GitHub Actions (refresh-data.yml every 15min, pages.yml on push)

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

### UAT only
| File | Purpose |
|------|---------|
| `admin.js` | Client-side admin CRUD for matches and players |
| `admin.html` | Admin tool page |
| `data/` | Source JSON files (gitignored: players, training-matches, etc.) |
| `scripts/build-public-data.js` | Builds public-data.json from data/ files |
| `uat-roles.json` | UAT role credentials (admin, match-entry, reviewer) |

### Data files
| File | Content |
|------|---------|
| `public-data.json` | `{ok, club, players[], matches[], lastUpdated}` — 540KB |
| `player-profile-supplements.json` | `{ok, entries[]}` — survey data |

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

### Player object (from public-data.json)
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

### Match object (from public-data.json)
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

- **Active players only**: public-data.json filters `status === 'Active'`
- **Match completion**: `isComplete()` = `player1Sets >= 3 || player2Sets >= 3`
- **Training matches only**: filtered by `eventType()` checking for "club|training|練習" in event/division
- **Minimum matches for ranking**: `gameDays * matchesPerDay` (typically 2 per day)
- **Category precedence**: 小学生 → 中学生 → 高校生 → 一般 → 未設定
- **Image fallback**: `img/{playerId}.jpg` → on error → `img/NoProfilePic.jpg`
- **Password gate**: 7-day localStorage TTL, verified against Google Sheet "Password" tab

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

## Google Apps Script API

- **Base URL**: `https://script.google.com/macros/s/AKfycbx6IaN9YT2a4bv_8W76qtNwkFCjZ_-mODBEMTK9IiJlSi91UCIgJ56MQ4WJqeKK3TiUvA/exec`
- **GET** `?action=publicData` → returns full players + matches JSON
- **GET** `?action=profileSupplements` → returns survey entries
- **POST** `action=verifySitePassword` → password check
- **POST** `action=submitEquipmentSurvey` → save survey response
- **POST** with `secret` → authenticated CRUD (appendRows, upsertRows, updatePlayers)

## Known Issues

- `Code.gs` `submitEquipmentSurvey_` validates rubber types as `['裏ソフト','表ソフト','粒高','アンチ']` but the survey form also offers `一枚 / OX pips` — OX submissions would be rejected server-side
- `admin.js` is client-side only — data must be manually exported and committed
- No error boundaries — a single JS error can break the entire page render
