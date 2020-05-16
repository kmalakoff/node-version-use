var path = require('path');
var fs = require('fs');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var mkdirp = require('mkdirp');
var download = require('get-remote');

var access = require('../../access');
var bestFile = require('./bestFile');
var constants = require('./constants');
var cleanEnvPaths = require('./cleanEnvPaths');
var fileToPath = require('./fileToPath');

var PATH_KEY = constants.PATH_KEY;
var DELIMITER = constants.DELIMITER;
var HOME = constants.HOME;
var NVU = constants.NVU;
var NVU_CACHE = constants.NVU_CACHE;
var NVU_INSTALLED = constants.NVU_INSTALLED;

function NVURunner() {}

NVURunner.prototype.installVersion = function installVersion(version, callback) {
  var versionPath = path.join(NVU_INSTALLED, version.version);
  access(versionPath, function (err) {
    if (!err) return callback();

    var file = bestFile(version);
    if (!file) return callback(new Error('No installer available for ' + version.version + ' for ' + process.platform + '-' + require('./arch')()));

    var downloadPath = fileToPath(file, version);
    var isCompressed = !!~COMPRESSED_EXTENSIONS.indexOf(path.extname(downloadPath));
    download('https://nodejs.org/dist/' + downloadPath, versionPath, isCompressed ? { extract: true, strip: 1 } : {}, function (err) {
      err ? callback(err) : callback();
    });
  });
};

NVURunner.prototype.use = function use(version, command, args, options, callback) {
  this.installVersion(version, function (err) {
    if (err) return callback(err);

    var versionPath = path.join(NVU_INSTALLED, version.version);
    var binPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'bin');
    var libPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'lib');
    var manPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'man');

    var envPath = binPath + DELIMITER + cleanEnvPaths();
    // var envPath = process.env[PATH_KEY] + DELIMITER + binPath
    var execPath = path.join(binPath, process.platform === 'win32' ? 'node.exe' : 'node');
 
    var env = assign({}, process.env);
    for (var key in env) {
      var upperKey = key.toUpperCase();       
      if (key === 'NODE') delete env[key];
      else if (upperKey.indexOf('NPM_') === 0) delete env[key];
      else if (upperKey.indexOf('NVM_') === 0) delete env[key];
      else if (upperKey.indexOf('NODE_') === 0) delete env[key];
    }
    env = assign(env, {
      NODE_PATH: libPath,
      npm_config_prefix: versionPath,
      npm_config_binroot: binPath,
      npm_config_root: libPath,
      npm_config_man: manPath,
    });
    env[PATH_KEY] = envPath;
    process.env.PATH = envPath; // which in cross-spawn uses this

    crossSpawn(command, args, assign({}, options, { cwd: process.cwd(), path: envPath, execPath: execPath, env: env }), callback)
  });
};

module.exports = NVURunner;

