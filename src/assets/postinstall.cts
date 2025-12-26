/**
 * Postinstall script for node-version-use
 *
 * Downloads the platform-specific binary and installs it to ~/.nvu/bin/
 * This enables transparent Node version switching.
 *
 * Uses safe atomic download pattern:
 * 1. Download to temp file
 * 2. Extract to temp directory
 * 3. Atomic rename to final location
 */

const exit = require('exit-compat');
const path = require('path');
const os = require('os');
const { installBinaries, printInstructions, syncAllShims } = require('./installBinaries.cjs');

const hasHomedir = typeof os.homedir === 'function';
function homedir(): string {
  if (hasHomedir) return os.homedir();
  const home = require('homedir-polyfill');
  return home();
}

// Allow NVU_HOME override for testing
const storagePath = process.env.NVU_HOME || path.join(homedir(), '.nvu');

/**
 * Main installation function
 */
function main(): void {
  installBinaries({}, (err, installed) => {
    if (err) {
      console.log(`postinstall warning: Failed to install binary: ${err.message || err}`);
      console.log('You can still use nvu with explicit versions: nvu 18 npm test');
      exit(1);
      return;
    }

    if (installed) {
      // Sync all shims to the new binary version
      const binDir = path.join(storagePath, 'bin');
      syncAllShims(binDir);

      printInstructions();
      console.log('postinstall: Binary installed successfully!');
    } else {
      console.log('postinstall: Binaries already up to date.');
    }
    exit(0);
  });
}

main();
