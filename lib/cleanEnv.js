var PREFIXES = ['NPM_', 'NVM_', 'NAVE_', 'NODE_'];

module.exports = function cleanEnv() {
  var env = {};
  for (var key in process.env) {
    if (key === 'NODE') continue;
    var upperKey = key.toUpperCase();
    for (var index = 0; index < PREFIXES.length; index++) {
      if (upperKey.indexOf(PREFIXES[index]) === 0) continue;
    }
    env[key] = process.env[key];
  }
  return env;
};
