# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- New `@wunderio/node-agents` npm package for node/npm projects without DDEV.
- Shared `@wunderio/agents-core` package containing devcontainer templates,
  managed security config, MCP config templates, version resolution, and
  Copilot invocation helpers.
- `node-project` Copilot skill and generated `copilot-instructions.md`, written
  into `~/.copilot` inside the agents container by `agents set-up`. The skill
  documents lockfile-based package-manager detection (npm/yarn/pnpm), the
  canonical install/ci/run/build/test/lint commands, how to treat a failing
  suite or linter, long-running commands, and guardrails. The instructions carry
  the facts detected for the project: name, Node.js version, package manager and
  the lockfile it came from, and the scripts declared in `package.json`.
  Node projects deliberately ship **no** local MCP tool server: the Copilot agent
  runs in the same container as the source, so it executes build/test/lint
  commands with its own shell. MCP is only architecturally necessary for the
  DDEV flavour, where wdrmcp must reach the separate `web` container over SSH.
  `wunder-quality-system` remains the only MCP server configured for node
  projects.
- CLI commands: `agents build`, `agents set-up`, `agents copilot`, `agents start`,
  `agents stop`, `agents npm`, `agents npx`, `agents exec`.
- Monorepo workspaces (`packages/core`, `packages/npm-cli`) alongside the
  existing DDEV add-on files at the repository root.
- Build-time sync script (`npm run sync-core-to-ddev`) to regenerate DDEV
  add-on devcontainer configs and managed config from shared core templates,
  with a `--check` mode that fails CI on drift instead of rewriting files.
- `agents set-up --force` / `agents build --force` to deliberately replace a
  pre-existing `.devcontainer/devcontainer.json`.

### Changed

- Converted repository to npm workspaces with a root `package.json`.
- Updated README with node/npm flavour documentation.
- The node flavour no longer configures wdrmcp. Its `command` and `check`
  executors require an `ssh_target` and always execute over SSH into a second
  container, so none of their tools could load in this single-container
  flavour. The bundled MCP server replaces them.
- npm packages are now published from `npm-v*` tags rather than every GitHub
  release, so package versions no longer collide with DDEV add-on release tags.
  Publishing runs in dependency order and skips already-published versions.

### Fixed

- The node agents container is now hardened to match the documented guarantees:
  `--cap-drop=ALL` and `--security-opt no-new-privileges:true` (which disables
  `sudo`), with `updateRemoteUserUID` disabled because the CLI's root-side UID
  remap needs `CAP_CHOWN`. Previously the container ran unhardened while the
  README promised otherwise.
- `agents stop` now finds the container via the devcontainer CLI's
  `devcontainer.local_folder` label instead of a container name the CLI never
  assigns, and reports Docker failures instead of masking them as
  "already stopped or not found".
- The node devcontainer pins a deterministic container-side workspace folder
  (`/workspace`) so tool and MCP paths resolve correctly.
- Secrets are no longer duplicated into `containerEnv` for the node flavour,
  where they would persist in the container's stored configuration.
- The managed config copied into node projects no longer carries the
  `#ddev-generated` marker, and generated MCP configs no longer set
  `DDEV_PROJECT`.
- Removed a stray `mcp/.vscode/` directory that pinned an outdated wdrmcp
  version against a hardcoded `/workspace` path.

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
