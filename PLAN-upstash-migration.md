# Final Implementation Plan: Upstash Redis Migration

## Summary

Migrate data ownership from Google Sheets and repository JSON files to Upstash Redis through a secure API layer. Keep `uat` as the development/testing branch and `main` as production; both environments include the admin tool, use separate Upstash namespaces, and support approval-based CRUD for clubs, players, training matches, external opponents, tournaments, and tournament results.

The privileged Upstash token must remain server-side. A Cloudflare Worker or equivalent API proxy is required because a password gate and browser JavaScript cannot protect an exposed write token.

---

## 1. Architecture

### Development Lifecycle

```
uat branch → deploy to /uat/ → test → PR to main → deploy to / (production)
```

| Branch | Deployed To | Purpose |
|--------|-------------|---------|
| `uat` | `/uat/` | Development, testing, admin tool |
| `main` | `/` | Production (public site + admin tool) |

### System Architecture

```
GitHub Pages (static hosting)
├── index.html          → Main page (leaderboards, calendar, charts, sessions, players)
├── player.html?id=     → Individual player profile page
├── admin.html          → Admin CRUD tool (both branches)
└── Browser JavaScript
        │
        ▼
Cloudflare Worker API (server-side)
        │
        ├── Authenticates admin/approver roles
        ├── Validates records and relationships
        ├── Creates pending changes
        └── Applies approved changes atomically
        │
        ▼
Upstash Redis
├── uat:clubs           (UAT namespace)
├── uat:players
├── uat:matches
├── uat:external-opponents
├── uat:tournaments
├── uat:tournament-matches
├── uat:pending-changes
├── prod:clubs          (Production namespace)
├── prod:players
├── prod:matches
├── prod:external-opponents
├── prod:tournaments
├── prod:tournament-matches
├── prod:pending-changes
└── lookups             (shared)
```

### Key Security Principle

**No Upstash standard token in browser JavaScript.** All writes go through the Worker. The browser only receives:
- Public read-only data through the Worker.
- Short-lived session tokens for authenticated admin/approver access.

---

## 2. Data Models

### Lookup Tables

Normalized lookup values stored with short IDs, bilingual labels, and optional colors.

```json
{
  "id": "J",
  "ja": "中学生",
  "en": "Junior High School",
  "sortOrder": 2,
  "color": "#54b8d1"
}
```

Required lookup tables:

| Table | Purpose |
|-------|---------|
| `gender` | Male/Female |
| `category` | 小学生/中学生/高校生/一般/未設定 |
| `playingHand` | Right/Left |
| `grip` | Shakehand/Penhold |
| `playingStyle` | Topspin attacker, All-round, etc. |
| `rubberType` | IN/OT/PIM/OX |
| `playerStatus` | Active/Inactive |
| `matchFormat` | Singles/Doubles |
| `matchStatus` | Completed/Incomplete/Void/Transcribed-review |
| `prefecture` | All 47 Japanese prefectures |
| `tournamentWinner` | LK/External/Unknown |

### Prefecture Examples

| ID | Japanese | English |
|----|----------|---------|
| 01 | 北海道 | Hokkaido |
| 13 | 東京都 | Tokyo |
| 14 | 神奈川県 | Kanagawa |
| 27 | 大阪府 | Osaka |
| 47 | 沖縄県 | Okinawa |

### Club

```json
{
  "clubId": "CLUB-0001",
  "name": "Little Kings",
  "nameJa": "リトルキングス",
  "prefectureId": "14",
  "logoUrl": "https://ritokin.gosyuugi.com/img/3.jpg",
  "websiteUrl": "https://ritokin.gosyuugi.com",
  "contactName": "",
  "contactEmail": "",
  "contactPhone": "",
  "status": "A"
}
```

### Player

Existing field names preserved. Values become lookup IDs.

```json
{
  "playerId": "LK-0002",
  "displayName": "李(K)",
  "englishName": "Kaitlyn Li",
  "gender": "F",
  "schoolLevel": "E",
  "playingHand": "R",
  "grip": "SH",
  "playingStyle": "TA",
  "blade": "",
  "forehandRubber": "Butterfly ディグニクス09C / Dignics 09C",
  "backhandRubber": "Butterfly ディグニクス05 / Dignics 05",
  "forehandRubberType": "IN",
  "backhandRubberType": "IN",
  "rating": "",
  "status": "A",
  "clubId": "CLUB-0001"
}
```

### Training Match

```json
{
  "matchId": "LKM-20260910-001",
  "matchDate": "2026-09-10",
  "event": "Little Kings Club Matches",
  "division": "Open",
  "format": "S",
  "player1Id": "LK-0064",
  "player1Name": "加藤(蒼)",
  "player1Sets": 3,
  "player2Id": "LK-0081",
  "player2Name": "三田村(雛)",
  "player2Sets": 0,
  "winnerId": "LK-0064",
  "winnerName": "加藤(蒼)",
  "score": "3-0",
  "resultStatus": "C"
}
```

### External Opponent

```json
{
  "externalOpponentId": "EXT-0001",
  "displayName": "田中",
  "englishName": "Tanaka",
  "clubId": "CLUB-0002",
  "clubName": "横浜CC",
  "category": "J",
  "playingHand": "R",
  "grip": "SH",
  "playingStyle": "TA",
  "forehandRubberType": "IN",
  "backhandRubberType": "LP"
}
```

### Tournament

```json
{
  "tournamentId": "TOUR-20260915-001",
  "name": "神奈川県中学生卓球大会",
  "nameEn": "Kanagawa Junior High Championship",
  "date": "2026-09-15",
  "location": "横浜アリーナ",
  "division": "中学男子シングルス",
  "status": "A"
}
```

### Tournament Match

```json
{
  "tournamentMatchId": "TM-20260915-001",
  "tournamentId": "TOUR-20260915-001",
  "lkPlayerId": "LK-0002",
  "lkPlayerName": "李(K)",
  "externalOpponentId": "EXT-0001",
  "externalOpponentName": "田中",
  "lkSets": 3,
  "externalSets": 1,
  "winner": "lk",
  "score": "3-1",
  "round": "準決勝 / Semifinal",
  "resultStatus": "C"
}
```

### Pending Change

```json
{
  "changeId": "CHANGE-000001",
  "entityType": "tournamentMatch",
  "action": "create",
  "targetId": "TM-20260915-001",
  "before": null,
  "after": {},
  "diff": [
    {
      "field": "score",
      "before": "",
      "after": "3-1"
    }
  ],
  "createdBy": "admin",
  "createdAt": "2026-09-15T10:00:00Z",
  "status": "pending",
  "baseRevision": 12
}
```

Supported entity types: `club`, `player`, `match`, `externalOpponent`, `tournament`, `tournamentMatch`.

---

## 3. Approval Workflow

1. Admin opens admin page.
2. Admin creates or edits a record.
3. Worker validates the proposed record.
4. Worker stores a pending change.
5. Live data remains unchanged.
6. Approver sees outstanding changes grouped by entity type.
7. Approver opens one change.
8. UI displays: record identity, submitter, timestamp, before value, proposed value, localized lookup labels, changed fields only.
9. Approver accepts or rejects the individual change.
10. On acceptance, Worker atomically applies the change to the correct collection.
11. Pending change is marked accepted and removed from the outstanding queue.
12. Public site reads the newly approved data.

Approval validates dependencies. A tournament result cannot be approved while its tournament or external opponent is missing. Worker rejects stale updates when `baseRevision` no longer matches the current record revision.

---

## 4. Changes by File

### `AGENTS.md`

- Update architecture from Google Sheets/repository JSON to Worker → Upstash.
- Document UAT and production namespaces.
- Document normalized lookup IDs.
- Document club, external opponent, tournament, and tournament-match models.
- Document approval workflow and role permissions.
- Preserve existing business rules for active players, training filtering, match completion, rankings, and image fallback.
- Document that manual verification is the test strategy.

### `app.js`

- Replace `fetch('./public-data.json')` (line 292) with public Worker data endpoint.
- Load clubs, lookups, players, training matches, external opponents, tournaments, and tournament matches.
- Add compatibility adapter so existing rendering functions receive expected shape.
- Resolve IDs through lookup metadata before displaying labels.
- Preserve `isComplete()` exactly.
- Preserve `eventType()` exactly.
- Preserve category precedence and ranking minimum-match rules.
- Preserve chart lifecycle and destruction.
- Add approved tournament result and external-opponent displays.
- Remove supplement navigation and supplement-related logic.
- Add every new visible message to both `words.en` and `words.ja`.
- Continue escaping all dynamic values before inserting HTML.

### `player.js`

- Replace `fetch('./public-data.json')` (line 132) with public Worker data endpoint.
- Remove supplement fallback and name-based supplement matching.
- Load tournament results and resolve external opponent and club relationships.
- Display lookup labels according to selected language.
- Preserve training statistics, rankings, archives, charts, and head-to-head behavior.
- Preserve image fallback from `img/{playerId}.jpg` to `img/NoProfilePic.jpg`.
- Add new bilingual profile labels to both language dictionaries.

### `admin.js`

- Remove `/uat/` refusal check (line 5).
- Remove local JSON loading (line 65).
- Remove `uat-roles.json` authentication (lines 42-49).
- Remove JSON export functions (lines 175-177).
- Replace local-only edits with API requests.
- Add role-aware UI:
  - `admin`: create, edit, delete, submit pending changes.
  - `approver`: inspect, accept, reject pending changes.
- Add tabs: Clubs, Players, Training Matches, External Opponents, Tournaments, Tournament Results, Pending Changes.
- Use lookup metadata for every combo box.
- Add CRUD forms for all entity types.
- Validate foreign-key relationships before submission.
- Generate field-level diffs with before/after values.
- Show localized lookup labels in diffs.
- Submit all changes to pending-change API.
- Show pending changes grouped by entity type and ordered by creation time.
- Apply or reject one change at a time.
- Refresh workspace after each operation.
- Prevent approval of stale records or records with missing dependencies.
- Add bilingual status, validation, confirmation, and error messages.

### `admin.html`

- Update title from UAT-only wording to general bilingual admin wording.
- Keep `noindex,nofollow`.
- Load shared data client, lookup module, and admin script.
- Ensure page works at both `/uat/admin.html` and `/admin.html`.
- Do not load Upstash standard token into page.

### `access-gate.js`

- Remove Google Apps Script password verification.
- Authenticate through secure API Worker.
- Store short-lived server-issued session token or secure cookie.
- Store selected role only for UI display; authorization enforced by Worker.
- Protect `admin.html` in both UAT and production.
- Preserve bilingual gate content and language switching.
- Preserve seven-day user experience only if it uses secure server-issued session mechanism.

### `styles.css`

- Add responsive styles for admin tabs and entity forms.
- Add pending-change queue styles.
- Add before/after diff styles.
- Add visual states for pending, accepted, rejected, stale, added, updated, and deleted records.
- Add club, tournament, and external-opponent cards.
- Preserve current visual language and mobile behavior.

### `category-colors.js`

- Replace hardcoded category strings with lookup-ID resolution.
- Preserve existing colors and unassigned fallback.
- Remove file only after all callers use shared lookup module.

### `index.html`

- Add shared lookup and data-client scripts.
- Remove supplement navigation links.
- Keep page available in both UAT and production deployments.

### `player.html`

- Add shared lookup and data-client scripts.
- Keep page available in both UAT and production deployments.

### `player-profile-supplement.html`

- Remove after confirming no links or scripts reference it.

### `player-profile-supplements.html`

- Remove after confirming no links or scripts reference it.

### `player-profile-supplement.js`

- Remove after player admin form and direct player-management workflow are operational.

### `.github/workflows/pages.yml`

- Keep triggers for both `main` and `uat` (lines 5-7).
- Remove repository JSON build step (lines 24-25).
- Keep production deployment to root path.
- Keep UAT deployment to `uat` directory.
- Ensure both deployments include `admin.html` and `admin.js`.

### `.github/workflows/refresh-data.yml`

- Remove after successful migration because Google Sheets and scheduled JSON refreshes are no longer used.

### `scripts/build-public-data.js`

- Remove after public API loading is verified.

### `data/`

- Retain temporarily as migration and rollback source.
- Remove only after record counts, statistics, and lookup mappings are verified.

### `public-data.json`

- Retain temporarily as rollback backup.
- Remove only after UAT and production verification succeeds.

### `admin-players.json`

- Retain temporarily as rollback backup.
- Remove after admin loading from API succeeds.

### `admin-training-matches.json`

- Retain temporarily as rollback backup.
- Remove after admin loading from API succeeds.

### `player-profile-supplements.json`

- Remove after supplement pages and all supplement code are removed.

### `uat-roles.json`

- Remove after Worker authentication and server-side roles are operational.
- Do not replace with client-side-only authorization.

### `Code.gs`

- Remove after all public data, authentication, and submission calls use the Worker.
- Confirm no active JavaScript references Apps Script URL before deletion.

### `lookups.js` (new file)

- Define bilingual lookup tables for all lookup types.
- Include all 47 Japanese prefectures.
- Provide helpers:
  - `get(table, id)` → record
  - `label(table, id, language)` → localized string
  - `bilingual(table, id)` → "Japanese / English"
  - `options(table, language)` → combo-box options
  - `color(table, id)` → category color
- Keep entity POJOs limited to stable IDs and free-text values.

### `data-client.js` (new file)

- Centralize public API reads.
- Detect UAT vs production from `/uat/`.
- Select correct namespace through the API.
- Normalize API responses into shape expected by `app.js` and `player.js`.
- Centralize loading, caching, and error handling.
- Never contain privileged credentials.

### `worker/src/index.js` (new file)

- Implement public read endpoints.
- Implement authenticated admin submission endpoints.
- Implement authenticated approver accept/reject endpoints.
- Enforce role permissions server-side.
- Select UAT or production namespace based on explicitly validated environment value.
- Return only approved records to public clients.

### `worker/src/auth.js` (new file)

- Verify admin and approver credentials.
- Issue short-lived sessions.
- Store passwords or password hashes in Worker secrets, not repository files.
- Prevent admin sessions from calling approval endpoints.
- Prevent approver sessions from creating arbitrary changes unless explicitly allowed.

### `worker/src/validation.js` (new file)

- Validate required fields and lookup IDs.
- Validate player, match, club, tournament, and external-opponent IDs.
- Enforce match player relationships.
- Enforce tournament-result relationships.
- Preserve `isComplete()` business rule.
- Reject invalid or duplicate identifiers.
- Block deletion of referenced entities or require explicit archival/inactive operation.

### `worker/src/repository.js` (new file)

- Read and write namespaced Upstash collections.
- Maintain collection revisions.
- Store pending changes with before, after, diff, submitter, timestamp, and base revision.
- Apply accepted changes atomically or reject stale updates.
- Keep UAT and production data isolated.

### `worker/src/diff.js` (new file)

- Generate field-level diffs for every entity type.
- Resolve lookup IDs to bilingual display labels for API responses.
- Support create, update, and delete operations.
- Treat empty values consistently.
- Escape or encode values safely for frontend rendering.

### `worker/wrangler.toml` (new file)

- Define Worker deployment configuration.
- Define UAT and production API environments if needed.
- Reference secrets without committing their values.

---

## 5. Data Relationships

```
Club
├── Player.clubId
└── ExternalOpponent.clubId

Player
├── TrainingMatch.player1Id
├── TrainingMatch.player2Id
├── TrainingMatch.winnerId
└── TournamentMatch.lkPlayerId

ExternalOpponent
└── TournamentMatch.externalOpponentId

Tournament
└── TournamentMatch.tournamentId

Lookup
└── Referenced by normalized ID fields

PendingChange
└── References any supported entity type and target ID
```

---

## 6. Risks

- **Exposed Upstash write token:** Browser JavaScript is public. Mitigation: use a Worker and keep the standard token server-side.
- **UAT data contaminating production:** UAT CRUD could alter live records. Mitigation: separate `uat:*` and `prod:*` namespaces.
- **Stale approvals:** An approval could overwrite a newer edit. Mitigation: base revisions and atomic server-side checks.
- **Dependency ordering:** A tournament result may reference an unapproved tournament or opponent. Mitigation: validate dependencies and display prerequisite changes.
- **Large frontend refactor:** `app.js` and `player.js` contain extensive string-based logic. Mitigation: preserve existing property names initially and use a compatibility adapter.
- **Lookup migration loss:** Existing strings may not map cleanly to IDs. Mitigation: migration reports every unmapped value and fails closed.
- **Broken statistics:** Changing field values or filtering logic could alter rankings. Mitigation: compare pre- and post-migration statistics.
- **Accidental historical deletion:** Removing a referenced club, player, or opponent may break history. Mitigation: block referenced deletes and prefer inactive status.
- **External tournament scope expansion:** Tournament data is not currently populated or fully rendered. Mitigation: implement its data model and admin workflow first, then add public displays with separate statistics.
- **Relative paths under `/uat/`:** Assets or API configuration may work at `/` but fail under `/uat/`. Mitigation: test every page from both roots.
- **Bilingual regressions:** New UI text may appear in only one language. Mitigation: require matching keys in `words.en` and `words.ja`.
- **Public API outage:** Pages cannot load live data. Mitigation: retain repository JSON backups until production stability is confirmed and optionally provide a read-only cached fallback.

---

## 7. Verification

1. Confirm `uat` deploys to `/uat/`.
2. Confirm `main` deploys to `/`.
3. Confirm `admin.html` works at both deployment paths.
4. Confirm no active page calls Google Apps Script.
5. Confirm no standard Upstash token appears in repository files or browser responses.
6. Confirm public pages read approved data through the Worker.
7. Confirm UAT reads only `uat:*` data.
8. Confirm production reads only `prod:*` data.
9. Confirm all 47 prefectures appear in the club form.
10. Confirm Little Kings is migrated as a club in Kanagawa.
11. Confirm existing player IDs remain unchanged.
12. Confirm existing match IDs and object fields remain unchanged.
13. Compare pre- and post-migration counts and statistics:
    - 83 players
    - 1,507 matches
    - existing club and metadata records
14. Verify active-player filtering.
15. Verify category precedence.
16. Verify training filtering through `eventType()`.
17. Verify `isComplete()` with `3-0`, `0-3`, `2-2`, and incomplete results.
18. Verify image fallback from `img/{playerId}.jpg` to `img/NoProfilePic.jpg`.
19. Verify Japanese and English lookup labels.
20. Verify every new visible string exists in both language dictionaries.
21. As admin, create, update, and delete a club.
22. As admin, create, update, and delete a player.
23. As admin, create, update, and delete a training match.
24. As admin, create an external opponent and link it to a club.
25. As admin, create a tournament.
26. As admin, create a tournament result linking a Little Kings player to an external opponent.
27. Confirm all changes enter the pending queue and do not modify live data.
28. As approver, inspect each change one at a time.
29. Verify diffs show localized before and after values.
30. Accept a change and verify only that target record changes.
31. Reject a change and verify live data remains unchanged.
32. Attempt to approve a stale change and verify it is rejected.
33. Attempt to approve a result with missing dependencies and verify it is rejected.
34. Verify accepted tournament results appear on the relevant player profile.
35. Verify external club and opponent names display correctly.
36. Verify supplement pages and links are removed.
37. Inspect browser console and network requests manually.
38. Record the manual verification results in the PR description.

---

## 8. Implementation Order

| Step | Files | Reason |
|------|-------|--------|
| 1 | Secure API architecture (Worker skeleton) | Establish server-side credential handling before frontend writes |
| 2 | `lookups.js`, canonical schemas | Freeze IDs, field names, bilingual labels, prefectures, relationships |
| 3 | Upstash namespaces, migration tooling | Create `uat:*` and `prod:*` collections so UAT cannot alter production |
| 4 | `worker/src/repository.js`, `validation.js`, `diff.js` | Implement reads, pending changes, approval, rejection, revision checks, atomic updates |
| 5 | `data-client.js`, `lookups.js` | Provide stable browser-facing data access and label resolution |
| 6 | `app.js`, `player.js` | Update public rendering, lookup resolution, tournament displays, remove supplement dependencies |
| 7 | `access-gate.js` | Replace Apps Script authentication with secure Worker sessions |
| 8 | `admin.js`, `admin.html` | Add all CRUD forms, pending queue, diffs, approval actions, role-based UI |
| 9 | `styles.css`, HTML dependencies | Add shared scripts, remove supplement links, style new admin states |
| 10 | `uat` branch deployment | Deploy to `/uat/`, perform complete manual verification checklist, fix regressions |
| 11 | Remove obsolete data flow files on `uat` | Delete Apps Script, scheduled refresh, repository data, supplement files after rollback backups confirmed |
| 12 | Production PR (`uat` → `main`) | Create PR, review entire diff, merge only after UAT passes |
| 13 | Production verification | Confirm production reads `prod:*`, admin functions at `/admin.html`, approved data appears publicly |
