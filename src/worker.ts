import spawn from 'cross-spawn-cb';
import resolveVersions from 'node-resolve-versions';
import installVersion from 'node-version-install';
import { spawnOptions as createSpawnOptions } from 'node-version-utils';
import Queue from 'queue-cb';
import spawnStreaming from 'spawn-streaming';
import spawnTerm from 'spawn-term';
import { storagePath } from './constants.js';

import type { UseResult } from './types.js';

export default function worker(versionExpression, command, args, options, callback) {
  resolveVersions(versionExpression, options, (err, versions) => {
    if (err) return callback(err);
    if (!versions.length) return callback(new Error(`No versions found from expression: ${versionExpression}`));

    const installOptions = { storagePath, ...options };
    const results: UseResult[] = [];
    const queue = new Queue(1);
    versions.forEach((version: string) =>
      queue.defer((cb) => {
        installVersion(version, installOptions, (_err, installs) => {
          const install = installs && installs.length === 1 ? installs[0] : null;
          if (!install) {
            results.push({ install, command, version, error: new Error(`Unexpected version results for version ${version}. Install ${JSON.stringify(installs)}`), result: null });
            return callback();
          }
          const spawnOptions = createSpawnOptions(install.installPath, options);
          const prefix = install.version;

          const next = (err, res) => {
            if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
              res = err;
              err = null;
            }
            results.push({ install, command, version, error: err, result: res });
            cb();
          };

          if (versions.length < 2) return spawn(command, args, spawnOptions, next);
          if (spawnTerm && !options.streaming) spawnTerm(command, args, spawnOptions, { group: prefix, expanded: options.expanded }, next);
          else spawnStreaming(command, args, spawnOptions, { prefix }, next);
        });
      })
    );
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
}
