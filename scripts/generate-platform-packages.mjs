#!/usr/bin/env node

/**
 * Builds the per-platform binary packages published alongside node-version-use.
 *
 * Usage: npm run build:platform-packages
 *
 * Writes .tmp/npm/nvu-<platform>-<arch>/ for every entry in platforms.json. Binaries come from
 * binary/build, produced by `make -C binary all`; the parent's optionalDependencies are pinned
 * by the version lifecycle, and this refuses to build packages the parent does not declare.
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const buildDir = path.join(root, 'binary', 'build');
const outDir = path.join(root, '.tmp', 'npm');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const platforms = JSON.parse(fs.readFileSync(path.join(__dirname, 'platforms.json'), 'utf8'));

const packageName = (platform, arch) => `nvu-${platform}-${arch}`;

function sourceBinary(platform, arch) {
  return path.join(buildDir, `nvu-binary-${platform}-${arch}${platform === 'win32' ? '.exe' : ''}`);
}

function readme(name, platform, arch) {
  return [
    `# ${name}`,
    '',
    `The ${platform}-${arch} build of the [node-version-use](https://www.npmjs.com/package/node-version-use) binary.`,
    '',
    'This package is installed automatically as an optional dependency of `node-version-use` and',
    'is not meant to be depended on directly. It contains no code, only the binary.',
    '',
  ].join('\n');
}

const declared = pkg.optionalDependencies || {};
const unpinned = platforms.map((entry) => packageName(entry.platform, entry.arch)).filter((name) => declared[name] !== pkg.version);
if (unpinned.length || Object.keys(declared).length !== platforms.length) {
  console.error(`optionalDependencies do not pin every platform at ${pkg.version}.`);
  console.error('Fix them with: node scripts/pin-platform-packages.mjs');
  process.exit(1);
}

const missing = platforms.map((entry) => sourceBinary(entry.platform, entry.arch)).filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error(`Missing ${missing.length} of ${platforms.length} binaries:`);
  for (const file of missing) console.error(`  ${path.relative(root, file)}`);
  console.error('Build them with: make -C binary all');
  process.exit(1);
}

fs.rmSync(outDir, { recursive: true, force: true });

for (const { platform, arch } of platforms) {
  const name = packageName(platform, arch);
  const ext = platform === 'win32' ? '.exe' : '';
  const dir = path.join(outDir, name);

  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });
  fs.copyFileSync(sourceBinary(platform, arch), path.join(dir, 'bin', `nvu${ext}`));
  if (!ext) fs.chmodSync(path.join(dir, 'bin', 'nvu'), 0o755);

  // No bin field: npm would install a `nvu` shim that collides with the parent's own.
  const manifest = {
    name,
    version: pkg.version,
    description: `The ${platform}-${arch} binary for node-version-use`,
    repository: pkg.repository,
    license: pkg.license,
    os: [platform],
    cpu: [arch],
    files: ['bin'],
    engines: pkg.engines,
    preferUnplugged: true,
  };
  fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(dir, 'README.md'), readme(name, platform, arch));
  fs.writeFileSync(path.join(dir, 'LICENSE'), fs.readFileSync(path.join(root, 'LICENSE')));

  console.log(`${name}@${pkg.version} -> ${path.relative(root, dir)}`);
}

console.log(`Wrote ${platforms.length} packages at ${pkg.version}`);
