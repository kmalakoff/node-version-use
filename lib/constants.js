module.exports = {
  PATH_KEY: require('./pathKey')(),
  DELIMITER: process.platform === 'win32' ? ';' : ':',
  NODE: process.platform === 'win32' ? 'node.exe' : 'node',
};
