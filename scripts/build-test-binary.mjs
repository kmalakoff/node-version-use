#!/usr/bin/env node

/**
 * Builds the Go binary for the current platform into .tmp/binary/bin, the shim layout the
 * binary and commands suites run against.
 *
 * Usage: npm run build:binary
 *
 * Node rather than binary/Makefile because the suites run on Windows too, where make drives
 * its recipes through cmd.exe and the Makefile's mkdir -p and cp do not exist.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const binDir = path.join(root, '.tmp', 'binary', 'bin');
const ext = process.platform === 'win32' ? '.exe' : '';

// Every shim in ~/.nvu/bin is a copy of the same binary; the suites exercise node, npm and npx.
const SHIMS = ['nvu', 'node', 'npm', 'npx', 'corepack'];

fs.mkdirSync(binDir, { recursive: true });
const built = path.join(binDir, `nvu${ext}`);

const result = spawnSync('go', ['build', '-o', built, '.'], { cwd: path.join(root, 'binary'), stdio: 'inherit' });
if (result.error && result.error.code === 'ENOENT') {
  console.error('go is not installed. Install Go to build the binary the binary and commands suites need.');
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);

for (const name of SHIMS) {
  const shim = path.join(binDir, `${name}${ext}`);
  if (shim === built) continue;
  fs.copyFileSync(built, shim);
  if (!ext) fs.chmodSync(shim, 0o755);
}

console.log(`Built ${SHIMS.length} shims in ${path.relative(root, binDir)}`);
