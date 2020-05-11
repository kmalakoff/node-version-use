var Queue = require('queue-cb');

var RUNNERS = process.platform === 'win32' ? [require('./runners/nodist'), require('./runners/nvmWindows')] : [require('./runners/nave')];

module.exports = function runners(callback) {
  var result = null;
  var queue = new Queue(1);

  for (var index = 0; index < RUNNERS.length; index++) {
    var Runner = RUNNERS[index];
    var runner = new Runner();
    queue.defer(function (callback) {
      runner.install(function (err) {
        if (err) console.log(Runner.name + ' failed to install: ' + err.message);
        else result = result || runner;
        callback();
      });
    });
  }

  queue.await(function (err) {
    err ? callback(err) : callback(null, result);
  });
};
