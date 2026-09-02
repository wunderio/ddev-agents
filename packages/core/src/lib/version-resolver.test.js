import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveNodeVersion } from './version-resolver.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function withProject(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'agents-test-'));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('resolveNodeVersion', () => {
  it('uses explicit version first', () => {
    withProject((dir) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ engines: { node: '18.x' } }));
      writeFileSync(join(dir, '.nvmrc'), '20');
      assert.equal(resolveNodeVersion({ projectRoot: dir, explicitVersion: '16' }), '16');
    });
  });

  it('falls back to .nvmrc', () => {
    withProject((dir) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ engines: { node: '18.x' } }));
      writeFileSync(join(dir, '.nvmrc'), 'v20.5.0');
      assert.equal(resolveNodeVersion({ projectRoot: dir }), '20.5.0');
    });
  });

  it('falls back to package.json engines.node', () => {
    withProject((dir) => {
      writeFileSync(join(dir, 'package.json'), JSON.stringify({ engines: { node: '>=20.0.0' } }));
      assert.equal(resolveNodeVersion({ projectRoot: dir }), '20');
    });
  });

  it('uses default when nothing is present', () => {
    withProject((dir) => {
      assert.equal(resolveNodeVersion({ projectRoot: dir }), '22');
    });
  });
});
