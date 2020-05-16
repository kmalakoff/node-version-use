var path = require('path');
var filter = require('lodash.filter');
var endsWith = require('end-with');
var constants = require('./constants');

var PATH_KEY = constants.PATH_KEY;
var DELIMITER = constants.DELIMITER;
var NODE = constants.NODE;

var SUFFIXES = [path.join('', NODE), path.join('', 'node-gyp-bin'), path.join('nvm', 'bin')];
var ANYS = [path.join('', 'nodejs')];

module.exports = function cleanEnvPaths(paths) {
  if (typeof paths === 'undefined') paths = process.env[PATH_KEY];
  return filter(paths.split(DELIMITER), function (x) {
    for (var index = 0; index < SUFFIXES.length; index++) {
      if (endsWith(x, SUFFIXES[index])) return false;
    }
    for (var index = 0; index < ANYS.length; index++) {
      if (~x.indexOf(ANYS[index])) return false;
    }
    return true;
  }).join(DELIMITER);
};
