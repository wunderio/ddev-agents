import { writeDevcontainerConfig, execDevcontainer, resolveNodeVersion } from '../lib/container.js';
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
  const upCode = await execDevcontainer([
    'up',
    '--workspace-folder', projectRoot
  ]);
  if (upCode !== 0) {
    throw new Error(`devcontainer up failed with exit code ${upCode}`);
  }

  // Generate MCP configs
  const { wdrmcpVersion, supergatewayVersion } = await getPackageVersions();
  const toolsConfigPath = '/workspace/.agents/tools-config';

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

  // Write CLI MCP config inside container
  await execInContainer(projectRoot, [
    'bash', '-c',
    `mkdir -p ~/.copilot && cat > ~/.copilot/mcp-config.json`,
  ], { input: cliMcpConfig });
  console.log('✅ Wrote Copilot CLI MCP config');

  // Symlink ~/.copilot to /workspace/.copilot
  await execInContainer(projectRoot, [
    'bash', '-c',
    `
      if [ -e ~/.copilot ] && [ ! -L ~/.copilot ]; then
        cp -rT ~/.copilot /workspace/.copilot 2>/dev/null && rm -rf ~/.copilot || {
          echo "⚠️ Could not migrate ~/.copilot" >&2;
          exit 1;
        }
      fi
      ln -sfn /workspace/.copilot ~/.copilot
    `
  ]);
  console.log('✅ Symlinked ~/.copilot to /workspace/.copilot');

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
