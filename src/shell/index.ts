import { SpawnOptions, spawn, execFile } from 'node:child_process';

export async function runShell(
  cmd: string,
  arg1: string[],
  shellOptions: SpawnOptions,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const cp = spawn(cmd, arg1, { ...shellOptions, shell: true});
    cp.on('close', () => {
      resolve();
    });
  });
}

export async function exec(cmd: string, arg1: string[]): Promise<string> {
  return await new Promise((res) => {
    execFile(cmd, arg1, (error, stdout) => {
      if (error) {
        throw error; 
      } 
        res(stdout)
    });
  });
}
