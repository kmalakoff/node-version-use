var commandExists = require('command-exists');
var crossSpawn = require('cross-spawn-cb');

function NVMWindowsRunner() {}
NVMWindowsRunner.name = 'nvm-windows';

NVMWindowsRunner.prototype.isInstalled = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  commandExists('nvm', callback);
};

NVMWindowsRunner.prototype.install = function install(callback) {
  this.isInstalled(function (err, isInstalled) {
    if (err) return callback(err);
    if (isInstalled) return callback(null, true);

    commandExists('choco', function (err, isInstalled) {
      if (err) return callback(err);
      if (!isInstalled) return callback();

      crossSpawn('choco', ['install', 'nvm'], function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));
        callback(null, true);
      });
    });
  });
};

NVMWindowsRunner.prototype.spawn = function spawn(version, command, args, callback) {
  crossSpawn('nvm', ['install', version], function (err, res) {
    if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm version: ' + version));

    crossSpawn('nvm', ['use', version], function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));

      crossSpawn(command, args, function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));
      });
    });
  });
};

module.exports = NVMWindowsRunner;
