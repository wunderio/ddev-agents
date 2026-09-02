/**
 * Build the command to invoke GitHub Copilot CLI inside a devcontainer.
 *
 * Uses `devcontainer exec` so that remoteEnv from devcontainer.json is injected
 * (GH_TOKEN, WQS_MCP_API_KEY) without storing secrets in the container image.
 */

export function buildCopilotCommand({ workspaceFolder, args = [] } = {}) {
  const command = ['devcontainer', 'exec', '--workspace-folder', workspaceFolder];

  if (args.length === 0) {
    command.push('gh', 'copilot');
  } else {
    command.push('gh', 'copilot', ...args);
  }

  return command;
}

export async function invokeCopilot({ workspaceFolder, args = [], spawnOptions = {} } = {}) {
  const { spawn } = await import('node:child_process');
  const command = buildCopilotCommand({ workspaceFolder, args });

  return new Promise((resolve, reject) => {
    const child = spawn(command[0], command.slice(1), {
      stdio: 'inherit',
      ...spawnOptions,
      env: { ...process.env, ...spawnOptions.env }
    });

    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve(code ?? 0);
      } else {
        const err = new Error(`Copilot exited with code ${code}`);
        err.exitCode = code;
        reject(err);
      }
    });

    child.on('error', reject);
  });
}
