import exit from 'exit';
import fs from 'fs';
import path from 'path';
import { storagePath } from '../constants.ts';

/**
 * nvu list
 *
 * List all installed Node versions.
 */
export default function listCmd(_args: string[]): void {
  const versionsPath = path.join(storagePath, 'versions');

  // Check if versions directory exists
  if (!fs.existsSync(versionsPath)) {
    console.log('No Node versions installed.');
    console.log('Install a version: nvu install <version>');
    exit(0);
    return;
  }

  // Read all directories in versions folder
  const entries = fs.readdirSync(versionsPath, { withFileTypes: true });
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

  // Sort versions (simple string sort, could be improved with semver)
  versions.sort((a, b) => {
    const aParts = a.split('.').map((n) => parseInt(n, 10) || 0);
    const bParts = b.split('.').map((n) => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal !== bVal) return bVal - aVal; // Descending order
    }
    return 0;
  });

  console.log('Installed Node versions:');
  for (const version of versions) {
    const isDefault = version === defaultVersion || `v${version}` === defaultVersion || version === `v${defaultVersion}`;
    const marker = isDefault ? ' (default)' : '';
    console.log(`  ${version}${marker}`);
  }
  exit(0);
}
