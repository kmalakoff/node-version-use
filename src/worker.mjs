import spawn from 'cross-spawn-cb';
import resolveVersions from 'node-resolve-versions';
import install from 'node-version-install';
import { spawnOptions } from 'node-version-utils';
import Queue from 'queue-cb';
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
        !options.header || options.header(version, command, args);
        install(version, installOptions, (err, installs) => {
          if (err) return cb(err);
          if (installs.length !== 1) return callback(new Error(`Unexpected version results for version ${version}. Install ${installs}`));

          spawn(command, args, spawnOptions(installs[0].installPath, options), (err, res) => {
            if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
              res = err;
              err = null;
            }
            results.push({ ...install, command, version, error: err, result: res });
            cb();
          });
        });
      })
    );
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
}
