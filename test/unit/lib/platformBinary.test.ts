import assert from 'assert';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { platformPackageName, resolvePlatformBinary } from '../../../src/lib/platformBinary.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'package.json'), 'utf8'));

describe('lib/platformBinary', () => {
  it('names a package the parent declares', () => {
    assert.ok(pkg.optionalDependencies[platformPackageName], `${platformPackageName} is not an optionalDependency of node-version-use`);
  });

  it('resolves an existing binary, or explains the install that fixes it', () => {
    let binary: { path: string; version: string } | null = null;
    try {
      binary = resolvePlatformBinary();
    } catch (err) {
      // The message is the contract: it has to name the package to install.
      const message = (err as Error).message;
      assert.ok(message.indexOf(platformPackageName) >= 0, message);
      assert.ok(message.indexOf(`npm install ${platformPackageName}`) >= 0, message);
      return;
    }

    assert.ok(fs.existsSync(binary.path), `${binary.path} does not exist`);
    assert.strictEqual(binary.version, pkg.optionalDependencies[platformPackageName]);
  });
});
