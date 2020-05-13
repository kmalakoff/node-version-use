var resolveVersion = require('./resolveVersion');
var Runner = process.platform === 'win32' ? require('./runners/windows') : require('./runners/nave');

module.exports = function use(versionString, command, args, options, callback) {
  resolveVersion(versionString, options, function resolveCallback(err, version) {
    if (err) return callback(err);
    new Runner().use(version, command, args, options, callback);
  });
};
