/**
 * Compatibility Layer for Node.js 0.8+
 * Local to this package - contains only needed functions.
 */
import fs from 'fs';
import _Module from 'module';
import os from 'os';
import path from 'path';

// Use existing require in CJS, or createRequire in ESM (Node 12.2+)
const _require = typeof require === 'undefined' ? _Module.createRequire(import.meta.url) : require;

export function homedir(): string {
  return typeof os.homedir === 'function' ? os.homedir() : require('homedir-polyfill')();
}

export function tmpdir(): string {
  return typeof os.tmpdir === 'function' ? os.tmpdir() : require('os-shim').tmpdir();
}

/**
 * String.prototype.endsWith wrapper for Node.js 0.8+
 * - Uses native endsWith on Node 4.0+ / ES2015+
 * - Falls back to lastIndexOf on Node 0.8-3.x
 */
const hasEndsWith = typeof String.prototype.endsWith === 'function';

export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) {
    return str.endsWith(search, position);
  }
  const len = position === undefined ? str.length : position;
  return str.lastIndexOf(search) === len - search.length;
}

/**
 * Recursive mkdir for Node.js 0.8+
 */
export function mkdirpSync(dir: string): void {
  const mkdirp = _require('mkdirp-classic');
  mkdirp.sync(dir);
}

/**
 * Recursive rm for Node.js 0.8+
 */
export function rmSync(dir: string): void {
  const safeRmSync = _require('fs-remove-compat').safeRmSync;
  safeRmSync(dir);
}

/**
 * Read directory entries with types for Node.js 0.8+
 * Returns array of {name, isDirectory()}
 */
export interface DirEntry {
  name: string;
  isDirectory(): boolean;
}

export function readdirWithTypes(dir: string): DirEntry[] {
  const names = fs.readdirSync(dir);
  return names.map((name) => {
    const fullPath = path.join(dir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fullPath);
    } catch (_e) {
      // If stat fails, treat as non-directory
      return { name: name, isDirectory: () => false };
    }
    return {
      name: name,
      isDirectory: () => stat.isDirectory(),
    };
  });
}
