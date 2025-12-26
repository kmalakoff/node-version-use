"use strict";
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
 */ var exit = require('exit-compat');
var path = require('path');
var os = require('os');
var _require = require('./installBinaries.cjs'), installBinaries = _require.installBinaries, printInstructions = _require.printInstructions, syncAllShims = _require.syncAllShims;
var hasHomedir = typeof os.homedir === 'function';
function homedir() {
    if (hasHomedir) return os.homedir();
    var home = require('homedir-polyfill');
    return home();
}
// Allow NVU_HOME override for testing
var storagePath = process.env.NVU_HOME || path.join(homedir(), '.nvu');
/**
 * Main installation function
 */ function main() {
    installBinaries({}, function(err, installed) {
        if (err) {
            console.log("postinstall warning: Failed to install binary: ".concat(err.message || err));
            console.log('You can still use nvu with explicit versions: nvu 18 npm test');
            exit(1);
            return;
        }
        if (installed) {
            // Sync all shims to the new binary version
            var binDir = path.join(storagePath, 'bin');
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
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }