var assert = require('assert');

var nvu = require('../..');

var now = new Date(Date.parse('2020-05-10T03:23:29.347Z'));

describe('versions', function () {
  describe('happy path', function () {
    it('one version', function (done) {
      nvu('14', 'node', ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split('\n')[0], 'v14.2.0');
        done();
      });
    });

    it('latest version', function (done) {
      nvu('latest', 'node', ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split('\n')[0], 'v13.14.0');
        done();
      });
    });

    it('lts version', function (done) {
      nvu('lts', 'node', ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split('\n')[0], 'v14.2.0');
        done();
      });
    });

    it('lts/argon version', function (done) {
      nvu('lts/argon', 'node', ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split('\n')[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('no versions (undefined)', function (done) {
      nvu(undefined, 'node', ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('no versions (null)', function (done) {
      nvu(null, 'node', ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('1.d.4', 'node', ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('bob', 'node', ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
