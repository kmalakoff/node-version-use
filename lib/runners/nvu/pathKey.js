var keys = require('lodash.keys');

module.exports = function pathKey() {
  if (process.platform !== 'win32') return 'PATH';

  var envKeys = keys(process.env);
  for (var index = envKeys.length - 1; index >= 0; index--) {
    var key = envKeys[index];
    if (key.toUpperCase() === 'PATH') return key;
  }
  return 'Path';
};
