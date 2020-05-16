var path = require('path');
var fs = require('fs');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var mkdirp = require('mkdirp');
var download = require('get-remote');

var access = require('../../access');
var bestFile = require('./bestFile');
var fileToPath = require('./fileToPath');

var PATH_KEY = require('./pathKey')();
var HOME = require('osenv').home();
var NVU_DIR = path.join(HOME, '.nvu');
var NVU_CACHE_DIR = path.join(NVU_DIR, 'cache');
var NVU_INSTALLED_DIR = path.join(NVU_DIR, 'installed');

function NVURunner() {}

var COMPRESSED_EXTENSIONS = ['.gz', '.zip', '.7z'];
var DELIMITER = process.platform === 'win32' ? ';' : ':';

NVURunner.prototype.installVersion = function installVersion(version, callback) {
  var versionPath = path.join(NVU_INSTALLED_DIR, version.version);
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

    var versionPath = path.join(NVU_INSTALLED_DIR, version.version);
    var binPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'bin');
    var libPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'lib');
    var manPath = process.platform === 'win32' ? versionPath : path.join(versionPath, 'man');
    var envPath = binPath + DELIMITER + process.env[PATH_KEY];
    var execPath = path.join(binPath, process.platform === 'win32' ? 'node.exe' : 'node');
    var env = assign({}, process.env);
    for (var key in env) {
      if (key.indexOf('npm_') === 0) delete env[key];
    }
    env = assign(env, {
      NODE: execPath,
      NODE_PATH: libPath,
      npm_config_prefix: versionPath,
      npm_config_binroot: binPath,
      npm_config_root: libPath,
      npm_config_man: manPath,
    });
    env[PATH_KEY] = envPath;

    crossSpawn(command, args, assign({}, options, { cwd: process.cwd(), path: envPath, execPath: execPath, env: env }), function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to use nvu version: ' + version.version + '. Code: ' + res.code));
      callback(null, res);
    });
  });
};

module.exports = NVURunner;
