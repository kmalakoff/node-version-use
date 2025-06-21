import type { UseCallback, UseOptions, UseResult } from './types.ts';
import worker from './worker.ts';

export type * from './types.ts';

export default function nodeVersionUse(versionExpression: string, command: string, args: string[]): Promise<UseResult[]>;
export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options: UseOptions): Promise<UseResult[]>;

export default function nodeVersionUse(versionExpression: string, command: string, args: string[], callback: UseCallback): undefined;
export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options: UseOptions, callback: UseCallback): undefined;

export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options?: UseOptions | UseCallback, callback?: UseCallback): undefined | Promise<UseResult[]> {
  if (typeof options === 'function') {
    callback = options as UseCallback;
    options = {};
  }
  options = options || {};

  if (typeof callback === 'function') return worker(versionExpression, command, args, options, callback) as undefined;
  return new Promise((resolve, reject) => worker(versionExpression, command, args, options, (err, result) => (err ? reject(err) : resolve(result))));
}
