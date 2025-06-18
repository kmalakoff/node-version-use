import type { UseCallback, UseOptions, UseResult } from './types.js';
import worker from './worker.js';

export type * from './types.js';
export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options?: UseOptions, callback?: UseCallback): undefined | Promise<UseResult[]> {
  if (typeof options === 'function') {
    callback = options as UseCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(versionExpression, command, args, options, callback) as undefined;
  return new Promise((resolve, reject) => worker(versionExpression, command, args, options, (err, result) => (err ? reject(err) : resolve(result))));
}
