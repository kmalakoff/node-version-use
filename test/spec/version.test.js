var assert = require('assert');
var path = require('path');

var nvu = require('../..');

describe('versions', function () {
  describe('happy path', function () {
    it('one version', function (done) {
      nvu('14', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!err);
        done();
      });
    });

    it('latest version', function (done) {
      nvu('latest', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!err);
        done();
      });
    });

    it('lts version', function (done) {
      nvu('lts', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!err);
        done();
      });
    });

    it('lts/argon version', function (done) {
      nvu('lts/argon', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!err);
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('no versions (undefined)', function (done) {
      nvu(undefined, 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('no versions (null)', function (done) {
      nvu(null, 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('1.d.4', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('bob', 'node', ['--version'], { cache: true, silent: true }, function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
