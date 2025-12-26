/**
 * Test Compatibility Layer for Node.js 0.8+
 * Uses native fs functions when available, falls back to ponyfills for old Node.
 */

import envPathKey from 'env-path-key';
import fs from 'fs';
import { safeRmSync } from 'fs-remove-compat';
import os from 'os';
import path from 'path';

const hasCopyFileSync = typeof fs.copyFileSync === 'function';
const hasRecursiveMkdir = +process.versions.node.split('.')[0] >= 10;
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const pathDelimiter = path.delimiter ? path.delimiter : isWindows ? ';' : ':';
const pathKey = envPathKey(); // PATH or Path or similar

export function tmpdir(): string {
  return typeof os.tmpdir === 'function' ? os.tmpdir() : require('os-shim').tmpdir();
}
export function homedir() {
  return typeof os.homedir === 'function' ? os.homedir() : require('homedir-polyfill')();
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
    const mkdirp = require('mkdirp-classic');
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
    const copy = require('fs-copy-compat');
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
  return str.lastIndexOf(search) === len - search.length;
}

/**
 * Get path to binaries directory (~/.nvu/bin).
 * These are downloaded from GitHub releases by postinstall.
 */
export function getTestBinaryBin(): string {
  return path.join(homedir(), '.nvu', 'bin');
}

/**
 * Check if binaries are available (downloaded by postinstall).
 */
export function hasTestBinaries(): boolean {
  const binaryName = isWindows ? 'node.exe' : 'node';
  return fs.existsSync(path.join(getTestBinaryBin(), binaryName));
}

/**
 * Get PATH with nvu binaries prepended.
 * Use this for integration tests that need to run through the binary.
 */
export function getTestBinaryPath(): string {
  const nodeBinDir = path.dirname(process.execPath);
  const filteredPath = (pathKey || '')
    .split(pathDelimiter)
    .filter((p) => stringEndsWith(p, '.nvu/bin'))
    .join(pathDelimiter);
  return nodeBinDir + pathDelimiter + filteredPath;
}
