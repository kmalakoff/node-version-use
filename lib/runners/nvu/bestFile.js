var arch = require('./arch')();

var PLATFORM_OS = {
  win32: 'win',
  darwin: 'osx',
};
var OS = PLATFORM_OS[process.platform] || process.platform;

var PLATFORM_FILES = {
  win32: ['zip', '7z', 'exe', 'msi'],
  darwin: ['tar', 'pkg'],
};

var FILES =
  typeof PLATFORM_FILES[process.platform] === 'undefined'
    ? [OS + '-' + arch]
    : PLATFORM_FILES[process.platform].map(function (type) {
        return OS + '-' + arch + '-' + type;
      });

module.exports = function bestFile(version) {
  var files = FILES.filter(function (description) {
    return ~version.files.indexOf(description);
  });
  return files.length ? files[0] : null;
};
