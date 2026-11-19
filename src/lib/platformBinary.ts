import cpuArch from 'cpu-arch';
import Module from 'module';
import path from 'path';

const _require = typeof require === 'undefined' ? Module.createRequire(import.meta.url) : require;

// The binary is a Go shim that has to match the machine, not the node running nvu: an old node on
// Windows x64 reports ia32 while npm installed the x64 package. The run arch is tried first, then the machine's.
export const platformPackageName = `nvu-${process.platform}-${process.arch}`;

export interface PlatformBinary {
  path: string;
  version: string;
}

function resolveManifest(packageName: string): string | null {
  try {
    return _require.resolve(`${packageName}/package.json`);
  } catch (_e) {
    return null;
  }
}

/**
 * Resolve the nvu binary shipped by the platform package for the running node's arch, else the machine's.
 * Throws naming both packages and the install that fixes it when neither is present.
 */
export function resolvePlatformBinary(runArch: string = process.arch, machineArch?: string): PlatformBinary {
  const runPackage = `nvu-${process.platform}-${runArch}`;
  let manifestPath = resolveManifest(runPackage);
  if (!manifestPath) {
    const machinePackage = `nvu-${process.platform}-${machineArch || cpuArch()}`;
    manifestPath = machinePackage === runPackage ? null : resolveManifest(machinePackage);
    if (!manifestPath) {
      const tried = machinePackage === runPackage ? runPackage : `${runPackage} or ${machinePackage}`;
      throw new Error([`${tried} is not installed. The nvu binary for ${process.platform} ships as an optional dependency of node-version-use.`, `Install it with: npm install ${machinePackage}`, 'An install run with --omit=optional skips it, as does an unsupported platform.'].join('\n'));
    }
  }

  const ext = process.platform === 'win32' ? '.exe' : '';
  return { path: path.join(path.dirname(manifestPath), 'bin', `nvu${ext}`), version: _require(manifestPath).version };
}
