/**
 * Generates the Copilot skill and instructions that replace the local MCP tool
 * server for node projects.
 *
 * The agents container runs the Copilot agent alongside the project source, so
 * `npm run build` needs no MCP round-trip — only the knowledge of *which*
 * package manager and scripts the project uses. That knowledge is shipped as:
 *
 *   - a static skill (`node-project`) with the general node/npm playbook, and
 *   - a generated instructions file with the facts detected for this project.
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, posix } from 'node:path';

export const SKILL_NAME = 'node-project';

/** Lockfile → package manager, in precedence order. */
const LOCKFILES = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm']
];

function readCoreTemplate(...segments) {
  const templateUrl = import.meta.resolve(
    `@wunderio/agents-core/templates/${segments.join('/')}`
  );
  return readFileSync(fileURLToPath(templateUrl), 'utf8');
}

function render(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}

/**
 * Resolves the package manager from the project's lockfile.
 *
 * @returns {{packageManager: string, source: string}}
 */
export function detectPackageManager(projectRoot) {
  for (const [lockfile, packageManager] of LOCKFILES) {
    if (existsSync(resolve(projectRoot, lockfile))) {
      return { packageManager, source: lockfile };
    }
  }
  return { packageManager: 'npm', source: 'no lockfile — defaulting to npm' };
}

function readPackageJson(projectRoot) {
  const packageJsonPath = resolve(projectRoot, 'package.json');
  if (!existsSync(packageJsonPath)) return {};
  try {
    return JSON.parse(readFileSync(packageJsonPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Renders the project's package.json scripts as a markdown list.
 *
 * Script names and bodies come from a file the agent is about to act on, and
 * the result is written into the agent's instructions — so anything that could
 * close the inline code span (a backtick, a newline) and let the script text be
 * read as an instruction is neutralised, and the body is length-capped.
 */
export function formatScripts(scripts) {
  const entries = Object.entries(scripts ?? {});
  if (entries.length === 0) {
    return '_No scripts are declared in `package.json`._';
  }
  return entries
    .map(([name, command]) => `- \`${sanitise(name, 80)}\` — \`${sanitise(command, 200)}\``)
    .join('\n');
}

function sanitise(value, maxLength) {
  const flattened = String(value).replace(/`/g, "'").replace(/\s+/g, ' ').trim();
  return flattened.length > maxLength ? `${flattened.slice(0, maxLength)}…` : flattened;
}

export function getSkillContent() {
  return readCoreTemplate('skills', SKILL_NAME, 'SKILL.md');
}

export function generateInstructions({
  projectRoot,
  projectName,
  nodeVersion,
  workspaceFolder = '/workspace'
}) {
  const { packageManager, source } = detectPackageManager(projectRoot);
  const pkg = readPackageJson(projectRoot);

  return render(readCoreTemplate('copilot-instructions.md.node.hbs'), {
    projectName,
    nodeVersion,
    workspaceFolder,
    packageManager,
    packageManagerSource: source,
    scripts: formatScripts(pkg.scripts)
  });
}

/**
 * Path of the skill file relative to the Copilot home directory. Copilot only
 * discovers a skill inside a directory named after it, never as a loose file.
 *
 * This is a path *inside* the Linux container and is interpolated into a shell
 * command there, so it must stay POSIX even when the CLI runs on a Windows host.
 */
export function getSkillRelativePath() {
  return posix.join('skills', SKILL_NAME, 'SKILL.md');
}
