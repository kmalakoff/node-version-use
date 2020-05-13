var execSync = require('child_process').execSync;
var arch = require('arch');

module.exports = function () {
  if (process.platform === 'linux') {
    try {
      var stdout = execSync('uname -a').toString('utf8');
      if (~stdout.indexOf('raspberrypi')) return 'arm-pi';
    } catch (err) {}
  }
  return arch();
};
