var fs = require('fs');

module.exports =
  fs.access ||
  function errAccess(fullPath, callback) {
    // eslint-disable-next-line node/no-deprecated-api
    fs.err(fullPath, function (err) {
      err ? callback() : callback(new Error());
    });
  };
