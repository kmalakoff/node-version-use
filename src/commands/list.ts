import exit from 'exit-compat';
import fs from 'fs';
import path from 'path';
import { readdirWithTypes } from '../compat.ts';
import { storagePath } from '../constants.ts';
import compareVersions from '../lib/compareVersions.ts';

/**
 * nvu list
 *
 * List all installed Node versions.
 */
export default function listCmd(_args: string[]): void {
  const versionsPath = path.join(storagePath, 'installed');

  // Check if versions directory exists
  if (!fs.existsSync(versionsPath)) {
    console.log('No Node versions installed.');
    console.log('Install a version: nvu install <version>');
    exit(0);
    return;
  }

  // Read all directories in versions folder
  const entries = readdirWithTypes(versionsPath);
  const versions = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  if (versions.length === 0) {
    console.log('No Node versions installed.');
    console.log('Install a version: nvu install <version>');
    exit(0);
    return;
  }

  // Get the current default
  const defaultFilePath = path.join(storagePath, 'default');
  let defaultVersion = '';
  if (fs.existsSync(defaultFilePath)) {
    defaultVersion = fs.readFileSync(defaultFilePath, 'utf8').trim();
  }

  console.log('Installed Node versions:');
  versions.sort(compareVersions);
  for (let i = 0; i < versions.length; i++) {
    const version = versions[i];
    const isDefault = version === defaultVersion || `v${version}` === defaultVersion || version === `v${defaultVersion}`;
    const marker = isDefault ? ' (default)' : '';
    console.log(`  ${version}${marker}`);
  }
  exit(0);
}
