/**
 * Helpers for invoking the devcontainer CLI.
 */

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveNodeVersion } from '@wunderio/agents-core';

/**
 * Label the devcontainer CLI attaches to every container it creates. It does
 * NOT name containers predictably (Docker assigns a random name), so this label
 * is the only reliable way to find the container for a workspace.
 */
const LOCAL_FOLDER_LABEL = 'devcontainer.local_folder';

function installDevcontainerCli() {
  return new Promise((resolvePromise, reject) => {
    console.log('⚠️  devcontainer CLI not found. Installing globally...');
    const install = spawn('npm', ['install', '-g', '@devcontainers/cli'], { stdio: 'inherit' });
    install.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`Failed to install devcontainer CLI (exit ${code})`));
      }
    });
    install.on('error', reject);
  });
}

export function ensureDevcontainerCli() {
  return new Promise((resolvePromise, reject) => {
    const check = spawn('devcontainer', ['--version'], { stdio: 'ignore' });
    check.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        installDevcontainerCli().then(resolvePromise, reject);
      }
    });
    check.on('error', () => {
      installDevcontainerCli().then(resolvePromise, reject);
    });
  });
}

export async function execDevcontainer(args, options = {}) {
  await ensureDevcontainerCli();

  return new Promise((resolvePromise, reject) => {
    const child = spawn('devcontainer', args, {
      stdio: 'inherit',
      ...options,
      env: { ...process.env, ...options.env }
    });

    child.on('close', (code) => {
      resolvePromise(code ?? 0);
    });

    child.on('error', reject);
  });
}

/**
 * Returns the IDs of running containers created by the devcontainer CLI for the
 * given workspace folder.
 */
export function findContainerIds(projectRoot) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'docker',
      ['ps', '--quiet', '--filter', `label=${LOCAL_FOLDER_LABEL}=${resolve(projectRoot)}`],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (error.code === 'ENOENT') {
        reject(new Error('Docker was not found on PATH. Is Docker installed and running?'));
        return;
      }
      reject(error);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        // A docker failure is a real error and must not be reported as
        // "nothing to stop".
        reject(new Error(`docker ps failed with exit code ${code}: ${stderr.trim()}`));
        return;
      }
      resolvePromise(
        stdout
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
      );
    });
  });
}

/**
 * Runs `devcontainer up` and returns the parsed result, including the
 * container-side workspace folder. The generated config pins this to
 * /workspace, but the CLI remains the source of truth.
 */
export async function devcontainerUp(projectRoot, { cacheFrom } = {}) {
  await ensureDevcontainerCli();

  const args = ['up', '--workspace-folder', projectRoot];
  if (cacheFrom) {
    args.push('--cache-from', cacheFrom);
  }

  return new Promise((resolvePromise, reject) => {
    const child = spawn('devcontainer', args, {
      stdio: ['inherit', 'pipe', 'inherit'],
      env: { ...process.env }
    });

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

/**
 * Writes the generated devcontainer config. Refuses to clobber a config that
 * this tool did not generate unless `force` is set — a node project may well
 * have its own devcontainer already.
 */
export function writeDevcontainerConfig({ projectRoot, projectName, nodeVersion, force = false }) {
  const template = readTemplate('devcontainer.json.node.hbs');
  const rendered = renderTemplate(template, { projectName, nodeVersion });

  const devcontainerDir = resolve(projectRoot, '.devcontainer');
  mkdirSync(devcontainerDir, { recursive: true });

  const configPath = resolve(devcontainerDir, 'devcontainer.json');

  if (existsSync(configPath) && !force) {
    const existing = readFileSync(configPath, 'utf8');
    if (!existing.includes('"Agents: ')) {
      throw new Error(
        `Refusing to overwrite existing ${configPath}.\n` +
          'It was not generated by @wunderio/node-agents. Move it aside, or re-run with --force to replace it.'
      );
    }
  }

  writeFileSync(configPath, rendered, 'utf8');
  return configPath;
}

export { resolveNodeVersion };
