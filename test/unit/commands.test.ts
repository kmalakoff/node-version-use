// remove NODE_OPTIONS from ts-dev-stack
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import spawn from 'cross-spawn-cb';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp-commands');

const OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
  env: {
    ...process.env,
    NVU_HOME: TMP_DIR, // Override nvu home for testing
  },
};

describe('commands', () => {
  before((cb) => {
    safeRm(TMP_DIR, () => {
      fs.mkdirSync(TMP_DIR, { recursive: true });
      fs.mkdirSync(path.join(TMP_DIR, 'installed'), { recursive: true });
      cb();
    });
  });

  after((cb) => safeRm(TMP_DIR, cb));

  describe('default', () => {
    it('shows no default when not set', (done) => {
      spawn(CLI, ['default'], OPTIONS, (err, res) => {
        if (err) {
          // Expected - no default set
          assert.ok(res.stdout.indexOf('No default') >= 0 || res.stderr.indexOf('No default') >= 0);
        }
        done();
      });
    });

    it('sets default version', (done) => {
      const defaultPath = path.join(TMP_DIR, 'default');
      // Manually create default file to test reading
      fs.writeFileSync(defaultPath, '20');

      spawn(CLI, ['default'], OPTIONS, (_err, res) => {
        // Should show the default
        assert.ok(res.stdout.indexOf('20') >= 0);
        done();
      });
    });
  });

  describe('local', () => {
    it('creates .nvmrc file', (done) => {
      const testDir = path.join(TMP_DIR, 'test-project');
      fs.mkdirSync(testDir, { recursive: true });

      spawn(CLI, ['local', '18'], { ...OPTIONS, cwd: testDir }, (err, _res) => {
        if (err) {
          // Check if .nvmrc was created despite exit code
        }
        const nvmrcPath = path.join(testDir, '.nvmrc');
        assert.ok(fs.existsSync(nvmrcPath), '.nvmrc should be created');
        const content = fs.readFileSync(nvmrcPath, 'utf8').trim();
        assert.strictEqual(content, '18');
        done();
      });
    });

    it('creates .nvurc file with --nvurc flag', (done) => {
      const testDir = path.join(TMP_DIR, 'test-project-nvurc');
      fs.mkdirSync(testDir, { recursive: true });

      spawn(CLI, ['local', '20', '--nvurc'], { ...OPTIONS, cwd: testDir }, (_err, _res) => {
        const nvurcPath = path.join(testDir, '.nvurc');
        assert.ok(fs.existsSync(nvurcPath), '.nvurc should be created');
        const content = fs.readFileSync(nvurcPath, 'utf8').trim();
        assert.strictEqual(content, '20');
        done();
      });
    });
  });

  describe('list', () => {
    it('shows no versions when empty', (done) => {
      spawn(CLI, ['list'], OPTIONS, (_err, res) => {
        assert.ok(res.stdout.indexOf('No Node versions') >= 0 || res.stdout.indexOf('none') >= 0);
        done();
      });
    });

    it('lists installed versions', (done) => {
      // Create fake version directories
      const versionsDir = path.join(TMP_DIR, 'installed');
      fs.mkdirSync(path.join(versionsDir, 'v18.19.0'), { recursive: true });
      fs.mkdirSync(path.join(versionsDir, 'v20.10.0'), { recursive: true });

      spawn(CLI, ['list'], OPTIONS, (_err, res) => {
        assert.ok(res.stdout.indexOf('18.19.0') >= 0 || res.stdout.indexOf('v18') >= 0);
        assert.ok(res.stdout.indexOf('20.10.0') >= 0 || res.stdout.indexOf('v20') >= 0);
        done();
      });
    });
  });

  describe('which', () => {
    it('shows no version when not configured', (done) => {
      const testDir = path.join(TMP_DIR, 'test-which-empty');
      fs.mkdirSync(testDir, { recursive: true });
      // Remove any default file from previous tests
      const defaultPath = path.join(TMP_DIR, 'default');
      if (fs.existsSync(defaultPath)) {
        fs.unlinkSync(defaultPath);
      }

      spawn(CLI, ['which'], { ...OPTIONS, cwd: testDir }, (err, _res) => {
        // Should indicate no version configured (exits with error)
        assert.ok(err, 'Should exit with error when no version configured');
        done();
      });
    });

    it('shows version from .nvmrc', (done) => {
      const testDir = path.join(TMP_DIR, 'test-which-nvmrc');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, '.nvmrc'), '16');

      spawn(CLI, ['which'], { ...OPTIONS, cwd: testDir }, (err, res) => {
        assert.ok(!err, 'Should not error when .nvmrc exists');
        assert.ok(res && res.stdout.indexOf('16') >= 0);
        done();
      });
    });
  });

  describe('uninstall', () => {
    it('reports when version not installed', (done) => {
      spawn(CLI, ['uninstall', '99'], OPTIONS, (err) => {
        assert.ok(err, 'Should exit with error when version not installed');
        done();
      });
    });

    it('removes installed version', (done) => {
      // Create a fake installed version
      const versionsDir = path.join(TMP_DIR, 'installed');
      const versionDir = path.join(versionsDir, 'v22.0.0');
      fs.mkdirSync(path.join(versionDir, 'bin'), { recursive: true });
      fs.writeFileSync(path.join(versionDir, 'bin', 'node'), '');

      spawn(CLI, ['uninstall', 'v22.0.0'], OPTIONS, (err, _res) => {
        assert.ok(!err, `Should not error: ${err ? err.message : ''}`);
        assert.ok(!fs.existsSync(versionDir), 'Version directory should be removed');
        done();
      });
    });

    it('errors when multiple versions match', (done) => {
      // Create multiple matching versions
      const versionsDir = path.join(TMP_DIR, 'installed');
      fs.mkdirSync(path.join(versionsDir, 'v21.1.0', 'bin'), { recursive: true });
      fs.mkdirSync(path.join(versionsDir, 'v21.2.0', 'bin'), { recursive: true });

      spawn(CLI, ['uninstall', '21'], OPTIONS, (err) => {
        assert.ok(err, 'Should error with multiple matches');
        // Cleanup
        fs.rmSync(path.join(versionsDir, 'v21.1.0'), { recursive: true, force: true });
        fs.rmSync(path.join(versionsDir, 'v21.2.0'), { recursive: true, force: true });
        done();
      });
    });
  });

  describe('teardown', () => {
    it('removes shims', (done) => {
      // Create fake shims
      const binDir = path.join(TMP_DIR, 'bin');
      fs.mkdirSync(binDir, { recursive: true });
      fs.writeFileSync(path.join(binDir, 'node'), '');
      fs.writeFileSync(path.join(binDir, 'npm'), '');
      fs.writeFileSync(path.join(binDir, 'npx'), '');

      spawn(CLI, ['teardown'], OPTIONS, (_err, _res) => {
        assert.ok(!fs.existsSync(path.join(binDir, 'node')), 'node shim should be removed');
        assert.ok(!fs.existsSync(path.join(binDir, 'npm')), 'npm shim should be removed');
        assert.ok(!fs.existsSync(path.join(binDir, 'npx')), 'npx shim should be removed');
        done();
      });
    });
  });
});
