var path = require('path');
var fs = require('fs');
var osenv = require('osenv');
var crossSpawn = require('cross-spawn-cb');

var HOME = osenv.home();
var NVM_DIR = path.join(HOME, '.nvm');

function NVMRunner() {}
NVMRunner.name = 'nvm';

NVMRunner.prototype.isInstalled = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  fs.access(NVM_DIR, function (missing) {
    callback(null, !missing);
  });
};

NVMRunner.prototype.install = function install(callback) {
  this.isInstalled(function (err, isInstalled) {
    if (err) return callback(err);
    if (isInstalled) return callback(null, true);

    crossSpawn(path.join(__dirname, 'install'), [], { stdio: 'inherit' }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));
      callback();
    });
  });
};

NVMRunner.prototype.spawn = function spawn(version, command, args, callback) {
  crossSpawn(path.join(__dirname, 'install-version'), [version], { stdio: 'inherit', env: { HOME: HOME } }, function (err, res) {
    if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm version ' + version));

    crossSpawn(path.join(NVM_DIR, 'nvm-exec'), [command].concat(args), { stdio: 'inherit', env: { NODE_VERSION: version } }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));
      callback();
    });
  });
};

module.exports = NVMRunner;
