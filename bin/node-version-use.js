#!/usr/bin/env node

var getopts = require('getopts-compat');
var exit = require('exit');
var nvu = require('..');

(function () {
  var options = getopts(process.argv.slice(3), {
    stopEarly: true,
  });

  var args = process.argv.slice(2, 3).concat(options._);
  if (args.length < 1) {
    console.log('err command. Example usage: nvu version [command]');
    return exit(-1);
  }

  nvu(args[0], args[1], args.slice(2), { stdio: 'inherit' }, function (err) {
    if (err) {
      console.log(err.message);
      return exit(err.code || -1);
    }
    exit(0);
  });
})();
