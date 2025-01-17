// remove NODE_OPTIONS from ts-dev-stack
delete process.env.NODE_OPTIONS;

const assert = require('assert');
const path = require('path');
const rimraf2 = require('rimraf2');

const versionUse = require('node-version-use');

const getLines = require('../lib/getLines.cjs');
const isVersion = require('is-version');

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const TMP_DIR = path.join(path.join(__dirname, '..', '..', '.tmp'));
const OPTIONS = {
  storagePath: TMP_DIR,
  encoding: 'utf8',
  silent: true,
};

describe('callback', () => {
  before(rimraf2.bind(null, TMP_DIR, { disableGlob: true }));

  describe('happy path', () => {
    it('one version - 12', (done) => {
      versionUse('12', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('lts version - lts', (done) => {
      versionUse('lts', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0].result.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions - 10,12,lts', (done) => {
      versionUse('10,12,lts', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
        assert.ok(getLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        assert.ok(isVersion(getLines(results[1].result.stdout).slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions - 10,12,lts (sort -1)', (done) => {
      versionUse('10,12,lts', NODE, ['--version'], { sort: -1, ...OPTIONS }, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0].result.stdout).slice(-1)[0], 'v'));
        assert.ok(getLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        assert.ok(getLines(results[2].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
        done();
      });
    });

    it('using engines', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS }, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('>=8', (done) => {
      versionUse('>=8', NODE, ['--version'], { range: 'major,even', ...OPTIONS }, (err, results) => {
        if (err) return done(err.message);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v8.') === 0);
        done();
      });
    });
  });

  describe('unhappy path', () => {
    it('invalid versions', (done) => {
      versionUse('1.d.4', NODE, ['--version'], OPTIONS, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', (done) => {
      versionUse('14,bob', NODE, ['--version'], OPTIONS, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-missing'));
      versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS }, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines node missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      versionUse(NODE, ['--version'], { cwd, ...OPTIONS }, (err) => {
        assert.ok(!!err);
        done();
      });
    });
  });
});
