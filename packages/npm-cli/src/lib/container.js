/**
 * Helpers for invoking the devcontainer CLI.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNodeVersion } from '@wunderio/agents-core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(__dirname, '../..');

export function ensureDevcontainerCli() {
  return new Promise((resolve, reject) => {
    const check = spawn('devcontainer', ['--version'], { stdio: 'ignore' });
    check.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.log('⚠️  devcontainer CLI not found. Installing globally...');
        const install = spawn('npm', ['install', '-g', '@devcontainers/cli'], {
          stdio: 'inherit'
        });
        install.on('close', (installCode) => {
          if (installCode === 0) {
            resolve();
          } else {
            reject(new Error(`Failed to install devcontainer CLI (exit ${installCode})`));
          }
        });
        install.on('error', reject);
      }
    });
    check.on('error', () => {
      console.log('⚠️  devcontainer CLI not found. Installing globally...');
      const install = spawn('npm', ['install', '-g', '@devcontainers/cli'], {
        stdio: 'inherit'
      });
      install.on('close', (installCode) => {
        if (installCode === 0) {
          resolve();
        } else {
          reject(new Error(`Failed to install devcontainer CLI (exit ${installCode})`));
        }
      });
      install.on('error', reject);
    });
  });
}

export async function execDevcontainer(args, options = {}) {
  await ensureDevcontainerCli();
  const { spawn } = await import('node:child_process');

  return new Promise((resolve, reject) => {
    const child = spawn('devcontainer', args, {
      stdio: 'inherit',
      ...options,
      env: { ...process.env, ...options.env }
    });

    child.on('close', (code) => {
      resolve(code ?? 0);
    });

    child.on('error', reject);
  });
}

/**
 * Runs `devcontainer up` and returns the parsed result, including the
 * container-side workspace folder (e.g. /workspaces/<project>). The devcontainer
 * CLI decides this path (it is NOT necessarily /workspace), so callers must use
 * the reported value instead of hardcoding a mount path.
 */
export async function devcontainerUp(projectRoot) {
  await ensureDevcontainerCli();
  const { spawn } = await import('node:child_process');

  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'devcontainer',
      ['up', '--workspace-folder', projectRoot],
      { stdio: ['inherit', 'pipe', 'inherit'], env: { ...process.env } }
    );

    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      process.stdout.write(chunk);
    });

    child.on('close', (code) => {
      let remoteWorkspaceFolder;
      const line = stdout
        .split('\n')
        .reverse()
        .find((l) => l.includes('"remoteWorkspaceFolder"'));
      if (line) {
        try {
          remoteWorkspaceFolder = JSON.parse(line).remoteWorkspaceFolder;
        } catch {
          // ignore parse errors; caller falls back to a default
        }
      }
      resolvePromise({ code: code ?? 0, remoteWorkspaceFolder });
    });

    child.on('error', reject);
  });
}

function readTemplate(name) {
  const templateUrl = import.meta.resolve(`@wunderio/agents-core/templates/${name}`);
  return readFileSync(fileURLToPath(templateUrl), 'utf8');
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

export function writeDevcontainerConfig({ projectRoot, projectName, nodeVersion }) {
  const template = readTemplate('devcontainer.json.node.hbs');
  const rendered = renderTemplate(template, {
    projectName,
    nodeVersion
  });

  const devcontainerDir = resolve(projectRoot, '.devcontainer');
  mkdirSync(devcontainerDir, { recursive: true });

  const configPath = resolve(devcontainerDir, 'devcontainer.json');
  writeFileSync(configPath, rendered, 'utf8');
  return configPath;
}

export { resolveNodeVersion };
