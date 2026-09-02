# Testing `@wunderio/node-agents` from local tarballs

These steps let you build the npm packages as tarballs and install them into a
**separate local project**, exactly as an end user would consume them from the
npm registry — without publishing anything.

There are two packages in this monorepo:

| Package | Tarball |
|---|---|
| `@wunderio/agents-core` | `wunderio-agents-core-<version>.tgz` |
| `@wunderio/node-agents` (the `agents` CLI) | `wunderio-node-agents-<version>.tgz` |

`@wunderio/node-agents` depends on `@wunderio/agents-core`. Because the core
package is **not published**, you must install **both** tarballs together into
the test project (see step 3), otherwise npm will try to fetch
`@wunderio/agents-core` from the registry and fail.

---

## Prerequisites

- Node.js 20+ and npm on the host
- Docker running on the host (the CLI drives a devcontainer)
- A GitHub token with **Copilot Requests: Read-only**:
  ```bash
  export DDEV_AGENTS_GH_TOKEN=your_token_here
  ```
- (Optional) Wunder Quality System key:
  ```bash
  export WQS_MCP_API_KEY=your_key_here
  ```

---

## 1. Build the tarballs

From the monorepo root (`/workspace`):

```bash
npm pack \
  --workspace @wunderio/agents-core \
  --workspace @wunderio/node-agents \
  --pack-destination agents-tarballs
```

This writes (or overwrites) both tarballs into `agents-tarballs/`:

```bash
ls -la agents-tarballs/
# wunderio-agents-core-1.0.0.tgz
# wunderio-node-agents-1.0.0.tgz
```

> Tip: to be sure a fix is actually packed, inspect a file inside the tarball
> without extracting, e.g.:
> ```bash
> tar -xzOf agents-tarballs/wunderio-node-agents-1.0.0.tgz \
>   package/src/commands/set-up.js | head
> ```

---

## 2. Create a throwaway test project

Use any directory **outside** this repo so you exercise a real, separate
project:

```bash
mkdir -p /tmp/agents-test && cd /tmp/agents-test
npm init -y
# Optional: pin the Node version the devcontainer should use
echo "20" > .nvmrc
```

Record the absolute path to the tarballs for the next step:

```bash
TARBALLS=/workspace/agents-tarballs
```

---

## 3. Install both tarballs into the test project

Install **both together in a single command** so npm resolves the local
`@wunderio/agents-core` dependency from the tarball instead of the registry:

```bash
cd /tmp/agents-test
npm install --save-dev \
  "$TARBALLS/wunderio-agents-core-1.0.0.tgz" \
  "$TARBALLS/wunderio-node-agents-1.0.0.tgz"
```

Verify the `agents` binary is available:

```bash
npx agents --help
```

You should see the usage listing (`set-up`, `copilot`, `start`, `stop`, ...).

---

## 4. Run setup

```bash
cd /tmp/agents-test
npx agents set-up
```

Expected output ends with:

```
✅ Symlinked ~/.copilot to /workspaces/agents-test/.copilot
✅ Wrote Copilot CLI MCP config
✅ Wrote VS Code MCP config
✅ Setup complete. Run `agents copilot` or attach VS Code to the devcontainer.
```

---

## 5. Verify the generated files

On the host:

```bash
cd /tmp/agents-test
cat .devcontainer/devcontainer.json          # rendered from the node template
cat .devcontainer/copilot-managed-config.json # security deny-lists (no #ddev-generated marker)
```

Confirm the container is actually hardened:

```bash
docker inspect --format '{{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}' \
  "$(docker ps -q --filter label=devcontainer.local_folder=/tmp/agents-test)"
# -> [ALL] [no-new-privileges:true]

npx agents exec -- bash -c 'sudo -n id'   # must fail
```

Inside the container (the generated config pins the workspace to `/workspace`):

```bash
npx agents exec -- bash -c 'readlink ~/.copilot'
# -> /workspace/.copilot

npx agents exec -- cat ~/.copilot/mcp-config.json
```

Check the MCP config is correct:

- `wunder-quality-system` is the **only** registered server — node build/test/
  lint tooling is a skill, not an MCP server.
- `supergateway` args are **unpinned** so the registry fingerprints match.
- The WQS bearer is exactly `${WQS_MCP_API_KEY}` — **no** leading backslash.

Check the skill and instructions were installed:

```bash
npx agents exec -- bash -lc 'ls ~/.copilot/skills/node-project/SKILL.md'
npx agents exec -- cat ~/.copilot/copilot-instructions.md
```

The instructions must name the test project, the detected package manager and
the lockfile it came from, and list the scripts from its `package.json`. No
`{{placeholder}}` may remain.

---

## 6. Verify the agent picks it all up

```bash
cd /tmp/agents-test
npx agents copilot
```

- `/mcp` should show `wunder-quality-system` as **connected**. If it is blocked,
  re-check step 5 — a stray backslash in the bearer token is the usual cause.
- `/skills` should list `node-project`.
- Ask it to "run the build" and confirm it uses the right package manager and
  runs the command in its own shell rather than looking for a tool.

---

## 7. Iterate (rebuild → reinstall loop)

After changing code in `packages/`, rebuild and reinstall:

```bash
# 1. rebuild tarballs (monorepo root)
cd /workspace
npm pack --workspace @wunderio/agents-core \
  --workspace @wunderio/node-agents --pack-destination agents-tarballs

# 2. reinstall into the test project (force fresh copy)
cd /tmp/agents-test
rm -rf node_modules/@wunderio package-lock.json
npm install --save-dev \
  /workspace/agents-tarballs/wunderio-agents-core-1.0.0.tgz \
  /workspace/agents-tarballs/wunderio-node-agents-1.0.0.tgz

# 3. re-run
npx agents set-up
```

> npm caches tarballs by name+version. If the version number did not change,
> clearing `node_modules/@wunderio` (as above) guarantees the new build is used.
> Alternatively bump the `version` in both `package.json` files before packing.

---

## 8. Run the unit tests (optional)

```bash
cd /workspace
npm test --workspaces
```

---

## 9. Cleanup

```bash
rm -rf /tmp/agents-test
npx agents stop   # if a container is still running (run from the test project)
```
