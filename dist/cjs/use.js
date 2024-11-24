"use strict";
function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
function ownKeys(object, enumerableOnly) {
    var keys = Object.keys(object);
    if (Object.getOwnPropertySymbols) {
        var symbols = Object.getOwnPropertySymbols(object);
        if (enumerableOnly) {
            symbols = symbols.filter(function(sym) {
                return Object.getOwnPropertyDescriptor(object, sym).enumerable;
            });
        }
        keys.push.apply(keys, symbols);
    }
    return keys;
}
function _object_spread_props(target, source) {
    source = source != null ? source : {};
    if (Object.getOwnPropertyDescriptors) {
        Object.defineProperties(target, Object.getOwnPropertyDescriptors(source));
    } else {
        ownKeys(Object(source)).forEach(function(key) {
            Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
        });
    }
    return target;
}
var path = require('path');
var Queue = require('queue-cb');
var installRelease = require('node-install-release');
var versionUtils = require('node-version-utils');
var resolveVersions = require('node-resolve-versions');
var constants = require('./constants');
module.exports = function use(versionExpression, command, args, options, callback) {
    resolveVersions(versionExpression, _object_spread_props(_object_spread({}, options), {
        path: 'raw'
    }), function(err, versions) {
        if (err) return callback(err);
        if (!versions.length) return callback(new Error("No versions found from expression: ".concat(versionExpression)));
        var results = [];
        var queue = new Queue(1);
        for(var index = 0; index < versions.length; index++){
            (function(version) {
                queue.defer(function(callback) {
                    !options.header || options.header(version.version, command, args);
                    var installDirectory = options.installDirectory || constants.installDirectory;
                    var cacheDirectory = options.cacheDirectory || constants.cacheDirectory;
                    var installPath = path.join(installDirectory, version.version);
                    installRelease(version, installPath, {
                        cacheDirectory: cacheDirectory
                    }, function(err) {
                        if (err) return callback(err);
                        versionUtils.spawn(installPath, command, args, options, function(err, res) {
                            results.push({
                                version: version.version,
                                error: err,
                                result: res
                            });
                            callback();
                        });
                    });
                });
            })(versions[index]);
        }
        queue.await(function(err) {
            err ? callback(err) : callback(null, results);
        });
    });
};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) exports.default[key] = exports[key]; module.exports = exports.default; }