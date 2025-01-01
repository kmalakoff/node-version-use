// remove NODE_OPTIONS from ts-dev-stack
delete process.env.NODE_OPTIONS;

const assert = require('assert');
const path = require('path');
const spawn = require('cross-spawn-cb');
const isVersion = require('is-version');

const versionLines = require('../lib/versionLines');

const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.cjs');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

describe('cli', () => {
  describe('happy path', () => {
    it('one version - 12', (done) => {
      spawn(CLI, ['12', '--silent', 'npm', '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(isVersion(versionLines(res.stdout).slice(-1)[0]));
        done();
      });
    });

    it('multiple versions - lts/argon,12', (done) => {
      spawn(CLI, ['lts/argon,12', '--silent', 'npm', '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(isVersion(versionLines(res.stdout).slice(-1)[0]));
        done();
      });
    });

    it('one version with options - lts/erbium', (done) => {
      spawn(CLI, ['lts/erbium', '--silent', NODE, '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('one version with options - lts/argon', (done) => {
      spawn(CLI, ['lts/argon', '--silent', NODE, '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.equal(versionLines(res.stdout).slice(-1)[0], 'v4.9.1');
        done();
      });
    });

    it('multiple versions with options - 10,12,lts/erbium', (done) => {
      spawn(CLI, ['10,12,lts/erbium', '--silent', NODE, '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(-2)[0].indexOf('v10.') === 0);
        assert.ok(versionLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('multiple versions with options - 10,12,lts/erbium (sort desc)', (done) => {
      spawn(CLI, ['10,12,lts/erbium', '--silent', '--desc', NODE, '--version'], { encoding: 'utf8' }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(-2)[0].indexOf('v12.') === 0);
        assert.ok(versionLines(res.stdout).slice(-1)[0].indexOf('v10.') === 0);
        done();
      });
    });

    it('using engines - 12', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['engines', '--silent', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('using engines - 12 (--)', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['engines', '--silent', '--', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('>=8', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['>=8', '--silent', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        assert.ok(!err, err ? err.message : '');
        assert.ok(versionLines(res.stdout).slice(0)[0].indexOf('v8.') === 0);
        done();
      });
    });
  });

  describe('unhappy path', () => {
    it('missing command', (done) => {
      spawn(CLI, [], { encoding: 'utf8' }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('missing versions', (done) => {
      spawn(CLI, [NODE, '--version'], { encoding: 'utf8' }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', (done) => {
      spawn(CLI, ['junk,junk', NODE, '--version'], { encoding: 'utf8' }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines missing', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-missing'));
      spawn(CLI, ['engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines node missing', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      spawn(CLI, ['engines', NODE, '--version'], { encoding: 'utf8', cwd }, (err, _res) => {
        assert.ok(!!err);
        done();
      });
    });
  });
});
