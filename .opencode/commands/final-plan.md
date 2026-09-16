---
description: Read-only final plan using Luna. Validates draft against AGENTS.md, outputs file-by-file implementation plan + risks. No edits.
agent: plan
model: openai/gpt-5.6-luna
---

You are producing the final implementation plan for the Little Kings Table Tennis project.

## Instructions

1. Read `AGENTS.md` for project context, business rules, data schema, and development conventions.
2. Understand the task: $ARGUMENTS
3. If a draft plan exists from the user's message history, review and validate it. If not, create one from scratch by exploring the codebase.
4. Validate against `AGENTS.md` business rules:
   - Bilingual: any new text must have keys in BOTH `words.en` and `words.ja`
   - Data schema: match player/match object shapes
   - Image fallback: `img/{playerId}.jpg` → `img/NoProfilePic.jpg`
   - `isComplete()` requires `player1Sets >= 3 || player2Sets >= 3`
   - Training matches only: filtered by `eventType()` checking for "club|training|練習"
   - No unit tests exist — manual review is the only verification
5. Produce a **final implementation plan** with:
   - File-by-file changes (what to add, modify, or remove)
   - Risks and potential regressions
   - Testing/verification steps (manual, since no test framework exists)
   - Implementation order (which files first, dependencies)
6. Do NOT make any file changes.

## Output format

```
## Final Implementation Plan

### Summary
[1-2 sentence overview]

### Changes by file
#### `app.js`
- Change X at line N because Y

#### `styles.css`
- Add rule Z because W

### Risks
- Risk 1: mitigation

### Verification
1. Manual check: open index.html, verify ...

### Implementation order
1. First: file A (reason)
2. Second: file B (reason)
```
