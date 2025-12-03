/**
 * Compatibility Layer for Node.js 0.8+
 * Local to this package - contains only needed functions.
 */
import os from 'os';

var hasHomedir = typeof os.homedir === 'function';

export function homedir(): string {
  if (hasHomedir) {
    return os.homedir();
  }
  var home = require('homedir-polyfill');
  return home();
}

/**
 * String.prototype.endsWith wrapper for Node.js 0.8+
 * - Uses native endsWith on Node 4.0+ / ES2015+
 * - Falls back to lastIndexOf on Node 0.8-3.x
 */
var hasEndsWith = typeof String.prototype.endsWith === 'function';

export function stringEndsWith(str: string, search: string, position?: number): boolean {
  if (hasEndsWith) {
    return str.endsWith(search, position);
  }
  var len = position === undefined ? str.length : position;
  return str.lastIndexOf(search) === len - search.length;
}
