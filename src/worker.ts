import spawn, { type SpawnOptions } from 'cross-spawn-cb';
import resolveVersions, { type VersionOptions } from 'node-resolve-versions';
import installVersion, { type InstallOptions } from 'node-version-install';
import { spawnOptions as createSpawnOptions } from 'node-version-utils';
import Queue from 'queue-cb';
import spawnStreaming from 'spawn-streaming';
import spawnTerm from 'spawn-term';
import { storagePath } from './constants.ts';

import type { Options, UseCallback, UseOptions, UseResult } from './types.ts';

export default function worker(versionExpression: string, command: string, args: string[], options: UseOptions, callback: UseCallback): undefined {
  resolveVersions(versionExpression, options as VersionOptions, (err?: Error, versions?: string[]) => {
    if (err) {
      callback(err);
      return;
    }
    if (!versions.length) {
      callback(new Error(`No versions found from expression: ${versionExpression}`));
      return;
    }

    const installOptions = { storagePath, ...options } as InstallOptions;
    const streamingOptions = options as Options;
    const results: UseResult[] = [];
    const queue = new Queue(1);
    versions.forEach((version: string) => {
      queue.defer((cb) => {
        installVersion(version, installOptions, (_err, installs) => {
          const install = installs && installs.length === 1 ? installs[0] : null;
          if (!install) {
            results.push({ install, command, version, error: new Error(`Unexpected version results for version ${version}. Install ${JSON.stringify(installs)}`), result: null });
            return callback();
          }
          const spawnOptions = createSpawnOptions(install.installPath, options as SpawnOptions);
          const prefix = install.version;

          function next(err?, res?): undefined {
            if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
              res = err;
              err = null;
            }
            results.push({ install, command, version, error: err, result: res });
            cb();
          }

          if (versions.length < 2) return spawn(command, args, spawnOptions, next);
          if (spawnTerm && !streamingOptions.streaming) spawnTerm(command, args, spawnOptions, { group: prefix, expanded: streamingOptions.expanded }, next);
          else spawnStreaming(command, args, spawnOptions, { prefix }, next);
        });
      });
    });
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
}
