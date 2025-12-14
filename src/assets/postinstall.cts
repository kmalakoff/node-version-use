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
const { installBinaries, printInstructions } = require('./installBinaries.cjs');

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
      printInstructions();
      console.log('postinstall: Binary installed successfully!');
    }
    exit(0);
  });
}

main();
