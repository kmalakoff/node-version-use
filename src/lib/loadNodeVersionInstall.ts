import { loadModule } from 'install-module-linked';
import type { InstallOptions, InstallResult } from 'node-version-install';
import path from 'path';
import url from 'url';

const _dirname = path.dirname(typeof __dirname !== 'undefined' ? __dirname : url.fileURLToPath(import.meta.url));
const nodeModules = path.join(_dirname, '..', '..', 'node_modules');

type InstallCallback = (err?: Error, results?: InstallResult[]) => void;
type InstallVersionFn = (version: string, options: InstallOptions, callback: InstallCallback) => void;

let cached: InstallVersionFn | undefined;

export default function loadNodeVersionInstall(callback: (err: Error | null, installVersion: InstallVersionFn) => void): void {
  if (cached !== undefined) {
    callback(null, cached);
    return;
  }

  loadModule('node-version-install', nodeModules, (err, mod) => {
    if (err) return callback(err, null);
    cached = mod?.default ?? mod;
    callback(null, cached);
  });
}
