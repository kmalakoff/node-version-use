var path = require('path');
var assign = require('object-assign');
var crossSpawn = require('cross-spawn-cb');

var NAVE_PATH = path.resolve(path.join(__dirname, '..', '..', 'node_modules', '.bin', 'nave'));

function NaveRunner() {}
NaveRunner.prototype.use = function use(version, command, args, options, callback) {
  crossSpawn(NAVE_PATH, ['use', version, command].concat(args), assign({ env: { NODE_VERSION: version } }, options), function (err, res) {
    if (err) return callback(err);
    return callback(null, res);
  });
};

module.exports = NaveRunner;
