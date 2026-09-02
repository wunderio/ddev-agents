import { writeDevcontainerConfig, execDevcontainer, resolveNodeVersion } from '../lib/container.js';
import { getProjectName, getImageName } from '../lib/config.js';

export async function build({ projectRoot, args = [] }) {
  const explicitNodeVersion = parseExplicitArg(args, '--node-version');
  const force = args.includes('--force');
  const projectName = getProjectName(projectRoot);
  const nodeVersion = resolveNodeVersion({ projectRoot, explicitVersion: explicitNodeVersion });

  console.log(`🔍 Project: ${projectName}`);
  console.log(`📍 Node.js version: ${nodeVersion}`);

  const configPath = writeDevcontainerConfig({ projectRoot, projectName, nodeVersion, force });
  console.log(`📝 Wrote ${configPath}`);

  console.log('🔨 Building agents devcontainer image...');
  const exitCode = await execDevcontainer([
    'build',
    '--workspace-folder', projectRoot,
    '--config', configPath,
    '--image-name', getImageName(projectName)
  ]);

  if (exitCode !== 0) {
    throw new Error(`Devcontainer build failed with exit code ${exitCode}`);
  }

  console.log(`✅ Image built: ${getImageName(projectName)}`);
  console.log('   It is reused as a build cache by `agents set-up` / `agents start`.');
  return 0;
}

function parseExplicitArg(args, flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return null;
}
