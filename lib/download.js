var path = require('path');
var fs = require('fs');
var https = require('https');
var mkdirp = require('mkdirp');
var url = require('url');
var callOnce = require('call-once-fn');

module.exports = function download(target, source, callback) {
  callback = callOnce(callback);

  mkdirp(path.dirname(target), function (err) {
    if (err) return callback(err);

    // eslint-disable-next-line node/no-deprecated-api
    var parsed = url.parse(source);
    var req = https.request({ host: parsed.host, path: parsed.path, port: 443 });

    req.on('response', function (res) {
      res
        .pipe(fs.createWriteStream(target))
        .on('error', function (err) {
          fs.unlink(target, function (err2) {
            callback(err || err2);
          });
        })
        .on('close', function () {
          callback();
        });
    });
    req.end();
  });
};
