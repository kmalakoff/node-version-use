#!/usr/bin/env node

/**
 * Publishes the per-platform binary packages built into .tmp/npm.
 *
 * Usage: npm run publish:platform-packages            # preview, publishes nothing
 *        npm run publish:platform-packages -- --execute
 *
 * Publishing cannot be undone, so the bare command reports what it would push and writes
 * nothing. Publish these before the parent: a parent on the registry whose optionalDependencies
 * do not resolve yet installs with no binary.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { parseArgs } from 'util';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, '.tmp', 'npm');

const { values } = parseArgs({ options: { execute: { type: 'boolean', default: false } } });

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const platforms = JSON.parse(fs.readFileSync(path.join(__dirname, 'platforms.json'), 'utf8'));

function isPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version'], { encoding: 'utf8' });
  return result.status === 0 && result.stdout.trim() !== '';
}

// A just-published version can take a few seconds to read back.
function resolvesOnRegistry(name, version) {
  for (let attempt = 0; attempt < 6; attempt++) {
    if (isPublished(name, version)) return true;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
  }
  return false;
}

const targets = platforms.map(({ platform, arch }) => {
  const name = `nvu-${platform}-${arch}`;
  const dir = path.join(outDir, name);
  return { name, dir, missing: !fs.existsSync(path.join(dir, 'package.json')) };
});

const missing = targets.filter((target) => target.missing);
if (missing.length) {
  console.error(`Missing ${missing.length} of ${targets.length} package directories under ${path.relative(root, outDir)}:`);
  for (const target of missing) console.error(`  ${target.name}`);
  console.error('Build them with: npm run build:platform-packages');
  process.exit(1);
}

for (const target of targets) target.published = isPublished(target.name, pkg.version);

const pending = targets.filter((target) => !target.published);
for (const target of targets) console.log(`${target.published ? 'skip   ' : 'publish'} ${target.name}@${pkg.version}`);

if (!pending.length) {
  console.log(`\nAll ${targets.length} packages are already published at ${pkg.version}.`);
  process.exit(0);
}

if (!values.execute) {
  console.log(`\n${pending.length} of ${targets.length} would be published. Re-run with --execute to publish.`);
  process.exit(0);
}

for (const target of pending) {
  console.log(`\npublishing ${target.name}@${pkg.version}`);
  const result = spawnSync('npm', ['publish', target.dir, '--access', 'public'], { stdio: 'inherit' });
  if (result.status !== 0) {
    console.error(`\nFailed to publish ${target.name}@${pkg.version}. Packages published before it stay published; re-run to continue from here.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`\nPublished ${pending.length} packages at ${pkg.version}. Confirming all ${targets.length} resolve...`);

// The parent pins these exactly. If one is missing - a failed publish, a rescinded version - a
// parent published against it installs with no binary on that platform.
const unresolved = targets.filter((target) => !resolvesOnRegistry(target.name, pkg.version));
if (unresolved.length) {
  console.error(`\n${unresolved.length} of ${targets.length} do not resolve at ${pkg.version}:`);
  for (const target of unresolved) console.error(`  ${target.name}`);
  console.error('Do NOT publish the parent. Its optionalDependencies would pin a version that does not resolve,');
  console.error('and every consumer on that platform would install with no binary.');
  process.exit(1);
}

console.log(`All ${targets.length} resolve at ${pkg.version}. Publish the parent next: npm publish`);
