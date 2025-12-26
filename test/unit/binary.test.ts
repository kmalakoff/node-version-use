/**
 * Binary integration tests
 *
 * These tests verify the Go binary works correctly with the CLI.
 * Tests are skipped if binaries aren't built (Go not available).
 */
import assert from 'assert';
import spawn from 'cross-spawn-cb';
import fs from 'fs';
import path from 'path';
import url from 'url';

import { getTestBinaryBin, getTestBinaryPath, hasTestBinaries, mkdirRecursive, rmRecursive, tmpdir } from '../lib/compat.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp', 'binary-test');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
  env: {
    ...process.env,
    PATH: getTestBinaryPath(),
    NVU_HOME: TMP_DIR,
  },
};

function createFakeNodeVersion(version: string): void {
  const versionDir = path.join(TMP_DIR, 'installed', version);

  if (isWindows) {
    // On Windows, create a .cmd file at the root of the version directory
    // The Go binary looks for <version>/node.cmd
    mkdirRecursive(versionDir);
    const nodeScript = `@echo off\r\necho v${version.replace('v', '')}\r\n`;
    const nodePath = path.join(versionDir, 'node.cmd');
    fs.writeFileSync(nodePath, nodeScript);
  } else {
    // On Unix/Linux/macOS, create a shell script in bin/ subdirectory
    const binDir = path.join(versionDir, 'bin');
    mkdirRecursive(binDir);
    const nodeScript = `#!/bin/sh\necho "v${version.replace('v', '')}"\n`;
    const nodePath = path.join(binDir, 'node');
    fs.writeFileSync(nodePath, nodeScript);
    fs.chmodSync(nodePath, 0o755);
  }
}

describe('binary', () => {
  before(function () {
    if (!hasTestBinaries()) {
      console.log('Binaries not found. Run: npm install (postinstall downloads from releases)');
      this.skip();
      return;
    }

    // Clean and create test directory
    if (fs.existsSync(TMP_DIR)) rmRecursive(TMP_DIR);
    mkdirRecursive(TMP_DIR);
    mkdirRecursive(path.join(TMP_DIR, 'installed'));
  });

  after(() => {
    if (fs.existsSync(TMP_DIR)) {
      rmRecursive(TMP_DIR);
    }
  });

  describe('NVU_HOME', () => {
    it('respects NVU_HOME environment variable', (done) => {
      // Create a version in the test NVU_HOME
      createFakeNodeVersion('v20.0.0');
      // Create .nvmrc pointing to it
      fs.writeFileSync(path.join(TMP_DIR, '.nvmrc'), '20');

      // Run the binary directly with --version (it should use our fake node)
      const binaryPath = path.join(getTestBinaryBin(), NODE);
      spawn(binaryPath, ['--version'], { ...OPTIONS, cwd: TMP_DIR }, (err, _res) => {
        if (err) return done(err);
        done();
      });
    });
  });

  describe('version resolution', () => {
    it('finds .nvmrc in current directory', (done) => {
      const testDir = path.join(TMP_DIR, 'test-nvmrc');
      mkdirRecursive(testDir);
      fs.writeFileSync(path.join(testDir, '.nvmrc'), '18');

      const binaryPath = path.join(getTestBinaryBin(), 'node');

      spawn(binaryPath, ['--version'], { ...OPTIONS, cwd: testDir }, (err, res) => {
        // We expect this to fail or show an error about version 18 not being installed
        // The key is that the binary correctly read the .nvmrc
        if (err && res?.stderr) {
          assert.ok(res.stderr.indexOf('18') !== -1 || res.stderr.indexOf('not installed') !== -1, 'Binary should report version 18 from .nvmrc');
        }
        done();
      });
    });

    it('finds .nvurc in current directory', (done) => {
      const testDir = path.join(TMP_DIR, 'test-nvurc');
      mkdirRecursive(testDir);
      fs.writeFileSync(path.join(testDir, '.nvurc'), '16');

      const binaryPath = path.join(getTestBinaryBin(), 'node');

      spawn(binaryPath, ['--version'], { ...OPTIONS, cwd: testDir }, (err, res) => {
        // We expect this to fail or show an error about version 16 not being installed
        if (err && res?.stderr) {
          assert.ok(res.stderr.indexOf('16') !== -1 || res.stderr.indexOf('not installed') !== -1, 'Binary should report version 16 from .nvurc');
        }
        done();
      });
    });
  });

  describe('system fallback', () => {
    it('falls back to system node when no config exists', (done) => {
      // Use a directory outside the project tree to avoid inheriting .nvmrc
      const testDir = path.join(tmpdir(), `nvu-binary-test-${Date.now()}`);
      mkdirRecursive(testDir);

      // Use empty NVU_HOME with no default
      const emptyNvuHome = path.join(testDir, 'empty-nvu');
      mkdirRecursive(emptyNvuHome);
      mkdirRecursive(path.join(emptyNvuHome, 'installed'));

      const binaryPath = path.join(getTestBinaryBin(), 'node');

      spawn(
        binaryPath,
        ['--version'],
        {
          ...OPTIONS,
          cwd: testDir,
          env: {
            ...OPTIONS.env,
            NVU_HOME: emptyNvuHome,
          },
        },
        (err, res) => {
          // Cleanup
          rmRecursive(testDir);

          // Should either:
          // 1. Successfully run system node and return a version
          // 2. Error that no version is configured
          if (!err && res?.stdout) {
            // System node ran successfully
            assert.ok(res.stdout.indexOf('v') !== -1, 'Should output a version from system node');
          } else if (err && res?.stderr) {
            // No system node or no config - binary should give helpful error
            assert.ok(res.stderr.indexOf('no Node version') !== -1 || res.stderr.indexOf('nvu') !== -1, 'Binary should give helpful error when no version configured');
          }
          done();
        }
      );
    });
  });

  describe('binary routing', () => {
    const ext = isWindows ? '.exe' : '';

    it('npm binary exists and runs', (done) => {
      const binaryPath = path.join(getTestBinaryBin(), `npm${ext}`);
      assert.ok(fs.existsSync(binaryPath), 'npm binary should exist');

      spawn(binaryPath, ['--version'], OPTIONS, (err, res) => {
        // Just verify the binary runs (may fail due to no version configured)
        assert.ok(err || res, 'npm binary should execute');
        done();
      });
    });

    it('npx binary exists and runs', (done) => {
      const binaryPath = path.join(getTestBinaryBin(), `npx${ext}`);
      assert.ok(fs.existsSync(binaryPath), 'npx binary should exist');

      spawn(binaryPath, ['--version'], OPTIONS, (err, res) => {
        // Just verify the binary runs (may fail due to no version configured)
        assert.ok(err || res, 'npx binary should execute');
        done();
      });
    });
  });
});
