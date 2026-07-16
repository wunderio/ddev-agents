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
- npm-family MCP tools (`node_install`, `node_ci`, `node_run`, `node_run_build`,
  `node_run_test`, `node_run_lint`, `npx`, `node_logs`) with lockfile-based
  package-manager detection (npm/yarn/pnpm).
- CLI commands: `agents build`, `agents set-up`, `agents copilot`, `agents start`,
  `agents stop`, `agents npm`, `agents npx`, `agents exec`.
- Monorepo workspaces (`packages/core`, `packages/npm-cli`) alongside the
  existing DDEV add-on files at the repository root.
- Build-time sync script (`npm run sync-core-to-ddev`) to regenerate DDEV
  add-on devcontainer configs and managed config from shared core templates.

### Changed

- Converted repository to npm workspaces with a root `package.json`.
- Updated README with node/npm flavour documentation.

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
