# Private Player Reflection — Draft for Review

Status: proposed on 2026-10-13; no application, Worker, credentials, or live data changes authorized yet.

## Goal

Replace member-visible, administrator-published reflections with a private player journal. Initial enabled players are Jacelyn (`LK-0080`) and Kaitlyn (`LK-0002`). Passwords supplied in chat must be provisioned securely during approved implementation; never put plaintext passwords or password hashes in this document, browser code, public player records, fixtures, or published artifacts.

The seven notebook photos could not be read because external-directory access was denied. The user subsequently supplied typed notebook examples, which are sufficient to refine the layout without requiring the photos. Do not claim to have reviewed the original handwriting. Treat the examples as design references only; do not import their content unless separately requested and ownership is confirmed. Do not commit the private sample bodies to the repository.

## Findings

- `feedback.js` currently allows any member to select any active player, uses a seven-day general site session, and submits session/match reflections through `/api/change` for administrator publishing.
- `worker/src/index.js` includes `sessionFeedback` and `matchFeedback` in `/api/public-data` and `/api/admin-data`; existing reflection changes also contain full text in pending/history records.
- `player.js`, `insights.js`, and `tournament.js` display published reflection text. These displays must be removed or replaced with private journal links, not merely hidden after downloading private data.
- No translation service is configured in the Worker.
- Read-only Upstash checks on 2026-10-13 found zero session reflections and zero match reflections in both UAT and PROD. Recheck before rollout; do not assume this remains true.
- `repository.js` stores each collection as a full JSON array and its `withLock` is a no-op. Do not use that whole-collection read/modify/write pattern for frequent autosaves.

## Proposed Member Experience

### Reflection landing page (`feedback.html`)

- Bilingual invitation: “To use private reflections, please speak to Jacelyn and Kaitlyn’s daddy.” / “この振り返り機能を使いたい選手は、ジェイスとケイツのお父さんに声をかけてください。”
- Show only enabled player names (initially Jacelyn and Kaitlyn). Do not expose journal dates, excerpts, counts, credentials, or private configuration.
- Selecting a name prompts for that player's password. Reject wrong passwords without revealing private content.
- Restore a server-validated session on the same browser for 56 days from login. Another player's name requires that player's credential. Show current identity and an explicit Lock / Sign out action. Warn against remembering access on shared devices.
- Use dedicated reflection access rather than the seven-day club gate on this route, otherwise the general gate would break the eight-week promise. Other club pages keep their current access rules. The limited landing directory is available before reflection login; own match data is not.

### Date-first private notebook

- Open today in Asia/Tokyo, with previous/next day, date picker, and own-history navigation.
- Monday, Tuesday, Wednesday, Saturday: one daily reflection entry.
- Thursday, Sunday: a card for every recorded singles match involving the authenticated player on that date. Show opponent, player-perspective score, Win/Loss/Incomplete, and training/tournament source.
- The normal week determines the default layout, not invented attendance or match records. Actual recorded matches on another weekday remain available. On a match day with no imported matches, explain that results are not yet available and allow a general daily note.
- Friday: optional daily note by default; confirm with the user.
- Keep recorded tournament-match support, separate from training matches. A player may reflect on an incomplete match without changing its result.
- Remove mandatory effort/confidence ratings and multi-question forms in favor of the requested free-text notebook. Optional prompts may suggest serves, receive, placement, what worked, what was difficult, and next focus without creating extra required fields.

### Refinement from the typed notebook examples

- The user confirmed the sample headings were reversed: the sample using ジェスリン belongs to Jacelyn (`LK-0080`), and the sample using ケイツ belongs to Kaitlyn (`LK-0002`). No live data corrections or journal imports are authorized by providing these examples.
- Organize each date as a single notebook page: date and optional private activity label, the daily reflection or recorded-match cards, then a daily coach-feedback block. The user confirmed there should be no separate “Things to improve” input.
- Activity labels can describe training, a private lesson, combined lesson/training, match practice, or a tournament. This is private diary context, not a change to club session metadata or a claim of attendance.
- The user approved the simpler separation: player observations, learning, and next focus belong in the main reflection; advice received from the coach belongs in the daily coach-feedback block. Omit a separate “Things to improve” field. Do not infer the authorship of that heading in the historical examples.
- Non-match reflection remains a single multiline box (plus the Japanese version for the two bilingual accounts), with a hint to describe practice, observations, and next focus; no mandatory sub-question fields.
- Match reflections remain one multiline box per recorded match (plus Japanese for the bilingual accounts). Allow paragraphs covering what worked, difficulties, and intended changes without forcing these into separate fields.
- The user confirmed coach comments do not need per-match fields. Use one daily coach-feedback block, preserving paragraphs, numbering, and line breaks; comments can refer to a match in the text.
- Coach feedback spanning multiple notebook pages belongs in the same date's block, not separate unrelated entries. Do not infer who wrote “Things to improve” from headings alone.
- Populate all actual recorded matches, even if the example discusses only a subset. Allow unwritten cards to stay collapsed and empty; never generate reflections for them. Without recorded timestamps, display ordering/numbering must not claim to be the true play order.
- A sample contains a visually uncertain opponent and transcription artifacts; another opponent label differs from the previously imported 2026-10-11 source. Use approved IDs/results as the app's match context, and ask before any later historical import or record correction. Do not guess identities or silently rewrite match data from prose examples.

### Writing fields

| Entry | LK-0080 / LK-0002 | Future enabled players |
| --- | --- | --- |
| Reflection (per day or per match) | English original + editable Japanese version | Japanese original only |
| Coach comments | Japanese original + English translation | Japanese original only |

- Use one daily coach-comments block as confirmed by the user; no per-match coach fields.
- Label coach comments as “Coach comments — entered by the player”; never imply the coach authenticated or approved the entry.
- Japanese and English original fields stay editable. Translation output is editable, separate, and clearly labeled AI-assisted until reviewed.

## Private API and Authentication

- Add an environment-scoped reflection account store in Upstash, separate from public player profiles. Store enabled status, player ID, language mode, salted password verifier, and credential version. Only a sanitized enabled-name directory is returned to the landing page.
- Provision the two supplied passwords as strong salted password hashes, not browser constants or general club-password substitutes. Support later enabling/disabling players and resetting credentials through a restricted admin action that exposes no journal text.
- Issue an opaque random reflection token with its hash stored server-side, bound to environment, player ID, credential version, and an absolute 56-day expiry. Validate enabled status and revocation on every private request. Sign-out revokes the current session; reset/disable revokes all that player's sessions.
- Suggested routes: directory, player login, reflection session/sign-out, own journal dates, own journal day, revision-checked autosave, and translation. Exact route names can be finalized during implementation.
- Never trust a client-supplied player ID as identity. Derive the owner from the session and verify match participation server-side. Opponents, dates, and results come from approved matches, not editable client snapshots.
- General Site/Admin/Approver tokens do not grant private journal read or write access. Player sessions cannot call maintenance APIs or impersonate another player. Account administration manages feature access, not journal content.
- Remove reflection bodies from general public/admin data, pending/history APIs, bulk-write routes, and ordinary data exports. Close legacy generic reflection submissions in the redesigned environment. Recheck and privately archive any legacy content before cutover; do not delete user content automatically.
- Return private responses with `Cache-Control: no-store`, no private logging, bounded request sizes, login rate limits, and restricted allowed site origins. Render all user/AI text as escaped text.
- This is application-level access control, not end-to-end encryption: infrastructure operators with direct database access can technically read stored journals. Password sharing also permits access. Explain these limits rather than promising otherwise.

## Autosave and Storage

- Store one journal document per environment/player/date, containing an optional daily entry and match entries keyed by stable match source/ID. Use dedicated private Redis keys, not public collection arrays.
- Save after roughly one second without typing, plus on field blur. Serialize outgoing saves; queued saves carry the latest text. Status: Saving / Saved at time / Offline — not synced / Save failed / Conflict.
- Use atomic Redis compare-and-set with a revision number so stale tabs/devices cannot overwrite a newer document. On conflict, retain unsaved text and offer reconciliation; do not silently choose a winner.
- Store only changed entry fields to avoid a delayed reflection save erasing newer coach text. Validate field lengths, dates, language mode, match ownership, and partial drafts; empty drafts are allowed.
- An interrupted connection must retain unsaved work and retry after reconnection or reauthentication. If implementing persistent device recovery, use a protected short-lived draft mechanism, never unprotected journal text in `localStorage`; clear on explicit sign-out and explain shared-device risks. The server remains the golden source; recovery is not a stale-data fallback.
- Do not rely on `beforeunload` as the main saving mechanism. Date changes must wait for a save or clearly preserve an unsynced draft.
- Keep short bounded revisions for recovery if agreed. Changes to approved match scores refresh display context without rewriting journal text.
- Private records, accounts, and sessions stay outside the normal UAT-to-PROD overlay. UAT sessions never authenticate in PROD. Provision PROD accounts separately at approved launch, preserve production diaries, and use a separate restricted backup/recovery process for journals.

## Translation

- English reflection → lightly polished natural Japanese, preserving the player's meaning, voice, uncertainty, and table-tennis context. No invented tactics, achievements, coach advice, or outcomes.
- Use clear, age-appropriate Japanese rather than an adult coaching report. Preserve distinctions such as an observation, a tentative explanation, an action already taken, and a next-match intention. Keep technical distinctions (for example drive vs smash, block vs counter, knuckle vs backspin) and paragraph structure. Translations must not change recorded scores/opponents or add reasons for wins/losses.
- Japanese coach comments → natural English with accurate table-tennis terminology and preserved corrections/nuance. No new coaching advice.
- Button-triggered only, never an AI request per keystroke. Suggest labels “Polish into Japanese” and “Translate coach comments into English”.
- Execute through the Worker using a configured server-side AI provider. No provider is currently configured; select provider, billing, retention policy, and consent before enabling external requests.
- Send only necessary text and terminology context, not player names, IDs, passwords, full diary history, or opponent profiles. Treat text as data, not instructions. Add timeouts, length limits, per-player quotas, and retry controls.
- Preserve originals on every attempt. Show a candidate translation before replacing a manually edited output. Record a source hash/version; mark translations outdated after source edits. Reject stale AI results if source text changed while the request was running.
- If AI is unavailable, autosave and manual writing continue normally. Translation is not required to save a reflection.

## Delivery and Verification

1. Obtain approval for this proposal and outstanding choices. Sample ownership is now confirmed, but a historical journal import still requires a separate request and review of uncertain match references. Original photos are optional unless needed to clarify handwriting.
2. Implement private Worker endpoints and storage with automated authorization, rate-limit, expiry/revocation, match-ownership, and atomic-save tests using synthetic credentials and private text.
3. Implement bilingual directory/login and date-first notebook; remove member-visible reflection renderers and publishing workflow. Keep all unrelated match/player behavior intact.
4. Add translation integration only after provider/privacy approval; test with mocked translation before live use.
5. Enable only LK-0080 and LK-0002 in UAT. Protect any shared Worker changes with environment-scoped rollout so PROD behavior does not change during UAT testing.
6. Verify Jacelyn cannot read/write Kaitlyn's entries or translate text through Kaitlyn's context, general club/Admin/Approver sessions cannot access journal bodies, and changing IDs/URLs never bypasses authentication. Check APIs as well as the UI.
7. Test saved-session restoration, 56-day expiration, sign-out/reset/disable, weekday layouts, incomplete matches, missing match imports, English-only exceptions, Japanese-only future accounts, mobile inputs, autosave failure/retry, rapid navigation, multi-tab conflicts, and source-edit/translation races.
8. Run the repository verification suite, push UAT, check deployment, and perform real authenticated UAT acceptance. Do not import the notebook photos as data unless separately requested.
9. Report UAT results and wait for explicit production approval. At launch provision environment-specific accounts and private storage without overwriting production journal content.

## Decisions Still Needed

- Friday and atypical schedules: optional daily note plus actual recorded matches (recommended).
- Translation provider/billing and consent to send selected private text to it.
- Confirmed choices: sample headings were reversed, coach feedback is daily-only, and there is no separate “Things to improve” field. Typed examples suffice for layout planning; do not require reuploading all photos. No sample import is authorized yet.

Defaults proposed for review: strict player-only application access (including no normal Admin/Approver content access), no publishing/approval step, a dedicated reflection login that restores for 56 days, and no private journal copying during normal dataset promotions.
