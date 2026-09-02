/**
 * Resolve the Node.js version for the agents devcontainer.
 *
 * Priority:
 *   1. explicit override (e.g. CLI --node-version)
 *   2. .nvmrc in project root
 *   3. package.json engines.node
 *   4. fallback default LTS
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_NODE_VERSION = '22';

function parseEnginesNode(range) {
  if (!range) return null;
  // Handle common forms: "22", "22.x", ">=20", "^20.0.0", "20 || 22"
  const match = String(range).match(/(\d+)/);
  return match ? match[1] : null;
}

export function resolveNodeVersion({ projectRoot, explicitVersion = null } = {}) {
  if (explicitVersion) {
    return String(explicitVersion).trim();
  }

  const nvmrcPath = join(projectRoot, '.nvmrc');
  if (existsSync(nvmrcPath)) {
    const version = readFileSync(nvmrcPath, 'utf8').trim();
    if (version) {
      // Strip leading 'v' if present
      return version.replace(/^v/, '');
    }
  }

  const packageJsonPath = join(projectRoot, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      const parsed = parseEnginesNode(pkg.engines?.node);
      if (parsed) {
        return parsed;
      }
    } catch {
      // Ignore malformed package.json
    }
  }

  return DEFAULT_NODE_VERSION;
}
