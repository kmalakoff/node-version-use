import worker from './worker';

export default function nodeVersionUse(versionExpression, command, args, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(versionExpression, command, args, options, callback);
  return new Promise((resolve, reject) =>
    worker(versionExpression, command, args, options, (err, res) => {
      err ? reject(err) : resolve(res);
    })
  );
}
