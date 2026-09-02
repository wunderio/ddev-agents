import { execDevcontainer } from '../lib/container.js';

export async function npm({ projectRoot, args = [] }) {
  const exitCode = await execDevcontainer([
    'exec',
    '--workspace-folder', projectRoot,
    'npm',
    ...args
  ]);
  return exitCode;
}
