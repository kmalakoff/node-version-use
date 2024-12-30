// remove NODE_OPTIONS from ts-dev-stack
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
  cachePath: path.join(TMP_DIR, 'cache'),
  installPath: path.join(TMP_DIR, 'installed'),
  buildPath: path.join(TMP_DIR, 'build'),
  now: now, // BE CAREFUL - this fixes a moment in time
  encoding: 'utf8',
  silent: true,
};

describe('promise', () => {
  (() => {
    // patch and restore promise
    let rootPromise;
    before(() => {
      rootPromise = global.Promise;
      global.Promise = require('pinkie-promise');
    });
    after(() => {
      global.Promise = rootPromise;
    });
  })();

  describe('clean directories', () => {
    before((cb) => rimraf2(TMP_DIR, { disableGlob: true }, cb.bind(null, null)));

    describe('happy path', () => {
      it('one version - 12', async () => {
        const results = await versionUse('12', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
      });

      it('lts version - lts/erbium', async () => {
        const results = await versionUse('lts/erbium', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
      });

      it('lts/argon version - lts/argon', async () => {
        const results = await versionUse('lts/argon', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.equal(versionLines(results[0].result.stdout).slice(-1)[0], 'v4.9.1');
      });

      it('multiple versions - 10,12,lts/erbium', async () => {
        const results = await versionUse('10,12,lts/erbium', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
        assert.ok(versionLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
      });

      it('multiple versions - 10,12,lts/erbium (sort -1)', async () => {
        const results = await versionUse('10,12,lts/erbium', NODE, ['--version'], { sort: -1, ...OPTIONS });
        assert.ok(results.length > 0);
        assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        assert.ok(versionLines(results[1].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
      });

      it('using engines - 12', async () => {
        const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines'));
        const results = await versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS });
        assert.ok(results.length > 0);
        assert.ok(versionLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
      });
    });

    describe('unhappy path', () => {
      it('invalid versions', async () => {
        try {
          await versionUse('1.d.4', NODE, ['--version'], OPTIONS);
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });

      it('invalid versions', async () => {
        try {
          await versionUse('14,bob', NODE, ['--version'], OPTIONS);
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });

      it('engines missing', async () => {
        const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-missing'));
        try {
          await versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS });
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });

      it('engines node missing', async () => {
        const cwd = path.resolve(path.join(__dirname, '..', 'data', 'engines-node-missing'));
        try {
          await versionUse(NODE, ['--version'], { cwd, ...OPTIONS });
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });
    });
  });
});
