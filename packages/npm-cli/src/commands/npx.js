import { execDevcontainer } from '../lib/container.js';

export async function npx({ projectRoot, args = [] }) {
  const exitCode = await execDevcontainer([
    'exec',
    '--workspace-folder', projectRoot,
    'npx',
    ...args
  ]);
  return exitCode;
}
