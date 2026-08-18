import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

function readCoreTemplate(name) {
  const templateUrl = import.meta.resolve(`@wunderio/agents-core/templates/${name}`);
  return readFileSync(fileURLToPath(templateUrl), 'utf8');
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

function npmView(packageName, fallback) {
  return new Promise((resolve) => {
    const child = spawn('npm', ['view', packageName, 'version'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });
    let output = '';
    child.stdout.on('data', (data) => {
      output += data.toString();
    });
    child.on('close', (code) => {
      const version = code === 0 ? output.trim() : fallback;
      resolve(version || fallback);
    });
    child.on('error', () => resolve(fallback));
  });
}

export async function getPackageVersions() {
  const [wdrmcpVersion, supergatewayVersion] = await Promise.all([
    npmView('@wunderio/wdrmcp', '0.1.17'),
    npmView('supergateway', '3.4.3')
  ]);
  return { wdrmcpVersion, supergatewayVersion };
}

export function generateCliMcpConfig({ projectName, toolsConfigPath, wdrmcpVersion, supergatewayVersion }) {
  const template = readCoreTemplate('mcp-config.json.hbs');
  return render(template, {
    projectName,
    toolsConfigPath,
    wdrmcpVersion,
    supergatewayVersion,
    wqsApiKey: '${WQS_MCP_API_KEY}'
  });
}

export function generateVscodeMcpConfig({ projectName, toolsConfigPath, wdrmcpVersion, supergatewayVersion }) {
  const template = readCoreTemplate('vscode-mcp.json.hbs');
  return render(template, {
    projectName,
    toolsConfigPath,
    wdrmcpVersion,
    supergatewayVersion,
    wqsApiKey: '${WQS_MCP_API_KEY}'
  });
}
