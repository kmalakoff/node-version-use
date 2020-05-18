var path = require('path');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var installRelease = require('node-install-release');

var constants = require('./constants');
var cleanEnv = require('./cleanEnv');
var cleanEnvPaths = require('./cleanEnvPaths');

var PATH_KEY = constants.PATH_KEY;
var DELIMITER = constants.DELIMITER;
var NVU_INSTALLED = constants.NVU_INSTALLED;
var INSTALL_OPTIONS = {
  cacheDirectory: constants.NVU_CACHE,
};

var isWindows = process.platform === 'win32';

function NVURunner() {}

NVURunner.prototype.use = function use(version, command, args, options, callback) {
  var installPath = path.join(NVU_INSTALLED, version.version);
  installRelease(version.version, installPath, INSTALL_OPTIONS, function (err) {
    if (err) return callback(err);

    var installPath = path.join(NVU_INSTALLED, version.version);
    var binPath = isWindows ? installPath : path.join(installPath, 'bin');
    var libPath = isWindows ? installPath : path.join(installPath, 'lib');
    var manPath = isWindows ? installPath : path.join(installPath, 'man');
    var execPath = path.join(binPath, isWindows ? 'node.exe' : 'node');
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
};

module.exports = NVURunner;
