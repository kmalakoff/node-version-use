/**
 * Build binaries for all platforms
 *
 * Usage:
 *   node scripts/build-binaries.ts
 *
 * Version comes from package.json binaryVersion field - separate from npm package version
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const BINARY_DIR = path.join(ROOT_DIR, 'binary');

function getBinaryVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'));
  return pkg.binaryVersion;
}

function buildBinaries(): void {
  console.log('Building binaries for all platforms...');
  execSync('make clean', { cwd: BINARY_DIR, stdio: 'inherit' });
  execSync('make release', { cwd: BINARY_DIR, stdio: 'inherit' });
}

function main(): void {
  const version = getBinaryVersion();
  console.log(`Building binaries for version: ${version}`);

  buildBinaries();

  console.log('\n' + '='.repeat(60));
  console.log('Build complete!');
  console.log('='.repeat(60));
  console.log(`\nBinary version: ${version}`);
  console.log(`Archives in: ${path.join(BINARY_DIR, 'build')}/`);
  console.log('\nNext steps:');
  console.log(`  1. Create GitHub release with tag: binary-v${version}`);
  console.log('  2. Upload all archives from binary/build/ to the release');
}

main();
