import { spawn } from 'node:child_process';
import { getProjectName } from '../lib/config.js';
import { findContainerIds } from '../lib/container.js';

export async function stop({ projectRoot, args: _args = [] }) {
  const projectName = getProjectName(projectRoot);
  console.log(`🛑 Stopping agents container for ${projectName}...`);

  const containerIds = await findContainerIds(projectRoot);

  if (containerIds.length === 0) {
    console.log('ℹ️  No running agents container found for this project.');
    return 0;
  }

  const exitCode = await new Promise((resolvePromise, reject) => {
    const child = spawn('docker', ['stop', ...containerIds], { stdio: 'inherit' });
    child.on('close', (code) => resolvePromise(code ?? 0));
    child.on('error', reject);
  });

  if (exitCode !== 0) {
    throw new Error(`docker stop failed with exit code ${exitCode}`);
  }

  console.log(`✅ Agents container stopped (${containerIds.length} container(s)).`);
  return 0;
}
