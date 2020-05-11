var path = require('path');
var commandExists = require('command-exists');
var crossSpawn = require('cross-spawn-cb');

var NAVE_PATH = path.resolve(path.join(__dirname, '..', '..', 'node_modules', '.bin', 'nave'));

function NaveRunner() {}
NaveRunner.name = 'nave';

NaveRunner.prototype.isInstalled = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  commandExists('nave', callback);
};

NaveRunner.prototype.install = function install(callback) {
  this.isInstalled(callback);
};

NaveRunner.prototype.spawn = function spawn(version, command, args, callback) {
  crossSpawn(NAVE_PATH, ['use', version, command].concat(args), { stdio: 'inherit' }, function (err, res) {
    if (err) return callback(err);
    return callback(null, res);
  });
};

module.exports = NaveRunner;
