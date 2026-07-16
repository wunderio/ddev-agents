import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeDevcontainerConfig } from './container.js';

describe('writeDevcontainerConfig', () => {
  it('writes a rendered devcontainer.json with the correct node version and project name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'agents-cli-test-'));
    try {
      const configPath = writeDevcontainerConfig({
        projectRoot: dir,
        projectName: 'my-node-app',
        nodeVersion: '20'
      });

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
});
