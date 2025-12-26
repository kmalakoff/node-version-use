"use strict";
var envPathKey = require('env-path-key');
var fs = require('fs');
var safeRmSync = require('fs-remove-compat').safeRmSync;
var getFile = require('get-file-compat');
var mkdirp = require('mkdirp-classic');
var os = require('os');
var path = require('path');
var Queue = require('queue-cb');
var moduleRoot = require('module-root-sync');
var cpuArch = require('cpu-arch');
var root = moduleRoot(__dirname);
// Configuration
var GITHUB_REPO = 'kmalakoff/node-version-use';
var BINARY_VERSION = require(path.join(root, 'package.json')).binaryVersion;
var isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
var hasHomedir = typeof os.homedir === 'function';
function homedir() {
    if (hasHomedir) return os.homedir();
    var home = require('homedir-polyfill');
    return home();
}
// Allow NVU_HOME override for testing
var storagePath = process.env.NVU_HOME || path.join(homedir(), '.nvu');
var hasTmpdir = typeof os.tmpdir === 'function';
function tmpdir() {
    if (hasTmpdir) return os.tmpdir();
    var osShim = require('os-shim');
    return osShim.tmpdir();
}
function removeIfExistsSync(filePath) {
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (_e) {
        // ignore cleanup errors
        }
    }
}
/**
 * Move a file out of the way (works even if running on Windows)
 * First tries to unlink; if that fails (Windows locked), rename to .old-timestamp
 */ function moveOutOfWay(filePath) {
    if (!fs.existsSync(filePath)) return;
    // First try to unlink (works on Unix, fails on Windows if running)
    try {
        fs.unlinkSync(filePath);
        return;
    } catch (_e) {
    // Unlink failed (likely Windows locked file), try rename
    }
    // Rename to .old-timestamp as fallback
    var timestamp = Date.now();
    var oldPath = "".concat(filePath, ".old-").concat(timestamp);
    try {
        fs.renameSync(filePath, oldPath);
    } catch (_e2) {
    // Both unlink and rename failed - will fail on atomic rename instead
    }
}
/**
 * Clean up old .old-* files from previous installs
 */ function cleanupOldFiles(dir) {
    try {
        var entries = fs.readdirSync(dir);
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var entry = _step.value;
                if (entry.includes('.old-')) {
                    try {
                        fs.unlinkSync(path.join(dir, entry));
                    } catch (_e) {
                    // ignore - file may still be in use
                    }
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
    // ignore if dir doesn't exist
    }
}
/**
 * Get the platform-specific archive base name (without extension)
 */ function getArchiveBaseName() {
    var platform = process.platform;
    var arch = cpuArch();
    var platformMap = {
        darwin: 'darwin',
        linux: 'linux',
        win32: 'win32'
    };
    var archMap = {
        x64: 'x64',
        arm64: 'arm64',
        amd64: 'x64'
    };
    var platformName = platformMap[platform];
    var archName = archMap[arch];
    if (!platformName || !archName) return null;
    return "nvu-binary-".concat(platformName, "-").concat(archName);
}
/**
 * Copy file
 */ function copyFileSync(src, dest) {
    var content = fs.readFileSync(src);
    fs.writeFileSync(dest, content);
}
/**
 * Sync all shims by copying the nvu binary to all other files in the bin directory
 * All shims (node, npm, npx, corepack, eslint, etc.) are copies of the same binary
 */ module.exports.syncAllShims = function syncAllShims(binDir) {
    var isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
    var ext = isWindows ? '.exe' : '';
    // Source: nvu binary
    var nvuSource = path.join(binDir, "nvu".concat(ext));
    if (!fs.existsSync(nvuSource)) return;
    try {
        var entries = fs.readdirSync(binDir);
        var _iteratorNormalCompletion = true, _didIteratorError = false, _iteratorError = undefined;
        try {
            for(var _iterator = entries[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true){
                var name = _step.value;
                // Skip nvu itself and nvu.json
                if (name === "nvu".concat(ext) || name === 'nvu.json') continue;
                // On Windows, only process .exe files
                if (isWindows && !name.endsWith('.exe')) continue;
                var shimPath = path.join(binDir, name);
                var stat = fs.statSync(shimPath);
                if (!stat.isFile()) continue;
                // Move existing file out of the way (Windows compatibility)
                moveOutOfWay(shimPath);
                // Copy nvu binary to shim
                copyFileSync(nvuSource, shimPath);
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
    // Ignore errors - shim sync is best effort
    }
};
/**
 * Atomic rename with fallback to copy+delete for cross-device moves
 */ function atomicRename(src, dest, callback) {
    fs.rename(src, dest, function(err) {
        if (!err) return callback(null);
        // Cross-device link error - fall back to copy + delete
        if (err.code === 'EXDEV') {
            try {
                copyFileSync(src, dest);
                fs.unlinkSync(src);
                callback(null);
            } catch (copyErr) {
                callback(copyErr);
            }
            return;
        }
        callback(err);
    });
}
/**
 * Extract archive to a directory (callback-based)
 */ function extractArchive(archivePath, dest, callback) {
    var Iterator = isWindows ? require('zip-iterator') : require('tar-iterator');
    var stream = isWindows ? fs.createReadStream(archivePath) : fs.createReadStream(archivePath).pipe(require('zlib').createGunzip());
    var iterator = new Iterator(stream);
    // one by one
    var links = [];
    iterator.forEach(function(entry, callback) {
        if (entry.type === 'link') {
            links.unshift(entry);
            callback();
        } else if (entry.type === 'symlink') {
            links.push(entry);
            callback();
        } else entry.create(dest, callback);
    }, {
        callbacks: true,
        concurrency: 1
    }, function(_err) {
        // create links after directories and files
        var queue = new Queue();
        for(var index = 0; index < links.length; index++){
            var entry = links[index];
            queue.defer(entry.create.bind(entry, dest));
        }
        queue.await(function(err) {
            iterator.destroy();
            iterator = null;
            callback(err);
        });
    });
}
/**
 * Install binaries using atomic rename pattern
 * 1. Extract to temp directory
 * 2. Copy binary to temp files in destination directory
 * 3. Atomic rename temp files to final names
 */ function extractAndInstall(archivePath, destDir, binaryName, callback) {
    var ext = isWindows ? '.exe' : '';
    // Create temp extraction directory
    var tempExtractDir = path.join(tmpdir(), "nvu-extract-".concat(Date.now()));
    mkdirp.sync(tempExtractDir);
    extractArchive(archivePath, tempExtractDir, function(err) {
        if (err) {
            safeRmSync(tempExtractDir);
            callback(err);
            return;
        }
        var extractedPath = path.join(tempExtractDir, binaryName);
        if (!fs.existsSync(extractedPath)) {
            safeRmSync(tempExtractDir);
            callback(new Error("Extracted binary not found: ".concat(binaryName, ". ").concat(archivePath, " ").concat(tempExtractDir)));
            return;
        }
        // Binary names to install
        var binaries = [
            'node',
            'npm',
            'npx',
            'corepack'
        ];
        var timestamp = Date.now();
        var installError = null;
        // Step 1: Copy extracted binary to temp files in destination directory
        // This ensures the temp files are on the same filesystem for atomic rename
        for(var i = 0; i < binaries.length; i++){
            var name = binaries[i];
            var tempDest = path.join(destDir, "".concat(name, ".tmp-").concat(timestamp).concat(ext));
            try {
                // Copy to temp file in destination directory
                copyFileSync(extractedPath, tempDest);
                // Set permissions on Unix
                if (!isWindows) fs.chmodSync(tempDest, 493);
            } catch (err) {
                installError = err;
                break;
            }
        }
        if (installError) {
            // Clean up any temp files we created
            for(var j = 0; j < binaries.length; j++){
                var tempPath = path.join(destDir, "".concat(binaries[j], ".tmp-").concat(timestamp).concat(ext));
                removeIfExistsSync(tempPath);
            }
            safeRmSync(tempExtractDir);
            callback(installError);
            return;
        }
        // Step 2: Atomic rename temp files to final names
        var renameError = null;
        function doRename(index) {
            if (index >= binaries.length) {
                // All renames complete
                safeRmSync(tempExtractDir);
                callback(renameError);
                return;
            }
            var name = binaries[index];
            var tempDest = path.join(destDir, "".concat(name, ".tmp-").concat(timestamp).concat(ext));
            var finalDest = path.join(destDir, "".concat(name).concat(ext));
            // Move existing file out of the way (works even if running on Windows)
            moveOutOfWay(finalDest);
            atomicRename(tempDest, finalDest, function(err) {
                if (err && !renameError) {
                    renameError = err;
                }
                doRename(index + 1);
            });
        }
        doRename(0);
    });
}
/**
 * Print setup instructions
 */ module.exports.printInstructions = function printInstructions() {
    var _nvuBinPath = path.join(storagePath, 'bin');
    console.log('nvu binaries installed in ~/.nvu/bin/');
    var pathKey = envPathKey();
    var envPath = process.env[pathKey] || '';
    if (envPath.indexOf('.nvu/bin') >= 0) return; // path exists
    // provide instructions for path setup
    console.log('');
    console.log('============================================================');
    console.log('  Global node setup');
    console.log('============================================================');
    console.log('');
    if (isWindows) {
        console.log('  # Edit your PowerShell profile');
        console.log('  # Open with: notepad $PROFILE');
        console.log('  # Add this line:');
        console.log('    $env:PATH = "$HOME\\.nvu\\bin;$env:APPDATA\\npm;$env:PATH"');
        console.log('');
        console.log('  # This adds:');
        console.log('  #   ~/.nvu/bin     - node/npm version switching shims');
        console.log('  #   %APPDATA%/npm  - globally installed npm packages (like nvu)');
    } else {
        console.log('  # For bash (~/.bashrc):');
        console.log('   echo \'export PATH="$HOME/.nvu/bin:$PATH"\' >> ~/.bashrc');
        console.log('');
        console.log('  # For zsh (~/.zshrc):');
        console.log('   echo \'export PATH="$HOME/.nvu/bin:$PATH"\' >> ~/.zshrc');
        console.log('');
        console.log('  # For fish (~/.config/fish/config.fish):');
        console.log("   echo 'set -gx PATH $HOME/.nvu/bin $PATH' >> ~/.config/fish/config.fish");
    }
    console.log('');
    console.log('Then restart your terminal or source your shell profile.');
    console.log('');
    console.log("Without this, 'nvu 18 npm test' still works - you just won't have");
    console.log("transparent 'node' command override.");
    console.log('============================================================');
};
/**
 * Main installation function
 */ module.exports.installBinaries = function installBinaries(options, callback) {
    var archiveBaseName = getArchiveBaseName();
    if (!archiveBaseName) {
        callback(new Error('Unsupported platform/architecture for binary.'));
        return;
    }
    var extractedBinaryName = "".concat(archiveBaseName).concat(isWindows ? '.exe' : '');
    var binDir = path.join(storagePath, 'bin');
    var nvuJsonPath = path.join(binDir, 'nvu.json');
    // check if we need to upgrade
    if (!options.force) {
        try {
            // already installed - read nvu.json
            var nvuJson = JSON.parse(fs.readFileSync(nvuJsonPath, 'utf8'));
            if (nvuJson.binaryVersion === BINARY_VERSION) {
                callback(null, false);
                return;
            }
        } catch (_err) {}
    }
    // Create directories
    mkdirp.sync(storagePath);
    mkdirp.sync(binDir);
    mkdirp.sync(path.join(storagePath, 'cache'));
    // Clean up old .old-* files from previous installs
    cleanupOldFiles(binDir);
    var downloadUrl = "https://github.com/".concat(GITHUB_REPO, "/releases/download/binary-v").concat(BINARY_VERSION, "/").concat(archiveBaseName).concat(isWindows ? '.zip' : '.tar.gz');
    var cachePath = path.join(storagePath, 'cache', "".concat(archiveBaseName).concat(isWindows ? '.zip' : '.tar.gz'));
    // Check cache first
    if (fs.existsSync(cachePath)) {
        console.log('Using cached binary...');
        // Use cached file
        extractAndInstall(cachePath, binDir, extractedBinaryName, function(err) {
            if (err) return callback(err);
            // save binary version for upgrade checks
            fs.writeFileSync(nvuJsonPath, JSON.stringify({
                binaryVersion: BINARY_VERSION
            }, null, 2), 'utf8');
            console.log('Binary installed successfully!');
            callback(null, true);
        });
        return;
    }
    // Download to temp file
    console.log("Downloading binary for ".concat(archiveBaseName, "..."));
    var tempPath = path.join(tmpdir(), "nvu-binary-".concat(Date.now()).concat(isWindows ? '.zip' : '.tar.gz'));
    getFile(downloadUrl, tempPath, function(err) {
        if (err) {
            removeIfExistsSync(tempPath);
            callback(new Error("No prebuilt binary available for ".concat(archiveBaseName, ". Download: ").concat(downloadUrl, ". Error: ").concat(err.message)));
            return;
        }
        // Copy to cache for future use
        try {
            copyFileSync(tempPath, cachePath);
        } catch (_e) {
        // Cache write failed, continue anyway
        }
        extractAndInstall(tempPath, binDir, extractedBinaryName, function(err) {
            removeIfExistsSync(tempPath);
            if (err) return callback(err);
            // save binary version for upgrade checks
            fs.writeFileSync(nvuJsonPath, JSON.stringify({
                binaryVersion: BINARY_VERSION
            }, null, 2), 'utf8');
            console.log('Binary installed successfully!');
            callback(null, true);
        });
    });
};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }