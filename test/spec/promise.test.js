// remove NODE_OPTIONS from ts-dev-stack
// biome-ignore lint/performance/noDelete: <explanation>
delete process.env.NODE_OPTIONS;

const assert = require('assert');
const path = require('path');
const rimraf2 = require('rimraf2');

const versionUse = require('node-version-use');

const versionLines = require('../lib/versionLines');

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';
const now = new Date(Date.parse('2020-05-10T03:23:29.347Z'));

const TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
const OPTIONS = {
  cacheDirectory: path.join(TMP_DIR, 'cache'),
  installDirectory: path.join(TMP_DIR, 'installed'),
  buildDirectory: path.join(TMP_DIR, 'build'),
  now: now, // BE CAREFUL - this fixes a moment in time
  encoding: 'utf8',
  silent: true,
};

describe('promise', () => {
  if (typeof Promise === 'undefined') return; // no promise support

  before((callback) => {
    rimraf2(TMP_DIR, { disableGlob: true }, callback.bind(null, null));
  });

  describe('happy path', () => {
    it('one version - 12', (done) => {
      versionUse('12', NODE, ['--version'], OPTIONS)
        .then((results) => {
          assert.ok(results.length > 0);
          assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
          done();
        })
        .catch(done);
    });

    it('lts version - lts/erbium', (done) => {
      versionUse('lts/erbium', NODE, ['--version'], OPTIONS)
        .then((results) => {
          assert.ok(results.length > 0);
          assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
          done();
        })
        .catch(done);
    });

    it('lts/argon version - lts/argon', (done) => {
      versionUse('lts/argon', NODE, ['--version'], OPTIONS)
        .then((results) => {
          assert.ok(results.length > 0);
          assert.equal(versionLines(results[0].result.stdout).slice(-1)[0], 'v4.9.1');
          done();
        })
        .catch(done);
    });

    it('multiple versions - 10,12,lts/erbium', (done) => {
      versionUse('10,12,lts/erbium', NODE, ['--version'], OPTIONS)
        .then((results) => {
          assert.ok(results.length > 0);
          assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
          assert.ok(versionLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
          done();
        })
        .catch(done);
    });

    it('multiple versions - 10,12,lts/erbium (sort -1)', (done) => {
      versionUse('10,12,lts/erbium', NODE, ['--version'], Object.assign({ sort: -1 }, OPTIONS))
        .then((results) => {
          assert.ok(results.length > 0);
          assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
          assert.ok(versionLines(results[1].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
          done();
        })
        .catch(done);
    });

    it('using engines - 12', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
      versionUse('engines', NODE, ['--version'], Object.assign({ cwd: cwd }, OPTIONS))
        .then((results) => {
          assert.ok(results.length > 0);
          assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
          done();
        })
        .catch(done);
    });

    describe('constants', () => {
      it('installDirectory', () => {
        const installDirectory = versionUse.installDirectory();
        assert.ok(installDirectory);
      });

      it('cacheDirectory', () => {
        const cacheDirectory = versionUse.cacheDirectory();
        assert.ok(cacheDirectory);
      });
    });
  });

  describe('unhappy path', () => {
    it('invalid versions', (done) => {
      versionUse('1.d.4', NODE, ['--version'], OPTIONS)
        .then(() => assert.ok(false))
        .catch((err) => {
          assert.ok(!!err);
          done();
        });
    });

    it('invalid versions', (done) => {
      versionUse('14,bob', NODE, ['--version'], OPTIONS)
        .then(() => assert.ok(false))
        .catch((err) => {
          assert.ok(!!err);
          done();
        });
    });

    it('engines missing', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-missing'));
      versionUse('engines', NODE, ['--version'], Object.assign({ cwd: cwd }, OPTIONS))
        .then(() => assert.ok(false))
        .catch((err) => {
          assert.ok(!!err);
          done();
        });
    });

    it('engines node missing', (done) => {
      const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      versionUse(NODE, ['--version'], Object.assign({ cwd: cwd }, OPTIONS))
        .then(() => assert.ok(false))
        .catch((err) => {
          assert.ok(!!err);
          done();
        });
    });
  });
});
