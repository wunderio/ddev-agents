import { devcontainerUp } from '../lib/container.js';
import { getProjectName, getImageName } from '../lib/config.js';

export async function start({ projectRoot, args = [] }) {
  const projectName = getProjectName(projectRoot);
  console.log(`🚀 Starting agents container for ${projectName}...`);

  const { code: exitCode } = await devcontainerUp(projectRoot, {
    cacheFrom: getImageName(projectName)
  });

  if (exitCode !== 0) {
    throw new Error(`Failed to start container (exit ${exitCode})`);
  }

  console.log('✅ Agents container started.');
  return 0;
}
