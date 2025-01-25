// remove NODE_OPTIONS from ts-dev-stack
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import path from 'path';
import url from 'url';
import cr from 'cr';
import spawn from 'cross-spawn-cb';
import isVersion from 'is-version';

import getLines from '../lib/getLines.cjs';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.cjs');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const OPTIONS = {
  encoding: 'utf8' as BufferEncoding,
};

describe('cli', () => {
  describe('happy path', () => {
    it('one version - 12', (done) => {
      spawn(CLI, ['--silent', '--expanded', '12', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        done();
      });
    });

    it('multiple versions - 22,12', (done) => {
      spawn(CLI, ['--silent', '--expanded', '22,12', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        done();
      });
    });

    it('one version with options - 22', (done) => {
      spawn(CLI, ['--silent', '--expanded', '22', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions with options - 10,12,22', (done) => {
      spawn(CLI, ['--silent', '--expanded', '10,12,22', NODE, '--version'], OPTIONS, (_err, res) => {
        assert.ok(res.stdout.indexOf('v10.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        done();
      });
    });

    it('multiple versions with options - 10,12,22 (sort desc)', (done) => {
      spawn(CLI, ['--silent', '--expanded', '--desc', '10,12,22', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(res.stdout.indexOf('v10.') >= 0);
        assert.ok(res.stdout.indexOf('v12.') >= 0);
        assert.ok(res.stdout.indexOf('v22.') >= 0);
        done();
      });
    });

    it('using engines', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['--silent', '--expanded', 'engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err.message);
        assert.ok(getLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('>=8', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['--silent', '--expanded', '>=8', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err.message);
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
});
