/**
 * Resolve system binaries by searching PATH while excluding ~/.nvu/bin
 * This mirrors the Go binary's findSystemBinary() function
 */
import fs from 'fs';
import path from 'path';
import { homedir } from '../compat.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const nvuBinDir = path.join(homedir(), '.nvu', 'bin');

/**
 * Check if two paths are equal (case-insensitive on Windows)
 */
function pathsEqual(a: string, b: string): boolean {
  if (isWindows) {
    return a.toLowerCase() === b.toLowerCase();
  }
  return a === b;
}

/**
 * Check if a path is within the nvu bin directory
 */
function isInNvuBin(filePath: string): boolean {
  try {
    const realPath = fs.realpathSync(filePath);
    return realPath.indexOf(path.join('.nvu', 'bin')) >= 0 || pathsEqual(path.dirname(realPath), nvuBinDir);
  } catch (_e) {
    return false;
  }
}

/**
 * Find a system binary by searching PATH, excluding ~/.nvu/bin
 * Returns the full path to the binary, or null if not found
 */
export function resolveSystemBinary(name: string): string | null {
  const pathEnv = process.env.PATH || '';
  const pathSep = isWindows ? ';' : ':';
  const dirs = pathEnv.split(pathSep);

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

        // Make sure it's not in ~/.nvu/bin (via symlink)
        if (isInNvuBin(candidate)) continue;

        return candidate;
      } catch (_e) {
        // File doesn't exist, continue
      }
    }
  }

  return null;
}

/**
 * Get PATH with ~/.nvu/bin removed
 * Used to create an environment for spawning system commands
 */
export function getPathWithoutNvuBin(): string {
  const pathEnv = process.env.PATH || '';
  const pathSep = isWindows ? ';' : ':';
  const dirs = pathEnv.split(pathSep);

  const filtered: string[] = [];
  for (let i = 0; i < dirs.length; i++) {
    const dir = dirs[i];
    if (!dir) continue;
    if (pathsEqual(dir, nvuBinDir)) continue;
    if (dir.indexOf(path.join('.nvu', 'bin')) >= 0) continue;
    filtered.push(dir);
  }

  return filtered.join(pathSep);
}
