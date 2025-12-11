/**
 * Ensures test binaries are built before running tests.
 * Called as pretest hook - builds only if needed.
 * Gracefully skips if Go is not available.
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BINARY_DIR = path.join(ROOT, 'binary');
const TEST_BINARY_BIN = path.join(ROOT, '.tmp', 'binary', 'bin');

// Check for platform-specific binary name
const BINARY_NAME = process.platform === 'win32' ? 'node.exe' : 'node';
const NODE_BINARY = path.join(TEST_BINARY_BIN, BINARY_NAME);

function hasGo(): boolean {
  try {
    execSync('go version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main(): void {
  // Skip if binaries already exist
  if (fs.existsSync(NODE_BINARY)) {
    console.log('Test binaries already built, skipping...');
    return;
  }

  // Check for Go compiler
  if (!hasGo()) {
    console.log('Go compiler not found, skipping binary build.');
    console.log('Binary integration tests will be skipped.');
    return;
  }

  console.log('Building test binaries...');
  execSync('make install-test', {
    cwd: BINARY_DIR,
    stdio: 'inherit',
  });
}

main();
