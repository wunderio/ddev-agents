import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '../..');

function readCoreTemplate(name) {
  const templateUrl = import.meta.resolve(`@wunderio/agents-core/templates/${name}`);
  return readFileSync(fileURLToPath(templateUrl), 'utf8');
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function getPackageVersion() {
  try {
    return JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')).version;
  } catch {
    return '0.0.0';
  }
}

/**
 * Builds the MCP configuration for a node project.
 *
 * Node projects register only the remote Wunder Quality System server. Unlike
 * the DDEV flavour — where wdrmcp is required to reach the separate `web`
 * container over SSH — the agent here shares a container with the source, so
 * build/test/lint tooling is delivered as a Copilot skill (see lib/skills.js)
 * instead of a local MCP server.
 */
function buildVars({ workspaceFolder }) {
  return {
    workspaceFolder,
    nodeAgentsVersion: getPackageVersion(),
    wqsApiKey: '${WQS_MCP_API_KEY}'
  };
}

export function generateCliMcpConfig({ workspaceFolder }) {
  return render(readCoreTemplate('mcp-config.json.node.hbs'), buildVars({ workspaceFolder }));
}

export function generateVscodeMcpConfig({ workspaceFolder }) {
  return render(readCoreTemplate('vscode-mcp.json.node.hbs'), buildVars({ workspaceFolder }));
}
