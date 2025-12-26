import envPathKey from 'env-path-key';
import fs from 'fs';
import path from 'path';
import { homedir } from '../compat.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const nvuBinDir = path.join(homedir(), '.nvu', 'bin');
const nvuInstalledDir = path.join(homedir(), '.nvu', 'installed');
const pathKey = envPathKey(); // PATH or Path or similar
const pathDelimiter = path.delimiter ? path.delimiter : isWindows ? ';' : ':';

/**
 * Check if two paths are equal (case-insensitive on Windows)
 */
function pathsEqual(a: string, b: string): boolean {
  if (isWindows) return a.toLowerCase() === b.toLowerCase();
  return a === b;
}

/**
 * Check if a path is within the nvu bin directory or installed versions
 */
function isInNvuDir(filePath: string): boolean {
  try {
    const realPath = fs.realpathSync(filePath);
    // Check for .nvu/bin or .nvu/installed
    return realPath.indexOf(path.join('.nvu', 'bin')) >= 0 || realPath.indexOf(path.join('.nvu', 'installed')) >= 0 || pathsEqual(path.dirname(realPath), nvuBinDir) || pathsEqual(path.dirname(realPath), nvuInstalledDir);
  } catch (_e) {
    return false;
  }
}

/**
 * Find a system binary by searching PATH, excluding ~/.nvu/bin and version directories
 * Returns the full path to the binary, or null if not found
 * NOTE: Keep in sync with Node.js resolveSystemBinary
 */
export function resolveSystemBinary(name: string): string | null {
  const pathEnv = process.env[pathKey] || '';
  const dirs = pathEnv.split(pathDelimiter);

  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (!dir) continue;

    // Skip ~/.nvu/bin
    if (pathsEqual(dir, nvuBinDir)) continue;

    // Build candidate path with appropriate extension
    const candidates = isWindows ? [path.join(dir, `${name}.exe`), path.join(dir, `${name}.cmd`), path.join(dir, name)] : [path.join(dir, name)];

    for (let j = 0; j < candidates.length; j++) {
      const candidate = candidates[j];
      try {
        const stat = fs.statSync(candidate);
        if (!stat.isFile()) continue;

        // Make sure it's not in ~/.nvu/bin or ~/.nvu/installed/*/bin
        if (isInNvuDir(candidate)) continue;

        return candidate;
      } catch (_e) {
        // File doesn't exist, continue
      }
    }
  }

  return null;
}

/**
 * Get PATH with ~/.nvu/bin and version directories removed
 * Used to create an environment for spawning system commands
 */
export function getPathWithoutNvuBin(): string {
  const pathEnv = process.env[pathKey] || '';
  const dirs = pathEnv.split(pathDelimiter);

  const filtered: string[] = [];
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (!dir) continue;
    if (pathsEqual(dir, nvuBinDir)) continue;
    if (dir.indexOf(path.join('.nvu', 'bin')) >= 0) continue;
    if (dir.indexOf(path.join('.nvu', 'installed')) >= 0) continue;
    filtered.push(dir);
  }

  return filtered.join(pathDelimiter);
}
