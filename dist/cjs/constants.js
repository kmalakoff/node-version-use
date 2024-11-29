"use strict";
var path = require('path');
var home = require('homedir-polyfill')();
module.exports = {
    cacheDirectory: path.join(home, '.nvu', 'cache'),
    installDirectory: path.join(home, '.nvu', 'installed')
};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }