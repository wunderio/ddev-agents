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

// Loaded on demand: eagerly reading every template at import time makes any
// template rename break consumers that never touch that template.
export function loadTemplate(name) {
  return readFileSync(join(rootDir, 'templates', name), 'utf8');
}

export function getManagedConfig() {
  return JSON.parse(loadTemplate('copilot-managed-config.json'));
}

export function getDevcontainerFeatures() {
  return JSON.parse(loadTemplate('devcontainer-features.json'));
}

export function getNodeMcpConfigTemplate() {
  return loadTemplate('mcp-config.json.node.hbs');
}

export function getNodeVscodeMcpTemplate() {
  return loadTemplate('vscode-mcp.json.node.hbs');
}

export function getNodeInstructionsTemplate() {
  return loadTemplate('copilot-instructions.md.node.hbs');
}

/**
 * The node flavour ships its tooling knowledge as a Copilot skill rather than
 * an MCP server: the agent runs in the same container as the code, so a server
 * would only wrap commands its own shell can already execute.
 */
export function getNodeSkill() {
  return loadTemplate(join('skills', 'node-project', 'SKILL.md'));
}

export { resolveNodeVersion } from './lib/version-resolver.js';
export { invokeCopilot } from './lib/copilot-invoker.js';
