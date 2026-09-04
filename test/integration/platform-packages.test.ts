import assert from 'assert';
import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const platforms = JSON.parse(fs.readFileSync(path.join(root, 'scripts', 'platforms.json'), 'utf8')) as { platform: string; arch: string }[];
const names = platforms.map((entry) => `nvu-${entry.platform}-${entry.arch}`);

describe('platform packages', () => {
  it('declares every matrix platform at one binary version', () => {
    // The binary version is deliberately independent of the parent's: the Go binary changes far
    // less often, so most releases re-pin nothing and publish no binary packages.
    assert.deepEqual(Object.keys(pkg.optionalDependencies).sort(), names.slice().sort());
    const pinned = pkg.optionalDependencies[names[0]];
    for (let i = 0; i < names.length; i++) {
      assert.strictEqual(pkg.optionalDependencies[names[i]], pinned, `${names[i]} pinned at ${pkg.optionalDependencies[names[i]]}, not ${pinned}; run npm run pin:platform-packages`);
    }
  });

  it('covers this machine with exactly one package', () => {
    const matches = platforms.filter((entry) => entry.platform === process.platform && entry.arch === process.arch);
    assert.strictEqual(matches.length, 1, `${process.platform}-${process.arch} matched ${matches.length} platform packages`);
  });

  it('runs no install lifecycle script', () => {
    // The reason the binary ships as optionalDependencies at all: npm 12 blocks dependency
    // install scripts unless every consumer allowlists this package.
    for (const script of ['preinstall', 'install', 'postinstall']) {
      assert.strictEqual(pkg.scripts[script], undefined, `${script} would put node-version-use back in every consumer's allowScripts`);
    }
  });

  it('publishes dist only', () => {
    assert.deepEqual(pkg.files, ['dist']);
  });
});
