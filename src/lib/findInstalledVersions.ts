import fs from 'fs';
import path from 'path';
import { readdirWithTypes } from '../compat.ts';

/**
 * Compare two semver version strings (e.g., "20.19.0" vs "20.9.1")
 * Returns: negative if a < b, positive if a > b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
  const aParts = a.replace(/^v/, '').split('.');
  const bParts = b.replace(/^v/, '').split('.');
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i++) {
    const aNum = parseInt(aParts[i], 10) || 0;
    const bNum = parseInt(bParts[i], 10) || 0;
    if (aNum !== bNum) {
      return aNum - bNum;
    }
  }
  return 0;
}

/**
 * Find all installed versions matching the given version string
 * Results are sorted in ascending semver order (lowest first, highest last)
 */
export function findInstalledVersions(versionsPath: string, version: string): string[] {
  if (!fs.existsSync(versionsPath)) {
    return [];
  }

  const normalizedVersion = version.replace(/^v/, '');
  const matches: string[] = [];

  // Try exact matches first
  const exactMatches = [version, `v${normalizedVersion}`, normalizedVersion];
  for (let i = 0; i < exactMatches.length; i++) {
    const v = exactMatches[i];
    const versionPath = path.join(versionsPath, v);
    if (fs.existsSync(versionPath) && fs.statSync(versionPath).isDirectory()) {
      if (matches.indexOf(v) === -1) {
        matches.push(v);
      }
    }
  }

  // If we have an exact match, return just that
  if (matches.length > 0) {
    return matches;
  }

  // Try partial match (e.g., "20" matches "v20.19.6")
  const entries = readdirWithTypes(versionsPath);
  for (let j = 0; j < entries.length; j++) {
    const entry = entries[j];
    if (!entry.isDirectory()) continue;
    const dirVersion = entry.name.replace(/^v/, '');
    if (dirVersion.indexOf(`${normalizedVersion}.`) === 0) {
      matches.push(entry.name);
    }
  }

  // Sort by semver (ascending) so highest version is last
  matches.sort(compareVersions);

  return matches;
}

/**
 * Get all installed versions
 */
export function getAllInstalledVersions(versionsPath: string): string[] {
  if (!fs.existsSync(versionsPath)) {
    return [];
  }

  const entries = readdirWithTypes(versionsPath);
  const versions: string[] = [];
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].isDirectory()) {
      versions.push(entries[i].name);
    }
  }

  return versions;
}
