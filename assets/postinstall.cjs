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
var fs = require('fs');
var path = require('path');
var os = require('os');
var _require = require('./installBinaries.cjs'), installBinaries = _require.installBinaries, printInstructions = _require.printInstructions;
var hasHomedir = typeof os.homedir === 'function';
function homedir() {
    if (hasHomedir) return os.homedir();
    var home = require('homedir-polyfill');
    return home();
}
// Allow NVU_HOME override for testing
var storagePath = process.env.NVU_HOME || path.join(homedir(), '.nvu');
/**
 * Upgrade all existing shims to use the new binary
 * This ensures that when the binary version changes, all shims (including
 * global package shims like eslint, typescript, etc.) are updated
 */ function upgradeAllShims(binDir) {
    var isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
    // Core shims that shouldn't be overwritten (they're the actual binaries)
    var coreShims = new Set([
        'node',
        'npm',
        'npx',
        'corepack',
        'version.txt'
    ]);
    // Get the new node shim to copy from
    var nodeShim = path.join(binDir, isWindows ? 'node.exe' : 'node');
    if (!fs.existsSync(nodeShim)) return;
    try {
        var entries = fs.readdirSync(binDir);
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var name = _step.value;
                // Skip core shims and special files
                if (coreShims.has(name)) continue;
                // On Windows, skip non-executable extensions
                if (isWindows) {
                    var ext = path.extname(name).toLowerCase();
                    if (ext !== '.exe' && ext !== '.cmd' && ext !== '.bat') continue;
                }
                var shimPath = path.join(binDir, name);
                var stat = fs.statSync(shimPath);
                if (!stat.isFile()) continue;
                // Copy the new shim binary
                var content = fs.readFileSync(nodeShim);
                fs.writeFileSync(shimPath, content);
                // Make executable on Unix
                if (!isWindows) {
                    fs.chmodSync(shimPath, 493);
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally{
            try {
                if (!_iteratorNormalCompletion && _iterator.return != null) {
                    _iterator.return();
                }
            } finally{
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    } catch (_e) {
    // Ignore errors - shim upgrade is best effort
    }
}
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
            // Upgrade all shims to the new binary version
            var binDir = path.join(storagePath, 'bin');
            upgradeAllShims(binDir);
            printInstructions();
            console.log('postinstall: Binary installed successfully!');
        }
        exit(0);
    });
}
main();
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }