import fs from 'fs';
import path from 'path';
import { readdirWithTypes } from '../compat.ts';
import compareVersions from './compareVersions.ts';

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
  return matches.sort(compareVersions);
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
