var path = require('path');
var fs = require('fs');
var osenv = require('osenv');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');
var mkdirp = require('mkdirp');
var download = require('get-remote');

var access = require('../../access');
var bestFile = require('./bestFile');
var fileToPath = require('./fileToPath');
var arch = require('./arch')();

var HOME = osenv.home();
var NVU_DIR = path.join(HOME, '.nvu');
var NVU_CACHE_DIR = path.join(NVU_DIR, 'cache');
var NVU_INSTALLED_DIR = path.join(NVU_DIR, 'installed');

function NVURunner() {}

// NVURunner.prototype.cacheVersion = function cacheVersion(version, callback) {
//   var fullPath = path.join(NVU_CACHE_DIR, version.version);
//   access(fullPath, function (err) {
//     if (!err) return callback();

//     download();
//   });
// };

var COMPRESSED_EXTENSIONS = ['.gz', '.zip', '.7z'];

NVURunner.prototype.installVersion = function installVersion(version, callback) {
  var fullPath = path.join(NVU_INSTALLED_DIR, version.version);
  access(fullPath, function (err) {
    if (!err) return callback();

    var file = bestFile(version);
    if (!file) return callback(new Error('No installer available for ' + version.version + ' for ' + process.platform + '-' + arch));

    var downloadPath = fileToPath(file, version);
    var isCompressed = !!~COMPRESSED_EXTENSIONS.indexOf(path.extname(downloadPath));
    download('https://nodejs.org/dist/' + downloadPath, fullPath, isCompressed ? { extract: true, strip: 1 } : {}, function (err) {
      err ? callback(err) : callback();
    });
  });
};

NVURunner.prototype.use = function use(version, command, args, options, callback) {
  this.installVersion(version, function (err) {
    if (err) return callback(err);
    callback();

    // crossSpawn(path.join(__dirname, 'install-version'), [version], { stdout: 'string', env: { HOME: HOME } }, function (err, res) {
    //   if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm version ' + version));

    //   crossSpawn(path.join(NVM_DIR, 'nvm-exec'), [command].concat(args), assign({ env: { NODE_VERSION: version } }, options), function (err, res) {
    //     if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));
    //     callback(null, res);
    //   });
    // });
  });
};

module.exports = NVURunner;
