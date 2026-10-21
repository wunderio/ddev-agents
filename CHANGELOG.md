# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Support for [fourkitchens/ddev-fire-worktrees](https://github.com/fourkitchens/ddev-fire-worktrees):
  every git worktree gets its own DDEV project, Drupal site, database copy and `agents`
  container, so agents can work in parallel. In a worktree, a new `pre-start` hook
  (`scripts/agents-worktree.sh`) mounts the shared `.git` read-only into the agents
  container, sets `DDEV_AGENTS_WORKTREE` / `DDEV_AGENTS_PRIMARY_PROJECT`, and copies the
  main checkout's Claude Code login (opt out with `DDEV_AGENTS_WORKTREE_SHARE_AUTH=false`).
  `build-devcontainer --reuse-in-worktree` reuses an image built from the same inputs
  instead of rebuilding per worktree. Install, project setup and usage are in the README
  section "Git Worktrees".
- `ddev agents-worktree-prune` to delete the agents state (Claude login copy, chat history,
  image tag) left behind by removed worktrees.
- Managed Claude Code instructions (`claude-managed-instructions.md`, mounted at
  `/etc/claude-code/CLAUDE.md`) describing the container and the worktree rules, and
  `.agents/WORKTREES.md` with the full guide for agents and the people running them.

### Changed

- `ddev set-up` sets `gc.worktreePruneExpire=never` in the agents container, and the
  managed Claude/Copilot policies deny `git worktree`: from inside a container every other
  worktree looks deleted, so pruning there would destroy their metadata.
- In a linked worktree, `ddev set-up` ignores `.mcp.json` and `.copilot` through
  `.git/info/exclude` instead of editing the tracked `.gitignore`.

- Opt-in dependency overlay (`docker-compose.agents-volumes.yaml`) to mitigate macOS
  host freezes under endpoint-security software (e.g. Bitdefender EDR). Moves heavy
  trees (`vendor/`, `node_modules/`) onto VM-local Docker named volumes so the agents
  container's runtime file I/O is never adjudicated on the host. No-op by default;
  opt-in per project, with enablement steps in the file header and README
  "Troubleshooting".
- Companion guidance for DDEV's Mutagen startup scan — the second macOS file-event
  source: ignore the heavy git-ignored trees in `.ddev/mutagen/mutagen.yml` so the
  per-`ddev start` host-side scan stops re-walking them. For Drupal that is `vendor/`,
  `node_modules/` and the Composer-installed code — `web/core`,
  `web/{modules,themes,profiles}/contrib`, `web/libraries`. Documented in the same
  README entry and the volumes file's header.

### Fixed

- Reinstalling the addon no longer resets `docker-compose.agents-volumes.yaml` to
  `volumes: []`. DDEV treats a project file as addon-managed when the signature
  string appears anywhere in it, and the file's own comments spelled it out. The
  comments now describe the signature without writing it literally.

## [1.1.2] - 2026-03-16

### Changed

- Require Node.js 22+ on the host and add a version check to the `set-up` script

## [1.1.1] - 2026-03-11

### Fixed

- Fix `#ddev-generated` on first line in `build-devcontainer` command

### Changed

- Restructure README with logical Getting Started walkthrough

## [1.1] - 2026-03-05

### Added

- Add Wunder Quality System MCP server integration
- Add CHANGELOG.md

### Changed

- Unify environment variable setup instructions for Linux and macOS

## [1.0.1] - 2026-03-02

### Fixed

- Fix Copilot CLI MCP config never generated

### Changed

- Rename `Dockerfile` to `Dockerfile.ddev-agents`

## [1.0] - 2026-02-24

### Added

- Add local MCP server
- DDEV `copilot` CLI command support
- Security hardening for devcontainer

### Changed

- Improve compatibility with DDEV

## [0.4.1] - 2026-02-03

### Changed

- Enable Git integration in VS Code by default

## [0.4] - 2026-01-21

### Added

- Add PHP and Composer to the devcontainer

## [0.3.2] - 2026-01-12

### Changed

- Use PhpStorm as IDE backend when PhpStorm is detected

## [0.3.1] - 2026-01-09

### Security

- Disable SSH agent forwarding to devcontainer

## [0.3] - 2026-01-08

### Added

- JetBrains IDE support

## [0.2.2] - 2026-01-05

## [0.2.1] - 2026-01-04

## [0.2] - 2026-01-02

### Added

- Add GitHub Copilot to the devcontainer

## [0.1] - 2025-12-30

- Initial release

[Unreleased]: https://github.com/wunderio/ddev-agents/compare/1.1.2...HEAD
[1.1.2]: https://github.com/wunderio/ddev-agents/compare/1.1.1...1.1.2
[1.1.1]: https://github.com/wunderio/ddev-agents/compare/1.1...1.1.1
[1.1]: https://github.com/wunderio/ddev-agents/compare/1.0.1...1.1
[1.0.1]: https://github.com/wunderio/ddev-agents/compare/1.0...1.0.1
[1.0]: https://github.com/wunderio/ddev-agents/compare/0.4.1...1.0
[0.4.1]: https://github.com/wunderio/ddev-agents/compare/0.4...0.4.1
[0.4]: https://github.com/wunderio/ddev-agents/compare/0.3.2...0.4
[0.3.2]: https://github.com/wunderio/ddev-agents/compare/0.3.1...0.3.2
[0.3.1]: https://github.com/wunderio/ddev-agents/compare/0.3...0.3.1
[0.3]: https://github.com/wunderio/ddev-agents/compare/0.2.2...0.3
[0.2.2]: https://github.com/wunderio/ddev-agents/compare/0.2.1...0.2.2
[0.2.1]: https://github.com/wunderio/ddev-agents/compare/0.2...0.2.1
[0.2]: https://github.com/wunderio/ddev-agents/compare/0.1...0.2
[0.1]: https://github.com/wunderio/ddev-agents/releases/tag/0.1
