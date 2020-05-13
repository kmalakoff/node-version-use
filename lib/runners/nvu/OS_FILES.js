var osarch = require('./osarch');

var OS_FILES = {
  win: ['zip', '7z', 'exe', 'msi'],
  osx: ['tar', 'pkg'],
};

module.exports = OS_FILES[osarch.os]
  ? OS_FILES[osarch.os].map(function (type) {
      return osarch.os + '-' + osarch.arch + '-' + type;
    })
  : [osarch.os + '-' + osarch.arch];
