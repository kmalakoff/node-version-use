const cr = require('cr');

module.exports = function getLines(stdout) {
  return cr(stdout)
    .split('\n')
    .map((line) => (line.indexOf(': ') >= 0 ? line.split(': ')[1] : line))
    .filter((line) => line.length > 0 && line.indexOf('installed') < 0);
};
