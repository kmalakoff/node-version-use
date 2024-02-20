import constants from './constants';
import use from './use';

export default function nodeVersionUse(versionExpression, command, args, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  if (typeof callback === 'function') return use(versionExpression, command, args, options || {}, callback);
  return new Promise((resolve, reject) => {
    nodeVersionUse(versionExpression, command, args, options, function nodeVersionUseCallback(err, res) {
      err ? reject(err) : resolve(res);
    });
  });
}

export function installDirectory() {
  return constants.installDirectory;
}

export function cacheDirectory(_options) {
  return constants.cacheDirectory;
}
