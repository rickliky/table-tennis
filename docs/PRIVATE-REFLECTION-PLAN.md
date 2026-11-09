# Private Player Reflection — UAT Plan (Manual Translation)

Status: **live in production** following explicit rollout and private-notebook migration approval on 2026-10-13 (release `87edfcb`). Both initial accounts and eight saved day documents were migrated, with existing passwords preserved and UAT originals retained; sessions were not copied. Translation stays manual, writing is expanded/auto-height, Friday is a rest day, and Admins have read-only access. The card directory and standalone fictional preview are also live. This historical plan's original owner-only/no-Admin-reading and earlier layout details are superseded by the implemented behavior documented in `docs/PRIVATE-REFLECTIONS.md`. Historical design-sample imports remain unauthorized.

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
- Friday: optional daily note by default; actual recorded matches on atypical weekdays remain available. This implementation default was communicated when UAT work started.
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
- Populate all actual recorded matches, even if the example discusses only a subset. All writing blocks now stay expanded; unwritten fields remain empty, never generated. Auto-growing inputs show all paragraphs. Without recorded timestamps, display ordering/numbering must not claim to be the true play order.
- A sample contains a visually uncertain opponent and transcription artifacts; another opponent label differs from the previously imported 2026-10-11 source. Use approved IDs/results as the app's match context, and ask before any later historical import or record correction. Do not guess identities or silently rewrite match data from prose examples.

### Writing fields

| Entry | LK-0080 / LK-0002 | Future enabled players |
| --- | --- | --- |
| Reflection (per day or per match) | English original + editable Japanese version | Japanese original only |
| Coach comments | Japanese original + English translation | Japanese original only |

- Use one daily coach-comments block as confirmed by the user; no per-match coach fields.
- Label coach comments as “Coach comments — entered by the player”; never imply the coach authenticated or approved the entry.
- Japanese and English fields stay editable. In the approved non-translation release, secondary language fields are labelled manual versions, not AI-assisted output. No translation provider or buttons are enabled.

## Private API and Authentication

- Add an environment-scoped reflection account store in Upstash, separate from public player profiles. Store enabled status, player ID, language mode, salted password verifier, and credential version. Only a sanitized enabled-name directory is returned to the landing page.
- Provision the two supplied passwords as strong salted password hashes, not browser constants or general club-password substitutes. Support later enabling/disabling players and resetting credentials through a restricted admin action that exposes no journal text.
- Issue an opaque random reflection token with its hash stored server-side, bound to environment, player ID, credential version, and an absolute 56-day expiry. Validate enabled status and revocation on every private request. Sign-out revokes the current session; reset/disable revokes all that player's sessions.
- Suggested routes: directory, player login, reflection session/sign-out, own journal dates, own journal day, revision-checked autosave, and translation. Exact route names can be finalized during implementation.
- Never trust a client-supplied player ID as identity. Derive the owner from the session and verify match participation server-side. Opponents, dates, and results come from approved matches, not editable client snapshots.
- General Site/Approver tokens do not grant private journal access. The user subsequently authorized Admin read-only notebook viewing through a dedicated Data Maintenance tab and protected read-only endpoints, not general datasets. Admins cannot edit notebooks; player sessions cannot call maintenance APIs or impersonate another player. Account administration remains separate from journal reading.
- Remove reflection bodies from general public/admin data, pending/history APIs, bulk-write routes, and ordinary data exports. Close legacy generic reflection submissions in the redesigned environment. Recheck and privately archive any legacy content before cutover; do not delete user content automatically.
- Return private responses with `Cache-Control: no-store`, no private logging, bounded request sizes, login rate limits, and restricted allowed site origins. Render all user/AI text as escaped text.
- This is application-level access control, not end-to-end encryption. The user requested removal of the infrastructure/encryption sentence from the UI; do not replace it with a contrary encryption promise. The visible disclosure states that players and club administrators can read notebooks, while other members and Approvers cannot. Password sharing also permits access.

## Autosave and Storage

- Store one journal document per environment/player/date, containing an optional daily entry and match entries keyed by stable match source/ID. Use dedicated private Redis keys, not public collection arrays.
- Save after roughly one second without typing, plus on field blur. Serialize outgoing saves; queued saves carry the latest text. Status: Saving / Saved at time / Offline — not synced / Save failed / Conflict.
- Use atomic Redis compare-and-set with a revision number so stale tabs/devices cannot overwrite a newer document. On conflict, retain unsaved text and offer reconciliation; do not silently choose a winner.
- Store only changed entry fields to avoid a delayed reflection save erasing newer coach text. Validate field lengths, dates, language mode, match ownership, and partial drafts; empty drafts are allowed.
- An interrupted connection must retain unsaved work and retry after reconnection or reauthentication. If implementing persistent device recovery, use a protected short-lived draft mechanism, never unprotected journal text in `localStorage`; clear on explicit sign-out and explain shared-device risks. The server remains the golden source; recovery is not a stale-data fallback.
- Do not rely on `beforeunload` as the main saving mechanism. Date changes must wait for a save or clearly preserve an unsynced draft.
- Keep short bounded revisions for recovery if agreed. Changes to approved match scores refresh display context without rewriting journal text.
- Private records, accounts, and sessions stay outside the normal UAT-to-PROD overlay. UAT sessions never authenticate in PROD. Provision PROD accounts separately at approved launch, preserve production diaries, and use a separate restricted backup/recovery process for journals.

## Translation — Manual Only (User Decision)

The user has chosen to keep manual translation. The following automated-translation ideas and provider research are reference only, not active implementation requirements. No provider configuration or private text transmission is authorized.

- English reflection → lightly polished natural Japanese, preserving the player's meaning, voice, uncertainty, and table-tennis context. No invented tactics, achievements, coach advice, or outcomes.
- Use clear, age-appropriate Japanese rather than an adult coaching report. Preserve distinctions such as an observation, a tentative explanation, an action already taken, and a next-match intention. Keep technical distinctions (for example drive vs smash, block vs counter, knuckle vs backspin) and paragraph structure. Translations must not change recorded scores/opponents or add reasons for wins/losses.
- Japanese coach comments → natural English with accurate table-tennis terminology and preserved corrections/nuance. No new coaching advice.
- Button-triggered only, never an AI request per keystroke. Suggest labels “Polish into Japanese” and “Translate coach comments into English”.
- Execute through the Worker using a configured server-side AI provider. No provider is currently configured; select provider, billing, retention policy, and consent before enabling external requests.
- Send only necessary text and terminology context, not player names, IDs, passwords, full diary history, or opponent profiles. Treat text as data, not instructions. Add timeouts, length limits, per-player quotas, and retry controls.
- Preserve originals on every attempt. Show a candidate translation before replacing a manually edited output. Record a source hash/version; mark translations outdated after source edits. Reject stale AI results if source text changed while the request was running.
- If AI is unavailable, autosave and manual writing continue normally. Translation is not required to save a reflection.

### Provider options (2026-10-13; not yet approved)

- Initial quality/polishing recommendation: **DeepL's paid API** (currently API Growth for new subscriptions; legacy API Pro only if genuinely available to the account). This is a translation-first candidate for the requested limited polishing, not a general coaching chatbot. Use EN↔JA terminology glossaries, short generic table-tennis context, and local tone instructions to preserve the player's voice. Its documented `custom_instructions` support Japanese/English targets; verify account access and quality with synthetic samples before sending private writing. The user's subsequent subscription/free-option question prompted the additional candidates below; paid DeepL is not the only possible solution.
- DeepL's paid terms say content is kept temporarily to provide translation and not used for general model training. Do not promise absolute zero retention: exceptional encrypted debugging retention may last up to 72 hours. Avoid saved translations, translation memories, or uploading private notebooks as training/customization material. A terminology-only glossary is sufficient. Obtain the necessary guardian/coach-content authorizations and accept applicable data-processing terms before live use. Label unedited output as DeepL-assisted per API attribution terms.
- Do **not** use free/Developer DeepL plans for this private content: current terms prohibit personal-data processing with API Developer and permit ongoing content retention. Do not confuse a paid API plan with an ordinary web-translator subscription.
- Published US pricing reference for API Growth: USD 26/month billed annually, including 12 million characters per year, with additional-character fees. Japan checkout, monthly billing, taxes, and plan availability must be checked before purchase; no subscription or cost is authorized by requesting a recommendation. Set provider and application usage caps if approved.
- Do **not** recommend the standard Gemini Developer API for this youth-facing feature: its current terms prohibit use in API clients directed toward or likely accessed by under-18s, regardless of selecting a paid tier. This finding concerns the Developer API terms, not every separately contracted Google Cloud product.
- OpenAI is an alternative for flexible polishing only after suitable child-data safeguards are in place. Its under-18 guidance says not to process personal data of under-13s (or the applicable digital-consent age) without API Zero Data Retention. ZDR requires approval; `store:false` alone is not ZDR and does not remove default abuse-monitoring retention. Do not use this coding session's login as a website API credential.
- The delivered journal has manual Japanese/English fields and external translation disabled. Any paid or free-allowance provider still requires approval, applicable terms/privacy review, consent, and synthetic quality evaluation. Never fall back to an unapproved provider on errors.

#### Existing subscriptions and free allowances

- **ChatGPT Pro**: ChatGPT and OpenAI API billing are separate; the subscription is not a website translation API entitlement. An adult may manually translate appropriate text in their own consumer account and paste reviewed output into the existing manual fields, subject to its privacy/data controls. Do not automate consumer login, share session cookies, or reuse coding-session OAuth to operate the club translator. OpenAI child-data API constraints above still apply to an API integration.
- **Google AI Pro**: enhanced AI Studio web-interface access is not direct Gemini API quota. Current Google Developer Program Premium benefits include **$10/month GenAI & Cloud credit** with AI Pro for eligible linked accounts; Cloud project/billing setup and credit activation are separate, and eligibility has not been checked for the user's account. Google One AI credits are a different credit system. Credits do not remove the standard Gemini Developer API under-18 restriction.
- **Google Cloud Translation standard NMT** (not Gemini): the first **500,000 characters/month** are free through a recurring $10 credit; ordinary list pricing above that is $20 per million characters. Requires Cloud setup/billing and quotas; budgets alone are not hard spending stops. Google says request text is held briefly in memory for translation and not used to train/improve translation features. This is a credible low-cost candidate, not yet approved for this journal or guaranteed to satisfy every child-data/legal requirement.
- **Azure Translator Text API v3, F0**: published free allowance is **2 million characters/month** (shared with any custom translation training usage). Microsoft says translation requests are No Trace, without persistent storage or training use; v3 No Trace applies to all pricing tiers, including F0. This does not describe Bing/consumer Translator apps or uploaded Custom Translator training documents. Requires an Azure subscription/resource and applicable terms/consent review; availability has not been checked in the user's account. A credible zero-translation-fee candidate for the initial volume.
- Standard NMT translation is not equivalent to prompt-driven light polishing. Evaluate EN↔JA using synthetic table-tennis passages (short child-style sentences, omitted subjects, numbered coach notes, technical terms) before choosing Google/Azure versus paid DeepL. Preserve originals and label editable machine-translated versions; do not rewrite coaching meaning. Local models are another possibility with no per-call provider bill, but hardware, hosting, maintenance, and quality costs remain.
- No account signup, billing change, credit claim, provider key, UAT integration, or submission of private notebook text was authorized or performed by this research question. Translation remains on hold.

Official references checked:
- [DeepL text API](https://developers.deepl.com/api-reference/translate) and [custom instructions](https://developers.deepl.com/docs/customize/custom-instructions)
- [DeepL terms](https://www.deepl.com/en/pro-license), [privacy](https://www.deepl.com/en/privacy), and [pricing](https://www.deepl.com/en/pricing)
- [Gemini Developer API terms](https://ai.google.dev/gemini-api/terms)
- [OpenAI under-18 guidance](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) and [data controls](https://developers.openai.com/api/docs/guides/your-data)
- [ChatGPT versus API billing](https://help.openai.com/en/articles/9039756-billing-settings-in-chatgpt-vs-platform)
- [Google AI plans / API separation](https://ai.google.dev/gemini-api/docs/google-ai-plans) and [Developer Program benefits](https://developers.google.com/program/plans-and-pricing)
- [Cloud Translation pricing](https://cloud.google.com/translate/pricing) and [data usage](https://docs.cloud.google.com/translate/data-usage)
- [Azure Translator pricing](https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator/), [No Trace](https://www.microsoft.com/en-us/translator/business/notrace/), and [v3 all-tier No Trace](https://learn.microsoft.com/en-us/azure/ai-services/translator/text-translation/how-to/migrate-to-v3)

## Delivery and Verification

1. UAT non-translation implementation was approved and delivered on 2026-10-13. Historical journal import still requires a separate request and review of uncertain match references. Original photos are optional unless needed to clarify handwriting.
2. Implement private Worker endpoints and storage with automated authorization, rate-limit, expiry/revocation, match-ownership, and atomic-save tests using synthetic credentials and private text.
3. Implement bilingual directory/login and date-first notebook; remove member-visible reflection renderers and publishing workflow. Keep all unrelated match/player behavior intact.
4. Add translation integration only after provider/privacy approval; test with mocked translation before live use.
5. Enable only LK-0080 and LK-0002 in UAT. Protect any shared Worker changes with environment-scoped rollout so PROD behavior does not change during UAT testing.
6. Verify Jacelyn cannot read/write Kaitlyn's entries or translate text through Kaitlyn's context, general club/Admin/Approver sessions cannot access journal bodies, and changing IDs/URLs never bypasses authentication. Check APIs as well as the UI.
7. Test saved-session restoration, 56-day expiration, sign-out/reset/disable, weekday layouts, incomplete matches, missing match imports, English-only exceptions, Japanese-only future accounts, mobile inputs, autosave failure/retry, rapid navigation, multi-tab conflicts, and source-edit/translation races.
8. Run the repository verification suite, push UAT, check deployment, and perform real authenticated UAT acceptance. Do not import the notebook photos as data unless separately requested.
9. Report UAT results and wait for explicit production approval. At launch provision environment-specific accounts and private storage without overwriting production journal content.

## Current Decisions / Future Approvals

- Friday: user confirmed there is never practice. Notebook-day arrows now skip Fridays; the Friday default opens Thursday. Explicit empty Fridays show a rest message rather than writing boxes; existing Friday notes stay accessible and are never deleted/moved. Dates show localized weekdays in player and Admin views. This supersedes the earlier atypical-Friday default.
- Translation will remain manual by user decision. Any future change to external translation requires a new request and provider/billing/privacy approval.
- Production rollout, production account provisioning, and historical sample import are not authorized by the UAT implementation request.
- Confirmed choices: sample headings were reversed, coach feedback is daily-only, and there is no separate “Things to improve” field. Typed examples suffice for layout planning; do not require reuploading all photos. No sample import is authorized yet.

Current access: player-owned writing plus expressly authorized Admin read-only browsing; no Approver/member reading, no publishing/approval step, a dedicated player login that restores for 56 days, and no private journal copying during normal dataset promotions.
