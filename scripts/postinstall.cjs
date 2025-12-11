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
 *
 * Compatible with Node.js 0.8+
 */

var fs = require('fs');
var path = require('path');
var os = require('os');
var exit = require('exit-compat');

// Polyfills for old Node versions
var mkdirp = require('mkdirp-classic');
var homedir = typeof os.homedir === 'function' ? os.homedir() : require('homedir-polyfill')();

// execSync doesn't exist in Node 0.8, use spawn
var spawn = require('child_process').spawn;

// Configuration
var GITHUB_REPO = 'kmalakoff/node-version-use';
var BINARY_VERSION = require('../package.json').binaryVersion;

/**
 * Get the platform-specific archive base name (without extension)
 */
function getArchiveBaseName() {
  var platform = os.platform();
  var arch = os.arch();

  var platformMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32',
  };

  var archMap = {
    x64: 'x64',
    arm64: 'arm64',
    amd64: 'x64',
  };

  var platformName = platformMap[platform];
  var archName = archMap[arch];

  if (!platformName || !archName) {
    return null;
  }

  return 'nvu-binary-' + platformName + '-' + archName;
}

/**
 * Get the extracted binary name (includes .exe on Windows)
 */
function getExtractedBinaryName(archiveBaseName) {
  var ext = os.platform() === 'win32' ? '.exe' : '';
  return archiveBaseName + ext;
}

/**
 * Get the download URL for the binary archive
 */
function getDownloadUrl(archiveBaseName) {
  var ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  return 'https://github.com/' + GITHUB_REPO + '/releases/download/binary-v' + BINARY_VERSION + '/' + archiveBaseName + ext;
}

/**
 * Copy file (compatible with Node 0.8)
 */
function copyFileSync(src, dest) {
  var content = fs.readFileSync(src);
  fs.writeFileSync(dest, content);
}

/**
 * Atomic rename with fallback to copy+delete for cross-device moves
 * (compatible with Node 0.8)
 */
function atomicRename(src, dest, callback) {
  fs.rename(src, dest, function (err) {
    if (!err) {
      callback(null);
      return;
    }

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
 * Remove directory recursively (compatible with Node 0.8)
 */
function rmRecursive(dir) {
  if (!fs.existsSync(dir)) return;

  var files = fs.readdirSync(dir);
  for (var i = 0; i < files.length; i++) {
    var filePath = path.join(dir, files[i]);
    var stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      rmRecursive(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }
  fs.rmdirSync(dir);
}

/**
 * Get temp directory (compatible with Node 0.8)
 */
function getTmpDir() {
  return typeof os.tmpdir === 'function' ? os.tmpdir() : process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
}

/**
 * Download using curl (macOS, Linux, Windows 10+)
 */
function downloadWithCurl(url, destPath, callback) {
  var curl = spawn('curl', ['-L', '-f', '-s', '-o', destPath, url]);

  curl.on('close', function (code) {
    if (code !== 0) {
      // curl exit codes: 22 = HTTP error (4xx/5xx), 56 = receive error (often 404 with -f)
      if (code === 22 || code === 56) {
        callback(new Error('HTTP 404'));
      } else {
        callback(new Error('curl failed with exit code ' + code));
      }
      return;
    }
    callback(null);
  });

  curl.on('error', function (err) {
    callback(err);
  });
}

/**
 * Download using PowerShell (Windows 7+ fallback)
 */
function downloadWithPowerShell(url, destPath, callback) {
  var psCommand = 'Invoke-WebRequest -Uri "' + url + '" -OutFile "' + destPath + '" -UseBasicParsing';
  var ps = spawn('powershell', ['-NoProfile', '-Command', psCommand]);

  ps.on('close', function (code) {
    if (code !== 0) {
      callback(new Error('PowerShell download failed with exit code ' + code));
      return;
    }
    callback(null);
  });

  ps.on('error', function (err) {
    callback(err);
  });
}

/**
 * Download a file - tries curl first, falls back to PowerShell on Windows
 * Node 0.8's OpenSSL doesn't support TLS 1.2+ required by GitHub
 */
function downloadFile(url, destPath, callback) {
  downloadWithCurl(url, destPath, function (err) {
    if (!err) {
      callback(null);
      return;
    }

    // If curl failed and we're on Windows, try PowerShell
    if (os.platform() === 'win32' && err.message && err.message.indexOf('ENOENT') >= 0) {
      downloadWithPowerShell(url, destPath, callback);
      return;
    }

    callback(err);
  });
}

/**
 * Extract archive to a directory (callback-based)
 */
function extractArchive(archivePath, destDir, callback) {
  var platform = os.platform();

  if (platform === 'win32') {
    // Windows: extract zip using PowerShell
    var ps = spawn('powershell', ['-Command', "Expand-Archive -Path '" + archivePath + "' -DestinationPath '" + destDir + "' -Force"]);
    ps.on('close', function (code) {
      if (code !== 0) {
        callback(new Error('Failed to extract archive'));
        return;
      }
      callback(null);
    });
  } else {
    // Unix: extract tar.gz
    var tar = spawn('tar', ['-xzf', archivePath, '-C', destDir]);
    tar.on('close', function (code) {
      if (code !== 0) {
        callback(new Error('Failed to extract archive'));
        return;
      }
      callback(null);
    });
  }
}

/**
 * Install binaries using atomic rename pattern
 * 1. Extract to temp directory
 * 2. Copy binary to temp files in destination directory
 * 3. Atomic rename temp files to final names
 */
function extractAndInstall(archivePath, destDir, binaryName, callback) {
  var platform = os.platform();
  var isWindows = platform === 'win32';
  var ext = isWindows ? '.exe' : '';

  // Create temp extraction directory
  var tempExtractDir = path.join(getTmpDir(), 'nvu-extract-' + Date.now());
  mkdirp.sync(tempExtractDir);

  extractArchive(archivePath, tempExtractDir, function (extractErr) {
    if (extractErr) {
      rmRecursive(tempExtractDir);
      callback(extractErr);
      return;
    }

    var extractedPath = path.join(tempExtractDir, binaryName);
    if (!fs.existsSync(extractedPath)) {
      rmRecursive(tempExtractDir);
      callback(new Error('Extracted binary not found: ' + binaryName));
      return;
    }

    // Binary names to install
    var binaries = ['node', 'npm', 'npx'];
    var timestamp = Date.now();
    var _pending = binaries.length;
    var installError = null;

    // Step 1: Copy extracted binary to temp files in destination directory
    // This ensures the temp files are on the same filesystem for atomic rename
    for (var i = 0; i < binaries.length; i++) {
      var name = binaries[i];
      var tempDest = path.join(destDir, name + '.tmp-' + timestamp + ext);
      var _finalDest = path.join(destDir, name + ext);

      try {
        // Copy to temp file in destination directory
        copyFileSync(extractedPath, tempDest);

        // Set permissions on Unix
        if (!isWindows) {
          fs.chmodSync(tempDest, 493); // 0755
        }
      } catch (err) {
        installError = err;
        break;
      }
    }

    if (installError) {
      // Clean up any temp files we created
      for (var j = 0; j < binaries.length; j++) {
        var tempPath = path.join(destDir, binaries[j] + '.tmp-' + timestamp + ext);
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (_e) {}
        }
      }
      rmRecursive(tempExtractDir);
      callback(installError);
      return;
    }

    // Step 2: Atomic rename temp files to final names
    var _renamesPending = binaries.length;
    var renameError = null;

    function doRename(index) {
      if (index >= binaries.length) {
        // All renames complete
        rmRecursive(tempExtractDir);
        callback(renameError);
        return;
      }

      var name = binaries[index];
      var tempDest = path.join(destDir, name + '.tmp-' + timestamp + ext);
      var finalDest = path.join(destDir, name + ext);

      // Remove existing file if present (for atomic replacement)
      if (fs.existsSync(finalDest)) {
        try {
          fs.unlinkSync(finalDest);
        } catch (_e) {}
      }

      atomicRename(tempDest, finalDest, function (err) {
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
 */
function printInstructions(installed) {
  var nvuBinPath = path.join(homedir, '.nvu', 'bin');
  var platform = os.platform();

  console.log('');
  console.log('============================================================');
  if (installed) {
    console.log('  nvu binaries installed to ~/.nvu/bin/');
  } else {
    console.log('  nvu installed (binaries not yet available)');
  }
  console.log('============================================================');
  console.log('');
  console.log('To enable transparent Node version switching, add to your shell profile:');
  console.log('');

  if (platform === 'win32') {
    console.log('  PowerShell (add to $PROFILE):');
    console.log('    $env:PATH = "' + nvuBinPath + ';$env:PATH"');
    console.log('');
    console.log('  CMD (run as administrator):');
    console.log('    setx PATH "' + nvuBinPath + ';%PATH%"');
  } else {
    console.log('  # For bash (~/.bashrc):');
    console.log('    export PATH="$HOME/.nvu/bin:$PATH"');
    console.log('');
    console.log('  # For zsh (~/.zshrc):');
    console.log('    export PATH="$HOME/.nvu/bin:$PATH"');
    console.log('');
    console.log('  # For fish (~/.config/fish/config.fish):');
    console.log('    set -gx PATH $HOME/.nvu/bin $PATH');
  }

  console.log('');
  console.log('Then restart your terminal or source your shell profile.');
  console.log('');
  console.log("Without this, 'nvu 18 npm test' still works - you just won't have");
  console.log("transparent 'node' command override.");
  console.log('============================================================');
}

/**
 * Main installation function
 */
function main() {
  var archiveBaseName = getArchiveBaseName();

  if (!archiveBaseName) {
    console.log('postinstall: Unsupported platform/architecture for binary.');
    console.log('Platform: ' + os.platform() + ', Arch: ' + os.arch());
    console.log('Binary not installed. You can still use nvu with explicit versions: nvu 18 npm test');
    exit(0);
    return;
  }

  var extractedBinaryName = getExtractedBinaryName(archiveBaseName);

  var nvuDir = path.join(homedir, '.nvu');
  var binDir = path.join(nvuDir, 'bin');

  // Create directories
  mkdirp.sync(nvuDir);
  mkdirp.sync(binDir);

  var downloadUrl = getDownloadUrl(archiveBaseName);
  var ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  var tempPath = path.join(getTmpDir(), 'nvu-binary-' + Date.now() + ext);

  console.log('postinstall: Downloading binary for ' + os.platform() + '-' + os.arch() + '...');

  downloadFile(downloadUrl, tempPath, function (downloadErr) {
    if (downloadErr) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {}
      }

      if (downloadErr.message && downloadErr.message.indexOf('404') >= 0) {
        console.log('postinstall: Binaries not yet published to GitHub releases.');
        console.log('');
        console.log('To build and install binaries locally:');
        console.log('  cd node_modules/node-version-use/binary');
        console.log('  make install');
        console.log('');
        console.log('Or wait for the next release which will include pre-built binaries.');
      } else {
        console.log('postinstall warning: Failed to install binary: ' + (downloadErr.message || downloadErr));
        console.log('You can still use nvu with explicit versions: nvu 18 npm test');
        console.log('To install binaries manually: cd node_modules/node-version-use/binary && make install');
      }
      printInstructions(false);
      exit(0);
      return;
    }

    console.log('postinstall: Extracting binary...');

    extractAndInstall(tempPath, binDir, extractedBinaryName, function (extractErr) {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {}
      }

      if (extractErr) {
        console.log('postinstall warning: Failed to extract binary: ' + (extractErr.message || extractErr));
        console.log('You can still use nvu with explicit versions: nvu 18 npm test');
        printInstructions(false);
        exit(0);
        return;
      }

      console.log('postinstall: Binary installed successfully!');
      printInstructions(true);
      exit(0);
    });
  });
}

main();
