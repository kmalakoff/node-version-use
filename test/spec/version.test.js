var assert = require('assert');

var nvu = require('../..');

var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
var EOL = /\r\n|\r|\n/;
var now = new Date(Date.parse('2020-05-10T03:23:29.347Z'));

describe('versions', function () {
  describe('happy path', function () {
    it('npm whoami', function (done) {
      nvu('12', 'npm', ['whoami'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.stdout.split(EOL).slice(-2, 1)[0].length > 1);
        done();
      });
    });

    it('12', function (done) {
      nvu('12', NODE, ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v12.16.3');
        done();
      });
    });

    it('latest version', function (done) {
      nvu('latest', NODE, ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v13.14.0');
        done();
      });
    });

    it('lts version', function (done) {
      nvu('lts/erbium', NODE, ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v12.16.3');
        done();
      });
    });

    it('lts/argon version', function (done) {
      nvu('lts/argon', NODE, ['--version'], { stdout: 'string', now: now }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('no versions (undefined)', function (done) {
      nvu(undefined, NODE, ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('no versions (null)', function (done) {
      nvu(null, NODE, ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('1.d.4', NODE, ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', function (done) {
      nvu('bob', NODE, ['--version'], { stdout: 'string' }, function (err) {
        assert.ok(!!err);
        done();
      });
    });
  });
});
