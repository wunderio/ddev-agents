# @wunderio/node-agents

Isolated AI agent environment for node/npm projects. No DDEV required.

## What it is

`@wunderio/node-agents` brings the same secure, containerised agentic workflow
that Wunder.io uses for PHP/Drupal projects to node/npm projects:

- Isolated devcontainer with GitHub Copilot CLI
- Pre-configured MCP tools for npm/yarn/pnpm (install, ci, run, build, test, lint, npx)
- Wunder Quality System MCP integration
- Read-only managed security config (`copilot-managed-config.json`)
- `cap_drop: ALL` + `no-new-privileges` hardening
- `GH_TOKEN` / `WQS_MCP_API_KEY` injected via devcontainer `remoteEnv`

## When to use this vs. the DDEV add-on

Use `@wunderio/node-agents` when your project is **not** a PHP/Drupal project
and does **not** use DDEV. If you already use DDEV, use the
`wunderio/ddev-agents` add-on instead.

## Prerequisites

- Node.js 20+ and npm on the host
- Docker (or Docker-compatible runtime) on the host

## Installation

```bash
npm install --save-dev @wunderio/node-agents
```

Recommended `package.json` scripts:

```json
{
  "scripts": {
    "agents:build": "agents build",
    "agents:setup": "agents set-up",
    "copilot": "agents copilot"
  }
}
```

## Authentication

### GitHub token

Create a GitHub Personal Access Token with **Copilot Requests: Read-only**
permission, then export it on your host:

```bash
export DDEV_AGENTS_GH_TOKEN=your_token_here
```

The token is passed into the container via `remoteEnv` and is never written to
the image or container filesystem.

### WQS API key (optional)

Export the Wunder Quality System MCP API key on your host:

```bash
export WQS_MCP_API_KEY=your_key_here
```

## Commands

All commands run inside the isolated agents container.

### `agents build`

Build the devcontainer image. Node.js version is auto-detected from `.nvmrc`
or `package.json` `engines.node`, with an optional override:

```bash
agents build
agents build --node-version 20
```

### `agents set-up`

Build (if needed), start the container, generate MCP configs, and symlink
`~/.copilot` to `/workspace/.copilot` for persistence.

```bash
agents set-up
```

### `agents copilot [args]`

Run GitHub Copilot CLI.

```bash
agents copilot
agents copilot -p "explain this code"
agents copilot --version
```

### `agents start` / `agents stop`

Start or stop the agents container.

### `agents npm [args]` / `agents npx [args]`

Passthrough to npm/npx inside the container.

```bash
agents npm install
agents npm run build
agents npx eslint .
```

### `agents exec <command> [args...]`

Run an arbitrary command inside the container.

```bash
agents exec -- node -v
agents exec -- git status
```

## MCP tools

After `agents set-up`, the wdrmcp server exposes node/npm tools defined in
`.agents/tools-config/node-tools.yml`:

- `node_install` / `node_ci` — dependency install
- `node_run` / `node_run_build` / `node_run_test` / `node_run_lint`
- `npx`
- `node_logs`

The package manager is auto-detected from the lockfile (`pnpm-lock.yaml`,
`yarn.lock`, `package-lock.json`) unless explicitly overridden.

## Security

- Token-based auth via host environment variables
- Managed config mounted read-only at `/home/vscode/.copilot-managed-config.json`
- Container runs with `cap_drop: ALL` and `no-new-privileges:true`
- `SSH_AUTH_SOCK` is cleared in `remoteEnv`
- No secrets stored in the image or container filesystem

## Troubleshooting

**Container fails to start:** ensure Docker is running and the devcontainer CLI
can reach it. The first run may take several minutes to build the image.

**Copilot authentication fails:** verify `DDEV_AGENTS_GH_TOKEN` is exported in
the shell where you run `agents`.

**MCP tools not visible:** restart the wdrmcp server from VS Code or reload the
window.
