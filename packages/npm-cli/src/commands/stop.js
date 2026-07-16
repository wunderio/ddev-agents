import { execDevcontainer } from '../lib/container.js';
import { getProjectName } from '../lib/config.js';

export async function stop({ projectRoot, args = [] }) {
  const projectName = getProjectName(projectRoot);
  console.log(`🛑 Stopping agents container for ${projectName}...`);

  // devcontainer CLI does not have a direct "down" command for an existing
  // running container in all versions; fall back to docker stop by container
  // label. The container created by `devcontainer up` is labelled with the
  // devcontainer config path, so we stop the container named after the project.
  const { spawn } = await import('node:child_process');
  const containerName = `${projectName}-agents`;

  return new Promise((resolve, reject) => {
    const child = spawn('docker', ['stop', containerName], { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code === 0 || code === null) {
        console.log('✅ Agents container stopped.');
        resolve(0);
      } else {
        // If the container does not exist, treat as already stopped.
        console.log('ℹ️  Container already stopped or not found.');
        resolve(0);
      }
    });
    child.on('error', reject);
  });
}
