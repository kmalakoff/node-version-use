// Test for Windows symlink issue with nvm-windows style setups
// This test verifies that nvu correctly handles .cmd wrappers in symlinked directories

delete process.env.NODE_OPTIONS;

import assert from 'assert';
import spawn from 'cross-spawn-cb';
import fs from 'fs';
import os from 'os';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-symlink-test');
const TEST_PKG_DIR = path.join(__dirname, '..', 'data', 'symlink-test-pkg');

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);

const OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
};

// Generate npm-style .cmd wrapper content
function generateCmdWrapper(scriptPath: string): string {
  return `@ECHO off
GOTO start
:find_dp0
SET dp0=%~dp0
EXIT /b
:start
SETLOCAL
CALL :find_dp0

IF EXIST "%dp0%\\node.exe" (
  SET "_prog=%dp0%\\node.exe"
) ELSE (
  SET "_prog=node"
  SET PATHEXT=%PATHEXT:;.JS;=;%
)

endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\${scriptPath.replace(/\//g, '\\')}" %*
`;
}

function cleanup() {
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (_e) {
    // ignore
  }
}

describe('windows symlink', () => {
  // Skip on non-Windows platforms
  if (!isWindows) {
    it.skip('skipped on non-Windows platforms', () => {});
    return;
  }

  before(function (done) {
    this.timeout(120000); // Allow time for Node installation
    cleanup();

    // Create temp directory structure
    fs.mkdirSync(TMP_DIR, { recursive: true });

    // First, we need to get the install path for Node 20 to create a symlink to it
    // For now, let's use a simpler approach: install Node 20, then create our symlink setup

    // Install Node 20 first
    spawn(CLI, ['--silent', '20', 'node', '--version'], OPTIONS, (err) => {
      if (err) return done(err);

      // Find where Node 20 was installed
      const nvuStoragePath = path.join(os.homedir(), '.nvu', 'installed');
      const entries = fs.readdirSync(nvuStoragePath);
      const node20Dir = entries.find((e) => e.startsWith('v20.'));

      if (!node20Dir) {
        return done(new Error('Could not find Node 20 installation'));
      }

      const node20Path = path.join(nvuStoragePath, node20Dir);
      const symlinkDir = path.join(TMP_DIR, 'nodejs');

      // Create junction (Windows symlink for directories)
      fs.symlinkSync(node20Path, symlinkDir, 'junction');

      // Create node_modules directory and copy test package
      const nodeModulesDir = path.join(symlinkDir, 'node_modules', 'print-node-version');
      fs.mkdirSync(nodeModulesDir, { recursive: true });

      // Copy package.json
      fs.copyFileSync(path.join(TEST_PKG_DIR, 'package.json'), path.join(nodeModulesDir, 'package.json'));

      // Copy bin directory
      fs.mkdirSync(path.join(nodeModulesDir, 'bin'), { recursive: true });
      fs.copyFileSync(path.join(TEST_PKG_DIR, 'bin', 'cli.js'), path.join(nodeModulesDir, 'bin', 'cli.js'));

      // Create .cmd wrapper in the symlink directory
      const cmdContent = generateCmdWrapper('node_modules\\print-node-version\\bin\\cli.js');
      fs.writeFileSync(path.join(symlinkDir, 'print-node-version.cmd'), cmdContent);

      done();
    });
  });

  after(() => {
    cleanup();
  });

  it('should run command with correct Node version despite symlinked node.exe', function (done) {
    this.timeout(120000);

    const symlinkDir = path.join(TMP_DIR, 'nodejs');
    const cmdPath = path.join(symlinkDir, 'print-node-version.cmd');

    // Verify our setup: the symlink directory should have node.exe pointing to Node 20
    const realPath = fs.realpathSync(symlinkDir);
    console.log('Symlink directory:', symlinkDir);
    console.log('Real path:', realPath);
    console.log('CMD path:', cmdPath);

    // Run via nvu with Node 22 - the command should print v22.x, NOT v20.x
    // If the bug exists, it will print v20.x because the .cmd finds node.exe in its directory
    spawn(CLI, ['--silent', '--expanded', '22', cmdPath], OPTIONS, (err, res) => {
      if (err) {
        console.log('Error:', err.message);
        console.log('stdout:', res?.stdout);
        console.log('stderr:', res?.stderr);
        return done(err);
      }

      const output = (res.stdout as string).trim();
      console.log('Output:', output);

      // The output should contain v22.x, indicating nvu correctly used Node 22
      // If bug exists, output will contain v20.x (from symlinked node.exe)
      assert.ok(output.includes('v22.'), `Expected Node 22 version in output, but got: ${output}. This indicates the .cmd wrapper used the symlinked node.exe instead of the PATH node.`);

      // Also verify it does NOT contain v20
      assert.ok(!output.includes('v20.'), `Output should not contain v20.x, but got: ${output}`);

      done();
    });
  });
});
