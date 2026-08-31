// remove NODE_OPTIONS to not interfere with tests
delete process.env.NODE_OPTIONS;

import assert from 'assert';
import fs from 'fs';
import { safeRm } from 'fs-remove-compat';
import isVersion from 'is-version';
import versionUse, { type UseOptions } from 'node-version-use';
import path from 'path';
import url from 'url';
import { mkdirRecursive } from '../lib/compat.ts';
import getLines from '../lib/getLines.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE ?? '');
const NODE = isWindows ? 'node.exe' : 'node';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const TMP_DIR = path.join(__dirname, '..', '..', '.tmp', 'callbacks');
const OPTIONS = {
  storagePath: TMP_DIR,
  encoding: 'utf8' as BufferEncoding,
  silent: true,
  interactive: false,
};

describe('callback', () => {
  before((cb) => safeRm(TMP_DIR, cb));
  after((cb) => safeRm(TMP_DIR, cb));

  describe('happy path', () => {
    it('one version - 12', (done) => {
      versionUse('12', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(
          getLines(results[0]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v12.') === 0
        );
        done();
      });
    });

    it('lts version - lts', (done) => {
      versionUse('lts', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0]?.result?.stdout ?? '').slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions - 10,12,lts', (done) => {
      versionUse('10,12,lts', NODE, ['--version'], OPTIONS, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(
          getLines(results[0]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v10.') === 0
        );
        assert.ok(
          getLines(results[1]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v12.') === 0
        );
        assert.ok(isVersion(getLines(results[1]?.result?.stdout ?? '').slice(-1)[0], 'v'));
        done();
      });
    });

    it('multiple versions - 10,12,lts (sort -1)', (done) => {
      versionUse('10,12,lts', NODE, ['--version'], { sort: -1, ...OPTIONS }, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(isVersion(getLines(results[0]?.result?.stdout ?? '').slice(-1)[0], 'v'));
        assert.ok(
          getLines(results[1]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v12.') === 0
        );
        assert.ok(
          getLines(results[2]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v10.') === 0
        );
        done();
      });
    });

    it('using engines', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines'));
      versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS }, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(
          getLines(results[0]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v12.') === 0
        );
        done();
      });
    });

    it('>=8', (done) => {
      versionUse('>=8', NODE, ['--version'], { range: 'major,even', ...OPTIONS } as unknown as UseOptions, (err, results) => {
        if (err) return done(err);
        if (!results) return done(new Error('missing results'));
        assert.ok(results.length > 0);
        assert.ok(
          getLines(results[0]?.result?.stdout ?? '')
            .slice(-1)[0]
            .indexOf('v8.') === 0
        );
        done();
      });
    });
  });

  describe('unhappy path', () => {
    it('invalid versions', (done) => {
      versionUse('1.d.4', NODE, ['--version'], OPTIONS, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('invalid versions', (done) => {
      versionUse('14,bob', NODE, ['--version'], OPTIONS, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-missing'));
      versionUse('engines', NODE, ['--version'], { cwd, ...OPTIONS }, (err) => {
        assert.ok(!!err);
        done();
      });
    });

    it('engines node missing', (done) => {
      const cwd = path.join(path.join(__dirname, '..', 'data', 'engines-node-missing'));
      const use = versionUse as (...args: unknown[]) => void;
      use(NODE, ['--version'], { cwd, ...OPTIONS }, (err: unknown) => {
        assert.ok(!!err);
        done();
      });
    });

    it('install failure does not silently fall through to another node binary', (done) => {
      // a regular file where a directory is expected forces node-install-release to fail
      // with a real ENOTDIR, regardless of platform, network, or build toolchain availability
      const blockerFile = path.join(TMP_DIR, 'blocker');
      mkdirRecursive(TMP_DIR);
      fs.writeFileSync(blockerFile, '');
      const storagePath = path.join(blockerFile, 'nested');

      versionUse('12', NODE, ['--version'], { ...OPTIONS, storagePath }, (err, results) => {
        if (err) return done(err);
        if (!results || results.length !== 1) return done(new Error(`expected exactly one result, got ${JSON.stringify(results)}`));
        assert.ok(results[0]?.error, 'a broken install must surface as a result error');
        assert.strictEqual(results[0]?.result, undefined, 'a broken install must not spawn the command at all');
        done();
      });
    });
  });
});
