var path = require('path');
var assign = require('object-assign');
var resolveVersion = require('./resolveVersion');
var Runner = require('./runners/nvu');

var HOME = require('osenv').home();
var DEFAULT_OPTIONS = {
  cacheDirectory: path.join(HOME, '.nvu', 'cache'),
  installedDirectory: path.join(HOME, '.nvu', 'installed'),
};

module.exports = function use(versionString, command, args, options, callback) {
  options = assign({}, DEFAULT_OPTIONS, options);

  resolveVersion(versionString, options, function resolveCallback(err, version) {
    if (err) return callback(err);
    new Runner().use(version, command, args, options, callback);
  });
};
