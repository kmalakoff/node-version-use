#!/usr/bin/env node

/**
 * Keeps optionalDependencies listing one nvu-<platform>-<arch> package per platforms.json entry,
 * all at one binary version.
 *
 * Usage: npm run pin:platform-packages                       # repair: add/remove platforms, keep the version
 *        npm run pin:platform-packages -- --set-version 2.6.0  # deliberate bump, when the binary changed
 *
 * Runs from the version lifecycle, where it must NOT move the version: the binary changes far less
 * often than the package, so an ordinary release keeps the pins it has and publishes no binary
 * packages. Moving them is a separate, deliberate act.
 */

import fs from 'fs';
import path from 'path';
import { parseArgs } from 'util';
import { inspectPins, platformNames, readPackage, readPlatforms, root } from './lib/binaryVersion.mjs';

const { values } = parseArgs({ options: { 'set-version': { type: 'string' } } });

const pkg = readPackage();
const platforms = readPlatforms();
const names = platformNames(platforms);
const pins = inspectPins(pkg, platforms);

const version = values['set-version'] || pins.version || pins.disagreeing[0];
if (!version) {
  console.error('No binary version to pin: optionalDependencies declares no platform package.');
  console.error('Set one with: npm run pin:platform-packages -- --set-version <version>');
  process.exit(1);
}

const pinned = {};
for (const name of names) pinned[name] = version;

if (JSON.stringify(pkg.optionalDependencies) === JSON.stringify(pinned)) {
  console.log(`optionalDependencies already pinned: ${names.length} platforms at ${version}`);
} else {
  const added = pins.missing;
  pkg.optionalDependencies = pinned;
  fs.writeFileSync(path.join(root, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`optionalDependencies pinned: ${names.length} platforms at ${version}`);
  if (added.length) console.log(`  added: ${added.join(', ')} — publish these before the parent`);
  if (pins.extra.length) console.log(`  removed: ${pins.extra.join(', ')}`);
}
