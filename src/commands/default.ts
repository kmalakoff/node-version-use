import exit from 'exit-compat';
import fs from 'fs';
import path from 'path';
import { mkdirpSync } from '../compat.ts';
import { storagePath } from '../constants.ts';

/**
 * nvu default [version]
 *
 * Set or display the global default Node version.
 * This is used when no .nvmrc or .nvurc is found in the project.
 */
export default function defaultCmd(args: string[]): void {
  var defaultFilePath = path.join(storagePath, 'default');

  // If no version provided, display current default
  if (args.length === 0) {
    if (fs.existsSync(defaultFilePath)) {
      var currentVersion = fs.readFileSync(defaultFilePath, 'utf8').trim();
      console.log(`Current default: ${currentVersion}`);
    } else {
      console.log('No default version set.');
      console.log('Usage: nvu default <version>');
    }
    exit(0);
    return;
  }

  var version = args[0].trim();

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

  // Write the default version
  fs.writeFileSync(defaultFilePath, `${version}\n`, 'utf8');
  console.log(`Default Node version set to: ${version}`);
  exit(0);
}
