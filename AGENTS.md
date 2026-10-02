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
3. Commit the updated `AGENTS.md` and `git push` it (SSH is configured on PC 1)

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

### MANDATORY Workflow: UAT First, Prod Only With Approval

**All changes go to the `uat` branch first. Never edit `main` directly.**

1. Branch from / switch to `uat`, make the change, commit, and push to `uat`
2. Let the UAT site deploy and test the change there (check `gh run list --branch uat`)
3. Report results and **wait for the user to explicitly confirm**
4. Only then promote to `main` (`git checkout uat && git merge uat`-style fast-forward, or `git push origin uat:main`) and push

Pushing to `main` without the user's explicit confirmation is a rule violation — even if the UAT test looked clean. The single exception is docs-only commits that change no site behavior (e.g. `AGENTS.md`, `.opencode/` config), which may go straight to `main` AND `uat` together so the branches stay in sync.

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
- **ANY push to `main`** — changes must land on `uat`, be tested, then be approved by the user before promoting to production (see "MANDATORY Workflow: UAT First" under Branches). Ask every time; do not treat prior approval as standing approval.
- `git rebase`, `git revert`, force-writing history, or committing files not touched as part of the task — ask first

### Requires no confirmation
- Commit + push to `uat` — SSH is configured and the user has authorized this (2026-10-02)
- Docs-only commits that change no site behavior (may be pushed to both branches together)

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

### Phase 1 Product Experience Upgrade (2026-10-02) — LIVE IN UAT, AWAITING PROD APPROVAL
- UAT behavior commit `8af1c5b` is deployed at `/uat/`; GitHub Actions run `36991109529` passed the syntax gate and Pages deployment. Nothing from this package has been promoted to `main`.
- Match records remain exactly as entered. A training match contributes to completed statistics only when `player1Sets >= 3 || player2Sets >= 3`; Admin Overview currently identifies 69 below-three-set records as retained but excluded, not as records to bulk-correct.
- Data Maintenance now opens on a responsive Overview with active-player, training-match, approval, and latest-session KPIs; a Data Health queue links to score/status and player-completeness filters; quick-create actions and recent approvals are visible at a glance.
- Player maintenance adds active/inactive and profile-completeness filters plus completion percentages. Completed player statistics now use the same three-set rule. Editors have sticky save actions, an unsaved-change indicator, navigation warnings, and a browser unload warning.
- Home now combines player search with a compact Club Pulse showing latest-month completed matches, completion rate, close-match rate, unique pairings, and a per-session comparison. Session Replay is collapsed by default and opens from the latest-session link; detailed insights and the volume chart use progressive disclosure.
- Player profiles now use Overview, Performance, Opponents, and Matches views. Overview is substantially shorter, direct hash links work, chart resizing is safe when Performance opens, and all existing analytics/archive content is retained.
- Follow-up UAT fix `3967edc` removed a legacy CSS rule that hid the new Opponents view. The tab now displays monthly/yearly most-played, most-beaten, and most-lost-to lists with W/L history dots and opponent profile links; live mobile verification found 2 period panels, 30 links, zero overflow, and zero console errors.
- Live UAT Playwright verification passed at 320, 390, 768, 1024, and 1440 px with zero horizontal overflow or console errors. UAT shows 86 active/1 inactive players, 1,793 matches over 39 dates, and 57 completed + 3 incomplete matches on 2026-10-01.

### Opponent Improvement Trends (2026-10-02) — PROPOSED
- Recommended primary view: select one opponent, then show a monthly timeline combining match volume, W-L/win rate, average set differential, and close-match conversion. Set differential should be the main improvement signal because progress from 0-3 to 2-3 appears before win rate changes.
- Add a recent-versus-previous comparison (last 5 completed matches against that opponent versus the prior 5), milestones such as first win and first decisive win, and an all-opponents month matrix for scanning recurring matchups.
- Use only matches complete under the three-set rule. Always display sample size and confidence (`1-2` low, `3-5` medium, `6+` stronger); do not label improvement or decline when the sample is too small.

### UAT Audit Remediation (2026-10-02) — LIVE, AWAITING PROD APPROVAL
- UAT behavior commits `b03995c`, `e8422a6`, `ee61ee8`, and `f599174` are deployed. Nothing from this remediation has been promoted to `main`.
- The password gate now blocks public-data requests until site login succeeds. Direct supplement-page login uses the Worker URL, the password controls appear in the first mobile viewport, and the long club introduction is collapsed by default.
- The obsolete Google Apps Script/static-JSON supplement workflow was retired. `player-profile-supplements.html` reads approved Upstash data through `data-client.js`; `player-profile-supplement.html` is now a safe redirect to the player editor in Data Maintenance.
- Public lookup IDs no longer leak from audited home/profile renderers. Profile images use `profile-images.js` so players without photos load `NoProfilePic.jpg` directly instead of causing dozens of 404 requests.
- Progressive rendering is live: home initially shows 12 of 60 latest-session matches and 24 of 86 player cards; LK-0093 initially shows five match days (32 cards instead of 153); Admin initially renders 100 of 1,793 match rows. Tournament fields are collapsed by default and searchable.
- Responsive/accessibility fixes are live: no horizontal overflow at 320, 390, 768, 1024, or 1440 px in audited views; Admin approver modal locks body scroll and closes on Escape; Admin has an `<h1>` and labeled status filter; visible charts have accessible labels; invalid player IDs hide all empty profile sections.
- Live Playwright verification found zero console errors, failed asset/image requests, or raw `GD-*`/`PH-*`/`PS-*`/`GH-*`/`SL-*` values on the audited UAT pages. Home initial DOM dropped from 4,098 to about 1,500 nodes; mobile overflow is zero; expansion controls restore full lists on demand.
- Cache-bust tokens `?v=20261002-audit2` and `audit3` are intentionally applied to changed CSS/JS references so GitHub Pages does not combine old cached assets with new HTML.
- One-time `gh-pages` cleanup commit `2703627` removed 10 obsolete files under `/uat/`: old admin JSON, `lookups.js`, `opencode.jsonc`, legacy supplement JS/JSON, `public-data.json`, `rubbers.js`, old build script, and `temp_matches.json`. All return 404; the replacement singular supplement redirect returns 200. Production-root stale files were not touched because production promotion has not been approved.
- Duplicate-player change `CHANGE-1790919051810` was accepted: `LK-0153.status` is now `ST-002`. The Worker still returns all 87 player records from `/api/public-data`, so `data-client.js` now filters inactive players on non-Admin pages while Admin retains all records; the public UI correctly shows 86 active players. Long term, split active-only `/api/public-data` from an authenticated all-records Admin endpoint.
- Admin match pagination now sorts all filtered records newest-first before taking the first 100; it also displays each date's full result count and opens the newest record by default.
- Before production: obtain explicit user approval for this release, promote UAT code to `main`, then remove equivalent obsolete production-root published files without deleting valid content.

### Product UX and Analytics Review (2026-10-02)
- Durable roadmap: `docs/PRODUCT-UX-ROADMAP.md`. It covers visitor/coach information architecture, player-profile navigation, recommended statistics, Data Maintenance overview and health queue, import workflow, API/schema foundations, visual direction, and phased delivery.
- Current UAT evidence: 86 active players, 1,793 training matches, 1,700 complete under the 3-set rule, 93 incomplete, 39 training dates, average 24 match participants/date, 3 tournaments, 293 tournament progress records, and 290 external opponents.
- Data completeness limits advanced analysis: 39 active players lack category, 47 lack hand/grip/style, 48 lack forehand/backhand rubber, 72 lack grade, and only 24 have profile photos.
- Data-quality review found 42 legacy `Verified` scores of 2-0, 2-1, or 1-0. Do not bulk-change them: add an explicit match format (`Best of 3`, `Best of 5`, `Short practice`) and review whether these are valid short-format matches.
- Recommended next UAT package: (1) Admin Overview + Data Health queue, (2) compact Home hero/search + Club Pulse, (3) player-profile Overview/Performance/Opponents/Matches views, and (4) sticky editor actions, dirty-state warning, and status/completeness filters.

### Data Rules (CRITICAL)
- **Upstash Redis is the SOLE golden source of truth** for ALL data — never load from local files at runtime
- **ALL golden source data is in Upstash**: clubs, players, matches, externalOpponents, tournaments, tournamentMatches, tournamentProgress, **rubbers**
- `data-client.js` populates rubber globals (`window.RUBBERS`, `window.RUBBER_DB`, `window.RUBBER_NAME_TO_ID`) from the Upstash API response — no static `rubbers.js` script tag needed
- Local `backup/` files are **offline-only reference** — never used at runtime, never used as fallback
- Always push data changes to Upstash via Worker API (`/api/change`) after modifying data
- Always commit and push code changes to git so the other PC can pick them up
- When the agent modifies data, it should push to Upstash AND commit + push to git (no manual user push needed)

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

### SSH Configured on PC 1 (2026-10-02)
- SSH key `~/.ssh/id_ed25519` (ed25519, no passphrase) registered with GitHub as `rick-pc1-2026-10-02` (key ID 165123503)
- Remote is `git@github.com:rickliky/table-tennis.git` (SSH) — `git pull` / `git push` work non-interactively
- `~/.ssh/config` points github.com at the key with `UserKnownHostsFile ~/.ssh/known_hosts_github` (the old `known_hosts` file is ACL-locked and unusable — do not delete it)
- GitHub CLI (`gh`) is installed and authenticated as `rickliky` (scopes: repo, admin:public_key)
- **Agent MAY commit and push directly without asking** (user instruction, 2026-10-02) — still pull before working, and never force-push or use destructive git operations
- PC 2 still needs its own key: generate one, then add it via `gh api user/keys` after `gh auth login`

### Dev Tooling: Playwright + Syntax Gate + Upstash MCP (2026-10-02)
- **Playwright MCP** configured in `opencode.json` (msedge, headless, isolated). Lets the agent load the live UAT/prod site, read console errors, and snapshot the DOM before asking for approval — this is what makes the UAT-first rule testable rather than trust-based.
- **Upstash MCP** (`upstash-redis`) also in `opencode.json`, credentials via `{env:UPSTASH_REDIS_REST_URL}` / `{env:UPSTASH_REDIS_REST_TOKEN}`.
  - Credentials are stored in **`upstash.env` (gitignored, never committed)** and as Windows User-scope env vars.
  - `opencode.json` is **publicly served** at `rickliky.github.io/table-tennis/opencode.json` — NEVER inline a secret there; always use `{env:...}` substitution.
  - The OpenCode service must be restarted (`opencode service restart`) after setting the env vars, or MCP servers inherit a stale environment and fail with "No database configured".
- **CI syntax gate**: `scripts/check-syntax.js` validates every tracked `.js` (`node --check`) and `.json` (`JSON.parse`). `pages.yml` runs it **before** both deploy steps, so a broken file cannot deploy. Skip list: `node_modules`, `.wrangler`, `.playwright-mcp`, `package-lock.json`, and `.gs` (GAS-only globals).
  - Run locally: `node scripts/check-syntax.js` (exit 0 = clean, exit 1 = broken file listed).
- **Repo/publish cleanup**: `worker/node_modules` (1655 files, 166.9 MB), `worker/.wrangler` (21 files), and the 0-byte `worker/migration.json` were tracked AND publicly served. All untracked + gitignored, then purged from `gh-pages` (published site went 3660 → 307 files).
  - `keep_files: true` in `pages.yml` means untracking alone does NOT remove already-published files — a `gh-pages` deletion commit is required, and only after `main` has the fix (otherwise the next prod deploy re-adds them).
  - Root `migration.json` (776 KB, valid) is intentional and must be kept.

### UAT UX/Functional Audit (2026-10-02) — FINDINGS ONLY, NO FIXES YET
- Playwright audit covered desktop (1440 px), mobile (390 px), narrow mobile (320 px), and tablet (768/1024 px) across home, player, tournament, supplement directory/form, and admin pages. Core navigation, language switching, search, leaderboard tabs, tournament expansion, admin filters, and player-to-admin shortcuts work.
- **Broken direct login:** `player-profile-supplements.html` and the legacy singular form omit `api-config.js`; their password form posts to `https://rickliky.github.io/api/login` (404) instead of the Worker. A first-time visitor opening either page directly cannot log in.
- **Legacy live form is orphaned:** `player-profile-supplement.html` / `.js` are served from stale `gh-pages` files but do not exist on `main` or `uat`. They use stale `public-data.json` (83 players vs current 87) and submit to Google Apps Script, outside the Upstash golden-source flow. OX rubber responses are rejected by `Code.gs`, while `mode:'no-cors'` still shows a success screen (silent data loss).
- **Stale published files:** UAT serves 10 files absent from the `uat` branch: `admin-players.json`, `admin-training-matches.json`, `lookups.js`, `opencode.jsonc`, singular supplement HTML/JS, `public-data.json`, `rubbers.js`, `scripts/build-public-data.js`, and `temp_matches.json` (about 3.2 MB total). PROD root also serves singular supplement HTML/JS and `public-data.json`. `keep_files:true` preserves deleted files indefinitely.
- **Lookup IDs leak publicly:** home search/directory cards display `GD-001`, `PH-001`, `PS-001`, `GH-001`, and `INVERTED` (157 visible value spans in the audited state). Player archive cards display `SL-001`–`SL-004` in 132 category labels. Dossier/latest-session labels resolve correctly; these renderers do not.
- **Duplicate player regression:** `LK-0153` (ケイツ) is still `ST-001` active despite the documented merge/inactivation into `LK-0002`. It shares notebook name ケイツ, is searchable, and inflates the displayed total to 87, while only 86 directory cards render.
- **Excessive rendering/page length:** home mobile renders 60 match cards + 86 player cards (43,648 px; 4,098 DOM nodes); LK-0093 profile renders 153 match cards (50,126 px; 6,363 nodes); admin renders all 1,793 training rows (12,830 nodes; internal list scroll height 211,788 px). Pagination/lazy rendering/collapsed defaults are needed.
- **Admin mobile layout:** at 390 px the document overflows 13 px; at 320 px it overflows 80 px. Approver login and tournament tabs clip; Clubs/Manage require an unhinted horizontal swipe; the match heading/search also clip awkwardly.
- **Password-gate UX:** on 390 px the password input begins around 1,263 px down after long notices/club introduction. The full underlying page/API/images load behind the fixed overlay; the gate is visual rather than a data-access boundary.
- **Other UX/accessibility issues:** invalid/missing player IDs show an error hero but leave empty chart/stat/archive controls visible; supplement-directory mobile header is cramped; latest tournament card says `88 PARTICIPANT`; admin login overlay does not lock background scroll or close on Escape; chart canvases lack accessible labels/fallback; admin status select has no label and admin has no `<h1>`; many mobile controls are below the recommended 44 px target; missing profile photos cause 62 home, 29 profile, and 3 tournament 404 requests per audited load (fallback works).
- No code or data fixes were made during this audit. Await user prioritization before implementation; all behavior changes must follow UAT-first promotion.

### Branch Workflow Rule (2026-10-02) — MANDATORY
- **All code/data changes go to `uat` first, get tested on the UAT site, then require the user's explicit per-change confirmation before pushing to `main`.**
- The agent may commit and push to `uat` freely, but **any push to `main` must be asked about each time** — prior approval is not standing approval.
- Exception: docs-only commits (no site behavior change) may go to both branches together to keep them in sync.
- At the time of this rule, `main` and `uat` were fast-forwarded to the same commit `5a3ce3c`, so they start in sync.

### SSH Auto-Commit/Push Enabled (2026-10-02)
- PC 1 now has full SSH access: `~/.ssh/id_ed25519` (ed25519, no passphrase) registered with GitHub as `rick-pc1-2026-10-02` (key ID 165123503)
- Remote switched from HTTPS to `git@github.com:rickliky/table-tennis.git` — `git pull`/`git push` run non-interactively with no credential prompt
- The legacy `~/.ssh/known_hosts` file is ACL-locked (cannot be read, rewritten, or deleted) — `~/.ssh/config` bypasses it with `UserKnownHostsFile ~/.ssh/known_hosts_github`. Leave that locked file alone.
- GitHub CLI installed (`winget install GitHub.cli`, v2.102.0) and authenticated as `rickliky` with `repo` + `admin:public_key`; used to register the SSH key via `gh api user/keys`
- **New rule**: the agent commits and pushes directly on its own — no more asking the user to push. `git pull` first, and destructive git commands remain forbidden.
- PC 2 still needs setup: `ssh-keygen -t ed25519`, then `gh auth login` + `gh api user/keys` to register its key, then `git remote set-url origin git@github.com:rickliky/table-tennis.git`

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
- The yearly leaderboard avatar observer must detect an avatar immediately before a direct player link as well as one before its parent wrapper; otherwise it repeatedly injects portraits and freezes the page.
- Yearly podium rows now use the same `<b>` + `recordSummary()` structure as monthly rows, so avatar, name, and win/loss record align identically in the grid layout.

### Build Info Deployment Fix (2026-09-21)
- `build-info.json` is explicitly unignored and committed. This lets the Pages workflow publish its generated build stamp; the nested UAT `.gitignore` negation also overrides the stale root `gh-pages` ignore rule for `uat/build-info.json`.

### Admin Match Reset Fix (2026-09-21)
- RESET button now explicitly resolves `record.resultStatus` through `resultStatusId()` before setting the `<select>` value, preventing blank result status after reset.
- CLEAR button defaults to `completedStatusId` instead of leaving the select empty.

### Player Profile Lookup Resolution (2026-09-21)
- Opponent playing hand, grip, style, rubber type, and category labels now resolve through `lookupValue()` across all player profile sections: session card details, opponent insight tooltips, period setup analysis, and tactical matchup profile.

### Lookup Data Normalization (2026-09-21)
- Added `scripts/normalize-lookup-ids.js`, which converts legacy player and external-opponent lookup text to canonical `static-data.js` IDs through Worker pending changes.
- UAT normalization is approved and verified: all player and external-opponent lookup values now use canonical IDs, eliminating separate source groups such as `右` and `PH-001`.
- The matching 87 PROD changes are pending approval: 43 Little Kings players and 44 external opponents. No identity or match data changes.

### Analytics Upgrade (2026-09-21)
- Index now has Activity & Competition insights: latest-month activity versus prior month, participation, close-match share, most-active players with opponent diversity, and category matchup volumes.
- Player profiles add Form & Activity insights: last-10 form, 3–2/2–3 close-match record, unique opponents, and sessions attended.
- Head-to-head views add set differential, close-match record, recent-five form, and shared-opponent count alongside their existing timeline, streak, history, and setup context.

### Player-to-Admin Shortcuts (2026-09-21)
- Each player profile offers Add Training Match and Edit Player Profile shortcuts. URL parameters route Admin directly to the training-match form with that player preselected, or to the matching player editor.

### Tournament Data Corrections (2026-09-21)
- 2026全農杯 data was recreated as `2026年度全農杯日本卓球選手権大会（ホープス・カブ・バンビの部）県予選会` (2026-05-03, 川崎市多摩スポーツセンター).
- Its 47 listed finishers have 28 representatives: 3 recommended (`鈴木希華`, `茂田悠稀`, `森本夏愛`) plus the source-sheet representative placements. 茂田翔紀 is ホープス男子1位, not recommended; 三浦健人 is not a representative.
- Corrected external-player names include 下田さくら, 鈴木梨楓, 内田結衣, 中間琴海, 茂田翔紀, 森本陽喜, 蒋修逸, 酬醐宙, 倉田東弥, 森本夏愛, and 鈴木伶奈.
- Admin editor now has `rank`, `recommended`, and `qualified` fields for tournament progress.
- Tournament page displays 推薦 badge for recommended players and 代表 badge for all representatives.

### Tournament Scouting (2026-09-21)
- Tournament detail pages now turn tournament fields into preparation briefs for Little Kings: field size, known vs. unscouted opponents, and representative/recommended priority opponents with documented LK scorelines.
- Tournament details render documented tournament match results by stage; player profiles render an LK-only Tournament Preparation / Field Readiness card for divisions they entered.
- Tournament preparation metrics deliberately remain separate from club-training leaderboards and training statistics; tournament and training results are used only as opponent-scouting context.

### Cadet Boys Results and Tournament UI (2026-09-22)
- UAT tournament `TOURNAMENT-0002` now has verified published-result progress records for Cadet 13U Boys (7 representatives) and Cadet 14U Boys (8 representatives plus 2 recommended players). Little Kings involvement is recorded for `LK-0005` (13U), `LK-0009` (14U Top 16), and `LK-0046` (14U Top 16).
- Added lookup `TP-011` for bilingual `ベスト16 / Top 16` tournament outcomes in `static/tournament-results.json` and regenerated `static-data.js`.
- The boys’ full bracket fields are not yet imported: currently UAT contains result/Little Kings records only, not all 105 13U and 143 14U participants. A review CSV exists locally for the supplied bracket PDF; do not use it as runtime data.
- Tournament index/detail UI was refreshed: Competition Hub hero and featured event, event scoreboards, division navigation/panels, Little Kings outcomes, and source-club snapshots. Card outcomes now use `rank`, `recommended`, and `result` instead of the obsolete `seed` field.

### Grade Lookup Display Fix (2026-09-22)
- Stored grade IDs such as `GR-002` must never be shown to users. Public player profiles and tournament field tables resolve them through the bilingual `grades` lookup (`2年生` / `2nd year`).
- Admin player-list and grade-history displays resolve grade IDs to labels; its dynamic grade selector and annual progression now retain grade IDs as values while showing labels.

### Tournament Match Results Presentation (2026-09-22)
- Documented tournament matches now appear immediately after the tournament overview and Little Kings highlights, before notes and full division fields.
- The former dense match rows are score cards that show round/date, both players, winner emphasis, and the score; LK names remain links to player profiles.
- Match cards prefer the full name snapshot saved on each tournament-match record (`player1Name` / `player2Name`) over a potentially abbreviated current profile display name.
- Tournament match results use the same `match-card` layout as internal training results (date, tournament-round badge, W/L markers, score, and context) rather than a separate tournament-only card pattern.
- Each Little Kings tournament highlight card now summarizes any documented event matches for that player: win/loss record, match count, and player-perspective scoreline(s).

### Recent Training Match Promotions (2026-09-27)
- The 65 verified matches from 2026-09-24 and 62 verified matches from 2026-09-27 were accepted in UAT and promoted to PROD through `scripts/uat-to-prod.js`.
- PROD now has 1,733 matches. The 2026-09-27 batch (`LKM-20260927-001`–`062`) is live and verified: 59 `RS-001` Completed and 3 `RS-002` Incomplete (`岡田 2-0 山本`, `福原 2-0 井関2`, `萩谷 2-0 ケイツ`).
- Import inputs and repeat-safe UAT scripts: `scripts/training-matches-2026-09-27.txt` and `scripts/import-training-matches-2026-09-27.js`.

### Training Match Import (2026-10-01)
- The 60 2026-10-01 training matches (`LKM-20261001-001`–`060`) were accepted in UAT and promoted through the safe PROD overlay. `scripts/import-training-matches-2026-10-01.js` / `scripts/training-matches-2026-10-01.txt` are repeat-safe.
- A subsequent approved UAT correction updated `LKM-20261001-007`, `LKM-20261001-041`, and `LKM-20261001-058` in PROD on 2026-10-02. The corrected opponent is 長島(向); UAT and PROD were verified identical after the safe overlay.
- 諏訪光 is confirmed as `LK-0090` (current display name 諏訪免). The duplicate `土屋 3-2 石塚` source row is intentionally imported once. Three short scores (`坪内父 2-0 金子`, `向井 1-1 吉川`, `岡崎 2-0 下田`) are `RS-002` Incomplete; the remaining 57 are `RS-001` Completed.

### UAT/PROD Data Alignment (2026-09-27)
- On user confirmation, treated UAT as final and reran the full `scripts/uat-to-prod.js` collection sync. The five differing 2026-09-27 match records now match UAT in PROD, including the UAT-recorded 諏訪鬼 identities.
- Post-sync audit found zero record-level differences across clubs, players, matches, external opponents, tournaments, tournament matches, tournament progress, and rubbers.
- **Future promotion rule:** never replace PROD collections with UAT collections directly. `scripts/uat-to-prod.js` now defaults to a diff-only preview, reports UAT-only/changed/PROD-only IDs, preserves PROD-only records, and overlays UAT records only with explicit `--apply`. It also preserves PROD history unless `--clear-history` is explicitly supplied.
- Applied the safe overlay on 2026-10-01: no PROD-only records existed. UAT added `LK-0156` (井関) and updated `LK-0065`, `LK-0090`, five 2026-09-27 matches, and `TP-0261`; all collections now use the UAT version for matching IDs without deleting PROD-only records.
- PROD→UAT synchronization on 2026-10-01 mirrored the current PROD player collection only after comparison found no UAT-only player records. It brought UAT profiles for 笹岡 (`LK-0088`), 青山 (`LK-0032`), and 諏訪免 (`LK-0090`) into exact parity with PROD, including canonical equipment, grade, category, and grade-history updates.

### Grade-History Normalization (2026-09-27)
- Player grade-history entries must store canonical lookup IDs while public UI resolves those IDs to bilingual labels. Directly displaying `GR-001` / `SL-002` is a renderer defect, not a reason to denormalize stored data.
- `scripts/normalize-lookup-ids.js` now normalizes nested `gradeHistory[].grade` and `gradeHistory[].schoolLevel` values. The 10 UAT player normalization changes (including 金子 / `LK-0016`) were accepted and synced to PROD; blank historical grades remain blank and are never inferred.
- `player.js` now resolves grade-history values through `lookupValue('grade', ...)` and `lookupValue('schoolLevel', ...)`, matching the profile dossier display rule. The fix is merged into both `main` and `uat`; pushing each branch deploys its respective site.

### Junior Tournament Field (2026-10-01)
- UAT tournament `TOURNAMENT-0003`: `令和8年度 全日本卓球選手権大会（ジュニアの部）神奈川県予選会`, 2026-09-26 at ひらつかサン・ライフアリーナ, Junior Boys singles only, 9 representative places.
- Stage one submitted 107 UAT changes: tournament, 23 school/club records, and 83 external players. After acceptance, submitted the 88 Junior Boys field/progress records (`TP-0206`–`TP-0293`) as a second UAT-review batch.
- Documented results for LK-0093 (岡田琉生明) are accepted in UAT: `TM-0010` Round 2, 3-1 win over 荒井日夏太 (`EXT-0263`, 綾瀬高); `TM-0011` Round 3, 1-3 loss to 吉川隼人 (`EXT-0265`, 日大高). The accepted tournament, field, and matches were promoted to PROD through `scripts/uat-to-prod.js`.
- Promotion wrote 78 clubs, 86 Little Kings players, 290 external opponents, 3 tournaments, 11 tournament matches, and 293 progress records. Before overwrite PROD had 87 Little Kings players; one PROD-only player was removed because UAT (the approved source) contained 86. Confirm intended player counts before future full collection overwrites.

### Tournament Progress Editor (2026-10-01)
- UAT `admin.js` tournament-progress editor now includes division, rank, result, recommended, qualified, wins, losses, draws, and eliminated alongside tournament/player selection.
- Tournament and player controls are ID-backed searchable comboboxes. They store IDs and present the current language’s primary name with ID as secondary context. Result stores a tournament-result lookup ID and displays the preferred-language label.
- Division is a text combobox seeded with the selected tournament’s known divisions. On save, player name, club name, school level, and grade snapshots are refreshed automatically from the selected player; they are not free-text editable history fields.
- Fixed the progress-editor render failure: the division input’s datalist is assigned with `setAttribute('list', ...)`, not the read-only HTMLInputElement `list` property.
- Added canonical tournament-result lookup IDs `TP-012`–`TP-016` for `1回戦`–`5回戦` (`Round 1`–`Round 5`), so the Progress Result dropdown remains ID-backed and bilingual.

### Admin Save Context (2026-10-01)
- UAT `admin.js` now preserves the current top-level tab, sub-tab, selected record, and page scroll position after saving training matches, tournament matches, tournament progress, players, clubs, tournaments, and external players. `refreshWorkspace(stayId)` sets selection before reload so the current editor remains open whenever the saved record is already public.
- Tournament Progress now has a live text search across player name/ID, tournament, division, and club, in addition to the existing ID-backed tournament and player filters. Combobox selection events also refresh the list immediately.
- Tournament Progress layout places its filters/search above the Add Progress button, with the result list below both controls.

### Player ID Display (2026-10-01)
- UAT player profiles now include the canonical player ID in the dossier (`Player ID` / `選手ID`) so it can be copied and used in admin/data references.

### Player-to-Admin Shortcuts (2026-10-02)
- The player-profile Edit Player Profile shortcut uses `editPlayer=<LK-ID>`. Admin recognizes this explicit launch parameter (while retaining legacy `playerId` links), selects the exact player editor, and scrolls it into view on narrow layouts.

### OpenCode 2 CLI + VS Code Setup (2026-10-02, PC 1)
- Installed `@opencode/cli` **v2.0.21** globally with npm → `C:\Users\rick\AppData\Roaming\npm\opencode.ps1`.
- **npm 11 blocks postinstall scripts**, so a plain `npm install -g @opencode/cli` does NOT select the native binary. Use:
  `npm install -g --allow-scripts=@opencode/cli @opencode/cli`
- Windows package managers (winget/scoop/choco) are **not supported** by OpenCode — use npm, the curl installer, or the standalone binary zip.
- Visual Studio Code **1.140.0** (User setup) installed via `winget install --id Microsoft.VisualStudioCode -e --source winget`.
- Extension `sst-dev.opencode-v2` **v0.1.1** ("OpenCode Beta", the V2 extension) installed via `code --install-extension sst-dev.opencode-v2`.
- No `opencode auth login` needed — credentials (Google Gemini API key, OpenAI OAuth) are already in the shared SQLite DB used by the Desktop app (`opencode auth list` confirms).
- **The VS Code extension `sst-dev.opencode-v2` is NOT usable with CLI 2.0.21** — do not debug it again. Verified four faults: (1) its sidebar view never registers a provider (`registerWebviewViewProvider` = 0 hits → "There is no data provider registered"); (2) `spawn("opencode", ...)` without `shell:true` fails with ENOENT on Windows because npm only creates `.cmd`/`.ps1` shims; (3) it waits for a stdout line starting with `opencode server listening` while v2 prints `server listening on ...`; (4) it calls the **V1** server API (`/config`, `/session`, `/agent`, `/project/current`) while V2 serves `/api/*` behind `OPENCODE_PASSWORD` auth. Two local patches were applied to `dist\extension.js` (backup `dist\extension.js.bak`) for faults 2–3, but fault 4 is architectural — extension updates overwrite patches anyway.
- **Working path in VS Code: run `opencode` in the integrated terminal** (full TUI).
- Other editors (Zed/JetBrains/Neovim) connect through ACP: configure them to run `opencode acp`. Docs: https://opencode.ai/v2/docs/cli/acp
- V2 docs are the source of truth: https://opencode.ai/v2/docs/ (`/docs/` paths without `/v2/` are V1).

### Agents Shared Between Desktop GUI and CLI (2026-10-02)
- **Agents are config files, not GUI state.** The Desktop GUI and the CLI/TUI read identical files, so GUI agents need **no setup** to be reused in VS Code — just launch `opencode` from the project root.
- Verified by running `opencode serve` with `cwd` = project and querying `/api/agent`: **all 12 agents load**.
  - From `opencode.json` legacy `agent` map: `gemini-flash`, `gemini-lite`, plus `build`/`plan` overrides
  - From `.opencode/agents/*.md`: `debugger`, `pro-specialist`, `reviewer`
  - Builtins: `build`, `plan`, `general`, `explore` (+ hidden `compaction`, `title`, `summary`)
  - From `.opencode/commands/*.md`: `draft-plan`, `final-plan`, `free-build`
- **Folder matters.** Launching from `C:\Users\rick` returns only the 7 builtins and drops every custom agent — discovery walks from cwd up to the project root.
- Global `~/.config/opencode/opencode.jsonc` currently holds only a plugin; `~/.config/opencode/agents/` does not exist. Create that directory to make an agent available in every project.
- V1 syntax still works: `agent`/`provider`/`permission` (singular) are normalized in memory, and V1 agent frontmatter `permission:` auto-translates to `permissions`. No rewrite required.
- **`compaction.tail_turns` is ignored in V2** (accepted-but-unsupported field) — the project's `opencode.json` sets `tail_turns: 15`; use `compaction.keep.tokens` if a token budget is wanted.
- Verification recipe: `opencode serve --port <N>` with cwd = project, then `opencode api get /api/agent --server <url>` with env `OPENCODE_PASSWORD=<password printed by serve>`. Auth is `OPENCODE_PASSWORD`, **not** `Authorization: Bearer`. Agents load asynchronously — poll for a few seconds before concluding they are missing.

### TUI Model Default and Keybinds (2026-10-02)
- `opencode.json` now sets top-level `"model": "opencode/mimo-v2.6-flash-free"` (matches the Desktop GUI's selected model). Verified: a plain `opencode run` with no `--model` flag prints `build · mimo-v2.6-flash-free`, so the top-level `model` **overrides** `agent.build.model` (`google/gemini-3.8-flash`).
- The CLI shares the GUI's model catalog — **65 models**: 9 free OpenCode Zen (incl. `mimo-v2.6-flash-free`, `longcat-2.5-preview-free`), 18 OpenAI (incl. `gpt-5.6-sol`, `gpt-5.6-terra`, `gpt-6-luna`, `gpt-6.1-sol`), 38 Google. No extra authentication required — credentials live in the shared SQLite DB.
- Agents still pin their own models and those are independent of the session model: `build`/`gemini-flash` → `gemini-3.8-flash`, `plan`/`gemini-lite` → `gemini-3.5-flash-lite`, `debugger`/`reviewer` → `openai/gpt-5.6-luna`, `pro-specialist` → `openai/gpt-5.5-pro`.
- Keybinds (leader = `ctrl+x`): `ctrl+x m` or `/models` → model list; `ctrl+x a` → agent list; `shift+tab` → next agent; `ctrl+p` → command palette; `f2` → cycle recent models; `ctrl+f` → favorite (inside model dialog); `ctrl+a` → provider list (inside model dialog).
