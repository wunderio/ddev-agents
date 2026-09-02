import { cwd } from 'node:process';
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';


export function resolveProjectRoot() {
  return cwd();
}

export function getProjectName(projectRoot) {
  const packageJsonPath = resolve(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      if (pkg.name) {
        const name = String(pkg.name)
          .replace(/^@[^/]+\//, '')
          .replace(/[^a-zA-Z0-9_-]/g, '-');
        const suffix = createHash('sha256')
          .update(resolve(projectRoot))
          .digest('hex')
          .slice(0, 8);
        return `${name}-${suffix}`;
      }
    } catch {
      // fall through
    }
  }
  return 'node-agents';
}

export function getDevcontainerConfigPath(projectRoot) {
  return resolve(projectRoot, '.devcontainer', 'devcontainer.json');
}

export function getImageName(projectName) {
  return `${projectName}-agents:latest`;
}
