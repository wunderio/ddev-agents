import { writeDevcontainerConfig, devcontainerUp, resolveNodeVersion } from '../lib/container.js';
import { getProjectName, getToolsConfigPath } from '../lib/config.js';
import { getPackageVersions, generateCliMcpConfig, generateVscodeMcpConfig } from '../lib/mcp.js';
import { resolve } from 'node:path';
import {
  existsSync,
  mkdirSync,
  copyFileSync,
  cpSync,
  writeFileSync,
  readFileSync,
  appendFileSync
} from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageRoot = resolve(__dirname, '../..');

export async function setUp({ projectRoot, args = [] }) {
  const explicitNodeVersion = parseExplicitArg(args, '--node-version');
  const projectName = getProjectName(projectRoot);
  const nodeVersion = resolveNodeVersion({ projectRoot, explicitVersion: explicitNodeVersion });

  console.log(`🔍 Project: ${projectName}`);
  console.log(`📍 Node.js version: ${nodeVersion}`);

  // Write devcontainer.json
  const configPath = writeDevcontainerConfig({ projectRoot, projectName, nodeVersion });
  console.log(`📝 Wrote ${configPath}`);

  // Copy managed config into project so devcontainer can bind-mount it
  const managedConfigSource = resolveCoreTemplatePath('copilot-managed-config.json');
  const managedConfigDest = resolve(projectRoot, '.devcontainer', 'copilot-managed-config.json');
  copyFileSync(managedConfigSource, managedConfigDest);
  console.log(`📝 Copied managed config to ${managedConfigDest}`);

  // Copy node tool configs into project
  const toolsConfigDest = getToolsConfigPath(projectRoot);
  if (!existsSync(toolsConfigDest)) {
    const toolsConfigSource = resolve(packageRoot, '.agents', 'tools-config');
    mkdirSync(toolsConfigDest, { recursive: true });
    cpSync(toolsConfigSource, toolsConfigDest, { recursive: true });
    console.log(`📝 Copied default tool configs to ${toolsConfigDest}`);
  } else {
    console.log(`ℹ️  Tool configs already exist at ${toolsConfigDest}`);
  }

  // Ensure .copilot persistence directory exists on host
  const copilotDir = resolve(projectRoot, '.copilot');
  mkdirSync(copilotDir, { recursive: true });
  ensureGitignored(projectRoot, '.copilot');

  // Bring up the devcontainer
  console.log('🚀 Starting agents devcontainer...');
  const { code: upCode, remoteWorkspaceFolder } = await devcontainerUp(projectRoot);
  if (upCode !== 0) {
    throw new Error(`devcontainer up failed with exit code ${upCode}`);
  }
  // The devcontainer CLI chooses the container-side workspace folder (typically
  // /workspaces/<project>, NOT /workspace). Everything we write inside the
  // container must be anchored to this path, not a hardcoded one.
  const workspaceFolder = remoteWorkspaceFolder || '/workspace';
  const copilotDataDir = `${workspaceFolder}/.copilot`;

  // Generate MCP configs
  const { wdrmcpVersion, supergatewayVersion } = await getPackageVersions();
  const toolsConfigPath = `${workspaceFolder}/.agents/tools-config`;

  const cliMcpConfig = generateCliMcpConfig({
    projectName,
    toolsConfigPath,
    wdrmcpVersion,
    supergatewayVersion
  });

  const vscodeMcpConfig = generateVscodeMcpConfig({
    projectName,
    toolsConfigPath,
    wdrmcpVersion,
    supergatewayVersion
  });

  // Persist Copilot session data by symlinking ~/.copilot to the
  // ${copilotDataDir} bind-mount (survives restarts). Do this BEFORE writing
  // any config so the MCP config lands in the persisted location. Any
  // pre-existing real ~/.copilot is migrated best-effort — a migration problem
  // must never abort setup, otherwise the symlink and configs below never get
  // written and Copilot ends up without working MCP settings.
  await execInContainer(projectRoot, [
    'bash', '-c',
    `
      mkdir -p ${copilotDataDir}
      if [ -e ~/.copilot ] && [ ! -L ~/.copilot ]; then
        if cp -rn ~/.copilot/. ${copilotDataDir}/ 2>/tmp/copilot-migrate.err; then
          rm -rf ~/.copilot
        else
          echo "⚠️ Could not fully migrate existing ~/.copilot to ${copilotDataDir}:" >&2
          sed 's/^/   /' /tmp/copilot-migrate.err >&2
          echo "   Continuing anyway; new session data will be stored in ${copilotDataDir}." >&2
          rm -rf ~/.copilot
        fi
      fi
      ln -sfn ${copilotDataDir} ~/.copilot
    `
  ]);
  console.log(`✅ Symlinked ~/.copilot to ${copilotDataDir}`);

  // Write CLI MCP config (through the symlink, into ${copilotDataDir})
  await execInContainer(projectRoot, [
    'bash', '-c',
    `mkdir -p ~/.copilot && cat > ~/.copilot/mcp-config.json`,
  ], { input: cliMcpConfig });
  console.log('✅ Wrote Copilot CLI MCP config');

  // Write VS Code User mcp.json inside container
  await execInContainer(projectRoot, [
    'bash', '-c',
    `mkdir -p ~/.vscode-server/data/User && cat > ~/.vscode-server/data/User/mcp.json`
  ], { input: vscodeMcpConfig });
  console.log('✅ Wrote VS Code MCP config');

  console.log('');
  console.log('✅ Setup complete. Run `agents copilot` or attach VS Code to the devcontainer.');
  return 0;
}

function parseExplicitArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return null;
}

function resolveCoreTemplatePath(name) {
  return fileURLToPath(import.meta.resolve(`@wunderio/agents-core/templates/${name}`));
}

function ensureGitignored(projectRoot, entry) {
  const gitignorePath = resolve(projectRoot, '.gitignore');
  const line = entry.startsWith('.') ? entry : `.${entry}`;
  if (existsSync(gitignorePath)) {
    const contents = readFileSync(gitignorePath, 'utf8');
    if (!contents.split('\n').includes(line)) {
      appendFileSync(gitignorePath, `\n${line}\n`);
      console.log(`✅ Added ${line} to .gitignore`);
    }
  } else {
    writeFileSync(gitignorePath, `${line}\n`);
    console.log(`✅ Created .gitignore with ${line}`);
  }
}

async function execInContainer(projectRoot, command, { input } = {}) {
  const { spawn } = await import('node:child_process');
  const args = ['exec', '--workspace-folder', projectRoot, ...command];

  return new Promise((resolve, reject) => {
    const child = spawn('devcontainer', args, {
      stdio: ['pipe', 'inherit', 'inherit']
    });

    if (input) {
      child.stdin.write(input);
      child.stdin.end();
    }

    child.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve(code ?? 0);
      } else {
        reject(new Error(`Container command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}
