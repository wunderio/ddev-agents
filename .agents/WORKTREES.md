# Working in git worktrees (ddev-fire-worktrees + ddev-agents)

With [fourkitchens/ddev-fire-worktrees](https://github.com/fourkitchens/ddev-fire-worktrees)
every git worktree of this project is a **full, separate Drupal environment**: its own DDEV
project, URL, web and database containers, a copy of the main checkout's database, and its
own `agents` container. Agents in different worktrees can therefore build, migrate, import
config and break things in parallel without touching each other or the main site.

This file is written for AI agents and for the people running them. Point your
`AGENTS.md` / `CLAUDE.md` at it (e.g. "See `.agents/WORKTREES.md` for worktree
environments") if your tools don't load it on their own. Claude Code in the agents
container gets a short version of these rules automatically.

## Who runs what, where

| Where | Can do | Cannot do |
|---|---|---|
| **Host** (your terminal, or a host-side tool such as Claude Code / Cursor / Conductor / T3 running on the host) | `git worktree`, `ddev fire-worktree-*`, `ddev start/stop`, `ddev claude`, commit, push | — |
| **Agents container** (`ddev claude`, `ddev copilot`, VS Code "Reopen in Container") | edit files in `/workspace`, run Drush/Composer/tests via the wdrmcp MCP tools, read-only git | create/remove worktrees, run `ddev`, start or stop environments, write to git in a worktree |

The agents container has no Docker access, so **environments are always created and
removed on the host**. An agent inside the container works in exactly one worktree:
the one whose `agents` container it runs in.

## Am I in a worktree? (agents container)

```sh
echo "$DDEV_AGENTS_WORKTREE"         # "true" in a worktree, empty in the main checkout
echo "$DDEV_PROJECT"                 # this worktree's own DDEV project name
echo "$DDEV_AGENTS_PRIMARY_PROJECT"  # the main checkout's project name
```

`/workspace/.ddev/config.worktree.local.yaml` exists only in a worktree.

## Rules for agents inside a worktree

1. **This environment is yours.** Drush, Composer and test tools (wdrmcp `drush`,
   `composer_*`, `phpunit`, ...) act on this worktree's own web and database
   containers, reached as `web` and `db` on the project network. Nothing you do affects
   the main checkout's site or other worktrees.
2. **The database is a copy** of the main checkout's database from when the worktree was
   created (or last refreshed). It may be behind the main site. Run pending updates and
   config imports here as you normally would (`drush deploy` / `updb` / `cim`).
3. **Files are not copied.** `sites/default/files` starts empty (use Stage File Proxy for
   images). Search indexes (Solr etc.) start empty: `drush search-api:reset-tracker`, then
   `drush search-api:index`.
4. **Git is read-only** (or unavailable, if the project sets `WORKTREE_MOUNT_GIT=false`). `git status`, `git diff`, `git log`, `git show` work; anything
   that writes (`add`, `commit`, `stash`, `switch`, `branch`) fails with a read-only
   error. Leave changes in the working tree and tell the user they are ready to commit
   on the host. Never run `git worktree` commands inside the container (they are denied
   by policy; from inside the container every other worktree looks deleted, and pruning
   would destroy their metadata).
5. **Don't hard-code the main site's URL.** URLs and hostnames differ per worktree
   (`https://<project>.ddev.site`). Inside the container use `http://web`; for a browser
   URL or a login link, ask the user to run `ddev fire-worktree-info` on the host.
6. **Never ask for `ddev start` in a new worktree** — it creates an empty database.
   The user should run `ddev fire-worktree-start` (or `ddev fire-worktree-refresh --yes`
   to replace the database with a fresh copy).
7. If the site looks broken right after creation, check `.ddev/fire-worktree-start.log`
   (startup output, including the build step) before changing code.

## Rules for agents on the host that orchestrate worktrees

If you are a host-side agent asked to "work on X in a separate environment" or to run
tasks in parallel:

```sh
# Create a branch + worktree next to the main checkout (../<repo>-<branch>),
# give it its own DDEV project, copy the database and run the build.
ddev fire-worktree-create feature/abc-123-hero
#   --pr=123            check out a pull request instead
#   --db=latest|fresh|<snapshot or dump>   database source (default: primary)
#   --no-build          skip drush deploy / site-build
#   --fetch             fetch origin first

cd ../<repo>-feature-abc-123-hero
ddev fire-worktree-info --json       # project name, status, URLs, DB age, login link
ddev claude                           # Claude Code in this worktree's agents container
ddev claude -p "..."                  # headless task in this worktree

ddev fire-worktree-list               # every worktree, its project, status and URL
ddev fire-worktree-refresh --yes      # replace this worktree's DB with a fresh copy
ddev fire-worktree-remove --yes       # delete project, DB, volumes and checkout (branch kept)
ddev fire-worktree-prune --yes        # clean up environments of deleted checkouts
ddev agents-worktree-prune --yes      # clean up agents state of deleted worktrees
```

- Run `ddev fire-worktree-start` (not `ddev start`) when a worktree has no environment
  yet, e.g. one created by another tool or with plain `git worktree add`.
- Several worktrees can start at once; startup serializes `ddev start` itself.
- Each running worktree costs a full set of containers. `ddev stop` idle ones.
- `fire-worktree-remove` refuses a checkout with uncommitted changes; commit or pass
  `--keep-checkout`.

## What ddev-agents adds in a worktree

- The worktree's `agents` container reuses the main checkout's devcontainer image when
  the build inputs match, so starting a worktree doesn't rebuild it.
- Your Claude Code login is copied from the main checkout's project the first time a
  worktree starts (chat history stays per worktree). Set
  `DDEV_AGENTS_WORKTREE_SHARE_AUTH=false` on the host to log in per worktree instead.
- The shared `.git` directory is mounted read-only, so git inspection works.
- Generated files (`.mcp.json`, `.copilot/`, the agents overlay) are ignored through
  `.git/info/exclude`, so they don't make the worktree dirty.
