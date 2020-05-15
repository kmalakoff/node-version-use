var assert = require('assert');
var path = require('path');
var crossSpawn = require('cross-spawn-cb');

var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
var EOL = /\r\n|\r|\n/;

describe('cli', function () {
  describe('happy path', function () {
    it('npm whoami', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['12', 'npm', 'whoami'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.ok(res.stdout.split(EOL).slice(-2, 1)[0].length > 1);
        done();
      });
    });

    it('12', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['12', 'node', '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v12.16.3');
        done();
      });
    });

    it('one version with options', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['lts/argon', NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.equal(res.code, 0);
        assert.equal(res.stdout.split(EOL).slice(-2, 1)[0], 'v4.9.1');
        done();
      });
    });
  });

  describe('unhappy path', function () {
    it('err version (undefined)', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), [undefined], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('err version (null)', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), [null, NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });

    it('invalid versions', function (done) {
      crossSpawn(path.join(__dirname, '..', '..', 'bin', 'node-version-use'), ['junk', NODE, '--version'], { stdout: 'string' }, function (err, res) {
        assert.ok(!err);
        assert.ok(res.code !== 0);
        done();
      });
    });
  });
});
