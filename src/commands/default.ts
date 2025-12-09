import exit from 'exit';
import fs from 'fs';
import path from 'path';
import { storagePath } from '../constants.ts';

/**
 * nvu default [version]
 *
 * Set or display the global default Node version.
 * This is used when no .nvmrc or .nvurc is found in the project.
 */
export default function defaultCmd(args: string[]): void {
  const defaultFilePath = path.join(storagePath, 'default');

  // If no version provided, display current default
  if (args.length === 0) {
    if (fs.existsSync(defaultFilePath)) {
      const version = fs.readFileSync(defaultFilePath, 'utf8').trim();
      console.log(`Current default: ${version}`);
    } else {
      console.log('No default version set.');
      console.log('Usage: nvu default <version>');
    }
    exit(0);
    return;
  }

  const version = args[0].trim();

  // Validate version format (basic check)
  if (!version || version.startsWith('-')) {
    console.log('Usage: nvu default <version>');
    console.log('Example: nvu default 20');
    exit(1);
    return;
  }

  // Ensure storage directory exists
  if (!fs.existsSync(storagePath)) {
    fs.mkdirSync(storagePath, { recursive: true });
  }

  // Write the default version
  fs.writeFileSync(defaultFilePath, `${version}\n`, 'utf8');
  console.log(`Default Node version set to: ${version}`);
  exit(0);
}
