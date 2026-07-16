#!/usr/bin/env node
/**
 * Build-time sync: copy shared core templates into the DDEV add-on root files.
 *
 * Run via: npm run sync-core-to-ddev
 */

import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const coreTemplates = resolve(root, 'packages', 'core', 'templates');

function readTemplate(name) {
  return readFileSync(resolve(coreTemplates, name), 'utf8');
}

function writeJson(path, content) {
  writeFileSync(path, JSON.stringify(content, null, 2) + '\n', 'utf8');
}

function syncManagedConfig() {
  const source = resolve(coreTemplates, 'copilot-managed-config.json');
  const dest = resolve(root, 'copilot-managed-config.json');
  copyFileSync(source, dest);
  console.log('✅ Synced copilot-managed-config.json');
}

function syncDevcontainerBuild() {
  const template = readTemplate('devcontainer.build.json.php.hbs');
  writeFileSync(resolve(root, '.devcontainer', 'devcontainer.build.json'), template, 'utf8');
  console.log('✅ Synced .devcontainer/devcontainer.build.json');
}

function syncDevcontainerAttach() {
  const template = readTemplate('devcontainer.json.php.hbs');
  writeFileSync(resolve(root, '.devcontainer', 'devcontainer.json'), template, 'utf8');
  console.log('✅ Synced .devcontainer/devcontainer.json');
}

syncManagedConfig();
syncDevcontainerBuild();
syncDevcontainerAttach();

console.log('\nDDEV add-on files regenerated from packages/core/templates.');
console.log('Review the diff before committing.');
