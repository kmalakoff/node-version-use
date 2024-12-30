import resolveVersions from 'node-resolve-versions';
import install from 'node-version-install';
import { spawn } from 'node-version-utils';
import Queue from 'queue-cb';
import { installPath } from './constants';

export default function worker(versionExpression, command, args, options, callback) {
  resolveVersions(versionExpression, options, (err, versions) => {
    if (err) return callback(err);
    if (!versions.length) return callback(new Error(`No versions found from expression: ${versionExpression}`));

    const results = [];
    const queue = new Queue(1);
    versions.forEach((version) =>
      queue.defer((cb) =>
        install(version, { installPath }, (err, install) => {
          if (err) return cb(err);

          spawn(install.installPath, command, args, options, (error, result) => {
            results.push({ ...install, version, error, result });
            cb();
          });
        })
      )
    );
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
}
