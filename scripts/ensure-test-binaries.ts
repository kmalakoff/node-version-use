/**
 * Validates that binaries were downloaded by postinstall.
 * Called as pretest hook - fails if binaries are missing.
 */
import fs from 'fs';
import path from 'path';
import { storagePath } from '../src/constants.ts';

var BIN_DIR = path.join(storagePath, 'bin');

// Check for platform-specific binary name
var BINARY_NAME = process.platform === 'win32' ? 'node.exe' : 'node';
var NODE_BINARY = path.join(BIN_DIR, BINARY_NAME);

function main(): void {
  if (!fs.existsSync(NODE_BINARY)) {
    console.error('Error: nvu binaries not found at', BIN_DIR);
    console.error('');
    console.error('Binaries should have been downloaded by postinstall.');
    console.error('Try running: npm install');
    process.exit(1);
  }

  console.log('Binaries found at', BIN_DIR);
}

main();
