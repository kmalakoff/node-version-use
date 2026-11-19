import assert from 'assert';
import cpuArch from 'cpu-arch';
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

  it('falls back to the machine arch package when the run arch has none', () => {
    // The machine's arch, not process.arch: an old node on Windows x64 reports ia32.
    const binary = resolvePlatformBinary('no-such-arch');
    assert.ok(fs.existsSync(binary.path), `${binary.path} does not exist`);
    assert.strictEqual(binary.version, pkg.optionalDependencies[`nvu-${process.platform}-${cpuArch()}`]);
  });

  it('names both packages when neither arch has one', () => {
    assert.throws(
      () => resolvePlatformBinary('no-such-arch', 'other-arch'),
      (err: Error) => err.message.indexOf(`nvu-${process.platform}-no-such-arch`) >= 0 && err.message.indexOf(`npm install nvu-${process.platform}-other-arch`) >= 0 && err.message.indexOf(`nvu-${process.platform}-other-arch`) >= 0
    );
  });
});
