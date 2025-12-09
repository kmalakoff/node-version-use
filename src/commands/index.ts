import defaultCmd from './default.ts';
import installCmd from './install.ts';
import listCmd from './list.ts';
import localCmd from './local.ts';
import whichCmd from './which.ts';

export const commands: Record<string, (args: string[]) => void> = {
  default: defaultCmd,
  local: localCmd,
  list: listCmd,
  which: whichCmd,
  install: installCmd,
};

export function isCommand(name: string): boolean {
  return name in commands;
}

export function runCommand(name: string, args: string[]): void {
  const cmd = commands[name];
  if (cmd) {
    cmd(args);
  }
}
