import exit from 'exit';
import fs from 'fs';
import path from 'path';
import { storagePath } from '../constants.ts';

/**
 * nvu which
 *
 * Show which Node binary would be used based on current directory.
 * This simulates what the nvu binary would do.
 */
export default function whichCmd(_args: string[]): void {
  const cwd = process.cwd();

  // Resolve version using the same logic as the nvu binary
  const version = resolveVersion(cwd);

  if (!version) {
    console.log('No Node version configured for this directory.');
    console.log('');
    console.log('To configure a version:');
    console.log('  nvu local <version>   - Set version for this project');
    console.log('  nvu default <version> - Set global default');
    exit(1);
    return;
  }

  // Check if the version is installed
  const versionsPath = path.join(storagePath, 'installed');
  const versionPath = path.join(versionsPath, version);
  const versionPathWithV = path.join(versionsPath, `v${version}`);
  const versionPathWithoutV = path.join(versionsPath, version.replace(/^v/, ''));

  let actualVersionPath = '';
  if (fs.existsSync(versionPath)) {
    actualVersionPath = versionPath;
  } else if (fs.existsSync(versionPathWithV)) {
    actualVersionPath = versionPathWithV;
  } else if (fs.existsSync(versionPathWithoutV)) {
    actualVersionPath = versionPathWithoutV;
  }

  console.log(`Version: ${version}`);
  console.log(`Source: ${getVersionSource(cwd)}`);

  if (actualVersionPath) {
    const nodePath = path.join(actualVersionPath, 'bin', 'node');
    console.log(`Binary: ${nodePath}`);
    if (fs.existsSync(nodePath)) {
      console.log('Status: Installed');
    } else {
      console.log('Status: Directory exists but binary not found');
    }
  } else {
    console.log(`Status: Not installed (run: nvu install ${version})`);
  }

  exit(0);
}

/**
 * Resolve version from config files (mirrors nvu binary logic)
 */
function resolveVersion(cwd: string): string | null {
  // Walk up directories looking for .nvurc or .nvmrc
  let dir = cwd;
  while (true) {
    // Check .nvurc first
    const nvurcPath = path.join(dir, '.nvurc');
    if (fs.existsSync(nvurcPath)) {
      return fs.readFileSync(nvurcPath, 'utf8').trim();
    }

    // Check .nvmrc
    const nvmrcPath = path.join(dir, '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      return fs.readFileSync(nvmrcPath, 'utf8').trim();
    }

    // Move to parent
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Check global default
  const defaultPath = path.join(storagePath, 'default');
  if (fs.existsSync(defaultPath)) {
    return fs.readFileSync(defaultPath, 'utf8').trim();
  }

  return null;
}

/**
 * Determine the source of the version (for display)
 */
function getVersionSource(cwd: string): string {
  let dir = cwd;
  while (true) {
    const nvurcPath = path.join(dir, '.nvurc');
    if (fs.existsSync(nvurcPath)) {
      return nvurcPath;
    }

    const nvmrcPath = path.join(dir, '.nvmrc');
    if (fs.existsSync(nvmrcPath)) {
      return nvmrcPath;
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  const defaultPath = path.join(storagePath, 'default');
  if (fs.existsSync(defaultPath)) {
    return `${defaultPath} (global default)`;
  }

  return 'none';
}
