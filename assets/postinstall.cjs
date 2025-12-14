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
var _require = require('./installBinaries.cjs'), installBinaries = _require.installBinaries, printInstructions = _require.printInstructions;
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
            printInstructions();
            console.log('postinstall: Binary installed successfully!');
        }
        exit(0);
    });
}
main();
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }