import installModule from 'install-module-linked-compat';
import type { InstallOptions, InstallResult } from 'node-version-install';
import path from 'path';
import url from 'url';

const _dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const nodeModules = path.join(_dirname, '..', '..', '..', 'node_modules');
const moduleName = 'node-version-install';

type InstallCallback = (err?: Error | null, results?: InstallResult[]) => void;
type InstallVersionFn = (version: string, options: InstallOptions, callback: InstallCallback) => void;

let cached: InstallVersionFn | undefined;

function loadModule(moduleName: string, callback: (err: Error | null, mod: InstallVersionFn | null) => void) {
  if (typeof require === 'undefined') {
    import(moduleName)
      .then((mod) => {
        callback(null, mod?.default ?? null);
      })
      .catch((err) => callback(err instanceof Error ? err : new Error(String(err)), null));
  } else {
    try {
      callback(null, require(moduleName));
    } catch (err) {
      callback(err instanceof Error ? err : new Error(String(err)), null);
    }
  }
}

export default function loadNodeVersionInstall(callback: (err?: Error | null, installVersion?: InstallVersionFn) => void): void {
  if (cached !== undefined) return callback(undefined, cached);

  installModule(moduleName, nodeModules, {}, (err) => {
    if (err) return callback(err);
    loadModule(moduleName, (err, _cached) => {
      if (err) return callback(err instanceof Error ? err : new Error(String(err)));
      if (!_cached) return callback(new Error(`Failed to load ${moduleName}`));
      cached = _cached;
      callback(undefined, cached);
    });
  });
}
