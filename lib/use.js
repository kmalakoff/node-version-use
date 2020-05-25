var path = require('path');
var assign = require('object-assign');
var resolveVersion = require('./resolveVersion');
var crossSpawn = require('cross-spawn-cb');
var installRelease = require('node-install-release');
var cleanEnv = require('./cleanEnv');
var cleanEnvPaths = require('./cleanEnvPaths');

var constants = require('./constants');
var PATH_KEY = constants.PATH_KEY;
var DELIMITER = constants.DELIMITER;
var NODE = constants.NODE;
var HOME = require('osenv').home();
var DEFAULT_OPTIONS = {
  cacheDirectory: path.join(HOME, '.nvu', 'cache'),
  installedDirectory: path.join(HOME, '.nvu', 'installed'),
};

var isWindows = process.platform === 'win32';

module.exports = function use(versionString, command, args, options, callback) {
  options = assign({}, DEFAULT_OPTIONS, options);

  resolveVersion(versionString, options, function resolveCallback(err, version) {
    if (err) return callback(err);

    var installPath = path.join(options.installedDirectory, version.version);
    installRelease(version.version, installPath, { cacheDirectory: options.cacheDirectory }, function (err) {
      if (err) return callback(err);

      var binPath = isWindows ? installPath : path.join(installPath, 'bin');
      var libPath = isWindows ? installPath : path.join(installPath, 'lib');
      var manPath = isWindows ? installPath : path.join(installPath, 'man');
      var execPath = path.join(binPath, NODE);
      var envPath = binPath + DELIMITER + cleanEnvPaths();
      var env = assign(cleanEnv(), {
        NODE_PATH: libPath,
        npm_config_prefix: installPath,
        npm_config_binroot: binPath,
        npm_config_root: libPath,
        npm_config_man: manPath,
      });
      env[PATH_KEY] = envPath;
      process.env.PATH = envPath; // which in cross-spawn uses this

      crossSpawn(command, args, assign({}, options, { cwd: process.cwd(), path: envPath, execPath: execPath, env: env }), callback);
    });
  });
};
