# Node Agents MCP Tool Configs

These YAML files define the tools exposed by the wdrmcp server for node/npm
projects.

- `node-tools.yml` — npm/yarn/pnpm install, CI, run scripts, npx, and logs.

All tools execute locally inside the agents container at `/workspace` (there is
no separate DDEV web container for this flavour).
