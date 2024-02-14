const path = require('path');
const assign = require('just-extend');
const Queue = require('queue-cb');
const installRelease = require('node-install-release');
const versionUtils = require('node-version-utils');
const resolveVersions = require('node-resolve-versions');

const constants = require('./constants');
const spawnKeys = ['encoding', 'stdio', 'stdin', 'stdout', 'stderr', 'cwd', 'env'];

module.exports = function use(versionExpression, command, args, options, callback) {
  resolveVersions(versionExpression, assign({}, options, { path: 'raw' }), (err, versions) => {
    if (err) return callback(err);
    if (!versions.length) return callback(new Error(`No versions found from expression: ${versionExpression}`));

    const spawnOptions = {};
    for (let i = 0; i < spawnKeys.length; i++) {
      if (options[spawnKeys[i]] !== undefined) spawnOptions[spawnKeys[i]] = options[spawnKeys[i]];
    }

    const results = [];
    const queue = new Queue(1);
    for (let index = 0; index < versions.length; index++) {
      ((version) => {
        queue.defer((callback) => {
          !options.header || options.header(version.version, command, args);

          const installDirectory = options.installDirectory || constants.installDirectory;
          const cacheDirectory = options.cacheDirectory || constants.cacheDirectory;
          const installPath = path.join(installDirectory, version.version);

          installRelease(version, installPath, { cacheDirectory: cacheDirectory }, (err) => {
            if (err) return callback(err);

            versionUtils.spawn(installPath, command, args, spawnOptions, (err, res) => {
              results.push({ version: version.version, error: err, result: res });
              callback();
            });
          });
        });
      })(versions[index]);
    }
    queue.await((err) => {
      err ? callback(err) : callback(null, results);
    });
  });
};
