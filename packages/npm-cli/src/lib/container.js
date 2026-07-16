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
