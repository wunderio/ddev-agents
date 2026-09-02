import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeDevcontainerConfig } from './container.js';

function render(dir, overrides = {}) {
  return writeDevcontainerConfig({
    projectRoot: dir,
    projectName: 'my-node-app',
    nodeVersion: '20',
    ...overrides
  });
}

describe('writeDevcontainerConfig', () => {
  it('writes a rendered devcontainer.json with the correct node version and project name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      const configPath = render(dir);

      assert.equal(configPath, join(dir, '.devcontainer', 'devcontainer.json'));
      assert.equal(existsSync(configPath), true);

      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      assert.equal(config.name, 'Agents: my-node-app');
      assert.equal(config.features['ghcr.io/devcontainers/features/node:1'].version, '20');
      assert.equal(config.remoteEnv.SSH_AUTH_SOCK, '');
      assert.ok(Array.isArray(config.mounts));
      assert.ok(config.mounts.some((m) => m.includes('copilot-managed-config.json')));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('applies the security hardening promised in the README', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      const config = JSON.parse(readFileSync(render(dir), 'utf8'));

      assert.ok(Array.isArray(config.runArgs), 'runArgs must be present');
      assert.ok(config.runArgs.includes('--cap-drop=ALL'), 'all capabilities must be dropped');

      const securityOptIndex = config.runArgs.indexOf('--security-opt');
      assert.notEqual(securityOptIndex, -1, '--security-opt must be present');
      assert.equal(config.runArgs[securityOptIndex + 1], 'no-new-privileges:true');

      // Dropping CAP_CHOWN makes the CLI's root-side UID remap fail, so it must
      // be disabled explicitly or the container will not start.
      assert.equal(config.updateRemoteUserUID, false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('pins a deterministic container-side workspace folder', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      const config = JSON.parse(readFileSync(render(dir), 'utf8'));
      assert.equal(config.workspaceFolder, '/workspace');
      assert.match(config.workspaceMount, /target=\/workspace\b/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('does not bake the GitHub token into the container image config', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      const config = JSON.parse(readFileSync(render(dir), 'utf8'));
      assert.equal(config.containerEnv, undefined);
      assert.match(config.remoteEnv.GH_TOKEN, /localEnv:DDEV_AGENTS_GH_TOKEN/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses to overwrite a devcontainer config it did not generate', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      mkdirSync(join(dir, '.devcontainer'), { recursive: true });
      const configPath = join(dir, '.devcontainer', 'devcontainer.json');
      writeFileSync(configPath, JSON.stringify({ name: 'My existing project' }));

      assert.throws(() => render(dir), /Refusing to overwrite/);
      assert.equal(JSON.parse(readFileSync(configPath, 'utf8')).name, 'My existing project');

      render(dir, { force: true });
      assert.equal(JSON.parse(readFileSync(configPath, 'utf8')).name, 'Agents: my-node-app');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('regenerates its own config without --force', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      render(dir);
      const configPath = render(dir, { nodeVersion: '22' });
      const config = JSON.parse(readFileSync(configPath, 'utf8'));
      assert.equal(config.features['ghcr.io/devcontainers/features/node:1'].version, '22');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
