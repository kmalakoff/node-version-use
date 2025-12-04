/**
 * Test Compatibility Layer for Node.js 0.8+
 * Uses native fs functions when available, falls back to ponyfills for old Node.
 */
import fs from 'fs';

var hasRmSync = typeof fs.rmSync === 'function';
var hasCopyFileSync = typeof fs.copyFileSync === 'function';
var hasRecursiveMkdir = +process.versions.node.split('.')[0] >= 10;

/**
 * Recursively remove a directory and its contents.
 * Uses native fs.rmSync on Node 14.14+, falls back to rimraf2 on older versions.
 */
export function rmRecursive(dir: string): void {
  if (hasRmSync) {
    fs.rmSync(dir, { recursive: true, force: true });
  } else {
    var rimraf = require('rimraf2');
    rimraf.sync(dir);
  }
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
    copy.sync(src, dest);
  }
}
