# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.3] - 2026-10-27

### Added

- CLI-only Claude Code support via the `ddev claude` host command, with Claude
  Code also installed in the devcontainer image through a local `claude`
  devcontainer feature
- Claude managed settings (`claude-managed-settings.json`) with a tool allow list
  for typical dev workflow commands and a deny list for destructive commands
  (e.g. `drush sql-drop`); bypass-permissions mode is disabled
- `wdrmcp` and Wunder Quality System MCP servers configured for Claude Code in
  `.mcp.json`, merged into any existing file to keep user-defined servers
- Per-project Claude state persisted on the host at
  `~/.ddev-agents/projects/<project>/claude`, surviving container rebuilds
- `docker-compose.agents-env.yaml` for forwarding DDEV `web_environment`
  variables into the agents container (user-managed, not overwritten on update)
- `browser-deps` devcontainer feature with the shared libraries headless Chromium
  needs (Playwright, Puppeteer)
- `--no-cache` flag for `ddev build-devcontainer` to force a rebuild
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

### Changed

- PHP 8.4, Composer, Node.js and yq are installed at image build time instead of
  on first run
- `@wunderio/wdrmcp` is pre-installed globally in the devcontainer image
- New addon-managed files (Claude and browser-deps features, Claude managed
  settings) carry the `#ddev-generated` marker so addon updates reach them

### Fixed

- Reinstalling the addon no longer resets `docker-compose.agents-volumes.yaml` to
  `volumes: []`. DDEV treats a project file as addon-managed when the signature
  string appears anywhere in it, and the file's own comments spelled it out. The
  comments now describe the signature without writing it literally.
- DDEV project name is read from `$DDEV_PROJECT`
- Agents volume names are project-specific

## [1.2.2] - 2026-05-18

### Fixed

- Fix Copilot CLI "blocked by policy" warning for MCP servers under a
  registry-only org policy. `wdrmcp` now launches with bare `npx` (no bash
  wrapper) and Wunder Quality System uses the registry's stdio entry. `/workspace/.env`
  is no longer sourced automatically when the MCP server starts.

## [1.2.1] - 2026-05-15

### Fixed

- Fix Copilot CLI session persistence across container rebuilds

## [1.2] - 2026-05-06

### Added

- MCP tools for running GrumPHP, PHPUnit, npm commands and checks, plus a new
  `check` tool executor type
- Add ripgrep to the devcontainer
- Verify `jq` and the minimum host Node.js version before building the devcontainer
- Set the project locale in the agents container during `ddev set-up`

### Changed

- Install PHP from precompiled packages (shyim PHP devcontainer feature)
- Document restarting the MCP server after updating tools or the env file

### Fixed

- Detect the DDEV user from the container config instead of `/var/www/html`
  ownership, fixing SSH key setup with `performance_mode: none`

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

[Unreleased]: https://github.com/wunderio/ddev-agents/compare/1.2.3...HEAD
[1.2.3]: https://github.com/wunderio/ddev-agents/compare/1.2.2...1.2.3
[1.2.2]: https://github.com/wunderio/ddev-agents/compare/1.2.1...1.2.2
[1.2.1]: https://github.com/wunderio/ddev-agents/compare/1.2...1.2.1
[1.2]: https://github.com/wunderio/ddev-agents/compare/1.1.2...1.2
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
