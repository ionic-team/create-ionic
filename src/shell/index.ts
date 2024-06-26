import { SpawnOptions } from 'node:child_process';
import { spawn } from 'cross-spawn';

export function runShell(
  cmd: string,
  arg1: string[],
  shellOptions: SpawnOptions,
) {
  return new Promise((res, rej) => {
    const cp = spawn(cmd, arg1, { ...shellOptions });
    cp.on('error', (err) => rej(err));
    cp.on('close', (code) => res(code));
  });
}

export function checkCmd( cmd: string, arg1: string[], shellOptions: SpawnOptions,) {
  return new Promise<boolean>((res) => {
    const cp = spawn(cmd, arg1, { ...shellOptions});
    cp.on('error', () => res(false));
    cp.on('close', () => res(true));
  });
}
