// remove NODE_OPTIONS from ts-dev-stack
delete process.env.NODE_OPTIONS;

const assert = require('assert');
const path = require('path');
const isVersion = require('is-version');
const spawn = require('cross-spawn-cb');

const getLines = require('../lib/getLines.cjs');

const CLI = path.join(__dirname, '..', '..', 'bin', 'cli.cjs');
const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const OPTIONS = {
  encoding: 'utf8',
};

describe('cli', () => {
  describe('happy path', () => {
    it('one version - 12', (done) => {
      spawn(CLI, ['12', '--silent', 'npm', '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0]));
        done();
      });
    });

    it('multiple versions - lts,12', (done) => {
      spawn(CLI, ['lts,12', '--silent', 'npm', '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(isVersion(getLines(res.stdout).slice(-2)[0]));
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0]));
        done();
      });
    });

    it('one version with options - lts', (done) => {
      spawn(CLI, ['lts', '--silent', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions with options - 10,12,lts', (done) => {
      spawn(CLI, ['10,12,lts', '--silent', NODE, '--version'], OPTIONS, (_err, res) => {
        assert.ok(getLines(res.stdout).slice(-3)[0].indexOf('v10.') === 0);
        assert.ok(getLines(res.stdout).slice(-2)[0].indexOf('v12.') === 0);
        assert.ok(isVersion(getLines(res.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions with options - 10,12,lts (sort desc)', (done) => {
      spawn(CLI, ['10,12,lts', '--silent', '--desc', NODE, '--version'], OPTIONS, (err, res) => {
        if (err) return done(err.message);
        assert.ok(isVersion(getLines(res.stdout).slice(-3)[0], 'v'));
        assert.ok(getLines(res.stdout).slice(-2)[0].indexOf('v12.') === 0);
        assert.ok(getLines(res.stdout).slice(-1)[0].indexOf('v10.') === 0);
        done();
      });
    });

    it('using engines', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['engines', '--silent', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err.message);
        assert.ok(getLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('using engines (--)', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['engines', '--silent', '--', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err.message);
        assert.ok(getLines(res.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('>=8', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      spawn(CLI, ['>=8', '--silent', NODE, '--version'], { encoding: 'utf8', cwd }, (err, res) => {
        if (err) return done(err.message);
        assert.ok(getLines(res.stdout).slice(0)[0].indexOf('v8.') === 0);
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
