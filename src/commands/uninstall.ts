import exit from 'exit-compat';
import fs from 'fs';
import path from 'path';
import { rmSync } from '../compat.ts';
import { storagePath } from '../constants.ts';
import { findInstalledVersions, getAllInstalledVersions } from '../lib/findInstalledVersions.ts';

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

  // Check if this is the current default (exact match since we store exact versions)
  var defaultPath = path.join(storagePath, 'default');
  if (fs.existsSync(defaultPath)) {
    var defaultVersion = fs.readFileSync(defaultPath, 'utf8').trim();

    // Normalize both for comparison
    var normalizedDefault = defaultVersion.replace(/^v/, '');
    var normalizedInstalled = installedVersion.replace(/^v/, '');

    if (normalizedInstalled === normalizedDefault) {
      console.error(`Cannot uninstall default version ${installedVersion}.`);
      console.error('');
      console.error('Change your default first:');
      console.error('  nvu default <version>');
      exit(1);
      return;
    }
  }

  // Remove the version directory
  try {
    rmSync(versionPath);
    console.log(`Removed Node ${installedVersion}`);
  } catch (err) {
    console.error(`Failed to remove Node ${installedVersion}:`, (err as Error).message);
    exit(1);
    return;
  }

  exit(0);
}

/**
 * List installed versions for user reference
 */
function listInstalledVersions(versionsPath: string): void {
  var versions = getAllInstalledVersions(versionsPath);

  if (versions.length === 0) {
    console.log('  (none)');
  } else {
    for (var i = 0; i < versions.length; i++) {
      console.log(`  ${versions[i]}`);
    }
  }
}
