const envPathKey = require('env-path-key');
const fs = require('fs');
const { safeRmSync } = require('fs-remove-compat');
const getFile = require('get-file-compat');
const mkdirp = require('mkdirp-classic');
const os = require('os');
const path = require('path');
const Queue = require('queue-cb');
const moduleRoot = require('module-root-sync');

const root = moduleRoot(__dirname);

// Configuration
const GITHUB_REPO = 'kmalakoff/node-version-use';
const BINARY_VERSION = require(path.join(root, 'package.json')).binaryVersion;

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

type Callback = (err?: Error | null) => void;

interface PlatformMap {
  [key: string]: string;
}

const hasHomedir = typeof os.homedir === 'function';
function homedir(): string {
  if (hasHomedir) return os.homedir();
  const home = require('homedir-polyfill');
  return home();
}

// Allow NVU_HOME override for testing
const storagePath = (process.env.NVU_HOME || path.join(homedir(), '.nvu')) as string;

const hasTmpdir = typeof os.tmpdir === 'function';
function tmpdir(): string {
  if (hasTmpdir) return os.tmpdir();
  const osShim = require('os-shim');
  return osShim.tmpdir();
}

function removeIfExistsSync(filePath: string): void {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
    } catch (_e) {
      // ignore cleanup errors
    }
  }
}

/**
 * On Windows, rename a file out of the way instead of deleting.
 * This works even if the file is currently running.
 */
function moveOutOfWay(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const timestamp = Date.now();
  const oldPath = `${filePath}.old-${timestamp}`;

  try {
    fs.renameSync(filePath, oldPath);
  } catch (_e) {
    // If rename fails, try delete as fallback (works on Unix)
    try {
      fs.unlinkSync(filePath);
    } catch (_e2) {
      // ignore - will fail on atomic rename instead
    }
  }
}

/**
 * Clean up old .old-* files from previous installs
 */
function cleanupOldFiles(dir: string): void {
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (entry.includes('.old-')) {
        try {
          fs.unlinkSync(path.join(dir, entry));
        } catch (_e) {
          // ignore - file may still be in use
        }
      }
    }
  } catch (_e) {
    // ignore if dir doesn't exist
  }
}

/**
 * Get the platform-specific archive base name (without extension)
 */
function getArchiveBaseName(): string | null {
  const { platform, arch } = process;

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

  if (!platformName || !archName) return null;
  return `nvu-binary-${platformName}-${archName}`;
}

/**
 * Copy file
 */
function copyFileSync(src: string, dest: string): void {
  const content = fs.readFileSync(src);
  fs.writeFileSync(dest, content);
}

/**
 * Move a file out of the way (works even if running on Windows)
 */
function moveOutOfWay(filePath: string): void {
  if (!fs.existsSync(filePath)) return;

  const timestamp = Date.now();
  const oldPath = `${filePath}.old-${timestamp}`;

  try {
    fs.renameSync(filePath, oldPath);
  } catch (_e) {
    // If rename fails, try delete as fallback (works on Unix)
    try {
      fs.unlinkSync(filePath);
    } catch (_e2) {
      // ignore - will fail on atomic rename instead
    }
  }
}

/**
 * Sync all shims by copying the nvu binary to all other files in the bin directory
 * All shims (node, npm, npx, corepack, eslint, etc.) are copies of the same binary
 */
module.exports.syncAllShims = function syncAllShims(binDir: string): void {
  const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
  const ext = isWindows ? '.exe' : '';

  // Source: nvu binary
  const nvuSource = path.join(binDir, `nvu${ext}`);
  if (!fs.existsSync(nvuSource)) return;

  try {
    const entries = fs.readdirSync(binDir);
    for (const name of entries) {
      // Skip nvu itself (it's the source)
      if (name === `nvu${ext}`) continue;

      // On Windows, only process .exe files
      if (isWindows && !name.endsWith('.exe')) continue;

      const shimPath = path.join(binDir, name);
      const stat = fs.statSync(shimPath);
      if (!stat.isFile()) continue;

      // Move existing file out of the way (Windows compatibility)
      moveOutOfWay(shimPath);

      // Copy nvu binary to shim
      copyFileSync(nvuSource, shimPath);

      // Make executable on Unix
      if (!isWindows) {
        fs.chmodSync(shimPath, 0o755);
      }
    }
  } catch (_e) {
    // Ignore errors - shim sync is best effort
  }
};

/**
 * Atomic rename with fallback to copy+delete for cross-device moves
 */
function atomicRename(src: string, dest: string, callback: Callback) {
  fs.rename(src, dest, (err) => {
    if (!err) return callback(null);

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
 * Extract archive to a directory (callback-based)
 */
function extractArchive(archivePath: string, dest: string, callback: Callback) {
  const Iterator = isWindows ? require('zip-iterator') : require('tar-iterator');
  const stream = isWindows ? fs.createReadStream(archivePath) : fs.createReadStream(archivePath).pipe(require('zlib').createGunzip());
  let iterator = new Iterator(stream);

  // one by one
  const links = [];
  iterator.forEach(
    (entry, callback) => {
      if (entry.type === 'link') {
        links.unshift(entry);
        callback();
      } else if (entry.type === 'symlink') {
        links.push(entry);
        callback();
      } else entry.create(dest, callback);
    },
    { callbacks: true, concurrency: 1 },
    (_err) => {
      // create links after directories and files
      const queue = new Queue();
      for (let index = 0; index < links.length; index++) {
        const entry = links[index];
        queue.defer(entry.create.bind(entry, dest));
      }
      queue.await((err) => {
        iterator.destroy();
        iterator = null;
        callback(err);
      });
    }
  );
}

/**
 * Install binaries using atomic rename pattern
 * 1. Extract to temp directory
 * 2. Copy binary to temp files in destination directory
 * 3. Atomic rename temp files to final names
 */
function extractAndInstall(archivePath: string, destDir: string, binaryName: string, callback: Callback) {
  const ext = isWindows ? '.exe' : '';

  // Create temp extraction directory
  const tempExtractDir = path.join(tmpdir(), `nvu-extract-${Date.now()}`);
  mkdirp.sync(tempExtractDir);

  extractArchive(archivePath, tempExtractDir, (err) => {
    if (err) {
      safeRmSync(tempExtractDir);
      callback(err);
      return;
    }

    const extractedPath = path.join(tempExtractDir, binaryName);
    if (!fs.existsSync(extractedPath)) {
      safeRmSync(tempExtractDir);
      callback(new Error(`Extracted binary not found: ${binaryName}. ${archivePath} ${tempExtractDir}`));
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
        if (!isWindows) fs.chmodSync(tempDest, 0o755);
      } catch (err) {
        installError = err as Error;
        break;
      }
    }

    if (installError) {
      // Clean up any temp files we created
      for (let j = 0; j < binaries.length; j++) {
        const tempPath = path.join(destDir, `${binaries[j]}.tmp-${timestamp}${ext}`);
        removeIfExistsSync(tempPath);
      }
      safeRmSync(tempExtractDir);
      callback(installError);
      return;
    }

    // Step 2: Atomic rename temp files to final names
    let renameError: Error | null = null;

    function doRename(index: number): void {
      if (index >= binaries.length) {
        // All renames complete
        safeRmSync(tempExtractDir);
        callback(renameError);
        return;
      }

      const name = binaries[index];
      const tempDest = path.join(destDir, `${name}.tmp-${timestamp}${ext}`);
      const finalDest = path.join(destDir, `${name}${ext}`);

      // Move existing file out of the way (works even if running on Windows)
      moveOutOfWay(finalDest);

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
module.exports.printInstructions = function printInstructions(): void {
  const _nvuBinPath = path.join(storagePath, 'bin');

  console.log('nvu binaries installed in ~/.nvu/bin/');

  const pathKey = envPathKey();
  const envPath = process.env[pathKey] || '';
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
 */
module.exports.installBinaries = function installBinaries(options, callback): void {
  const archiveBaseName = getArchiveBaseName();

  if (!archiveBaseName) {
    callback(new Error('Unsupported platform/architecture for binary.'));
    return;
  }

  const extractedBinaryName = `${archiveBaseName}${isWindows ? '.exe' : ''}`;
  const binDir = path.join(storagePath, 'bin');

  // check if we need to upgrade
  if (!options.force) {
    try {
      // already installed
      if (fs.statSync(binDir)) {
        if (fs.readFileSync(path.join(binDir, 'version.txt'), 'utf8') === BINARY_VERSION) {
          callback(null, false);
          return;
        }
      }
    } catch (_err) {}
  }

  // Create directories
  mkdirp.sync(storagePath);
  mkdirp.sync(binDir);

  // Clean up old .old-* files from previous installs
  cleanupOldFiles(binDir);

  const downloadUrl = `https://github.com/${GITHUB_REPO}/releases/download/binary-v${BINARY_VERSION}/${archiveBaseName}${isWindows ? '.zip' : '.tar.gz'}`;
  const tempPath = path.join(tmpdir(), `nvu-binary-${Date.now()}${isWindows ? '.zip' : '.tar.gz'}`);

  console.log(`Downloading binary for ${process.platform}-${process.arch}...`);

  getFile(downloadUrl, tempPath, (err) => {
    if (err) {
      removeIfExistsSync(tempPath);
      callback(new Error(`No prebuilt binary available for ${process.platform}-${process.arch}. Download: ${downloadUrl}. Error: ${err.message}`));
      return;
    }

    console.log('Extracting binary...');

    extractAndInstall(tempPath, binDir, extractedBinaryName, (err) => {
      removeIfExistsSync(tempPath);
      if (err) return callback(err);

      // save binary version for upgrade checks
      fs.writeFileSync(path.join(binDir, 'version.txt'), BINARY_VERSION, 'utf8');
      console.log('Binary installed successfully!');
      callback(null, true);
    });
  });
};
