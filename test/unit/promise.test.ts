// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import { safeRm } from 'fs-remove-compat';
import isVersion from 'is-version';
import versionUse from 'node-version-use';
import path from 'path';
import Pinkie from 'pinkie-promise';
import url from 'url';

import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(path.join(__dirname, '..', '..', '.tmp', 'promise'));
const OPTIONS = {
  storagePath: TMP_DIR,
  encoding: 'utf8' as BufferEncoding,
  silent: true,
  interactive: false,
};

describe('promise', () => {
  (() => {
    // patch and restore promise
    if (typeof global === 'undefined') return;
    const globalPromise = global.Promise;
    before(() => {
      global.Promise = Pinkie;
    });
    after(() => {
      global.Promise = globalPromise;
    });
  })();

  describe('clean directories', () => {
    before((cb) => safeRm(TMP_DIR, cb));
    after((cb) => safeRm(TMP_DIR, cb));

    describe('happy path', () => {
      it('one version - 12', async () => {
        const results = await versionUse('12', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
      });

      it('lts version - lts', async () => {
        const results = await versionUse('lts', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0].result.stdout).slice(-1)[0], 'v'));
      });

      it('multiple versions - 10,12,lts', async () => {
        const results = await versionUse('10,12,lts', NODE, ['--version'], OPTIONS);
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
        assert.ok(getLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        assert.ok(isVersion(getLines(results[1].result.stdout).slice(-1)[0], 'v'));
      });

      it('multiple versions - 10,12,lts (sort -1)', async () => {
        const results = await versionUse('10,12,lts', NODE, ['--version'], { sort: -1, ...OPTIONS });
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0].result.stdout).slice(-1)[0], 'v'));
        assert.ok(getLines(results[1].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
        assert.ok(getLines(results[2].result.stdout).slice(-1)[0].indexOf('v10.') === 0);
      });

      it('using engines', async () => {
        const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
        const results = await versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS });
        assert.ok(results.length > 0);
        assert.ok(getLines(results[0].result.stdout).slice(-1)[0].indexOf('v12.') === 0);
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
        const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-missing'));
        try {
          await versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS });
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });

      it('engines node missing', async () => {
        const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-node-missing'));
        try {
          const use = versionUse as (...args) => void;
          await use(NODE, ['--version'], { cwd, ...OPTIONS });
          assert.ok(false);
        } catch (err) {
          assert.ok(!!err);
        }
      });
    });
  });
});
