"use strict";
var use = require("./use");
var constants = require("./constants");
module.exports = function nodeVersionUse(versionExpression, command, args, options, callback) {
    if (typeof options === "function") {
        callback = options;
        options = {};
    }
    if (typeof callback === "function") return use(versionExpression, command, args, options || {}, callback);
    return new Promise(function(resolve, reject) {
        nodeVersionUse(versionExpression, command, args, options, function nodeVersionUseCallback(err, res) {
            err ? reject(err) : resolve(res);
        });
    });
};
module.exports.installDirectory = function installDirectory() {
    return constants.installDirectory;
};
module.exports.cacheDirectory = function cacheDirectory(_options) {
    return constants.cacheDirectory;
};

if ((typeof exports.default === 'function' || (typeof exports.default === 'object' && exports.default !== null)) && typeof exports.default.__esModule === 'undefined') {
  Object.defineProperty(exports.default, '__esModule', { value: true });
  for (var key in exports) exports.default[key] = exports[key];
  module.exports = exports.default;
}