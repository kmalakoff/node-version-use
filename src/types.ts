import type { SpawnOptions, SpawnResult } from 'cross-spawn-cb';
import type { InstallResult } from 'node-version-install';

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

export interface UseOptions extends SpawnOptions {
  range?: string;
  concurrency?: number;
  sort?: number;
}

export type UseCallback = (err?: UseError, results?: UseResult[]) => undefined;
