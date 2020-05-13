var path = require('path');
var osenv = require('osenv');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');

var access = require('../access');
var download = require('../download');

var HOME = osenv.home();
var NVM_DIR = path.join(HOME, 'nvm');
var TMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var SOURCE_URL = 'https://raw.githubusercontent.com/jchip/nvm/v1.3.1/install.ps1';

function NVMWindowsRunner() {}

NVMWindowsRunner.prototype.isInstalled = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  access(NVM_DIR, function (err) {
    callback(null, !err);
  });
};

NVMWindowsRunner.prototype.install = function install(callback) {
  this.isInstalled(function (err, isInstalled) {
    if (err) return callback(err);
    if (isInstalled) return callback();

    var tempFile = path.join(TMP_DIR, 'install.ps1');

    download(tempFile, SOURCE_URL, function (err) {
      if (err) return callback(err);

      crossSpawn(tempFile, [], { stdout: 'inherit' }, function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));
        callback();
      });
    });
  });
};

NVMWindowsRunner.prototype.use = function use(version, command, args, options, callback) {
  this.install(function (err) {
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

module.exports = NVMWindowsRunner;
