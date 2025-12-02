import exit from 'exit';
import fs from 'fs';
import getopts from 'getopts-compat';
import path from 'path';
import url from 'url';
import run from './index.ts';
import loadSpawnTerm from './lib/loadSpawnTerm.ts';
import type { UseError, UseOptions, UseResult } from './types.ts';

const __dirname = path.dirname(typeof __filename !== 'undefined' ? __filename : url.fileURLToPath(import.meta.url));

const ERROR_CODE = 13;

function getVersion(): string {
  const packagePath = path.join(__dirname, '..', '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function printHelp(name: string): void {
  const version = getVersion();
  console.log(`${name} v${version}`);
  console.log('');
  console.log(`Usage: ${name} [options] <version> <command> [args...]`);
  console.log('');
  console.log('Run commands with specific Node.js versions');
  console.log('');
  console.log('Options:');
  console.log('  -v, --version      Print version number');
  console.log('  -h, --help         Print this help message');
  console.log('  -r, --range        Range type (major, minor, patch) with filters (lts, even, odd)');
  console.log('                     Default: major,even');
  console.log('  -d, --desc         Sort versions in descending order');
  console.log('  -e, --expanded     Use expanded version format');
  console.log('  -s, --streaming    Enable streaming output');
  console.log('  --silent           Suppress logging');
  console.log('');
  console.log('Examples:');
  console.log(`  ${name} 22 node --version`);
  console.log(`  ${name} 22,20,18 npm test`);
  console.log(`  ${name} engines node --version`);
}

export default (argv: string[], name: string): undefined => {
  const options = getopts(argv, {
    alias: { range: 'r', desc: 'd', expanded: 'e', streaming: 's', silent: 'si', version: 'v', help: 'h' },
    default: { range: 'major,even', interactive: true },
    boolean: ['silent', 'desc', 'expanded', 'streaming', 'interactive', 'version', 'help'],
    stopEarly: true,
  });

  if (options.version) {
    console.log(getVersion());
    exit(0);
    return;
  }

  if (options.help) {
    printHelp(name);
    exit(0);
    return;
  }

  // define.option('-r, --range [range]', 'range type of major, minor, or patch with filters of lts, even, odd for version string expressions', 'major,even');
  // define.option('-s, --silent', 'suppress logging', false);
  options.sort = options.desc ? -1 : 1;

  const args = options._;
  if (args.length === 0) {
    console.log(`Missing version expression. Example usage: ${name} version command arg1 arg2`);
    exit(ERROR_CODE);
    return;
  }
  if (args.length === 1) {
    console.log(`Missing command. Example usage: ${name} version command arg1 arg2`);
    exit(ERROR_CODE);
    return;
  }

  options.stdio = 'inherit'; // pass through stdio
  run(args[0], args[1], args.slice(2), options as unknown as UseOptions, (err: UseError, results: UseResult[]): undefined => {
    if (err && !err.results) {
      console.log(err.message);
      exit(ERROR_CODE);
      return;
    }
    if (err) results = err.results;
    const errors = results.filter((result) => !!result.error);

    if (!options.silent) {
      // Load spawn-term to get figures/formatArguments for output formatting
      loadSpawnTerm((_loadErr, mod) => {
        const { createSession, figures, formatArguments } = mod || { createSession: undefined, figures: { tick: '✓', cross: '✗' }, formatArguments: (x: string[]) => x };
        if (!createSession) {
          console.log('\n======================');
          results.forEach((res) => {
            console.log(`${res.error ? figures.cross : figures.tick} ${res.version}${res.error ? ` Error: ${res.error.message}` : ''}`);
          });
          console.log('\n----------------------');
          console.log(`${name} ${formatArguments(args).join(' ')}`);
          console.log(`${figures.tick} ${results.length - errors.length} succeeded`);
          if (errors.length) console.log(`${figures.cross} ${errors.length} failed`);
        }
        exit(err || errors.length ? ERROR_CODE : 0);
      });
    } else {
      exit(err || errors.length ? ERROR_CODE : 0);
    }
  });
};
