import { execDevcontainer } from '../lib/container.js';
import { getProjectName } from '../lib/config.js';

export async function start({ projectRoot, args = [] }) {
  const projectName = getProjectName(projectRoot);
  console.log(`🚀 Starting agents container for ${projectName}...`);

  const exitCode = await execDevcontainer([
    'up',
    '--workspace-folder', projectRoot
  ]);

  if (exitCode !== 0) {
    throw new Error(`Failed to start container (exit ${exitCode})`);
  }

  console.log('✅ Agents container started.');
  return 0;
}
