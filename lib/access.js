var fs = require('fs');

module.exports =
  fs.access ||
  function existsAccess(fullPath, callback) {
    fs.exists(fullpath, function (exists) {
      exists ? callback() : callback(new Error());
    });
  };
