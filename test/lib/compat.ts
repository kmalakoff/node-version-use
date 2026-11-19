/**
 * Test Compatibility Layer for Node.js 0.8+
 * Uses native fs functions when available, falls back to ponyfills for old Node.
 */

import fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import Module from 'module';
import os from 'os';
import path from 'path';
import url from 'url';

// Use existing require in CJS, or createRequire in ESM (Node 12.2+)
const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const packageRoot = path.join(__dirname, '..', '..');

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE ?? '');

/**
 * Make a unique empty folder in the system temp directory, outside the repository, so nothing
 * of the repo (an .nvmrc, a package.json) sits above it for a walk-up lookup to find.
 * Uses native fs.mkdtempSync on Node 5.10+, falls back to a random suffix with exclusive mkdir.
 * os.tmpdir() exists from Node 0.9.9; Node 0.8 calls it os.tmpDir().
 */
export function mkdtempSystem(prefix: string): string {
  const base = typeof os.tmpdir === 'function' ? os.tmpdir() : (os as unknown as { tmpDir(): string }).tmpDir();
  if (typeof fs.mkdtempSync === 'function') return fs.mkdtempSync(path.join(base, prefix));
  for (;;) {
    const dir = path.join(base, prefix + Math.random().toString(36).slice(2, 8));
    try {
      fs.mkdirSync(dir, 0o700); // fails with EEXIST rather than reusing another run's folder
      return dir;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  }
}

/**
 * Recursively remove a directory and its contents.
 */
export function rmRecursive(dir: string): void {
  safeRmSync(dir, { recursive: true, force: true });
}

/**
 * Create a directory recursively.
 * Uses native fs.mkdirSync({recursive}) on Node 10.12+, falls back to mkdirp-classic.
 */
// Native fs.mkdirSync({ recursive }) from Node 10.12, mkdirp-classic below
const nodeVersion = process.versions.node.split('.');
const hasRecursiveMkdir = +nodeVersion[0] > 10 || (+nodeVersion[0] === 10 && +nodeVersion[1] >= 12);
export function mkdirRecursive(dir: string): void {
  if (hasRecursiveMkdir) return fs.mkdirSync(dir, { recursive: true }) as void;
  const mkdirp = _require('mkdirp-classic');
  mkdirp.sync(dir);
}

/**
 * Copy a file.
 * Uses native fs.copyFileSync on Node 8.5+, falls back to fs-copy-compat.
 */
const hasCopyFileSync = typeof fs.copyFileSync === 'function';
export function copyFileSync(src: string, dest: string): void {
  if (hasCopyFileSync) return fs.copyFileSync(src, dest);
  const copy = _require('fs-copy-compat');
  copy.copyFileSync(src, dest);
}

/**
 * Find an element in an array.
 * Uses native Array.prototype.find on Node 4+, falls back to manual iteration.
 */
export function arrayFind<T>(arr: T[], predicate: (item: T, index: number, arr: T[]) => boolean): T | undefined {
  if (typeof arr.find === 'function') return arr.find(predicate);
  for (let i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) return arr[i];
  }
  return undefined;
}

/**
 * Check if a string starts with a search string.
 * Uses native String.prototype.startsWith on Node 4+, falls back to indexOf.
 */
const hasStartsWith = typeof String.prototype.startsWith === 'function';
export function stringStartsWith(str: string, search: string, position?: number): boolean {
  if (hasStartsWith) return str.startsWith(search, position);
  position = position || 0;
  return str.indexOf(search, position) === position;
}

const hasEndsWith = typeof String.prototype.endsWith === 'function';
export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) return str.endsWith(search, position);
  const len = position === undefined ? str.length : position;
  return len >= search.length && str.lastIndexOf(search) === len - search.length;
}

/**
 * Get path to the shim directory the binary suites run against.
 * Populated by `npm run build:binary`, never the user's own ~/.nvu/bin.
 */
export function getTestBinaryBin(): string {
  return path.join(packageRoot, '.tmp', 'binary', 'bin');
}

/**
 * Check if binaries are available (built by `npm run build:binary`).
 */
export function hasTestBinaries(): boolean {
  const binaryName = isWindows ? 'node.exe' : 'node';
  return fs.existsSync(path.join(getTestBinaryBin(), binaryName));
}

/**
 * Get the PATH the binary suites spawn with: this node and nothing else.
 * The shims are addressed by absolute path, and leaving the real PATH out keeps a
 * developer's own ~/.nvu/bin from answering instead of the freshly built binary.
 */
export function getTestBinaryPath(): string {
  return path.dirname(process.execPath);
}
