import spawn from 'cross-spawn-cb';
import resolveVersions from 'node-resolve-versions';
import installVersion from 'node-version-install';
import { spawnOptions } from 'node-version-utils';
import Queue from 'queue-cb';
import spawnStreaming from 'spawn-streaming';
import { storagePath } from './constants';

export default function worker(versionExpression, command, args, options, callback) {
  resolveVersions(versionExpression, options, (err, versions) => {
    if (err) return callback(err);
    if (!versions.length) return callback(new Error(`No versions found from expression: ${versionExpression}`));

    const installOptions = { storagePath, ...options };
    const results = [];
    const queue = new Queue(1);
    versions.forEach((version) =>
      queue.defer((cb) => {
        installVersion(version, installOptions, (_err, installs) => {
          const install = installs && installs.length === 1 ? installs[0] : null;
          if (!install) {
            results.push({ install, command, version, error: new Error(`Unexpected version results for version ${version}. Install ${JSON.stringify(installs)}`), result: null });
            return callback();
          }
          const prefix = install.version;

          const next = (err, res) => {
            if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
              res = err;
              err = null;
            }
            results.push({ install, command, version, error: err, result: res });
            cb();
          };

          if (versions.length < 2) return spawn(command, args, spawnOptions(install.installPath, options), next);
          spawnStreaming(command, args, spawnOptions(install.installPath, options), { prefix }, next);
        });
      })
    );
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
}
