import { execSync } from 'child_process';
import exit from 'exit';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { mkdirpSync } from '../compat.ts';
import { storagePath } from '../constants.ts';

var __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

/**
 * nvu setup
 *
 * Install/reinstall nvu shims to ~/.nvu/bin
 * This runs the same logic as the postinstall script.
 */
export default function setupCmd(_args: string[]): void {
  var binDir = path.join(storagePath, 'bin');

  // Create directories
  if (!fs.existsSync(storagePath)) {
    mkdirpSync(storagePath);
  }
  if (!fs.existsSync(binDir)) {
    mkdirpSync(binDir);
  }

  // Find the postinstall script relative to this module
  var postinstallPath = path.join(__dirname, '..', '..', '..', 'scripts', 'postinstall.cjs');

  if (fs.existsSync(postinstallPath)) {
    // Run the postinstall script
    try {
      execSync(`node "${postinstallPath}"`, { stdio: 'inherit' });
    } catch (_err) {
      // postinstall handles its own errors gracefully
    }
  } else {
    console.log('Setup script not found.');
    console.log('Try reinstalling: npm install -g node-version-use');
    exit(1);
  }
}
