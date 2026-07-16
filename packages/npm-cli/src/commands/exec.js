import { execDevcontainer } from '../lib/container.js';

export async function exec({ projectRoot, args = [] }) {
  if (args.length === 0) {
    console.error('Usage: agents exec <command> [args...]');
    return 1;
  }

  const exitCode = await execDevcontainer([
    'exec',
    '--workspace-folder', projectRoot,
    ...args
  ]);
  return exitCode;
}
