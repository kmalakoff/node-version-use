import spawn, { type SpawnOptions } from 'cross-spawn-cb';
import fs from 'fs';
import resolveVersions, { type VersionOptions } from 'node-resolve-versions';
import type { InstallOptions } from 'node-version-install';
import { spawnOptions as createSpawnOptions } from 'node-version-utils';
import path from 'path';
import Queue from 'queue-cb';
import resolveBin from 'resolve-bin-sync';
import spawnStreaming from 'spawn-streaming';
import { createSession, formatArguments } from 'spawn-term';
import { objectAssign, stringEndsWith } from './compat.ts';
import { storagePath } from './constants.ts';
import loadNodeVersionInstall from './lib/loadNodeVersionInstall.ts';
import { getPathWithoutNvuBin, resolveSystemBinary } from './lib/resolveSystemBinary.ts';

import type { Options, UseCallback, UseOptions, UseResult } from './types.ts';

const isWindows = process.platform === 'win32' || /^(msys|cygwin)$/.test(process.env.OSTYPE);
const NODE = isWindows ? 'node.exe' : 'node';

// Parse npm-generated .cmd wrapper to extract the JS script path
function parseNpmCmdWrapper(cmdPath: string): string | null {
  try {
    const content = fs.readFileSync(cmdPath, 'utf8');
    // Match: "%_prog%"  "%dp0%\node_modules\...\cli.js" %*
    // or: "%_prog%"  "%dp0%\path\to\script.js" %*
    const match = content.match(/"%_prog%"\s+"?%dp0%\\([^"]+)"?\s+%\*/);
    if (match) {
      const relativePath = match[1];
      const cmdDir = path.dirname(cmdPath);
      return path.join(cmdDir, relativePath);
    }
  } catch (_e) {
    // ignore
  }
  return null;
}

// On Windows, resolve npm bin commands to their JS entry points to bypass .cmd wrappers
// This fixes issues with nvm-windows where .cmd wrappers use symlinked node.exe directly
function resolveCommand(command: string, args: string[]): { command: string; args: string[] } {
  if (!isWindows) return { command, args };

  // Case 1: Command is a .cmd file path
  if (stringEndsWith(command.toLowerCase(), '.cmd')) {
    const scriptPath = parseNpmCmdWrapper(command);
    if (scriptPath) {
      return { command: NODE, args: [scriptPath].concat(args) };
    }
  }

  // Case 2: Try to resolve the command as an npm package bin from node_modules
  try {
    const binPath = resolveBin(command);
    return { command: NODE, args: [binPath].concat(args) };
  } catch (_e) {
    // Not an npm package bin, use original command
  }

  return { command, args };
}

export default function worker(versionExpression: string, command: string, args: string[], options: UseOptions, callback: UseCallback): void {
  // Handle "system" as a special version that uses system binaries directly
  if (versionExpression === 'system') {
    runWithSystemBinaries(command, args, options, callback);
    return;
  }

  // Load node-version-install lazily
  loadNodeVersionInstall((loadErr, installVersion) => {
    if (loadErr) return callback(loadErr);

    resolveVersions(versionExpression, options as VersionOptions, (err?: Error, versions?: string[]) => {
      if (err) return callback(err);
      if (!versions.length) {
        callback(new Error(`No versions found from expression: ${versionExpression}`));
        return;
      }

      const installOptions = objectAssign({ storagePath: storagePath }, options) as InstallOptions;
      const streamingOptions = options as Options;
      const results: UseResult[] = [];
      const queue = new Queue(1);

      // Create session once for all processes (only if multiple versions)
      const interactive = options.interactive !== false;
      const session = versions.length >= 2 && process.stdout.isTTY && createSession && !streamingOptions.streaming ? createSession({ header: `${command} ${args.join(' ')}`, showStatusBar: true, interactive }) : null;

      versions.forEach((version: string, index) =>
        queue.defer((cb) =>
          installVersion(version, installOptions, (err, installs) => {
            const install = installs && installs.length === 1 ? installs[0] : null;
            if (err || !install) {
              const error = err || new Error(`Unexpected version results for version ${version}. Install ${JSON.stringify(installs)}`);
              results.push({ install, command, version, error, result: null });
              return cb();
            }
            const spawnOptions = createSpawnOptions(install.installPath, options as SpawnOptions);
            const prefix = install.version;

            function next(err?, res?): void {
              if (!session && !options.silent) console.log('==============');
              if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
                res = err;
                err = null;
              }
              results.push({ install, command, version, error: err, result: res });
              cb();
            }

            // On Windows, resolve npm bin commands to bypass .cmd wrappers
            const resolved = resolveCommand(command, args);

            // Show command when running single version (no terminal session, unless silent)
            if (!session && !options.silent) console.log(`${index > 0 ? '\n' : ''}${version}`);
            if (!session && !options.silent) console.log('--------------');
            if (!session && !options.silent) console.log(`$ ${formatArguments([resolved.command].concat(resolved.args)).join(' ')}`);

            if (versions.length < 2) spawn(resolved.command, resolved.args, spawnOptions, next);
            else if (session) session.spawn(resolved.command, resolved.args, spawnOptions, { group: prefix, expanded: streamingOptions.expanded }, next);
            else spawnStreaming(resolved.command, resolved.args, spawnOptions, { prefix: process.stdout.isTTY ? prefix : undefined }, next);
          })
        )
      );
      queue.await((err) => {
        if (session) {
          session.waitAndClose(() => {
            err ? callback(err) : callback(null, results);
          });
        } else {
          err ? callback(err) : callback(null, results);
        }
      });
    });
  });
}

/**
 * Run command using system binaries (bypassing nvu version management)
 * This handles the "system" version specifier
 */
function runWithSystemBinaries(command: string, args: string[], options: UseOptions, callback: UseCallback): void {
  // Find the system binary for the command
  const systemBinary = resolveSystemBinary(command);
  if (!systemBinary) {
    callback(new Error(`System ${command} not found in PATH`));
    return;
  }

  // Create spawn options with PATH excluding ~/.nvu/bin
  // This ensures any child processes also use system binaries
  const cleanPath = getPathWithoutNvuBin();
  const spawnOptions: SpawnOptions = objectAssign({}, options as SpawnOptions);
  spawnOptions.env = objectAssign({}, process.env);
  spawnOptions.env.PATH = cleanPath;
  spawnOptions.stdio = options.stdio || 'inherit';

  // On Windows, resolve npm bin commands to bypass .cmd wrappers
  const resolved = resolveCommand(command, args);

  // For system, use the resolved system binary path
  const finalCommand = resolved.command === command ? systemBinary : resolved.command;
  const finalArgs = resolved.command === command ? args : resolved.args;

  if (!options.silent) {
    console.log(`$ ${formatArguments([finalCommand].concat(finalArgs)).join(' ')}`);
  }

  spawn(finalCommand, finalArgs, spawnOptions, (err?, res?) => {
    if (err && err.message && err.message.indexOf('ExperimentalWarning') >= 0) {
      res = err;
      err = null;
    }

    const result: UseResult = {
      install: null,
      command,
      version: 'system',
      error: err,
      result: res,
    };

    callback(err, [result]);
  });
}
