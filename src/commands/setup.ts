import exit from 'exit-compat';
import Module from 'module';
import path from 'path';
import { storagePath } from '../constants.ts';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;
const { installBinaries, printInstructions, syncAllShims } = _require('../assets/installBinaries.cjs');

/**
 * nvu setup
 *
 * Install/reinstall nvu binaries to ~/.nvu/bin
 */
export default function setupCmd(_args: string[]): void {
  installBinaries({}, (err, installed) => {
    if (err) {
      console.error(`Setup failed: ${err.message || err}`);
      exit(1);
      return;
    }

    // Sync all shims to the new binary
    const binDir = path.join(storagePath, 'bin');
    syncAllShims(binDir);

    printInstructions();
    if (!installed) console.log('Use --force to reinstall binaries.');

    exit(0);
  });
}
