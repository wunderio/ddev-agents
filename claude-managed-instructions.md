<!-- #ddev-generated: managed by the ddev-agents add-on, mounted read-only at /etc/claude-code/CLAUDE.md -->
# ddev-agents environment

You run inside the isolated `agents` container of a DDEV project, as user `vscode`, with
the project mounted at `/workspace`. There is no Docker access and no sudo: you cannot run
`ddev` commands, start/stop environments or create git worktrees. Run Drush, Composer and
tests through the `wdrmcp` MCP tools, which execute in this project's own web container.

## Git worktrees

If `$DDEV_AGENTS_WORKTREE` is `true`, this checkout is a git worktree with its **own**
DDEV project (`$DDEV_PROJECT`), site, database copy and containers, created by
ddev-fire-worktrees; the main checkout is `$DDEV_AGENTS_PRIMARY_PROJECT`. Then:

- Everything you do affects only this worktree's environment, so you may freely run
  database updates, config imports and builds here.
- The database is a copy of the main site's from when the worktree was created; files
  and search indexes are not copied.
- Git is read-only here: inspect with `git status/diff/log/show`, never try to commit,
  and leave changes for the user to commit on the host.
- Never run `git worktree` commands, and never ask for a plain `ddev start` in a new
  worktree (the user runs `ddev fire-worktree-start` on the host).
- Don't hard-code the main site's URL; use `http://web` from inside the container.

Read `/workspace/.agents/WORKTREES.md` for details, including the host-side commands to
suggest to the user when they want work done in a separate environment.
