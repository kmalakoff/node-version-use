var NodeSemvers = require('node-semvers');
var isArray = require('lodash.isarray');

module.exports = function resolveVersion(versionString, options, callback) {
  NodeSemvers.load({ cache: options.cache }, function (err, semvers) {
    if (err) return callback(err);

    var version = semvers.resolve(versionString, options);
    if (!version) return callback(new Error('Unrecognized version' + versionString));
    if (isArray(version)) return callback(new Error('Version string does not resolve to a single version ' + versionString));
    callback(null, version);
  });
};
