#!/usr/bin/env node

/**
 * Pins optionalDependencies to one nvu-<platform>-<arch> package per platforms.json entry, each
 * at this package's own version.
 *
 * Runs from the version lifecycle, before npm writes the version commit, so a bump can never
 * leave the pins behind. Needs no binaries, so a bump works without a Go toolchain.
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const packagePath = path.join(__dirname, '..', 'package.json');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const platforms = JSON.parse(fs.readFileSync(path.join(__dirname, 'platforms.json'), 'utf8'));

const pins = {};
for (const { platform, arch } of platforms) pins[`nvu-${platform}-${arch}`] = pkg.version;

if (JSON.stringify(pkg.optionalDependencies) === JSON.stringify(pins)) {
  console.log(`optionalDependencies already pinned at ${pkg.version}`);
} else {
  pkg.optionalDependencies = pins;
  fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`optionalDependencies pinned at ${pkg.version}: ${Object.keys(pins).join(', ')}`);
}
