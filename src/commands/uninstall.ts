import exit from 'exit';
import fs from 'fs';
import path from 'path';
import { readdirWithTypes, rmSync } from '../compat.ts';
import { storagePath } from '../constants.ts';

/**
 * nvu uninstall <version>
 *
 * Remove an installed Node version.
 */
export default function uninstallCmd(args: string[]): void {
  if (args.length === 0) {
    console.log('Usage: nvu uninstall <version>');
    console.log('Example: nvu uninstall 20');
    console.log('         nvu uninstall v20.19.6');
    exit(1);
    return;
  }

  var version = args[0].trim();
  var versionsPath = path.join(storagePath, 'installed');

  // Find all matching installed versions
  var matches = findInstalledVersions(versionsPath, version);

  if (matches.length === 0) {
    console.log(`Node ${version} is not installed.`);
    console.log('');
    console.log('Installed versions:');
    listInstalledVersions(versionsPath);
    exit(1);
    return;
  }

  if (matches.length > 1) {
    console.log(`Multiple versions match "${version}":`);
    for (var i = 0; i < matches.length; i++) {
      console.log(`  ${matches[i]}`);
    }
    console.log('');
    console.log('Please specify the exact version to uninstall.');
    exit(1);
    return;
  }

  var installedVersion = matches[0];
  var versionPath = path.join(versionsPath, installedVersion);

  // Check if this is the current default
  var defaultPath = path.join(storagePath, 'default');
  var isDefault = false;
  if (fs.existsSync(defaultPath)) {
    var defaultVersion = fs.readFileSync(defaultPath, 'utf8').trim();
    var normalizedDefault = defaultVersion.replace(/^v/, '');
    var normalizedInstalled = installedVersion.replace(/^v/, '');

    // Check if default matches this version
    if (normalizedInstalled === normalizedDefault || normalizedInstalled.indexOf(`${normalizedDefault}.`) === 0) {
      isDefault = true;
    }
  }

  // Remove the version directory
  try {
    rmSync(versionPath);
    console.log(`Removed Node ${installedVersion}`);

    if (isDefault) {
      // Clear the default since it's no longer installed
      fs.unlinkSync(defaultPath);
      console.log('');
      console.log('Note: This was your default version. Set a new default with:');
      console.log('  nvu default <version>');
    }
  } catch (err) {
    console.error(`Failed to remove Node ${installedVersion}:`, (err as Error).message);
    exit(1);
    return;
  }

  exit(0);
}

/**
 * Find all installed versions matching the given version string
 */
function findInstalledVersions(versionsPath: string, version: string): string[] {
  if (!fs.existsSync(versionsPath)) {
    return [];
  }

  var normalizedVersion = version.replace(/^v/, '');
  var matches: string[] = [];

  // Try exact matches first
  var exactMatches = [version, `v${normalizedVersion}`, normalizedVersion];
  for (var i = 0; i < exactMatches.length; i++) {
    var v = exactMatches[i];
    var versionPath = path.join(versionsPath, v);
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
  var entries = readdirWithTypes(versionsPath);
  for (var j = 0; j < entries.length; j++) {
    var entry = entries[j];
    if (!entry.isDirectory()) continue;
    var dirVersion = entry.name.replace(/^v/, '');
    if (dirVersion.indexOf(`${normalizedVersion}.`) === 0) {
      matches.push(entry.name);
    }
  }

  return matches;
}

/**
 * List installed versions for user reference
 */
function listInstalledVersions(versionsPath: string): void {
  if (!fs.existsSync(versionsPath)) {
    console.log('  (none)');
    return;
  }

  var entries = readdirWithTypes(versionsPath);
  var versions: string[] = [];
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].isDirectory()) {
      versions.push(entries[i].name);
    }
  }

  if (versions.length === 0) {
    console.log('  (none)');
  } else {
    for (var j = 0; j < versions.length; j++) {
      console.log(`  ${versions[j]}`);
    }
  }
}
