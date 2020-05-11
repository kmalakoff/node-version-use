var commandExists = require('command-exists');
var crossSpawn = require('cross-spawn-cb');

function NodistRunner() {}
NodistRunner.name = 'nodist';

NodistRunner.prototype.isInstalled = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  commandExists('nodist', callback);
};

NodistRunner.prototype.install = function install(callback) {
  this.isInstalled(function (err, isInstalled) {
    if (err) return callback(err);
    if (isInstalled) return callback(null, true);

    commandExists('choco', [], { stdio: 'inherit' }, function (err, isInstalled) {
      if (err) return callback(err);
      if (!isInstalled) return callback();

      crossSpawn('choco', ['install', 'nodist'], { stdio: 'inherit' }, function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to install nodist'));
        callback(null, true);
      });
    });
  });
};

NodistRunner.prototype.spawn = function spawn(version, command, args, callback) {
  crossSpawn('nodist', ['+', version], { stdio: 'inherit' }, function (err, res) {
    if (err || res.code !== 0) return callback(err || new Error('Failed to install nodist version: ' + version));

    crossSpawn('nodist', ['env', version], { stdio: 'inherit' }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to use nodist version: ' + version));

      crossSpawn(command, args, { stdio: 'inherit' }, function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to use nodist version: ' + version));
      });
    });
  });
};

module.exports = NodistRunner;
