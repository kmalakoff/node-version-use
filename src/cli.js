import exit from 'exit';
import figures from 'figures';
import getopts from 'getopts-compat';
import nvu from './index.mjs';

export default (argv, name) => {
  const options = getopts(argv.slice(1), {
    alias: { range: 'r', desc: 'd', silent: 's' },
    default: { range: 'major,even' },
    boolean: ['silent', 'desc'],
    stopEarly: true,
  });

  // define.option('-r, --range [range]', 'range type of major, minor, or patch with filters of lts, even, odd for version string expressions', 'major,even');
  // define.option('-s, --silent', 'suppress logging', false);
  options.sort = options.desc ? -1 : 1;

  const args = argv.slice(0, 1).concat(options._);
  if (args.length < 1) {
    console.log(`Missing command. Example usage: ${name} [version expression] [command]`);
    return exit(-1);
  }

  if (!options.silent)
    options.header = (version, command, args) => {
      console.log('\n----------------------');
      console.log(`${[command].concat(args).join(' ')} (${version})`);
      console.log('----------------------');
    };

  options.stdio = 'inherit'; // pass through stdio
  nvu(args[0], args[1], args.slice(2), options, (err, results) => {
    if (err && err.message.indexOf('ExperimentalWarning') < 0) {
      console.log(err.message);
      return exit(err.code || -1);
    }
    const errors = results.filter((result) => !!result.error);

    if (!options.silent) {
      console.log('\n======================');
      console.log(`nvu ${args.join(' ')} ${errors.length ? 'failed' : 'succeeed'}`);
      results.forEach((res) => console.log(`${res.error ? figures.cross : figures.tick} ${res.version}${res.error ? ` Error: ${res.error.message}` : ''}`));
    }

    exit(errors.length ? -1 : 0);
  });
};
