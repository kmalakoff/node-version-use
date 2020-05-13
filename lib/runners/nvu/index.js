var path = require('path');
var fs = require('fs');
var osenv = require('osenv');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var filter = require('loadash.filter');
var mkdirp = require('mkdirp');
var download = require('get-remote');

var fsExists = require('../fsExists');
var OS_FILES = require('./OS_FILES');

var HOME = osenv.home();
var NVU_DIR = path.join(HOME, '.nvu');
var NVU_CACHE_DIR = path.join(NVU_DIR, 'cache');
var NVU_INSTALLED_DIR = path.join(NVU_DIR, 'installed');

function NVURunner() {}

NVURunner.prototype.cacheVersion = function cacheVersion(version, callback) {
  var fullPath = path.join(NVU_CACHE_DIR, version.version);
  fsExists(fullPath, function (exists) {
    if (exists) return callback();

    download();
  });
};

NVURunner.prototype.installVersion = function installVersion(version, callback) {
  var fullPath = path.join(NVU_INSTALL_DIR, version.version);
  exists;

  this.isInstalled(version, function (err, isInstalled) {
    if (err) return callback(err);
    if (isInstalled) return callback();

    var files = filter(OS_FILES, function (file) {
      return ~version.files.indexOf(file);
    });
    if (!files.length) return callback(new Error('No files to install'));

    var fullPath = path.join(NVU_DIR, version.version);
  });
};

NVURunner.prototype.use = function use(version, command, args, options, callback) {
  this.install(version, function (err) {
    if (err) return callback(err);

    crossSpawn(path.join(__dirname, 'install-version'), [version], { stdout: 'string', env: { HOME: HOME } }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm version ' + version));

      crossSpawn(path.join(NVM_DIR, 'nvm-exec'), [command].concat(args), assign({ env: { NODE_VERSION: version } }, options), function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));
        callback(null, res);
      });
    });
  });
};

module.exports = NVURunner;
