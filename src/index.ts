import type { UseCallback, UseOptions, UseResult } from './types.ts';
import worker from './worker.ts';

export type * from './types.ts';

export default function nodeVersionUse(versionExpression: string, command: string, args: string[]): Promise<UseResult[]>;
export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options: UseOptions): Promise<UseResult[]>;

export default function nodeVersionUse(versionExpression: string, command: string, args: string[], callback: UseCallback): void;
export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options: UseOptions, callback: UseCallback): void;

export default function nodeVersionUse(versionExpression: string, command: string, args: string[], options?: UseOptions | UseCallback, callback?: UseCallback): void | Promise<UseResult[]> {
  callback = typeof options === 'function' ? options : callback;
  options = typeof options === 'function' ? {} : ((options || {}) as UseOptions);

  if (typeof callback === 'function') return worker(versionExpression, command, args, options, callback);
  return new Promise((resolve, reject) => worker(versionExpression, command, args, options, (err, result) => (err ? reject(err) : resolve(result))));
}
