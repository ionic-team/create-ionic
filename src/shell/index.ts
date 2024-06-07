import { SpawnOptions } from 'node:child_process';
import { spawn } from 'cross-spawn';

export function runShell(
  cmd: string,
  arg1: string[],
  shellOptions: SpawnOptions,
) {
  return new Promise((res, rej) => {
    const cp = spawn(cmd, arg1, {
      ...shellOptions,
      stdio: 'ignore',
      // shell: true
    });
    cp.on('error', (err) => {
      console.log(err)
      rej(err)
    });
    cp.on('close', (code) => res(code));
  });
}

