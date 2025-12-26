import installModule from 'install-module-linked';
import type { InstallOptions, InstallResult } from 'node-version-install';
import path from 'path';
import url from 'url';

const _dirname = path.dirname(typeof __filename === 'undefined' ? url.fileURLToPath(import.meta.url) : __filename);
const nodeModules = path.join(_dirname, '..', '..', '..', 'node_modules');
const moduleName = 'node-version-install';

type InstallCallback = (err?: Error, results?: InstallResult[]) => void;
type InstallVersionFn = (version: string, options: InstallOptions, callback: InstallCallback) => void;

let cached: InstallVersionFn | undefined;

function loadModule(moduleName, callback) {
  if (typeof require === 'undefined') {
    import(moduleName)
      .then((mod) => {
        callback(null, mod?.default ?? null);
      })
      .catch(callback);
  } else {
    try {
      callback(null, require(moduleName));
    } catch (err) {
      callback(err, null);
    }
  }
}

export default function loadNodeVersionInstall(callback: (err: Error | null, installVersion: InstallVersionFn) => void): void {
  if (cached !== undefined) return callback(null, cached);

  installModule(moduleName, nodeModules, {}, (err) => {
    if (err) return callback(err, null);
    loadModule(moduleName, (err, _cached: InstallVersionFn) => {
      if (err) return callback(err, null);
      cached = _cached;
      callback(null, cached);
    });
  });
}
