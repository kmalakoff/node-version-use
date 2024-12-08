"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return _default;
    }
});
var _exit = /*#__PURE__*/ _interop_require_default(require("exit"));
var _getoptscompat = /*#__PURE__*/ _interop_require_default(require("getopts-compat"));
var _index = /*#__PURE__*/ _interop_require_default(require("./index.js"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
var _default = function(argv, name) {
    var options = (0, _getoptscompat.default)(argv.slice(1), {
        alias: {
            range: 'r',
            desc: 'd',
            silent: 's'
        },
        default: {
            range: 'major,even'
        },
        boolean: [
            'silent',
            'desc'
        ],
        stopEarly: true
    });
    // define.option('-r, --range [range]', 'range type of major, minor, or patch with filters of lts, even, odd for version string expressions', 'major,even');
    // define.option('-s, --silent', 'suppress logging', false);
    options.sort = options.desc ? -1 : 1;
    var args = argv.slice(0, 1).concat(options._);
    if (args.length < 1) {
        console.log("Missing command. Example usage: ".concat(name, " [version expression] [command]"));
        return (0, _exit.default)(-1);
    }
    if (!options.silent) options.header = function(version, command, args) {
        console.log('\n----------------------');
        console.log("".concat([
            command
        ].concat(args).join(' '), " (").concat(version, ")"));
        console.log('----------------------');
    };
    options.stdio = 'inherit'; // pass through stdio
    (0, _index.default)(args[0], args[1], args.slice(2), options, function(err, results) {
        if (err && err.message.indexOf('ExperimentalWarning') < 0) {
            console.log(err.message);
            return (0, _exit.default)(err.code || -1);
        }
        var errors = results.filter(function(result) {
            return !!result.error;
        });
        if (!options.silent) {
            console.log('\n======================');
            if (errors.length) {
                console.log("Errors (".concat(errors.length, ")"));
                for(var index = 0; index < errors.length; index++){
                    var result = errors[index];
                    console.log("".concat(result.version, " Error: ").concat(result.error.message));
                }
            } else console.log("Success (".concat(results.length, ")"));
            console.log('======================');
        }
        (0, _exit.default)(errors.length ? -1 : 0);
    });
};
/* CJS INTEROP */ if (exports.__esModule && exports.default) { try { Object.defineProperty(exports.default, '__esModule', { value: true }); for (var key in exports) { exports.default[key] = exports[key]; } } catch (_) {}; module.exports = exports.default; }