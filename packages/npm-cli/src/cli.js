import { resolveProjectRoot } from './lib/config.js';
import { build } from './commands/build.js';
import { setUp } from './commands/set-up.js';
import { copilot } from './commands/copilot.js';
import { start } from './commands/start.js';
import { stop } from './commands/stop.js';
import { npm } from './commands/npm.js';
import { npx } from './commands/npx.js';
import { exec } from './commands/exec.js';

const COMMANDS = {
  build,
  'set-up': setUp,
  setup: setUp,
  copilot,
  start,
  stop,
  npm,
  npx,
  exec,
};

function printUsage() {
  console.log(`Usage: agents <command> [options]

Commands:
  build              Build the agents devcontainer image
  set-up             Start the container, write agent config (MCP, skill, instructions)
  copilot [args]     Run GitHub Copilot CLI inside the container
  start              Start the agents container
  stop               Stop the agents container
  npm [args]         Run npm inside the container
  npx [args]         Run npx inside the container
  exec [args]        Run an arbitrary command inside the container

Options:
  --node-version <v>     Override the detected Node.js version (build, set-up)
  --force                Replace an existing .devcontainer/devcontainer.json

Environment variables:
  DDEV_AGENTS_GH_TOKEN   GitHub token for Copilot CLI auth
  WQS_MCP_API_KEY        Wunder Quality System MCP API key (optional)

The npm/yarn/pnpm workflow is delivered to the agent as the "node-project"
Copilot skill plus generated instructions, both written into ~/.copilot inside
the container. No local MCP server is needed: the agent runs in the same
container as your code.
`);
}

export async function main(args) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printUsage();
    return 0;
  }

  const [commandName, ...commandArgs] = args;
  const command = COMMANDS[commandName];

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    printUsage();
    return 1;
  }

  const projectRoot = resolveProjectRoot();
  return command({ projectRoot, args: commandArgs });
}
