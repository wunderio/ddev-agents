---
name: node-project
description: >-
    Build, test, lint and manage dependencies in a node/npm project running inside the
    Wunder agents devcontainer. Use when the user asks to install or update dependencies,
    run a package.json script, build the project, run the test suite, run the linter,
    or inspect application logs.
---

# Working in a node/npm project

You are running inside the Wunder **agents devcontainer**, in the *same*
container as the project source. The project is mounted at `/workspace` and the
whole node toolchain (`node`, `npm`, `npx`, and any dev dependencies once
installed) is on your `PATH`. Run project commands directly with your shell —
there is no second container and no SSH hop.

## Detect the package manager first

Never assume `npm`. Check the lockfiles in the project root and pick the first
match, in this order:

| Lockfile | Package manager |
|---|---|
| `pnpm-lock.yaml` | `pnpm` |
| `yarn.lock` | `yarn` |
| `package-lock.json` (or none) | `npm` |

If the chosen package manager is not installed, install it with
`npm install -g <pnpm|yarn>` rather than silently falling back to `npm` — using
the wrong package manager rewrites the lockfile and produces a noisy diff.

## Canonical commands

Read `package.json` to see which scripts actually exist before running one. Do
not invent script names.

| Task | npm | yarn | pnpm |
|---|---|---|---|
| Install | `npm install` | `yarn install` | `pnpm install` |
| Install from lockfile | `npm ci` | `yarn install --frozen-lockfile` | `pnpm install --frozen-lockfile` |
| Run a script | `npm run <script> -- <args>` | `yarn run <script> <args>` | `pnpm run <script> <args>` |
| Build | `npm run build` | `yarn run build` | `pnpm run build` |
| Test | `npm run test` | `yarn run test` | `pnpm run test` |
| Lint | `npm run lint` | `yarn run lint` | `pnpm run lint` |
| One-off binary | `npx <bin>` | `yarn dlx <bin>` | `pnpm dlx <bin>` |

Only `npm` needs the `--` separator to forward arguments to a script; `yarn` and
`pnpm` pass them through and would treat a bare `--` as a script argument.

Prefer the lockfile-strict install (`npm ci` and friends) when you only need the
declared dependencies — it is reproducible and will not mutate the lockfile.

## Interpreting results

A failing test suite or a linter reporting violations is a **result, not a tool
error**. Report what failed and why, and fix the code — do not retry the command
unchanged, and do not disable the check or edit the lockfile to make it pass.

Build, test and lint output can be very long. Pipe through `tail`, `head` or
`grep` when you only need the failure summary.

## Long-running commands

Dev servers, watchers and `--watch` test runners never exit. Start them in the
background and keep working; do not block on them. Prefer one-shot equivalents
(`vitest run` over `vitest`, `tsc --noEmit` over `tsc --watch`) when you just
want a verdict.

## Logs

Node applications normally log to stdout/stderr, so there is usually nothing to
tail. If the project writes files, they are typically under `logs/` — read the
tail of `logs/*.log`. Otherwise inspect the output of the process you started.

## Guardrails

- Never run `npm publish` (or the yarn/pnpm equivalent).
- Never use `sudo`; the container drops all capabilities and blocks privilege
  escalation, so it cannot succeed.
- Do not edit `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml` by hand — let
  the package manager regenerate them.
- Do not read or write `.env`, `.npmrc`, or other credential files.
- Adding a dependency is a real change: prefer `npm install <pkg>` (which records
  it in `package.json`) over hand-editing the manifest, and say so in your summary.
