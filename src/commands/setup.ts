import { execSync } from 'child_process';
import exit from 'exit-compat';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { mkdirpSync, readdirWithTypes } from '../compat.ts';
import { storagePath } from '../constants.ts';
import { findInstalledVersions } from '../lib/findInstalledVersions.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

/**
 * nvu setup [--shims]
 *
 * Install/reinstall nvu binaries to ~/.nvu/bin
 * With --shims: create shims for existing global packages
 */
export default function setupCmd(args: string[]): void {
  const binDir = path.join(storagePath, 'bin');

  // Create directories
  if (!fs.existsSync(storagePath)) {
    mkdirpSync(storagePath);
  }
  if (!fs.existsSync(binDir)) {
    mkdirpSync(binDir);
  }

  // Check for --shims flag
  let hasShimsFlag = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--shims') {
      hasShimsFlag = true;
      break;
    }
  }

  if (hasShimsFlag) {
    createShimsForGlobalPackages(binDir);
    return;
  }

  // Find the postinstall script relative to this module
  const postinstallPath = path.join(__dirname, '..', '..', '..', 'scripts', 'postinstall.cjs');

  if (fs.existsSync(postinstallPath)) {
    // Run the postinstall script
    try {
      execSync(`node "${postinstallPath}"`, { stdio: 'inherit' });
    } catch (_err) {
      // postinstall handles its own errors gracefully
    }
  } else {
    console.log('Setup script not found.');
    console.log('Try reinstalling: npm install -g node-version-use');
    exit(1);
  }
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
    if (name === 'node' || name === 'npm' || name === 'npx') {
      continue;
    }

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
  console.log(`Done. Created ${created} shims, skipped ${skipped} (already exist).`);
  exit(0);
}
