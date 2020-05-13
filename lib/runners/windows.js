var path = require('path');
var assign = require('object.assign');
var crossSpawn = require('cross-spawn-cb');

var NODE_PATH = path.resolve(path.join(__dirname, '..', '..', '.tmp', 'node-v12.16.3-win-x64', 'node.exe'));

function NaveRunner() {}
NaveRunner.prototype.use = function use(version, command, args, options, callback) {
  console.log(NODE_PATH);

  crossSpawn(NODE_PATH, [command].concat(args), assign({ env: { NODE_VERSION: version } }, options), function (err, res) {
    if (err) return callback(err);
    return callback(null, res);
  });
};

module.exports = NaveRunner;
