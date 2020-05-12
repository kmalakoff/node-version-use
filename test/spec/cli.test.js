var assert = require('assert');
var path = require('path');
var crossSpawn = require('cross-spawn-cb');

describe('cli', function () {
  describe('happy path', function () {
    it('one version', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['14', 'npm', 'whoami'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.ok(res.stdout.split('\n')[0].length > 0);
        done();
      });
    });

    it('one version with options', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['lts/argon', 'node', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split('\n')[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('missing version (undefined)', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), [undefined], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('missing version (null)', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), [null, 'node', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('invalid versions', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['junk', 'node', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });
  });
});
