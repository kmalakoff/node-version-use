import type { SpawnOptions, SpawnResult } from 'cross-spawn-cb';
import type { VersionOptions } from 'node-resolve-versions';
import type { InstallOptions, InstallResult } from 'node-version-install';

export interface UseResult {
  install: InstallResult;
  command: string;
  version: string;
  result?: SpawnResult;
  error?: Error;
}

export interface UseError extends Error {
  results: UseResult[] | undefined;
}

export interface Options {
  range?: string;
  concurrency?: number;
  sort?: number;
  streaming?: boolean;
  expanded?: boolean;
  interactive?: boolean;
  silent?: boolean;
}
export type UseOptions = Options & InstallOptions & VersionOptions & SpawnOptions;

export type UseCallback = (err?: UseError | Error, results?: UseResult[]) => undefined;
