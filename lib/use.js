var path = require('path');
var assign = require('object-assign');
var Queue = require('queue-cb');
var installRelease = require('node-install-release');
var versionUtils = require('node-version-utils');
var resolveVersions = require('node-resolve-versions');

var HOME = require('osenv').home();
var DEFAULT_OPTIONS = {
  cacheDirectory: path.join(HOME, '.nvu', 'cache'),
  installedDirectory: path.join(HOME, '.nvu', 'installed'),
};

module.exports = function use(versionExpression, command, args, options, callback) {
  resolveVersions(versionExpression, assign({}, options, { path: 'raw' }), function (err, versions) {
    if (err) return callback(err);
    if (!versions.length) return callback(new Error('No versions found from expression: ' + versionExpression));

    var spawnOptions = assign({}, options);
    if (!spawnOptions.stdout && !spawnOptions.stdio) spawnOptions.stdio = 'inherit';

    var results = [];
    var queue = new Queue(1);
    for (var index = 0; index < versions.length; index++) {
      (function (version) {
        queue.defer(function (callback) {
          !options.header || options.header(version.version, command, args);

          var installedDirectory = options.installedDirectory || DEFAULT_OPTIONS.installedDirectory;
          var cacheDirectory = options.cacheDirectory || DEFAULT_OPTIONS.cacheDirectory;
          var installPath = path.join(installedDirectory, version.version);

          installRelease(version, installPath, { cacheDirectory: cacheDirectory }, function (err) {
            if (err) return callback(err);

            versionUtils.spawn(installPath, command, args, spawnOptions, function (err, res) {
              results.push({ version: version.version, error: err, result: res });
              callback();
            });
          });
        });
      })(versions[index]);
    }
    queue.await(function (err) {
      err ? callback(err) : callback(null, results);
    });
  });
};
