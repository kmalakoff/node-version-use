var path = require('path');
var fs = require('fs');
var osenv = require('osenv');
var crossSpawn = require('cross-spawn-cb');
var uuid = require('uuid');
var mkdirp = require('mkdirp');
var Queue = require('queue-cb');

var TEMP_DIR = path.resolve(path.join(__dirname, '..', '..', '.tmp'));
var NVM_DIR = path.join(osenv.home(), '.nvm');

function checkoutLatest(callback) {
  console.log('Checkout nvm');
  crossSpawn('git', ['rev-list', '--tags', '--max-count=1'], { stdout: 'string', cwd: NVM_DIR }, function (err, res) {
    if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));

    crossSpawn('git', ['describe', '--abbrev=0', '--tags', '--match', 'v[0-9]*', res.stdout.split('\n')[0]], { stdout: 'string', cwd: NVM_DIR }, function (
      err,
      res
    ) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));

      crossSpawn('git', ['checkout', res.stdout.split('\n')[0]], { stdout: 'string', cwd: NVM_DIR }, function (err, res) {
        if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));
        callback(null, true);
      });
    });
  });
}

function installVersion(version, callback) {
  var tempFile = path.join(TEMP_DIR, uuid.v4());
  var contents = '#!/bin/sh\nexport NVM_DIR="$HOME/.nvm"\n';
  contents += '[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"\n';
  contents += 'nvm use ' + version + ' &> /dev/null\n';
  contents += 'if [ $? -eq 0 ]; then exit 0; else nvm install ' + version + '; fi';
  var queue = new Queue(1);
  queue.defer(function (callback) {
    mkdirp(TEMP_DIR, function () {
      callback();
    });
  });
  queue.defer(fs.writeFile.bind(null, tempFile, contents, { mode: '755' }));
  queue.defer(function (callback) {
    crossSpawn(tempFile, [], { stdio: 'inherit' }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm version: ' + version));
      callback();
    });
  });
  queue.await(function (err) {
    fs.unlink(tempFile, function () {
      callback(err);
    });
  });
}

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

    console.log('Cloning nvm from: https://github.com/nvm-sh/nvm.git');
    crossSpawn('git', ['clone', 'https://github.com/nvm-sh/nvm.git', NVM_DIR], { stdout: 'string' }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to install nvm'));

      checkoutLatest(function (err) {
        err ? callback(err) : callback(null, true);
      });
    });
  });
};

NVMRunner.prototype.spawn = function spawn(version, command, args, callback) {
  installVersion(version, function (err) {
    if (err) return callback(err);
    crossSpawn(path.join(NVM_DIR, 'nvm-exec'), [command].concat(args), { stdio: 'inherit', env: { NODE_VERSION: version } }, function (err, res) {
      if (err || res.code !== 0) return callback(err || new Error('Failed to use nvm version: ' + version));
      callback();
    });
  });
};

module.exports = NVMRunner;
