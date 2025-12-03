import spawn, { type SpawnOptions } from 'cross-spawn-cb';
import fs from 'fs';
import resolveVersions, { type VersionOptions } from 'node-resolve-versions';
import type { InstallOptions, InstallResult } from 'node-version-install';
import { spawnOptions as createSpawnOptions } from 'node-version-utils';
import path from 'path';
import Queue from 'queue-cb';
import resolveBin from 'resolve-bin-sync';
import spawnStreaming from 'spawn-streaming';
import { stringEndsWith } from './compat.ts';
import { storagePath } from './constants.ts';
import loadNodeVersionInstall from './lib/loadNodeVersionInstall.ts';
import loadSpawnTerm from './lib/loadSpawnTerm.ts';

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
      return { command: NODE, args: [scriptPath, ...args] };
    }
  }

  // Case 2: Try to resolve the command as an npm package bin from node_modules
  try {
    const binPath = resolveBin(command);
    return { command: NODE, args: [binPath, ...args] };
  } catch (_e) {
    // Not an npm package bin, use original command
  }

  return { command, args };
}

export default function worker(versionExpression: string, command: string, args: string[], options: UseOptions, callback: UseCallback): undefined {
  // Load lazy dependencies in parallel
  const loaderQueue = new Queue();
  let installVersion: (version: string, opts: InstallOptions, cb: (err?: Error, results?: InstallResult[]) => void) => void;
  let createSession:
    | ((options?: { header?: string; showStatusBar?: boolean; interactive?: boolean }) => {
        spawn: (command: string, args: string[], options: unknown, termOptions: unknown, callback: (err?: Error, res?: unknown) => void) => void;
        close: () => void;
        waitAndClose: (callback?: () => void) => void;
      })
    | undefined;

  loaderQueue.defer((cb) =>
    loadNodeVersionInstall((err, fn) => {
      installVersion = fn;
      cb(err);
    })
  );
  loaderQueue.defer((cb) =>
    loadSpawnTerm((err, mod) => {
      createSession = mod?.createSession;
      cb(err);
    })
  );

  loaderQueue.await((loadErr) => {
    if (loadErr) return callback(loadErr);

    resolveVersions(versionExpression, options as VersionOptions, (err?: Error, versions?: string[]) => {
      if (err) {
        callback(err);
        return;
      }
      if (!versions.length) {
        callback(new Error(`No versions found from expression: ${versionExpression}`));
        return;
      }

      const installOptions = { storagePath, ...options } as InstallOptions;
      const streamingOptions = options as Options;
      const results: UseResult[] = [];
      const queue = new Queue(1);

      // Create session once for all processes (only if multiple versions)
      const interactive = options.interactive !== false;
      const session = versions.length >= 2 && createSession && !streamingOptions.streaming ? createSession({ header: `${command} ${args.join(' ')}`, showStatusBar: true, interactive }) : null;

      versions.forEach((version: string) => {
        queue.defer((cb) => {
          installVersion(version, installOptions, (_err, installs) => {
            const install = installs && installs.length === 1 ? installs[0] : null;
            if (!install) {
              results.push({ install, command, version, error: new Error(`Unexpected version results for version ${version}. Install ${JSON.stringify(installs)}`), result: null });
              return callback();
            }
            const spawnOptions = createSpawnOptions(install.installPath, options as SpawnOptions);
            const prefix = install.version;

            function next(err?, res?): undefined {
              if (err && err.message.indexOf('ExperimentalWarning') >= 0) {
                res = err;
                err = null;
              }
              results.push({ install, command, version, error: err, result: res });
              cb();
            }

            // On Windows, resolve npm bin commands to bypass .cmd wrappers
            const resolved = resolveCommand(command, args);

            if (versions.length < 2) return spawn(resolved.command, resolved.args, spawnOptions, next);
            if (session) session.spawn(resolved.command, resolved.args, spawnOptions, { group: prefix, expanded: streamingOptions.expanded }, next);
            else spawnStreaming(resolved.command, resolved.args, spawnOptions, { prefix }, next);
          });
        });
      });
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
