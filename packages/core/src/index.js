/**
 * Shared core for Wunder.io agentic AI environments.
 *
 * Used by:
 *   - @wunderio/node-agents (npm CLI for non-DDEV node projects)
 *   - the DDEV add-on in this repo (via build-time sync)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

function loadTemplate(name) {
  return readFileSync(join(rootDir, 'templates', name), 'utf8');
}

export const managedConfig = JSON.parse(loadTemplate('copilot-managed-config.json'));
export const devcontainerFeatures = JSON.parse(loadTemplate('devcontainer-features.json'));
export const mcpConfigTemplate = loadTemplate('mcp-config.json.hbs');
export const vscodeMcpTemplate = loadTemplate('vscode-mcp.json.hbs');

export { resolveNodeVersion } from './lib/version-resolver.js';
export { invokeCopilot } from './lib/copilot-invoker.js';
