import exit from 'exit-compat';
import fs from 'fs';
import path from 'path';
import { mkdirpSync } from '../compat.ts';
import { storagePath } from '../constants.ts';
import { findInstalledVersions } from '../lib/findInstalledVersions.ts';
import loadNodeVersionInstall from '../lib/loadNodeVersionInstall.ts';

/**
 * nvu default [version]
 *
 * Set or display the global default Node version.
 * This is used when no .nvmrc or .nvurc is found in the project.
 */
export default function defaultCmd(args: string[]): void {
  const defaultFilePath = path.join(storagePath, 'default');
  const versionsPath = path.join(storagePath, 'installed');

  // If no version provided, display current default
  if (args.length === 0) {
    if (fs.existsSync(defaultFilePath)) {
      const currentVersion = fs.readFileSync(defaultFilePath, 'utf8').trim();
      console.log(`Current default: ${currentVersion}`);
    } else {
      console.log('No default version set.');
      console.log('Usage: nvu default <version>');
    }
    exit(0);
    return;
  }

  const version = args[0].trim();

  // Validate version format (basic check, indexOf for Node 0.8+ compat)
  if (!version || version.indexOf('-') === 0) {
    console.log('Usage: nvu default <version>');
    console.log('Example: nvu default 20');
    exit(1);
    return;
  }

  // Ensure storage directory exists
  if (!fs.existsSync(storagePath)) {
    mkdirpSync(storagePath);
  }

  // Check if any installed versions match
  const matches = findInstalledVersions(versionsPath, version);

  if (matches.length > 0) {
    // Version is installed - resolve to exact and set default
    setDefaultToExact(defaultFilePath, matches);
  } else {
    // Version not installed - auto-install it
    console.log(`Node ${version} is not installed. Installing...`);
    autoInstallAndSetDefault(version, versionsPath, defaultFilePath);
  }
}

/**
 * Set the default to the highest matching installed version
 */
function setDefaultToExact(defaultFilePath: string, matches: string[]): void {
  // matches are sorted by findInstalledVersions, take the last (highest)
  let exactVersion = matches[matches.length - 1];

  // Ensure it has v prefix for consistency
  if (exactVersion.indexOf('v') !== 0) {
    exactVersion = `v${exactVersion}`;
  }

  // Write the exact version
  fs.writeFileSync(defaultFilePath, `${exactVersion}\n`, 'utf8');
  console.log(`Default Node version set to: ${exactVersion}`);

  exit(0);
}

/**
 * Auto-install the version and then set it as default
 */
function autoInstallAndSetDefault(version: string, versionsPath: string, defaultFilePath: string): void {
  loadNodeVersionInstall((err, nodeVersionInstall) => {
    if (err || !nodeVersionInstall) {
      console.error('Failed to load node-version-install:', err ? err.message : 'Module not available');
      exit(1);
      return;
    }

    nodeVersionInstall(
      version,
      {
        installPath: versionsPath,
      },
      (installErr, results) => {
        if (installErr) {
          console.error(`Failed to install Node ${version}:`, installErr.message);
          exit(1);
          return;
        }

        // Get the installed version from results
        let installedVersion: string;
        if (results && results.length > 0) {
          installedVersion = results[0].version;
        } else {
          // Fallback: re-scan installed versions
          const matches = findInstalledVersions(versionsPath, version);
          if (matches.length === 0) {
            console.error('Installation completed but version not found');
            exit(1);
            return;
          }
          installedVersion = matches[matches.length - 1];
        }

        // Ensure it has v prefix for consistency
        if (installedVersion.indexOf('v') !== 0) {
          installedVersion = `v${installedVersion}`;
        }

        // Write the exact version
        fs.writeFileSync(defaultFilePath, `${installedVersion}\n`, 'utf8');
        console.log(`Node ${installedVersion} installed successfully.`);
        console.log(`Default Node version set to: ${installedVersion}`);

        exit(0);
      }
    );
  });
}
