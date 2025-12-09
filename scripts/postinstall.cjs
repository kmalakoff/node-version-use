/**
 * Postinstall script for node-version-use
 *
 * Downloads the platform-specific shim binary and installs it to ~/.nvu/bin/
 * This enables transparent Node version switching via the shim.
 *
 * Compatible with Node.js 0.8+
 */

var fs = require('fs');
var path = require('path');
var os = require('os');
var exit = require('exit');
var getRemote = require('get-remote');

// Polyfills for old Node versions
var mkdirp = require('mkdirp-classic');
var homedir = typeof os.homedir === 'function' ? os.homedir() : require('homedir-polyfill')();

// execSync doesn't exist in Node 0.8, use spawn
var spawn = require('child_process').spawn;

// Configuration
var GITHUB_REPO = 'kmalakoff/node-version-use';
var SHIM_VERSION = '1.0.2';

/**
 * Get the platform-specific binary name
 */
function getShimBinaryName() {
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

  var ext = platform === 'win32' ? '.exe' : '';
  return 'nvu-shim-' + platformName + '-' + archName + ext;
}

/**
 * Get the download URL for the shim binary
 */
function getDownloadUrl(binaryName) {
  var ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  return 'https://github.com/' + GITHUB_REPO + '/releases/download/shim-v' + SHIM_VERSION + '/' + binaryName + ext;
}

/**
 * Copy file (compatible with Node 0.8)
 */
function copyFileSync(src, dest) {
  var content = fs.readFileSync(src);
  fs.writeFileSync(dest, content);
}

/**
 * Download a file from a URL (using get-remote for Node 0.8+ compatibility)
 */
function downloadFile(url, destPath, callback) {
  var writeStream = fs.createWriteStream(destPath);
  getRemote(url).pipe(writeStream, callback);
}

/**
 * Extract archive and install shims (callback-based)
 */
function extractAndInstall(archivePath, destDir, binaryName, callback) {
  var platform = os.platform();

  if (platform === 'win32') {
    // Windows: extract zip using PowerShell
    var ps = spawn('powershell', ['-Command', "Expand-Archive -Path '" + archivePath + "' -DestinationPath '" + destDir + "' -Force"]);
    ps.on('close', function (code) {
      if (code !== 0) {
        callback(new Error('Failed to extract archive'));
        return;
      }
      var extractedPath = path.join(destDir, binaryName);
      if (fs.existsSync(extractedPath)) {
        try {
          copyFileSync(extractedPath, path.join(destDir, 'node.exe'));
          copyFileSync(extractedPath, path.join(destDir, 'npm.exe'));
          copyFileSync(extractedPath, path.join(destDir, 'npx.exe'));
          fs.unlinkSync(extractedPath);
        } catch (err) {
          callback(err);
          return;
        }
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
      var extractedPath = path.join(destDir, binaryName);
      if (fs.existsSync(extractedPath)) {
        var nodePath = path.join(destDir, 'node');
        var npmPath = path.join(destDir, 'npm');
        var npxPath = path.join(destDir, 'npx');

        try {
          copyFileSync(extractedPath, nodePath);
          copyFileSync(extractedPath, npmPath);
          copyFileSync(extractedPath, npxPath);

          fs.chmodSync(nodePath, 493); // 0755
          fs.chmodSync(npmPath, 493);
          fs.chmodSync(npxPath, 493);

          fs.unlinkSync(extractedPath);
        } catch (err) {
          callback(err);
          return;
        }
      }
      callback(null);
    });
  }
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
    console.log('  nvu shims installed to ~/.nvu/bin/');
  } else {
    console.log('  nvu installed (shims not yet available)');
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
 * Get temp directory (compatible with Node 0.8)
 */
function getTmpDir() {
  return typeof os.tmpdir === 'function' ? os.tmpdir() : process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
}

/**
 * Main installation function
 */
function main() {
  var binaryName = getShimBinaryName();

  if (!binaryName) {
    console.log('postinstall: Unsupported platform/architecture for shim binary.');
    console.log('Platform: ' + os.platform() + ', Arch: ' + os.arch());
    console.log('Shim not installed. You can still use nvu with explicit versions: nvu 18 npm test');
    exit(0);
    return;
  }

  var nvuDir = path.join(homedir, '.nvu');
  var binDir = path.join(nvuDir, 'bin');

  // Create directories
  mkdirp.sync(nvuDir);
  mkdirp.sync(binDir);

  var downloadUrl = getDownloadUrl(binaryName);
  var ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  var tempPath = path.join(getTmpDir(), 'nvu-shim-' + Date.now() + ext);

  console.log('postinstall: Downloading shim binary for ' + os.platform() + '-' + os.arch() + '...');

  downloadFile(downloadUrl, tempPath, function (downloadErr) {
    if (downloadErr) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {}
      }

      if (downloadErr.message && downloadErr.message.indexOf('404') >= 0) {
        console.log('postinstall: Shim binaries not yet published to GitHub releases.');
        console.log('');
        console.log('To build and install shims locally:');
        console.log('  cd node_modules/node-version-use/shim');
        console.log('  make install');
        console.log('');
        console.log('Or wait for the next release which will include pre-built binaries.');
      } else {
        console.log('postinstall warning: Failed to install shim: ' + (downloadErr.message || downloadErr));
        console.log('You can still use nvu with explicit versions: nvu 18 npm test');
        console.log('To install shims manually: cd node_modules/node-version-use/shim && make install');
      }
      printInstructions(false);
      exit(0);
      return;
    }

    console.log('postinstall: Extracting shim binary...');

    extractAndInstall(tempPath, binDir, binaryName, function (extractErr) {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {}
      }

      if (extractErr) {
        console.log('postinstall warning: Failed to extract shim: ' + (extractErr.message || extractErr));
        console.log('You can still use nvu with explicit versions: nvu 18 npm test');
        printInstructions(false);
        exit(0);
        return;
      }

      console.log('postinstall: Shim installed successfully!');
      printInstructions(true);
      exit(0);
    });
  });
}

main();
