// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import spawn from 'cross-spawn-cb';
import isVersion from 'is-version';
import path from 'path';
import url from 'url';

import getLines from '../lib/getLines.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.js');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
};

describe('cli', () => {
  describe('version and help', () => {
    it('--version', (done) => {
      spawn(CLI, ['--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(isVersion(getLines(res.stdout)[0]));
        done();
      });
    });

    it('-v', (done) => {
      spawn(CLI, ['-v'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(isVersion(getLines(res.stdout)[0]));
        done();
      });
    });

    it('--help', (done) => {
      spawn(CLI, ['--help'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('Usage:') >= 0);
        assert.ok(res.stdout.indexOf('--version') >= 0);
        assert.ok(res.stdout.indexOf('--help') >= 0);
        done();
      });
    });

    it('-h', (done) => {
      spawn(CLI, ['-h'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('Usage:') >= 0);
        assert.ok(res.stdout.indexOf('--version') >= 0);
        assert.ok(res.stdout.indexOf('--help') >= 0);
        done();
      });
    });
  });

  describe('happy path', () => {
    it('one version - 12', (done) => {
      spawn(CLI, ['--silent', '--expanded', '12', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        done();
      });
    });

    it('multiple versions - 22,12', (done) => {
      spawn(CLI, ['--silent', '--expanded', '22,12', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        done();
      });
    });

    it('one version with options - 22', (done) => {
      spawn(CLI, ['--silent', '--expanded', '22', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions with options - 10,12,22', (done) => {
      spawn(CLI, ['--silent', '--expanded', '10,12,22', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('v10.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        done();
      });
    });

    it('multiple versions with options - 10,12,22 (sort desc)', (done) => {
      spawn(CLI, ['--silent', '--expanded', '--desc', '10,12,22', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('v10.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        done();
      });
    });

    it('using engines', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['--silent', '--expanded', 'engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err);
        assert.ok(getLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('>=8', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['--silent', '--expanded', '>=8', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err);
        assert.ok(res.stdout.indexOf('v6.') < 0);
        assert.ok(res.stdout.indexOf('v8.') >= 0);
        assert.ok(res.stdout.indexOf('v10.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        assert.ok(res.stdout.indexOf('v14.') >= 0);
        assert.ok(res.stdout.indexOf('v16.') >= 0);
        assert.ok(res.stdout.indexOf('v18.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        done();
      });
    });
  });

  describe('unhappy path', () => {
    it('missing command', (done) => {
      spawn(CLI, [], OPTIONS, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('missing versions', (done) => {
      spawn(CLI, [NODE, '--version'], OPTIONS, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', (done) => {
      spawn(CLI, ['junk,junk', NODE, '--version'], OPTIONS, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-missing'));
      spawn(CLI, ['engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines node missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      spawn(CLI, ['engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });
  });

  describe('system version', () => {
    it('system node --version', (done) => {
      // Skip on Windows since system detection may differ
      if (isWindows) {
        done();
        return;
      }
      spawn(CLI, ['--silent', 'system', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        // Should output a version starting with v (system node version)
        const lines = getLines(res.stdout);
        const lastLine = lines[lines.length - 1];
        assert.ok(lastLine.indexOf('v') === 0, `Expected system node version to start with v, got: ${lastLine}`);
        done();
      });
    });

    it('system npm --version', (done) => {
      // Skip on Windows since system detection may differ
      if (isWindows) {
        done();
        return;
      }
      spawn(CLI, ['--silent', 'system', 'npm', '--version'], OPTIONS, (err, res) => {
        if (err) return done(err);
        // Should output npm version (e.g., 10.x.x)
        const lines = getLines(res.stdout);
        const lastLine = lines[lines.length - 1];
        assert.ok(/\d+\.\d+\.\d+/.test(lastLine), `Expected npm version format x.y.z, got: ${lastLine}`);
        done();
      });
    });
  });
});
