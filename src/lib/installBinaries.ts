import envPathKey from 'env-path-key';
import fs from 'fs';
import path from 'path';
import { mkdirpSync, stringEndsWith } from '../compat.ts';
import { storagePath } from '../constants.ts';
import { resolvePlatformBinary } from './platformBinary.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE ?? '');
const ext = isWindows ? '.exe' : '';

// Every shim is a copy of the same binary; it dispatches on the name it was invoked as.
const SHIMS = ['nvu', 'node', 'npm', 'npx', 'corepack'];

// fs.copyFileSync is Node 8.5+ and the floor is 0.8
function copyFileSync(src: string, dest: string): void {
  fs.writeFileSync(dest, fs.readFileSync(src));
}

function removeIfExistsSync(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
  } catch (_e) {
    // ignore cleanup errors
  }
}

/**
 * Windows refuses to unlink a running executable, so rename it aside and sweep it up next run.
 */
function moveOutOfWay(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  try {
    fs.unlinkSync(filePath);
    return;
  } catch (_e) {
    // locked by a running process
  }
  try {
    fs.renameSync(filePath, `${filePath}.old-${Date.now()}`);
  } catch (_e2) {
    // still held: the rename onto it below reports the failure
  }
}

function cleanupOldFiles(dir: string): void {
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch (_e) {
    return;
  }
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].indexOf('.old-') < 0) continue;
    removeIfExistsSync(path.join(dir, entries[i]));
  }
}

/**
 * Copy the nvu binary over every other shim in the bin directory.
 * Best effort: a shim held open by a running process keeps its current version, and says so.
 */
export function syncAllShims(binDir: string): void {
  const source = path.join(binDir, `nvu${ext}`);
  if (!fs.existsSync(source)) return;

  try {
    const entries = fs.readdirSync(binDir);
    for (let i = 0; i < entries.length; i++) {
      const name = entries[i];
      if (name === `nvu${ext}` || name === 'nvu.json') continue;
      if (isWindows && !stringEndsWith(name, '.exe')) continue;

      const shimPath = path.join(binDir, name);
      if (!fs.statSync(shimPath).isFile()) continue;

      moveOutOfWay(shimPath);
      copyFileSync(source, shimPath);
      if (!isWindows) fs.chmodSync(shimPath, 0o755);
    }
  } catch (err) {
    console.log(`warning: could not sync every shim in ${binDir}: ${(err as Error).message || err}`);
  }
}

export function printInstructions(): void {
  console.log('nvu binaries installed in ~/.nvu/bin/');

  const envPath = process.env[envPathKey()] || '';
  if (envPath.indexOf('.nvu/bin') >= 0) return; // path exists

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
}

/**
 * Install the shims into ~/.nvu/bin from this platform's binary package.
 * Returns false when they already match the installed package, true once written.
 */
export function installBinaries(options: { force?: boolean }): boolean {
  const binary = resolvePlatformBinary();
  if (!fs.existsSync(binary.path)) throw new Error(`nvu binary missing from its package: ${binary.path}`);

  const binDir = path.join(storagePath, 'bin');
  const nvuJsonPath = path.join(binDir, 'nvu.json');

  if (!options.force) {
    try {
      if (JSON.parse(fs.readFileSync(nvuJsonPath, 'utf8')).binaryVersion === binary.version) return false;
    } catch (_e) {
      // no marker or unreadable: install
    }
  }

  mkdirpSync(binDir);
  cleanupOldFiles(binDir);

  // Stage beside the destination so each rename lands on the same filesystem.
  const timestamp = Date.now();
  const staged = SHIMS.map((name) => path.join(binDir, `${name}.tmp-${timestamp}${ext}`));
  try {
    for (let i = 0; i < SHIMS.length; i++) {
      copyFileSync(binary.path, staged[i]);
      if (!isWindows) fs.chmodSync(staged[i], 0o755);
    }
  } catch (err) {
    for (let i = 0; i < staged.length; i++) removeIfExistsSync(staged[i]);
    throw err;
  }

  for (let i = 0; i < SHIMS.length; i++) {
    const finalPath = path.join(binDir, `${SHIMS[i]}${ext}`);
    moveOutOfWay(finalPath);
    fs.renameSync(staged[i], finalPath);
  }

  fs.writeFileSync(nvuJsonPath, `${JSON.stringify({ binaryVersion: binary.version }, null, 2)}\n`, 'utf8');
  return true;
}
