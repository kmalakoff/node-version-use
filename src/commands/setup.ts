import exit from 'exit-compat';
import getopts from 'getopts-compat';
import path from 'path';
import { storagePath } from '../constants.ts';
import { installBinaries, printInstructions, syncAllShims } from '../lib/installBinaries.ts';

/**
 * nvu setup [--force]
 *
 * Install/reinstall nvu binaries to ~/.nvu/bin
 */
export default function setupCmd(args: string[]): void {
  const options = getopts(args, { boolean: ['force'] });

  let installed: boolean;
  try {
    installed = installBinaries({ force: options.force });
  } catch (err) {
    console.error(`Setup failed: ${(err as Error).message || err}`);
    return exit(1);
  }

  // Sync all shims to the new binary
  const binDir = path.join(storagePath, 'bin');
  syncAllShims(binDir);

  printInstructions();
  if (!installed) console.log('Use --force to reinstall binaries.');

  exit(0);
}
