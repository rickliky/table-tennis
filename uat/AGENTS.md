# Cross-PC Project Workflow

- Set up OpenCode independently on each PC and clone this same GitHub repository on both machines.
- GitHub is the single source of truth for source code, project data, documentation, configuration, and important AI instructions.
- Keep important project context in version-controlled files, including this `AGENTS.md`; do not rely on local OpenCode chat or session history.
- Before working on either PC, run `git pull` to get the latest shared state.
- When work is complete, commit the intended files and run `git push` so the other PC can pick up the changes.
- Do not overwrite, revert, or discard work that originated on the other PC without explicit approval.
