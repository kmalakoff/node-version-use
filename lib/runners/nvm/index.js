var path = require('path');
var osenv = require('osenv');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');

var access = require('../../access');

var HOME = osenv.home();
var NVM_DIR = path.join(HOME, '.nvm');

function NVMRunner() {}

NVMRunner.prototype.install = function install(callback) {
  if (process.plaftorm === 'win32') return callback(new Error('Unexpected plaftform: ' + process.plaftorm));
  access(NVM_DIR, function (err) {
    if (!err) return callback();

    crossSpawn(path.join(__dirname, 'install'), [], { stdout: 'string' }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));
      callback();
    });
  });
};

NVMRunner.prototype.use = function use(version, command, args, options, callback) {
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

module.exports = NVMRunner;
