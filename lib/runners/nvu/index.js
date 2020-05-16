var path = require('path');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var download = require('get-remote');

var access = require('../../access');
var bestFile = require('./bestFile');
var constants = require('./constants');
var cleanEnv = require('./cleanEnv');
var cleanEnvPaths = require('./cleanEnvPaths');
var fileToPath = require('./fileToPath');

var PATH_KEY = constants.PATH_KEY;
var DELIMITER = constants.DELIMITER;
// var NVU_CACHE = constants.NVU_CACHE;
var NVU_INSTALLED = constants.NVU_INSTALLED;
var COMPRESSED_EXTENSIONS = ['.gz', '.zip', '.7z'];

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
    var execPath = path.join(binPath, process.platform === 'win32' ? 'node.exe' : 'node');
    var envPath = binPath + DELIMITER + cleanEnvPaths();
    var env = assign(cleanEnv(), {
      NODE_PATH: libPath,
      npm_config_prefix: versionPath,
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
