import exit from 'exit-compat';
import fs from 'fs';
import { rmSync } from 'fs-remove-compat';
import path from 'path';
import { storagePath } from '../constants.ts';

/**
 * nvu teardown
 *
 * Remove nvu binaries from ~/.nvu/bin
 */
export default function teardownCmd(_args: string[]): void {
  const binDir = path.join(storagePath, 'bin');

  const binaries = ['node', 'npm', 'npx'];
  const ext = process.platform === 'win32' ? '.exe' : '';

  let removed = 0;
  for (let i = 0; i < binaries.length; i++) {
    const binaryPath = path.join(binDir, binaries[i] + ext);
    if (fs.existsSync(binaryPath)) {
      rmSync(binaryPath, { force: true });
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Removed ${removed} binary(s) from ${binDir}`);
    console.log('');
    console.log('You may also want to remove ~/.nvu/bin from your PATH.');
  } else {
    console.log('No binaries found to remove.');
  }

  exit(0);
}
