# Development Lifecycle

Every behavior or data-tooling change follows the same gated path:

1. Pull the latest `uat` branch.
2. Make the change only on `uat`.
3. Run `npm run verify` locally.
4. Commit only after verification passes. The Husky pre-commit hook runs the same command and blocks a failing commit.
5. Push `uat`. GitHub Actions repeats syntax, Worker authorization, and mocked browser tests before deploying.
6. After deployment, CI waits for the exact commit and checks the live UAT password gates plus anonymous API boundaries.
7. Ask the user to inspect the online UAT site. Authenticated workflows that require real passwords remain a manual acceptance check.
8. Promote to `main` only after explicit user approval. Never treat a previous approval as standing permission.

## One-time setup on each PC

```powershell
npm run setup:dev
```

This installs the pinned Node packages, Chromium for Playwright, and the Husky Git hook. The browser installation is local and is not committed.

## Commands

| Command | Purpose |
|---|---|
| `npm run verify` | Required pre-commit verification |
| `npm run check:syntax` | Parse every tracked JavaScript and JSON file |
| `npm run test:worker` | Exercise Worker authentication and role permissions |
| `npm run test:e2e` | Test member/Admin/Approver browser flows against a local site and mocked API |
| `npm run test:uat` | Smoke-test the deployed UAT boundary without using real credentials |

## What remains manual

- Confirm real Site, Admin, and Approver credentials on UAT.
- Inspect content and visual behavior with real Upstash data.
- Approve or reject production promotion.
- Confirm any intentional golden-source data changes before they are applied.

Tests are a release gate, not permission to push to production.
