var fs = require('fs');

module.exports = function exists(fullPath, callback) {
  if (fs.access)
    return fs.access(fullPath, function (missing) {
      // eslint-disable-next-line standard/no-callback-literal
      callback(!missing);
    });
  // eslint-disable-next-line node/no-deprecated-api
  fs.exists(fullPath, callback);
};
