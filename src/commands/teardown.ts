import exit from 'exit';
import fs from 'fs';
import path from 'path';
import { storagePath } from '../constants.ts';

/**
 * nvu teardown
 *
 * Remove nvu shims from ~/.nvu/bin
 */
export default function teardownCmd(_args: string[]): void {
  const binDir = path.join(storagePath, 'bin');

  const shims = ['node', 'npm', 'npx'];
  const ext = process.platform === 'win32' ? '.exe' : '';

  let removed = 0;
  for (const shim of shims) {
    const shimPath = path.join(binDir, shim + ext);
    if (fs.existsSync(shimPath)) {
      fs.unlinkSync(shimPath);
      removed++;
    }
  }

  if (removed > 0) {
    console.log(`Removed ${removed} shim(s) from ${binDir}`);
    console.log('');
    console.log('You may also want to remove ~/.nvu/bin from your PATH.');
  } else {
    console.log('No shims found to remove.');
  }

  exit(0);
}
