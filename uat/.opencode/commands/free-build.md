---
description: Free model build for trivial isolated changes. Must follow up with reviewer on Luna after edits.
agent: build
model: opencode/mimo-v2.5-free
---

You are implementing a trivial change for the Little Kings Table Tennis project using the free model.

## Task

$ARGUMENTS

## Allowed changes ONLY

This command is restricted to trivial, isolated changes. Do NOT use it for:

- Ranking or leaderboard logic
- Session calendar or replay
- Chart.js rendering
- `Code.gs` (Apps Script backend)
- GitHub Actions workflows
- `access-gate.js` (password gate)
- `admin.js` CRUD logic
- Data schema or Upstash data structure
- Multi-file refactors

## What IS allowed

- Typo or copy fixes — MUST update BOTH `words.en` and `words.ja`
- Small CSS tweak in `styles.css` only
- HTML attribute or label change
- Comment or rename with no logic change

## Rules

1. Read `AGENTS.md` before editing.
2. Keep changes minimal — do not refactor surrounding code.
3. Respect `edit: ask` permissions.
4. After completing the edit, delegate to the `reviewer` subagent using the task tool:
   - Tell the reviewer: which files changed, what changed, and why
   - The reviewer must use `openai/gpt-5.6-luna`
   - Present the reviewer's findings to the user
   - Do NOT commit or push — let the user decide

## Bilingual reminder

Any user-visible text change MUST include BOTH:
- `words.en[key]` in English
- `words.ja[key]` in Japanese
