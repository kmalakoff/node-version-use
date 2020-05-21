var assert = require('assert');
var path = require('path');
var rimraf = require('rimraf');
var assign = require('object-assign');
var isVersion = require('is-version');

var nvu = require('../..');

var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
var EOL = /\r\n|\r|\n/;
var now = new Date(Date.parse('2020-05-10T03:23:29.347Z'));
var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var OPTIONS = {
  cacheDirectory: path.join(TMP_DIR, 'cache'),
  installedDirectory: path.join(TMP_DIR, 'installed'),
};

describe('versions', function () {
  before(function (callback) {
    rimraf(OPTIONS.cacheDirectory, function () {
      rimraf(OPTIONS.installedDirectory, callback.bind(null, null));
    });
  });

  describe('happy path', function () {
    it('npm --version', function (done) {
      nvu('12', 'npm', ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.ok(isVersion(res.stdout.split(EOL).slice(-2, -1)[0]));
        done();
      });
    });

    it('12', function (done) {
      nvu('12', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, -1)[0], 'v12.16.3');
        done();
      });
    });

    it('latest version', function (done) {
      nvu('latest', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, -1)[0], 'v13.14.0');
        done();
      });
    });

    it('lts version', function (done) {
      nvu('lts/erbium', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, -1)[0], 'v12.16.3');
        done();
      });
    });

    it('lts/argon version', function (done) {
      nvu('lts/argon', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, -1)[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('no versions (undefined)', function (done) {
      nvu(undefined, NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('no versions (null)', function (done) {
      nvu(null, NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('1.d.4', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('bob', NODE, ['--version'], assign({ stdout: 'string', now: now }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
