/**
 * Reads the version the per-platform binary packages are published at.
 *
 * That version is INDEPENDENT of the parent's. The Go binary changes far less often than the
 * package, so a parent release re-pins nothing and publishes no binary packages; the parent's
 * optionalDependencies pins are the single source of truth for which binary release is current.
 */

import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
export const root = path.join(__dirname, '..', '..');

export const packageName = (platform, arch) => `nvu-${platform}-${arch}`;

export function readPackage() {
  return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
}

export function readPlatforms() {
  return JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'platforms.json'), 'utf8'));
}

export function platformNames(platforms) {
  return platforms.map((entry) => packageName(entry.platform, entry.arch));
}

/** { version, missing, extra, disagreeing } — version is null unless every platform agrees. */
export function inspectPins(pkg, platforms) {
  const declared = pkg.optionalDependencies || {};
  const names = platformNames(platforms);
  const missing = names.filter((name) => !declared[name]);
  const extra = Object.keys(declared).filter((name) => names.indexOf(name) < 0);
  const versions = names.map((name) => declared[name]).filter(Boolean);
  const disagreeing = versions.filter((version, i) => versions.indexOf(version) === i);
  return { version: disagreeing.length === 1 && !missing.length ? disagreeing[0] : null, missing, extra, disagreeing };
}

/** The pinned binary version, or exit(1) naming the fix. */
export function requireBinaryVersion(pkg, platforms) {
  const pins = inspectPins(pkg, platforms);
  if (pins.version) return pins.version;
  if (pins.missing.length) console.error(`optionalDependencies is missing ${pins.missing.length} platform(s): ${pins.missing.join(', ')}`);
  if (pins.extra.length) console.error(`optionalDependencies declares ${pins.extra.length} package(s) not in platforms.json: ${pins.extra.join(', ')}`);
  if (pins.disagreeing.length > 1) console.error(`platform packages are pinned at ${pins.disagreeing.length} different versions: ${pins.disagreeing.join(', ')}`);
  console.error('Fix them with: npm run pin:platform-packages');
  process.exit(1);
}
