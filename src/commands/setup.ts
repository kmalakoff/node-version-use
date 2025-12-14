import exit from 'exit-compat';
import fs from 'fs';
import getopts from 'getopts-compat';
import Module from 'module';
import path from 'path';
import { readdirWithTypes } from '../compat.ts';
import { storagePath } from '../constants.ts';
import { findInstalledVersions } from '../lib/findInstalledVersions.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const { installBinaries, printInstructions } = _require('../assets/installBinaries.cjs');

/**
 * nvu setup [--shims]
 *
 * Install/reinstall nvu binaries to ~/.nvu/bin
 * With --shims: create shims for existing global packages
 */
export default function setupCmd(args: string[]): void {
  const options = getopts(args, { boolean: ['force'] });

  installBinaries(options, (err, installed) => {
    if (err) {
      console.error(`Setup failed: ${err.message || err}`);
      exit(1);
      return;
    }

    printInstructions();
    if (!installed) console.log('Use --force to reinstall.');

    if (options.force) {
      const binDir = path.join(storagePath, 'bin');
      createShimsForGlobalPackages(binDir);
      return;
    }
  });
}

/**
 * Create shims for all global packages in the default Node version
 */
function createShimsForGlobalPackages(binDir: string): void {
  // Read default version
  const defaultPath = path.join(storagePath, 'default');
  if (!fs.existsSync(defaultPath)) {
    console.log('No default Node version set.');
    console.log('Set one with: nvu default <version>');
    exit(1);
    return;
  }

  const defaultVersion = fs.readFileSync(defaultPath, 'utf8').trim();
  const versionsDir = path.join(storagePath, 'installed');

  // Resolve to exact version
  const matches = findInstalledVersions(versionsDir, defaultVersion);
  if (matches.length === 0) {
    console.log(`Default version ${defaultVersion} is not installed.`);
    exit(1);
    return;
  }

  const resolvedVersion = matches[matches.length - 1];
  const nodeBinDir = path.join(versionsDir, resolvedVersion, 'bin');

  if (!fs.existsSync(nodeBinDir)) {
    console.log(`No bin directory found for ${resolvedVersion}`);
    exit(1);
    return;
  }

  // Get the node shim to copy from
  const nodeShim = path.join(binDir, 'node');
  if (!fs.existsSync(nodeShim)) {
    console.log('Node shim not found. Run: nvu setup');
    exit(1);
    return;
  }

  // Scan binaries in Node's bin directory
  const entries = readdirWithTypes(nodeBinDir);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const name = entry.name;

    // Skip our routing shims (node/npm/npx) - don't overwrite them
    if (name === 'node' || name === 'npm' || name === 'npx') continue;
    const shimPath = path.join(binDir, name);

    // Skip if shim already exists
    if (fs.existsSync(shimPath)) {
      skipped++;
      continue;
    }

    // Copy the node shim
    try {
      const shimContent = fs.readFileSync(nodeShim);
      fs.writeFileSync(shimPath, shimContent);
      fs.chmodSync(shimPath, 493); // 0755
      console.log(`Created shim: ${name}`);
      created++;
    } catch (err) {
      console.error(`Failed to create shim for ${name}: ${(err as Error).message}`);
    }
  }

  console.log('');
  console.log(`Done. Created ${created} shims, skipped ${skipped} (already exists).`);
  exit(0);
}
