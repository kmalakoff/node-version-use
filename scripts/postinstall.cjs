/**
 * Postinstall script for node-version-use
 *
 * Downloads the platform-specific shim binary and installs it to ~/.nvu/bin/
 * This enables transparent Node version switching via the shim.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Configuration
const GITHUB_REPO = 'kmalakoff/node-version-use';
const SHIM_VERSION = '1.0.1';

/**
 * Get the platform-specific binary name
 */
function getShimBinaryName() {
  const platform = os.platform();
  const arch = os.arch();

  const platformMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32',
  };

  const archMap = {
    x64: 'x64',
    arm64: 'arm64',
    amd64: 'x64',
  };

  const platformName = platformMap[platform];
  const archName = archMap[arch];

  if (!platformName || !archName) {
    return null;
  }

  const ext = platform === 'win32' ? '.exe' : '';
  return `nvu-shim-${platformName}-${archName}${ext}`;
}

/**
 * Get the download URL for the shim binary
 */
function getDownloadUrl(binaryName) {
  const ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  return `https://github.com/${GITHUB_REPO}/releases/download/shim-v${SHIM_VERSION}/${binaryName}${ext}`;
}

/**
 * Download a file from a URL
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode === 404) {
        reject(new Error('Release not found (404)'));
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {}); // Delete partial file
        reject(err);
      });
    });

    request.on('error', reject);
  });
}

/**
 * Extract archive and install shims
 */
function extractAndInstall(archivePath, destDir, binaryName) {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: extract zip using PowerShell
    try {
      execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });

      const extractedPath = path.join(destDir, binaryName);
      if (fs.existsSync(extractedPath)) {
        // Copy shim to node.exe, npm.exe, npx.exe
        fs.copyFileSync(extractedPath, path.join(destDir, 'node.exe'));
        fs.copyFileSync(extractedPath, path.join(destDir, 'npm.exe'));
        fs.copyFileSync(extractedPath, path.join(destDir, 'npx.exe'));
        fs.unlinkSync(extractedPath);
      }
    } catch (err) {
      throw new Error(`Failed to extract archive: ${err.message}`);
    }
  } else {
    // Unix: extract tar.gz
    try {
      execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'pipe' });

      const extractedPath = path.join(destDir, binaryName);
      if (fs.existsSync(extractedPath)) {
        const nodePath = path.join(destDir, 'node');
        const npmPath = path.join(destDir, 'npm');
        const npxPath = path.join(destDir, 'npx');

        // Copy shim to node, npm, npx
        fs.copyFileSync(extractedPath, nodePath);
        fs.copyFileSync(extractedPath, npmPath);
        fs.copyFileSync(extractedPath, npxPath);

        fs.chmodSync(nodePath, 0o755);
        fs.chmodSync(npmPath, 0o755);
        fs.chmodSync(npxPath, 0o755);

        // Clean up the original extracted file
        fs.unlinkSync(extractedPath);
      }
    } catch (err) {
      throw new Error(`Failed to extract archive: ${err.message}`);
    }
  }
}

/**
 * Print setup instructions
 */
function printInstructions(installed) {
  const homeDir = os.homedir();
  const nvuBinPath = path.join(homeDir, '.nvu', 'bin');
  const platform = os.platform();

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
    console.log(`    $env:PATH = "${nvuBinPath};$env:PATH"`);
    console.log('');
    console.log('  CMD (run as administrator):');
    console.log(`    setx PATH "${nvuBinPath};%PATH%"`);
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
  console.log('Then restart your terminal or run: source ~/.bashrc');
  console.log('');
  console.log("Without this, 'nvu 18 npm test' still works - you just won't have");
  console.log("transparent 'node' command override.");
  console.log('============================================================');
  console.log('');
}

/**
 * Main installation function
 */
async function main() {
  const binaryName = getShimBinaryName();

  if (!binaryName) {
    console.log('postinstall: Unsupported platform/architecture for shim binary.');
    console.log(`Platform: ${os.platform()}, Arch: ${os.arch()}`);
    console.log('Shim not installed. You can still use nvu with explicit versions: nvu 18 npm test');
    process.exit(0);
  }

  const homeDir = os.homedir();
  const nvuDir = path.join(homeDir, '.nvu');
  const binDir = path.join(nvuDir, 'bin');

  // Create directories
  if (!fs.existsSync(nvuDir)) {
    fs.mkdirSync(nvuDir, { recursive: true });
  }
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const downloadUrl = getDownloadUrl(binaryName);
  const ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  const tempPath = path.join(os.tmpdir(), `nvu-shim-${Date.now()}${ext}`);

  console.log(`postinstall: Downloading shim binary for ${os.platform()}-${os.arch()}...`);

  try {
    await downloadFile(downloadUrl, tempPath);
    console.log('postinstall: Extracting shim binary...');
    extractAndInstall(tempPath, binDir, binaryName);

    // Clean up temp file
    fs.unlinkSync(tempPath);

    console.log('postinstall: Shim installed successfully!');
    printInstructions(true);
  } catch (err) {
    // Clean up temp file if it exists
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    if (err.message.includes('404')) {
      console.log('postinstall: Shim binaries not yet published to GitHub releases.');
      console.log('');
      console.log('To build and install shims locally:');
      console.log('  cd node_modules/node-version-use/shim');
      console.log('  make install');
      console.log('');
      console.log('Or wait for the next release which will include pre-built binaries.');
    } else {
      console.log(`postinstall warning: Failed to install shim: ${err.message}`);
      console.log('You can still use nvu with explicit versions: nvu 18 npm test');
      console.log('To install shims manually: cd node_modules/node-version-use/shim && make install');
    }
    printInstructions(false);
    process.exit(0); // Don't fail the npm install
  }
}

main().catch((err) => {
  console.log(`postinstall warning: ${err.message}`);
  process.exit(0); // Don't fail the npm install
});
