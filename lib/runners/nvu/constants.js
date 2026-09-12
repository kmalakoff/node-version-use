var path = require('path');

var PATH_KEY = require('./pathKey')();
var DELIMITER = process.platform === 'win32' ? ';' : ':';
var NODE = process.platform === 'win32' ? 'node.exe' : 'node';
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
