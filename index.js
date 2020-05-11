var resolveVersion = require('./lib/resolveVersion');
var getRunner = require('./lib/getRunner');

module.exports = function nodeVersionUse(versionString, command, args, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof callback === 'function') {
    options = options || {};
    resolveVersion(versionString, options, function (err, version) {
      if (err) return callback(err);

      getRunner(function (err, runner) {
        if (err) return callback(err);
        runner.spawn(version, command, args, callback);
      });
    });
  } else {
    return new Promise(function (resolve, reject) {
      nodeVersionUse(versionString, command, args, options, function nodeVersionUseCallback(err, res) {
        err ? reject(err) : resolve(res);
      });
    });
  }
};
