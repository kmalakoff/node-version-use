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

import { spawn } from 'child_process';
import exit from 'exit-compat';
import fs from 'fs';
import mkdirp from 'mkdirp-classic';
import Module from 'module';
import os from 'os';
import path from 'path';
import url from 'url';
import { homedir } from '../compat.ts';

// CJS/ESM compatibility
const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

// Configuration
const GITHUB_REPO = 'kmalakoff/node-version-use';
// Path is relative to dist/cjs/scripts/ at runtime
const BINARY_VERSION = _require(path.join(__dirname, '..', '..', '..', 'package.json')).binaryVersion;

type Callback = (err?: Error | null) => void;

interface PlatformMap {
  [key: string]: string;
}

/**
 * Get the platform-specific archive base name (without extension)
 */
function getArchiveBaseName(): string | null {
  const platform = os.platform();
  const arch = os.arch();

  const platformMap: PlatformMap = {
    darwin: 'darwin',
    linux: 'linux',
    win32: 'win32',
  };

  const archMap: PlatformMap = {
    x64: 'x64',
    arm64: 'arm64',
    amd64: 'x64',
  };

  const platformName = platformMap[platform];
  const archName = archMap[arch];

  if (!platformName || !archName) {
    return null;
  }

  return `nvu-binary-${platformName}-${archName}`;
}

/**
 * Get the extracted binary name (includes .exe on Windows)
 */
function getExtractedBinaryName(archiveBaseName: string): string {
  const ext = os.platform() === 'win32' ? '.exe' : '';
  return archiveBaseName + ext;
}

/**
 * Get the download URL for the binary archive
 */
function getDownloadUrl(archiveBaseName: string): string {
  const ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  return `https://github.com/${GITHUB_REPO}/releases/download/binary-v${BINARY_VERSION}/${archiveBaseName}${ext}`;
}

/**
 * Copy file
 */
function copyFileSync(src: string, dest: string): void {
  const content = fs.readFileSync(src);
  fs.writeFileSync(dest, content);
}

/**
 * Atomic rename with fallback to copy+delete for cross-device moves
 */
function atomicRename(src: string, dest: string, callback: Callback): void {
  fs.rename(src, dest, (err) => {
    if (!err) {
      callback(null);
      return;
    }

    // Cross-device link error - fall back to copy + delete
    if ((err as NodeJS.ErrnoException).code === 'EXDEV') {
      try {
        copyFileSync(src, dest);
        fs.unlinkSync(src);
        callback(null);
      } catch (copyErr) {
        callback(copyErr as Error);
      }
      return;
    }

    callback(err);
  });
}

/**
 * Remove directory recursively
 */
function rmRecursive(dir: string): void {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (let i = 0; i < files.length; i++) {
    const filePath = path.join(dir, files[i]);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      rmRecursive(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  }
  fs.rmdirSync(dir);
}

/**
 * Get temp directory
 */
function getTmpDir(): string {
  return typeof os.tmpdir === 'function' ? os.tmpdir() : process.env.TMPDIR || process.env.TMP || process.env.TEMP || '/tmp';
}

/**
 * Download using curl (macOS, Linux, Windows 10+)
 */
function downloadWithCurl(downloadUrl: string, destPath: string, callback: Callback): void {
  const curl = spawn('curl', ['-L', '-f', '-s', '-o', destPath, downloadUrl]);

  curl.on('close', (code) => {
    if (code !== 0) {
      // curl exit codes: 22 = HTTP error (4xx/5xx), 56 = receive error (often 404 with -f)
      if (code === 22 || code === 56) {
        callback(new Error('HTTP 404'));
      } else {
        callback(new Error(`curl failed with exit code ${code}`));
      }
      return;
    }
    callback(null);
  });

  curl.on('error', (err) => {
    callback(err);
  });
}

/**
 * Download using PowerShell (Windows 7+ fallback)
 */
function downloadWithPowerShell(downloadUrl: string, destPath: string, callback: Callback): void {
  const psCommand = `Invoke-WebRequest -Uri "${downloadUrl}" -OutFile "${destPath}" -UseBasicParsing`;
  const ps = spawn('powershell', ['-NoProfile', '-Command', psCommand]);

  ps.on('close', (code) => {
    if (code !== 0) {
      callback(new Error(`PowerShell download failed with exit code ${code}`));
      return;
    }
    callback(null);
  });

  ps.on('error', (err) => {
    callback(err);
  });
}

/**
 * Download a file - tries curl first, falls back to PowerShell on Windows
 * Node 0.8's OpenSSL doesn't support TLS 1.2+ required by GitHub
 */
function downloadFile(downloadUrl: string, destPath: string, callback: Callback): void {
  downloadWithCurl(downloadUrl, destPath, (err) => {
    if (!err) {
      callback(null);
      return;
    }

    // If curl failed and we're on Windows, try PowerShell
    if (os.platform() === 'win32' && err?.message?.indexOf('ENOENT') >= 0) {
      downloadWithPowerShell(downloadUrl, destPath, callback);
      return;
    }

    callback(err);
  });
}

/**
 * Extract archive to a directory (callback-based)
 */
function extractArchive(archivePath: string, destDir: string, callback: Callback): void {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: extract zip using PowerShell
    const ps = spawn('powershell', ['-Command', `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`]);
    ps.on('close', (code) => {
      if (code !== 0) {
        callback(new Error('Failed to extract archive'));
        return;
      }
      callback(null);
    });
  } else {
    // Unix: extract tar.gz
    const tar = spawn('tar', ['-xzf', archivePath, '-C', destDir]);
    tar.on('close', (code) => {
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
function extractAndInstall(archivePath: string, destDir: string, binaryName: string, callback: Callback): void {
  const platform = os.platform();
  const isWindows = platform === 'win32';
  const ext = isWindows ? '.exe' : '';

  // Create temp extraction directory
  const tempExtractDir = path.join(getTmpDir(), `nvu-extract-${Date.now()}`);
  mkdirp.sync(tempExtractDir);

  extractArchive(archivePath, tempExtractDir, (extractErr) => {
    if (extractErr) {
      rmRecursive(tempExtractDir);
      callback(extractErr);
      return;
    }

    const extractedPath = path.join(tempExtractDir, binaryName);
    if (!fs.existsSync(extractedPath)) {
      rmRecursive(tempExtractDir);
      callback(new Error(`Extracted binary not found: ${binaryName}`));
      return;
    }

    // Binary names to install
    const binaries = ['node', 'npm', 'npx', 'corepack'];
    const timestamp = Date.now();
    let installError: Error | null = null;

    // Step 1: Copy extracted binary to temp files in destination directory
    // This ensures the temp files are on the same filesystem for atomic rename
    for (let i = 0; i < binaries.length; i++) {
      const name = binaries[i];
      const tempDest = path.join(destDir, `${name}.tmp-${timestamp}${ext}`);

      try {
        // Copy to temp file in destination directory
        copyFileSync(extractedPath, tempDest);

        // Set permissions on Unix
        if (!isWindows) {
          fs.chmodSync(tempDest, 0o755);
        }
      } catch (err) {
        installError = err as Error;
        break;
      }
    }

    if (installError) {
      // Clean up any temp files we created
      for (let j = 0; j < binaries.length; j++) {
        const tempPath = path.join(destDir, `${binaries[j]}.tmp-${timestamp}${ext}`);
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch (_e) {
            // ignore cleanup errors
          }
        }
      }
      rmRecursive(tempExtractDir);
      callback(installError);
      return;
    }

    // Step 2: Atomic rename temp files to final names
    let renameError: Error | null = null;

    function doRename(index: number): void {
      if (index >= binaries.length) {
        // All renames complete
        rmRecursive(tempExtractDir);
        callback(renameError);
        return;
      }

      const name = binaries[index];
      const tempDest = path.join(destDir, `${name}.tmp-${timestamp}${ext}`);
      const finalDest = path.join(destDir, `${name}${ext}`);

      // Remove existing file if present (for atomic replacement)
      if (fs.existsSync(finalDest)) {
        try {
          fs.unlinkSync(finalDest);
        } catch (_e) {
          // ignore cleanup errors
        }
      }

      atomicRename(tempDest, finalDest, (err) => {
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
function printInstructions(installed: boolean): void {
  const homedirPath = homedir();
  const nvuBinPath = path.join(homedirPath, '.nvu', 'bin');
  const platform = os.platform();

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
  console.log('Then restart your terminal or source your shell profile.');
  console.log('');
  console.log("Without this, 'nvu 18 npm test' still works - you just won't have");
  console.log("transparent 'node' command override.");
  console.log('============================================================');
}

/**
 * Main installation function
 */
function main(): void {
  const archiveBaseName = getArchiveBaseName();

  if (!archiveBaseName) {
    console.log('postinstall: Unsupported platform/architecture for binary.');
    console.log(`Platform: ${os.platform()}, Arch: ${os.arch()}`);
    console.log('Binary not installed. You can still use nvu with explicit versions: nvu 18 npm test');
    exit(0);
    return;
  }

  const extractedBinaryName = getExtractedBinaryName(archiveBaseName);

  const homedirPath = homedir();
  const nvuDir = path.join(homedirPath, '.nvu');
  const binDir = path.join(nvuDir, 'bin');

  // Create directories
  mkdirp.sync(nvuDir);
  mkdirp.sync(binDir);

  const downloadUrl = getDownloadUrl(archiveBaseName);
  const ext = os.platform() === 'win32' ? '.zip' : '.tar.gz';
  const tempPath = path.join(getTmpDir(), `nvu-binary-${Date.now()}${ext}`);

  console.log(`postinstall: Downloading binary for ${os.platform()}-${os.arch()}...`);

  downloadFile(downloadUrl, tempPath, (downloadErr) => {
    if (downloadErr) {
      // Clean up temp file if it exists
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {
          // ignore cleanup errors
        }
      }

      if (downloadErr.message?.indexOf('404') >= 0) {
        console.log('postinstall: Binaries not yet published to GitHub releases.');
        console.log('');
        console.log('To build and install binaries locally:');
        console.log('  cd node_modules/node-version-use/binary');
        console.log('  make install');
        console.log('');
        console.log('Or wait for the next release which will include pre-built binaries.');
      } else {
        console.log(`postinstall warning: Failed to install binary: ${downloadErr.message || downloadErr}`);
        console.log('You can still use nvu with explicit versions: nvu 18 npm test');
        console.log('To install binaries manually: cd node_modules/node-version-use/binary && make install');
      }
      printInstructions(false);
      exit(0);
      return;
    }

    console.log('postinstall: Extracting binary...');

    extractAndInstall(tempPath, binDir, extractedBinaryName, (extractErr) => {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_e) {
          // ignore cleanup errors
        }
      }

      if (extractErr) {
        console.log(`postinstall warning: Failed to extract binary: ${extractErr.message || extractErr}`);
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
