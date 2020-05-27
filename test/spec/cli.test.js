var assert = require('assert');
var path = require('path');
var rimraf = require('rimraf');
var crossSpawn = require('cross-spawn-cb');
var isVersion = require('is-version');

var CLI = path.join(__dirname, '..', '..', 'bin', 'node-version-use');
var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
var EOL = /\r\n|\r|\n/;
var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var OPTIONS = {
  cacheDirectory: path.join(TMP_DIR, 'cache'),
  installedDirectory: path.join(TMP_DIR, 'installed'),
};

describe('cli', function () {
  before(function (callback) {
    rimraf(OPTIONS.cacheDirectory, function () {
      rimraf(OPTIONS.cacheDirectory, callback.bind(null, null));
    });
  });

  describe('happy path', function () {
    it('npm --version', function (done) {
      crossSpawn(CLI, ['12', 'npm', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.ok(isVersion(res.stdout.split(EOL).slice(-2, -1)[0]));
        done();
      });
    });

    it('12', function (done) {
      crossSpawn(CLI, ['12', 'node', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.ok(res.stdout.split(EOL).slice(-2, -1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('one version with options', function (done) {
      crossSpawn(CLI, ['lts/argon', NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, -1)[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('err version (undefined)', function (done) {
      crossSpawn(CLI, [undefined], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('err version (null)', function (done) {
      crossSpawn(CLI, [null, NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('invalid versions', function (done) {
      crossSpawn(CLI, ['junk', NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });
  });
});
