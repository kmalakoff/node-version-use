var fs = require('fs');

module.exports =
  fs.access ||
  function existsAccess(fullPath, callback) {
    // eslint-disable-next-line node/no-deprecated-api
    fs.exists(fullPath, function existsAccess(exists) {
      if (exists) return callback();
      var err = new Error("ENOENT: no such file or directory, access '" + fullPath + "'");
      err.code = 'ENOENT';
      err.errno = -2;
      callback(err);
    });
  };
