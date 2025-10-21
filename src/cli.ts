import exit from 'exit';
import getopts from 'getopts-compat';
import spawnTerm, { figures, formatArguments } from 'spawn-term';
import run from './index.ts';
import type { UseError, UseOptions, UseResult } from './types.ts';

const ERROR_CODE = 13;

export default (argv: string[], name: string): undefined => {
  const options = getopts(argv, {
    alias: { range: 'r', desc: 'd', expanded: 'e', streaming: 's', silent: 'si' },
    default: { range: 'major,even' },
    boolean: ['silent', 'desc', 'expanded', 'streaming'],
    stopEarly: true,
  });

  // define.option('-r, --range [range]', 'range type of major, minor, or patch with filters of lts, even, odd for version string expressions', 'major,even');
  // define.option('-s, --silent', 'suppress logging', false);
  options.sort = options.desc ? -1 : 1;

  const args = options._;
  if (args.length === 0) {
    console.log(`Missing version expression. Example usage: ${name} version command arg1 arg2`);
    return exit(ERROR_CODE);
  }
  if (args.length === 1) {
    console.log(`Missing command. Example usage: ${name} version command arg1 arg2`);
    return exit(ERROR_CODE);
  }

  options.stdio = 'inherit'; // pass through stdio
  return run(args[0], args[1], args.slice(2), options as unknown as UseOptions, (err: UseError, results: UseResult[]): undefined => {
    if (err && !err.results) {
      console.log(err.message);
      return exit(ERROR_CODE);
    }
    if (err) results = err.results;
    const errors = results.filter((result) => !!result.error);

    if (!options.silent) {
      if (!spawnTerm) {
        console.log('\n======================');
        results.forEach((res) => {
          console.log(`${res.error ? figures.cross : figures.tick} ${res.version}${res.error ? ` Error: ${res.error.message}` : ''}`);
        });
      }
      console.log('\n----------------------');
      console.log(`${name} ${formatArguments(args).join(' ')}`);
      console.log(`${figures.tick} ${results.length - errors.length} succeeded`);
      if (errors.length) console.log(`${figures.cross} ${errors.length} failed`);
    }
    exit(err || errors.length ? ERROR_CODE : 0);
  });
};
