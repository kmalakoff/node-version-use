import Module from 'module';
import path from 'path';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// npm selects an optional dependency by matching its os/cpu fields against process.platform and
// process.arch, so the same two values name the package that install actually left on disk.
export const platformPackageName = `nvu-${process.platform}-${process.arch}`;

export interface PlatformBinary {
  path: string;
  version: string;
}

/**
 * Resolve the nvu binary shipped by this platform's binary package.
 * Throws naming the install that fixes it when the package is absent.
 */
export function resolvePlatformBinary(): PlatformBinary {
  let manifestPath: string;
  try {
    manifestPath = _require.resolve(`${platformPackageName}/package.json`);
  } catch (_e) {
    throw new Error(
      [`${platformPackageName} is not installed. It ships the nvu binary for ${process.platform}-${process.arch} and installs as an optional dependency of node-version-use.`, `Install it with: npm install ${platformPackageName}`, 'An install run with --omit=optional skips it, as does an unsupported platform.'].join(
        '\n'
      )
    );
  }

  const ext = process.platform === 'win32' ? '.exe' : '';
  return { path: path.join(path.dirname(manifestPath), 'bin', `nvu${ext}`), version: _require(manifestPath).version };
}
