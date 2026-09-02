#!/usr/bin/env node
/**
 * Build-time sync: copy shared core templates into the DDEV add-on root files.
 *
 * Run via:
 *   npm run sync-core-to-ddev          # rewrite the generated files
 *   npm run sync-core-to-ddev -- --check   # fail if they are out of date
 *
 * NOTE: the MCP configs for the DDEV flavour are generated inline by
 * commands/host/set-up and are deliberately not shared from here. The add-on
 * ships only the files listed in install.yaml, so packages/ is not present in
 * consumer projects and cannot be read at run time.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const coreTemplates = resolve(root, 'packages', 'core', 'templates');

const checkOnly = process.argv.includes('--check');

function readTemplate(name) {
  return readFileSync(resolve(coreTemplates, name), 'utf8');
}

const outputs = [
  {
    dest: resolve(root, 'copilot-managed-config.json'),
    contents: readTemplate('copilot-managed-config.json')
  },
  {
    dest: resolve(root, '.devcontainer', 'devcontainer.build.json'),
    contents: readTemplate('devcontainer.build.json.php.hbs')
  },
  {
    dest: resolve(root, '.devcontainer', 'devcontainer.json'),
    contents: readTemplate('devcontainer.json.php.hbs')
  }
];

// The marker drives DDEV's add-on overwrite/removal logic, so the generated
// add-on files must keep it even though node projects strip it.
for (const { dest, contents } of outputs) {
  if (dest.endsWith('copilot-managed-config.json') && !contents.includes('#ddev-generated')) {
    console.error('❌ copilot-managed-config.json template lost its #ddev-generated marker.');
    process.exit(1);
  }
}

let drifted = 0;

for (const { dest, contents } of outputs) {
  const relPath = relative(root, dest);
  let current = null;
  try {
    current = readFileSync(dest, 'utf8');
  } catch {
    current = null;
  }

  if (current === contents) {
    console.log(`✅ ${relPath} up to date`);
    continue;
  }

  drifted += 1;

  if (checkOnly) {
    console.error(`❌ ${relPath} is out of sync with packages/core/templates`);
  } else {
    writeFileSync(dest, contents, 'utf8');
    console.log(`♻️  ${relPath} regenerated`);
  }
}

if (checkOnly && drifted > 0) {
  console.error('');
  console.error(
    `${drifted} generated file(s) out of sync. Run "npm run sync-core-to-ddev" and commit the result.`
  );
  process.exit(1);
}

if (!checkOnly) {
  console.log('\nDDEV add-on files regenerated from packages/core/templates.');
  console.log('Review the diff before committing.');
}
