var assert = require('assert');
var path = require('path');
var rimraf = require('rimraf');
var assign = require('just-extend');
var cr = require('cr');

var versionUse = require('../..');

var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
var now = new Date(Date.parse('2020-05-10T03:23:29.347Z'));

var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var OPTIONS = {
  cacheDirectory: path.join(TMP_DIR, 'cache'),
  installedDirectory: path.join(TMP_DIR, 'installed'),
  buildDirectory: path.join(TMP_DIR, 'build'),
  now: now,
  stdout: 'string',
  silent: true,
};

describe('versions', function () {
  before(function (callback) {
    rimraf(TMP_DIR, callback.bind(null, null));
  });

  describe('happy path', function () {
    it('one version - 12', function (done) {
      versionUse('12', NODE, ['--version'], OPTIONS, function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('lts version - lts/erbium', function (done) {
      versionUse('lts/erbium', NODE, ['--version'], OPTIONS, function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('lts/argon version - lts/argon', function (done) {
      versionUse('lts/argon', NODE, ['--version'], OPTIONS, function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.equal(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0], 'v4.9.1');
        done();
      });
    });

    it('multiple versions - 10,12,lts/erbium', function (done) {
      versionUse('10,12,lts/erbium', NODE, ['--version'], OPTIONS, function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v10.') === 0);
        assert.ok(cr(results[1].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    it('multiple versions - 10,12,lts/erbium (sort -1)', function (done) {
      versionUse('10,12,lts/erbium', NODE, ['--version'], assign({ sort: -1 }, OPTIONS), function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
        assert.ok(cr(results[1].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v10.') === 0);
        done();
      });
    });

    it('using engines - 12', function (done) {
      var cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
      versionUse('engines', NODE, ['--version'], assign({ cwd: cwd }, OPTIONS), function (err, results) {
        assert.ok(!err);
        assert.ok(results.length > 0);
        assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
        done();
      });
    });

    describe('promise', function () {
      if (typeof Promise === 'undefined') return; // no promise support

      it('using engines - 12 (promise)', function (done) {
        var cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
        versionUse('engines', NODE, ['--version'], assign({ cwd: cwd }, OPTIONS))
          .then(function (results) {
            assert.ok(results.length > 0);
            assert.ok(cr(results[0].result.stdout).split('\n').slice(-2, -1)[0].indexOf('v12.') === 0);
            done();
          })
          .catch(done);
      });
    });
  });

  describe('unhappy path', function () {
    it('invalid versions', function (done) {
      versionUse('1.d.4', NODE, ['--version'], OPTIONS, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      versionUse('14,bob', NODE, ['--version'], OPTIONS, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('engines missing', function (done) {
      var cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-missing'));
      versionUse('engines', NODE, ['--version'], assign({ cwd: cwd }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('engines node missing', function (done) {
      var cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      versionUse(NODE, ['--version'], assign({ cwd: cwd }, OPTIONS), function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
