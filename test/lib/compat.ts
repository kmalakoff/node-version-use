/**
 * Test Compatibility Layer for Node.js 0.8+
 * Uses native fs functions when available, falls back to ponyfills for old Node.
 */
import fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import os from 'os';
import path from 'path';

var hasCopyFileSync = typeof fs.copyFileSync === 'function';
var hasRecursiveMkdir = +process.versions.node.split('.')[0] >= 10;
var hasTmpdir = typeof os.tmpdir === 'function';

/**
 * Find project root by searching for package.json going up from cwd.
 */
function findProjectRoot(): string {
  var dir = process.cwd();
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return process.cwd();
}

/**
 * Get the system temp directory.
 * Uses native os.tmpdir on Node 0.10+, falls back to os-shim.
 */
export function tmpdir(): string {
  if (hasTmpdir) {
    return os.tmpdir();
  }
  var osShim = require('os-shim');
  return osShim.tmpdir();
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
export function mkdirRecursive(dir: string): void {
  if (hasRecursiveMkdir) {
    fs.mkdirSync(dir, { recursive: true });
  } else {
    var mkdirp = require('mkdirp-classic');
    mkdirp.sync(dir);
  }
}

/**
 * Copy a file.
 * Uses native fs.copyFileSync on Node 8.5+, falls back to fs-copy-compat.
 */
export function copyFileSync(src: string, dest: string): void {
  if (hasCopyFileSync) {
    fs.copyFileSync(src, dest);
  } else {
    var copy = require('fs-copy-compat');
    copy.copyFileSync(src, dest);
  }
}

/**
 * Find an element in an array.
 * Uses native Array.prototype.find on Node 4+, falls back to manual iteration.
 */
export function arrayFind<T>(arr: T[], predicate: (item: T, index: number, arr: T[]) => boolean): T | undefined {
  if (typeof arr.find === 'function') {
    return arr.find(predicate);
  }
  for (var i = 0; i < arr.length; i++) {
    if (predicate(arr[i], i, arr)) return arr[i];
  }
  return undefined;
}

/**
 * Check if a string starts with a search string.
 * Uses native String.prototype.startsWith on Node 4+, falls back to indexOf.
 */
export function stringStartsWith(str: string, search: string, position?: number): boolean {
  if (typeof str.startsWith === 'function') {
    return str.startsWith(search, position);
  }
  position = position || 0;
  return str.indexOf(search, position) === position;
}

/**
 * Get path to test binaries directory.
 * These are locally-built binaries in .tmp/binary/bin/, isolated from ~/.nvu/bin/
 */
export function getTestBinaryBin(): string {
  return path.join(findProjectRoot(), '.tmp', 'binary', 'bin');
}

/**
 * Check if test binaries are available (built).
 */
export function hasTestBinaries(): boolean {
  var binaryName = process.platform === 'win32' ? 'node.exe' : 'node';
  return fs.existsSync(path.join(getTestBinaryBin(), binaryName));
}

/**
 * Get PATH with test binaries prepended (and global binaries removed).
 * Use this for integration tests that need to run through the binary.
 */
export function getTestBinaryPath(): string {
  var testBinaryBin = getTestBinaryBin();
  var filteredPath = (process.env.PATH || '')
    .split(path.delimiter)
    .filter((p) => p.indexOf('.nvu/bin') === -1)
    .join(path.delimiter);
  return testBinaryBin + path.delimiter + filteredPath;
}

/**
 * Get PATH with global binaries removed (bypass all binaries).
 * Use this for unit tests that should test CLI directly.
 */
export function getFilteredPath(): string {
  return (process.env.PATH || '')
    .split(path.delimiter)
    .filter((p) => p.indexOf('.nvu/bin') === -1)
    .join(path.delimiter);
}
