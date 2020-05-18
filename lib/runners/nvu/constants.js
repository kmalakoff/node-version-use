var path = require('path');

var isWindows = process.platform === 'win32';

var PATH_KEY = require('./pathKey')();
var DELIMITER = isWindows ? ';' : ':';
var NODE = isWindows ? 'node.exe' : 'node';
var HOME = require('osenv').home();
var NVU = path.join(HOME, '.nvu');
var NVU_CACHE = path.join(NVU, 'cache');
var NVU_INSTALLED = path.join(NVU, 'installed');

module.exports = {
  PATH_KEY: PATH_KEY,
  DELIMITER: DELIMITER,
  NODE: NODE,
  HOME: HOME,
  NVU: NVU,
  NVU_CACHE: NVU_CACHE,
  NVU_INSTALLED: NVU_INSTALLED,
};
