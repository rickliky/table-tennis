# Little Kings Product UX & Analytics Roadmap

**Audit date:** 2026-10-02  
**Scope:** UAT visitor experience, player profiles, tournaments, and Data Maintenance  
**Status:** Recommendations only unless explicitly marked as implemented

## Product direction

Keep the existing black, cream, and gold Little Kings identity. It is distinctive and already looks more like a sports publication than a generic dashboard. The next step should be clearer task hierarchy, less scrolling, stronger data confidence, and a maintenance workspace that surfaces problems before editors encounter them.

The product should optimize for three common jobs:

1. **Member or parent:** Find a player, understand recent form, and review the latest session.
2. **Coach:** Identify participation, form, close-match performance, opponent patterns, and tournament preparation needs.
3. **Editor or approver:** Add data quickly, detect data-quality issues, understand the impact of a change, and approve it confidently.

## Evidence from current UAT data

| Measure | Current UAT |
|---|---:|
| Active Little Kings players | 86 |
| Training matches | 1,793 |
| Matches complete under the 3-set rule | 1,700 |
| Incomplete under the 3-set rule | 93 |
| Training dates | 39 |
| Average match participants per date | 24 |
| Tournaments / tournament field records | 3 / 293 |
| Tournament matches | 11 |
| External opponents | 290 |
| Rubber records | 171 |
| Active players with profile photos | 24 of 86 |

Profile completeness is the main limitation on richer setup analysis: 39 active players have no category, 47 have no hand/grip/style, 48 have no forehand or backhand rubber, and 72 have no grade.

There are also 42 legacy `Verified` records with scores of 2-0, 2-1, or 1-0. These conflict with the current “three sets wins” completion rule. They may be short-format matches rather than bad records, so they should be reviewed—not bulk-corrected—after adding an explicit match-format field.

## What already works well

- Strong, recognizable sports-club visual identity.
- Bilingual presentation and lookup resolution.
- Player-first search and direct player-to-admin shortcuts.
- Latest-session summary, rankings, session replay, player analytics, tournament scouting, and approval history already form a strong feature base.
- The recent progressive-rendering work keeps initial pages responsive without removing detail.
- UAT now works without horizontal overflow across phone, tablet, and desktop sizes.

## Visitor and coach experience

### 1. Replace the long home page with a task-led structure

The current home page is approximately 7,900 px tall on desktop and 16,800 px on mobile. Session Replay alone occupies about 1,700 desktop pixels before the player directory.

Recommended order:

1. **Compact hero + prominent player search**
2. **Latest Session** with six highlighted results and “View all”
3. **Club Pulse** with current-period KPIs and small trend indicators
4. **Rankings**
5. **Players** with search/category filters and progressive loading
6. **Explore Sessions** as a collapsed calendar/archive tool
7. **Tournament updates**
8. **Methodology and internal-use notice**

Use the currently empty right side of the desktop hero for Club Pulse or the latest-session summary. Increase search contrast and width. On mobile, consider a small sticky task bar for **Home / Players / Sessions / Tournaments**.

### 2. Turn player profiles into four views

The profile currently exposes every chart and archive section in one long document. Replace the in-page links with accessible tabs or segmented navigation:

- **Overview:** identity, latest session, form, tournament readiness, key KPIs
- **Performance:** rolling form, period comparison, set trends, category rank
- **Opponents:** head-to-head, opponent diversity, hand/style/equipment splits
- **Matches:** searchable and date-grouped archive

Only render charts when their panel is first opened. Preserve URL hashes so links can open a specific view.

### 3. Add data-confidence language

Every comparative statistic should show its sample size and reliability:

- `12 matches · 4 sessions`
- `Limited sample` below a defined threshold
- `Profile 60% complete` when setup analysis lacks fields
- `Last updated 2026-10-01`

This is especially important for youth players and uneven training schedules. Avoid presenting experimental metrics as official rankings.

## Recommended statistics

### Club Pulse

- **Active match participants:** unique players appearing in the selected period; do not call this attendance because attendance without a match is not recorded.
- **Sessions and match volume:** selected period versus previous equal-length period.
- **Completion share:** completed matches divided by all recorded matches.
- **Close-match share:** 3-2 results divided by completed matches. Current all-time share is about 20.8%.
- **Opponent diversity:** unique pairings and average unique opponents per active player.
- **New or returning participants:** first appearance or first appearance after a configurable gap.
- **Category cross-play:** matchup volume between school-level groups.

### Player Overview

- **Last 10 form:** wins, losses, and set differential.
- **Rolling 10 win rate:** trend rather than a single career percentage.
- **Close-match conversion:** 3-2 wins divided by all 3-2 matches.
- **Activity consistency:** match dates and matches per active session, clearly labeled as match participation.
- **Opponent diversity:** unique opponents and repeat-opponent share.
- **Set efficiency:** sets won per completed match and average set differential.
- **Period comparison:** current month versus previous month with minimum-sample rules.
- **Milestones:** 50/100/250 matches, first tournament result, or personal-high rolling form.

### Coach-only or experimental

- **Strength of schedule:** opponent-weighted performance with a methodology dialog.
- **Expected versus actual result:** only after a stable rating model exists.
- **Form volatility:** variation across recent sessions.
- **Development trend:** rolling set differential over a sufficiently long window.

Do not introduce Elo/Glicko as the primary ranking yet. The schedule is uneven, historical match formats need clarification, and many profiles are incomplete. If tested later, label it **Experimental Rating** and keep the current transparent rankings alongside it.

### Tournament intelligence

- Field coverage: documented versus unknown opponents.
- Known head-to-head records against the field.
- Representative/recommended priority opponents.
- Result source and verification date.
- Data-completeness badge: `Full field`, `Results only`, or `Partial field`.
- Separate training and tournament performance; use training only as scouting context.

## Data Maintenance experience

### 1. Add an Overview dashboard as the default tab

The current default immediately opens 1,804 matches. A professional maintenance tool should first answer “What needs attention?”

Recommended dashboard cards:

- **Pending approval:** count, oldest age, and direct review action
- **Recently accepted:** last five changes
- **Data health:** errors, warnings, and profile-completeness work
- **Latest import/session:** date, record count, complete/incomplete split
- **Quick actions:** add match, add player, import batch, add tournament
- **Environment:** prominent UAT/PROD identity and current build

### 2. Add a Data Health queue

Each issue should link directly to the affected editor and explain why it matters.

Initial rules:

- Completed status but no player reached the format’s required wins
- Incomplete status although a player reached the required wins
- Missing/unknown player references
- Duplicate display or notebook names
- Active player missing category, grade, hand, style, or equipment
- Player missing profile image
- Tournament progress missing player/club snapshot
- Legacy lookup text or status values that should be canonical IDs
- Stale active player with no match activity for a configurable period

Support **Ignore with reason**, **Fix**, and safe bulk actions where the correction is unambiguous.

### 3. Improve editing flow

- Keep Save/Reset actions sticky while scrolling long editors.
- Show a visible “Unsaved changes” state and confirm before navigation.
- Show an impact preview: affected public page, related matches, and pending-change replacement behavior.
- Add Active/Inactive and completeness filters to the player list.
- Preserve filters and selected records in the URL so a maintenance view can be shared.
- Offer saved views such as `Incomplete matches`, `Missing profiles`, and `Needs review`.
- Canonicalize legacy status labels in normal lists while preserving original values in history/audit views.
- Use explicit `Best of 3 / Best of 5 / Short practice` format controls so completion is derived correctly.

### 4. Make imports a first-class workflow

Replace script-only imports with a guided flow:

1. Upload/paste records
2. Resolve names and show confidence
3. Validate IDs, dates, scores, duplicates, and completion
4. Preview create/update/skip counts
5. Submit one review batch
6. Show approval and promotion status

The import must be repeat-safe and should never overwrite PROD-only records.

## Data/API foundation

The Worker currently returns active and inactive players from `/api/public-data`; UAT public pages now filter inactive players client-side while Admin retains all 87 records. The proper long-term architecture is:

- `/api/public-data`: active/public-safe records only
- Authenticated `/api/admin-data`: all editable records, including inactive players and maintenance metadata
- Server-side authorization rather than relying on page-level filtering

Recommended schema additions:

- Match: `bestOf`, `completionStatus`, `completionReason`, `source`, `sourceBatchId`
- Tournament/progress: `sourceUrl`, `verifiedAt`, `coverageLevel`
- Player: `profileCompleteness` should be derived, not stored
- Change batch: shared batch ID, label, source, submitted count, accepted count

## Visual and interaction direction

- Preserve black/gold/cream and condensed sports typography.
- Increase body-text and placeholder contrast; reserve condensed uppercase text for headings and labels.
- Use consistent 8 px spacing increments, quieter borders, and fewer equally prominent boxes.
- Add compact sparklines and trend arrows rather than more large charts.
- Use 150–220 ms motion for panel/tab transitions and honor `prefers-reduced-motion`.
- Use skeleton states for data loading and optimistic visual feedback only where server state is not implied.
- Keep semantic colors consistent: gold = primary, blue = informational, green = complete, red = destructive/error, amber = review.

## Recommended delivery sequence

### Phase 0 — correctness and foundation

1. Review the 42 short legacy `Verified` matches and define match formats.
2. Separate public and authenticated admin data endpoints.
3. Normalize legacy match statuses without erasing audit history.
4. Add reusable metric definitions and sample-size rules.

### Phase 1 — highest usability return

1. Data Maintenance Overview + Data Health queue.
2. Home hero/search + Club Pulse restructure.
3. Player-profile Overview/Performance/Opponents/Matches navigation.
4. Sticky editor actions, dirty-state warning, and player status/completeness filters.

### Phase 2 — actionable analytics

1. Rolling form, close-match conversion, set efficiency, and opponent diversity.
2. Period comparisons and data-confidence labels.
3. Tournament coverage and verification indicators.
4. Drill-down from every KPI to its underlying matches.

### Phase 3 — workflow and polish

1. Guided bulk import and batch review.
2. Saved maintenance views and URL-backed filters.
3. Mobile task navigation, skeletons, compact motion, and final accessibility pass.
4. Evaluate an experimental strength-of-schedule/rating model only after format normalization.

## Success measures

- Find a player from page load in two interactions or fewer.
- Latest-session summary understandable without scrolling on desktop and within one screen after the hero on mobile.
- Player overview presents form, sample size, latest activity, and tournament readiness before detailed charts.
- Editor can identify pending or invalid data within 10 seconds of opening Data Maintenance.
- No public inactive-player exposure.
- No KPI without a definition, period, and sample size.
- No maintenance correction without an auditable before/after diff.
