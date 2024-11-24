"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    cacheDirectory: function() {
        return cacheDirectory;
    },
    default: function() {
        return nodeVersionUse;
    },
    installDirectory: function() {
        return installDirectory;
    }
});
var _constants = /*#__PURE__*/ _interop_require_default(require("./constants"));
var _use = /*#__PURE__*/ _interop_require_default(require("./use"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function nodeVersionUse(versionExpression, command, args, options, callback) {
    if (typeof options === 'function') {
        callback = options;
        options = {};
    }
    if (typeof callback === 'function') return (0, _use.default)(versionExpression, command, args, options || {}, callback);
    return new Promise(function(resolve, reject) {
        nodeVersionUse(versionExpression, command, args, options, function nodeVersionUseCallback(err, res) {
            err ? reject(err) : resolve(res);
        });
    });
}
function installDirectory() {
    return _constants.default.installDirectory;
}
function cacheDirectory(_options) {
    return _constants.default.cacheDirectory;
}
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }